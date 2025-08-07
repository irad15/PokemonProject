let currentUser = null;
let refreshInterval = null;
let challengesInterval = null;
let declinedCheckInterval = null;
let acceptedCheckInterval = null;

// Load current user and start refreshing online players
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();
    await loadOnlinePlayers();
    await loadPendingChallenges();
    
    // Refresh online players every 5 seconds
    refreshInterval = setInterval(loadOnlinePlayers, 5000);
    
    // Refresh challenges every 3 seconds
    challengesInterval = setInterval(loadPendingChallenges, 3000);
    
    // Check for declined challenges every 2 seconds
    declinedCheckInterval = setInterval(checkForDeclinedChallenges, 2000);
    
    // Check for accepted challenges every 500ms for faster response
    acceptedCheckInterval = setInterval(checkForAcceptedChallenges, 500);
});

// Load current user info
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.isAuthenticated) {
            currentUser = data.user;
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error loading current user:', error);
    }
}

// Load online players
async function loadOnlinePlayers() {
    try {
        const response = await fetch('/api/arena/online-players');
        const data = await response.json();
        
        if (response.ok) {
            displayOnlinePlayers(data.players);
        } else {
            console.error('Failed to load online players:', data.error);
        }
    } catch (error) {
        console.error('Error loading online players:', error);
    }
}

// Load pending challenges
async function loadPendingChallenges() {
    try {
        const response = await fetch('/api/arena/pending-challenges');
        const data = await response.json();
        
        if (response.ok) {
            displayPendingChallenges(data.challenges);
        } else {
            console.error('Failed to load pending challenges:', data.error);
        }
    } catch (error) {
        console.error('Error loading pending challenges:', error);
    }
}

// Display online players
function displayOnlinePlayers(players) {
    const playersList = document.getElementById('playersList');
    
    if (players.length === 0) {
        playersList.innerHTML = '<div class="loading">No online players found</div>';
        return;
    }
    
    const playersHTML = players
        .filter(player => player.id !== currentUser.id)
        .map(player => `
            <div class="player-item">
                <div class="player-info">
                    <div class="online-indicator"></div>
                    <span>${player.firstName}</span>
                </div>
                <button class="challenge-btn" onclick="sendChallenge('${player.id}', '${player.firstName}')">
                    Challenge
                </button>
            </div>
        `).join('');
    
    playersList.innerHTML = playersHTML;
}

// Display pending challenges
function displayPendingChallenges(challenges) {
    const challengesSection = document.getElementById('challengesSection');
    const challengesList = document.getElementById('challengesList');
    
    if (challenges.length === 0) {
        challengesSection.classList.remove('active');
        return;
    }
    
    challengesSection.classList.add('active');
    
    const challengesHTML = challenges.map(challenge => `
        <div class="challenge-item">
            <div class="challenge-info">
                <span>${challenge.challengerName} wants to battle you!</span>
            </div>
            <div class="challenge-buttons">
                <button class="accept-btn" onclick="acceptChallenge('${challenge.id}')">
                    Accept
                </button>
                <button class="decline-btn" onclick="declineChallenge('${challenge.id}')">
                    Decline
                </button>
            </div>
        </div>
    `).join('');
    
    challengesList.innerHTML = challengesHTML;
}

// Send a challenge to a player
async function sendChallenge(opponentId, opponentName) {
    try {
        console.log('Sending challenge to:', opponentName);
        
        const response = await fetch('/api/arena/send-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opponentId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('Challenge sent successfully, ID:', data.challengeId);
            alert(`Challenge sent to ${opponentName}! Waiting for response...`);
            
            // Clear any existing accepted challenge checks to prevent conflicts
            clearInterval(acceptedCheckInterval);
            acceptedCheckInterval = setInterval(checkForAcceptedChallenges, 500);
        } else {
            alert(data.error || 'Failed to send challenge');
        }
    } catch (error) {
        console.error('Error sending challenge:', error);
        alert('Failed to send challenge. Please try again.');
    }
}

// Accept a challenge
async function acceptChallenge(challengeId) {
    try {
        const response = await fetch('/api/arena/accept-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Clear all intervals before redirecting to prevent any lingering requests
            clearInterval(refreshInterval);
            clearInterval(challengesInterval);
            clearInterval(declinedCheckInterval);
            clearInterval(acceptedCheckInterval);
            
            window.location.href = data.redirectUrl;
        } else {
            alert(data.error || 'Failed to accept challenge');
        }
    } catch (error) {
        console.error('Error accepting challenge:', error);
        alert('Failed to accept challenge. Please try again.');
    }
}

// Decline a challenge
async function declineChallenge(challengeId) {
    try {
        const response = await fetch('/api/arena/decline-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId })
        });
        
        if (response.ok) {
            loadPendingChallenges();
        } else {
            alert('Failed to decline challenge');
        }
    } catch (error) {
        console.error('Error declining challenge:', error);
        alert('Failed to decline challenge. Please try again.');
    }
}

// Check for declined challenges
async function checkForDeclinedChallenges() {
    try {
        const response = await fetch('/api/arena/declined-challenges');
        const data = await response.json();
        
        if (response.ok && data.challenge) {
            const declinedBy = data.challenge.declinedBy;
            alert(`${declinedBy} declined your challenge!`);
            clearInterval(declinedCheckInterval);
        }
    } catch (error) {
        console.error('Error checking for declined challenges:', error);
    }
}

// Check for accepted challenges
async function checkForAcceptedChallenges() {
    try {
        const response = await fetch('/api/arena/accepted-challenges');
        const data = await response.json();
        
        if (response.ok && data.challenge) {
            // Clear the interval before redirecting to prevent multiple redirects
            clearInterval(acceptedCheckInterval);
            window.location.href = `/arena/battle?challengeId=${data.challenge.id}`;
        }
    } catch (error) {
        console.error('Error checking for accepted challenges:', error);
    }
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
    clearInterval(challengesInterval);
    clearInterval(declinedCheckInterval);
    clearInterval(acceptedCheckInterval);
    removeFromOnlinePlayers();
});

// Also cleanup when the page is hidden (user navigates away)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(refreshInterval);
        clearInterval(challengesInterval);
        clearInterval(declinedCheckInterval);
        clearInterval(acceptedCheckInterval);
        removeFromOnlinePlayers();
    } else {
        // Restart intervals when page becomes visible again
        refreshInterval = setInterval(loadOnlinePlayers, 5000);
        challengesInterval = setInterval(loadPendingChallenges, 3000);
        declinedCheckInterval = setInterval(checkForDeclinedChallenges, 2000);
        acceptedCheckInterval = setInterval(checkForAcceptedChallenges, 500);
    }
});