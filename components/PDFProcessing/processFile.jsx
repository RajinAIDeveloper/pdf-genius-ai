import React from 'react'

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
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
  
        setProgressMap(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            pages: Math.round((i / pdf.numPages) * 100)
          }
        }));
      }
  
      // Get basic metadata
      const basicMetadata = await extractMetadata(pdf, fullText);
  
      // Use Gemini to enhance metadata
      const enhancedMetadata = await geminiService.enhanceMetadata(fullText);
      const metadata = { ...basicMetadata, ...enhancedMetadata };
  
      // Use Gemini for smart chunking
      const chunks = await geminiService.smartChunk(fullText);
  
      // Generate embeddings for each chunk
      const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk) => {
          const embedding = await geminiService.generateEmbeddings(chunk.text);
          return { ...chunk, embedding };
        })
      );
  
      const processedText = {
        text: fullText,
        chunks: chunksWithEmbeddings,
        numPages: pdf.numPages,
        metadata,
        stats: {
          wordCount: fullText.split(/\s+/).length,
          characterCount: fullText.length,
          pageCount: pdf.numPages,
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

export default processFile