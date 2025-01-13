// services/geminiService.js

const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

class GeminiService {
  constructor() {
    this.apiKey = OPENROUTER_API_KEY;
    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "HTTP-Referer": "https://localhost:3000",  // Required by OpenRouter
      "X-Title": "PDF Processor",  // Optional identifier
      "Content-Type": "application/json",
      "OR-Organization": "pdf-processor-org" // Optional organization identifier
    };
  }

  async generateEmbeddings(text) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          model: "google/gemini-2.0-embeddings:free",  // Using embeddings-specific model
          input: text.substring(0, 2048)  // Limit input length
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Embedding API Error:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.embeddings || !data.embeddings[0]) {
        throw new Error('No embeddings returned from API');
      }
      return data.embeddings[0];
    } catch (error) {
      console.error('Error generating embeddings:', error);
      // Return a zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  async smartChunk(text) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          model: "google/gemini-pro",  // Using the more stable pro model
          messages: [
            {
              role: "system",
              content: "You are a text processing assistant. Split the given text into meaningful chunks (max 5 chunks) while preserving context. Return JSON array of chunks."
            },
            {
              role: "user",
              content: `Split this text into meaningful chunks (max 5). Return only a JSON array of strings, no other text: ${text.substring(0, 4000)}...`
            }
          ],
          temperature: 0.1  // Lower temperature for more consistent results
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Chunking API Error:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      const chunks = JSON.parse(data.choices[0].message.content);
      return chunks.map((chunk, index) => ({
        id: `chunk-${index}`,
        text: chunk,
        wordCount: chunk.split(/\s+/).length
      }));
    } catch (error) {
      console.error('Error smart chunking:', error);
      // Fallback to basic chunking
      return this.basicChunk(text);
    }
  }

  async enhanceMetadata(text) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          model: "google/gemini-pro",
          messages: [
            {
              role: "system",
              content: "Generate metadata JSON with these fields only: topics (array), keyConcepts (array), documentType (string), summary (string). Keep it concise."
            },
            {
              role: "user",
              content: `Analyze this text and return only JSON metadata: ${text.substring(0, 4000)}...`
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Metadata API Error:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error enhancing metadata:', error);
      // Return basic metadata as fallback
      return {
        topics: [],
        keyConcepts: [],
        documentType: "Unknown",
        summary: "Unable to generate summary"
      };
    }
  }

  basicChunk(text, size = 1000) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).length;
      if (currentSize + sentenceWords > size && currentChunk.length > 0) {
        chunks.push({
          id: `chunk-${chunks.length}`,
          text: currentChunk.join(' '),
          wordCount: currentSize
        });
        currentChunk = [];
        currentSize = 0;
      }
      currentChunk.push(sentence.trim());
      currentSize += sentenceWords;
    }
    
    if (currentChunk.length > 0) {
      chunks.push({
        id: `chunk-${chunks.length}`,
        text: currentChunk.join(' '),
        wordCount: currentSize
      });
    }
    
    return chunks;
  }
}

export default GeminiService;