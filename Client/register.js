document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is already authenticated and redirect if necessary
    const isRedirected = await checkAuthAndRedirect();
    if (isRedirected) {
        return; // Stop execution if redirected
    }
    
    const form = document.getElementById('registerForm');
    const inputs = form.querySelectorAll('input');
    
    // Add event listeners for real-time validation
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
    
    // Form submission
    form.addEventListener('submit', handleFormSubmission);
});

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    switch(fieldName) {
        case 'firstName':
            if (!value) {
                errorMessage = 'First name is required';
                isValid = false;
            } else if (value.length > 50) {
                errorMessage = 'First name must be 50 characters or less';
                isValid = false;
            } else if (!/^[a-zA-Z\s]+$/.test(value)) {
                errorMessage = 'First name can only contain letters and spaces';
                isValid = false;
            }
            break;
            
        case 'email':
            if (!value) {
                errorMessage = 'Email is required';
                isValid = false;
            } else if (!isValidEmail(value)) {
                errorMessage = 'Please enter a valid email address';
                isValid = false;
            }
            break;
            
        case 'password':
            if (!value) {
                errorMessage = 'Password is required';
                isValid = false;
            } else if (value.length < 7 || value.length > 15) {
                errorMessage = 'Password must be between 7 and 15 characters';
                isValid = false;
            } else if (!isValidPassword(value)) {
                errorMessage = 'Password must contain at least one uppercase letter, one lowercase letter, and one non-alphanumeric character';
                isValid = false;
            }
            break;
            
        case 'confirmPassword':
            const password = document.getElementById('password').value;
            if (!value) {
                errorMessage = 'Please confirm your password';
                isValid = false;
            } else if (value !== password) {
                errorMessage = 'Passwords do not match';
                isValid = false;
            }
            break;
    }
    
    if (isValid) {
        showFieldSuccess(field);
        clearFieldError(field);
    } else {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

function validateForm() {
    const inputs = document.querySelectorAll('#registerForm input');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
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
        firstName: formData.get('firstName'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        // Disable button and show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Registering...';
        
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccessMessage('Registration successful! Redirecting to login...', 'registerForm');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            showErrorMessage(result.error || 'Registration failed. Please try again.', 'registerForm');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showErrorMessage('Network error. Please check your connection and try again.', 'registerForm');
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}
