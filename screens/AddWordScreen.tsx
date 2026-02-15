import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addNewWord } from '../src/api';

// Type declaration for Vite environment variables
declare global {
  interface ImportMetaEnv {
    VITE_YOUDAO_APP_KEY: string;
    VITE_YOUDAO_APP_SECRET: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Define the structure of the dictionary response
interface DictionaryResult {
  term: string;
  phonetic: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  partOfSpeech: string;
  translation: string;
  definition: string;
  examples?: Array<{
    key: string;
    value: string[];
  }>;
}

// Youdao Dictionary API response interface
interface YoudaoResponse {
  errorCode: string;
  query: string;
  translation?: string[];
  basic?: {
    phonetic?: string;
    'uk-phonetic'?: string;
    'us-phonetic'?: string;
    explains?: string[];
  };
  web?: Array<{
    key: string;
    value: string[];
  }>;
}

// Helper function to generate SHA-256 hash
const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper function to generate Youdao API sign
const generateYoudaoSign = async (appKey: string, appSecret: string, q: string, salt: string, curtime: string): Promise<string> => {
  const str = appKey + truncate(q) + salt + curtime + appSecret;
  return await sha256(str);
};

// Helper function to truncate string for Youdao API
const truncate = (q: string): string => {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
};

// Helper function to extract word information from Youdao response
const extractWordInfoFromYoudao = (data: YoudaoResponse, originalTerm: string): DictionaryResult => {
  const term = originalTerm.charAt(0).toUpperCase() + originalTerm.slice(1);
  
  // Extract phonetic from Youdao response
  const phonetic = data.basic?.phonetic || '';
  const ukPhonetic = data.basic?.['uk-phonetic'] || '';
  const usPhonetic = data.basic?.['us-phonetic'] || '';
  
  // Extract translation (Chinese meaning)
  const translation = data.translation?.[0] || '';
  
  // Extract definition from explains or web
  let definition = '';
  let partOfSpeech = '';
  
  if (data.basic?.explains && data.basic.explains.length > 0) {
    // Parse the first explain to get part of speech and definition
    const firstExplain = data.basic.explains[0];
    const posMatch = firstExplain.match(/^([a-zA-Z]+)\.\s*(.+)$/);
    if (posMatch) {
      partOfSpeech = posMatch[1];
      definition = data.basic.explains.join('; ');
    } else {
      definition = data.basic.explains.join('; ');
    }
  } else if (data.web && data.web.length > 0) {
    definition = data.web[0].value.join('; ');
  }
  
  // If no definition found, use translation as definition
  if (!definition && translation) {
    definition = translation;
  }
  
  return {
    term,
    phonetic: phonetic ? `[${phonetic}]` : (ukPhonetic || usPhonetic ? `[${ukPhonetic || usPhonetic}]` : ''),
    ukPhonetic: ukPhonetic ? `[${ukPhonetic}]` : '',
    usPhonetic: usPhonetic ? `[${usPhonetic}]` : '',
    partOfSpeech,
    translation,
    definition,
    examples: data.web || []
  };
};

export const AddWordScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call backend proxy API to avoid CORS issues
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const q = searchTerm.trim();
      
      const url = `${API_BASE_URL}/api/dictionary/youdao?q=${encodeURIComponent(q)}`;
      console.log("Calling backend proxy:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data: YoudaoResponse = await response.json();
      console.log("Youdao API response:", data);
      
      // Check for API errors
      if (data.errorCode !== '0') {
        const errorMessages: Record<string, string> = {
          '101': 'Missing required parameters',
          '102': 'Unsupported language type',
          '103': 'Translation text too long',
          '104': 'Unsupported API type',
          '105': 'Unsupported signature type',
          '106': 'Unsupported response type',
          '107': 'Unsupported transport encryption',
          '108': 'Invalid app key',
          '109': 'Invalid batchLog format',
          '110': 'No valid app for related service',
          '111': 'Invalid developer account',
          '112': 'Invalid request service',
          '113': 'Query content cannot be empty',
          '114': 'Unsupported image format',
          '116': 'Invalid strict field value',
          '201': 'Decryption failed',
          '202': 'Signature verification failed',
          '203': 'Access IP not in whitelist',
          '205': 'Requested interface inconsistent with app platform',
          '206': 'Signature verification failed due to invalid timestamp',
          '207': 'Replay request',
          '301': 'Dictionary query failed',
          '302': 'Translation query failed',
          '303': 'Other server exceptions',
          '401': 'Account has outstanding balance',
          '411': 'Access frequency limited'
        };
        throw new Error(errorMessages[data.errorCode] || `API Error: ${data.errorCode}`);
      }
      
      // Extract word information from Youdao response
      const extractedData = extractWordInfoFromYoudao(data, searchTerm);
      console.log("Extracted word info:", extractedData);
      
      // Check if we got meaningful data
      if (!extractedData.translation && !extractedData.definition) {
        setError("No definition found for this word. Please try another word.");
      } else {
        setResult(extractedData);
      }
    } catch (err: any) {
      console.error("Dictionary lookup failed:", err);
      console.error("Error details:", err.message);
      setError(`Search failed: ${err.message || 'Please check your connection or try another word'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToReview = async () => {
    if (!result) return;
    
    try {
      // Add the word to the database
      await addNewWord({
        term: result.term,
        phonetic: result.phonetic,
        translation: result.translation,
        partOfSpeech: result.partOfSpeech,
        definition: result.definition
      });
      
      // Optionally show success feedback
      alert(`${result.term} 已添加到您的词汇表！`);
      
      // Clear the form
      setSearchTerm('');
      setResult(null);
    } catch (err) {
      console.error("Failed to add word to database:", err);
      setError("Failed to save word. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 flex items-center bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md p-4 pb-2 justify-center border-b border-gray-200 dark:border-white/5 pt-12">
        <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] text-center">Add New Word</h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-6 px-5 py-6 overflow-y-auto pb-32">
        
        {/* Search Input Section */}
        <div className="flex flex-col gap-4">
          <label className="flex flex-col w-full">
            <span className="text-sm font-medium text-text-secondary mb-2 ml-1">Enter a word to look up</span>
            <div className={`relative flex w-full items-center rounded-xl bg-white dark:bg-surface-dark border transition-all shadow-sm ${error ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200 dark:border-surface-highlight focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'}`}>
              <div className="flex items-center justify-center pl-4 text-text-secondary">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="flex w-full min-w-0 flex-1 resize-none bg-transparent h-14 placeholder:text-gray-400 dark:placeholder:text-text-secondary/50 p-4 text-gray-900 dark:text-white focus:outline-0 border-none text-lg font-medium leading-normal" 
                placeholder="例如：Ephemeral" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mr-2 p-2 text-text-secondary hover:text-white transition-colors rounded-full hover:bg-white/10"
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>
            {error && <span className="text-red-400 text-xs mt-2 ml-1">{error}</span>}
          </label>
          
          <button 
            onClick={handleSearch}
            disabled={isLoading || !searchTerm.trim()}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-background-dark border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-background-dark text-lg font-bold leading-normal tracking-[0.015em]">Search</span>
            )}
          </button>
        </div>

        {/* Result Section */}
        {result && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-gray-200 dark:border-surface-highlight shadow-sm">
              {/* Word Header */}
              <div className="flex items-baseline gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-surface-highlight flex-wrap">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{result.term}</h3>
                {result.partOfSpeech && (
                  <span className="text-primary text-sm font-medium px-2 py-1 bg-primary/10 rounded-lg">{result.partOfSpeech}</span>
                )}
              </div>
              
              {/* Phonetic */}
              {result.phonetic && (
                <div className="mb-4">
                  <span className="text-text-secondary font-mono text-lg">{result.phonetic}</span>
                </div>
              )}

              {/* Definition */}
              <div className="mb-4">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Definition</span>
                <p className="text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">{result.definition || 'No definition available'}</p>
              </div>

              {/* Examples */}
              {result.examples && result.examples.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Examples</span>
                  <div className="mt-2 space-y-3">
                    {result.examples.slice(0, 5).map((example, index) => (
                      <div key={index} className="bg-background-light dark:bg-white/5 p-3 rounded-lg">
                        <p className="text-primary text-sm font-medium mb-2">{example.key}</p>
                        <div className="space-y-1">
                          {example.value.slice(0, 3).map((sentence, sIndex) => (
                            <p key={sIndex} className="text-gray-700 dark:text-gray-300 text-sm">{sentence}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add Button */}
            <button 
              onClick={handleAddToReview}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-surface-highlight hover:bg-surface-highlight/80 active:scale-[0.98] transition-all border border-gray-200 dark:border-white/10"
            >
              <span className="material-symbols-outlined mr-2 text-primary">add_circle</span>
              <span className="text-white text-lg font-bold leading-normal tracking-[0.015em]">Add to Vocabulary</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!result && !isLoading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 opacity-50">
            <span className="material-symbols-outlined text-6xl mb-4 text-text-secondary">menu_book</span>
          </div>
        )}

      </div>
    </div>
  );
};
