import { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import './Auth.css';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Auth() {
  const { session } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/" />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0],
              display_name: username || email.split('@')[0],
            }
          }
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{isLogin ? 'Willkommen zurück' : 'Account erstellen'}</h1>
          <p>{isLogin ? 'Melde dich an, um mit der Deko-Planung fortzufahren.' : 'Tritt unser WG Deko-Planung bei.'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label htmlFor="username">Name (Anzeigename)</label>
              <div className="input-wrapper">
                <UserPlus size={18} className="input-icon" />
                <input
                  id="username"
                  type="text"
                  placeholder="Max Muster"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">E-Mail</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                required
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Passwort</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Lädt...' : (isLogin ? 'Anmelden' : 'Registrieren')}
            {!loading && <LogIn size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          <button className="auth-switch" onClick={() => setIsLogin(!isLogin)} type="button">
            {isLogin ? 'Noch keinen Account? Registrieren' : 'Bereits registriert? Anmelden'}
          </button>
        </div>
      </div>
      <div className="auth-decoration">
         <h3>DekoApp WG</h3>
         <p>Gemeinsam das schönste Zuhause schaffen.</p>
      </div>
    </div>
  );
}
