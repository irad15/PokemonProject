# Pokemon Project

A comprehensive web-based Pokemon battle and collection management system built with Node.js, Express, and vanilla JavaScript.

## 🎮 Overview

This project is a full-stack web application that allows users to:
- Register and authenticate user accounts
- Search and browse Pokemon from the PokeAPI
- Manage a personal collection of favorite Pokemon
- Engage in battles against AI opponents (bots)
- Challenge other players in real-time battles
- View leaderboards and battle statistics
- Track battle history and performance

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure registration and login system with session management
- **Pokemon Search**: Browse and search Pokemon using the PokeAPI
- **Favorites Management**: Save and manage your favorite Pokemon collection
- **Battle System**: Turn-based Pokemon battles with type effectiveness calculations
- **Multiplayer Arena**: Challenge other players in real-time battles
- **AI Battles**: Fight against computer-controlled opponents
- **Leaderboards**: Track player rankings and battle statistics
- **Battle History**: View detailed battle records and outcomes

### Technical Features
- **Responsive Design**: Mobile-friendly interface with modern CSS
- **Real-time Updates**: Live battle status and player presence
- **Session Management**: Secure user sessions with Express
- **Data Persistence**: JSON-based data storage for users, battles, and favorites
- **API Integration**: Seamless integration with PokeAPI for Pokemon data
- **Error Handling**: Comprehensive error handling and user feedback

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: JSON file-based storage
- **External APIs**: PokeAPI (Pokemon data)
- **Authentication**: bcrypt for password hashing
- **Sessions**: express-session for user session management

## 📁 Project Structure

```
PokemonProject/
├── Data/                    # User data and battle records
│   ├── users.json          # User accounts and authentication
│   └── [user-id]/          # Individual user data folders
│       ├── battles.json    # Battle history
│       └── favorites.json  # Favorite Pokemon collection
├── public/                 # Static assets
│   ├── css/               # Stylesheets for all pages
│   ├── js/                # Client-side JavaScript
│   └── images/            # Static images and assets
├── routes/                # Express route handlers
│   ├── auth.js           # Authentication routes
│   ├── favorites.js      # Favorites management
│   ├── arena.js          # Battle and arena logic
│   └── pages.js          # Static page serving
├── utils/                 # Utility functions
│   ├── dataManager.js    # Data persistence and management
│   └── arenaLogic.js     # Battle mechanics and calculations
├── views/                 # HTML templates
│   ├── home.html         # Landing page
│   ├── login.html        # Login form
│   ├── register.html     # Registration form
│   ├── search_pokemon.html # Pokemon search interface
│   ├── favorite_pokemon.html # Favorites management
│   ├── arena.html        # Main arena hub
│   ├── vs-bot.html       # AI battle interface
│   ├── random-vs-player.html # Player vs player battles
│   ├── battle.html       # Battle interface
│   └── leaderboard.html  # Rankings and statistics
├── server.js             # Main server entry point
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/irad15/PokemonProject.git
   cd PokemonProject
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   node server.js
   ```

4. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - The server will be running on port 3000

## 🎯 Usage Guide

### Getting Started
1. **Register an Account**: Visit the registration page to create a new account
2. **Login**: Use your credentials to access the system
3. **Search Pokemon**: Browse and search for Pokemon to add to your collection
4. **Build Your Team**: Add Pokemon to your favorites for battles
5. **Enter the Arena**: Start battling against AI or other players

### Battle System
- **VS Bot**: Fight against computer-controlled opponents
- **Player vs Player**: Challenge other online players
- **Battle Mechanics**: Turn-based combat with type effectiveness
- **Scoring**: Earn points based on battle performance

### Features Walkthrough
- **Home Page**: Project overview and navigation
- **Search**: Find Pokemon by name or browse the database
- **Favorites**: Manage your Pokemon collection
- **Arena**: Main battle hub with various game modes
- **Leaderboard**: View rankings and statistics

## 🔧 Configuration

### Environment Setup
The application uses default configurations suitable for development:
- **Port**: 3000 (configurable in server.js)
- **Session Secret**: Set in server.js (change for production)
- **Data Storage**: JSON files in the Data/ directory

### Production Considerations
- Enable HTTPS and set secure cookies
- Use environment variables for sensitive data
- Implement proper logging and monitoring
- Consider database migration for larger scale

## 📊 API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `GET /logout` - User logout

### Pokemon Management
- `GET /api/pokemon/search` - Search Pokemon
- `GET /api/pokemon/:id` - Get Pokemon details
- `GET /api/favorites` - Get user favorites
- `POST /api/favorites` - Add Pokemon to favorites
- `DELETE /api/favorites/:id` - Remove Pokemon from favorites

### Battle System
- `GET /api/arena/status` - Get arena status
- `POST /api/arena/challenge` - Challenge another player
- `POST /api/arena/accept-challenge` - Accept a challenge
- `POST /api/arena/decline-challenge` - Decline a challenge
- `POST /api/arena/battle` - Execute battle moves
- `GET /api/arena/leaderboard` - Get leaderboard data

## 🎮 Game Mechanics

### Battle System
- **Turn-based Combat**: Players take turns selecting moves
- **Type Effectiveness**: Damage calculations based on Pokemon types
- **Health Management**: Track Pokemon HP and status
- **Move Selection**: Choose from available Pokemon moves
- **Battle Scoring**: Points awarded based on performance

### Type Effectiveness
The system implements Pokemon type effectiveness:
- Super effective moves deal 2x damage
- Not very effective moves deal 0.5x damage
- Immune types take no damage
- Normal effectiveness deals standard damage

### Scoring System
- **Victory Points**: Earned for winning battles
- **Damage Dealt**: Bonus points for high damage output
- **Efficiency**: Rewards for quick victories
- **Leaderboard Ranking**: Based on total battle score

## 🔒 Security Features

- **Password Hashing**: bcrypt for secure password storage
- **Session Management**: Secure session handling with express-session
- **Authentication Middleware**: Protected routes require login
- **Input Validation**: Server-side validation for all inputs
- **CSRF Protection**: Session-based request validation

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change the port in server.js
   - Kill existing processes on port 3000

2. **Data File Errors**
   - Ensure Data/ directory exists
   - Check file permissions
   - Restart the server

3. **API Connection Issues**
   - Verify internet connection
   - Check PokeAPI availability
   - Review network requests in browser console

### Debug Mode
Enable debug logging by adding console.log statements in relevant files or using Node.js debugger.

## 📈 Performance Considerations

- **Static File Caching**: CSS and JS files are served efficiently
- **API Rate Limiting**: Respectful PokeAPI usage
- **Data Optimization**: Efficient JSON data structure
- **Memory Management**: Proper cleanup of expired sessions

## 🤝 Contributing

This is an academic project, but contributions are welcome:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 👨‍💻 Developer

**Student Name**: Irad Yaacoby
**Course**: Web Development  
**Year**: 2025

---

**Note**: This project is designed for educational purposes and demonstrates full-stack web development concepts including authentication, real-time features, API integration, and game mechanics implementation.
