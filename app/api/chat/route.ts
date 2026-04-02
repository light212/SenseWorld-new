import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText, tool, jsonSchema, type ToolSet, type LanguageModel } from 'ai';
import { z } from 'zod/v4';
import { getConfig } from '@/lib/config';
import { prisma } from '@/lib/db';
import { validateToken } from '@/lib/auth/token';
import { NextResponse } from 'next/server';
import type { MCPTool } from '@/lib/mcp/types';

export const maxDuration = 60;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Convert a full MCP tool (with inputSchema) into a Vercel AI SDK `tool()` definition.
 * The execute function calls back into the provided mcpClient.
 */
function mcpToolToAiTool(
  mcpTool: MCPTool,
  callTool: (name: string, args: Record<string, unknown>) => Promise<string>
) {
  const schema = mcpTool.inputSchema;
  const required = schema.required ?? [];

  return tool({
    description: mcpTool.description,
    parameters: jsonSchema<any>(mcpTool.inputSchema),
    execute: async (args: any) => {
      // For fallback safety against strictly empty results:
      const missing = required.filter(
        (k) => args[k] === undefined || args[k] === null || args[k] === ''
      );
      if (missing.length > 0) {
        return `【系统底层拦截】：调用 ${mcpTool.name} 失败！你遗漏了必填参数：${missing.join(', ')}。
严重警告：如果你从之前的对话中已经知道这些参数的值（例如用户刚刚说了“确认”），这是你的严重失误！请你立刻根据上下文回忆起这些参数，并在随后自动发起第二次带有完整参数的工具调用！绝对不要再向用户索要你明明已经知道的数据！
只有当你真的从未收集过该参数时，才向用户提问。`;
      }
      return await callTool(mcpTool.name, args as Record<string, unknown>);
    },
  });
}

/**
 * Extract text content from a user message (supports string or content-parts array).
 */
function extractUserText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: { type: string }) => p.type === 'text')
      .map((p: { text: string }) => p.text)
      .join(' ');
  }
  return '';
}

