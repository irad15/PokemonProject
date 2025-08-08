/**
 * Arena Routes - Server-side JavaScript
 * 
 * This file handles all arena-related server endpoints including battle management,
 * user statistics, and battle history tracking.
 * 
 * Key Features:
 * - Battle result recording and storage
 * - User statistics and performance tracking
 * - Battle history retrieval and display
 * - Leaderboard data management
 * - User ranking calculations
 * - Battle data validation and processing
 * 
 * Works with:
 * - /api/arena/battle (battle recording endpoint)
 * - /api/arena/history (battle history endpoint)
 * - /api/arena/leaderboard (leaderboard data endpoint)
 * - dataManager.js (for battle data persistence)
 * - arenaLogic.js (for battle calculations)
 * - Client-side battle pages (vs-bot, random-vs-player)
 * 
 * Dependencies: dataManager.js, arenaLogic.js (for battle logic and data management)
 */

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Import requireAuth middleware
const { requireAuth } = require('./auth');

// Import data manager utilities
const { 
    loadUserBattles, 
    getBattlesToday, 
    canBattle, 
    recordBattle,
} = require('../utils/dataManager');

// Import arena logic functions
const {
    updateOnlineStatus,
    removeOnlineStatus,
    getOnlinePlayers,
    createChallenge,
    getChallenge,
    updateChallengeStatus,
    cleanupExpiredChallenges,
    createBattleData,
    calculateBattleScore,
    recordPlayerBattle,
    calculateLeaderboard,
    pendingChallenges,
    declinedChallenges,
    botBattles,
    validateBattleEligibility,
    validateChallengeEligibility,
    validateChallengeAcceptance,
    checkExistingChallenges,
    clearAcceptedChallenges,
    createBotBattle,
    getArenaStatus,
    getBattleHistory,
    getOnlinePlayersStatus,
    getPendingChallengesForUser,
    getAcceptedChallengesForUser,
    getDeclinedChallengesForUser,
    getBattleData
} = require('../utils/arenaLogic');




// Arena API endpoints
router.get('/api/arena/status', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Import loadUserFavorites from favorites route
        const { loadUserFavorites } = require('./favorites');
        const favorites = loadUserFavorites(userId);
        
        const status = getArenaStatus(userId, favorites);
        res.json(status);
    } catch (error) {
        console.error('Error getting arena status:', error);
        res.status(500).json({ error: 'Failed to get arena status' });
    }
});

router.post('/api/arena/battle/bot', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Import loadUserFavorites from favorites route
        const { loadUserFavorites } = require('./favorites');
        const favorites = loadUserFavorites(userId);
        
        // Validate battle eligibility
        const errors = validateBattleEligibility(userId, favorites);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0] });
        }
        
        // Record the battle
        recordBattle(userId, 'bot');
        
        res.json({
            message: 'Battle against bot recorded',
            battlesUsed: getBattlesToday(userId),
            battlesRemaining: 5 - getBattlesToday(userId)
        });
    } catch (error) {
        console.error('Error recording bot battle:', error);
        res.status(500).json({ error: 'Failed to record battle' });
    }
});

router.post('/api/arena/battle/player', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Import loadUserFavorites from favorites route
        const { loadUserFavorites } = require('./favorites');
        const favorites = loadUserFavorites(userId);
        
        // Validate battle eligibility
        const errors = validateBattleEligibility(userId, favorites);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0] });
        }
        
        // Record the battle
        recordBattle(userId, 'player');
        
        res.json({
            message: 'Battle against player recorded',
            battlesUsed: getBattlesToday(userId),
            battlesRemaining: 5 - getBattlesToday(userId)
        });
    } catch (error) {
        console.error('Error recording player battle:', error);
        res.status(500).json({ error: 'Failed to record battle' });
    }
});

router.get('/api/arena/history', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const history = getBattleHistory(userId);
        res.json(history);
    } catch (error) {
        console.error('Error getting battle history:', error);
        res.status(500).json({ error: 'Failed to get battle history' });
    }
});

