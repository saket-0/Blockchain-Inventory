// frontend/js/ui/components/confirm-modal.js

/**
 * Opens a custom, promise-based confirmation modal.
 * @param {object} options
 * @param {string} options.title - The title for the modal.
 * @param {string} options.body - The message body (can include newlines).
 * @param {string} [options.confirmText='Confirm'] - The text for the confirm button.
 * @param {boolean} [options.isDanger=false] - If true, styles the confirm button as red.
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled.
 */
export const confirmAction = ({ title, body, confirmText = 'Confirm', isDanger = false }) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal-overlay');
        const titleEl = document.getElementById('confirm-modal-title');
        const bodyEl = document.getElementById('confirm-modal-body');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const confirmBtn = document.getElementById('confirm-modal-confirm');

        if (!modal || !titleEl || !bodyEl || !cancelBtn || !confirmBtn) {
            console.error('Confirmation modal elements not found in the DOM.');
            return resolve(false); // Failsafe
        }

        // Set content
        titleEl.textContent = title;
        bodyEl.innerHTML = body.replace(/\n/g, '<br>'); // Respect newlines
        confirmBtn.textContent = confirmText;

        // Set danger styling
        if (isDanger) {
            confirmBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
            confirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        } else {
            confirmBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
            confirmBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        }

        // --- Event Handlers ---
        // We use .onclick to overwrite any previous listeners
        
        const closeAndResolve = (value) => {
            modal.classList.add('hidden');
            resolve(value);
        };

        confirmBtn.onclick = () => closeAndResolve(true);
        cancelBtn.onclick = () => closeAndResolve(false);
        
        // Clicks on the overlay backdrop
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeAndResolve(false);
            }
        };

        // Show the modal
        modal.classList.remove('hidden');
    });
};