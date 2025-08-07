const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Import requireAuth middleware
const { requireAuth } = require('./auth');

// Import data manager utilities
const { 
    loadUserBattles, 
    saveUserBattles, 
    getBattlesToday, 
    canBattle, 
    recordBattle,
    loadUsers
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
    botBattles
} = require('../utils/arenaLogic');




// Arena API endpoints
router.get('/api/arena/status', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const battlesToday = getBattlesToday(userId);
        const canBattleToday = canBattle(userId);
        
        // Import loadUserFavorites from favorites route
        const { loadUserFavorites } = require('./favorites');
        const favorites = loadUserFavorites(userId);
        
        res.json({
            battlesUsed: battlesToday,
            battlesRemaining: 5 - battlesToday,
            canBattle: canBattleToday,
            hasFavorites: favorites.length > 0,
            favoritesCount: favorites.length
        });
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
        
        // Check if user has favorites
        if (favorites.length === 0) {
            return res.status(400).json({ error: 'You need at least one favorite Pokemon to enter battles' });
        }
        
        // Check if user can battle
        if (!canBattle(userId)) {
            return res.status(400).json({ error: 'You have used all 5 battles for today. Come back tomorrow!' });
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
        
        // Check if user has favorites
        if (favorites.length === 0) {
            return res.status(400).json({ error: 'You need at least one favorite Pokemon to enter battles' });
        }
        
        // Check if user can battle
        if (!canBattle(userId)) {
            return res.status(400).json({ error: 'You have used all 5 battles for today. Come back tomorrow!' });
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
        const battlesData = loadUserBattles(userId);
        
        res.json({
            battles: battlesData.battles,
            totalBattles: battlesData.battles.length
        });
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
        
        // Update current user's online status
        updateOnlineStatus(userId, firstName);
        
        // Get all online players
        const onlinePlayersList = getOnlinePlayers();
        
        res.json({
            players: onlinePlayersList
        });
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
        
        // Check if user can battle
        if (!canBattle(userId)) {
            return res.status(400).json({ error: 'You have used all 5 battles for today. Come back tomorrow!' });
        }
        
        // Check if opponent exists and is online
        const onlinePlayersList = getOnlinePlayers();
        const opponent = onlinePlayersList.find(p => p.id === opponentId);
        
        if (!opponent) {
            return res.status(400).json({ error: 'Opponent is no longer online' });
        }
        
        // Import loadUserFavorites from favorites route
        const { loadUserFavorites } = require('./favorites');
        
        // Check if user has favorites
        const userFavorites = loadUserFavorites(userId);
        if (userFavorites.length === 0) {
            return res.status(400).json({ error: 'You need at least one favorite Pokemon to battle' });
        }
        
        // Check if opponent has favorites
        const opponentFavorites = loadUserFavorites(opponentId);
        if (opponentFavorites.length === 0) {
            return res.status(400).json({ error: 'Opponent has no favorite Pokemon' });
        }
        
        // Check if there's already a pending challenge between these two users (either direction)
        for (const [challengeId, challenge] of pendingChallenges.entries()) {
            if (challenge.status === 'pending' && 
                ((challenge.challengerId === opponentId && challenge.opponentId === userId) ||
                 (challenge.challengerId === userId && challenge.opponentId === opponentId))) {
                return res.status(400).json({ error: 'There is already a pending challenge between you and this player. Please accept or decline it first.' });
            }
        }
        
        // Clear any existing accepted challenges for this user
        for (const [challengeId, challenge] of pendingChallenges.entries()) {
            if ((challenge.challengerId === userId || challenge.opponentId === userId) && 
                challenge.status === 'accepted') {
                pendingChallenges.delete(challengeId);
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
        cleanupExpiredChallenges();
        
        const userChallenges = Array.from(pendingChallenges.values()).filter(challenge => 
            challenge.opponentId === userId && challenge.status === 'pending'
        );
        
        res.json({
            challenges: userChallenges
        });
    } catch (error) {
        console.error('Error getting pending challenges:', error);
        res.status(500).json({ error: 'Failed to get pending challenges' });
    }
});

// API endpoint to check for accepted challenges for a user
router.get('/api/arena/accepted-challenges', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        cleanupExpiredChallenges();
        
        // Find accepted challenges where this user is either the challenger or opponent
        // and this user hasn't been notified yet
        const acceptedChallenge = Array.from(pendingChallenges.values()).find(challenge => 
            (challenge.challengerId === userId || challenge.opponentId === userId) && 
            challenge.status === 'accepted' &&
            !challenge.notifiedUsers?.includes(userId)
        );
        
        if (acceptedChallenge && acceptedChallenge.battleData) {
            // Mark this user as notified
            if (!acceptedChallenge.notifiedUsers) {
                acceptedChallenge.notifiedUsers = [];
            }
            acceptedChallenge.notifiedUsers.push(userId);
            
            res.json({
                challenge: {
                    ...acceptedChallenge,
                    ...acceptedChallenge.battleData
                }
            });
        } else {
            res.json({
                challenge: null
            });
        }
    } catch (error) {
        console.error('Error getting accepted challenges:', error);
        res.status(500).json({ error: 'Failed to get accepted challenges' });
    }
});

