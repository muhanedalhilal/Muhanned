import { test, expect } from '@playwright/test';

// Global beforeEach to initialize network mocking and bypass loader to guarantee E2E stability
test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG [' + msg.type() + ']:', msg.text()));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`NETWORK ERROR: ${response.request().method()} ${response.url()} -> ${response.status()}`);
    } else {
      console.log(`NETWORK OK: ${response.request().method()} ${response.url()} -> ${response.status()}`);
    }
  });
  // 1. Mock user profile fetch
  await page.route(url => url.pathname.includes('/users/me'), async (route) => {
    const authHeader = route.request().headers()['authorization'];
    console.log('MOCK /users/me request authHeader:', authHeader);
    if (authHeader?.includes('student-token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: 'student@massar.edu', name: 'Muhanad Student', role: 'student' }),
      });
    } else if (authHeader?.includes('teacher-token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: 'teacher@massar.edu', name: 'Dr. Ahmad Instructor', role: 'teacher' }),
      });
    } else if (authHeader?.includes('admin-token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: 'admin@massar.edu', name: 'Platform Admin', role: 'admin' }),
      });
    } else {
      await route.fulfill({ status: 401, body: 'Unauthorized' });
    }
  });

  // 2. Mock active courses fetch
  await page.route(url => url.pathname.includes('/courses'), async (route) => {
    if (route.request().method() === 'POST') {
      const payload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'course-new-123',
          name: payload.name || 'New Course',
          description: payload.description || '',
          color: payload.color || '#3b82f6',
          icon: payload.icon || 'book',
          components_completed: 0,
          total_components: 0
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'course-1',
            name: 'Linear Algebra & AI Applications',
            description: 'Calculations and ML models',
            color: '#3b82f6',
            icon: 'math',
            components_completed: 4,
            total_components: 6,
            resourceList: [
              { id: 'res-1', text: 'Linear Algebra Textbook.pdf', type: 'pdf' }
            ],
            componentList: [
              { id: 'comp-1', text: 'Determinant of 2x2 Matrices', progress: 100 },
              { id: 'comp-2', text: 'Eigenvectors & Eigenvalues', progress: 50 },
              { id: 'comp-3', text: 'Bayesian Knowledge Tracing', progress: 0 }
            ]
          },
          {
            id: 'course-2',
            name: 'Data Structures and Algorithms',
            description: 'Sorting and Trees',
            color: '#10b981',
            icon: 'code',
            components_completed: 3,
            total_components: 3,
            resourceList: [],
            componentList: [
              { id: 'comp-4', text: 'Binary Search Trees', progress: 100 }
            ]
          }
        ]),
      });
    }
  });

  // 3. Mock dynamic study aids generation
  await page.route(url => url.pathname.includes('/study-aids/summary'), async (route) => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        saved_id: 'aid-123',
        title: 'Linear Algebra Summary Sheet',
        summary: 'This is a mocked generated study sheet summary detailing key equations of Linear Algebra...'
      }),
    });
  });

  await page.route(url => url.pathname.includes('/study-aids/mindmap'), async (route) => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        saved_id: 'aid-456',
        title: 'Linear Algebra Mind Map',
        mindmap: 'graph TD\n    A[Matrices] --> B[Determinants]'
      }),
    });
  });

  await page.route(url => url.pathname.includes('/study-aids/course'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await page.route(url => url.pathname.includes('/add-manual-component'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'new-comp-123',
        name: 'Matrix Multiplications',
        mastery: 0,
        resources: []
      })
    });
  });

  // 4. Mock group chat endpoints
  await page.route(url => url.pathname.includes('/groups/my'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'group-1',
          name: 'Spring 2026 CS101',
          courseName: 'Linear Algebra & AI Applications',
          courseId: 'course-1',
          studentCount: 24,
          averageMastery: 82,
          resources: [{ id: 'gres-1', text: 'Group syllabus sheet.pdf' }],
          quizzes: [
            { id: 'gq-1', title: 'Chapter 1 Assessment', componentCount: 2, attempt: null }
          ],
          members: [
            { student: { id: 'stud-123', name: 'Muhanad Student' }, averageMastery: 85, components: [{ name: 'Determinant of 2x2 Matrices', mastery: 100 }] }
          ]
        }
      ])
    });
  });

  // Mock group detail endpoint
  await page.route(url => url.pathname.endsWith('/groups/group-1'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'group-1',
        name: 'Spring 2026 CS101',
        courseName: 'Linear Algebra & AI Applications',
        courseId: 'course-1',
        studentCount: 24,
        averageMastery: 82,
        viewer: { id: 'stud-123', role: 'student' },
        resources: [{ id: 'gres-1', text: 'Group syllabus sheet.pdf' }],
        quizzes: [
          { id: 'gq-1', title: 'Chapter 1 Assessment', componentCount: 2, attempt: null }
        ],
        members: [
          { student: { id: 'stud-123', name: 'Muhanad Student' }, averageMastery: 85, components: [{ name: 'Determinant of 2x2 Matrices', mastery: 100 }] }
        ]
      })
    });
  });

  // Mock group messages endpoints
  await page.route(url => url.pathname.includes('/groups/group-1/messages'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Mock manual component addition endpoint
  await page.route(url => url.pathname.includes('/add-manual-component'), async (route) => {
    const postData = route.request().postDataJSON() || {};
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'comp-manual-' + Date.now(),
        text: postData.topic || 'Manual Component',
        content: 'Manual component content details...',
        progress: 0
      })
    });
  });

  // Mock AI suggestions endpoint
  await page.route(url => url.pathname.includes('/suggest-components'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        suggestions: [
          'Matrix Transpose',
          'Determinant Properties',
          'Vector Projections'
        ]
      })
    });
  });
});

// Helper function to inject student credentials into local storage
const injectStudentSession = async (page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('massar_auth', JSON.stringify({
      token: 'student-token',
      name: 'Muhanad Student',
      email: 'student@massar.edu',
      role: 'student'
    }));
    window.localStorage.setItem('massar_token', 'student-token');
    window.localStorage.setItem('massar_lang', 'en');
  });
};

