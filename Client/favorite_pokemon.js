// DOM element references for the favorites page
const favoritePokemonList = document.getElementById("favoritePokemonList"); // Table body for favorite Pokémon
const sortField = document.getElementById("sortField"); // Dropdown for sort field (name or ID)
const sortDirection = document.getElementById("sortDirection"); // Dropdown for sort direction (ascending or descending)
const statsModal = document.getElementById("statsModal"); // Modal for displaying stats
const modalTitle = document.getElementById("modalTitle"); // Modal title (Pokémon name)
const modalStats = document.getElementById("modalStats"); // Modal stats list
const modalLoader = document.getElementById("modalLoader"); // Modal loading spinner
const baseUrl = "https://pokeapi.co/api/v2/"; // Base URL for PokéAPI

// Fetches JSON data from the specified URL
// Handles HTTP errors, including rate limiting (429)
const fetchJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 429) throw new Error("Too many requests. Please try again later.");
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

// Removes a Pokémon from the favorites list in localStorage
function removeFromFavorites(pokemonId) {
    let favorites = [];
    // Load existing favorites or initialize an empty array
    try {
        favorites = JSON.parse(localStorage.getItem("favoritePokemons") || "[]");
    } catch {
        alert("Error accessing localStorage. Please check if it is enabled.");
        return;
    }
    // Filter out the Pokémon with the specified ID
    const updatedFavorites = favorites.filter(pokemon => pokemon.id !== pokemonId);
    // Save updated favorites to localStorage
    localStorage.setItem("favoritePokemons", JSON.stringify(updatedFavorites));
    // Refresh the table
    displayFavorites();
    alert("Pokémon removed from favorites!");
}

// Saves the favorites list as a downloadable JSON file
function saveFavoritesAsJson() {
    let favorites = [];
    // Load existing favorites or initialize an empty array
    try {
        favorites = JSON.parse(localStorage.getItem("favoritePokemons") || "[]");
    } catch {
        alert("Error accessing localStorage. Please check if it is enabled.");
        return;
    }
    // Check if there are favorites to save
    if (favorites.length === 0) {
        alert("No favorite Pokémon to save!");
        return;
    }
    // Convert favorites to a pretty-printed JSON string
    const jsonString = JSON.stringify(favorites, null, 2);
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
}

// Fetches Pokémon stats from PokéAPI and displays them in a modal
async function fetchPokemonStats(pokemonId, pokemonName) {
    modalLoader.classList.add("active"); // Show loading spinner
    modalStats.innerHTML = ""; // Clear previous stats
    try {
        // Fetch Pokémon data from PokéAPI
        const pokemon = await fetchJson(`${baseUrl}pokemon/${pokemonId}`);
        // Format stats (e.g., "special-attack" -> "special attack")
        const stats = pokemon.stats.map(stat => ({
            name: stat.stat.name.replace("-", " "),
            value: stat.base_stat
        }));
        // Display stats in modal
        showStatsModal(pokemonName, stats);
    } catch (error) {
        // Display error message if stats fail to load
        modalStats.innerHTML = `<li>Error loading stats: ${error.message}</li>`;
        modalLoader.classList.remove("active"); // Hide loading spinner
        statsModal.style.display = "block"; // Show modal with error
    }
}

// Displays stats in a modal
function showStatsModal(pokemonName, stats) {
    modalLoader.classList.add("active"); // Show loading spinner
    modalStats.innerHTML = ""; // Clear previous stats
    try {
        // Set modal title and stats list
        modalTitle.textContent = `${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)} Stats`;
        modalStats.innerHTML = stats.map(stat => `<li>${stat.name.charAt(0).toUpperCase() + stat.name.slice(1)}: ${stat.value}</li>`).join("");
    } catch (error) {
        // Display error message if stats fail to load
        modalStats.innerHTML = `<li>Error displaying stats: ${error.message}</li>`;
    } finally {
        modalLoader.classList.remove("active"); // Hide loading spinner
        statsModal.style.display = "block"; // Show modal
    }
}

// Closes the stats modal and clears its content
function closeStatsModal() {
    statsModal.style.display = "none";
    modalStats.innerHTML = "";
    modalTitle.textContent = "";
}

// Applies sorting based on dropdown selections
function applySort() {
    // Refresh table with sorted data
    displayFavorites();
}

// Renders favorite Pokémon from localStorage to the table
function displayFavorites() {
    let favorites = [];
    // Load existing favorites or initialize an empty array
    try {
        favorites = JSON.parse(localStorage.getItem("favoritePokemons") || "[]");
    } catch {
        favoritePokemonList.innerHTML = "<tr><td colspan='6'>Error loading favorites</td></tr>";
        return;
    }
    // Get sort field and direction from dropdowns
    const field = sortField.value;
    const direction = sortDirection.value;
    // Sort favorites based on selected field and direction
    if (field === "name") {
        favorites.sort((a, b) => direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    } else if (field === "id") {
        favorites.sort((a, b) => direction === "asc" ? a.id - b.id : b.id - a.id);
    }
    // Generate table rows for favorites
    favoritePokemonList.innerHTML = favorites.length
        ? favorites.map(pokemon => `
            <tr>
                <td><img src="${pokemon.sprite}" width="100" alt="${pokemon.name}"></td>
                <td><span class="name-link" onclick="fetchPokemonStats(${pokemon.id}, '${pokemon.name}')" aria-label="View stats for ${pokemon.name}">${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</span></td>
                <td>${pokemon.id}</td>
                <td>${pokemon.types.join(", ")}</td>
                <td>${pokemon.abilities.join(", ")}</td>
                <td><button onclick="removeFromFavorites(${pokemon.id})">Remove from Favorites</button></td>
            </tr>`).join("")
        : "<tr><td colspan='6'>No favorites yet</td></tr>";
}

// Initializes the favorites table on page load
document.addEventListener("DOMContentLoaded", () => {
    displayFavorites();
});