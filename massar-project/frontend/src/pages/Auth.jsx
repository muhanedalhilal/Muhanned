import { useState } from 'react';
import { CheckCircle, AlertTriangle, CloudOff } from 'lucide-react';

export default function Auth({ t, isLoginView, setIsLoginView, onSecureLogin, isRtl }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ message: '', type: '' });

    const endpointUrl = isLoginView 
      ? 'http://127.0.0.1:8000/auth/login' 
      : 'http://127.0.0.1:8000/auth/signup';

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLoginView ? { email: formData.email, password: formData.password } : formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isLoginView && data.access_token) {
           try {
             // Fetch real profile from backend
             const meRes = await fetch('http://127.0.0.1:8000/auth/me', {
               headers: { 'Authorization': `Bearer ${data.access_token}` }
             });
             const meData = await meRes.json();
             if (meRes.ok && meData.name) {
               onSecureLogin(meData.email || formData.email, meData.name, data.access_token, meData.user_role);
             } else {
               onSecureLogin(formData.email, '', data.access_token, 'student');
             }
           } catch {
             onSecureLogin(formData.email, '', data.access_token, 'student');
           }
        } else {
           setStatus({ message: data.message, type: 'success' });
           setFormData({ name: '', email: '', password: '' });
           setTimeout(() => setIsLoginView(true), 2000);
        }
      } else {
        setStatus({ message: (data.detail || "Authentication failed."), type: 'error' });
      }
    } catch (error) {
       setStatus({ message: "Server connection failed.", type: 'error' });
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="card-container">
        <h2 className="title">{isLoginView ? t.welcomeBack : t.joinSystem}</h2>
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
          <div className="input-group">
            <input 
              type="password" 
              placeholder={t.password} 
              required 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              style={{ textAlign: formData.password ? 'left' : 'start', direction: formData.password ? 'ltr' : 'inherit' }}
            />
          </div>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? <span className="loader"></span> : <span>{isLoginView ? t.signIn : t.signUp}</span>}
          </button>
        </form>

        <div className="toggle-view">
            <span className="toggle-text">{isLoginView ? t.noAccount : t.haveAccount}</span>
            <button type="button" onClick={() => setIsLoginView(!isLoginView)} className="toggle-btn">
              {isLoginView ? t.clickSignUp : t.clickSignIn}
            </button>
        </div>

        {status.message && (
          <div className={`status-message ${status.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {status.type === 'success' ? <CheckCircle size={18} /> : status.message.includes('Server') ? <CloudOff size={18} /> : <AlertTriangle size={18} />}
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
