const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

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
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: corsHeaders }
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

    return new Response(JSON.stringify(data), {
      status: groqRes.ok ? 200 : groqRes.status,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch motivation from LLM',
        details: err.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'edge';
