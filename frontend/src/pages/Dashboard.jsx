import { Brain, BookOpen, ClipboardList } from 'lucide-react';

export default function Dashboard({ t }) {
  return (
    <div className="dashboard-section">
      <h1 className="hero-title" style={{fontSize: '40px', marginBottom: '10px'}}>{t.dashWelcome}</h1>
      <p style={{color: '#bae6fd', textAlign: 'center', marginBottom: '40px'}}>{t.dashSub}</p>
      
      <div className="dashboard-grid">
        <div className="glass-panel">
          <div className="metric-icon"><Brain size={48} color="#bae6fd" /></div>
          <h3>{t.statMastery}</h3>
          <h2 className="metric-value">0%</h2>
        </div>
        
        <div className="glass-panel">
          <div className="metric-icon"><BookOpen size={48} color="#bae6fd" /></div>
          <h3>{t.statCourses}</h3>
          <h2 className="metric-value">1</h2>
        </div>
        
        <div className="glass-panel">
          <div className="metric-icon"><ClipboardList size={48} color="#bae6fd" /></div>
          <h3>{t.statTasks}</h3>
          <h2 className="metric-value">4</h2>
        </div>
      </div>
    </div>
  );
}
