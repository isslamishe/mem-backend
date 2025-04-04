const jwt = require("jsonwebtoken");
const jwt_key =  process.env.jwt_key || "la flame"; 
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token,jwt_key); 
   
    req.user = decoded; 
    next(); 
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
};

module.exports = authMiddleware;
