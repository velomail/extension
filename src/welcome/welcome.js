/**
 * VeloMail Welcome Page - Interactive Onboarding
 * Desktop-first onboarding for the Chrome extension
 */

const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log(...args); };

// Import theme system
import { initializeTheme } from '../lib/theme.js';

let currentSlide = 1;
const totalSlides = 4;
let themeCleanup = null;

// DOM Elements
const nextBtn = document.getElementById('nextBtn');
const doneBtn = document.getElementById('doneBtn');
const skipBtn = document.getElementById('skipBtn');
const stepCurrent = document.getElementById('stepCurrent');
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');

log('✨ Welcome page loaded');

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

  // Help link — opens landing page in a new tab
  const helpLink = document.getElementById('helpLink');
  if (helpLink && typeof chrome !== 'undefined' && chrome.tabs) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://velomail.vercel.app/landing/' });
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
    doneBtn.style.display = 'inline-flex';
  } else {
    nextBtn.style.display = 'inline-flex';
    doneBtn.style.display = 'none';
  }

  // Update step indicator
  if (stepCurrent) {
    stepCurrent.textContent = slideNumber;
  }

  log(`Showing slide ${slideNumber}`);
}

// Finish onboarding
async function finishOnboarding() {
  log('✅ Onboarding completed');

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

    log('✨ Onboarding milestone tracked');

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
  log('📧 Opening Gmail...');
  
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

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    finishOnboarding();
    return;
  }
  if (e.key === 'ArrowRight' && currentSlide < totalSlides) {
    showSlide(currentSlide + 1);
  } else if (e.key === 'ArrowLeft' && currentSlide > 1) {
    showSlide(currentSlide - 1);
  } else if (e.key === 'Enter' && currentSlide === totalSlides) {
    finishOnboarding();
  }
});

log('✅ Welcome page ready - Use arrow keys or click buttons');

// Cleanup theme watcher on page unload (pagehide is the non-deprecated replacement)
window.addEventListener('pagehide', () => {
  if (themeCleanup) {
    themeCleanup();
  }
});
