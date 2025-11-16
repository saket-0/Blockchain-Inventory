// frontend/js/handlers/ledger.js
// import { API_BASE_URL } from '../../config.js';
import { permissionService } from '../services/permissions.js';
import { setBlockchain, inventory } from '../app-state.js';
import { rebuildInventoryState } from '../services/blockchain.js';
import { showError, showSuccess } from '../ui/components/notifications.js';
import { confirmAction } from '../ui/components/confirm-modal.js'; // <-- ADDED IMPORT

export const handleClearDb = async (navigateTo) => {
    if (!permissionService.can('CLEAR_DB')) return showError("Access Denied.");
    
    // vvv MODIFIED BLOCK vvv
    const confirmed = await confirmAction({
        title: 'Confirm Clear Blockchain',
        body: 'Are you sure you want to clear the entire blockchain?\n\nThis action cannot be undone.',
        confirmText: 'Clear Blockchain',
        isDanger: true
    });

    if (confirmed) {
    // ^^^ END MODIFIED BLOCK ^^^
        try {
            const response = await fetch(`${API_BASE_URL}/api/blockchain`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to clear database');
            }
            
            setBlockchain(data.chain);
            rebuildInventoryState();
            navigateTo('dashboard');
            showSuccess("Server blockchain cleared.");
            
        } catch (error) {
            showError(error.message);
        }
    }
};

export const handleVerifyChain = async () => {
    if (!permissionService.can('VERIFY_CHAIN')) return showError("Access Denied.");
    try {
        const response = await fetch(`${API_BASE_URL}/api/blockchain/verify`, {
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Verification check failed');
        }
        
        if (data.isValid) {
            showSuccess("Verification complete: Blockchain is valid!");
        } else {
            showError("CRITICAL: Blockchain is invalid! Tampering detected.");
        }
    } catch (error) {
        showError(error.message);
    }
};

export const handleSnapshotForm = async (form, navigateTo) => {
    if (!permissionService.can('VIEW_HISTORICAL_STATE')) return showError("Access Denied.");
    
    const timestamp = form.querySelector('#snapshot-timestamp').value;
    if (!timestamp) return showError("Please select a date and time.");

    const button = form.querySelector('#generate-snapshot-button');
    button.disabled = true;
    button.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Generating...';

    try {
        // CRITICAL FIX: Properly convert local datetime-local to UTC
        // datetime-local returns "2025-11-16T10:30" in the user's LOCAL timezone
        // We need to convert this to UTC for the server
        
        // Parse as local time
        const localDate = new Date(timestamp);
        
        // Convert to UTC ISO string (this automatically handles timezone conversion)
        const utcTimestamp = localDate.toISOString();
        
        console.log('User selected (local):', timestamp);
        console.log('Converting to UTC:', utcTimestamp);
        console.log('User timezone offset (minutes):', localDate.getTimezoneOffset());
        
        const response = await fetch(`${API_BASE_URL}/api/blockchain/state-at?timestamp=${encodeURIComponent(utcTimestamp)}`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to generate snapshot');
        }
        
        // Pass the snapshot data to the router's context
        navigateTo('snapshot', { snapshotData: data });

    } catch (error) {
        showError(error.message);
        button.disabled = false;
        button.innerHTML = '<i class="ph-bold ph-timer"></i> Generate Snapshot';
    }
};