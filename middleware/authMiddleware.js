const jwt  = require('jsonwebtoken');
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

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split('')[1]    
    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, "1234",(err,decoded)=>{
        if(err){
            return res.status(403).json({message : "Invalid Token"})
        }
        req.user = decoded
        next();
    }) 
  };

module.exports = { verifyToken,authenticateToken };
