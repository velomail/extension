/**
 * VeloMail Popup - Minimalist
 * Syncs with service worker for real-time tips
 */

console.log('⚙️ VeloMail Popup Loading...');

// ============================================================================
// STATE
// ============================================================================

let port = null;
let currentState = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ DOM Ready - VeloMail v1.0.1 - Code Updated Feb 13, 2026');
  
  try {
    // Setup event listeners
    setupEventListeners();
    
    // Connect to service worker
    connectToServiceWorker();
    
    // Request initial state
    await requestInitialState();
    
    // Load usage stats
    await updateUsageStats();
    
    // Load settings
    await loadSettings();
    
    console.log('✅ Popup Initialized');
  } catch (error) {
    console.error('❌ Init error:', error);
  }
});

// ============================================================================
// SERVICE WORKER CONNECTION
// ============================================================================

function connectToServiceWorker() {
  try {
    // Create long-lived connection to service worker
    port = chrome.runtime.connect({ name: 'popup-realtime' });
    
    console.log('🔌 Connected to service worker');
    
    // Listen for messages from service worker
    port.onMessage.addListener((message) => {
      console.log('📨 Message from service worker:', message.type);
      
      switch (message.type) {
        case 'INITIAL_STATE':
          console.log('   ✅ Initial state received');
          if (message.state) {
            currentState = message.state;
            updateUI(currentState);
          }
          break;
          
        case 'EMAIL_CONTENT_UPDATED':
          console.log('   ✅ Email content updated - score:', message.state?.mobileScore?.score);
          if (message.state) {
            currentState = message.state;
            updateUI(currentState);
            // Also refresh usage stats when content updates
            updateUsageStats();
          }
          break;
          
        case 'COMPOSE_OPENED':
          console.log('   ✅ Compose opened');
          updateStatus('Composing', true);
          requestInitialState();
          break;
          
        case 'COMPOSE_CLOSED':
          console.log('   ✅ Compose closed');
          requestInitialState();
          break;
          
        case 'EMAIL_SENT':
          console.log('   ✅ Email sent - refreshing stats');
          showEmptyState();
          updateStatus('Ready', false);
          updateUsageStats();
          break;
          
        case 'ACTIVE_TAB_CLOSED':
          console.log('   ✅ Tab closed');
          requestInitialState();
          break;
          
        case 'HEALTH_PING':
          // Respond to health check
          port.postMessage({
            type: 'HEALTH_PONG',
            timestamp: message.timestamp
          });
          break;
          
        default:
          console.log('   ⚠️ Unknown message type:', message.type);
      }
    });
    
    // Handle disconnect
    port.onDisconnect.addListener(() => {
      console.log('🔌 Disconnected from service worker');
      port = null;
      
      // Try to reconnect after a delay
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        connectToServiceWorker();
      }, 1000);
    });
  } catch (error) {
    console.error('❌ Connection error:', error);
  }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

async function requestInitialState(retryCount = 0) {
  const maxRetries = 2;
  const retryDelayMs = 500;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CURRENT_EMAIL_STATE'
    });
    
    if (response && response.state) {
      const state = response.state;
      const isActive = state.isActive === true;
      const hasTips = state.preflightChecks != null || (state.mobileScore != null && state.mobileScore.score != null);
      if (isActive || hasTips) {
        currentState = state;
        updateUI(currentState);
        console.log('✅ Initial state loaded (active:', isActive, ')');
        return;
      }
      currentState = null;
      showEmptyState();
      updateStatus('Ready', false);
      return;
    }
    if (retryCount < maxRetries) {
      setTimeout(() => requestInitialState(retryCount + 1), retryDelayMs);
      return;
    }
    currentState = null;
    showEmptyState();
    updateStatus('Ready', false);
  } catch (error) {
    console.error('❌ Failed to get initial state:', error);
    if (retryCount < maxRetries) {
      setTimeout(() => requestInitialState(retryCount + 1), retryDelayMs);
    } else {
      currentState = null;
      showEmptyState();
      updateStatus('Ready', false);
    }
  }
}

// ============================================================================
// UI UPDATES
// ============================================================================

// Debounce UI updates to prevent flickering from rapid updates
let uiUpdateTimeout = null;

function updateUI(state) {
  // Clear any pending update
  if (uiUpdateTimeout) {
    clearTimeout(uiUpdateTimeout);
  }
  
  // Debounce the actual UI update by 50ms
  uiUpdateTimeout = setTimeout(() => {
    performUIUpdate(state);
  }, 50);
}

function performUIUpdate(state) {
  const isActive = state && state.isActive === true;
  const hasTips = state && (state.preflightChecks != null || (state.mobileScore != null && typeof state.mobileScore.score === 'number'));
  console.log('🔄 Updating UI:', { isActive, hasTips, hasState: !!state });
  
  if (!state || (!isActive && !hasTips)) {
    showEmptyState();
    updateStatus('Ready', false);
    return;
  }
  showChatBubbles(state.mobileScore, state.preflightChecks);
  updateStatus(isActive ? 'Composing' : 'Last Email', isActive);
}

function updateStatus(text, isActive) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = text;
    if (isActive) {
      statusEl.classList.add('active');
    } else {
      statusEl.classList.remove('active');
    }
  }
}

// Pre-flight check definitions — weights total 100
const PREFLIGHT_CHECKS = [
  {
    key: 'subjectFrontLoaded',
    weight: 35,
    label: 'Subject grabs attention',
    passText: 'Your value prop lands in the first glance. Strong open bait.',
    failText: 'Prospects decide in under a second. Put your strongest hook in the first 10 characters — not at the end.',
  },
  {
    key: 'ctaAboveFold',
    weight: 45,
    label: 'CTA in the hot zone',
    passText: 'Your ask is above the fold — prospects can act without scrolling.',
    failText: 'Your CTA is buried. On a phone, most prospects never scroll. Push your ask to the top.',
  },
  {
    key: 'linkTapability',
    weight: 20,
    label: 'Clear next step',
    passText: 'One focused link. Clean tap target — easy for your prospect to act.',
    failText: 'No clickable link found. Every sales email needs a next step — add a booking link, demo URL, or reply CTA.',
  },
];

function showChatBubbles(mobileScore, preflight) {
  const chatContainer = document.getElementById('chatContainer');
  const emptyState = document.getElementById('emptyState');
  const tipsBubbles = document.getElementById('tipsBubbles');
  const tipsLabel = document.getElementById('tipsLabel');

  if (!chatContainer || !emptyState) return;

  emptyState.classList.add('hidden');
  chatContainer.classList.remove('hidden');

  if (tipsLabel) tipsLabel.textContent = 'Pre-flight Checks';

  if (!tipsBubbles) return;

  // Use preflight data if available, fall back to all-unknown state
  const checks = preflight || {};

  let html = '';
  PREFLIGHT_CHECKS.forEach((check, index) => {
    const state = checks[check.key]; // true = pass, false = fail, undefined = pending
    const isPending = state === undefined || state === null;
    const passed = state === true;

    const stateClass = isPending ? 'tip-card--pending'
                     : passed   ? 'tip-card--pass'
                                : 'tip-card--fail';

    const badgeClass = isPending ? '' : passed ? 'badge--pass' : 'badge--fail';
    const badgeIcon  = isPending ? '—' : passed ? '✓' : '✕';
    const bodyText   = isPending ? 'Waiting for content…'
                     : passed   ? check.passText
                                : check.failText;

    html += `
      <div class="tip-card ${stateClass}" style="animation-delay:${index * 0.1}s">
        <div class="tip-card-header">
          <div class="tip-card-label">${escapeHtml(check.label)}</div>
          <div class="tip-card-badge ${badgeClass}">
            <span class="badge-icon">${badgeIcon}</span>
            <span class="badge-weight">${check.weight}%</span>
          </div>
        </div>
        <div class="tip-card-description">${escapeHtml(bodyText)}</div>
        ${!isPending ? `<div class="tip-card-bar"><div class="tip-card-bar-fill" style="width:${passed ? 100 : 0}%"></div></div>` : ''}
      </div>
    `;
  });

  tipsBubbles.innerHTML = html;
}

function stripLeadingEmoji(str) {
  return str.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}\s]+/u, '').trim() || str;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showEmptyState() {
  const chatContainer = document.getElementById('chatContainer');
  const emptyState = document.getElementById('emptyState');
  
  if (!chatContainer || !emptyState) return;
  
  chatContainer.classList.add('hidden');
  emptyState.classList.remove('hidden');
}

// ============================================================================
// USAGE STATS
// ============================================================================

const UPGRADE_URL = 'https://buy.stripe.com/7sY3cvbLWgU3fMA0DKbZe02';

async function updateUsageStats() {
  try {
    const [sync, local] = await Promise.all([
      chrome.storage.sync.get(['isPaid']),
      chrome.storage.local.get(['usageData'])
    ]);

    const usageCount = document.getElementById('usageCount');
    const usageFill = document.getElementById('usageFill');
    const usageBar = document.getElementById('usageBar');
    const usageReset = document.getElementById('usageReset');
    const upgradeCta = document.getElementById('upgradeCta');

    if (sync.isPaid === true) {
      if (usageCount) usageCount.textContent = 'Lifetime — Unlimited';
      if (usageBar) usageBar.classList.add('hidden');
      if (usageReset) usageReset.textContent = '';
      if (upgradeCta) upgradeCta.classList.add('hidden');
      return;
    }

    const today = new Date().toLocaleDateString('en-CA');
    let data = local.usageData || { date: today, count: 0 };
    if (data.date !== today) {
      data = { date: today, count: 0 };
    }
    const count = data.count;
    const limit = 5;

    if (usageCount) {
      usageCount.textContent = `${count} / ${limit}`;
    }

    if (usageBar) usageBar.classList.remove('hidden');
    if (usageFill) {
      const percentage = (count / limit) * 100;
      usageFill.style.width = `${Math.min(percentage, 100)}%`;
      usageFill.classList.remove('warning', 'danger');
      if (percentage >= 90) {
        usageFill.classList.add('danger');
      } else if (percentage >= 80) {
        usageFill.classList.add('warning');
      }
    }

    if (usageReset) {
      usageReset.textContent = 'Resets at midnight';
    }

    if (upgradeCta) {
      upgradeCta.classList.remove('hidden');
      upgradeCta.href = UPGRADE_URL;
      upgradeCta.textContent = 'Tired of daily limits? Get Lifetime Access ($49) →';
    }
  } catch (error) {
    console.error('❌ Failed to load usage stats:', error);
  }
}

// ============================================================================
// SETTINGS
// ============================================================================

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || { autoShow: true };
    
    const autoShow = document.getElementById('autoShow');
    if (autoShow) {
      autoShow.checked = settings.autoShow !== false;
    }
  } catch (error) {
    console.error('❌ Failed to load settings:', error);
  }
}

async function saveSettings() {
  try {
    const autoShow = document.getElementById('autoShow');
    const settings = {
      autoShow: autoShow ? autoShow.checked : true
    };
    
    await chrome.storage.local.set({ settings });
    console.log('✅ Settings saved:', settings);
    
    // Notify service worker
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      settings: settings
    }).catch(() => {
      // Service worker may not be active
    });
  } catch (error) {
    console.error('❌ Failed to save settings:', error);
  }
}

// Compose URLs: open compose in same tab for Gmail/Outlook
function getComposeUrlForTab(tab) {
  if (!tab || !tab.url) return 'https://mail.google.com/mail/#compose';
  const u = tab.url.toLowerCase();
  if (u.includes('mail.google.com')) return 'https://mail.google.com/mail/#compose';
  if (u.includes('outlook.live.com')) return 'https://outlook.live.com/mail/compose/v';
  if (u.includes('outlook.office.com') || u.includes('outlook.office365.com')) return 'https://outlook.office.com/mail/0/compose';
  return 'https://mail.google.com/mail/#compose';
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Auto-show toggle
  const autoShow = document.getElementById('autoShow');
  if (autoShow) {
    autoShow.addEventListener('change', saveSettings);
  }
  
  // Start now: open compose in current Gmail/Outlook tab (or new Gmail tab)
  const startNowBtn = document.getElementById('startNowBtn');
  if (startNowBtn) {
    startNowBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          [tab] = await chrome.tabs.query({ active: true });
        }
        const composeUrl = getComposeUrlForTab(tab);
        const isMailTab = tab && tab.url && (tab.url.includes('mail.google.com') || tab.url.includes('outlook'));
        if (tab && tab.id && isMailTab) {
          await chrome.tabs.update(tab.id, { url: composeUrl });
        } else {
          await chrome.tabs.create({ url: composeUrl });
        }
      } catch (_) {
        await chrome.tabs.create({ url: 'https://mail.google.com/mail/#compose' });
      }
      window.close();
    });
  }
  
  // Upgrade CTA
  const upgradeCta = document.getElementById('upgradeCta');
  if (upgradeCta) {
    upgradeCta.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: UPGRADE_URL });
      window.close();
    });
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

window.addEventListener('unload', () => {
  if (port) {
    port.disconnect();
  }
});

console.log('✅ Popup script loaded');
