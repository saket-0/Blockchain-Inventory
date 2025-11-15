// frontend/js/services/image-uploader.js

// Set a reasonable size limit (e.g., 2MB)
// Base64 encoding adds ~33% overhead, so 2MB binary becomes ~2.66MB text.
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Processes a file upload and returns a Promise that resolves with a Base64 string.
 * @param {File} file The file from the input.
 * @returns {Promise<string>} A Promise that resolves with the Base64 Data URL.
 */
export const processFileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('No file provided.'));
        }

        // --- 1. Validation ---
        if (!file.type.startsWith('image/')) {
            return reject(new Error('Invalid file type. Please upload an image (PNG, JPG).'));
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return reject(new Error(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`));
        }

        // --- 2. File Reading ---
        const reader = new FileReader();

        reader.onload = () => {
            // reader.result contains the Base64 Data URL (e.g., "data:image/png;base64,...")
            resolve(reader.result);
        };

        reader.onerror = () => {
            console.error('File reading error:', reader.error);
            return reject(new Error('Failed to read the selected file.'));
        };

        // This triggers the 'onload' event when done
        reader.readAsDataURL(file);
    });
};