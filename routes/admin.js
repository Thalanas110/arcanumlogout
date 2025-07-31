const express = require('express');
const { db } = require('../database/connection');
const { logEntries, activityLog, adminSessions } = require('../database/schema');
const { eq, desc, and, or, ilike, inArray } = require('drizzle-orm');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Helper function to get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

// Helper function to log admin activity
async function logActivity(action, adminUser, targetId = null, details = {}, ipAddress = null) {
    try {
        await db.insert(activityLog).values({
            action,
            targetId,
            adminUser,
            details,
            ipAddress
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const ipAddress = getClientIP(req);

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            req.session.isAdmin = true;
            req.session.adminUser = username;
            
            // Log successful login
            await logActivity('login', username, null, { success: true }, ipAddress);
            
            res.json({ 
                success: true, 
                message: 'Login successful' 
            });
        } else {
            // Log failed login attempt
            await logActivity('login', username || 'unknown', null, { 
                success: false, 
                reason: 'Invalid credentials' 
            }, ipAddress);
            
            res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ 
            error: 'Login failed. Please try again.' 
        });
    }
});

// Admin logout
router.post('/logout', requireAuth, async (req, res) => {
    try {
        const adminUser = req.session.adminUser;
        const ipAddress = getClientIP(req);
        
        // Log logout
        await logActivity('logout', adminUser, null, {}, ipAddress);
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ error: 'Logout failed' });
            }
            res.json({ success: true, message: 'Logged out successfully' });
        });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Check admin authentication status
router.get('/auth-status', (req, res) => {
    res.json({ 
        isAuthenticated: !!req.session.isAdmin,
        user: req.session.adminUser || null 
    });
});

// Get dashboard statistics
router.get('/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const totalLogs = await db.select().from(logEntries);
        const recentActivity = await db.select()
            .from(activityLog)
            .orderBy(desc(activityLog.timestamp))
            .limit(10);

        // Get position distribution
        const positionStats = await db.select().from(logEntries);
        const positionCounts = {};
        positionStats.forEach(log => {
            positionCounts[log.position] = (positionCounts[log.position] || 0) + 1;
        });

        res.json({
            success: true,
            stats: {
                totalLogs: totalLogs.length,
                positionDistribution: positionCounts,
                recentActivity: recentActivity.slice(0, 10)
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Update log entry
router.put('/logs/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            position,
            startDate,
            endDate,
            attendeesBatch1,
            attendeesBatch2,
            droppedLinks,
            recruits,
            nicknamesSet,
            gameHandled
        } = req.body;

        // Calculate totals
        const attendeesTotal = (parseInt(attendeesBatch1) + parseInt(attendeesBatch2)) * 150;
        const droppedLinksTotal = parseInt(droppedLinks) * 100;
        const recruitsTotal = parseInt(recruits) * 500;
        const nicknamesSetTotal = parseInt(nicknamesSet) * 100;
        const gameHandledTotal = parseInt(gameHandled) * 1000;

        // Update the entry
        const result = await db.update(logEntries)
            .set({
                name,
                position,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                attendeesBatch1: parseInt(attendeesBatch1),
                attendeesBatch2: parseInt(attendeesBatch2),
                droppedLinks: parseInt(droppedLinks),
                recruits: parseInt(recruits),
                nicknamesSet: parseInt(nicknamesSet),
                gameHandled: parseInt(gameHandled),
                attendeesTotal,
                droppedLinksTotal,
                recruitsTotal,
                nicknamesSetTotal,
                gameHandledTotal,
                updatedAt: new Date()
            })
            .where(eq(logEntries.id, parseInt(id)))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ error: 'Log entry not found' });
        }

        // Log the update activity
        await logActivity('update', req.session.adminUser, parseInt(id), {
            changes: req.body
        }, getClientIP(req));

        res.json({ 
            success: true, 
            message: 'Log entry updated successfully',
            data: result[0]
        });

    } catch (error) {
        console.error('Error updating log entry:', error);
        res.status(500).json({ error: 'Failed to update log entry' });
    }
});

// Delete log entry
router.delete('/logs/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Get the entry before deletion for logging
        const existingEntry = await db.select()
            .from(logEntries)
            .where(eq(logEntries.id, parseInt(id)));

        if (existingEntry.length === 0) {
            return res.status(404).json({ error: 'Log entry not found' });
        }

        // Delete the entry
        await db.delete(logEntries).where(eq(logEntries.id, parseInt(id)));

        // Log the deletion
        await logActivity('delete', req.session.adminUser, parseInt(id), {
            deletedEntry: existingEntry[0]
        }, getClientIP(req));

        res.json({ 
            success: true, 
            message: 'Log entry deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting log entry:', error);
        res.status(500).json({ error: 'Failed to delete log entry' });
    }
});

