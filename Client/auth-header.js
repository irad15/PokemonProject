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

// Function to get current user data
function getCurrentUser() {
    const userData = sessionStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

// Function to check if user is authenticated
function isAuthenticated() {
    return sessionStorage.getItem('user') !== null;
} 