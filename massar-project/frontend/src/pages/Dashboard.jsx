import { useState } from 'react';
import { BookOpen, Calculator, Globe, Code, PenTool, FlaskConical, Plus, Trash2, CheckCircle2, Search, ArrowLeft, Check } from 'lucide-react';

const availableIcons = {
  book: <BookOpen size={24} />,
  math: <Calculator size={24} />,
  globe: <Globe size={24} />,
  code: <Code size={24} />,
  art: <PenTool size={24} />,
  science: <FlaskConical size={24} />
};

export default function Dashboard({ t }) {
  const [subjects, setSubjects] = useState([
    {
      id: 1, name: 'Mathematics', icon: 'math', color: '#3b82f6',
      taskList: [
        { id: 101, text: 'Linear Algebra Worksheet', isCompleted: true },
        { id: 102, text: 'Study for Midterm', isCompleted: false }
      ]
    },
    {
      id: 2, name: 'Computer Science', icon: 'code', color: '#8b5cf6',
      taskList: [
        { id: 201, text: 'Install React', isCompleted: true },
        { id: 202, text: 'Build API Backend', isCompleted: false },
        { id: 203, text: 'Deploy to Vercel', isCompleted: false }
      ]
    },
    {
      id: 3, name: 'World History', icon: 'globe', color: '#10b981',
      taskList: [
        { id: 301, text: 'Read Chapter 4', isCompleted: true },
        { id: 302, text: 'Essay Outline', isCompleted: true }
      ]
    },
    {
      id: 4, name: 'Literature', icon: 'book', color: '#f59e0b',
      taskList: []
    }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('book');
  const [searchQuery, setSearchQuery] = useState('');

  // Detal View State
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [newTaskInput, setNewTaskInput] = useState('');

  const addSubject = (e) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newSub = {
      id: Date.now(),
      name: newSubName,
      icon: newSubIcon,
      color: randomColor,
      taskList: []
    };
    setSubjects([...subjects, newSub]);
    setNewSubName('');
    setIsAdding(false);
  };

  const deleteSubject = (id, e) => {
    e.stopPropagation(); // Prevent clicking card
    setSubjects(subjects.filter(s => s.id !== id));
    if (selectedSubjectId === id) setSelectedSubjectId(null);
  };

  // Task Handlers
  const toggleTask = (subId, taskId) => {
    setSubjects(subjects.map(sub => {
      if (sub.id !== subId) return sub;
      const updatedList = sub.taskList.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t);
      return { ...sub, taskList: updatedList };
    }));
  };

  const addTaskToSubject = (e, subId) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    setSubjects(subjects.map(sub => {
      if (sub.id !== subId) return sub;
      const newTask = { id: Date.now(), text: newTaskInput, isCompleted: false };
      return { ...sub, taskList: [...sub.taskList, newTask] };
    }));
    setNewTaskInput('');
  };

  // Render Grid Mode vs Detail Mode
  if (selectedSubjectId) {
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    if (!selectedSubject) {
      setSelectedSubjectId(null);
      return null;
    }

    const tCount = selectedSubject.taskList.length;
    const cCount = selectedSubject.taskList.filter(t => t.isCompleted).length;
    const prog = tCount === 0 ? 0 : Math.round((cCount / tCount) * 100);

    return (
      <div className="dashboard-section command-center">
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <button className="btn-luxe" onClick={() => setSelectedSubjectId(null)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
            <ArrowLeft size={18} /> {t.backToDashboard}
          </button>
        </div>

        <div className="luxe-panel detail-hero">
          <div className="detail-hero-top">
            <div className="icon-wrapper" style={{ background: `${selectedSubject.color}20`, color: selectedSubject.color }}>
              {availableIcons[selectedSubject.icon] || availableIcons['book']}
            </div>
            <h1 className="luxe-title" style={{ margin: 0, marginLeft: '20px' }}>{selectedSubject.name}</h1>
          </div>

          <div className="detail-stats" style={{ marginTop: '30px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>{cCount} / {tCount} {t.tasksCompleted}</span>
            <span style={{ color: selectedSubject.color, fontWeight: 'bold' }}>{prog}%</span>
          </div>

          <div className="luxe-progress-bg" style={{ height: '10px' }}>
            <div
              className="luxe-progress-fill"
              style={{ width: `${prog}%`, background: selectedSubject.color, boxShadow: `0 0 15px ${selectedSubject.color}80` }}
            ></div>
          </div>
        </div>

        <div className="task-checklist luxe-panel">
          <h3 style={{ color: 'white', marginBottom: '25px', fontSize: '20px' }}>Tasks Checklist</h3>

          <div className="task-list">
            {selectedSubject.taskList.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px', background: 'transparent', border: 'none' }}>
                <p>{t.noTasksYet}</p>
              </div>
            ) : (
              selectedSubject.taskList.map(task => (
                <div
                  key={task.id}
                  className={`task-item ${task.isCompleted ? 'completed' : ''}`}
                  onClick={() => toggleTask(selectedSubject.id, task.id)}
                >
                  <div className="checkbox" style={{
                    borderColor: task.isCompleted ? selectedSubject.color : 'rgba(255,255,255,0.3)',
                    background: task.isCompleted ? selectedSubject.color : 'transparent'
                  }}>
                    {task.isCompleted && <Check size={14} color="white" />}
                  </div>
                  <span className="task-text">{task.text}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={(e) => addTaskToSubject(e, selectedSubject.id)} className="add-task-form">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              placeholder={t.addTask}
              className="input-luxe"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-luxe" style={{ background: selectedSubject.color, color: 'white', padding: '16px' }}>
              <Plus size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Grid Mode Filtering ---
  const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getSubjectCounts = (sub) => {
    const tCount = sub.taskList.length;
    const cCount = sub.taskList.filter(t => t.isCompleted).length;
    const prog = tCount === 0 ? 0 : Math.round((cCount / tCount) * 100);
    return { tCount, cCount, prog };
  };

  const activeSubjects = filteredSubjects.filter(sub => {
    const { tCount, cCount } = getSubjectCounts(sub);
    return tCount === 0 || cCount < tCount;
  });

  const completedSubjects = filteredSubjects.filter(sub => {
    const { tCount, cCount } = getSubjectCounts(sub);
    return tCount > 0 && cCount >= tCount;
  });

  const renderSubjectCard = (sub) => {
    const { tCount, cCount, prog } = getSubjectCounts(sub);
    return (
      <div key={sub.id} className="luxe-card clickable" onClick={() => setSelectedSubjectId(sub.id)}>
        <div className="card-top">
          <div className="icon-wrapper" style={{ background: `${sub.color}20`, color: sub.color }}>
            {availableIcons[sub.icon] || availableIcons['book']}
          </div>
          <button className="del-btn" onClick={(e) => deleteSubject(sub.id, e)}>
            <Trash2 size={16} />
          </button>
        </div>

        <h3 className="card-title">{sub.name}</h3>

        <div className="card-stats">
          <div className="stat-label">
            <CheckCircle2 size={14} color="#94a3b8" />
            <span>{cCount} / {tCount} {t.tasksCompleted}</span>
          </div>
          <span className="progress-text" style={{ color: sub.color }}>{prog}%</span>
        </div>

        <div className="luxe-progress-bg">
          <div
            className="luxe-progress-fill"
            style={{
              width: `${prog}%`,
              background: `linear-gradient(90deg, ${sub.color}80, ${sub.color})`,
              boxShadow: `0 0 10px ${sub.color}60`
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-section command-center">
      {/* Premium Header */}
      <div className="command-header-premium">
        <div className="header-text-group">
          <h1 className="luxe-title">{t.commandCenter}</h1>
          <p className="luxe-subtitle">{t.manageSubjects}</p>
        </div>

        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder={t.searchPlaceholder || "Search courses..."}
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-luxe primary" onClick={() => setIsAdding(!isAdding)}>
            <Plus size={18} />
            <span>{t.addSubject}</span>
          </button>
        </div>
      </div>

      {/* Add Form (Animated Dropdown) */}
      {isAdding && (
        <form onSubmit={addSubject} className="add-subject-form luxe-panel">
          <div className="form-header">
            <h3>{t.addSubject}</h3>
          </div>
          <div className="form-body">
            <input
              type="text"
              placeholder={t.subjectName}
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              className="input-luxe"
              autoFocus
            />
            <div className="icon-grid">
              {Object.keys(availableIcons).map(iconKey => (
                <div
                  key={iconKey}
                  className={`icon-box ${newSubIcon === iconKey ? 'active' : ''}`}
                  onClick={() => setNewSubIcon(iconKey)}
                >
                  {availableIcons[iconKey]}
                </div>
              ))}
            </div>
            <button type="submit" className="btn-luxe submit">{t.addSubject}</button>
          </div>
        </form>
      )}

      {/* Active Subjects Section */}
      <div className="section-divider">
        <span className="divider-text">{t.activeSubjects || 'Active Subjects'}</span>
        <div className="divider-line"></div>
      </div>

      <div className="luxe-grid">
        {activeSubjects.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} color="#475569" />
            <p>{searchQuery ? "No matching active subjects." : t.noSubjects}</p>
          </div>
        ) : (
          activeSubjects.map(sub => renderSubjectCard(sub))
        )}
      </div>

      {/* Completed Subjects Section */}
      {completedSubjects.length > 0 && (
        <>
          <div className="section-divider" style={{ marginTop: '20px' }}>
            <span className="divider-text" style={{ color: '#10b981' }}>{t.completedSubjects || 'Completed Subjects'}</span>
            <div className="divider-line" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.3), transparent)' }}></div>
          </div>

          <div className="luxe-grid" style={{ opacity: 0.7 }}>
            {completedSubjects.map(sub => renderSubjectCard(sub))}
          </div>
        </>
      )}
    </div>
  );
}
