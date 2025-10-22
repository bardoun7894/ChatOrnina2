const { logger } = require('@librechat/data-schemas');
const { PermissionBits, ResourceType } = require('librechat-data-provider');
const { checkPermission } = require('~/server/services/PermissionService');

/**
 * Checks if a user has access to multiple files through a shared agent (batch operation)
 * NOTE: Agents have been removed, so this function now returns false for all files
 * @param {Object} params - Parameters object
 * @param {string} params.userId - The user ID to check access for
 * @param {string} [params.role] - Optional user role to avoid DB query
 * @param {Array<string>} params.fileIds - Array of file IDs to check access for
 * @param {string} params.agentId - Agent ID (no longer used)
 * @param {boolean} [params.isDelete=false] - Whether to check for delete permission
 * @returns {Map<string, boolean>} Map of file IDs to access status (all false)
 */
const hasAccessToFilesViaAgent = async ({ userId, role, fileIds, agentId, isDelete = false }) => {
  const accessMap = new Map();

  // Initialize all files as no access since agents are removed
  fileIds.forEach((fileId) => accessMap.set(fileId, false));

  logger.info(`Agent-based file access check attempted for agent ${agentId}, but agents are disabled`);

  return accessMap;
};

/**
 * Filter files based on user access through agents
 * @param {Object} params - Parameters object
 * @param {Array<MongoFile>} params.files - Array of file documents
 * @param {string} params.userId - User ID for access control
 * @param {string} [params.role] - Optional user role to avoid DB query
 * @param {string} params.agentId - Agent ID that might grant access to files
 * @returns {Promise<Array<MongoFile>>} Filtered array of accessible files
 */
const filterFilesByAgentAccess = async ({ files, userId, role, agentId }) => {
  if (!userId || !agentId || !files || files.length === 0) {
    return files;
  }

  // Separate owned files from files that need access check
  const filesToCheck = [];
  const ownedFiles = [];

  for (const file of files) {
    if (file.user && file.user.toString() === userId.toString()) {
      ownedFiles.push(file);
    } else {
      filesToCheck.push(file);
    }
  }

  if (filesToCheck.length === 0) {
    return ownedFiles;
  }

  // Batch check access for all non-owned files
  const fileIds = filesToCheck.map((f) => f.file_id);
  const accessMap = await hasAccessToFilesViaAgent({ userId, role, fileIds, agentId });

  // Filter files based on access
  const accessibleFiles = filesToCheck.filter((file) => accessMap.get(file.file_id));

  return [...ownedFiles, ...accessibleFiles];
};

module.exports = {
  hasAccessToFilesViaAgent,
  filterFilesByAgentAccess,
};
