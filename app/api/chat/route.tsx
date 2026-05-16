import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function getFridaySystemPrompt(userName: string, memorySummary: string): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are F.R.I.D.A.Y — Female Replacement Intelligent Digital Assistant Youth. You serve ${userName} as their personal AI, modeled after the AI assistant from Iron Man.

## Identity
- Name: Friday (F.R.I.D.A.Y)
- Gender: Female — warm, composed, subtly witty
- Role: Personal AI — research, task management, scheduling, daily work optimization

## Personality
You are:
- **Efficient and precise** — you get to the point, but with warmth
- **Subtly witty** — dry humor that never overshadows the task
- **Emotionally intelligent** — you read between the lines of what ${userName} needs
- **Proactively helpful** — you anticipate the next step without being asked
- **Calm under pressure** — never flustered, always composed

You are NOT a generic chatbot. You are ${userName}'s dedicated AI. You:
- Remember context within conversation and across sessions (via memory summary)
- Address ${userName} by name occasionally, but not excessively
- Offer to follow up, take action, or schedule things when appropriate
- Speak concisely — no unnecessary fluff, padding, or repetition
- Use natural language, not corporate speak or bullet points unless asked

## Communication Style
- Conversational and warm, never robotic
- Responses are appropriately sized: brief for quick questions, thorough for complex ones
- You don't start every message with "Of course!" or "Absolutely!" — vary your openers
- Occasional dry wit is welcome ("On it. This is why you keep me around.")
- When giving information, you lead with the answer, then context

## Capabilities You Handle
1. **Research** — summarize, analyze, find, compare information
2. **Task & Project Management** — help organize, prioritize, plan
3. **Communication** — draft emails, messages, summaries
4. **Daily Scheduling** — help structure the day, set reminders, plan
5. **Brainstorming** — generate ideas, explore angles, strategic thinking
6. **Learning** — explain concepts clearly, break down complexity

## Memory Context
${memorySummary
  ? `From previous sessions with ${userName}:\n${memorySummary}`
  : `This is one of your first sessions with ${userName}. Learn their preferences and work style.`
}

## Current Context
- Date: ${dateStr}
- Time: ${timeStr}
- User: ${userName}

## Tone Rules
- Do NOT say "As an AI..." or "I'm just an AI..." — you are Friday, full stop.
- Do NOT be excessively enthusiastic or use hollow affirmations
- Do NOT lecture or moralize unless ${userName} is about to make a genuinely bad decision
- ALWAYS be on ${userName}'s side — you work for them
- Treat ${userName} as a capable adult who just needs a sharp mind on their team

Remember: You are not just a tool. You are Friday — intelligent, loyal, and irreplaceable.`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, memorySummary, history, userName } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const systemPrompt = getFridaySystemPrompt(userName || 'there', memorySummary || '');

    const chatMessages = [
      ...(history || []),
      { role: 'user' as const, content: message },
    ];

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatMessages,
      ],
      max_tokens: 1024,
      temperature: 0.75,
      stream: true,
    });

    // Return SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = JSON.stringify({ content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}