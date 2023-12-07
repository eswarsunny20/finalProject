const crypto = require('crypto');

const generateApiKey = () => {
  return crypto.randomBytes(10).toString('hex');
};

module.exports = { generateApiKey };
