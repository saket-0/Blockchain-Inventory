// js/ui-elements.js

// --- DOM ELEMENTS ---
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');

const loginEmailInput = document.getElementById('login-email-input');
const loginEmailSelect = document.getElementById('login-email-select');
const quickLoginButton = document.getElementById('quick-login-button');

const appWrapper = document.getElementById('app-wrapper');
const appContent = document.getElementById('app-content');
const logoutButton = document.getElementById('logout-button');

const navLinks = {
    dashboard: document.getElementById('nav-dashboard'),
    products: document.getElementById('nav-products'),
    analytics: document.getElementById('nav-analytics'),
    anomaly: document.getElementById('nav-anomaly'),
    admin: document.getElementById('nav-admin'),
    ledger: document.getElementById('nav-ledger'),
    profile: document.getElementById('nav-profile'),
};

// --- ** NEW: SSE Connection State ** ---
let sseConnection = null;
let currentViewId = 'dashboard'; // Keep track of the current view