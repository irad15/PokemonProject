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
        API_BASE_URL
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
} 
