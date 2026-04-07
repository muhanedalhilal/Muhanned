import { useState } from 'react';
import { CheckCircle, AlertTriangle, CloudOff, BrainCircuit } from 'lucide-react';

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
            
            <div className="art-status-pill">
              <div className="pulse-dot"></div>
              <span>{t.neuralEngineOnline}</span>
            </div>
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

          <div className="toggle-view" style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <span className="toggle-text" style={{ color: '#000000', fontWeight: '600' }}>{isLoginView ? t.noAccount : t.haveAccount}</span>
              <button 
                type="button" 
                onClick={() => setIsLoginView(!isLoginView)} 
                className="toggle-btn"
                style={{ color: '#1e40af', fontWeight: '800', textDecoration: 'underline', background: 'none', border: 'none', padding: 0 }}
              >
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
    </div>
  );
}
