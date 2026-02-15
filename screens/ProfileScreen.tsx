import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Word } from '../types';
import { getUserWords } from '../src/api';
import { useAuth } from '../src/contexts/AuthContext';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserWords = async () => {
      try {
        // Use authenticated user ID or fall back to default
        const fetchedWords = await getUserWords();
        // Convert API response to match our Word type
        const convertedWords: Word[] = fetchedWords.map((word: any) => ({
          id: word.id,
          term: word.term,
          phonetic: word.phonetic || '',
          translation: word.translation,
          knownCount: word.known_count || 0,
          unknownCount: word.unknown_count || 0,
          partOfSpeech: word.part_of_speech || '',
          definition: word.definition || ''
        }));
        setWords(convertedWords);
      } catch (error) {
        console.error('Error fetching words:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserWords();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get display info
  const displayName = user?.username || 'Guest';
  const displayEmail = user?.email || 'guest@example.com';
  const isGuest = !isAuthenticated;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Header */}
      <header className="flex-none pt-12 pb-6 px-6 sticky top-0 z-20 border-b border-gray-200 dark:border-white/5 shadow-sm bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-surface-dark border-2 border-primary/20 overflow-hidden flex items-center justify-center">
              {isGuest ? (
                <span className="material-symbols-outlined text-4xl text-gray-400">person</span>
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {!isGuest && (
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-content rounded-full flex items-center justify-center border-2 border-background-light dark:border-background-dark hover:scale-105 transition-transform shadow-sm">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{displayName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{displayEmail}</p>
            <div className="mt-2 flex gap-3 text-xs">
              {isGuest ? (
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="material-symbols-outlined text-sm">account_circle</span>
                  <span>Guest</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-sm filled">check_circle</span>
                  <span>Member</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Login/Logout Button */}
        <div className="mt-4 flex gap-3">
          {isGuest ? (
            <button
              onClick={() => navigate('/login')}
              className="flex-1 py-2 px-4 bg-primary hover:bg-primary/90 text-background-dark font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              Sign In / Register
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex-1 py-2 px-4 bg-surface-dark hover:bg-surface-highlight text-white font-semibold rounded-xl transition-all active:scale-[0.98] border border-gray-200 dark:border-white/10"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        <div className="flex items-center justify-between mb-2 mt-2 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Dictionary</h2>
            <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-xs font-bold text-gray-600 dark:text-gray-300">{words.length}</span>
          </div>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-2 cursor-pointer hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-sm">sort</span>
            <span>Recent</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500 dark:text-gray-400 group-focus-within:text-primary transition-colors">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input 
            className="block w-full p-3 pl-10 text-sm rounded-xl border-none bg-white dark:bg-surface-dark placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-[#1a3623] transition-all shadow-sm outline-none" 
            placeholder="Search saved words..." 
            type="text" 
          />
        </div>

        {/* Word Cards */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <p className="mb-2">No words yet.</p>
            <p className="text-sm">Add some words to get started!</p>
          </div>
        ) : (
          words.map((word) => (
            <div key={word.id} className="group relative flex flex-col p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.99] transition-all hover:border-primary/30 dark:hover:border-primary/30 cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-primary tracking-tight">{word.term}</h3>
                <div className="flex gap-2 text-xs font-bold font-mono">
                  <span className="bg-primary/10 text-primary-700 dark:text-primary px-2 py-1 rounded flex items-center gap-1">
                    Y:{word.knownCount}
                  </span>
                  <span className={`${word.unknownCount > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500'} px-2 py-1 rounded flex items-center gap-1`}>
                    N:{word.unknownCount}
                  </span>
                </div>
              </div>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400 font-mono mb-2">{word.phonetic}</p>
              <p className="text-base text-gray-700 dark:text-gray-200">{word.translation}</p>
              <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};
