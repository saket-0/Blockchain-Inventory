// app.js
document.addEventListener('DOMContentLoaded', async () => {
    
    // Attach all event listeners from our new module
    initAppListeners();

    // --- INITIALIZATION ---
    await populateLoginDropdown();
    await authService.init(showApp, showLogin);
});