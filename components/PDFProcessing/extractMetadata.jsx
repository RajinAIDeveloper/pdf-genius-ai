import React from 'react'

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

export default extractMetadata