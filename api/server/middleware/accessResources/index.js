const { canAccessResource } = require('./canAccessResource');
const { canAccessPromptViaGroup } = require('./canAccessPromptViaGroup');
const { canAccessPromptGroupResource } = require('./canAccessPromptGroupResource');

module.exports = {
  canAccessResource,
  canAccessPromptViaGroup,
  canAccessPromptGroupResource,
};