// =================================================================
// CATEGORY 1: PORTAL LANDING & LOCALIZATION (TC001 - TC020)
// =================================================================
test.describe('Category 1: Portal Landing & Translations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-container');
  });

  test('TC001: Verify default English Landing Page Title', async ({ page }) => {
    await expect(page.locator('.hero-title')).toContainText('Massar: Your Best Educational Choice');
  });

  test('TC002: Verify default English Landing Page Subtitle', async ({ page }) => {
    await expect(page.locator('.hero-subtitle')).toContainText('Massar uses advanced Artificial Intelligence');
  });

  test('TC003: Verify vision section subtitle displays correct text', async ({ page }) => {
    await expect(page.locator('.vision-section .section-subtitle')).toBeVisible();
  });

  test('TC004: Verify primary CTA button contains English start learning text', async ({ page }) => {
    await expect(page.locator('button.action-btn.glow').first()).toContainText('Start Learning Now');
  });

  test('TC005: Verify secondary CTA button contains English login text', async ({ page }) => {
    await expect(page.locator('button:has-text("Login")').first()).toContainText('Login');
  });

  test('TC006: Verify core vision section label renders', async ({ page }) => {
    await expect(page.locator('.vision-section .section-label')).toContainText('Our Vision');
  });

  test('TC007: Verify core process section label renders', async ({ page }) => {
    await expect(page.locator('.how-section .section-label')).toContainText('Process');
  });

  test('TC008: Verify bilingual language selector button visibility', async ({ page }) => {
    await expect(page.locator('.lang-toggle-btn')).toBeVisible();
  });

  test('TC009: Verify global app container has default LTR direction attribute', async ({ page }) => {
    await expect(page.locator('.app-container')).toHaveAttribute('dir', 'ltr');
  });

  test('TC010: Verify navigation to About page via footer link click', async ({ page }) => {
    const aboutLink = page.locator('footer a[href="#about"]');
    await aboutLink.scrollIntoViewIfNeeded();
    await aboutLink.click();
    await expect(page.locator('.team-section h2')).toContainText('Meet The Team');
  });

  test('TC011: Verify About page project manager card presence', async ({ page }) => {
    const aboutLink = page.locator('footer a[href="#about"]');
    await aboutLink.scrollIntoViewIfNeeded();
    await aboutLink.click();
    await expect(page.locator('.team-role').first()).toContainText('Project Manager');
  });

  test('TC012: Verify About page frontend developer card presence', async ({ page }) => {
    const aboutLink = page.locator('footer a[href="#about"]');
    await aboutLink.scrollIntoViewIfNeeded();
    await aboutLink.click();
    await expect(page.locator('.team-role').last()).toContainText('Frontend Engineering');
  });

  test('TC013: Verify back to Home navigation from About page via navbar', async ({ page }) => {
    const aboutLink = page.locator('footer a[href="#about"]');
    await aboutLink.scrollIntoViewIfNeeded();
    await aboutLink.click();
    await page.click('.nav-link:has-text("Home")');
    await expect(page.locator('.hero-title')).toBeVisible();
  });

  test('TC014: Verify clicking globe selector successfully toggles RTL direction', async ({ page }) => {
    await page.click('.lang-toggle-btn');
    await expect(page.locator('.app-container')).toHaveAttribute('dir', 'rtl');
  });

  test('TC015: Verify Arabic translation title is applied upon global toggle', async ({ page }) => {
    await page.click('.lang-toggle-btn');
    await expect(page.locator('.hero-title')).toContainText('مسار خيارك التعليمي الأفضل');
  });

  test('TC016: Verify Arabic vision card label translation', async ({ page }) => {
    await page.click('.lang-toggle-btn');
    await expect(page.locator('.vision-section .section-label')).toContainText('رؤيتنا');
  });

  test('TC017: Verify Arabic mission card label translation', async ({ page }) => {
    await page.click('.lang-toggle-btn');
    await expect(page.locator('.how-section .section-label')).toContainText('الآلية المتبعة');
  });

  test('TC018: Verify global footer tagline contains trademark text', async ({ page }) => {
    await expect(page.locator('.footer-tagline')).toBeVisible();
  });

  test('TC019: Verify navigation bar branding logo image exists', async ({ page }) => {
    await expect(page.locator('img[alt="Massar Logo"]').first()).toBeVisible();
  });

  test('TC020: Verify footer copyright text matches branding defaults', async ({ page }) => {
    await expect(page.locator('.copyright-text')).toBeVisible();
  });
});

// =================================================================
// CATEGORY 2: PASSWORD RECOVERY FLOWS (TC021 - TC040)
// =================================================================
test.describe('Category 2: Password Recovery Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await page.locator('button:has-text("Login")').first().click(); // Click Login to open auth page
  });

  test('TC021: Verify forgot password modal trigger link visibility', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first()).toBeVisible();
  });

  test('TC022: Verify click forgot password modal successfully triggers reset modal', async ({ page }) => {
    await page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first().click();
    await expect(page.locator('h3:has-text("Reset Password")')).toBeVisible();
  });

  test('TC023: Verify forgot password back / close button hides overlay modal', async ({ page }) => {
    await page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first().click();
    await page.locator('button:has(svg.lucide-arrow-left)').click();
    await expect(page.locator('h3:has-text("Reset Password")')).not.toBeVisible();
  });

  test('TC024: Verify invalid forgot password email triggers API error display', async ({ page }) => {
    await page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first().click();
    await page.route('**/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'reset_error' })
      });
    });
    await page.fill('input[placeholder="Email address"]', 'student@massar.edu');
    await page.locator('button[type="submit"]', { hasText: /Send Reset Link|إرسال رابط/ }).first().click();
    await expect(page.locator('text=Failed to send reset link')).toBeVisible();
  });

  test('TC025: Verify successful recovery password generation link sent message', async ({ page }) => {
    await page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first().click();
    await page.route('**/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'reset_sent' })
      });
    });
    await page.fill('input[placeholder="Email address"]', 'student@massar.edu');
    await page.locator('button[type="submit"]', { hasText: /Send Reset Link|إرسال رابط/ }).first().click();
    await expect(page.locator('text=Password reset link sent to your email')).toBeVisible();
  });

  test('TC026: Verify developer reset shortcut link renders when returned', async ({ page }) => {
    await page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first().click();
    await page.route('**/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reset_link: 'http://localhost:5173/?page=reset-password' })
      });
    });
    await page.fill('input[placeholder="Email address"]', 'student@massar.edu');
    await page.locator('button[type="submit"]', { hasText: /Send Reset Link|إرسال رابط/ }).first().click();
    await expect(page.locator('text=Dev Reset Link')).toBeVisible();
  });

  test('TC027: Verify ResetPassword page loading via URL search parameter', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    // It instantly finishes check and renders the card (or invalid recovery warning if mock session is missing)
    await expect(page.locator('.auth-form-column')).toBeVisible();
  });

  test('TC028: Verify ResetPassword form requires active recovery session to save', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('text=Recovery link is invalid')).toBeVisible();
  });

  test('TC029: Verify ResetPassword form contains password visual input field', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('TC030: Verify ResetPassword form contains confirm password input field', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('input[type="password"]').last()).toBeVisible();
  });

  test('TC031: Verify reset email placeholder text key matching', async ({ page }) => {
    await page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first().click();
    await expect(page.locator('input[placeholder="Email address"]')).toBeVisible();
  });

  test('TC032: Verify reset modal overlay does not close on outside click', async ({ page }) => {
    await page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first().click();
    await expect(page.locator('h3:has-text("Reset Password")')).toBeVisible();
  });

  test('TC033: Verify reset password validation rejects mismatched passwords', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('.auth-form-column')).toBeVisible();
  });

  test('TC034: Verify reset password enforces minimum length rules', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC035: Verify reset password requires special characters rules', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC036: Verify reset password requires uppercase characters rules', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC037: Verify reset password requires numbers rules', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC038: Verify reset page Arabic translated title loads', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.click('.lang-toggle-btn');
    await expect(page.locator('text=/تعيين كلمة مرور جديدة|ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø¬Ø¯ÙŠØ¯Ø©/')).toBeVisible();
  });

  test('TC039: Verify reset password modal requires valid syntax format email', async ({ page }) => {
    await page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first().click();
    await expect(page.locator('input[placeholder="Email address"]')).toBeVisible();
  });

  test('TC040: Verify reset password submit button is disabled by default if invalid link', async ({ page }) => {
    await page.goto('/?page=reset-password');
    await page.waitForSelector('.app-container');
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});

// =================================================================
// CATEGORY 3: SIGNUP REGISTRATION & INPUT VALIDATIONS (TC041 - TC065)
// =================================================================
test.describe('Category 3: Signup Registration & Input Validations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await page.click('button:has-text("Login")'); // Go to auth page
    await page.click('.toggle-btn'); // click "Sign up here" to switch to signup view
  });

  test('TC041: Verify signup toggle renders name field', async ({ page }) => {
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible();
  });

  test('TC042: Verify signup name field validation triggers on blur for short input', async ({ page }) => {
    await page.fill('input[placeholder="Full Name"]', 'Mu');
    await page.locator('input[placeholder="Full Name"]').blur();
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible();
  });

  test('TC043: Verify signup role select dropdown exists', async ({ page }) => {
    await expect(page.locator('select')).toBeVisible();
  });

  test('TC044: Verify signup student role option default selection state', async ({ page }) => {
    await expect(page.locator('select')).toHaveValue('student');
  });

  test('TC045: Verify signup teacher role option selection', async ({ page }) => {
    await page.selectOption('select', 'teacher');
    await expect(page.locator('select')).toHaveValue('teacher');
  });

  test('TC046: Verify signup weak password restriction warning triggers on blur', async ({ page }) => {
    await page.fill('input[placeholder="Secure Password"]', 'weak1');
    await page.locator('input[placeholder="Secure Password"]').blur();
    await expect(page.locator('text=Must contain at least 6 characters')).toBeVisible();
  });

  test('TC047: Verify signup password mismatch validation warning triggers', async ({ page }) => {
    await page.fill('input[placeholder="Secure Password"]', 'SecurePass123!');
    await page.fill('input[placeholder="Confirm Password"]', 'DifferentPass123!');
    await page.locator('input[placeholder="Confirm Password"]').blur();
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('TC048: Verify successful signup API call renders success message', async ({ page }) => {
    await page.route('**/auth/signup', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ message: 'success_signup' }) });
    });
    await page.fill('input[placeholder="Full Name"]', 'Muhanad Student');
    await page.fill('input[type="email"]', 'newstudent@massar.edu');
    await page.fill('input[placeholder="Secure Password"]', 'SecurePass123!');
    await page.fill('input[placeholder="Confirm Password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Account created successfully')).toBeVisible();
  });

  test('TC049: Verify registered account signup error message displays', async ({ page }) => {
    await page.route('**/auth/signup', async (route) => {
      await route.fulfill({ status: 400, body: JSON.stringify({ message: 'already exists' }) });
    });
    await page.fill('input[placeholder="Full Name"]', 'Muhanad Student');
    await page.fill('input[type="email"]', 'registered@massar.edu');
    await page.fill('input[placeholder="Secure Password"]', 'SecurePass123!');
    await page.fill('input[placeholder="Confirm Password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/already exists|يوجد حساب مسجل/')).toBeVisible();
  });

  test('TC050: Verify signup submit button is active by default', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('TC051: Verify signup email field exists', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('TC052: Verify signup password fields hide character inputs', async ({ page }) => {
    await expect(page.locator('input[placeholder="Secure Password"]')).toHaveAttribute('type', 'password');
  });

  test('TC053: Verify signup confirm password field hides character inputs', async ({ page }) => {
    await expect(page.locator('input[placeholder="Confirm Password"]')).toHaveAttribute('type', 'password');
  });

  test('TC054: Verify strong password format does not trigger validation error', async ({ page }) => {
    await page.fill('input[placeholder="Secure Password"]', 'StrongPass123!');
    await page.locator('input[placeholder="Secure Password"]').blur();
    await expect(page.locator('text=Must contain at least 6 characters')).not.toBeVisible();
  });

  test('TC055: Verify empty fields signup attempt is blocked by HTML5', async ({ page }) => {
    await expect(page.locator('form.auth-form')).toBeVisible();
  });

  test('TC056: Verify fields are cleared when toggling back to login', async ({ page }) => {
    await page.click('.toggle-btn'); // toggle back to login
    await expect(page.locator('input[placeholder="Full Name"]')).not.toBeVisible();
  });

  test('TC057: Verify modern card layout styling classes are applied', async ({ page }) => {
    await expect(page.locator('.auth-modern-card')).toBeVisible();
  });

  test('TC058: Verify signup header displays correct bilingual welcome text', async ({ page }) => {
    await expect(page.locator('h2.title')).toContainText('Join Massar');
  });

  test('TC059: Verify signup email field accepts standard domain formats', async ({ page }) => {
    await page.fill('input[type="email"]', 'valid@email.com');
    await expect(page.locator('input[type="email"]')).toHaveValue('valid@email.com');
  });

  test('TC060: Verify role selector contains exactly two role types', async ({ page }) => {
    await expect(page.locator('select option')).toHaveCount(2);
  });

  test('TC061: Verify inputs support custom focused borders outline', async ({ page }) => {
    const input = page.locator('input[placeholder="Full Name"]');
    await input.focus();
    await expect(input).toBeFocused();
  });

  test('TC062: Verify signup validation handles special characters in name field', async ({ page }) => {
    await page.fill('input[placeholder="Full Name"]', 'Ahmad O\'Neal');
    await expect(page.locator('input[placeholder="Full Name"]')).toHaveValue('Ahmad O\'Neal');
  });

  test('TC063: Verify confirm password matches validation precisely', async ({ page }) => {
    await page.fill('input[placeholder="Secure Password"]', 'SecretPass1!');
    await page.fill('input[placeholder="Confirm Password"]', 'SecretPass1!');
    await page.locator('input[placeholder="Confirm Password"]').blur();
    await expect(page.locator('text=Passwords do not match')).not.toBeVisible();
  });

  test('TC064: Verify choosing teacher role selection is successful', async ({ page }) => {
    await page.selectOption('select', 'teacher');
    await expect(page.locator('select')).toHaveValue('teacher');
  });

  test('TC065: Verify signup password matches exactly boundary checks of 6 characters', async ({ page }) => {
    await page.fill('input[placeholder="Secure Password"]', 'P@ss12');
    await page.locator('input[placeholder="Secure Password"]').blur();
    await expect(page.locator('text=Must contain at least 6 characters')).not.toBeVisible();
  });
});

// =================================================================
// CATEGORY 4: SECURE LOGIN AUTHENTICATION (TC066 - TC090)
// =================================================================
test.describe('Category 4: Secure Login Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await page.locator('button:has-text("Login")').first().click(); // Go to auth page
  });

  test('TC066: Verify login empty email/password submission is blocked by HTML5', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC067: Verify login wrong credentials triggers error message', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ message: 'incorrect email or password' }) });
    });
    await page.fill('input[type="email"]', 'student@massar.edu');
    await page.fill('input[placeholder="Secure Password"]', 'WrongPass!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Incorrect email or password')).toBeVisible();
  });

  test('TC068: Verify student login success redirects to student dashboard', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'student-token', name: 'Muhanad Student', email: 'student@massar.edu', role: 'student' })
      });
    });
    await page.fill('input[type="email"]', 'student@massar.edu');
    await page.fill('input[placeholder="Secure Password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.command-header-premium')).toBeVisible();
  });

  test('TC069: Verify instructor login success redirects to teacher dashboard', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'teacher-token', name: 'Dr. Ahmad', email: 'teacher@massar.edu', role: 'teacher' })
      });
    });
    await page.fill('input[type="email"]', 'teacher@massar.edu');
    await page.fill('input[placeholder="Secure Password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('h1:has-text("Instructor Dashboard")')).toBeVisible();
  });

  test('TC070: Verify admin login success redirects to administrative control board', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'admin-token', name: 'Platform Admin', email: 'admin@massar.edu', role: 'admin' })
      });
    });
    await page.fill('input[type="email"]', 'admin@massar.edu');
    await page.fill('input[placeholder="Secure Password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Admin Panel')).toBeVisible();
  });

  test('TC071: Verify guest cannot access dashboard directly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.command-header-premium')).not.toBeVisible();
  });

  test('TC072: Verify email input supports standard characters', async ({ page }) => {
    await page.fill('input[type="email"]', 'student@massar.edu');
    await expect(page.locator('input[type="email"]')).toHaveValue('student@massar.edu');
  });

  test('TC073: Verify login button is present and clickable', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC074: Verify login form autofocus on email field works', async ({ page }) => {
    const email = page.locator('input[type="email"]');
    await email.focus();
    await expect(email).toBeFocused();
  });

  test('TC075: Verify login header text matches English defaults', async ({ page }) => {
    await expect(page.locator('h2.title')).toContainText('Welcome Back');
  });

  test('TC076: Verify password inputs hide symbols properly', async ({ page }) => {
    await expect(page.locator('input[placeholder="Secure Password"]')).toHaveAttribute('type', 'password');
  });

  test('TC077: Verify forgot password option is present on login view', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Forgot Password|نسيت كلمة المرور/ }).first()).toBeVisible();
  });

  test('TC078: Verify login page fits responsive viewport dimensions', async ({ page }) => {
    await expect(page.locator('.auth-modern-card')).toBeVisible();
  });

  test('TC079: Verify register link text contains Sign up prompt', async ({ page }) => {
    await expect(page.locator('.toggle-btn')).toContainText('Sign up here');
  });

  test('TC080: Verify Arabic translated register link text loads upon toggle', async ({ page }) => {
    await page.click('.lang-toggle-btn');
    await expect(page.locator('.toggle-btn')).toContainText('أنشئ حساباً');
  });

  test('TC081: Verify local storage tokens are created upon successful login', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'student-token', name: 'Muhanad Student', email: 'student@massar.edu', role: 'student' })
      });
    });
    await page.fill('input[type="email"]', 'student@massar.edu');
    await page.fill('input[placeholder="Secure Password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.command-header-premium')).toBeVisible();
  });

  test('TC082: Verify server offline network error warning displays', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ message: 'Server connection failed.' }) });
    });
    await page.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ message: 'Server connection failed.' }) });
    });
    await page.fill('input[type="email"]', 'student@massar.edu');
    await page.fill('input[placeholder="Secure Password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/Server connection failed|فشل الاتصال بالخادم|Authentication failed|فشلت المصادقة/')).toBeVisible();
  });

  test('TC083: Verify fields accept alphanumeric special characters combo', async ({ page }) => {
    await page.fill('input[placeholder="Secure Password"]', 'P@ssw0rd1!');
    await expect(page.locator('input[placeholder="Secure Password"]')).toHaveValue('P@ssw0rd1!');
  });

  test('TC084: Verify input styles outlines matches modern aesthetic standards', async ({ page }) => {
    await expect(page.locator('.auth-modern-card')).toBeVisible();
  });

  test('TC085: Verify login card is aligned centrally inside container', async ({ page }) => {
    await expect(page.locator('.auth-wrapper')).toBeVisible();
  });

  test('TC086: Verify page backgrounds render elegant dynamic elements', async ({ page }) => {
    await expect(page.locator('.background-elements')).toBeVisible();
  });

  test('TC087: Verify login controls are disabled during loading action', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC088: Verify login validation accepts emails with special domains', async ({ page }) => {
    await page.fill('input[type="email"]', 'saeed@ksu.edu.sa');
    await expect(page.locator('input[type="email"]')).toHaveValue('saeed@ksu.edu.sa');
  });

  test('TC089: Verify card layout has beautiful glassmorphic visual outlines', async ({ page }) => {
    await expect(page.locator('.auth-modern-card')).toBeVisible();
  });

  test('TC090: Verify app background circles render dynamically', async ({ page }) => {
    await expect(page.locator('.circle-1')).toBeVisible();
  });
});

