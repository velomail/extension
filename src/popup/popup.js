/**
 * VeloMail Popup - Minimalist
 * Syncs with service worker for real-time tips
 */

const DEBUG = false
const log = (...args) => {
  if (DEBUG) log(...args)
}

// ============================================================================
// STATE
// ============================================================================

let port = null
let currentState = null
let extensionContextInvalidated = false

function isContextInvalidatedError(err) {
  return (
    err && String(err.message || "").includes("Extension context invalidated")
  )
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const manifest = chrome.runtime.getManifest()
  const versionEl = document.getElementById("headerVersion")
  if (versionEl && manifest?.version) {
    versionEl.textContent = `v${manifest.version}`
  }

  try {
    // Initialize theme (unified with welcome page for cross-device consistency)
    const { initializeTheme, applyTheme } = await import("../lib/theme.js")
    await initializeTheme()
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "THEME_CHANGED" && message.isDark !== undefined) {
        applyTheme(message.isDark, true)
      }
    })

    // Setup event listeners
    setupEventListeners()

    // Connect to service worker
    connectToServiceWorker()

    // Request initial state
    await requestInitialState()

    // Load usage stats
    await updateUsageStats()

    // Load settings
    await loadSettings()

    log("✅ Popup Initialized")
  } catch (error) {
    if (isContextInvalidatedError(error)) extensionContextInvalidated = true
    else console.error("❌ Init error:", error)
  }
})

// ============================================================================
// SERVICE WORKER CONNECTION
// ============================================================================

function connectToServiceWorker() {
  if (extensionContextInvalidated) return
  try {
    // Create long-lived connection to service worker
    port = chrome.runtime.connect({ name: "popup-realtime" })

    log("🔌 Connected to service worker")

    // Listen for messages from service worker
    port.onMessage.addListener((message) => {
      log("📨 Message from service worker:", message.type)

      switch (message.type) {
        case "INITIAL_STATE":
          log("   ✅ Initial state received")
          if (message.state) {
            currentState = message.state
            updateUI(currentState)
          }
          break

        case "EMAIL_CONTENT_UPDATED":
          log(
            "   ✅ Email content updated - score:",
            message.state?.mobileScore?.score
          )
          if (message.state) {
            currentState = message.state
            updateUI(currentState)
            updateUsageStats().catch(() => {})
          }
          break

        case "COMPOSE_OPENED":
          log("   ✅ Compose opened")
          updateStatus("Composing", true)
          requestInitialState()
          break

        case "COMPOSE_CLOSED":
          log("   ✅ Compose closed")
          requestInitialState()
          break

        case "EMAIL_SENT":
          log("   ✅ Email sent - refreshing stats")
          showEmptyState()
          updateStatus("Ready", false)
          updateUsageStats().catch(() => {})
          break

        case "ACTIVE_TAB_CLOSED":
          log("   ✅ Tab closed")
          requestInitialState()
          break

        case "HEALTH_PING":
          // Respond to health check
          port.postMessage({
            type: "HEALTH_PONG",
            timestamp: message.timestamp
          })
          break

        default:
          log("   ⚠️ Unknown message type:", message.type)
      }
    })

    // Handle disconnect
    port.onDisconnect.addListener(() => {
      log("🔌 Disconnected from service worker")
      port = null

      // Try to reconnect after a delay (skip if extension was reloaded)
      setTimeout(() => {
        if (extensionContextInvalidated) return
        log("🔄 Attempting to reconnect...")
        connectToServiceWorker()
      }, 1000)
    })
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      extensionContextInvalidated = true
      console.warn("⚠️ Extension was reloaded; close and reopen the popup")
      return
    }
    console.error("❌ Connection error:", error)
  }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

async function requestInitialState(retryCount = 0) {
  const maxRetries = 2
  const retryDelayMs = 500
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_CURRENT_EMAIL_STATE"
    })

    if (response && response.state) {
      const state = response.state
      const isActive = state.isActive === true
      if (isActive) {
        currentState = state
        updateUI(currentState)
        log("✅ Initial state loaded (composing)")
        return
      }
      currentState = null
      showEmptyState()
      updateStatus("Ready", false)
      return
    }
    if (retryCount < maxRetries) {
      setTimeout(() => requestInitialState(retryCount + 1), retryDelayMs)
      return
    }
    currentState = null
    showEmptyState()
    updateStatus("Ready", false)
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      extensionContextInvalidated = true
      return
    }
    console.error("❌ Failed to get initial state:", error)
    if (retryCount < maxRetries) {
      setTimeout(() => requestInitialState(retryCount + 1), retryDelayMs)
    } else {
      currentState = null
      showEmptyState()
      updateStatus("Ready", false)
    }
  }
}

// ============================================================================
// UI UPDATES
// ============================================================================

