const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// Create PostgreSQL connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

// Parse DATABASE_URL manually to handle special characters
function parseConnectionString(url) {
    try {
        // Try parsing as URL first
        const urlObj = new URL(url);
        return {
            host: urlObj.hostname,
            port: parseInt(urlObj.port) || 5432,
            database: urlObj.pathname.slice(1),
            username: urlObj.username,
            password: urlObj.password,
            ssl: true
        };
    } catch (error) {
        // If URL parsing fails, try manual parsing
        console.log('URL parsing failed, attempting manual parsing...');
        
        // Extract components manually using regex
        const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        if (match) {
            return {
                host: match[3],
                port: parseInt(match[4]),
                database: match[5],
                username: match[1],
                password: match[2],
                ssl: true
            };
        }
        
        throw new Error('Unable to parse connection string');
    }
}

// Create postgres client with manual connection parameters
let client;
try {
    console.log('Attempting to connect to database...');
    
    // Parse connection string manually to avoid URI encoding issues
    const dbConfig = parseConnectionString(connectionString);
    
    client = postgres({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        username: dbConfig.username,
        password: dbConfig.password,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idle_timeout: 20,
        connect_timeout: 60,
    });
    
    console.log('Database client created successfully');
    
} catch (error) {
    console.error('Database connection error:', error.message);
    console.log('\nTroubleshooting your DATABASE_URL:');
    console.log('1. Make sure you copied the complete connection string from Supabase');
    console.log('2. Verify you replaced [YOUR-PASSWORD] with your actual password');
    console.log('3. If your password has special characters (@, !, %, etc.), try changing it to use only letters and numbers');
    console.log('4. Make sure the connection string starts with "postgresql://"');
    
    // Show example format (without revealing actual credentials)
    const maskedUrl = connectionString ? connectionString.replace(/:[^@]+@/, ':****@') : 'Not provided';
    console.log(`\nCurrent DATABASE_URL format: ${maskedUrl}`);
    console.log('Expected format: postgresql://postgres:password@db.project.supabase.co:5432/postgres');
    
    throw new Error('Failed to establish database connection. Please check your DATABASE_URL.');
}

// Create drizzle instance
const db = drizzle(client);

module.exports = { db, client };
