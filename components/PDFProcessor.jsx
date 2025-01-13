'use client'
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Eye, 
  Settings, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PDFProcessor = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(true);
  const dropZoneRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});
  const [error, setError] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [processedData, setProcessedData] = useState({});
  const [chunkSize, setChunkSize] = useState(1000);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef(null);
  const [pdfjsLib, setPdfjsLib] = useState(null);

  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        if (!pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.async = true;
          script.onload = () => {
            const pdfjsLib = window['pdfjs-dist/build/pdf'];
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
            setPdfjsLib(pdfjsLib);
          };
          document.body.appendChild(script);
        } else {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          setPdfjsLib(pdfjsLib);
        }
      } catch (err) {
        console.error('Error loading PDF.js:', err);
        setError('Failed to load PDF processing library');
      }
    };

    loadPdfJs();
  }, []);

  const extractMetadata = async (pdf, initialText = '') => {
    try {
      const metadata = await pdf.getMetadata();
      const info = metadata?.info || {};
      
      // First perform content analysis
      const analyzeContent = (text) => {
        // Extract potential title from first substantial line
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const potentialTitle = lines[0]?.trim().split(/[.!?]/)?.shift()?.trim() || null;
        
        // Extract keywords using frequency analysis
        const words = text.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => 
            word.length > 3 && 
            !['this', 'that', 'then', 'than', 'with', 'from'].includes(word)
          );
        
        const wordFrequency = {};
        words.forEach(word => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });
        
        // Get top keywords
        const keywords = Object.entries(wordFrequency)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([word]) => word);
        
        // Detect document type
        const textLower = text.toLowerCase();
        const docType = 
          textLower.includes('financial') && textLower.includes('statement') ? 'Financial Document' :
          textLower.includes('strategy') ? 'Strategy Document' :
          textLower.includes('audit') ? 'Audit Document' :
          textLower.includes('report') ? 'Report' :
          'General Document';
        
        return {
          detectedTitle: potentialTitle,
          keywords,
          documentType: docType,
          contentFeatures: {
            hasFormulas: /[=+\-*/(){}[\]]+/.test(text),
            hasTables: text.includes('|') || /\|\s*\w+\s*\|/.test(text),
            hasLists: /^\s*[-•*]\s+/m.test(text) || /^\s*\d+\.\s+/m.test(text)
          }
        };
      };

      // Perform content analysis
      const contentAnalysis = analyzeContent(initialText);
      
      // Parse dates
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        try {
          if (dateStr.startsWith('D:')) {
            const cleaned = dateStr.substring(2);
            return new Date(
              cleaned.substring(0, 4),
              parseInt(cleaned.substring(4, 6)) - 1,
              cleaned.substring(6, 8),
              cleaned.substring(8, 10) || '00',
              cleaned.substring(10, 12) || '00',
              cleaned.substring(12, 14) || '00'
            );
          }
          return new Date(dateStr);
        } catch (e) {
          console.warn('Failed to parse date:', dateStr);
          return null;
        }
      };

      // Extract text
      const extractText = (value) => {
        if (!value) return null;
        if (typeof value === 'string') {
          const cleaned = value.trim();
          return cleaned || null;
        }
        if (value instanceof Uint8Array) {
          try {
            return new TextDecoder().decode(value).trim() || null;
          } catch (e) {
            return null;
          }
        }
        return null;
      };

      // Build metadata object
      const metadataObj = {
        title: extractText(info.Title) || contentAnalysis.detectedTitle,
        author: extractText(info.Author),
        subject: extractText(info.Subject),
        keywords: info.Keywords ? extractText(info.Keywords).split(',').map(k => k.trim())
                               : contentAnalysis.keywords,
        creator: extractText(info.Creator),
        producer: extractText(info.Producer),
        creationDate: parseDate(info.CreationDate),
        modificationDate: parseDate(info.ModDate),
        documentType: contentAnalysis.documentType,
        contentFeatures: contentAnalysis.contentFeatures,
        pageCount: pdf.numPages,
        isEncrypted: pdf.isEncrypted || false,
        pdfVersion: pdf.version || 'Unknown',
        securityFeatures: {
          isEncrypted: pdf.isEncrypted || false,
          hasDigitalSignature: Boolean(pdf.signatures?.length),
          encryptionMethod: pdf.encryptionMethod || null
        }
      };

      // Filter out null values
      return Object.fromEntries(
        Object.entries(metadataObj).filter(([_, value]) => value != null)
      );

    } catch (err) {
      console.error('Error extracting metadata:', err);
      return {
        pageCount: pdf.numPages,
        pdfVersion: pdf.version || 'Unknown'
      };
    }
  };

  const createChunks = (text, size = chunkSize) => {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += size) {
      chunks.push({
        id: `chunk-${Math.floor(i / size)}`,
        text: words.slice(i, i + size).join(' '),
        wordCount: Math.min(size, words.length - i)
      });
    }
    
    return chunks;
  };

  const processFile = async (file, retryCount = 0) => {
    if (!pdfjsLib) {
      console.log('PDF.js not loaded yet');
      return;
    }

    try {
      setProcessingStatus(prev => ({
        ...prev,
        [file.name]: 'processing'
      }));

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      loadingTask.onProgress = ({ loaded, total }) => {
        setProgressMap(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            loading: Math.round((loaded / total) * 100)
          }
        }));
      };

      const pdf = await loadingTask.promise;
      const metadata = await extractMetadata(pdf);
      const numPages = pdf.numPages;
      let fullText = '';
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';

        setProgressMap(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            pages: Math.round((i / numPages) * 100)
          }
        }));
      }

      const chunks = createChunks(fullText, chunkSize);
      const processedText = {
        text: fullText,
        chunks,
        numPages,
        metadata,
        stats: {
          wordCount: fullText.split(/\s+/).length,
          characterCount: fullText.length,
          pageCount: numPages,
          chunkCount: chunks.length,
          averageChunkSize: Math.floor(fullText.split(/\s+/).length / chunks.length)
        }
      };

      setProcessedData(prev => ({
        ...prev,
        [file.name]: processedText
      }));

      setProcessingStatus(prev => ({
        ...prev,
        [file.name]: 'completed'
      }));

    } catch (err) {
      console.error('Error processing PDF:', err);
      
      if (retryCount < 3) {
        console.log(`Retrying processing ${file.name} (attempt ${retryCount + 1}/3)`);
        setProcessingStatus(prev => ({
          ...prev,
          [file.name]: 'retrying'
        }));
        return await processFile(file, retryCount + 1);
      }

      setProcessingStatus(prev => ({
        ...prev,
        [file.name]: 'error'
      }));
      setError(`Error processing ${file.name}: ${err.message}`);
    }
  };

  const exportAllProcessedData = () => {
    const allData = Object.entries(processedData)
      .filter(([_, data]) => data) // Only include successfully processed files
      .reduce((acc, [fileName, data]) => {
        acc[fileName] = {
          metadata: data.metadata,
          stats: data.stats,
          chunks: data.chunks.map(chunk => ({
            id: chunk.id,
            wordCount: chunk.wordCount,
            text: chunk.text
          }))
        };
        return acc;
      }, {});

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_pdfs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllFiles = () => {
    setFiles([]);
    setProcessingStatus({});
    setProgressMap({});
    setProcessedData({});
    setError(null);
  };

  const handleFileUpload = async (event) => {
    const newFiles = Array.from(event.target.files || []);
    
    if (newFiles.length === 0) return;

    const invalidFiles = newFiles.filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Please upload PDF files only.`);
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
    setError(null);

    newFiles.forEach(file => {
      setProgressMap(prev => ({
        ...prev,
        [file.name]: {
          loading: 0,
          pages: 0
        }
      }));
    });

    for (const file of newFiles) {
      await processFile(file);
    }
  };

  const handleRetry = async (fileName) => {
    const file = files.find(f => f.name === fileName);
    if (file) {
      await processFile(file);
    }
  };

  const removeFile = (fileName) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
    setProcessingStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileName];
      return newStatus;
    });
    setProgressMap(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
    setProcessedData(prev => {
      const newData = { ...prev };
      delete newData[fileName];
      return newData;
    });
  };

  const exportProcessedData = (fileName) => {
    const data = processedData[fileName];
    if (!data) return;

    const exportData = {
      metadata: data.metadata,
      stats: data.stats,
      chunks: data.chunks.map(chunk => ({
        id: chunk.id,
        wordCount: chunk.wordCount,
        text: chunk.text
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace('.pdf', '')}_processed.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ChunkPreview = ({ chunks }) => (
    <div className="space-y-4">
      {chunks.map((chunk, index) => (
        <div key={chunk.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Chunk {index + 1}</span>
            <span className="text-sm text-gray-500">{chunk.wordCount} words</span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-3">{chunk.text}</p>
        </div>
      ))}
    </div>
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (droppedFiles.length === 0) {
      setError("Please drop PDF files only.");
      return;
    }

    setFiles(prev => [...prev, ...droppedFiles]);
    setError(null);

    droppedFiles.forEach(file => {
      setProgressMap(prev => ({
        ...prev,
        [file.name]: {
          loading: 0,
          pages: 0
        }
      }));
    });

    if (batchProcessing) {
      for (const file of droppedFiles) {
        await processFile(file);
      }
    } else {
      await Promise.all(droppedFiles.map(file => processFile(file)));
    }
  };

  const MetadataDisplay = ({ metadata }) => {
    if (!metadata || Object.keys(metadata).every(key => !metadata[key])) {
      return null;
    }

    const formatDate = (date) => {
      if (!date) return null;
      try {
        return new Date(date).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return null;
      }
    };

    return (
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Document Metadata</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
          {metadata.title && (
            <div className="col-span-2">
              <span className="font-medium">Title:</span> {metadata.title}
            </div>
          )}
          {metadata.author && (
            <div className="col-span-2">
              <span className="font-medium">Author:</span> {metadata.author}
            </div>
          )}
          {metadata.subject && (
            <div className="col-span-2">
              <span className="font-medium">Subject:</span> {metadata.subject}
            </div>
          )}
          {metadata.keywords && (
            <div className="col-span-2">
              <span className="font-medium">Keywords:</span> {metadata.keywords}
            </div>
          )}
          {metadata.creationDate && (
            <div>
              <span className="font-medium">Created:</span> {formatDate(metadata.creationDate)}
            </div>
          )}
          {metadata.modificationDate && (
            <div>
              <span className="font-medium">Modified:</span> {formatDate(metadata.modificationDate)}
            </div>
          )}
          {metadata.producer && (
            <div>
              <span className="font-medium">Producer:</span> {metadata.producer}
            </div>
          )}
          {metadata.creator && (
            <div>
              <span className="font-medium">Creator:</span> {metadata.creator}
            </div>
          )}
        </div>
      </div>
    );
  };

  const SettingsPanel = () => (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Processing Settings</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          {showSettings ? <ChevronUp /> : <ChevronDown />}
        </button>
      </div>
      
      <Collapsible open={showSettings}>
        <CollapsibleContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Chunk Size (words)
              </label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[chunkSize]}
                  onValueChange={([value]) => setChunkSize(value)}
                  min={100}
                  max={2000}
                  step={100}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 w-16">{chunkSize}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Adjust the number of words per chunk. Smaller chunks are better for specific queries, 
                larger chunks maintain more context.
              </p>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">
                Processing Mode
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBatchProcessing(true)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    batchProcessing
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Sequential
                </button>
                <button
                  onClick={() => setBatchProcessing(false)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    !batchProcessing
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Parallel
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sequential processing handles files one at a time, while parallel processes all files simultaneously.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SettingsPanel />

      <div 
        ref={dropZoneRef}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'hover:bg-gray-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="text-lg mb-2">Click to upload PDFs</p>
        <p className="text-sm text-gray-500">or drag and drop</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf"
          multiple
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>
          <div className="space-y-4">
            {files.map((file, index) => (
              <div 
                key={index}
                className="p-4 bg-white rounded-lg border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {processingStatus[file.name] === 'completed' && (
                      <>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Preview chunks"
                            >
                              <Eye className="h-4 w-4 text-gray-500" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Chunks Preview - {file.name}</DialogTitle>
                            </DialogHeader>
                            <ChunkPreview chunks={processedData[file.name]?.chunks || []} />
                          </DialogContent>
                        </Dialog>
                        <button
                          onClick={() => exportProcessedData(file.name)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Export processed data"
                        >
                          <Download className="h-4 w-4 text-gray-500" />
                        </button>
                      </>
                    )}
                    {processingStatus[file.name] === 'error' && (
                      <button
                        onClick={() => handleRetry(file.name)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Retry processing"
                      >
                        <RefreshCw className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                    <button
                      onClick={() => removeFile(file.name)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`text-sm ${
                    processingStatus[file.name] === 'completed' ? 'text-green-500' :
                    processingStatus[file.name] === 'processing' ? 'text-yellow-500' :
                    processingStatus[file.name] === 'error' ? 'text-red-500' :
                    processingStatus[file.name] === 'retrying' ? 'text-orange-500' :
                    'text-gray-500'
                  }`}>
                    {processingStatus[file.name] === 'completed' ? 'Processed' :
                     processingStatus[file.name] === 'processing' ? 'Processing...' :
                     processingStatus[file.name] === 'error' ? 'Failed' :
                     processingStatus[file.name] === 'retrying' ? 'Retrying...' :
                     'Pending'}
                  </span>
                  {processedData[file.name]?.stats && (
                    <span className="text-sm text-gray-500">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  )}
                </div>

                {progressMap[file.name] && (
                  <div className="space-y-2 bg-gray-50 rounded-md p-3 mb-3">
                    <div className="flex justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <RefreshCw 
                          className={`h-3 w-3 ${processingStatus[file.name] === 'processing' ? 'animate-spin' : ''}`}
                        />
                        <span>Loading PDF</span>
                      </div>
                      <span>{progressMap[file.name].loading}%</span>
                    </div>
                    <Progress 
                      value={progressMap[file.name].loading} 
                      className="h-1 bg-gray-200"
                    />
                    
                    <div className="flex justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        <span>Processing Pages</span>
                      </div>
                      <span>{progressMap[file.name].pages}%</span>
                    </div>
                    <Progress 
                      value={progressMap[file.name].pages} 
                      className="h-1 bg-gray-200"
                    />
                  </div>
                )}

                {processedData[file.name] && processingStatus[file.name] === 'completed' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 rounded-md p-3">
                      <div className="text-sm">
                        <div className="text-gray-500">Pages</div>
                        <div className="font-medium">{processedData[file.name].stats.pageCount}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-500">Words</div>
                        <div className="font-medium">{processedData[file.name].stats.wordCount.toLocaleString()}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-500">Chunks</div>
                        <div className="font-medium">{processedData[file.name].stats.chunkCount}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-500">Avg. Chunk</div>
                        <div className="font-medium">{processedData[file.name].stats.averageChunkSize} words</div>
                      </div>
                    </div>

                    <MetadataDisplay metadata={processedData[file.name].metadata} />

                    {processedData[file.name].chunks?.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">Text Chunks</h4>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <button
                                  className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  Preview
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Text Chunks - {file.name}
                                  </DialogTitle>
                                </DialogHeader>
                                <ChunkPreview chunks={processedData[file.name].chunks} />
                              </DialogContent>
                            </Dialog>
                            
                            <button
                              onClick={() => exportProcessedData(file.name)}
                              className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-1"
                              title="Export processed data"
                            >
                              <Download className="h-3 w-3" />
                              Export
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {processedData[file.name].chunks.length} chunks created with approximately {chunkSize} words each
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Add batch actions when files are present */}
      {files.length > 0 && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={exportAllProcessedData}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export All
          </button>
          <button
            onClick={clearAllFiles}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFProcessor;