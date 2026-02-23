/**
 * VeloMail First Compose Guide
 * Interactive overlay to guide users through their first email composition
 */

// Prevent duplicate loading
if (window.VeloMailFirstComposeGuide) {
  console.log('🎯 First Compose Guide already loaded, skipping...');
  // Script already loaded, don't re-execute
} else {
  console.log('🎯 First Compose Guide module loading...');

(function() {
  'use strict';

// ============================================================================
// GUIDE STATE
// ============================================================================

let guideOverlay = null;
let guideStep = 0;
let isGuideActive = false;

// ============================================================================
// GUIDE CREATION
// ============================================================================

/**
 * Show the first compose guide overlay
 * Highlights the compose button and provides contextual help
 */
function showFirstComposeGuide() {
  if (isGuideActive || guideOverlay) {
    console.log('ℹ️ Guide already active');
    return;
  }

  console.log('🎯 Showing first compose guide');
  isGuideActive = true;

  // Create overlay container
  guideOverlay = document.createElement('div');
  guideOverlay.id = 'velomail-first-compose-guide';
  guideOverlay.innerHTML = `
    <style>
      #velomail-first-compose-guide {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 10000000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .guide-card {
        background: rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 0.5px solid rgba(0, 0, 0, 0.06);
        border-radius: 20px;
        padding: 48px;
        max-width: 480px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        text-align: center;
        animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .guide-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 24px;
        background: #5db7de;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        animation: float 3s ease-in-out infinite;
      }

      @keyframes float {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }

      .guide-card h2 {
        font-size: 28px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 16px;
        letter-spacing: -0.5px;
      }

      .guide-card p {
        font-size: 17px;
        color: #6b7280;
        line-height: 1.6;
        margin-bottom: 32px;
        letter-spacing: -0.3px;
      }

      .guide-steps {
        text-align: left;
        background: #f9f9f9;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 32px;
      }

      .guide-step-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 16px;
      }

      .guide-step-item:last-child {
        margin-bottom: 0;
      }

      .step-number {
        width: 32px;
        height: 32px;
        background: #007aff;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        flex-shrink: 0;
      }

      .step-content {
        flex: 1;
      }

      .step-title {
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 4px;
        font-size: 15px;
      }

      .step-description {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.4;
      }

      .guide-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .guide-btn {
        padding: 16px 32px;
        border-radius: 12px;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.3s ease;
        letter-spacing: -0.4px;
      }

      .guide-btn-primary {
        background: #007aff;
        color: white;
        box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
      }

      .guide-btn-primary:hover {
        background: #0051d5;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 122, 255, 0.4);
      }

      .guide-btn-secondary {
        background: transparent;
        color: #6b7280;
      }

      .guide-btn-secondary:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .compose-arrow {
        position: absolute;
        top: 50%;
        left: -120px;
        transform: translateY(-50%);
        animation: bounce 2s infinite;
      }

      @keyframes bounce {
        0%, 100% {
          transform: translateY(-50%) translateX(0);
        }
        50% {
          transform: translateY(-50%) translateX(-10px);
        }
      }

      .compose-arrow svg {
        filter: drop-shadow(0 4px 12px rgba(0, 122, 255, 0.4));
      }
    </style>

    <div class="guide-card">
      <div class="guide-icon">📧</div>
      <h2>Let's compose your first email!</h2>
      <p>We'll guide you through using VeloMail to create mobile-optimized emails.</p>
      
      <div class="guide-steps">
        <div class="guide-step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <div class="step-title">Click "Compose"</div>
            <div class="step-description">Start a new email in Gmail</div>
          </div>
        </div>
        <div class="guide-step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <div class="step-title">Watch the preview appear</div>
            <div class="step-description">VeloMail's iPhone preview shows on the right</div>
          </div>
        </div>
        <div class="guide-step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <div class="step-title">Type and watch it sync</div>
            <div class="step-description">See your email update in real-time</div>
          </div>
        </div>
        <div class="guide-step-item">
          <div class="step-number">4</div>
          <div class="step-content">
            <div class="step-title">See your tips</div>
            <div class="step-description">Pre-flight checks show mobile readiness</div>
          </div>
        </div>
      </div>

      <div class="guide-actions">
        <button class="guide-btn guide-btn-secondary" id="guideSkipBtn">Skip Tutorial</button>
        <button class="guide-btn guide-btn-primary" id="guideStartBtn">Got It!</button>
      </div>
    </div>
  `;

  document.body.appendChild(guideOverlay);

  // Add event listeners
  document.getElementById('guideStartBtn').addEventListener('click', closeFirstComposeGuide);
  document.getElementById('guideSkipBtn').addEventListener('click', () => {
    closeFirstComposeGuide();
    markGuideSkipped();
  });

  // Mark guide as shown
  markGuideShown();

  console.log('✅ First compose guide displayed');
}

/**
 * Close the first compose guide
 */
function closeFirstComposeGuide() {
  if (!guideOverlay) return;

  guideOverlay.style.animation = 'fadeOut 0.2s ease-out';
  
  setTimeout(() => {
    if (guideOverlay && guideOverlay.parentNode) {
      guideOverlay.parentNode.removeChild(guideOverlay);
    }
    guideOverlay = null;
    isGuideActive = false;
    console.log('✅ First compose guide closed');
  }, 200);
}

/**
 * Show celebration modal when first preview appears
 * @param {Object} scoreData - Email state with suggestions (tips)
 */
function showFirstPreviewCelebration(scoreData) {
  console.log('🎉 Showing first preview celebration');

  const celebrationOverlay = document.createElement('div');
  celebrationOverlay.id = 'velomail-first-preview-celebration';
  celebrationOverlay.innerHTML = `
    <style>
      #velomail-first-preview-celebration {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 10000000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      }

      .celebration-card {
        background: white;
        border-radius: 20px;
        padding: 48px;
        max-width: 440px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .celebration-emoji {
        font-size: 80px;
        margin-bottom: 24px;
        animation: bounce 1s ease-in-out;
      }

      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-20px);
        }
      }

      .celebration-card h2 {
        font-size: 32px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 16px;
        letter-spacing: -0.6px;
      }

      .celebration-card p {
        font-size: 17px;
        color: #6b7280;
        line-height: 1.6;
        margin-bottom: 32px;
      }

      .tips-explanation {
        background: #f9f9f9;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
        text-align: left;
      }

      .tips-explanation h3 {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 12px;
      }

      .tips-explanation ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .tips-explanation li {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 8px;
        padding-left: 20px;
        position: relative;
      }

      .tips-explanation li:before {
        content: '✓';
        position: absolute;
        left: 0;
        color: #34c759;
        font-weight: 700;
      }

      .celebration-btn {
        width: 100%;
        padding: 16px;
        background: #007aff;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .celebration-btn:hover {
        background: #0051d5;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 122, 255, 0.4);
      }
    </style>

    <div class="celebration-card">
      <div class="celebration-emoji">🎉</div>
      <h2>Great job!</h2>
      <p>Your first mobile preview is ready.</p>

      <div class="tips-explanation">
        <h3>What you can do now</h3>
        <ul>
          <li>Pre-flight checks show subject hook, CTA, and tap-friendly links</li>
          <li>Use the 3 dots for quick mobile-readiness feedback</li>
          <li>Click the extension icon for detailed tips</li>
        </ul>
      </div>

      <button class="celebration-btn" id="celebrationContinueBtn">Continue Writing</button>
    </div>
  `;

  document.body.appendChild(celebrationOverlay);

  document.getElementById('celebrationContinueBtn').addEventListener('click', () => {
    celebrationOverlay.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => {
      if (celebrationOverlay.parentNode) {
        celebrationOverlay.parentNode.removeChild(celebrationOverlay);
      }
    }, 200);
  });

  // Track milestone
  chrome.runtime.sendMessage({
    type: 'MILESTONE_ACHIEVED',
    milestoneId: 'first_preview'
  });
}

/**
 * Show celebration for applying tips well
 */
function showGoodScoreCelebration() {
  console.log('⭐ Showing good tips celebration');

  const celebrationOverlay = document.createElement('div');
  celebrationOverlay.id = 'velomail-good-score-celebration';
  celebrationOverlay.innerHTML = `
    <style>
      #velomail-good-score-celebration {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 10000000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      }

      .good-score-card {
        background: white;
        border-radius: 20px;
        padding: 48px;
        max-width: 420px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .good-score-emoji {
        font-size: 80px;
        margin-bottom: 24px;
        animation: rotate 1s ease-in-out;
      }

      @keyframes rotate {
        from {
          transform: rotate(-20deg) scale(0.8);
        }
        to {
          transform: rotate(0) scale(1);
        }
      }

      .good-score-card h2 {
        font-size: 32px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 16px;
      }

      .good-score-card p {
        font-size: 17px;
        color: #6b7280;
        line-height: 1.6;
        margin-bottom: 32px;
      }

      .good-score-btn {
        width: 100%;
        padding: 16px;
        background: #34c759;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .good-score-btn:hover {
        background: #2ab04b;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(52, 199, 89, 0.4);
      }
    </style>

    <div class="good-score-card">
      <div class="good-score-emoji">⭐</div>
      <h2>Excellent work!</h2>
      <p>Your email is in great shape for mobile readers. Keep using the tips to optimize.</p>
      <button class="good-score-btn" id="goodScoreContinueBtn">Awesome!</button>
    </div>
  `;

  document.body.appendChild(celebrationOverlay);

  document.getElementById('goodScoreContinueBtn').addEventListener('click', () => {
    celebrationOverlay.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => {
      if (celebrationOverlay.parentNode) {
        celebrationOverlay.parentNode.removeChild(celebrationOverlay);
      }
    }, 200);
  });

  // Track milestone
  chrome.runtime.sendMessage({
    type: 'MILESTONE_ACHIEVED',
    milestoneId: 'first_good_score'
  });
}

/**
 * Mark guide as shown in storage
 */
async function markGuideShown() {
  try {
    const result = await chrome.storage.local.get('onboardingState');
    const state = result.onboardingState || {};
    state.firstComposeGuideShown = true;
    await chrome.storage.local.set({ onboardingState: state });
  } catch (error) {
    console.error('❌ Failed to mark guide shown:', error);
  }
}

/**
 * Mark guide as skipped
 */
async function markGuideSkipped() {
  try {
    const result = await chrome.storage.local.get('onboardingState');
    const state = result.onboardingState || {};
    state.guideSkipped = true;
    await chrome.storage.local.set({ onboardingState: state });
    console.log('⏭️ Guide skipped');
  } catch (error) {
    console.error('❌ Failed to mark guide skipped:', error);
  }
}

// Export functions
if (typeof window !== 'undefined') {
  window.VeloMailFirstComposeGuide = {
    showFirstComposeGuide,
    closeFirstComposeGuide,
    showFirstPreviewCelebration,
    showGoodScoreCelebration
  };
}

})(); // End of IIFE

} // End of duplicate load check

console.log('✅ First Compose Guide ready');
