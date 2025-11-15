// frontend/js/ui/components/image-modal.js
import { processFileToDataURL } from '../../services/image-uploader.js';
import { showError } from './notifications.js';

let modalElement = null;
let currentTargetInput = null; // The <input type="url"> on the form
let currentImageUrl = ''; // The URL/Base64 string currently in the preview

// Helper function to fetch and inject the modal HTML
const loadModalHTML = async () => {
    if (document.getElementById('image-upload-modal-overlay')) {
        return document.getElementById('image-upload-modal-overlay');
    }
    try {
        const response = await fetch('views/image-uploader-modal.html');
        if (!response.ok) throw new Error('Failed to load modal HTML');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        return document.getElementById('image-upload-modal-overlay');
    } catch (error) {
        console.error('Error loading image modal:', error);
        showError(error.message);
        return null;
    }
};

// Show/Hide the preview element
const showPreview = (url) => {
    const previewContainer = modalElement.querySelector('#image-modal-preview-container');
    const previewImg = modalElement.querySelector('#image-modal-preview');
    const saveButton = modalElement.querySelector('#image-modal-save-btn');
    
    if (url) {
        previewImg.src = url;
        previewContainer.classList.remove('hidden');
        saveButton.disabled = false;
        currentImageUrl = url;
    } else {
        previewImg.src = '';
        previewContainer.classList.add('hidden');
        saveButton.disabled = true;
        currentImageUrl = '';
    }
};

// Handle tab switching
const switchTab = (tabName) => {
    modalElement.querySelectorAll('.image-modal-tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    modalElement.querySelectorAll('.image-modal-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `image-modal-content-${tabName}`);
    });
    // Clear preview and URL input when switching tabs
    showPreview('');
    modalElement.querySelector('#image-modal-url-input').value = '';
};

// Handle file upload
const handleFileUpload = async (file) => {
    if (!file) return;
    try {
        const dataUrl = await processFileToDataURL(file);
        showPreview(dataUrl);
    } catch (error) {
        showError(error.message);
    }
};

// Main function to attach listeners to the modal
const attachModalListeners = () => {
    modalElement.addEventListener('click', (e) => {
        // Close buttons
        if (e.target.closest('#image-modal-close-btn') || 
            e.target.closest('#image-modal-cancel-btn') ||
            e.target.id === 'image-upload-modal-overlay') {
            closeImageModal();
        }
        
        // Tabs
        if (e.target.closest('#image-modal-tab-upload')) {
            switchTab('upload');
        }
        if (e.target.closest('#image-modal-tab-url')) {
            switchTab('url');
        }
        
        // Upload links
        if (e.target.closest('#image-modal-browse-link')) {
            modalElement.querySelector('#image-modal-file-input').click();
        }

        // URL Preview
        if (e.target.closest('#image-modal-url-preview-btn')) {
            const url = modalElement.querySelector('#image-modal-url-input').value;
            if (url) {
                showPreview(url);
            } else {
                showError('Please enter a URL to preview.');
            }
        }
        
        // Save button
        if (e.target.closest('#image-modal-save-btn')) {
            if (currentImageUrl && currentTargetInput) {
                // Set the value of the hidden form input
                currentTargetInput.value = currentImageUrl;
                closeImageModal();
            }
        }
    });

    // File input change
    const fileInput = modalElement.querySelector('#image-modal-file-input');
    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0]);
        e.target.value = null; // Clear input
    });

    // Drag and drop
    const dropZone = modalElement.querySelector('#image-modal-drop-zone');
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
};

/**
 * Public function to open the modal.
 * @param {HTMLInputElement} targetInput The form's URL input to update on save.
 * @param {object} options
 * @param {'upload' | 'url'} options.initialTab The tab to open.
 * @param {string} options.previewUrl The URL (http or Base64) to show in the preview.
 */
export const openImageModal = async (targetInput, options = {}) => {
    modalElement = await loadModalHTML();
    if (!modalElement) return;

    currentTargetInput = targetInput;
    const { initialTab = 'upload', previewUrl = '' } = options;

    // Reset modal state and set to desired tab
    switchTab(initialTab);
    
    // Set initial preview if one exists
    if (previewUrl) {
        showPreview(previewUrl);
        // If it's the URL tab, also populate the input
        if (initialTab === 'url') {
            modalElement.querySelector('#image-modal-url-input').value = previewUrl;
        }
    } else {
        showPreview('');
    }
    
    modalElement.style.display = 'flex';
    
    // Attach listeners *once*
    if (!modalElement.dataset.listenersAttached) {
        attachModalListeners();
        modalElement.dataset.listenersAttached = 'true';
    }
};

// Public function to close the modal
export const closeImageModal = () => {
    if (modalElement) {
        modalElement.style.display = 'none';
    }
    currentTargetInput = null;
    currentImageUrl = '';
};