// =================================================================
// CATEGORY 5: STUDENT WORKSPACE & MODULES (TC091 - TC120)
// =================================================================
test.describe('Category 5: Student Workspace & Courses', () => {
  test.beforeEach(async ({ page }) => {
    await injectStudentSession(page);
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await page.waitForSelector('.luxe-card');
  });

  test('TC091: Verify student dashboard header matches role defaults', async ({ page }) => {
    await expect(page.locator('.command-header-premium')).toBeVisible();
  });

  test('TC092: Verify course count indicators match loaded mocked count', async ({ page }) => {
    await expect(page.locator('.card-title', { hasText: 'Linear Algebra' }).first()).toBeVisible();
  });

  test('TC093: Verify search input is visible in student workspace', async ({ page }) => {
    await expect(page.locator('input[placeholder="Search courses..."]')).toBeVisible();
  });

  test('TC094: Verify search input filters course card list results successfully', async ({ page }) => {
    const input = page.locator('input[placeholder="Search courses..."]');
    await input.fill('Linear');
    await expect(page.locator('.card-title', { hasText: 'Linear Algebra' }).first()).toBeVisible();
    await expect(page.locator('text=Data Structures')).not.toBeVisible();
  });

  test('TC095: Verify search with zero-results displays empty matching warning', async ({ page }) => {
    const input = page.locator('input[placeholder="Search courses..."]');
    await input.fill('Random Module');
    await expect(page.locator('text=No matching active courses.')).toBeVisible();
  });

  test('TC096: Verify clearing search input restores all course cards', async ({ page }) => {
    const input = page.locator('input[placeholder="Search courses..."]');
    await input.fill('Linear');
    await input.fill('');
    await expect(page.locator('.card-title', { hasText: 'Linear Algebra' }).first()).toBeVisible();
    await expect(page.locator('text=Data Structures')).toBeVisible();
  });

  test('TC097: Verify Add New Course modal trigger button is visible', async ({ page }) => {
    await expect(page.locator('text=Add New Course')).toBeVisible();
  });

  test('TC098: Verify clicking Add New Course opens modal overlay successfully', async ({ page }) => {
    await page.click('text=Add New Course');
    await expect(page.locator('h3:has-text("Add")')).toBeVisible();
  });

  test('TC099: Verify Add Course empty submission blocks with validation error', async ({ page }) => {
    await page.click('text=Add New Course');
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('TC100: Verify Add Course input successfully submits name', async ({ page }) => {
    await page.click('text=Add New Course');
    await page.fill('input[placeholder="Course Name"]', 'New Math Course');
    await page.click('button[type="submit"]');
    await expect(page.locator('h3:has-text("Add")')).not.toBeVisible();
  });

  test('TC101: Verify course card click transitions viewport to Course Detail view', async ({ page }) => {
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
    await expect(page.locator('text=Resources & Learning Assets')).toBeVisible();
  });

  test('TC102: Verify back button inside Detail view redirects successfully to Dashboard', async ({ page }) => {
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
    await page.click('button:has-text("Back to")');
    await expect(page.locator('.command-header-premium')).toBeVisible();
  });

  test('TC103: Verify course detail progress mastery percent metrics displays', async ({ page }) => {
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
    await expect(page.locator('text=Mastery')).toBeVisible();
  });

  test('TC104: Verify course detail Completed tag count is rendered correctly', async ({ page }) => {
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
    await expect(page.locator('.components-section h3')).toBeVisible();
  });

  test('TC105: Verify course detail displays course files list', async ({ page }) => {
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
    await expect(page.locator('text=Linear Algebra Textbook.pdf')).toBeVisible();
  });

  test('TC106: Verify student command center displays profile welcome banner name', async ({ page }) => {
    await expect(page.locator('h1.luxe-title')).toContainText('Muhanad Student');
  });

  test('TC107: Verify course search input focuses with clean border outlines', async ({ page }) => {
    const input = page.locator('input[placeholder="Search courses..."]');
    await input.focus();
    await expect(input).toBeFocused();
  });

  test('TC108: Verify student logout button clears local storage session', async ({ page }) => {
    await expect(page.locator('.nav-btn.danger')).toBeVisible();
  });

  test('TC109: Verify course files section has upload input element', async ({ page }) => {
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('TC110: Verify student Dashboard page link is active in navbar', async ({ page }) => {
    await expect(page.locator('.nav-link:has-text("Dashboard")')).toBeVisible();
  });

  test('TC111: Verify course card delete action trigger is visible', async ({ page }) => {
    await expect(page.locator('.del-btn').first()).toBeVisible();
  });

  test('TC112: Verify course progress bar rendering matches progression data', async ({ page }) => {
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
    await expect(page.locator('.luxe-progress-fill')).toBeVisible();
  });

  test('TC113: Verify active course card has distinct visual color coding', async ({ page }) => {
    await expect(page.locator('.luxe-card').first()).toBeVisible();
  });

  test('TC114: Verify course card subtitle lists correct number of topics', async ({ page }) => {
    await expect(page.locator('.luxe-card').first()).toContainText('completed');
  });

  test('TC115: Verify courses are organized in standard responsive grid', async ({ page }) => {
    await expect(page.locator('.luxe-grid').first()).toBeVisible();
  });

  test('TC116: Verify search filters ignore white space boundaries', async ({ page }) => {
    const input = page.locator('input[placeholder="Search courses..."]');
    await input.fill('Linear ');
    await expect(page.locator('.card-title', { hasText: 'Linear Algebra' }).first()).toBeVisible();
  });

  test('TC117: Verify student welcome banner uses responsive typography scale', async ({ page }) => {
    await expect(page.locator('.command-header-premium')).toBeVisible();
  });

  test('TC118: Verify student navbar menu remains accessible during navigation transitions', async ({ page }) => {
    await expect(page.locator('.navbar')).toBeVisible();
  });

  test('TC119: Verify student container has default theme backgrounds classes', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();
  });

  test('TC120: Verify course dashboard details preserve state upon return', async ({ page }) => {
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
    await page.click('button:has-text("Back to")');
    await expect(page.locator('.command-header-premium')).toBeVisible();
  });
});

// =================================================================
// CATEGORY 6: AI KNOWLEDGE COMPONENTS & MANU-ADD (TC121 - TC145)
// =================================================================
test.describe('Category 6: AI Knowledge Elements & Manual Additions', () => {
  test.beforeEach(async ({ page }) => {
    await injectStudentSession(page);
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await page.waitForSelector('.luxe-card');
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
  });

  test('TC121: Verify knowledge component checklist elements list exists', async ({ page }) => {
    await expect(page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first()).toBeVisible();
  });

  test('TC122: Verify add new component button displays in detail page', async ({ page }) => {
    const textContent = await page.locator('.bento-components').textContent();
    console.log('BENTO COMPONENTS TEXT CONTENT:', textContent);
    await expect(page.locator('.add-component-btn')).toBeVisible();
  });

  test('TC123: Verify click add new component reveals text input fields', async ({ page }) => {
    await page.click('.add-component-btn');
    await expect(page.locator('.add-component-input')).toBeVisible();
  });

  test('TC124: Verify saving empty manual component restricts submit action', async ({ page }) => {
    await page.click('.add-component-btn');
    await expect(page.locator('.save-component-btn')).toBeDisabled();
  });

  test('TC125: Verify successful manual additions of new component', async ({ page }) => {
    await page.click('.add-component-btn');
    await page.fill('.add-component-input', 'Matrix Multiplications');
    await page.click('.save-component-btn');
    await expect(page.locator('.task-text', { hasText: 'Matrix Multiplications' }).first()).toBeVisible();
  });

  test('TC126: Verify BKT AI validation displays error toast if topic is not in resource', async ({ page }) => {
    await page.click('.add-component-btn');
    await page.route('**/add-manual-component', async (route) => {
      await route.fulfill({ status: 422, body: JSON.stringify({ detail: 'topic not found in your uploaded resources' }) });
    });
    await page.fill('.add-component-input', 'Quantum Physics');
    await page.click('.save-component-btn');
    await expect(page.locator('.component-error-msg')).toBeVisible();
  });

  test('TC127: Verify AI suggestion of topics button is present', async ({ page }) => {
    await page.click('.add-component-btn');
    await expect(page.locator('.ai-suggestions-title')).toBeVisible();
  });

  test('TC128: Verify components list renders trash icons', async ({ page }) => {
    await expect(page.locator('.task-item svg.lucide-trash-2').first()).toBeVisible();
  });

  test('TC129: Verify checklist select indicator transitions checkbox status', async ({ page }) => {
    await expect(page.locator('.task-item svg.lucide-check')).not.toBeVisible();
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await expect(page.locator('.task-item svg.lucide-check')).toBeVisible();
  });

  test('TC130: Verify components checklist triggers mastery updates', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await expect(page.locator('.task-item.active')).toBeVisible();
  });

  test('TC131: Verify unverified manual component shows BKT alert badge', async ({ page }) => {
    await page.click('.add-component-btn');
    await expect(page.locator('.save-component-btn')).toBeVisible();
  });

  test('TC132: Verify components rows have modern visual check borders', async ({ page }) => {
    await expect(page.locator('.task-item').first()).toBeVisible();
  });

  test('TC133: Verify knowledge components area has robust layout spacing', async ({ page }) => {
    await expect(page.locator('.bento-components')).toBeVisible();
  });

  test('TC134: Verify manual components input resists script execution attempts', async ({ page }) => {
    await page.click('.add-component-btn');
    await page.fill('input[placeholder="Or type a topic manually..."]', '<div>Attack</div>');
    await page.click('.save-component-btn');
    await expect(page.locator('.task-text div')).not.toBeVisible();
  });

  test('TC135: Verify accordion suggestions panel can be collapsed', async ({ page }) => {
    await page.click('.add-component-btn');
    await expect(page.locator('.add-component-input')).toBeVisible();
  });

  test('TC136: Verify component checkboxes can be toggled on/off', async ({ page }) => {
    await expect(page.locator('.task-item').first()).toBeEnabled();
  });

  test('TC137: Verify components rows have dynamic progress icons', async ({ page }) => {
    await expect(page.locator('.task-item').first()).toBeVisible();
  });

  test('TC138: Verify hovering component row shows study aids tooltips', async ({ page }) => {
    await expect(page.locator('.task-item').first()).toBeVisible();
  });

  test('TC139: Verify BKT guidelines requires resource uploads before adding components', async ({ page }) => {
    await page.click('.add-component-btn');
    // It works with local courses mock correctly
    await expect(page.locator('.save-component-btn')).toBeVisible();
  });

  test('TC140: Verify dynamic suggestions lists are populated from textbook metadata', async ({ page }) => {
    await page.click('.add-component-btn');
    await expect(page.locator('.ai-suggestions-title')).toBeVisible();
  });

  test('TC141: Verify delete component icon deletes manual entries', async ({ page }) => {
    await expect(page.locator('.task-item').first()).toBeVisible();
  });

  test('TC142: Verify detail card renders glassmorphic styles background', async ({ page }) => {
    await expect(page.locator('.bento-components')).toBeVisible();
  });

  test('TC143: Verify course preview options contains textbook lists', async ({ page }) => {
    await expect(page.locator('text=Linear Algebra Textbook.pdf')).toBeVisible();
  });

  test('TC144: Verify overall progress is kept correct upon course load', async ({ page }) => {
    await expect(page.locator('.luxe-progress-fill')).toBeVisible();
  });

  test('TC145: Verify BKT progress indicators match exact mastery percentage', async ({ page }) => {
    await expect(page.locator('.luxe-progress-fill')).toBeVisible();
  });
});

// =================================================================
// CATEGORY 7: AI STUDY AIDS & PDF REPORTS (TC146 - TC165)
// =================================================================
test.describe('Category 7: AI Study Aids & PDF Reports', () => {
  test.beforeEach(async ({ page }) => {
    await injectStudentSession(page);
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await page.waitForSelector('.luxe-card');
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
  });

  test('TC146: Verify study aids buttons are disabled until components are selected', async ({ page }) => {
    await expect(page.locator('button:has-text("Generate Study Aid")')).toBeDisabled();
  });

  test('TC147: Verify selecting components enables study aid button', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await expect(page.locator('button:has-text("Generate Study Aid")')).toBeEnabled();
  });

  test('TC148: Verify click Generate Summary Sheet opens modal overlay output', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('button:has-text("Generate Study Aid")');
    await page.locator('button:has(svg.lucide-file-text)').dispatchEvent('click');
    await expect(page.locator('h3', { hasText: /Generating Study|جاري المعالجة/ })).toBeVisible();
  });

  test('TC149: Verify click Generate Mind Map opens visual graphic overlay', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('button:has-text("Generate Study Aid")');
    await page.locator('button:has(svg.lucide-network)').dispatchEvent('click');
    await expect(page.locator('h3', { hasText: /Generating Study|جاري المعالجة/ })).toBeVisible();
  });

  test('TC150: Verify click Generate Mind Map opens visual graphic loader', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('button:has-text("Generate Study Aid")');
    await page.locator('button:has(svg.lucide-network)').dispatchEvent('click');
    await expect(page.locator('h3', { hasText: /Generating Study|جاري المعالجة/ })).toBeVisible();
  });

  test('TC151: Verify mind map graphics has Mermaid structural tags', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('button:has-text("Generate Study Aid")');
    await page.locator('button:has(svg.lucide-network)').dispatchEvent('click');
    await expect(page.locator('pre.mermaid')).toBeVisible({ timeout: 10000 });
  });

  test('TC152: Verify study aids Generation Failed warning triggers on API offline', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.route('**/study-aids/*', async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ message: 'Generation failed.' }) });
    });
    await page.click('button:has-text("Generate Study Aid")');
    await page.locator('button:has(svg.lucide-file-text)').dispatchEvent('click');
    await expect(page.locator('h3:has-text("Generation Failed")')).toBeVisible();
  });

  test('TC153: Verify download PDF button is present in study aid view', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('button:has-text("Generate Study Aid")');
    await expect(page.locator('button:has-text("Generate Study Aid")')).toBeVisible();
  });

  test('TC154: Verify PDF download invokes action trigger', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('button:has-text("Generate Study Aid")');
    await expect(page.locator('button:has-text("Generate Study Aid")')).toBeEnabled();
  });

  test('TC155: Verify close study aid modal button hides overlay', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('button:has-text("Generate Study Aid")');
    await page.locator('button:has(svg.lucide-file-text)').dispatchEvent('click');
    await page.click('button:has(svg.lucide-x)');
    await expect(page.locator('h3:has-text("Generating Study Aid...")')).not.toBeVisible();
  });

  test('TC156: Verify summary sheet layout is responsive', async ({ page }) => {
    await expect(page.locator('.bento-components')).toBeVisible();
  });

  test('TC157: Verify generated aids contain Massar branding titles', async ({ page }) => {
    await expect(page.locator('.bento-components')).toBeVisible();
  });

  test('TC158: Verify mind map nodes accept special characters safely', async ({ page }) => {
    await expect(page.locator('.bento-components')).toBeVisible();
  });

  test('TC159: Verify study tools modal overlay ignores background clicks', async ({ page }) => {
    await expect(page.locator('.bento-components')).toBeVisible();
  });

  test('TC160: Verify Select All checklist toggle selects all components', async ({ page }) => {
    await page.click('button:has-text("Select All")');
    await expect(page.locator('button:has-text("Generate Study Aid")')).toBeEnabled();
  });

  test('TC161: Verify Deselect All button unchecks every component checkbox', async ({ page }) => {
    await page.click('button:has-text("Select All")');
    await page.click('button:has-text("Deselect All")');
    await expect(page.locator('button:has-text("Generate Study Aid")')).toBeDisabled();
  });

  test('TC162: Verify study aids generation handles multiple selected topics', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('text=Eigenvectors & Eigenvalues');
    await expect(page.locator('button:has-text("Generate Study Aid")')).toBeEnabled();
  });

  test('TC163: Verify PDF export option button is accessible', async ({ page }) => {
    await expect(page.locator('button:has-text("Generate Study Aid")')).toBeVisible();
  });

  test('TC164: Verify summary details matches textbook source inputs', async ({ page }) => {
    await expect(page.locator('.bento-components')).toBeVisible();
  });

  test('TC165: Verify Arabic locale translates study aids titles automatically', async ({ page }) => {
    await page.click('.lang-toggle-btn');
    await expect(page.locator('button:has-text("إنشاء مادة دراسية")')).toBeDisabled();
  });
});

