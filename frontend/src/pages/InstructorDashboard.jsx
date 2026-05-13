import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Activity, BarChart2, Plus, X, ArrowLeft, Upload, FileText, Loader2, Layers, Trash2, Check, Wand2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
export default function InstructorDashboard({ t, isRtl }) {
  const [activeView, setActiveView] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [newComponentName, setNewComponentName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingResId, setDeletingResId] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isSavingComponent, setIsSavingComponent] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    const res = await api.get('/courses/');
    if (res.ok) {
      setCourses(res.data);
      if (selectedCourse) {
        const updated = res.data.find(c => c.id === selectedCourse.id);
        if (updated) setSelectedCourse(updated);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    
    const payload = {
      name: newCourseName,
      icon: 'book',
      color: '#3b82f6'
    };
    
    const res = await api.post('/courses/', payload);
    if (res.ok) {
      fetchCourses();
      setShowAddCourseModal(false);
      setNewCourseName('');
    } else {
      alert("Failed to create course");
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !selectedCourse) return;
    
    const res = await api.post(`/courses/${selectedCourse.id}/groups`, { name: newGroupName });
    if (res.ok) {
      fetchCourses();
      setShowAddGroupModal(false);
      setNewGroupName('');
    } else {
      alert("Failed to create group");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourse) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("course_id", selectedCourse.id);

    try {
      const response = await api.post('/upload/', formData);
      if (response.ok) {
        await fetchCourses();
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
        await fetchCourses();
      } else {
        alert("Failed to delete resource: " + res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingResId(null);
    }
  };

  const deleteComponent = async (courseId, compId) => {
    // Delete locally first for immediate UI update
    setCourses(courses.map(course => {
      if (course.id !== courseId) return course;
      return {
        ...course,
        componentList: (course.componentList || []).filter(c => c.id !== compId)
      };
    }));
    if (selectedCourse && selectedCourse.id === courseId) {
       setSelectedCourse(prev => ({
         ...prev,
         componentList: (prev.componentList || []).filter(c => c.id !== compId)
       }));
    }

    // Then hit the backend
    try {
      await api.delete(`/knowledge/components/${compId}`);
    } catch (e) {
      console.error('Failed to delete component', e);
      // Optional: rollback on failure by fetching courses
    }
  };

  const handleSaveComponent = async (courseId, topicOverride = null) => {
    const topicToSave = topicOverride || newComponentName;
    if (topicToSave && topicToSave.trim()) {
      setIsSavingComponent(true);
      try {
        const isSuggestion = !!topicOverride;
        const res = await api.post(`/courses/${courseId}/add-manual-component`, { 
          topic: topicToSave.trim(),
          is_suggestion: isSuggestion
        });
        if (res.ok) {
          await fetchCourses();
          if (topicOverride) {
            setAiSuggestions(prev => prev.filter(s => s !== topicOverride));
          }
        } else if (res.status === 422) {
          const backendReason = res.message || '';
          const isNoResources = backendReason.toLowerCase().includes('no course resources') || backendReason.toLowerCase().includes('upload a document first');
          const errorMsg = isRtl
            ? (isNoResources
              ? 'لم يتم رفع أي مورد بعد. يرجى رفع ملف أولاً حتى يمكن التحقق من المواضيع.'
              : `الموضوع "${topicToSave}" غير مرتبط بالمصادر المرفوعة. أضف فقط مواضيع مغطاة في ملفاتك.`)
            : (isNoResources
              ? 'No resources uploaded yet. Please upload a file first so topics can be validated.'
              : `"${topicToSave}" was not found in your uploaded resources. Only add topics that are covered in your files.`);
          alert(errorMsg);
        } else {
          alert("Failed to add component: " + res.message);
        }
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        setIsSavingComponent(false);
      }
    }
    if (!topicOverride) {
      setNewComponentName('');
      setIsAddingComponent(false);
    }
  };

  const handleSuggestComponents = async () => {
    if (!selectedCourse) return;
    setIsSuggesting(true);
    try {
      const existingTopics = selectedCourse.componentList?.map(c => c.text) || [];
      const res = await api.post(`/courses/${selectedCourse.id}/suggest-components`, { existing_topics: existingTopics });
      if (res.ok && res.data.suggestions) {
        // Normalize: backend may return plain strings OR objects like {topic, rationale}
        const normalized = res.data.suggestions.map(s => (typeof s === 'string' ? s : s.topic || s.text || String(s)));
        setAiSuggestions(normalized);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const renderCoursesView = () => (
    <>
      <div className="command-header-premium" style={{ marginBottom: '0' }}>
        <div className="header-text-group">
          <h1 className="luxe-title">{t.instructorDashboardTitle || 'Instructor Dashboard'}</h1>
          <p className="luxe-subtitle">{t.instructorDashboardSub || 'Manage your courses and view student progress.'}</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ paddingTop: '20px', paddingBottom: '30px' }}>
        <div className="glass-panel" style={{ padding: '25px', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '20px', textAlign: 'left' }}>
          <div className="icon-wrapper" style={{ background: 'rgba(0,0,0,0.03)', padding: '15px' }}>
            <BookOpen size={32} color="#3b82f6" />
          </div>
          <div>
            <div className="metric-value" style={{ fontSize: '32px', marginBottom: '5px' }}>{courses.length}</div>
            <div style={{ color: '#94a3b8', fontSize: '15px' }}>{t.coursesTitle || 'My Courses'}</div>
          </div>
        </div>
      </div>

      <div className="luxe-panel" style={{ padding: '30px', color: '#64748b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#0f172a', margin: 0, fontSize: '18px' }}>{t.coursesTitle || 'My Courses'}</h3>
          <button className="nav-btn primary" onClick={() => setShowAddCourseModal(true)} style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Plus size={16} /> {t.createCourse || 'Create Course'}
          </button>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Loader2 size={48} style={{ margin: '0 auto 15px auto', opacity: 0.5, animation: 'spinCircle 1s linear infinite' }} />
          </div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <BarChart2 size={48} style={{ margin: '0 auto 15px auto', opacity: 0.5 }} />
            <h4 style={{ color: '#0f172a', marginBottom: '10px' }}>{t.noCoursesYetTitle || 'No Courses Created'}</h4>
            <p>{t.noCoursesYetSub || 'Start creating your educational content.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {courses.map(course => (
              <div 
                key={course.id} 
                onClick={() => { setSelectedCourse(course); setActiveView('courseDetails'); }}
                style={{ padding: '25px', background: 'rgba(59, 130, 246, 0.03)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)', cursor: 'pointer', transition: 'all 0.2s', textAlign: isRtl ? 'right' : 'left' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <BookOpen size={24} />
                  </div>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>{course.name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#64748b' }}>
                  <span>{(course.groups || []).length} {t.groupsTitle || 'Groups'}</span>
                  <span>{(course.resourceList || []).length} {t.resourcesLearningAssets || 'Files'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddCourseModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="luxe-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px' }} dir={isRtl ? 'rtl' : 'ltr'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{t.createCourse || 'Create New Course'}</h3>
              <button onClick={() => setShowAddCourseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddCourse} style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                  {t.courseName || 'Course Name'}
                </label>
                <input
                  type="text"
                  className="input-luxe"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="Course Name"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddCourseModal(false)} className="nav-btn" style={{ background: 'transparent', color: '#64748b' }}>
                  {t.cancelTitle || 'Cancel'}
                </button>
                <button type="submit" className="nav-btn primary" disabled={!newCourseName.trim()}>
                  {t.createCourse || 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  const renderCourseDetails = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
        <button onClick={() => { setActiveView('courses'); setSelectedCourse(null); }} className="btn-luxe" style={{ background: 'rgba(0,0,0,0.05)', color: 'black', border: 'none', padding: '8px 16px' }}>
          <ArrowLeft size={18} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} /> {t.coursesTitle || 'Courses'}
        </button>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px' }}>{selectedCourse?.name}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px', marginBottom: '25px' }}>
        {/* Analytics Section */}
        <div className="luxe-panel" style={{ padding: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#10b981" /> {t.avgStudentMastery || 'Student Graph Metrics'}
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedCourse?.metrics || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="mastery" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
        {/* Files Section */}
        <div className="luxe-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#8b5cf6" /> {t.resourcesLearningAssets || 'Files'}
            </h3>
            <label className="nav-btn primary" style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', gap: '6px', alignItems: 'center', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
              {isUploading ? <Loader2 size={16} className="spin-icon" style={{ animation: 'spinCircle 1s linear infinite' }} /> : <Upload size={16} />} 
              {isUploading ? (t.addingResource || 'Adding...') : (t.addResources || 'Upload File')}
              <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.ppt,.pptx" disabled={isUploading} />
            </label>
          </div>
          
          {!(selectedCourse?.resourceList?.length) ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
              <FileText size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>{t.noResourcesYet || 'No files uploaded.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedCourse?.resourceList?.map(file => (
                <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', overflow: 'hidden' }}>
                  <FileText size={20} color="#8b5cf6" style={{ flexShrink: 0 }} />
                  <span title={file.text} style={{ color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{file.text}</span>
                  <button
                    className="del-btn"
                    onClick={() => deleteResource(selectedCourse.id, file.id)}
                    style={{ padding: '4px', opacity: 0.6, border: 'none', background: 'none' }}
                    disabled={deletingResId === file.id}
                  >
                    {deletingResId === file.id ? <Loader2 size={16} className="spin-icon" color="#ef4444" style={{ animation: 'spinCircle 1s linear infinite' }} /> : <Trash2 size={16} color="#64748b" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Components Section */}
        <div className="luxe-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} color="#3b82f6" /> {t.components || 'Components'}
            </h3>
          </div>

          <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', maxHeight: '300px' }}>
            {!(selectedCourse?.componentList?.length) ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                <Layers size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>{t.noComponentsYet || 'No components extracted yet.'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedCourse.componentList.map(comp => (
                  <div
                    key={comp.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(0,0,0,0.02)',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: '500', color: '#1e3a8a' }}>{comp.text}</span>
                    <button
                      className="del-btn"
                      onClick={(e) => { e.stopPropagation(); deleteComponent(selectedCourse.id, comp.id); }}
                      style={{ padding: '4px', opacity: 0.6, border: 'none', background: 'none' }}
                    >
                      <Trash2 size={16} color="#64748b" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAddingComponent ? (
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <input
                type="text"
                value={newComponentName}
                onChange={(e) => setNewComponentName(e.target.value)}
                placeholder={t.addComponent || 'Component name...'}
                className="input-luxe"
                autoFocus
                style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #3b82f6', width: '100%', marginBottom: '0', padding: '10px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSavingComponent) handleSaveComponent(selectedCourse.id);
                  if (e.key === 'Escape') { setIsAddingComponent(false); setNewComponentName(''); setAiSuggestions([]); }
                }}
                disabled={isSavingComponent}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-luxe primary hover-lift" onClick={() => handleSaveComponent(selectedCourse.id)} disabled={isSavingComponent} style={{ padding: '8px', flex: 1, justifyContent: 'center' }}>
                  {isSavingComponent ? <Loader2 size={16} className="spin-icon" style={{ animation: 'spinCircle 1s linear infinite' }} /> : (t.save || 'Save')}
                </button>
                <button className="btn-luxe hover-lift" onClick={() => { setIsAddingComponent(false); setNewComponentName(''); setAiSuggestions([]); }} disabled={isSavingComponent} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '8px', flex: 1, justifyContent: 'center' }}>{t.cancel || 'Cancel'}</button>
              </div>
            </div>
          ) : (
            <button className="btn-luxe hover-lift" onClick={() => { setIsAddingComponent(true); handleSuggestComponents(); }} style={{ background: 'rgba(0, 0, 0, 0.03)', border: '1px dashed rgba(0, 0, 0, 0.15)', color: '#1e293b', marginTop: '15px', width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> <span>{t.addComponent || 'Add Component'}</span>
            </button>
          )}

          {(isSuggesting || aiSuggestions.length > 0) && isAddingComponent && (
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '15px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isSuggesting ? <Loader2 size={14} className="spin-icon" /> : <Wand2 size={14} />} 
                  {isSuggesting ? (isRtl ? 'جاري اقتراح مواضيع...' : 'Suggesting topics...') : (isRtl ? 'مواضيع مقترحة' : 'AI Suggestions')}
                </h4>
              </div>
              {!isSuggesting && aiSuggestions.map((sug, i) => (
                <button key={i} onClick={() => handleSaveComponent(selectedCourse.id, sug)} disabled={isSavingComponent} className="btn-luxe hover-lift" style={{ textAlign: 'left', background: '#ffffff', color: '#6d28d9', padding: '12px 15px', border: '1px solid #c4b5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{sug}</span>
                  <Plus size={16} color="#6d28d9" style={{ flexShrink: 0, marginLeft: '10px' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Groups Section */}
        <div className="luxe-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#f59e0b" /> {t.groupsTitle || 'Student Groups'}
            </h3>
            <button className="nav-btn primary" onClick={() => setShowAddGroupModal(true)} style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Plus size={16} /> {t.createGroup || 'Create Group'}
            </button>
          </div>
          
          {!(selectedCourse?.groups?.length) ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
              <Users size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>{t.noGroupsYet || 'No groups created.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedCourse?.groups?.map(group => (
                <div key={group.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                  <span style={{ color: '#1e293b', fontWeight: '500' }}>{group.name}</span>
                  <span style={{ background: '#e0e7ff', color: '#3b82f6', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    {group.studentCount} {t.students || 'Students'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddGroupModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="luxe-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px' }} dir={isRtl ? 'rtl' : 'ltr'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{t.createGroup || 'Create New Group'}</h3>
              <button onClick={() => setShowAddGroupModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddGroup} style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                  {t.groupName || 'Group Name'}
                </label>
                <input
                  type="text"
                  className="input-luxe"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t.groupNamePlaceholder || 'Group Name'}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddGroupModal(false)} className="nav-btn" style={{ background: 'transparent', color: '#64748b' }}>
                  {t.cancelTitle || 'Cancel'}
                </button>
                <button type="submit" className="nav-btn primary" disabled={!newGroupName.trim()}>
                  {t.createGroup || 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="dashboard-section command-center" style={{ maxWidth: '1200px' }}>
      {activeView === 'courses' ? renderCoursesView() : renderCourseDetails()}
    </div>
  );
}
