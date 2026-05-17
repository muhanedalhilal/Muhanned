import { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function ResetPassword({ t, isRtl, onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkRecoverySession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setStatus({
          message: isRtl
            ? 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø±Ø§Ø¨Ø· Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø©.'
            : 'Error checking recovery link.',
          type: 'error',
        });
      }

      if (data?.session) {
        setCanReset(true);
      }

      setCheckingSession(false);
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);

      if (event === 'PASSWORD_RECOVERY') {
        setCanReset(true);
        setCheckingSession(false);
      }

      if (session) {
        setCanReset(true);
        setCheckingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isRtl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ message: '', type: '' });

    if (!canReset) {
      setStatus({
        message: isRtl
          ? 'Ø±Ø§Ø¨Ø· Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø© ØºÙŠØ± ØµØ§Ù„Ø­ Ø£Ùˆ Ù…Ù†ØªÙ‡ÙŠ. Ø§Ø·Ù„Ø¨ Ø±Ø§Ø¨Ø·Ù‹Ø§ Ø¬Ø¯ÙŠØ¯Ù‹Ø§.'
          : 'Recovery link is invalid or expired. Please request a new link.',
        type: 'error',
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({
        message: isRtl ? 'ÙƒÙ„Ù…ØªÙŠ Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚ØªÙŠÙ†.' : 'Passwords do not match.',
        type: 'error',
      });
      return;
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}:"<>?~`\-=[\]\\;',./]).{6,}$/;

    if (!passwordRegex.test(password)) {
      setStatus({
        message: isRtl
          ? 'ÙŠØ¬Ø¨ Ø£Ù† ØªØ­ØªÙˆÙŠ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø¹Ù„Ù‰ 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ØŒ ÙˆØ­Ø±Ù ÙƒØ¨ÙŠØ±ØŒ ÙˆØ±Ù‚Ù…ØŒ ÙˆØ±Ù…Ø² Ø®Ø§Øµ.'
          : 'Must contain at least 6 characters, 1 capital letter, 1 number, and 1 special character.',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.log('Update password error:', error);
        setStatus({
          message: error.message || (isRtl ? 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ­Ø¯ÙŠØ« ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±. ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.' : 'Error updating password. Please try again.'),
          type: 'error'
        });
        return;
      }

      setIsSuccess(true);
      setStatus({
        message: isRtl ? 'ØªÙ… ØªØ­Ø¯ÙŠØ« ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø¨Ù†Ø¬Ø§Ø­!' : 'Password updated successfully!',
        type: 'success',
      });

      await supabase.auth.signOut();
    } catch (err) {
      console.log('Unexpected update password error:', err);
      setStatus({
        message: isRtl ? 'Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹' : 'An unexpected error occurred.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div
        className="auth-wrapper"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#64748b', fontSize: '16px' }}>
          {isRtl ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø±Ø§Ø¨Ø·...' : 'Checking recovery link...'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="auth-wrapper"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="auth-form-column card-container-new" style={{ maxWidth: '440px', width: '100%', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Lock size={32} color="#fff" />
          </div>

          <h2
            style={{
              color: '#0f172a',
              fontSize: '26px',
              fontWeight: '800',
              margin: '0 0 10px',
            }}
          >
            {isRtl ? 'ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø¬Ø¯ÙŠØ¯Ø©' : 'Set New Password'}
          </h2>

          <p
            style={{
              color: '#64748b',
              fontSize: '15px',
              margin: 0,
              lineHeight: '1.6',
            }}
          >
            {isRtl
              ? 'Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù„Ø­Ø³Ø§Ø¨Ùƒ'
              : 'Please enter your new password for your account.'}
          </p>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                marginBottom: '24px',
              }}
            >
              <CheckCircle size={40} color="#059669" style={{ margin: '0 auto 12px' }} />
              <p
                style={{
                  color: '#059669',
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: 0,
                }}
              >
                {status.message}
              </p>
            </div>

            <button
              onClick={onComplete}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: '#fff',
                border: 'none',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isRtl ? 'Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' : 'Return to Login'}
              <ArrowRight size={20} style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {!canReset && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '500',
                  lineHeight: '1.5',
                  textAlign: isRtl ? 'right' : 'left'
                }}
              >
                {isRtl
                  ? 'Ø±Ø§Ø¨Ø· Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø© ØºÙŠØ± ØµØ§Ù„Ø­ Ø£Ùˆ Ù…Ù†ØªÙ‡ÙŠ. Ø§Ø·Ù„Ø¨ Ø±Ø§Ø¨Ø·Ù‹Ø§ Ø¬Ø¯ÙŠØ¯Ù‹Ø§.'
                  : 'Recovery link is invalid or expired. Please request a new link.'}
              </div>
            )}

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  color: '#f8fafc',
                  fontSize: '15px',
                  fontWeight: '600',
                  textAlign: isRtl ? 'right' : 'left',
                }}
              >
                {isRtl ? 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©' : 'New Password'}
              </label>

              <input
                type="password"
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  textAlign: isRtl ? 'right' : 'left',
                  direction: isRtl ? 'rtl' : 'ltr'
                }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '30px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  color: '#f8fafc',
                  fontSize: '15px',
                  fontWeight: '600',
                  textAlign: isRtl ? 'right' : 'left',
                }}
              >
                {isRtl ? 'ØªØ£ÙƒÙŠØ¯ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±' : 'Confirm Password'}
              </label>

              <input
                type="password"
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  textAlign: isRtl ? 'right' : 'left',
                  direction: isRtl ? 'rtl' : 'ltr'
                }}
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading || !password || !confirmPassword || !canReset}
              style={{
                opacity: isLoading || !password || !confirmPassword || !canReset ? 0.7 : 1,
                cursor: isLoading || !password || !confirmPassword || !canReset ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading
                ? <span className="loader"></span>
                : <span>{isRtl ? 'Ø­ÙØ¸ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±' : 'Save Password'}</span>}
            </button>
          </form>
        )}

        {status.message && !isSuccess && (
          <div
            style={{
              marginTop: '20px',
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#dc2626',
              lineHeight: '1.5',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
