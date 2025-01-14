// app/api/openrouter/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { endpoint, ...body } = await req.json();
    
    console.log('OpenRouter API request:', { endpoint, body }); // Debug log

    const response = await fetch(`https://openrouter.ai/api/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || 'http://localhost:3000',
        "X-Title": process.env.SITE_NAME || 'GeminiChat',
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('OpenRouter API response:', data); // Debug log

    if (!response.ok) {
      console.error('OpenRouter API error:', data);
      throw new Error(data.error?.message || response.statusText);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}