import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Award, BookOpen, ChevronDown, ChevronUp, ClipboardList, FileText, Layers, Loader2, Lock, MessageSquare, Plus, QrCode, Send, Users, X } from 'lucide-react';
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

function ChatBox({ title, icon, messages, value, onChange, setValue, onSend, emptyText, placeholder, isRtl, isSending = false }) {
  const handleChange = onChange || setValue;
  const scrollContainerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isOpen]);

  return (
    <div className="student-group-card dashboard-surface" style={{ padding: '0', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 22px', gap: '12px', textAlign: 'inherit' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontSize: '16px', fontWeight: 700 }}>
          {icon}
          <span>{title}</span>
          {messages.length > 0 && (
            <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '20px', padding: '2px 9px', fontSize: '12px', fontWeight: 800 }}>
              {messages.length}
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
      </button>

      {isOpen && (
        <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column' }}>
          <div ref={scrollContainerRef} style={{ minHeight: '180px', maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px', paddingRight: isRtl ? '0' : '4px', paddingLeft: isRtl ? '4px' : '0' }}>
            {messages.length === 0 ? (
              <p style={{ color: '#94a3b8', margin: 'auto 0', textAlign: 'center' }}>{emptyText}</p>
            ) : messages.map(message => {
              const isInstructor = senderRoleClass(message) === 'instructor';
              const isMine = !isInstructor;
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
          <form onSubmit={(e) => { e.preventDefault(); if (!isSending) onSend(); }} style={{ display: 'flex', gap: '8px' }}>
            <input disabled={isSending} value={value} onChange={(e) => handleChange?.(e.target.value)} placeholder={placeholder} autoComplete="off" dir={isRtl ? 'rtl' : 'ltr'} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '10px', padding: '11px 14px', opacity: isSending ? 0.6 : 1, fontSize: '15px' }} />
            <button type="submit" disabled={isSending} className="btn-luxe primary" style={{ padding: '10px 16px', minWidth: '50px' }}>
              {isSending ? <Loader2 size={18} className="spin-icon" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function StudentGroups({ t, isRtl, setCurrentPage, setSelectedCourseId, setSelectedComponentsForQuiz, setActiveGroupQuiz, onDetailModeChange }) {
  const tt = (key, fallback) => t?.[key] || fallback;
  const label = (key, en, ar) => tt(key, isRtl ? ar : en);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupView, setGroupView] = useState('list');
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [publicMessages, setPublicMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [publicText, setPublicText] = useState('');
  const [privateText, setPrivateText] = useState('');
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [openingGroupId, setOpeningGroupId] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isSendingPublic, setIsSendingPublic] = useState(false);
  const [isSendingPrivate, setIsSendingPrivate] = useState(false);
  const selectedGroupRef = useRef(null);
  const videoRef = useRef(null);
  const scanTimerRef = useRef(null);
  const streamRef = useRef(null);

  const clearActiveGroup = () => {
    setSelectedGroup(null);
    selectedGroupRef.current = null;
    setPublicMessages([]);
    setPrivateMessages([]);
    setGroupView('list');
  };

  const loadGroups = async () => {
    const res = await api.get('/groups/my');
    if (!res.ok) return;

    const nextGroups = res.data || [];
    setGroups(nextGroups);

    if (nextGroups.length === 0) {
      clearActiveGroup();
      return;
    }

    const activeId = selectedGroupRef.current?.id;
    if (activeId && !nextGroups.some(group => group.id === activeId)) {
      clearActiveGroup();
    }
  };

  const loadGroup = async (groupId, navigate = true) => {
    const res = await api.get(`/groups/${groupId}`);
    if (!res.ok) return false;

    setSelectedGroup(res.data);
    selectedGroupRef.current = res.data;
    if (navigate) setGroupView('detail');

    const [publicRes, privateRes] = await Promise.all([
      api.get(`/groups/${groupId}/messages/public`),
      res.data.viewer?.id ? api.get(`/groups/${groupId}/messages/private/${res.data.viewer.id}`) : Promise.resolve(null),
    ]);
    setPublicMessages(publicRes?.ok ? publicRes.data : []);
    setPrivateMessages(privateRes?.ok ? privateRes.data : []);
    return true;
  };

  useEffect(() => {
    loadGroups();
    const socket = new WebSocket(api.wsUrl('/groups/ws'));
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const active = selectedGroupRef.current;
      if (payload.type === 'group_public_message' && active?.id === payload.groupId) {
        setPublicMessages(prev => prev.some(msg => msg.id === payload.message.id) ? prev : [...prev, payload.message]);
      }
      if (payload.type === 'group_private_message' && active?.id === payload.groupId) {
        setPrivateMessages(prev => prev.some(msg => msg.id === payload.message.id) ? prev : [...prev, payload.message]);
      }
      if (payload.type === 'group_member_removed' && active?.id === payload.groupId && active?.viewer?.id === payload.studentId) {
        clearActiveGroup();
        loadGroups();
        return;
      }
      if (['group_member_joined', 'group_member_added', 'group_member_removed', 'group_resource_created', 'group_progress_updated', 'group_quiz_assigned'].includes(payload.type)) {
        loadGroups();
        if (active?.id === payload.groupId) loadGroup(active.id, false);
      }
    };
    return () => socket.close();
  }, []);

  const joinGroup = async (codeOverride = '') => {
    const code = (codeOverride || joinCode).trim();
    if (!code) return;
    setIsJoining(true);
    const res = await api.post('/groups/join', { join_code: code });
    setIsJoining(false);
    if (res.ok) {
      setJoinCode('');
      setShowJoinModal(false);
      await loadGroups();
      await loadGroup(res.data.id, true);
    } else {
      alert(res.message || tt('unableJoinGroup', 'Unable to join group.'));
    }
  };

  const stopScanner = () => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks()?.forEach(track => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  };

  const startScanner = async () => {
    setScanError('');
    if (!('BarcodeDetector' in window)) {
      setScanError(tt('qrUnsupported', 'QR scanning is not supported in this browser. Type the join code instead.'));
      return;
    }
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_39', 'code_128'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsScanning(true);
      scanTimerRef.current = setInterval(async () => {
        const codes = await detector.detect(videoRef.current);
        const raw = codes?.[0]?.rawValue;
        if (!raw) return;
        const parsed = raw.match(/\b\d{4}\b/)?.[0] || raw;
        const cleanCode = parsed.replace(/\D/g, '').slice(0, 4);
        stopScanner();
        setJoinCode(cleanCode);
        joinGroup(cleanCode);
      }, 800);
    } catch (err) {
      setScanError(err.message || tt('cameraStartError', 'Unable to start camera scanner.'));
      stopScanner();
    }
  };

  const sendPublic = async () => {
    if (!selectedGroup || !publicText.trim() || isSendingPublic) return;
    setIsSendingPublic(true);
    try {
      const res = await api.post(`/groups/${selectedGroup.id}/messages/public`, { content: publicText.trim() });
      if (res.ok) {
        setPublicText('');
        setPublicMessages(prev => prev.some(msg => msg.id === res.data.id) ? prev : [...prev, res.data]);
      }
    } finally { setIsSendingPublic(false); }
  };

  const sendPrivate = async () => {
    if (!selectedGroup || !privateText.trim() || isSendingPrivate) return;
    setIsSendingPrivate(true);
    try {
      const res = await api.post(`/groups/${selectedGroup.id}/messages/private`, { content: privateText.trim() });
      if (res.ok) {
        setPrivateText('');
        setPrivateMessages(prev => prev.some(msg => msg.id === res.data.id) ? prev : [...prev, res.data]);
      }
    } finally { setIsSendingPrivate(false); }
  };

  const startAssignedQuiz = (quiz) => {
    if (!selectedGroup || !quiz) return;
    setSelectedCourseId?.(selectedGroup.courseId);
    setSelectedComponentsForQuiz?.([]);
    setActiveGroupQuiz?.({
      groupId: selectedGroup.id,
      assignmentId: quiz.id,
      title: quiz.title,
      attempt: quiz.attempt,
    });
    setCurrentPage?.('quiz');
  };

  const openStudentGroup = async (groupId) => {
    stopScanner();
    setOpeningGroupId(groupId);
    await loadGroup(groupId, true);
    setOpeningGroupId(null);
  };

  const currentMember = selectedGroup?.members?.find(member => member.student?.id === selectedGroup.viewer?.id);
  const mastery = currentMember?.averageMastery ?? selectedGroup?.averageMastery ?? 0;
  const kcChartData = (currentMember?.components || []).map(comp => ({
    name: comp.name,
    mastery: comp.mastery || 0,
  }));
  const topicLabel = (count) => count === 1 ? tt('topicSingle', 'topic') : tt('topicsPlural', 'topics');
  const quizCount = selectedGroup?.quizzes?.length || 0;
  const resourceCount = selectedGroup?.resources?.length || 0;
  const isDetailView = groupView === 'detail' && selectedGroup;

  useEffect(() => {
    if (isDetailView) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isDetailView]);

  useEffect(() => {
    onDetailModeChange?.(Boolean(isDetailView));
  }, [isDetailView, onDetailModeChange]);

  return (
    <section className={`student-groups-panel student-groups-pro dashboard-surface ${isDetailView ? 'student-groups-detail-mode' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {isDetailView ? (
        <>
          <div className="student-group-page-header">
            <button type="button" onClick={clearActiveGroup} className="student-action-button">
              <ArrowLeft size={17} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} /> {tt('studentGroupsTitle', 'My Groups')}
            </button>
            <div className="student-group-page-title">
              <span className="student-kicker">{label('currentGroup', 'Current group', 'Current group')}</span>
              <h2><span className="student-title-icon"><BookOpen size={22} /></span>{selectedGroup.name}</h2>
              <p>{selectedGroup.courseName}</p>
            </div>
            <div className="student-group-page-stats" aria-label={tt('groupSummary', 'Group summary')}>
              <span>{mastery}% {tt('mastery', 'Mastery')}</span>
              <span>{quizCount} {tt('quizzes', 'Quizzes')}</span>
              <span>{resourceCount} {tt('resources', 'Resources')}</span>
            </div>
          </div>

          <div className="student-group-layout">
            <aside className="student-group-sidebar">
              <div className="student-group-card">
                <div className="student-card-heading">
                  <h4><FileText size={18} /> <span>{label('resourceLibrary', 'Resource library', 'Resource library')}</span></h4>
                </div>
                {selectedGroup.resources?.length ? selectedGroup.resources.map(resource => (
                  <button key={`${resource.documentId || resource.id}`} type="button" onClick={() => openResource(resource)} className="student-resource-row"><FileText size={15} /> <span>{resource.text}</span></button>
                )) : <div className="student-empty-state small">{tt('noResourcesYet', 'No resources yet.')}</div>}
              </div>
            </aside>

            <div className="student-group-main">
              <div className="student-group-card student-quiz-card">
                <div className="student-card-heading">
                  <h4><ClipboardList size={18} /> <span>{tt('assignedQuizzes', 'Assigned Quizzes')}</span></h4>
                  <span className="student-count-pill">{quizCount}</span>
                </div>
                {selectedGroup.quizzes?.length ? selectedGroup.quizzes.map(quiz => (
                  <div key={quiz.id} className="student-quiz-row">
                    <div>
                      <strong>{quiz.title}</strong>
                      <span>{quiz.componentCount} {topicLabel(quiz.componentCount)} {quiz.attempt ? `- ${quiz.attempt.answerCount} ${tt('answered', 'answered')}` : ''}</span>
                    </div>
                    <button onClick={() => startAssignedQuiz(quiz)} className="student-action-button primary"><Award size={16} /> {quiz.attempt ? tt('continue', 'Continue') : tt('start', 'Start')}</button>
                  </div>
                )) : <div className="student-empty-state small">{tt('noAssignedQuizzes', 'No assigned quizzes yet.')}</div>}
              </div>

              <div className="student-group-card" style={{ padding: '0', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setShowChat(v => !v)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '20px 24px' }}
                >
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontSize: '17px', fontWeight: 700 }}>
                    <MessageSquare size={20} color="#3b82f6" />
                    {tt('discussions', 'Discussions & Chat')}
                  </h4>
                  {showChat ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                </button>
                {showChat && (
                  <div className="student-chat-grid" style={{ padding: '0 20px 20px' }}>
                    <ChatBox isRtl={isRtl} title={tt('publicGroupChat', 'Public Group Chat')} icon={<MessageSquare size={20} color="#3b82f6" />} messages={publicMessages} value={publicText} setValue={setPublicText} onSend={sendPublic} isSending={isSendingPublic} emptyText={tt('noMessagesYet', 'No messages yet.')} placeholder={tt('writeMessage', 'Write a message...')} />
                    <ChatBox isRtl={isRtl} title={tt('privateChatWithInstructor', 'Private Chat With Instructor')} icon={<Lock size={20} color="#f59e0b" />} messages={privateMessages} value={privateText} setValue={setPrivateText} onSend={sendPrivate} isSending={isSendingPrivate} emptyText={tt('noMessagesYet', 'No messages yet.')} placeholder={tt('writeMessage', 'Write a message...')} />
                  </div>
                )}
              </div>

              <div className="student-group-card dashboard-surface" style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '18px' }}>
                  <Layers size={20} color="#3b82f6" /> <span>{tt('myProgress', 'My Progress')}</span>
                </h4>
                {kcChartData.length > 0 ? (
                  <div style={{ minHeight: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={kcChartData}
                        margin={{ top: 10, right: 20, left: isRtl ? 10 : 45, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                          interval={0}
                          height={120}
                          tick={<CustomXAxisTick isRtl={isRtl} />}
                        />
                        <YAxis
                          orientation={isRtl ? 'right' : 'left'}
                          domain={[0, 100]}
                          stroke="#94a3b8"
                          width={isRtl ? 80 : 85}
                          tickMargin={isRtl ? 35 : 12}
                          tick={{ fill: '#334155', fontSize: 16, fontWeight: '900' }}
                          ticks={[0, 25, 50, 75, 100]}
                          tickFormatter={(val) => `${val}%`}
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
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="student-groups-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div className="student-groups-heading">
              <span className="student-kicker">{label('learningSpace', 'Learning space', 'Learning space')}</span>
              <h2><span className="student-title-icon"><Users size={22} /></span>{tt('studentGroupsTitle', 'My Groups')}</h2>
              <p style={{ margin: 0 }}>{tt('studentGroupsSubtitle', 'Access your group resources and quizzes.')}</p>
            </div>

            <button type="button" onClick={() => setShowJoinModal(true)} className="btn-luxe primary" style={{ padding: '10px 20px', fontSize: '15px' }}>
              <Plus size={18} /> {tt('joinGroupTitle', 'Join Group')}
            </button>
          </div>

          <div className="student-group-tabs student-group-list-grid" aria-label={label('joinedGroups', 'Joined groups', 'Joined groups')} style={{ marginTop: '25px' }}>
            {groups.length === 0 ? (
              <div className="student-empty-state">{tt('noGroupsJoined', 'You have not joined any groups yet.')}</div>
            ) : groups.map(group => (
              <button key={group.id} disabled={openingGroupId === group.id} onClick={() => openStudentGroup(group.id)} className="student-group-tab student-group-list-card" aria-label={`${tt('studentGroupsTitle', 'My Groups')}: ${group.name}`}>
                <span className="student-group-card-top">
                  <span className="student-group-list-icon">{openingGroupId === group.id ? <Loader2 size={18} className="spin-icon" /> : <Users size={18} />}</span>
                  <span>
                    <span className="student-group-tab-name">{group.name}</span>
                    <span className="student-group-tab-course">{group.courseName}</span>
                  </span>
                </span>
                <span className="student-group-card-meta">
                  <span>{group.studentCount || 0} {tt('students', 'students')}</span>
                </span>
              </button>
            ))}
          </div>

          {showJoinModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
              <div className="luxe-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                <button type="button" onClick={() => { setShowJoinModal(false); stopScanner(); }} style={{ position: 'absolute', top: '20px', right: isRtl ? 'auto' : '20px', left: isRtl ? '20px' : 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
                <h3 style={{ margin: '0 0 24px', color: '#0f172a', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <QrCode size={22} color="#3b82f6" /> {tt('joinWithCodeOrScanQr', 'Join Group')}
                </h3>
                
                <form onSubmit={(event) => { event.preventDefault(); joinGroup(); }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>{label('joinCode', 'Join code', 'Join code')}</label>
                      <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" inputMode="numeric" maxLength={4} style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '14px', fontSize: '24px', textAlign: 'center', letterSpacing: '12px', outline: 'none', transition: 'border-color 0.2s', color: '#0f172a', fontWeight: 800, boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" disabled={isJoining || joinCode.length < 4} className="btn-luxe primary" style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '15px' }}>
                        {isJoining ? <Loader2 size={18} className="spin-icon" /> : tt('join', 'Join')}
                      </button>
                      <button type="button" onClick={isScanning ? stopScanner : startScanner} className="btn-luxe" title={isScanning ? label('stopScan', 'Stop scan', 'Stop scan') : label('scanQr', 'Scan QR', 'Scan QR')} style={{ padding: '12px 16px' }}>
                        {isScanning ? <X size={20} /> : <QrCode size={20} color="#3b82f6" />}
                      </button>
                    </div>
                  </div>
                </form>

                {(isScanning || scanError) && (
                  <div style={{ marginTop: '20px', borderRadius: '12px', overflow: 'hidden', background: '#0f172a', border: '1px solid #e2e8f0' }}>
                    <video ref={videoRef} style={{ display: isScanning ? 'block' : 'none', width: '100%', height: 'auto', minHeight: '200px', objectFit: 'cover' }} muted playsInline />
                    {scanError && <p style={{ color: '#ef4444', padding: '12px', textAlign: 'center', margin: 0, background: '#fef2f2', fontSize: '14px', fontWeight: 600 }}>{scanError}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
