import { useState } from 'react';
import { User, Mail, Lock, Save, ArrowLeft } from 'lucide-react';

export default function Profile({ t, onBack, currentUser, setCurrentUser }) {
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: ''
  });

  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (setCurrentUser) {
      setCurrentUser({ name: profileData.name, email: profileData.email });
    }
    setMessage({ type: 'success', text: t.profileSaved || 'Profile successfully updated!' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="dashboard-section command-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button className="btn-luxe" onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
          <ArrowLeft size={18} /> {t.backToDashboard || 'Back'}
        </button>
      </div>

      <div className="command-header-premium">
        <div className="header-text-group">
          <h1 className="luxe-title">{t.profile || 'Profile Management'}</h1>
          <p className="luxe-subtitle">{t.profileSub || 'Manage your personal account details securely.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="luxe-panel">
        <div className="form-body">
          <div style={{ position: 'relative' }}>
            <label style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px', display: 'block', textAlign: 'left' }}>{t.fullName || 'Full Name'}</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0 15px' }}>
              <User size={18} color="#94a3b8" />
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleChange}
                className="input-luxe"
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none' }}
                placeholder={t.fullName || 'Full Name'}
              />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px', display: 'block', textAlign: 'left' }}>{t.email || 'Email Address'}</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0 15px' }}>
              <Mail size={18} color="#94a3b8" />
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleChange}
                className="input-luxe"
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none' }}
                placeholder={t.email || 'Email Address'}
              />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px', display: 'block', textAlign: 'left' }}>{t.password || 'New Password'}</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0 15px' }}>
              <Lock size={18} color="#94a3b8" />
              <input
                type="password"
                name="password"
                value={profileData.password}
                onChange={handleChange}
                className="input-luxe"
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none' }}
                placeholder={t.password || 'Secure Password'}
              />
            </div>
          </div>

          <button type="submit" className="btn-luxe submit" style={{ marginTop: '20px', background: '#3b82f6', display: 'flex', gap: '8px', justifyContent: 'center', color: 'white' }}>
            <Save size={18} />
            {t.saveChanges || 'Save Changes'}
          </button>

          {message && (
            <div style={{ textAlign: 'center', color: message.type === 'success' ? '#10b981' : '#ef4444', marginTop: '15px' }}>
              {message.text}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
