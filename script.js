// DOM Elements
const textFileInput = document.getElementById('textFile');
const fileNameDisplay = document.getElementById('file-name');
const previewContent = document.getElementById('preview-content');
const generateBtn = document.getElementById('generate-btn');
const voiceModel = document.getElementById('voice-model');
const voiceSelection = document.getElementById('voice-selection');
const voiceInstructions = document.getElementById('voice-instructions');
const loadingSpinner = document.getElementById('loading');
const toastContainer = document.getElementById('toast-container');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.querySelector('.modal-close');
const modalOkBtn = document.getElementById('modal-ok');
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
const apiKeyStatusIcon = document.getElementById('api-key-status-icon');
const apiKeyStatusText = document.getElementById('api-key-status-text');
const textEditor = document.getElementById('text-editor');
const clearTextBtn = document.getElementById('clear-text-btn');
const textStats = document.getElementById('text-stats');

// Variables
let selectedFile = null;
let fileContent = '';
const API_KEY_STORAGE_KEY = 'openai_api_key';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    textFileInput.addEventListener('change', handleFileSelect);
    generateBtn.addEventListener('click', generateAudio);
    modalCloseBtn.addEventListener('click', closeModal);
    modalOkBtn.addEventListener('click', closeModal);
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    clearTextBtn.addEventListener('click', clearTextEditor);
    textEditor.addEventListener('input', updateTextStats);
    
    // Check for saved API key on page load
    checkSavedApiKey();
});

/**
 * Check if an API key is already saved in localStorage
 */
function checkSavedApiKey() {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    
    if (savedApiKey) {
        // Mask the API key in the input field
        apiKeyInput.value = '•'.repeat(16);
        updateApiKeyStatus(true);
    } else {
        apiKeyInput.value = '';
        updateApiKeyStatus(false);
    }
}

/**
 * Save the API key to localStorage
 */
function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        showToast('Please enter an API key', 'warning');
        return;
    }
    
    // Basic validation - API keys are typically longer than 20 characters
    if (apiKey.length < 20) {
        showToast('API key seems too short. Please check your key.', 'warning');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    
    // Mask the API key for security
    apiKeyInput.value = '•'.repeat(16);
    
    updateApiKeyStatus(true);
    showToast('API key saved successfully', 'success');
}

/**
 * Update the API key status indicator
 * @param {boolean} isValid - Whether a valid API key is saved
 */
function updateApiKeyStatus(isValid) {
    if (isValid) {
        apiKeyStatusIcon.innerHTML = '<i class="fas fa-circle-check"></i>';
        apiKeyStatusText.textContent = 'API key saved';
    } else {
        apiKeyStatusIcon.innerHTML = '<i class="fas fa-circle-xmark"></i>';
        apiKeyStatusText.textContent = 'No API key saved';
    }
}

/**
 * Get the saved API key from localStorage
 * @returns {string|null} The saved API key or null if not found
 */
function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
}

/**
 * Handle file selection and load content into text editor
 * @param {Event} event - The file input change event
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        resetFileSelection();
        return;
    }

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
        showToast('Please select a .txt file', 'error');
        resetFileSelection();
        return;
    }

    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    
    // Read file content and load into text editor
    const reader = new FileReader();
    reader.onload = (e) => {
        fileContent = e.target.result;
        
        // Load content into text editor
        textEditor.value = fileContent;
        updateTextStats();
        
        generateBtn.disabled = false;
    };
    
    reader.onerror = () => {
        showToast('Error reading file', 'error');
        resetFileSelection();
    };
    
    reader.readAsText(file);
}

/**
 * Update text statistics (word and character count)
 */
function updateTextStats() {
    const text = textEditor.value;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const charCount = text.length;
    
    textStats.textContent = `${wordCount} words, ${charCount} characters`;
    
    // Enable/disable generate button based on text content
    generateBtn.disabled = text.trim().length === 0;
}

/**
 * Clear the text editor
 */
function clearTextEditor() {
    textEditor.value = '';
    updateTextStats();
    generateBtn.disabled = true;
    
    // Show confirmation toast
    showToast('Text cleared', 'info');
}

