/**
 * Favorite Pokemon Page - Client-side JavaScript
 * 
 * This file handles the favorite Pokemon management functionality.
 * It allows users to view, manage, and organize their favorite Pokemon collection.
 * 
 * Key Features:
 * - Display user's favorite Pokemon list
 * - Remove Pokemon from favorites
 * - Pokemon details and statistics display
 * - Search and filter favorites
 * - Pokemon team management
 * - Integration with battle system
 * 
 * Works with:
 * - favorite_pokemon.html (favorites page)
 * - utils.js (for Pokemon data and utilities)
 * - /api/favorites (server endpoint for favorites management)
 * - PokeAPI (for Pokemon details)
 * 
 * Dependencies: utils.js (for API calls and shared functions)
 */

// DOM element references for the favorites page
const favoritePokemonList = document.getElementById("favoritePokemonList"); // Table body for favorite Pokémon
const statsModal = document.getElementById("statsModal"); // Modal for displaying stats
const modalTitle = document.getElementById("modalTitle"); // Modal title (Pokémon name)
const modalStats = document.getElementById("modalStats"); // Modal stats list
const modalLoader = document.getElementById("modalLoader"); // Modal loading spinner

// Sorting state
let currentSortField = null;
let currentSortDirection = 'asc';

// Removes a Pokémon from the user's favorites via server API
async function removeFromFavorites(pokemonId) {
    try {
        const response = await fetch(`/api/favorites/${pokemonId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayFavorites(); // Refresh the table
        } else {
            alert(result.error || 'Failed to remove from favorites');
        }
    } catch (error) {
        handleApiError(error, 'remove from favorites');
    }
}

// Saves the favorites list as a downloadable JSON file
async function saveFavoritesAsJson() {
    try {
        const validPokemon = await loadUserFavoritesData();
        
        // Check if there are favorites to save
        if (validPokemon.length === 0) {
            alert("No favorite Pokémon to save!");
            return;
        }
        
        // Convert favorites to a pretty-printed JSON string
        const jsonString = JSON.stringify(validPokemon, null, 2);
        // Create a Blob for the JSON file
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        // Create a temporary link to trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = "favorites.json";
        document.body.appendChild(a);
        a.click();
        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Close dropdown after saving
        toggleSaveDropdown();
    } catch (error) {
        handleApiError(error, 'save favorites');
    }
}

// Saves the favorites list as a downloadable CSV file
async function saveFavoritesAsCsv() {
    try {
        const response = await fetch('/api/favorites/download');
        if (!response.ok) {
            throw new Error('Failed to download favorites');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "favorites.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Close dropdown after saving
        toggleSaveDropdown();
    } catch (error) {
        handleApiError(error, 'save favorites as CSV');
    }
}

// Toggle save dropdown visibility
function toggleSaveDropdown() {
    const dropdown = document.getElementById('saveDropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('saveDropdown');
    const saveBtn = document.querySelector('.save-btn');
    
    if (!saveBtn.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Sort table by clicking on headers
function sortTable(field) {
    // If clicking the same field, toggle direction
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New field, start with ascending
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    
    // Update arrow indicators
    updateSortArrows();
    
    // Refresh the table with sorted data
    displayFavorites();
}

// Update sort arrow indicators
function updateSortArrows() {
    // Reset all arrows
    document.querySelectorAll('.sort-arrow').forEach(arrow => {
        arrow.textContent = '↕';
        arrow.className = 'sort-arrow';
    });
    
    // Set the active arrow
    if (currentSortField) {
        const activeArrow = document.getElementById(`${currentSortField}-arrow`);
        if (activeArrow) {
            activeArrow.textContent = currentSortDirection === 'asc' ? '↑' : '↓';
            activeArrow.className = `sort-arrow ${currentSortDirection}`;
        }
    }
}

// Renders favorite Pokémon from server API to the table
async function displayFavorites() {
    try {
        const validPokemon = await loadUserFavoritesData();
        
        if (validPokemon.length === 0) {
            favoritePokemonList.innerHTML = "<tr><td colspan='6'>No favorites yet</td></tr>";
            return;
        }
        
        // Show loading state
        favoritePokemonList.innerHTML = "<tr><td colspan='6' style='text-align: center;'>Loading favorites...</td></tr>";
        
        // Sort favorites based on current sort state
        if (currentSortField === "name") {
            validPokemon.sort((a, b) => currentSortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        } else if (currentSortField === "id") {
            validPokemon.sort((a, b) => currentSortDirection === "asc" ? a.id - b.id : b.id - a.id);
        }
        
        // Generate table rows for favorites
        favoritePokemonList.innerHTML = validPokemon.length
            ? validPokemon.map(pokemon => `
                <tr>
                    <td><img src="${pokemon.sprites.front_default || 'https://via.placeholder.com/100?text=No+Image'}" width="100" alt="${pokemon.name}"></td>
                    <td><span class="name-link" onclick="fetchPokemonStats(${pokemon.id}, '${pokemon.name}')" aria-label="View details for ${pokemon.name}">${formatPokemonName(pokemon.name)}</span></td>
                    <td>${pokemon.id}</td>
                    <td>${pokemon.types.map(t => t.type.name).join(", ")}</td>
                    <td>${pokemon.abilities.map(a => a.ability.name).join(", ")}</td>
                    <td><button onclick="removeFromFavorites(${pokemon.id})">Remove from Favorites</button></td>
                </tr>`).join("")
            : "<tr><td colspan='6'>Error loading some favorites</td></tr>";
            
    } catch (error) {
        handleApiError(error, 'load favorites');
        favoritePokemonList.innerHTML = "<tr><td colspan='6'>Error loading favorites</td></tr>";
    }
}

// Initializes the favorites table on page load
document.addEventListener("DOMContentLoaded", () => {
    displayFavorites();
});