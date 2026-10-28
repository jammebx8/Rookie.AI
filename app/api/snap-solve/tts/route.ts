import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TTS_MODEL = 'canopylabs/orpheus-v1-english';

function cleanForSpeech(text: string): string {
  let s = text;
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1');
  s = s.replace(/\\boxed\{([^}]+)\}/g, '$1');
  s = s.replace(/\$\$|\$/g, ' ');
  s = s.replace(/\\\[|\\\]|\\\(|\\\)/g, ' ');
  s = s.replace(/[\*_#`~]/g, ' ');
  s = s.replace(/\\[a-zA-Z]+/g, ' ');
  s = s.replace(/[{}]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'autumn' } = body;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const voiceName = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'].includes(voice)
      ? voice
      : 'autumn';

    const speechText = cleanForSpeech(text);

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

    if (!ttsResp.ok) {
      const errText = await ttsResp.text();
      return NextResponse.json({ error: `TTS failed: ${errText}` }, { status: ttsResp.status });
    }

    const audioBuffer = await ttsResp.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return NextResponse.json({ audio_base64: audioBase64, voice: voiceName });
  } catch (err: any) {
    console.error('TTS error:', err);
    return NextResponse.json({ error: err.message || 'TTS generation failed' }, { status: 500 });
  }
}
