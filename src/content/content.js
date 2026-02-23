/**
 * VeloMail - Content Script
 * Minimalist phone preview with live Gmail sync
 * Clean, draggable iPhone mockup
 */

// ==================== CONFIGURATION ====================
const DEBUG = false; // Set to true for development logging
const PERFORMANCE_MONITORING = true; // Track performance metrics
const LANDING_BASE_URL = 'https://velomailext.netlify.app';

// ==================== SETTINGS MANAGEMENT ====================
/**
 * Load settings from chrome storage
 * @returns {Promise<{autoShow: boolean, showNotifications: boolean}>}
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const loadedSettings = result.settings || { autoShow: true, showNotifications: true };
    
    // Update cached settings
    settings.autoShow = loadedSettings.autoShow !== false;
    settings.showNotifications = loadedSettings.showNotifications !== false;
    
    log('Settings loaded:', settings);
    return settings;
  } catch (error) {
    logError('SETTINGS_LOAD_FAILED', error.message);
    // Return defaults on error
    return { autoShow: true, showNotifications: true };
  }
}

// ==================== USAGE TRACKING ====================
/**
 * Check if user has remaining preview quota
 * @returns {Promise<{allowed: boolean, remaining: number, limit: number, isApproachingLimit: boolean}>}
 */
async function checkLimit() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_USAGE_LIMIT'
    });
    
    if (!response) {
      logError('CHECK_LIMIT_NO_RESPONSE', 'Service worker did not respond to usage check');
      return { allowed: true, remaining: 50, limit: 50, isApproachingLimit: false };
    }
    
    return response;
  } catch (error) {
    logError('CHECK_LIMIT_FAILED', error.message);
    // Fail open - allow preview but log error
    return { allowed: true, remaining: 50, limit: 50, isApproachingLimit: false };
  }
}

/**
 * Track preview usage for quota enforcement
 * @returns {Promise<{previews: number, limit: number}>}
 */
async function trackPreview() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRACK_PREVIEW_USAGE'
    });
    
    if (!response) {
      logError('TRACK_PREVIEW_NO_RESPONSE', 'Service worker did not respond to tracking');
      return { previews: 1, limit: 50 };
    }
    
    return response;
  } catch (error) {
    logError('TRACK_PREVIEW_FAILED', error.message);
    return { previews: 1, limit: 50 };
  }
}

// ==================== LOGGING & ERROR TRACKING ====================
const errorLog = [];
const MAX_ERROR_LOG_SIZE = 50;

/**
 * Production-safe logging - only logs in debug mode
 */
function log(...args) {
  if (DEBUG) {
    console.log('📱 VeloMail:', ...args);
  }
}

/**
 * Error logging - always logs and tracks for telemetry
 */
function logError(code, message, context = {}) {
  const error = {
    code,
    message,
    context,
    timestamp: Date.now(),
    url: window.location.href
  };
  
  // Always log errors to console
  console.error(`❌ VeloMail Error [${code}]:`, message, context);
  
  // Track in memory for reporting
  errorLog.push(error);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift();
  }
  
  // Send to service worker for potential analytics
  try {
    chrome.runtime.sendMessage({
      type: 'ERROR_LOGGED',
      error
    }).catch(() => {
      // Service worker may not be available, fail silently
    });
  } catch (e) {
    // Ignore messaging errors
  }
}

/**
 * Warning logging - always shows but not tracked as error
 */
function logWarn(message, ...args) {
  console.warn('⚠️ VeloMail:', message, ...args);
}

// ==================== PERFORMANCE MONITORING ====================
const performanceMetrics = {
  // Array-based tracking for new metrics (last 100 measurements)
  previewRender: [],
  scoreCalculation: [],
  syncLatency: [],
  domQuery: [],
  
  // Counter-based tracking for existing metrics
  updateCount: 0,
  totalUpdateTime: 0,
  heavyOpsCount: 0,
  heavyOpsTime: 0,
  cacheHits: 0,
  cacheMisses: 0
};

function trackPerformance(metric, duration) {
  if (!PERFORMANCE_MONITORING) return;
  
  if (!performanceMetrics[metric]) {
    performanceMetrics[metric] = [];
  }
  
  performanceMetrics[metric].push(duration);
  
  // Keep last 100 measurements
  if (performanceMetrics[metric].length > 100) {
    performanceMetrics[metric].shift();
  }
  
  // Warn if performance degrades
  if (performanceMetrics[metric].length >= 10) {
    const recent = performanceMetrics[metric].slice(-10);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    
    const thresholds = {
      previewRender: 100,
      scoreCalculation: 50,
      syncLatency: 200,
      domQuery: 10
    };
    
    if (avg > thresholds[metric]) {
      logWarn(`Performance degraded: ${metric} averaging ${avg.toFixed(2)}ms (threshold: ${thresholds[metric]}ms)`);
    }
  }
}

function measurePerformance(fn, metricName) {
  return async function(...args) {
    const start = performance.now();
    try {
      const result = await fn.apply(this, args);
      const duration = performance.now() - start;
      trackPerformance(metricName, duration);
      if (DEBUG && duration > 50) {
        log(`${metricName} took ${duration.toFixed(2)}ms`);
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logError(`${metricName.toUpperCase()}_ERROR`, error.message, { duration });
      throw error;
    }
  };
}

// ==================== SAFE DOM OPERATIONS ====================
/**
 * Safe querySelector with error handling
 */
function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    logError('DOM_QUERY_ERROR', `Failed to query: ${selector}`, { error: error.message });
    return null;
  }
}

/**
 * Safe querySelectorAll with error handling
 */
function safeQuerySelectorAll(selector, context = document) {
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (error) {
    logError('DOM_QUERY_ALL_ERROR', `Failed to query all: ${selector}`, { error: error.message });
    return [];
  }
}

/**
 * Safe element creation with error recovery
 */
function safeCreateElement(tag, attributes = {}) {
  try {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      try {
        if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else {
          element[key] = value;
        }
      } catch (e) {
        logError('ELEMENT_ATTRIBUTE_ERROR', `Failed to set ${key}`, { tag, error: e.message });
      }
    });
    return element;
  } catch (error) {
    logError('CREATE_ELEMENT_ERROR', `Failed to create ${tag}`, { error: error.message });
    return null;
  }
}

console.log('📱 VeloMail v1.0.1 - Minimalist Preview module loaded - CODE UPDATED FEB 13');

// ==================== STATE MANAGEMENT ====================
let overlayContainer = null;
let shadowRoot = null;
let isDragging = false;
let hasMoved = false;
let dragOffset = { x: 0, y: 0 };
let currentComposeBody = null;
let currentSubjectField = null;
let isCollapsed = false;
let isAttachedToCompose = false; // Track if we're syncing with compose (separate from UI visibility)

// Settings cache
let settings = {
  autoShow: true,
  showNotifications: true
};

// Pre-flight checklist state
let preflightChecks = {
  subjectFrontLoaded: false,   // Subject hook in first 30 chars
  ctaAboveFold: false,          // CTA visible in first screen (250 chars)
  linkTapability: false         // Links properly spaced and sized
};

// Track last logged warning state to prevent duplicates
let lastWarningState = null;

// ==================== STATE VALIDATION ====================
/**
 * Validate email state object
 */
function validateEmailState(state) {
  if (!state || typeof state !== 'object') {
    return false;
  }
  
  // Required fields
  const required = ['isActive', 'html', 'text', 'subject'];
  for (const field of required) {
    if (!(field in state)) {
      logError('STATE_VALIDATION_ERROR', `Missing required field: ${field}`, { state });
      return false;
    }
  }
  
  // Type validation
  if (typeof state.isActive !== 'boolean') {
    logError('STATE_VALIDATION_ERROR', 'isActive must be boolean', { type: typeof state.isActive });
    return false;
  }
  
  if (typeof state.html !== 'string' || typeof state.text !== 'string' || typeof state.subject !== 'string') {
    logError('STATE_VALIDATION_ERROR', 'html, text, subject must be strings');
    return false;
  }
  
  // Bounds validation
  if (state.text.length > 1000000) {
    logWarn('Email text is very large', { length: state.text.length });
  }
  
  return true;
}

/**
 * Create safe default state
 */
function getDefaultState() {
  return {
    isActive: false,
    html: '',
    text: '',
    subject: '',
    characterCount: 0,
    wordCount: 0,
    environment: null,
    mobileScore: null,
    timestamp: Date.now()
  };
}

// ==================== PERFORMANCE OPTIMIZATION ====================
// Debounce timers and RAF handles
let updatePreviewRAF = null;
let heavyOperationsTimer = null;
let serviceWorkerThrottle = null;
let lastContentHash = null;
let lastSubjectHash = null;

// Performance metrics (merged with new tracking system above at line 112)
// Note: performanceMetrics is declared earlier in the file with array-based tracking

// Enhanced caching with LRU (Least Recently Used) eviction
class LRUCache {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  set(key, value) {
    // Delete if exists (to reorder)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add to end
    this.cache.set(key, value);
    
    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// Cache for expensive operations with LRU eviction
const operationCache = {
  ctaCheck: new LRUCache(30),        // CTA detection results
  preflightResults: new LRUCache(30), // Pre-flight check results
  scoreCalc: new LRUCache(30)         // Score calculation results
};

// Reusable DOM container for measurements (avoid creating/destroying)
let measurementContainer = null;

function getMeasurementContainer() {
  if (!measurementContainer) {
    measurementContainer = document.createElement('div');
    measurementContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      width: 343px;
      font-size: 17px;
      line-height: 1.47;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      padding: 24px 16px;
      visibility: hidden;
      pointer-events: none;
    `;
    document.body.appendChild(measurementContainer);
  }
  return measurementContainer;
}

// ==================== PERFORMANCE UTILITIES ====================

/**
 * Fast hash function for content comparison
 * @param {string} str - String to hash
 * @returns {number} Hash code
 */
function fastHash(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Debounce function - delays execution until after wait time
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in ms
 * @returns {Function} Throttled function
 */
function throttle(func, wait) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

/**
 * Log performance metric
 */
function logPerformance(operation, duration) {
  if (operation === 'update') {
    performanceMetrics.updateCount++;
    performanceMetrics.totalUpdateTime += duration;
  } else if (operation === 'heavy') {
    performanceMetrics.heavyOpsCount++;
    performanceMetrics.heavyOpsTime += duration;
  }
  
  // Log summary every 50 updates
  if (performanceMetrics.updateCount % 50 === 0 && performanceMetrics.updateCount > 0) {
    const avgUpdate = (performanceMetrics.totalUpdateTime / performanceMetrics.updateCount).toFixed(2);
    const avgHeavy = performanceMetrics.heavyOpsCount > 0 ? 
      (performanceMetrics.heavyOpsTime / performanceMetrics.heavyOpsCount).toFixed(2) : 0;
    const cacheHitRate = performanceMetrics.cacheHits + performanceMetrics.cacheMisses > 0 ?
      ((performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100).toFixed(1) : 0;
    
    console.log('📊 VeloMail Performance Summary:');
    console.log(`   Updates: ${performanceMetrics.updateCount} (avg: ${avgUpdate}ms)`);
    console.log(`   Heavy ops: ${performanceMetrics.heavyOpsCount} (avg: ${avgHeavy}ms)`);
    console.log(`   Cache hit rate: ${cacheHitRate}%`);
  }
}

// ==================== GMAIL SELECTORS ====================
// Task 1: Detection selectors for compose container
const GMAIL_SELECTORS = {
  // Compose window containers (Task 1 requirement: .AD or div[role="dialog"])
  composeWindow: '[role="dialog"]',      // Primary: Modern Gmail compose
  composeWindowAD: '.AD',                 // Gmail compose class
  composeWindowAlt: '.nH.aHU',           // Alternate compose selector
  
  // Compose body (Task 3 requirement: div[role="textbox"])
  composeBody: '[role="textbox"][aria-label*="Message"]',
  
  // Fallback selectors for different Gmail versions
  composeBodyFallbacks: [
    '[role="textbox"][aria-label*="message"]',
    '[role="textbox"][g_editable="true"]',
    '[contenteditable="true"][role="textbox"]',
    '.editable[role="textbox"]',
    '[aria-label*="Message body"]',
    'div[contenteditable="true"][aria-label]',
    '.Am.Al.editable',
    'div[g_editable="true"]'
  ],
  
  // Subject line
  subjectField: 'input[name="subjectbox"]'
};

// ==================== INITIALIZATION ====================

/**
 * Initialize the content script
 */
async function initialize() {
  console.log('🚀 Initializing VeloMail');
  
  // Wait for Gmail to fully load
  if (!document.querySelector('[role="main"]')) {
    console.log('⏳ Waiting for Gmail to load...');
    setTimeout(initialize, 1000);
    return;
  }
  
  console.log('✅ Gmail loaded, starting compose detection');
  
  // Load settings from storage
  await loadSettings();
  
  // Check if we should show first compose guide
  checkAndShowOnboarding();
  
  // Task 1: Use MutationObserver to watch for compose window
  watchForComposeWindow();
}

/**
 * Check if user should see first compose guide
 */
async function checkAndShowOnboarding() {
  try {
    const result = await chrome.storage.local.get(['onboardingState', 'milestones']);
    const onboardingState = result.onboardingState || {};
    const milestones = result.milestones || [];
    
    // Check if welcome was completed but guide not shown yet
    const welcomeCompleted = onboardingState.welcomeCompleted || false;
    const guideShown = onboardingState.firstComposeGuideShown || false;
    const hasComposedBefore = milestones.find(m => m.id === 'first_compose');
    const guideSkipped = onboardingState.guideSkipped || false;
    
    if (welcomeCompleted && !guideShown && !hasComposedBefore && !guideSkipped) {
      console.log('🎯 Showing first compose guide');
      
      // Load and show the guide after a short delay
      setTimeout(() => {
        loadFirstComposeGuide();
      }, 2000);
    }
  } catch (error) {
    console.error('❌ Failed to check onboarding status:', error);
  }
}

/**
 * Load and show the first compose guide
 */
function loadFirstComposeGuide() {
  // Check if script is already loaded or loading
  if (window.VeloMailFirstComposeGuide || window.VeloMailGuideLoading) {
    // Script already loaded, show the guide directly
    if (window.VeloMailFirstComposeGuide) {
      window.VeloMailFirstComposeGuide.showFirstComposeGuide();
    }
    return;
  }
  
  // Mark as loading to prevent duplicate loads
  window.VeloMailGuideLoading = true;
  
  // Inject the guide script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/lib/first-compose-guide.js');
  script.onload = () => {
    window.VeloMailGuideLoading = false;
    // Show the guide
    if (window.VeloMailFirstComposeGuide) {
      window.VeloMailFirstComposeGuide.showFirstComposeGuide();
    }
  };
  script.onerror = () => {
    window.VeloMailGuideLoading = false;
  };
  document.head.appendChild(script);
}

/**
 * Task 1: Detection Logic
 * Use MutationObserver to watch for Gmail compose container
 * Selectors: .AD or div[role="dialog"]
 */
function watchForComposeWindow() {
  console.log('👀 Starting MutationObserver for compose detection');
  
  const observer = new MutationObserver((mutations) => {
    // Check if compose window exists
    const composeWindow = findComposeWindow();
    
    // Task 2: Attachment and UI Logic (separated)
    if (composeWindow && !isAttachedToCompose) {
      console.log('✅ Compose box detected - attaching for sync');
      handleComposeDetected(composeWindow);
    } else if (!composeWindow && isAttachedToCompose) {
      console.log('❌ Compose box closed - cleaning up');
      removePreview();
    }
  });
  
  // Observe entire body for compose window appearing/disappearing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ MutationObserver active');
  
  // Check if compose is already open on page load
  const existingCompose = findComposeWindow();
  if (existingCompose) {
    console.log('✅ Found existing compose window on load');
    handleComposeDetected(existingCompose);
  } else {
    console.log('ℹ️ No compose window open - UI will appear when you click Compose');
  }
}

/**
 * Handle compose window detection - separates attachment from UI creation
 * This ensures sync happens even when autoShow is disabled
 */
async function handleComposeDetected(composeWindow) {
  console.log('📧 Handling compose window detection');
  console.log('   autoShow setting:', settings.autoShow);
  
  // CRITICAL: Set flag immediately to prevent duplicate calls while processing
  if (isAttachedToCompose) {
    console.log('ℹ️ Already attached to compose - skipping duplicate detection');
    return;
  }
  isAttachedToCompose = true; // Set BEFORE async operations to block duplicate calls
  
  // Notify service worker that compose opened
  const environment = window.location.hostname.includes('mail.google.com') ? 'gmail' : 
                       window.location.hostname.includes('outlook') ? 'outlook' : 
                       'unknown';
  
  chrome.runtime.sendMessage({
    type: 'COMPOSE_OPENED',
    environment: environment
  }).catch(error => {
    console.error('❌ Error notifying service worker:', error);
  });
  
  // Create UI first if autoShow is enabled (so error display works)
  if (settings.autoShow) {
    console.log('✅ autoShow enabled - creating preview UI');
    await createPreviewUI(composeWindow);
  }
  
  // Now attach to compose for syncing
  console.log('🔗 Attaching to compose window for sync...');
  const attached = await attachToCompose(composeWindow);
  
  if (attached) {
    console.log('✅ Successfully attached to compose');
  } else {
    console.error('❌ Failed to attach to compose');
    isAttachedToCompose = false; // Only reset to false if attachment actually failed
    
    // Show error if UI exists
    if (settings.autoShow && shadowRoot) {
      showError('Unable to detect Gmail compose area. Please check console for details.');
    }
  }
}

/**
 * Find compose window using Gmail selectors
 * Only returns compose dialog, not other dialogs
 */
function findComposeWindow() {
  // Get all dialog elements
  const dialogs = document.querySelectorAll('[role="dialog"]');
  
  // Find the one that contains a subject field (compose specific)
  for (let dialog of dialogs) {
    const hasSubject = dialog.querySelector('input[name="subjectbox"]');
    const hasTextbox = dialog.querySelector('[role="textbox"]');
    
    if (hasSubject || hasTextbox) {
      console.log('✅ Found compose dialog with subject/textbox');
      return dialog;
    }
  }
  
  // Try .AD class (Gmail compose container)
  let composeWindow = document.querySelector(GMAIL_SELECTORS.composeWindowAD);
  if (composeWindow) {
    console.log('✅ Found compose with .AD class');
    return composeWindow;
  }
  
  // Try .nH.aHU (alternate Gmail compose selector)
  composeWindow = document.querySelector(GMAIL_SELECTORS.composeWindowAlt);
  if (composeWindow) {
    console.log('✅ Found compose with .nH.aHU class');
    return composeWindow;
  }
  
  return null;
}

// ==================== UPGRADE MODAL ====================

/**
 * First day of next month for "Resets on [date]" copy
 * @returns {string} e.g. "March 1, 2026"
 */
function getResetsOnDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Apply at-limit UI: blur preview, show paywall bottom sheet, lock preview toggles.
 * Call when limitCheck.allowed === false.
 * @param {Object} [limitCheck] - Result from checkLimit(); if omitted, will fetch
 */
async function applyAtLimitUI(limitCheck) {
  if (!shadowRoot) return;
  const check = limitCheck || await checkLimit();
  if (check.allowed) return;
  
  const container = shadowRoot.getElementById('previewContainer');
  const sheet = shadowRoot.getElementById('paywallSheet');
  const resetsEl = shadowRoot.getElementById('paywallResetsDate');
  const usageEl = shadowRoot.getElementById('paywallUsageCount');
  if (container) container.classList.add('at-limit');
  if (resetsEl) resetsEl.textContent = `Resets on ${getResetsOnDate()}.`;
  if (usageEl) usageEl.textContent = `${check.limit} / ${check.limit} sends used this month`;
  if (sheet) {
    sheet.classList.add('visible');
    sheet.setAttribute('aria-hidden', 'false');
  }
  
  const upgradeBtn = shadowRoot.getElementById('paywallUpgradeBtn');
  const waitBtn = shadowRoot.getElementById('paywallWaitBtn');
  if (upgradeBtn && !upgradeBtn.hasAttribute('data-paywall-bound')) {
    upgradeBtn.setAttribute('data-paywall-bound', '1');
    upgradeBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_UPGRADE_URL' });
    });
  }
  if (waitBtn && !waitBtn.hasAttribute('data-paywall-bound')) {
    waitBtn.setAttribute('data-paywall-bound', '1');
    waitBtn.addEventListener('click', () => {
      if (sheet) {
        sheet.classList.remove('visible');
        sheet.setAttribute('aria-hidden', 'true');
      }
      // Keep blur + lock; user chose to wait
    });
  }
}

/**
 * Show upgrade modal when user hits free tier limit (standalone modal, e.g. from popup)
 * @param {Object} limitCheck - Result from checkLimit()
 */
async function showUpgradeModal(limitCheck) {
  // Remove any existing modal
  const existingModal = document.getElementById('velocmail-upgrade-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Get upgrade message
  const upgradeMsg = await getUpgradeMessage(limitCheck);
  if (!upgradeMsg) return;
  
  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'velocmail-upgrade-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: fadeIn 0.2s ease-out;
  `;
  
  // Create modal content
  const content = document.createElement('div');
  content.style.cssText = `
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 0.5px solid rgba(0, 0, 0, 0.06);
    border-radius: 20px;
    padding: 40px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    animation: slideUp 0.3s ease-out;
  `;
  
  const urgencyColor = upgradeMsg.urgency === 'high' ? '#ef4444' : 
                       upgradeMsg.urgency === 'medium' ? '#f59e0b' : '#3b82f6';
  
  content.innerHTML = `
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
    
    <div style="text-align: center;">
      <!-- Icon -->
      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, ${urgencyColor}, ${urgencyColor}dd); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      
      <!-- Title -->
      <h2 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px 0;">
        ${upgradeMsg.title}
      </h2>
      
      <!-- Message -->
      <p style="font-size: 16px; line-height: 1.6; color: #6b7280; margin: 0 0 32px 0;">
        ${upgradeMsg.message}
      </p>
      
      <!-- Features -->
      <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: left;">
        <h3 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0; text-align: center;">
          ✨ Upgrade to Pro
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink: 0; margin-top: 2px;">
              <circle cx="10" cy="10" r="10" fill="#10b981"/>
              <path d="M6 10l2.5 2.5L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span style="font-size: 14px; color: #374151; line-height: 1.5;">
              <strong>Unlimited previews</strong> - No monthly limits
            </span>
          </div>
          <div style="display: flex; align-items: start; gap: 12px;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink: 0; margin-top: 2px;">
              <circle cx="10" cy="10" r="10" fill="#10b981"/>
              <path d="M6 10l2.5 2.5L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span style="font-size: 14px; color: #374151; line-height: 1.5;">
              <strong>Advanced analytics</strong> - Score history & trends
            </span>
          </div>
          <div style="display: flex; align-items: start; gap: 12px;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink: 0; margin-top: 2px;">
              <circle cx="10" cy="10" r="10" fill="#10b981"/>
              <path d="M6 10l2.5 2.5L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span style="font-size: 14px; color: #374151; line-height: 1.5;">
              <strong>Priority support</strong> - Get help when you need it
            </span>
          </div>
        </div>
        
        <!-- Pricing -->
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #1a1a1a; line-height: 1;">
            $19<span style="font-size: 16px; font-weight: 400; color: #6b7280;">/month</span>
          </div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
            or $159/year (save $69)
          </div>
        </div>
      </div>
      
      <!-- Buttons -->
      <div style="display: flex; gap: 12px;">
        <button id="velocmail-upgrade-btn" style="
          flex: 1;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'">
          ${upgradeMsg.cta}
        </button>
        ${upgradeMsg.dismissible ? `
        <button id="velocmail-dismiss-btn" style="
          flex: 0;
          background: transparent;
          color: #6b7280;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#d1d5db'; this.style.color='#374151'" onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='#6b7280'">
          Maybe Later
        </button>
        ` : ''}
      </div>
      
      <p style="font-size: 12px; color: #9ca3af; margin: 16px 0 0 0;">
        Your data stays private. No credit card required to continue using free tier next month.
      </p>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event listeners
  const upgradeBtn = document.getElementById('velocmail-upgrade-btn');
  const dismissBtn = document.getElementById('velocmail-dismiss-btn');
  
  upgradeBtn?.addEventListener('click', () => {
    console.log('💎 Upgrade clicked');
    chrome.runtime.sendMessage({ type: 'OPEN_UPGRADE_URL' });
    modal.remove();
  });
  
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      console.log('👋 Upgrade dismissed');
      modal.remove();
    });
  }
  
  // Close on backdrop click (only if dismissible)
  if (upgradeMsg.dismissible) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

// ==================== THE OVERLAY (PERSISTENT FLOATING DIV) ====================

/**
 * Task 2: Create Preview UI (separated from attachment logic)
 * Creates persistent floating div that stays on screen
 * Note: This only creates the UI, attachment happens separately in handleComposeDetected
 * @param {HTMLElement} composeWindow - The detected compose window element
 */
async function createPreviewUI(composeWindow) {
  // Check both JS variable AND actual DOM element
  const existingOverlay = document.getElementById('email-mobility-overlay');
  
  console.log('🔍 DEBUG: createPreviewUI called', {
    overlayContainer: !!overlayContainer,
    existingOverlay: !!existingOverlay
  });
  
  if (overlayContainer || existingOverlay) {
    if (existingOverlay && !overlayContainer) {
      // Clean up orphaned overlay from previous session
      console.log('✅ FIX APPLIED: 🧹 Cleaning orphaned overlay element (preventing duplication)');
      existingOverlay.remove();
      // Continue to create new one
    } else {
      console.log('ℹ️ Preview UI already exists (skipping creation)');
      return;
    }
  }
  
  console.log('🎨 Creating new preview UI...');
  
  // ==================== USAGE LIMIT CHECK ====================
  // Check if user has reached their free tier limit
  log('Checking usage limits...');
  const startUsageCheck = performance.now();
  const limitCheck = await checkLimit();
  trackPerformance('usageCheck', performance.now() - startUsageCheck);
  
  if (!limitCheck.allowed) {
    console.warn('⛔ VeloMail: Usage limit reached - will create preview with blur + paywall', limitCheck);
    // Still create preview; applyAtLimitUI will blur + show paywall + lock toggles
  } else if (limitCheck.isApproachingLimit) {
    console.warn(`⚠️ VeloMail: Approaching limit - ${limitCheck.remaining} previews remaining`);
  } else {
    console.log('✅ VeloMail: Usage check passed, creating preview...', limitCheck);
  }
  
  log('Creating Phone Preview UI');
  
  // Create container with fixed positioning
  try {
    overlayContainer = document.createElement('div');
    overlayContainer.id = 'email-mobility-overlay';
    overlayContainer.style.cssText = `
      position: fixed;
      top: 80px;
      right: 40px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: auto;
    `;
    
    // Attach Shadow DOM for style isolation
    // CRUCIAL: mode: 'open' allows styling isolation from Gmail's global styles
    shadowRoot = overlayContainer.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = getOverlayHTML();
    
    // Append to body
    document.body.appendChild(overlayContainer);
    
    // Setup dragging and interactions
    setupEventListeners();
    
    log('Phone Preview UI injected');
  } catch (error) {
    console.error('❌ VeloMail: Failed to create preview overlay:', error);
    logError('PREVIEW_CREATION_FAILED', 'Failed to create preview overlay', { error: error.message });
    return;
  }
  
  // Verify shadow DOM elements exist
  try {
    const previewContent = shadowRoot.getElementById('previewContent');
    const subjectDisplay = shadowRoot.getElementById('subjectDisplay');
    const dragHandle = shadowRoot.getElementById('dragHandle');
    
    if (!previewContent || !subjectDisplay || !dragHandle) {
      console.error('❌ VeloMail: Critical shadow DOM elements missing', {
        previewContent: !!previewContent,
        subjectDisplay: !!subjectDisplay,
        dragHandle: !!dragHandle
      });
      logError('SHADOW_DOM_ERROR', 'Critical shadow DOM elements missing', {
        previewContent: !!previewContent,
        subjectDisplay: !!subjectDisplay,
        dragHandle: !!dragHandle
      });
      return;
    }
    
    console.log('✅ VeloMail: Shadow DOM elements verified');
    log('Shadow DOM elements verified');
  } catch (error) {
    console.error('❌ VeloMail: Failed to verify shadow DOM:', error);
    logError('SHADOW_DOM_VERIFY_ERROR', 'Failed to verify shadow DOM', { error: error.message });
    return;
  }
  
  console.log('✅ Preview UI created successfully');
  
  if (!limitCheck.allowed) {
    applyAtLimitUI(limitCheck);
  }
  
  // ==================== ONBOARDING: FIRST PREVIEW MILESTONE ====================
  checkFirstPreviewMilestone();
}

/**
 * Check and celebrate first preview milestone
 */
async function checkFirstPreviewMilestone() {
  try {
    const result = await chrome.storage.local.get(['milestones', 'onboardingState']);
    const milestones = result.milestones || [];
    const onboardingState = result.onboardingState || {};
    
    const hasFirstPreview = milestones.find(m => m.id === 'first_preview');
    
    if (!hasFirstPreview) {
      console.log('🎉 First preview milestone!');
      
      // Send message to service worker to track milestone
      chrome.runtime.sendMessage({
        type: 'MILESTONE_ACHIEVED',
        milestoneId: 'first_preview'
      });
      
      // Wait for first score update, then show celebration
      setTimeout(() => {
        showFirstPreviewCelebrationIfNeeded();
      }, 3000);
    }
  } catch (error) {
    console.error('❌ Failed to check first preview milestone:', error);
  }
}

/**
 * Show celebration for first preview with score
 */
async function showFirstPreviewCelebrationIfNeeded() {
  try {
    // Load the first compose guide script if not loaded
    if (!window.VeloMailFirstComposeGuide) {
      // Check if already loading
      if (window.VeloMailGuideLoading) {
        // Wait for the existing load to complete
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (window.VeloMailFirstComposeGuide || !window.VeloMailGuideLoading) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      } else {
        // Load the script
        window.VeloMailGuideLoading = true;
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL('src/lib/first-compose-guide.js');
          script.onload = () => {
            window.VeloMailGuideLoading = false;
            resolve();
          };
          script.onerror = () => {
            window.VeloMailGuideLoading = false;
            resolve();
          };
          document.head.appendChild(script);
        });
      }
    }
    
    const result = await chrome.storage.local.get(['milestones', 'onboardingState']);
    const milestones = result.milestones || [];
    const onboardingState = result.onboardingState || {};
    const hasFirstPreview = milestones.find(m => m.id === 'first_preview');
    const celebrationShown = onboardingState.firstPreviewCelebrationShown || false;
    
    // Get current email state to show score
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_EMAIL_STATE' }, (response) => {
      if (response && response.state && response.state.mobileScore && !celebrationShown) {
        if (window.VeloMailFirstComposeGuide) {
          window.VeloMailFirstComposeGuide.showFirstPreviewCelebration(response.state.mobileScore);
          
          // Mark celebration as shown
          onboardingState.firstPreviewCelebrationShown = true;
          chrome.storage.local.set({ onboardingState });
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to show first preview celebration:', error);
  }
}

/**
 * Get overlay HTML structure - Minimalist phone-only design with Pre-Flight Checklist
 */
function getOverlayHTML() {
  return `
    <style>${getOverlayStyles()}</style>
    
    <div class="preview-container" id="previewContainer">
      <!-- Collapsed Logo State -->
      <div class="collapsed-logo" id="collapsedLogo" style="display: none;">
        <img class="collapsed-logo-img" src="${chrome.runtime.getURL('assets/images/icon48.png')}?v=${chrome.runtime.getManifest().version}" width="36" height="36" alt="VeloMail" draggable="false" />
      </div>
      
      <!-- Full Phone Preview -->
      <div class="phone-mockup" id="dragHandle" draggable="false">
        <!-- Collapse Button -->
        <button class="collapse-btn" id="collapseBtn" title="Collapse preview">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <!-- Preview toggles (dark mode simulation) - locked when at limit -->
        <div class="preview-toggles">
          <button type="button" class="toggle-btn" id="darkSimToggle" data-dark-toggle title="Simulate device dark mode">Dark</button>
        </div>
        
        <!-- iPhone Frame -->
        <div class="phone-bezel">
          <!-- Dynamic Island -->
          <div class="dynamic-island"></div>
          
          <!-- Screen -->
          <div class="phone-screen" id="phoneScreen">
            <!-- iOS Home Indicator -->
            <div class="home-indicator"></div>
            
            <!-- Status Bar -->
            <div class="status-bar">
              <span class="time">9:41</span>
              <div class="status-icons">
                <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                  <rect x="0.5" y="1.5" width="3" height="5" rx="0.5" fill="currentColor"/>
                  <rect x="4.5" y="0.5" width="3" height="7" rx="0.5" fill="currentColor"/>
                  <rect x="8.5" y="2.5" width="3" height="5" rx="0.5" fill="currentColor"/>
                  <rect x="12.5" y="3.5" width="2" height="4" rx="0.5" fill="currentColor"/>
                </svg>
                <svg width="24" height="11" viewBox="0 0 24 11" fill="none">
                  <rect x="0.5" y="0.5" width="17" height="10" rx="2.5" stroke="currentColor" fill="none"/>
                  <rect x="19" y="3" width="4" height="5" rx="1" fill="currentColor"/>
                  <rect x="2" y="2.5" width="13" height="6" rx="1" fill="currentColor"/>
                </svg>
              </div>
            </div>
            
            <!-- Mail Interface (Gmail Mobile clone) -->
            <div class="mail-header">
              <button type="button" class="header-cancel">Cancel</button>
              <div class="header-title">New Message</div>
              <button type="button" class="header-send">Send</button>
            </div>
            
            <!-- Email Content (To/From/Subject rows, 1px #C6C6C8 dividers) -->
            <div class="email-container">
              <div class="email-row email-to">
                <span class="email-row-label">To</span>
                <span class="email-row-value">Recipient</span>
              </div>
              <div class="email-row email-from-row">
                <span class="email-row-label">From</span>
                <div class="from-details">
                  <span class="from-name">You</span>
                  <span class="from-email">your@email.com</span>
                </div>
              </div>
              <div class="email-row email-subject-row">
                <span class="email-row-label">Subject</span>
                <div class="email-subject" id="subjectDisplay">No subject</div>
                <span class="subject-char-count" id="subjectCharCount"></span>
              </div>
              
              <div class="email-body" id="previewContent">
                <div class="empty-state">Start typing to see preview</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Paywall modal (centered with blurred background) - shown when at limit -->
      <div class="paywall-sheet" id="paywallSheet" aria-hidden="true">
        <div class="paywall-sheet-scrim"></div>
        <div class="paywall-sheet-surface">
          <div class="paywall-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <p class="paywall-sheet-headline">You've hit your monthly limit</p>
          <p class="paywall-sheet-copy">Upgrade to Pro for unlimited sends and never miss a sales opportunity.</p>
          <p class="paywall-sheet-usage" id="paywallUsageCount"></p>
          <p class="paywall-sheet-reset" id="paywallResetsDate">Resets next month.</p>
          <div class="paywall-sheet-actions">
            <button type="button" class="paywall-btn-primary" id="paywallUpgradeBtn">Upgrade to Pro — $9/mo</button>
            <button type="button" class="paywall-btn-secondary" id="paywallWaitBtn">Wait for Reset</button>
          </div>
        </div>
      </div>

      <!-- Sent toast notification -->
      <div class="sent-toast" id="sentToast" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Get overlay CSS styles - Clean minimalist phone mockup with Pre-Flight Checklist
 */
function getOverlayStyles() {
  return `
    /* Glass tokens (match popup) */
    :root, .preview-container {
      --black: #07020d;
      --sky-surge: #5db7de;
      --soft-linen: #f1e9db;
      --khaki-beige: #a39b8b;
      --dim-grey: #716a5c;
      --bg-page: #f2f2f2;
      --glass-bg-light: rgba(255, 255, 255, 0.72);
      --glass-bg-dark: rgba(28, 28, 30, 0.72);
      --glass-border-light: rgba(0, 0, 0, 0.06);
      --glass-border-dark: rgba(255, 255, 255, 0.12);
      --glass-blur: blur(20px) saturate(180%);
      --glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    }
    
    /* ============================================================================
       iOS 17/18 NATIVE DESIGN SYSTEM
       ============================================================================ */
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* ============================================================================
       PREVIEW CONTAINER
       ============================================================================ */
    
    .preview-container {
      display: flex;
      flex-direction: column;
      position: relative;
    }
    
    /* ============================================================================
       COLLAPSED STATE - Floating Action Button (iOS Style)
       ============================================================================ */
    
    .collapsed-logo {
      width: 60px;
      height: 60px;
      border-radius: 20px;
      background: var(--glass-bg-light);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      box-shadow: var(--glass-shadow);
      border: 0.5px solid var(--glass-border-light);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      animation: fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      user-select: none;
      overflow: hidden;
    }
    
    .collapsed-logo:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(0, 0, 0, 0.08);
    }
    
    .collapsed-logo:active {
      cursor: grabbing;
      transform: scale(0.96);
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .collapsed-logo.dragging {
      opacity: 0.6;
    }
    
    .collapsed-logo-img {
      display: block;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      pointer-events: none;
      user-select: none;
    }
    
    /* ============================================================================
       COLLAPSE BUTTON - iOS Control Center Style
       ============================================================================ */
    
    .collapse-btn {
      position: absolute;
      top: -10px;
      right: 10px;
      width: 36px;
      height: 36px;
      min-height: 36px; /* iOS minimum touch target */
      border-radius: 50%;
      /* iOS Glassmorphism - translucent material */
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 0.5px solid rgba(255, 255, 255, 0.15);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1000;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      /* Subtle shadow for depth */
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .collapse-btn:hover {
      background: rgba(0, 0, 0, 0.85);
      transform: scale(1.08);
    }
    
    .collapse-btn:active {
      transform: scale(0.92);
      transition: all 0.1s;
    }
    
    /* ============================================================================
       PHONE MOCKUP - iPhone 15 Pro Frame
       ============================================================================ */
    
    .phone-mockup {
      width: 375px;
      cursor: grab;
      user-select: none;
      -webkit-user-drag: none;
      -webkit-user-select: none;
      animation: fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      transition: opacity 0.2s ease;
      position: relative;
    }
    
    .phone-mockup.dragging {
      opacity: 0.6;
      cursor: grabbing;
    }
    
    .phone-mockup:active {
      cursor: grabbing;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    /* ============================================================================
       IPHONE BEZEL - Authentic iPhone 15 Pro Design
       ============================================================================ */
    
    .phone-bezel {
      background: #1a1a1a;
      border: 12px solid #1a1a1a;
      border-radius: 55px;
      padding: 8px;
      box-shadow:
        0 16px 48px rgba(0, 0, 0, 0.2),
        0 8px 24px rgba(0, 0, 0, 0.12),
        inset 0 0 0 1px rgba(255, 255, 255, 0.06);
      position: relative;
    }
    
    /* ============================================================================
       DYNAMIC ISLAND - iPhone 15 Pro Feature
       ============================================================================ */
    
    .dynamic-island {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: 126px;
      height: 37px;
      background: #000000;
      border-radius: 20px; /* Squircle to match iOS design */
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    
    /* ============================================================================
       PHONE SCREEN - iOS System Background
       ============================================================================ */
    
    .phone-screen {
      background: linear-gradient(180deg, rgba(245, 245, 247, 0.98) 0%, rgba(232, 232, 237, 0.95) 100%);
      border-radius: 43px;
      overflow: hidden;
      position: relative;
      height: 812px;
      display: flex;
      flex-direction: column;
    }
    
    /* ============================================================================
       HOME INDICATOR - iOS Gesture Bar (Bottom of iPhone)
       ============================================================================ */
    
    .home-indicator {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 134px;
      height: 5px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 100px;
      z-index: 1000;
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      border: 0.5px solid rgba(255, 255, 255, 0.08);
    }
    
    /* ============================================================================
       STATUS BAR - iOS System UI (9:41 AM)
       ============================================================================ */
    
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 56px 24px 8px;
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      position: relative;
      z-index: 1;
      min-height: 44px;
    }
    
    .time {
      font-size: 15px;
      font-weight: 590;
      color: var(--black);
      letter-spacing: -0.3px;
    }
    
    .status-icons {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--black);
    }
    
    .status-icons svg {
      display: block;
    }
    
    /* ============================================================================
       MAIL HEADER - Gmail Mobile clone (56px, white, sticky)
       ============================================================================ */
    
    .mail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      min-height: 56px;
      padding: 0 16px;
      background: var(--glass-bg-light);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
      position: sticky;
      top: 0;
      z-index: 10;
      flex-shrink: 0;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
    }
    
    .header-cancel {
      background: none;
      border: none;
      color: #0d6efd;
      font-size: 17px;
      cursor: pointer;
      padding: 8px 0;
    }
    
    .header-title {
      font-size: 17px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .header-send {
      background: #1976d2;
      color: #fff;
      border: none;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    
    .back-button,
    .more-button {
      background: none;
      border: none;
      color: var(--sky-surge);
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease;
      border-radius: 12px;
    }
    
    .back-button:hover,
    .more-button:hover {
      opacity: 0.6;
      background: rgba(93, 183, 222, 0.15);
    }
    
    .back-button:active,
    .more-button:active {
      opacity: 0.3;
      transform: scale(0.95);
    }
    
    /* ============================================================================
       EMAIL ROWS - Gmail-style To/From/Subject (1px #C6C6C8 dividers)
       ============================================================================ */
    
    .email-row {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 12px 16px;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
      background: var(--glass-bg-light);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
    }
    
    .email-row-label {
      flex: 0 0 56px;
      font-size: 14px;
      color: #6b7280;
      margin-right: 12px;
    }
    
    .email-row-value {
      font-size: 15px;
      color: #1a1a1a;
    }
    
    .email-from-row .from-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .email-from-row .from-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--black);
    }
    
    .email-from-row .from-email {
      font-size: 14px;
      color: var(--dim-grey);
    }
    
    .email-subject-row {
      align-items: flex-start;
    }
    
    .email-subject-row .email-subject {
      flex: 1;
      font-size: 15px;
      font-weight: 400;
      min-height: 22px;
    }
    
    .email-subject {
      word-wrap: break-word;
      overflow-wrap: break-word;
      letter-spacing: -0.2px;
      color: var(--black);
    }
    
    /* ============================================================================
       PREVIEW TOGGLES (Dark sim)
       ============================================================================ */
    
    .preview-toggles {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 1001;
    }
    
    .toggle-btn {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 12px;
      border: 0.5px solid rgba(255,255,255,0.25);
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      color: #fff;
      cursor: pointer;
      font-family: inherit;
    }
    
    .toggle-btn:hover {
      background: rgba(0,0,0,0.65);
    }
    
    .toggle-btn.active {
      background: rgba(255,255,255,0.28);
      border-color: rgba(255,255,255,0.4);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
    }
    
    /* ============================================================================
       DARK MODE SIMULATION (in-frame only)
       ============================================================================ */
    
    .phone-screen.dark-mode-sim {
      filter: invert(1) hue-rotate(180deg);
    }
    
    /* ============================================================================
       EMAIL CONTAINER - Grouped Content Background
       ============================================================================ */
    
    .email-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: linear-gradient(180deg, rgba(250, 250, 252, 0.95) 0%, rgba(242, 242, 247, 0.98) 100%);
      padding-bottom: 34px;
    }
    
    .email-body-wrapper {
      background: var(--glass-bg-light);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-top: 0.5px solid var(--glass-border-light);
      border-bottom: 0.5px solid var(--glass-border-light);
    }
    
    .from-time {
      color: var(--dim-grey);
    }
    
    /* ============================================================================
       EMAIL BODY - iOS Mail Content Typography
       ============================================================================ */
    
    .email-body {
      padding: 20px 16px;
      font-size: 17px;
      line-height: 1.47;
      color: var(--black);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
      min-height: 300px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      letter-spacing: -0.4px;
      background: var(--glass-bg-light);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      margin-top: 12px;
      border-radius: 12px 12px 0 0;
      border: 0.5px solid var(--glass-border-light);
      border-bottom: none;
    }
    
    .email-body * {
      max-width: 100%;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .email-body p {
      margin-bottom: 16px;
      max-width: 100%;
    }
    
    .email-body p:last-child {
      margin-bottom: 0;
    }
    
    .email-body img {
      max-width: 100%;
      height: auto;
      border-radius: 12px; /* iOS squircle for images */
      margin: 12px 0;
    }
    
    .email-body a {
      color: var(--sky-surge);
      text-decoration: none;
      word-break: break-all;
    }
    
    .email-body a:hover {
      text-decoration: underline;
    }
    
    .email-body strong,
    .email-body b {
      font-weight: 600; /* SF Pro Semibold */
    }
    
    /* ============================================================================
       EMPTY STATE - iOS Placeholder Style
       ============================================================================ */
    
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      font-size: 15px;
      color: var(--dim-grey);
      text-align: center;
      padding: 40px 20px;
      font-weight: 400;
      letter-spacing: -0.2px;
    }
    
    /* ============================================================================
       SCROLLBAR - iOS-style Minimalist
       ============================================================================ */
    
    .email-container::-webkit-scrollbar {
      width: 2px;
    }
    
    .email-container::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .email-container::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.12);
      border-radius: 10px;
    }
    
    .email-container::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.2);
    }
    
    /* ============================================================================
       AT-LIMIT: Blur preview, lock toggles (Phase 3)
       ============================================================================ */
    .preview-container.at-limit .email-container {
      filter: blur(4px);
      pointer-events: none;
    }
    .preview-container.at-limit [data-dark-toggle] {
      pointer-events: none;
      opacity: 0.6;
    }
    
    /* ============================================================================
       PAYWALL MODAL (centered with blurred background)
       ============================================================================ */
    .paywall-sheet {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      pointer-events: none;
    }
    .paywall-sheet.visible {
      display: flex;
      pointer-events: auto;
    }
    .paywall-sheet-scrim {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.32);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .paywall-sheet.visible .paywall-sheet-scrim {
      opacity: 1;
    }
    .paywall-sheet-surface {
      position: relative;
      width: 100%;
      max-width: 400px;
      background: var(--glass-bg-light);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-radius: 28px;
      padding: 32px;
      border: 0.5px solid var(--glass-border-light);
      box-shadow: var(--glass-shadow);
      transform: scale(0.9) translateY(20px);
      opacity: 0;
      transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .paywall-sheet.visible .paywall-sheet-surface {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    .paywall-sheet-copy {
      font-size: 16px;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      font-weight: 500;
    }
    .paywall-sheet-reset {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
    }
    .paywall-sheet-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }
    .paywall-btn-primary {
      background: var(--sky-surge);
      color: #fff;
      border: none;
      border-radius: 20px;
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .paywall-btn-secondary {
      background: transparent;
      color: #6b7280;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      width: 100%;
    }
    .paywall-btn-primary {
      width: 100%;
    }
    .paywall-icon {
      width: 56px;
      height: 56px;
      background: rgba(240, 249, 255, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 4px;
      color: var(--sky-surge);
      border: 0.5px solid rgba(93, 183, 222, 0.2);
    }
    .paywall-sheet-headline {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
      text-align: center;
      letter-spacing: -0.3px;
    }
    .paywall-sheet-copy {
      text-align: center;
    }
    .paywall-sheet-usage {
      font-size: 13px;
      color: var(--sky-surge);
      font-weight: 600;
      margin: 0;
      text-align: center;
    }
    .paywall-sheet-reset {
      text-align: center;
    }

    /* Subject character counter */
    .subject-char-count {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 5px;
      border-radius: 4px;
      margin-left: 4px;
      white-space: nowrap;
      flex-shrink: 0;
      display: none;
    }
    .subject-char-count.optimal {
      display: inline-block;
      background: #d1fae5;
      color: #065f46;
    }
    .subject-char-count.borderline {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
    }
    .subject-char-count.too-long {
      display: inline-block;
      background: #fee2e2;
      color: #991b1b;
    }

    /* Sent toast */
    .sent-toast {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #1a1a1a;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 20px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 50;
    }
    .sent-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* ============================================================================
       DARK THEME - Match real mobile email client (system dark mode)
       ============================================================================ */
    @media (prefers-color-scheme: dark) {
      .phone-screen {
        background: #000000;
      }
      .mail-header {
        background: #1c1c1e;
        border-bottom-color: rgba(255, 255, 255, 0.12);
      }
      .header-cancel {
        color: #64b5f6;
      }
      .header-send {
        background: #1976d2;
        color: #fff;
      }
      .email-container {
        background: #000000;
      }
      .status-bar .time,
      .status-icons {
        color: rgba(255, 255, 255, 0.9);
      }
      .header-title {
        color: rgba(255, 255, 255, 0.9);
      }
      .back-button,
      .more-button {
        color: var(--sky-surge);
      }
      .email-row,
      .email-subject-row,
      .email-body-wrapper {
        background: #1c1c1e;
        border-bottom-color: rgba(255, 255, 255, 0.12);
      }
      .email-subject,
      .email-row-value {
        color: rgba(255, 255, 255, 0.9);
      }
      .email-row-label {
        color: rgba(255, 255, 255, 0.6);
      }
      .from-name {
        color: rgba(255, 255, 255, 0.9);
      }
      .from-meta,
      .from-email,
      .from-time,
      .from-divider {
        color: rgba(255, 255, 255, 0.6);
      }
      .email-body {
        background: #1c1c1e;
        color: rgba(255, 255, 255, 0.9);
      }
      .email-body a {
        color: var(--sky-surge);
      }
      .empty-state {
        color: rgba(255, 255, 255, 0.5);
      }
      .email-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }
      .email-container::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.35);
      }
    }
  `;
}

// ==================== TASK 5: MAKE IT MOVABLE (DRAGGABLE) ====================

/**
 * Setup event listeners - dragging and controls
 */
function setupEventListeners() {
  if (!shadowRoot) return;
  
  // Draggable phone
  const dragHandle = shadowRoot.getElementById('dragHandle');
  if (dragHandle) {
    dragHandle.addEventListener('mousedown', startDragging);
    dragHandle.addEventListener('dragstart', (e) => e.preventDefault()); // Prevent browser ghost image
  }
  
  // Collapse button
  const collapseBtn = shadowRoot.getElementById('collapseBtn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCollapse();
    });
  }
  
  // Dark mode sim toggle
  const darkSimToggle = shadowRoot.getElementById('darkSimToggle');
  const phoneScreen = shadowRoot.getElementById('phoneScreen');
  if (darkSimToggle && phoneScreen) {
    darkSimToggle.addEventListener('click', () => {
      phoneScreen.classList.toggle('dark-mode-sim');
      darkSimToggle.classList.toggle('active', phoneScreen.classList.contains('dark-mode-sim'));
    });
  }
  
  // Collapsed logo (to expand and drag)
  const collapsedLogo = shadowRoot.getElementById('collapsedLogo');
  if (collapsedLogo) {
    collapsedLogo.addEventListener('click', (e) => {
      // Only toggle if we didn't just drag
      if (!hasMoved) {
        toggleCollapse();
      }
    });
    collapsedLogo.addEventListener('mousedown', startDragging);
    collapsedLogo.addEventListener('dragstart', (e) => e.preventDefault()); // Prevent browser ghost image
  }
  
  // Global mouse events for dragging
  // Remove existing listeners first to prevent duplicates
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopDragging);
  // Now add fresh listeners
  document.addEventListener('mousemove', handleDragging);
  document.addEventListener('mouseup', stopDragging);
  
  // Watch for Gmail toolbar interactions (formatting, attachments, etc.)
  watchForToolbarInteractions();
}

/**
 * Toggle collapse/expand preview
 */
function toggleCollapse() {
  if (!shadowRoot) return;
  
  const phoneMockup = shadowRoot.querySelector('.phone-mockup');
  const collapsedLogo = shadowRoot.getElementById('collapsedLogo');
  
  isCollapsed = !isCollapsed;
  
  if (isCollapsed) {
    // Collapse to logo
    phoneMockup.style.display = 'none';
    collapsedLogo.style.display = 'flex';
    console.log('📱 Preview collapsed to logo');
  } else {
    // Expand to full preview
    phoneMockup.style.display = 'block';
    collapsedLogo.style.display = 'none';
    console.log('📱 Preview expanded');
  }
}

/**
 * Watch for Gmail toolbar interactions (formatting, attachments, etc.)
 */
function watchForToolbarInteractions() {
  // Watch for formatting toolbar popup
  const composeWindow = findComposeWindow();
  if (!composeWindow) return;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Check for Gmail formatting toolbar
          const isFormattingToolbar = node.matches && (
            node.matches('[role="dialog"][aria-label*="Format"]') ||
            node.matches('.goog-toolbar') ||
            node.matches('[data-tooltip*="Format"]') ||
            node.querySelector('.goog-toolbar')
          );
          
          // Check for other Gmail popups
          const isGmailPopup = node.matches && (
            node.matches('[role="dialog"]') ||
            node.matches('.Kj-JD') || // Gmail popup class
            node.matches('[data-is-tooltip="true"]')
          );
          
          if (isFormattingToolbar || isGmailPopup) {
            console.log('🔧 Gmail tool opened - auto-collapsing preview');
            if (!isCollapsed) {
              toggleCollapse();
            }
          }
        }
      });
      
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const wasGmailPopup = node.matches && (
            node.matches('[role="dialog"]') ||
            node.matches('.goog-toolbar') ||
            node.matches('.Kj-JD')
          );
          
          if (wasGmailPopup && isCollapsed) {
            console.log('🔧 Gmail tool closed - auto-expanding preview');
            toggleCollapse();
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('👀 Watching for Gmail toolbar interactions');
}

/**
 * Start dragging the preview window
 */
function startDragging(e) {
  e.preventDefault(); // Prevent browser's default drag behavior (ghost image)
  
  isDragging = true;
  hasMoved = false;
  dragOffset = {
    x: e.clientX - overlayContainer.offsetLeft,
    y: e.clientY - overlayContainer.offsetTop
  };
  
  const dragHandle = shadowRoot.getElementById('dragHandle');
  const collapsedLogo = shadowRoot.getElementById('collapsedLogo');
  
  if (dragHandle && !isCollapsed) {
    dragHandle.style.cursor = 'grabbing';
    dragHandle.classList.add('dragging');
  }
  
  if (collapsedLogo && isCollapsed) {
    collapsedLogo.style.cursor = 'grabbing';
    collapsedLogo.classList.add('dragging');
  }
}

/**
 * Handle dragging movement
 */
function handleDragging(e) {
  if (!isDragging || !overlayContainer) return;
  
  e.preventDefault();
  hasMoved = true;
  
  const newLeft = e.clientX - dragOffset.x;
  const newTop = e.clientY - dragOffset.y;
  
  // Keep within viewport bounds
  const maxX = window.innerWidth - overlayContainer.offsetWidth;
  const maxY = window.innerHeight - overlayContainer.offsetHeight;
  
  overlayContainer.style.left = Math.max(0, Math.min(newLeft, maxX)) + 'px';
  overlayContainer.style.top = Math.max(0, Math.min(newTop, maxY)) + 'px';
  overlayContainer.style.right = 'auto';
}

/**
 * Stop dragging
 */
function stopDragging() {
  if (!isDragging) return;
  
  isDragging = false;
  
  if (shadowRoot) {
    const dragHandle = shadowRoot.getElementById('dragHandle');
    const collapsedLogo = shadowRoot.getElementById('collapsedLogo');
    
    if (dragHandle) {
      dragHandle.style.cursor = 'grab';
      dragHandle.classList.remove('dragging');
    }
    
    if (collapsedLogo) {
      collapsedLogo.style.cursor = 'grab';
      collapsedLogo.classList.remove('dragging');
    }
  }
}


// ==================== TASK 3: THE SCRAPER ====================

/**
 * Task 3: Syncing - Specifically target div[role="textbox"] 
 * inside the specific compose window to mirror text into preview
 * @param {HTMLElement} composeWindow - The specific compose window to attach to
 * @param {number} retryCount - Current retry attempt (for delayed loading)
 * @returns {Promise<boolean>} True if attached successfully, false otherwise
 */
function attachToCompose(composeWindow, retryCount = 0) {
  return new Promise((resolve) => {
    console.log(`🔍 Attaching to compose window (attempt ${retryCount + 1})`);
    console.log('   Compose window:', {
      tag: composeWindow.tagName,
      role: composeWindow.getAttribute('role'),
      class: composeWindow.className
    });
    
    // Find div[role="textbox"] inside THIS specific compose window
    const composeBody = findComposeBody(composeWindow);
    
    if (!composeBody) {
      // Gmail compose body might still be loading - retry up to 10 times with progressive delays
      if (retryCount < 10) {
        // Progressive delays: 300ms, 500ms, 800ms, 1000ms, 1500ms...
        const delay = retryCount === 0 ? 300 : 
                     retryCount === 1 ? 500 :
                     retryCount === 2 ? 800 :
                     retryCount < 5 ? 1000 : 1500;
        console.warn(`⚠️ Compose body not ready yet, retrying in ${delay}ms... (${retryCount + 1}/10)`);
        setTimeout(async () => {
          // Re-query compose window in case it changed
          const freshComposeWindow = findComposeWindow();
          if (freshComposeWindow) {
            const result = await attachToCompose(freshComposeWindow, retryCount + 1);
            resolve(result);
          } else {
            console.error('❌ Compose window disappeared during retry');
            resolve(false);
          }
        }, delay);
        return;
      }
      
      console.error('❌ Could not find compose body after 10 attempts');
      console.log('📋 This could mean:');
      console.log('   1. Gmail is using a different structure than expected');
      console.log('   2. Your Gmail version is not supported yet');
      console.log('   3. Compose window is not fully loaded');
      console.log('');
      console.log('🔍 Please share the console logs above to help fix this!');
      
      // Don't call showError here - let caller handle it
      resolve(false);
      return;
    }
  
  console.log('✅ Found compose body:', {
    tag: composeBody.tagName,
    role: composeBody.getAttribute('role'),
    ariaLabel: composeBody.getAttribute('aria-label')
  });
  currentComposeBody = composeBody;
  
  // Find subject line inside THIS specific compose window
  const subjectField = composeWindow.querySelector(GMAIL_SELECTORS.subjectField);
  if (subjectField) {
    console.log('✅ Found subject line input');
    currentSubjectField = subjectField;
    setupSubjectSync(subjectField);
  } else {
    console.warn('⚠️ Subject field not found (may appear later)');
    // Try to find it with a slight delay
    setTimeout(() => {
      const delayedSubject = composeWindow.querySelector(GMAIL_SELECTORS.subjectField);
      if (delayedSubject && !currentSubjectField) {
        console.log('✅ Found subject field on delayed check');
        currentSubjectField = delayedSubject;
        setupSubjectSync(delayedSubject);
      }
    }, 1000);
  }
  
  // Setup live sync for THIS specific compose body
  setupLiveSync(composeBody);
  
  // Initial update to show current content
  console.log('🔄 Performing initial preview update...');
  updatePreview();
  
  // Run initial pre-flight checks (updatePreview calls this, but let's be explicit)
  console.log('✈️ Running initial pre-flight checks...');
  const initialHtml = composeBody.innerHTML || '';
  const initialText = composeBody.innerText || '';
  runPreflightChecks(initialHtml, initialText);
  
    // Setup send button detection
    setupSendButtonListener(composeWindow);
    
    console.log('✅ Successfully attached to compose window and set up sync');
    resolve(true);
  });
}

/**
 * Setup send button listener to track email sends
 * @param {HTMLElement} composeWindow - The compose window to monitor
 */
function setupSendButtonListener(composeWindow) {
  console.log('📤 Setting up send button listener...');
  
  // Gmail send button selectors (multiple fallbacks)
  const sendSelectors = [
    '[role="button"][data-tooltip*="Send"]',
    '[role="button"][aria-label*="Send"]',
    '.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3', // Gmail's send button class
    'div[role="button"]:has(span:contains("Send"))'
  ];
  
  // Try to find send button
  let sendButton = null;
  for (const selector of sendSelectors) {
    try {
      sendButton = composeWindow.querySelector(selector);
      if (sendButton) {
        console.log('✅ Found send button with selector:', selector);
        break;
      }
    } catch (e) {
      // Some selectors might fail, continue
    }
  }
  
  // If not found, use MutationObserver to watch for it
  if (!sendButton) {
    console.log('⏳ Send button not found yet, watching for it...');
    const observer = new MutationObserver(() => {
      for (const selector of sendSelectors) {
        try {
          const btn = composeWindow.querySelector(selector);
          if (btn && !btn.hasAttribute('data-velomail-listener')) {
            console.log('✅ Send button appeared:', selector);
            attachSendListener(btn);
            observer.disconnect();
            return;
          }
        } catch (e) {
          // Continue
        }
      }
    });
    
    observer.observe(composeWindow, {
      childList: true,
      subtree: true
    });
  } else {
    attachSendListener(sendButton);
  }
}

/**
 * Attach click listener to send button
 * @param {HTMLElement} sendButton - The send button element
 */
function attachSendListener(sendButton) {
  if (sendButton.hasAttribute('data-velomail-listener')) {
    console.log('ℹ️ Send button already has listener');
    return;
  }
  
  sendButton.setAttribute('data-velomail-listener', 'true');
  
  sendButton.addEventListener('click', () => {
    console.log('📧 Send button clicked! Tracking email send...');
    handleEmailSent();
  }, { capture: true }); // Use capture to ensure we catch it first
  
  console.log('✅ Send button listener attached');
}

/**
 * Handle email sent event
 */
function handleEmailSent() {
  console.log('✉️ Email sent! Notifying service worker...');
  
  chrome.runtime.sendMessage({
    type: 'EMAIL_SENT',
    timestamp: Date.now()
  }).then((response) => {
    if (response && response.usage) {
      const { previews, limit } = response.usage;
      console.log(`✅ Email tracked: ${previews} sent this month (limit: ${limit})`);
      
      const remaining = limit - previews;
      
      if (previews >= limit) {
        applyAtLimitUI();
      } else {
        // Show sent toast with remaining count
        const msg = remaining <= 3
          ? `Sent! ${remaining} send${remaining === 1 ? '' : 's'} left this month`
          : `Sent! ${remaining} of ${limit} sends remaining`;
        showSentToast(msg);
        
        // Show approaching-limit warning banner if ≤ 3 remaining
        if (remaining <= 3) {
          showNearLimitBanner(remaining, limit);
        }
      }
    } else {
      showSentToast('Email sent!');
    }
  }).catch(error => {
    console.error('❌ Failed to track sent email:', error);
  });
}

/**
 * Show a brief toast inside the mobile preview after a send event
 */
function showSentToast(message) {
  if (!shadowRoot) return;
  const toast = shadowRoot.getElementById('sentToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

/**
 * Show a near-limit warning banner at the top of the preview
 */
function showNearLimitBanner(remaining, limit) {
  if (!shadowRoot) return;
  let banner = shadowRoot.getElementById('nearLimitBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'nearLimitBanner';
    banner.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0;
      background: #fef3c7; color: #92400e;
      font-size: 11px; font-weight: 600;
      padding: 6px 12px; text-align: center;
      z-index: 40; border-radius: 0;
    `;
    const container = shadowRoot.getElementById('previewContainer');
    if (container) container.insertBefore(banner, container.firstChild);
  }
  banner.textContent = `${remaining} send${remaining === 1 ? '' : 's'} left this month — upgrade for unlimited access`;
}

/**
 * Find compose body (div[role="textbox"]) inside the compose window
 * Uses multiple fallback selectors for Gmail compatibility
 * @param {HTMLElement} composeWindow - The compose window to search within
 * @returns {HTMLElement|null} The compose body element
 */
function findComposeBody(composeWindow) {
  console.log('🔍 Searching for compose body inside compose window...');
  
  // DIAGNOSTIC: Log the entire compose window structure
  console.log('📦 Compose window structure:');
  console.log('   Tag:', composeWindow.tagName);
  console.log('   Role:', composeWindow.getAttribute('role'));
  console.log('   Class:', composeWindow.className);
  console.log('   ID:', composeWindow.id);
  console.log('   Children count:', composeWindow.children.length);
  
  // Check all textboxes
  const allTextboxes = composeWindow.querySelectorAll('[role="textbox"]');
  console.log(`📊 Found ${allTextboxes.length} elements with role="textbox"`);
  
  if (allTextboxes.length > 0) {
    allTextboxes.forEach((el, i) => {
      console.log(`   Textbox ${i + 1}:`, {
        tag: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        contentEditable: el.contentEditable,
        height: el.offsetHeight,
        width: el.offsetWidth,
        visible: el.offsetHeight > 0 && el.offsetWidth > 0,
        class: el.className.substring(0, 50)
      });
    });
    
    // Return the largest visible textbox (likely the body)
    let largestTextbox = null;
    let largestSize = 0;
    
    for (let el of allTextboxes) {
      if (el.offsetHeight > 0 && el.offsetWidth > 0) {
        const size = el.offsetHeight * el.offsetWidth;
        if (size > largestSize) {
          largestSize = size;
          largestTextbox = el;
        }
      }
    }
    
    if (largestTextbox) {
      console.log('✅ Found largest visible textbox (likely compose body)');
      return largestTextbox;
    }
  }
  
  // Check all contenteditable elements
  const allContentEditable = composeWindow.querySelectorAll('[contenteditable="true"]');
  console.log(`📊 Found ${allContentEditable.length} contenteditable elements`);
  
  if (allContentEditable.length > 0) {
    // Log details of each
    allContentEditable.forEach((el, i) => {
      if (i < 10) { // Only log first 10 to avoid spam
        console.log(`   Editable ${i + 1}:`, {
          tag: el.tagName,
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label')?.substring(0, 30),
          height: el.offsetHeight,
          width: el.offsetWidth,
          class: el.className.substring(0, 50)
        });
      }
    });
    
    // Find the largest contenteditable that's not the subject
    let largestEditable = null;
    let largestSize = 0;
    
    for (let el of allContentEditable) {
      // Skip if it looks like a subject field (small height)
      if (el.offsetHeight < 40) continue;
      
      // Skip if it has certain classes that indicate it's not the body
      const className = el.className.toLowerCase();
      if (className.includes('subject')) continue;
      
      const size = el.offsetHeight * el.offsetWidth;
      if (size > largestSize) {
        largestSize = size;
        largestEditable = el;
      }
    }
    
    if (largestEditable) {
      console.log('✅ Found via largest contenteditable:', {
        tag: largestEditable.tagName,
        height: largestEditable.offsetHeight,
        width: largestEditable.offsetWidth
      });
      return largestEditable;
    }
  }
  
  // Last resort: look for specific Gmail compose classes
  console.log('⚠️ Trying Gmail-specific class selectors...');
  const gmailSpecificSelectors = [
    '.Am.Al.editable',
    '.editable[contenteditable="true"]',
    'div[aria-label*="Message body"]',
    'div[aria-label*="message body"]',
    '[g_editable="true"]',
    // Additional selectors for different Gmail versions
    '.editable.LW-avf',
    'div[contenteditable="true"][role="textbox"]',
    '.Am[contenteditable="true"]',
    '[aria-label*="Message Body"]',
    'div.editable',
    // Try searching in the entire document as fallback
    'div[aria-label*="compose" i] [contenteditable="true"]',
    'div[role="dialog"] [contenteditable="true"][role="textbox"]'
  ];
  
  for (let selector of gmailSpecificSelectors) {
    try {
      const element = composeWindow.querySelector(selector);
      if (element && element.offsetHeight > 50) {
        console.log(`✅ Found with Gmail selector: ${selector}`);
        return element;
      }
    } catch (e) {
      // Invalid selector, skip
      console.log(`⚠️ Selector failed: ${selector}`, e.message);
    }
  }
  
  // Very last resort: find ANY contenteditable div that's reasonably sized
  console.log('⚠️ Last resort: searching for any contenteditable div...');
  const allDivs = composeWindow.querySelectorAll('div[contenteditable]');
  for (let div of allDivs) {
    if (div.offsetHeight > 50 && div.offsetWidth > 100) {
      console.log('✅ Found via last resort contenteditable search');
      return div;
    }
  }
  
  console.error('❌ Could not find compose body with any selector');
  console.log('💡 Tip: Open DevTools Elements tab and inspect the compose window');
  
  return null;
}

// ==================== TASK 4: LIVE SYNC ====================

/**
 * Use an input event listener so that every character typed
 * is mirrored instantly inside the "Phone Preview" area
 * OPTIMIZED: Uses RAF for DOM updates, debouncing for heavy operations
 */
function setupLiveSync(composeBody) {
  console.log('🔄 Setting up live sync with input event listener (OPTIMIZED)');
  console.log('   Compose body element:', {
    tag: composeBody.tagName,
    role: composeBody.getAttribute('role'),
    contentEditable: composeBody.contentEditable,
    ariaLabel: composeBody.getAttribute('aria-label')
  });
  
  // Lightweight immediate preview update (just content)
  const updatePreviewLight = () => {
    updatePreview(true); // true = light mode (skip heavy operations)
  };
  
  // Heavy operations (pre-flight checks, score calc) - debounced 200ms
  const updatePreviewHeavy = debounce(() => {
    updatePreview(false); // false = full update with heavy operations
  }, 200);
  
  // Input event for instant character-by-character sync (LIGHT)
  composeBody.addEventListener('input', (e) => {
    updatePreviewLight(); // Immediate light update
    updatePreviewHeavy();  // Debounced heavy update
  });
  
  // Also listen for keyup as backup (LIGHT)
  composeBody.addEventListener('keyup', () => {
    updatePreviewLight();
    updatePreviewHeavy();
  });
  
  // Handle text selection changes (highlighted text)
  composeBody.addEventListener('mouseup', () => {
    handleTextSelection();
  });
  
  composeBody.addEventListener('keyup', () => {
    handleTextSelection();
  });
  
  // MutationObserver for paste, formatting, etc. (LIGHT)
  const observer = new MutationObserver((mutations) => {
    updatePreviewLight();
    updatePreviewHeavy();
  });
  
  observer.observe(composeBody, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  console.log('✅ Live sync activated (OPTIMIZED):');
  console.log('   - Light updates: RAF batching');
  console.log('   - Heavy operations: 200ms debounce');
  console.log('   - Service worker: Throttled messaging');
}

/**
 * Handle text selection in compose body
 * Uses window.getSelection() to track highlighted text
 */
function handleTextSelection() {
  if (!currentComposeBody) return;
  
  // Get current selection using window.getSelection()
  const selection = window.getSelection();
  
  if (selection && selection.rangeCount > 0) {
    const selectedText = selection.toString();
    
    if (selectedText.length > 0) {
      console.log('📝 Text selected:', {
        text: selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''),
        length: selectedText.length,
        rangeCount: selection.rangeCount
      });
      
      // Store selection info for potential future features
      // (e.g., highlight selected text in preview, format toolbar, etc.)
      const range = selection.getRangeAt(0);
      const selectionInfo = {
        text: selectedText,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        startContainer: range.startContainer,
        endContainer: range.endContainer
      };
      
      // Could be used to highlight selected text in preview
      // or show character count of selection, etc.
    }
  }
}

/**
 * Setup subject line sync
 */
function setupSubjectSync(subjectField) {
  subjectField.addEventListener('input', () => {
    if (!shadowRoot) return;
    
    const value = subjectField.value.trim();
    const subjectDisplay = shadowRoot.getElementById('subjectDisplay');
    if (subjectDisplay) {
      subjectDisplay.textContent = value || 'No subject';
    }
    updateSubjectCounter(value);
    updatePreview();
  });
}

/**
 * Update the subject char counter badge with color-coded feedback
 */
function updateSubjectCounter(subject) {
  if (!shadowRoot) return;
  const counter = shadowRoot.getElementById('subjectCharCount');
  if (!counter) return;
  const len = (subject || '').length;
  if (len === 0) {
    counter.className = 'subject-char-count';
    counter.textContent = '';
    return;
  }
  counter.textContent = `${len} chars`;
  if (len >= 30 && len <= 50) {
    counter.className = 'subject-char-count optimal';
  } else if (len < 30 || (len > 50 && len <= 70)) {
    counter.className = 'subject-char-count borderline';
  } else {
    counter.className = 'subject-char-count too-long';
  }
}

/**
 * Update the preview with current compose content
 * OPTIMIZED: Supports light mode (DOM only) and heavy mode (full checks)
 * @param {boolean} lightMode - If true, skip heavy operations
 */
/**
 * If compose body was replaced by Gmail/Outlook (node disconnected), re-find and re-attach without alerting user.
 */
function tryReattachComposeBody() {
  if (!currentComposeBody || currentComposeBody.isConnected) return;
  const composeWindow = findComposeWindow();
  if (!composeWindow) return;
  const newBody = findComposeBody(composeWindow);
  if (!newBody) return;
  console.log('🔄 Compose body was replaced, re-attaching (safe-fail reconnect)');
  currentComposeBody = newBody;
  const subjectField = composeWindow.querySelector(GMAIL_SELECTORS.subjectField);
  if (subjectField) {
    currentSubjectField = subjectField;
    setupSubjectSync(subjectField);
  } else {
    currentSubjectField = null;
  }
  setupLiveSync(newBody);
  updatePreview();
}

function updatePreview(lightMode = false) {
  if (!shadowRoot) return;
  if (currentComposeBody && !currentComposeBody.isConnected) {
    tryReattachComposeBody();
    return;
  }
  if (!currentComposeBody) {
    return;
  }
  
  const startTime = performance.now();
  
  // Cancel any pending RAF
  if (updatePreviewRAF) {
    cancelAnimationFrame(updatePreviewRAF);
  }
  
  // Use RAF to batch DOM updates
  updatePreviewRAF = requestAnimationFrame(() => {
    try {
      const htmlContent = currentComposeBody.innerHTML;
      const textContent = currentComposeBody.innerText || currentComposeBody.textContent;
      const subjectValue = currentSubjectField ? currentSubjectField.value.trim() : '';
    
    // Generate content hashes for change detection
    const contentHash = fastHash(textContent);
    const subjectHash = fastHash(subjectValue);
    const hasContentChanged = contentHash !== lastContentHash;
    const hasSubjectChanged = subjectHash !== lastSubjectHash;
    
    // Heavy pass: skip if nothing changed since the last heavy pass
    if (!lightMode && !hasContentChanged && !hasSubjectChanged) {
      performanceMetrics.cacheHits++;
      return;
    }
    
    performanceMetrics.cacheMisses++;
    // Only the heavy pass owns the hashes — light pass must not overwrite them,
    // otherwise the debounced heavy pass always sees "no change" and exits early.
    if (!lightMode) {
      lastContentHash = contentHash;
      lastSubjectHash = subjectHash;
    }
    
    // Update email body content (FAST - always do this)
    const previewContent = shadowRoot.getElementById('previewContent');
    if (previewContent) {
      if (textContent.trim()) {
        const sanitized = sanitizeHTML(htmlContent);
        previewContent.innerHTML = sanitized;
      } else {
        previewContent.innerHTML = `<div class="empty-state">Start typing to see preview</div>`;
      }
    }
    
    // Update subject and char counter (FAST - always do this)
    if (currentSubjectField) {
      const subjectDisplay = shadowRoot.getElementById('subjectDisplay');
      if (subjectDisplay) {
        const value = subjectValue || 'No subject';
        subjectDisplay.textContent = value;
      }
      updateSubjectCounter(subjectValue);
    }
    
    const lightTime = performance.now() - startTime;
    
    // Heavy operations (only if not in light mode)
    if (!lightMode) {
      const heavyStart = performance.now();
      
      // Run pre-flight checks (SLOW - debounced)
      runPreflightChecks(htmlContent, textContent);
      
      // Calculate mobile score (MEDIUM - debounced)
      const mobileScore = calculateSimpleMobileScore(textContent, subjectValue);
      
      // Throttled service worker update (SLOW - network call)
      throttledServiceWorkerUpdate(htmlContent, textContent, subjectValue, mobileScore);
      
      const heavyTime = performance.now() - heavyStart;
      logPerformance('heavy', heavyTime);
      
      console.log(`⚡ Full update: ${lightTime.toFixed(2)}ms (light) + ${heavyTime.toFixed(2)}ms (heavy) = ${(lightTime + heavyTime).toFixed(2)}ms total`);
    } else {
      console.log(`⚡ Light update: ${lightTime.toFixed(2)}ms`);
    }
    
    logPerformance('update', lightTime);
    } catch (error) {
      logError('PREVIEW_UPDATE_ERROR', 'Failed to update preview', {
        error: error.message,
        stack: error.stack,
        hasContent: !!currentComposeBody
      });
    }
  });
}

/**
 * Calculate simple mobile optimization score (0-100)
 * Returns detailed structure compatible with popup display
 */
function calculateSimpleMobileScore(textContent, subject) {
  let score = 0;
  const breakdown = {};
  const suggestions = [];
  
  // Subject line (20 points)
  const subjectLength = subject.length;
  const subjectMaxScore = 20;
  let subjectScore = 0;
  let subjectFeedback = '';
  
  if (!subject || subjectLength === 0) {
    subjectScore = 0;
    subjectFeedback = 'Add a subject line';
    suggestions.push(`⚠️ Add a subject line (+${subjectMaxScore} points)`);
  } else if (subjectLength <= 40) {
    subjectScore = subjectMaxScore;
    subjectFeedback = `Perfect length for mobile (${subjectLength} chars)`;
  } else if (subjectLength <= 50) {
    subjectScore = Math.round(subjectMaxScore * 0.6);
    const pointsToGain = Math.round(subjectMaxScore * 0.4);
    subjectFeedback = `Good, but consider shortening (${subjectLength} chars)`;
    suggestions.push(`📏 Subject under 60 characters (recommended) (+${pointsToGain} points)`);
  } else if (subjectLength <= 60) {
    subjectScore = Math.round(subjectMaxScore * 0.3);
    const pointsToGain = Math.round(subjectMaxScore * 0.7);
    subjectFeedback = `May truncate on some devices (${subjectLength} chars)`;
    suggestions.push(`⚠️ Shorten subject to under 60 chars — truncated subjects lose opens (+${pointsToGain} points)`);
  } else {
    subjectScore = Math.round(subjectMaxScore * 0.1);
    const pointsToGain = Math.round(subjectMaxScore * 0.9);
    subjectFeedback = `Too long—will definitely truncate (${subjectLength} chars)`;
    suggestions.push(`❌ Subject too long (${subjectLength} chars) — mobile shows ~30 chars before cutting off (+${pointsToGain} points)`);
  }
  
  breakdown.subjectLength = {
    score: subjectScore,
    maxScore: subjectMaxScore,
    feedback: subjectFeedback
  };
  score += subjectScore;
  
  // CTA Above Fold (25 points) - check for action words in first 250 chars
  const ctaMaxScore = 25;
  const first250Chars = textContent.substring(0, 250);
  const ctaKeywords = /\b(click|tap|view|reply|respond|call|visit|download|register|sign up|join|buy|get|try|learn more|read more|schedule|book|demo)\b/gi;
  const hasCTAAboveFold = ctaKeywords.test(first250Chars);
  const hasCTAAnyWhere = ctaKeywords.test(textContent);
  let ctaScore = 0;
  let ctaFeedback = '';
  
  if (hasCTAAboveFold) {
    ctaScore = ctaMaxScore;
    ctaFeedback = 'CTA visible without scrolling ✓';
  } else if (hasCTAAnyWhere) {
    ctaScore = Math.round(ctaMaxScore * 0.4);
    const pointsToGain = Math.round(ctaMaxScore * 0.6);
    ctaFeedback = 'CTA exists but below fold';
    suggestions.push(`🎯 Move CTA above the fold — prospects decide in 3 seconds (+${pointsToGain} points)`);
  } else {
    ctaScore = 0;
    ctaFeedback = 'No clear call-to-action found';
    suggestions.push(`❌ Add a CTA — emails without one get ignored on mobile (+${ctaMaxScore} points)`);
  }
  
  breakdown.ctaAboveFold = {
    score: ctaScore,
    maxScore: ctaMaxScore,
    feedback: ctaFeedback
  };
  score += ctaScore;
  
  // Link Density (15 points) - check for reasonable link spacing
  const linkMaxScore = 15;
  const linkMatches = textContent.match(/\b(https?:\/\/|www\.)\S+/gi) || [];
  const linkCount = linkMatches.length;
  const charsPerLink = linkCount > 0 ? textContent.length / linkCount : Infinity;
  let linkScore = 0;
  let linkFeedback = '';
  
  if (linkCount === 0) {
    linkScore = Math.round(linkMaxScore * 0.5);
    linkFeedback = 'No links detected';
  } else if (charsPerLink >= 100) {
    linkScore = linkMaxScore;
    linkFeedback = `Good link spacing (${linkCount} links)`;
  } else if (charsPerLink >= 50) {
    linkScore = Math.round(linkMaxScore * 0.7);
    const pointsToGain = Math.round(linkMaxScore * 0.3);
    linkFeedback = `Links are a bit dense (${linkCount} links)`;
    suggestions.push(`🔗 Fewer links = higher tap-through rate on mobile (+${pointsToGain} points)`);
  } else {
    linkScore = Math.round(linkMaxScore * 0.3);
    const pointsToGain = Math.round(linkMaxScore * 0.7);
    linkFeedback = `Too many links (${linkCount} links)`;
    suggestions.push(`⚠️ Too many links overwhelm mobile readers — pick one strong CTA (+${pointsToGain} points)`);
  }
  
  breakdown.linkDensity = {
    score: linkScore,
    maxScore: linkMaxScore,
    feedback: linkFeedback
  };
  score += linkScore;
  
  // Image Optimization (12 points) - placeholder for now
  const imageMaxScore = 12;
  breakdown.imageOptimization = {
    score: imageMaxScore, // Default to full score for now
    maxScore: imageMaxScore,
    feedback: 'Images not analyzed in preview'
  };
  score += imageMaxScore;
  
  // Email length (12 points) - mobile-friendly is 50-500 words
  const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const lengthMaxScore = 12;
  let lengthScore = 0;
  let lengthFeedback = '';
  
  if (wordCount >= 50 && wordCount <= 500) {
    lengthScore = lengthMaxScore;
    lengthFeedback = `Perfect length (${wordCount} words)`;
  } else if (wordCount >= 30 && wordCount < 50) {
    lengthScore = Math.round(lengthMaxScore * 0.6);
    const pointsToGain = Math.round(lengthMaxScore * 0.4);
    lengthFeedback = `A bit short (${wordCount} words)`;
    suggestions.push(`📝 Add more content (aim for 50-500 words) (+${pointsToGain} points)`);
  } else if (wordCount > 500 && wordCount <= 800) {
    lengthScore = Math.round(lengthMaxScore * 0.6);
    const pointsToGain = Math.round(lengthMaxScore * 0.4);
    lengthFeedback = `A bit long (${wordCount} words)`;
    suggestions.push(`✂️ Shorten email to 50-500 words for mobile (+${pointsToGain} points)`);
  } else if (wordCount > 800) {
    lengthScore = Math.round(lengthMaxScore * 0.3);
    const pointsToGain = Math.round(lengthMaxScore * 0.7);
    lengthFeedback = `Too long (${wordCount} words)`;
    suggestions.push(`❌ Email is ${wordCount} words! Shorten to under 500 (+${pointsToGain} points)`);
  } else {
    lengthScore = 0;
    lengthFeedback = `Too short (${wordCount} words)`;
    suggestions.push(`⚠️ Add more content (at least 30 words) (+${lengthMaxScore} points)`);
  }
  
  breakdown.textLength = {
    score: lengthScore,
    maxScore: lengthMaxScore,
    feedback: lengthFeedback
  };
  score += lengthScore;
  
  // Whitespace Ratio (10 points) - check for paragraph breaks
  const whitespaceMaxScore = 10;
  const paragraphs = textContent.split('\n').filter(p => p.trim().length > 0);
  const paraCount = paragraphs.length;
  let whitespaceScore = 0;
  let whitespaceFeedback = '';
  
  if (paraCount >= 3) {
    whitespaceScore = whitespaceMaxScore;
    whitespaceFeedback = `Good spacing (${paraCount} paragraphs)`;
  } else if (paraCount === 2) {
    whitespaceScore = Math.round(whitespaceMaxScore * 0.6);
    const pointsToGain = Math.round(whitespaceMaxScore * 0.4);
    whitespaceFeedback = 'Add more paragraph breaks';
    suggestions.push(`⬜ Break content into more paragraphs (+${pointsToGain} points)`);
  } else {
    whitespaceScore = Math.round(whitespaceMaxScore * 0.3);
    const pointsToGain = Math.round(whitespaceMaxScore * 0.7);
    whitespaceFeedback = 'No paragraph breaks';
    suggestions.push(`⚠️ Add paragraph breaks for readability (+${pointsToGain} points)`);
  }
  
  breakdown.whitespaceRatio = {
    score: whitespaceScore,
    maxScore: whitespaceMaxScore,
    feedback: whitespaceFeedback
  };
  score += whitespaceScore;
  
  // Readability (6 points) - check for short paragraphs
  const readabilityMaxScore = 6;
  const avgParaLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / (paragraphs.length || 1);
  let readabilityScore = 0;
  let readabilityFeedback = '';
  
  if (avgParaLength <= 300) {
    readabilityScore = readabilityMaxScore;
    readabilityFeedback = 'Paragraphs are scannable';
  } else if (avgParaLength <= 500) {
    readabilityScore = Math.round(readabilityMaxScore * 0.6);
    const pointsToGain = Math.round(readabilityMaxScore * 0.4);
    readabilityFeedback = 'Paragraphs are a bit long';
    suggestions.push(`👓 Shorten paragraphs for easier reading (+${pointsToGain} points)`);
  } else {
    readabilityScore = Math.round(readabilityMaxScore * 0.3);
    const pointsToGain = Math.round(readabilityMaxScore * 0.7);
    readabilityFeedback = 'Paragraphs are too long';
    suggestions.push(`❌ Break up long paragraphs (under 300 chars each) (+${pointsToGain} points)`);
  }
  
  breakdown.readability = {
    score: readabilityScore,
    maxScore: readabilityMaxScore,
    feedback: readabilityFeedback
  };
  score += readabilityScore;
  
  return {
    score: Math.round(score),
    breakdown: breakdown,
    suggestions: suggestions,
    grade: getGradeFromScore(score)
  };
}

function getGradeFromScore(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Traffic light: Ready (subject < 60 + CTA), Issues (subject or CTA fail), Idle (no content)
 * CTA = at least one link or button in body (regex for <a href= or <button)
 */
function getTrafficLightState(htmlContent, textContent, subject) {
  const hasContent = (subject && subject.trim()) || (textContent && textContent.trim());
  if (!hasContent) return 'idle';

  const subjectOk = subject.length < 60;
  const hasCTA = /<a\s+[^>]*href\s*=/i.test(htmlContent || '') || /<button/i.test(htmlContent || '');
  if (subjectOk && hasCTA) return 'ready';
  return 'issues';
}

/**
 * Send current email state to service worker for popup sync
 * OPTIMIZED: Throttled to max once per 500ms
 * ENHANCED: Timing measurements and retry logic
 */
function sendEmailStateToServiceWorker(htmlContent, textContent, subject, mobileScore) {
  const startTime = performance.now();
  
  // Count words (split by whitespace, filter empty strings)
  const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Detect environment (Gmail or Outlook)
  const environment = window.location.hostname.includes('mail.google.com') ? 'gmail' : 
                       window.location.hostname.includes('outlook') ? 'outlook' : 
                       'unknown';
  
  const trafficLight = getTrafficLightState(htmlContent, textContent, subject || '');
  
  const emailState = {
    html: htmlContent,
    text: textContent,
    subject: subject,
    characterCount: textContent.length,
    wordCount: wordCount,
    environment: environment,
    mobileScore: mobileScore,
    trafficLight: trafficLight,
    preflightChecks: {
      subjectFrontLoaded: preflightChecks.subjectFrontLoaded,
      ctaAboveFold: preflightChecks.ctaAboveFold,
      linkTapability: preflightChecks.linkTapability
    },
    sentAt: Date.now()
  };
  
  chrome.runtime.sendMessage({
    type: 'EMAIL_CONTENT_UPDATED',
    state: emailState
  }).then(() => {
    const latency = performance.now() - startTime;
    if (latency > 5) {
      console.log(`⚠️ Content → Worker latency: ${latency.toFixed(2)}ms (target: <5ms)`);
    } else {
      console.log(`✅ Synced to worker (${latency.toFixed(2)}ms)`);
    }
  }).catch(error => {
    const latency = performance.now() - startTime;
    console.error(`❌ Send failed after ${latency.toFixed(2)}ms:`, error);
    setTimeout(() => {
      console.log('🔄 Retrying send...');
      chrome.runtime.sendMessage({
        type: 'EMAIL_CONTENT_UPDATED',
        state: emailState
      }).catch(retryError => {
        console.error('❌ Retry failed:', retryError);
      });
    }, 500);
  });
}

// Throttled version (max once per 500ms)
const throttledServiceWorkerUpdate = throttle(sendEmailStateToServiceWorker, 500);

// ==================== SETTINGS LISTENER ====================

/**
 * Listen for settings updates from popup (via service worker)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received from extension:', message.type);
  
  if (message.type === 'TOGGLE_PREVIEW') {
    if (shadowRoot) {
      const collapseBtn = shadowRoot.getElementById('collapseBtn');
      const collapsedLogo = shadowRoot.getElementById('collapsedLogo');
      if (collapseBtn || collapsedLogo) {
        toggleCollapse();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    } else {
      sendResponse({ success: false });
    }
    return true;
  }

  if (message.type === 'SETTINGS_UPDATED') {
    console.log('⚙️ Settings updated:', message.settings);
    
    // Update cached settings
    if (message.settings.autoShow !== undefined) {
      settings.autoShow = message.settings.autoShow;
    }
    if (message.settings.showNotifications !== undefined) {
      settings.showNotifications = message.settings.showNotifications;
    }
    
    console.log('✅ Settings cache updated:', settings);
    
    // Apply dark mode to overlay if needed
    if (shadowRoot && message.settings.darkMode !== undefined) {
      const phoneScreen = shadowRoot.querySelector('.phone-screen');
      if (phoneScreen) {
        if (message.settings.darkMode) {
          phoneScreen.style.filter = 'invert(1) hue-rotate(180deg)';
          console.log('🌙 Dark mode applied to overlay');
        } else {
          phoneScreen.style.filter = 'none';
          console.log('☀️ Dark mode removed from overlay');
        }
      }
    }
    
    // Handle auto-show setting - show/hide overlay based on setting
    if (message.settings.autoShow === false && overlayContainer) {
      // Hide overlay if auto-show disabled (but keep syncing)
      console.log('👁️ Auto-show disabled, hiding overlay (still syncing)');
      if (overlayContainer && overlayContainer.parentNode) {
        overlayContainer.parentNode.removeChild(overlayContainer);
        overlayContainer = null;
        shadowRoot = null;
      }
    } else if (message.settings.autoShow === true && !overlayContainer && isAttachedToCompose) {
      // Show overlay if auto-show enabled and we're attached to compose
      console.log('👁️ Auto-show enabled, creating overlay');
      const composeWindow = findComposeWindow();
      if (composeWindow) {
        createPreviewUI(composeWindow);
      }
    }
    
    sendResponse({ success: true });
  }
  
  return true;
});

/**
 * Check if CTA is visible in mobile viewport without scrolling
 * Uses actual DOM measurement to determine "above the fold"
 * OPTIMIZED: Cached results, only recomputes when content changes significantly
 */
function checkCTAInViewport(htmlContent, textContent) {
  const perfStart = performance.now();
  
  // Generate cache key from content hash
  const contentHash = fastHash(textContent.substring(0, 500)); // Only hash first 500 chars for CTA check
  
  // Check cache first (LRU cache)
  const cached = operationCache.ctaCheck.get(contentHash);
  if (cached !== undefined) {
    performanceMetrics.cacheHits++;
    console.log(`⚡ CTA check cached (${(performance.now() - perfStart).toFixed(2)}ms)`);
    return cached;
  }
  
  performanceMetrics.cacheMisses++;
  
  // Quick check: If text is very short, likely no CTA
  if (textContent.trim().length < 50) {
    const result = { found: false, type: null, position: null, details: 'Content too short' };
    operationCache.ctaCheck.set(contentHash, result);
    return result;
  }
  
  // OPTIMIZED: Use reusable container instead of creating new one
  const tempContainer = getMeasurementContainer();
  
  // Insert the email content
  tempContainer.innerHTML = htmlContent || textContent;
  
  // Mobile viewport available for email body (before scrolling needed)
  // iPhone 15 Pro: 812px total
  // - Status bar: 56px
  // - Mail header: 44px  
  // - Subject: ~60px (can vary)
  // - From section: 76px
  // = ~576px available for email body content
  const VIEWPORT_HEIGHT = 576;
  
  // Find all potential CTA elements
  const links = tempContainer.querySelectorAll('a[href]');
  const buttons = tempContainer.querySelectorAll('button');
  
  let foundCTA = {
    found: false,
    type: null,
    position: null,
    details: null
  };
  
  // Check links
  for (let link of links) {
    const linkTop = link.offsetTop;
    const linkText = link.textContent.trim();
    
    if (linkTop <= VIEWPORT_HEIGHT) {
      foundCTA = {
        found: true,
        type: 'link',
        position: `${linkTop}px from top`,
        details: `Link: "${linkText.substring(0, 40)}${linkText.length > 40 ? '...' : ''}"`
      };
      break;
    }
  }
  
  // Check buttons
  if (!foundCTA.found) {
    for (let button of buttons) {
      const buttonTop = button.offsetTop;
      const buttonText = button.textContent.trim();
      
      if (buttonTop <= VIEWPORT_HEIGHT) {
        foundCTA = {
          found: true,
          type: 'button',
          position: `${buttonTop}px from top`,
          details: `Button: "${buttonText.substring(0, 40)}"`
        };
        break;
      }
    }
  }
  
  // Fallback: check for a raw URL in the visible portion of text
  // This handles plain-text CTAs like "Click here: https://..." without relying
  // on generic keyword matching that fires on normal prose words (reply, see, get).
  if (!foundCTA.found) {
    const urlPattern = /https?:\/\/[^\s"'<>]{4,}/gi;
    const firstChunk = textContent.substring(0, 800); // ~first screen of text
    const urlMatch = firstChunk.match(urlPattern);
    if (urlMatch) {
      foundCTA = {
        found: true,
        type: 'raw-url',
        position: 'within first 800 chars',
        details: `URL: "${urlMatch[0].substring(0, 50)}"`
      };
    }
  }
  
  // OPTIMIZED: Clear content but keep container for reuse
  tempContainer.innerHTML = '';
  
  // Cache the result in LRU cache (auto-evicts old entries)
  operationCache.ctaCheck.set(contentHash, foundCTA);
  
  const perfTime = performance.now() - perfStart;
  console.log(`⚡ CTA check completed (${perfTime.toFixed(2)}ms)`);
  
  return foundCTA;
}

/**
 * Run pre-flight checks and update indicators
 * Based on mobile-first email best practices
 */
function runPreflightChecks(htmlContent, textContent) {
  const perfStart = performance.now();
  
  if (!shadowRoot) {
    console.warn('⚠️ Cannot run pre-flight checks: shadowRoot not available');
    return;
  }
  
  // Get subject for cache key
  const subject = currentSubjectField ? currentSubjectField.value.trim() : '';
  
  // Generate cache key
  const cacheKey = fastHash(subject + textContent.substring(0, 500));
  
  // Check cache first
  const cached = operationCache.preflightResults.get(cacheKey);
  if (cached !== undefined) {
    // Apply cached results
    preflightChecks.subjectFrontLoaded = cached.subjectFrontLoaded;
    preflightChecks.ctaAboveFold = cached.ctaAboveFold;
    preflightChecks.linkTapability = cached.linkTapability;
    
    // Update UI with cached results
    updatePreflightUI();
    
    performanceMetrics.cacheHits++;
    console.log(`⚡ Pre-flight checks cached (${(performance.now() - perfStart).toFixed(2)}ms)`);
    return;
  }
  
  performanceMetrics.cacheMisses++;
  console.log('🔍 Running pre-flight checks...');
  
  // Check 1: Subject Front-Loading (Hook in first 30 chars)
  // Mobile users only see 25-30 characters of subject line
  const subjectFirst30 = subject.substring(0, 30);
  
  // Check if there's meaningful content in first 30 chars (not just filler words)
  const fillerWords = /^(hi|hello|hey|greetings|good morning|good afternoon|re:|fw:)/i;
  const hasHook = subject.length > 0 && 
                  subjectFirst30.length >= 10 && 
                  !fillerWords.test(subjectFirst30);
  
  preflightChecks.subjectFrontLoaded = hasHook;
  
  console.log(`   📧 Subject Front-Loading: ${hasHook ? '✅ PASS' : '❌ FAIL'}`, {
    subject: subject.substring(0, 50) + (subject.length > 50 ? '...' : ''),
    first30: subjectFirst30,
    length: subject.length,
    hasFillerWords: fillerWords.test(subjectFirst30)
  });
  
  // Check 2: CTA Above the Fold (Visible without scrolling)
  // Calculate actual visible area in mobile preview
  // iPhone screen: 812px height
  // - Status bar: ~56px
  // - Mail header: ~44px
  // - Subject area: ~60px (variable based on length)
  // - From section: ~76px
  // - Available viewport for email body: ~576px (before user needs to scroll)
  
  const ctaAboveFold = checkCTAInViewport(htmlContent, textContent);
  preflightChecks.ctaAboveFold = ctaAboveFold.found;
  
  console.log(`   🎯 CTA Above Fold: ${ctaAboveFold.found ? '✅ PASS' : '❌ FAIL'}`, {
    found: ctaAboveFold.found,
    type: ctaAboveFold.type,
    position: ctaAboveFold.position,
    visibleHeight: '~576px',
    details: ctaAboveFold.details
  });
  
  // Check 3: Link Tap-Ability
  // Check if email body contains a tap-friendly CTA link (not just signature/footer links)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Strip Gmail signature blocks so their links don't produce false positives
  tempDiv.querySelectorAll('.gmail_signature, [data-smartmail="gmail_signature"], .gmail_default, .gmail_footer').forEach(el => el.remove());

  // Also strip any element whose text is purely auto-generated (e.g. "Sent from Gmail")
  tempDiv.querySelectorAll('div, span').forEach(el => {
    if (/^(sent from|get outlook|--\s*$)/i.test(el.textContent.trim())) {
      el.remove();
    }
  });

  const links = tempDiv.querySelectorAll('a');
  
  let tapFriendly = true;
  let linksInFirstSection = 0;
  let hasShortLinks = false;
  
  if (links.length > 0) {
    // Check for common issues:
    // 1. Multiple links in same line (stacked links)
    // 2. Links with very short text (< 3 chars)
    // 3. Too many links close together (> 2 links in first 200 chars)
    
    links.forEach((link) => {
      const linkText = link.textContent.trim();
      const linkPos = textContent.indexOf(linkText);
      
      if (linkPos >= 0 && linkPos < 200) {
        linksInFirstSection++;
      }
      
      if (linkText.length < 3 && linkText.length > 0 && !/[📱🔗👉]/.test(linkText)) {
        hasShortLinks = true;
      }
    });
    
    tapFriendly = linksInFirstSection <= 2 && !hasShortLinks;
    
  } else {
    // No body links = fail. Every sales email needs a clickable next step.
    tapFriendly = false;
  }
  
  preflightChecks.linkTapability = tapFriendly;
  
  console.log(`   👆 Link Tap-Ability: ${tapFriendly ? '✅ PASS' : '❌ FAIL'}`, {
    totalLinks: links.length,
    linksInFirstSection: linksInFirstSection,
    hasShortLinks: hasShortLinks
  });
  
  // Update UI indicators
  updatePreflightUI();
  
  console.log('✈️ Mobile Pre-flight Summary:', {
    subjectFrontLoaded: preflightChecks.subjectFrontLoaded ? '✅ PASS' : '❌ FAIL',
    ctaAboveFold: preflightChecks.ctaAboveFold ? '✅ PASS' : '❌ FAIL',
    linkTapability: preflightChecks.linkTapability ? '✅ PASS' : '❌ FAIL'
  });
  
  // Cache the results
  operationCache.preflightResults.set(cacheKey, {
    subjectFrontLoaded: preflightChecks.subjectFrontLoaded,
    ctaAboveFold: preflightChecks.ctaAboveFold,
    linkTapability: preflightChecks.linkTapability
  });
  
  const perfTime = performance.now() - perfStart;
  console.log(`⚡ Pre-flight checks completed (${perfTime.toFixed(2)}ms)`);
}

/**
 * Update pre-flight status dots with pulsing red/green indicators
 */
function updatePreflightUI() {
  if (!shadowRoot) return;
  
  // Preflight data still used for popup tips; only log summary (no status dots in overlay)
  if (!isAttachedToCompose) {
    console.log('ℹ️ Skipping preflight warnings (not yet attached to compose body)');
    return;
  }
  
  const allPassed = preflightChecks.subjectFrontLoaded && 
                    preflightChecks.ctaAboveFold && 
                    preflightChecks.linkTapability;
  
  // Create a state string to track changes
  const currentState = `${preflightChecks.subjectFrontLoaded}-${preflightChecks.ctaAboveFold}-${preflightChecks.linkTapability}`;
  
  // Only log if state has changed
  if (currentState !== lastWarningState) {
    lastWarningState = currentState;
    
    if (allPassed) {
      console.log('🎉 All mobile pre-flight checks passed!');
    } else {
      const failedChecks = [];
      if (!preflightChecks.subjectFrontLoaded) failedChecks.push('Subject Front-Loading');
      if (!preflightChecks.ctaAboveFold) failedChecks.push('CTA Above Fold');
      if (!preflightChecks.linkTapability) failedChecks.push('Link Tap-Ability');
      
      console.warn('⚠️ Mobile optimization issues detected:', failedChecks.join(', '));
    }
  }
}


/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHTML(html) {
  // Remove script tags
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  html = html.replace(/on\w+="[^"]*"/gi, '');
  html = html.replace(/on\w+='[^']*'/gi, '');
  
  // Remove javascript: URLs
  html = html.replace(/javascript:[^"']*/gi, '');
  
  return html;
}

/**
 * Show error message with retry option
 */
function showError(message) {
  if (!shadowRoot) {
    console.warn('⚠️ Cannot show error in UI - shadowRoot not available:', message);
    return;
  }
  
  const previewContent = shadowRoot.getElementById('previewContent');
  if (!previewContent) {
    console.warn('⚠️ Cannot show error - previewContent not found:', message);
    return;
  }
  
  if (previewContent) {
    previewContent.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 12px; color: #ea4335;">⚠️</div>
        <div style="font-size: 14px; font-weight: 600; color: #ea4335; margin-bottom: 8px;">
          Detection Error
        </div>
        <div style="font-size: 12px; color: #5f6368; margin-bottom: 16px; line-height: 1.5;">
          ${message}
        </div>
        <button id="retryButton" style="
          padding: 8px 16px;
          background: #5db7de;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          🔄 Retry Detection
        </button>
      </div>
    `;
    
    // Add retry button handler
    const retryButton = previewContent.querySelector('#retryButton');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        console.log('🔄 Manual retry triggered');
        const composeWindow = findComposeWindow();
        if (composeWindow) {
          attachToCompose(composeWindow, 0);
        } else {
          console.error('❌ No compose window found for retry');
          previewContent.innerHTML = `
            <div class="empty-state">
              <div style="font-size: 48px; margin-bottom: 12px; color: #ea4335;">❌</div>
              <div style="font-size: 14px; font-weight: 600; color: #ea4335; margin-bottom: 8px;">
                Compose Window Not Found
              </div>
              <div style="font-size: 12px; color: #5f6368;">
                Please close and reopen Gmail compose
              </div>
            </div>
          `;
        }
      });
      
      // Hover effects
      retryButton.addEventListener('mouseenter', () => {
        retryButton.style.transform = 'scale(1.05)';
      });
      retryButton.addEventListener('mouseleave', () => {
        retryButton.style.transform = 'scale(1)';
      });
    }
  }
}

// ==================== CLEANUP ====================

/**
 * Task 2: Auto-Hide - Remove the phone UI when compose is closed
 * OPTIMIZED: Clear all timers, caches, and RAF handles
 */
function removePreview() {
  if (!overlayContainer) return;
  
  console.log('🗑️ Removing Phone Preview UI');
  
  // Cancel pending operations
  if (updatePreviewRAF) {
    cancelAnimationFrame(updatePreviewRAF);
    updatePreviewRAF = null;
  }
  if (heavyOperationsTimer) {
    clearTimeout(heavyOperationsTimer);
    heavyOperationsTimer = null;
  }
  if (serviceWorkerThrottle) {
    clearTimeout(serviceWorkerThrottle);
    serviceWorkerThrottle = null;
  }
  
  // Remove global event listeners (prevent memory leaks)
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopDragging);
  
  // Clear all caches
  operationCache.ctaCheck.clear();
  operationCache.preflightResults.clear();
  operationCache.scoreCalc.clear();
  
  // Reset hashes
  lastContentHash = null;
  lastSubjectHash = null;
  
  // Log final performance stats
  if (performanceMetrics.updateCount > 0) {
    const avgUpdate = (performanceMetrics.totalUpdateTime / performanceMetrics.updateCount).toFixed(2);
    const avgHeavy = performanceMetrics.heavyOpsCount > 0 ? 
      (performanceMetrics.heavyOpsTime / performanceMetrics.heavyOpsCount).toFixed(2) : 0;
    
    console.log('📊 Final Performance Stats:');
    console.log(`   Total updates: ${performanceMetrics.updateCount} (avg: ${avgUpdate}ms)`);
    console.log(`   Heavy operations: ${performanceMetrics.heavyOpsCount} (avg: ${avgHeavy}ms)`);
    console.log(`   Cache hits: ${performanceMetrics.cacheHits}, Cache misses: ${performanceMetrics.cacheMisses}`);
    
    // Reset metrics
    performanceMetrics.updateCount = 0;
    performanceMetrics.totalUpdateTime = 0;
    performanceMetrics.heavyOpsCount = 0;
    performanceMetrics.heavyOpsTime = 0;
    performanceMetrics.cacheHits = 0;
    performanceMetrics.cacheMisses = 0;
  }
  
  // Notify service worker that compose closed
  chrome.runtime.sendMessage({
    type: 'COMPOSE_CLOSED'
  }).catch(error => {
    console.error('❌ Error notifying service worker:', error);
  });
  
  // Remove from DOM
  overlayContainer.remove();
  overlayContainer = null;
  shadowRoot = null;
  
  // Clean up measurement container
  if (measurementContainer && measurementContainer.parentNode) {
    measurementContainer.parentNode.removeChild(measurementContainer);
    measurementContainer = null;
  }
  
  // Clear all object references
  currentComposeBody = null;
  currentSubjectField = null;
  isDragging = false;
  hasMoved = false;
  dragOffset = { x: 0, y: 0 };
  isCollapsed = false;
  isAttachedToCompose = false;
  
  // Reset pre-flight checks
  preflightChecks = {
    subjectFrontLoaded: false,
    ctaAboveFold: false,
    linkTapability: false
  };
  
  console.log('✅ Phone Preview removed - all resources cleaned up');
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  removePreview();
});

