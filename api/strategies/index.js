// Keeping only essential authentication strategies
const passportLogin = require('./localStrategy');
const googleLogin = require('./googleStrategy');
const githubLogin = require('./githubStrategy');
const jwtLogin = require('./jwtStrategy');

// Removed: appleLogin, discordLogin, facebookLogin, ldapLogin, setupSaml, setupOpenId, getOpenIdConfig, openIdJwtLogin

module.exports = {
  passportLogin,
  googleLogin,
  githubLogin,
  jwtLogin,
};
