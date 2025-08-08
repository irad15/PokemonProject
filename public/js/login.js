/**
 * Login Page - Client-side JavaScript
 * 
 * This file handles the user login functionality on the login page.
 * It manages form validation, authentication, and user session management.
 * 
 * Key Features:
 * - Login form validation and processing
 * - User authentication with server
 * - Session management and storage
 * - Error handling and user feedback
 * - Redirect to home page after successful login
 * - Remember me functionality
 * 
 * Works with:
 * - login.html (login page)
 * - /api/auth/login (server endpoint)
 * - home.html (redirect destination)
 * - utils.js (for authentication utilities)
 * 
 * Dependencies: utils.js (for authentication and shared functions)
 */

// Import shared utilities
// Note: In a real project, you'd use ES6 modules or a bundler
// For now, we'll assume shared.js is loaded before this file

document.addEventListener('DOMContentLoaded', async function() {
    
    const form = document.getElementById('loginForm');
    const inputs = form.querySelectorAll('input');
    
    // Validation rules for login form
    const validationRules = {
        email: [
            { validator: (value) => value.length > 0, message: 'Email is required' },
            { validator: isValidEmail, message: 'Please enter a valid email address' }
        ],
        password: [
            { validator: (value) => value.length > 0, message: 'Password is required' }
        ]
    };
    
    // Add event listeners for real-time validation
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input, validationRules));
        input.addEventListener('input', () => clearFieldError(input));
    });
    
    // Form submission
    form.addEventListener('submit', handleFormSubmission);
});

function validateForm() {
    const inputs = document.querySelectorAll('#loginForm input');
    let isValid = true;
    
    const validationRules = {
        email: [
            { validator: (value) => value.length > 0, message: 'Email is required' },
            { validator: isValidEmail, message: 'Please enter a valid email address' }
        ],
        password: [
            { validator: (value) => value.length > 0, message: 'Password is required' }
        ]
    };
    
    inputs.forEach(input => {
        if (!validateField(input, validationRules)) {
            isValid = false;
        }
    });
    
    return isValid;
}

async function handleFormSubmission(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const formData = new FormData(event.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        // Disable button and show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';
        
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showLoginSuccessMessage('Login successful! Redirecting to search page...');
            
            // Store user session data
            sessionStorage.setItem('user', JSON.stringify({
                id: result.userId,
                firstName: result.firstName,
                email: result.email
            }));
            
            // Set flag to clear search on next page load
            localStorage.setItem('clearSearchOnLoad', 'true');
            
            setTimeout(() => {
                window.location.href = '/search';
            }, 2000);
        } else {
            showLoginErrorMessage(result.error || 'Login failed. Please check your credentials.');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showLoginErrorMessage('Network error. Please check your connection and try again.');
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Use shared message functions with different names to avoid recursion
function showLoginSuccessMessage(message) {
    showSuccessMessage(message, 'loginForm');
}

function showLoginErrorMessage(message) {
    showErrorMessage(message, 'loginForm');
} 