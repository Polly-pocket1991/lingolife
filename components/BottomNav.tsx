import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="flex-none bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-white/5 pb-safe z-30">
      <div className="flex justify-around items-center h-20 w-full px-6">
        
        {/* Review Tab */}
        <button 
          onClick={() => navigate('/')}
          className={`flex flex-col items-center justify-center transition-colors gap-1 w-16 ${
            currentPath === '/' || currentPath === '/review'
              ? 'text-primary' 
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">school</span>
          <span className="text-[10px] font-medium uppercase tracking-wider">Review</span>
        </button>

        {/* Add Button - Floating effect */}
        <div className="relative flex items-center justify-center -top-6">
          <button 
            onClick={() => navigate('/add')}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform hover:shadow-xl ${
                currentPath === '/add'
                ? 'bg-primary text-background-dark ring-4 ring-background-dark'
                : 'bg-primary text-primary-content hover:bg-green-400'
            }`}
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>

        {/* Me Tab */}
        <button 
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center justify-center transition-colors gap-1 w-16 ${
            currentPath === '/profile'
              ? 'text-primary' 
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-2xl filled">person</span>
          <span className="text-[10px] font-medium uppercase tracking-wider">Me</span>
        </button>

      </div>
    </nav>
  );
};
