const crypto = require("crypto")

function validPassword(password, hash, salt) {
  if(!hash || !salt) return false
  var hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

function genPassword(password,salt) {
  var genHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return genHash
}

module.exports = {validPassword, genPassword}