/**
 * Reset file selection state
 */
function resetFileSelection() {
    textFileInput.value = '';
    fileNameDisplay.textContent = 'No file selected';
    selectedFile = null;
    fileContent = '';
}

/**
 * Generate audio from text using OpenAI API
 */
async function generateAudio() {
    // Get text from the editor
    const text = textEditor.value.trim();
    
    if (!text) {
        showToast('Please enter or load some text', 'warning');
        return;
    }
    
    const apiKey = getApiKey();
    if (!apiKey) {
        showModal(
            'API Key Required', 
            `<p>You need to provide an OpenAI API key to use this service.</p>
            <p>Please enter your API key in the field at the top of the page and click "Save API Key".</p>
            <p>You can get an API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI's website</a>.</p>`
        );
        return;
    }

    // Show loading state
    setLoadingState(true);

    try {
        // Get selected options
        const model = voiceModel.value;
        const voice = voiceSelection.value;
        const instructions = voiceInstructions.value;

        // Make API request to OpenAI
        const response = await callOpenAIAPI(apiKey, model, voice, text, instructions);
        
        // Generate a filename based on the first few words of the text
        const firstWords = text.trim().split(/\s+/).slice(0, 5).join('_');
        const filename = `tts_${firstWords.replace(/[^a-z0-9_]/gi, '')}.mp3`;
        
        // Download the generated audio file
        downloadAudioFile(response, filename);
        
        showToast('Audio generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating audio:', error);
        showModal(
            'Error Generating Audio', 
            `<p>An error occurred while generating the audio:</p>
            <p class="error-message">${error.message || 'Unknown error'}</p>
            <p>Please check your API key and try again.</p>`
        );
    } finally {
        setLoadingState(false);
    }
}

/**
 * Call OpenAI API for text-to-speech conversion
 * @param {string} apiKey - The OpenAI API key
 * @param {string} model - The TTS model to use
 * @param {string} voice - The voice to use
 * @param {string} input - The text input to convert to speech
 * @param {string} instructions - Optional voice instructions
 * @returns {Promise<ArrayBuffer>} - The audio data as ArrayBuffer
 */
async function callOpenAIAPI(apiKey, model, voice, input, instructions) {
    const endpoint = 'https://api.openai.com/v1/audio/speech';
    
    const requestBody = {
        model: model,
        voice: voice,
        input: input
    };
    
    // Add instructions if provided and not empty
    if (instructions && instructions.trim()) {
        requestBody.response_format = 'mp3';
        requestBody.speed = 1.0; // Default speed
        
        // Only include instructions for models that support it (like gpt-4o-mini-tts)
        if (model.includes('gpt-4o')) {
            requestBody.instructions = instructions;
        }
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            let errorMessage = 'API request failed';
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || errorMessage;
            } catch (e) {
                // If we can't parse the error as JSON, use the status text
                errorMessage = `API request failed: ${response.status} ${response.statusText}`;
            }
            
            throw new Error(errorMessage);
        }
        
        return await response.arrayBuffer();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

/**
 * Download the generated audio file
 * @param {ArrayBuffer} audioBuffer - The audio data as ArrayBuffer
 * @param {string} filename - The name for the downloaded file
 */
function downloadAudioFile(audioBuffer, filename) {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
    }, 100);
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info, warning)
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    switch (type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'error':
            icon = 'times-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
        default:
            icon = 'info-circle';
    }
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Automatically remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

/**
 * Show a modal dialog
 * @param {string} title - The modal title
 * @param {string} content - The HTML content for the modal body
 */
function showModal(title, content) {
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('visible');
}

/**
 * Close the modal dialog
 */
function closeModal() {
    modalOverlay.classList.remove('visible');
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
    }, 300);
}

/**
 * Set the loading state of the application
 * @param {boolean} isLoading - Whether the app is in a loading state
 */
function setLoadingState(isLoading) {
    if (isLoading) {
        generateBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
    } else {
        generateBtn.disabled = textEditor.value.trim().length === 0;
        loadingSpinner.classList.add('hidden');
    }
}
