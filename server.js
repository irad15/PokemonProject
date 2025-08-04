const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const PORT = 3000;

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'Client')));
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
        res.redirect('/');
    }
}

// Route for the home page (public)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'home.html'));
});

// Route for the register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'register.html'));
});

// Route for the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'login.html'));
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
        console.error('Error downloading favorites as CSV:', error);
        res.status(500).json({ error: 'Failed to download favorites as CSV' });
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
    res.sendFile(path.join(__dirname, 'Client', 'search_pokemon.html'));
});

app.get('/favorites', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'favorite_pokemon.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Home page: http://localhost:${PORT}/`);
    console.log(`Register page: http://localhost:${PORT}/register`);
    console.log(`Login page: http://localhost:${PORT}/login`);
    console.log(`Search page: http://localhost:${PORT}/search`);
    console.log(`Favorites page: http://localhost:${PORT}/favorites`);
});
