// DOM element references for the search page
const pokemonListBody = document.getElementById("pokemonList"); // Table body for search results
const txtSearch = document.getElementById("txtSearch"); // Search input field
const loader = document.getElementById("loader"); // Loading spinner
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

// Saves a Pokémon to the favorites list in localStorage
function saveToFavorites(pokemon) {
    // Load existing favorites or initialize an empty array
    const favorites = JSON.parse(localStorage.getItem("favoritePokemons") || "[]");
    
    // Create a simplified Pokémon object for storage
    const pokemonData = {
        id: pokemon.id,
        name: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1), // Capitalize for storage
        sprite: pokemon.sprites.front_default || "https://via.placeholder.com/100?text=No+Image",
        types: pokemon.types.map(t => t.type.name),
        abilities: pokemon.abilities.map(a => a.ability.name),
    };
    
    // Check if Pokémon is already in favorites
    if (favorites.some(fav => fav.id === pokemonData.id)) {
        alert(`${pokemonData.name} is already in favorites!`);
        return;
    }
    
    // Add Pokémon to favorites and save to localStorage
    favorites.push(pokemonData);
    localStorage.setItem("favoritePokemons", JSON.stringify(favorites));
    alert(`${pokemonData.name} added to favorites!`);
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

// Renders Pokémon search results to the table
function displayPokemon(pokemonArray) {
    // Display "No Pokémon found" if array is empty
    if (!pokemonArray?.length) {
        pokemonListBody.innerHTML = "<tr><td colspan='6'>No Pokémon found</td></tr>";
        return;
    }

    // Generate table rows for each Pokémon
    const rows = pokemonArray.map((pokemon) => {
        const sprite = pokemon.sprites.front_default || 'https://via.placeholder.com/100?text=No+Image';
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1); // Capitalize for display
        const id = pokemon.id;
        const types = pokemon.types.map(t => t.type.name).join(", ");
        const abilities = pokemon.abilities.map(a => a.ability.name).join(", ");
        const stats = pokemon.stats.map(stat => ({
            name: stat.stat.name.replace("-", " "), // Format stats for modal
            value: stat.base_stat
        }));
        
        return `
            <tr>
                <td><img src="${sprite}" alt="${name}" width="100"></td>
                <td><span class="name-link" onclick='showStatsModal("${name}", ${JSON.stringify(stats)})' aria-label="View stats for ${name}">${name}</span></td>
                <td>${id}</td>
                <td>${types}</td>
                <td>${abilities}</td>
                <td>
                    <button onclick='saveToFavorites(${JSON.stringify(pokemon)})'>Add to Favorites</button>
                </td>
            </tr>
        `;
    });

    // Update table body with generated rows
    pokemonListBody.innerHTML = rows.join("");
}

// Search handler: Fetches Pokémon by ID
async function searchById(id) {
    return [await fetchJson(`${baseUrl}pokemon/${id}`)];
}

// Search handler: Fetches Pokémon by name
async function searchByName(name) {
    return [await fetchJson(`${baseUrl}pokemon/${name.toLowerCase()}`)];
}

// Search handler: Fetches Pokémon with a specific ability
async function searchByAbility(ability) {
    const data = await fetchJson(`${baseUrl}ability/${ability.toLowerCase()}`);
    const pokemonPromises = data.pokemon.map(p => fetchJson(p.pokemon.url));
    return Promise.all(pokemonPromises);
}

// Search handler: Fetches Pokémon of a specific type
async function searchByType(type) {
    const data = await fetchJson(`${baseUrl}type/${type.toLowerCase()}`);
    const pokemonPromises = data.pokemon.map(p => fetchJson(p.pokemon.url));
    return Promise.all(pokemonPromises);
}

// Search handler: Fetches Pokémon whose names start with a prefix
async function searchByPrefix(prefix) {
    const data = await fetchJson(`${baseUrl}pokemon?limit=1025`);
    const matches = data.results.filter(p => p.name.startsWith(prefix.toLowerCase()));
    const pokemonPromises = matches.map(p => fetchJson(p.url));
    return Promise.all(pokemonPromises);
}

// Main search function: Determines search type and fetches results
async function fetchPokemon(searchQuery) {
    loader.classList.add("active"); // Show loading spinner
    pokemonListBody.innerHTML = ""; // Clear table

    try {
        let pokemonArray;
        const isId = /^\d+$/.test(searchQuery); // Check if query is a number (ID)

        if (isId) {
            pokemonArray = await searchById(searchQuery);
        } else {
            try {
                pokemonArray = await searchByName(searchQuery);
            } catch {
                try {
                    pokemonArray = await searchByAbility(searchQuery);
                } catch {
                    try {
                        pokemonArray = await searchByType(searchQuery);
                    } catch {
                        pokemonArray = await searchByPrefix(searchQuery);
                    }
                }
            }
        }

        // Display search results
        displayPokemon(pokemonArray);
    } catch (error) {
        // Log and display error if search fails
        console.error("Error fetching Pokémon:", error);
        pokemonListBody.innerHTML = "<tr><td colspan='6'>No results found</td></tr>";
    } finally {
        loader.classList.remove("active"); // Hide loading spinner
    }
}

// Debounces a function to limit how often it runs
function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

// Initializes search functionality on page load
document.addEventListener("DOMContentLoaded", () => {
    // Create debounced search handler (waits 500ms after typing stops)
    const debouncedSearch = debounce(() => {
        const searchQuery = txtSearch.value.trim().toLowerCase();

        if (searchQuery) {
            // Save query to localStorage and update URL
            localStorage.setItem("searchQuery", searchQuery);
            const newUrl = `${window.location.pathname}?query=${encodeURIComponent(searchQuery)}`;
            window.history.replaceState(null, "", newUrl);
            fetchPokemon(searchQuery);
        } else {
            // Clear query from localStorage and URL, reset table
            localStorage.removeItem("searchQuery");
            window.history.replaceState(null, "", window.location.pathname);
            pokemonListBody.innerHTML = "";
        }
    }, 500);

    // Load initial search query from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("query") || localStorage.getItem("searchQuery") || "";

    if (searchQuery) {
        txtSearch.value = searchQuery;
        fetchPokemon(searchQuery);
    }

    // Attach debounced search to input field
    txtSearch.addEventListener("input", debouncedSearch);
});