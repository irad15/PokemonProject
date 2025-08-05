// Arena Page JavaScript

// DOM elements
const battlesUsedElement = document.getElementById('battlesUsed');
const battlesTotalElement = document.getElementById('battlesTotal');
const battlesRemainingElement = document.getElementById('battlesRemaining');
const favoritesCountElement = document.getElementById('favoritesCount');
const favoritesWarningElement = document.getElementById('favoritesWarning');
const botBattleBtn = document.getElementById('botBattleBtn');
const playerBattleBtn = document.getElementById('playerBattleBtn');
const historyBtn = document.getElementById('historyBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const historyModal = document.getElementById('historyModal');

// Load arena status on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadArenaStatus();
    setupEventListeners();
});

// Load arena status from server
async function loadArenaStatus() {
    try {
        const response = await fetch('/api/arena/status');
        const data = await response.json();
        
        if (response.ok) {
            updateArenaStatus(data);
        } else {
            console.error('Failed to load arena status:', data.error);
        }
    } catch (error) {
        console.error('Error loading arena status:', error);
    }
}

// Update arena status display
function updateArenaStatus(data) {
    battlesUsedElement.textContent = data.battlesUsed;
    battlesTotalElement.textContent = '5';
    battlesRemainingElement.textContent = data.battlesRemaining;
    favoritesCountElement.textContent = data.favoritesCount;
    
    // Show/hide favorites warning
    if (data.favoritesCount === 0) {
        favoritesWarningElement.style.display = 'block';
    } else {
        favoritesWarningElement.style.display = 'none';
    }
    
    // Update button states
    updateBattleButtons(data);
}

// Update battle button states based on status
function updateBattleButtons(data) {
    // Only disable buttons if user has no favorites
    // Battle count validation will be handled in the actual battle pages
    const canBattle = data.hasFavorites;
    
    botBattleBtn.disabled = !canBattle;
    playerBattleBtn.disabled = !canBattle;
    
    if (!data.hasFavorites) {
        botBattleBtn.title = 'You need at least 1 favorite Pokemon to battle!';
        playerBattleBtn.title = 'You need at least 1 favorite Pokemon to battle!';
    } else {
        botBattleBtn.title = '';
        playerBattleBtn.title = '';
    }
}

// Setup event listeners
function setupEventListeners() {
    botBattleBtn.addEventListener('click', () => startBotBattle());
    playerBattleBtn.addEventListener('click', () => startPlayerBattle());
    historyBtn.addEventListener('click', () => showBattleHistory());
    leaderboardBtn.addEventListener('click', () => showLeaderboard());
}

// Start bot battle
function startBotBattle() {
    // Navigate to bot battle page (to be implemented)
    window.location.href = '/arena/vs-bot/';
}

// Start player battle
function startPlayerBattle() {
    // Navigate to player battle page (to be implemented)
    window.location.href = '/arena/random-vs-player/';
}

