const express = require('express');
const { db } = require('../database/connection');
const { logEntries, activityLog } = require('../database/schema');
const { eq, desc, and, or, ilike, between } = require('drizzle-orm');

const router = express.Router();

// Helper function to get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

// Helper function to extract MAC address from request (limited in web context)
function getMACAddress(req) {
    // In a web context, MAC address cannot be directly obtained
    // This is a placeholder for network-level tracking if implemented
    return req.headers['x-mac-address'] || 'unavailable';
}

// Calculate totals based on the given formulas
function calculateTotals(data) {
    const attendeesTotal = (data.attendeesBatch1 + data.attendeesBatch2) * 150;
    const droppedLinksTotal = data.droppedLinks * 100;
    const recruitsTotal = data.recruits * 500;
    const nicknamesSetTotal = data.nicknamesSet * 100;
    const gameHandledTotal = data.gameHandled * 1000;
    
    return {
        attendeesTotal,
        droppedLinksTotal,
        recruitsTotal,
        nicknamesSetTotal,
        gameHandledTotal
    };
}

// Submit new log entry
router.post('/submit', async (req, res) => {
    try {
        const {
            name,
            position,
            startDate,
            endDate,
            attendeesBatch1 = 0,
            attendeesBatch2 = 0,
            droppedLinks = 0,
            recruits = 0,
            nicknamesSet = 0,
            gameHandled = 0
        } = req.body;

        // Validate required fields
        if (!name || !position || !startDate) {
            return res.status(400).json({ 
                error: 'Name, position, and start date are required' 
            });
        }

        // Calculate totals
        const totals = calculateTotals({
            attendeesBatch1: parseInt(attendeesBatch1),
            attendeesBatch2: parseInt(attendeesBatch2),
            droppedLinks: parseInt(droppedLinks),
            recruits: parseInt(recruits),
            nicknamesSet: parseInt(nicknamesSet),
            gameHandled: parseInt(gameHandled)
        });

        // Get tracking information
        const ipAddress = getClientIP(req);
        const macAddress = getMACAddress(req);
        const userAgent = req.headers['user-agent'];

        // Insert log entry
        const result = await db.insert(logEntries).values({
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
            ...totals,
            ipAddress,
            macAddress,
            userAgent
        }).returning();

        res.json({ 
            success: true, 
            message: 'Log entry submitted successfully',
            data: result[0]
        });

    } catch (error) {
        console.error('Error submitting log entry:', error);
        res.status(500).json({ 
            error: 'Failed to submit log entry. Please try again.' 
        });
    }
});

// Get all log entries (for admin)
router.get('/logs', async (req, res) => {
    try {
        const { 
            search, 
            position, 
            startDate, 
            endDate, 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 50
        } = req.query;

        let query = db.select().from(logEntries);
        let conditions = [];

        // Apply filters
        if (search) {
            conditions.push(
                or(
                    ilike(logEntries.name, `%${search}%`),
                    ilike(logEntries.position, `%${search}%`)
                )
            );
        }

        if (position && position !== 'all') {
            conditions.push(eq(logEntries.position, position));
        }

        if (startDate && endDate) {
            conditions.push(
                between(logEntries.startDate, new Date(startDate), new Date(endDate))
            );
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // Apply sorting
        const sortField = logEntries[sortBy] || logEntries.createdAt;
        query = query.orderBy(sortOrder === 'asc' ? sortField : desc(sortField));

        // Apply pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.limit(parseInt(limit)).offset(offset);

        const logs = await query;

        res.json({ 
            success: true, 
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: logs.length
            }
        });

    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ 
            error: 'Failed to fetch log entries' 
        });
    }
});

// Calculate preview totals (for real-time calculation)
router.post('/calculate', (req, res) => {
    try {
        const {
            attendeesBatch1 = 0,
            attendeesBatch2 = 0,
            droppedLinks = 0,
            recruits = 0,
            nicknamesSet = 0,
            gameHandled = 0
        } = req.body;

        const totals = calculateTotals({
            attendeesBatch1: parseInt(attendeesBatch1),
            attendeesBatch2: parseInt(attendeesBatch2),
            droppedLinks: parseInt(droppedLinks),
            recruits: parseInt(recruits),
            nicknamesSet: parseInt(nicknamesSet),
            gameHandled: parseInt(gameHandled)
        });

        res.json({ success: true, totals });

    } catch (error) {
        console.error('Error calculating totals:', error);
        res.status(500).json({ 
            error: 'Failed to calculate totals' 
        });
    }
});

module.exports = router;
