const jwt  = require('jsonwebtoken');
const { generateApiKey } = require('../models/apiKeys');
const crypto = require('crypto');
const secureSecretKey = crypto.randomBytes(32).toString('hex');

const apiKeys = new Set();

const generateKey = (req, res) => {
  const apiKey = generateApiKey();
  apiKeys.add(apiKey);
  return apiKey;
}

const verifyToken = (req, res, next) => {
  const headerapiKey = req.headers['api-key'];
  // apiKeys.add(apiKey)
  if (!headerapiKey) {
    return res.status(403).json({ error: 'API key is missing' });
  }

  if (!apiKeys.has(headerapiKey)) {
    console.error('Invalid API Key:', apiKey);
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = req.session.token; 
    // const token = authHeader && authHeader.split(' ')[1]    
    if (!token) {
      return res.status(403).render("partials/error", {message: 'Please Login Before accessing any secure routes' });
    }

    jwt.verify(token, secureSecretKey,(err,decoded)=>{
        if(err){
            return res.status(403).json({message : "Invalid Token"})
        }
        // console.log('Decoded Token:', decoded);
        req.user = decoded
        next();
    }) 
  };

module.exports = { verifyToken,authenticateToken,secureSecretKey ,generateKey};
