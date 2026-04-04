import { useState } from 'react';
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
    manageSubjects: "Organize and track your learning progress.",
    addSubject: "Add New Subject",
    subjectName: "Subject Name",
    tasksCompleted: "tasks completed",
    noSubjects: "No subjects added yet. Start by adding one!",
    activeSubjects: "Active Subjects",
    completedSubjects: "Completed Subjects",
    searchPlaceholder: "Search subjects...",
    backToDashboard: "Back to Command Center",
    addTask: "Add new task...",
    noTasksYet: "No tasks added yet.",
    profile: "Profile Management",
    profileSub: "Manage your personal account details securely.",
    profileSaved: "Profile successfully updated!",
    adminPanel: "Admin Panel",
    platformAnalytics: "Platform Analytics",
    platformAnalyticsSub: "Monitor overall engagement and system trends.",
    totalUsers: "Total Users",
    activeCourses: "Active Courses",
    systemHealth: "System Health",
    userAdmin: "User Administration",
    manageUsers: "Manage Accounts",
    searchUsers: "Search users...",
    n1: "Real-time Analytics",
    n2: "Knowledge Tracing",
    n3: "Adaptive Pathing",
    n4: "Mastery Evaluation",
    footerTagline: "Empowering the future through intelligent, adaptive AI education.",
    footerSupport: "Support",
    footerDocumentation: "Documentation",
    footerSupportCenter: "Support Center",
    footerCompany: "Company",
    footerAboutUs: "About Us",
    footerContactUs: "Contact Us",
    rightsReserved: "All rights reserved. © 2026 Massar AI"
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
    manageSubjects: "تنظيم وتتبع تقدمك في التعلم.",
    addSubject: "إضافة مادة جديدة",
    subjectName: "اسم المادة",
    tasksCompleted: "مهمة منجزة",
    noSubjects: "لم يتم إضافة مواد بعد. ابدأ بإضافة واحدة!",
    activeSubjects: "المواد النشطة",
    completedSubjects: "المواد المكتملة",
    searchPlaceholder: "ابحث عن المواد...",
    backToDashboard: "العودة لمركز القيادة",
    addTask: "إضافة مهمة جديدة...",
    noTasksYet: "لم يتم إضافة مهام بعد.",
    profile: "إدارة الملف الشخصي",
    profileSub: "أدر تفاصيل حسابك الشخصي بأمان.",
    profileSaved: "تم تحديث الملف الشخصي بنجاح!",
    adminPanel: "لوحة تحكم المشرف",
    platformAnalytics: "تحليلات المنصة",
    platformAnalyticsSub: "مراقبة التفاعل والاتجاهات العامة للمنصة.",
    totalUsers: "إجمالي المستخدمين",
    activeCourses: "المواد النشطة",
    systemHealth: "صحة النظام",
    userAdmin: "إدارة المستخدمين",
    manageUsers: "إدارة الحسابات",
    searchUsers: "البحث عن مستخدمين...",
    n1: "تحليلات البيانات الفورية",
    n2: "تتبع المعرفة الدقيق",
    n3: "المسار التعليمي التكيفي",
    n4: "تقييم مستوى الإتقان",
    footerTagline: "تمكين المستقبل من خلال الذكاء الاصطناعي التعليمي التكيفي.",
    footerSupport: "الدعم",
    footerDocumentation: "التوثيق",
    footerSupportCenter: "مركز المساعدة",
    footerCompany: "الشركة",
    footerAboutUs: "من نحن",
    footerContactUs: "تواصل معنا",
    rightsReserved: "جميع الحقوق محفوظة. © 2026 مسار"
  }
};

function App() {
  // Global State
  const [language, setLanguage] = useState('en');
  const t = translations[language];

  // Routing State
  const [currentPage, setCurrentPage] = useState('home');

  // Security State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: 'Student User', email: '' });
  const [authToken, setAuthToken] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // App-level handlers
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setAuthToken(null);
    setCurrentUser({ name: 'Student User', email: '' });
    setCurrentPage('home');
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

          <button className="nav-link" onClick={() => { setCurrentPage('home'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
            <HomeIcon size={16} /> {t.home}
          </button>

          {isLoggedIn && (
            <>
              <button className="nav-link" onClick={() => { setCurrentPage('dashboard'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                <LayoutDashboard size={16} /> {t.dashboard}
              </button>
              <button className="nav-link" onClick={() => { setCurrentPage('profile'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                <User size={16} /> {t.profile || 'Profile'}
              </button>
              {isAdmin && (
                <button className="nav-link" onClick={() => { setCurrentPage('admin'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#60a5fa', justifyContent: 'center' }}>
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
          <Home t={t} goSignUp={goSignUp} isLoggedIn={isLoggedIn} />
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
          <Dashboard t={t} />
        )}

        {currentPage === 'profile' && isLoggedIn && (
          <Profile t={t} onBack={() => setCurrentPage('dashboard')} currentUser={currentUser} setCurrentUser={setCurrentUser} authToken={authToken} />
        )}

        {currentPage === 'admin' && isLoggedIn && isAdmin && (
          <AdminDashboard t={t} authToken={authToken} />
        )}

      </main>
      
      <Footer t={t} />
      
    </div>
  );
}

export default App;
