// api.ts - API service for LingoLife app

import { getAuthToken } from './contexts/AuthContext';

// Type declaration for Vite environment variables
declare global {
  interface ImportMetaEnv {
    VITE_API_BASE_URL: string;
    VITE_GEMINI_API_KEY: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Define TypeScript interfaces to match our app's types
interface WordData {
  term: string;
  phonetic?: string;
  translation: string;
  partOfSpeech?: string;
  definition?: string;
}

interface WordResponse {
  id: string;
  user_id: string;
  term: string;
  phonetic: string;
  translation: string;
  part_of_speech: string;
  definition: string;
  known_count: number;
  unknown_count: number;
  created_at: string;
  updated_at?: string;
  last_reviewed_at?: string;
}

// Helper function to get current user ID from localStorage
const getCurrentUserId = (): string => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('lingolife_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.id;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }
  return 'default_user';
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Get user's words from backend
export const getUserWords = async (userId?: string): Promise<WordResponse[]> => {
  try {
    const currentUserId = userId || getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/api/words?userId=${currentUserId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: WordResponse[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user words:', error);
    throw error;
  }
};

// Add a new word to the database
export const addNewWord = async (wordData: WordData, userId?: string): Promise<WordResponse> => {
  try {
    const currentUserId = userId || getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/api/words`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...wordData,
        userId: currentUserId
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: WordResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding word:', error);
    throw error;
  }
};

// Update word statistics (when user reviews)
export const updateWordStats = async (wordId: string, known: boolean, userId?: string): Promise<WordResponse> => {
  try {
    const currentUserId = userId || getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/api/words/${wordId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        known,
        userId: currentUserId
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: WordResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating word stats:', error);
    throw error;
  }
};

// Get words for review
export const getWordsForReview = async (userId?: string): Promise<WordResponse[]> => {
  try {
    const currentUserId = userId || getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/api/words/review?userId=${currentUserId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: WordResponse[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching words for review:', error);
    throw error;
  }
};
