export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      message,
      model = 'llama-3.3-70b-versatile',
      temperature = 0.7,
      max_tokens = 50,
    } = body;

    if (!message) {
      return Response.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const groqRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: message }],
          temperature,
          max_tokens,
        }),
      }
    );

    const data = await groqRes.json();

    return Response.json(data, {
      status: groqRes.ok ? 200 : groqRes.status,
    });
  } catch (err: any) {
    return Response.json(
      {
        error: 'Failed to fetch from Groq',
        details: err.message,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';
