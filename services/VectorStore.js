// services/VectorStore.js
import _ from 'lodash';

class VectorStore {
  constructor() {
    this.documents = [];
    // Try to load existing documents on initialization
    this.loadFromLocalStorage();
  }

  addDocument(document) {
    // Validate document structure
    if (!document.id || !document.text || !document.embedding) {
      console.error('Invalid document structure:', document);
      return;
    }

    // Check if document with same ID exists
    const existingIndex = this.documents.findIndex(doc => doc.id === document.id);
    if (existingIndex !== -1) {
      // Update existing document
      this.documents[existingIndex] = document;
    } else {
      // Add new document
      this.documents.push(document);
    }

    // Save after each addition
    this.saveToLocalStorage();
    console.log(`Document ${document.id} added. Total documents: ${this.documents.length}`);
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      console.error('Invalid vectors for similarity calculation');
      return 0;
    }

    try {
      const dotProduct = _.sum(_.zipWith(vecA, vecB, (a, b) => a * b));
      const normA = Math.sqrt(_.sum(vecA.map(x => x * x)));
      const normB = Math.sqrt(_.sum(vecB.map(x => x * x)));
      
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (normA * normB);
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return 0;
    }
  }

  // Find most similar documents given a query embedding
  findSimilarDocuments(queryEmbedding, topK = 3) {
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.error('Invalid query embedding');
      return [];
    }

    try {
      return _(this.documents)
        .map(doc => ({
          ...doc,
          similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
        }))
        .orderBy(['similarity'], ['desc'])
        .take(topK)
        .value();
    } catch (error) {
      console.error('Error finding similar documents:', error);
      return [];
    }
  }

  // Save to localStorage with error handling
  saveToLocalStorage(key = 'vectorStore') {
    try {
      const serializedData = JSON.stringify(this.documents);
      localStorage.setItem(key, serializedData);
      console.log(`Saved ${this.documents.length} documents to localStorage`);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      // If localStorage is full, try to save without embeddings
      try {
        const reducedData = this.documents.map(({ id, text, metadata }) => ({ 
          id, text, metadata 
        }));
        localStorage.setItem(key + '_reduced', JSON.stringify(reducedData));
        console.log('Saved reduced data to localStorage');
        return true;
      } catch (e) {
        console.error('Error saving reduced data:', e);
        return false;
      }
    }
  }

  // Load from localStorage with error handling
  loadFromLocalStorage(key = 'vectorStore') {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        this.documents = JSON.parse(stored);
        console.log(`Loaded ${this.documents.length} documents from localStorage`);
        return true;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.documents = [];
      return false;
    }
  }

  // Clear all documents with confirmation
  clear() {
    const count = this.documents.length;
    this.documents = [];
    localStorage.removeItem('vectorStore');
    console.log(`Cleared ${count} documents from store`);
  }

  // Get all documents with optional filtering
  getAllDocuments(filter = {}) {
    try {
      let filtered = this.documents;
      
      // Apply filters if provided
      if (filter.metadata) {
        filtered = filtered.filter(doc => 
          Object.entries(filter.metadata).every(([key, value]) => 
            doc.metadata && doc.metadata[key] === value
          )
        );
      }
      
      return filtered;
    } catch (error) {
      console.error('Error getting documents:', error);
      return [];
    }
  }

  // Get store statistics
  getStats() {
    return {
      totalDocuments: this.documents.length,
      averageEmbeddingLength: this.documents.length > 0 
        ? _.meanBy(this.documents, doc => doc.embedding?.length || 0)
        : 0,
      totalTokens: _.sumBy(this.documents, doc => doc.metadata?.wordCount || 0)
    };
  }
}

export default VectorStore;