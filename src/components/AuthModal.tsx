import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { error: authError, signUpEmail, signInEmail, signInGoogle, resetPassword } = useAuth();

  if (!open) return null;

  const displayError = localError || authError;

  const handleEmailAuth = async () => {
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Email requis');
      return;
    }
    if (!password.trim()) {
      setLocalError('Mot de passe requis');
      return;
    }

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setLocalError('Les mots de passe ne correspondent pas');
          return;
        }
        if (password.length < 6) {
          setLocalError('Le mot de passe doit avoir au moins 6 caractères');
          return;
        }
        await signUpEmail(email, password);
      } else {
        await signInEmail(email, password);
      }
      onSuccess();
    } catch {
      // Error already set by useAuth hook
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    try {
      await signInGoogle();
      onSuccess();
    } catch {
      // Error already set by useAuth hook
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setLocalError('Entre ton email pour réinitialiser le mot de passe');
      return;
    }
    setLocalError(null);
    try {
      await resetPassword(email);
      setLocalError('Email de réinitialisation envoyé (vérifie ton spam)');
    } catch {
      // Error already set by useAuth hook
    }
  };

  const bgStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '1px solid #3a3a4e',
    borderRadius: 12,
    padding: '32px',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.5)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: '#e4e4e7',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 1,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    marginBottom: 12,
    background: '#0f0f1a',
    border: '1px solid #3a3a4e',
    borderRadius: 8,
    color: '#e4e4e7',
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    marginBottom: 12,
    background: 'linear-gradient(135deg,#FFD700,#C9A84C)',
    border: 'none',
    borderRadius: 8,
    color: '#09090b',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: 0.5,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    marginBottom: 12,
    background: '#2a2a3e',
    border: '1px solid #3a3a4e',
    borderRadius: 8,
    color: '#a0a0b0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: 0.5,
  };

  const linkStyle: React.CSSProperties = {
    color: '#FFD700',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 600,
  };

  const errorStyle: React.CSSProperties = {
    background: '#4a2a2a',
    border: '1px solid #8a4a4a',
    borderRadius: 6,
    padding: '10px 12px',
    marginBottom: 12,
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
  };

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    background: active ? '#2a2a3e' : 'transparent',
    border: `1px solid ${active ? '#3a3a4e' : 'transparent'}`,
    borderRadius: 6,
    color: active ? '#e4e4e7' : '#a0a0b0',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <div style={bgStyle}>
      <div className="auth-modal-inner" style={modalStyle}>
        <h2 style={titleStyle}>
          {mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
        </h2>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            style={tabButtonStyle(mode === 'signin')}
            onClick={() => {
              setMode('signin');
              setLocalError(null);
            }}
          >
            Connexion
          </button>
          <button
            style={tabButtonStyle(mode === 'signup')}
            onClick={() => {
              setMode('signup');
              setLocalError(null);
            }}
          >
            Inscription
          </button>
        </div>

        {displayError && <div style={errorStyle}>{displayError}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEmailAuth();
          }}
        />

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0, paddingRight: 44 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEmailAuth();
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: showPassword ? '#FFD700' : '#a0a0b0', fontSize: 18, padding: 4,
            }}
            tabIndex={-1}
          >{showPassword ? '🙈' : '👁'}</button>
        </div>

        {mode === 'signup' && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirmer mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, paddingRight: 44 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEmailAuth();
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(p => !p)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: showConfirmPassword ? '#FFD700' : '#a0a0b0', fontSize: 18, padding: 4,
              }}
              tabIndex={-1}
            >{showConfirmPassword ? '🙈' : '👁'}</button>
          </div>
        )}

        <button style={buttonStyle} onClick={handleEmailAuth}>
          {mode === 'signin' ? 'Se connecter' : "S'inscrire"}
        </button>

        <button style={secondaryButtonStyle} onClick={handleGoogleSignIn}>
          Connexion Google
        </button>

        {mode === 'signin' && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <a style={linkStyle} onClick={handleResetPassword}>
              Mot de passe oublié ?
            </a>
          </div>
        )}

        <button
          style={{
            ...secondaryButtonStyle,
            marginBottom: 0,
            opacity: 0.7,
          }}
          onClick={onClose}
        >
          Continuer sans compte
        </button>
      </div>
    </div>
  );
}
