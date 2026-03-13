import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Settings, Moon, Sun, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import './Layout.css';

export function Layout() {
  const { session, profile, signOut, isLoading } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Detect system preference or saved theme
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    // In a real app we'd save it to localStorage
  };

  if (isLoading) {
    return (
      <div className="layout-loader">
        <Loader2 className="spinner" size={48} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" />;
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="container header-content">
          <Link to="/" className="logo">
            <Home size={24} />
            <span>DekoApp</span>
          </Link>
          
          <div className="nav-actions">
            {profile?.role === 'admin' && (
              <Link to="/admin" className="nav-link">
                <Settings size={20} />
                <span className="hide-mobile">Admin</span>
              </Link>
            )}
            
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <div className="user-menu">
              <span className="user-name hide-mobile">{profile?.display_name}</span>
              <button className="icon-btn" onClick={signOut} aria-label="Log Out">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
