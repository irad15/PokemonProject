/**
 * Data Manager - Server-side JavaScript
 * 
 * This file handles all data persistence and management operations for the Pokemon project.
 * It manages user data, battle records, favorites, and file system operations.
 * 
 * Key Features:
 * - User data management (registration, authentication)
 * - Battle history storage and retrieval
 * - Favorites management and persistence
 * - File system operations and data validation
 * - User session management
 * - Data backup and recovery
 * 
 * Works with:
 * - routes/auth.js (user authentication data)
 * - routes/arena.js (battle data management)
 * - routes/favorites.js (favorites data management)
 * - Data/ directory (file-based storage)
 * - All server-side route files
 * 
 * This is a core utility file that handles all data persistence operations.
 */

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
    }).length;
};

const canBattle = (userId) => {
    const battlesToday = getBattlesToday(userId);
    return battlesToday < 5;
};

const recordBattle = (userId, battleType, opponent = null, battleDetails = null) => {
    const battlesData = loadUserBattles(userId);
    const battle = {
        timestamp: Date.now(),
        type: battleType,
        opponent: opponent,
        details: battleDetails
    };
    battlesData.battles.push(battle);
    saveUserBattles(userId, battlesData);
};

// User management
const loadUsers = () => {
    if (fs.existsSync(usersFile)) {
        return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    }
    return [];
};

const saveUsers = (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

const findUserByEmail = (email) => {
    const users = loadUsers();
    return users.find(user => user.email === email);
};

const createUser = (userData) => {
    const users = loadUsers();
    users.push(userData);
    saveUsers(users);
    
    // Initialize user data directory and files
    const userDataDir = path.join(dataDir, userData.id);
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    // Initialize user favorites file
    const favoritesFile = path.join(userDataDir, 'favorites.json');
    fs.writeFileSync(favoritesFile, JSON.stringify([], null, 2));
    
    // Initialize user battles file
    const battlesFile = path.join(userDataDir, 'battles.json');
    fs.writeFileSync(battlesFile, JSON.stringify({ battles: [] }, null, 2));
};



module.exports = {
    initializeDataFiles,
    loadUserFavorites,
    saveUserFavorites,
    ensureUserFavoritesDir,
    loadUserBattles,
    saveUserBattles,
    getBattlesToday,
    canBattle,
    recordBattle,
    loadUsers,
    findUserByEmail,
    createUser
}; 