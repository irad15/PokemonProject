// DOM element references for the favorites page
const favoritePokemonList = document.getElementById("favoritePokemonList"); // Table body for favorite Pokémon
const sortField = document.getElementById("sortField"); // Dropdown for sort field (name or ID)
const sortDirection = document.getElementById("sortDirection"); // Dropdown for sort direction (ascending or descending)
const statsModal = document.getElementById("statsModal"); // Modal for displaying stats
const modalTitle = document.getElementById("modalTitle"); // Modal title (Pokémon name)
const modalStats = document.getElementById("modalStats"); // Modal stats list
const modalLoader = document.getElementById("modalLoader"); // Modal loading spinner

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
            alert("Pokémon removed from favorites!");
            displayFavorites(); // Refresh the table
        } else {
            alert(result.error || 'Failed to remove from favorites');
        }
    } catch (error) {
        console.error('Error removing from favorites:', error);
        alert('Failed to remove from favorites. Please try again.');
    }
}

// Saves the favorites list as a downloadable JSON file
async function saveFavoritesAsJson() {
    try {
        const response = await fetch('/api/favorites');
        const favoriteIds = await response.json();
        
        // Check if there are favorites to save
        if (favoriteIds.length === 0) {
            alert("No favorite Pokémon to save!");
            return;
        }
        
        // Fetch full Pokemon data for each favorite ID
        const pokemonPromises = favoriteIds.map(async (favorite) => {
            try {
                const pokemon = await fetchJson(`${API_BASE_URL}pokemon/${favorite.id}`);
                return {
                    ...pokemon,
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
            alert("Error loading favorites data!");
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
        alert("Favorites saved as favorites.json!");
    } catch (error) {
        console.error('Error saving favorites:', error);
        alert('Failed to save favorites. Please try again.');
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
        
        alert("Favorites saved as favorites.csv!");
    } catch (error) {
        console.error('Error saving favorites as CSV:', error);
        alert('Failed to save favorites as CSV. Please try again.');
    }
}

// Applies sorting based on dropdown selections
function applySort() {
    // Refresh table with sorted data
    displayFavorites();
}

// Renders favorite Pokémon from server API to the table
async function displayFavorites() {
    try {
        const response = await fetch('/api/favorites');
        const favoriteIds = await response.json();
        
        if (favoriteIds.length === 0) {
            favoritePokemonList.innerHTML = "<tr><td colspan='6'>No favorites yet</td></tr>";
            return;
        }
        
        // Show loading state
        favoritePokemonList.innerHTML = "<tr><td colspan='6' style='text-align: center;'>Loading favorites...</td></tr>";
        
        // Fetch full Pokemon data for each favorite ID
        const pokemonPromises = favoriteIds.map(async (favorite) => {
            try {
                const pokemon = await fetchJson(`${API_BASE_URL}pokemon/${favorite.id}`);
                return {
                    ...pokemon,
                    addedAt: favorite.addedAt
                };
            } catch (error) {
                console.error(`Error fetching Pokemon ${favorite.id}:`, error);
                return null;
            }
        });
        
        const pokemonList = await Promise.all(pokemonPromises);
        const validPokemon = pokemonList.filter(pokemon => pokemon !== null);
        
        // Get sort field and direction from dropdowns
        const field = sortField.value;
        const direction = sortDirection.value;
        
        // Sort favorites based on selected field and direction
        if (field === "name") {
            validPokemon.sort((a, b) => direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        } else if (field === "id") {
            validPokemon.sort((a, b) => direction === "asc" ? a.id - b.id : b.id - a.id);
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
        console.error('Error loading favorites:', error);
        favoritePokemonList.innerHTML = "<tr><td colspan='6'>Error loading favorites</td></tr>";
    }
}

// Initializes the favorites table on page load
document.addEventListener("DOMContentLoaded", () => {
    displayFavorites();
});