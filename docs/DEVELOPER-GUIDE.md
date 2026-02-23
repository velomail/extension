# VeloMail Developer Guide
## Quick Reference for Production-Ready Code

---

## 🎯 Core Principles

1. **Never crash** - Always handle errors gracefully
2. **Fail safe** - Return sensible defaults
3. **Be observable** - Log errors, track performance
4. **Validate everything** - Trust nothing from external sources

---

## 📝 Logging Best Practices

### Use the Right Function

```javascript
// DEBUG-ONLY (hidden in production)
log('Creating preview...');
log('State updated:', state);

// ALWAYS SHOWN
logError('DOM_ERROR', 'Element not found', { selector: '.test' });
logWarn('Approaching usage limit:', remaining);

// NEVER USE (except for critical system info)
console.log() // ❌ Use log() instead
console.error() // ❌ Use logError() instead
console.warn() // ❌ Use logWarn() instead
```

### Error Code Naming Convention

```javascript
// Pattern: CATEGORY_ACTION_RESULT
'DOM_QUERY_ERROR'           // ✅ Good
'PREVIEW_CREATION_FAILED'   // ✅ Good
'USAGE_CHECK_TIMEOUT'       // ✅ Good

'error1'                    // ❌ Bad
'failed'                    // ❌ Bad
'oops'                      // ❌ Bad
```

---

## 🛡️ Safe DOM Operations

### Always Use Safe Wrappers

```javascript
// ❌ NEVER DO THIS
const element = document.querySelector('.risky-selector');
element.textContent = 'test'; // Crashes if element is null

// ✅ ALWAYS DO THIS
const element = safeQuerySelector('.risky-selector');
if (element) {
  element.textContent = 'test';
}

// ✅ OR USE SAFE CREATE
const newEl = safeCreateElement('div', {
  className: 'preview',
  textContent: 'Hello'
});
if (newEl) {
  document.body.appendChild(newEl);
}
```

### Safe Wrapper Functions

| Function | Returns on Error | Use Case |
|----------|------------------|----------|
| `safeQuerySelector()` | `null` | Single element |
| `safeQuerySelectorAll()` | `[]` (empty array) | Multiple elements |
| `safeCreateElement()` | `null` | New elements |

---

## 📊 Performance Tracking

### Manual Tracking

```javascript
const startTime = performance.now();

// ... do work ...

trackPerformance('operationName', performance.now() - startTime);
```

### Using Wrapper (Async Functions)

```javascript
// Wrap any async function
const wrappedFn = measurePerformance(myAsyncFunction, 'functionName');

// Call it normally
const result = await wrappedFn(arg1, arg2);

// Performance automatically tracked!
```

### Performance Thresholds

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| `previewRender` | 100ms | Preview update |
| `scoreCalculation` | 50ms | Score computation |
| `syncLatency` | 200ms | Service worker sync |
| `domQuery` | 10ms | DOM queries |

---

## ✅ State Validation

### Before Sending to Service Worker

```javascript
// Create state
const emailState = {
  isActive: true,
  html: htmlContent,
  text: textContent,
  subject: subjectValue,
  // ...
};

// Validate before sending
if (!validateEmailState(emailState)) {
  // Validation failed, use safe default
  emailState = getDefaultState();
}

// Now safe to send
chrome.runtime.sendMessage({
  type: 'EMAIL_CONTENT_UPDATED',
  state: emailState
});
```

---

## 🎯 Error Boundaries

### Wrap Critical Operations

```javascript
async function criticalOperation() {
  const startTime = performance.now();
  
  try {
    // Your code here
    const result = await riskyOperation();
    
    // Track success
    trackPerformance('operationName', performance.now() - startTime);
    
    return result;
  } catch (error) {
    // Log the error
    logError('OPERATION_FAILED', error.message, {
      duration: performance.now() - startTime,
      context: 'any helpful context'
    });
    
    // Return safe fallback
    return null;
  }
}
```

---

## 💾 Usage Tracking Integration

### Checking Limits

```javascript
// Before showing preview
const limitCheck = await checkLimit();

if (!limitCheck.allowed) {
  showUpgradeModal(limitCheck);
  return;
}

if (limitCheck.isApproachingLimit) {
  logWarn(`${limitCheck.remaining} previews remaining`);
}

// Safe to show preview
```

### Tracking Usage

```javascript
// After successfully showing preview
await trackPreview();
```

---

## 🔄 Service Worker Messaging

### Safe Message Sending

```javascript
// Always handle errors
try {
  const response = await chrome.runtime.sendMessage({
    type: 'YOUR_MESSAGE_TYPE',
    data: yourData
  });
  
  if (!response) {
    logError('NO_RESPONSE', 'Service worker did not respond');
    return defaultValue;
  }
  
  return response;
} catch (error) {
  logError('MESSAGE_FAILED', error.message);
  // Return safe fallback
  return defaultValue;
}
```

### Message Types Reference

| Type | Direction | Purpose |
|------|-----------|---------|
| `CHECK_USAGE_LIMIT` | Content → Worker | Check quota |
| `TRACK_PREVIEW_USAGE` | Content → Worker | Increment count |
| `EMAIL_CONTENT_UPDATED` | Content → Worker | Send email state |
| `ERROR_LOGGED` | Content → Worker | Report error |
| `INITIAL_STATE` | Worker → Popup | Send current state |

---

## 🧪 Testing Your Code

### Manual Testing

```javascript
// 1. Test with DEBUG mode on
const DEBUG = true;

// 2. Verify error handling
throw new Error('Test error'); // Should be caught and logged

// 3. Check performance
console.log(performanceMetrics);

// 4. View error log
chrome.storage.local.get('errorStats').then(console.log);

// 5. Test usage limits
chrome.storage.local.set({
  monthlyUsage: {
    '2026-02': { previews: 50, limit: 50 }
  }
}).then(() => location.reload());
```

---

## 🚨 Common Pitfalls

### ❌ DON'T Do This

```javascript
// No error handling
const element = document.querySelector('.test');
element.textContent = 'fail';

// No validation
await chrome.runtime.sendMessage({ data });

// Debug logs in production
console.log('This will spam users!');

// Ignoring performance
function slowOperation() {
  // No tracking
}
```

### ✅ DO This Instead

```javascript
// With error handling
const element = safeQuerySelector('.test');
if (element) {
  element.textContent = 'success';
}

// With validation
try {
  const response = await chrome.runtime.sendMessage({ data });
  if (!response) throw new Error('No response');
} catch (error) {
  logError('MESSAGE_FAILED', error.message);
}

// Production-safe logging
log('This only shows in debug mode');
logError('ERROR_CODE', 'This always shows');

// With performance tracking
async function slowOperation() {
  const start = performance.now();
  // ... work ...
  trackPerformance('slowOp', performance.now() - start);
}
```

---

## 🎨 Code Style

### Function Naming

```javascript
// Safe operations (return null/default on error)
safeQuerySelector()
safeCreateElement()
getDefaultState()

// Validation (return boolean)
validateEmailState()
validateResponse()

// Actions (may throw, wrap in try-catch)
createPreview()
updatePreview()
sendToServiceWorker()
```

### Error Codes

Use SCREAMING_SNAKE_CASE:
- `DOM_QUERY_ERROR`
- `PREVIEW_CREATION_FAILED`
- `STATE_VALIDATION_ERROR`
- `SERVICE_WORKER_TIMEOUT`

---

## 📚 Resources

### Key Files

- **Production logging**: `src/content/content.js` (lines 51-115)
- **Safe DOM ops**: `src/content/content.js` (lines 201-260)
- **Performance**: `src/content/content.js` (lines 116-200)
- **State validation**: `src/content/content.js` (lines 261-320)
- **Usage tracking**: `src/background/worker-simple.js` (lines 100-180)

### Documentation

- Full implementation details: `PRODUCTION-READY-IMPROVEMENTS.md`
- Testing guide: `QUICK-TEST-GUIDE.md`
- Feature audit: `FEATURE-AUDIT-CROSSREFERENCE.md`

---

## 🔧 Configuration

### Development

```javascript
// src/content/content.js (line 8)
const DEBUG = true;
const PERFORMANCE_MONITORING = true;
```

### Production

```javascript
const DEBUG = false;
const PERFORMANCE_MONITORING = true;
```

---

## ✅ Checklist Before Committing

- [ ] All `console.log` replaced with `log()`
- [ ] All errors use `logError(code, message, context)`
- [ ] DOM operations use safe wrappers
- [ ] Critical functions have try-catch
- [ ] Performance tracked for slow operations
- [ ] State validated before sending
- [ ] Service worker messages handle errors
- [ ] No linter errors: `npm run lint`

---

**Remember**: Production-ready code doesn't crash. It degrades gracefully, logs errors, and always returns sensible values.
