import { useState, useEffect } from 'react';
import './index.css';

// Import our beautiful modular components!
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Footer from './components/Footer';
import { User, Settings, Menu, X, Globe, ChevronDown, Home as HomeIcon, LayoutDashboard, LogOut, LogIn } from 'lucide-react';

// Centralized Translation Dictionary
const translations = {
  en: {
    appName: "MASSAR",
    home: "Home",
    dashboard: "Student Dashboard",
    login: "Login",
    logout: "Log Out",
    heroTitle: "Intelligent Pathways to Mastery",
    heroSubtitle: "Massar uses advanced Artificial Intelligence to dynamically evaluate your performance and build a customized educational journey just for you.",
    startLearning: "Start Learning Now",
    feat1Title: "Adaptive AI Assessment",
    feat1Desc: "Our smart engine constantly evaluates your skill level to pinpoint exact knowledge gaps.",
    feat2Title: "Dynamic Skill Trees",
    feat2Desc: "Learning paths dynamically restructure themselves in real-time based on your progression.",
    feat3Title: "Real-time Mastery Tracking",
    feat3Desc: "Visualize your entire cognitive growth with advanced metrics and performance charts.",
    engineTitle: "Powered by Cognitive AI",
    welcomeBack: "Welcome Back",
    joinSystem: "Join Massar",
    authSubLogin: "Authenticate to access your personalized learning profile.",
    authSubSignup: "Complete your profile to begin learning.",
    fullName: "Full Name",
    email: "Student Email",
    password: "Secure Password",
    signIn: "Sign In",
    signUp: "Sign Up",
    noAccount: "Don't have an account? ",
    haveAccount: "Already have an account? ",
    clickSignUp: "Sign up here",
    clickSignIn: "Sign in here",
    dashWelcome: "Welcome to your Personal AI Profile",
    dashSub: "Your live learning analytics are securely protected.",
    statMastery: "Overall Knowledge Mastery",
    statCourses: "Active Modules",
    statTasks: "Pending Assessments",
    commandCenter: "Learning Command Center",
    manageCourses: "Organize and track your learning progress.",
    addCourse: "Add New Course",
    courseName: "Course Name",
    componentsCompleted: "components completed",
    noCourses: "No courses added yet. Start by adding one!",
    activeCourses: "Active Courses",
    completedCourses: "Completed Courses",
    searchPlaceholder: "Search courses...",
    backToDashboard: "Back to Command Center",
    addTask: "Add new task...",
    noTasksYet: "No tasks added yet.",
    addComponent: "Add new component...",
    noComponentsYet: "No components added yet.",
    mastery: "Mastery",
    growthTimeline: "Cognitive Growth Timeline",
    masteredTask: "Completed",
    joinedPlatform: "Joined Massar",
    masteredLinearAlgebra: "Completed: Linear Algebra Worksheet",
    platform: "Platform",
    mathSubject: "Mathematics",
    csSubject: "Computer Science",
    historySubject: "World History",
    literatureSubject: "Literature",
    startQuiz: "Start the quiz",
    progressDiagram: "Progress Diagram",
    resourcesLearningAssets: "Resources & Learning Assets",
    addResources: "Add Resources (PDF/PPTX)",
    addingResource: "Adding Resource...",
    open: "Open",
    profile: "Profile Management",
    profileSub: "Manage your personal account details securely.",
    authArtSubtitle: "The Adaptive AI learning engine that constantly evaluates your cognitive progress.",
    neuralEngineOnline: "Neural Engine Online",
    profileSaved: "Profile successfully updated!",
    adminPanel: "Admin Panel",
    platformAnalytics: "Platform Analytics",
    platformAnalyticsSub: "Monitor overall engagement and system trends.",
    totalUsers: "Total Users",
    systemHealth: "System Health",
    userAdmin: "User Administration",
    manageUsers: "Manage Accounts",
    searchUsers: "Search users...",
    n1: "Real-time Analytics",
    n1Desc: "We discover how you learn best.",
    n2: "Knowledge Tracing",
    n2Desc: "Creating your personal roadmap.",
    n3: "Adaptive Pathing",
    n3Desc: "Content that grows with you.",
    n4: "Mastery Evaluation",
    n4Desc: "Proving your new skills.",
    footerTagline: "Empowering the future through intelligent, adaptive AI education.",
    footerSupport: "Support",
    footerDocumentation: "Documentation",
    footerSupportCenter: "Support Center",
    footerCompany: "Company",
    footerAboutUs: "About Us",
    footerContactUs: "Contact Us",
    rightsReserved: "All rights reserved. © 2026 Massar AI",
    components: "Components",
    generateComponents: "Generate Components",
    generating: "Generating...",
    saveChanges: "Save Changes",
    noResourcesYet: "No resources added yet. Add a PDF or PPTX to begin.",
    noMatchesFound: "No matches found...",
    poweredBy: "Powered by Bayesian Knowledge Tracing (BKT)",
    visionLabel: "Our Vision",
    visionTitleMain: "Education That Thinks ",
    visionTitleHighlight: "With You",
    visionSubtitle: "We believe every student deserves a learning experience as unique as their mind. Massar was built to eliminate the \"one-size-fits-all\" approach by placing cognitive science and artificial intelligence at the heart of every lesson.",
    visionCard1Title: "Our Vision",
    visionCard1Text: "A world where no student is left behind because the system couldn't adapt. We envision AI-powered education as the great equalizer — available to every student, everywhere.",
    visionCard2Title: "Our Mission",
    visionCard2Text: "To build the most intelligent adaptive learning engine ever deployed — one that continuously learns how you learn, and builds a curriculum that meets you exactly where you are.",
    visionCard3Title: "Our Values",
    visionCard3Text: "Transparency in AI, fairness in assessment, and relentless pursuit of mastery. We measure our success by how far each student travels from where they started.",
    processLabel: "Process",
    howItWorksTitle: "How Massar Works",
    step1Title: "You Start Learning",
    step1Desc: "Begin any module. Massar silently observes how you interact with content and problems.",
    step2Title: "AI Builds Your Model",
    step2Desc: "Our BKT engine calculates your real knowledge probability per topic — not just a score.",
    step3Title: "Path Adapts Instantly",
    step3Desc: "Content difficulty, order, and type are dynamically adjusted based on your live model.",
    step4Title: "Mastery Is Proven",
    step4Desc: "You advance only when the system is statistically confident you've truly mastered the concept.",
    peopleLabel: "Our People",
    teamTitle: "Meet The Team",
    teamRolePM: "Project Manager",
    teamRoleBackend: "Backend Infrastructure",
    teamRoleFrontend: "Frontend Engineering",
    ctaReady: "Ready to Master Anything?",
    ctaJoin: "Join thousands of students building real knowledge — not just passing grades.",
    ctaFree: "Free to start",
    ctaNoCard: "No credit card required",
    ctaBilingual: "Bilingual (AR/EN)"
  },
  ar: {
    appName: "مسار",
    home: "الرئيسية",
    dashboard: "لوحة تحكم الطالب",
    login: "الدخول",
    logout: "تسجيل الخروج",
    heroTitle: "مسارات ذكية نحو الإتقان",
    heroSubtitle: "يستخدم مسار الذكاء الاصطناعي المتقدم لتقييم أدائك ديناميكيًا وبناء رحلة تعليمية مخصصة لك فقط.",
    startLearning: "ابدأ التعلم الآن",
    feat1Title: "التقييم الذكي المستمر",
    feat1Desc: "يقوم محركنا الذكي بتقييم مستوى مهاراتك بشكل مستمر لتحديد فجوات المعرفة بدقة.",
    feat2Title: "مسارات المهارات الديناميكية",
    feat2Desc: "تعيد مسارات التعلم هيكلة نفسها ديناميكيًا في الوقت الفعلي بناءً على تطور مستواك.",
    feat3Title: "تتبع الإتقان المباشر",
    feat3Desc: "تصور نموك المعرفي بالكامل باستخدام مقاييس متقدمة ومخططات أداء دقيقة.",
    engineTitle: "مدعوم بالذكاء الاصطناعي المعرفي",
    welcomeBack: "مرحباً بعودتك",
    joinSystem: "انضم إلى مسار",
    authSubLogin: "قم بتسجيل الدخول للوصول إلى ملف التعلم المخصص الخاص بك.",
    authSubSignup: "أكمل ملفك الشخصي لتبدأ التعلم.",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    noAccount: "ليس لديك حساب؟ ",
    haveAccount: "لديك حساب بالفعل؟ ",
    clickSignUp: "سجل من هنا",
    clickSignIn: "سجل دخولك هنا",
    dashWelcome: "مرحباً بك في ملفك الشخصي الشامل",
    dashSub: ".تحليلات التعلم المباشرة الخاصة بك محمية بأمان تام",
    statMastery: "إتقان المعرفة الشامل",
    statCourses: "الوحدات النشطة",
    statTasks: "التقييمات المعلقة",
    commandCenter: "مركز قيادة التعلم",
    manageCourses: "تنظيم وتتبع تقدمك في التعلم.",
    addCourse: "إضافة مقرر جديد",
    courseName: "اسم المقرر",
    componentsCompleted: "مكوّن منجز",
    noCourses: "لم يتم إضافة مقررات بعد. ابدأ بإضافة واحد!",
    activeCourses: "المقررات النشطة",
    completedCourses: "المقررات المكتملة",
    searchPlaceholder: "ابحث عن المقررات...",
    backToDashboard: "العودة لمركز القيادة",
    addTask: "إضافة مهمة جديدة...",
    noTasksYet: "لم يتم إضافة مهام بعد.",
    addComponent: "إضافة مكوّن جديد...",
    noComponentsYet: "لم يتم إضافة مكوّنات بعد.",
    mastery: "إتقان",
    growthTimeline: "الجدول الزمني للنمو المعرفي",
    masteredTask: "تم إنجاز",
    joinedPlatform: "انضم إلى مسار",
    masteredLinearAlgebra: "تم إنجاز: ورقة عمل الجبر الخطي",
    platform: "المنصة",
    mathSubject: "رياضيات",
    csSubject: "علوم الحاسب",
    historySubject: "تاريخ العالم",
    literatureSubject: "الأدب",
    startQuiz: "ابدأ الاختبار",
    progressDiagram: "مخطط التقدم",
    resourcesLearningAssets: "الموارد والأصول التعليمية",
    addResources: "إضافة موارد (PDF/PPTX)",
    addingResource: "جاري إضافة المورد...",
    open: "فتح",
    profile: "إدارة الملف الشخصي",
    profileSub: "أدر تفاصيل حسابك الشخصي بأمان.",
    authArtSubtitle: "محرك التعلم المعتمد على الذكاء الاصطناعي التكيفي الذي يقيم تقدمك المعرفي باستمرار.",
    neuralEngineOnline: "محرك الذكاء الاصطناعي (نشط)",
    profileSaved: "تم تحديث الملف الشخصي بنجاح!",
    adminPanel: "لوحة تحكم المشرف",
    platformAnalytics: "تحليلات المنصة",
    platformAnalyticsSub: "مراقبة التفاعل والاتجاهات العامة للمنصة.",
    totalUsers: "إجمالي المستخدمين",
    systemHealth: "صحة النظام",
    userAdmin: "إدارة المستخدمين",
    manageUsers: "إدارة الحسابات",
    searchUsers: "البحث عن مستخدمين...",
    n1: "تحليلات البيانات الفورية",
    n1Desc: "نكتشف كيف تتعلم بشكل أفضل.",
    n2: "تتبع المعرفة الدقيق",
    n2Desc: "إنشاء خارطة طريق شخصية لك.",
    n3: "المسار التعليمي التكيفي",
    n3Desc: "محتوى ينمو معك ويتطور بتطورك.",
    n4: "تقييم مستوى الإتقان",
    n4Desc: "إثبات مهاراتك الجديدة بدقة.",
    footerTagline: "تمكين المستقبل من خلال الذكاء الاصطناعي التعليمي التكيفي.",
    footerSupport: "الدعم",
    footerDocumentation: "التوثيق",
    footerSupportCenter: "مركز المساعدة",
    footerCompany: "الشركة",
    footerAboutUs: "من نحن",
    footerContactUs: "تواصل معنا",
    rightsReserved: "جميع الحقوق محفوظة. © 2026 مسار",
    components: "المكونات",
    generateComponents: "توليد المكونات",
    generating: "جاري التوليد...",
    saveChanges: "حفظ التغييرات",
    noResourcesYet: "لم يتم إضافة موارد بعد. أضف PDF أو PPTX للبدء.",
    noMatchesFound: "لم يتم العثور على نتائج...",
    poweredBy: "مدعوم بتتبع المعرفة البايزي (BKT)",
    visionLabel: "رؤيتنا",
    visionTitleMain: "تعليم يفكر ",
    visionTitleHighlight: "معك",
    visionSubtitle: "نؤمن بأن كل طالب يستحق تجربة تعليمية فريدة مثل عقله. لقد تم بناء مسار للقضاء على نهج \"مقاس واحد يناسب الجميع\" من خلال وضع العلوم المعرفية والذكاء الاصطناعي في صميم كل درس.",
    visionCard1Title: "رؤيتنا",
    visionCard1Text: "عالم لا يتخلف فيه أي طالب لأن النظام لم يتمكن من التكيف. نحن نتصور التعليم المدعوم بالذكاء الاصطناعي كمعادل عظيم — متاح لكل طالب، في كل مكان.",
    visionCard2Title: "مهمتنا",
    visionCard2Text: "بناء أذكى محرك تعلم تكيفي تم نشره على الإطلاق — محرك يتعلم باستمرار كيف تتعلم أنت، ويبني منهجًا يلتقي بك بالضبط حيث أنت.",
    visionCard3Title: "قيمنا",
    visionCard3Text: "الشفافية في الذكاء الاصطناعي، العدالة في التقييم، والسعي الدؤوب للإتقان. نحن نقيس نجاحنا بمدى التقدم الذي يحرزه كل طالب من النقطة التي بدأ منها.",
    processLabel: "العملية",
    howItWorksTitle: "كيف يعمل مسار",
    step1Title: "أنت تبدأ التعلم",
    step1Desc: "ابدأ أي وحدة. يراقب مسار بصمت كيف تتفاعل مع المحتوى والمشكلات.",
    step2Title: "الذكاء الاصطناعي يبني نموذجك",
    step2Desc: "يحسب محركنا الكفاءة المعرفية الفعلية لكل موضوع — وليس مجرد درجة.",
    step3Title: "المسار يتكيف فورًا",
    step3Desc: "يتم تعديل صعوبة المحتوى وترتيبه ونوعه ديناميكيًا بناءً على نموذجك المباشر.",
    step4Title: "يتم إثبات الإتقان",
    step4Desc: "أنت تتقدم فقط عندما يكون النظام واثقًا إحصائيًا من أنك أتقنت المفهوم حقًا.",
    peopleLabel: "فريقنا",
    teamTitle: "تعرف على الفريق",
    teamRolePM: "مدير المشروع",
    teamRoleBackend: "البنية التحتية للواجهة الخلفية",
    teamRoleFrontend: "هندسة الواجهة الأمامية",
    ctaReady: "مستعد لإتقان أي شيء؟",
    ctaJoin: "انضم إلى آلاف الطلاب الذين يبنون معرفة حقيقية — وليس مجرد درجات نجاح.",
    ctaFree: "ابدأ مجانًا",
    ctaNoCard: "لا يتطلب بطاقة ائتمان",
    ctaBilingual: "ثنائي اللغة (عربي/إنجليزي)"
  }
};