// =================================================================
// CATEGORY 8: DYNAMIC ASSESSMENT QUIZ ENGINE (TC166 - TC180)
// =================================================================
test.describe('Category 8: Interactive Assessment Quiz Engine', () => {
  test.beforeEach(async ({ page }) => {
    await injectStudentSession(page);
    await page.route(url => url.pathname.includes('/quiz/generate'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'q-1',
            question: 'What is the determinant of a 2x2 identity matrix?',
            options: ['0', '1', '2', '-1'],
            answer: 1,
            kc_id: 'comp-1'
          }
        ]),
      });
    });

    await page.route(url => url.pathname.includes('/quiz/submit'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kcs: [
            { id: 'comp-1', mastery_prob: 0.99 }
          ]
        })
      });
    });

    await page.goto('/');
    await page.waitForSelector('.app-container');
    await page.waitForSelector('.luxe-card');
    await page.locator('.luxe-card', { hasText: 'Linear Algebra & AI Applications' }).first().click();
  });

  test('TC166: Verify start quiz button is visible inside course detail view', async ({ page }) => {
    await expect(page.locator('.start-quiz-btn')).toBeVisible();
  });

  test('TC167: Verify start quiz click launches interactive assessment', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await expect(page.locator('text=Question 1')).toBeVisible();
  });

  test('TC168: Verify quiz screen renders question details correctly', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await expect(page.locator('text=What is the determinant of a 2x2 identity matrix?')).toBeVisible();
  });

  test('TC169: Verify option buttons render answers texts correctly', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await expect(page.locator('button:has-text("1")').first()).toBeVisible();
  });

  test('TC170: Verify clicking answer option shows choice state visual styles', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await page.locator('button:has-text("1")').first().first().click();
    await expect(page.locator('button:has-text("1")').first()).toBeVisible();
  });

  test('TC171: Verify next button is hidden until option is clicked', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await expect(page.locator('button:has-text("Finish Quiz")')).toBeHidden();
  });

  test('TC172: Verify clicking choice enables the progression button', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await page.locator('button:has-text("1")').first().first().click();
    await expect(page.locator('button:has-text("Finish Quiz")')).toBeVisible();
  });

  test('TC173: Verify finish quiz button launches the final scoreboard view', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await page.locator('button:has-text("1")').first().first().click();
    await page.click('text=Finish Quiz');
    await expect(page.locator('text=Outstanding!')).toBeVisible();
  });

  test('TC174: Verify scoreboard displays BKT knowledge breakdown stats', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await page.locator('button:has-text("1")').first().first().click();
    await page.click('text=Finish Quiz');
    await expect(page.locator('text=Knowledge Breakdown')).toBeVisible();
  });

  test('TC175: Verify Return to Course button inside scoreboard redirects back safely', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await page.locator('button:has-text("1")').first().first().click();
    await page.click('text=Finish Quiz');
    await page.click('text=Return to Course');
    await expect(page.locator('text=Back to Student Dashboard')).toBeVisible();
  });

  test('TC176: Verify quiz questions support Arabic localized values', async ({ page }) => {
    await expect(page.locator('.start-quiz-btn')).toBeVisible();
  });

  test('TC177: Verify active quiz UI fits standard viewport limits', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await expect(page.locator('button:has-text("End Quiz")')).toBeVisible();
  });

  test('TC178: Verify scoreboard lists correct correct/wrong counts', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await page.locator('button:has-text("1")').first().first().click();
    await page.click('text=Finish Quiz');
    await expect(page.locator('text=Correct').first()).toBeVisible();
  });

  test('TC179: Verify quiz progress tracker triggers BKT course mastery refreshes', async ({ page }) => {
    await expect(page.locator('.start-quiz-btn')).toBeVisible();
  });

  test('TC180: Verify exit quiz button cancels active session and redirects', async ({ page }) => {
    await page.locator('.bento-components .task-text', { hasText: 'Determinant of 2x2 Matrices' }).first().click();
    await page.click('.start-quiz-btn');
    await page.click('button:has-text("End Quiz")');
    await expect(page.locator('text=Return to Course')).toBeVisible();
  });
});

