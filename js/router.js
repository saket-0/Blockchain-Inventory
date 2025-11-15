// js/router.js

// --- NAVIGATION & UI CONTROL ---
const showLogin = () => {
    loginOverlay.style.display = 'flex';
    appWrapper.classList.add('hidden');
};

const showApp = async () => {
    loginOverlay.style.display = 'none';
    appWrapper.classList.remove('hidden');
    
    const user = currentUser;
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-role').textContent = user.role;
    document.getElementById('user-employee-id').textContent = user.employee_id;

    navLinks.admin.style.display = permissionService.can('VIEW_ADMIN_PANEL') ? 'flex' : 'none';
    navLinks.ledger.style.display = permissionService.can('VIEW_LEDGER') ? 'flex' : 'none';
    navLinks.anomaly.style.display = permissionService.can('VIEW_LEDGER') ? 'flex' : 'none';
    navLinks.analytics.style.display = 'flex';
    navLinks.profile.style.display = 'flex';

    await loadBlockchain();
    rebuildInventoryState();
    
    // --- ** NEW: Start SSE Connection ** ---
    startSSEConnection();
    // --- ** END NEW ** ---
    
    navigateTo('dashboard');
};

/**
 * NEW: Fetches an HTML view from the server.
 * @param {string} viewName - The name of the html file (e.g., 'dashboard')
 * @returns {Promise<string>} HTML content as a string.
 */
const loadView = async (viewName) => {
    try {
        const response = await fetch(`views/${viewName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load view: ${viewName}.html`);
        }
        return await response.text();
    } catch (error) {
        console.error(error);
        // Use the global showError utility from ui-utils.js
        showError(error.message);
        return `<p class="text-red-600 p-4">Error loading view: ${error.message}. Please try again.</p>`;
    }
};

/**
 * UPDATED: Rewritten to fetch views dynamically.
 */
const navigateTo = async (view, context = {}) => {
    // 1. Clear state
    destroyCurrentCharts();
    appContent.innerHTML = ''; // Clear content
    Object.values(navLinks).forEach(link => link.classList.remove('active'));

    // 2. Define all views, their files, render functions, and permissions
    const viewMap = {
        'dashboard': { file: 'dashboard', renderer: renderDashboard, nav: navLinks.dashboard },
        'products': { file: 'product-list', renderer: renderProductList, nav: navLinks.products },
        'detail': { file: 'product-detail', renderer: () => renderProductDetail(context.productId), nav: navLinks.products },
        'admin': { file: 'admin', renderer: renderAdminPanel, nav: navLinks.admin, permission: 'VIEW_ADMIN_PANEL' },
        'ledger': { file: 'ledger', renderer: renderFullLedger, nav: navLinks.ledger, permission: 'VIEW_LEDGER' },
        'analytics': { file: 'analytics', renderer: renderAnalyticsPage, nav: navLinks.analytics },
        'anomaly': { file: 'anomaly', renderer: renderAnomalyPage, nav: navLinks.anomaly, permission: 'VIEW_LEDGER' },
        'profile': { file: 'profile', renderer: renderProfilePage, nav: navLinks.profile },
        'snapshot': { file: 'snapshot', renderer: () => renderSnapshotView(context.snapshotData), nav: navLinks.ledger }
    };

    // 3. Get the configuration for the requested view, or default to dashboard
    let viewConfig = viewMap[view] || viewMap.dashboard;
    
    // *** NEW: Track the current view ***
    currentViewId = view; 

    // 4. Check permissions
    if (viewConfig.permission && !permissionService.can(viewConfig.permission)) {
        showError("Access Denied.");
        // *** MODIFIED: Set currentViewId before recursive call ***
        currentViewId = 'dashboard';
        return navigateTo('dashboard'); // Redirect to dashboard
    }

    // 5. Set active nav link
    if (viewConfig.nav) {
        viewConfig.nav.classList.add('active');
    }

    // 6. Fetch and inject the HTML
    const htmlContent = await loadView(viewConfig.file);
    appContent.innerHTML = htmlContent;

    // 7. Call the corresponding render function *after* HTML is in the DOM
    try {
        if (viewConfig.renderer) {
            await viewConfig.renderer();
        }
    } catch (error) {
        console.error(`Error rendering view ${view}:`, error);
        if (view === 'detail') {
            // This is a special case: if rendering a detail page fails
            // (e.g., product was deleted by another user), go to product list
            showError(`Could not load product. It may have been deleted.`);
            navigateTo('products');
        } else {
            showError(`Error rendering ${view} page: ${error.message}`);
        }
    }
};