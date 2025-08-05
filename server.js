const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' })); // Increased limit for large Pokemon data

// Session configuration
app.use(session({
    secret: 'pokemon-project-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in productio  n with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Debug middleware for sessions
app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    console.log('User ID in session:', req.session.userId);
    console.log('Session data:', req.session);
    next();
});

// File system utilities
const dataDir = path.join(__dirname, 'Data');
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

initializeDataFiles();

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        // For API endpoints, return JSON error instead of redirecting
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Authentication required' });
        } else {
            res.redirect('/');
        }
    }
}

// Route for the home page (public)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

// Route for the register page
app.get('/register', (req, res) => {
    // Check if user is already authenticated
    if (req.session.userId) {
        return res.redirect('/search');
    }
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Route for the login page
app.get('/login', (req, res) => {
    // Check if user is already authenticated
    if (req.session.userId) {
        return res.redirect('/search');
    }
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// API endpoint for project information
app.get('/api/project-info', (req, res) => {
    const projectData = {
        projectDescription: `The Pokemon Project is a web application that allows users to search for Pokemon, add them to favorites, and manage their personal list. 
        The application was built using modern technologies including HTML5, CSS3, JavaScript, and Node.js on the server side. 
        The system includes an advanced user authentication system and secure data storage.`,
        developers: [
            {
                name: "Irad Yaacoby",
                id: "319074951"
            }
        ]
    };
    
    res.json(projectData);
});

// API endpoint for user registration
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, email, password } = req.body;
        
        // Server-side validation
        const validationResult = validateRegistrationData(firstName, email, password);
        if (!validationResult.isValid) {
            return res.status(400).json({ error: validationResult.error });
        }
        
        // Check if user already exists
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            firstName,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        // Save user to file
        users.push(newUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        
        // Create user's favorites directory
        const userFavoritesDir = path.join(dataDir, newUser.id);
        if (!fs.existsSync(userFavoritesDir)) {
            fs.mkdirSync(userFavoritesDir);
        }
        
        res.status(201).json({ 
            message: 'User registered successfully',
            userId: newUser.id 
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for user login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user by email
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Set session
        req.session.userId = user.id;
        req.session.userFirstName = user.firstName;
        req.session.userEmail = user.email;
        
        res.json({
            message: 'Login successful',
            userId: user.id,
            firstName: user.firstName,
            email: user.email
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// API endpoint to check authentication status
app.get('/api/auth-status', (req, res) => {
    if (req.session.userId) {
        res.json({
            isAuthenticated: true,
            user: {
                id: req.session.userId,
                firstName: req.session.userFirstName,
                email: req.session.userEmail
            }
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Favorites utilities
const getUserFavoritesFile = (userId) => path.join(dataDir, userId, 'favorites.json');

const loadUserFavorites = (userId) => {
    const userFavoritesFile = getUserFavoritesFile(userId);
    if (fs.existsSync(userFavoritesFile)) {
        return JSON.parse(fs.readFileSync(userFavoritesFile, 'utf8'));
    }
    return [];
};

const saveUserFavorites = (userId, favorites) => {
    const userFavoritesFile = getUserFavoritesFile(userId);
    fs.writeFileSync(userFavoritesFile, JSON.stringify(favorites, null, 2));
};

const ensureUserFavoritesDir = (userId) => {
    const userFavoritesDir = path.join(dataDir, userId);
    if (!fs.existsSync(userFavoritesDir)) {
        fs.mkdirSync(userFavoritesDir);
    }
};

// Battle utilities
const getUserBattlesFile = (userId) => path.join(dataDir, userId, 'battles.json');

const loadUserBattles = (userId) => {
    const userBattlesFile = getUserBattlesFile(userId);
    if (fs.existsSync(userBattlesFile)) {
        return JSON.parse(fs.readFileSync(userBattlesFile, 'utf8'));
    }
    return { battles: [], lastReset: new Date().toISOString() };
};

const saveUserBattles = (userId, battlesData) => {
    const userBattlesFile = getUserBattlesFile(userId);
    fs.writeFileSync(userBattlesFile, JSON.stringify(battlesData, null, 2));
};

const getBattlesToday = (userId) => {
    const battlesData = loadUserBattles(userId);
    const today = new Date().toDateString();
    const lastReset = new Date(battlesData.lastReset).toDateString();
    
    // Reset battles if it's a new day
    if (today !== lastReset) {
        battlesData.battles = [];
        battlesData.lastReset = new Date().toISOString();
        saveUserBattles(userId, battlesData);
    }
    
    return battlesData.battles.length;
};

const canBattle = (userId) => {
    return getBattlesToday(userId) < 5;
};

const recordBattle = (userId, battleType, opponent = null, battleDetails = null) => {
    const battlesData = loadUserBattles(userId);
    const battle = {
        id: Date.now().toString(),
        type: battleType, // 'bot' or 'player'
        opponent: opponent,
        timestamp: new Date().toISOString(),
        details: battleDetails // Store detailed battle information
    };
    
    battlesData.battles.push(battle);
    saveUserBattles(userId, battlesData);
};

// Record battle for both players in a player vs player battle
const recordPlayerBattle = (player1Id, player2Id, player1Name, player2Name, player1Pokemon, player2Pokemon) => {
    // Determine winner and create battle details
    const player1Score = player1Pokemon.battleScore;
    const player2Score = player2Pokemon.battleScore;
    const player1Won = player1Score > player2Score;
    const player2Won = player2Score > player1Score;
    
    // Battle details for player 1
    const player1Details = {
        myPokemon: {
            name: player1Pokemon.name,
            image: player1Pokemon.sprites.front_default,
            score: player1Score
        },
        opponentPokemon: {
            name: player2Pokemon.name,
            image: player2Pokemon.sprites.front_default,
            score: player2Score
        },
        result: player1Won ? 'won' : (player2Won ? 'lost' : 'tie'),
        opponentName: player2Name
    };
    
    // Battle details for player 2
    const player2Details = {
        myPokemon: {
            name: player2Pokemon.name,
            image: player2Pokemon.sprites.front_default,
            score: player2Score
        },
        opponentPokemon: {
            name: player1Pokemon.name,
            image: player1Pokemon.sprites.front_default,
            score: player1Score
        },
        result: player2Won ? 'won' : (player1Won ? 'lost' : 'tie'),
        opponentName: player1Name
    };
    
    // Record for player 1
    recordBattle(player1Id, 'player', player2Name, player1Details);
    
    // Record for player 2
    recordBattle(player2Id, 'player', player1Name, player2Details);
};

// Online players tracking
const onlinePlayers = new Map(); // userId -> { firstName, lastSeen }

// Challenge system
const pendingChallenges = new Map(); // challengeId -> { challengerId, challengerName, opponentId, opponentName, timestamp }
const declinedChallenges = new Map(); // challengeId -> { challengerId, challengerName, opponentId, opponentName, timestamp, declinedBy }
const botBattles = new Map(); // battleId -> { battleData, createdAt }

const updateOnlineStatus = (userId, firstName) => {
    onlinePlayers.set(userId, {
        firstName: firstName,
        lastSeen: Date.now()
    });
};

const getOnlinePlayers = () => {
    const now = Date.now();
    const onlineThreshold = 30000; // 30 seconds
    
    // Remove players who haven't been seen in 30 seconds
    for (const [userId, data] of onlinePlayers.entries()) {
        if (now - data.lastSeen > onlineThreshold) {
            onlinePlayers.delete(userId);
        }
    }
    
    return Array.from(onlinePlayers.entries()).map(([userId, data]) => ({
        id: userId,
        firstName: data.firstName
    }));
};

// Challenge utilities
const createChallenge = (challengerId, challengerName, opponentId, opponentName) => {
    const challengeId = Date.now().toString();
    const challenge = {
        id: challengeId,
        challengerId,
        challengerName,
        opponentId,
        opponentName,
        timestamp: Date.now(),
        status: 'pending' // pending, accepted, declined, expired
    };
    
    pendingChallenges.set(challengeId, challenge);
    
    // Auto-expire challenges after 30 seconds
    setTimeout(() => {
        if (pendingChallenges.has(challengeId)) {
            const challenge = pendingChallenges.get(challengeId);
            if (challenge.status === 'pending') {
                challenge.status = 'expired';
            }
        }
    }, 30000);
    
    return challenge;
};

const getChallenge = (challengeId) => {
    return pendingChallenges.get(challengeId);
};

const updateChallengeStatus = (challengeId, status) => {
    const challenge = pendingChallenges.get(challengeId);
    if (challenge) {
        challenge.status = status;
        return challenge;
    }
    return null;
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

// Function to calculate leaderboard
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
        
        // Sort by points (descending), then by total score (descending)
        leaderboardData.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            return b.totalScore - a.totalScore;
        });
        
        return leaderboardData;
        
    } catch (error) {
        console.error('Error calculating leaderboard:', error);
        return [];
    }
};

// API endpoint to get user's favorites
app.get('/api/favorites', requireAuth, (req, res) => {
    try {
        console.log('Getting favorites for user:', req.session.userId);
        const favorites = loadUserFavorites(req.session.userId);
        console.log('Favorites found:', favorites);
        res.json(favorites);
    } catch (error) {
        console.error('Error getting favorites:', error);
        res.status(500).json({ error: 'Failed to get favorites' });
    }
});

// API endpoint to add a Pokemon to user's favorites
app.post('/api/favorites', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const { pokemonId } = req.body;
        
        if (!pokemonId) {
            return res.status(400).json({ error: 'Pokemon ID is required' });
        }
        
        ensureUserFavoritesDir(userId);
        let favorites = loadUserFavorites(userId);
        
        // Check if Pokemon is already in favorites
        if (favorites.some(fav => fav.id === pokemonId)) {
            return res.status(400).json({ error: 'Pokemon is already in favorites' });
        }
        
        // Check if user has reached the maximum limit of 10 favorites
        if (favorites.length >= 10) {
            return res.status(400).json({ error: 'Maximum of 10 favorites allowed. Please remove some favorites first.' });
        }
        
        // Add Pokemon ID to favorites
        const favoriteEntry = {
            id: pokemonId,
            addedAt: new Date().toISOString()
        };
        
        favorites.push(favoriteEntry);
        saveUserFavorites(userId, favorites);
        
        res.json({ 
            message: 'Pokemon added to favorites',
            favorites: favorites,
            count: favorites.length
        });
        
    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
});

// API endpoint to remove a Pokemon from user's favorites
app.delete('/api/favorites/:pokemonId', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const pokemonId = parseInt(req.params.pokemonId);
        let favorites = loadUserFavorites(userId);
        
        // Remove Pokemon from favorites
        const updatedFavorites = favorites.filter(fav => fav.id !== pokemonId);
        
        if (updatedFavorites.length === favorites.length) {
            return res.status(404).json({ error: 'Pokemon not found in favorites' });
        }
        
        saveUserFavorites(userId, updatedFavorites);
        
        res.json({ 
            message: 'Pokemon removed from favorites',
            favorites: updatedFavorites,
            count: updatedFavorites.length
        });
        
    } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
});

// API endpoint to get user's favorites count
app.get('/api/favorites/count', requireAuth, (req, res) => {
    try {
        const favorites = loadUserFavorites(req.session.userId);
        res.json({ count: favorites.length, maxCount: 10 });
    } catch (error) {
        console.error('Error getting favorites count:', error);
        res.status(500).json({ error: 'Failed to get favorites count' });
    }
});

// API endpoint to download favorites as CSV
app.get('/api/favorites/download', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const userFavoritesFile = path.join(dataDir, userId, 'favorites.json');
        
        if (!fs.existsSync(userFavoritesFile)) {
            return res.status(404).json({ error: 'No favorites found' });
        }
        
        const favorites = JSON.parse(fs.readFileSync(userFavoritesFile, 'utf8'));
        
        if (favorites.length === 0) {
            return res.status(404).json({ error: 'No favorites to download' });
        }
        
        // Create CSV content
        const headers = ['ID', 'Name', 'Types', 'Abilities', 'Added Date'];
        const csvRows = [headers];
        
        // For server-side CSV, we'll include basic info from the stored IDs
        // Full data would require fetching from PokeAPI, but for CSV we can use IDs
        favorites.forEach(favorite => {
            csvRows.push([
                favorite.id,
                `Pokemon #${favorite.id}`, // Basic name since we only store ID
                'N/A', // Types would need API call
                'N/A', // Abilities would need API call
                new Date(favorite.addedAt).toLocaleDateString()
            ]);
        });
        
        const csvContent = csvRows.map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="favorites.csv"');
        res.send(csvContent);
        
    } catch (error) {
        console.log('Error downloading favorites as CSV:', error);
        res.status(500).json({ error: 'Failed to download favorites as CSV' });
    }
});

// Arena API endpoints
app.get('/api/arena/status', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const battlesToday = getBattlesToday(userId);
        const canBattleToday = canBattle(userId);
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

app.post('/api/arena/battle/bot', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
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

app.post('/api/arena/battle/player', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
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



app.get('/api/arena/history', requireAuth, (req, res) => {
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
app.get('/api/leaderboard', requireAuth, (req, res) => {
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
app.get('/api/arena/online-players', requireAuth, (req, res) => {
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

// API endpoint to send a challenge to a player
app.post('/api/arena/send-challenge', requireAuth, async (req, res) => {
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
app.get('/api/arena/pending-challenges', requireAuth, (req, res) => {
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
app.get('/api/arena/accepted-challenges', requireAuth, (req, res) => {
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
app.get('/api/arena/declined-challenges', requireAuth, (req, res) => {
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

// API endpoint to get battle data for a challenge or bot battle
app.get('/api/arena/battle-data/:battleId', requireAuth, (req, res) => {
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

// API endpoint to accept a challenge
app.post('/api/arena/accept-challenge', requireAuth, async (req, res) => {
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
        
        // Calculate battle scores
        challengerPokemon.battleScore = calculateBattleScore(challengerPokemon);
        opponentPokemon.battleScore = calculateBattleScore(opponentPokemon);
        
        // Store battle data in the challenge for both players to access
        challenge.battleData = {
            player1Pokemon: challengerPokemon,
            player2Pokemon: opponentPokemon,
            player1Name: challenge.challengerName,
            player2Name: challenge.opponentName,
            player1Id: challenge.challengerId,
            player2Id: userId
        };
        
        // Record the battle for both players
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
app.post('/api/arena/decline-challenge', requireAuth, (req, res) => {
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

// API endpoint to create a bot battle
app.post('/api/arena/create-bot-battle', requireAuth, async (req, res) => {
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
        
        // Create battle data
        const battleData = {
            player1Pokemon: player1Pokemon,
            player2Pokemon: player2Pokemon,
            player1Name: 'You',
            player2Name: 'Bot',
            player1Id: userId,
            player2Id: 'bot',
            battleType: 'bot'
        };
        
        // Store the bot battle data
        botBattles.set(battleId, {
            battleData: battleData,
            createdAt: Date.now()
        });
        
        console.log('Bot battle stored. Total bot battles:', botBattles.size);
        console.log('Available bot battles:', Array.from(botBattles.keys()));
        
        // Record the battle for the user
        recordBattle(userId, 'bot', 'Bot', battleData);
        
        res.json({
            battleId: battleId,
            message: 'Bot battle created successfully'
        });
        
    } catch (error) {
        console.error('Error creating bot battle:', error);
        res.status(500).json({ error: 'Failed to create bot battle' });
    }
});



function validateRegistrationData(firstName, email, password) {
    // First name validation
    if (!firstName || firstName.trim().length === 0) {
        return { isValid: false, error: 'First name is required' };
    }
    if (firstName.length > 50) {
        return { isValid: false, error: 'First name must be 50 characters or less' };
    }
    if (!/^[a-zA-Z\s]+$/.test(firstName)) {
        return { isValid: false, error: 'First name can only contain letters and spaces' };
    }
    
    // Email validation
    if (!email || email.trim().length === 0) {
        return { isValid: false, error: 'Email is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Please enter a valid email address' };
    }
    
    // Password validation
    if (!password || password.length < 7 || password.length > 15) {
        return { isValid: false, error: 'Password must be between 7 and 15 characters' };
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNonAlphanumeric = /[^A-Za-z0-9]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNonAlphanumeric) {
        return { isValid: false, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one non-alphanumeric character' };
    }
    
    return { isValid: true };
}

// Protected routes - require authentication
app.get('/search', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'search_pokemon.html'));
});

app.get('/favorites', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'favorite_pokemon.html'));
});

app.get('/arena', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'arena.html'));
});

// Battle page routes (to be implemented later)
app.get('/arena/vs-bot', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'vs-bot.html'));
});

app.get('/arena/random-vs-player', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'random-vs-player.html'));
});

app.get('/arena/battle', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'battle.html'));
});

app.get('/arena/leaderboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'leaderboard.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Home page: http://localhost:${PORT}/`);
    console.log(`Register page: http://localhost:${PORT}/register`);
    console.log(`Login page: http://localhost:${PORT}/login`);
    console.log(`Search page: http://localhost:${PORT}/search`);
    console.log(`Favorites page: http://localhost:${PORT}/favorites`);
    console.log(`Arena page: http://localhost:${PORT}/arena`);
    console.log(`VS Bot Battle page: http://localhost:${PORT}/arena/vs-bot`);
    console.log(`Random Player Battle page: http://localhost:${PORT}/arena/random-vs-player`);
    console.log(`Leaderboard page: http://localhost:${PORT}/arena/leaderboard`);
});
