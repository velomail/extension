/**
 * VeloMail Service Worker - Simplified
 * Minimal version without ES module imports
 * Just handles messaging between content script and popup
 */

console.log('🚀 VeloMail Service Worker Started (Simplified)');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentEmailState = {
  isActive: false,
  html: '',
  text: '',
  subject: '',
  characterCount: 0,
  wordCount: 0,
  environment: null,
  url: null,
  mobileScore: null,
  preflightChecks: null,
  timestamp: null
};

let popupPorts = new Set(); // Track all connected popup instances

// ============================================================================
// INSTALLATION
// ============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('✅ Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    console.log('🎉 First time installation!');
    
    await chrome.storage.local.set({
      installDate: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
      firstTimeUser: true,
      emailsComposed: 0,
      settings: {
        darkMode: false,
        autoShow: true,
        showNotifications: true
      }
    });
    
    console.log('💾 Storage initialized');
    
    // Open welcome page
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('src/welcome/welcome.html')
    });
  }
});

// ============================================================================
// PORT CONNECTIONS (Real-Time Popup Communication)
// ============================================================================

chrome.runtime.onConnect.addListener((port) => {
  console.log('🔌 Port connected:', port.name);
  
  if (port.name === 'popup-realtime') {
    // Add to tracking set
    popupPorts.add(port);
    console.log(`✅ Popup connected. Total: ${popupPorts.size}`);
    
    // Send current state immediately
    try {
      port.postMessage({
        type: 'INITIAL_STATE',
        state: currentEmailState
      });
      console.log('📤 Sent initial state to popup');
    } catch (error) {
      console.error('❌ Failed to send initial state:', error);
    }
    
    // Handle disconnect
    port.onDisconnect.addListener(() => {
      popupPorts.delete(port);
      console.log(`🔌 Popup disconnected. Remaining: ${popupPorts.size}`);
    });
    
    // Handle health pings from popup
    port.onMessage.addListener((message) => {
      if (message.type === 'HEALTH_PONG') {
        console.log('💚 Health pong received');
      }
    });
  }
});

// ============================================================================
// KEYBOARD COMMAND (toggle-preview)
// ============================================================================

const MAIL_HOST_PATTERNS = [
  '*://mail.google.com/*',
  '*://outlook.live.com/*',
  '*://outlook.office365.com/*',
  '*://outlook.office.com/*'
];

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-preview') return;

  chrome.tabs.query({ active: true, currentWindow: true, url: MAIL_HOST_PATTERNS }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_PREVIEW' }).catch(() => {
      // Tab may not have content script or preview UI (e.g. no compose open)
    });
  });
});

// ============================================================================
// USAGE TRACKING
// ============================================================================

const FREE_CHECKS_LIMIT = 15;

/**
 * Check if user has remaining preview quota
 */
