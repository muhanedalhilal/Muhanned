import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, ArrowLeft, BookOpen, Check, ClipboardList, Copy, FileText, Layers, Loader2, Lock, Mail, MessageSquare, Plus, QrCode, Send, Trash2, Upload, UserPlus, Users, Wand2, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, openResource } from '../services/api';

const instructorRoles = new Set(['teacher', 'admin', 'instructor']);

const CustomXAxisTick = ({ x, y, payload, isRtl }) => {
  const fullText = payload.value;
  const isArabic = /[\u0600-\u06FF]/.test(fullText);
  const marker = isArabic ? '\u200F' : '\u200E';
  const label = fullText + marker;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={20} textAnchor={isRtl ? 'start' : 'end'} fill="#94a3b8" fontSize={12} fontWeight="700" transform={isRtl ? 'rotate(35)' : 'rotate(-35)'} style={{ direction: 'ltr' }}>
        <title>{fullText}</title>
        {label}
      </text>
    </g>
  );
};

function senderRoleClass(message) {
  return instructorRoles.has(message.sender?.role) ? 'instructor' : 'student';
}

function ChatPanel({ title, icon, messages, value, onChange, setValue, onSend, disabled = false, isSending = false, isRtl = false, emptyText, disabledText, placeholder, isLoading = false }) {
  const handleChange = onChange || setValue;
  const isBlocked = disabled || isSending || isLoading;
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <div className="dashboard-tool-card">
      <h4 style={{ margin: '0 0 10px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon}{title}</h4>
      <div ref={scrollContainerRef} style={{ minHeight: '200px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '10px', paddingRight: isRtl ? '0' : '4px', paddingLeft: isRtl ? '4px' : '0' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 'auto' }}>
            <Loader2 size={24} className="spin-icon" color="#3b82f6" />
          </div>
        ) : messages.length === 0 ? (
          <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>{disabled ? disabledText : emptyText}</p>
        ) : messages.map(message => {
          const isMine = senderRoleClass(message) === 'instructor';
          return (
            <div key={message.id} style={{ 
              alignSelf: isMine ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px', 
              borderRadius: isMine 
                ? (isRtl ? '16px 16px 16px 4px' : '16px 16px 4px 16px') 
                : (isRtl ? '16px 16px 4px 16px' : '16px 16px 16px 4px'),
              background: isMine ? '#3b82f6' : '#f1f5f9', 
              color: isMine ? '#ffffff' : '#0f172a',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
              {!isMine && (
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '4px' }}>
                  {message.sender?.name || title}
                </div>
              )}
              <div style={{ fontSize: '14.5px', lineHeight: 1.5, wordBreak: 'break-word' }}>{message.content}</div>
            </div>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!isBlocked) onSend(); }} style={{ display: 'flex', gap: '8px' }}>
        <input disabled={isBlocked} value={value} onChange={(e) => handleChange?.(e.target.value)} placeholder={placeholder} autoComplete="off" style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', opacity: isBlocked ? 0.6 : 1 }} />
        <button type="submit" disabled={isBlocked} className="btn-luxe primary" style={{ padding: '10px 12px', minWidth: '44px' }}>
          {isSending ? <Loader2 size={16} className="spin-icon" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

export default function InstructorDashboard({ t, isRtl }) {
  const tt = (key, fallback) => t?.[key] || fallback;
  const [activeView, setActiveView] = useState(() => sessionStorage.getItem('idash_view') || 'courses');
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
  const [isSendingPublic, setIsSendingPublic] = useState(false);
  const [isSendingPrivate, setIsSendingPrivate] = useState(false);
  const [isPublicLoading, setIsPublicLoading] = useState(false);
  const [isPrivateLoading, setIsPrivateLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentEmailError, setStudentEmailError] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [isOpeningAddStudentModal, setIsOpeningAddStudentModal] = useState(false);
  const [pendingStudents, setPendingStudents] = useState([]);
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
  const [unreadPublicCount, setUnreadPublicCount] = useState(0);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [showGroupQuizzes, setShowGroupQuizzes] = useState(false);
  const [showGroupStudents, setShowGroupStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const showGroupChatRef = useRef(false);
  const selectedGroupRef = useRef(null);
  const selectedStudentIdRef = useRef(null);
  const [deletingCourseId, setDeletingCourseId] = useState(null);
  const [loadingGroupId, setLoadingGroupId] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

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
    setUnreadPublicCount(0);
    showGroupChatRef.current = false;
    setShowGroupChat(false);
    setShowGroupQuizzes(false);
    setShowGroupStudents(false);
    setStudentSearch('');
    const memberIds = (res.data.members || []).map(member => member.student?.id).filter(Boolean);
    const preferredId = preferredStudentId ? Number(preferredStudentId) : null;
    const studentId = preferredId && memberIds.includes(preferredId) ? preferredId : (memberIds[0] || null);
    setSelectedStudentId(studentId);
    selectedStudentIdRef.current = studentId;
    setPrivateMessages([]);
    // Fetch private messages in the background — don't await
    if (studentId) {
      setIsPrivateLoading(true);
      api.get(`/groups/${groupId}/messages/private/${studentId}`).then(privateRes => {
        if (privateRes.ok) setPrivateMessages(privateRes.data);
        setIsPrivateLoading(false);
      });
    }
    return true;
  };

  const openGroupDetail = async (groupId, preferredStudentId = selectedStudentId) => {
    setLoadingGroupId(groupId);
    const loaded = await loadGroupDetail(groupId, preferredStudentId);
    setLoadingGroupId(null);
    if (loaded) setActiveView('groupDetails');
  };

  // Persist navigation state so page refresh restores the correct view
  useEffect(() => {
    sessionStorage.setItem('idash_view', activeView);
    if (selectedCourse?.id) sessionStorage.setItem('idash_courseId', selectedCourse.id);
    if (selectedGroup?.id) sessionStorage.setItem('idash_groupId', selectedGroup.id);
    if (activeView === 'courses') {
      sessionStorage.removeItem('idash_courseId');
      sessionStorage.removeItem('idash_groupId');
    }
    if (activeView === 'courseDetails') sessionStorage.removeItem('idash_groupId');
  }, [activeView, selectedCourse?.id, selectedGroup?.id]);

  useEffect(() => {
    const restoreSession = async (loadedCourses) => {
      const savedView = sessionStorage.getItem('idash_view');
      const savedCourseId = sessionStorage.getItem('idash_courseId');
      const savedGroupId = sessionStorage.getItem('idash_groupId');
      if (!savedView || savedView === 'courses' || !savedCourseId) return;
      const course = loadedCourses.find(c => String(c.id) === String(savedCourseId));
      if (!course) return;
      setSelectedCourse(course);
      if ((savedView === 'groupDetails' || savedView === 'studentDetails') && savedGroupId) {
        await loadGroupDetail(Number(savedGroupId));
        setActiveView('groupDetails');
      } else {
        setActiveView('courseDetails');
      }
    };

    const init = async () => {
      setLoading(true);
      const res = await api.get('/courses/');
      if (res.ok) {
        setCourses(res.data);
        await restoreSession(res.data);
      }
      setLoading(false);
    };

    init();
    
    let socket = null;
    let reconnectTimeout = null;
    let isDisposed = false;

    const connectWS = () => {
      if (isDisposed) return;

      socket = new WebSocket(api.wsUrl('/groups/ws'));

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const active = selectedGroupRef.current;

          if (payload.type === 'group_public_message' && active?.id === payload.groupId) {
            if (showGroupChatRef.current) {
              setPublicMessages(prev => prev.some(msg => msg.id === payload.message.id) ? prev : [...prev, payload.message]);
            } else {
              setUnreadPublicCount(prev => prev + 1);
            }
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
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connectWS, 3000);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connectWS();

    return () => {
      isDisposed = true;
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;

    const interval = setInterval(async () => {
      const groupId = selectedGroup.id;
      const studentId = selectedStudentId;

      // Poll public messages
      const publicRes = await api.get(`/groups/${groupId}/messages/public`);
      if (publicRes.ok) {
        setPublicMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(publicRes.data)) {
            if (!showGroupChatRef.current) {
              const diff = publicRes.data.length - prev.length;
              if (diff > 0) {
                setUnreadPublicCount(c => c + diff);
              }
            }
            return publicRes.data;
          }
          return prev;
        });
      }

      // Poll private messages
      if (studentId) {
        const privateRes = await api.get(`/groups/${groupId}/messages/private/${studentId}`);
        if (privateRes.ok) {
          setPrivateMessages(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(privateRes.data)) {
              return privateRes.data;
            }
            return prev;
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedGroup?.id, selectedStudentId]);

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

  const handleDeleteCourse = async (courseId, courseName) => {
    const confirmed = window.confirm(`${tt('deleteCourseConfirm', 'Are you sure you want to delete the course')} "${courseName}"?`);
    if (!confirmed) return;
    setDeletingCourseId(courseId);
    const res = await api.delete(`/courses/${courseId}`);
    if (res.ok) {
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        setSelectedGroup(null);
        selectedGroupRef.current = null;
        setActiveView('courses');
      }
      await fetchCourses();
    } else {
      alert(res.message || tt('failedDeleteCourse', 'Failed to delete course'));
    }
    setDeletingCourseId(null);
  };

  const handleDeleteGroup = async (e, groupId, groupName) => {
    e.stopPropagation();
    const confirmed = window.confirm(`${tt('deleteGroupConfirm', 'Are you sure you want to delete the group')} "${groupName}"?`);
    if (!confirmed) return;
    setDeletingGroupId(groupId);
    const res = await api.delete(`/groups/${groupId}`);
    if (res.ok) {
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        selectedGroupRef.current = null;
        setActiveView('courseDetails');
      }
      await fetchCourses();
    } else {
      alert(res.message || tt('failedDeleteGroup', 'Failed to delete group'));
    }
    setDeletingGroupId(null);
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

  const handleOpenAddStudentModal = () => {
    setIsOpeningAddStudentModal(true);
    setTimeout(() => {
      setIsOpeningAddStudentModal(false);
      setShowAddStudentModal(true);
    }, 400);
  };

  const handleAddPendingStudent = (e) => {
    e.preventDefault();
    const email = studentEmail.trim();
    if (!email) return;
    if (pendingStudents.includes(email)) {
      setStudentEmail('');
      return;
    }
    setPendingStudents([...pendingStudents, email]);
    setStudentEmail('');
  };

  const handleRemovePendingStudent = (emailToRemove) => {
    setPendingStudents(pendingStudents.filter(e => e !== emailToRemove));
  };

  const handleBulkAddStudentsToGroup = async () => {
    if (!selectedGroup || pendingStudents.length === 0 || isAddingStudent) return;
    setIsAddingStudent(true);
    setStudentEmailError('');
    let successCount = 0;
    for (const email of pendingStudents) {
      const res = await api.post(`/groups/${selectedGroup.id}/members`, { email });
      if (res.ok) {
        successCount++;
        setSelectedGroup(res.data);
        selectedGroupRef.current = res.data;
      } else {
        setStudentEmailError(`${tt('failedAddStudent', 'Failed to add')} ${email}: ${res.message}`);
        break;
      }
    }
    setIsAddingStudent(false);
    if (successCount === pendingStudents.length) {
      setPendingStudents([]);
      setShowAddStudentModal(false);
      await fetchCourses();
      await loadGroupDetail(selectedGroup.id, selectedStudentIdRef.current);
    } else {
      setPendingStudents(pendingStudents.slice(successCount));
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
    if (!selectedGroup || !publicMessage.trim() || isSendingPublic) return;
    setIsSendingPublic(true);
    try {
      const res = await api.post(`/groups/${selectedGroup.id}/messages/public`, { content: publicMessage.trim() });
      if (res.ok) {
        setPublicMessage('');
        setPublicMessages(prev => prev.some(msg => msg.id === res.data.id) ? prev : [...prev, res.data]);
      }
    } finally {
      setIsSendingPublic(false);
    }
  };

  const sendPrivateMessage = async () => {
    if (!selectedGroup || !selectedStudentId || !privateMessage.trim() || isSendingPrivate) return;
    setIsSendingPrivate(true);
    try {
      const res = await api.post(`/groups/${selectedGroup.id}/messages/private`, {
        recipient_id: selectedStudentId,
        content: privateMessage.trim(),
      });
      if (res.ok) {
        setPrivateMessage('');
        setPrivateMessages(prev => prev.some(msg => msg.id === res.data.id) ? prev : [...prev, res.data]);
      }
    } finally {
      setIsSendingPrivate(false);
    }
  };

  const loadPrivateConversation = async (studentId) => {
    const normalizedStudentId = Number(studentId);
    if (!normalizedStudentId) return;
    setSelectedStudentId(normalizedStudentId);
    selectedStudentIdRef.current = normalizedStudentId;
    setActiveView('studentDetails');
    if (!selectedGroup) return;
    setIsPrivateLoading(true);
    const res = await api.get(`/groups/${selectedGroup.id}/messages/private/${normalizedStudentId}`);
    if (res.ok) setPrivateMessages(res.data);
    else setPrivateMessages([]);
    setIsPrivateLoading(false);
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
            <div style={{ color: '#94a3b8', fontSize: '15px' }}>{t.coursesTitle || 'Courses sections'}</div>
          </div>
        </div>
      </div>

      <div className="luxe-panel dashboard-surface" style={{ padding: '30px', color: '#64748b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#0f172a', margin: 0, fontSize: '18px' }}>{t.coursesTitle || 'Courses sections'}</h3>
          <button className="nav-btn primary" onClick={() => setShowAddCourseModal(true)} style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', gap: '6px', alignItems: 'center' }}><Plus size={16} /> {t.createCourse || 'Create Course'}</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Loader2 size={42} className="spin-icon" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {courses.map(course => (
              <div key={course.id} className="dashboard-course-tile" onClick={() => { setSelectedCourse(course); setSelectedGroup(null); selectedGroupRef.current = null; setActiveView('courseDetails'); }} style={{ textAlign: isRtl ? 'right' : 'left', cursor: 'pointer', position: 'relative' }}>
                <h3 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '18px', paddingRight: isRtl ? '0' : '30px', paddingLeft: isRtl ? '30px' : '0' }}>{course.name}</h3>
                <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#64748b' }}>
                  <span>{(course.groups || []).length} {tt('groups', 'groups')}</span>
                  <span>{(course.resourceList || []).length} {tt('files', 'files')}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id, course.name); }}
                  disabled={deletingCourseId === course.id}
                  style={{ position: 'absolute', top: '15px', right: isRtl ? 'auto' : '15px', left: isRtl ? '15px' : 'auto', background: 'transparent', border: 'none', cursor: deletingCourseId === course.id ? 'not-allowed' : 'pointer', padding: '5px' }}
                  title={tt('deleteCourse', 'Delete Course')}
                >
                  {deletingCourseId === course.id ? (
                    <Loader2 size={18} color="#ef4444" className="spin-icon" />
                  ) : (
                    <Trash2 size={18} color="#ef4444" />
                  )}
                </button>
              </div>
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

    const kcMap = {};
    (selectedGroup.members || []).forEach(member => {
      (member.components || []).forEach(comp => {
        if (!kcMap[comp.name]) kcMap[comp.name] = { total: 0, count: 0 };
        kcMap[comp.name].total += comp.mastery || 0;
        kcMap[comp.name].count += 1;
      });
    });
    const kcMasteryData = Object.entries(kcMap).map(([name, val]) => ({
      name,
      mastery: Math.round(val.total / val.count),
    }));

    return (
      <>
        {/* ── Hero Panel ── */}
        <div className="luxe-panel detail-hero bento-hero" style={{ overflow: 'hidden', position: 'relative', marginBottom: '25px', padding: '30px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, #f59e0b15, #f59e0b08)', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="del-btn" onClick={() => setActiveView(selectedCourse ? 'courseDetails' : 'courses')} style={{ flexShrink: 0 }}>
              <ArrowLeft size={24} color="#1e293b" style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
            </button>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #f59e0b30, #f59e0b60)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={28} color="#f59e0b" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="luxe-title" style={{ fontSize: '26px', color: '#0f172a', margin: 0 }}>{selectedGroup.name}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                {tt('averageMastery', 'Average mastery')}: <strong>{selectedGroup.averageMastery}%</strong> · {selectedGroup.studentCount} {t.students || 'students'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Sections Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>

          {/* Students Panel */}
          <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showGroupStudents ? '20px' : 0 }}>
              <button type="button" onClick={() => setShowGroupStudents(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color="#f59e0b" /> {tt('students', 'Students')}
                  <span style={{ background: '#fef9c3', color: '#92400e', borderRadius: '999px', padding: '1px 8px', fontSize: '12px', fontWeight: 900 }}>{selectedGroup.members?.length || 0}</span>
                </h3>
                <span style={{ color: '#94a3b8', fontSize: '16px', marginLeft: '4px' }}>{showGroupStudents ? '▲' : '▼'}</span>
              </button>
              <button type="button" onClick={handleOpenAddStudentModal} disabled={isOpeningAddStudentModal} className="nav-btn primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                {isOpeningAddStudentModal ? <Loader2 size={16} className="spin-icon" /> : <UserPlus size={16} />} {tt('addStudent', 'Add Student')}
              </button>
            </div>
            {showGroupStudents && (
              <>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                  </span>
                  <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder={tt('searchStudents', 'Search students...')} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 12px 9px 34px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {(() => {
                  const filtered = (selectedGroup.members || []).filter(member =>
                    !studentSearch.trim() ||
                    member.student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    member.student.email?.toLowerCase().includes(studentSearch.toLowerCase())
                  );
                  return filtered.length ? filtered.map(member => (
                    <div key={member.student.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 38px', gap: '8px', alignItems: 'stretch', marginBottom: '8px' }}>
                      <button type="button" onClick={() => loadPrivateConversation(member.student.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', border: selectedStudentId === member.student.id ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', minWidth: 0, textAlign: 'left' }}>
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
                  )) : <p style={{ color: '#94a3b8', margin: 0 }}>{studentSearch.trim() ? tt('noStudentsFound', 'No students match your search.') : tt('noStudentsJoined', 'No students have joined yet.')}</p>;
                })()}
              </>
            )}
          </div>

          {/* Assigned Quizzes Panel */}
          {selectedGroup.quizzes?.length ? (
            <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showGroupQuizzes ? '20px' : 0 }}>
                <button type="button" onClick={() => setShowGroupQuizzes(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClipboardList size={20} color="#f59e0b" /> {tt('assignedQuizzes', 'Assigned Quizzes')}
                    <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '999px', padding: '1px 8px', fontSize: '12px', fontWeight: 900 }}>{selectedGroup.quizzes.length}</span>
                  </h3>
                  <span style={{ color: '#94a3b8', fontSize: '16px', marginLeft: '4px' }}>{showGroupQuizzes ? '▲' : '▼'}</span>
                </button>
              </div>
              {showGroupQuizzes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedGroup.quizzes.map(quiz => (
                    <div key={quiz.id} style={{ padding: '12px 16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <strong>{quiz.title}</strong>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>{quiz.componentCount} {quiz.componentCount === 1 ? tt('topicSingle', 'topic') : tt('topicsPlural', 'topics')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

        </div>

        {/* Public Chat Panel — full width */}
        <div className="luxe-panel dashboard-surface" style={{ padding: '30px', marginTop: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showGroupChat ? '20px' : 0 }}>
            <button type="button" onClick={async () => {
              const opening = !showGroupChat;
              showGroupChatRef.current = opening;
              if (opening) {
                setUnreadPublicCount(0);
                if (publicMessages.length === 0 && selectedGroup) {
                  setIsPublicLoading(true);
                  const res = await api.get(`/groups/${selectedGroup.id}/messages/public`);
                  if (res.ok) setPublicMessages(res.data);
                  setIsPublicLoading(false);
                }
              }
              setShowGroupChat(opening);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#3b82f6" /> {tt('publicGroupChat', 'Public Group Chat')}
                {unreadPublicCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '1px 8px', fontSize: '12px', fontWeight: 900, minWidth: '22px', textAlign: 'center' }}>{unreadPublicCount}</span>
                )}
              </h3>
              <span style={{ color: '#94a3b8', fontSize: '16px', marginLeft: '4px' }}>{showGroupChat ? '▲' : '▼'}</span>
            </button>
          </div>
          {showGroupChat && (
            <ChatPanel title="" icon={null} messages={publicMessages} value={publicMessage} setValue={setPublicMessage} onSend={sendPublicMessage} isSending={isSendingPublic} isRtl={isRtl} emptyText={tt('noMessagesYet', 'No messages yet.')} disabledText="" placeholder={tt('writeMessage', 'Write a message...')} isLoading={isPublicLoading} />
          )}
        </div>

        {/* Analytics Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginTop: '25px' }}>
          <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={20} color="#3b82f6" /> {tt('studentMastery', 'Students Mastery')}</h3>
              <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 800 }}>{analyticsData.length} {t.students || 'students'}</span>
            </div>
            <div style={{ height: '260px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '10px' }}>
              <div style={{ height: '100%', minWidth: `${Math.max(200, analyticsData.length * 60)}px` }}>
                <ResponsiveContainer width="100%" height="100%" style={{ direction: 'ltr' }}>
                  <BarChart data={analyticsData} margin={{ top: 10, right: isRtl ? 50 : 10, left: isRtl ? 10 : 50, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis
                      orientation={isRtl ? 'right' : 'left'}
                      domain={[0, 100]}
                      stroke="#94a3b8"
                      width={40}
                      tickMargin={6}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(val) => {
                        if (isRtl) {
                          const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                          const formatted = String(val).replace(/[0-9]/g, (w) => arabicDigits[+w]);
                          return `${formatted}٪`;
                        }
                        return `${val}%`;
                      }}
                    />
                    <Tooltip formatter={(v) => [`${v}%`, tt('mastery', 'Mastery')]} />
                    <Bar dataKey="mastery" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={20} color="#8b5cf6" /> {tt('kcMastery', 'Knowledge Components Mastery')}</h3>
              <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 800 }}>{kcMasteryData.length} {tt('components', 'components')}</span>
            </div>
            {kcMasteryData.length ? (
              <div style={{ height: '260px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '10px' }}>
                <div style={{ height: '100%', minWidth: `${Math.max(200, kcMasteryData.length * 70)}px` }}>
                  <ResponsiveContainer width="100%" height="100%" style={{ direction: 'ltr' }}>
                    <BarChart data={kcMasteryData} margin={{ top: 10, right: isRtl ? 50 : 10, left: isRtl ? 10 : 50, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + '...' : v} />
                      <YAxis
                        orientation={isRtl ? 'right' : 'left'}
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        width={40}
                        tickMargin={6}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(val) => {
                          if (isRtl) {
                            const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                            const formatted = String(val).replace(/[0-9]/g, (w) => arabicDigits[+w]);
                            return `${formatted}٪`;
                          }
                          return `${val}%`;
                        }}
                      />
                      <Tooltip formatter={(v) => [`${v}%`, tt('avgMastery', 'Avg. Mastery')]} />
                      <Bar dataKey="mastery" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : <p style={{ color: '#94a3b8', margin: 0 }}>{tt('noKcData', 'No KC data yet. Students must attempt quizzes first.')}</p>}
          </div>
        </div>
      </>
    );
  };


  const renderStudentDetail = () => {
    if (!selectedGroup || !selectedStudentId) return null;
    const selectedStudent = selectedGroup.members?.find(member => member.student?.id === selectedStudentId) || null;
    const selectedStudentComponents = selectedStudent?.components || [];

    // Build bar chart data
    const kcChartData = selectedStudentComponents.map(comp => ({
      name: comp.name,
      mastery: comp.mastery || 0,
    }));

    return (
      <>
        {/* ── Hero Panel ── */}
        <div className="luxe-panel detail-hero bento-hero" style={{ overflow: 'hidden', position: 'relative', marginBottom: '25px', padding: '30px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, #3b82f615, #3b82f608)', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="del-btn" onClick={() => { setActiveView('groupDetails'); setSelectedStudentId(null); selectedStudentIdRef.current = null; }} style={{ flexShrink: 0 }}>
              <ArrowLeft size={24} color="#1e293b" style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
            </button>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f630, #8b5cf660)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '22px', fontWeight: 900, color: '#3b82f6' }}>
              {(selectedStudent?.student?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="luxe-title" style={{ fontSize: '24px', color: '#0f172a', margin: 0 }}>{selectedStudent?.student?.name || tt('student', 'Student')}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                {selectedStudent?.student?.email} · {tt('averageMastery', 'Average mastery')}: <strong style={{ color: '#3b82f6' }}>{selectedStudent?.averageMastery || 0}%</strong>
              </p>
            </div>
          </div>
        </div>

        {/* ── Private Chat — full width, at top ── */}
        <div className="luxe-panel dashboard-surface" style={{ padding: '30px', marginBottom: '25px' }}>
          <h3 style={{ margin: '0 0 20px', color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} color="#f59e0b" /> {tt('privateStudentChat', 'Private Student Chat')}
          </h3>
          <ChatPanel
            title="" icon={null}
            messages={privateMessages}
            value={privateMessage}
            setValue={setPrivateMessage}
            onSend={sendPrivateMessage}
            isSending={isSendingPrivate}
            isRtl={isRtl}
            disabled={!selectedStudentId}
            emptyText={tt('noMessagesYet', 'No messages yet.')}
            disabledText={tt('selectStudentFirst', 'Select a student first.')}
            placeholder={tt('writeMessage', 'Write a message...')}
            isLoading={isPrivateLoading}
          />
        </div>

        {/* ── KC Progress Bar Chart ── */}
        <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} color="#3b82f6" /> {tt('studentProgress', 'Student Progress')}
            </h3>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 800 }}>{kcChartData.length} {tt('components', 'components')}</span>
          </div>
          {kcChartData.length ? (
            <div style={{ minHeight: '400px', width: '100%' }}>
              <ResponsiveContainer width="100%" height={400} style={{ direction: 'ltr' }}>
                <BarChart
                  data={kcChartData}
                  margin={{ top: 10, right: isRtl ? 60 : 20, left: isRtl ? 20 : 60, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    interval={0}
                    height={120}
                    tick={<CustomXAxisTick isRtl={false} />}
                  />
                  <YAxis
                    orientation={isRtl ? 'right' : 'left'}
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    width={50}
                    tickMargin={8}
                    tick={{ fill: '#334155', fontSize: 16, fontWeight: '900' }}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(val) => {
                      if (isRtl) {
                        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                        const formatted = String(val).replace(/[0-9]/g, (w) => arabicDigits[+w]);
                        return `${formatted}٪`;
                      }
                      return `${val}%`;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{payload[0].payload.name}</p>
                            <p style={{ margin: 0, color: payload[0].payload.fill }}>{tt('mastery', 'Mastery')}: {payload[0].value}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="mastery" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {kcChartData.map((entry, idx) => (
                      <Cell key={idx} fill={
                        entry.mastery === 100 ? '#10b981' :
                        entry.mastery > 0 ? '#3b82f6' :
                        '#334155'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: '#94a3b8', margin: 0 }}>{tt('noComponentProgress', 'No component progress yet.')}</p>
          )}
        </div>
      </>
    );
  };


  const renderCourseDetails = () => {
    const courseGroupMasteryData = (selectedCourse?.groups || []).map(group => ({
      name: group.name,
      averageMastery: Number(group.averageMastery || 0),
      students: group.studentCount || 0,
    }));
    const courseComponentMasteryData = (selectedCourse?.componentList || []).map(comp => ({
      name: comp.text,
      averageMastery: Number(comp.averageMastery || 0),
    }));

    return (
      <>
        <div className="luxe-panel detail-hero bento-hero" style={{ overflow: 'hidden', position: 'relative', marginBottom: '25px', padding: '30px' }}>
          {selectedCourse?.image_url ? (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url(${selectedCourse.image_url})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: 0.15, zIndex: 0
            }} />
          ) : (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: `linear-gradient(135deg, ${selectedCourse?.color || '#3b82f6'}15, ${selectedCourse?.color || '#3b82f6'}08)`,
              zIndex: 0
            }} />
          )}

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="del-btn" onClick={() => { setActiveView('courses'); setSelectedCourse(null); setSelectedGroup(null); selectedGroupRef.current = null; }} style={{ marginRight: isRtl ? '0' : '5px', marginLeft: isRtl ? '5px' : '0', flexShrink: 0 }}>
              <ArrowLeft size={24} color="#1e293b" style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
            </button>

            {selectedCourse?.image_url ? (
              <div style={{
                width: '72px', height: '72px', borderRadius: '16px',
                overflow: 'hidden', flexShrink: 0,
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                border: '2px solid rgba(59, 130, 246, 0.2)'
              }}>
                <img
                  src={selectedCourse.image_url}
                  alt={selectedCourse.name}
                  onError={(e) => { e.target.onerror = null; e.target.src = selectedCourse.image_fallback_url || ''; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div style={{
                width: '72px', height: '72px', borderRadius: '16px',
                background: `linear-gradient(135deg, ${selectedCourse?.color || '#3b82f6'}30, ${selectedCourse?.color || '#3b82f6'}60)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                position: 'relative', overflow: 'hidden'
              }}>
                <BookOpen size={32} color={selectedCourse?.color || '#3b82f6'} />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="luxe-title" style={{ fontSize: '28px', color: 'black', margin: 0 }}>
                {selectedCourse?.name}
              </h2>
              {selectedCourse?.description && (
                <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                  {selectedCourse.description}
                </p>
              )}
            </div>
          </div>
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
            {selectedCourse?.resourceList?.length ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {selectedCourse.resourceList.map(file => (
                  <div key={file.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px', background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.1)', borderRadius: '12px', color: '#0f172a', fontWeight: 600, transition: 'all 0.2s ease', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.04)'}>
                    <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex' }}><FileText size={18} color="#8b5cf6" /></div>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.text}</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#94a3b8' }}>{tt('noFilesUploaded', 'No files uploaded.')}</p>}
          </div>

          <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={20} color="#3b82f6" /> {t.components || 'Components'}</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button type="button" onClick={selectAllCourseQuizComponents} disabled={(selectedCourse?.componentList || []).length === 0} style={{ background: 'transparent', border: 'none', color: '#2563eb', fontWeight: 900, cursor: 'pointer' }}>{tt('all', 'All')}</button>
                {courseQuizComponentIds.length > 0 && <button type="button" onClick={clearCourseQuizComponents} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 900, cursor: 'pointer' }}>{tt('clear', 'Clear')}</button>}
              </div>
            </div>
            {selectedCourse?.componentList?.length ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedCourse.componentList.map(component => {
                  const selected = courseQuizComponentIds.includes(component.id);
                  return (
                    <div key={component.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: selected ? 'rgba(59, 130, 246, 0.06)' : '#ffffff', border: selected ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #e2e8f0', borderRadius: '12px', transition: 'all 0.2s ease' }} onMouseOver={(e) => { if (!selected) e.currentTarget.style.borderColor = '#93c5fd'; }} onMouseOut={(e) => { if (!selected) e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleCourseQuizComponent(component.id)} aria-label={component.text} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                      <button type="button" onClick={() => toggleCourseQuizComponent(component.id)} style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, textAlign: isRtl ? 'right' : 'left', color: selected ? '#1d4ed8' : '#334155', fontWeight: selected ? 800 : 600, fontSize: '15px', lineHeight: 1.45, cursor: 'pointer' }}>
                        {component.text}
                      </button>
                      <button type="button" onClick={() => deleteComponent(selectedCourse.id, component.id)} title={tt('deleteTitle', 'Delete')} style={{ width: '34px', height: '34px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.querySelector('svg').style.stroke = '#dc2626'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.querySelector('svg').style.stroke = '#ef4444'; }}><Trash2 size={16} color="#ef4444" style={{ transition: 'stroke 0.2s' }} /></button>
                    </div>
                  );
                })}
              </div>
            ) : <p style={{ color: '#94a3b8' }}>{t.noComponentsYet || 'No components yet.'}</p>}

            {isAddingComponent ? (
              <div style={{ marginTop: '15px' }}>
                <input value={newComponentName} onChange={(e) => setNewComponentName(e.target.value)} placeholder={tt('componentNamePlaceholder', 'Component name...')} className="input-luxe" style={{ width: '100%', marginBottom: '10px', border: '1px solid black' }} />
                {(isSuggesting || aiSuggestions.length > 0) && (
                  <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {isSuggesting ? <Loader2 size={16} className="spin-icon" /> : aiSuggestions.map(item => (
                      <button key={item} onClick={() => handleSaveComponent(selectedCourse.id, item)} className="btn-luxe" style={{ justifyContent: 'space-between' }}>{item}<Plus size={14} /></button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-luxe primary" disabled={isSavingComponent} onClick={() => handleSaveComponent(selectedCourse.id)}>{isSavingComponent ? <Loader2 size={16} className="spin-icon" /> : tt('saveTitle', 'Save')}</button>
                  <button className="btn-luxe" onClick={() => { setIsAddingComponent(false); setNewComponentName(''); setAiSuggestions([]); }}>{tt('cancelTitle', 'Cancel')}</button>
                </div>
              </div>
            ) : (
              <button className="btn-luxe" onClick={() => { setIsAddingComponent(true); handleSuggestComponents(); }} style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }}><Wand2 size={16} /> {tt('addComponentButton', 'Add Component')}</button>
            )}

            <div style={{ display: 'grid', gap: '10px', marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ color: '#0f172a', fontSize: '15px', fontWeight: 800 }}>{tt('assignQuiz', 'Assign Quiz')}</span>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 800 }}>{courseQuizComponentIds.length ? `${courseQuizComponentIds.length} ${tt('selectedCount', 'selected')}` : tt('selectComponentsFirst', 'Select components first')}</span>
              </div>
              <input
                value={courseQuizTitle}
                onChange={(event) => setCourseQuizTitle(event.target.value)}
                placeholder={tt('quizTitle', 'Quiz title')}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px' }}
              />
              <button type="button" onClick={openCourseQuizGroupsModal} disabled={(selectedCourse?.componentList || []).length === 0 || courseQuizComponentIds.length === 0} className="btn-luxe primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 12px', opacity: ((selectedCourse?.componentList || []).length === 0 || courseQuizComponentIds.length === 0) ? 0.5 : 1, cursor: ((selectedCourse?.componentList || []).length === 0 || courseQuizComponentIds.length === 0) ? 'not-allowed' : 'pointer' }}>
                <ClipboardList size={16} /> {tt('assignQuiz', 'Assign Quiz')}
              </button>
              {courseQuizError && !showCourseQuizGroupsModal && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '13px', fontWeight: 800 }}>
                  <AlertCircle size={15} /> {courseQuizError}
                </div>
              )}
              {courseQuizSuccess && (
                <div style={{ color: '#047857', fontSize: '13px', fontWeight: 900 }}>{courseQuizSuccess}</div>
              )}
            </div>
          </div>

          <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={20} color="#f59e0b" /> {t.groupsTitle || 'Groups'}</h3>
              <button className="nav-btn primary" onClick={() => setShowAddGroupModal(true)} style={{ padding: '8px 16px', fontSize: '14px' }}><Plus size={16} /> {t.createGroup || 'Create Group'}</button>
            </div>
            {selectedCourse?.groups?.length ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {selectedCourse.groups.map(group => (
                  <button key={group.id} disabled={loadingGroupId === group.id} onClick={() => openGroupDetail(group.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', outline: 'none', borderRadius: '12px', cursor: loadingGroupId === group.id ? 'wait' : 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }} onMouseOver={(e) => { if (loadingGroupId !== group.id) { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.05)'; } }} onMouseOut={(e) => { if (loadingGroupId !== group.id) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.02)'; } }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {loadingGroupId === group.id ? <Loader2 size={20} className="spin-icon" /> : <Users size={20} />}
                      </div>
                      <span style={{ color: '#1e293b', fontWeight: 800, fontSize: '16px' }}>{group.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ background: '#e0e7ff', color: '#3b82f6', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>{group.studentCount} {t.students || 'students'}</span>
                      <span style={{ background: '#dcfce7', color: '#047857', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>{group.averageMastery || 0}% {tt('avg', 'avg')}</span>
                      <div onClick={(e) => handleDeleteGroup(e, group.id, group.name)} title={tt('deleteTitle', 'Delete')} style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.querySelector('svg').style.stroke = '#dc2626'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.querySelector('svg').style.stroke = '#ef4444'; }}>
                        {deletingGroupId === group.id ? <Loader2 size={16} color="#ef4444" className="spin-icon" /> : <Trash2 size={16} color="#ef4444" style={{ transition: 'stroke 0.2s' }} />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : <p style={{ color: '#94a3b8' }}>{t.noGroupsYet || 'No groups created.'}</p>}
          </div>
        </div>

        {(courseGroupMasteryData.length > 0 || courseComponentMasteryData.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', marginTop: '25px' }}>
            {courseGroupMasteryData.length > 0 && (
              <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={20} color="#10b981" /> {tt('avgMasteryByGroup', 'Avg. Mastery by Group')}</h3>
                  <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 800 }}>{courseGroupMasteryData.length} {tt('groups', 'groups')}</span>
                </div>
                <div style={{ height: '280px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '10px' }}>
                  <div style={{ height: '100%', minWidth: `${Math.max(100, courseGroupMasteryData.length * 60)}px` }}>
                    <ResponsiveContainer width="100%" height="100%" style={{ direction: 'ltr' }}>
                      <BarChart data={courseGroupMasteryData} margin={{ top: 10, right: isRtl ? 50 : 10, left: isRtl ? 10 : 50, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis
                          orientation={isRtl ? 'right' : 'left'}
                          domain={[0, 100]}
                          stroke="#94a3b8"
                          width={40}
                          tickMargin={6}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(val) => {
                            if (isRtl) {
                              const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                              const formatted = String(val).replace(/[0-9]/g, (w) => arabicDigits[+w]);
                              return `${formatted}٪`;
                            }
                            return `${val}%`;
                          }}
                        />
                        <Tooltip formatter={(value, name, item) => [`${value}% (${item?.payload?.students ?? 0} ${t.students || 'students'})`, tt('avgStudentMastery', 'Avg. Mastery')]} />
                        <Bar dataKey="averageMastery" name={tt('avgStudentMastery', 'Avg. Mastery')} fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {courseComponentMasteryData.length > 0 && (
              <div className="luxe-panel dashboard-surface" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={20} color="#8b5cf6" /> {tt('avgMasteryByKC', 'Avg. Mastery by Component')}</h3>
                  <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 800 }}>{courseComponentMasteryData.length} {tt('components', 'components')}</span>
                </div>
                <div style={{ height: '280px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '10px' }}>
                  <div style={{ height: '100%', minWidth: `${Math.max(100, courseComponentMasteryData.length * 60)}px` }}>
                    <ResponsiveContainer width="100%" height="100%" style={{ direction: 'ltr' }}>
                      <BarChart data={courseComponentMasteryData} margin={{ top: 10, right: isRtl ? 50 : 10, left: isRtl ? 10 : 50, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value} />
                        <YAxis
                          orientation={isRtl ? 'right' : 'left'}
                          domain={[0, 100]}
                          stroke="#94a3b8"
                          width={40}
                          tickMargin={6}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(val) => {
                            if (isRtl) {
                              const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                              const formatted = String(val).replace(/[0-9]/g, (w) => arabicDigits[+w]);
                              return `${formatted}٪`;
                            }
                            return `${val}%`;
                          }}
                        />
                        <Tooltip formatter={(value) => [`${value}%`, tt('avgStudentMastery', 'Avg. Mastery')]} />
                        <Bar dataKey="averageMastery" name={tt('avgStudentMastery', 'Avg. Mastery')} fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
    </>
    );
  };


return (
  <div className="dashboard-section command-center instructor-dashboard-page">
    {loading ? (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid #e2e8f0', borderTopColor: '#3b82f6',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    ) : (
      <>
        {activeView === 'courses' ? renderCoursesView() : activeView === 'groupDetails' ? renderGroupDetail() : activeView === 'studentDetails' ? renderStudentDetail() : renderCourseDetails()}
        {showAddCourseModal && renderModal(t.createCourse || 'Create Course', newCourseName, setNewCourseName, handleAddCourse, () => setShowAddCourseModal(false), t.courseName || 'Course Name', t.createCourse || 'Create Course')}
        {showAddGroupModal && renderModal(t.createGroup || 'Create Group', newGroupName, setNewGroupName, handleAddGroup, () => setShowAddGroupModal(false), t.groupNamePlaceholder || 'e.g., Spring 2026 CS101', t.createGroup || 'Create Group')}
        {showCourseQuizGroupsModal && renderCourseQuizGroupsModal()}
        {showAddStudentModal && (
          <div className="modal-overlay" onClick={() => setShowAddStudentModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="luxe-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px' }} dir={isRtl ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={20} color="#3b82f6" /> {tt('addStudent', 'Add Students')}</h3>
                <button type="button" onClick={() => setShowAddStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
              </div>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 10px', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><QrCode size={18} color="#3b82f6" /> {tt('joinQrCode', 'Join QR Code')}</h4>
                <img src={selectedGroup?.barcodeDataUrl} alt={`QR code for ${selectedGroup?.joinCode}`} style={{ width: '100%', maxWidth: '180px', aspectRatio: '1 / 1', display: 'block', margin: '0 auto', imageRendering: 'pixelated', borderRadius: '10px' }} />
                <div style={{ marginTop: '10px', fontSize: '18px', fontWeight: 900, color: '#3b82f6', letterSpacing: '2px' }}>{selectedGroup?.joinCode}</div>
              </div>
              <form onSubmit={handleAddPendingStudent} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '8px', marginBottom: '15px' }}>
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <Mail size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder={tt('studentEmailPlaceholder', 'Student email')} autoComplete="off" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px 10px 34px', minWidth: 0 }} />
                </div>
                <button type="submit" disabled={!studentEmail.trim()} className="btn-luxe secondary" style={{ padding: '10px 12px' }}>{tt('add', 'Add')}</button>
              </form>
              {pendingStudents.length > 0 && (
                <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {pendingStudents.map(email => (
                    <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '14px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                      <button type="button" onClick={() => handleRemovePendingStudent(email)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {studentEmailError && <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 800, marginBottom: '15px' }}>{studentEmailError}</div>}
              <button type="button" onClick={handleBulkAddStudentsToGroup} disabled={isAddingStudent || pendingStudents.length === 0} className="btn-luxe primary" style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
                {isAddingStudent ? <Loader2 size={18} className="spin-icon" /> : null} {tt('addStudents', 'Add Students')} ({pendingStudents.length})
              </button>
            </div>
          </div>
        )}
      </>
    )}
  </div>
);
}
