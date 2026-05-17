import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Award, BookOpen, ClipboardList, FileText, Loader2, Lock, MessageSquare, QrCode, Send, Users, X } from 'lucide-react';
import { api, openResource } from '../services/api';

const instructorRoles = new Set(['teacher', 'admin', 'instructor']);

function senderRoleClass(message) {
  return instructorRoles.has(message.sender?.role) ? 'instructor' : 'student';
}

function ChatBox({ title, icon, messages, value, onChange, setValue, onSend, emptyText, placeholder, isRtl }) {
  const handleChange = onChange || setValue;

  return (
    <div className="student-group-card student-chat-card">
      <div className="student-card-heading">
        <h4>{icon}<span>{title}</span></h4>
        <span className="student-count-pill">{messages.length}</span>
      </div>
      <div className="student-chat-list">
        {messages.length === 0 ? (
          <div className="student-empty-state small">{emptyText}</div>
        ) : messages.map(message => (
          <div key={message.id} className="student-chat-message">
            <div className={`student-chat-sender ${senderRoleClass(message)}`}>{message.sender?.name || title}</div>
            <div className="student-chat-content">{message.content}</div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className="student-chat-form">
        <input value={value} onChange={(e) => handleChange?.(e.target.value)} placeholder={placeholder} autoComplete="off" dir={isRtl ? 'rtl' : 'ltr'} />
        <button type="submit" className="student-icon-button primary" aria-label={placeholder}><Send size={16} /></button>
      </form>
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
    if (!selectedGroup || !publicText.trim()) return;
    const res = await api.post(`/groups/${selectedGroup.id}/messages/public`, { content: publicText.trim() });
    if (res.ok) {
      setPublicText('');
      setPublicMessages(prev => prev.some(msg => msg.id === res.data.id) ? prev : [...prev, res.data]);
    }
  };

  const sendPrivate = async () => {
    if (!selectedGroup || !privateText.trim()) return;
    const res = await api.post(`/groups/${selectedGroup.id}/messages/private`, { content: privateText.trim() });
    if (res.ok) {
      setPrivateText('');
      setPrivateMessages(prev => prev.some(msg => msg.id === res.data.id) ? prev : [...prev, res.data]);
    }
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

  const openStudentGroup = (groupId) => {
    stopScanner();
    loadGroup(groupId, true);
  };

  const currentMember = selectedGroup?.members?.find(member => member.student?.id === selectedGroup.viewer?.id);
  const mastery = currentMember?.averageMastery ?? selectedGroup?.averageMastery ?? 0;
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
              <div className="student-group-summary-card">
                <div className="student-summary-heading">
                  <div>
                    <span>{label('currentGroup', 'Current group', 'Current group')}</span>
                    <h3><BookOpen size={18} />{selectedGroup.name}</h3>
                  </div>
                  <span className="student-course-pill">{selectedGroup.courseName}</span>
                </div>
                <div className="student-metrics-grid">
                  <div className="student-metric-card members">
                    <span>{tt('students', 'Students')}</span>
                    <strong>{selectedGroup.studentCount || 0}</strong>
                  </div>
                  <div className="student-metric-card mastery">
                    <span>{tt('mastery', 'Mastery')}</span>
                    <strong>{mastery}%</strong>
                  </div>
                  <div className="student-metric-card quizzes">
                    <span>{tt('quizzes', 'Quizzes')}</span>
                    <strong>{quizCount}</strong>
                  </div>
                  <div className="student-metric-card resources">
                    <span>{tt('resources', 'Resources')}</span>
                    <strong>{resourceCount}</strong>
                  </div>
                </div>
              </div>

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

              <div className="student-chat-grid">
                <ChatBox isRtl={isRtl} title={tt('publicGroupChat', 'Public Group Chat')} icon={<MessageSquare size={18} />} messages={publicMessages} value={publicText} setValue={setPublicText} onSend={sendPublic} emptyText={tt('noMessagesYet', 'No messages yet.')} placeholder={tt('writeMessage', 'Write a message...')} />
                <ChatBox isRtl={isRtl} title={tt('privateChatWithInstructor', 'Private Chat With Instructor')} icon={<Lock size={18} />} messages={privateMessages} value={privateText} setValue={setPrivateText} onSend={sendPrivate} emptyText={tt('noMessagesYet', 'No messages yet.')} placeholder={tt('writeMessage', 'Write a message...')} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="student-groups-topbar">
            <div className="student-groups-heading">
              <span className="student-kicker">{label('learningSpace', 'Learning space', 'Learning space')}</span>
              <h2><span className="student-title-icon"><Users size={22} /></span>{tt('studentGroupsTitle', 'My Groups')}</h2>
              <p>{tt('studentGroupsSubtitle', 'Join with a code or scan the QR code to access group resources.')}</p>
            </div>

            <form className="student-join-card" onSubmit={(event) => { event.preventDefault(); joinGroup(); }}>
              <label>{tt('joinWithCodeOrScanQr', 'Join with Code or Scan QR code')}</label>
              <div className="student-join-controls">
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" inputMode="numeric" maxLength={4} aria-label={label('joinCode', 'Join code', 'Join code')} />
                <button type="submit" disabled={isJoining} className="student-action-button primary">{isJoining ? <Loader2 size={16} className="spin-icon" /> : tt('join', 'Join')}</button>
                <button type="button" onClick={isScanning ? stopScanner : startScanner} className="student-icon-button" title={isScanning ? label('stopScan', 'Stop scan', 'Stop scan') : label('scanQr', 'Scan QR', 'Scan QR')}>
                  {isScanning ? <X size={17} /> : <QrCode size={17} />}
                </button>
              </div>
            </form>
          </div>

          {(isScanning || scanError) && (
            <div className="student-scanner-panel">
              <video ref={videoRef} style={{ display: isScanning ? 'block' : 'none' }} muted playsInline />
              {scanError && <p>{scanError}</p>}
            </div>
          )}

          <div className="student-group-tabs student-group-list-grid" aria-label={label('joinedGroups', 'Joined groups', 'Joined groups')}>
            {groups.length === 0 ? (
              <div className="student-empty-state">{tt('noGroupsJoined', 'You have not joined any groups yet.')}</div>
            ) : groups.map(group => (
              <button key={group.id} onClick={() => openStudentGroup(group.id)} className="student-group-tab student-group-list-card" aria-label={`${tt('studentGroupsTitle', 'My Groups')}: ${group.name}`}>
                <span className="student-group-card-top">
                  <span className="student-group-list-icon"><Users size={18} /></span>
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
        </>
      )}
    </section>
  );
}
