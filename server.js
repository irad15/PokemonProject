const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
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
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));



// Import data manager utilities
const { initializeDataFiles } = require('./utils/dataManager');

// Initialize data files
initializeDataFiles();

// Import routes and middleware
const { router: authRouter, requireAuth } = require('./routes/auth');
const { router: favoritesRouter } = require('./routes/favorites');
const { router: arenaRouter } = require('./routes/arena');
const { router: pagesRouter } = require('./routes/pages');

// Use routes
app.use('/', authRouter);
app.use('/', favoritesRouter);
app.use('/', arenaRouter);
app.use('/', pagesRouter);


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
