// Vercel serverless function to proxy OCR.space requests.
// Place at /api/ocr.js
// Accepts JSON { base64Image: 'data:image/jpeg;base64,...', language?: 'eng' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OCR_API_KEY) {
    console.error('OCR_API_KEY not found in env');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const { base64Image, language = 'eng' } = req.body || {};
    if (!base64Image) {
      return res.status(400).json({ error: 'Missing base64Image in request body' });
    }

    // Use FormData (Node fetch supports it in the Vercel environment)
    const formData = new FormData();
    formData.append('apikey', process.env.OCR_API_KEY);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'false');
    // OCR.space expects the field name like base64Image or base64image (the provider's docs).
    formData.append('base64Image', base64Image);

    const ocrRes = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const data = await ocrRes.json();
    return res.status(ocrRes.status).json(data);
  } catch (err) {
    console.error('Error forwarding to OCR:', err);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
}