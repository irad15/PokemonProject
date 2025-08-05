const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// File system utilities
const dataDir = path.join(__dirname, '..', 'Data');
const usersFile = path.join(dataDir, 'users.json');

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Authentication required' });
        } else {
            res.redirect('/');
        }
    }
}

// Route for the register page
router.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/search');
    }
    res.sendFile(path.join(__dirname, '..', 'views', 'register.html'));
});

// Route for the login page
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/search');
    }
    res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

// API endpoint for user registration
router.post('/api/register', async (req, res) => {
    try {
        const { firstName, email, password } = req.body;
        
        // Validate input data
        const validationResult = validateRegistrationData(firstName, email, password);
        if (!validationResult.isValid) {
            return res.status(400).json({ error: validationResult.error });
        }
        
        // Load existing users
        let users = [];
        if (fs.existsSync(usersFile)) {
            users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        }
        
        // Check if user already exists
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            firstName,
            email,
            password: hashedPassword
        };
        
        // Save user
        users.push(newUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        
        // Create user data directory
        const userDataDir = path.join(dataDir, newUser.id);
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }
        
        // Initialize user favorites file
        const favoritesFile = path.join(userDataDir, 'favorites.json');
        fs.writeFileSync(favoritesFile, JSON.stringify([], null, 2));
        
        // Initialize user battles file
        const battlesFile = path.join(userDataDir, 'battles.json');
        fs.writeFileSync(battlesFile, JSON.stringify({ battles: [] }, null, 2));
        
        res.json({ message: 'Registration successful' });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// API endpoint for user login
router.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Load users
        if (!fs.existsSync(usersFile)) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Set session
        req.session.userId = user.id;
        req.session.userFirstName = user.firstName;
        req.session.userEmail = user.email;
        
        res.json({ message: 'Login successful' });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// API endpoint for logout
router.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// API endpoint to check authentication status
router.get('/api/auth-status', (req, res) => {
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

// Validation function
function validateRegistrationData(firstName, email, password) {
    if (!firstName || firstName.trim().length < 2) {
        return { isValid: false, error: 'First name must be at least 2 characters long' };
    }
    
    if (!email || !email.includes('@')) {
        return { isValid: false, error: 'Please enter a valid email address' };
    }
    
    if (!password || password.length < 6) {
        return { isValid: false, error: 'Password must be at least 6 characters long' };
    }
    
    return { isValid: true };
}

module.exports = { router, requireAuth }; 