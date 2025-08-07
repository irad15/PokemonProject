const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const router = express.Router();

// Import data manager utilities
const { 
    loadUsers, 
    findUserByEmail, 
    createUser 
} = require('../utils/dataManager');

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

// Route for the home page (public)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'home.html'));
});

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

// API endpoint for project information
router.get('/api/project-info', (req, res) => {
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
router.post('/api/register', async (req, res) => {
    try {
        const { firstName, email, password } = req.body;
        
        // Validate input data
        const validationResult = validateRegistrationData(firstName, email, password);
        if (!validationResult.isValid) {
            return res.status(400).json({ error: validationResult.error });
        }
        
        // Check if user already exists
        const existingUser = findUserByEmail(email);
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
        
        // Save user and initialize data files
        createUser(newUser);
        
        // Automatically log in the user after successful registration
        req.session.userId = newUser.id;
        req.session.userFirstName = newUser.firstName;
        req.session.userEmail = newUser.email;
        
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
        const users = loadUsers();
        const user = findUserByEmail(email);
        
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
    
    if (!firstName || firstName.trim().length > 50) {
        return { isValid: false, error: 'First name must be 50 characters or less' };
    }
    
    if (!/^[a-zA-Z\s]+$/.test(firstName.trim())) {
        return { isValid: false, error: 'First name can only contain letters and spaces' };
    }
    
    if (!email || !email.includes('@')) {
        return { isValid: false, error: 'Please enter a valid email address' };
    }
    
    if (!password || password.length < 7 || password.length > 15) {
        return { isValid: false, error: 'Password must be between 7 and 15 characters' };
    }
    
    // Check password complexity requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNonAlphanumeric = /[^A-Za-z0-9]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNonAlphanumeric) {
        return { isValid: false, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one non-alphanumeric character' };
    }
    
    return { isValid: true };
}

module.exports = { router, requireAuth }; 