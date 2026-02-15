import React, { useState, useEffect } from 'react';
import { getWordsForReview, updateWordStats } from '../src/api';

interface ReviewWord {
  id: string;
  term: string;
  phonetic: string;
  translation: string;
  definition: string;
}

export const ReviewScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [reviewWords, setReviewWords] = useState<ReviewWord[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to get today's reviewed words from localStorage
  const getTodayReviewedWords = (): string[] => {
    const today = new Date().toISOString().split('T')[0];
    const key = `reviewed_words_${today}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  };

  // Helper function to add a word to today's reviewed list
  const addToReviewedWords = (wordId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `reviewed_words_${today}`;
    const reviewed = getTodayReviewedWords();
    if (!reviewed.includes(wordId)) {
      reviewed.push(wordId);
      localStorage.setItem(key, JSON.stringify(reviewed));
    }
  };

  useEffect(() => {
    const fetchReviewWords = async () => {
      try {
        // In a real app, we would get the actual user ID
        const words = await getWordsForReview('default_user');
        
        // Filter out words that have been reviewed today
        const todayReviewed = getTodayReviewedWords();
        const filteredWords = words.filter((word: any) => !todayReviewed.includes(word.id));
        
        // Convert API response to match our ReviewWord type
        const convertedWords: ReviewWord[] = filteredWords.map((word: any) => ({
          id: word.id,
          term: word.term,
          phonetic: word.phonetic || '',
          translation: word.translation,
          definition: word.definition || ''
        }));
        setReviewWords(convertedWords);
      } catch (error) {
        console.error('Error fetching words for review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewWords();
  }, []);

  const currentWord = reviewWords[currentIndex];

  const handleKnow = async () => {
    if (!isFlipped) {
      setKnownCount(prev => prev + 1);
      
      // Add to today's reviewed words
      addToReviewedWords(currentWord.id);
      
      // Update the word stats in the database
      try {
        await updateWordStats(currentWord.id, true, 'default_user');
      } catch (error) {
        console.error('Error updating word stats:', error);
      }
    }
    
    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setFinished(true);
    }
  };

  const handleDontKnow = async () => {
    if (!isFlipped) {
      setUnknownCount(prev => prev + 1);
      setIsFlipped(true);
      
      // Add to today's reviewed words
      addToReviewedWords(currentWord.id);
      
      // Update the word stats in the database
      try {
        await updateWordStats(currentWord.id, false, 'default_user');
      } catch (error) {
        console.error('Error updating word stats:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background-light dark:bg-background-darker overflow-hidden text-slate-900 dark:text-white font-display items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col h-full bg-background-light dark:bg-background-darker overflow-hidden text-slate-900 dark:text-white font-display items-center justify-center p-6">
          <div className="text-center bg-white dark:bg-surface-dark p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 w-full max-w-sm">
              <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-primary">celebration</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Review Complete!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">You've reviewed all {reviewWords.length} words for today.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-background-light dark:bg-background-darker rounded-xl">
                    <div className="text-2xl font-bold text-primary">{knownCount}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Known</div>
                </div>
                <div className="p-4 bg-background-light dark:bg-background-darker rounded-xl">
                    <div className="text-2xl font-bold text-red-400">{unknownCount}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Unknown</div>
                </div>
              </div>

              <button 
                onClick={() => { 
                  setCurrentIndex(0); 
                  setFinished(false); 
                  setIsFlipped(false); 
                  setKnownCount(0); 
                  setUnknownCount(0); 
                }} 
                className="w-full bg-primary text-background-dark h-12 rounded-xl font-bold hover:bg-green-400 transition-colors">
                Start Over
              </button>
          </div>
      </div>
    )
  }

  if (reviewWords.length === 0) {
    return (
      <div className="flex flex-col h-full bg-background-light dark:bg-background-darker overflow-hidden text-slate-900 dark:text-white font-display items-center justify-center p-6">
        <div className="text-center bg-white dark:bg-surface-dark p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 w-full max-w-sm">
          <div className="size-20 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-gray-400">inbox</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">No Words to Review</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Add some words first, then come back to review them.</p>
          
          <button 
            onClick={() => window.location.hash = '#/add'}
            className="w-full bg-primary text-background-dark h-12 rounded-xl font-bold hover:bg-green-400 transition-colors">
            Add Words
          </button>
        </div>
      </div>
    );
  }

  const progress = Math.round((currentIndex / reviewWords.length) * 100);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-darker overflow-hidden text-slate-900 dark:text-white font-display">
      {/* Header */}
      <header className="shrink-0 pt-12 pb-2 px-6 bg-background-light dark:bg-background-darker">
        <div className="flex items-center justify-between mb-4">
          {/* Replaced back button with placeholder */}
          <div className="size-10"></div> 
          <h2 className="text-xl font-bold tracking-tight">Today's Review</h2>
          <button className="flex items-center justify-center size-10 text-slate-800 dark:text-white hover:bg-white/5 rounded-full transition-colors">
            <span className="material-symbols-outlined text-2xl">more_vert</span>
          </button>
        </div>
        
        {/* Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Daily Goal</span>
            <span className="text-xs font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </header>

      {/* Main Review Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-6">
        
        {/* Flashcard */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col border border-slate-100 dark:border-white/5 min-h-[320px]">
          
            {!isFlipped ? (
                // Front of Card
                <>
                <div className="h-32 bg-cover bg-center relative transition-opacity duration-300" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDt_7ylhNpRXI-RCBsi88EcQLXmgMrlmBxXjyGzkcOFKcX_YXL45jZzupPC27EoOy-ZQgF-sV9uxz-ZVMZ_RhocHrKAgwjsfys8E2V3WkUKKE9BZUKMRx0jivJT1d1oNlMJdGyU2hnpxU06lihN9oV3qkk4Q6TJiVa8M8bvsq8NTRWAOtUMPERLp8CtiqadQR7BxSR2ID2vFNXoyNyadH_FRZa8gZs9I5yN-2ZSPdBpZr3t6BzfaZ1IY3_ZuVtCzuVYHXvVKlW9ZdNi')" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-surface-dark via-transparent to-transparent"></div>
                    <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 text-xs font-semibold text-white border border-white/10 shadow-lg">
                    New Word
                    </div>
                </div>
                
                <div className="px-6 pb-6 flex flex-col items-center text-center -mt-6 relative z-10 flex-1 justify-center">
                    <h3 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white drop-shadow-sm">{currentWord.term}</h3>
                </div>
                </>
            ) : (
                // Back of Card (Flipped)
                <div className="flex flex-col items-center justify-center p-6 h-full flex-1 text-center bg-surface-highlight/5 animate-fade-in">
                     <div className="w-full flex-1 flex flex-col items-center justify-center">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{currentWord.term}</h3>
                        <div className="inline-block px-3 py-1 rounded-lg bg-surface-highlight/30 text-primary text-base font-mono mb-6 border border-primary/20">
                            {currentWord.phonetic}
                        </div>
                        
                        <div className="bg-background-light dark:bg-white/5 p-4 rounded-2xl w-full border border-gray-200 dark:border-white/10 shadow-inner">
                            <p className="text-xl font-bold text-slate-800 dark:text-gray-100 mb-2">{currentWord.translation}</p>
                            <div className="h-px w-16 bg-gray-300 dark:bg-gray-600 mx-auto mb-2"></div>
                            <p className="text-slate-500 dark:text-gray-400 text-sm italic leading-relaxed">"{currentWord.definition}"</p>
                        </div>
                     </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="px-6 pb-6 pt-2 bg-white dark:bg-surface-dark mt-auto z-20">
                <div className="flex w-full gap-4">
                <button 
                    onClick={handleDontKnow}
                    disabled={isFlipped}
                    className={`flex-1 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white font-bold flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-white/10 ${isFlipped ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <span className="text-[10px] uppercase opacity-60">Don't Know (N)</span>
                    <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">close</span>
                    </div>
                </button>
                <button 
                    onClick={handleKnow}
                    className="flex-1 h-14 rounded-2xl bg-primary text-background-dark font-bold shadow-[0_8px_24px_rgba(19,236,91,0.3)] flex flex-col items-center justify-center active:scale-95 transition-all hover:bg-green-400">
                    <span className="text-[10px] uppercase opacity-60">Know (Y)</span>
                    <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">check</span>
                    </div>
                </button>
                </div>
            </div>
        </div>

        {/* Stats Section */}
        <section className="space-y-4 pb-8">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Progress Overview</h4>
            <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold uppercase tracking-wider cursor-pointer hover:bg-primary/20 transition-colors">Live Stats</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Big Stat */}
            <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-slate-400 text-[10px] font-bold mb-1 uppercase tracking-wider">Today's Count</p>
                <p className="text-5xl font-bold text-primary leading-none">{reviewWords.length}</p>
              </div>
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">task_alt</span>
              </div>
            </div>

            {/* Grid Stats */}
            <div className="flex flex-col gap-3">
              <p className="text-slate-400 text-[10px] font-bold px-2 uppercase tracking-wider">Today Reviewed Words</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-3 shadow-sm">
                  <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-red-500 text-lg">close</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1">Don't Know</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{unknownCount}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-3 shadow-sm">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-lg">done_all</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1">Know</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{knownCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};