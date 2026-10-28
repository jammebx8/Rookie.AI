import { NextRequest, NextResponse } from 'next/server';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '745155e2a953bd317278905804c8d3f50b2eee83';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio_base64, mime_type } = body;

    if (!audio_base64) {
      return NextResponse.json({ error: 'audio_base64 is required' }, { status: 400 });
    }

    const base64Data = audio_base64.includes(',')
      ? audio_base64.split(',')[1]
      : audio_base64;

    const audioBuffer = Buffer.from(base64Data, 'base64');
    const mime = mime_type || 'audio/webm';

    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': mime,
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Deepgram error: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    return NextResponse.json({ transcript: transcript.trim() });
  } catch (err: any) {
    console.error('Deepgram transcription error:', err);
    return NextResponse.json(
      { error: err.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}
