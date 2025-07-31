// Authentication middleware for admin routes
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    } else {
        return res.status(401).json({ 
            error: 'Unauthorized. Admin access required.' 
        });
    }
}

module.exports = { requireAuth };
