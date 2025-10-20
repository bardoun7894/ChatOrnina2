const { logger } = require('@librechat/data-schemas');

/**
 * Middleware to check if the authenticated user has admin role
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
const checkAdmin = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('[checkAdmin] Unauthorized access attempt - no user');
      return res.status(401).json({
        message: 'Unauthorized',
        error: 'Authentication required'
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      logger.warn(`[checkAdmin] Forbidden access attempt by user: ${req.user.id}`);
      return res.status(403).json({
        message: 'Forbidden',
        error: 'Admin access required'
      });
    }

    // User is admin, proceed
    logger.debug(`[checkAdmin] Admin access granted to user: ${req.user.id}`);
    next();
  } catch (error) {
    logger.error('[checkAdmin] Error checking admin role:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: 'Failed to verify admin access'
    });
  }
};

module.exports = checkAdmin;