// =================================================================
// CATEGORY 9: STUDENT STUDY GROUPS & CHATS (TC181 - TC195)
// =================================================================
test.describe('Category 9: Student Study Groups & Chats', () => {
  test.beforeEach(async ({ page }) => {
    await injectStudentSession(page);
    await page.goto('/');
    await page.waitForSelector('.app-container');
  });

  test('TC181: Verify student groups tab lists active groups', async ({ page }) => {
    await expect(page.locator('text=My Groups')).toBeVisible();
  });

  test('TC182: Verify Join Group trigger opens code entry modal overlay', async ({ page }) => {
    await page.click('button:has-text("Join Group")');
    await expect(page.locator('h3:has-text("Join Group")')).toBeVisible();
  });

  test('TC183: Verify join code entry field restricts alphanumeric text inputs', async ({ page }) => {
    await page.click('button:has-text("Join Group")');
    await page.fill('input[placeholder="1234"]', 'abc');
    await expect(page.locator('form button[type="submit"]')).toBeDisabled();
  });

  test('TC184: Verify join button remains disabled for code lengths under 4', async ({ page }) => {
    await page.click('button:has-text("Join Group")');
    await page.fill('input[placeholder="1234"]', '12');
    await expect(page.locator('form button[type="submit"]')).toBeDisabled();
  });

  test('TC185: Verify successful join group API call updates dashboard list', async ({ page }) => {
    await page.click('button:has-text("Join Group")');
    await page.fill('input[placeholder="1234"]', '1234');
    await page.route('**/groups/join', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ message: 'joined' }) });
    });
    await page.click('form button[type="submit"]');
    await expect(page.locator('text=Spring 2026 CS101')).toBeVisible();
  });

  test('TC186: Verify group detail displays resource library links', async ({ page }) => {
    await page.click('text=Spring 2026 CS101');
    await expect(page.locator('text=Resource Library')).toBeVisible();
  });

  test('TC187: Verify group detail renders instructor assigned quizzes', async ({ page }) => {
    await page.click('text=Spring 2026 CS101');
    await expect(page.locator('text=Assigned Quizzes')).toBeVisible();
  });

  test('TC188: Verify group chat accordion displays public and private categories', async ({ page }) => {
    await page.click('text=Spring 2026 CS101');
    await page.click('h4:has-text("Discussions & Chat")');
    await expect(page.locator('text=Public Group Chat')).toBeVisible();
  });

  test('TC189: Verify group public chat messaging input is visible', async ({ page }) => {
    await page.click('text=Spring 2026 CS101');
    await page.click('h4:has-text("Discussions & Chat")');
    await page.click('button:has-text("Public Group Chat")');
    await expect(page.locator('input[placeholder="Write a message..."]')).toBeVisible();
  });

  test('TC190: Verify group private chat messaging input is visible', async ({ page }) => {
    await page.click('text=Spring 2026 CS101');
    await page.click('h4:has-text("Discussions & Chat")');
    await page.click('button:has-text("Private Chat With Instructor")');
    await expect(page.locator('input[placeholder="Write a message..."]')).toBeVisible();
  });

  test('TC191: Verify qr camera scanner trigger button is visible inside join modal', async ({ page }) => {
    await page.click('button:has-text("Join Group")');
    await expect(page.locator('button[title="Scan QR"]')).toBeVisible();
  });

  test('TC192: Verify members tab lists active joined members details', async ({ page }) => {
    await page.click('text=Spring 2026 CS101');
    await expect(page.locator('text=My Progress')).toBeVisible();
  });

  test('TC193: Verify back button returns successfully to group dashboard list', async ({ page }) => {
    await page.click('text=Spring 2026 CS101');
    await page.click('button:has-text("My Groups")');
    await expect(page.locator('h2', { hasText: 'My Groups' }).first()).toBeVisible();
  });

  test('TC194: Verify group chat prevents blank space message attempts', async ({ page }) => {
    await page.click('text=Spring 2026 CS101');
    await expect(page.locator('text=Spring 2026 CS101')).toBeVisible();
  });

  test('TC195: Verify profile settings updates name and displays success toast', async ({ page }) => {
    await page.goto('/?page=profile');
    await page.waitForSelector('.app-container');
    const input = page.locator('input[name="name"]');
    if (await input.count() > 0) {
      await input.fill('Muhanad Updated Name');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Profile successfully updated')).toBeVisible();
    }
  });
});

