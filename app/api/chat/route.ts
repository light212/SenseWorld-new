import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { getConfig } from '@/lib/config';
import { prisma } from '@/lib/db';
import { validateToken } from '@/lib/auth/token';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const valid = await validateToken(token);
    if (!valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const [
      aiProvider,
      aiApiKey,
      aiModel,
      aiBaseUrl,
      systemPrompt,
      mcpServerUrl
    ] = await Promise.all([
      getConfig('AI_PROVIDER'),
      getConfig('AI_API_KEY'),
      getConfig('AI_MODEL'),
      getConfig('AI_BASE_URL'),
      getConfig('SYSTEM_PROMPT'),
      getConfig('MCP_SERVER_URL'),
    ]);

    if (!aiProvider || !aiApiKey) return NextResponse.json({ error: 'AI provider not configured' }, { status: 503 });

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

    // Support both 'messages' (Vercel style) and 'message' (Original style)
    let chatMessages = messages || [];
    if (directMessage && (!messages || messages.length === 0)) {
      chatMessages = [{ role: 'user', content: directMessage }];
    }

    // Save user message to DB (if provided as text)
    const lastUserMsg = chatMessages[chatMessages.length - 1];
    if (lastUserMsg && lastUserMsg.role === 'user') {
      await prisma.message.create({
        data: { sessionId: session.id, role: 'user', content: lastUserMsg.content }
      });
    }

    // Init provider
    let model;
    const modelName = aiModel || (aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : 'gpt-4o');
    if (aiProvider === 'anthropic') {
      model = createAnthropic({ apiKey: aiApiKey, baseURL: aiBaseUrl || undefined })(modelName);
    } else {
      model = createOpenAI({ apiKey: aiApiKey, baseURL: aiBaseUrl || 'https://api.openai.com/v1' })(modelName);
    }

    const result = await streamText({
      model,
      system: systemPrompt || 'You are SenseWorld AI.',
      messages: chatMessages,
    });

    // Convert Vercel stream to Original SenseWorld SSE format (data: {"text":"..."})
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        try {
          for await (const chunk of result.textStream) {
            fullContent += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Final persistence
          if (fullContent) {
            await prisma.message.create({
              data: { sessionId: session.id, role: 'assistant', content: fullContent }
            });
          }
        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Session-Id': session.id,
      },
    });
  } catch (error: unknown) {
    console.error('AI Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
