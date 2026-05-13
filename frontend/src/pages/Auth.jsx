import { useState } from 'react';
import { CheckCircle, AlertTriangle, CloudOff, BrainCircuit, ArrowLeft, Mail } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

export default function Auth({ t, isLoginView, setIsLoginView, onSecureLogin, isRtl }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
  const [fieldErrors, setFieldErrors] = useState({ password: '', confirmPassword: '' });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState({ message: '', type: '' });
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [devResetLink, setDevResetLink] = useState('');

  const getMsg = (key) => {
    switch (key) {
      case 'password_reqs':
        return isRtl ? "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل، وحرف كبير، ورقم، ورمز خاص." : "Must contain at least 6 characters, 1 capital letter, 1 number, and 1 special character.";
      case 'password_mismatch':
        return isRtl ? "كلمتي المرور غير متطابقتين." : "Passwords do not match.";
      case 'success_signup':
        return isRtl ? "تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك قبل تسجيل الدخول." : "Account created successfully! Please check your email to verify your account before signing in.";
      case 'email_taken':
        return isRtl ? "يوجد حساب مسجل بهذا البريد الإلكتروني. يرجى تسجيل الدخول بدلاً من ذلك." : "An account with this email address already exists. Please log in instead.";
      case 'auth_failed':
        return isRtl ? "فشلت المصادقة. يرجى التحقق من بياناتك والمحاولة مرة أخرى." : "Authentication failed. Please check your details and try again.";
      case 'user_not_found':
        return isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن هذا الحساب غير موجود." : "Incorrect email or password, or this account does not exist.";
      case 'server_error':
        return isRtl ? "فشل الاتصال بالخادم." : "Server connection failed.";
      case 'reset_sent':
        return isRtl ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد." : "Password reset link sent to your email. Please check your inbox.";
      case 'reset_error':
        return isRtl ? "فشل إرسال رابط إعادة التعيين. يرجى التحقق من البريد الإلكتروني والمحاولة مرة أخرى." : "Failed to send reset link. Please check your email and try again.";
      case 'generic_error':
        return isRtl ? "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً." : "An unexpected error occurred. Please try again later.";
      default:
        return key;
    }
  };

  const handleBlur = (field) => {
    if (isLoginView) return;
    let errors = { ...fieldErrors };
    if (field === 'password' && formData.password) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}:"<>?~`\-=[\]\\;',./]).{6,}$/;
      if (!passwordRegex.test(formData.password)) {
        errors.password = 'password_reqs';
      } else {
        errors.password = "";
      }
      if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'password_mismatch';
      } else if (errors.confirmPassword) {
        errors.confirmPassword = "";
      }
    }
    if (field === 'confirmPassword' && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'password_mismatch';
      } else {
        errors.confirmPassword = "";
      }
    }
    setFieldErrors(errors);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    const email = resetEmail.trim();

    if (!email) return;

    setIsResetLoading(true);
    setResetStatus({ message: "", type: "" });
    setDevResetLink(""); // Clear previous link

    try {
      const redirectUrl = `${window.location.origin}/?page=reset-password`;

      const response = await api.post('/auth/forgot-password', {
        email: email,
        redirect_url: redirectUrl,
      });

      if (!response.ok) {
        setResetStatus({
          message: "reset_error",
          type: "error",
        });
        return;
      }

      if (response.data && response.data.reset_link) {
        setDevResetLink(response.data.reset_link);
      }

      setResetStatus({
        message: "reset_sent",
        type: "success",
      });
    } catch (err) {
      console.log("Reset password catch error:", err);

      setResetStatus({
        message: "reset_error",
        type: "error",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ message: '', type: '' });

    if (!isLoginView) {
      if (formData.password !== formData.confirmPassword) {
        setStatus({ message: 'password_mismatch', type: 'error' });
        setIsLoading(false);
        return;
      }
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}:"<>?~`\-=[\]\\;',./]).{6,}$/;
      if (!passwordRegex.test(formData.password)) {
        setStatus({ message: 'password_reqs', type: 'error' });
        setIsLoading(false);
        return;
      }
    }

    const endpointUrl = isLoginView ? '/auth/login' : '/auth/signup';

    try {
      const payload = isLoginView ? { email: formData.email, password: formData.password } : formData;
      const response = await api.post(endpointUrl, payload);

      if (response.ok) {
        const data = response.data;
        if (isLoginView && data.access_token) {
          localStorage.setItem('massar_token', data.access_token);
          try {
            // Fetch real profile from backend — pass token directly to avoid race condition
            const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const meRes = await fetch(`${API_URL}/users/me`, {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              onSecureLogin(meData.email || formData.email, meData.name, data.access_token, meData.role || 'student');
            } else {
              onSecureLogin(formData.email, '', data.access_token, 'student');
            }
          } catch {
            onSecureLogin(formData.email, '', data.access_token, 'student');
          }
        } else {
          setStatus({ message: 'success_signup', type: 'success' });
          setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
          setFieldErrors({ password: '', confirmPassword: '' });
          setTimeout(() => setIsLoginView(true), 2000);
        }
      } else {
        let errorMsg = response.message || "Authentication failed.";
        if (errorMsg.includes("already exists")) {
          setStatus({ message: 'email_taken', type: 'error' });
        } else if (errorMsg.toLowerCase().includes("doesn't exist") || errorMsg.toLowerCase().includes("incorrect email") || errorMsg.toLowerCase().includes("invalid login")) {
          setStatus({ message: 'user_not_found', type: 'error' });
        } else if (errorMsg.includes("failed")) {
          setStatus({ message: 'auth_failed', type: 'error' });
        } else {
          setStatus({ message: 'generic_error', type: 'error' });
        }
      }
    } catch (error) {
      setStatus({ message: 'server_error', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-modern-card">


        {/* Right Form Card */}
        <div className="auth-form-column card-container-new">
          <h2 className="title" style={{ color: '#000000', fontWeight: '900', fontSize: '30px' }}>{isLoginView ? t.welcomeBack : t.joinSystem}</h2>
          <p className="subtitle" style={{ color: '#111827' }}>{isLoginView ? t.authSubLogin : t.authSubSignup}</p>

          <button
            type="button"
            className="google-btn"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
              if (error) setStatus({ message: 'auth_failed', type: 'error' });
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {isLoginView ? (isRtl ? 'المتابعة باستخدام جوجل' : 'Continue with Google') : (isRtl ? 'التسجيل باستخدام جوجل' : 'Sign up with Google')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 20px', color: '#94a3b8', fontSize: '13px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            <span style={{ padding: '0 10px' }}>{isRtl ? 'أو' : 'or'}</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            {!isLoginView && (
              <>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder={t.fullName}
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.2s',
                      appearance: 'none',
                      background: '#fff url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat',
                      backgroundPosition: isRtl ? 'left 15px top 50%' : 'right 15px top 50%',
                      backgroundSize: '12px auto',
                      color: '#0f172a'
                    }}
                  >
                    <option value="student">{t.roleStudent || 'Student'}</option>
                    <option value="teacher">{t.roleTeacher || 'Instructor'}</option>
                  </select>
                </div>
              </>
            )}
            <div className="input-group">
              <input
                type="email"
                placeholder={t.email}
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ textAlign: formData.email ? 'left' : 'start', direction: formData.email ? 'ltr' : 'inherit' }}
              />
            </div>
            <div className="input-group" style={{ marginBottom: (!isLoginView && fieldErrors.password) ? '25px' : '15px' }}>
              <input
                type="password"
                placeholder={t.password}
                required
                value={formData.password}
                onBlur={() => handleBlur('password')}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                }}
                style={{
                  textAlign: formData.password ? 'left' : 'start',
                  direction: formData.password ? 'ltr' : 'inherit',
                  borderColor: (!isLoginView && fieldErrors.password) ? '#ef4444' : undefined
                }}
              />
              {!isLoginView && fieldErrors.password && (
                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px', textAlign: isRtl ? 'right' : 'left', width: '100%', fontWeight: '500', position: 'absolute' }}>
                  {getMsg(fieldErrors.password)}
                </div>
              )}
            </div>
            {isLoginView && (
              <div style={{ textAlign: isRtl ? 'right' : 'left', marginTop: '-8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setResetEmail(formData.email || ''); setResetStatus({ message: '', type: '' }); }}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: '#3b82f6', fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', textDecoration: 'underline'
                  }}
                >
                  {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                </button>
              </div>
            )}
            {!isLoginView && (
              <div className="input-group" style={{ marginBottom: fieldErrors.confirmPassword ? '20px' : '15px' }}>
                <input
                  type="password"
                  placeholder={t.confirmPassword || (isRtl ? "تأكيد كلمة المرور" : "Confirm Password")}
                  required
                  value={formData.confirmPassword}
                  onBlur={() => handleBlur('confirmPassword')}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                  }}
                  style={{
                    textAlign: formData.confirmPassword ? 'left' : 'start',
                    direction: formData.confirmPassword ? 'ltr' : 'inherit',
                    borderColor: fieldErrors.confirmPassword ? '#ef4444' : undefined
                  }}
                />
                {fieldErrors.confirmPassword && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px', textAlign: isRtl ? 'right' : 'left', width: '100%', fontWeight: '500', position: 'absolute' }}>
                    {getMsg(fieldErrors.confirmPassword)}
                  </div>
                )}
              </div>
            )}
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? <span className="loader"></span> : <span>{isLoginView ? t.signIn : t.signUp}</span>}
            </button>
          </form>

          <div className="toggle-view" style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <span className="toggle-text" style={{ color: '#000000', fontWeight: '600' }}>{isLoginView ? t.noAccount : t.haveAccount}</span>
            <button
              type="button"
              onClick={() => { setIsLoginView(!isLoginView); setFieldErrors({ password: '', confirmPassword: '' }); setStatus({ message: '', type: '' }); }}
              className="toggle-btn"
              style={{ color: '#1e40af', fontWeight: '800', textDecoration: 'underline', background: 'none', border: 'none', padding: 0 }}
            >
              {isLoginView ? t.clickSignUp : t.clickSignIn}
            </button>
          </div>

          {status.message && (
            <div className={`status-message ${status.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {status.type === 'success' ? <CheckCircle size={18} /> : status.message === 'server_error' ? <CloudOff size={18} /> : <AlertTriangle size={18} />}
              {getMsg(status.message)}
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }} onClick={() => setShowForgotPassword(false)}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '36px 32px',
            maxWidth: '440px', width: '90%', position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowForgotPassword(false)}
              style={{
                position: 'absolute', top: '16px', left: isRtl ? 'auto' : '16px', right: isRtl ? '16px' : 'auto',
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px'
              }}
            >
              <ArrowLeft size={22} color="#64748b" />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Mail size={28} color="#fff" />
              </div>
              <h3 style={{ color: '#0f172a', fontSize: '22px', fontWeight: '800', margin: '0 0 8px' }}>
                {isRtl ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                {isRtl ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين' : 'Enter your email and we\'ll send you a reset link'}
              </p>
            </div>

            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="email"
                  placeholder={isRtl ? 'البريد الإلكتروني' : 'Email address'}
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '12px',
                    border: '1.5px solid #e2e8f0', fontSize: '15px',
                    outline: 'none', transition: 'border 0.2s',
                    direction: 'ltr', textAlign: 'left',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <button
                type="submit"
                disabled={isResetLoading || !resetEmail.trim()}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: '#fff', border: 'none', fontSize: '15px',
                  fontWeight: '700', cursor: 'pointer',
                  opacity: (isResetLoading || !resetEmail.trim()) ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {isResetLoading
                  ? (isRtl ? 'جاري الإرسال...' : 'Sending...')
                  : (isRtl ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link')}
              </button>
            </form>

            {resetStatus.message && (
              <div style={{
                marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
                background: resetStatus.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${resetStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                display: 'flex', flexDirection: 'column', gap: '8px',
                fontSize: '13px', fontWeight: '500',
                color: resetStatus.type === 'success' ? '#059669' : '#dc2626'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {resetStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {getMsg(resetStatus.message)}
                </div>
                {devResetLink && (
                  <a href={devResetLink} style={{
                    display: 'block', padding: '10px', textAlign: 'center',
                    background: '#059669', color: '#fff', borderRadius: '8px',
                    textDecoration: 'none', fontWeight: '600', width: '100%',
                    boxSizing: 'border-box', marginTop: '4px'
                  }}>
                    {isRtl ? 'رابط الاستعادة (للمطورين) - اضغط هنا' : 'Dev Reset Link - Click Here'}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
