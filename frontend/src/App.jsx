import { useState, useEffect } from 'react';
import './index.css';

// Import our beautiful modular components!
import Home from './pages/Home';
import About from './pages/About';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Quiz from './pages/Quiz';
import ResetPassword from './pages/ResetPassword';
import Footer from './components/Footer';
import { User, Users, Settings, Menu, X, Globe, ChevronDown, Home as HomeIcon, LayoutDashboard, LogOut, LogIn } from 'lucide-react';
import { api } from './services/api';

// Centralized Translation Dictionary
const translations = {
  en: {
    appName: "MASSAR",
    home: "Home",
    dashboard: "Student Dashboard",
    login: "Login",
    logout: "Log Out",
    heroTitle: "Massar: Your Best Educational Choice",
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
    authSubLogin: "Sign in and continue your learning.",
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
    backToDashboard: "Back to Student Dashboard",
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
    endQuiz: "End Quiz",
    footerTagline: "Empowering the future through intelligent, adaptive AI education.",
    footerSupport: "Support",
    footerDocumentation: "Documentation",
    footerSupportCenter: "Support Center",
    footerCompany: "Company",
    footerAboutUs: "About Us",
    footerContactUs: "Contact Us",
    rightsReserved: "All rights reserved.",
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
    ctaBilingual: "Bilingual (AR/EN)",
    adminName: "Name",
    adminRole: "Role",
    adminStatus: "Status",
    adminActions: "Actions",
    adminSearchEmpty: "No users found matching your search.",
    adminStudent: "Student",
    adminTeacher: "Teacher",
    adminAdmin: "Admin",
    adminActive: "Active",
    saveTitle: "Save",
    cancelTitle: "Cancel",
    noChartComponents: "Add components to see your progress chart.",
    courseDescriptionPlaceholder: "Description of the course (optional)",
    optionalField: "Optional",
    addResourcesOptional: "Add Resources (PDF/PPTX) — Optional",
    aiImageNotice: "AI will automatically generate a cover image for this course",
    creatingCourse: "Creating...",
    // Study Aids Translations
    summarySheet: "Summary Sheet",
    mindMap: "Mind Map",
    yourStudyAids: "Your Study Aids",
    downloadPDF: "Download PDF",
    generatingStudyAid: "Generating Study Aid...",
    aiCreatingMaterials: "Our AI is creating your personalized study materials.",
    generationFailed: "Generation Failed",
    generatedByAI: "Generated by Massar",
    studySummary: "Study Summary",
    topicSingle: "topic",
    topicsPlural: "topics",
    progressHover: "Progress:",
    // Quiz Translations
    quizEnd: "End",
    quizMastery: "Mastery",
    quizQuestion: "Question",
    quizCorrectTitle: "Correct! Great job.",
    quizIncorrectTitle: "Incorrect. The correct answer is: ",
    quizNextBtn: "Next Question →",
    quizNext: "Next Question",
    quizFinish: "Finish Quiz",
    quizLoadingMore: "Loading more...",
    quizMoreQuestions: "More Questions",
    quizResultsBtn: "View Results →",
    quizEndResultsBtn: "End Quiz and View Results",
    quizLoading: "Loading...",
    quizGenerating: "Generating quiz",
    quizFailed: "Quiz generation failed",
    quizBackToCourse: "Back to Course",
    quizComplete: "Quiz Complete",
    quizMsgExcellent: "Excellent work!",
    quizMsgGood: "Good effort — keep going!",
    quizMsgKeep: "Keep studying, you'll get there!",
    quizScore: "score",
    quizCorrect: "Correct",
    quizWrong: "Wrong",
    quizTotal: "Total",
    quizReturn: "Return to Course",
    quizCorrectSoFar: "correct so far"
  },
  ar: {
    appName: "مسار",
    home: "الرئيسية",
    dashboard: "لوحة الطالب",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    heroTitle: "مسار خيارك التعليمي الأفضل",
    heroSubtitle: "تُحلّل المنصة أداءك باستمرار وتبني لك مساراً تعليمياً مخصصاً يتناسب مع قدراتك ويواكب طريقتك الفريدة في التعلم.",
    startLearning: "ابدأ رحلتك التعليمية",
    feat1Title: "التقييم الذكي التكيّفي",
    feat1Desc: "يرصد الذكاء الاصطناعي مستوى إتقانك لكل مهارة ويحدد بدقة المجالات التي تحتاج إلى تطوير.",
    feat2Title: "مسارات تعلّم ديناميكية",
    feat2Desc: "تتكيّف مسارات التعلم تلقائياً بحسب مستوى تقدمك، لتضمن أن كل خطوة تبني على ما سبقها.",
    feat3Title: "تتبّع الإتقان في الوقت الفعلي",
    feat3Desc: "استعرض تطوّرك المعرفي بيانياً، وراقب إتقانك الدقيق في شتى المواضيع.",
    engineTitle: "مدعوم بالذكاء الاصطناعي المعرفي",
    welcomeBack: "أهلاً بك",
    joinSystem: "انضم إلى مسار",
    authSubLogin: "سجل الدخول وأكمل تعلمك",
    authSubSignup: "أنشئ حسابك وابدأ التعلم الآن.",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "دخول",
    signUp: "إنشاء حساب",
    noAccount: "ليس لديك حساب؟ ",
    haveAccount: "لديك حساب بالفعل؟ ",
    clickSignUp: "أنشئ حساباً",
    clickSignIn: "سجّل دخولك",
    dashWelcome: "مرحباً بك في لوحة تحكمك الذكية",
    dashSub: "بيانات تعلّمك محفوظة وآمنة للوصول السريع.",
    statMastery: "مستوى الإتقان الكلي",
    statCourses: "المواد النشطة",
    statTasks: "المهام المستحقة",
    commandCenter: "مركز إدارة التعلم",
    manageCourses: "نظّم موادك وتتبّع تقدمك بسهولة.",
    addCourse: "إضافة مادة",
    courseName: "اسم المادة",
    componentsCompleted: "عنصر مكتمل",
    noCourses: "لا توجد مسارات بعد. ابدأ مسارك الأول!",
    activeCourses: "المواد الحالية",
    completedCourses: "المواد المكتملة",
    searchPlaceholder: "البحث في المواد...",
    backToDashboard: "رجوع للوحة الرئيسية",
    addTask: "إضافة مهمة جديدة...",
    noTasksYet: "لا توجد مهام مسندة حالياً.",
    addComponent: "إضافة عنصر جديد...",
    noComponentsYet: "لم يتم تكوين أي عناصر حتى الآن.",
    mastery: "نسبة الإتقان",
    growthTimeline: "المسار الزمني لتطورك",
    masteredTask: "منجزة:",
    joinedPlatform: "سنة الانضمام",
    masteredLinearAlgebra: "إتقان مفاهيم الجبر الخطي",
    platform: "النظام التعليمي",
    mathSubject: "الرياضيات",
    csSubject: "علوم الحاسب",
    historySubject: "التاريخ",
    literatureSubject: "الأدب",
    startQuiz: "بدء الاختبار القصير",
    progressDiagram: "رسم بياني للتقدم",
    resourcesLearningAssets: "المكتبة المعرفية",
    addResources: "إرفاق مصادر (PDF/PPTX)",
    addingResource: "جاري المعالجة والإرفاق...",
    open: "عرض",
    profile: "إعدادات الحساب",
    profileSub: "أدر بياناتك الشخصية وحافظ على أمان حسابك.",
    authArtSubtitle: "منظومة تعلم تحليلية تواكب نموك المعرفي لحظة بلحظة.",
    neuralEngineOnline: "المحرك الذكي: متصل",
    profileSaved: "تم تحديث البيانات بنجاح.",
    adminPanel: "لوحة التحكم المركزية",
    platformAnalytics: "الإحصاءات والتحليلات",
    platformAnalyticsSub: "نظرة شمولية لأداء النظام وتفاعل المستخدمين.",
    totalUsers: "عدد المستفيدين",
    systemHealth: "كفاءة المنصة",
    userAdmin: "إدارة الأعضاء",
    manageUsers: "الصلاحيات والحسابات",
    searchUsers: "البحث بالاسم أو البريد...",
    n1: "التحليل السلوكي المستمر",
    n1Desc: "ندرس طريقة استيعابك لنلائم المحتوى معها.",
    n2: "خارطة الفهم الدقيقة",
    n2Desc: "نبني تصوراً واضحاً لمواطن القوة وفرص التحسين.",
    n3: "المنهج التفاعلي المتجدد",
    n3Desc: "لا نعتمد منهجاً جامداً، فكل درس يتكيف لخدمتك.",
    n4: "التقييم المستند إلى الإتقان",
    n4Desc: "تتخطى المرحلة متى ما ثبُت استيعابك التام للمفاهيم.",
    footerTagline: "نمكن الطلاب من تحقيق إمكاناتهم الكاملة عبر تعليم ذكي ومتكيف.",
    footerSupport: "الدعم الفني",
    footerDocumentation: "مكتبة الإرشادات",
    footerSupportCenter: "مركز المساعدة",
    footerCompany: "منظومة مسار",
    footerAboutUs: "رؤيتنا ورسالتنا",
    footerContactUs: "للتواصل بشؤون المستفيدين",
    rightsReserved: "مسار © 2026. كافة الحقوق التقنية محفوظة.",
    components: "الأقسام",
    generateComponents: "البناء الآلي للأقسام",
    generating: "جاري المعالجة...",
    saveChanges: "تأكيد الحفظ",
    noResourcesYet: "لا توجد ملفات مرفقة. نرحب بالصيغ المعيارية كالـ PDF.",
    noMatchesFound: "لم نتمكن من إيجاد شيء مطابق.",
    poweredBy: "مدعوم بتقنية (BKT) المعرفية",
    visionLabel: "رؤيتنا",
    visionTitleMain: "تعليم يواكب ",
    visionTitleHighlight: "تفكيرك",
    visionSubtitle: "نصمم تجربة تعليمية استثنائية لكل طالب، حيث تتضافر الخوارزميات الذكية مع العلوم المعرفية لبناء منهج حي يستجيب لقدراتك بشكل فوري.",
    visionCard1Title: "رؤيتنا",
    visionCard1Text: "نسعى جاهدين لعالم لا يتخلف فيه طموح مستعلم عن الركب. نرى في التعلم الآلي فرصة ذهبية لخلق تكافؤ حقيقي في جودة التعليم المكتسب.",
    visionCard2Title: "الرسالة",
    visionCard2Text: "نصمم أذكى منظومة تحليلية تعليمية، وظيفتها الأساسية أن تتعرف وتتكيف بسرعة بالغة مع قدرات من يتفاعل معها.",
    visionCard3Title: "روابطنا القيمية",
    visionCard3Text: "ترتكز المنصة على عدالة التقييم، شفافية عمل الآلة، وتسليط الضوء على الإنجاز الفردي. مقياسنا الأول للنجاح هو حجم القفزة المعرفية لك.",
    processLabel: "الآلية المتبعة",
    howItWorksTitle: "كيف تدير مسار رحلتك؟",
    step1Title: "التفاعل البدئي",
    step1Desc: "عند بدئك بأي مهمة، يقوم النظام آلياً باستقراء جودة التفاعل وسرعة الاستجابة بصمت.",
    step2Title: "مرحلة التوصيف الدقيق",
    step2Desc: "خوارزمياتنا تبني نموذجاً لمدى استيعابك الحقيقي متجاوزةً فكرة الاختبارات التقليدية.",
    step3Title: "التكيّف اللحظي",
    step3Desc: "يتم ترتيب الوحدات الجديدة ومستوى تعقيدها فوراً لتسد الثغرات وتتحدى قدراتك.",
    step4Title: "منح شارة الإتقان",
    step4Desc: "لا تُجتاز المهام المركزية إلا عند تحقيق نسبة ثقة إحصائية عالية بأن المفهوم قد رُسخ تماماً.",
    peopleLabel: "فريقنا",
    teamTitle: "تعرف على الفريق",
    teamRolePM: "إدارة وقيادة المنتج",
    teamRoleBackend: "هندسة النظم والخوادم",
    teamRoleFrontend: "هندسة وتصميم واجهات المستخدم",
    ctaReady: "هل أنت مستعد لتجربة تعليمية مختلفة؟",
    ctaJoin: "ليست مجرد درجات عابرة بل هي بنية معرفية أصيلة تبقى معك.",
    ctaFree: "دخول تجريبي",
    ctaNoCard: "لا يلزم توفر بطاقة مصرفية",
    ctaBilingual: "منصة مزدوجة اللغة (عربي / إنجليزي)",
    adminName: "الاسم",
    adminRole: "الدور",
    adminStatus: "الحالة",
    adminActions: "إجراءات",
    adminSearchEmpty: "لا توجد نتائج مطابقة لبحثك.",
    adminStudent: "طالب",
    adminTeacher: "معلم",
    adminAdmin: "مشرف",
    adminActive: "نشط",
    saveTitle: "حفظ",
    cancelTitle: "إلغاء",
    noChartComponents: "أضف بعض الأقسام لعرض رسم التقدم البياني الخاص بك.",
    courseDescriptionPlaceholder: "وصف المقرر (اختياري)",
    optionalField: "اختياري",
    addResourcesOptional: "إرفاق مصادر (PDF/PPTX) — اختياري",
    aiImageNotice: "سيقوم الذكاء الاصطناعي بإنشاء صورة غلاف تلقائياً لهذا المقرر",
    creatingCourse: "جاري الإنشاء...",
    // Study Aids Translations
    summarySheet: "ورقة ملخص",
    mindMap: "خريطة ذهنية",
    yourStudyAids: "ملخصاتك الدراسية",
    downloadPDF: "تحميل PDF",
    generatingStudyAid: "جاري المعالجة والإنشاء...",
    aiCreatingMaterials: "يقوم الذكاء الاصطناعي بإنشاء مواد دراسية مخصصة لك.",
    generationFailed: "فشل الإنشاء",
    generatedByAI: "تم الإنشاء بواسطة مسار",
    studySummary: "ملخص دراسي",
    topicSingle: "موضوع",
    topicsPlural: "مواضيع",
    progressHover: "نسبة التقدم:",
    // Quiz Translations
    quizEnd: "إنهاء",
    quizMastery: "مستوى الإتقان",
    quizQuestion: "السؤال",
    quizCorrectTitle: "إجابة صحيحة! أحسنت.",
    quizIncorrectTitle: "إجابة خاطئة. الإجابة الصحيحة هي: ",
    quizNextBtn: "السؤال التالي ←",
    quizNext: "السؤال التالي",
    quizFinish: "إنهاء الاختبار",
    quizLoadingMore: "جاري تحميل المزيد...",
    quizMoreQuestions: "المزيد من الأسئلة",
    quizResultsBtn: "عرض النتائج ←",
    quizEndResultsBtn: "إنهاء وعرض النتائج",
    quizLoading: "جاري التحميل...",
    quizGenerating: "جاري إنشاء الاختبار",
    quizFailed: "فشل إنشاء الاختبار",
    quizBackToCourse: "العودة للمادة",
    quizComplete: "اكتمل الاختبار",
    quizMsgExcellent: "عمل ممتاز!",
    quizMsgGood: "مجهود جيد - استمر!",
    quizMsgKeep: "استمر في التعلم، ستصل لهدفك!",
    quizScore: "النتيجة",
    quizCorrect: "صحيحة",
    quizWrong: "خاطئة",
    quizTotal: "المجموع",
    quizReturn: "العودة للمادة",
    quizCorrectSoFar: "إجابات صحيحة حتى الآن",
    endQuiz: "إنهاء الاختبار"
  }
};

