// Keeping only essential authentication strategies
const passportLogin = require('./localStrategy');
const googleLogin = require('./googleStrategy');
const githubLogin = require('./githubStrategy');
const jwtLogin = require('./jwtStrategy');
const openIdJwtLogin = require('./openIdJwtStrategy');

// Removed: appleLogin, discordLogin, facebookLogin, ldapLogin, setupSaml, setupOpenId, getOpenIdConfig

module.exports = {
  passportLogin,
  googleLogin,
  githubLogin,
  jwtLogin,
  openIdJwtLogin,
};
