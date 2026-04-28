import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginScreen } from './components/LoginScreen';

function Main() {
  const { user, loading } = useAuth();
  
  if (loading) return null; // handled in AuthProvider

  if (!user) {
    return <LoginScreen />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Main />
    </AuthProvider>
  </StrictMode>,
);
