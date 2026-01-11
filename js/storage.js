/**
 * ==========================================================================
 * LOCAL STORAGE MANAGER
 * Handles local storage for settings, streak tracking, and learned words
 * ==========================================================================
 */

const StorageManager = {
  // Storage Keys
  KEYS: {
    API_KEY: 'vocab_api_key',
    BIN_ID: 'vocab_bin_id',
    ADMIN_PASSWORD: 'vocab_admin_password',
    STREAK_DATA: 'vocab_streak_data',
    LEARNED_WORDS: 'vocab_learned_words',
    LAST_VISIT: 'vocab_last_visit',
    LOCAL_WORDS: 'vocab_local_words', // Fallback when offline
  },

  // --------------------------------------------------------------------------
  // API CREDENTIALS
  // --------------------------------------------------------------------------
  
  /**
   * Save API credentials
   * @param {string} apiKey - JSONBin API key
   * @param {string} binId - JSONBin Bin ID
   */
  saveApiCredentials(apiKey, binId) {
    try {
      localStorage.setItem(this.KEYS.API_KEY, apiKey);
      localStorage.setItem(this.KEYS.BIN_ID, binId);
      return true;
    } catch (error) {
      console.error('Failed to save API credentials:', error);
      return false;
    }
  },

  /**
   * Get API credentials
   * @returns {Object} - { apiKey, binId }
   */
  getApiCredentials() {
    return {
      apiKey: localStorage.getItem(this.KEYS.API_KEY) || '',
      binId: localStorage.getItem(this.KEYS.BIN_ID) || '',
    };
  },

  /**
   * Check if API credentials are configured
   * @returns {boolean}
   */
  hasApiCredentials() {
    const { apiKey, binId } = this.getApiCredentials();
    return !!(apiKey && binId);
  },

  // --------------------------------------------------------------------------
  // ADMIN PASSWORD
  // --------------------------------------------------------------------------
  
  /**
   * Set admin password
   * @param {string} password
   */
  setAdminPassword(password) {
    // Simple hash for basic protection (not secure for production)
    const hash = btoa(password);
    localStorage.setItem(this.KEYS.ADMIN_PASSWORD, hash);
  },

  /**
   * Verify admin password
   * @param {string} password
   * @returns {boolean}
   */
  verifyPassword(password) {
    const stored = localStorage.getItem(this.KEYS.ADMIN_PASSWORD);
    // Default password if not set
    if (!stored) {
      return password === 'admin123';
    }
    return stored === btoa(password);
  },

  /**
   * Check if admin is logged in (session based)
   * @returns {boolean}
   */
  isAdminLoggedIn() {
    return sessionStorage.getItem('admin_logged_in') === 'true';
  },

  /**
   * Set admin login status
   * @param {boolean} status
   */
  setAdminLoggedIn(status) {
    if (status) {
      sessionStorage.setItem('admin_logged_in', 'true');
    } else {
      sessionStorage.removeItem('admin_logged_in');
    }
  },

  // --------------------------------------------------------------------------
  // STREAK TRACKING
  // --------------------------------------------------------------------------
  
  /**
   * Get streak data
   * @returns {Object} - { currentStreak, lastActiveDate }
   */
  getStreakData() {
    try {
      const data = localStorage.getItem(this.KEYS.STREAK_DATA);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to parse streak data:', error);
    }
    return { currentStreak: 0, lastActiveDate: null };
  },

  /**
   * Update streak based on activity
   * @returns {number} - Current streak count
   */
  updateStreak() {
    const today = this.getDateString(new Date());
    const streakData = this.getStreakData();
    const lastActive = streakData.lastActiveDate;

    if (lastActive === today) {
      // Already active today, no change
      return streakData.currentStreak;
    }

    const yesterday = this.getDateString(new Date(Date.now() - 86400000));
    
    let newStreak;
    if (lastActive === yesterday) {
      // Consecutive day, increment streak
      newStreak = streakData.currentStreak + 1;
    } else if (!lastActive) {
      // First time user
      newStreak = 1;
    } else {
      // Streak broken, reset to 1
      newStreak = 1;
    }

    const newData = {
      currentStreak: newStreak,
      lastActiveDate: today,
    };

    try {
      localStorage.setItem(this.KEYS.STREAK_DATA, JSON.stringify(newData));
    } catch (error) {
      console.error('Failed to save streak data:', error);
    }

    return newStreak;
  },

  // --------------------------------------------------------------------------
  // LEARNED WORDS TRACKING
  // --------------------------------------------------------------------------
  
  /**
   * Get learned words set
   * @returns {Set<string>} - Set of word IDs
   */
  getLearnedWords() {
    try {
      const data = localStorage.getItem(this.KEYS.LEARNED_WORDS);
      if (data) {
        return new Set(JSON.parse(data));
      }
    } catch (error) {
      console.error('Failed to parse learned words:', error);
    }
    return new Set();
  },

  /**
   * Mark a word as learned
   * @param {string} wordId
   */
  markWordAsLearned(wordId) {
    const learned = this.getLearnedWords();
    learned.add(wordId);
    try {
      localStorage.setItem(this.KEYS.LEARNED_WORDS, JSON.stringify([...learned]));
    } catch (error) {
      console.error('Failed to save learned word:', error);
    }
  },

  /**
   * Unmark a word as learned
   * @param {string} wordId
   */
  unmarkWordAsLearned(wordId) {
    const learned = this.getLearnedWords();
    learned.delete(wordId);
    try {
      localStorage.setItem(this.KEYS.LEARNED_WORDS, JSON.stringify([...learned]));
    } catch (error) {
      console.error('Failed to save learned words:', error);
    }
  },

  /**
   * Check if a word is learned
   * @param {string} wordId
   * @returns {boolean}
   */
  isWordLearned(wordId) {
    return this.getLearnedWords().has(wordId);
  },

  // --------------------------------------------------------------------------
  // LOCAL WORDS CACHE (Offline Fallback)
  // --------------------------------------------------------------------------
  
  /**
   * Save words locally
   * @param {Array} words
   */
  saveLocalWords(words) {
    try {
      localStorage.setItem(this.KEYS.LOCAL_WORDS, JSON.stringify(words));
    } catch (error) {
      console.error('Failed to save local words:', error);
    }
  },

  /**
   * Get locally cached words
   * @returns {Array}
   */
  getLocalWords() {
    try {
      const data = localStorage.getItem(this.KEYS.LOCAL_WORDS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to parse local words:', error);
    }
    return [];
  },

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------
  
  /**
   * Get date string in YYYY-MM-DD format
   * @param {Date} date
   * @returns {string}
   */
  getDateString(date) {
    return date.toISOString().split('T')[0];
  },

  /**
   * Clear all stored data
   */
  clearAll() {
    Object.values(this.KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    sessionStorage.clear();
  },

  /**
   * Generate UUID v4
   * @returns {string}
   */
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// Export for use in other modules
window.StorageManager = StorageManager;