// Bulk delete log entries
router.delete('/logs', requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No IDs provided for deletion' });
        }

        // Get entries before deletion for logging
        const existingEntries = await db.select()
            .from(logEntries)
            .where(inArray(logEntries.id, ids.map(id => parseInt(id))));

        // Delete the entries
        await db.delete(logEntries).where(inArray(logEntries.id, ids.map(id => parseInt(id))));

        // Log the bulk deletion
        await logActivity('bulk_delete', req.session.adminUser, null, {
            deletedCount: existingEntries.length,
            deletedIds: ids
        }, getClientIP(req));

        res.json({ 
            success: true, 
            message: `${existingEntries.length} log entries deleted successfully` 
        });

    } catch (error) {
        console.error('Error bulk deleting log entries:', error);
        res.status(500).json({ error: 'Failed to delete log entries' });
    }
});

// Get activity log
router.get('/activity-log', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const activities = await db.select()
            .from(activityLog)
            .orderBy(desc(activityLog.timestamp))
            .limit(parseInt(limit))
            .offset(offset);

        res.json({ 
            success: true, 
            data: activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});

// Export logs to CSV
router.get('/export', requireAuth, async (req, res) => {
    try {
        const { format = 'csv', ...filters } = req.query;

        // Build query with filters
        let query = db.select().from(logEntries);
        // Apply same filtering logic as the main logs endpoint
        // ... (filter implementation similar to api.js)

        const logs = await query.orderBy(desc(logEntries.createdAt));

        if (format === 'csv') {
            // Generate CSV
            const csvHeaders = [
                'ID', 'Name', 'Position', 'Start Date', 'End Date',
                'Attendees Batch 1', 'Attendees Batch 2', 'Attendees Total',
                'Dropped Links', 'Dropped Links Total',
                'Recruits', 'Recruits Total',
                'Nicknames Set', 'Nicknames Set Total',
                'Game Handled', 'Game Handled Total',
                'IP Address', 'Created At'
            ].join(',');

            const csvRows = logs.map(log => [
                log.id,
                `"${log.name}"`,
                log.position,
                log.startDate?.toISOString() || '',
                log.endDate?.toISOString() || '',
                log.attendeesBatch1,
                log.attendeesBatch2,
                log.attendeesTotal,
                log.droppedLinks,
                log.droppedLinksTotal,
                log.recruits,
                log.recruitsTotal,
                log.nicknamesSet,
                log.nicknamesSetTotal,
                log.gameHandled,
                log.gameHandledTotal,
                log.ipAddress || '',
                log.createdAt?.toISOString() || ''
            ].join(','));

            const csv = [csvHeaders, ...csvRows].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="arcanum_logs.csv"');
            res.send(csv);
        } else {
            res.json({ success: true, data: logs });
        }

        // Log the export activity
        await logActivity('export', req.session.adminUser, null, {
            format,
            recordCount: logs.length,
            filters
        }, getClientIP(req));

    } catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({ error: 'Failed to export logs' });
    }
});

module.exports = router;
// Get logs with pagination and filters
router.get('/logs', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, name, position, startDate, endDate } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = db.select().from(logEntries);
        let conditions = [];
        if (name) conditions.push(ilike(logEntries.name, `%${name}%`));
        if (position) conditions.push(eq(logEntries.position, position));
        // Filtering by startDate and endDate (if provided)
        if (startDate) conditions.push(logEntries.startDate >= new Date(startDate));
        if (endDate) conditions.push(logEntries.endDate <= new Date(endDate));
        if (conditions.length) query = query.where(and(...conditions));

        const logs = await query.orderBy(desc(logEntries.createdAt)).limit(parseInt(limit)).offset(offset);
        const total = (await db.select().from(logEntries)).length;

        // Map logs to snake_case for frontend compatibility
        const snakeCaseLogs = logs.map(log => ({
            id: log.id,
            name: log.name,
            position: log.position,
            start_date: log.startDate,
            end_date: log.endDate,
            attendees_batch1: log.attendeesBatch1,
            attendees_batch2: log.attendeesBatch2,
            dropped_links: log.droppedLinks,
            recruits: log.recruits,
            nicknames_set: log.nicknamesSet,
            game_handled: log.gameHandled,
            attendees_total: log.attendeesTotal,
            dropped_links_total: log.droppedLinksTotal,
            recruits_total: log.recruitsTotal,
            nicknames_set_total: log.nicknamesSetTotal,
            game_handled_total: log.gameHandledTotal,
            ip_address: log.ipAddress,
            created_at: log.createdAt,
            updated_at: log.updatedAt
        }));
        res.json({
            success: true,
            logs: snakeCaseLogs,
            total
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Alias for /admin/activity-log
router.get('/activity', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const activities = await db.select()
            .from(activityLog)
            .orderBy(desc(activityLog.timestamp))
            .limit(parseInt(limit))
            .offset(offset);
        res.json({
            success: true,
            activities
        });
    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});
