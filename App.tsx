import React from 'react';
import { HashRouter, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { ProfileScreen, AddWordScreen, ReviewScreen, LoginScreen } from './screens';
import { BottomNav } from './components';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

const Layout: React.FC = () => {
  const location = useLocation();
  
  return (
    <div className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden relative">
            <Outlet />
        </div>
        <BottomNav />
    </div>
  );
};

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Allow guest access but pass auth state to children
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<ReviewScreen />} />
        <Route path="review" element={<ReviewScreen />} />
        <Route path="add" element={<AddWordScreen />} />
        <Route path="profile" element={<ProfileScreen />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
