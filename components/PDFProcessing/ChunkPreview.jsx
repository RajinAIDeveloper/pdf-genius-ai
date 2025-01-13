// components/ChunkPreview.jsx
'use client'
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Hash, FileText, AlignLeft, BarChart2 } from 'lucide-react';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ChunkPreview = ({ chunks }) => {
  const [expandedChunks, setExpandedChunks] = useState({});
  
  const analyzeChunk = (text) => {
    // Basic chunk analysis
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const characters = text.length;
    const avgWordLength = Math.round((text.length / words.length) * 10) / 10;
    const avgSentenceLength = Math.round((words.length / sentences.length) * 10) / 10;
    
    // Detect content features
    const hasNumbers = /\d+/.test(text);
    const hasUrls = /https?:\/\/[^\s]+/.test(text);
    const hasEmails = /\S+@\S+\.\S+/.test(text);
    const hasDates = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text);
    
    // Extract potential entities
    const potentialEntities = new Set(
      text.match(/[A-Z][a-z]{1,}(?:\s[A-Z][a-z]{1,}){0,2}/g) || []
    );

    return {
      stats: {
        sentences: sentences.length,
        words: words.length,
        characters,
        avgWordLength,
        avgSentenceLength
      },
      features: {
        hasNumbers,
        hasUrls,
        hasEmails,
        hasDates
      },
      entities: Array.from(potentialEntities).slice(0, 5) // Limit to top 5 entities
    };
  };

  const toggleChunk = (chunkId) => {
    setExpandedChunks(prev => ({
      ...prev,
      [chunkId]: !prev[chunkId]
    }));
  };

  return (
    <div className="space-y-4">
      {chunks.map((chunk, index) => {
        const analysis = analyzeChunk(chunk.text);
        const isExpanded = expandedChunks[chunk.id];

        return (
          <div key={chunk.id} className="border rounded-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Chunk {index + 1}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {chunk.wordCount} words
                  </span>
                  <button
                    onClick={() => toggleChunk(chunk.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              <Collapsible open={isExpanded}>
                <div className="text-sm text-gray-700 mb-4">
                  {chunk.text}
                </div>
                
                <CollapsibleContent>
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Statistics */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                          <BarChart2 className="h-4 w-4 text-gray-400" />
                          Statistics
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-gray-500">Sentences</div>
                            <div className="font-medium">{analysis.stats.sentences}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Words</div>
                            <div className="font-medium">{analysis.stats.words}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Characters</div>
                            <div className="font-medium">{analysis.stats.characters}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Avg Word Length</div>
                            <div className="font-medium">{analysis.stats.avgWordLength}</div>
                          </div>
                        </div>
                      </div>

                      {/* Content Features */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          Content Features
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(analysis.features).map(([feature, hasFeature]) => 
                            hasFeature && (
                              <span 
                                key={feature}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {feature.replace('has', '')}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Named Entities */}
                      {analysis.entities.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 md:col-span-2">
                          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                            <AlignLeft className="h-4 w-4 text-gray-400" />
                            Potential Named Entities
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.entities.map((entity, i) => (
                              <span 
                                key={i}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {entity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChunkPreview;