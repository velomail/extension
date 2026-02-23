/**
 * VeloMail Theme Management
 * Centralized theme system with system preference detection
 * 
 * Features:
 * - Light/Dark mode toggle
 * - System theme detection (prefers-color-scheme)
 * - Auto-sync across extension components
 * - Smooth transitions
 * - Persistent settings
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

const STORAGE_KEY = 'theme_preference';

// ============================================================================
// SYSTEM THEME DETECTION
// ============================================================================

/**
 * Check if system prefers dark mode
 * @returns {boolean} True if system prefers dark mode
 */
export function getSystemTheme() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Listen for system theme changes
 * @param {Function} callback - Called when system theme changes
 * @returns {Function} Cleanup function to remove listener
 */
export function watchSystemTheme(callback) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e) => {
    callback(e.matches);
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
  
  // Fallback for older browsers
  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
}

// ============================================================================
// THEME APPLICATION
// ============================================================================

/**
 * Apply theme to document
 * @param {boolean} isDark - True for dark mode, false for light mode
 * @param {boolean} smooth - Enable smooth transition (default: true)
 */
export function applyTheme(isDark, smooth = true) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Add transition class for smooth animation
  if (smooth) {
    root.classList.add('theme-transitioning');
  }

  // Apply theme
  if (isDark) {
    root.classList.add('dark-mode');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark-mode');
    root.setAttribute('data-theme', 'light');
  }

  // Remove transition class after animation
  if (smooth) {
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
  }

  console.log(`🎨 Theme applied: ${isDark ? 'dark' : 'light'}`);
}

/**
 * Get current theme from document
 * @returns {boolean} True if dark mode is active
 */
export function getCurrentTheme() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark-mode');
}

// ============================================================================
// THEME PERSISTENCE
// ============================================================================

/**
 * Save theme preference to storage
 * @param {boolean} isDark - True for dark mode, false for light mode
 */
export async function saveThemePreference(isDark) {
  try {
    await chrome.storage.local.set({ 
      [STORAGE_KEY]: isDark,
      settings: {
        ...(await chrome.storage.local.get('settings')).settings || {},
        darkMode: isDark
      }
    });
    console.log('✅ Theme preference saved:', isDark ? 'dark' : 'light');
  } catch (error) {
    console.error('❌ Error saving theme preference:', error);
  }
}

/**
 * Load theme preference from storage
 * @returns {Promise<boolean|null>} Theme preference or null if not set
 */
export async function loadThemePreference() {
  try {
    const { [STORAGE_KEY]: preference, settings } = await chrome.storage.local.get([STORAGE_KEY, 'settings']);
    
    // Check both storage keys for backwards compatibility
    const isDark = preference !== undefined ? preference : settings?.darkMode;
    
    console.log('✅ Theme preference loaded:', isDark !== undefined ? (isDark ? 'dark' : 'light') : 'not set');
    return isDark !== undefined ? isDark : null;
  } catch (error) {
    console.error('❌ Error loading theme preference:', error);
    return null;
  }
}

// ============================================================================
// THEME INITIALIZATION
// ============================================================================

/**
 * Initialize theme system
 * - Loads saved preference
 * - Falls back to system preference if not set
 * - Applies theme immediately
 * - Sets up system theme watcher
 * @param {Object} options - Configuration options
 * @param {boolean} options.watchSystem - Watch system theme changes (default: true)
 * @param {boolean} options.smooth - Enable smooth transitions (default: true)
 * @returns {Promise<Function>} Cleanup function
 */
export async function initializeTheme({ watchSystem = true, smooth = true } = {}) {
  console.log('🎨 Initializing theme system...');

  // Load saved preference
  let isDark = await loadThemePreference();

  // If no preference saved, use system preference
  if (isDark === null) {
    isDark = getSystemTheme();
    console.log('💡 No saved preference, using system theme:', isDark ? 'dark' : 'light');
    
    // Save the detected system preference
    await saveThemePreference(isDark);
  }

  // Apply theme immediately (no transition on initial load)
  applyTheme(isDark, false);

  // Watch for system theme changes
  let cleanup = () => {};
  if (watchSystem) {
    cleanup = watchSystemTheme(async (systemPrefersDark) => {
      console.log('🔄 System theme changed:', systemPrefersDark ? 'dark' : 'light');
      
      // Load current user preference
      const savedPreference = await loadThemePreference();
      
      // Only auto-switch if user hasn't manually set a preference
      // (This is a simple implementation - could be enhanced with a "follow system" toggle)
      if (savedPreference === null) {
        await saveThemePreference(systemPrefersDark);
        applyTheme(systemPrefersDark, smooth);
      }
    });
  }

  console.log('✅ Theme system initialized');
  return cleanup;
}

/**
 * Toggle theme between light and dark
 * @param {boolean} smooth - Enable smooth transition (default: true)
 * @returns {Promise<boolean>} New theme state (true = dark)
 */
export async function toggleTheme(smooth = true) {
  const currentIsDark = getCurrentTheme();
  const newIsDark = !currentIsDark;
  
  await saveThemePreference(newIsDark);
  applyTheme(newIsDark, smooth);
  
  // Broadcast theme change to other extension components
  try {
    chrome.runtime.sendMessage({
      type: 'THEME_CHANGED',
      isDark: newIsDark
    }).catch(() => {
      // Service worker might not be ready, that's ok
    });
  } catch (error) {
    // Ignore errors if runtime is not available
  }

  return newIsDark;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  THEMES,
  getSystemTheme,
  watchSystemTheme,
  applyTheme,
  getCurrentTheme,
  saveThemePreference,
  loadThemePreference,
  initializeTheme,
  toggleTheme
};
