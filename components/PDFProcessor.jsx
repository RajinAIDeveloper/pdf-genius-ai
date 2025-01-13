'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const CHUNK_SIZE = 1000; // Number of words per chunk

const PDFProcessor = () => {
  const [files, setFiles] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});
  const [error, setError] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const fileInputRef = useRef(null);
  const [pdfjsLib, setPdfjsLib] = useState(null);

  useEffect(() => {
    // Load PDF.js library
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

  const createChunks = (text, size = CHUNK_SIZE) => {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += size) {
      chunks.push(words.slice(i, i + size).join(' '));
    }
    
    return chunks;
  };

  const extractMetadata = async (pdf) => {
    try {
      const metadata = await pdf.getMetadata();
      return {
        title: metadata.info?.Title || null,
        author: metadata.info?.Author || null,
        subject: metadata.info?.Subject || null,
        keywords: metadata.info?.Keywords || null,
        creator: metadata.info?.Creator || null,
        creationDate: metadata.info?.CreationDate ? new Date(metadata.info.CreationDate) : null,
        modificationDate: metadata.info?.ModDate ? new Date(metadata.info.ModDate) : null,
        producer: metadata.info?.Producer || null,
      };
    } catch (err) {
      console.warn('Error extracting metadata:', err);
      return {};
    }
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
      
      // Track loading progress
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
      
      // Process each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';

        // Update progress
        setProgressMap(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            pages: Math.round((i / numPages) * 100)
          }
        }));
      }

      // Create chunks
      const chunks = createChunks(fullText);

      const processedText = {
        text: fullText,
        chunks,
        numPages,
        metadata,
        stats: {
          wordCount: fullText.split(/\s+/).length,
          characterCount: fullText.length,
          pageCount: numPages,
          chunkCount: chunks.length
        }
      };

      console.log('Processed PDF:', processedText);

      setProcessingStatus(prev => ({
        ...prev,
        [file.name]: 'completed'
      }));

      return processedText;

    } catch (err) {
      console.error('Error processing PDF:', err);
      
      // Retry logic
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
      return null;
    }
  };

  const handleFileUpload = async (event) => {
    const newFiles = Array.from(event.target.files || []);
    
    if (newFiles.length === 0) return;

    // Validate file types
    const invalidFiles = newFiles.filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Please upload PDF files only.`);
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
    setError(null);

    // Initialize progress for new files
    newFiles.forEach(file => {
      setProgressMap(prev => ({
        ...prev,
        [file.name]: {
          loading: 0,
          pages: 0
        }
      }));
    });

    // Process each file
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
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return 'text-yellow-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'retrying':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'retrying':
        return 'Retrying...';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div 
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
        onClick={() => fileInputRef.current?.click()}
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
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm ${getStatusColor(processingStatus[file.name])}`}>
                      {getStatusText(processingStatus[file.name])}
                    </span>
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

                {progressMap[file.name] && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Loading PDF</span>
                      <span>{progressMap[file.name].loading}%</span>
                    </div>
                    <Progress value={progressMap[file.name].loading} className="h-1" />
                    
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Processing Pages</span>
                      <span>{progressMap[file.name].pages}%</span>
                    </div>
                    <Progress value={progressMap[file.name].pages} className="h-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFProcessor;

