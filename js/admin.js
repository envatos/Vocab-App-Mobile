/**
 * ==========================================================================
 * ADMIN PANEL
 * Authentication, word management, and settings
 * ==========================================================================
 */

const AdminApp = {
    // State
    currentDate: new Date(),
    editingWordId: null,
    deletingWordId: null,

    // DOM Elements
    elements: {},

    // Daily word limit
    DAILY_LIMIT: 5,

    // --------------------------------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------------------------------

    /**
     * Initialize admin panel
     */
    async init() {
        console.log('Initializing Admin Panel...');

        this.cacheElements();
        this.bindEvents();

        // Check if already logged in
        if (StorageManager.isAdminLoggedIn()) {
            this.showDashboard();
            await this.loadDashboardData();
        } else {
            this.showLogin();
        }

        console.log('Admin Panel initialized');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Login
            loginPage: document.getElementById('loginPage'),
            loginForm: document.getElementById('loginForm'),
            passwordInput: document.getElementById('passwordInput'),
            loginError: document.getElementById('loginError'),

            // Dashboard
            adminDashboard: document.getElementById('adminDashboard'),
            logoutBtn: document.getElementById('logoutBtn'),

            // Date picker
            adminDatePicker: document.getElementById('adminDatePicker'),
            adminPrevDate: document.getElementById('adminPrevDate'),
            adminNextDate: document.getElementById('adminNextDate'),

            // Stats
            todayWordsCount: document.getElementById('todayWordsCount'),
            totalWordsCount: document.getElementById('totalWordsCount'),

            // API Settings
            adminApiKey: document.getElementById('adminApiKey'),
            adminBinId: document.getElementById('adminBinId'),
            testApiBtn: document.getElementById('testApiBtn'),
            saveApiBtn: document.getElementById('saveApiBtn'),
            adminApiStatus: document.getElementById('adminApiStatus'),
            adminApiStatusText: document.getElementById('adminApiStatusText'),

            // Add word form
            addWordForm: document.getElementById('addWordForm'),
            englishWord: document.getElementById('englishWord'),
            ipaInput: document.getElementById('ipaInput'),
            contextInput: document.getElementById('contextInput'),
            meaningInput: document.getElementById('meaningInput'),
            banglaMeaningsInput: document.getElementById('banglaMeaningsInput'),
            synonymsInput: document.getElementById('synonymsInput'),
            antonymsInput: document.getElementById('antonymsInput'),
            clearFormBtn: document.getElementById('clearFormBtn'),
            addWordBtn: document.getElementById('addWordBtn'),
            wordCountIndicator: document.getElementById('wordCountIndicator'),
            wordsAddedToday: document.getElementById('wordsAddedToday'),

            // Word list
            wordList: document.getElementById('wordList'),
            wordListEmpty: document.getElementById('wordListEmpty'),
            listDateLabel: document.getElementById('listDateLabel'),
            refreshListBtn: document.getElementById('refreshListBtn'),

            // Edit modal
            editModal: document.getElementById('editModal'),
            closeEditModal: document.getElementById('closeEditModal'),
            editWordId: document.getElementById('editWordId'),
            editEnglishWord: document.getElementById('editEnglishWord'),
            editIpa: document.getElementById('editIpa'),
            editContext: document.getElementById('editContext'),
            editMeaning: document.getElementById('editMeaning'),
            editBanglaMeanings: document.getElementById('editBanglaMeanings'),
            editSynonyms: document.getElementById('editSynonyms'),
            editAntonyms: document.getElementById('editAntonyms'),
            cancelEditBtn: document.getElementById('cancelEditBtn'),
            saveEditBtn: document.getElementById('saveEditBtn'),

            // Delete modal
            deleteModal: document.getElementById('deleteModal'),
            closeDeleteModal: document.getElementById('closeDeleteModal'),
            deleteWordId: document.getElementById('deleteWordId'),
            deleteWordName: document.getElementById('deleteWordName'),
            cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
            confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

            // Toast
            toastContainer: document.getElementById('toastContainer'),
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const {
            loginForm, logoutBtn,
            adminDatePicker, adminPrevDate, adminNextDate,
            testApiBtn, saveApiBtn,
            addWordForm, clearFormBtn,
            refreshListBtn,
            closeEditModal, cancelEditBtn, saveEditBtn,
            closeDeleteModal, cancelDeleteBtn, confirmDeleteBtn,
            editModal, deleteModal
        } = this.elements;

        // Login
        loginForm?.addEventListener('submit', (e) => this.handleLogin(e));

        // Logout
        logoutBtn?.addEventListener('click', () => this.handleLogout());

        // Date navigation
        adminDatePicker?.addEventListener('change', (e) => this.handleDateChange(e.target.value));
        adminPrevDate?.addEventListener('click', () => this.navigateDate(-1));
        adminNextDate?.addEventListener('click', () => this.navigateDate(1));

        // API settings
        testApiBtn?.addEventListener('click', () => this.testApiConnection());
        saveApiBtn?.addEventListener('click', () => this.saveApiSettings());

        // Add word form
        addWordForm?.addEventListener('submit', (e) => this.handleAddWord(e));
        clearFormBtn?.addEventListener('click', () => this.clearForm());

        // Refresh list
        refreshListBtn?.addEventListener('click', () => this.loadWordList());

        // Edit modal
        closeEditModal?.addEventListener('click', () => this.closeEditModal());
        cancelEditBtn?.addEventListener('click', () => this.closeEditModal());
        saveEditBtn?.addEventListener('click', () => this.saveWordEdit());
        editModal?.addEventListener('click', (e) => {
            if (e.target === editModal) this.closeEditModal();
        });

        // Delete modal
        closeDeleteModal?.addEventListener('click', () => this.closeDeleteModal());
        cancelDeleteBtn?.addEventListener('click', () => this.closeDeleteModal());
        confirmDeleteBtn?.addEventListener('click', () => this.confirmDelete());
        deleteModal?.addEventListener('click', (e) => {
            if (e.target === deleteModal) this.closeDeleteModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEditModal();
                this.closeDeleteModal();
            }
        });
    },

    // --------------------------------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------------------------------

    /**
     * Show login page
     */
    showLogin() {
        const { loginPage, adminDashboard } = this.elements;
        loginPage && (loginPage.style.display = 'flex');
        adminDashboard && (adminDashboard.style.display = 'none');
    },

    /**
     * Show dashboard
     */
    showDashboard() {
        const { loginPage, adminDashboard } = this.elements;
        loginPage && (loginPage.style.display = 'none');
        adminDashboard && (adminDashboard.style.display = 'flex');
    },

    /**
     * Handle login form submission
     * @param {Event} e
     */
    handleLogin(e) {
        e.preventDefault();

        const { passwordInput, loginError } = this.elements;
        const password = passwordInput?.value;

        if (StorageManager.verifyPassword(password)) {
            StorageManager.setAdminLoggedIn(true);
            loginError?.classList.remove('show');
            this.showDashboard();
            this.loadDashboardData();
        } else {
            loginError?.classList.add('show');
            passwordInput?.focus();
        }
    },

    /**
     * Handle logout
     */
    handleLogout() {
        StorageManager.setAdminLoggedIn(false);
        this.showLogin();
        this.elements.passwordInput && (this.elements.passwordInput.value = '');
    },

    // --------------------------------------------------------------------------
    // DASHBOARD DATA
    // --------------------------------------------------------------------------

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        // Set date picker to today
        const today = this.getDateString(new Date());
        if (this.elements.adminDatePicker) {
            this.elements.adminDatePicker.value = today;
            this.elements.adminDatePicker.max = today;
        }

        // Load API settings
        this.loadApiSettings();

        // Update stats and word list
        await this.updateStats();
        await this.loadWordList();
    },

    /**
     * Load API settings into form
     */
    loadApiSettings() {
        const { adminApiKey, adminBinId } = this.elements;
        const { apiKey, binId } = StorageManager.getApiCredentials();

        if (adminApiKey) adminApiKey.value = apiKey;
        if (adminBinId) adminBinId.value = binId;

        this.updateApiStatus(!!apiKey && !!binId);
    },

    /**
     * Update statistics
     */
    async updateStats() {
        const { todayWordsCount, totalWordsCount, wordsAddedToday, wordCountIndicator } = this.elements;

        const today = this.getDateString(this.currentDate);
        const todayCount = await ApiManager.getWordCountForDate(today);
        const totalCount = await ApiManager.getTotalWordCount();

        if (todayWordsCount) todayWordsCount.textContent = todayCount;
        if (totalWordsCount) totalWordsCount.textContent = totalCount;
        if (wordsAddedToday) wordsAddedToday.textContent = todayCount;

        // Update limit indicator
        if (wordCountIndicator) {
            wordCountIndicator.className = `word-count-indicator ${todayCount >= this.DAILY_LIMIT ? 'limit-reached' : ''}`;
        }

        // Update list date label
        this.updateListDateLabel();
    },

    /**
     * Update list date label
     */
    updateListDateLabel() {
        const { listDateLabel } = this.elements;
        if (!listDateLabel) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const current = new Date(this.currentDate);
        current.setHours(0, 0, 0, 0);

        if (current.getTime() === today.getTime()) {
            listDateLabel.textContent = 'Today';
        } else {
            listDateLabel.textContent = this.formatDateDisplay(this.currentDate);
        }
    },

    // --------------------------------------------------------------------------
    // DATE NAVIGATION
    // --------------------------------------------------------------------------

    /**
     * Handle date change from picker
     * @param {string} dateString
     */
    handleDateChange(dateString) {
        this.currentDate = new Date(dateString + 'T00:00:00');
        this.updateStats();
        this.loadWordList();
    },

    /**
     * Navigate date
     * @param {number} direction
     */
    navigateDate(direction) {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + direction);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (newDate > today) return;

        this.currentDate = newDate;

        if (this.elements.adminDatePicker) {
            this.elements.adminDatePicker.value = this.getDateString(newDate);
        }

        this.updateStats();
        this.loadWordList();
    },

    // --------------------------------------------------------------------------
    // API SETTINGS
    // --------------------------------------------------------------------------

    /**
     * Test API connection
     */
    async testApiConnection() {
        const { adminApiKey, adminBinId, testApiBtn } = this.elements;

        const apiKey = adminApiKey?.value?.trim();
        const binId = adminBinId?.value?.trim();

        if (!apiKey || !binId) {
            this.showToast('Please enter API key and Bin ID', 'error');
            return;
        }

        // Temporarily save for testing
        StorageManager.saveApiCredentials(apiKey, binId);

        testApiBtn.disabled = true;
        testApiBtn.textContent = 'Testing...';

        const success = await ApiManager.testConnection();

        testApiBtn.disabled = false;
        testApiBtn.textContent = 'Test Connection';

        this.updateApiStatus(success);

        if (success) {
            this.showToast('Connection successful!', 'success');
        } else {
            this.showToast('Connection failed. Check credentials.', 'error');
        }
    },

    /**
     * Save API settings
     */
    saveApiSettings() {
        const { adminApiKey, adminBinId } = this.elements;

        const apiKey = adminApiKey?.value?.trim();
        const binId = adminBinId?.value?.trim();

        if (apiKey && binId) {
            StorageManager.saveApiCredentials(apiKey, binId);
            this.updateApiStatus(true);
            this.showToast('Settings saved!', 'success');
            this.loadWordList();
        } else {
            this.showToast('Please enter both API key and Bin ID', 'error');
        }
    },

    /**
     * Update API status display
     * @param {boolean} connected
     */
    updateApiStatus(connected) {
        const { adminApiStatus, adminApiStatusText } = this.elements;

        if (adminApiStatus) {
            adminApiStatus.className = `api-status ${connected ? 'connected' : 'disconnected'}`;
        }
        if (adminApiStatusText) {
            adminApiStatusText.textContent = connected ? 'Connected' : 'Not connected';
        }
    },

    // --------------------------------------------------------------------------
    // WORD MANAGEMENT
    // --------------------------------------------------------------------------

    /**
     * Handle add word form submission
     * @param {Event} e
     */
    async handleAddWord(e) {
        e.preventDefault();

        const {
            englishWord, ipaInput, contextInput, meaningInput,
            banglaMeaningsInput, synonymsInput, antonymsInput, addWordBtn
        } = this.elements;

        const english = englishWord?.value?.trim();

        if (!english) {
            this.showToast('Please enter an English word', 'error');
            return;
        }

        // Check daily limit
        const today = this.getDateString(this.currentDate);
        const isLimitReached = await ApiManager.isDailyLimitReached(today, this.DAILY_LIMIT);

        if (isLimitReached) {
            this.showToast(`Daily limit of ${this.DAILY_LIMIT} words reached!`, 'error');
            return;
        }

        // Disable button during save
        addWordBtn.disabled = true;
        addWordBtn.textContent = 'Adding...';

        try {
            const wordData = {
                date: today,
                english: english,
                ipa: ipaInput?.value?.trim() || '',
                context: contextInput?.value?.trim() || '',
                meaning: meaningInput?.value?.trim() || '',
                banglaMeanings: banglaMeaningsInput?.value?.trim() || '',
                synonyms: synonymsInput?.value?.trim() || '',
                antonyms: antonymsInput?.value?.trim() || '',
            };

            await ApiManager.addWord(wordData);

            this.showToast('Word added successfully!', 'success');
            this.clearForm();
            await this.updateStats();
            await this.loadWordList();

        } catch (error) {
            console.error('Failed to add word:', error);
            this.showToast('Failed to add word. Please try again.', 'error');
        }

        addWordBtn.disabled = false;
        addWordBtn.textContent = 'Add Word';
    },

    /**
     * Clear the add word form
     */
    clearForm() {
        const {
            englishWord, ipaInput, contextInput, meaningInput,
            banglaMeaningsInput, synonymsInput, antonymsInput
        } = this.elements;

        if (englishWord) englishWord.value = '';
        if (ipaInput) ipaInput.value = '';
        if (contextInput) contextInput.value = '';
        if (meaningInput) meaningInput.value = '';
        if (banglaMeaningsInput) banglaMeaningsInput.value = '';
        if (synonymsInput) synonymsInput.value = '';
        if (antonymsInput) antonymsInput.value = '';

        englishWord?.focus();
    },

    /**
     * Load word list for current date
     */
    async loadWordList() {
        const { wordList, wordListEmpty } = this.elements;
        if (!wordList) return;

        const dateString = this.getDateString(this.currentDate);
        const words = await ApiManager.fetchWordsByDate(dateString);

        if (words.length === 0) {
            wordList.innerHTML = '';
            wordListEmpty && (wordListEmpty.style.display = 'block');
        } else {
            wordListEmpty && (wordListEmpty.style.display = 'none');
            wordList.innerHTML = words.map(word => this.renderWordItem(word)).join('');

            // Bind action buttons
            wordList.querySelectorAll('.word-action-btn.edit').forEach(btn => {
                btn.addEventListener('click', () => this.openEditModal(btn.dataset.id));
            });

            wordList.querySelectorAll('.word-action-btn.delete').forEach(btn => {
                btn.addEventListener('click', () => this.openDeleteModal(btn.dataset.id, btn.dataset.word));
            });
        }
    },

    /**
     * Render a word item for the list
     * @param {Object} word
     * @returns {string} HTML
     */
    renderWordItem(word) {
        const banglaMeanings = (word.banglaMeanings || []).join(', ') || '—';

        return `
      <div class="word-item">
        <div class="word-number">${word.wordNumber || '?'}</div>
        <div class="word-content">
          <div class="word-english">${this.escapeHtml(word.english)}</div>
          <div class="word-ipa">${this.escapeHtml(word.ipa || '')}</div>
          <div class="word-bangla">${this.escapeHtml(banglaMeanings)}</div>
        </div>
        <div class="word-actions">
          <button class="word-action-btn edit" data-id="${word.id}" aria-label="Edit ${word.english}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="word-action-btn delete" data-id="${word.id}" data-word="${this.escapeHtml(word.english)}" aria-label="Delete ${word.english}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    },

    // --------------------------------------------------------------------------
    // EDIT MODAL
    // --------------------------------------------------------------------------

    /**
     * Open edit modal for a word
     * @param {string} wordId
     */
    async openEditModal(wordId) {
        const words = await ApiManager.fetchAllWords();
        const word = words.find(w => w.id === wordId);

        if (!word) {
            this.showToast('Word not found', 'error');
            return;
        }

        const {
            editModal, editWordId, editEnglishWord, editIpa,
            editContext, editMeaning, editBanglaMeanings,
            editSynonyms, editAntonyms
        } = this.elements;

        if (editWordId) editWordId.value = word.id;
        if (editEnglishWord) editEnglishWord.value = word.english || '';
        if (editIpa) editIpa.value = word.ipa || '';
        if (editContext) editContext.value = word.context || '';
        if (editMeaning) editMeaning.value = word.meaning || '';
        if (editBanglaMeanings) editBanglaMeanings.value = (word.banglaMeanings || []).join(', ');
        if (editSynonyms) editSynonyms.value = (word.synonyms || []).join(', ');
        if (editAntonyms) editAntonyms.value = (word.antonyms || []).join(', ');

        this.editingWordId = wordId;
        editModal?.classList.add('active');
    },

    /**
     * Close edit modal
     */
    closeEditModal() {
        this.editingWordId = null;
        this.elements.editModal?.classList.remove('active');
    },

    /**
     * Save word edit
     */
    async saveWordEdit() {
        if (!this.editingWordId) return;

        const {
            editEnglishWord, editIpa, editContext, editMeaning,
            editBanglaMeanings, editSynonyms, editAntonyms, saveEditBtn
        } = this.elements;

        const english = editEnglishWord?.value?.trim();

        if (!english) {
            this.showToast('English word is required', 'error');
            return;
        }

        saveEditBtn.disabled = true;
        saveEditBtn.textContent = 'Saving...';

        try {
            await ApiManager.updateWord(this.editingWordId, {
                english: english,
                ipa: editIpa?.value?.trim() || '',
                context: editContext?.value?.trim() || '',
                meaning: editMeaning?.value?.trim() || '',
                banglaMeanings: editBanglaMeanings?.value?.trim() || '',
                synonyms: editSynonyms?.value?.trim() || '',
                antonyms: editAntonyms?.value?.trim() || '',
            });

            this.showToast('Word updated successfully!', 'success');
            this.closeEditModal();
            await this.loadWordList();

        } catch (error) {
            console.error('Failed to update word:', error);
            this.showToast('Failed to update word', 'error');
        }

        saveEditBtn.disabled = false;
        saveEditBtn.textContent = 'Save Changes';
    },

    // --------------------------------------------------------------------------
    // DELETE MODAL
    // --------------------------------------------------------------------------

    /**
     * Open delete confirmation modal
     * @param {string} wordId
     * @param {string} wordName
     */
    openDeleteModal(wordId, wordName) {
        const { deleteModal, deleteWordId, deleteWordName } = this.elements;

        this.deletingWordId = wordId;
        if (deleteWordId) deleteWordId.value = wordId;
        if (deleteWordName) deleteWordName.textContent = `"${wordName}"`;

        deleteModal?.classList.add('active');
    },

    /**
     * Close delete modal
     */
    closeDeleteModal() {
        this.deletingWordId = null;
        this.elements.deleteModal?.classList.remove('active');
    },

    /**
     * Confirm and execute delete
     */
    async confirmDelete() {
        if (!this.deletingWordId) return;

        const { confirmDeleteBtn } = this.elements;

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = 'Deleting...';

        try {
            await ApiManager.deleteWord(this.deletingWordId);

            this.showToast('Word deleted successfully!', 'success');
            this.closeDeleteModal();
            await this.updateStats();
            await this.loadWordList();

        } catch (error) {
            console.error('Failed to delete word:', error);
            this.showToast('Failed to delete word', 'error');
        }

        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Delete';
    },

    // --------------------------------------------------------------------------
    // UTILITY METHODS
    // --------------------------------------------------------------------------

    /**
     * Show toast notification
     * @param {string} message
     * @param {string} type
     */
    showToast(message, type = 'info') {
        const { toastContainer } = this.elements;
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Get date string in YYYY-MM-DD format
     * @param {Date} date
     * @returns {string}
     */
    getDateString(date) {
        return date.toISOString().split('T')[0];
    },

    /**
     * Format date for display
     * @param {Date} date
     * @returns {string}
     */
    formatDateDisplay(date) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Escape HTML special characters
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

// Export for use in other modules
window.AdminApp = AdminApp;
