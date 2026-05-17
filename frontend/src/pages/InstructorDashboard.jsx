import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, ArrowLeft, BookOpen, Check, ClipboardList, Copy, FileText, Layers, Loader2, Lock, Mail, MessageSquare, Plus, QrCode, Send, Trash2, Upload, UserPlus, Users, Wand2, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, openResource } from '../services/api';

const instructorRoles = new Set(['teacher', 'admin', 'instructor']);

function senderRoleClass(message) {
  return instructorRoles.has(message.sender?.role) ? 'instructor' : 'student';
}

function ChatPanel({ title, icon, messages, value, onChange, setValue, onSend, disabled = false, emptyText, disabledText, placeholder }) {
  const handleChange = onChange || setValue;

  return (
    <div className="dashboard-tool-card">
      <h4 style={{ margin: '0 0 10px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon}{title}</h4>
      <div style={{ minHeight: '170px', maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        {messages.length === 0 ? (
          <p style={{ color: '#94a3b8', margin: 0 }}>{disabled ? disabledText : emptyText}</p>
        ) : messages.map(message => (
          <div key={message.id} style={{ padding: '9px 10px', borderRadius: '10px', background: '#f8fafc', color: '#1e293b' }}>
            <div className={`group-chat-sender ${senderRoleClass(message)}`}>{message.sender?.name || title}</div>
            <div style={{ fontSize: '14px', lineHeight: 1.45 }}>{message.content}</div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!disabled) onSend(); }} style={{ display: 'flex', gap: '8px' }}>
        <input disabled={disabled} value={value} onChange={(e) => handleChange?.(e.target.value)} placeholder={placeholder} autoComplete="off" style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px' }} />
        <button type="submit" disabled={disabled} className="btn-luxe primary" style={{ padding: '10px 12px' }}><Send size={16} /></button>
      </form>
    </div>
  );
}

export default function InstructorDashboard({ t, isRtl }) {
  const tt = (key, fallback) => t?.[key] || fallback;
  const [activeView, setActiveView] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGroupResourceUploading, setIsGroupResourceUploading] = useState(false);
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [newComponentName, setNewComponentName] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isSavingComponent, setIsSavingComponent] = useState(false);
  const [publicMessages, setPublicMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [publicMessage, setPublicMessage] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentEmailError, setStudentEmailError] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizComponentIds, setQuizComponentIds] = useState([]);
  const [isAssigningQuiz, setIsAssigningQuiz] = useState(false);
  const [courseQuizTitle, setCourseQuizTitle] = useState('');
  const [courseQuizComponentIds, setCourseQuizComponentIds] = useState([]);
  const [showCourseQuizGroupsModal, setShowCourseQuizGroupsModal] = useState(false);
  const [courseQuizGroupIds, setCourseQuizGroupIds] = useState([]);
  const [isAssigningCourseQuiz, setIsAssigningCourseQuiz] = useState(false);
  const [courseQuizError, setCourseQuizError] = useState('');
  const [courseQuizSuccess, setCourseQuizSuccess] = useState('');
  const selectedGroupRef = useRef(null);
  const selectedStudentIdRef = useRef(null);

  const fetchCourses = async () => {
    setLoading(true);
    const res = await api.get('/courses/');
    if (res.ok) {
      setCourses(res.data);
      if (selectedCourse) {
        const updated = res.data.find(course => course.id === selectedCourse.id);
        if (updated) setSelectedCourse(updated);
      }
    }
    setLoading(false);
  };

  const loadGroupDetail = async (groupId, preferredStudentId = selectedStudentId) => {
    const res = await api.get(`/groups/${groupId}`);
    if (!res.ok) return false;
    setSelectedGroup(res.data);
    selectedGroupRef.current = res.data;
    setQuizTitle(`${res.data.name} ${tt('quizLabel', 'Quiz')}`);
    setQuizComponentIds([]);
    const publicRes = await api.get(`/groups/${groupId}/messages/public`);
    if (publicRes.ok) setPublicMessages(publicRes.data);
    const memberIds = (res.data.members || []).map(member => member.student?.id).filter(Boolean);
    const preferredId = preferredStudentId ? Number(preferredStudentId) : null;
    const studentId = preferredId && memberIds.includes(preferredId) ? preferredId : (memberIds[0] || null);
    setSelectedStudentId(studentId);
    selectedStudentIdRef.current = studentId;
    if (studentId) {
      const privateRes = await api.get(`/groups/${groupId}/messages/private/${studentId}`);
      if (privateRes.ok) setPrivateMessages(privateRes.data);
      else setPrivateMessages([]);
    } else {
      setPrivateMessages([]);
    }
    return true;
  };

  const openGroupDetail = async (groupId, preferredStudentId = selectedStudentId) => {
    const loaded = await loadGroupDetail(groupId, preferredStudentId);
    if (loaded) setActiveView('groupDetails');
  };

  useEffect(() => {
    fetchCourses();
    const socket = new WebSocket(api.wsUrl('/groups/ws'));
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const active = selectedGroupRef.current;
      if (payload.type === 'group_public_message' && active?.id === payload.groupId) {
        setPublicMessages(prev => prev.some(msg => msg.id === payload.message.id) ? prev : [...prev, payload.message]);
      }
      if (payload.type === 'group_private_message' && active?.id === payload.groupId) {
        const activeStudentId = selectedStudentIdRef.current ? Number(selectedStudentIdRef.current) : null;
        if (!payload.studentId || !activeStudentId || Number(payload.studentId) === activeStudentId) {
          setPrivateMessages(prev => prev.some(msg => msg.id === payload.message.id) ? prev : [...prev, payload.message]);
        }
      }
      if (['group_member_joined', 'group_member_added', 'group_member_removed', 'group_resource_created', 'group_progress_updated', 'group_quiz_assigned'].includes(payload.type)) {
        fetchCourses();
        if (active?.id === payload.groupId) loadGroupDetail(active.id, selectedStudentIdRef.current);
      }
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setCourseQuizTitle(`${selectedCourse.name} ${tt('quizLabel', 'Quiz')}`);
    setCourseQuizComponentIds([]);
    setCourseQuizGroupIds([]);
    setCourseQuizError('');
    setCourseQuizSuccess('');
  }, [selectedCourse?.id]);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    const res = await api.post('/courses/', { name: newCourseName.trim(), icon: 'book', color: '#3b82f6' });
    if (res.ok) {
      setNewCourseName('');
      setShowAddCourseModal(false);
      await fetchCourses();
    } else {
      alert(res.message || tt('failedCreateCourse', 'Failed to create course'));
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !selectedCourse) return;
    const res = await api.post(`/courses/${selectedCourse.id}/groups`, { name: newGroupName.trim() });
    if (res.ok) {
      setNewGroupName('');
      setShowAddGroupModal(false);
      await fetchCourses();
      await openGroupDetail(res.data.id);
    } else {
      alert(res.message || tt('failedCreateGroup', 'Failed to create group'));
    }
  };

  const handleAddStudentToGroup = async (e) => {
    e.preventDefault();
    const email = studentEmail.trim();
    if (!selectedGroup || !email || isAddingStudent) return;
    setIsAddingStudent(true);
    setStudentEmailError('');
    const res = await api.post(`/groups/${selectedGroup.id}/members`, { email });
    setIsAddingStudent(false);
    if (res.ok) {
      setStudentEmail('');
      setSelectedGroup(res.data);
      selectedGroupRef.current = res.data;
      await fetchCourses();
      await loadGroupDetail(res.data.id, selectedStudentIdRef.current);
    } else {
      setStudentEmailError(res.message || "The student doesn't exist");
    }
  };

  const removeStudentFromGroup = async (studentId) => {
    if (!selectedGroup || !studentId || removingStudentId) return;
    const confirmed = window.confirm(tt('removeStudentConfirm', 'Remove this student from the group?'));
    if (!confirmed) return;
    setRemovingStudentId(studentId);
    const preferredStudentId = Number(selectedStudentId) === Number(studentId) ? null : selectedStudentId;
    const res = await api.delete(`/groups/${selectedGroup.id}/members/${studentId}`);
    setRemovingStudentId(null);
    if (res.ok) {
      const nextMemberIds = (res.data.members || []).map(member => member.student?.id).filter(Boolean);
      const nextStudentId = preferredStudentId && nextMemberIds.includes(Number(preferredStudentId))
        ? Number(preferredStudentId)
        : (nextMemberIds[0] || null);
      setSelectedGroup(res.data);
      selectedGroupRef.current = res.data;
      selectedStudentIdRef.current = nextStudentId;
      setSelectedStudentId(nextStudentId);
      if (!nextStudentId) setPrivateMessages([]);
      await fetchCourses();
      await loadGroupDetail(res.data.id, nextStudentId);
    } else {
      alert(res.message || tt('failedRemoveStudent', 'Failed to remove student'));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourse) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', selectedCourse.id);
    const res = await api.post('/upload/', formData);
    if (!res.ok) alert(res.message || tt('uploadFailed', 'Upload failed'));
    await fetchCourses();
    if (selectedGroup) await loadGroupDetail(selectedGroup.id, selectedStudentId);
    setIsUploading(false);
    e.target.value = '';
  };

  const handleGroupResourceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;
    setIsGroupResourceUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/groups/${selectedGroup.id}/resources`, formData);
    if (!res.ok) alert(res.message || tt('groupUploadFailed', 'Group upload failed'));
    await loadGroupDetail(selectedGroup.id, selectedStudentId);
    await fetchCourses();
    setIsGroupResourceUploading(false);
    e.target.value = '';
  };

  const handleSaveComponent = async (courseId, topicOverride = null) => {
    const topic = (topicOverride || newComponentName).trim();
    if (!topic) return;
    setIsSavingComponent(true);
    const res = await api.post(`/courses/${courseId}/add-manual-component`, {
      topic,
      is_suggestion: !!topicOverride,
    });
    setIsSavingComponent(false);
    if (res.ok) {
      setNewComponentName('');
      setIsAddingComponent(false);
      setAiSuggestions(prev => prev.filter(item => item !== topicOverride));
      await fetchCourses();
    } else {
      alert(res.message || tt('failedAddComponent', 'Failed to add component'));
    }
  };

  const handleSuggestComponents = async () => {
    if (!selectedCourse) return;
    setIsSuggesting(true);
    const existing_topics = selectedCourse.componentList?.map(component => component.text) || [];
    const res = await api.post(`/courses/${selectedCourse.id}/suggest-components`, { existing_topics });
    if (res.ok && res.data.suggestions) {
      setAiSuggestions(res.data.suggestions.map(item => (typeof item === 'string' ? item : item.topic || item.text || String(item))));
    }
    setIsSuggesting(false);
  };

  const sendPublicMessage = async () => {
    if (!selectedGroup || !publicMessage.trim()) return;
    const res = await api.post(`/groups/${selectedGroup.id}/messages/public`, { content: publicMessage.trim() });
    if (res.ok) {
      setPublicMessage('');
      setPublicMessages(prev => prev.some(msg => msg.id === res.data.id) ? prev : [...prev, res.data]);
    }
  };

  const sendPrivateMessage = async () => {
    if (!selectedGroup || !selectedStudentId || !privateMessage.trim()) return;
    const res = await api.post(`/groups/${selectedGroup.id}/messages/private`, {
      recipient_id: selectedStudentId,
      content: privateMessage.trim(),
    });
    if (res.ok) {
      setPrivateMessage('');
      setPrivateMessages(prev => prev.some(msg => msg.id === res.data.id) ? prev : [...prev, res.data]);
    }
  };

  const loadPrivateConversation = async (studentId) => {
    const normalizedStudentId = Number(studentId);
    if (!normalizedStudentId) return;
    setSelectedStudentId(normalizedStudentId);
    selectedStudentIdRef.current = normalizedStudentId;
    if (!selectedGroup) return;
    const res = await api.get(`/groups/${selectedGroup.id}/messages/private/${normalizedStudentId}`);
    if (res.ok) setPrivateMessages(res.data);
    else setPrivateMessages([]);
  };

  const deleteComponent = async (courseId, compId) => {
    await api.delete(`/knowledge/components/${compId}`);
    setCourseQuizComponentIds(prev => prev.filter(id => id !== compId));
    setQuizComponentIds(prev => prev.filter(id => id !== compId));
    await fetchCourses();
  };

  const copyJoinCode = async () => {
    if (!selectedGroup?.joinCode) return;
    await navigator.clipboard?.writeText(selectedGroup.joinCode);
  };

  const toggleQuizComponent = (componentId) => {
    setQuizComponentIds(prev => (
      prev.includes(componentId) ? prev.filter(id => id !== componentId) : [...prev, componentId]
    ));
  };

  const selectAllQuizComponents = () => {
    const ids = selectedCourse?.componentList?.map(component => component.id) || [];
    setQuizComponentIds(ids);
  };

  const assignQuizToGroup = async () => {
    if (!selectedGroup || !selectedCourse) return;
    const includeAll = quizComponentIds.length === 0 || quizComponentIds.length === (selectedCourse.componentList || []).length;
    setIsAssigningQuiz(true);
    const res = await api.post(`/groups/${selectedGroup.id}/quizzes`, {
      title: quizTitle.trim() || `${selectedGroup.name} ${tt('quizLabel', 'Quiz')}`,
      component_ids: quizComponentIds,
      include_all: includeAll,
    });
    setIsAssigningQuiz(false);
    if (res.ok) {
      setQuizTitle(`${selectedGroup.name} ${tt('quizLabel', 'Quiz')}`);
      setQuizComponentIds([]);
      await loadGroupDetail(selectedGroup.id, selectedStudentId);
    } else {
      alert(res.message || tt('failedAssignQuiz', 'Failed to assign quiz'));
    }
  };

  const toggleCourseQuizComponent = (componentId) => {
    setCourseQuizError('');
    setCourseQuizSuccess('');
    setCourseQuizComponentIds(prev => (
      prev.includes(componentId) ? prev.filter(id => id !== componentId) : [...prev, componentId]
    ));
  };

  const selectAllCourseQuizComponents = () => {
    const ids = selectedCourse?.componentList?.map(component => component.id) || [];
    setCourseQuizComponentIds(ids);
    setCourseQuizError('');
    setCourseQuizSuccess('');
  };

  const clearCourseQuizComponents = () => {
    setCourseQuizComponentIds([]);
    setCourseQuizError('');
    setCourseQuizSuccess('');
  };

  const openCourseQuizGroupsModal = () => {
    const availableIds = selectedCourse?.componentList?.map(component => component.id) || [];
    const selectedIds = courseQuizComponentIds.filter(id => availableIds.includes(id));
    if (availableIds.length === 0) {
      setCourseQuizError(tt('noComponentsUploadFirst', 'Upload course files to generate components first.'));
      return;
    }
    if (selectedIds.length === 0) {
      setCourseQuizError(tt('selectComponentsFirst', 'Select components or All first.'));
      return;
    }
    if (!(selectedCourse?.groups || []).length) {
      setCourseQuizError(tt('createGroupFirst', 'Create a group first.'));
      return;
    }
    setCourseQuizComponentIds(selectedIds);
    setCourseQuizGroupIds([]);
    setCourseQuizError('');
    setCourseQuizSuccess('');
    setShowCourseQuizGroupsModal(true);
  };

  const toggleCourseQuizGroup = (groupId) => {
    setCourseQuizError('');
    setCourseQuizGroupIds(prev => (
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    ));
  };

  const selectAllCourseQuizGroups = () => {
    setCourseQuizGroupIds((selectedCourse?.groups || []).map(group => group.id));
    setCourseQuizError('');
  };

  const assignCourseQuizToGroups = async () => {
    if (!selectedCourse || isAssigningCourseQuiz) return;
    const availableComponentIds = (selectedCourse.componentList || []).map(component => component.id);
    const selectedIds = courseQuizComponentIds.filter(id => availableComponentIds.includes(id));
    const targetGroupIds = courseQuizGroupIds.filter(groupId => (selectedCourse.groups || []).some(group => group.id === groupId));

    if (selectedIds.length === 0) {
      setCourseQuizError(tt('selectComponentsFirst', 'Select components or All first.'));
      return;
    }
    if (targetGroupIds.length === 0) {
      setCourseQuizError(tt('selectGroupsFirst', 'Select at least one group.'));
      return;
    }

    const includeAll = selectedIds.length === availableComponentIds.length;
    const title = courseQuizTitle.trim() || `${selectedCourse.name} ${tt('quizLabel', 'Quiz')}`;
    setIsAssigningCourseQuiz(true);
    setCourseQuizError('');

    const results = await Promise.all(targetGroupIds.map(groupId => (
      api.post(`/groups/${groupId}/quizzes`, {
        title,
        component_ids: selectedIds,
        include_all: includeAll,
      })
    )));

    setIsAssigningCourseQuiz(false);
    const failed = results.filter(result => !result.ok);
    if (failed.length) {
      setCourseQuizError(failed[0].message || tt('failedAssignQuiz', 'Failed to assign quiz'));
      return;
    }

    setShowCourseQuizGroupsModal(false);
    setCourseQuizGroupIds([]);
    setCourseQuizSuccess(`${tt('assignedTo', 'Assigned to')} ${targetGroupIds.length} ${targetGroupIds.length === 1 ? tt('groupSingle', 'group') : tt('groups', 'groups')}.`);
    await fetchCourses();
    if (selectedGroup && targetGroupIds.includes(selectedGroup.id)) {
      await loadGroupDetail(selectedGroup.id, selectedStudentId);
    }
  };

  const renderCourseQuizGroupsModal = () => (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.58)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '18px' }}>
      <div className="luxe-panel course-quiz-groups-modal" style={{ width: '100%', maxWidth: '500px', padding: '24px', color: '#0f172a' }} dir={isRtl ? 'rtl' : 'ltr'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={20} color="#2563eb" /> {tt('assignQuizToGroups', 'Assign Quiz to Groups')}</h3>
          <button onClick={() => setShowCourseQuizGroupsModal(false)} style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#64748b' }} aria-label={tt('cancelTitle', 'Cancel')}><X size={18} /></button>
        </div>

        <input
          value={courseQuizTitle}
          onChange={(event) => setCourseQuizTitle(event.target.value)}
          placeholder={tt('quizTitle', 'Quiz title')}
          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 800 }}>{courseQuizComponentIds.length} {tt('selectedCount', 'selected')}</span>
          <button type="button" onClick={selectAllCourseQuizGroups} style={{ background: 'transparent', border: 'none', color: '#2563eb', fontWeight: 900, cursor: 'pointer' }}>{tt('allGroups', 'All groups')}</button>
        </div>

        <div style={{ display: 'grid', gap: '8px', maxHeight: '260px', overflowY: 'auto', marginBottom: '14px' }}>
          {(selectedCourse?.groups || []).map(group => {
            const selected = courseQuizGroupIds.includes(group.id);
            return (
              <label key={group.id} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) auto', alignItems: 'center', gap: '10px', padding: '11px 12px', borderRadius: '12px', border: selected ? '1px solid #2563eb' : '1px solid #e2e8f0', background: selected ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                <input type="checkbox" checked={selected} onChange={() => toggleCourseQuizGroup(group.id)} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', color: '#0f172a', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>{group.studentCount} {t.students || 'students'}</span>
                </span>
                {selected && <Check size={16} color="#2563eb" />}
              </label>
            );
          })}
        </div>

        {courseQuizError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>
            <AlertCircle size={15} /> {courseQuizError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setShowCourseQuizGroupsModal(false)} className="btn-luxe" style={{ padding: '10px 14px' }}>{tt('cancelTitle', 'Cancel')}</button>
          <button type="button" onClick={assignCourseQuizToGroups} disabled={isAssigningCourseQuiz || courseQuizGroupIds.length === 0} className="btn-luxe primary" style={{ padding: '10px 14px' }}>
            {isAssigningCourseQuiz ? <Loader2 size={16} className="spin-icon" /> : <ClipboardList size={16} />} {tt('assignQuiz', 'Assign Quiz')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderModal = (title, value, setValue, onSubmit, onClose, placeholder, submitLabel) => (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="luxe-panel" style={{ width: '100%', maxWidth: '430px', padding: '30px' }} dir={isRtl ? 'rtl' : 'ltr'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="input-luxe" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px', marginBottom: '20px' }} autoFocus required />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="nav-btn" style={{ background: 'transparent', color: '#64748b' }}>{t.cancelTitle || 'Cancel'}</button>
            <button type="submit" className="nav-btn primary" disabled={!value.trim()}>{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderCoursesView = () => (
    <>
      <div className="command-header-premium dashboard-hero-panel" style={{ marginBottom: '0' }}>
        <div className="header-text-group">
          <h1 className="luxe-title">{t.instructorDashboardTitle || 'Instructor Dashboard'}</h1>
          <p className="luxe-subtitle">{t.instructorDashboardSub || 'Manage courses, groups, students, resources, and messages.'}</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ paddingTop: '20px', paddingBottom: '30px' }}>
        <div className="glass-panel" style={{ padding: '25px', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '20px', textAlign: 'left' }}>
          <BookOpen size={32} color="#3b82f6" />
          <div>
            <div className="metric-value" style={{ fontSize: '32px', marginBottom: '5px' }}>{courses.length}</div>
            <div style={{ color: '#94a3b8', fontSize: '15px' }}>{t.coursesTitle || 'My Courses'}</div>
          </div>
        </div>
      </div>

      <div className="luxe-panel dashboard-surface" style={{ padding: '30px', color: '#64748b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#0f172a', margin: 0, fontSize: '18px' }}>{t.coursesTitle || 'My Courses'}</h3>
          <button className="nav-btn primary" onClick={() => setShowAddCourseModal(true)} style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', gap: '6px', alignItems: 'center' }}><Plus size={16} /> {t.createCourse || 'Create Course'}</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Loader2 size={42} className="spin-icon" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {courses.map(course => (
              <button key={course.id} className="dashboard-course-tile" onClick={() => { setSelectedCourse(course); setSelectedGroup(null); selectedGroupRef.current = null; setActiveView('courseDetails'); }} style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <h3 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '18px' }}>{course.name}</h3>
                <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#64748b' }}>
                  <span>{(course.groups || []).length} {tt('groups', 'groups')}</span>
                  <span>{(course.resourceList || []).length} {tt('files', 'files')}</span>
                </div>
              </button>
            ))}
            {courses.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <BookOpen size={42} color="#64748b" />
                <p>{t.noCoursesYetSub || 'Start creating your educational content to see analytics here.'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  const renderGroupDetail = () => {
    if (!selectedGroup) return null;
    const analyticsData = selectedGroup.members?.map(member => ({
      name: member.student?.name || 'Student',
      mastery: member.averageMastery,
    })) || [];
    const selectedStudent = selectedGroup.members?.find(member => member.student?.id === selectedStudentId) || null;
    const selectedStudentComponents = selectedStudent?.components || [];
    return (
      <div className="luxe-panel dashboard-surface instructor-group-detail" style={{ padding: '30px', marginTop: '25px', color: '#0f172a' }}>
        <div className="instructor-group-page-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '22px', paddingBottom: '18px', borderBottom: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setActiveView(selectedCourse ? 'courseDetails' : 'courses')}
            className="btn-luxe"
            style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', padding: '8px 14px' }}
          >
            <ArrowLeft size={18} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} /> {selectedCourse?.name || tt('groups', 'Groups')}
          </button>
          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase' }}>{tt('groupWorkspace', 'Group Workspace')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap', marginBottom: '22px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={22} color="#f59e0b" /> {selectedGroup.name}</h3>
            <p style={{ margin: 0, color: '#64748b' }}>{tt('averageMastery', 'Average mastery')}: <strong>{selectedGroup.averageMastery}%</strong> · {selectedGroup.studentCount} {t.students || 'students'}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ padding: '8px 14px', borderRadius: '10px', background: '#f1f5f9', color: '#0f172a', fontWeight: 900, fontSize: '18px', letterSpacing: '0.18em' }}>{selectedGroup.joinCode}</code>
            <button onClick={copyJoinCode} className="btn-luxe" title={tt('copyCode', 'Copy join code')} style={{ padding: '8px 10px', background: '#f8fafc', color: '#334155' }}><Copy size={16} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="dashboard-tool-card">
              <h4 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}><QrCode size={18} color="#3b82f6" /> {tt('joinQrCode', 'Join QR Code')}</h4>
              <img src={selectedGroup.barcodeDataUrl} alt={`QR code for ${selectedGroup.joinCode}`} style={{ width: '100%', maxWidth: '260px', aspectRatio: '1 / 1', display: 'block', margin: '0 auto', imageRendering: 'pixelated' }} />
            </div>

            <div className="dashboard-tool-card">
              <h4 style={{ margin: '0 0 10px' }}>{tt('members', 'Members')}</h4>
              <form onSubmit={handleAddStudentToGroup} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '8px', marginBottom: '10px' }}>
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <Mail size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(event) => { setStudentEmail(event.target.value); setStudentEmailError(''); }}
                    placeholder={tt('studentEmailPlaceholder', 'Student email')}
                    autoComplete="off"
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px 10px 34px', minWidth: 0 }}
                  />
                </div>
                <button type="submit" disabled={isAddingStudent || !studentEmail.trim()} className="btn-luxe primary" style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  {isAddingStudent ? <Loader2 size={16} className="spin-icon" /> : <UserPlus size={16} />} {tt('addStudent', 'Add')}
                </button>
              </form>
              {studentEmailError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>
                  <AlertCircle size={15} /> {studentEmailError}
                </div>
              )}
              {selectedGroup.members?.length ? selectedGroup.members.map(member => (
                <div key={member.student.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 38px', gap: '8px', alignItems: 'stretch', marginBottom: '8px' }}>
                  <button type="button" onClick={() => loadPrivateConversation(member.student.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: selectedStudentId === member.student.id ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', minWidth: 0, textAlign: 'left' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.student.name}</span>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.student.email}</span>
                    </span>
                    <span style={{ color: '#3b82f6', fontWeight: 900, whiteSpace: 'nowrap' }}>{member.averageMastery}%</span>
                  </button>
                  <button type="button" onClick={() => removeStudentFromGroup(member.student.id)} disabled={removingStudentId === member.student.id} title={tt('removeStudent', 'Remove student')} style={{ border: '1px solid #fecaca', borderRadius: '10px', background: '#fff', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {removingStudentId === member.student.id ? <Loader2 size={16} className="spin-icon" /> : <Trash2 size={16} />}
                  </button>
                </div>
              )) : <p style={{ color: '#94a3b8', margin: 0 }}>{tt('noStudentsJoined', 'No students have joined yet.')}</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="dashboard-tool-card" style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} color="#10b981" /> {tt('groupAnalytics', 'Group Analytics')}</h4>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="mastery" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-tool-card">
              <h4 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} color="#8b5cf6" /> {tt('sharedResources', 'Shared Resources')}</h4>
              {selectedGroup.resources?.length ? selectedGroup.resources.map(resource => (
                <button key={`${resource.documentId || resource.id}`} type="button" onClick={() => openResource(resource)} style={{ display: 'block', color: '#2563eb', fontWeight: 700, padding: '8px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: isRtl ? 'right' : 'left' }}>{resource.text}</button>
              )) : <p style={{ color: '#94a3b8', margin: 0 }}>{tt('uploadFilesWillAppear', 'Upload course files above; they will appear here automatically.')}</p>}
            </div>

            <div className="dashboard-tool-card" style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={18} color="#f59e0b" /> {tt('assignAiQuiz', 'Assign AI Quiz')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', alignItems: 'start' }}>
                <div>
                  <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder={tt('quizTitle', 'Quiz title')} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px' }} />
                  <button onClick={assignQuizToGroup} disabled={isAssigningQuiz || (selectedCourse?.componentList || []).length === 0} className="btn-luxe primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 12px' }}>
                    {isAssigningQuiz ? <Loader2 size={16} className="spin-icon" /> : <ClipboardList size={16} />} {tt('assignQuiz', 'Assign Quiz')}
                  </button>
                  <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '12px' }}>{quizComponentIds.length === 0 ? tt('defaultAllComponents', 'Default: all components') : `${quizComponentIds.length} ${tt('selectedCount', 'selected')}`}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 800 }}>{tt('chooseComponents', 'Choose components')}</span>
                    <button onClick={selectAllQuizComponents} style={{ background: 'transparent', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer' }}>{tt('all', 'All')}</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                    {(selectedCourse?.componentList || []).length ? selectedCourse.componentList.map(component => {
                      const selected = quizComponentIds.includes(component.id);
                      return (
                        <button key={component.id} onClick={() => toggleQuizComponent(component.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '999px', border: selected ? '1px solid #2563eb' : '1px solid #e2e8f0', background: selected ? '#eff6ff' : '#fff', color: selected ? '#1d4ed8' : '#334155', fontWeight: 800, cursor: 'pointer' }}>
                          {selected && <Check size={14} />} {component.text}
                        </button>
                      );
                    }) : <p style={{ color: '#94a3b8', margin: 0 }}>{tt('noComponentsUploadFirst', 'Upload course files to generate components first.')}</p>}
                  </div>
                </div>
              </div>
              {selectedGroup.quizzes?.length ? (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedGroup.quizzes.map(quiz => (
                    <div key={quiz.id} style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <strong>{quiz.title}</strong>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>{quiz.componentCount} {quiz.componentCount === 1 ? tt('topicSingle', 'topic') : tt('topicsPlural', 'topics')}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="dashboard-tool-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={18} color="#3b82f6" /> {tt('studentProgress', 'Student Progress')}</h4>
                <select
                  value={selectedStudentId || ''}
                  onChange={(event) => loadPrivateConversation(event.target.value)}
                  disabled={!selectedGroup.members?.length}
                  style={{ minWidth: '180px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 10px', color: '#0f172a', fontWeight: 700, background: '#fff' }}
                >
                  {(selectedGroup.members || []).map(member => (
                    <option key={member.student.id} value={member.student.id}>{member.student.name}</option>
                  ))}
                </select>
              </div>
              {selectedStudent ? (
                selectedStudentComponents.length ? selectedStudentComponents.map(component => (
                  <div key={component.componentId} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '5px' }}><span>{component.name}</span><span>{component.mastery}%</span></div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}><div style={{ width: `${component.mastery}%`, height: '100%', background: '#10b981' }} /></div>
                  </div>
                )) : <p style={{ color: '#94a3b8', margin: 0 }}>{tt('noComponentProgress', 'No component progress yet.')}</p>
              ) : <p style={{ color: '#94a3b8', margin: 0 }}>{tt('selectStudentProgress', 'Select a student to inspect progress.')}</p>}
            </div>

            <ChatPanel title={tt('publicGroupChat', 'Public Group Chat')} icon={<MessageSquare size={18} color="#3b82f6" />} messages={publicMessages} value={publicMessage} setValue={setPublicMessage} onSend={sendPublicMessage} emptyText={tt('noMessagesYet', 'No messages yet.')} disabledText={tt('selectStudentFirst', 'Select a student first.')} placeholder={tt('writeMessage', 'Write a message...')} />
            <ChatPanel title={tt('privateStudentChat', 'Private Student Chat')} icon={<Lock size={18} color="#f59e0b" />} messages={privateMessages} value={privateMessage} setValue={setPrivateMessage} onSend={sendPrivateMessage} disabled={!selectedStudentId} emptyText={tt('noMessagesYet', 'No messages yet.')} disabledText={tt('selectStudentFirst', 'Select a student first.')} placeholder={tt('writeMessage', 'Write a message...')} />
          </div>
        </div>
      </div>
    );
  };

  const renderCourseDetails = () => {
    const courseGroupMasteryData = (selectedCourse?.groups || []).map(group => ({
      name: group.name,
      averageMastery: Number(group.averageMastery || 0),
      students: group.studentCount || 0,
    }));

    return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
        <button onClick={() => { setActiveView('courses'); setSelectedCourse(null); setSelectedGroup(null); selectedGroupRef.current = null; }} className="btn-luxe" style={{ background: 'rgba(0,0,0,0.05)', color: 'black', border: 'none', padding: '8px 16px' }}>
          <ArrowLeft size={18} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} /> {t.coursesTitle || 'Courses'}
        </button>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px' }}>{selectedCourse?.name}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
        <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} color="#8b5cf6" /> {tt('courseFiles', 'Course Files')}</h3>
            <label className="nav-btn primary" style={{ padding: '8px 16px', fontSize: '14px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
              {isUploading ? <Loader2 size={16} className="spin-icon" /> : <Upload size={16} />} {tt('upload', 'Upload')}
              <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.ppt,.pptx" disabled={isUploading} />
            </label>
          </div>
          {selectedCourse?.resourceList?.length ? selectedCourse.resourceList.map(file => (
            <div key={file.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 0', color: '#0f172a' }}><FileText size={18} /> {file.text}</div>
          )) : <p style={{ color: '#94a3b8' }}>{tt('noFilesUploaded', 'No files uploaded.')}</p>}
        </div>

        <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={20} color="#3b82f6" /> {t.components || 'Components'}</h3>
            <button type="button" onClick={selectAllCourseQuizComponents} disabled={(selectedCourse?.componentList || []).length === 0} style={{ background: 'transparent', border: 'none', color: '#2563eb', fontWeight: 900, cursor: 'pointer' }}>{tt('all', 'All')}</button>
          </div>
          {selectedCourse?.componentList?.length ? (
            <div style={{ display: 'grid', gap: '6px' }}>
              {selectedCourse.componentList.map(component => {
                const selected = courseQuizComponentIds.includes(component.id);
                return (
                  <div key={component.id} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) 34px', alignItems: 'center', gap: '8px', padding: '8px 0', color: '#0f172a' }}>
                    <input type="checkbox" checked={selected} onChange={() => toggleCourseQuizComponent(component.id)} aria-label={component.text} />
                    <button type="button" onClick={() => toggleCourseQuizComponent(component.id)} style={{ background: 'transparent', border: 'none', padding: 0, textAlign: isRtl ? 'right' : 'left', color: selected ? '#1d4ed8' : '#0f172a', fontWeight: selected ? 900 : 700, fontSize: '15px', lineHeight: 1.45, cursor: 'pointer', overflowWrap: 'anywhere' }}>
                      {component.text}
                    </button>
                    <button type="button" onClick={() => deleteComponent(selectedCourse.id, component.id)} title={tt('deleteTitle', 'Delete')} style={{ width: '34px', height: '34px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', background: 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={16} color="#64748b" /></button>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: '#94a3b8' }}>{t.noComponentsYet || 'No components yet.'}</p>}

          <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
            <input
              value={courseQuizTitle}
              onChange={(event) => setCourseQuizTitle(event.target.value)}
              placeholder={tt('quizTitle', 'Quiz title')}
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px' }}
            />
            <button type="button" onClick={openCourseQuizGroupsModal} disabled={(selectedCourse?.componentList || []).length === 0 || courseQuizComponentIds.length === 0} className="btn-luxe primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 12px' }}>
              <ClipboardList size={16} /> {tt('assignQuiz', 'Assign Quiz')}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', minHeight: '18px' }}>
              <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 800 }}>{courseQuizComponentIds.length ? `${courseQuizComponentIds.length} ${tt('selectedCount', 'selected')}` : tt('selectComponentsFirst', 'Select components or All first.')}</span>
              {courseQuizComponentIds.length > 0 && <button type="button" onClick={clearCourseQuizComponents} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 800 }}>{tt('clear', 'Clear')}</button>}
            </div>
            {courseQuizError && !showCourseQuizGroupsModal && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '13px', fontWeight: 800 }}>
                <AlertCircle size={15} /> {courseQuizError}
              </div>
            )}
            {courseQuizSuccess && (
              <div style={{ color: '#047857', fontSize: '13px', fontWeight: 900 }}>{courseQuizSuccess}</div>
            )}
          </div>

          {isAddingComponent ? (
            <div style={{ marginTop: '15px' }}>
              <input value={newComponentName} onChange={(e) => setNewComponentName(e.target.value)} placeholder={tt('componentNamePlaceholder', 'Component name...')} className="input-luxe" style={{ width: '100%', marginBottom: '10px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-luxe primary" disabled={isSavingComponent} onClick={() => handleSaveComponent(selectedCourse.id)}>{isSavingComponent ? <Loader2 size={16} className="spin-icon" /> : tt('saveTitle', 'Save')}</button>
                <button className="btn-luxe" onClick={() => { setIsAddingComponent(false); setNewComponentName(''); setAiSuggestions([]); }}>{tt('cancelTitle', 'Cancel')}</button>
              </div>
              {(isSuggesting || aiSuggestions.length > 0) && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isSuggesting ? <Loader2 size={16} className="spin-icon" /> : aiSuggestions.map(item => (
                    <button key={item} onClick={() => handleSaveComponent(selectedCourse.id, item)} className="btn-luxe" style={{ justifyContent: 'space-between' }}>{item}<Plus size={14} /></button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button className="btn-luxe" onClick={() => { setIsAddingComponent(true); handleSuggestComponents(); }} style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }}><Wand2 size={16} /> {tt('addComponentButton', 'Add Component')}</button>
          )}
        </div>

        <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={20} color="#f59e0b" /> {t.groupsTitle || 'Groups'}</h3>
            <button className="nav-btn primary" onClick={() => setShowAddGroupModal(true)} style={{ padding: '8px 16px', fontSize: '14px' }}><Plus size={16} /> {t.createGroup || 'Create Group'}</button>
          </div>
          {selectedCourse?.groups?.length ? selectedCourse.groups.map(group => (
            <button key={group.id} onClick={() => openGroupDetail(group.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: selectedGroup?.id === group.id ? 'rgba(59,130,246,0.08)' : 'rgba(0,0,0,0.02)', border: selectedGroup?.id === group.id ? '2px solid #3b82f6' : '1px solid transparent', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer' }}>
              <span style={{ color: '#1e293b', fontWeight: 700 }}>{group.name}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ background: '#e0e7ff', color: '#3b82f6', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{group.studentCount} {t.students || 'students'}</span>
                <span style={{ background: '#dcfce7', color: '#047857', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{group.averageMastery || 0}% {tt('avg', 'avg')}</span>
              </div>
            </button>
          )) : <p style={{ color: '#94a3b8' }}>{t.noGroupsYet || 'No groups created.'}</p>}
        </div>
      </div>

      {courseGroupMasteryData.length > 0 && (
        <div className="luxe-panel dashboard-surface" style={{ padding: '30px', marginTop: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={20} color="#10b981" /> {tt('avgMasteryByGroup', 'Avg. Mastery by Group')}</h3>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 800 }}>{courseGroupMasteryData.length} {tt('groups', 'groups')}</span>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseGroupMasteryData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip formatter={(value, name, item) => [`${value}% (${item?.payload?.students ?? 0} ${t.students || 'students'})`, tt('avgStudentMastery', 'Avg. Mastery')]} />
                <Bar dataKey="averageMastery" name={tt('avgStudentMastery', 'Avg. Mastery')} fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </>
    );
  };

  return (
    <div className="dashboard-section command-center instructor-dashboard-page">
      {activeView === 'courses' ? renderCoursesView() : activeView === 'groupDetails' ? renderGroupDetail() : renderCourseDetails()}
      {showAddCourseModal && renderModal(t.createCourse || 'Create Course', newCourseName, setNewCourseName, handleAddCourse, () => setShowAddCourseModal(false), t.courseName || 'Course Name', t.createCourse || 'Create Course')}
      {showAddGroupModal && renderModal(t.createGroup || 'Create Group', newGroupName, setNewGroupName, handleAddGroup, () => setShowAddGroupModal(false), t.groupNamePlaceholder || 'e.g., Spring 2026 CS101', t.createGroup || 'Create Group')}
      {showCourseQuizGroupsModal && renderCourseQuizGroupsModal()}
    </div>
  );
}