// ==================== START ====================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

console.log('✅ VeloMail Content Script ready');
console.log('📱 Minimalist phone preview will appear when you compose in Gmail');
console.log('⚙️ Listening for settings updates from popup');
console.log('');
console.log('🔧 Debugging help:');
console.log('   If preview doesn\'t work, run: inspectGmailCompose()');

// Debug helper function exposed to console
window.inspectGmailCompose = function() {
  console.log('🔍 GMAIL COMPOSE INSPECTOR');
  console.log('='.repeat(50));
  
  const dialogs = document.querySelectorAll('[role="dialog"]');
  console.log(`📊 Found ${dialogs.length} dialog(s) on page`);
  
  dialogs.forEach((dialog, i) => {
    console.log(`\n📦 Dialog ${i + 1}:`);
    console.log('   Tag:', dialog.tagName);
    console.log('   Class:', dialog.className.substring(0, 100));
    console.log('   Children:', dialog.children.length);
    
    // Check for subject
    const subject = dialog.querySelector('input[name="subjectbox"]');
    console.log('   Has subject field:', !!subject);
    
    // Check for textboxes
    const textboxes = dialog.querySelectorAll('[role="textbox"]');
    console.log(`   Textboxes: ${textboxes.length}`);
    textboxes.forEach((tb, j) => {
      console.log(`     ${j + 1}. ${tb.tagName} - ${tb.getAttribute('aria-label') || 'no label'} (${tb.offsetWidth}x${tb.offsetHeight})`);
    });
    
    // Check for contenteditable
    const editables = dialog.querySelectorAll('[contenteditable="true"]');
    console.log(`   Contenteditable elements: ${editables.length}`);
    editables.forEach((ed, j) => {
      if (j < 5) { // Only show first 5
        console.log(`     ${j + 1}. ${ed.tagName} - ${ed.getAttribute('aria-label')?.substring(0, 30) || 'no label'} (${ed.offsetWidth}x${ed.offsetHeight})`);
      }
    });
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('💡 Look for the dialog that is the compose window');
  console.log('💡 Note the textbox or contenteditable element that should be the body');
};

// Performance dashboard helper
window.veloMailPerformance = function() {
  console.log('⚡ VELOMAIL PERFORMANCE DASHBOARD');
  console.log('='.repeat(60));
  
  if (performanceMetrics.updateCount === 0) {
    console.log('ℹ️ No updates recorded yet. Start composing an email to see metrics.');
    return;
  }
  
  const avgUpdate = (performanceMetrics.totalUpdateTime / performanceMetrics.updateCount).toFixed(2);
  const avgHeavy = performanceMetrics.heavyOpsCount > 0 ? 
    (performanceMetrics.heavyOpsTime / performanceMetrics.heavyOpsCount).toFixed(2) : 0;
  const cacheTotal = performanceMetrics.cacheHits + performanceMetrics.cacheMisses;
  const cacheHitRate = cacheTotal > 0 ?
    ((performanceMetrics.cacheHits / cacheTotal) * 100).toFixed(1) : 0;
  
  console.log('\n📊 Update Performance:');
  console.log(`   Total updates: ${performanceMetrics.updateCount}`);
  console.log(`   Average update time: ${avgUpdate}ms`);
  console.log(`   Target: <10ms (Light updates only)`);
  console.log(`   Status: ${avgUpdate < 10 ? '✅ PASS' : avgUpdate < 20 ? '⚠️ OK' : '❌ NEEDS OPTIMIZATION'}`);
  
  console.log('\n⚙️ Heavy Operations:');
  console.log(`   Total heavy ops: ${performanceMetrics.heavyOpsCount}`);
  console.log(`   Average time: ${avgHeavy}ms`);
  console.log(`   Debounce: 300ms (reduces frequency)`);
  console.log(`   Status: ${performanceMetrics.heavyOpsCount < performanceMetrics.updateCount ? '✅ OPTIMIZED' : '⚠️ CHECK DEBOUNCING'}`);
  
  console.log('\n💾 Cache Performance:');
  console.log(`   Cache hits: ${performanceMetrics.cacheHits}`);
  console.log(`   Cache misses: ${performanceMetrics.cacheMisses}`);
  console.log(`   Hit rate: ${cacheHitRate}%`);
  console.log(`   Target: >50%`);
  console.log(`   Status: ${cacheHitRate > 50 ? '✅ EXCELLENT' : cacheHitRate > 30 ? '⚠️ OK' : '❌ NEEDS IMPROVEMENT'}`);
  
  console.log('\n🗂️ Cache Size:');
  console.log(`   CTA checks cached: ${operationCache.ctaCheck.size} / 50`);
  console.log(`   Preflight results cached: ${operationCache.preflightResults.size}`);
  
  console.log('\n🎯 Optimization Summary:');
  const optimizationScore = (
    (avgUpdate < 10 ? 40 : avgUpdate < 20 ? 20 : 0) +
    (performanceMetrics.heavyOpsCount < performanceMetrics.updateCount ? 30 : 0) +
    (cacheHitRate > 50 ? 30 : cacheHitRate > 30 ? 15 : 0)
  );
  console.log(`   Overall score: ${optimizationScore}/100`);
  if (optimizationScore >= 90) {
    console.log('   🏆 Excellent performance!');
  } else if (optimizationScore >= 70) {
    console.log('   ✅ Good performance');
  } else if (optimizationScore >= 50) {
    console.log('   ⚠️ Acceptable performance');
  } else {
    console.log('   ❌ Performance needs optimization');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 Tips:');
  console.log('   - Light updates use RAF batching (instant DOM updates)');
  console.log('   - Heavy operations debounced by 300ms (reduces load)');
  console.log('   - Service worker messages throttled to 500ms max');
  console.log('   - CTA checks cached (avoid repeated DOM measurements)');
  console.log('   - Content hashing prevents duplicate work');
};

console.log('   Example: Type inspectGmailCompose() in console');
console.log('   Performance: Type veloMailPerformance() in console');