function App() {
  // Global State
  const [language, setLanguage] = useState(() => localStorage.getItem('massar_lang') || 'en');
  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('massar_lang', language);
  }, [language]);

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
  const [selectedCourseId, setSelectedCourseId] = useState(() => {
    // Restore selected course from localStorage on load
    const saved = localStorage.getItem('massar_selected_course');
    return saved ? saved : null;
  });
  const [selectedComponentsForQuiz, setSelectedComponentsForQuiz] = useState([]);

  // Persist selectedCourseId whenever it changes
  useEffect(() => {
    if (selectedCourseId) {
      localStorage.setItem('massar_selected_course', selectedCourseId);
    } else {
      localStorage.removeItem('massar_selected_course');
    }
  }, [selectedCourseId]);

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
        setCurrentPage(sessionData.role === 'admin' ? 'admin' : 'dashboard');
      } catch (error) {
        console.error("Failed to parse session", error);
        localStorage.removeItem('massar_auth');
      }
    } else {
      // If ?page=auth is in URL, open the login page (useful for email confirmations)
      if (window.location.search.includes('page=auth')) {
        setCurrentPage('auth');
        setIsLoginView(true);
      }
      // If ?page=reset-password is in URL, open the reset password page
      if (window.location.search.includes('page=reset-password')) {
        setCurrentPage('reset-password');
      }
    }
  }, []);

  // App-level handlers
  const [isInitializing, setIsInitializing] = useState(true);

  // Handle OAuth Redirects from Supabase (e.g. Google Sign in)
  useEffect(() => {
    // Supabase redirects with a hash like #access_token=...&refresh_token=...&type=signup
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const type = params.get('type');
      
      if (type === 'recovery') {
        // Handle password reset - don't clear hash so Supabase can read it
        setCurrentPage('reset-password');
        return;
      }

      if (accessToken) {
        localStorage.setItem('massar_token', accessToken);
        // Clear the hash so it doesn't stay in the URL
        window.history.replaceState(null, '', window.location.pathname);

        // Fetch real profile from backend
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        fetch(`${API_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then(res => res.json())
          .then(meData => {
            handleSecureLogin(meData.email, meData.name, accessToken, meData.role || 'student');
          })
          .catch(() => {
            handleSecureLogin('', '', accessToken, 'student');
          });
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Don't init auto-login if URL has hash with access_token, the OAuth effect will handle it
      if (window.location.hash && window.location.hash.includes('access_token')) {
        setIsInitializing(false);
        return;
      }

      const token = localStorage.getItem('massar_token');
      if (token) {
        const response = await api.get('/users/me');
        if (response.ok) {
          handleSecureLogin(response.data.email, response.data.name, token, response.data.role);
        } else {
          // Token is invalid/expired — clear and go to login
          localStorage.removeItem('massar_token');
          localStorage.removeItem('massar_auth');
          setCurrentPage('auth');
          setIsLoginView(true);
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('massar_token');
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
    setCurrentPage(role === 'admin' ? 'admin' : 'dashboard');

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

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '3px solid rgba(59, 130, 246, 0.15)', borderTopColor: '#3b82f6',
          animation: 'spinCircle 0.8s linear infinite'
        }} />
      </div>
    );
  }

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
              {!isAdmin && (
                <button className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => { setCurrentPage('dashboard'); setIsMobileMenuOpen(false); setSelectedCourseId(null); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                  <LayoutDashboard size={16} /> {t.dashboard}
                </button>
              )}

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

        {currentPage === 'about' && (
          <About t={t} />
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

        {currentPage === 'reset-password' && (
          <ResetPassword
            t={t}
            isRtl={isRtl}
            onComplete={() => {
              // Clear the URL param and go to login
              window.history.replaceState(null, '', window.location.pathname);
              setCurrentPage('auth');
              setIsLoginView(true);
            }}
          />
        )}

        {/* Dashboard stays mounted to preserve courses state — hidden via CSS when not active */}
        {isLoggedIn && !isAdmin && (
          <div style={{ display: (currentPage === 'dashboard') ? 'contents' : 'none' }}>
            <Dashboard
              t={t}
              isRtl={isRtl}
              currentUser={currentUser}
              selectedCourseId={selectedCourseId}
              setSelectedCourseId={setSelectedCourseId}
              setCurrentPage={setCurrentPage}
              selectedComponentsForQuiz={selectedComponentsForQuiz}
              setSelectedComponentsForQuiz={setSelectedComponentsForQuiz}
            />
          </div>
        )}

        {currentPage === 'admin' && isLoggedIn && isAdmin && (
          <AdminDashboard t={t} isRtl={isRtl} authToken={authToken} />
        )}

        {currentPage === 'quiz' && isLoggedIn && (
          <Quiz 
            t={t} 
            isRtl={isRtl}
            setCurrentPage={setCurrentPage} 
            selectedComponents={selectedComponentsForQuiz}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
          />
        )}

      </main>

      <Footer t={t} isRtl={isRtl} setCurrentPage={setCurrentPage} key={currentPage} />

    </div>
  );
}

export default App;