// API endpoint to get leaderboard data
router.get('/api/leaderboard', requireAuth, (req, res) => {
    try {
        const currentUserId = req.session.userId;
        const leaderboard = calculateLeaderboard(currentUserId);
        
        res.json({
            leaderboard: leaderboard
        });
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// API endpoint to get online players
router.get('/api/arena/online-players', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const firstName = req.session.userFirstName;
        
        const status = getOnlinePlayersStatus(userId, firstName);
        res.json(status);
    } catch (error) {
        console.error('Error getting online players:', error);
        res.status(500).json({ error: 'Failed to get online players' });
    }
});

// API endpoint to remove player from online status
router.post('/api/arena/remove-online', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Remove current user from online players
        removeOnlineStatus(userId);
        
        res.json({
            message: 'Removed from online players'
        });
    } catch (error) {
        console.error('Error removing online status:', error);
        res.status(500).json({ error: 'Failed to remove online status' });
    }
});

// API endpoint to send a challenge to a player
router.post('/api/arena/send-challenge', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { opponentId } = req.body;
        
        // Check if opponent exists and is online
        const onlinePlayersList = getOnlinePlayers();
        const opponent = onlinePlayersList.find(p => p.id === opponentId);
        
        if (!opponent) {
            return res.status(400).json({ error: 'Opponent is no longer online' });
        }
        
        // Import loadUserFavorites from favorites route
        const { loadUserFavorites } = require('./favorites');
        
        // Get both users' favorites
        const userFavorites = loadUserFavorites(userId);
        const opponentFavorites = loadUserFavorites(opponentId);
        
        // Validate challenge eligibility
        const errors = validateChallengeEligibility(userId, opponentId, userFavorites, opponentFavorites);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0] });
        }
        
        // Check for existing challenges
        const existingChallengeError = checkExistingChallenges(userId, opponentId);
        if (existingChallengeError) {
            return res.status(400).json({ error: existingChallengeError });
        }
        
        // Clear any existing accepted challenges for this user
        clearAcceptedChallenges(userId);
        
        // Clear any existing declined challenges for this user to prevent old alerts
        for (const [challengeId, declinedChallenge] of declinedChallenges.entries()) {
            if (declinedChallenge.challengerId === userId || declinedChallenge.opponentId === userId) {
                declinedChallenges.delete(challengeId);
            }
        }
        
        // Create challenge
        const challenge = createChallenge(
            userId, 
            req.session.userFirstName, 
            opponentId, 
            opponent.firstName
        );
        
        res.json({
            message: 'Challenge sent successfully',
            challengeId: challenge.id
        });
        
    } catch (error) {
        console.error('Error sending challenge:', error);
        res.status(500).json({ error: 'Failed to send challenge' });
    }
});

// API endpoint to get pending challenges for a user
router.get('/api/arena/pending-challenges', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const challenges = getPendingChallengesForUser(userId);
        res.json(challenges);
    } catch (error) {
        console.error('Error getting pending challenges:', error);
        res.status(500).json({ error: 'Failed to get pending challenges' });
    }
});

// API endpoint to check for accepted challenges for a user
router.get('/api/arena/accepted-challenges', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const acceptedChallenge = getAcceptedChallengesForUser(userId);
        res.json(acceptedChallenge);
    } catch (error) {
        console.error('Error getting accepted challenges:', error);
        res.status(500).json({ error: 'Failed to get accepted challenges' });
    }
});

// API endpoint to check for declined challenges for a user
router.get('/api/arena/declined-challenges', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const declinedChallenge = getDeclinedChallengesForUser(userId);
        res.json(declinedChallenge);
    } catch (error) {
        console.error('Error getting declined challenges:', error);
        res.status(500).json({ error: 'Failed to get declined challenges' });
    }
});

