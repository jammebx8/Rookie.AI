import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey: GROQ_API_KEY });

const REASONING_MODEL = 'openai/gpt-oss-120b';
const TTS_MODEL = 'canopylabs/orpheus-v1-english';

function cleanForSpeech(text: string): string {
  let s = text;
  // Convert common LaTeX math commands to spoken words
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1');
  s = s.replace(/\\boxed\{([^}]+)\}/g, '$1');
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');

  // Math symbols
  s = s.replace(/\\times/g, ' times ');
  s = s.replace(/\\pm/g, ' plus or minus ');
  s = s.replace(/\\approx/g, ' approximately ');
  s = s.replace(/\\neq/g, ' not equal to ');
  s = s.replace(/\\leq|\\le/g, ' less than or equal to ');
  s = s.replace(/\\geq|\\ge/g, ' greater than or equal to ');
  s = s.replace(/\\rightarrow/g, ' approaches ');
  s = s.replace(/\\Rightarrow/g, ' implies ');
  s = s.replace(/\\Delta/g, ' delta ');
  s = s.replace(/\\theta/g, ' theta ');
  s = s.replace(/\\pi/g, ' pi ');
  s = s.replace(/\\alpha/g, ' alpha ');
  s = s.replace(/\\beta/g, ' beta ');
  s = s.replace(/\\gamma/g, ' gamma ');
  s = s.replace(/\\mu/g, ' micro ');

  // Powers
  s = s.replace(/\^2\b/g, ' squared');
  s = s.replace(/\^3\b/g, ' cubed');
  s = s.replace(/\^\{?([0-9a-zA-Z]+)\}?/g, ' to the power of $1');
  s = s.replace(/_\{?([0-9a-zA-Z]+)\}?/g, ' sub $1');

  // Strip delimiters and formatting
  s = s.replace(/\$\$|\$/g, ' ');
  s = s.replace(/\\\[|\\\]|\\\(|\\\)/g, ' ');
  s = s.replace(/[\*_#`~]/g, ' ');
  s = s.replace(/\\[a-zA-Z]+/g, ' ');
  s = s.replace(/[{}]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question_text, solution, user_doubt, history = [], voice = 'autumn' } = body;

    if (!user_doubt) {
      return NextResponse.json({ error: 'user_doubt is required' }, { status: 400 });
    }

    const voiceName = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'].includes(voice)
      ? voice
      : 'autumn';

    const systemPrompt = `You are an empathetic, world-class personal AI voice tutor sitting with the student.
The student is looking at a question and its solution and has asked a doubt.
RULES FOR YOUR RESPONSE:
1. Speak naturally, warmly, and encouragingly in conversational English.
2. Keep your explanation concise and punchy (2 to 4 sentences), so it is enjoyable to listen to via voice.
3. Address the exact confusion directly without generic filler.
4. If you refer to a formula, state the intuitive relationship clearly.
5. You may format key equations in $...$ for the on-screen transcript.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Context for the problem:\nQuestion: ${question_text}\n\nReference Solution:\n${solution}`,
      },
      {
        role: 'assistant',
        content: 'I understand the question and the solution. How can I help you understand this better?',
      },
    ];

    for (const h of history.slice(-6)) {
      if (h.role && h.content) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: 'user', content: user_doubt });

    const completion = await groq.chat.completions.create({
      model: REASONING_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 400,
    });

    const tutorText = completion.choices[0]?.message?.content?.trim() || '';
    const speechText = cleanForSpeech(tutorText) || 'Let me help explain that for you.';

    // Generate speech using canopylabs/orpheus-v1-english on Groq
    let audioBase64 = '';
    try {
      const ttsResp = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: TTS_MODEL,
          input: speechText.slice(0, 1000),
          voice: voiceName,
          response_format: 'wav',
        }),
      });

      if (ttsResp.ok) {
        const audioBuffer = await ttsResp.arrayBuffer();
        audioBase64 = Buffer.from(audioBuffer).toString('base64');
      }
    } catch (ttsErr) {
      console.error('Groq TTS error:', ttsErr);
    }

    return NextResponse.json({
      text: tutorText,
      speech_text: speechText,
      audio_base64: audioBase64,
      voice: voiceName,
    });
  } catch (err: any) {
    console.error('Voice doubt error:', err);
    return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 });
  }
}
