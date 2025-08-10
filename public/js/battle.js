/**
 * Battle System - Client-side JavaScript
 * 
 * This file contains the core battle mechanics and logic used across different battle modes.
 * It provides shared battle functionality for turn-based Pokemon battles.
 * 
 * Key Features:
 * - Turn-based battle system
 * - Move execution and damage calculation
 * - Health bar management and updates
 * - Battle state tracking
 * - Move effectiveness calculations
 * - Battle result determination
 * - Animation and visual feedback
 * 
 * Works with:
 * - vs-bot.html (bot battles)
 * - random-vs-player.html (player vs player)
 * - utils.js (for Pokemon data and utilities)
 * - Various battle-related CSS files
 * 
 * Dependencies: utils.js (for Pokemon data and shared functions)
 */

let battleData = null;
let currentUserId = null;

// Load battle data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();
    await loadBattleData();
});

// Load current user info
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.isAuthenticated) {
            currentUserId = data.user.id;
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error loading current user:', error);
    }
}

// Load battle data from URL parameters or server
async function loadBattleData() {
    try {
        // Get battle data from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const challengeId = urlParams.get('challengeId');
        
        if (challengeId) {
            // Load battle data from server
            const response = await fetch(`/api/arena/battle-data/${challengeId}`);
            const data = await response.json();
            
            console.log('Battle data response:', data);
            console.log('Response status:', response.ok);
            
            if (response.ok && data.battleData) {
                battleData = data.battleData;
                console.log('Battle data loaded:', battleData);
                setupBattle();
            } else {
                console.log('Failed to load battle data. Response:', response.status, data);
                alert('Failed to load battle data');
                window.location.href = '/arena';
            }
        } else {
            alert('No battle data found');
            window.location.href = '/arena';
        }
    } catch (error) {
        console.error('Error loading battle data:', error);
        alert('Failed to load battle data');
        window.location.href = '/arena';
    }
}

// Setup battle display
function setupBattle() {
    const loadingSection = document.getElementById('loadingSection');
    const battleSection = document.getElementById('battleSection');
    const battlePlayers = document.getElementById('battlePlayers');
    
    loadingSection.style.display = 'none';
    battleSection.style.display = 'block';
    battlePlayers.textContent = `${battleData.player1Name} vs ${battleData.player2Name}`;
    
    // Display player 1 Pokemon
    displayPokemon('player1', battleData.player1Pokemon, battleData.player1Name);
    
    // Display player 2 Pokemon
    displayPokemon('player2', battleData.player2Pokemon, battleData.player2Name);
    
    // Automatically start the battle after a short delay
    setTimeout(() => {
        startBattle();
    }, 1000);
}

// Display Pokemon in battle
function displayPokemon(playerPrefix, pokemon, playerName) {
    console.log(`Displaying ${playerPrefix} Pokemon:`, pokemon);
    
    const imageElement = document.getElementById(`${playerPrefix}Image`);
    const nameElement = document.getElementById(`${playerPrefix}Name`);
    const typesElement = document.getElementById(`${playerPrefix}Types`);
    const statsElement = document.getElementById(`${playerPrefix}Stats`);
    const scoreElement = document.getElementById(`${playerPrefix}Score`);
    
    console.log('Pokemon sprite:', pokemon.sprite || pokemon.sprites?.front_default);
    imageElement.src = pokemon.sprite || pokemon.sprites?.front_default;
    
    // Determine if this player is the current user
    const playerId = playerPrefix === 'player1' ? battleData.player1Id : battleData.player2Id;
    const isCurrentUser = playerId === currentUserId;
    
    // Display name: "Your Pokemon" for current user, "Opponent's Pokemon" for others
    const displayName = isCurrentUser ? 'Your' : `${playerName}'s`;
    nameElement.textContent = `${displayName} ${pokemon.name}`;
    
    // Display types
    const types = pokemon.types.map(type => type.type.name);
    const typesHTML = types.map(type => `
        <span class="type-badge type-${type}">${type}</span>
    `).join('');
    typesElement.innerHTML = typesHTML;
    
    // Display stats
    const stats = [
        { label: 'HP', value: pokemon.stats[0].base_stat },
        { label: 'Attack', value: pokemon.stats[1].base_stat },
        { label: 'Defense', value: pokemon.stats[2].base_stat },
        { label: 'Speed', value: pokemon.stats[5].base_stat }
    ];
    
    const statsHTML = stats.map(stat => `
        <div class="stat-item">
            <span class="stat-label">${stat.label}</span>
            <span class="stat-value">${stat.value}</span>
        </div>
    `).join('');
    
    statsElement.innerHTML = statsHTML;
    
    // Hide the total score initially - it will be shown after the battle
    scoreElement.style.display = 'none';
    scoreElement.textContent = `Total Score: ${pokemon.battleScore.toFixed(1)}`;
}

