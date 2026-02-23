/**
 * VeloMail Welcome Page - Interactive Onboarding
 * Apple iOS-inspired onboarding for mobile email optimizer
 */

// Import theme system
import { initializeTheme } from '../lib/theme.js';

let currentSlide = 1;
const totalSlides = 4;
let themeCleanup = null;

// DOM Elements
const nextBtn = document.getElementById('nextBtn');
const doneBtn = document.getElementById('doneBtn');
const skipBtn = document.getElementById('skipBtn');
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const quickStartBackdrop = document.getElementById('quickStartBackdrop');
const quickStartModal = document.getElementById('quickStartModal');
const quickStartBody = document.getElementById('quickStartBody');
const quickStartClose = document.getElementById('quickStartClose');

console.log('✨ Welcome page loaded');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize theme system (with system detection)
  themeCleanup = await initializeTheme({ 
    watchSystem: true, 
    smooth: false // No transition on initial load
  });
  
  showSlide(1);
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  nextBtn.addEventListener('click', () => {
    if (currentSlide < totalSlides) {
      showSlide(currentSlide + 1);
    }
  });

  doneBtn.addEventListener('click', finishOnboarding);
  skipBtn.addEventListener('click', finishOnboarding);

  // Dot navigation
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index + 1);
    });
  });

  // Open Gmail button
  const openGmailBtn = document.getElementById('openGmailBtn');
  if (openGmailBtn) {
    openGmailBtn.addEventListener('click', openGmail);
  }

  // Help link — opens GitHub landing page in a new tab
  const helpLink = document.getElementById('helpLink');
  if (helpLink && typeof chrome !== 'undefined' && chrome.tabs) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://velomail.github.io/extension' });
    });
  }

  // Quick start modal close
  if (quickStartClose) {
    quickStartClose.addEventListener('click', closeQuickStartModal);
  }
  if (quickStartBackdrop) {
    quickStartBackdrop.addEventListener('click', (e) => {
      if (e.target === quickStartBackdrop) closeQuickStartModal();
    });
  }
}

// Show specific slide
function showSlide(slideNumber) {
  currentSlide = slideNumber;

  // Update slides
  slides.forEach((slide, index) => {
    if (index + 1 === slideNumber) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  // Update dots
  dots.forEach((dot, index) => {
    if (index + 1 === slideNumber) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Update buttons
  if (slideNumber === totalSlides) {
    nextBtn.style.display = 'none';
    doneBtn.style.display = 'block';
  } else {
    nextBtn.style.display = 'block';
    doneBtn.style.display = 'none';
  }

  console.log(`Showing slide ${slideNumber}`);
}

// Finish onboarding
async function finishOnboarding() {
  console.log('✅ Onboarding completed');

  // Save completion status
  try {
    await chrome.storage.local.set({ 
      onboardingCompleted: true,
      completedDate: new Date().toISOString(),
      firstTimeUser: false,
      onboardingState: {
        welcomeCompleted: true,
        firstComposeGuideShown: false,
        firstScoreExplained: false,
        tipsShown: [],
        activeSince: new Date().toISOString(),
        totalPoints: 20 // Points for completing onboarding
      }
    });

    // Track milestone
    const milestones = await chrome.storage.local.get('milestones');
    const currentMilestones = milestones.milestones || [];
    currentMilestones.push({
      id: 'onboarding_completed',
      name: 'Completed Welcome Tour',
      achievedAt: new Date().toISOString(),
      points: 20
    });
    await chrome.storage.local.set({ milestones: currentMilestones });

    console.log('✨ Onboarding milestone tracked');

    // Close welcome page
    window.close();
    
    // Fallback: redirect if window doesn't close
    setTimeout(() => {
      window.location.href = 'chrome://extensions/';
    }, 100);

  } catch (error) {
    console.error('Error completing onboarding:', error);
    // Close anyway
    window.close();
  }
}

// Open Gmail in new tab
async function openGmail() {
  console.log('📧 Opening Gmail...');
  
  // Complete onboarding first
  await chrome.storage.local.set({ 
    onboardingCompleted: true,
    completedDate: new Date().toISOString(),
    firstTimeUser: false,
    onboardingState: {
      welcomeCompleted: true,
      firstComposeGuideShown: false,
      firstScoreExplained: false,
      tipsShown: [],
      activeSince: new Date().toISOString(),
      totalPoints: 20
    }
  });

  // Open Gmail
  chrome.tabs.create({ url: 'https://mail.google.com' });
  
  // Close welcome page
  window.close();
}

function isQuickStartModalOpen() {
  return quickStartBackdrop && !quickStartBackdrop.classList.contains('modal-hidden');
}

function closeQuickStartModal() {
  if (!quickStartBackdrop || !quickStartModal) return;
  quickStartBackdrop.classList.add('modal-hidden');
  quickStartBackdrop.setAttribute('aria-hidden', 'true');
  quickStartModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function showQuickStartGuide() {
  if (!quickStartBackdrop || !quickStartModal || !quickStartBody) return;

  quickStartBody.innerHTML = `
    <h3>1. Open Gmail</h3>
    <p>Click "Open Gmail" or go to mail.google.com</p>

    <h3>2. Compose an email</h3>
    <p>Click the "Compose" button to start writing.</p>

    <h3>3. See the preview</h3>
    <p>VeloMail's phone preview appears beside your compose window. It shows how your email looks on mobile and updates in real time as you type.</p>

    <h3>4. See your tips</h3>
    <p>Pre-flight checks show subject hook, CTA above fold, and tap-friendly links. Click the extension icon for detailed tips.</p>

    <h3>5. Optimize your email</h3>
    <ul>
      <li>Keep subject lines under 40 characters</li>
      <li>Write 50–200 words (mobile-friendly length)</li>
      <li>Include a clear call-to-action</li>
      <li>Use short paragraphs</li>
    </ul>

    <h3>Tips</h3>
    <ul>
      <li>Collapse the preview to save screen space</li>
      <li>Enable dark mode in settings</li>
      <li>View tips by clicking the extension icon</li>
      <li>50 free previews per month</li>
    </ul>
  `;

  quickStartBackdrop.classList.remove('modal-hidden');
  quickStartBackdrop.setAttribute('aria-hidden', 'false');
  quickStartModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  quickStartClose?.focus();
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isQuickStartModalOpen()) {
      closeQuickStartModal();
      return;
    }
    finishOnboarding();
    return;
  }
  if (isQuickStartModalOpen()) return;
  if (e.key === 'ArrowRight' && currentSlide < totalSlides) {
    showSlide(currentSlide + 1);
  } else if (e.key === 'ArrowLeft' && currentSlide > 1) {
    showSlide(currentSlide - 1);
  } else if (e.key === 'Enter' && currentSlide === totalSlides) {
    finishOnboarding();
  }
});

console.log('✅ Welcome page ready - Use arrow keys or click buttons');

// Cleanup theme watcher on page unload
window.addEventListener('beforeunload', () => {
  if (themeCleanup) {
    themeCleanup();
  }
});
