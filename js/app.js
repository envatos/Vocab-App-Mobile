/**
 * ==========================================================================
 * MAIN APPLICATION
 * App initialization, state management, and UI coordination
 * ==========================================================================
 */

const App = {
    // State
    currentDate: new Date(),
    isLoading: false,

    // DOM Elements
    elements: {},

    // --------------------------------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------------------------------

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Vocabulary Flashcard App...');

        this.cacheElements();
        this.bindEvents();

        // Initialize flashcard manager
        FlashcardManager.init();

        // Update streak
        const streak = StorageManager.updateStreak();
        this.updateStreakDisplay(streak);

        // Set current date display
        this.updateDateDisplay();

        // Load words for today
        await this.loadWordsForDate(this.getDateString(this.currentDate));

        console.log('App initialized successfully');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            loadingState: document.getElementById('loadingState'),
            emptyState: document.getElementById('emptyState'),
            flashcardScene: document.getElementById('flashcardScene'),
            navArrows: document.getElementById('navArrows'),
            cardActions: document.getElementById('cardActions'),
            swipeHint: document.getElementById('swipeHint'),
            streakBadge: document.getElementById('streakBadge'),
            streakCount: document.getElementById('streakCount'),
            currentDateBtn: document.getElementById('currentDateBtn'),
            currentDateText: document.getElementById('currentDateText'),
            prevDateBtn: document.getElementById('prevDateBtn'),
            nextDateBtn: document.getElementById('nextDateBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            apiKeyInput: document.getElementById('apiKeyInput'),
            binIdInput: document.getElementById('binIdInput'),
            apiStatus: document.getElementById('apiStatus'),
            apiStatusText: document.getElementById('apiStatusText'),
            testConnectionBtn: document.getElementById('testConnectionBtn'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            toastContainer: document.getElementById('toastContainer'),
            themeToggleBtn: document.getElementById('themeToggleBtn'),
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const {
            prevDateBtn, nextDateBtn, currentDateBtn,
            settingsBtn, closeSettingsBtn,
            testConnectionBtn, saveSettingsBtn,
            settingsModal, themeToggleBtn
        } = this.elements;

        // Date navigation
        prevDateBtn?.addEventListener('click', () => this.navigateDate(-1));
        nextDateBtn?.addEventListener('click', () => this.navigateDate(1));
        currentDateBtn?.addEventListener('click', () => this.showDatePicker());

        // Theme toggle
        themeToggleBtn?.addEventListener('click', () => this.toggleTheme());

        // Settings modal
        settingsBtn?.addEventListener('click', () => this.openSettings());
        closeSettingsBtn?.addEventListener('click', () => this.closeSettings());
        settingsModal?.addEventListener('click', (e) => {
            if (e.target === settingsModal) this.closeSettings();
        });

        // Settings actions
        testConnectionBtn?.addEventListener('click', () => this.testConnection());
        saveSettingsBtn?.addEventListener('click', () => this.saveSettings());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });

        // Initialize theme from localStorage
        this.initTheme();
    },

    /**
     * Initialize theme from localStorage or system preference
     */
    initTheme() {
        const savedTheme = localStorage.getItem('vocab_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
            this.updateThemeIcon(true);
        } else if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            this.updateThemeIcon(false);
        } else {
            this.updateThemeIcon(prefersDark);
        }
    },

    /**
     * Toggle between light and dark theme
     */
    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        document.body.classList.remove('light-mode');

        if (!isDark) {
            document.body.classList.add('light-mode');
        }

        localStorage.setItem('vocab_theme', isDark ? 'dark' : 'light');
        this.updateThemeIcon(isDark);
    },

    /**
     * Update theme toggle icon
     * @param {boolean} isDark
     */
    updateThemeIcon(isDark) {
        const sunIcon = document.querySelector('.icon-sun');
        const moonIcon = document.querySelector('.icon-moon');

        if (sunIcon && moonIcon) {
            sunIcon.style.display = isDark ? 'none' : 'block';
            moonIcon.style.display = isDark ? 'block' : 'none';
        }
    },

    // --------------------------------------------------------------------------
    // DATA LOADING
    // --------------------------------------------------------------------------

    /**
     * Load words for a specific date
     * @param {string} dateString - YYYY-MM-DD format
     */
    async loadWordsForDate(dateString) {
        this.showLoading(true);

        try {
            const words = await ApiManager.fetchWordsByDate(dateString);

            if (words.length === 0) {
                this.showEmptyState();
            } else {
                this.showFlashcards(words);
            }
        } catch (error) {
            console.error('Failed to load words:', error);
            this.showToast('Failed to load words. Using cached data.', 'error');

            // Try local cache
            const cachedWords = StorageManager.getLocalWords();
            const filteredWords = cachedWords.filter(w => w.date === dateString);

            if (filteredWords.length === 0) {
                this.showEmptyState();
            } else {
                this.showFlashcards(filteredWords);
            }
        }

        this.showLoading(false);
    },

    // --------------------------------------------------------------------------
    // UI STATE MANAGEMENT
    // --------------------------------------------------------------------------

    /**
     * Show loading state
     * @param {boolean} show
     */
    showLoading(show) {
        this.isLoading = show;
        const { loadingState, emptyState, flashcardScene, navArrows, cardActions, swipeHint } = this.elements;

        if (show) {
            loadingState && (loadingState.style.display = 'flex');
            emptyState && (emptyState.style.display = 'none');
            flashcardScene && (flashcardScene.style.display = 'none');
            navArrows && (navArrows.style.display = 'none');
            cardActions && (cardActions.style.display = 'none');
            swipeHint && (swipeHint.style.display = 'none');
        } else {
            loadingState && (loadingState.style.display = 'none');
        }
    },

    /**
     * Show empty state
     */
    showEmptyState() {
        const { emptyState, flashcardScene, navArrows, cardActions, swipeHint } = this.elements;

        emptyState && (emptyState.style.display = 'flex');
        flashcardScene && (flashcardScene.style.display = 'none');
        navArrows && (navArrows.style.display = 'none');
        cardActions && (cardActions.style.display = 'none');
        swipeHint && (swipeHint.style.display = 'none');
    },

    /**
     * Show flashcards
     * @param {Array} words
     */
    showFlashcards(words) {
        const { emptyState, flashcardScene, navArrows, cardActions, swipeHint } = this.elements;

        emptyState && (emptyState.style.display = 'none');
        flashcardScene && (flashcardScene.style.display = 'block');
        navArrows && (navArrows.style.display = 'flex');
        cardActions && (cardActions.style.display = 'flex');
        swipeHint && (swipeHint.style.display = 'flex');

        FlashcardManager.loadWords(words);
    },

    // --------------------------------------------------------------------------
    // DATE NAVIGATION
    // --------------------------------------------------------------------------

    /**
     * Navigate to previous or next date
     * @param {number} direction - -1 for previous, 1 for next
     */
    navigateDate(direction) {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + direction);
        newDate.setHours(0, 0, 0, 0);

        // Don't allow future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (newDate.getTime() > today.getTime()) return;

        this.currentDate = newDate;
        this.updateDateDisplay();
        this.loadWordsForDate(this.getDateString(newDate));
    },

    /**
     * Update date display
     */
    updateDateDisplay() {
        const { currentDateText, nextDateBtn } = this.elements;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const current = new Date(this.currentDate);
        current.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let displayText;
        if (current.getTime() === today.getTime()) {
            displayText = 'Today';
        } else if (current.getTime() === yesterday.getTime()) {
            displayText = 'Yesterday';
        } else {
            displayText = this.formatDateDisplay(this.currentDate);
        }

        if (currentDateText) {
            currentDateText.textContent = displayText;
        }

        // Disable next button if at today
        if (nextDateBtn) {
            nextDateBtn.disabled = current.getTime() >= today.getTime();
        }
    },

    /**
     * Format date for display
     * @param {Date} date
     * @returns {string}
     */
    formatDateDisplay(date) {
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Show date picker (native)
     */
    showDatePicker() {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = this.getDateString(this.currentDate);
        input.max = this.getDateString(new Date());

        input.addEventListener('change', () => {
            const selectedDate = new Date(input.value + 'T00:00:00');
            this.currentDate = selectedDate;
            this.updateDateDisplay();
            this.loadWordsForDate(input.value);
        });

        input.click();
    },

    // --------------------------------------------------------------------------
    // STREAK DISPLAY
    // --------------------------------------------------------------------------

    /**
     * Update streak display
     * @param {number} streak
     */
    updateStreakDisplay(streak) {
        const { streakCount, streakBadge } = this.elements;

        if (streakCount) {
            streakCount.textContent = streak;
        }

        if (streakBadge) {
            // Update text based on streak count
            const dayText = streak === 1 ? 'day' : 'days';
            streakBadge.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>${streak}</span> ${dayText}
      `;

            // Show/hide based on streak
            streakBadge.style.display = streak > 0 ? 'inline-flex' : 'none';
        }
    },

    // --------------------------------------------------------------------------
    // SETTINGS MODAL
    // --------------------------------------------------------------------------

    /**
     * Open settings modal
     */
    openSettings() {
        const { settingsModal, apiKeyInput, binIdInput } = this.elements;

        // Load current settings
        const { apiKey, binId } = StorageManager.getApiCredentials();
        if (apiKeyInput) apiKeyInput.value = apiKey;
        if (binIdInput) binIdInput.value = binId;

        // Update connection status
        this.updateConnectionStatus();

        settingsModal?.classList.add('active');
    },

    /**
     * Close settings modal
     */
    closeSettings() {
        const { settingsModal } = this.elements;
        settingsModal?.classList.remove('active');
    },

    /**
     * Test API connection
     */
    async testConnection() {
        const { apiKeyInput, binIdInput, testConnectionBtn } = this.elements;

        const apiKey = apiKeyInput?.value?.trim();
        const binId = binIdInput?.value?.trim();

        if (!apiKey || !binId) {
            this.showToast('Please enter API key and Bin ID', 'error');
            return;
        }

        // Temporarily save for testing
        StorageManager.saveApiCredentials(apiKey, binId);

        testConnectionBtn.disabled = true;
        testConnectionBtn.textContent = 'Testing...';

        const success = await ApiManager.testConnection();

        testConnectionBtn.disabled = false;
        testConnectionBtn.textContent = 'Test Connection';

        this.updateConnectionStatus(success);

        if (success) {
            this.showToast('Connection successful!', 'success');
        } else {
            this.showToast('Connection failed. Check your credentials.', 'error');
        }
    },

    /**
     * Save settings
     */
    async saveSettings() {
        const { apiKeyInput, binIdInput } = this.elements;

        const apiKey = apiKeyInput?.value?.trim();
        const binId = binIdInput?.value?.trim();

        if (apiKey && binId) {
            StorageManager.saveApiCredentials(apiKey, binId);
            this.showToast('Settings saved!', 'success');
            this.closeSettings();

            // Reload words
            await this.loadWordsForDate(this.getDateString(this.currentDate));
        } else {
            this.showToast('Please enter both API key and Bin ID', 'error');
        }
    },

    /**
     * Update connection status display
     * @param {boolean} connected
     */
    updateConnectionStatus(connected) {
        const { apiStatus, apiStatusText } = this.elements;

        if (!connected) {
            connected = StorageManager.hasApiCredentials();
        }

        if (apiStatus) {
            apiStatus.className = `api-status ${connected ? 'connected' : 'disconnected'}`;
        }
        if (apiStatusText) {
            apiStatusText.textContent = connected ? 'Connected' : 'Not connected';
        }
    },

    // --------------------------------------------------------------------------
    // TOAST NOTIFICATIONS
    // --------------------------------------------------------------------------

    /**
     * Show toast notification
     * @param {string} message
     * @param {string} type - 'success', 'error', 'info'
     */
    showToast(message, type = 'info') {
        const { toastContainer } = this.elements;
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');

        toastContainer.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use in other modules
window.App = App;
