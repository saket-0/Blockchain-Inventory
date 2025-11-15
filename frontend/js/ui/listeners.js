// frontend/js/ui/listeners.js

function initAppListeners() {
    
    // --- Theme Toggle Listener ---
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('bims_theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('bims_theme', newTheme);
            applyTheme(newTheme);
        });
    }
    // --- End Theme ---

    // --- EVENT HANDLERS (Delegated & Static) ---

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loginEmailInput = document.getElementById('login-email-input');
            const email = loginEmailInput.value;
            const password = document.getElementById('login-password').value;
            await authService.login(email, password, showApp, showError);
        });
    }

    const quickLoginButton = document.getElementById('quick-login-button');
    if (quickLoginButton) {
        quickLoginButton.addEventListener('click', async () => {
            const loginEmailSelect = document.getElementById('login-email-select');
            const loginEmailInput = document.getElementById('login-email-input');
            const email = loginEmailSelect.value;
            const password = "password";
            await authService.login(email, password, showApp, showError);
        });
    }

    const loginEmailSelect = document.getElementById('login-email-select');
    if (loginEmailSelect) {
        loginEmailSelect.addEventListener('change', () => {
            const loginEmailInput = document.getElementById('login-email-input');
            loginEmailInput.value = loginEmailSelect.value;
        });
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // --- ** NEW: Close SSE connection on logout ** ---
            if (AppState.sseConnection) {
                AppState.sseConnection.close();
                AppState.sseConnection = null;
                console.log('SSE Connection closed by logout.');
            }
            // --- ** END NEW ** ---
            authService.logout(showLogin);
        });
    }
    
    // --- Navigation Listeners ---
    // We attach these to the nav parent, but it's cleaner to 
    // just query them here.
    const navLinks = {
        dashboard: document.getElementById('nav-dashboard'),
        products: document.getElementById('nav-products'),
        analytics: document.getElementById('nav-analytics'),
        anomaly: document.getElementById('nav-anomaly'),
        admin: document.getElementById('nav-admin'),
        ledger: document.getElementById('nav-ledger'),
        profile: document.getElementById('nav-profile'),
    };

    if (navLinks.dashboard) navLinks.dashboard.addEventListener('click', (e) => { e.preventDefault(); navigateTo('dashboard'); });
    if (navLinks.profile) navLinks.profile.addEventListener('click', (e) => { e.preventDefault(); navigateTo('profile'); });
    if (navLinks.products) navLinks.products.addEventListener('click', (e) => { e.preventDefault(); navigateTo('products'); });
    if (navLinks.analytics) navLinks.analytics.addEventListener('click', (e) => { e.preventDefault(); navigateTo('analytics'); });
    if (navLinks.anomaly) navLinks.anomaly.addEventListener('click', (e) => { e.preventDefault(); navigateTo('anomaly'); });
    if (navLinks.admin) navLinks.admin.addEventListener('click', (e) => { e.preventDefault(); navigateTo('admin'); });
    if (navLinks.ledger) navLinks.ledger.addEventListener('click', (e) => { e.preventDefault(); navigateTo('ledger'); });

    // --- Main Content Event Delegation ---
    const appContent = document.getElementById('app-content');
    if (!appContent) return; // Stop if the main content area isn't found

    appContent.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (e.target.id === 'add-item-form') {
            await handleAddItem(e.target);
        }
        
        if (e.target.id === 'update-stock-form') {
            await handleUpdateStock(e.target);
        }

        if (e.target.id === 'move-stock-form') {
            await handleMoveStock(e.target);
        }

        if (e.target.id === 'product-detail-form') {
            await handleEditProduct(e.target);
        }

        if (e.target.id === 'add-user-form') {
            await handleAddUser(e.target);
        }

        if (e.target.id === 'snapshot-form') {
            await handleSnapshotForm(e.target, navigateTo);
        }
        
        if (e.target.id === 'update-profile-form') {
            await handleUpdateProfile(e.target);
        }
        if (e.target.id === 'change-password-form') {
            await handleChangePassword(e.target);
        }

        if (e.target.id === 'add-location-form') {
            await handleAddLocation(e.target);
        }
        if (e.target.id === 'add-category-form') {
            await handleAddCategory(e.target);
        }
    });

    appContent.addEventListener('input', (e) => {
        // Product list search
        if (e.target.id === 'product-search-input') {
            renderProductList();
        }

        if (e.target.id === 'ledger-search-input' || e.target.id === 'ledger-date-from' || e.target.id === 'ledger-date-to') {
            renderFullLedger();
        }
    });

    appContent.addEventListener('focus', (e) => {
        if (e.target.tagName === 'INPUT') {
            if (e.target.id === 'product-search-input' || e.target.id === 'ledger-search-input') {
                return;
            }
            if (e.target.type === 'datetime-local' || e.target.type === 'date') {
                return;
            }
            if (e.target.type === 'text' || 
                e.target.type === 'number' || 
                e.target.type === 'email' || 
                e.target.type === 'password') 
            {
                e.target.select();
            }
        }
    }, true);

    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) {
        loginOverlay.addEventListener('focus', (e) => {
            if (e.target.tagName === 'INPUT' && (e.target.type === 'email' || e.target.type === 'password' || e.target.type === 'text')) {
                e.target.select();
            }
        }, true);
    }

    appContent.addEventListener('click', async (e) => {
        
        if (e.target.closest('.copy-hash-button')) {
            const button = e.target.closest('.copy-hash-button');
            const hashToCopy = button.dataset.hash;
            if (!hashToCopy) {
                return showError('No hash data found to copy.');
            }
            try {
                await navigator.clipboard.writeText(hashToCopy);
                showSuccess('Hash copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy hash:', err);
                showError('Failed to copy. Please copy manually.');
            }
            return;
        }

        if (e.target.closest('#product-edit-toggle-button')) {
            e.preventDefault();
            toggleProductEditMode(true); // Show edit form
            return;
        }
        if (e.target.closest('#product-edit-cancel-button')) {
            e.preventDefault();
            toggleProductEditMode(false); // Hide edit form
            // Re-render to reset any dirty form fields
            const productId = document.getElementById('update-product-id').value;
            renderProductDetail(productId);
            return;
        }

        if (e.target.closest('#back-to-list-button')) {
            navigateTo('products');
            return;
        }

        if (e.target.closest('#back-to-ledger-button')) {
            navigateTo('ledger');
            return;
        }
        
        if (e.target.closest('#dashboard-view-ledger')) {
            e.preventDefault();
            navigateTo('ledger');
            return;
        }

        const productCard = e.target.closest('.product-card');
        if (productCard && productCard.dataset.productId) {
            navigateTo('detail', { productId: productCard.dataset.productId });
            return;
        }

        const lowStockItem = e.target.closest('.low-stock-item');
        if (lowStockItem && lowStockItem.dataset.productId) {
            navigateTo('detail', { productId: lowStockItem.dataset.productId });
            return;
        }

        const clickableStat = e.target.closest('.clickable-stat-item');
        if (clickableStat && clickableStat.dataset.productId) {
            navigateTo('detail', { productId: clickableStat.dataset.productId });
            return;
        }

        if (e.target.closest('#clear-db-button')) {
            await handleClearDb(navigateTo);
        }
        
        if (e.target.closest('#verify-chain-button')) {
            await handleVerifyChain();
        }

        if (e.target.closest('#delete-product-button')) {
            const productId = document.getElementById('detail-product-id').textContent;
            const productName = document.getElementById('detail-product-name').textContent;
            await handleDeleteProduct(productId, productName, navigateTo);
            return;
        }

        const locArchive = e.target.closest('.location-archive-button');
        if (locArchive) {
            await handleArchiveLocation(locArchive.dataset.id, locArchive.dataset.name);
        }
        
        const locRestore = e.target.closest('.location-restore-button');
        if (locRestore) {
            await handleRestoreLocation(locRestore.dataset.name);
        }

        const catArchive = e.target.closest('.category-archive-button');
        if (catArchive) {
            await handleArchiveCategory(catArchive.dataset.id, catArchive.dataset.name);
        }

        const catRestore = e.target.closest('.category-restore-button');
        if (catRestore) {
            await handleRestoreCategory(catRestore.dataset.name);
        }
        
        const deleteButton = e.target.closest('.user-delete-button');
        if (deleteButton) {
            const userId = deleteButton.dataset.userId;
            const userName = deleteButton.dataset.userName;
            const userEmail = deleteButton.dataset.userEmail;
            await handleDeleteUser(userId, userName, userEmail);
        }
        
        if (e.target.closest('#product-filter-reset')) {
            const searchInput = appContent.querySelector('#product-search-input');
            const categoryFilterEl = appContent.querySelector('#product-category-filter');
            const locationFilterEl = appContent.querySelector('#product-location-filter');
            
            if (searchInput) searchInput.value = '';
            if (categoryFilterEl) categoryFilterEl.value = 'all';
            if (locationFilterEl) locationFilterEl.value = 'all';
            
            renderProductList(); // Re-render with reset values
        }
        
        if (e.target.closest('#ledger-filter-reset')) {
            appContent.querySelector('#ledger-search-input').value = '';
            appContent.querySelector('#ledger-user-filter').value = 'all';
            appContent.querySelector('#ledger-category-filter').value = 'all';
            appContent.querySelector('#ledger-location-filter').value = 'all';
            appContent.querySelector('#ledger-tx-type-filter').value = 'all';
            appContent.querySelector('#ledger-date-from').value = '';
            appContent.querySelector('#ledger-date-to').value = '';
            
            renderFullLedger(); // Re-render with reset values
        }
    });

    appContent.addEventListener('change', async (e) => {
        if (e.target.classList.contains('role-select')) {
            const userId = e.target.dataset.userId;
            const userName = e.target.dataset.userName;
            const newRole = e.target.value;
            await handleRoleChange(userId, userName, newRole);
        }

        if (e.target.classList.contains('user-email-input')) {
            const userId = e.target.dataset.userId;
            const userName = e.target.dataset.userName;
            const oldEmail = e.target.dataset.oldEmail;
            const newEmail = e.target.value;
            await handleEmailChange(userId, userName, newEmail, oldEmail, e.target);
        }

        if (e.target.classList.contains('location-name-input')) {
            await handleRenameLocation(e.target);
        }
        if (e.target.classList.contains('category-name-input')) {
            await handleRenameCategory(e.target);
        }
        
        if (e.target.id === 'product-category-filter' || e.target.id === 'product-location-filter') {
            renderProductList();
        }
        
        if (e.target.id === 'ledger-user-filter' || e.target.id === 'ledger-category-filter' || e.target.id === 'ledger-location-filter' || e.target.id === 'ledger-tx-type-filter') {
            renderFullLedger();
        }
    });
}