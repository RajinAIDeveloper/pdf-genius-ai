'use client'
import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Bot, User, Upload, FileText, Loader, Settings, X } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import VectorStore from '@/services/VectorStore';
import GeminiChatService from '@/services/GeminiChatService';


const GeminiChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vectorStoreLoaded, setVectorStoreLoaded] = useState(false);
  const [debug, setDebug] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const vectorStore = useRef(new VectorStore());
  const geminiServiceRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    geminiServiceRef.current = new GeminiChatService();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addDebugLog = (message) => {
    setDebug(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log(message);
  };

  const loadVectorStore = async (file) => {
    try {
      addDebugLog(`Loading vector store from file: ${file.name}`);
      const text = await file.text();
      const documents = JSON.parse(text);
      
      if (!Array.isArray(documents)) {
        throw new Error('Invalid vector store format');
      }

      addDebugLog(`Parsed ${documents.length} documents from file`);
      
      vectorStore.current.clear();
      documents.forEach(doc => vectorStore.current.addDocument(doc));
      vectorStore.current.saveToLocalStorage();
      
      setVectorStoreLoaded(true);
      setError(null);
      addDebugLog('Vector store loaded successfully');

      // Add system message about loaded context
      setMessages([{
        role: 'system',
        content: `Loaded ${documents.length} documents into context. You can now ask questions about the content.`,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setError('Error loading vector store: ' + err.message);
      addDebugLog(`Error loading vector store: ${err.message}`);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      loadVectorStore(file);
    }
  };

  // Update this section in your GeminiChat component
  
const findRelevantContext = async (query) => {
    try {

        addDebugLog('Generating query embedding');
      const queryEmbedding = await geminiServiceRef.current.generateEmbeddings(query);
      
      
      addDebugLog('Finding similar documents');
      const similarDocs = vectorStore.current.findSimilarDocuments(queryEmbedding, 3);
      
      if (!similarDocs || similarDocs.length === 0) {
        addDebugLog('No similar documents found');
        return [];
      }
      
      return similarDocs.map(doc => ({
        text: doc.text,
        source: doc.metadata?.sourceFile || 'Unknown',
        similarity: doc.similarity.toFixed(3),
        metadata: doc.metadata
      }));
    } catch (err) {
      addDebugLog(`Error finding context: ${err.message}`);
      console.error('Full error:', err);
      throw new Error(`Error finding relevant context: ${err.message}`);
    }
  };
  
  const sendMessage = async (userInput) => {
    if (!userInput.trim()) return;
    if (!vectorStoreLoaded) {
      setError('Please load a vector store file first');
      return;
    }
    
    setLoading(true);
    setError(null);
  
    try {
      addDebugLog('Starting to process message');
      
      // Add user message
      const newMessages = [
        ...messages,
        { 
          role: 'user', 
          content: userInput,
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(newMessages);
      setInput('');
  
      // Find relevant context
      const context = await findRelevantContext(userInput);
      addDebugLog(`Found ${context.length} relevant contexts`);
  
      // Prepare system message with context
      const systemMessage = `You are a helpful assistant answering questions based on the provided context. 
      When answering, cite your sources using [Source] notation and include the similarity score.
      Here is the relevant context:
  
      ${context.map(doc => `[${doc.source}] (Similarity: ${doc.similarity}):\n${doc.text}`).join('\n\n')}`;
  
      // Get response using GeminiService
      addDebugLog('Generating chat completion');
      const response = await geminiServiceRef.current.generateChatCompletion(
        newMessages.filter(m => m.role !== 'system'),
        systemMessage
      );
      
      addDebugLog('Successfully generated response');
  
      // Add assistant response
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: response,
          context: context,
          timestamp: new Date().toISOString()
        }
      ]);
  
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Error: ${err.message}`);
      addDebugLog(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-5xl mx-auto bg-slate-400">
      {/* Header - Made responsive */}
      <div className="bg-slate-300 border-b px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
          <h1 className="text-base sm:text-xl font-semibold text-gray-800">GeminiChat</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1 sm:gap-2 transition-colors"
          >
            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{vectorStoreLoaded ? 'Change Context' : 'Load Context'}</span>
            <span className="sm:hidden">{vectorStoreLoaded ? 'Change' : 'Load'}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* Main Content - Responsive padding and spacing */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-4">
        {error && (
          <Alert variant="destructive" className="mb-2 sm:mb-4">
            <AlertDescription className="text-sm">{error}</AlertDescription>
            <button
              onClick={() => setError(null)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </Alert>
        )}

        {/* Messages - Responsive layout */}
        <div className="flex-1 overflow-y-auto px-0 sm:px-4 space-y-2 sm:space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 sm:gap-4 ${
                message.role === 'assistant' 
                  ? 'bg-white' 
                  : message.role === 'system' 
                  ? 'bg-blue-50 border border-blue-100' 
                  : 'bg-gray-100'
              } p-2.5 sm:p-4 rounded-xl shadow-sm transition-all hover:shadow-md`}
            >
              <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                message.role === 'assistant' 
                  ? 'bg-blue-100' 
                  : message.role === 'system' 
                  ? 'bg-blue-200' 
                  : 'bg-gray-200'
              }`}>
                {message.role === 'assistant' ? (
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                ) : message.role === 'system' ? (
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                )}
              </div>
              <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                <div className="prose prose-sm max-w-none text-gray-700 text-sm sm:text-base break-words">
                  {message.content}
                </div>
                {message.context && (
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1.5 sm:mb-2">Sources:</div>
                    <div className="grid gap-1.5 sm:gap-2">
                      {message.context.map((ctx, idx) => (
                        <div 
                          key={idx} 
                          className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 text-xs bg-gray-50 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-700 truncate min-w-0 flex-1">
                            {ctx.source}
                          </span>
                          <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">
                            ({Math.round(ctx.similarity * 100)}% relevant)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Responsive sizing */}
        <div className="mt-2 sm:mt-4 bg-white rounded-xl shadow-sm border p-2 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder={vectorStoreLoaded ? "Ask a question..." : "Load context first"}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm text-black bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              disabled={loading || !vectorStoreLoaded}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim() || !vectorStoreLoaded}
              className="px-3 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span className="hidden sm:inline">Processing...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <SendHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Debug Panel - Responsive design */}
      {showDebug && (
        <div className="border-t bg-white p-2 sm:p-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">Debug Log</h3>
            <button
              onClick={() => setShowDebug(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className="text-xs font-mono text-gray-600 max-h-24 sm:max-h-32 overflow-y-auto bg-gray-50 p-2 sm:p-3 rounded-lg">
            {debug.map((log, i) => (
              <div key={i} className="py-0.5 break-words">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiChat;