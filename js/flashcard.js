/**
 * ==========================================================================
 * FLASHCARD INTERACTIONS
 * Touch gestures, animations, and card state management
 * ==========================================================================
 */

const FlashcardManager = {
    // State
    currentIndex: 0,
    words: [],
    isFlipped: false,
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    isSwiping: false,
    swipeThreshold: 50,

    // DOM Elements (cached on init)
    elements: {},

    // --------------------------------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------------------------------

    /**
     * Initialize flashcard functionality
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        console.log('FlashcardManager initialized');
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            flashcard: document.getElementById('flashcard'),
            flashcardScene: document.getElementById('flashcardScene'),
            englishWord: document.getElementById('englishWord'),
            ipaPronunciation: document.getElementById('ipaPronunciation'),
            contextContent: document.getElementById('contextContent'),
            contextEmpty: document.getElementById('contextEmpty'),
            contextBox: document.getElementById('contextBox'),
            meaningContent: document.getElementById('meaningContent'),
            meaningEmpty: document.getElementById('meaningEmpty'),
            meaningBox: document.getElementById('meaningBox'),
            banglaMeanings: document.getElementById('banglaMeanings'),
            synonymsList: document.getElementById('synonymsList'),
            noSynonyms: document.getElementById('noSynonyms'),
            antonymsList: document.getElementById('antonymsList'),
            noAntonyms: document.getElementById('noAntonyms'),
            speakerBtn: document.getElementById('speakerBtn'),
            prevCardBtn: document.getElementById('prevCardBtn'),
            nextCardBtn: document.getElementById('nextCardBtn'),
            currentCard: document.getElementById('currentCard'),
            totalCards: document.getElementById('totalCards'),
            markLearnedBtn: document.getElementById('markLearnedBtn'),
            progressFill: document.getElementById('progressFill'),
            progressCount: document.getElementById('progressCount'),
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const { flashcard, speakerBtn, prevCardBtn, nextCardBtn, markLearnedBtn } = this.elements;

        // Card flip on tap/click
        if (flashcard) {
            flashcard.addEventListener('click', (e) => {
                // Ignore if clicking speaker button
                if (e.target.closest('.speaker-btn')) return;
                if (!this.isSwiping) {
                    this.flipCard();
                }
            });

            // Keyboard navigation
            flashcard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.flipCard();
                }
            });

            // Touch events for swipe
            flashcard.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
            flashcard.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
            flashcard.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        }

        // Speaker button
        if (speakerBtn) {
            speakerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.speakWord();
            });
        }

        // Navigation buttons
        if (prevCardBtn) {
            prevCardBtn.addEventListener('click', () => this.prevCard());
        }
        if (nextCardBtn) {
            nextCardBtn.addEventListener('click', () => this.nextCard());
        }

        // Mark as learned
        if (markLearnedBtn) {
            markLearnedBtn.addEventListener('click', () => this.toggleLearned());
        }

        // Keyboard navigation for entire page
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevCard();
            } else if (e.key === 'ArrowRight') {
                this.nextCard();
            }
        });
    },

    // --------------------------------------------------------------------------
    // CARD DISPLAY
    // --------------------------------------------------------------------------

    /**
     * Load words and display first card
     * @param {Array} words
     */
    loadWords(words) {
        this.words = words;
        this.currentIndex = 0;
        this.isFlipped = false;

        if (words.length > 0) {
            this.displayCard(0);
            this.updateProgress();
        }
    },

    /**
     * Display a specific card
     * @param {number} index
     */
    displayCard(index) {
        if (index < 0 || index >= this.words.length) return;

        const word = this.words[index];
        const {
            englishWord, ipaPronunciation,
            contextContent, contextEmpty, contextBox,
            meaningContent, meaningEmpty, meaningBox,
            banglaMeanings, synonymsList, noSynonyms,
            antonymsList, noAntonyms,
            currentCard, totalCards,
            flashcard
        } = this.elements;

        // Reset flip state when changing cards
        if (this.isFlipped) {
            flashcard?.classList.remove('flipped');
            this.isFlipped = false;
        }

        // Front face content
        if (englishWord) englishWord.textContent = word.english || '—';
        if (ipaPronunciation) ipaPronunciation.textContent = word.ipa || '/—/';

        // Context placeholder
        if (contextContent && contextEmpty && contextBox) {
            if (word.context) {
                contextContent.textContent = word.context;
                contextContent.style.display = 'block';
                contextEmpty.style.display = 'none';
                contextBox.classList.add('has-content');
            } else {
                contextContent.style.display = 'none';
                contextEmpty.style.display = 'block';
                contextBox.classList.remove('has-content');
            }
        }

        // Meaning placeholder
        if (meaningContent && meaningEmpty && meaningBox) {
            if (word.meaning) {
                meaningContent.textContent = word.meaning;
                meaningContent.style.display = 'block';
                meaningEmpty.style.display = 'none';
                meaningBox.classList.add('has-content');
            } else {
                meaningContent.style.display = 'none';
                meaningEmpty.style.display = 'block';
                meaningBox.classList.remove('has-content');
            }
        }

        // Back face content - Bangla meanings
        if (banglaMeanings) {
            const meanings = word.banglaMeanings || [];
            if (meanings.length > 0) {
                banglaMeanings.innerHTML = meanings.map(m =>
                    `<span class="bangla-meaning-item">${m}</span>`
                ).join('');
            } else {
                banglaMeanings.textContent = '—';
            }
        }

        // Synonyms
        if (synonymsList && noSynonyms) {
            const synonyms = word.synonyms || [];
            if (synonyms.length > 0) {
                synonymsList.innerHTML = synonyms.map(s =>
                    `<span class="synonym-tag">${s}</span>`
                ).join('');
                synonymsList.style.display = 'flex';
                noSynonyms.style.display = 'none';
            } else {
                synonymsList.style.display = 'none';
                noSynonyms.style.display = 'block';
            }
        }

        // Antonyms
        if (antonymsList && noAntonyms) {
            const antonyms = word.antonyms || [];
            if (antonyms.length > 0) {
                antonymsList.innerHTML = antonyms.map(a =>
                    `<span class="antonym-tag">${a}</span>`
                ).join('');
                antonymsList.style.display = 'flex';
                noAntonyms.style.display = 'none';
            } else {
                antonymsList.style.display = 'none';
                noAntonyms.style.display = 'block';
            }
        }

        // Card counter
        if (currentCard) currentCard.textContent = index + 1;
        if (totalCards) totalCards.textContent = this.words.length;

        // Update navigation button states
        this.updateNavigationState();

        // Update learned button state
        this.updateLearnedState(word.id);
    },

    /**
     * Update navigation button disabled states
     */
    updateNavigationState() {
        const { prevCardBtn, nextCardBtn } = this.elements;

        if (prevCardBtn) {
            prevCardBtn.disabled = this.currentIndex === 0;
        }
        if (nextCardBtn) {
            nextCardBtn.disabled = this.currentIndex >= this.words.length - 1;
        }
    },

    /**
     * Update learned button state
     * @param {string} wordId
     */
    updateLearnedState(wordId) {
        const { markLearnedBtn } = this.elements;
        if (!markLearnedBtn) return;

        const isLearned = StorageManager.isWordLearned(wordId);

        if (isLearned) {
            markLearnedBtn.classList.add('learned');
            markLearnedBtn.querySelector('.action-label').textContent = 'Learned ✓';
        } else {
            markLearnedBtn.classList.remove('learned');
            markLearnedBtn.querySelector('.action-label').textContent = 'Mark Learned';
        }
    },

    /**
     * Update progress bar
     */
    updateProgress() {
        const { progressFill, progressCount } = this.elements;
        const learned = this.words.filter(w => StorageManager.isWordLearned(w.id)).length;
        const total = this.words.length;
        const percentage = total > 0 ? (learned / total) * 100 : 0;

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressCount) {
            progressCount.textContent = `${learned}/${total}`;
        }
    },

    // --------------------------------------------------------------------------
    // CARD INTERACTIONS
    // --------------------------------------------------------------------------

    /**
     * Flip the card
     */
    flipCard() {
        const { flashcard } = this.elements;
        if (!flashcard) return;

        this.isFlipped = !this.isFlipped;
        flashcard.classList.toggle('flipped', this.isFlipped);

        // Announce for screen readers
        const state = this.isFlipped ? 'back' : 'front';
        flashcard.setAttribute('aria-label', `Flashcard showing ${state}. Tap to flip.`);
    },

    /**
     * Go to previous card
     */
    prevCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.displayCard(this.currentIndex);
        }
    },

    /**
     * Go to next card
     */
    nextCard() {
        if (this.currentIndex < this.words.length - 1) {
            this.currentIndex++;
            this.displayCard(this.currentIndex);
        }
    },

    /**
     * Toggle learned state for current word
     */
    toggleLearned() {
        if (this.words.length === 0) return;

        const word = this.words[this.currentIndex];
        const isLearned = StorageManager.isWordLearned(word.id);

        if (isLearned) {
            StorageManager.unmarkWordAsLearned(word.id);
        } else {
            StorageManager.markWordAsLearned(word.id);
        }

        this.updateLearnedState(word.id);
        this.updateProgress();

        // Show feedback toast
        const message = isLearned ? 'Removed from learned' : 'Marked as learned!';
        window.App?.showToast(message, isLearned ? 'info' : 'success');
    },

    // --------------------------------------------------------------------------
    // TEXT-TO-SPEECH
    // --------------------------------------------------------------------------

    /**
     * Speak the current word
     */
    speakWord() {
        if (this.words.length === 0) return;

        const word = this.words[this.currentIndex];
        const { speakerBtn } = this.elements;

        // Check if speech synthesis is available
        if (!('speechSynthesis' in window)) {
            window.App?.showToast('Text-to-speech not supported', 'error');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word.english);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        // Visual feedback
        speakerBtn?.classList.add('playing');

        utterance.onend = () => {
            speakerBtn?.classList.remove('playing');
        };

        utterance.onerror = () => {
            speakerBtn?.classList.remove('playing');
            window.App?.showToast('Failed to play pronunciation', 'error');
        };

        window.speechSynthesis.speak(utterance);
    },

    // --------------------------------------------------------------------------
    // TOUCH GESTURES
    // --------------------------------------------------------------------------

    /**
     * Handle touch start
     * @param {TouchEvent} e
     */
    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
        this.isSwiping = false;
    },

    /**
     * Handle touch move
     * @param {TouchEvent} e
     */
    handleTouchMove(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;

        const diffX = this.touchEndX - this.touchStartX;
        const diffY = Math.abs(this.touchEndY - this.touchStartY);

        // Detect horizontal swipe (ignore if vertical movement is significant)
        if (Math.abs(diffX) > 20 && diffY < 50) {
            this.isSwiping = true;
            const { flashcard } = this.elements;

            if (diffX > 0) {
                flashcard?.classList.add('swiping-right');
                flashcard?.classList.remove('swiping-left');
            } else {
                flashcard?.classList.add('swiping-left');
                flashcard?.classList.remove('swiping-right');
            }
        }
    },

    /**
     * Handle touch end
     * @param {TouchEvent} e
     */
    handleTouchEnd(e) {
        const { flashcard } = this.elements;
        flashcard?.classList.remove('swiping-left', 'swiping-right');

        const diffX = this.touchEndX - this.touchStartX;
        const diffY = Math.abs(this.touchEndY - this.touchStartY);

        // Horizontal swipe detection
        if (Math.abs(diffX) > this.swipeThreshold && diffY < 50) {
            if (diffX > 0) {
                // Swipe right = previous card
                this.prevCard();
            } else {
                // Swipe left = next card
                this.nextCard();
            }
        } else if (!this.isSwiping) {
            // Small movement = tap for flip (handled by click event)
        }

        // Reset
        this.isSwiping = false;
        this.touchEndX = 0;
        this.touchEndY = 0;
    },

    // --------------------------------------------------------------------------
    // UTILITY
    // --------------------------------------------------------------------------

    /**
     * Get current word
     * @returns {Object|null}
     */
    getCurrentWord() {
        return this.words[this.currentIndex] || null;
    },

    /**
     * Reset to first card
     */
    reset() {
        this.currentIndex = 0;
        this.isFlipped = false;
        if (this.elements.flashcard) {
            this.elements.flashcard.classList.remove('flipped');
        }
        if (this.words.length > 0) {
            this.displayCard(0);
        }
    }
};

// Export for use in other modules
window.FlashcardManager = FlashcardManager;
