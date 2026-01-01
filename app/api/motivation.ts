import axios from 'axios';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // allow localhost + prod
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 🔴 REQUIRED: preflight handler
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
      max_tokens = 50,
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
    console.error('motivation proxy error:', err?.response?.data || err.message);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch motivation from LLM',
        details: err?.response?.data || err?.message,
      }),
      {
        status: err?.response?.status || 500,
        headers: corsHeaders,
      }
    );
  }
}
