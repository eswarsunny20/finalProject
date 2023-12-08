const { generateApiKey } = require('../models/apiKeys');

const apiKeys = new Set();

const verifyToken = (req, res, next) => {
  const apiKey = req.headers['api-key'];
  apiKeys.add(apiKey)
//   console.log('Received API Key:', apiKey);
  if (!apiKey) {
    return res.status(403).json({ error: 'API key is missing' });
  }

  if (!apiKeys.has(apiKey)) {
    console.error('Invalid API Key:', apiKey);
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

module.exports = { verifyToken };
