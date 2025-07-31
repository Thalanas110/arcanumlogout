// Theme management functionality
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.bindEvents();
    }

    bindEvents() {
        // Find all theme toggle buttons
        const toggleButtons = document.querySelectorAll('.theme-toggle');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.toggleTheme();
            });
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.theme);
        localStorage.setItem('theme', this.theme);
    }

    applyTheme(theme) {
        const body = document.body;
        const toggleButtons = document.querySelectorAll('.theme-toggle');
        
        if (theme === 'dark') {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            
            toggleButtons.forEach(button => {
                const icon = button.querySelector('.theme-icon');
                const text = button.querySelector('.theme-text');
                if (icon) icon.textContent = '☀️';
                if (text) text.textContent = 'Light Mode';
            });
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            
            toggleButtons.forEach(button => {
                const icon = button.querySelector('.theme-icon');
                const text = button.querySelector('.theme-text');
                if (icon) icon.textContent = '🌙';
                if (text) text.textContent = 'Dark Mode';
            });
        }
    }

    getCurrentTheme() {
        return this.theme;
    }
}

// Navigation management for mobile
class NavigationManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const navToggle = document.getElementById('navToggle');
        const mobileNavContent = document.getElementById('mobileNavContent');
        
        if (navToggle && mobileNavContent) {
            navToggle.addEventListener('click', () => {
                this.toggleMobileNav();
            });

            // Close mobile nav when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.mobile-nav')) {
                    this.closeMobileNav();
                }
            });

            // Close mobile nav when window is resized to desktop
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    this.closeMobileNav();
                }
            });
        }
    }

    toggleMobileNav() {
        const navToggle = document.getElementById('navToggle');
        const mobileNavContent = document.getElementById('mobileNavContent');
        
        if (navToggle && mobileNavContent) {
            navToggle.classList.toggle('active');
            mobileNavContent.classList.toggle('active');
        }
    }

    closeMobileNav() {
        const navToggle = document.getElementById('navToggle');
        const mobileNavContent = document.getElementById('mobileNavContent');
        
        if (navToggle && mobileNavContent) {
            navToggle.classList.remove('active');
            mobileNavContent.classList.remove('active');
        }
    }
}

// Initialize theme and navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
    window.navigationManager = new NavigationManager();
});

// Utility functions for theme-aware components
const ThemeUtils = {
    // Get current theme
    getCurrentTheme() {
        return window.themeManager ? window.themeManager.getCurrentTheme() : 'light';
    },

    // Check if dark theme is active
    isDarkTheme() {
        return this.getCurrentTheme() === 'dark';
    },

    // Get theme-appropriate color
    getThemeColor(lightColor, darkColor) {
        return this.isDarkTheme() ? darkColor : lightColor;
    },

    // Apply theme-specific styles to elements
    applyThemeStyles(element, styles = {}) {
        const theme = this.getCurrentTheme();
        const themeStyles = styles[theme] || {};
        
        Object.keys(themeStyles).forEach(property => {
            element.style[property] = themeStyles[property];
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManager, NavigationManager, ThemeUtils };
}