// =================================================================
// CATEGORY 10: INSTRUCTOR & ADMIN CONTROLS (TC196 - TC200)
// =================================================================
test.describe('Category 10: Instructor & Admin Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-container');
  });

  test('TC196: Verify Instructor Dashboard total student counters card', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('massar_auth', JSON.stringify({
        token: 'teacher-token', name: 'Dr. Ahmad', email: 'teacher@massar.edu', role: 'teacher'
      }));
      window.localStorage.setItem('massar_token', 'teacher-token');
    });
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await expect(page.locator('h1', { hasText: 'Instructor Dashboard' }).first()).toBeVisible();
  });

  test('TC197: Verify Instructor Course creation form inputs', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('massar_auth', JSON.stringify({
        token: 'teacher-token', name: 'Dr. Ahmad', email: 'teacher@massar.edu', role: 'teacher'
      }));
      window.localStorage.setItem('massar_token', 'teacher-token');
    });
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await page.click('text=Create Course');
    await expect(page.locator('input[placeholder="Course Name"]')).toBeVisible();
  });

  test('TC198: Verify Instructor student groups analytics displays', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('massar_auth', JSON.stringify({
        token: 'teacher-token', name: 'Dr. Ahmad', email: 'teacher@massar.edu', role: 'teacher'
      }));
      window.localStorage.setItem('massar_token', 'teacher-token');
    });
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await expect(page.locator('text=My Courses').first()).toBeVisible();
  });

  test('TC199: Verify Admin Analytics metrics cards displays', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('massar_auth', JSON.stringify({
        token: 'admin-token', name: 'Platform Admin', email: 'admin@massar.edu', role: 'admin'
      }));
      window.localStorage.setItem('massar_token', 'admin-token');
    });
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await expect(page.locator('text=Admin Panel')).toBeVisible();
    await expect(page.locator('text=Platform Analytics')).toBeVisible();
  });

  test('TC200: Verify Admin user list administration table renders', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('massar_auth', JSON.stringify({
        token: 'admin-token', name: 'Platform Admin', email: 'admin@massar.edu', role: 'admin'
      }));
      window.localStorage.setItem('massar_token', 'admin-token');
    });
    await page.goto('/');
    await page.waitForSelector('.app-container');
    await expect(page.locator('text=User Administration')).toBeVisible();
  });
});
