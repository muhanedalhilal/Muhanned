import { useState } from 'react';
import { CheckCircle, AlertTriangle, CloudOff, BrainCircuit } from 'lucide-react';
import { api } from '../services/api';

export default function Auth({ t, isLoginView, setIsLoginView, onSecureLogin, isRtl }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({ password: '', confirmPassword: '' });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

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
      case 'server_error':
        return isRtl ? "فشل الاتصال بالخادم." : "Server connection failed.";
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
             // Fetch real profile from backend
             const meRes = await api.get('/users/me');
             if (meRes.ok && meRes.data.name) {
               onSecureLogin(meRes.data.email || formData.email, meRes.data.name, data.access_token, meRes.data.role);
             } else {
               onSecureLogin(formData.email, '', data.access_token, 'student');
             }
           } catch {
             onSecureLogin(formData.email, '', data.access_token, 'student');
           }
        } else {
           setStatus({ message: 'success_signup', type: 'success' });
           setFormData({ name: '', email: '', password: '', confirmPassword: '' });
           setFieldErrors({ password: '', confirmPassword: '' });
           setTimeout(() => setIsLoginView(true), 2000);
        }
      } else {
        let errorMsg = response.message || "Authentication failed.";
        if (errorMsg.includes("already exists")) {
          setStatus({ message: 'email_taken', type: 'error' });
        } else if (errorMsg.includes("failed")) {
          setStatus({ message: 'auth_failed', type: 'error' });
        } else {
          setStatus({ message: errorMsg, type: 'error' });
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
        
        {/* Left Art / Branding showcase */}
        <div className="auth-art-column">
          <div className="art-overlay-gradient"></div>
          <div className="art-content">
            <div className="premium-logo-shield">
              <div className="shield-border-light"></div>
              <div className="shield-glass">
                <img 
                  src="/logo.png" 
                  alt="Massar Logo" 
                  className="shield-logo"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80/2b4a8e/ffffff?text=M' }} 
                />
              </div>
            </div>
            <h2 className="art-title">{t.appName}</h2>
            <p className="art-subtitle" style={{ color: '#000000', fontSize: '17px', lineHeight: '1.6', fontWeight: '600' }}>{t.authArtSubtitle}</p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="auth-form-column card-container-new">
          <h2 className="title" style={{ color: '#000000', fontWeight: '900', fontSize: '30px' }}>{isLoginView ? t.welcomeBack : t.joinSystem}</h2>
          <p className="subtitle">{isLoginView ? t.authSubLogin : t.authSubSignup}</p>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            {!isLoginView && (
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder={t.fullName} 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            )}
            <div className="input-group">
              <input 
                type="email" 
                placeholder={t.email} 
                required 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
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
                  setFormData({...formData, password: e.target.value});
                  if (fieldErrors.password) setFieldErrors({...fieldErrors, password: ''});
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
            {!isLoginView && (
              <div className="input-group" style={{ marginBottom: fieldErrors.confirmPassword ? '20px' : '15px' }}>
                <input 
                  type="password" 
                  placeholder={t.confirmPassword || (isRtl ? "تأكيد كلمة المرور" : "Confirm Password")} 
                  required 
                  value={formData.confirmPassword} 
                  onBlur={() => handleBlur('confirmPassword')}
                  onChange={(e) => {
                    setFormData({...formData, confirmPassword: e.target.value});
                    if (fieldErrors.confirmPassword) setFieldErrors({...fieldErrors, confirmPassword: ''});
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
                onClick={() => { setIsLoginView(!isLoginView); setFieldErrors({password: '', confirmPassword: ''}); setStatus({message: '', type: ''}); }} 
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
    </div>
  );
}
