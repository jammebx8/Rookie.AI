// Vercel serverless function (Node 18+ / Vercel runtime).
// This file must be placed into /api/groq.js at the repository root.
// It proxies client requests to Groq and keeps the GROQ_API_KEY on the server-side.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY not found in env');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const body = req.body || {};
    // Forward parameters to Groq. Validate/limit as needed.
    const payload = {
      model: body.model || 'llama-3.3-70b-versatile',
      messages: body.messages || [],
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.4,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 400,
    };

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await groqRes.json();
    // Forward status + body back to client so client can handle errors if any
    return res.status(groqRes.status).json(data);
  } catch (err) {
    console.error('Error forwarding to Groq:', err);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
}