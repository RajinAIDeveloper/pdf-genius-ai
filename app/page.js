
import React from 'react';
import PDFProcessor from '@/components/PDFProcessor';
import GeminiChat from '@/components/GeminiChat';
import EmbeddingConverter from '@/components/ui/EmbeddingConverter';
import VectorStoreMerger from '@/components/VectorStoreMerger';


const RAGApp = () => {
  return (
    <div>
      <PDFProcessor />
      <GeminiChat/>
      <EmbeddingConverter/>
      <VectorStoreMerger/>
    </div>
  );
};


export default RAGApp;
