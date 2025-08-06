// DOM element references for the search page
const pokemonListBody = document.getElementById("pokemonList"); // Table body for search results
const txtSearch = document.getElementById("txtSearch"); // Search input field
const loader = document.getElementById("loader"); // Loading spinner
const statsModal = document.getElementById("statsModal"); // Modal for displaying stats
const modalTitle = document.getElementById("modalTitle"); // Modal title (Pokémon name)
const modalStats = document.getElementById("modalStats"); // Modal stats list
const modalLoader = document.getElementById("modalLoader"); // Modal loading spinner

// Saves a Pokémon to the user's favorites via server API
async function saveToFavorites(pokemon) {
    try {
        const response = await fetch('/api/favorites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pokemonId: pokemon.id })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`${formatPokemonName(pokemon.name)} added to favorites! (${result.count}/10)`);
            // Update the counter after successful addition
            loadFavoritesCounter();
        } else {
            alert(result.error || 'Failed to add to favorites');
        }
    } catch (error) {
        console.error('Error adding to favorites:', error);
        alert('Failed to add to favorites. Please try again.');
    }
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
        const name = formatPokemonName(pokemon.name); // Use shared formatting
        const id = pokemon.id;
        const types = pokemon.types.map(t => t.type.name).join(", ");
        const abilities = pokemon.abilities.map(a => a.ability.name).join(", ");
        
        return `
            <tr>
                <td><img src="${sprite}" alt="${name}" width="100"></td>
                <td><span class="name-link" onclick="fetchPokemonStats(${id}, '${name}')" aria-label="View details for ${name}">${name}</span></td>
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
    return [await fetchJson(`${API_BASE_URL}pokemon/${id}`)];
}

// Search handler: Fetches Pokémon by name
async function searchByName(name) {
    return [await fetchJson(`${API_BASE_URL}pokemon/${name.toLowerCase()}`)];
}

// Search handler: Fetches Pokémon with a specific ability
async function searchByAbility(ability) {
    const data = await fetchJson(`${API_BASE_URL}ability/${ability.toLowerCase()}`);
    const pokemonPromises = data.pokemon.map(p => fetchJson(p.pokemon.url));
    return Promise.all(pokemonPromises);
}

// Search handler: Fetches Pokémon of a specific type
async function searchByType(type) {
    const data = await fetchJson(`${API_BASE_URL}type/${type.toLowerCase()}`);
    const pokemonPromises = data.pokemon.map(p => fetchJson(p.pokemon.url));
    return Promise.all(pokemonPromises);
}

// Search handler: Fetches Pokémon whose names contain the search query (substring search)
async function searchBySubstring(query) {
    const data = await fetchJson(`${API_BASE_URL}pokemon?limit=1025`);
    const matches = data.results.filter(p => p.name.includes(query.toLowerCase()));
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
                        pokemonArray = await searchBySubstring(searchQuery);
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

// Initializes search functionality on page load
document.addEventListener("DOMContentLoaded", () => {
    // Load favorites counter
    loadFavoritesCounter();
    
    // Check if we should clear search (after login)
    const shouldClearSearch = localStorage.getItem('clearSearchOnLoad') === 'true';
    if (shouldClearSearch) {
        localStorage.removeItem('clearSearchOnLoad');
        localStorage.removeItem('searchQuery');
        txtSearch.value = '';
        pokemonListBody.innerHTML = '';
    }
    
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

    // Load initial search query from URL or localStorage (only if not clearing)
    if (!shouldClearSearch) {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get("query") || localStorage.getItem("searchQuery") || "";

        if (searchQuery) {
            txtSearch.value = searchQuery;
            fetchPokemon(searchQuery);
        }
    }

    // Attach debounced search to input field
    txtSearch.addEventListener("input", debouncedSearch);
});

// Load and display favorites counter
async function loadFavoritesCounter() {
    try {
        const response = await fetch('/api/favorites/count');
        const data = await response.json();
        
        const counterElement = document.getElementById('favoritesCounter');
        if (counterElement) {
            counterElement.textContent = `Favorites: ${data.count}/${data.maxCount}`;
            
            // Update counter styling based on count
            counterElement.classList.remove('warning', 'full');
            if (data.count >= data.maxCount) {
                counterElement.classList.add('full');
            } else if (data.count >= data.maxCount * 0.8) {
                counterElement.classList.add('warning');
            }
        }
    } catch (error) {
        console.error('Error loading favorites counter:', error);
    }
}