const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_jwt_secret';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Email Domain Validation (Company Members Only)
    // Allowed: @krutanic.org, krutanic.com, krutanic.net, krutanic.in
    const allowedDomains = ['@krutanic.org', 'krutanic.com', 'krutanic.net', 'krutanic.in'];
    const isAllowed = allowedDomains.some(domain => 
      email.toLowerCase().trim().endsWith(domain.toLowerCase())
    );

    if (!isAllowed) {
      return res.status(403).json({ 
        success: false, 
        error: 'Registration restricted to Krutanic company members only.' 
      });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }

    const user = await User.create({ name, email, password });
    
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email }, token } });
  } catch (err) {
    logger.error(`[authRoutes] Register error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    let user = await User.findOne({ email });
    let isLegacy = false;

    // Fallback to legacy 'users' collection if not found in 'bastuser'
    if (!user) {
      const db = require('mongoose').connection.db;
      const legacyUser = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
      
      if (legacyUser) {
        // Create a temporary User instance to use the comparePassword method
        user = new User(legacyUser);
        isLegacy = true;
      }
    }
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // If it was a legacy user, migrate them to 'bastuser'
    if (isLegacy) {
      try {
        const userData = user.toObject();
        // Insert into 'bastuser' (handled by User.create or User.save)
        await User.create(userData);
        // Remove from legacy 'users' collection
        const db = require('mongoose').connection.db;
        await db.collection('users').deleteOne({ _id: user._id });
        logger.info(`[authRoutes] Migrated legacy user: ${email}`);
      } catch (migrationErr) {
        logger.error(`[authRoutes] Migration error for ${email}: ${migrationErr.message}`);
        // We continue anyway since login was successful, but ideally migration should succeed
      }
    }
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email }, token } });
  } catch (err) {
    logger.error(`[authRoutes] Login error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
