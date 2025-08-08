/**
 * Authentication Header - Client-side JavaScript
 * 
 * This file handles the authentication header functionality that appears on all pages.
 * It manages user login/logout state, navigation, and authentication UI elements.
 * 
 * Key Features:
 * - User authentication state management
 * - Login/logout functionality
 * - Navigation menu for authenticated users
 * - User profile display
 * - Session management
 * - Authentication status updates
 * 
 * Works with:
 * - All HTML pages (included in header)
 * - utils.js (for authentication utilities)
 * - /api/auth/logout (server endpoint)
 * - Browser localStorage for session data
 * 
 * Dependencies: utils.js (for authentication and shared functions)
 */

// Clear search data from localStorage and URL
const clearSearchData = () => {
    localStorage.removeItem("searchQuery");
    // Clear URL parameters if on search page
    if (window.location.pathname.includes('search')) {
        window.history.replaceState(null, "", window.location.pathname);
    }
};

// Authentication header functionality
document.addEventListener('DOMContentLoaded', function() {
    addAuthHeader();
    checkAuthStatus();
});

function addAuthHeader() {
    // Create header element
    const header = document.createElement('div');
    header.className = 'auth-header';
    header.innerHTML = `
        <div class="auth-header-content">
            <div class="user-info">
                <span id="userName">Welcome</span>
            </div>
            <div class="auth-actions">
                <button id="logoutBtn" class="btn btn-logout">Logout</button>
            </div>
        </div>
    `;
    
    // Insert header at the top of the body
    document.body.insertBefore(header, document.body.firstChild);
    
    // Add logout functionality
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.isAuthenticated) {
            // Update user name in header
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = `Welcome, ${data.user.firstName}`;
            }
            
            // Store user data in sessionStorage for client-side access
            sessionStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                firstName: data.user.firstName,
                email: data.user.email
            }));
        } else {
            // Redirect to home if not authenticated
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        // Redirect to home on error
        window.location.href = '/';
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Clear sessionStorage
            sessionStorage.removeItem('user');
            
            // Clear search data when logging out
            clearSearchData();
            
            // Redirect to home page
            window.location.href = '/';
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Redirect to home even if logout fails
        sessionStorage.removeItem('user');
        // Clear search data when logout fails too
        clearSearchData();
        window.location.href = '/';
    }
}