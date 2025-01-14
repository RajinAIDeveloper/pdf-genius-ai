import { GoogleGenerativeAI } from "@google/generative-ai";
import ResponseFormatter from "./ResonseFormatterUtility";

export default class GeminiChatService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    this.chatModel = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
    this.contextMemory = new Map(); // Store processed context for better retrieval
  }

  // Process and analyze context for better understanding
  processContext(context) {
    return context.map(doc => {
      // Extract key information
      const keyPoints = this.extractKeyPoints(doc.text);
      const topics = this.identifyTopics(doc.text);
      
      return {
        ...doc,
        keyPoints,
        topics,
        processed: true
      };
    });
  }

  // Extract key points from text
  extractKeyPoints(text) {
    // Split into sentences and identify important ones
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.filter(sentence => 
      // Filter for sentences that likely contain key information
      sentence.includes("key") ||
      sentence.includes("important") ||
      sentence.includes("must") ||
      sentence.includes("should") ||
      sentence.includes("will") ||
      sentence.toLowerCase().includes("note") ||
      sentence.match(/^(this|these|those|it)\s+is/i)
    );
  }

  // Identify main topics in text
  identifyTopics(text) {
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    // Count word frequencies
    const wordFreq = {};
    words.forEach(word => {
      if (!commonWords.has(word) && word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // Return top topics
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Enhanced chat completion with smarter context processing
  async generateChatCompletion(messages, systemMessage) {
    try {
      // Extract context information if present
      const contextMatch = systemMessage.match(/Here is the relevant context:([\s\S]*)/);
      const contextExists = !!contextMatch;
      
      // Process context if it exists
      let processedContext = [];
      if (contextExists) {
        const contextTexts = contextMatch[1].split('\n\n')
          .filter(text => text.trim().length > 0)
          .map(text => {
            const sourceMatch = text.match(/\[(.*?)\]/);
            const similarityMatch = text.match(/Similarity: ([\d.]+)/);
            return {
              source: sourceMatch ? sourceMatch[1] : 'Unknown',
              similarity: similarityMatch ? parseFloat(similarityMatch[1]) : 0,
              text: text.replace(/\[.*?\].*?:\n/, '').trim()
            };
          });

        processedContext = this.processContext(contextTexts);
      }

      // Enhanced system message with better context understanding
      const enhancedSystemMessage = `${this.generateEnhancedSystemMessage(processedContext, contextExists)}

Query Analysis:
${this.analyzeUserQuery(messages[messages.length - 1].content, processedContext)}

Response Guidelines:
1. Maintain a natural, conversational tone while being informative
2. Structure information clearly using markdown
3. Integrate context smoothly without direct quotes
4. Include relevant examples when helpful
5. Address the user's specific needs while providing valuable additional context
6. Use analogies or comparisons when appropriate to explain complex concepts
7. Highlight key takeaways or action items when relevant

Note: Ensure responses are engaging and informative while maintaining accuracy and relevance.`;

      // Format chat history
      const formattedHistory = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));

      // Initialize chat with enhanced configuration
      const chat = this.chatModel.startChat({
        history: formattedHistory,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        },
      });

      // Generate response with enhanced context
      const result = await chat.sendMessage([{ 
        text: this.createEnhancedPrompt(messages[messages.length - 1].content, enhancedSystemMessage, processedContext)
      }]);
      
      const response = await result.response;
      return ResponseFormatter.formatResponse(response.text());
    } catch (error) {
      console.error('Error in generateChatCompletion:', error);
      throw new Error(`Failed to generate chat completion: ${error.message}`);
    }
  }

  // Generate enhanced system message based on context
  generateEnhancedSystemMessage(processedContext, contextExists) {
    if (!contextExists) {
      return `You are a helpful AI assistant engaged in a natural conversation. 
Provide informative and engaging responses while maintaining a friendly tone.`;
    }

    // Extract key topics and themes from processed context
    const allTopics = processedContext.flatMap(ctx => ctx.topics);
    const uniqueTopics = [...new Set(allTopics)];
    const keyPoints = processedContext.flatMap(ctx => ctx.keyPoints);

    return `You are a knowledgeable AI assistant with access to specific context about: ${uniqueTopics.join(', ')}. 
    
Key Understanding:
${keyPoints.slice(0, 3).map(point => `• ${point}`).join('\n')}

When responding:
1. Integrate this context naturally without directly quoting
2. Connect ideas across different sources when relevant
3. Provide additional context when it adds value
4. Maintain a conversational yet informative tone`;
  }

  // Analyze user query for better response targeting
  analyzeUserQuery(query, processedContext) {
    const queryTopics = this.identifyTopics(query);
    const contextTopics = processedContext.flatMap(ctx => ctx.topics);
    const topicOverlap = queryTopics.filter(topic => contextTopics.includes(topic));

    return `Query Topics: ${queryTopics.join(', ')}
Context Overlap: ${topicOverlap.length > 0 ? topicOverlap.join(', ') : 'No direct overlap'}
Query Type: ${this.determineQueryType(query)}`;
  }

  // Determine type of query for better response formatting
  determineQueryType(query) {
    if (query.match(/\b(what|who|where|when|why|how)\b/i)) {
      return 'Information Seeking';
    } else if (query.match(/\b(can you|could you|please)\b/i)) {
      return 'Request for Action';
    } else if (query.match(/\b(should|would|do you think)\b/i)) {
      return 'Opinion/Advice Seeking';
    } else {
      return 'General Statement/Other';
    }
  }

  // Create enhanced prompt for better response generation
  createEnhancedPrompt(userQuery, systemMessage, processedContext) {
    const contextRelevance = processedContext
      .filter(ctx => ctx.similarity > 0.5)
      .map(ctx => ({
        source: ctx.source,
        topics: ctx.topics,
        keyPoints: ctx.keyPoints
      }));

    return `${systemMessage}

User Query: ${userQuery}

Relevant Context Summary:
${JSON.stringify(contextRelevance, null, 2)}

Please provide a natural, informative response that:
1. Directly addresses the user's query
2. Integrates relevant context seamlessly
3. Maintains a conversational tone
4. Provides additional valuable insights when appropriate`;
  }

  // Generate embeddings with improved error handling
  async generateEmbeddings(text) {
    try {
      console.log('Generating embeddings for text:', text);
      const result = await this.embeddingModel.embedContent(text);
      console.log('Embeddings generated successfully');

      if (!result?.embedding?.values) {
        throw new Error('Invalid response format from embeddings API');
      }

      return result.embedding.values;
    } catch (error) {
      console.error('Error in generateEmbeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }
}