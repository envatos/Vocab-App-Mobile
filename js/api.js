/**
 * ==========================================================================
 * JSONBIN.IO API WRAPPER
 * Handles all cloud storage operations with JSONBin.io
 * ==========================================================================
 */

const ApiManager = {
    // Base URL for JSONBin.io API
    BASE_URL: 'https://api.jsonbin.io/v3',

    // --------------------------------------------------------------------------
    // HELPER METHODS
    // --------------------------------------------------------------------------

    /**
     * Get headers for API requests
     * @returns {Object}
     */
    getHeaders() {
        const { apiKey } = StorageManager.getApiCredentials();
        return {
            'Content-Type': 'application/json',
            'X-Master-Key': apiKey,
        };
    },

    /**
     * Make API request with error handling and retry
     * @param {string} url
     * @param {Object} options
     * @param {number} retries
     * @returns {Promise<Object>}
     */
    async request(url, options = {}, retries = 2) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.getHeaders(),
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (retries > 0 && error.name !== 'AbortError') {
                console.warn(`Retrying request... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.request(url, options, retries - 1);
            }
            throw error;
        }
    },

    // --------------------------------------------------------------------------
    // CONNECTION TESTING
    // --------------------------------------------------------------------------

    /**
     * Test API connection
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        try {
            const { binId } = StorageManager.getApiCredentials();
            if (!binId) {
                throw new Error('Bin ID not configured');
            }

            const url = `${this.BASE_URL}/b/${binId}/latest`;
            await this.request(url);
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    },

    /**
     * Initialize a new bin with empty data structure
     * @param {string} binName
     * @returns {Promise<string>} - New bin ID
     */
    async createBin(binName = 'Vocabulary Flashcards') {
        const url = `${this.BASE_URL}/b`;
        const initialData = {
            words: [],
            meta: {
                totalWords: 0,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
            },
        };

        const result = await this.request(url, {
            method: 'POST',
            headers: {
                'X-Bin-Name': binName,
            },
            body: JSON.stringify(initialData),
        });

        return result.metadata.id;
    },

    // --------------------------------------------------------------------------
    // WORD OPERATIONS
    // --------------------------------------------------------------------------

    /**
     * Fetch all words from the bin
     * @returns {Promise<Array>}
     */
    async fetchAllWords() {
        try {
            const { binId } = StorageManager.getApiCredentials();
            if (!binId) {
                return StorageManager.getLocalWords();
            }

            const url = `${this.BASE_URL}/b/${binId}/latest`;
            const result = await this.request(url);

            const words = result.record?.words || [];

            // Cache locally for offline access
            StorageManager.saveLocalWords(words);

            return words;
        } catch (error) {
            console.error('Failed to fetch words:', error);
            // Return cached words on failure
            return StorageManager.getLocalWords();
        }
    },

    /**
     * Fetch words for a specific date
     * @param {string} dateString - YYYY-MM-DD format
     * @returns {Promise<Array>}
     */
    async fetchWordsByDate(dateString) {
        const allWords = await this.fetchAllWords();
        return allWords.filter(word => word.date === dateString);
    },

    /**
     * Save all words to the bin
     * @param {Array} words
     * @returns {Promise<boolean>}
     */
    async saveAllWords(words) {
        try {
            const { binId } = StorageManager.getApiCredentials();
            if (!binId) {
                StorageManager.saveLocalWords(words);
                return true;
            }

            const url = `${this.BASE_URL}/b/${binId}`;
            const data = {
                words: words,
                meta: {
                    totalWords: words.length,
                    lastUpdated: new Date().toISOString(),
                },
            };

            await this.request(url, {
                method: 'PUT',
                body: JSON.stringify(data),
            });

            // Update local cache
            StorageManager.saveLocalWords(words);

            return true;
        } catch (error) {
            console.error('Failed to save words:', error);
            // Save locally as fallback
            StorageManager.saveLocalWords(words);
            return false;
        }
    },

    /**
     * Add a new word
     * @param {Object} wordData
     * @returns {Promise<Object>} - The added word with ID
     */
    async addWord(wordData) {
        const allWords = await this.fetchAllWords();

        const newWord = {
            id: StorageManager.generateId(),
            date: wordData.date || StorageManager.getDateString(new Date()),
            wordNumber: this.getNextWordNumber(allWords, wordData.date),
            english: wordData.english,
            ipa: wordData.ipa || '',
            context: wordData.context || '',
            meaning: wordData.meaning || '',
            banglaMeanings: this.parseArrayField(wordData.banglaMeanings),
            synonyms: this.parseArrayField(wordData.synonyms),
            antonyms: this.parseArrayField(wordData.antonyms),
            isLearned: false,
            createdAt: new Date().toISOString(),
        };

        allWords.push(newWord);
        await this.saveAllWords(allWords);

        return newWord;
    },

    /**
     * Update an existing word
     * @param {string} wordId
     * @param {Object} updates
     * @returns {Promise<Object>} - Updated word
     */
    async updateWord(wordId, updates) {
        const allWords = await this.fetchAllWords();
        const index = allWords.findIndex(w => w.id === wordId);

        if (index === -1) {
            throw new Error('Word not found');
        }

        // Apply updates
        allWords[index] = {
            ...allWords[index],
            ...updates,
            banglaMeanings: updates.banglaMeanings !== undefined
                ? this.parseArrayField(updates.banglaMeanings)
                : allWords[index].banglaMeanings,
            synonyms: updates.synonyms !== undefined
                ? this.parseArrayField(updates.synonyms)
                : allWords[index].synonyms,
            antonyms: updates.antonyms !== undefined
                ? this.parseArrayField(updates.antonyms)
                : allWords[index].antonyms,
            updatedAt: new Date().toISOString(),
        };

        await this.saveAllWords(allWords);
        return allWords[index];
    },

    /**
     * Delete a word
     * @param {string} wordId
     * @returns {Promise<boolean>}
     */
    async deleteWord(wordId) {
        const allWords = await this.fetchAllWords();
        const filteredWords = allWords.filter(w => w.id !== wordId);

        if (filteredWords.length === allWords.length) {
            throw new Error('Word not found');
        }

        // Re-number words for the affected date
        const deletedWord = allWords.find(w => w.id === wordId);
        if (deletedWord) {
            let number = 1;
            filteredWords.forEach(word => {
                if (word.date === deletedWord.date) {
                    word.wordNumber = number++;
                }
            });
        }

        await this.saveAllWords(filteredWords);
        return true;
    },

    // --------------------------------------------------------------------------
    // UTILITY METHODS
    // --------------------------------------------------------------------------

    /**
     * Parse comma-separated string to array
     * @param {string|Array} field
     * @returns {Array}
     */
    parseArrayField(field) {
        if (Array.isArray(field)) {
            return field.filter(item => item && item.trim());
        }
        if (typeof field === 'string' && field.trim()) {
            return field.split(',').map(item => item.trim()).filter(Boolean);
        }
        return [];
    },

    /**
     * Get next word number for a date
     * @param {Array} allWords
     * @param {string} date
     * @returns {number}
     */
    getNextWordNumber(allWords, date) {
        const dateWords = allWords.filter(w => w.date === date);
        return dateWords.length + 1;
    },

    /**
     * Count words for a specific date
     * @param {string} dateString
     * @returns {Promise<number>}
     */
    async getWordCountForDate(dateString) {
        const words = await this.fetchWordsByDate(dateString);
        return words.length;
    },

    /**
     * Get total word count
     * @returns {Promise<number>}
     */
    async getTotalWordCount() {
        const words = await this.fetchAllWords();
        return words.length;
    },

    /**
     * Check if daily limit is reached
     * @param {string} dateString
     * @param {number} limit
     * @returns {Promise<boolean>}
     */
    async isDailyLimitReached(dateString, limit = 5) {
        const count = await this.getWordCountForDate(dateString);
        return count >= limit;
    },
};

// Export for use in other modules
window.ApiManager = ApiManager;
