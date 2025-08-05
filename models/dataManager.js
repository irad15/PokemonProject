const fs = require('fs');
const path = require('path');

// File system utilities
const dataDir = path.join(__dirname, '..', 'Data');
const usersFile = path.join(dataDir, 'users.json');

// Initialize data directory and files
const initializeDataFiles = () => {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
    }
};

// User favorites management
const getUserFavoritesFile = (userId) => path.join(dataDir, userId, 'favorites.json');

const loadUserFavorites = (userId) => {
    const favoritesFile = getUserFavoritesFile(userId);
    if (fs.existsSync(favoritesFile)) {
        return JSON.parse(fs.readFileSync(favoritesFile, 'utf8'));
    }
    return [];
};

const saveUserFavorites = (userId, favorites) => {
    const favoritesFile = getUserFavoritesFile(userId);
    fs.writeFileSync(favoritesFile, JSON.stringify(favorites, null, 2));
};

const ensureUserFavoritesDir = (userId) => {
    const userDir = path.join(dataDir, userId);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
};

// User battles management
const getUserBattlesFile = (userId) => path.join(dataDir, userId, 'battles.json');

const loadUserBattles = (userId) => {
    const battlesFile = getUserBattlesFile(userId);
    if (fs.existsSync(battlesFile)) {
        return JSON.parse(fs.readFileSync(battlesFile, 'utf8'));
    }
    return { battles: [] };
};

const saveUserBattles = (userId, battlesData) => {
    const battlesFile = getUserBattlesFile(userId);
    fs.writeFileSync(battlesFile, JSON.stringify(battlesData, null, 2));
};

const getBattlesToday = (userId) => {
    const battlesData = loadUserBattles(userId);
    const today = new Date().toDateString();
    
    return battlesData.battles.filter(battle => {
        const battleDate = new Date(battle.timestamp).toDateString();
        return battleDate === today;
    });
};

const canBattle = (userId) => {
    const battlesToday = getBattlesToday(userId);
    return battlesToday.length < 5; // Maximum 5 battles per day
};

const recordBattle = (userId, battleType, opponent = null, battleDetails = null) => {
    const battlesData = loadUserBattles(userId);
    
    const battleRecord = {
        id: Date.now().toString(),
        type: battleType,
        timestamp: new Date().toISOString(),
        opponent: opponent,
        details: battleDetails
    };
    
    battlesData.battles.push(battleRecord);
    saveUserBattles(userId, battlesData);
};

const recordPlayerBattle = (player1Id, player2Id, player1Name, player2Name, player1Pokemon, player2Pokemon) => {
    // Determine winner
    const player1Score = player1Pokemon.battleScore;
    const player2Score = player2Pokemon.battleScore;
    
    let result;
    if (player1Score > player2Score) {
        result = 'won';
    } else if (player2Score > player1Score) {
        result = 'lost';
    } else {
        result = 'tie';
    }
    
    // Record for player 1
    const player1Details = {
        myPokemon: player1Pokemon,
        opponentPokemon: player2Pokemon,
        opponentName: player2Name,
        result: result
    };
    recordBattle(player1Id, 'player-vs-player', player2Name, player1Details);
    
    // Record for player 2
    const player2Details = {
        myPokemon: player2Pokemon,
        opponentPokemon: player1Pokemon,
        opponentName: player1Name,
        result: result === 'won' ? 'lost' : result === 'lost' ? 'won' : 'tie'
    };
    recordBattle(player2Id, 'player-vs-player', player1Name, player2Details);
};

// Online status management
const onlineUsers = new Map();

const updateOnlineStatus = (userId, firstName) => {
    onlineUsers.set(userId, {
        id: userId,
        firstName: firstName,
        lastSeen: Date.now()
    });
};

const getOnlinePlayers = () => {
    const now = Date.now();
    const onlinePlayers = [];
    
    for (const [userId, userData] of onlineUsers.entries()) {
        // Consider user online if they've been active in the last 30 seconds
        if (now - userData.lastSeen < 30000) {
            onlinePlayers.push(userData);
        } else {
            onlineUsers.delete(userId);
        }
    }
    
    return onlinePlayers;
};

// Challenge management
const pendingChallenges = new Map();
const declinedChallenges = new Map();
const botBattles = new Map();

const createChallenge = (challengerId, challengerName, opponentId, opponentName) => {
    const challengeId = Date.now().toString();
    const challenge = {
        id: challengeId,
        challengerId: challengerId,
        challengerName: challengerName,
        opponentId: opponentId,
        opponentName: opponentName,
        status: 'pending',
        timestamp: Date.now()
    };
    
    pendingChallenges.set(challengeId, challenge);
    return challenge;
};