// Start battle with countdown
function startBattle() {
    const countdown = document.getElementById('countdown');
    
    countdown.style.display = 'block';
    
    let count = 3;
    countdown.textContent = count;
    
    const countdownInterval = setInterval(() => {
        count--;
        countdown.textContent = count;
        
        if (count === 0) {
            clearInterval(countdownInterval);
            countdown.style.display = 'none';
            executeBattle();
        }
    }, 1000);
}

// Function to remove user from online players
async function removeFromOnlinePlayers() {
    try {
        await fetch('/api/arena/remove-online', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error removing from online players:', error);
    }
}

// Execute battle and show results
function executeBattle() {
    const player1Card = document.getElementById('player1Card');
    const player2Card = document.getElementById('player2Card');
    const battleResult = document.getElementById('battleResult');
    const winnerAnnouncement = document.getElementById('winnerAnnouncement');
    const battleScore = document.getElementById('battleScore');
    const player1ScoreElement = document.getElementById('player1Score');
    const player2ScoreElement = document.getElementById('player2Score');
    
    const player1Score = battleData.player1Pokemon.battleScore;
    const player2Score = battleData.player2Pokemon.battleScore;
    
    // Show the total scores now that the battle is over
    player1ScoreElement.style.display = 'block';
    player2ScoreElement.style.display = 'block';
    
    // Remove any existing lose classes
    battleResult.classList.remove('lose');
    winnerAnnouncement.classList.remove('lose');
    
    // Determine which player is the current user
    const isPlayer1CurrentUser = battleData.player1Id === currentUserId;
    const isPlayer2CurrentUser = battleData.player2Id === currentUserId;
    
    // Determine winner and show appropriate message
    if (player1Score > player2Score) {
        player1Card.classList.add('winner');
        player2Card.classList.add('loser');
        // If player1 is the current user, show "You won!", otherwise show player1's name
        if (isPlayer1CurrentUser) {
            winnerAnnouncement.textContent = 'You won!';
        } else {
            winnerAnnouncement.textContent = `${battleData.player1Name} wins!`;
        }
    } else if (player2Score > player1Score) {
        player2Card.classList.add('winner');
        player1Card.classList.add('loser');
        // If player1 is the current user, show "You lost!", otherwise show player2's name
        if (isPlayer1CurrentUser) {
            winnerAnnouncement.textContent = 'You lost!';
            // Add lose styling for red color
            battleResult.classList.add('lose');
            winnerAnnouncement.classList.add('lose');
        } else {
            winnerAnnouncement.textContent = `${battleData.player2Name} wins!`;
        }
    } else {
        winnerAnnouncement.textContent = "It's a tie!";
    }
    
    battleScore.textContent = `${battleData.player1Name}: ${player1Score.toFixed(1)} | ${battleData.player2Name}: ${player2Score.toFixed(1)}`;
    battleResult.style.display = 'block';
    
    // Remove players from online list after battle ends
    removeFromOnlinePlayers();
} 