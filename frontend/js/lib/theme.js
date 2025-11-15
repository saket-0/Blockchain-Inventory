// js/theme.js

// --- Theme Toggle Logic (GLOBAL) ---
const htmlEl = document.documentElement;

/**
 * Applies the selected theme to the <html> tag and Chart.js defaults.
 * @param {string} theme - 'light' or 'dark'
 */
const applyTheme = (theme) => {
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (theme === 'dark') {
        htmlEl.classList.add('dark');
        if (sunIcon && moonIcon) {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
        // Update Chart.js defaults for dark mode
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#d1d5db'; // slate-300
            Chart.defaults.borderColor = '#374151'; // slate-700
        }
    } else {
        htmlEl.classList.remove('dark');
        if (sunIcon && moonIcon) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
        // Update Chart.js defaults for light mode
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#6b7280'; // slate-500
            Chart.defaults.borderColor = '#e2e8f0'; // slate-200
        }
    }
    
    // Force any existing charts to update with new colors
    if (typeof currentCharts !== 'undefined') {
        currentCharts.forEach(chart => chart.update());
    }
};

// Apply saved theme *immediately* on script load to prevent FOUC
applyTheme(localStorage.getItem('bims_theme') || 'light');