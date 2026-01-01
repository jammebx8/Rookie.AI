import axios from 'axios';

export async function POST(request: Request) {
  const body = await request.json();

  const {
    message,
    model = 'llama-3.3-70b-versatile',
    temperature = 0.7,
    max_tokens = 400,
  } = body;

  if (!message) {
    return Response.json(
      { error: 'message is required' },
      { status: 400 }
    );
  }

  try {
    const groqRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: message }],
        temperature,
        max_tokens,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    );

    return Response.json(groqRes.data);
  } catch (err: any) {
    console.error('solution proxy error:', err?.response?.data || err.message);

    return Response.json(
      {
        error: 'Failed to fetch solution from LLM',
        details: err?.response?.data || err?.message,
      },
      { status: err?.response?.status || 500 }
    );
  }
}
