const { pgTable, serial, text, integer, timestamp, jsonb, boolean } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Log entries table
const logEntries = pgTable('log_entries', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    position: text('position').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    
    // Metric inputs
    attendeesBatch1: integer('attendees_batch1').default(0),
    attendeesBatch2: integer('attendees_batch2').default(0),
    droppedLinks: integer('dropped_links').default(0),
    recruits: integer('recruits').default(0),
    nicknamesSet: integer('nicknames_set').default(0),
    gameHandled: integer('game_handled').default(0),
    
    // Calculated values
    attendeesTotal: integer('attendees_total').default(0),
    droppedLinksTotal: integer('dropped_links_total').default(0),
    recruitsTotal: integer('recruits_total').default(0),
    nicknamesSetTotal: integer('nicknames_set_total').default(0),
    gameHandledTotal: integer('game_handled_total').default(0),
    
    // Tracking data
    ipAddress: text('ip_address'),
    macAddress: text('mac_address'),
    userAgent: text('user_agent'),
    
    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Activity log table for admin actions
const activityLog = pgTable('activity_log', {
    id: serial('id').primaryKey(),
    action: text('action').notNull(), // 'create', 'update', 'delete', 'login', 'view'
    targetId: integer('target_id'), // ID of the log entry affected
    adminUser: text('admin_user').notNull(),
    details: jsonb('details'), // Additional action details
    ipAddress: text('ip_address'),
    timestamp: timestamp('timestamp').defaultNow(),
});

// Admin sessions table
const adminSessions = pgTable('admin_sessions', {
    id: serial('id').primaryKey(),
    sessionId: text('session_id').notNull().unique(),
    username: text('username').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    loginTime: timestamp('login_time').defaultNow(),
    lastActivity: timestamp('last_activity').defaultNow(),
    isActive: boolean('is_active').default(true),
});

module.exports = {
    logEntries,
    activityLog,
    adminSessions,
};