// API endpoint to accept a challenge
router.post('/api/arena/accept-challenge', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { challengeId } = req.body;
        
        const challenge = getChallenge(challengeId);
        
        // Validate challenge acceptance
        const errors = validateChallengeAcceptance(challenge, userId);
        if (errors.length > 0) {
            if (errors.includes('One or both players have used all battles for today')) {
                updateChallengeStatus(challengeId, 'expired');
            }
            return res.status(400).json({ error: errors[0] });
        }
        
        // If challenge is already accepted, just return the redirect URL
        if (challenge.status === 'accepted') {
            return res.json({
                challengeId: challengeId,
                redirectUrl: `/arena/battle?challengeId=${challengeId}`
            });
        }
        
        // Update challenge status
        updateChallengeStatus(challengeId, 'accepted');
        
        // Clear any declined challenge data for this challenge to prevent false alerts
        declinedChallenges.delete(challengeId);
        
        // Import loadUserFavorites from favorites route
        const { loadUserFavorites } = require('./favorites');
        
        // Get both users' favorites
        const challengerFavorites = loadUserFavorites(challenge.challengerId);
        const opponentFavorites = loadUserFavorites(userId);
        
        // Randomly select Pokemon for each player
        const challengerPokemonId = challengerFavorites[Math.floor(Math.random() * challengerFavorites.length)].id;
        const opponentPokemonId = opponentFavorites[Math.floor(Math.random() * opponentFavorites.length)].id;
        
        // Fetch Pokemon data from PokeAPI
        const [challengerPokemon, opponentPokemon] = await Promise.all([
            fetch(`https://pokeapi.co/api/v2/pokemon/${challengerPokemonId}`).then(res => res.json()),
            fetch(`https://pokeapi.co/api/v2/pokemon/${opponentPokemonId}`).then(res => res.json())
        ]);
        
        // Create battle data using shared function
        const battleData = createBattleData(challengerPokemon, opponentPokemon, challenge.challengerName, challenge.opponentName, challenge.challengerId, userId);
        challenge.battleData = battleData.display; // Use display format for battle page
        
        // Record the battle for both players (using storage format)
        recordPlayerBattle(challenge.challengerId, userId, challenge.challengerName, challenge.opponentName, challengerPokemon, opponentPokemon);
        
        // Mark the accepting user as notified since they're being redirected immediately
        if (!challenge.notifiedUsers) {
            challenge.notifiedUsers = [];
        }
        challenge.notifiedUsers.push(userId);
        
        res.json({
            challengeId: challengeId,
            redirectUrl: `/arena/battle?challengeId=${challengeId}`
        });
        
    } catch (error) {
        console.error('Error accepting challenge:', error);
        res.status(500).json({ error: 'Failed to accept challenge' });
    }
});

// API endpoint to decline a challenge
router.post('/api/arena/decline-challenge', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const { challengeId } = req.body;
        
        const challenge = getChallenge(challengeId);
        if (!challenge || challenge.opponentId !== userId) {
            return res.status(400).json({ error: 'Invalid challenge' });
        }
        
        updateChallengeStatus(challengeId, 'declined');
        
        // Store declined challenge for the challenger to see
        const declinedChallenge = {
            ...challenge,
            declinedBy: req.session.userFirstName,
            declinedAt: Date.now()
        };
        declinedChallenges.set(challengeId, declinedChallenge);
        
        res.json({
            message: 'Challenge declined'
        });
    } catch (error) {
        console.error('Error declining challenge:', error);
        res.status(500).json({ error: 'Failed to decline challenge' });
    }
});

// API endpoint to get battle data for a challenge or bot battle
router.get('/api/arena/battle-data/:battleId', requireAuth, (req, res) => {
    try {
        const battleId = req.params.battleId;
        console.log('Requesting battle data for ID:', battleId);
        
        const battleData = getBattleData(battleId);
        
        if (battleData) {
            console.log('Returning battle data');
            res.json(battleData);
        } else {
            console.log('Battle data not found for ID:', battleId);
            res.status(404).json({ error: 'Battle data not found' });
        }
        
    } catch (error) {
        console.error('Error getting battle data:', error);
        res.status(500).json({ error: 'Failed to get battle data' });
    }
});

// API endpoint to create a bot battle
router.post('/api/arena/create-bot-battle', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { player1Pokemon, player2Pokemon } = req.body;
        
        console.log('Creating bot battle for user:', userId);
        console.log('Player 1 Pokemon:', player1Pokemon.name);
        console.log('Player 2 Pokemon:', player2Pokemon.name);
        
        const result = await createBotBattle(userId, player1Pokemon, player2Pokemon);
        
        console.log('Bot battle stored. Total bot battles:', botBattles.size);
        console.log('Available bot battles:', Array.from(botBattles.keys()));
        
        res.json(result);
        
    } catch (error) {
        console.error('Error creating bot battle:', error);
        res.status(500).json({ error: error.message || 'Failed to create bot battle' });
    }
});

module.exports = { 
    router
}; 