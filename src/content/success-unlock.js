/**
 * VeloMail — Post-purchase unlock (runs only on landing/success.html)
 * Reads session_id from URL, asks background to verify with API and set isPaid.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  const statusEl = document.getElementById('unlock-status');
  function setStatus(text, className) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = className || '';
    }
  }

  if (!sessionId || !sessionId.startsWith('cs_')) {
    setStatus('No valid purchase session found. If you just paid, return from the link in your receipt or refresh this page with the link Stripe sent you.', 'error');
    return;
  }

  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    setStatus('Open this page in Chrome with the VeloMail extension installed to unlock automatically.', '');
    return;
  }

  chrome.runtime.sendMessage(
    { type: 'VERIFY_AND_UNLOCK', sessionId },
    (response) => {
      if (chrome.runtime.lastError) {
        setStatus('Extension not found. Install VeloMail from the Chrome Web Store, then visit this page again after purchasing.', 'error');
        return;
      }
      if (response && response.success) {
        setStatus('✓ Unlocked! Your extension now has Lifetime access. You can close this tab.', 'unlocked');
      } else if (response && response.error) {
        setStatus(response.error, 'error');
      } else {
        setStatus('Verification did not complete. You can try refreshing this page, or contact support with your receipt.', 'error');
      }
    }
  );
})();
