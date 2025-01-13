import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const EmbeddingsPreview = ({ chunks }) => {
  if (!chunks || chunks.length === 0) return null;

  // For visualization, we'll show first 50 dimensions of each embedding
  const prepareEmbeddingData = (embedding) => {
    return embedding.slice(0, 50).map((value, index) => ({
      dimension: index + 1,
      value: value
    }));
  };

  return (
    <div className="space-y-6">
      {chunks.map((chunk, index) => (
        <div key={chunk.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">Chunk {index + 1} Embedding</span>
            <span className="text-sm text-gray-500">
              Dimensions: {chunk.embedding?.length || 0}
            </span>
          </div>
          
          <div className="space-y-4">
            {/* Text Preview */}
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
              <p className="font-medium mb-1">Text:</p>
              <p className="line-clamp-2">{chunk.text}</p>
            </div>
            
            {/* Embedding Visualization */}
            {chunk.embedding && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareEmbeddingData(chunk.embedding)}>
                    <XAxis 
                      dataKey="dimension" 
                      label={{ 
                        value: 'Dimension', 
                        position: 'bottom' 
                      }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Value', 
                        angle: -90, 
                        position: 'insideLeft' 
                      }}
                    />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      dot={false} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Min Value</p>
                <p className="font-medium">
                  {chunk.embedding ? Math.min(...chunk.embedding).toFixed(4) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Max Value</p>
                <p className="font-medium">
                  {chunk.embedding ? Math.max(...chunk.embedding).toFixed(4) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Mean</p>
                <p className="font-medium">
                  {chunk.embedding 
                    ? (chunk.embedding.reduce((a, b) => a + b, 0) / chunk.embedding.length).toFixed(4)
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmbeddingsPreview;