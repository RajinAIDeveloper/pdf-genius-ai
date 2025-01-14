// pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'GeminiChat',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-pro:free",
        messages: req.body.messages
      })
    });

    const data = await openrouterResponse.json();
    
    if (!openrouterResponse.ok) {
      return res.status(openrouterResponse.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ error: error.message });
  }
}