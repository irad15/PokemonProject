/**
 * VS Bot Battle Page - Client-side JavaScript
 * 
 * This file handles the player vs bot battle functionality.
 * It manages the battle interface, Pokemon selection, and AI-controlled battle mechanics.
 * 
 * Key Features:
 * - Manual Pokemon selection for player
 * - AI-controlled bot Pokemon with strategic moves
 * - Turn-based battle mechanics
 * - Battle result tracking and display
 * - Integration with arena system for match history
 * - Bot difficulty and move selection logic
 * 
 * Works with:
 * - vs-bot.html (battle page)
 * - utils.js (for Pokemon data and utilities)
 * - /api/arena (server endpoint for battle results)
 * - PokeAPI (for Pokemon data)
 * 
 * Dependencies: utils.js (for API calls and shared functions)
 */

let userFavorites = [];
let selectedPokemon = null;
let botPokemon = null;

// DOM element references
const loadingSection = document.getElementById('loadingSection');
const selectionSection = document.getElementById('selectionSection');
const favoritesGrid = document.getElementById('favoritesGrid');
const battleSetup = document.getElementById('battleSetup');
const startBattleBtn = document.getElementById('startBattleBtn');

// Load page on DOM content loaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserFavorites();
});

// Load user's favorite Pokemon
async function loadUserFavorites() {
    try {
        const response = await fetch('/api/favorites');
        const favorites = await response.json();
        
        if (response.ok) {
            userFavorites = favorites;
                    if (userFavorites.length === 0) {
            showNoFavoritesMessage(favoritesGrid);
        } else {
            displayFavorites();
        }
        } else {
            alert('Failed to load favorites. Please try again.');
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        alert('Failed to load favorites. Please try again.');
    }
}

// Display favorites in grid format
async function displayFavorites() {
    try {
        // Fetch full Pokemon data for each favorite
        const pokemonPromises = userFavorites.map(async (favorite) => {
            try {
                const pokemon = await fetchJson(`${API_BASE_URL}pokemon/${favorite.id}`);
                return {
                    id: pokemon.id,
                    name: formatPokemonName(pokemon.name),
                    sprites: pokemon.sprites,
                    types: pokemon.types.map(t => t.type.name),
                    abilities: pokemon.abilities.map(a => a.ability.name),
                    stats: pokemon.stats,
                    addedAt: favorite.addedAt
                };
            } catch (error) {
                console.error(`Error fetching Pokemon ${favorite.id}:`, error);
                return null;
            }
        });
        
        const pokemonList = await Promise.all(pokemonPromises);
        const validPokemon = pokemonList.filter(pokemon => pokemon !== null);
        
        if (validPokemon.length === 0) {
            showNoFavoritesMessage(favoritesGrid);
            return;
        }
        
        // Hide loading, show selection section
        loadingSection.style.display = 'none';
        selectionSection.style.display = 'block';
        
        // Display favorites in grid
        favoritesGrid.innerHTML = validPokemon.map(pokemon => `
            <div class="favorite-card" onclick="selectPokemon(${pokemon.id})" data-pokemon-id="${pokemon.id}">
                <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" onerror="this.src='https://via.placeholder.com/100?text=Error'">
                <div class="pokemon-name">${pokemon.name}</div>
                <div class="pokemon-id">#${pokemon.id}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error displaying favorites:', error);
        alert('Failed to display favorites. Please try again.');
    }
}



// Generate HTML for Pokemon types
function generateTypesHTML(types) {
    return types.map(type => `
        <span class="type-badge type-${type.type.name}">${type.type.name}</span>
    `).join('');
}

// Generate HTML for Pokemon stats
function generateStatsHTML(stats) {
    const relevantStats = [
        { label: 'HP', value: stats[0].base_stat },
        { label: 'Attack', value: stats[1].base_stat },
        { label: 'Defense', value: stats[2].base_stat },
        { label: 'Speed', value: stats[5].base_stat }
    ];
    
    return relevantStats.map(stat => `
        <div class="stat-item">
            <span class="stat-label">${stat.label}</span>
            <span class="stat-value">${stat.value}</span>
        </div>
    `).join('');
}

// Show message when user has no favorites
function showNoFavoritesMessage(containerElement, showGoToSearchButton = true) {
    let messageHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <h3>No Favorite Pokemon Found</h3>
            <p>You need to add some Pokemon to your favorites first!</p>
    `;
    
    if (showGoToSearchButton) {
        messageHTML += `
            <button onclick="window.location.href='/search'" class="back-btn">
                Go to Search Pokemon
            </button>
        `;
    }
    
    messageHTML += '</div>';
    containerElement.innerHTML = messageHTML;
}

// Select a Pokemon for battle
async function selectPokemon(pokemonId) {
    try {
        // Remove previous selection
        document.querySelectorAll('.favorite-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        const selectedCard = document.querySelector(`[data-pokemon-id="${pokemonId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Find the selected Pokemon data
        const pokemon = userFavorites.find(fav => fav.id === pokemonId);
        if (!pokemon) {
            alert('Pokemon not found in favorites!');
            return;
        }
        
        // Fetch full Pokemon data
        const fullPokemonData = await fetchJson(`${API_BASE_URL}pokemon/${pokemonId}`);
        selectedPokemon = fullPokemonData; // Send complete Pokemon data to server
        
        // Generate random bot Pokemon
        await generateBotPokemon();
        
        // Display battle setup
        displayBattleSetup();
        
    } catch (error) {
        console.error('Error selecting Pokemon:', error);
        alert('Failed to select Pokemon. Please try again.');
    }
}

// Generate a random bot Pokemon (ID between 1 and 1025)
async function generateBotPokemon() {
    try {
        const randomId = Math.floor(Math.random() * 1025) + 1;
        const botData = await fetchJson(`${API_BASE_URL}pokemon/${randomId}`);
        
        botPokemon = botData; // Send complete Pokemon data to server
        
    } catch (error) {
        console.error('Error generating bot Pokemon:', error);
        alert('Failed to generate bot Pokemon. Please try again.');
    }
}



// Display battle setup with both Pokemon
function displayBattleSetup() {
    if (!selectedPokemon || !botPokemon) {
        return;
    }
    
    // Display selected Pokemon
    document.getElementById('selectedPokemonImage').src = selectedPokemon.sprites.front_default;
    document.getElementById('selectedPokemonName').textContent = formatPokemonName(selectedPokemon.name);
    document.getElementById('selectedPokemonTypes').innerHTML = generateTypesHTML(selectedPokemon.types);
    document.getElementById('selectedPokemonStats').innerHTML = generateStatsHTML(selectedPokemon.stats);
    
    // Display bot Pokemon
    document.getElementById('botPokemonImage').src = botPokemon.sprites.front_default;
    document.getElementById('botPokemonName').textContent = formatPokemonName(botPokemon.name);
    document.getElementById('botPokemonTypes').innerHTML = generateTypesHTML(botPokemon.types);
    document.getElementById('botPokemonStats').innerHTML = generateStatsHTML(botPokemon.stats);
    
    // Show battle setup
    battleSetup.style.display = 'block';
    
    // Enable start battle button
    startBattleBtn.disabled = false;
}



// Start the battle
async function startBattle() {
    if (!selectedPokemon || !botPokemon) {
        alert('Please select a Pokemon first!');
        return;
    }
    
    try {
        // Disable button to prevent multiple clicks
        startBattleBtn.disabled = true;
        startBattleBtn.textContent = 'Starting Battle...';
        
        // Create battle data
        const battleData = {
            player1Name: 'You',
            player2Name: 'Bot',
            player1Pokemon: selectedPokemon,
            player2Pokemon: botPokemon,
            battleType: 'bot'
        };
        
        // Save battle data to server
        const response = await fetch('/api/arena/create-bot-battle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(battleData)
        });
        
        if (response.ok) {
            const result = await response.json();
            // Redirect to battle page with the battle ID
            window.location.href = `/arena/battle?challengeId=${result.battleId}`;
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to start battle. Please try again.');
            startBattleBtn.disabled = false;
            startBattleBtn.textContent = '⚔️ Start Battle';
        }
        
    } catch (error) {
        console.error('Error starting battle:', error);
        alert('Failed to start battle. Please try again.');
        startBattleBtn.disabled = false;
        startBattleBtn.textContent = '⚔️ Start Battle';
    }
}
