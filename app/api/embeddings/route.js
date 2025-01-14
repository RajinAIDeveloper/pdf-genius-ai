// app/api/embeddings/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Log environment variables (remove in production)
    console.log('Checking environment variables:');
    console.log('API Key exists:', !!process.env.OPENROUTER_API_KEY);
    console.log('Site URL:', process.env.NEXT_PUBLIC_SITE_URL);

    const body = await request.json();

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    // Ensure input text exists and is within length limits
    if (!body.input) {
      return NextResponse.json(
        { error: 'Input text is required' },
        { status: 400 }
      );
    }

    const text = String(body.input).substring(0, 2048);

    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'GeminiChat',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.model || 'google/gemini-2.0-embeddings:free',
        input: text
      })
    });

    // Log the OpenRouter response status (remove in production)
    console.log('OpenRouter response status:', openrouterResponse.status);

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: errorData },
        { status: openrouterResponse.status }
      );
    }

    const data = await openrouterResponse.json();

    // Validate response format
    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    return NextResponse.json({
      embeddings: data.embeddings,
      model: data.model,
      usage: data.usage
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Optional: Add GET method if needed
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}