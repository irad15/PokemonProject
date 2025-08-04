// Shared JavaScript utilities for Pokemon Project
// Common functions used across multiple pages

// API utilities
const API_BASE_URL = 'https://pokeapi.co/api/v2/';

// Fetches JSON data from the specified URL with error handling
const fetchJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 429) throw new Error("Too many requests. Please try again later.");
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

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
const capitalizeFirst = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatPokemonName = (name) => {
    return capitalizeFirst(name);
};

// Modal utilities
const showModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "block";
    }
};

const hideModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
    }
};

const clearModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.innerHTML = "";
        }
    }
};

// Loading utilities
const showLoading = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add("active");
    }
};

const hideLoading = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove("active");
    }
};

// Debounce utility
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

// Session utilities
const getUserSession = () => {
    const userData = sessionStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
};

const setUserSession = (userData) => {
    sessionStorage.setItem('user', JSON.stringify(userData));
};

const clearUserSession = () => {
    sessionStorage.removeItem('user');
};

// API response handler
const handleApiResponse = async (response, successCallback, errorCallback) => {
    try {
        const result = await response.json();
        
        if (response.ok) {
            if (successCallback) successCallback(result);
        } else {
            if (errorCallback) errorCallback(result.error || 'Request failed');
        }
        
        return { success: response.ok, data: result };
    } catch (error) {
        if (errorCallback) errorCallback('Network error. Please check your connection.');
        return { success: false, error: error.message };
    }
};

// Search utilities
const clearSearchData = () => {
    localStorage.removeItem("searchQuery");
    // Clear URL parameters if on search page
    if (window.location.pathname.includes('search')) {
        window.history.replaceState(null, "", window.location.pathname);
    }
};

// Pokemon details modal functionality
const showPokemonDetailsModal = async (pokemon) => {
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
};

// Legacy function for backward compatibility
const loadYouTubeVideos = async (pokemonName) => {
    // This function is no longer needed as we're using direct links
    // Keeping it for compatibility but it's not used
};

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
        showModal,
        hideModal,
        clearModal,
        showLoading,
        hideLoading,
        debounce,
        getUserSession,
        setUserSession,
        clearUserSession,
        handleApiResponse,
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
    window.showModal = showModal;
    window.hideModal = hideModal;
    window.clearModal = clearModal;
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.debounce = debounce;
    window.getUserSession = getUserSession;
    window.setUserSession = setUserSession;
    window.clearUserSession = clearUserSession;
    window.handleApiResponse = handleApiResponse;
    window.showPokemonDetailsModal = showPokemonDetailsModal;
    window.loadYouTubeVideos = loadYouTubeVideos;
    window.clearSearchData = clearSearchData;
    window.API_BASE_URL = API_BASE_URL;
} 