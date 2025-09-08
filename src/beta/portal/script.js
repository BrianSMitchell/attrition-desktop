/**
 * Pokemon Tracker Beta Portal JavaScript
 * Handles key validation, downloads, and user interactions
 */

class BetaPortal {
    constructor() {
        this.apiBaseUrl = 'https://api.pokemon-tracker.app/beta';
        this.currentUser = null;
        this.downloadStats = {
            windows: 0,
            macos: 0,
            linux: 0
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBetaStats();
        this.detectPlatform();
        this.formatAccessKeyInput();
    }

    setupEventListeners() {
        // Key validation form
        const keyForm = document.getElementById('keyValidationForm');
        if (keyForm) {
            keyForm.addEventListener('submit', (e) => this.handleKeyValidation(e));
        }

        // Download buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.download-btn') || e.target.closest('.download-btn')) {
                this.handleDownload(e);
            }
        });

        // Request access form
        const requestForm = document.getElementById('requestForm');
        if (requestForm) {
            requestForm.addEventListener('submit', (e) => this.handleAccessRequest(e));
        }

        // Access key input formatting
        const accessKeyInput = document.getElementById('accessKey');
        if (accessKeyInput) {
            accessKeyInput.addEventListener('input', (e) => this.formatAccessKeyInput(e));
            accessKeyInput.addEventListener('paste', (e) => this.handleKeyPaste(e));
        }
    }

    /**
     * Handle beta access key validation
     */
    async handleKeyValidation(event) {
        event.preventDefault();
        
        const accessKey = document.getElementById('accessKey').value.trim().toUpperCase();
        const validateBtn = document.getElementById('validateBtn');
        const spinner = document.getElementById('spinner');
        
        if (!this.isValidKeyFormat(accessKey)) {
            this.showError('Please enter a valid beta access key format: BETA-XX-XXXXXXXX-XXXXXXXX');
            return;
        }

        // Show loading state
        validateBtn.disabled = true;
        spinner.classList.add('active');
        
        try {
            const response = await this.validateAccessKey(accessKey);
            
            if (response.valid) {
                this.currentUser = response.user;
                this.showDownloadSection();
                this.trackEvent('key_validated', { phase: response.user.phase });
            } else {
                this.showError(response.reason || 'Invalid access key');
            }
        } catch (error) {
            console.error('Key validation error:', error);
            this.showError('Unable to validate key. Please check your connection and try again.');
        } finally {
            validateBtn.disabled = false;
            spinner.classList.remove('active');
        }
    }

    /**
     * Validate access key with API
     */
    async validateAccessKey(accessKey) {
        // Mock validation for demo - replace with actual API call
        const mockResponse = await new Promise(resolve => {
            setTimeout(() => {
                // Simulate different scenarios based on key format
                if (accessKey.startsWith('BETA-IN-')) {
                    resolve({
                        valid: true,
                        user: {
                            id: 'user-123',
                            name: 'John Doe',
                            phase: 'INTERNAL',
                            role: 'developer',
                            permissions: {
                                downloadBeta: true,
                                accessForum: true,
                                viewRoadmap: true,
                                debugMode: true
                            }
                        }
                    });
                } else if (accessKey.startsWith('BETA-CL-')) {
                    resolve({
                        valid: true,
                        user: {
                            id: 'user-456',
                            name: 'Jane Smith',
                            phase: 'CLOSED_ALPHA',
                            role: 'tester',
                            permissions: {
                                downloadBeta: true,
                                accessForum: true,
                                viewRoadmap: false,
                                debugMode: false
                            }
                        }
                    });
                } else if (accessKey === 'BETA-XX-12345678-ABCDEFGH') {
                    resolve({
                        valid: true,
                        user: {
                            id: 'user-789',
                            name: 'Beta Tester',
                            phase: 'CLOSED_BETA',
                            role: 'tester',
                            permissions: {
                                downloadBeta: true,
                                accessForum: true,
                                viewRoadmap: false,
                                debugMode: false
                            }
                        }
                    });
                } else {
                    resolve({
                        valid: false,
                        reason: 'Invalid access key. Please check your key and try again.'
                    });
                }
            }, 1500);
        });

        return mockResponse;
    }

    /**
     * Show download section after successful validation
     */
    showDownloadSection() {
        const accessForm = document.getElementById('accessForm');
        const downloadSection = document.getElementById('downloadSection');
        const userInfo = document.getElementById('userInfo');
        
        // Hide access form
        accessForm.style.display = 'none';
        
        // Show download section
        downloadSection.classList.remove('hidden');
        
        // Populate user info
        userInfo.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome, ${this.currentUser.name}! 👋</h3>
                <div class="user-details">
                    <span class="badge phase-${this.currentUser.phase.toLowerCase()}">${this.currentUser.phase} PHASE</span>
                    <span class="badge role-${this.currentUser.role}">${this.currentUser.role.toUpperCase()}</span>
                </div>
                <p>Choose your platform to download the latest beta build:</p>
            </div>
        `;

        // Scroll to download section
        downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        this.showSuccess('Access key validated successfully! You can now download the beta.');
    }

    /**
     * Handle download button clicks
     */
    async handleDownload(event) {
        event.preventDefault();
        
        if (!this.currentUser) {
            this.showError('Please validate your access key first.');
            return;
        }

        const btn = event.target.closest('.download-btn');
        const platform = btn.dataset.platform;
        const arch = btn.dataset.arch;
        const format = btn.dataset.format || null;
        
        this.showLoadingModal();
        
        try {
            const downloadInfo = await this.initiateDownload(platform, arch, format);
            this.hideModal('loadingModal');
            
            if (downloadInfo.success) {
                this.startDownload(downloadInfo.downloadUrl, downloadInfo.filename);
                this.trackDownload(platform, arch, format);
                this.showSuccess(`Download started: ${downloadInfo.filename}`);
            } else {
                this.showError(downloadInfo.error || 'Download failed. Please try again.');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.hideModal('loadingModal');
            this.showError('Download failed. Please check your connection and try again.');
        }
    }

    /**
     * Initiate download with API
     */
    async initiateDownload(platform, arch, format) {
        // Mock download initiation - replace with actual API call
        return new Promise(resolve => {
            setTimeout(() => {
                const buildNumber = '1.0.0-beta.1';
                const timestamp = new Date().toISOString().split('T')[0];
                
                let filename;
                let downloadUrl;
                
                switch (platform) {
                    case 'windows':
                        filename = `PokemonTracker-${buildNumber}-win-${arch}.exe`;
                        downloadUrl = `https://releases.pokemon-tracker.app/beta/${filename}`;
                        break;
                    case 'macos':
                        filename = `PokemonTracker-${buildNumber}-mac-${arch}.dmg`;
                        downloadUrl = `https://releases.pokemon-tracker.app/beta/${filename}`;
                        break;
                    case 'linux':
                        const extension = format || 'AppImage';
                        filename = `PokemonTracker-${buildNumber}-linux-${arch}.${extension}`;
                        downloadUrl = `https://releases.pokemon-tracker.app/beta/${filename}`;
                        break;
                }
                
                resolve({
                    success: true,
                    downloadUrl,
                    filename,
                    buildNumber,
                    platform,
                    arch,
                    format
                });
            }, 2000);
        });
    }

    /**
     * Start actual file download
     */
    startDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Handle access request form submission
     */
    async handleAccessRequest(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const requestData = {
            name: formData.get('requestName') || document.getElementById('requestName').value,
            email: formData.get('requestEmail') || document.getElementById('requestEmail').value,
            experience: document.getElementById('experience').value,
            platform: document.getElementById('platform').value,
            motivation: document.getElementById('motivation').value
        };
        
        const submitBtn = event.target.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        try {
            const result = await this.submitAccessRequest(requestData);
            
            if (result.success) {
                this.showSuccess('Access request submitted! We\'ll review your application and contact you soon.');
                event.target.reset();
                this.trackEvent('access_requested', { experience: requestData.experience, platform: requestData.platform });
            } else {
                this.showError(result.error || 'Failed to submit request. Please try again.');
            }
        } catch (error) {
            console.error('Access request error:', error);
            this.showError('Failed to submit request. Please check your connection and try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Submit access request to API
     */
    async submitAccessRequest(requestData) {
        // Mock submission - replace with actual API call
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    success: true,
                    requestId: 'req-' + Date.now(),
                    estimatedWaitTime: '3-5 business days'
                });
            }, 1500);
        });
    }

    /**
     * Format access key input as user types
     */
    formatAccessKeyInput(event) {
        const input = event?.target || document.getElementById('accessKey');
        if (!input) return;
        
        let value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        
        // Add dashes automatically
        if (value.length > 4 && !value.includes('-')) {
            value = 'BETA-' + value.slice(4);
        }
        
        input.value = value;
    }

    /**
     * Handle paste events for access key
     */
    handleKeyPaste(event) {
        event.preventDefault();
        
        const paste = (event.clipboardData || window.clipboardData).getData('text');
        const cleaned = paste.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        
        event.target.value = cleaned;
        this.formatAccessKeyInput({ target: event.target });
    }

    /**
     * Validate access key format
     */
    isValidKeyFormat(key) {
        const regex = /^BETA-[A-Z]{2}-[A-Z0-9]{8,12}-[A-Z0-9]{8,16}$/;
        return regex.test(key);
    }

    /**
     * Detect user's platform and highlight appropriate download
     */
    detectPlatform() {
        const platform = this.getPlatform();
        const cards = document.querySelectorAll('.download-card');
        
        cards.forEach(card => {
            const cardPlatform = card.querySelector('h3').textContent.toLowerCase();
            if (cardPlatform === platform) {
                card.classList.add('recommended');
                const badge = document.createElement('div');
                badge.className = 'recommended-badge';
                badge.textContent = 'Recommended for you';
                card.appendChild(badge);
            }
        });
    }

    /**
     * Get user's platform
     */
    getPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('windows')) return 'windows';
        if (userAgent.includes('mac')) return 'macos';
        if (userAgent.includes('linux')) return 'linux';
        
        return 'unknown';
    }

    /**
     * Load and display beta program statistics
     */
    async loadBetaStats() {
        try {
            const stats = await this.fetchBetaStats();
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Failed to load beta stats:', error);
        }
    }

    /**
     * Fetch beta statistics from API
     */
    async fetchBetaStats() {
        // Mock stats - replace with actual API call
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    totalUsers: 47,
                    currentPhase: 'CLOSED_ALPHA',
                    feedbackCount: 156,
                    phaseUsage: 23,
                    phaseCapacity: 50
                });
            }, 1000);
        });
    }

    /**
     * Update statistics display
     */
    updateStatsDisplay(stats) {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            currentPhase: document.getElementById('currentPhase'),
            feedbackCount: document.getElementById('feedbackCount')
        };

        if (elements.totalUsers) {
            elements.totalUsers.textContent = stats.totalUsers;
        }
        
        if (elements.currentPhase) {
            elements.currentPhase.textContent = stats.currentPhase.replace('_', ' ');
        }
        
        if (elements.feedbackCount) {
            elements.feedbackCount.textContent = stats.feedbackCount;
        }
    }

    /**
     * Track download for analytics
     */
    trackDownload(platform, arch, format) {
        this.downloadStats[platform]++;
        this.trackEvent('download_started', {
            platform,
            arch,
            format,
            user_phase: this.currentUser?.phase,
            user_role: this.currentUser?.role
        });
    }

    /**
     * Track events for analytics
     */
    trackEvent(eventName, properties = {}) {
        // Mock analytics tracking - replace with actual analytics service
        console.log('Analytics Event:', eventName, properties);
        
        // Example: Send to Google Analytics, Mixpanel, etc.
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, properties);
        }
    }

    /**
     * Show loading modal
     */
    showLoadingModal() {
        this.showModal('loadingModal');
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        if (successMessage) {
            successMessage.textContent = message;
        }
        this.showModal('successModal');
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        this.showModal('errorModal');
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// Global functions for HTML onclick handlers
function hideModal(modalId) {
    portalInstance.hideModal(modalId);
}

function showFeedbackForm() {
    alert('This would open the in-app feedback form in the beta application.');
}

// Initialize portal when DOM is loaded
let portalInstance;

document.addEventListener('DOMContentLoaded', () => {
    portalInstance = new BetaPortal();
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Handle window resize for responsive design
window.addEventListener('resize', () => {
    // Add any resize-specific logic here
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('Connection restored');
    // Could reload stats or retry failed requests
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
    // Could show offline notice
});
