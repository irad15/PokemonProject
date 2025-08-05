// Leaderboard Page JavaScript

// DOM elements
const loadingSection = document.getElementById('loadingSection');
const leaderboardSection = document.getElementById('leaderboardSection');
const noDataSection = document.getElementById('noDataSection');
const leaderboardBody = document.getElementById('leaderboardBody');

// Load page on DOM content loaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadLeaderboardData();
});

// Function to load leaderboard data
async function loadLeaderboardData() {
    try {
        showLoading();
        
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        if (response.ok) {
            if (data.leaderboard && data.leaderboard.length > 0) {
                displayLeaderboard(data.leaderboard);
                showLeaderboard();
            } else {
                showNoData();
            }
        } else {
            console.error('Failed to load leaderboard:', data.error);
            showNoData();
        }
    } catch (error) {
        console.error('Error loading leaderboard data:', error);
        showNoData();
    }
}

// Function to display leaderboard
function displayLeaderboard(leaderboardData) {
    leaderboardBody.innerHTML = '';
    
    leaderboardData.forEach((player, index) => {
        const row = document.createElement('tr');
        
        // Add current user highlighting
        if (player.isCurrentUser) {
            row.classList.add('current-user');
        }
        
        // Add rank styling for top 3
        let rankClass = '';
        if (index === 0) rankClass = 'rank-1';
        else if (index === 1) rankClass = 'rank-2';
        else if (index === 2) rankClass = 'rank-3';
        
        // Calculate win rate class
        const winRateClass = getWinRateClass(player.winRate);
        
        row.innerHTML = `
            <td class="${rankClass}">${index + 1}</td>
            <td>${player.username}</td>
            <td>${player.totalBattles}</td>
            <td>${player.wins}</td>
            <td class="win-rate ${winRateClass}">${player.winRate}%</td>
            <td>${player.totalScore.toFixed(1)}</td>
            <td class="points">${player.points}</td>
        `;
        
        leaderboardBody.appendChild(row);
    });
}

// Function to get win rate CSS class
function getWinRateClass(winRate) {
    if (winRate >= 70) return 'high';
    if (winRate >= 40) return 'medium';
    return 'low';
}

// Function to show loading state
function showLoading() {
    loadingSection.style.display = 'block';
    leaderboardSection.style.display = 'none';
    noDataSection.style.display = 'none';
}

// Function to show leaderboard
function showLeaderboard() {
    loadingSection.style.display = 'none';
    leaderboardSection.style.display = 'block';
    noDataSection.style.display = 'none';
}

// Function to show no data state
function showNoData() {
    loadingSection.style.display = 'none';
    leaderboardSection.style.display = 'none';
    noDataSection.style.display = 'block';
}
