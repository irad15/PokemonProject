/**
 * Home Page - Client-side JavaScript
 * 
 * This file handles the home page functionality and user welcome interface.
 * It manages the landing page features and user experience for new and returning users.
 * 
 * Key Features:
 * - Welcome message and user introduction
 * - Quick navigation to main features
 * - User statistics display
 * - Recent activity overview
 * - Feature highlights and tutorials
 * - Responsive design interactions
 * 
 * Works with:
 * - home.html (main landing page)
 * - utils.js (for user data and utilities)
 * - auth-header.js (for user authentication display)
 * - Various CSS files for styling
 * 
 * Dependencies: utils.js (for user data and shared functions)
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load project information and developer data
    loadProjectData();
});

async function loadProjectData() {
    try {
        // Show loading state
        showLoading();
        
        // Fetch project data from server
        const response = await fetch('/api/project-info');
        
        if (!response.ok) {
            throw new Error('Failed to load project data');
        }
        
        const data = await response.json();
        
        // Display project description
        displayProjectDescription(data.projectDescription);
        
        // Display developers information
        displayDevelopers(data.developers);
        
    } catch (error) {
        console.error('Error loading project data:', error);
        displayError('Error loading project data');
    }
}

function displayProjectDescription(description) {
    const descriptionElement = document.getElementById('project-description');
    if (descriptionElement) {
        descriptionElement.innerHTML = `
            <p>${description}</p>
        `;
    }
}

function displayDevelopers(developers) {
    const developersElement = document.getElementById('developers-list');
    if (developersElement && developers.length > 0) {
        const developersHTML = developers.map(developer => `
            <div class="developer-card">
                <div class="developer-name">${developer.name}</div>
                <div class="developer-id">Student ID: ${developer.id}</div>
            </div>
        `).join('');
        
        developersElement.innerHTML = developersHTML;
    }
}

function showLoading() {
    const descriptionElement = document.getElementById('project-description');
    const developersElement = document.getElementById('developers-list');
    
    if (descriptionElement) {
        descriptionElement.innerHTML = '<div class="loading">Loading project description...</div>';
    }
    
    if (developersElement) {
        developersElement.innerHTML = '<div class="loading">Loading developers information...</div>';
    }
}

function displayError(message) {
    const descriptionElement = document.getElementById('project-description');
    const developersElement = document.getElementById('developers-list');
    
    if (descriptionElement) {
        descriptionElement.innerHTML = `
            <div style="color: #e53e3e; text-align: center; padding: 20px;">
                <p>${message}</p>
                <button onclick="loadProjectData()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
    
    if (developersElement) {
        developersElement.innerHTML = `
            <div style="color: #e53e3e; text-align: center; padding: 20px;">
                <p>Error loading developers information</p>
            </div>
        `;
    }
}

// Add smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
}); 