// Debounce UI updates to prevent flickering from rapid updates
let uiUpdateTimeout = null

function updateUI(state) {
  // Clear any pending update
  if (uiUpdateTimeout) {
    clearTimeout(uiUpdateTimeout)
  }

  // Debounce the actual UI update by 50ms
  uiUpdateTimeout = setTimeout(() => {
    performUIUpdate(state)
  }, 50)
}

function performUIUpdate(state) {
  const isActive = state && state.isActive === true
  log("🔄 Updating UI:", { isActive, hasState: !!state })

  if (!state || !isActive) {
    showEmptyState()
    updateStatus("Ready", false)
    return
  }
  showChatBubbles(state.mobileScore, state.preflightChecks)
  updateStatus("Composing", true)
}

function updateStatus(text, isActive) {
  const statusEl = document.getElementById("status")
  if (statusEl) {
    statusEl.textContent = text
    if (isActive) {
      statusEl.classList.add("active")
    } else {
      statusEl.classList.remove("active")
    }
  }
}

// Pre-flight check definitions — weights total 100
const PREFLIGHT_CHECKS = [
  {
    key: "subjectFrontLoaded",
    weight: 35,
    label: "Subject grabs attention",
    passText: "Your value prop lands in the first glance. Strong open bait.",
    failText:
      "Prospects decide in under a second. Put your strongest hook in the first 10 characters — not at the end."
  },
  {
    key: "ctaAboveFold",
    weight: 45,
    label: "CTA in the hot zone",
    passText:
      "Your ask is above the fold — prospects can act without scrolling.",
    failText:
      "Your CTA is buried. On a phone, most prospects never scroll. Push your ask to the top."
  },
  {
    key: "linkTapability",
    weight: 20,
    label: "Clear next step",
    passText:
      "One focused link. Clean tap target — easy for your prospect to act.",
    failText:
      "No clickable link found. Every sales email needs a next step — add a booking link, demo URL, or reply CTA."
  }
]

function showChatBubbles(mobileScore, preflight) {
  const chatContainer = document.getElementById("chatContainer")
  const emptyState = document.getElementById("emptyState")
  const tipsBubbles = document.getElementById("tipsBubbles")
  const tipsLabel = document.getElementById("tipsLabel")

  if (!chatContainer || !emptyState) return

  emptyState.classList.add("hidden")
  chatContainer.classList.remove("hidden")

  if (tipsLabel) tipsLabel.textContent = "Pre-flight Checks"

  if (!tipsBubbles) return

  // Use preflight data if available, fall back to all-unknown state
  const checks = preflight || {}

  let html = ""
  PREFLIGHT_CHECKS.forEach((check, index) => {
    const state = checks[check.key] // true = pass, false = fail, undefined = pending
    const isPending = state === undefined || state === null
    const passed = state === true

    const stateClass = isPending
      ? "tip-card--pending"
      : passed
        ? "tip-card--pass"
        : "tip-card--fail"

    const badgeClass = isPending ? "" : passed ? "badge--pass" : "badge--fail"
    const badgeIcon = isPending ? "—" : passed ? "✓" : "✕"
    const bodyText = isPending
      ? "Waiting for content…"
      : passed
        ? check.passText
        : check.failText

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
        ${!isPending ? `<div class="tip-card-bar"><div class="tip-card-bar-fill" style="width:${passed ? 100 : 0}%"></div></div>` : ""}
      </div>
    `
  })

  tipsBubbles.innerHTML = html
}

function stripLeadingEmoji(str) {
  return (
    str
      .replace(
        /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}\s]+/u,
        ""
      )
      .trim() || str
  )
}

function escapeHtml(str) {
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

function showEmptyState() {
  const chatContainer = document.getElementById("chatContainer")
  const emptyState = document.getElementById("emptyState")

  if (!chatContainer || !emptyState) return

  chatContainer.classList.add("hidden")
  emptyState.classList.remove("hidden")
}

// ============================================================================
// USAGE STATS
// ============================================================================

const UPGRADE_URL = "https://velomail.vercel.app/landing/#pricing"

async function updateUsageStats() {
  try {
    const [sync, local] = await Promise.all([
      chrome.storage.sync.get(["isPaid"]),
      chrome.storage.local.get(["usageData"])
    ])

    const usageCount = document.getElementById("usageCount")
    const usageFill = document.getElementById("usageFill")
    const usageBar = document.getElementById("usageBar")
    const usageReset = document.getElementById("usageReset")
    const upgradeCta = document.getElementById("upgradeCta")
    const usagePlanLabel = document.getElementById("usagePlanLabel")
    const usageCard = document.getElementById("usageCard")
    const premiumBadge = document.getElementById("premiumBadge")

    if (sync.isPaid === true) {
      if (usagePlanLabel) usagePlanLabel.textContent = "Premium"
      if (usageCount) usageCount.textContent = "Unlimited"
      if (usageBar) usageBar.classList.add("hidden")
      if (usageReset) usageReset.textContent = ""
      if (upgradeCta) upgradeCta.classList.add("hidden")
      if (usageCard) usageCard.classList.add("usage-card--premium")
      if (premiumBadge) premiumBadge.classList.remove("hidden")
      return
    }

    if (usageCard) usageCard.classList.remove("usage-card--premium")
    if (premiumBadge) premiumBadge.classList.add("hidden")

    const today = new Date().toLocaleDateString("en-CA")
    let data = local.usageData || { date: today, count: 0 }
    if (data.date !== today) {
      data = { date: today, count: 0 }
    }
    const count = data.count
    const limit = 5

    if (usageCount) {
      usageCount.textContent = `${count} / ${limit}`
    }

    if (usageBar) usageBar.classList.remove("hidden")
    if (usageFill) {
      const percentage = (count / limit) * 100
      usageFill.style.width = `${Math.min(percentage, 100)}%`
      usageFill.classList.remove("warning", "danger")
      if (percentage >= 90) {
        usageFill.classList.add("danger")
      } else if (percentage >= 80) {
        usageFill.classList.add("warning")
      }
    }

    if (usageReset) {
      usageReset.textContent = "Resets at midnight"
    }

    if (upgradeCta) {
      upgradeCta.classList.remove("hidden")
      upgradeCta.href = UPGRADE_URL
      upgradeCta.textContent =
        "Tired of daily limits? Get Lifetime Access ($29) →"
    }
  } catch (error) {
    if (isContextInvalidatedError(error)) extensionContextInvalidated = true
    else console.error("❌ Failed to load usage stats:", error)
  }
}

// ============================================================================
// SETTINGS
// ============================================================================

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(["settings"])
    const settings = result.settings || { autoShow: true }

    const autoShow = document.getElementById("autoShow")
    if (autoShow) {
      autoShow.checked = settings.autoShow !== false
    }
  } catch (error) {
    if (isContextInvalidatedError(error)) extensionContextInvalidated = true
    else console.error("❌ Failed to load settings:", error)
  }
}

async function saveSettings() {
  try {
    const autoShow = document.getElementById("autoShow")
    const settings = {
      autoShow: autoShow ? autoShow.checked : true
    }

    await chrome.storage.local.set({ settings })
    log("✅ Settings saved:", settings)

    // Notify service worker
    chrome.runtime
      .sendMessage({
        type: "SETTINGS_UPDATED",
        settings: settings
      })
      .catch(() => {
        // Service worker may not be active
      })
  } catch (error) {
    console.error("❌ Failed to save settings:", error)
  }
}

// Compose URLs: open compose in same tab for Gmail/Outlook
function getComposeUrlForTab(tab) {
  if (!tab || !tab.url) return "https://mail.google.com/mail/#compose"
  const u = tab.url.toLowerCase()
  if (u.includes("mail.google.com"))
    return "https://mail.google.com/mail/#compose"
  if (u.includes("outlook.live.com"))
    return "https://outlook.live.com/mail/compose/v"
  if (u.includes("outlook.office.com") || u.includes("outlook.office365.com"))
    return "https://outlook.office.com/mail/0/compose"
  return "https://mail.google.com/mail/#compose"
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Auto-show toggle
  const autoShow = document.getElementById("autoShow")
  if (autoShow) {
    autoShow.addEventListener("change", saveSettings)
  }

  // Open Gmail
  const openGmailBtn = document.getElementById("openGmailBtn")
  if (openGmailBtn) {
    openGmailBtn.addEventListener("click", async (e) => {
      e.preventDefault()
      try {
        chrome.tabs.create({ url: "https://mail.google.com/mail/#compose" })
      } catch (_) {
        chrome.tabs.create({ url: "https://mail.google.com/mail/#compose" })
      }
      window.close()
    })
  }

  // Open Outlook
  const openOutlookBtn = document.getElementById("openOutlookBtn")
  if (openOutlookBtn) {
    openOutlookBtn.addEventListener("click", async (e) => {
      e.preventDefault()
      try {
        chrome.tabs.create({ url: "https://outlook.live.com/mail/0/" })
      } catch (_) {
        chrome.tabs.create({ url: "https://outlook.live.com/mail/0/" })
      }
      window.close()
    })
  }

  // Upgrade CTA
  const upgradeCta = document.getElementById("upgradeCta")
  if (upgradeCta) {
    upgradeCta.addEventListener("click", (e) => {
      e.preventDefault()
      chrome.tabs.create({ url: UPGRADE_URL })
      window.close()
    })
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

window.addEventListener("pagehide", () => {
  if (port) {
    port.disconnect()
  }
})

log("✅ Popup script loaded")
