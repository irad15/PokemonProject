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