// Show battle history modal
async function showBattleHistory() {
    try {
        const response = await fetch('/api/arena/history');
        const data = await response.json();
        
        if (response.ok) {
            displayBattleHistory(data);
            historyModal.style.display = 'block';
        } else if (response.status === 401) {
            alert('Session expired. Please log in again.');
            window.location.href = '/login';
        } else {
            alert('Failed to load battle history: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading battle history:', error);
        alert('Failed to load battle history. Please try again.');
    }
}

// Display battle history in modal
function displayBattleHistory(data) {
    const totalBattlesElement = document.getElementById('totalBattles');
    const botBattlesElement = document.getElementById('botBattles');
    const playerBattlesElement = document.getElementById('playerBattles');
    const battleListElement = document.getElementById('battleList');
    
    // Calculate statistics
    const botBattles = data.battles.filter(battle => battle.type === 'bot').length;
    const playerBattles = data.battles.filter(battle => battle.type === 'player').length;
    
    // Update statistics
    totalBattlesElement.textContent = data.totalBattles;
    botBattlesElement.textContent = botBattles;
    playerBattlesElement.textContent = playerBattles;
    
    // Display battle list (reverse order to show most recent first)
    if (data.battles.length === 0) {
        battleListElement.innerHTML = '<p style="text-align: center; color: #6c757d;">No battles recorded yet.</p>';
    } else {
        // Reverse the battles array to show most recent first
        const reversedBattles = [...data.battles].reverse();
        const battleItems = reversedBattles.map(battle => {
            const battleDate = new Date(battle.timestamp).toLocaleString();
            let battleType = battle.type === 'bot' ? 'Bot Battle' : 'Player Battle';
            
            // Add opponent name for player battles
            if (battle.type === 'player' && battle.details && battle.details.opponentName) {
                battleType = `Player Battle - ${battle.details.opponentName}`;
            }
            
            const battleClass = battle.type === 'bot' ? 'bot-battle' : 'player-battle';
            
            let battleContent = `
                <div class="battle-item ${battleClass}">
                    <div class="battle-info">
                        <div class="battle-type">${battleType}</div>
                        <div class="battle-time">${battleDate}</div>
            `;
            
            // Add detailed battle information if available
            if (battle.details) {
                const details = battle.details;
                
                // Handle different battle data structures
                let myPokemon, opponentPokemon, result, opponentName;
                
                if (details.myPokemon && details.opponentPokemon) {
                    // Player vs Player battle structure
                    myPokemon = details.myPokemon;
                    opponentPokemon = details.opponentPokemon;
                    result = details.result;
                    opponentName = details.opponentName;
                } else if (details.player1Pokemon && details.player2Pokemon) {
                    // Bot battle structure
                    myPokemon = details.player1Pokemon;
                    opponentPokemon = details.player2Pokemon;
                    // For bot battles, determine result based on scores
                    const myScore = myPokemon.battleScore || 0;
                    const opponentScore = opponentPokemon.battleScore || 0;
                    result = myScore > opponentScore ? 'won' : (myScore < opponentScore ? 'lost' : 'tie');
                    opponentName = 'Bot';
                } else {
                    // Fallback for unknown structure
                    battleContent += `
                        <div class="battle-details">
                            <div class="battle-result">Unknown</div>
                        </div>
                    `;
                    battleContent += `
                    </div>
                </div>
            `;
                    return battleContent;
                }
                
                const resultClass = result === 'won' ? 'battle-won' : 
                                  result === 'lost' ? 'battle-lost' : 'battle-tie';
                const resultText = result === 'won' ? 'Victory' : 
                                 result === 'lost' ? 'Defeat' : 'Tie';
                
                // Use sprite for image, fallback to image if sprite doesn't exist
                const myImage = myPokemon.sprite || myPokemon.image || '';
                const opponentImage = opponentPokemon.sprite || opponentPokemon.image || '';
                const myScore = myPokemon.battleScore || myPokemon.score || 0;
                const opponentScore = opponentPokemon.battleScore || opponentPokemon.score || 0;
                
                battleContent += `
                        <div class="battle-details">
                            <div class="battle-result ${resultClass}">${resultText}</div>
                            <div class="battle-pokemon-info">
                                <div class="my-pokemon">
                                    <img src="${myImage}" alt="${myPokemon.name}" class="pokemon-thumbnail">
                                    <span>${myPokemon.name}</span>
                                    <span class="score">${myScore.toFixed(1)}</span>
                                </div>
                                <div class="vs-separator">VS</div>
                                <div class="opponent-pokemon">
                                    <img src="${opponentImage}" alt="${opponentPokemon.name}" class="pokemon-thumbnail">
                                    <span>${opponentPokemon.name}</span>
                                    <span class="score">${opponentScore.toFixed(1)}</span>
                                </div>
                            </div>
                            ${battle.type === 'player' ? `<div class="opponent-name">vs ${opponentName}</div>` : ''}
                        </div>
                `;
            }
            
            battleContent += `
                    </div>
                </div>
            `;
            
            return battleContent;
        }).join('');
        
        battleListElement.innerHTML = battleItems;
    }
}

// Show leaderboard
function showLeaderboard() {
    // Navigate to leaderboard page (to be implemented)
    window.location.href = '/arena/leaderboard';
}

// Close history modal
function closeHistoryModal() {
    historyModal.style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === historyModal) {
        closeHistoryModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && historyModal.style.display === 'block') {
        closeHistoryModal();
    }
}); 