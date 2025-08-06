const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Import requireAuth middleware
const { requireAuth } = require('./auth');

// File system utilities
const dataDir = path.join(__dirname, '..', 'Data');

// Data manager functions
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

// API endpoint to get user's favorites
router.get('/api/favorites', requireAuth, (req, res) => {
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
router.post('/api/favorites', requireAuth, (req, res) => {
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
router.delete('/api/favorites/:pokemonId', requireAuth, (req, res) => {
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
router.get('/api/favorites/count', requireAuth, (req, res) => {
    try {
        const favorites = loadUserFavorites(req.session.userId);
        res.json({ count: favorites.length, maxCount: 10 });
    } catch (error) {
        console.error('Error getting favorites count:', error);
        res.status(500).json({ error: 'Failed to get favorites count' });
    }
});

// API endpoint to download favorites as CSV
router.get('/api/favorites/download', requireAuth, async (req, res) => {
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

module.exports = { router, loadUserFavorites, saveUserFavorites, ensureUserFavoritesDir }; 