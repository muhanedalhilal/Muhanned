import { useState } from 'react';
import { User, Mail, Save, Lock, ArrowLeft } from 'lucide-react';

export default function Profile({ t, onBack, currentUser, setCurrentUser, authToken }) {
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || ''
  });

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Build only the fields that actually changed
    const payload = {};
    if (profileData.name && profileData.name !== currentUser.name) payload.name = profileData.name;

    if (Object.keys(payload).length === 0) {
      setMessage({ type: 'info', text: 'No changes to save.' });
      setIsLoading(false);
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        if (setCurrentUser) {
          setCurrentUser({
            ...currentUser,
            name: data.user?.name || profileData.name
          });
        }
        setMessage({ type: 'success', text: data.message || t.profileSaved || 'Profile updated!' });
      } else {
        setMessage({ type: 'error', text: data.detail || 'Update failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Server connection failed.' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="dashboard-section command-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button className="btn-luxe" onClick={onBack} style={{ background: 'rgba(0,0,0,0.05)', color: '#1e293b' }}>
          <ArrowLeft size={18} /> {t.backToDashboard || 'Back'}
        </button>
      </div>

      <div className="luxe-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="command-header-premium" style={{ margin: '0', borderRadius: '0', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="header-text-group">
            <h1 className="luxe-title">{t.profile || 'Profile Management'}</h1>
            <p className="luxe-subtitle">{t.profileSub || 'Manage your personal account details.'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="luxe-panel">
          <div className="form-body">
            <div style={{ position: 'relative' }}>
              <label style={{ color: '#1e293b', fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block', textAlign: 'left' }}>{t.fullName || 'Full Name'}</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '0 15px' }}>
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
              <label style={{ color: '#1e293b', fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block', textAlign: 'left' }}>{t.email || 'Email Address'}</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '0 15px', opacity: '0.7', cursor: 'not-allowed' }}>
                <Mail size={18} color="#94a3b8" />
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  readOnly={true}
                  style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', cursor: 'not-allowed', padding: '12px 10px', fontSize: '15px', color: '#1e293b' }}
                  title="Your email address cannot be changed."
                />
              </div>
            </div>



            <button type="submit" className="btn-luxe submit" disabled={isLoading} style={{ marginTop: '20px', background: '#3b82f6', display: 'flex', gap: '8px', justifyContent: 'center', color: 'white' }}>
              {isLoading ? <span className="loader"></span> : <><Save size={18} /> {t.saveChanges || 'Save Changes'}</>}
            </button>

            {message && (
              <div style={{ textAlign: 'center', color: message.type === 'success' ? '#10b981' : '#ef4444', marginTop: '15px' }}>
                {message.text}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
