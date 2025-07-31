// Database migration script to create all required tables
const { db, client } = require('./connection');

async function createTables() {
    console.log('Creating database tables...');
    
    try {
        // Create log_entries table
        await client`
            CREATE TABLE IF NOT EXISTS log_entries (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT NOT NULL,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP,
                
                -- Metric inputs
                attendees_batch1 INTEGER DEFAULT 0,
                attendees_batch2 INTEGER DEFAULT 0,
                dropped_links INTEGER DEFAULT 0,
                recruits INTEGER DEFAULT 0,
                nicknames_set INTEGER DEFAULT 0,
                game_handled INTEGER DEFAULT 0,
                
                -- Calculated values
                attendees_total INTEGER DEFAULT 0,
                dropped_links_total INTEGER DEFAULT 0,
                recruits_total INTEGER DEFAULT 0,
                nicknames_set_total INTEGER DEFAULT 0,
                game_handled_total INTEGER DEFAULT 0,
                
                -- Tracking data
                ip_address TEXT,
                mac_address TEXT,
                user_agent TEXT,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log('✓ Created log_entries table');

        // Create activity_log table
        await client`
            CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                action TEXT NOT NULL,
                target_id INTEGER,
                admin_user TEXT NOT NULL,
                details JSONB,
                ip_address TEXT,
                timestamp TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log('✓ Created activity_log table');

        // Create admin_sessions table
        await client`
            CREATE TABLE IF NOT EXISTS admin_sessions (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                login_time TIMESTAMP DEFAULT NOW(),
                last_activity TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT true
            )
        `;
        console.log('✓ Created admin_sessions table');

        // Create indexes for better performance
        await client`
            CREATE INDEX IF NOT EXISTS idx_log_entries_position ON log_entries(position)
        `;
        await client`
            CREATE INDEX IF NOT EXISTS idx_log_entries_created_at ON log_entries(created_at)
        `;
        await client`
            CREATE INDEX IF NOT EXISTS idx_log_entries_name ON log_entries(name)
        `;
        await client`
            CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp)
        `;
        await client`
            CREATE INDEX IF NOT EXISTS idx_activity_log_admin_user ON activity_log(admin_user)
        `;
        console.log('✓ Created database indexes');

        console.log('🎉 Database setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        throw error;
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    createTables()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { createTables };