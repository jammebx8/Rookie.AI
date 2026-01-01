import axios from 'axios';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // for dev; restrict in prod if needed
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 🔹 Preflight handler (VERY IMPORTANT)
export async function OPTIONS() {
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
      max_tokens = 400,
    } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

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

    return new Response(JSON.stringify(groqRes.data), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error('solution proxy error:', err?.response?.data || err.message);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch solution from LLM',
        details: err?.response?.data || err?.message,
      }),
      {
        status: err?.response?.status || 500,
        headers: corsHeaders,
      }
    );
  }
}
