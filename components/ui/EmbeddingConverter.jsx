'use client';
import React, { useState, useRef } from 'react';
import { Upload, Download, Loader } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import GeminiService from '@/services/GeminiService';
import VectorStore from '@/services/VectorStore';

const EmbeddingConverter = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState([]);  // Debug logs
  const fileInputRef = useRef(null);
  const [processedFiles, setProcessedFiles] = useState([]);
  const geminiService = new GeminiService();
  const vectorStore = new VectorStore();

  const addDebugLog = (message) => {
    setDebug(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log(message);
  };

  const validateJsonStructure = (jsonData) => {
    if (!jsonData) throw new Error('No JSON data found');
    if (!jsonData.chunks) throw new Error('No chunks found in JSON');
    if (!Array.isArray(jsonData.chunks)) throw new Error('Chunks must be an array');
    if (jsonData.chunks.length === 0) throw new Error('Chunks array is empty');
    
    const validChunk = jsonData.chunks.every(chunk => 
      chunk.id && 
      typeof chunk.text === 'string' && 
      chunk.text.length > 0 &&
      typeof chunk.wordCount === 'number'
    );
    
    if (!validChunk) throw new Error('Invalid chunk structure');
    return true;
  };

  const processFile = async (file) => {
    try {
      addDebugLog(`Starting to process file: ${file.name}`);
      
      const text = await file.text();
      addDebugLog(`File read successfully, parsing JSON...`);
      
      const jsonData = JSON.parse(text);
      addDebugLog(`JSON parsed successfully. Validating structure...`);
      
      validateJsonStructure(jsonData);
      addDebugLog(`JSON structure validated. Found ${jsonData.chunks.length} chunks`);
      
      const { chunks, metadata } = jsonData;
      let processedChunks = [];
      let totalChunks = chunks.length;
      
      addDebugLog(`Starting to process ${totalChunks} chunks...`);
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setProgress(Math.round((i / totalChunks) * 100));
        
        addDebugLog(`Processing chunk ${i + 1}/${totalChunks}: ${chunk.id}`);
        
        // Generate embedding for the chunk
        const embedding = await geminiService.generateEmbeddings(chunk.text);
        
        if (!embedding || embedding.length === 0) {
          addDebugLog(`Warning: No embedding generated for chunk ${chunk.id}`);
          continue;
        }
        
        addDebugLog(`Generated embedding of length ${embedding.length} for chunk ${chunk.id}`);
        
        // Create processed chunk with embedding
        const processedChunk = {
          id: chunk.id,
          text: chunk.text,
          embedding: embedding,
          metadata: {
            ...metadata,
            wordCount: chunk.wordCount,
            chunkIndex: i,
            sourceFile: file.name
          }
        };
        
        processedChunks.push(processedChunk);
        vectorStore.addDocument(processedChunk);
        addDebugLog(`Added chunk ${chunk.id} to vector store`);
      }
      
      addDebugLog(`Finished processing ${processedChunks.length} chunks`);
      
      // Save to vector store
      vectorStore.saveToLocalStorage();
      addDebugLog(`Saved to vector store`);
      
      const currentDocs = vectorStore.getAllDocuments();
      addDebugLog(`Current vector store size: ${currentDocs.length} documents`);
      
      setProcessedFiles(prev => [...prev, {
        name: file.name,
        chunks: processedChunks.length
      }]);
      
      return processedChunks;
    } catch (err) {
      addDebugLog(`Error processing file: ${err.message}`);
      throw err;
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setDebug([]); // Clear debug logs

    try {
      addDebugLog(`Starting to process ${files.length} files`);
      
      for (const file of files) {
        await processFile(file);
      }
      
      const finalDocs = vectorStore.getAllDocuments();
      addDebugLog(`Final vector store size: ${finalDocs.length} documents`);
      
    } catch (err) {
      setError(`Error processing files: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const exportVectorStore = () => {
    try {
      const documents = vectorStore.getAllDocuments();
      addDebugLog(`Exporting ${documents.length} documents from vector store`);
      
      const blob = new Blob([JSON.stringify(documents, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vector_store_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addDebugLog('Vector store exported successfully');
    } catch (err) {
      addDebugLog(`Error exporting vector store: ${err.message}`);
      setError(`Error exporting: ${err.message}`);
    }
  };

  const debugVectorStore = () => {
    const stats = vectorStore.getStats();
    addDebugLog('Vector Store Stats:');
    addDebugLog(`Total Documents: ${stats.totalDocuments}`);
    addDebugLog(`Average Embedding Length: ${stats.averageEmbeddingLength}`);
    addDebugLog(`Total Tokens: ${stats.totalTokens}`);
    
    const docs = vectorStore.getAllDocuments();
    addDebugLog(`Raw document count: ${docs.length}`);
    if (docs.length > 0) {
      addDebugLog(`Sample document structure: ${JSON.stringify(docs[0], null, 2)}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div 
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="text-lg mb-2">Click to upload JSON files</p>
        <p className="text-sm text-gray-500">Export files from PDF processor first</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="application/json"
          multiple
          className="hidden"
        />
      </div>

      {isProcessing && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Processing...</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {processedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Processed Files</h3>
            <button
              onClick={exportVectorStore}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Vector Store ({vectorStore.getAllDocuments().length} embeddings)
            </button>
          </div>
          
          <div className="space-y-3">
            {processedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-gray-500">{file.chunks} chunks processed</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Log Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium">Debug Log</h4>
          <button
            onClick={debugVectorStore}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Debug Store
          </button>
        </div>
        <div className="text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
          {debug.map((log, i) => (
            <div key={i} className="py-1">{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmbeddingConverter;