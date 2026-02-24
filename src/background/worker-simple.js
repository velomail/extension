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

// Open extension icon click in Side Panel instead of popup (avoids blocking compose window)
if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

// ============================================================================
// INSTALLATION
// ============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('✅ Extension installed:', details.reason);

  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  if (details.reason === 'install') {
    console.log('🎉 First time installation!');
    
    await chrome.storage.local.set({
      installDate: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
      firstTimeUser: true,
      emailsComposed: 0,
      settings: {
        darkMode: false,
        autoShow: true
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

/** Safe get all frames for a tab; never throws, always returns an array. */
function safeGetAllFrames(tabId) {
  const p = chrome.webNavigation && typeof chrome.webNavigation.getAllFrames === 'function'
    ? chrome.webNavigation.getAllFrames({ tabId })
    : Promise.resolve([]);
  return Promise.resolve(p).then(f => (f && Array.isArray(f) ? f : [])).catch(() => []);
}

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
// USAGE TRACKING (daily limit; resets at local midnight)
// ============================================================================

const DAILY_LIMIT = 5;

/** Today as YYYY-MM-DD in user's local timezone (resets at local midnight) */
function getToday() {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Check if user has remaining daily quota. Lifetime (isPaid) bypasses limit.
 */
async function checkUsageLimit() {
  try {
    const sync = await chrome.storage.sync.get(['isPaid']);
    if (sync.isPaid === true) {
      return { allowed: true, remaining: -1, limit: -1, isApproachingLimit: false };
    }

    const today = getToday();
    const result = await chrome.storage.local.get(['usageData']);
    let data = result.usageData || { date: today, count: 0 };

    if (data.date !== today) {
      data = { date: today, count: 0 };
    }

    const remaining = Math.max(0, DAILY_LIMIT - data.count);
    const allowed = data.count < DAILY_LIMIT;
    const isApproachingLimit = remaining <= 2 && remaining > 0;

    return {
      allowed,
      remaining,
      limit: DAILY_LIMIT,
      isApproachingLimit
    };
  } catch (error) {
    console.error('❌ Failed to check usage limit:', error);
    return { allowed: true, remaining: DAILY_LIMIT, limit: DAILY_LIMIT, isApproachingLimit: false };
  }
}

/**
 * Return current daily usage snapshot (read-only; does not increment).
 */
async function trackPreviewUsage() {
  try {
    const result = await checkUsageLimit();
    const previews = result.limit >= 0 ? result.limit - result.remaining : 0;
    const limit = result.limit >= 0 ? result.limit : DAILY_LIMIT;
    return { previews, limit };
  } catch (error) {
    console.error('❌ Failed to get usage snapshot:', error);
    return { previews: 0, limit: DAILY_LIMIT };
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
        sendResponse({ allowed: true, remaining: DAILY_LIMIT, limit: DAILY_LIMIT, isApproachingLimit: false });
      });
      return true;
      
    case 'TRACK_PREVIEW_USAGE':
    case 'TRACK_GREEN_CHECK':
      trackPreviewUsage().then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('❌ Track preview (legacy) failed:', error);
        sendResponse({ previews: 0, limit: DAILY_LIMIT });
      });
      return true;
      
    case 'ERROR_LOGGED':
      logError(message.error);
      sendResponse({ success: true });
      break;

    case 'OPEN_UPGRADE_URL':
      chrome.tabs.create({ url: 'https://buy.stripe.com/7sY3cvbLWgU3fMA0DKbZe02' });
      sendResponse({ success: true });
      break;

    case 'VERIFY_AND_UNLOCK':
      (async () => {
        const sessionId = message.sessionId;
        if (!sessionId || !sessionId.startsWith('cs_')) {
          sendResponse({ success: false, error: 'Invalid session ID.' });
          return;
        }
        const apiBase = 'https://velomail-api.vercel.app';
        try {
          const res = await fetch(`${apiBase}/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
          const data = res.ok ? await res.json().catch(() => ({})) : {};
          if (res.ok && data.ok === true) {
            await chrome.storage.sync.set({ isPaid: true });
            console.log('✅ VeloMail: Lifetime unlock applied (isPaid=true)');
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: data.error || 'Verification failed. Please try again or contact support.' });
          }
        } catch (err) {
          console.error('❌ VeloMail: Verify-and-unlock failed', err);
          sendResponse({ success: false, error: 'Could not reach verification server. Please try again later.' });
        }
      })();
      return true;
    
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
      
      // Full reset so popup shows inactive state (no stale tips)
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
        preflightChecks: null,
        timestamp: null
      };
      
      // Set badge to Idle (grey dot)
      updateBadgeWithTrafficLight('idle');
      
      broadcastToPopups({
        type: 'COMPOSE_CLOSED'
      });
      
      sendResponse({ success: true });
      break;
      
    case 'EMAIL_SENT': {
      console.log('✉️ Email sent! Tracking usage...');
      chrome.storage.sync.get(['isPaid']).then((sync) => {
        if (sync.isPaid === true) {
          return { usage: { previews: -1, limit: -1 } };
        }
        return chrome.storage.local.get(['usageData']).then((r) => {
          const today = getToday();
          let data = r.usageData || { date: today, count: 0 };
          if (data.date !== today) {
            data = { date: today, count: 0 };
          }
          data.count += 1;
          return chrome.storage.local.set({ usageData: data }).then(() => ({
            usage: { previews: data.count, limit: DAILY_LIMIT }
          }));
        });
      }).then(({ usage }) => {
        console.log(`✅ Email send tracked: ${usage.previews} / ${usage.limit} today`);
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
      (async () => {
        console.log('📤 Popup requesting state');
        try {
          let [activeTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
            url: MAIL_HOST_PATTERNS
          });
          if (!activeTab || !activeTab.id) {
            [activeTab] = await chrome.tabs.query({ active: true, url: MAIL_HOST_PATTERNS });
          }
          const allMailTabs = await chrome.tabs.query({ url: MAIL_HOST_PATTERNS });
          const sorted = (allMailTabs || []).slice().sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
          const tabIdsSeen = new Set();
          const tabsToTry = [];
          if (activeTab && activeTab.id) {
            tabsToTry.push(activeTab);
            tabIdsSeen.add(activeTab.id);
          }
          for (const tab of sorted) {
            if (tab && tab.id && !tabIdsSeen.has(tab.id)) {
              tabsToTry.push(tab);
              tabIdsSeen.add(tab.id);
            }
          }
          console.log('📤 GET_CURRENT_EMAIL_STATE: tabsToTry=', tabsToTry.length);
          for (const tab of tabsToTry) {
            if (!tab || !tab.id) continue;
            let frames = await safeGetAllFrames(tab.id);
            if (frames.length === 0) {
              await new Promise((r) => setTimeout(r, 150));
              frames = await safeGetAllFrames(tab.id);
            }
            const frameList = frames.length > 0 ? frames : [{ frameId: 0 }];
            console.log('📤 GET_CURRENT_EMAIL_STATE: tabId=', tab.id, 'frames=', frameList.length);
            for (const frame of frameList) {
              const opts = frame.frameId !== undefined ? { frameId: frame.frameId } : {};
              const fresh = await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_EMAIL_STATE' }, opts).then(r => r || null).catch(() => null);
              const hasActive = fresh && (fresh.preflightChecks != null || fresh.mobileScore != null || fresh.isActive);
              if (hasActive) {
                console.log('📤 GET_CURRENT_EMAIL_STATE: got active state from tabId=', tab.id, 'frameId=', frame.frameId);
                const state = {
                  isActive: fresh.isActive !== false,
                  html: fresh.html || '',
                  text: fresh.text || '',
                  subject: fresh.subject || '',
                  characterCount: fresh.characterCount || 0,
                  wordCount: fresh.wordCount || 0,
                  environment: fresh.environment || null,
                  url: tab.url || null,
                  mobileScore: fresh.mobileScore || null,
                  trafficLight: fresh.trafficLight || null,
                  preflightChecks: fresh.preflightChecks || null,
                  timestamp: Date.now()
                };
                currentEmailState = state;
                sendResponse({ success: true, state });
                return;
              }
            }
          }
          console.log('📤 GET_CURRENT_EMAIL_STATE: no frame returned active state');
        } catch (_) {}
        const fallbackState = { ...currentEmailState, isActive: false };
        sendResponse({ success: true, state: fallbackState });
      })();
      return true;
      
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

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // no-op — just keeps the worker alive
  }
});

console.log('✅ VeloMail Service Worker Ready (Simplified)');
console.log('📡 Message Relay: Content Script ↔ Service Worker ↔ Popup');
