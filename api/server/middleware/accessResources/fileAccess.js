const { logger } = require('@librechat/data-schemas');
const { PermissionBits, hasPermissions, ResourceType } = require('librechat-data-provider');
const { getEffectivePermissions } = require('~/server/services/PermissionService');
const { getFiles } = require('~/models/File');

/**
 * Checks if user has access to a file through agent permissions
 * Files inherit permissions from agents - if you can view the agent, you can access its files
 * NOTE: Agents have been removed, so this function now returns false
 */
const checkAgentBasedFileAccess = async ({ userId, role, fileId }) => {
  logger.info(`Agent-based file access check attempted for file ${fileId}, but agents are disabled`);
  return false;
};

/**
 * Middleware to check if user can access a file
 * Checks: 1) File ownership, 2) Agent-based access (file inherits agent permissions)
 */
const fileAccess = async (req, res, next) => {
  try {
    const fileId = req.params.file_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!fileId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'file_id is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const [file] = await getFiles({ file_id: fileId });
    if (!file) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'File not found',
      });
    }

    if (file.user && file.user.toString() === userId) {
      req.fileAccess = { file };
      return next();
    }

    /** Agent-based access (file inherits agent permissions) */
    const hasAgentAccess = await checkAgentBasedFileAccess({ userId, role: userRole, fileId });
    if (hasAgentAccess) {
      req.fileAccess = { file };
      return next();
    }

    logger.warn(`[fileAccess] User ${userId} denied access to file ${fileId}`);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions to access this file',
    });
  } catch (error) {
    logger.error('[fileAccess] Error checking file access:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check file access permissions',
    });
  }
};

module.exports = {
  fileAccess,
};
