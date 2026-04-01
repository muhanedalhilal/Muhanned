import { useState } from 'react';
import './index.css';

// Import our beautiful modular components!
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';

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
    statTasks: "Pending Assessments"
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
    statTasks: "التقييمات المعلقة"
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

  // App-level handlers
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('home');
  };

  const handleSecureLogin = () => {
    setIsLoggedIn(true);
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
      </div>

      {/* Global Navigation Header */}
      <nav className="navbar" style={isRtl ? {flexDirection: 'row-reverse'} : {}}>
        <div className="nav-logo" onClick={() => setCurrentPage('home')} style={isRtl ? {flexDirection: 'row-reverse'} : {}}>
          <img src="/logo.png" alt="Massar Logo" onError={(e) => { e.target.src = 'https://via.placeholder.com/60x60/2b4a8e/ffffff?text=M' }} />
          <span className="nav-brand-text">{t.appName}</span>
        </div>
        
        <div className="nav-links" style={isRtl ? {flexDirection: 'row-reverse'} : {}}>
          <button className="nav-link" onClick={() => setLanguage(isRtl ? 'en' : 'ar')}>{isRtl ? 'English' : 'عربي'}</button>
          
          <button className="nav-link" onClick={() => setCurrentPage('home')}>{t.home}</button>
          
          {isLoggedIn && (
            <button className="nav-link" onClick={() => setCurrentPage('dashboard')}>{t.dashboard}</button>
          )}

          {!isLoggedIn ? (
            <button className="nav-btn primary" onClick={goLogin}>{t.login}</button>
          ) : (
            <button className="nav-btn danger" onClick={handleLogout}>{t.logout}</button>
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

      </main>
    </div>
  );
}

export default App;