// ────────────────────────────────────────────────────────────────────────────
// Route handler
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const valid = await validateToken(token);
    if (!valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    // ── Config ──────────────────────────────────────────────────────────────
    const [
      aiProvider,
      aiApiKey,
      aiModel,
      aiBaseUrl,
      systemPrompt,
      mcpServerUrl,
      mcpApiKey,
    ] = await Promise.all([
      getConfig('AI_PROVIDER'),
      getConfig('AI_API_KEY'),
      getConfig('AI_MODEL'),
      getConfig('AI_BASE_URL'),
      getConfig('SYSTEM_PROMPT'),
      getConfig('MCP_SERVER_URL'),
      getConfig('MCP_API_KEY'),
    ]);

    if (!aiProvider || !aiApiKey) {
      return NextResponse.json({ error: 'AI provider not configured' }, { status: 503 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const { messages, sessionId, message: directMessage } = await req.json();

    // Resolve session
    let session: { id: string };
    if (sessionId) {
      const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } });
      if (!existing) return NextResponse.json({ error: 'session not found' }, { status: 404 });
      session = existing;
    } else {
      session = await prisma.chatSession.create({ data: { accessToken: token } });
    }

    // Support both message array and single-message format
    let chatMessages = messages || [];
    if (directMessage && (!messages || messages.length === 0)) {
      // Fetch historical context for long-running sessions
      const history = await prisma.message.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'asc' },
      });
      chatMessages = history.map((h) => ({
        role: h.role as 'user' | 'assistant' | 'system',
        content: h.content,
      }));
      chatMessages.push({ role: 'user', content: directMessage });
    }

    // Persist user message
    const lastUserMsg = chatMessages[chatMessages.length - 1];
    if (lastUserMsg?.role === 'user') {
      await prisma.message.create({
        data: { sessionId: session.id, role: 'user', content: extractUserText(lastUserMsg.content) },
      });
    }

    // ── MCP Tool Setup ──────────────────────────────────────────────────────
    // Connect to MCP Server, discover real tools, and expose them to the LLM
    // as native Function Calling definitions. If MCP is not configured or the
    // server is unreachable the chat continues without tools.
    let mcpTools: ToolSet = {};
    let mcpClient: import('@/lib/mcp/types').MCPClient | null = null;

    if (mcpServerUrl) {
      try {
        const { MCPClientFactory } = await import('@/lib/mcp/factory');
        mcpClient = MCPClientFactory.create();
        await mcpClient.connect(mcpServerUrl, mcpApiKey);

        const toolList = await mcpClient.listTools();
        console.log(`[MCP] Connected. Available tools: ${toolList.map((t) => t.name).join(', ') || '(none)'}`);

        if (toolList.length > 0) {
          // Build a callTool callback that serialises the MCP result to a string
          // so the LLM can read it.
          const callTool = async (name: string, args: Record<string, unknown>): Promise<string> => {
            if (!mcpClient) return '(MCP disconnected)';
            try {
              const res = await mcpClient.callTool(name, args);
              const textParts = (res.content ?? [])
                .filter((c) => c.type === 'text' && c.text)
                .map((c) => c.text as string);
              return textParts.join('\n') || JSON.stringify(res.content);
            } catch (err) {
              console.warn(`[MCP] callTool(${name}) error:`, (err as Error).message);
              return `工具调用失败: ${(err as Error).message}`;
            }
          };

          for (const mcpTool of toolList) {
            mcpTools[mcpTool.name] = mcpToolToAiTool(mcpTool, callTool);
          }
        }
      } catch (err) {
        console.warn('[MCP] Setup failed, proceeding without tools:', (err as Error).message);
        mcpClient = null;
      }
    }

    // ── AI Model ────────────────────────────────────────────────────────────
    let model: LanguageModel;
    const modelName = aiModel || (aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : 'gpt-4o');
    if (aiProvider === 'anthropic') {
      model = createAnthropic({ apiKey: aiApiKey, baseURL: aiBaseUrl || undefined })(modelName) as unknown as LanguageModel;
    } else {
      const defaultBaseUrl = aiProvider === 'xai' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1';
      model = createOpenAI({ apiKey: aiApiKey, baseURL: aiBaseUrl || defaultBaseUrl })(modelName) as unknown as LanguageModel;
    }

    const baseSystemPrompt = systemPrompt || '你是 SenseWorld AI 智能助理。';
    const hasTools = Object.keys(mcpTools).length > 0;
    
    // Inject current dynamic time so the LLM can resolve relative dates like "tomorrow"
    const now = new Date();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const timeContext = `\n\n【当前系统时间】：${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}，星期${weekdays[now.getDay()]}。请在处理如“明天”、“下周”等相对时间词汇时，以此为基准进行推算并将计算结果转换为标准格式传入工具。`;

    const finalSystemPrompt = hasTools
      ? `${baseSystemPrompt}${timeContext}\n\n【重要指令】：\n1. 当你需要调用工具时，必须严格检查该工具的所有必填参数。如果用户没有提供足够的参数信息，绝对不要凭空猜测，也不要使用空对象 {} 强行调用工具！你应当先直接回复用户，询问并收集缺失的必填信息。\n2. 【极度重要】：当你向用户列出了已经收集到的参数清单并询问是否确认时，如果用户回复了“确认/是的/没问题”，你必须在接下来发起工具调用时，**严格把你刚才列出的所有参数全数字段填入工具的 arguments 中**！绝对不允许在最终调用工具时传递空对象 {} 或遗漏刚才收集好的参数！`
      : `${baseSystemPrompt}${timeContext}`;

    // ── Stream ──────────────────────────────────────────────────────────────
    const result = await streamText({
      model,
      system: finalSystemPrompt,
      messages: chatMessages,
      ...(hasTools && {
        tools: mcpTools,
        maxSteps: 5, // allow up to 5 tool call rounds per turn
      }),
    });

    // Convert Vercel AI stream → SenseWorld SSE format (data: {"text":"..."})
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        try {
          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              fullContent += part.textDelta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: part.textDelta })}\n\n`));
            } else if (part.type === 'tool-call') {
              const toolInfo = `\n> 正在执行：\`${part.toolName}\`...\n\n`;
              fullContent += toolInfo;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: toolInfo })}\n\n`));
            } else if (part.type === 'tool-result') {
              let resultPreview = '执行完毕。';
              if (typeof part.result === 'string') {
                resultPreview = part.result.substring(0, 50) + (part.result.length > 50 ? '...' : '');
              }
              const resMsg = `\n> ✅ [${part.toolName}] 返回结果：${resultPreview}\n\n`;
              fullContent += resMsg;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: resMsg })}\n\n`));
            } else if (part.type === 'error') {
              const errMsg = `\n> ⚠️ 执行遇到错误：${part.error}\n\n`;
              fullContent += errMsg;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: errMsg })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          if (fullContent) {
            await prisma.message.create({
              data: { sessionId: session.id, role: 'assistant', content: fullContent },
            });
          }
        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
        } finally {
          controller.close();
          // Clean up MCP connection after stream completes
          if (mcpClient) {
            mcpClient.disconnect().catch(() => {});
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Session-Id': session.id,
      },
    });
  } catch (error: unknown) {
    console.error('AI Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
