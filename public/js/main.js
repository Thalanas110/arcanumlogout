// Main form functionality
class LogFormManager {
    constructor() {
        this.form = document.getElementById('logForm');
        this.metricInputs = document.querySelectorAll('.metric-input');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.modalOverlay = document.getElementById('modalOverlay');
        
        if (this.form) {
            this.init();
        }
    }

    init() {
        this.bindEvents();
        this.setupRealTimeCalculation();
        this.setDefaultDate();
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Modal close events
        const modalClose = document.getElementById('modalClose');
        const modalOk = document.getElementById('modalOk');
        
        [modalClose, modalOk].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.hideModal();
                });
            }
        });

        // Close modal when clicking overlay
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.hideModal();
            }
        });

        // Prevent negative values in number inputs
        this.metricInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                if (e.target.value < 0) {
                    e.target.value = 0;
                }
            });
        });
    }

    setupRealTimeCalculation() {
        // Add event listeners to all metric inputs for real-time calculation
        this.metricInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.calculateTotals();
            });
        });

        // Initial calculation
        this.calculateTotals();
    }

    calculateTotals() {
        const values = this.getFormValues();
        
        // Calculate individual totals based on formulas
        const attendeesTotal = (values.attendeesBatch1 + values.attendeesBatch2) * 150;
        const droppedLinksTotal = values.droppedLinks * 100;
        const recruitsTotal = values.recruits * 500;
        const nicknamesSetTotal = values.nicknamesSet * 100;
        const gameHandledTotal = values.gameHandled * 1000;
        
        // Update display
        this.updateTotalDisplay('attendeesTotal', attendeesTotal);
        this.updateTotalDisplay('droppedLinksTotal', droppedLinksTotal);
        this.updateTotalDisplay('recruitsTotal', recruitsTotal);
        this.updateTotalDisplay('nicknamesSetTotal', nicknamesSetTotal);
        this.updateTotalDisplay('gameHandledTotal', gameHandledTotal);
        
        // Calculate and display grand total
        const grandTotal = attendeesTotal + droppedLinksTotal + recruitsTotal + 
                          nicknamesSetTotal + gameHandledTotal;
        this.updateTotalDisplay('grandTotal', grandTotal);
    }

    getFormValues() {
        return {
            name: document.getElementById('name').value,
            position: document.getElementById('position').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            attendeesBatch1: parseInt(document.getElementById('attendeesBatch1').value) || 0,
            attendeesBatch2: parseInt(document.getElementById('attendeesBatch2').value) || 0,
            droppedLinks: parseInt(document.getElementById('droppedLinks').value) || 0,
            recruits: parseInt(document.getElementById('recruits').value) || 0,
            nicknamesSet: parseInt(document.getElementById('nicknamesSet').value) || 0,
            gameHandled: parseInt(document.getElementById('gameHandled').value) || 0
        };
    }

    updateTotalDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatNumber(value);
        }
    }

    formatNumber(num) {
        return num.toLocaleString();
    }

    setDefaultDate() {
        const startDateInput = document.getElementById('startDate');
        if (startDateInput && !startDateInput.value) {
            const now = new Date();
            const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
            startDateInput.value = localDateTime.toISOString().slice(0, 16);
        }
    }

    async handleSubmit() {
        const values = this.getFormValues();
        
        // Validate required fields
        if (!values.name || !values.position || !values.startDate) {
            this.showModal('Validation Error', 'Please fill in all required fields (Name, Position, and Start Date).');
            return;
        }

        try {
            this.showLoading('Submitting your log entry...');
            
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values)
            });

            const data = await response.json();

            if (data.success) {
                this.showModal('Success! ✨', 'Your log entry has been submitted successfully!');
                this.resetForm();
            } else {
                throw new Error(data.error || 'Submission failed');
            }

        } catch (error) {
            console.error('Submission error:', error);
            this.showModal('Submission Failed', error.message || 'Failed to submit log entry. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    resetForm() {
        this.form.reset();
        this.setDefaultDate();
        this.calculateTotals();
    }

    showLoading(message = 'Loading...') {
        const loadingText = document.querySelector('#loadingOverlay p');
        if (loadingText) {
            loadingText.textContent = message;
        }
        this.loadingOverlay.classList.add('active');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }

    showModal(title, message) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        this.modalOverlay.classList.add('active');
    }

    hideModal() {
        this.modalOverlay.classList.remove('active');
    }
}

// Utility functions
const Utils = {
    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format date range
    formatDateRange(startDate, endDate) {
        const start = this.formatDate(startDate);
        if (endDate) {
            const end = this.formatDate(endDate);
            return `${start} - ${end}`;
        }
        return `${start} - ongoing`;
    },

    // Capitalize first letter
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10001',
            maxWidth: '400px',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        });

        // Set background color based on type
        const colors = {
            success: '#059669',
            error: '#dc2626',
            warning: '#d97706',
            info: '#0ea5e9'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Handle close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'white';
        closeBtn.style.fontSize = '1.25rem';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.padding = '0';

        closeBtn.addEventListener('click', () => {
            this.hideNotification(notification);
        });

        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideNotification(notification);
        }, 5000);
    },

    hideNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.logFormManager = new LogFormManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LogFormManager, Utils };
}
