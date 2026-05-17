import { useState, useEffect } from 'react';
import { Users, Activity, BookOpen, CheckCircle, Trash2, Edit2, Search, Check, X } from 'lucide-react';

export default function AdminDashboard({ t, authToken }) {
  const [apiStats, setApiStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', role: '' });

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // Fetch real data on mount if token exists
  useEffect(() => {
    if (!authToken) return;

    fetch(`${API_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => setApiStats(data))
      .catch(e => console.error("Could not load stats.", e));

    fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(e => console.error("Could not load users.", e));
  }, [authToken]);

  // Map the real api hook into the dynamic cards
  const platformStats = [
    { title: t.totalUsers || 'Total Users', value: apiStats?.total_users || 0, icon: <Users size={32} color="#3b82f6" /> },
    { title: t.totalStudents || 'Total Students', value: apiStats?.roles?.students || 0, icon: <BookOpen size={32} color="#8b5cf6" /> },
    { title: t.totalInstructors || 'Total Instructors', value: apiStats?.roles?.teachers || 0, icon: <CheckCircle size={32} color="#10b981" /> },
    { title: t.totalCourses || 'Total Courses', value: apiStats?.total_courses || 0, icon: <Activity size={32} color="#ec4899" /> },
  ];

  const startEditing = (user) => {
    setEditingUserId(user.id);
    setEditFormData({ name: user.name, role: user.role });
  };

  const cancelEditing = () => {
    setEditingUserId(null);
  };

  const saveEdit = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editFormData.name, role: editFormData.role })
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(users.map(u => (u.id === id ? { ...u, name: data.user.name, role: data.user.role } : u)));
        setEditingUserId(null);
      } else {
        alert("Failed to update user.");
      }
    } catch {
      alert("Server connection failed.");
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          setUsers(users.filter(u => u.id !== id));
        } else {
          alert("Failed to delete user on the server.");
        }
      } catch {
        alert("Server connection failed.");
      }
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-section command-center" style={{ maxWidth: '1200px' }}>

      {/* Platform Analytics Section */}
      <div className="command-header-premium" style={{ marginBottom: '0' }}>
        <div className="header-text-group">
          <h1 className="luxe-title">{t.platformAnalytics || 'Platform Analytics'}</h1>
          <p className="luxe-subtitle">{t.platformAnalyticsSub || 'Monitor overall engagement and system trends.'}</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ paddingTop: '20px', paddingBottom: '30px' }}>
        {platformStats.map((stat, i) => (
          <div key={i} className="glass-panel" style={{ padding: '25px', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '20px', textAlign: 'left' }}>
            <div className="icon-wrapper" style={{ background: 'rgba(0,0,0,0.03)', padding: '15px' }}>
              {stat.icon}
            </div>
            <div>
              <div className="metric-value" style={{ fontSize: '32px', marginBottom: '5px' }}>{stat.value}</div>
              <div style={{ color: '#94a3b8', fontSize: '15px' }}>{stat.title}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-divider" style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '40px 0 20px 0' }}>
        <span className="divider-text" style={{ color: '#0f172a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px' }}>
          {t.userAdmin || 'User Administration'}
        </span>
        <div className="divider-line" style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.1)' }}></div>
      </div>

      <div className="luxe-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 30px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={{ color: 'black', margin: 0, fontSize: '18px' }}>{t.manageUsers || 'Manage Accounts'}</h3>
          <div className="search-bar" style={{ padding: '8px 15px', background: 'rgba(0,0,0,0.03)' }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder={t.searchUsers || 'Search users...'}
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', color: '#94a3b8', fontSize: '14px' }}>
                <th style={{ padding: '15px 30px', fontWeight: '500' }}>{t.adminName || 'Name'}</th>
                <th style={{ padding: '15px 30px', fontWeight: '500' }}>{t.adminRole || 'Role'}</th>
                <th style={{ padding: '15px 30px', fontWeight: '500' }}>{t.adminStatus || 'Status'}</th>
                <th style={{ padding: '15px 30px', fontWeight: '500', textAlign: 'right' }}>{t.adminActions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    {t.adminSearchEmpty || 'No users found matching your search.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'black' }}>
                    {editingUserId === user.id ? (
                      <>
                        <td style={{ padding: '15px 30px' }}>
                          <input
                            type="text"
                            className="input-luxe"
                            style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '8px', width: '100%', marginBottom: '4px', backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(59, 130, 246, 0.3)', color: 'black' }}
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          />
                          <div style={{ fontSize: '13px', color: '#94a3b8', paddingLeft: '8px' }}>{user.email}</div>
                        </td>
                        <td style={{ padding: '15px 30px' }}>
                          <select
                            className="input-luxe"
                            style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '8px', width: '100%', backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(59, 130, 246, 0.3)', color: 'black', cursor: 'pointer' }}
                            value={editFormData.role}
                            onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                          >
                            <option value="student">{t.adminStudent || 'Student'}</option>
                            <option value="teacher">{t.adminTeacher || 'Teacher'}</option>
                            <option value="admin">{t.adminAdmin || 'Admin'}</option>
                          </select>
                        </td>
                        <td style={{ padding: '15px 30px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#10b981' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                            {t.adminActive || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '15px 30px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="del-btn" onClick={() => saveEdit(user.id)} style={{ padding: '6px', borderRadius: '8px', color: '#10b981', transition: 'all 0.2s' }} title="Save">
                              <Check size={16} />
                            </button>
                            <button className="del-btn" onClick={cancelEditing} style={{ padding: '6px', borderRadius: '8px', color: '#94a3b8', transition: 'all 0.2s' }} title="Cancel">
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '15px 30px' }}>
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>{user.name}</div>
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>{user.email}</div>
                        </td>
                        <td style={{ padding: '15px 30px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            background: user.role === 'admin' || user.role === 'Admin' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.03)',
                            color: user.role === 'admin' || user.role === 'Admin' ? '#3b82f6' : '#475569'
                          }}>
                            {user.role === 'admin' || user.role === 'Admin' ? (t.adminAdmin || 'Admin') : user.role === 'student' || user.role === 'Student' ? (t.adminStudent || 'Student') : (t.adminTeacher || 'Teacher')}
                          </span>
                        </td>
                        <td style={{ padding: '15px 30px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#10b981' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                            {t.adminActive || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '15px 30px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="del-btn" onClick={() => startEditing(user)} style={{ padding: '6px', borderRadius: '8px', color: '#60a5fa', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'} title="Edit User">
                              <Edit2 size={16} />
                            </button>
                            <button className="del-btn" onClick={() => deleteUser(user.id)} style={{ padding: '6px', borderRadius: '8px', color: '#f87171', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'} title="Delete User">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
