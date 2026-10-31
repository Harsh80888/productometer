// ========================================================
// PRODUCTOMETER PORTAL - MAIN CONTROLLER & THEME ENGINE
// Supports Instant Theme Toggle (Dark & Light) & State Sync
// ========================================================

(function () {
    const THEME_STORAGE_KEY = 'productometer_theme_mode';

    function getActiveTheme() {
        return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    }

    function applyTheme(theme) {
        const isLight = theme === 'light';
        if (isLight) {
            document.body.classList.add('theme-light');
            if (document.documentElement) document.documentElement.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
            if (document.documentElement) document.documentElement.classList.remove('theme-light');
        }

        // Update all theme toggle elements on current page
        const toggleButtons = document.querySelectorAll('#themeToggleBtn, .theme-toggle-btn');
        toggleButtons.forEach(btn => {
            const icon = btn.querySelector('#themeToggleIcon, #themeIcon, i');
            const label = btn.querySelector('#themeToggleLabel, #themeLabel, span');

            if (isLight) {
                if (icon) {
                    icon.className = 'fa-solid fa-moon';
                }
                if (label) {
                    label.textContent = 'Dark';
                }
                btn.setAttribute('aria-label', 'Switch to Dark Mode');
                btn.setAttribute('title', 'Switch to Dark Mode');
            } else {
                if (icon) {
                    icon.className = 'fa-solid fa-sun';
                }
                if (label) {
                    label.textContent = 'Light';
                }
                btn.setAttribute('aria-label', 'Switch to Light Mode');
                btn.setAttribute('title', 'Switch to Light Mode');
            }
        });
    }

    function toggleTheme() {
        const current = getActiveTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch (e) {
            console.warn('[Theme] Could not persist theme:', e);
        }
        applyTheme(next);
    }

    function initPortal() {
        // 1. Initial theme application
        applyTheme(getActiveTheme());

        // 2. Attach toggle listener to buttons
        const toggleButtons = document.querySelectorAll('#themeToggleBtn, .theme-toggle-btn');
        toggleButtons.forEach(btn => {
            // Avoid duplicate listeners
            if (btn.dataset.themeBound) return;
            btn.dataset.themeBound = 'true';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleTheme();
            });
        });

        // 3. Keep Diamonds strictly hidden
        const diamondElements = document.querySelectorAll('.nav-diamond-hud, [data-diamond-hud]');
        diamondElements.forEach(el => {
            el.style.display = 'none';
            el.style.setProperty('display', 'none', 'important');
        });

        // 4. Listen for storage changes across frames/pages
        window.addEventListener('storage', (e) => {
            if (e.key === THEME_STORAGE_KEY) {
                applyTheme(e.newValue || 'dark');
            }
        });
    }

    // Run immediately to prevent layout flashes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPortal);
    } else {
        initPortal();
    }

    // Expose utility globally
    window.ProductometerPortal = {
        applyTheme,
        toggleTheme,
        getActiveTheme
    };
})();
