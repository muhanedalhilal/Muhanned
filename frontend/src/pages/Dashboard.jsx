import { useState, useEffect } from 'react';
import { BookOpen, Calculator, Globe, Code, PenTool, FlaskConical, Plus, Trash2, CheckCircle2, Search, ArrowLeft, Check, PlayCircle, BarChart3, Library, Layers, Wand2, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

const availableIcons = {
  book: <BookOpen size={24} />,
  math: <Calculator size={24} />,
  globe: <Globe size={24} />,
  code: <Code size={24} />,
  art: <PenTool size={24} />,
  science: <FlaskConical size={24} />
};

const CustomXAxisTick = ({ x, y, payload }) => {
  const fullText = payload.value;
  const truncated = fullText.length > 12 ? fullText.substring(0, 12) + '...' : fullText;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="#94a3b8" fontSize={11} transform="rotate(-25)">
        <title>{fullText}</title>
        {truncated}
      </text>
    </g>
  );
};

export default function Dashboard({ t, currentPage, selectedCourseId, setSelectedCourseId, setCurrentPage, selectedComponentsForQuiz, setSelectedComponentsForQuiz }) {
  const [courses, setCourses] = useState([]);

  const [isAdding, setIsAdding] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingResId, setDeletingResId] = useState(null);
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [newComponentName, setNewComponentName] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isSavingComponent, setIsSavingComponent] = useState(false);
  const [componentValidationError, setComponentValidationError] = useState('');

  const [dashboardUser, setDashboardUser] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [selectedComponents, setSelectedComponents] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userRes, coursesRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/courses/')
        ]);

        if (userRes.ok) {
          setDashboardUser(userRes.data);
        } else {
          setDashboardError(userRes.message);
        }

        if (coursesRes.ok) {
          setCourses(coursesRes.data);
        }
      } catch (e) {
        setDashboardError("Failed to fetch dashboard data");
      } finally {
        setDashboardLoading(false);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (currentPage === 'dashboard') {
      api.get('/courses/').then(res => {
        if (res.ok) setCourses(res.data);
      });
    }
  }, [currentPage]);

  const addCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const payload = {
      name: newCourseName,
      icon: 'book',
      color: randomColor
    };

    const res = await api.post('/courses/', payload);
    if (res.ok) {
      setCourses([...courses, { ...res.data, resourceList: [], componentList: [] }]);
      setSelectedCourseId(res.data.id);
    } else {
      alert("Failed to create course");
    }
    setNewCourseName('');
    setIsAdding(false);
  };

  const deleteCourse = async (id, e) => {
    e.stopPropagation();
    const res = await api.delete(`/courses/${id}`);
    if (res.ok) {
      setCourses(courses.filter(c => c.id !== id));
      if (selectedCourseId === id) setSelectedCourseId(null);
    } else {
      alert("Failed to delete course");
    }
  };

  // Component Handlers
  const updateProgress = (courseId, compId, newValue) => {
    setCourses(courses.map(course => {
      if (course.id !== courseId) return course;
      const updatedList = course.componentList.map(comp => {
        if (comp.id === compId) {
          return { ...comp, progress: newValue };
        }
        return comp;
      });
      return { ...course, componentList: updatedList };
    }));
  };

  const handleResourceSelect = async (e, courseId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = ['pdf', 'ppt', 'pptx'];
    const extension = file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(extension)) {
      alert("Invalid file type! Only PDF, PPT, and PPTX are allowed.");
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("course_id", courseId);

    try {
      const response = await api.post('/upload/', formData);
      if (response.ok) {
        const docId = response.data.document_id;
        // Fetch KCs generated from the backend
        let kcsList = [];
        if (docId) {
          const kcsResponse = await api.get(`/knowledge/documents/${docId}/kcs`);
          if (kcsResponse.ok) {
            kcsList = kcsResponse.data.map(kc => ({
              id: kc.id,
              text: kc.topic,
              content: kc.content,
              progress: 0
            }));
          }
        }

        setCourses(courses.map(course => {
          if (course.id !== courseId) return course;

          const newResource = {
            id: docId || Date.now(),
            text: file.name,
            type: extension,
            fileUrl: null // Wait for backend serving later
          };
          return {
            ...course,
            resourceList: [...(course.resourceList || []), newResource],
            componentList: [...(course.componentList || []), ...kcsList]
          };
        }));
      } else {
        alert("Upload failed: " + response.message);
      }
    } catch (err) {
      alert("Error parsing upload: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const deleteResource = async (courseId, resourceId) => {
    if (!window.confirm(t.confirmDeleteResource || "Are you sure you want to delete this resource? All related AI Knowledge Components will also be permanently deleted.")) {
      return;
    }

    setDeletingResId(resourceId);
    try {
      const res = await api.delete(`/knowledge/documents/${resourceId}`);
      if (res.ok) {
        // Refresh courses from backend to accurately sync resources and components
        const coursesRes = await api.get('/courses/');
        if (coursesRes.ok) {
          setCourses(coursesRes.data);
          // If you were tracking selected components that were just deleted, they will just be filtered implicitly
        }
      } else {
        alert("Failed to delete resource: " + res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingResId(null);
    }
  };

  const deleteComponent = (courseId, compId) => {
    setCourses(courses.map(course => {
      if (course.id !== courseId) return course;
      return {
        ...course,
        componentList: (course.componentList || []).filter(c => c.id !== compId)
      };
    }));
  };

  const openAddComponent = async (courseId, componentList) => {
    setIsAddingComponent(true);
    setNewComponentName('');
    setComponentValidationError('');
    setAiSuggestions([]);
    setIsFetchingSuggestions(true);
    try {
      const existingTopics = (componentList || []).map(c => c.text);
      const res = await api.post(`/courses/${courseId}/suggest-components`, { existing_topics: existingTopics });
      if (res.ok && res.data.suggestions) {
        setAiSuggestions(res.data.suggestions);
      }
    } catch (_) {}
    setIsFetchingSuggestions(false);
  };

  const handleSaveManualComponent = async (courseId) => {
    const topic = newComponentName.trim();
    if (!topic) return;
    setIsSavingComponent(true);
    setComponentValidationError('');
    try {
      const res = await api.post(`/courses/${courseId}/add-manual-component`, { topic });
      if (res.ok) {
        setCourses(courses.map(course => {
          if (course.id !== courseId) return course;
          return {
            ...course,
            componentList: [...(course.componentList || []), { id: res.data.id, text: res.data.text, content: res.data.content, progress: 0 }]
          };
        }));
        setNewComponentName('');
        setIsAddingComponent(false);
        setAiSuggestions([]);
        setComponentValidationError('');
      } else {
        // 422 → detail is the validation error reason
        const reason = res.data?.detail || res.message || 'This topic does not seem related to this course.';
        setComponentValidationError(reason);
      }
    } catch (err) {
      setComponentValidationError('Something went wrong. Please try again.');
    }
    setIsSavingComponent(false);
  };

  const handlePickSuggestion = async (courseId, suggestion) => {
    // Suggestions are already AI-validated; directly add via manual endpoint so they get saved to DB
    setIsSavingComponent(true);
    setComponentValidationError('');
    try {
      const res = await api.post(`/courses/${courseId}/add-manual-component`, { topic: suggestion.topic });
      if (res.ok) {
        setCourses(courses.map(course => {
          if (course.id !== courseId) return course;
          return {
            ...course,
            componentList: [...(course.componentList || []), { id: res.data.id, text: res.data.text, content: res.data.content, progress: 0 }]
          };
        }));
        setIsAddingComponent(false);
        setAiSuggestions([]);
        setNewComponentName('');
      } else {
        setComponentValidationError(res.data?.detail || 'Failed to add suggestion.');
      }
    } catch (err) {
      setComponentValidationError('Something went wrong.');
    }
    setIsSavingComponent(false);
  };


  // Render Course Detail View
  if (selectedCourseId) {
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    if (!selectedCourse) {
      // Courses are still loading — show a spinner instead of a blank page
      if (!dashboardLoading) {
        setSelectedCourseId(null);
      }
      return (
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: '48px 40px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06), 0 20px 50px rgba(0,0,0,0.07)',
            border: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
            minWidth: '260px'
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              border: '4px solid #e2e8f0', borderTopColor: '#3b82f6',
              animation: 'spinCircle 0.8s linear infinite'
            }} />
            <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#0B1F3A' }}>
              Loading course...
            </p>
          </div>
        </div>
      );
    }


    const toggleComponentSelection = (compId) => {
      setSelectedComponents(prev =>
        prev.includes(compId) ? prev.filter(id => id !== compId) : [...prev, compId]
      );
    };

    const isAllSelected = selectedCourse.componentList.length > 0 &&
      selectedCourse.componentList.every(c => selectedComponents.includes(c.id));

    const toggleSelectAll = () => {
      if (isAllSelected) {
        setSelectedComponents(prev => prev.filter(id => !selectedCourse.componentList.map(c => c.id).includes(id)));
      } else {
        const courseCompIds = selectedCourse.componentList.map(c => c.id);
        setSelectedComponents(prev => [...new Set([...prev, ...courseCompIds])]);
      }
    };

    const total = selectedCourse.componentList.length;
    const totalProgVal = selectedCourse.componentList.reduce((acc, curr) => acc + curr.progress, 0);
    const prog = total === 0 ? 0 : Math.round(totalProgVal / total);
    const completedCount = selectedCourse.componentList.filter(c => c.progress >= 90).length;

    // Chart Data Preparation
    const chartData = selectedCourse.componentList.map((comp) => ({
      name: comp.text,
      fullName: comp.text,
      progress: comp.progress,
      fill: comp.progress >= 90 ? selectedCourse.color : (comp.progress > 0 ? `${selectedCourse.color}99` : '#334155')
    }));

    return (
      <div className="dashboard-section command-center" style={{ position: 'relative' }}>

        {/* Full-screen AI Generation Overlay */}
        {isUploading && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px'
            }}>
              {/* Circle spinner */}
              <div style={{
                width: '52px', height: '52px',
                borderRadius: '50%',
                border: '4px solid #e2e8f0',
                borderTopColor: '#3b82f6',
                animation: 'spinCircle 0.8s linear infinite'
              }} />
              <span style={{
                fontSize: '15px', fontWeight: '600',
                color: '#0B1F3A', letterSpacing: '0.2px'
              }}>
                Generating components
              </span>
            </div>
          </div>
        )}


        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
          <button className="btn-luxe" onClick={() => { setSelectedCourseId(null); setSelectedComponents([]); }} style={{ background: 'rgba(0,0,0,0.05)', color: 'black', border: '1px solid rgba(0,0,0,0.1)' }}>
            <ArrowLeft size={18} /> {t.backToDashboard}
          </button>
        </div>

        {/* Course Hero Panel */}
        <div className="luxe-panel detail-hero bento-hero">
          <div className="detail-hero-top" style={{ display: 'flex', alignItems: 'center' }}>
            <button className="del-btn" onClick={() => setSelectedCourseId(null)} style={{ marginRight: '15px' }}>
              <ArrowLeft size={24} color="#1e293b" />
            </button>
            <h2 className="luxe-title" style={{ fontSize: '28px', color: 'black' }}>
              {selectedCourse.name === 'Mathematics' ? t.mathSubject :
                selectedCourse.name === 'Computer Science' ? (t.csSubject || 'Computer Science') :
                  selectedCourse.name === 'World History' ? (t.historySubject || 'World History') :
                    selectedCourse.name === 'Literature' ? (t.literatureSubject || 'Literature') :
                      selectedCourse.name}
            </h2>
          </div>

          <div className="detail-stats" style={{ marginTop: '30px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#3b82f6' }}>{completedCount} / {total} {t.componentsCompleted || 'Resources Completed'}</span>
            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{prog}% {t.mastery || 'Mastery'}</span>
          </div>

          <div className="luxe-progress-bg" style={{ height: '10px' }}>
            <div
              className="luxe-progress-fill"
              style={{ width: `${prog}%`, background: '#3b82f6', boxShadow: `0 0 15px rgba(59, 130, 246, 0.5)` }}
            ></div>
          </div>
        </div>

        {/* Bento Box layout: Checklist + Chart */}
        <div className="bento-layout">

          {/* Panel 1: Resources Section */}
          <div className="task-checklist luxe-panel bento-tasks" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: 'black', marginBottom: '15px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Library size={22} color="#3b82f6" />
              {t.resourcesLearningAssets || 'Resources & Learning Assets'}
            </h3>

            <div className="task-list custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', minHeight: '150px' }}>
              {(selectedCourse.resourceList || []).length === 0 ? (
                <div className="empty-state" style={{ padding: '20px', background: 'transparent', border: 'none' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>{t.noResourcesYet || 'No resources added yet. Add a PDF or PPTX to begin.'}</p>
                </div>
              ) : (
                (selectedCourse.resourceList || []).map(res => (
                  <div
                    key={res.id}
                    className="task-item"
                    style={{ padding: '18px 20px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}
                  >
                    <div style={{ width: '100%' }}>
                      {res.fileUrl ? (
                        <a
                          href={res.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="task-text"
                          title={res.text}
                          style={{
                            fontSize: '16px',
                            fontWeight: '800',
                            color: '#1e293b',
                            lineHeight: '1.4',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            display: 'inline-block',
                            wordBreak: 'break-word'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#1e293b'}
                        >
                          {res.text}
                        </a>
                      ) : (
                        <span
                          className="task-text"
                          style={{
                            fontSize: '16px',
                            fontWeight: '800',
                            color: '#1e293b',
                            lineHeight: '1.4',
                            display: 'inline-block',
                            wordBreak: 'break-word'
                          }}
                        >
                          {res.text}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        className="del-btn"
                        onClick={() => deleteResource(selectedCourse.id, res.id)}
                        style={{ padding: '4px', opacity: 0.6 }}
                        disabled={deletingResId === res.id}
                      >
                        {deletingResId === res.id ? <Loader2 size={16} className="spin-icon" color="#ef4444" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="add-task-form" style={{ marginTop: '10px' }}>
              <label className="btn-luxe primary">
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

          {/* Panel 2: Components Section (With Progress) */}
          <div className="components-section luxe-panel bento-components" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: 'black', margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={22} color="#3b82f6" />
                {t.components || 'Components'}
              </h3>
              {selectedCourse.componentList.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {isAllSelected ? (t.deselectAll || "Deselect All") : (t.selectAll || "Select All")}
                </button>
              )}
            </div>

            <div className="task-list custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', minHeight: '150px' }}>
              {selectedCourse.componentList.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px', background: 'transparent', border: 'none' }}>
                  <p style={{ margin: 0 }}>{t.noComponentsYet || 'No components defined.'}</p>
                </div>
              ) : (
                selectedCourse.componentList.map(comp => (
                  <div
                    key={comp.id}
                    className={`task-item ${selectedComponents.includes(comp.id) ? 'active' : ''}`}
                    onClick={() => toggleComponentSelection(comp.id)}
                    style={{
                      padding: '18px 20px',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      border: selectedComponents.includes(comp.id) ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.08)',
                      background: selectedComponents.includes(comp.id) ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span className="task-text" style={{ fontSize: '16px', fontWeight: '600', color: selectedComponents.includes(comp.id) ? '#3b82f6' : '#1e3a8a' }}>{comp.text}</span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button
                        className="del-btn"
                        onClick={(e) => { e.stopPropagation(); deleteComponent(selectedCourse.id, comp.id); }}
                        style={{ padding: '4px', opacity: 0.6, border: 'none', background: 'none' }}
                      >
                        <Trash2 size={16} color="#64748b" />
                      </button>

                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: '2px solid #3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: selectedComponents.includes(comp.id) ? '#3b82f6' : 'transparent',
                        transition: '0.2s',
                        boxShadow: selectedComponents.includes(comp.id) ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
                      }}>
                        {selectedComponents.includes(comp.id) && <Check size={14} color="white" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>


            {/* Add Component Button OR AI-Powered Input */}
            {isAddingComponent ? (
              <div style={{
                marginTop: '10px',
                background: 'rgba(59,130,246,0.03)',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid rgba(59,130,246,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>

                {/* AI Suggestions */}
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    AI Suggestions
                  </p>
                  {isFetchingSuggestions ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '18px 0' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '3px solid rgba(59,130,246,0.15)',
                        borderTopColor: '#3b82f6',
                        animation: 'spinCircle 0.75s linear infinite'
                      }} />
                    </div>
                  ) : aiSuggestions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {aiSuggestions.map((s, i) => (
                        <button
                          key={i}
                          disabled={isSavingComponent}
                          onClick={() => handlePickSuggestion(selectedCourse.id, s)}
                          style={{
                            background: 'rgba(59,130,246,0.05)',
                            border: '1px solid rgba(59,130,246,0.2)',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            cursor: isSavingComponent ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                            width: '100%',
                          }}
                          onMouseOver={e => { if (!isSavingComponent) { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = '#3b82f6'; } }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e3a8a' }}>{s.topic}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>No suggestions available. Type a topic below.</p>
                  )}
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>or type your own</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
                </div>

                {/* Manual Input */}
                <input
                  type="text"
                  value={newComponentName}
                  onChange={(e) => { setNewComponentName(e.target.value); setComponentValidationError(''); }}
                  placeholder={t.addComponent || 'Component name...'}
                  className="input-luxe"
                  autoFocus
                  disabled={isSavingComponent}
                  style={{ background: '#ffffff', color: '#0f172a', border: componentValidationError ? '1.5px solid #ef4444' : '1px solid #3b82f6', width: '100%', marginBottom: '0' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveManualComponent(selectedCourse.id);
                    if (e.key === 'Escape') { setIsAddingComponent(false); setNewComponentName(''); setAiSuggestions([]); setComponentValidationError(''); }
                  }}
                />

                {/* Validation Error */}
                {componentValidationError && (
                  <div style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '15px', marginTop: '1px' }}>⚠️</span>
                    <p style={{ margin: 0, fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>
                      {componentValidationError}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-luxe primary hover-lift"
                    onClick={() => handleSaveManualComponent(selectedCourse.id)}
                    disabled={isSavingComponent || !newComponentName.trim()}
                    style={{ padding: '8px', flex: 1, justifyContent: 'center', opacity: (!newComponentName.trim() || isSavingComponent) ? 0.5 : 1 }}
                  >
                    {isSavingComponent ? <Loader2 size={16} className="spin-icon" style={{ marginRight: '6px' }} /> : null}
                    {isSavingComponent ? 'Checking...' : (t.save || 'Save')}
                  </button>
                  <button
                    className="btn-luxe hover-lift"
                    onClick={() => { setIsAddingComponent(false); setNewComponentName(''); setAiSuggestions([]); setComponentValidationError(''); }}
                    disabled={isSavingComponent}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '8px', flex: 1, justifyContent: 'center' }}
                  >
                    {t.cancel || 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn-luxe hover-lift"
                onClick={() => openAddComponent(selectedCourse.id, selectedCourse.componentList)}
                style={{
                  background: 'rgba(0, 0, 0, 0.03)',
                  border: '1px dashed rgba(0, 0, 0, 0.15)',
                  color: '#1e293b',
                  marginTop: '10px',
                  width: '100%',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={18} />
                <span>{t.addComponent || 'Add Component'}</span>
              </button>
            )}

            {/* Start Quiz Button Under Components */}
            <div style={{ marginTop: '15px', position: 'relative' }}>
              {selectedComponents.length > 0 && (
                <div style={{
                  position: 'absolute', inset: '-3px', borderRadius: '16px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6)',
                  backgroundSize: '200% 200%',
                  animation: 'quizGradientShift 3s ease infinite',
                  filter: 'blur(8px)', opacity: 0.5, zIndex: 0
                }} />
              )}
              <button
                className="start-quiz-btn hover-lift"
                disabled={selectedComponents.length === 0}
                onClick={() => {
                  setSelectedComponentsForQuiz(selectedComponents);
                  setCurrentPage('quiz');
                }}
                style={{
                  opacity: selectedComponents.length === 0 ? 0.45 : 1,
                  cursor: selectedComponents.length === 0 ? 'not-allowed' : 'pointer',
                  filter: selectedComponents.length === 0 ? 'grayscale(1)' : 'none',
                  position: 'relative', zIndex: 1,
                  background: selectedComponents.length > 0 ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : undefined,
                  border: 'none',
                  boxShadow: selectedComponents.length > 0 ? '0 8px 25px rgba(59,130,246,0.45)' : undefined,
                  transform: selectedComponents.length > 0 ? 'scale(1)' : undefined,
                  transition: 'all 0.3s ease',
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: '700',
                  letterSpacing: '0.3px',
                }}
              >
                <PlayCircle size={22} className="quiz-icon" style={{ animation: selectedComponents.length > 0 ? 'quizIconPulse 1.5s ease-in-out infinite' : 'none' }} />
                <span>
                  {selectedComponents.length === 0
                    ? (t.startQuiz || 'Start the quiz')
                    : `${t.startQuiz || 'Start Quiz'} (${selectedComponents.length} topic${selectedComponents.length !== 1 ? 's' : ''})`
                  }
                </span>
                <div className="btn-glow"></div>
              </button>
            </div>
          </div>

          {/* Panel 3: Progress Chart ONLY (Mastery Tracking Enabled) */}
          <div className="luxe-panel bento-chart">
            <h3 style={{ color: 'black', marginBottom: '25px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={22} color="#3b82f6" />
              {t.progressDiagram || 'Progress Diagram'}
            </h3>

            {selectedCourse.componentList.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px', background: 'transparent', border: 'none', flex: 1 }}>
                <p style={{ color: '#64748b', textAlign: 'center' }}>{t.noChartComponents || 'Add components to see your progress chart.'}</p>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: '250px', width: '100%', marginBottom: '20px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        interval={0}
                        height={60}
                        tick={<CustomXAxisTick />}
                      />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} ticks={[0, 25, 50, 75, 100]} tickFormatter={(val) => `${val}%`} />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
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
    const completedCount = course.componentList.filter(c => c.progress >= 90).length;
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
        <div className="card-top" style={{ justifyContent: 'flex-end' }}>
          <button className="del-btn" onClick={(e) => deleteCourse(course.id, e)}>
            <Trash2 size={16} />
          </button>
        </div>

        <h3 className="card-title" style={{ color: 'black' }}>
          {course.name === 'Mathematics' ? t.mathSubject :
            course.name === 'Computer Science' ? (t.csSubject || 'Computer Science') :
              course.name === 'World History' ? (t.historySubject || 'World History') :
                course.name === 'Literature' ? (t.literatureSubject || 'Literature') :
                  course.name}
        </h3>

        <div className="card-stats">
          <div className="stat-label">
            <CheckCircle2 size={14} color="#3b82f6" />
            <span style={{ color: '#3b82f6' }}>{done} / {total} {t.componentsCompleted || 'Resources'}</span>
          </div>
          <span className="progress-text" style={{ color: '#3b82f6' }}>{prog}% {t.mastery || 'Mastery'}</span>
        </div>

        <div className="luxe-progress-bg">
          <div
            className="luxe-progress-fill"
            style={{
              width: `${prog}%`,
              background: `linear-gradient(90deg, #3b82f680, #3b82f6)`,
              boxShadow: `0 0 10px rgba(59, 130, 246, 0.4)`
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
          <h1 className="luxe-title">
            {dashboardLoading && <Loader2 size={24} className="spin-icon" style={{ display: 'inline', marginRight: '10px' }} />}
            {dashboardError ? (t.commandCenter || "Learning Command Center") : (dashboardUser ? `${t.welcomeBack}, ${dashboardUser.name}` : t.commandCenter)}
          </h1>
          <p className="luxe-subtitle">{t.manageCourses}</p>
        </div>

        <div className="header-actions">
          <div className="search-bar" style={{ position: 'relative', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder={t.searchPlaceholder || "Search courses..."}
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            {isSearchFocused && searchQuery && (
              <div className="search-suggestions" style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px',
                marginTop: '8px', padding: '8px 0', zIndex: 100,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                {filteredCourses.length > 0 ? filteredCourses.map(course => (
                  <div key={course.id} style={{
                    padding: '8px 16px', cursor: 'pointer', color: 'black', display: 'flex', alignItems: 'center', gap: '10px',
                    transition: '0.2s'
                  }} onClick={() => {
                    setSelectedCourseId(course.id);
                    setSearchQuery('');
                  }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ transform: 'scale(0.8)' }}>
                      {availableIcons[course.icon]}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{course.name}</span>
                  </div>
                )) : (
                  <div style={{ padding: '8px 16px', color: '#94a3b8', fontSize: '14px' }}>{t.noMatchesFound || 'No matches found...'}</div>
                )}
              </div>
            )}
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
            <h3 style={{ color: 'black' }}>{t.addCourse}</h3>
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
            <button type="submit" className="btn-luxe submit">{t.addCourse}</button>
          </div>
        </form>
      )}



      {/* Active Courses Section */}
      <div className="section-divider" style={{ marginTop: '30px' }}>
        <span className="divider-text" style={{ color: 'black' }}>{t.activeCourses || 'Active Courses'}</span>
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
            <span className="divider-text" style={{ color: 'black' }}>{t.completedCourses || 'Completed Courses'}</span>
            <div className="divider-line" style={{ background: 'rgba(0,0,0,0.1)' }}></div>
          </div>

          <div className="luxe-grid" style={{ opacity: 0.7 }}>
            {completedCourses.map(course => renderCourseCard(course))}
          </div>
        </>
      )}
    </div>
  );
}