function App() {
  // Global State
  const [language, setLanguage] = useState('en');
  const t = translations[language];

  // Security State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: 'Student User', email: '' });
  const [authToken, setAuthToken] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine initial page based on session restoration
  const [currentPage, setCurrentPage] = useState('home');

  // Dashboard Sub-Routing State
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Restore session from localStorage on app load
  useEffect(() => {
    const savedSession = localStorage.getItem('massar_auth');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        setIsLoggedIn(true);
        setAuthToken(sessionData.token);
        setCurrentUser({ name: sessionData.name, email: sessionData.email });
        setIsAdmin(sessionData.role === 'admin');
        setCurrentPage('dashboard');
      } catch (error) {
        console.error("Failed to parse session", error);
        localStorage.removeItem('massar_auth');
      }
    }
  }, []);



  // App-level handlers
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setAuthToken(null);
    setCurrentUser({ name: 'Student User', email: '' });
    setCurrentPage('home');
    localStorage.removeItem('massar_auth');
  };

  const handleSecureLogin = (email = '', name = '', token = null, role = 'student') => {
    setIsLoggedIn(true);
    setAuthToken(token);
    let defaultName = name || 'Student User';
    if (!name && email) {
      defaultName = email.split('@')[0];
      // Capitalize the first letter if possible
      defaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
    }

    setCurrentUser({ name: defaultName, email: email || 'student@massar.edu' });
    // Use the actual role from the backend instead of guessing from email
    setIsAdmin(role === 'admin');
    setCurrentPage('dashboard');
    
    // Save to local storage to persist session
    localStorage.setItem('massar_auth', JSON.stringify({
      token: token,
      name: defaultName,
      email: email || 'student@massar.edu',
      role: role
    }));
  };

  const goSignUp = () => {
    setIsLoginView(false);
    setCurrentPage('auth');
  };

  const goLogin = () => {
    setIsLoginView(true);
    setCurrentPage('auth');
  };

  const isRtl = language === 'ar';

  return (
    <div className="app-container" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Universal Floating Particles */}
      <div className="background-elements">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      {/* Global Navigation Header */}
      <nav className="navbar" style={isRtl ? { flexDirection: 'row-reverse' } : {}}>
        <div className="nav-logo" onClick={() => setCurrentPage('home')} style={isRtl ? { flexDirection: 'row-reverse' } : {}}>
          <img src="/logo.png" alt="Massar Logo" onError={(e) => { e.target.src = 'https://via.placeholder.com/60x60/2b4a8e/ffffff?text=M' }} />
          <span className="nav-brand-text">{t.appName}</span>
        </div>

        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`} style={isRtl ? { flexDirection: 'row-reverse' } : {}}>
          <button
            className="lang-toggle-btn"
            onClick={() => { setLanguage(isRtl ? 'en' : 'ar'); setIsMobileMenuOpen(false); }}
          >
            <Globe size={16} color="#94a3b8" />
            <span>{isRtl ? 'English' : 'العربية'}</span>
            <ChevronDown size={14} color="#64748b" />
          </button>

          <button className={`nav-link ${currentPage === 'home' ? 'active' : ''}`} onClick={() => { setCurrentPage('home'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
            <HomeIcon size={16} /> {t.home}
          </button>

          {isLoggedIn && (
            <>
              <button className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => { setCurrentPage('dashboard'); setIsMobileMenuOpen(false); setSelectedCourseId(null); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                <LayoutDashboard size={16} /> {t.dashboard}
              </button>
              <button className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => { setCurrentPage('profile'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                <User size={16} /> {t.profile || 'Profile'}
              </button>
              {isAdmin && (
                <button className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`} onClick={() => { setCurrentPage('admin'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                  <Settings size={16} /> {t.adminPanel || 'Admin Panel'}
                </button>
              )}
            </>
          )}

          {!isLoggedIn ? (
            <button className="nav-btn primary" onClick={() => { goLogin(); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <LogIn size={18} /> {t.login}
            </button>
          ) : (
            <button className="nav-btn danger" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <LogOut size={18} /> {t.logout}
            </button>
          )}
        </div>
      </nav>

      <main className="main-content">

        {/* Dynamic Route Rendering utilizing the 'pages' Folder */}

        {currentPage === 'home' && (
          <Home t={t} goSignUp={goSignUp} isLoggedIn={isLoggedIn} setCurrentPage={setCurrentPage} />
        )}

        {currentPage === 'auth' && !isLoggedIn && (
          <Auth
            t={t}
            isLoginView={isLoginView}
            setIsLoginView={setIsLoginView}
            onSecureLogin={handleSecureLogin}
            isRtl={isRtl}
          />
        )}

        {currentPage === 'dashboard' && isLoggedIn && (
          <Dashboard
            t={t}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
          />
        )}

        {currentPage === 'profile' && isLoggedIn && (
          <Profile t={t} onBack={() => setCurrentPage('dashboard')} currentUser={currentUser} setCurrentUser={setCurrentUser} authToken={authToken} />
        )}

        {currentPage === 'admin' && isLoggedIn && isAdmin && (
          <AdminDashboard t={t} authToken={authToken} />
        )}

      </main>

      <Footer t={t} key={currentPage} />

    </div>
  );
}

export default App;
