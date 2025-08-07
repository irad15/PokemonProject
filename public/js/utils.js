// Shared JavaScript utilities for Pokemon Project
// Common functions used across multiple pages

// API utilities
var API_BASE_URL = 'https://pokeapi.co/api/v2/';



// Fetches JSON data from the specified URL with error handling
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 429) throw new Error("Too many requests. Please try again later.");
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// Validation utilities
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNonAlphanumeric = /[^A-Za-z0-9]/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNonAlphanumeric;
};

// Form validation functions
const validateField = (field, validationRules) => {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    const rules = validationRules[fieldName];
    if (rules) {
        for (const rule of rules) {
            if (!rule.validator(value)) {
                errorMessage = rule.message;
                isValid = false;
                break;
            }
        }
    }
    
    if (isValid) {
        showFieldSuccess(field);
        clearFieldError(field);
    } else {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
};

const showFieldError = (field, message) => {
    field.classList.remove('success');
    field.classList.add('error');
    
    const errorElement = document.getElementById(field.name + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
    }
};

const showFieldSuccess = (field) => {
    field.classList.remove('error');
    field.classList.add('success');
};

const clearFieldError = (field) => {
    const errorElement = document.getElementById(field.name + 'Error');
    if (errorElement) {
        errorElement.textContent = '';
    }
};

// Message display utilities
const showSuccessMessage = (message, formId) => {
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    const form = document.getElementById(formId);
    if (form) {
        form.insertBefore(successDiv, form.firstChild);
    }
};

const showErrorMessage = (message, formId) => {
    const existingMessage = document.querySelector('.error-message-global');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-global';
    errorDiv.textContent = message;
    
    const form = document.getElementById(formId);
    if (form) {
        form.insertBefore(errorDiv, form.firstChild);
    }
};

// Pokemon utilities
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatPokemonName(name) {
    return capitalizeFirst(name);
}

// Debounce utility
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

// Search utilities
const clearSearchData = () => {
    localStorage.removeItem("searchQuery");
    // Clear URL parameters if on search page
    if (window.location.pathname.includes('search')) {
        window.history.replaceState(null, "", window.location.pathname);
    }
};

// Pokemon details modal functionality
function showPokemonDetailsModal(pokemon) {
    try {
        // Set modal title
        const modalTitle = document.getElementById('modalTitle');
        modalTitle.textContent = `${formatPokemonName(pokemon.name)} Details`;
        
        // Get large image
        const largeImage = pokemon.sprites.other['official-artwork'].front_default || 
                          pokemon.sprites.front_default || 
                          'https://via.placeholder.com/300x300?text=No+Image';
        
        // Format stats
        const stats = pokemon.stats.map(stat => ({
            name: stat.stat.name.replace("-", " "),
            value: stat.base_stat
        }));
        
        // Format abilities
        const abilities = pokemon.abilities.map(ability => ({
            name: ability.ability.name,
            isHidden: ability.is_hidden
        }));
        
        // Format types
        const types = pokemon.types.map(type => type.type.name);
        
        // Create detailed content with better organization
        const detailsContent = `
            <div class="pokemon-details">
                <div class="pokemon-header">
                    <div class="pokemon-image">
                        <img src="${largeImage}" alt="${pokemon.name}">
                    </div>
                    <div class="pokemon-basic-info">
                        <h2>#${pokemon.id} - ${formatPokemonName(pokemon.name)}</h2>
                        <div class="pokemon-types">
                            ${types.map(type => `<span class="type-badge">${type}</span>`).join("")}
                        </div>
                        <div class="pokemon-physical">
                            <p><strong>Height:</strong> ${pokemon.height / 10}m</p>
                            <p><strong>Weight:</strong> ${pokemon.weight / 10}kg</p>
                        </div>
                    </div>
                </div>
                
                <div class="pokemon-content">
                    <div class="pokemon-section">
                        <h3>Abilities</h3>
                        <div class="abilities-list">
                            ${abilities.map(ability => 
                                `<div class="ability-item">
                                    <span class="ability-name">${formatPokemonName(ability.name)}</span>
                                    ${ability.isHidden ? '<span class="hidden-badge">Hidden</span>' : ''}
                                </div>`
                            ).join("")}
                        </div>
                    </div>
                    
                    <div class="pokemon-section">
                        <h3>Base Stats</h3>
                        <div class="stats-grid">
                            ${stats.map(stat => 
                                `<div class="stat-item">
                                    <span class="stat-name">${formatPokemonName(stat.name)}</span>
                                    <span class="stat-value">${stat.value}</span>
                                </div>`
                            ).join("")}
                        </div>
                    </div>
                    
                    <div class="pokemon-section">
                        <h3>YouTube Videos</h3>
                        <div class="youtube-links">
                            <p>Search for ${formatPokemonName(pokemon.name)} videos on YouTube:</p>
                            <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(pokemon.name + ' pokemon')}" target="_blank" class="youtube-link">
                                Watch ${formatPokemonName(pokemon.name)} Videos
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalStats = document.getElementById('modalStats');
        modalStats.innerHTML = detailsContent;
        
        // Hide loading spinner if it exists
        const modalLoader = document.getElementById('modalLoader');
        if (modalLoader) {
            modalLoader.classList.remove("active");
        }
        
        // Show modal
        const statsModal = document.getElementById('statsModal');
        statsModal.style.display = "block";
        
    } catch (error) {
        const modalStats = document.getElementById('modalStats');
        modalStats.innerHTML = `<li>Error displaying Pokemon details: ${error.message}</li>`;
        
        const modalLoader = document.getElementById('modalLoader');
        if (modalLoader) {
            modalLoader.classList.remove("active");
        }
        
        const statsModal = document.getElementById('statsModal');
        statsModal.style.display = "block";
    }
}

// Fetches Pokémon stats from PokéAPI and displays them in a modal
function fetchPokemonStats(pokemonId, pokemonName) {
    const modalLoader = document.getElementById("modalLoader");
    const modalStats = document.getElementById("modalStats");
    const statsModal = document.getElementById("statsModal");
    
    modalLoader.classList.add("active"); // Show loading spinner
    modalStats.innerHTML = ""; // Clear previous stats
    try {
        // Fetch Pokémon data from PokéAPI
        fetchJson(`${API_BASE_URL}pokemon/${pokemonId}`).then(pokemon => {
            // Display comprehensive Pokemon details
            showPokemonDetailsModal(pokemon);
        }).catch(error => {
            // Display error message if stats fail to load
            modalStats.innerHTML = `<li>Error loading Pokemon details: ${error.message}</li>`;
            modalLoader.classList.remove("active"); // Hide loading spinner
            statsModal.style.display = "block"; // Show modal with error
        });
    } catch (error) {
        // Display error message if stats fail to load
        modalStats.innerHTML = `<li>Error loading Pokemon details: ${error.message}</li>`;
        modalLoader.classList.remove("active"); // Hide loading spinner
        statsModal.style.display = "block"; // Show modal with error
    }
}

// Closes the stats modal and clears its content
function closeStatsModal() {
    const statsModal = document.getElementById("statsModal");
    const modalStats = document.getElementById("modalStats");
    const modalTitle = document.getElementById("modalTitle");
    
    statsModal.style.display = "none";
    modalStats.innerHTML = "";
    modalTitle.textContent = "";
}

// Additional Pokemon utilities from pokemonUtils.js

// Fetch Pokemon data from API
async function fetchPokemonData(pokemonId) {
    try {
        const response = await fetch(`${API_BASE_URL}pokemon/${pokemonId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching Pokemon ${pokemonId}:`, error);
        return null;
    }
}

// Fetch multiple Pokemon data
async function fetchMultiplePokemon(pokemonIds) {
    const pokemonPromises = pokemonIds.map(async (pokemonId) => {
        try {
            return await fetchPokemonData(pokemonId);
        } catch (error) {
            console.error(`Error fetching Pokemon ${pokemonId}:`, error);
            return null;
        }
    });
    
    const pokemonList = await Promise.all(pokemonPromises);
    return pokemonList.filter(pokemon => pokemon !== null);
}

// Generate Pokemon table row HTML
function generatePokemonTableRow(pokemon, showAddButton = true, showRemoveButton = false) {
    const sprite = pokemon.sprites.front_default || 'https://via.placeholder.com/100?text=No+Image';
    const name = formatPokemonName(pokemon.name);
    const id = pokemon.id;
    const types = pokemon.types.map(t => t.type.name).join(", ");
    const abilities = pokemon.abilities.map(a => a.ability.name).join(", ");
    
    let actionButton = '';
    if (showAddButton) {
        actionButton = `<button onclick='saveToFavorites(${JSON.stringify(pokemon)})'>Add to Favorites</button>`;
    } else if (showRemoveButton) {
        actionButton = `<button onclick="removeFromFavorites(${pokemon.id})">Remove from Favorites</button>`;
    }
    
    return `
        <tr>
            <td><img src="${sprite}" alt="${name}" width="100"></td>
            <td><span class="name-link" onclick="fetchPokemonStats(${id}, '${name}')" aria-label="View details for ${name}">${name}</span></td>
            <td>${id}</td>
            <td>${types}</td>
            <td>${abilities}</td>
            <td>${actionButton}</td>
        </tr>
    `;
}

// Generate Pokemon card HTML for grid display
function generatePokemonCard(pokemon, isSelectable = false, isSelected = false) {
    const sprite = pokemon.sprites.front_default || "https://via.placeholder.com/100?text=No+Image";
    const name = formatPokemonName(pokemon.name);
    const id = pokemon.id;
    
    const cardClass = isSelectable ? 'favorite-card' : 'pokemon-card';
    const selectedClass = isSelected ? 'selected' : '';
    const onClick = isSelectable ? `onclick="selectPokemon(${id})"` : '';
    const dataAttr = isSelectable ? `data-pokemon-id="${id}"` : '';
    
    return `
        <div class="${cardClass} ${selectedClass}" ${onClick} ${dataAttr}>
            <img src="${sprite}" alt="${name}" onerror="this.src='https://via.placeholder.com/100?text=Error'">
            <div class="pokemon-name">${name}</div>
            <div class="pokemon-id">#${id}</div>
        </div>
    `;
}

// Generate Pokemon stats HTML
function generateStatsHTML(stats) {
    const relevantStats = [
        { label: 'HP', value: stats[0].base_stat },
        { label: 'Attack', value: stats[1].base_stat },
        { label: 'Defense', value: stats[2].base_stat },
        { label: 'Speed', value: stats[5].base_stat }
    ];
    
    return relevantStats.map(stat => `
        <div class="stat-item">
            <span class="stat-label">${stat.label}</span>
            <span class="stat-value">${stat.value}</span>
        </div>
    `).join('');
}

// Display Pokemon in table
function displayPokemonInTable(pokemonArray, tableBodyElement, showAddButton = true, showRemoveButton = false) {
    if (!pokemonArray?.length) {
        tableBodyElement.innerHTML = "<tr><td colspan='6'>No Pokémon found</td></tr>";
        return;
    }

    const rows = pokemonArray.map(pokemon => 
        generatePokemonTableRow(pokemon, showAddButton, showRemoveButton)
    );

    tableBodyElement.innerHTML = rows.join("");
}

// Display Pokemon in grid
function displayPokemonInGrid(pokemonArray, gridElement, isSelectable = false) {
    if (!pokemonArray?.length) {
        gridElement.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3>No Pokemon Found</h3>
                <p>No Pokemon to display.</p>
            </div>
        `;
        return;
    }

    const cards = pokemonArray.map(pokemon => 
        generatePokemonCard(pokemon, isSelectable)
    );

    gridElement.innerHTML = cards.join('');
}

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

// Show no favorites message
function showNoFavoritesMessage(containerElement, showGoToSearchButton = true) {
    let messageHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <h3>No Favorite Pokemon Found</h3>
            <p>You need to add some Pokemon to your favorites first!</p>
    `;
    
    if (showGoToSearchButton) {
        messageHTML += `
            <button onclick="window.location.href='/search'" class="back-btn">
                Go to Search Pokemon
            </button>
        `;
    }
    
    messageHTML += '</div>';
    containerElement.innerHTML = messageHTML;
}

// Export utilities for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchJson,
        isValidEmail,
        isValidPassword,
        validateField,
        showFieldError,
        showFieldSuccess,
        clearFieldError,
        showSuccessMessage,
        showErrorMessage,
        capitalizeFirst,
        formatPokemonName,
        debounce,
        showPokemonDetailsModal,
        fetchPokemonStats,
        closeStatsModal,
        clearSearchData,
        API_BASE_URL,
        fetchPokemonData,
        fetchMultiplePokemon,
        generatePokemonTableRow,
        generatePokemonCard,
        generateStatsHTML,
        displayPokemonInTable,
        displayPokemonInGrid,
        loadFavoritesCounter,
        showNoFavoritesMessage
    };
}

// For browser usage, ensure functions are available globally
if (typeof window !== 'undefined') {
    window.fetchJson = fetchJson;
    window.isValidEmail = isValidEmail;
    window.isValidPassword = isValidPassword;
    window.validateField = validateField;
    window.showFieldError = showFieldError;
    window.showFieldSuccess = showFieldSuccess;
    window.clearFieldError = clearFieldError;
    window.showSuccessMessage = showSuccessMessage;
    window.showErrorMessage = showErrorMessage;
    window.capitalizeFirst = capitalizeFirst;
    window.formatPokemonName = formatPokemonName;
    window.debounce = debounce;
    window.showPokemonDetailsModal = showPokemonDetailsModal;
    window.fetchPokemonStats = fetchPokemonStats;
    window.closeStatsModal = closeStatsModal;
    window.clearSearchData = clearSearchData;
    window.API_BASE_URL = API_BASE_URL;
    window.fetchPokemonData = fetchPokemonData;
    window.fetchMultiplePokemon = fetchMultiplePokemon;
    window.generatePokemonTableRow = generatePokemonTableRow;
    window.generatePokemonCard = generatePokemonCard;
    window.generateStatsHTML = generateStatsHTML;
    window.displayPokemonInTable = displayPokemonInTable;
    window.displayPokemonInGrid = displayPokemonInGrid;
    window.loadFavoritesCounter = loadFavoritesCounter;
    window.showNoFavoritesMessage = showNoFavoritesMessage;
} 