const getChallenge = (challengeId) => {
    return pendingChallenges.get(challengeId);
};

const updateChallengeStatus = (challengeId, status) => {
    const challenge = pendingChallenges.get(challengeId);
    if (challenge) {
        challenge.status = status;
    }
};

const cleanupExpiredChallenges = () => {
    const now = Date.now();
    for (const [challengeId, challenge] of pendingChallenges.entries()) {
        // Remove expired challenges (30 seconds)
        if (now - challenge.timestamp > 30000) {
            pendingChallenges.delete(challengeId);
        }
        // Remove accepted challenges where both users have been notified
        else if (challenge.status === 'accepted' && 
                 challenge.notifiedUsers && 
                 challenge.notifiedUsers.length >= 2) {
            pendingChallenges.delete(challengeId);
        }
    }
    
    // Clean up declined challenges after 10 seconds
    for (const [challengeId, challenge] of declinedChallenges.entries()) {
        if (now - challenge.declinedAt > 10000) { // 10 seconds
            declinedChallenges.delete(challengeId);
        }
    }
    
    // Clean up bot battles after 10 minutes
    for (const [battleId, botBattle] of botBattles.entries()) {
        if (now - botBattle.createdAt > 600000) { // 10 minutes
            botBattles.delete(battleId);
        }
    }
};

// Battle score calculation
const calculateBattleScore = (pokemon) => {
    const hp = pokemon.stats[0].base_stat;
    const attack = pokemon.stats[1].base_stat;
    const defense = pokemon.stats[2].base_stat;
    const speed = pokemon.stats[5].base_stat;
    
    // Formula: HP × 0.3 + Attack × 0.4 + Defense × 0.2 + Speed × 0.1 + smallRandVal
    const baseScore = hp * 0.3 + attack * 0.4 + defense * 0.2 + speed * 0.1;
    const smallRandVal = Math.random() * 2; // Small random value for variety
    
    return baseScore + smallRandVal;
};

// Leaderboard calculation
const calculateLeaderboard = (currentUserId) => {
    try {
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const leaderboardData = [];
        
        for (const user of users) {
            const userId = user.id;
            const battlesData = loadUserBattles(userId);
            
            // Only include users with at least 5 battles
            if (battlesData.battles.length < 5) {
                continue;
            }
            
            // Get the 10 most recent battles
            const recentBattles = battlesData.battles
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10);
            
            if (recentBattles.length === 0) {
                continue;
            }
            
            // Calculate statistics
            let wins = 0;
            let draws = 0;
            let totalScore = 0;
            
            recentBattles.forEach(battle => {
                if (battle.details) {
                    // Calculate total score from battle details
                    if (battle.details.myPokemon && battle.details.opponentPokemon) {
                        totalScore += (battle.details.myPokemon.score || 0);
                    } else if (battle.details.player1Pokemon && battle.details.player2Pokemon) {
                        totalScore += (battle.details.player1Pokemon.battleScore || 0);
                    }
                    
                    // Determine result
                    if (battle.details.result === 'won') {
                        wins++;
                    } else if (battle.details.result === 'tie') {
                        draws++;
                    }
                }
            });
            
            const totalBattles = recentBattles.length;
            const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;
            
            // Calculate points based on scoring system
            const points = (wins * 3) + (draws * 1);
            
            leaderboardData.push({
                userId: userId,
                username: user.firstName,
                totalBattles: totalBattles,
                wins: wins,
                winRate: winRate,
                totalScore: totalScore,
                points: points,
                isCurrentUser: userId === currentUserId
            });
        }
        
        // Sort by points (descending), then by win rate (descending)
        leaderboardData.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            return b.winRate - a.winRate;
        });
        
        return leaderboardData;
        
    } catch (error) {
        console.error('Error calculating leaderboard:', error);
        return [];
    }
};

module.exports = {
    initializeDataFiles,
    getUserFavoritesFile,
    loadUserFavorites,
    saveUserFavorites,
    ensureUserFavoritesDir,
    getUserBattlesFile,
    loadUserBattles,
    saveUserBattles,
    getBattlesToday,
    canBattle,
    recordBattle,
    recordPlayerBattle,
    updateOnlineStatus,
    getOnlinePlayers,
    createChallenge,
    getChallenge,
    updateChallengeStatus,
    cleanupExpiredChallenges,
    calculateBattleScore,
    calculateLeaderboard,
    pendingChallenges,
    declinedChallenges,
    botBattles
}; 