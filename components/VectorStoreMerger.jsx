'use client'
import React, { useState, useRef } from 'react';
import { Upload, Download, Trash2, FileText } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import VectorStore from '@/services/VectorStore';

const VectorStoreMerger = () => {
  const [files, setFiles] = useState([]);
  const [mergedDocuments, setMergedDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const vectorStore = new VectorStore();

  const processFile = async (file) => {
    try {
      const text = await file.text();
      const documents = JSON.parse(text);
      
      if (!Array.isArray(documents)) {
        throw new Error('Invalid vector store file format');
      }
      
      return documents.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          sourceFile: file.name,
          importedAt: new Date().toISOString()
        }
      }));
    } catch (err) {
      throw new Error(`Error processing ${file.name}: ${err.message}`);
    }
  };

  const handleFileUpload = async (event) => {
    const newFiles = Array.from(event.target.files);
    if (newFiles.length === 0) return;

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const mergeFiles = async () => {
    setIsProcessing(true);
    setError(null);
    vectorStore.clear();

    try {
      let allDocuments = [];
      
      // Process each file
      for (const file of files) {
        const documents = await processFile(file);
        allDocuments = [...allDocuments, ...documents];
      }

      // Deduplicate by ID if needed
      const uniqueDocuments = _.uniqBy(allDocuments, 'id');
      
      // Add to vector store
      uniqueDocuments.forEach(doc => vectorStore.addDocument(doc));
      
      setMergedDocuments(uniqueDocuments);
      vectorStore.saveToLocalStorage();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportMerged = () => {
    const documents = vectorStore.getAllDocuments();
    const blob = new Blob([JSON.stringify(documents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged_vector_store_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <p className="text-lg mb-2">Upload Vector Store Files</p>
        <p className="text-sm text-gray-500">Select multiple .json files to merge</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="application/json"
          multiple
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Selected Files</h3>
            <div className="space-x-2">
              <button
                onClick={mergeFiles}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                Merge Files
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {mergedDocuments.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Merged Vector Store</h3>
              <p className="text-sm text-gray-500">
                {mergedDocuments.length} total documents
              </p>
            </div>
            <button
              onClick={exportMerged}
              className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Merged Store
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Documents</p>
                <p className="font-medium">{mergedDocuments.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Source Files</p>
                <p className="font-medium">{files.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VectorStoreMerger;