const { 
    loadUserBattles, 
    saveUserBattles, 
    getBattlesToday, 
    canBattle, 
    recordBattle,
    loadUsers
} = require('./dataManager');

// Online players tracking
const onlinePlayers = new Map();

const updateOnlineStatus = (userId, firstName) => {
    onlinePlayers.set(userId, {
        id: userId,
        firstName: firstName,
        lastSeen: Date.now()
    });
};

const removeOnlineStatus = (userId) => {
    onlinePlayers.delete(userId);
};

const getOnlinePlayers = () => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    // Clean up expired players
    for (const [userId, player] of onlinePlayers.entries()) {
        if (now - player.lastSeen > timeout) {
            onlinePlayers.delete(userId);
        }
    }
    
    return Array.from(onlinePlayers.values());
};

// Challenge system
const pendingChallenges = new Map();
const declinedChallenges = new Map();
const botBattles = new Map();

const createChallenge = (challengerId, challengerName, opponentId, opponentName) => {
    const challenge = {
        id: `challenge_${Date.now()}`,
        challengerId: challengerId,
        challengerName: challengerName,
        opponentId: opponentId,
        opponentName: opponentName,
        status: 'pending',
        createdAt: Date.now()
    };
    
    pendingChallenges.set(challenge.id, challenge);
    return challenge;
};

const getChallenge = (challengeId) => {
    return pendingChallenges.get(challengeId);
};

const updateChallengeStatus = (challengeId, status) => {
    const challenge = getChallenge(challengeId);
    if (challenge) {
        challenge.status = status;
    }
};

const cleanupExpiredChallenges = () => {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes
    
    for (const [challengeId, challenge] of pendingChallenges.entries()) {
        if (now - challenge.createdAt > timeout && challenge.status === 'pending') {
            pendingChallenges.delete(challengeId);
        }
    }
};

// Ultra-minimal battle record - only essential data
const createBattleRecord = (pokemon, battleScore) => {
    return {
        name: pokemon.name,
        sprite: pokemon.sprites.front_default,
        score: battleScore
    };
};

// Create battle data for storage (minimal) and display (full format)
const createBattleData = (player1Pokemon, player2Pokemon, player1Name, player2Name, player1Id, player2Id) => {
    try {
        // Calculate battle scores
        const player1Score = calculateBattleScore(player1Pokemon);
        const player2Score = calculateBattleScore(player2Pokemon);
        
        // Determine the result
        const result = player1Score > player2Score ? 'won' : 
                      player2Score > player1Score ? 'lost' : 'tie';
        
        // Create display format (for battle page)
        const displayData = {
            player1Pokemon: {
                ...player1Pokemon,
                battleScore: player1Score
            },
            player2Pokemon: {
                ...player2Pokemon,
                battleScore: player2Score
            },
            player1Name,
            player2Name,
            battleType: player2Id === 'bot' ? 'bot' : 'player-vs-player',
            result
        };
        
        // Create storage format (minimal)
        const storageData = {
            myPokemon: createBattleRecord(player1Pokemon, player1Score),
            opponentPokemon: createBattleRecord(player2Pokemon, player2Score),
            result
        };
        
        // Add opponent name only for player battles
        if (player2Id !== 'bot') {
            storageData.opponentName = player2Name;
        }
        
        return {
            display: displayData,  // For battle page
            storage: storageData   // For battles.json
        };
    } catch (error) {
        console.error('Error creating battle data:', error);
        throw error;
    }
};

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

const recordPlayerBattle = (player1Id, player2Id, player1Name, player2Name, player1Pokemon, player2Pokemon) => {
    const player1Score = calculateBattleScore(player1Pokemon);
    const player2Score = calculateBattleScore(player2Pokemon);
    
    // Create ultra-minimal battle records for both players
    const battleData1 = {
        myPokemon: createBattleRecord(player1Pokemon, player1Score),
        opponentPokemon: createBattleRecord(player2Pokemon, player2Score),
        opponentName: player2Name,
        result: player1Score > player2Score ? 'won' : player2Score > player1Score ? 'lost' : 'tie'
    };
    
    const battleData2 = {
        myPokemon: createBattleRecord(player2Pokemon, player2Score),
        opponentPokemon: createBattleRecord(player1Pokemon, player1Score),
        opponentName: player1Name,
        result: player2Score > player1Score ? 'won' : player1Score > player2Score ? 'lost' : 'tie'
    };
    
    recordBattle(player1Id, 'player-vs-player', player2Name, battleData1);
    recordBattle(player2Id, 'player-vs-player', player1Name, battleData2);
};

const calculateLeaderboard = (currentUserId) => {
    try {
        const users = loadUsers();
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
            
            console.log(`Processing ${recentBattles.length} battles for user ${userId}`);
            
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
                    
                    // Determine result by comparing battle scores
                    if (battle.details.player1Pokemon && battle.details.player2Pokemon) {
                        const player1Score = battle.details.player1Pokemon.battleScore || 0;
                        const player2Score = battle.details.player2Pokemon.battleScore || 0;
                        
                        if (player1Score > player2Score) {
                            wins++;
                        } else if (player1Score === player2Score) {
                            draws++;
                        }
                    }
                }
            });
            
            const totalBattles = recentBattles.length;
            const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;
            
            // Calculate points based on scoring system
            const points = (wins * 3) + (draws * 1);
            
            console.log(`User ${userId}: ${wins} wins, ${draws} draws, ${totalBattles} total battles`);
            
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
    updateOnlineStatus,
    removeOnlineStatus,
    getOnlinePlayers,
    createChallenge,
    getChallenge,
    updateChallengeStatus,
    cleanupExpiredChallenges,
    createBattleRecord,
    createBattleData,
    calculateBattleScore,
    recordPlayerBattle,
    calculateLeaderboard,
    pendingChallenges,
    declinedChallenges,
    botBattles
}; 