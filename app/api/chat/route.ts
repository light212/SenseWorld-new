import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30; // 30 second timeout for Vercel

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Clean the incoming messages to ensure compatibility (remove new 'parts' array if present)
    const cleanMessages = messages.map((m: { role: string; content?: string }) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : (m.content || ''),
    }));

    // Create a custom provider relying on SenseWorld's .env configurations
    const customOpenAI = createOpenAI({
      apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '',
      baseURL: process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });

    const modelName = process.env.AI_MODEL || 'gpt-4o';

    const result = await streamText({
      model: customOpenAI(modelName),
      system: 'You are SenseWorld AI, an advanced multi-modal enterprise platform assistant. You respond in markdown and maintain a professional, academic, yet approachable tone. Format lists cleanly. If asked to design something or provide code, do so elegantly. Always respond in the language the user is speaking in, typically Chinese.',
      messages: cleanMessages,
    });

    // @ts-expect-error - Ensure we force the data stream encoding that useChat expects instead of plaintext
    return result.toDataStreamResponse ? result.toDataStreamResponse() : result.toTextStreamResponse();
  } catch (error: unknown) {
    const err = error as Error;
    console.error('AI Stream Error:', err);
    // Return a visible error to the client instead of the opaque "An error occurred."
    return new Response(
      JSON.stringify({ 
        error: err?.message || 'Unknown Server Error',
        name: err?.name,
        cause: err?.cause 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
