# VeloMail Architecture

## Overview

VeloMail is a Chrome Manifest V3 extension that provides real-time mobile email preview for Gmail and Outlook users.

---

## Core Components

### 1. Content Script (`src/content/content.js`)
- **Purpose**: Runs on Gmail/Outlook pages
- **Responsibilities**:
  - Detects compose windows using MutationObserver
  - Injects iPhone preview overlay (Shadow DOM)
  - Captures email content in real-time
  - Runs 3 preflight checks
  - Calculates mobile score (7 factors)
  - Syncs state to service worker
- **Size**: ~3,200 lines
- **Performance**: <100ms render time

### 2. Service Worker (`src/background/worker-simple.js`)
- **Purpose**: Background process, central state manager
- **Responsibilities**:
  - Stores current email state
  - Enforces usage limits (50 previews/month)
  - Tracks error telemetry
  - Broadcasts updates to all open popups
  - Updates extension badge
- **Size**: ~300 lines

### 3. Popup UI (`src/popup/`)
- **Purpose**: Extension icon dropdown panel
- **Responsibilities**:
  - Displays mobile score (0-100)
  - Shows 7-factor breakdown
  - Lists prioritized improvement tips
  - Shows usage meter
  - Settings toggles
- **Files**: index.html, popup.js, style.css
- **Design**: iOS-inspired, 320px wide

### 4. Shared Libraries (`src/lib/`)
- **mobile-score.js**: Scoring algorithm (766 lines)
- **first-compose-guide.js**: First-time tutorial overlay
- **onboarding.js**: Milestone tracking
- **usage-tracker.js**: Freemium quota system
- **notifications.js**: Badge + notification system
- **performance.js**: Performance monitoring
- **theme.js**: Dark mode support
- **memory-manager.js**: Memory leak prevention
- **milestones.js**: Achievement system
- **reports.js**: Weekly reports (planned)

### 5. Welcome Page (`src/welcome/`)
- **Purpose**: First-time user onboarding
- **Design**: 4-slide carousel
- **Flow**: Problem → Checks → Preview → Get Started

---

## Data Flow

```
USER TYPES IN GMAIL
    ↓
Content Script (MutationObserver fires)
    ↓
captureGmailContent()
    ↓
calculateMobileScore()
    ↓
updatePreview() [Shadow DOM]
    ↓
sendToServiceWorker()
    ↓
Service Worker (stores state)
    ↓
Broadcast to all popups
    ↓
Popup updates in real-time
```

---

## Messaging Architecture

### Content → Service Worker:
- `CHECK_USAGE_LIMIT` - Request quota check
- `TRACK_PREVIEW_USAGE` - Increment counter
- `EMAIL_CONTENT_UPDATED` - Send full email state
- `ERROR_LOGGED` - Report error

### Service Worker → Popup:
- `INITIAL_STATE` - Send current state on connection
- `EMAIL_CONTENT_UPDATED` - Broadcast content changes
- `COMPOSE_OPENED` - Notify compose started
- `COMPOSE_CLOSED` - Notify compose ended

---

## Storage Schema

```javascript
chrome.storage.local = {
  monthlyUsage: {
    '2026-02': { previews: 23, limit: 50, firstUse: Date }
  },
  settings: {
    autoShow: true,
    showNotifications: true
  },
  onboardingState: {
    welcomeCompleted: true,
    firstComposeGuideShown: true,
    guideSkipped: false
  },
  milestones: [
    { id: 'first_install', timestamp: Date },
    { id: 'first_preview', timestamp: Date }
  ]
}
```

---

## Performance Targets

| Operation | Target | Threshold |
|-----------|--------|-----------|
| Preview Render | <50ms | 100ms |
| Score Calculation | <5ms | 50ms |
| Service Worker Sync | <100ms | 200ms |
| DOM Query | <5ms | 10ms |

---

## Security

- **Shadow DOM**: Isolates styles from Gmail
- **Content Security Policy**: script-src 'self'
- **HTML Sanitization**: Strips scripts, event handlers
- **No remote code**: All assets bundled
- **Safe DOM wrappers**: Never crash on invalid selectors

---

## Browser Support

- Chrome (primary)
- Edge (Chromium)
- Brave (Chromium)

---

## Key Design Patterns

1. **Shadow DOM Isolation** - Prevents Gmail CSS conflicts
2. **Debounced Updates** - RAF + 300ms throttle
3. **Long-lived Ports** - Real-time popup sync
4. **Safe Wrappers** - All DOM ops error-handled
5. **State Validation** - Validate before send
6. **Performance Tracking** - Auto-detect degradation

---

See `DEVELOPER-GUIDE.md` for implementation details.
