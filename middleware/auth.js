// Authentication middleware for admin routes
function requireAuth(req, res, next) {
    // Try cookie-based session first
    if (req.session && req.session.isAdmin) {
        return next();
    }
    
    // Check for specific admin cookie as fallback
    const adminCookie = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('adminAuth='));
        
    if (adminCookie) {
        const [_, value] = adminCookie.split('=');
        if (value === process.env.ADMIN_PASSWORD) {
            req.session.isAdmin = true;
            req.session.adminUser = process.env.ADMIN_USERNAME;
            return next();
        }
    }

    return res.status(401).json({ 
        error: 'Unauthorized. Admin access required.' 
    });
}

module.exports = { requireAuth };
