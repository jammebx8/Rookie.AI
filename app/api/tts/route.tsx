import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

// Friday's ElevenLabs voice — recommend "Rachel" (21m00Tcm4TlvDq8ikWAM) or "Bella" (EXAVITQu4vr4xnSDxMaL)
// Set your preferred Voice ID in env: ELEVENLABS_VOICE_ID
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    // Trim to reasonable length for TTS (ElevenLabs has limits)
    const trimmedText = text.slice(0, 4000);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: trimmedText,
          model_id: 'eleven_turbo_v2_5', // Fastest, lowest latency
          voice_settings: {
            stability: 0.45,           // Slightly variable = more human
            similarity_boost: 0.82,    // High similarity = consistent voice
            style: 0.3,                // Moderate expressiveness
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', err);
      return NextResponse.json({ error: 'TTS failed', detail: err }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('TTS API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}