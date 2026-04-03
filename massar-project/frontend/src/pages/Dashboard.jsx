import { useState } from 'react';
import { BookOpen, Calculator, Globe, Code, PenTool, FlaskConical, Plus, Trash2, CheckCircle2, Search, ArrowLeft, Check, PlayCircle, BarChart3, Library } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const availableIcons = {
  book: <BookOpen size={24} />,
  math: <Calculator size={24} />,
  globe: <Globe size={24} />,
  code: <Code size={24} />,
  art: <PenTool size={24} />,
  science: <FlaskConical size={24} />
};

export default function Dashboard({ t, selectedCourseId, setSelectedCourseId }) {
  const [courses, setCourses] = useState([
    {
      id: 1, name: 'Mathematics', icon: 'math', color: '#3b82f6',
      componentList: [
        { id: 101, text: 'Linear Algebra Worksheet', progress: 100, type: 'pdf' },
        { id: 102, text: 'Study for Midterm', progress: 0, type: 'pptx' }
      ]
    },
    {
      id: 2, name: 'Computer Science', icon: 'code', color: '#8b5cf6',
      componentList: [
        { id: 201, text: 'Install React', progress: 100, type: 'pdf' },
        { id: 202, text: 'Build API Backend', progress: 50, type: 'pdf' },
        { id: 203, text: 'Deploy to Vercel', progress: 0, type: 'pdf' }
      ]
    },
    {
      id: 3, name: 'World History', icon: 'globe', color: '#10b981',
      componentList: [
        { id: 301, text: 'Read Chapter 4', progress: 100, type: 'pdf' },
        { id: 302, text: 'Essay Outline', progress: 100, type: 'pdf' }
      ]
    },
    {
      id: 4, name: 'Literature', icon: 'book', color: '#f59e0b',
      componentList: []
    }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseIcon, setNewCourseIcon] = useState('book');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Global Timeline
  const [timeline, setTimeline] = useState([
    { id: 2, date: 'Apr 02', textKey: 'masteredLinearAlgebra', subjectKey: 'mathSubject', color: '#3b82f6', icon: 'math' },
    { id: 1, date: 'Apr 01', textKey: 'joinedPlatform', subjectKey: 'platform', color: '#10b981', icon: 'globe' }
  ]);

  const addCourse = (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newCourse = {
      id: Date.now(),
      name: newCourseName,
      icon: newCourseIcon,
      color: randomColor,
      componentList: []
    };
    setCourses([...courses, newCourse]);
    setNewCourseName('');
    setIsAdding(false);
    setSelectedCourseId(newCourse.id);
  };

  const deleteCourse = (id, e) => {
    e.stopPropagation();
    setCourses(courses.filter(c => c.id !== id));
    if (selectedCourseId === id) setSelectedCourseId(null);
  };

  // Component Handlers
  const updateProgress = (courseId, compId, newValue) => {
    let taskBecameCompleted = false;
    let targetCourse = null;
    let targetCompText = '';

    setCourses(courses.map(course => {
      if (course.id !== courseId) return course;
      const updatedList = course.componentList.map(comp => {
        if (comp.id === compId) {
          const oldProg = comp.progress;
          if (oldProg < 100 && newValue === 100) {
            taskBecameCompleted = true;
            targetCourse = course;
            targetCompText = comp.text;
          }
          return { ...comp, progress: newValue };
        }
        return comp;
      });
      return { ...course, componentList: updatedList };
    }));

    if (taskBecameCompleted) {
      const newMilestone = {
        id: Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        text: `${t.masteredTask || 'Mastered'}: ${targetCompText}`,
        subject: targetCourse.name,
        color: targetCourse.color,
        icon: targetCourse.icon
      };
      setTimeline(prev => [newMilestone, ...prev]);
    }
  };

  const handleResourceSelect = (e, courseId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Simulate "Real" addition (since we can't touch backend)
    setTimeout(() => {
      setCourses(courses.map(course => {
        if (course.id !== courseId) return course;
        const extension = file.name.split('.').pop().toLowerCase();
        const newResource = {
          id: Date.now(),
          text: file.name,
          progress: 0,
          type: extension,
          fileUrl: URL.createObjectURL(file)
        };
        return { ...course, componentList: [...course.componentList, newResource] };
      }));
      setIsUploading(false);
      e.target.value = ''; 
    }, 800);
  };

  const deleteResource = (courseId, resourceId) => {
    setCourses(courses.map(course => {
      if (course.id !== courseId) return course;
      return {
        ...course,
        componentList: course.componentList.filter(res => res.id !== resourceId)
      };
    }));
  };

  // Render Course Detail View
  if (selectedCourseId) {
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    if (!selectedCourse) {
      setSelectedCourseId(null);
      return null;
    }

    const total = selectedCourse.componentList.length;
    const totalProgVal = selectedCourse.componentList.reduce((acc, curr) => acc + curr.progress, 0);
    const prog = total === 0 ? 0 : Math.round(totalProgVal / total);
    const completedCount = selectedCourse.componentList.filter(c => c.progress === 100).length;

    // Chart Data Preparation
    const chartData = selectedCourse.componentList.map((comp) => ({
      name: comp.text.length > 12 ? comp.text.substring(0, 10) + '...' : comp.text,
      fullName: comp.text,
      progress: comp.progress,
      fill: comp.progress === 100 ? selectedCourse.color : (comp.progress > 0 ? `${selectedCourse.color}99` : '#334155')
    }));

    return (
      <div className="dashboard-section command-center">
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
          <button className="btn-luxe" onClick={() => setSelectedCourseId(null)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
            <ArrowLeft size={18} /> {t.backToDashboard}
          </button>
        </div>

        {/* Course Hero Panel */}
        <div className="luxe-panel detail-hero">
          <div className="detail-hero-top">
            <button className="del-btn" onClick={() => setSelectedCourseId(null)} style={{ marginRight: '15px' }}>
              <ArrowLeft size={24} color="white" />
            </button>
            <div className="icon-wrapper" style={{ background: `${selectedCourse.color}20`, color: selectedCourse.color, marginRight: '15px' }}>
              {availableIcons[selectedCourse.icon] || availableIcons['book']}
            </div>
            <h2 className="luxe-title" style={{ fontSize: '28px' }}>
              {selectedCourse.name === 'Mathematics' ? t.mathSubject : 
               selectedCourse.name === 'Computer Science' ? (t.csSubject || 'Computer Science') : 
               selectedCourse.name === 'World History' ? (t.historySubject || 'World History') : 
               selectedCourse.name === 'Literature' ? (t.literatureSubject || 'Literature') : 
               selectedCourse.name}
            </h2>
          </div>

          <div className="detail-stats" style={{ marginTop: '30px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>{completedCount} / {total} {t.componentsCompleted || 'Resources Completed'}</span>
            <span style={{ color: selectedCourse.color, fontWeight: 'bold' }}>{prog}% {t.mastery || 'Mastery'}</span>
          </div>

          <div className="luxe-progress-bg" style={{ height: '10px' }}>
            <div
              className="luxe-progress-fill"
              style={{ width: `${prog}%`, background: selectedCourse.color, boxShadow: `0 0 15px ${selectedCourse.color}80` }}
            ></div>
          </div>
        </div>

        {/* Two-column layout: Checklist + Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', marginTop: '20px' }}>

          {/* Components Checklist */}
          <div className="task-checklist luxe-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: 'white', marginBottom: '25px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Library size={22} color={selectedCourse.color} />
              {t.resourcesLearningAssets || 'Resources & Learning Assets'}
            </h3>

            <div className="task-list" style={{ flex: 1 }}>
              {selectedCourse.componentList.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px', background: 'transparent', border: 'none' }}>
                  <p>{t.noComponentsYet || 'No resources added yet. Add a PDF or PPTX to begin.'}</p>
                </div>
              ) : (
                selectedCourse.componentList.map(comp => (
                  <div
                    key={comp.id}
                    className={`task-item ${comp.progress === 100 ? 'completed' : ''}`}
                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '20px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="task-text" style={{ fontSize: '16px', fontWeight: '600' }}>{comp.text}</span>
                        {comp.fileUrl && (
                          <a href={comp.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: selectedCourse.color, textDecoration: 'underline' }}>
                            {t.open || 'Open'}
                          </a>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: comp.progress === 100 ? selectedCourse.color : '#94a3b8' }}>
                          {comp.progress}%
                        </span>
                        <button 
                          className="del-btn" 
                          onClick={() => deleteResource(selectedCourse.id, comp.id)}
                          style={{ padding: '4px', opacity: 0.6 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={comp.progress}
                      onChange={(e) => updateProgress(selectedCourse.id, comp.id, parseInt(e.target.value))}
                      className="styled-slider"
                      style={{ '--slider-color': selectedCourse.color }}
                    />
                  </div>
                ))
              )}
            </div>

            <div className="add-task-form">
              <label className="btn-luxe" style={{ background: selectedCourse.color, color: 'white', padding: '16px', flex: 1, justifyItems: 'center', cursor: isUploading ? 'wait' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
                <Plus size={20} style={{ marginLeft: '8px', marginRight: '8px' }} />
                <span>{isUploading ? (t.addingResource || 'Adding Resource...') : (t.addResources || 'Add Resources (PDF/PPTX) +')}</span>
                <input
                  type="file"
                  accept=".pdf,.pptx"
                  style={{ display: 'none' }}
                  onChange={(e) => handleResourceSelect(e, selectedCourse.id)}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Progress Chart & Quiz Action */}
          <div className="luxe-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: 'white', marginBottom: '25px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={22} color={selectedCourse.color} />
              {t.progressDiagram || 'Progress Diagram'}
            </h3>

            {selectedCourse.componentList.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px', background: 'transparent', border: 'none', flex: 1 }}>
                <p style={{ color: '#64748b', textAlign: 'center' }}>Add components to see your progress chart.</p>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: '250px', width: '100%', marginBottom: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} ticks={[0, 25, 50, 75, 100]} tickFormatter={(val) => `${val}%`} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '10px', borderRadius: '8px', color: 'white' }}>
                              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{payload[0].payload.fullName}</p>
                              <p style={{ margin: 0, color: payload[0].payload.fill }}>
                                Progress: {payload[0].value}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="progress" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Nice Design Button "Start the quiz" */}
            <button className="start-quiz-btn" style={{
              background: `linear-gradient(135deg, ${selectedCourse.color}, ${selectedCourse.color}dd)`,
              boxShadow: `0 8px 20px -5px ${selectedCourse.color}aa`
            }}>
              <PlayCircle size={22} className="quiz-icon" />
              <span>{t.startQuiz || 'Start the quiz'}</span>
              <div className="btn-glow" style={{ background: selectedCourse.color }}></div>
            </button>

          </div>
        </div>
      </div>
    );
  }

  // --- Grid Mode ---
  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getCourseCounts = (course) => {
    const total = course.componentList.length;
    const totalProgVal = course.componentList.reduce((acc, curr) => acc + curr.progress, 0);
    const prog = total === 0 ? 0 : Math.round(totalProgVal / total);
    const completedCount = course.componentList.filter(c => c.progress === 100).length;
    return { total, done: completedCount, prog };
  };

  const activeCourses = filteredCourses.filter(course => {
    const { total, done } = getCourseCounts(course);
    return total === 0 || done < total;
  });

  const completedCourses = filteredCourses.filter(course => {
    const { total, done } = getCourseCounts(course);
    return total > 0 && done >= total;
  });

  const renderCourseCard = (course) => {
    const { total, done, prog } = getCourseCounts(course);
    return (
      <div key={course.id} className="luxe-card clickable hover-lift animate-slide-up glass-glow" onClick={() => setSelectedCourseId(course.id)}>
        <div className="card-top">
          <div className="icon-wrapper" style={{ background: `${course.color}20`, color: course.color }}>
            {availableIcons[course.icon] || availableIcons['book']}
          </div>
          <button className="del-btn" onClick={(e) => deleteCourse(course.id, e)}>
            <Trash2 size={16} />
          </button>
        </div>

        <h3 className="card-title">
          {course.name === 'Mathematics' ? t.mathSubject : 
           course.name === 'Computer Science' ? (t.csSubject || 'Computer Science') : 
           course.name === 'World History' ? (t.historySubject || 'World History') : 
           course.name === 'Literature' ? (t.literatureSubject || 'Literature') : 
           course.name}
        </h3>

        <div className="card-stats">
          <div className="stat-label">
            <CheckCircle2 size={14} color="#94a3b8" />
            <span>{done} / {total} {t.componentsCompleted || 'Resources'}</span>
          </div>
          <span className="progress-text" style={{ color: course.color }}>{prog}% Mastery</span>
        </div>

        <div className="luxe-progress-bg">
          <div
            className="luxe-progress-fill"
            style={{
              width: `${prog}%`,
              background: `linear-gradient(90deg, ${course.color}80, ${course.color})`,
              boxShadow: `0 0 10px ${course.color}60`
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
          <p className="luxe-subtitle">{t.manageCourses}</p>
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
            <span>{t.addCourse}</span>
          </button>
        </div>
      </div>

      {/* Add Course Form */}
      {isAdding && (
        <form onSubmit={addCourse} className="add-subject-form luxe-panel">
          <div className="form-header">
            <h3>{t.addCourse}</h3>
          </div>
          <div className="form-body">
            <input
              type="text"
              placeholder={t.courseName}
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              className="input-luxe"
              autoFocus
            />
            <div className="icon-grid">
              {Object.keys(availableIcons).map(iconKey => (
                <div
                  key={iconKey}
                  className={`icon-box ${newCourseIcon === iconKey ? 'active' : ''}`}
                  onClick={() => setNewCourseIcon(iconKey)}
                  title={iconKey.charAt(0).toUpperCase() + iconKey.slice(1)}
                >
                  {availableIcons[iconKey]}
                </div>
              ))}
            </div>
            <button type="submit" className="btn-luxe submit">{t.addCourse}</button>
          </div>
        </form>
      )}

      {/* Global Cognitive Growth Timeline (restored here) */}
      <div className="section-divider" style={{ marginTop: '20px' }}>
        <span className="divider-text">{t.growthTimeline || 'Cognitive Growth Timeline'}</span>
        <div className="divider-line" style={{ background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.5), transparent)' }}></div>
      </div>

      <div className="timeline-scroll-wrapper glass-glow animate-slide-up">
        <div className="timeline-track">
          {timeline.map((node, index) => (
            <div key={node.id} className="timeline-node" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="node-date">{node.date}</div>
              <div className="node-body">
                <div 
                  className="node-icon-wrapper" 
                  style={{ 
                    background: `${node.color}15`, 
                    color: node.color, 
                    border: `1px solid ${node.color}30`, 
                    boxShadow: `0 0 20px ${node.color}20`
                  }}
                >
                  {availableIcons[node.icon] || availableIcons['book']}
                </div>
              </div>
              <div className="node-content">
                <div className="node-subject" style={{ color: node.color }}>
                  {node.subjectKey ? t[node.subjectKey] : node.subject}
                </div>
                <div className="node-text">
                  {node.textKey ? t[node.textKey] : node.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Courses Section */}
      <div className="section-divider" style={{ marginTop: '30px' }}>
        <span className="divider-text">{t.activeCourses || 'Active Courses'}</span>
        <div className="divider-line"></div>
      </div>

      <div className="luxe-grid">
        {activeCourses.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} color="#475569" />
            <p>{searchQuery ? "No matching active courses." : t.noCourses}</p>
          </div>
        ) : (
          activeCourses.map(course => renderCourseCard(course))
        )}
      </div>

      {/* Completed Courses Section */}
      {completedCourses.length > 0 && (
        <>
          <div className="section-divider" style={{ marginTop: '20px' }}>
            <span className="divider-text" style={{ color: '#10b981' }}>{t.completedCourses || 'Completed Courses'}</span>
            <div className="divider-line" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.3), transparent)' }}></div>
          </div>

          <div className="luxe-grid" style={{ opacity: 0.7 }}>
            {completedCourses.map(course => renderCourseCard(course))}
          </div>
        </>
      )}
    </div>
  );
}