// API endpoint to check for declined challenges for a user
router.get('/api/arena/declined-challenges', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Find declined challenges where this user is the challenger
        const declinedChallenge = Array.from(declinedChallenges.values()).find(challenge => 
            challenge.challengerId === userId
        );
        
        if (declinedChallenge) {
            res.json({
                challenge: declinedChallenge
            });
        } else {
            res.json({
                challenge: null
            });
        }
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
        if (!challenge || challenge.opponentId !== userId) {
            return res.status(400).json({ error: 'Invalid challenge' });
        }
        
        if (challenge.status !== 'pending') {
            return res.status(400).json({ error: 'Challenge is no longer pending' });
        }
        
        // Check if both players can still battle
        if (!canBattle(challenge.challengerId) || !canBattle(userId)) {
            updateChallengeStatus(challengeId, 'expired');
            return res.status(400).json({ error: 'One or both players have used all battles for today' });
        }
        
        // Update challenge status
        updateChallengeStatus(challengeId, 'accepted');
        
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
        
        // Check if it's a bot battle
        if (battleId.startsWith('bot_')) {
            console.log('This is a bot battle');
            const botBattle = botBattles.get(battleId);
            console.log('Bot battle found:', !!botBattle);
            console.log('Available bot battles:', Array.from(botBattles.keys()));
            
            if (botBattle && botBattle.battleData) {
                console.log('Returning bot battle data');
                res.json({
                    battleData: botBattle.battleData
                });
                return;
            } else {
                console.log('Bot battle not found or missing battle data');
            }
        } else {
            console.log('This is a regular challenge');
            const challenge = getChallenge(battleId);
            console.log('Challenge found:', !!challenge);
            
            if (challenge && challenge.battleData) {
                res.json({
                    battleData: challenge.battleData
                });
                return;
            }
        }
        
        console.log('Battle data not found for ID:', battleId);
        res.status(404).json({ error: 'Battle data not found' });
        
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
        
        // Check if user can battle
        if (!canBattle(userId)) {
            return res.status(400).json({ error: 'You have used all 5 battles for today. Come back tomorrow!' });
        }
        
        // Generate a unique battle ID for the bot battle
        const battleId = `bot_${userId}_${Date.now()}`;
        console.log('Generated battle ID:', battleId);
        
        // Create battle data using shared function
        try {
            const battleData = createBattleData(player1Pokemon, player2Pokemon, 'You', 'Bot', userId, 'bot');
        
            // Store the bot battle data (display format for battle page)
            botBattles.set(battleId, {
                battleData: battleData.display,
                createdAt: Date.now()
            });
            
            console.log('Bot battle stored. Total bot battles:', botBattles.size);
            console.log('Available bot battles:', Array.from(botBattles.keys()));
            
            // Record the battle for the user (storage format for battles.json)
            recordBattle(userId, 'bot', 'Bot', battleData.storage);
            
            res.json({
                battleId: battleId,
                message: 'Bot battle created successfully'
            });
        } catch (error) {
            console.error('Error creating battle data:', error);
            res.status(500).json({ error: 'Failed to create battle data' });
            return;
        }
        
    } catch (error) {
        console.error('Error creating bot battle:', error);
        res.status(500).json({ error: 'Failed to create bot battle' });
    }
});

module.exports = { 
    router
}; 