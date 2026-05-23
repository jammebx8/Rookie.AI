import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { currentSummary, recentMessages, latestResponse, userName } = await req.json();

    const prompt = `You are a memory distillation engine for Friday, an AI assistant serving ${userName}.

Your task: Update the running memory summary with new information from the recent conversation.

CURRENT MEMORY SUMMARY:
${currentSummary || '(No prior memory — this is the start)'}

RECENT CONVERSATION:
${recentMessages.map((m: { role: string; content: string }) => `${m.role === 'user' ? userName : 'Friday'}: ${m.content}`).join('\n')}

LATEST FRIDAY RESPONSE:
${latestResponse}

INSTRUCTIONS:
Create a concise, structured memory summary (max 300 words) that captures:
1. Who ${userName} is (name, role, key context if mentioned)
2. Key topics they've discussed and outcomes
3. ${userName}'s preferences, work style, or recurring needs
4. Ongoing tasks, projects, or follow-ups Friday should remember
5. Important facts or data points ${userName} has shared
6. ${userName}'s communication preferences (brief/detailed, formal/casual)

Write this as a factual third-person summary that Friday can use as context in future conversations. Be specific, not vague. Drop outdated or irrelevant details. Prioritize actionable context.

Output ONLY the memory summary — no preamble, no explanation.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || currentSummary || '';

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error('Memory API error:', err);
    // Return existing summary on failure — graceful degradation
    return NextResponse.json({ summary: req.body ? '' : '' }, { status: 500 });
  }
}