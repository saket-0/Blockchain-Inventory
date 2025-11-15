// js/sse.js

// --- ** NEW: SSE HELPER FUNCTIONS ** ---
    
/**
 * Establishes the Server-Sent Events (SSE) connection.
 */
const startSSEConnection = () => {
    if (sseConnection) {
        sseConnection.close();
    }

    // Use the API_BASE_URL from config.js
    // The { withCredentials: true } is vital for sending the session cookie
    sseConnection = new EventSource(`${API_BASE_URL}/api/events`, { withCredentials: true });

    sseConnection.onopen = () => {
        console.log('SSE Connection Established.');
    };

    sseConnection.onerror = (error) => {
        console.error('SSE Error:', error);
        // This can happen on server restart or network loss.
        // EventSource will automatically try to reconnect.
    };

    // Listen for our custom 'new-block' event from the server
    sseConnection.addEventListener('new-block', (event) => {
        const newBlock = JSON.parse(event.data);

        // Double-check we don't already have this block
        // (This prevents echo from our own submissions)
        const blockExists = blockchain.some(block => block.hash === newBlock.hash);
        if (blockExists) {
            console.log('SSE: Block echo detected, ignoring.');
            return;
        }

        // --- This is the core logic ---
        // 1. Add the new block to our local state
        console.log('SSE: Received new block from server.', newBlock);
        blockchain.push(newBlock);
        
        // 2. Rebuild the inventory from the updated chain
        rebuildInventoryState();

        // 3. Show a notification (unless it was us)
        const actor = newBlock.transaction.adminUserName || 'System';
        if (newBlock.transaction.adminUserId !== currentUser.id) {
            showSuccess(`System updated in real-time by ${actor}.`);
        }

        // 4. Intelligently refresh the current view
        refreshCurrentView(newBlock);
    });
    
    // This is the confirmation event we added in server.js
    sseConnection.addEventListener('connected', (event) => {
        console.log('SSE: Server confirmed connection.');
    });
};

/**
 * Intelligently refreshes only the current view based on the new block.
 */
const refreshCurrentView = (newBlock) => {
    // We use the 'currentViewId' variable we set in navigateTo
    console.log(`SSE: Refreshing current view: ${currentViewId}`);
    switch (currentViewId) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'products':
            renderProductList();
            break;
        case 'detail':
            // We are on a detail page. Does this block affect this product?
            const detailIdEl = document.getElementById('update-product-id'); // <-- Changed to hidden input
            if (detailIdEl) {
                const currentProductId = detailIdEl.value;
                if (newBlock.transaction.itemSku === currentProductId) {
                    // If item was deleted, go back to list
                    if (newBlock.transaction.txType === 'DELETE_ITEM') {
                        showError('This product was just deleted.');
                        navigateTo('products');
                    } else {
                        destroyCurrentCharts(); // Destroy old chart
                        renderProductDetail(currentProductId); // Re-render all details
                    }
                }
            }
            break;
        case 'ledger':
            renderFullLedger();
            break;
        case 'admin':
            // Any admin action, or a user profile action (which is on the same chain)
            if (newBlock.transaction.txType.startsWith('ADMIN_') || newBlock.transaction.txType.startsWith('USER_')) {
                // Also need to re-fetch locations/categories if they were changed
                if (newBlock.transaction.txType.includes('LOCATION')) {
                    fetchLocations().then(renderAdminPanel);
                } else if (newBlock.transaction.txType.includes('CATEGORY')) {
                    fetchCategories().then(renderAdminPanel);
                } else {
                    renderAdminPanel();
                }
            }
            break;
        case 'analytics':
            destroyCurrentCharts();
            renderAnalyticsPage();
            break;
        case 'anomaly':
            destroyCurrentCharts();
            renderAnomalyPage();
            break;
        case 'profile':
            // Check if this block belongs to the current user
            if (newBlock.transaction.adminUserId === currentUser.id) {
                renderProfilePage();
            }
            break;
        // 'snapshot' is a read-only historical view, no refresh needed.
    }
};
// --- ** END NEW SSE FUNCTIONS ** ---