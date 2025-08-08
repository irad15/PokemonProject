/**
 * Page Routes - Server-side JavaScript
 * 
 * This file handles all static page serving and routing for the Pokemon project.
 * It manages the delivery of HTML pages and static assets to clients.
 * 
 * Key Features:
 * - Static page serving (HTML files)
 * - Route protection and authentication checks
 * - Error page handling (404, 500)
 * - Static asset serving (CSS, JS, images)
 * - Page routing and navigation
 * 
 * Works with:
 * - All HTML files in views/ directory
 * - Static assets in public/ directory
 * - Authentication middleware for protected routes
 * - Client-side JavaScript files
 * 
 * Dependencies: Express.js routing system
 */

const express = require('express');
const path = require('path');
const router = express.Router();

// Import requireAuth middleware
const { requireAuth } = require('./auth');

// Protected page routes - require authentication
router.get('/search', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'search_pokemon.html'));
});

router.get('/favorites', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'favorite_pokemon.html'));
});

router.get('/arena', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'arena.html'));
});

// Battle page routes
router.get('/arena/vs-bot', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'vs-bot.html'));
});

router.get('/arena/random-vs-player', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'random-vs-player.html'));
});

router.get('/arena/battle', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'battle.html'));
});

router.get('/arena/leaderboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'leaderboard.html'));
});

module.exports = { router }; 