async function checkUsageLimit() {
  try {
    const result = await chrome.storage.local.get(['monthlyUsage']);
    const monthlyUsage = result.monthlyUsage || {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = monthlyUsage[currentMonth] || { previews: 0, limit: FREE_CHECKS_LIMIT, firstUse: Date.now() };
    
    const remaining = Math.max(0, usage.limit - usage.previews);
    const allowed = remaining > 0;
    const isApproachingLimit = remaining <= 5 && remaining > 0;
    
    return {
      allowed,
      remaining,
      limit: usage.limit,
      isApproachingLimit
    };
  } catch (error) {
    console.error('❌ Failed to check usage limit:', error);
    return { allowed: true, remaining: FREE_CHECKS_LIMIT, limit: FREE_CHECKS_LIMIT, isApproachingLimit: false };
  }
}

/**
 * Track a pre-flight check (increment only when called - caller ensures green-only)
 */
async function trackPreviewUsage() {
  try {
    const result = await chrome.storage.local.get(['monthlyUsage']);
    const monthlyUsage = result.monthlyUsage || {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    if (!monthlyUsage[currentMonth]) {
      monthlyUsage[currentMonth] = {
        previews: 0,
        limit: FREE_CHECKS_LIMIT,
        firstUse: Date.now()
      };
    }
    
    monthlyUsage[currentMonth].previews += 1;
    
    await chrome.storage.local.set({ monthlyUsage });
    
    console.log(`✅ Pre-flight tracked: ${monthlyUsage[currentMonth].previews} / ${monthlyUsage[currentMonth].limit}`);
    
    return {
      previews: monthlyUsage[currentMonth].previews,
      limit: monthlyUsage[currentMonth].limit
    };
  } catch (error) {
    console.error('❌ Failed to track preview usage:', error);
    return { previews: 0, limit: FREE_CHECKS_LIMIT };
  }
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

const errorStats = {
  errors: [],
  maxSize: 100
};

/**
 * Log error for telemetry and analytics
 */
function logError(error) {
  errorStats.errors.push(error);
  
  // Keep last 100 errors
  if (errorStats.errors.length > errorStats.maxSize) {
    errorStats.errors.shift();
  }
  
  // Count error frequency
  const errorCounts = {};
  errorStats.errors.forEach(e => {
    errorCounts[e.code] = (errorCounts[e.code] || 0) + 1;
  });
  
  // Warn if error happens frequently
  if (errorCounts[error.code] >= 5) {
    console.warn(`⚠️ Frequent error detected: ${error.code} (${errorCounts[error.code]} times)`);
  }
}

// ============================================================================
// MESSAGE HANDLER (Central Communication Hub)
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message:', message.type, 'from:', sender.tab ? `Tab ${sender.tab.id}` : 'Popup');

  try {
  switch (message.type) {
    // ========== USAGE TRACKING ==========
    
    case 'CHECK_USAGE_LIMIT':
      checkUsageLimit().then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('❌ Check usage limit failed:', error);
        sendResponse({ allowed: true, remaining: FREE_CHECKS_LIMIT, limit: FREE_CHECKS_LIMIT, isApproachingLimit: false });
      });
      return true;
      
    case 'TRACK_PREVIEW_USAGE':
    case 'TRACK_GREEN_CHECK':
      // Legacy messages: no longer increment quota. Return current usage snapshot instead.
      checkUsageLimit().then(result => {
        const previews = result.limit - result.remaining;
        sendResponse({ previews, limit: result.limit });
      }).catch(error => {
        console.error('❌ Track preview (legacy) failed:', error);
        sendResponse({ previews: 0, limit: FREE_CHECKS_LIMIT });
      });
      return true;
      
    case 'ERROR_LOGGED':
      logError(message.error);
      sendResponse({ success: true });
      break;

    case 'OPEN_UPGRADE_URL':
      chrome.tabs.create({ url: 'https://velomailext.netlify.app' });
      sendResponse({ success: true });
      break;
    
    // ========== FROM CONTENT SCRIPT ==========
    
    case 'EMAIL_CONTENT_UPDATED':
      console.log('📧 Email updated:', {
        chars: message.state?.characterCount,
        words: message.state?.wordCount,
        score: message.state?.mobileScore?.score
      });
      
      // Update in-memory state
      currentEmailState = {
        isActive: true,
        html: message.state.html || '',
        text: message.state.text || '',
        subject: message.state.subject || '',
        characterCount: message.state.characterCount || 0,
        wordCount: message.state.wordCount || 0,
        environment: message.state.environment || null,
        url: sender.tab?.url || null,
        mobileScore: message.state.mobileScore || null,
        trafficLight: message.state.trafficLight || null,
        preflightChecks: message.state.preflightChecks || null,
        timestamp: Date.now()
      };
      
      // Update extension badge: traffic light takes precedence
      if (currentEmailState.trafficLight) {
        updateBadgeWithTrafficLight(currentEmailState.trafficLight);
      } else if (currentEmailState.mobileScore && currentEmailState.mobileScore.score !== undefined) {
        updateBadgeWithScore(currentEmailState.mobileScore);
      }
      
      // Broadcast to all connected popups
      broadcastToPopups({
        type: 'EMAIL_CONTENT_UPDATED',
        state: currentEmailState
      });
      
      sendResponse({ success: true });
      break;
      
    case 'COMPOSE_OPENED':
      console.log('✉️ Compose opened');
      
      currentEmailState.isActive = true;
      currentEmailState.environment = message.environment;
      currentEmailState.url = sender.tab?.url;
      
      broadcastToPopups({
        type: 'COMPOSE_OPENED',
        environment: message.environment
      });
      
      sendResponse({ success: true });
      break;
      
    case 'COMPOSE_CLOSED':
      console.log('❌ Compose closed');
      
      currentEmailState.isActive = false;
      
      // Set badge to Idle (grey dot)
      updateBadgeWithTrafficLight('idle');
      
      broadcastToPopups({
        type: 'COMPOSE_CLOSED'
      });
      
      sendResponse({ success: true });
      break;
      
    case 'EMAIL_SENT': {
      console.log('✉️ Email sent! Tracking usage...');
      chrome.storage.local.get(['monthlyUsage']).then((r) => {
        const monthlyUsage = r.monthlyUsage || {};
        const currentMonth = new Date().toISOString().slice(0, 7);
        if (!monthlyUsage[currentMonth]) {
          monthlyUsage[currentMonth] = {
            previews: 0,
            limit: FREE_CHECKS_LIMIT,
            firstUse: Date.now()
          };
        }
        monthlyUsage[currentMonth].previews += 1;
        const usage = {
          previews: monthlyUsage[currentMonth].previews,
          limit: monthlyUsage[currentMonth].limit
        };
        return chrome.storage.local.set({ monthlyUsage }).then(() => usage);
      }).then((usage) => {
        console.log(`✅ Email send tracked: ${usage.previews} / ${usage.limit} this month`);
        currentEmailState = {
          isActive: false,
          html: '',
          text: '',
          subject: '',
          characterCount: 0,
          wordCount: 0,
          environment: null,
          url: null,
          mobileScore: null,
          timestamp: null
        };
        chrome.action.setBadgeText({ text: '' });
        broadcastToPopups({ type: 'EMAIL_SENT' });
        sendResponse({ success: true, usage });
      }).catch((error) => {
        console.error('❌ Failed after email send:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
      
    // ========== FROM POPUP ==========
    
    case 'GET_CURRENT_EMAIL_STATE':
      console.log('📤 Popup requesting state');
      sendResponse({
        success: true,
        state: currentEmailState
      });
      break;
      
    case 'SETTINGS_UPDATED':
      console.log('⚙️ Settings updated:', message.settings);
      
      // Broadcast settings to all content scripts
      chrome.tabs.query({ url: ['*://mail.google.com/*', '*://outlook.live.com/*', '*://outlook.office.com/*'] }, (tabs) => {
        console.log(`📡 Broadcasting settings to ${tabs.length} Gmail/Outlook tab(s)`);
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            settings: message.settings
          }).catch(error => {
            // Tab may not have content script loaded yet
            console.log(`⚠️ Could not send to tab ${tab.id}:`, error.message);
          });
        });
      });
      
      sendResponse({ success: true });
      break;
      
    case 'MILESTONE_ACHIEVED':
      console.log('🎉 Milestone achieved:', message.milestoneId);
      // Just acknowledge - milestones are tracked in storage by content script
      sendResponse({ success: true });
      break;
      
    case 'PING':
      sendResponse({ 
        success: true, 
        message: 'PONG from background!',
        timestamp: new Date().toISOString()
      });
      break;
      
    default:
      console.log('❓ Unknown message:', message.type);
      sendResponse({ success: false });
  }
  } catch (err) {
    console.error('❌ Unhandled error in message handler:', err);
    try { sendResponse({ success: false, error: err.message }); } catch (_) {}
  }
  
  return true;
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Broadcast message to all connected popup instances
 */
function broadcastToPopups(message) {
  if (popupPorts.size === 0) {
    console.log('ℹ️ No popups to broadcast to');
    return;
  }
  
  console.log(`📡 Broadcasting to ${popupPorts.size} popup(s):`, message.type);
  
  let successCount = 0;
  let failCount = 0;
  
  popupPorts.forEach(port => {
    try {
      port.postMessage(message);
      successCount++;
    } catch (error) {
      console.error('❌ Broadcast error:', error);
      popupPorts.delete(port);
      failCount++;
    }
  });
  
  console.log(`✅ Broadcast complete: ${successCount} success, ${failCount} failed`);
}

/**
 * Update extension badge with traffic light (Ready / Issues / Idle)
 */
function updateBadgeWithTrafficLight(light) {
  let text = '';
  let color = '#9ca3af'; // grey idle
  if (light === 'ready') {
    text = '✓';
    color = '#10b981'; // green
  } else if (light === 'issues') {
    text = '!';
    color = '#eab308'; // yellow
  } else {
    text = '·';
    color = '#9ca3af'; // grey idle
  }
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  console.log('🎯 Badge (traffic light):', light, text, color);
}

/**
 * Update extension badge with mobile score (legacy fallback)
 */
function updateBadgeWithScore(scoreData) {
  const score = Math.round(scoreData.score);
  const grade = scoreData.grade || getGradeFromScore(score);
  
  chrome.action.setBadgeText({ text: score.toString() });
  
  let color;
  if (score >= 90) {
    color = '#10b981'; // Green - A
  } else if (score >= 80) {
    color = '#3b82f6'; // Blue - B
  } else if (score >= 70) {
    color = '#f59e0b'; // Orange - C
  } else if (score >= 60) {
    color = '#f97316'; // Light Red - D
  } else {
    color = '#ef4444'; // Red - F
  }
  
  chrome.action.setBadgeBackgroundColor({ color: color });
  
  console.log('🎯 Badge updated:', score, grade, color);
}

function getGradeFromScore(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentEmailState.isActive) {
    console.log('🗑️ Active tab closed');
    currentEmailState.isActive = false;
    
    // Clear badge
    chrome.action.setBadgeText({ text: '' });
    
    broadcastToPopups({
      type: 'ACTIVE_TAB_CLOSED'
    });
  }
});

// ============================================================================
// STARTUP
// ============================================================================

chrome.runtime.onStartup.addListener(() => {
  console.log('🌅 Browser started');
  
  // Clear badge if no active email
  if (!currentEmailState.isActive) {
    chrome.action.setBadgeText({ text: '' });
  }
});

// Keepalive to prevent service worker sleep
chrome.alarms.create('keepalive', { periodInMinutes: 1 });

// Monthly usage cleanup — runs once a day, prunes keys older than 2 months
chrome.alarms.create('monthlyCleanup', { periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // no-op — just keeps the worker alive
    return;
  }

  if (alarm.name === 'monthlyCleanup') {
    chrome.storage.local.get(['monthlyUsage']).then((result) => {
      const monthlyUsage = result.monthlyUsage || {};
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Keep only the current month and the one immediately before it
      const [year, month] = currentMonth.split('-').map(Number);
      const prevMonth = month === 1
        ? `${year - 1}-12`
        : `${year}-${String(month - 1).padStart(2, '0')}`;

      const pruned = {};
      if (monthlyUsage[currentMonth]) pruned[currentMonth] = monthlyUsage[currentMonth];
      if (monthlyUsage[prevMonth]) pruned[prevMonth] = monthlyUsage[prevMonth];

      const removed = Object.keys(monthlyUsage).length - Object.keys(pruned).length;
      if (removed > 0) {
        chrome.storage.local.set({ monthlyUsage: pruned });
        console.log(`🧹 Pruned ${removed} old usage month(s) from storage`);
      }
    }).catch((err) => {
      console.error('❌ monthlyCleanup failed:', err);
    });
  }
});

console.log('✅ VeloMail Service Worker Ready (Simplified)');
console.log('📡 Message Relay: Content Script ↔ Service Worker ↔ Popup');
