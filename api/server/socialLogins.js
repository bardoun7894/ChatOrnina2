const passport = require('passport');
const { logger } = require('@librechat/data-schemas');
const {
  googleLogin,
  githubLogin,
} = require('~/strategies');

/**
 * Configures social logins for the application
 * Only supports Google and GitHub OAuth
 * @param {Express.Application} app - The Express application instance (not used but kept for API compatibility)
 */
const configureSocialLogins = async (app) => {
  logger.info('Configuring social logins...');

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(googleLogin());
    logger.info('Google OAuth configured.');
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(githubLogin());
    logger.info('GitHub OAuth configured.');
  }

  logger.info('Social logins configuration complete.');
};

module.exports = configureSocialLogins;
