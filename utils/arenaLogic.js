const { 
    loadUserBattles, 
    recordBattle,
    loadUsers,
    canBattle,
    getBattlesToday
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
    
    // Also cleanup old declined challenges (after 5 minutes)
    const declinedTimeout = 5 * 60 * 1000; // 5 minutes
    for (const [challengeId, declinedChallenge] of declinedChallenges.entries()) {
        if (now - declinedChallenge.declinedAt > declinedTimeout) {
            declinedChallenges.delete(challengeId);
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
        // Calculate battle scores with type effectiveness
        const player1Score = calculateBattleScore(player1Pokemon, player2Pokemon);
        const player2Score = calculateBattleScore(player2Pokemon, player1Pokemon);
        
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

// Pokemon type effectiveness chart
const TYPE_EFFECTIVENESS = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

// Helper function to get type effectiveness multiplier
function getTypeEffectiveness(attackerTypes, defenderTypes) {
    let totalMultiplier = 1;
    
    for (const atkType of attackerTypes) {
        for (const defType of defenderTypes) {
            const typeChart = TYPE_EFFECTIVENESS[atkType];
            if (typeChart && typeChart[defType]) {
                totalMultiplier *= typeChart[defType];
            }
        }
    }
    
    return totalMultiplier;
}

// Helper function to get Pokemon types
function getPokemonTypes(pokemon) {
    return pokemon.types.map(type => type.type.name);
}

const calculateBattleScore = (pokemon, opponentPokemon = null) => {
    const hp = pokemon.stats[0].base_stat;
    const attack = pokemon.stats[1].base_stat;
    const defense = pokemon.stats[2].base_stat;
    const speed = pokemon.stats[5].base_stat;
    
    // Base formula: HP × 0.3 + Attack × 0.4 + Defense × 0.2 + Speed × 0.1
    let baseScore = hp * 0.3 + attack * 0.4 + defense * 0.2 + speed * 0.1;
    
    // Apply type effectiveness if opponent is provided
    if (opponentPokemon) {
        const myTypes = getPokemonTypes(pokemon);
        const oppTypes = getPokemonTypes(opponentPokemon);
        const typeMultiplier = getTypeEffectiveness(myTypes, oppTypes);
        
        // Apply type effectiveness to attack stat
        baseScore = (hp * 0.3) + (attack * 0.4 * typeMultiplier) + (defense * 0.2) + (speed * 0.1);
    }
    
    const smallRandVal = Math.random() * 2; // Small random value for variety
    
    return baseScore + smallRandVal;
};

const recordPlayerBattle = (player1Id, player2Id, player1Name, player2Name, player1Pokemon, player2Pokemon) => {
    const player1Score = calculateBattleScore(player1Pokemon, player2Pokemon);
    const player2Score = calculateBattleScore(player2Pokemon, player1Pokemon);
    
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
                    }
                    
                    // Determine result based on the battle result field
                    if (battle.details.result) {
                        if (battle.details.result === 'won') {
                            wins++;
                        } else if (battle.details.result === 'tie') {
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

const validateBattleEligibility = (userId, favorites) => {
    const errors = [];
    
    // Check if user has favorites
    if (favorites.length === 0) {
        errors.push('You need at least one favorite Pokemon to enter battles');
    }
    
    // Check if user can battle
    if (!canBattle(userId)) {
        errors.push('You have used all 5 battles for today. Come back tomorrow!');
    }
    
    return errors;
};

const validateChallengeEligibility = (challengerId, opponentId, challengerFavorites, opponentFavorites) => {
    const errors = [];
    
    // Check if challenger can battle
    if (!canBattle(challengerId)) {
        errors.push('You have used all 5 battles for today. Come back tomorrow!');
    }
    
    // Check if challenger has favorites
    if (challengerFavorites.length === 0) {
        errors.push('You need at least one favorite Pokemon to battle');
    }
    
    // Check if opponent has favorites
    if (opponentFavorites.length === 0) {
        errors.push('Opponent has no favorite Pokemon');
    }
    
    return errors;
};

const validateChallengeAcceptance = (challenge, userId) => {
    const errors = [];
    
    if (!challenge || challenge.opponentId !== userId) {
        errors.push('Invalid challenge');
        return errors;
    }
    
    // Only check status if it's not already accepted (to handle race conditions)
    if (challenge.status !== 'pending' && challenge.status !== 'accepted') {
        errors.push('Challenge is no longer pending');
    }
    
    // Check if both players can still battle
    if (!canBattle(challenge.challengerId) || !canBattle(userId)) {
        errors.push('One or both players have used all battles for today');
    }
    
    return errors;
};

const checkExistingChallenges = (userId, opponentId) => {
    // Check if there's already a pending challenge between these two users (either direction)
    for (const [challengeId, challenge] of pendingChallenges.entries()) {
        if (challenge.status === 'pending' && 
            ((challenge.challengerId === opponentId && challenge.opponentId === userId) ||
             (challenge.challengerId === userId && challenge.opponentId === opponentId))) {
            return 'There is already a pending challenge between you and this player. Please accept or decline it first.';
        }
    }
    return null;
};

const clearAcceptedChallenges = (userId) => {
    // Clear any existing accepted challenges for this user
    for (const [challengeId, challenge] of pendingChallenges.entries()) {
        if ((challenge.challengerId === userId || challenge.opponentId === userId) && 
            challenge.status === 'accepted') {
            pendingChallenges.delete(challengeId);
        }
    }
};

const createBotBattle = async (userId, player1Pokemon, player2Pokemon) => {
    // Check if user can battle
    if (!canBattle(userId)) {
        throw new Error('You have used all 5 battles for today. Come back tomorrow!');
    }
    
    // Generate a unique battle ID for the bot battle
    const battleId = `bot_${userId}_${Date.now()}`;
    
    // Create battle data using shared function
    const battleData = createBattleData(player1Pokemon, player2Pokemon, 'You', 'Bot', userId, 'bot');

    // Store the bot battle data (display format for battle page)
    botBattles.set(battleId, {
        battleData: battleData.display,
        createdAt: Date.now()
    });
    
    // Record the battle for the user (storage format for battles.json)
    recordBattle(userId, 'bot', 'Bot', battleData.storage);
    
    return {
        battleId: battleId,
        message: 'Bot battle created successfully'
    };
};

const getArenaStatus = (userId, favorites) => {
    const battlesToday = getBattlesToday(userId);
    const canBattleToday = canBattle(userId);
    
    return {
        battlesUsed: battlesToday,
        battlesRemaining: 5 - battlesToday,
        canBattle: canBattleToday,
        hasFavorites: favorites.length > 0,
        favoritesCount: favorites.length
    };
};

const getBattleHistory = (userId) => {
    const battlesData = loadUserBattles(userId);
    
    return {
        battles: battlesData.battles,
        totalBattles: battlesData.battles.length
    };
};

const getOnlinePlayersStatus = (userId, firstName) => {
    // Update current user's online status
    updateOnlineStatus(userId, firstName);
    
    // Get all online players
    const onlinePlayersList = getOnlinePlayers();
    
    return {
        players: onlinePlayersList
    };
};

const getPendingChallengesForUser = (userId) => {
    cleanupExpiredChallenges();
    
    const userChallenges = Array.from(pendingChallenges.values()).filter(challenge => 
        challenge.opponentId === userId && challenge.status === 'pending'
    );
    
    return {
        challenges: userChallenges
    };
};

const getAcceptedChallengesForUser = (userId) => {
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
        
        return {
            challenge: {
                ...acceptedChallenge,
                ...acceptedChallenge.battleData
            }
        };
    } else {
        return {
            challenge: null
        };
    }
};

const getDeclinedChallengesForUser = (userId) => {
    // Find declined challenges where this user is the challenger
    const declinedChallenge = Array.from(declinedChallenges.values()).find(challenge => 
        challenge.challengerId === userId
    );
    
    if (declinedChallenge) {
        // Clear the declined challenge after retrieving it to prevent duplicate alerts
        declinedChallenges.delete(declinedChallenge.id);
        
        return {
            challenge: declinedChallenge
        };
    } else {
        return {
            challenge: null
        };
    }
};

const getBattleData = (battleId) => {
    // Check if it's a bot battle
    if (battleId.startsWith('bot_')) {
        const botBattle = botBattles.get(battleId);
        
        if (botBattle && botBattle.battleData) {
            return {
                battleData: botBattle.battleData
            };
        }
    } else {
        const challenge = getChallenge(battleId);
        
        if (challenge && challenge.battleData) {
            return {
                battleData: challenge.battleData
            };
        }
    }
    
    return null;
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
}; 