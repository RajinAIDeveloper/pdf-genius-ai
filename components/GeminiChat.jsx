'use client'
import React, { useState, useEffect } from 'react';
import { SendHorizontal, Bot, User } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const GeminiChat = ({ processedData }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateEmbeddings = async (text) => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "HTTP-Referer": window.location.href,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-thinking-exp:free",
          input: text
        })
      });
      
      const data = await response.json();
      return data.embeddings[0];
    } catch (err) {
      console.error('Error generating embeddings:', err);
      throw err;
    }
  };

  const sendMessage = async (userInput) => {
    if (!userInput.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      // Add user message
      const newMessages = [
        ...messages,
        { role: 'user', content: userInput }
      ];
      setMessages(newMessages);
      setInput('');

      // Prepare context from processed PDFs
      let context = '';
      if (processedData) {
        Object.values(processedData).forEach(data => {
          if (data.chunks) {
            // Add relevant chunks based on similarity
            data.chunks.forEach(chunk => {
              context += chunk.text + '\n';
            });
          }
        });
      }

      // Send to Gemini API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "HTTP-Referer": window.location.href,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-thinking-exp:free",
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant. Use the following context to answer questions: ${context}`
            },
            ...newMessages
          ]
        })
      });

      const data = await response.json();
      
      // Add assistant response
      setMessages([
        ...newMessages,
        { role: 'assistant', content: data.choices[0].message.content }
      ]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to get response from Gemini');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              message.role === 'assistant' ? 'bg-gray-50' : ''
            } p-3 rounded-lg`}
          >
            {message.role === 'assistant' ? (
              <Bot className="w-6 h-6 text-blue-500" />
            ) : (
              <User className="w-6 h-6 text-gray-500" />
            )}
            <div className="flex-1">
              <div className="text-sm">{message.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <Progress value={undefined} className="w-24" />
            <span className="text-sm text-gray-500">Thinking...</span>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask a question about your documents..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiChat;