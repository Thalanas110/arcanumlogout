// Admin Panel JavaScript
class AdminPanel {
    updatePagination() {
        this.renderPagination();
    }
    constructor() {
        this.currentLogs = [];
        this.currentPage = 1;
        this.logsPerPage = 10;
        this.totalLogs = 0;
        this.currentEditId = null;
        this.filters = {
            name: '',
            position: '',
            startDate: '',
            endDate: ''
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDashboard();
        this.loadLogs();
        this.loadRecentActivity();
    }

    bindEvents() {
        // Navigation - Updated to use correct selectors
        document.querySelectorAll('.nav-link').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget.getAttribute('data-tab');
                this.showSection(target);
            });
        });

        // Search functionality
        document.getElementById('searchLogs')?.addEventListener('input', (e) => {
            this.filters.name = e.target.value;
            this.searchLogs();
        });

        // Filter dropdowns - Updated to match HTML IDs
        document.getElementById('positionFilter')?.addEventListener('change', (e) => {
            this.filters.position = e.target.value === 'all' ? '' : e.target.value;
            this.searchLogs();
        });

        document.getElementById('dateFromFilter')?.addEventListener('change', (e) => {
            this.filters.startDate = e.target.value;
            this.searchLogs();
        });

        document.getElementById('dateToFilter')?.addEventListener('change', (e) => {
            this.filters.endDate = e.target.value;
            this.searchLogs();
        });

        // Refresh buttons
        document.getElementById('refreshLogsBtn')?.addEventListener('click', () => {
            this.loadLogs();
        });

        document.getElementById('refreshActivityBtn')?.addEventListener('click', () => {
            this.loadRecentActivity();
        });

        // Export functionality - Updated to match HTML structure
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportLogs();
        });

        document.getElementById('exportSelectedBtn')?.addEventListener('click', () => {
            this.exportSelectedLogs();
        });

        // Edit modal events
        document.getElementById('editModalClose')?.addEventListener('click', () => {
            this.hideModal('editModal');
        });

        document.getElementById('editModalCancel')?.addEventListener('click', () => {
            this.hideModal('editModal');
        });

        document.getElementById('editModalSave')?.addEventListener('click', () => {
            this.saveLogEdit();
        });

        // Confirm modal events
        document.getElementById('confirmModalClose')?.addEventListener('click', () => {
            this.hideModal('confirmModal');
        });

        document.getElementById('confirmModalCancel')?.addEventListener('click', () => {
            this.hideModal('confirmModal');
        });

        document.getElementById('confirmModalConfirm')?.addEventListener('click', () => {
            this.confirmAction();
        });

        // Logout - Multiple logout buttons
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
        document.getElementById('desktopLogoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
        document.getElementById('mobileLogoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.tab-content').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from nav items
        document.querySelectorAll('.nav-link').forEach(item => {
            item.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Add active class to clicked nav item
        const activeNav = document.querySelector(`[data-tab="${sectionName}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        // Load section-specific data
        if (sectionName === 'dashboard') {
            this.loadDashboard();
        } else if (sectionName === 'logs') {
            this.loadLogs();
        } else if (sectionName === 'activity') {
            this.loadRecentActivity();
        }
    }

    async loadDashboard() {
        try {
            this.showLoading('Loading dashboard...');
            
            const response = await fetch('/admin/dashboard-stats', {
                credentials: 'same-origin'  // Include cookies in request
            });
            const data = await response.json();

            if (data.success) {
                document.getElementById('totalLogs').textContent = data.stats.totalLogs || 0;
                document.getElementById('todayLogs').textContent = data.stats.todayLogs || 0;
                document.getElementById('weeklyLogs').textContent = data.stats.thisWeekLogs || 0;
                document.getElementById('activePositions').textContent = data.stats.activePositions || 0;
            }

            this.hideLoading();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.hideLoading();
            this.showError('Failed to load dashboard statistics');
        }
    }

    async loadLogs() {
        try {
            this.showLoading('Loading logs...');
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.logsPerPage,
                ...this.filters
            });

            const response = await fetch(`/admin/logs?${params}`, {
                credentials: 'same-origin'  // Include cookies in request
            });
            const data = await response.json();

            if (data.success) {
                this.currentLogs = data.logs;
                this.totalLogs = data.total;
                this.renderLogsTable();
                this.updatePagination();
            }

            this.hideLoading();
        } catch (error) {
            console.error('Error loading logs:', error);
            this.hideLoading();
            this.showError('Failed to load logs');
        }
    }

    renderLogsTable() {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.currentLogs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        No log entries found matching your criteria
                    </td>
                </tr>
            `;
            return;
        }

        this.currentLogs.forEach(log => {
            const totalPoints = (log.attendees_total || 0) + (log.dropped_links_total || 0) + 
                              (log.recruits_total || 0) + (log.nicknames_set_total || 0) + 
                              (log.game_handled_total || 0);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="row-checkbox" value="${log.id}">
                </td>
                <td>${this.escapeHtml(log.name)}</td>
                <td><span class="position-badge">${this.escapeHtml(log.position)}</span></td>
                <td>
                    <div class="date-range">
                        <div class="start-date">${this.formatDate(log.start_date)}</div>
                        ${log.end_date ? `<div class="end-date">→ ${this.formatDate(log.end_date)}</div>` : '<div class="ongoing">Ongoing</div>'}
                    </div>
                </td>
                <td>
                    <div class="metrics-summary">
                        <span title="Attendees">👥 ${log.attendees_total || 0}</span>
                        <span title="Dropped Links">🔗 ${log.dropped_links_total || 0}</span>
                        <span title="Recruits">🎯 ${log.recruits_total || 0}</span>
                        <span title="Nicknames">🏷️ ${log.nicknames_set_total || 0}</span>
                        <span title="Games">🎮 ${log.game_handled_total || 0}</span>
                    </div>
                </td>
                <td>
                    <div class="total-points">
                        <strong>${totalPoints}</strong> pts
                    </div>
                </td>
                <td>
                    <div class="created-date">
                        ${this.formatDateTime(log.created_at)}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="adminPanel.editLog(${log.id})" title="Edit log">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteLog(${log.id})" title="Delete log">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Update pagination
        this.renderPagination();
    }

    renderPagination() {
        const paginationContainer = document.getElementById('logsPagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.totalLogs / this.logsPerPage);
        const startIndex = (this.currentPage - 1) * this.logsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.logsPerPage, this.totalLogs);

        paginationContainer.innerHTML = `
            <div class="pagination-info">
                Showing ${startIndex}-${endIndex} of ${this.totalLogs} entries
            </div>
            <div class="pagination-controls">
                <button class="btn btn-sm ${this.currentPage === 1 ? 'disabled' : ''}" 
                        ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="adminPanel.goToPage(${this.currentPage - 1})">‹ Previous</button>
                
                ${this.renderPageNumbers(totalPages)}
                
                <button class="btn btn-sm ${this.currentPage === totalPages ? 'disabled' : ''}" 
                        ${this.currentPage === totalPages ? 'disabled' : ''} 
                        onclick="adminPanel.goToPage(${this.currentPage + 1})">Next ›</button>
            </div>
        `;
    }

    renderPageNumbers(totalPages) {
        const maxVisible = 5;
        let pages = [];
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const start = Math.max(1, this.currentPage - 2);
            const end = Math.min(totalPages, start + maxVisible - 1);
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }

        return pages.map(page => 
            `<button class="btn btn-sm page-number ${page === this.currentPage ? 'active' : ''}" 
                     onclick="adminPanel.goToPage(${page})">${page}</button>`
        ).join('');
    }

    goToPage(page) {
        if (page < 1 || page > Math.ceil(this.totalLogs / this.logsPerPage)) return;
        this.currentPage = page;
        this.loadLogs();
    }

    async loadRecentActivity() {
        try {
            this.showLoading('Loading activity...');
            
            const response = await fetch('/admin/activity', {
                credentials: 'same-origin'  // Include cookies in request
            });
            const data = await response.json();

            if (data.success) {
                this.renderActivityTable(data.activities);
            }

            this.hideLoading();
        } catch (error) {
            console.error('Error loading activity:', error);
            this.hideLoading();
            this.showError('Failed to load activity log');
        }
    }

    renderActivityTable(activities) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        activityList.innerHTML = '';

        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item empty">
                    <div class="activity-content">
                        <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                            No recent activity found
                        </p>
                    </div>
                </div>
            `;
            return;
        }

        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    ${this.getActivityIcon(activity.action)}
                </div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-user">${this.escapeHtml(activity.admin_user)}</span>
                        <span class="activity-action">${this.escapeHtml(activity.action)}</span>
                        <span class="activity-time">${this.formatDateTime(activity.timestamp)}</span>
                    </div>
                    <div class="activity-details">
                        ${activity.target_id ? `Target ID: ${activity.target_id}` : ''}
                        ${activity.details ? `• ${this.formatActivityDetails(activity.details)}` : ''}
                    </div>
                    <div class="activity-meta">
                        <span class="activity-ip">IP: ${activity.ip_address || 'Unknown'}</span>
                    </div>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    }

    getActivityIcon(action) {
        const icons = {
            'login': '🔐',
            'logout': '🚪',
            'create': '➕',
            'update': '✏️',
            'delete': '🗑️',
            'export': '📤',
            'view': '👁️',
            'search': '🔍'
        };
        return icons[action.toLowerCase()] || '📋';
    }

    formatActivityDetails(details) {
        if (typeof details === 'string') return details;
        if (typeof details === 'object') {
            return Object.entries(details).map(([key, value]) => 
                `${key}: ${value}`
            ).join(', ');
        }
        return JSON.stringify(details);
    }

    async editLog(logId) {
        try {
            const log = this.currentLogs.find(l => l.id === logId);
            if (!log) return;

            this.currentEditId = logId;
            
            // Populate edit form
            document.getElementById('editName').value = log.name;
            document.getElementById('editPosition').value = log.position;
            document.getElementById('editStartDate').value = this.formatDateForInput(log.start_date);
            document.getElementById('editEndDate').value = log.end_date ? this.formatDateForInput(log.end_date) : '';
            document.getElementById('editAttendeesBatch1').value = log.attendees_batch1 || 0;
            document.getElementById('editAttendeesBatch2').value = log.attendees_batch2 || 0;
            document.getElementById('editDroppedLinks').value = log.dropped_links || 0;
            document.getElementById('editRecruits').value = log.recruits || 0;
            document.getElementById('editNicknamesSet').value = log.nicknames_set || 0;
            document.getElementById('editGameHandled').value = log.game_handled || 0;

            this.showModal('editModal');
        } catch (error) {
            console.error('Error editing log:', error);
            this.showError('Failed to load log for editing');
        }
    }

    async saveLogEdit() {
        try {
            const formData = {
                name: document.getElementById('editName').value,
                position: document.getElementById('editPosition').value,
                start_date: document.getElementById('editStartDate').value,
                end_date: document.getElementById('editEndDate').value || null,
                attendees_batch1: parseInt(document.getElementById('editAttendeesBatch1').value) || 0,
                attendees_batch2: parseInt(document.getElementById('editAttendeesBatch2').value) || 0,
                dropped_links: parseInt(document.getElementById('editDroppedLinks').value) || 0,
                recruits: parseInt(document.getElementById('editRecruits').value) || 0,
                nicknames_set: parseInt(document.getElementById('editNicknamesSet').value) || 0,
                game_handled: parseInt(document.getElementById('editGameHandled').value) || 0
            };

            this.showLoading('Saving changes...');

            const response = await fetch(`/admin/logs/${this.currentEditId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',  // Include cookies in request
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.hideModal('editModal');
                this.loadLogs();
                this.showSuccess('Log updated successfully');
            } else {
                this.showError(data.message || 'Failed to update log');
            }

            this.hideLoading();
        } catch (error) {
            console.error('Error saving log:', error);
            this.hideLoading();
            this.showError('Failed to save changes');
        }
    }

    deleteLog(logId) {
        this.pendingAction = () => this.performDeleteLog(logId);
        document.getElementById('confirmModalTitle').textContent = 'Delete Log';
        document.getElementById('confirmModalMessage').textContent = 'Are you sure you want to delete this log? This action cannot be undone.';
        this.showModal('confirmModal');
    }

    async performDeleteLog(logId) {
        try {
            this.showLoading('Deleting log...');

            const response = await fetch(`/admin/logs/${logId}`, {
                method: 'DELETE',
                credentials: 'same-origin'  // Include cookies in request
            });

            const data = await response.json();

            if (data.success) {
                this.hideModal('confirmModal');
                this.loadLogs();
                this.showSuccess('Log deleted successfully');
            } else {
                this.showError(data.message || 'Failed to delete log');
            }

            this.hideLoading();
        } catch (error) {
            console.error('Error deleting log:', error);
            this.hideLoading();
            this.showError('Failed to delete log');
        }
    }

    confirmAction() {
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
    }

    searchLogs() {
        this.currentPage = 1;
        this.loadLogs();
    }

    clearFilters() {
        this.filters = {
            name: '',
            position: '',
            startDate: '',
            endDate: ''
        };

        document.getElementById('searchLogs').value = '';
        document.getElementById('positionFilter').value = 'all';
        document.getElementById('dateFromFilter').value = '';
        document.getElementById('dateToFilter').value = '';

        this.searchLogs();
    }

    exportSelectedLogs() {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.showError('Please select logs to export');
            return;
        }
        
        this.exportLogs(selectedIds);
    }

    async exportLogs(selectedIds = null) {
        try {
            this.showLoading('Preparing export...');

            let params = new URLSearchParams();
            
            if (selectedIds && selectedIds.length > 0) {
                params.append('ids', selectedIds.join(','));
            } else {
                // Use current filters for export
                Object.entries(this.filters).forEach(([key, value]) => {
                    if (value) params.append(key, value);
                });
            }

            const response = await fetch(`/admin/logs/export?${params}`, {
                credentials: 'same-origin'  // Include cookies in request
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `arcanum_logs_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('Export completed successfully');
            } else {
                this.showError('Failed to export logs');
            }

            this.hideLoading();
        } catch (error) {
            console.error('Error exporting logs:', error);
            this.hideLoading();
            this.showError('Failed to export logs');
        }
    }

    async logout() {
        try {
            const response = await fetch('/admin/logout', { 
                method: 'POST',
                credentials: 'same-origin'  // Include cookies in request
            });
            if (response.ok) {
                window.location.href = '/admin-login';
            }
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/admin-login';
        }
    }

    // Utility methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showLoading(message = 'Loading...') {
        document.getElementById('loadingText').textContent = message;
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${this.escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString();
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});