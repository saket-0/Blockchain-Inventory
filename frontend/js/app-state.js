// frontend/js/app-state.js

/**
 * A simple object to hold shared application state,
 * preventing pollution of the global namespace.
 */
const AppState = {
    sseConnection: null,
    currentViewId: 'dashboard', // Keep track of the current view
};