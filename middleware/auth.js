const supabase = require('../utils/supabase');

// Authentication middleware for admin routes
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            throw error || new Error('User not found');
        }

        // Check if the user's email matches admin email
        if (user.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ error: 'Not authorized as admin' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { requireAuth };
