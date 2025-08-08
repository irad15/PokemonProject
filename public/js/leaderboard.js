/**
 * Leaderboard Page - Client-side JavaScript
 * 
 * This file handles the leaderboard functionality to display user rankings and statistics.
 * It manages the display of user performance data and competitive rankings.
 * 
 * Key Features:
 * - User rankings and statistics display
 * - Battle win/loss records
 * - Performance metrics and achievements
 * - Real-time leaderboard updates
 * - User profile links and details
 * - Sorting and filtering options
 * 
 * Works with:
 * - leaderboard.html (leaderboard page)
 * - utils.js (for data fetching and utilities)
 * - /api/arena (server endpoint for user statistics)
 * - auth-header.js (for user authentication)
 * 
 * Dependencies: utils.js (for API calls and shared functions)
 */

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
