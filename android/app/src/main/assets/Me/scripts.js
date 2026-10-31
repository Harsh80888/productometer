// ==========================================================================
// PRODUCTOMETER - ME TAB: DISTRACTION BLOCKER & SESSION APP MANAGER
// Options for Which Apps Will Run During Sessions · Real Device Guardian
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 0. Global safety: clear any lingering diamond nodes
    const diamondEl = document.getElementById('globalDiamondWallet');
    if (diamondEl && diamondEl.parentElement) {
        diamondEl.parentElement.style.display = 'none';
    }

    const KEY_SESSION_RULES = 'productometer_session_app_rules_v2';
    const KEY_CONTENT_RULES = 'productometer_content_rules_v2';
    const KEY_INTERCEPTIONS = 'productometer_interceptions_count';

    // Default applications list for session control
    const DEFAULT_APPS = [
        { id: 'com.productometer.app', name: 'Productivity Meter', pkg: 'com.productometer.app', icon: 'fa-solid fa-graduation-cap', bg: '#00e5ff', color: '#000', defaultAcademicsAllowed: true, defaultHealthAllowed: true },
        { id: 'com.google.android.youtube', name: 'YouTube (Video & Lectures)', pkg: 'com.google.android.youtube', icon: 'fa-brands fa-youtube', bg: '#e50914', color: '#fff', defaultAcademicsAllowed: true, defaultHealthAllowed: false },
        { id: 'com.android.chrome', name: 'Chrome (Browser & Docs)', pkg: 'com.android.chrome', icon: 'fa-brands fa-chrome', bg: '#4285f4', color: '#fff', defaultAcademicsAllowed: true, defaultHealthAllowed: false },
        { id: 'com.whatsapp', name: 'WhatsApp (Messaging)', pkg: 'com.whatsapp', icon: 'fa-brands fa-whatsapp', bg: '#25d366', color: '#fff', defaultAcademicsAllowed: false, defaultHealthAllowed: false },
        { id: 'com.instagram.android', name: 'Instagram', pkg: 'com.instagram.android', icon: 'fa-brands fa-instagram', bg: '#e1306c', color: '#fff', defaultAcademicsAllowed: false, defaultHealthAllowed: false },
        { id: 'com.spotify.music', name: 'Spotify Music', pkg: 'com.spotify.music', icon: 'fa-brands fa-spotify', bg: '#1db954', color: '#000', defaultAcademicsAllowed: false, defaultHealthAllowed: true },
        { id: 'com.discord', name: 'Discord', pkg: 'com.discord', icon: 'fa-brands fa-discord', bg: '#5865f2', color: '#fff', defaultAcademicsAllowed: false, defaultHealthAllowed: false },
        { id: 'com.mobile.games', name: 'Mobile Games & Arcade', pkg: 'com.mobile.games', icon: 'fa-solid fa-gamepad', bg: '#9c27b0', color: '#fff', defaultAcademicsAllowed: false, defaultHealthAllowed: false }
    ];

    let currentMode = 'academics'; // 'academics' | 'health' (Strictly NO free time tab)
    let appFilterKeyword = '';

    // --- 1. LOAD & SAVE SESSION APP RULES ---
    function getStoredAppRules() {
        let rules = null;
        try {
            const raw = localStorage.getItem(KEY_SESSION_RULES);
            if (raw) rules = JSON.parse(raw);
        } catch (e) {}

        if (!rules) {
            rules = {
                enforcementType: 'whitelist', // 'whitelist' (Only allowed apps run) or 'blacklist'
                academicsAllowed: ['com.productometer.app', 'com.google.android.youtube', 'com.android.chrome'],
                healthAllowed: ['com.productometer.app', 'com.spotify.music'],
                customApps: []
            };
            saveAppRules(rules);
        }
        return rules;
    }

    function saveAppRules(rules) {
        try {
            localStorage.setItem(KEY_SESSION_RULES, JSON.stringify(rules));
        } catch (e) {
            console.error('Failed to save session rules:', e);
        }
    }

    // --- 2. MERGE APPS (ANDROID NATIVE + BUILTIN + CUSTOM) ---
    function getAllAvailableApps() {
        const rules = getStoredAppRules();
        let apps = [...DEFAULT_APPS];

        // Merge custom user-added apps
        if (rules.customApps && Array.isArray(rules.customApps)) {
            rules.customApps.forEach(ca => {
                if (!apps.some(a => a.id === ca.id)) {
                    apps.push(ca);
                }
            });
        }

        // Merge real installed apps from Android if running natively
        if (window.NativeBridge && window.NativeBridge.isAvailable()) {
            const androidApps = window.NativeBridge.getInstalledApps();
            if (androidApps && Array.isArray(androidApps)) {
                androidApps.forEach(aa => {
                    if (!apps.some(a => a.pkg === aa.packageName)) {
                        apps.push({
                            id: aa.packageName,
                            name: aa.appName,
                            pkg: aa.packageName,
                            icon: 'fa-solid fa-mobile-screen',
                            bg: '#334155',
                            color: '#fff',
                            defaultAcademicsAllowed: false,
                            defaultHealthAllowed: false
                        });
                    }
                });
            }
        }

        return apps;
    }

    // --- 3. RENDER APPS LIST WITH RUN/BLOCK TOGGLES ---
    function renderSessionAppRules() {
        const container = document.getElementById('sessionAppsList');
        if (!container) return;

        const rules = getStoredAppRules();
        const allowedList = currentMode === 'academics' ? rules.academicsAllowed : rules.healthAllowed;
        const apps = getAllAvailableApps();

        const filtered = apps.filter(app => {
            if (!appFilterKeyword) return true;
            return (app.name + ' ' + app.pkg).toLowerCase().includes(appFilterKeyword.toLowerCase());
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 20px; font-size: 0.8rem;">
                    No matching applications found. Click "+ Add App" to add one.
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(app => {
            const isAllowed = allowedList.includes(app.pkg) || allowedList.includes(app.id);

            return `
            <div class="session-app-row" data-pkg="${app.pkg}">
                <div class="session-app-identity">
                    <div class="session-app-icon" style="background: ${app.bg || '#334155'}; color: ${app.color || '#fff'};">
                        <i class="${app.icon || 'fa-solid fa-cube'}"></i>
                    </div>
                    <div class="session-app-name-box">
                        <span class="session-app-name">${escapeHTML(app.name)}</span>
                        <span class="session-app-pkg">${escapeHTML(app.pkg)}</span>
                    </div>
                </div>
                <button class="btn-app-access-status ${isAllowed ? 'access-allowed' : 'access-blocked'}" data-app-pkg="${app.pkg}">
                    <i class="fa-solid ${isAllowed ? 'fa-check' : 'fa-ban'}"></i>
                    ${isAllowed ? 'Runs in Session' : 'Blocked'}
                </button>
            </div>`;
        }).join('');

        // Attach click listeners to toggle run/block
        container.querySelectorAll('.btn-app-access-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pkg = btn.dataset.appPkg;
                toggleAppAccess(pkg);
            });
        });
    }

    function toggleAppAccess(pkg) {
        const rules = getStoredAppRules();
        const allowedList = currentMode === 'academics' ? rules.academicsAllowed : rules.healthAllowed;

        const idx = allowedList.indexOf(pkg);
        if (idx >= 0) {
            allowedList.splice(idx, 1); // remove from allowed -> becomes blocked
        } else {
            allowedList.push(pkg); // add to allowed
        }

        saveAppRules(rules);
        renderSessionAppRules();

        if (window.NativeBridge && window.NativeBridge.vibrate) {
            window.NativeBridge.vibrate(25);
        }
        if (window.NativeBridge && window.NativeBridge.showToast) {
            const state = idx >= 0 ? 'BLOCKED' : 'ALLOWED';
            window.NativeBridge.showToast(`App is now ${state} during ${currentMode.toUpperCase()} sessions`);
        }
    }

    // --- 4. SCHEDULE GUARDIAN REAL-TIME SYNC ---
    function checkScheduleGuardian() {
        let plannerTasks = [];
        try {
            const raw = localStorage.getItem('productometer_chrono_planner_list');
            if (raw) plannerTasks = JSON.parse(raw);
        } catch (e) {
            plannerTasks = [];
        }

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        let activeTask = null;
        let nextTask = null;

        plannerTasks.forEach(task => {
            let startMins = 0;
            if (typeof task.startMin === 'number') {
                startMins = task.startMin;
            } else if (task.timeDisplayStr) {
                const parts = task.timeDisplayStr.split(':');
                startMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            }
            const duration = parseInt(task.durationMin || task.duration || 60, 10);
            const endMins = startMins + duration;

            if (currentMins >= startMins && currentMins < endMins) {
                activeTask = { ...task, startMins, endMins };
            } else if (startMins > currentMins && (!nextTask || startMins < nextTask.startMins)) {
                nextTask = { ...task, startMins, endMins };
            }
        });

        const statusPill = document.getElementById('guardianStatusPill');
        const taskDetail = document.getElementById('guardianTaskDetail');
        const hubBadge = document.getElementById('hubGuardianBadge');

        if (activeTask) {
            const cat = (activeTask.category || '').toLowerCase();
            const titleLower = (activeTask.title || activeTask.name || '').toLowerCase();
            const isHealth = cat.includes('health') || cat.includes('workout') || titleLower.includes('gym') || titleLower.includes('workout') || titleLower.includes('cardio') || titleLower.includes('exercise') || titleLower.includes('run') || titleLower.includes('walk') || titleLower.includes('yoga');
            const isAcademics = !isHealth;

            if (statusPill) {
                if (isHealth) {
                    statusPill.className = 'guardian-status-pill status-active-health';
                    statusPill.innerHTML = '<i class="fa-solid fa-heart-pulse"></i> SHIELD ACTIVE · HEALTH LOCK';
                } else {
                    statusPill.className = 'guardian-status-pill status-active-academics';
                    statusPill.innerHTML = '<i class="fa-solid fa-shield-halved"></i> SHIELD ACTIVE · ACADEMICS LOCK';
                }
            }

            const startStr = formatMins(activeTask.startMins);
            const endStr = formatMins(activeTask.endMins);
            if (taskDetail) {
                taskDetail.innerHTML = `<i class="fa-solid fa-circle-dot" style="color: #00e5ff;"></i> Active Session: <strong>${escapeHTML(activeTask.title || activeTask.name || 'Focused Session')}</strong> (${startStr} – ${endStr}) · Enforcing allowed apps!`;
            }

            if (hubBadge) {
                hubBadge.className = 'action-card-badge badge-active-shield';
                hubBadge.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Active: ${escapeHTML(activeTask.title || 'Session')}`;
            }
        } else if (nextTask) {
            if (statusPill) {
                statusPill.className = 'guardian-status-pill status-standby';
                statusPill.innerHTML = '<i class="fa-solid fa-bolt"></i> STANDBY · SCHEDULE AWARE';
            }
            if (taskDetail) {
                taskDetail.innerHTML = `<i class="fa-regular fa-clock"></i> Next Session: <strong>${escapeHTML(nextTask.title || nextTask.name || 'Upcoming Task')}</strong> at ${formatMins(nextTask.startMins)}`;
            }
            if (hubBadge) {
                hubBadge.className = 'action-card-badge badge-standby-shield';
                hubBadge.innerHTML = `<i class="fa-solid fa-clock"></i> Next at ${formatMins(nextTask.startMins)}`;
            }
        } else {
            if (statusPill) {
                statusPill.className = 'guardian-status-pill status-standby';
                statusPill.innerHTML = '<i class="fa-solid fa-check-double"></i> STANDBY · ALL CLEAR';
            }
            if (taskDetail) {
                taskDetail.innerHTML = '<i class="fa-regular fa-calendar-check"></i> No active or upcoming Day Planner sessions today.';
            }
            if (hubBadge) {
                hubBadge.className = 'action-card-badge badge-standby-shield';
                hubBadge.innerHTML = '<i class="fa-solid fa-check-double"></i> All Tasks Clear';
            }
        }
    }

    function formatMins(mins) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        return `${displayH}:${m < 10 ? '0' : ''}${m} ${period}`;
    }

    // --- 5. 2-WAY PROTECTION MODE SWITCHER (STRICTLY NO FREE TIME TAB) ---
    const btnAcademics = document.getElementById('modeTabAcademics');
    const btnHealth = document.getElementById('modeTabHealth');

    if (btnAcademics && btnHealth) {
        btnAcademics.addEventListener('click', () => {
            currentMode = 'academics';
            btnAcademics.classList.add('active');
            btnHealth.classList.remove('active');
            renderSessionAppRules();
            syncContentToggles();
            if (window.NativeBridge && window.NativeBridge.vibrate) window.NativeBridge.vibrate(20);
        });

        btnHealth.addEventListener('click', () => {
            currentMode = 'health';
            btnHealth.classList.add('active');
            btnAcademics.classList.remove('active');
            renderSessionAppRules();
            syncContentToggles();
            if (window.NativeBridge && window.NativeBridge.vibrate) window.NativeBridge.vibrate(20);
        });
    }

    // Search input
    const searchInput = document.getElementById('appSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appFilterKeyword = e.target.value.trim();
            renderSessionAppRules();
        });
    }

    // Enforcement Mode Button (Whitelist vs Blacklist)
    const btnToggleRuleType = document.getElementById('btnToggleRuleType');
    if (btnToggleRuleType) {
        btnToggleRuleType.addEventListener('click', () => {
            const rules = getStoredAppRules();
            rules.enforcementType = rules.enforcementType === 'whitelist' ? 'blacklist' : 'whitelist';
            saveAppRules(rules);
            btnToggleRuleType.textContent = rules.enforcementType === 'whitelist' ? 'Strict Whitelist' : 'Blacklist Mode';
            const sub = document.getElementById('enforcementSub');
            if (sub) {
                sub.textContent = rules.enforcementType === 'whitelist'
                    ? 'Only allowed apps can run during session. All others are blocked.'
                    : 'Selected apps are blocked during session. All others are allowed.';
            }
        });
    }

    // --- 6. CONTENT-LEVEL DEFENSE TOGGLES ---
    function getContentRules() {
        let rules = null;
        try {
            const raw = localStorage.getItem(KEY_CONTENT_RULES);
            if (raw) rules = JSON.parse(raw);
        } catch (e) {}

        if (!rules) {
            rules = {
                academics: { shorts: true, reels: true, games: true, web: true },
                health: { shorts: true, reels: true, games: true, web: false }
            };
        }
        return rules;
    }

    function syncContentToggles() {
        const rules = getContentRules();
        const modeRules = rules[currentMode] || rules.academics;

        const toggleShorts = document.getElementById('toggleShorts');
        const toggleReels = document.getElementById('toggleReels');
        const toggleGames = document.getElementById('toggleGames');
        const toggleWeb = document.getElementById('toggleWeb');

        if (toggleShorts) toggleShorts.checked = !!modeRules.shorts;
        if (toggleReels) toggleReels.checked = !!modeRules.reels;
        if (toggleGames) toggleGames.checked = !!modeRules.games;
        if (toggleWeb) toggleWeb.checked = !!modeRules.web;
    }

    function updateContentRule(key, value) {
        const rules = getContentRules();
        if (!rules[currentMode]) rules[currentMode] = {};
        rules[currentMode][key] = value;
        try {
            localStorage.setItem(KEY_CONTENT_RULES, JSON.stringify(rules));
        } catch (e) {}
    }

    const tShorts = document.getElementById('toggleShorts');
    const tReels = document.getElementById('toggleReels');
    const tGames = document.getElementById('toggleGames');
    const tWeb = document.getElementById('toggleWeb');

    if (tShorts) tShorts.addEventListener('change', (e) => updateContentRule('shorts', e.target.checked));
    if (tReels) tReels.addEventListener('change', (e) => updateContentRule('reels', e.target.checked));
    if (tGames) tGames.addEventListener('change', (e) => updateContentRule('games', e.target.checked));
    if (tWeb) tWeb.addEventListener('change', (e) => updateContentRule('web', e.target.checked));

    // --- 7. TEST SHIELD & LIVE INTERCEPTION MODAL ---
    const btnTestShield = document.getElementById('btnTestShield');
    const modalBackdrop = document.getElementById('interceptionModal');
    const btnCloseInterception = document.getElementById('btnCloseInterception');
    const btnOverrideInterception = document.getElementById('btnOverrideInterception');
    const countEl = document.getElementById('interceptionsCount');

    function renderInterceptionsCount() {
        let count = parseInt(localStorage.getItem(KEY_INTERCEPTIONS), 10);
        if (isNaN(count)) count = 14;
        if (countEl) countEl.textContent = count;
        const hubCount = document.getElementById('hubInterceptionsCount');
        if (hubCount) hubCount.textContent = count;
    }

    if (btnTestShield && modalBackdrop) {
        btnTestShield.addEventListener('click', () => {
            let count = parseInt(localStorage.getItem(KEY_INTERCEPTIONS), 10) || 14;
            count++;
            localStorage.setItem(KEY_INTERCEPTIONS, count.toString());
            renderInterceptionsCount();

            modalBackdrop.style.display = 'flex';

            if (window.NativeBridge) {
                if (window.NativeBridge.vibrate) window.NativeBridge.vibrate(80);
                if (window.NativeBridge.showToast) window.NativeBridge.showToast('🛡️ Distraction Intercepted by Productometer Guardian!');
            }
        });
    }

    if (btnCloseInterception && modalBackdrop) {
        btnCloseInterception.addEventListener('click', () => {
            modalBackdrop.style.display = 'none';
        });
    }

    if (btnOverrideInterception && modalBackdrop) {
        btnOverrideInterception.addEventListener('click', () => {
            modalBackdrop.style.display = 'none';
            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast('⚠️ Temporary 30s Pass Granted.');
            }
        });
    }

    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) modalBackdrop.style.display = 'none';
        });
    }

    // Modal: Add Custom Rule App
    const btnAddRuleApp = document.getElementById('btnAddRuleApp');
    const modalAddRule = document.getElementById('modalAddRuleApp');
    const btnSaveRuleApp = document.getElementById('btnSaveRuleApp');
    const btnCancelRuleApp = document.getElementById('btnCancelRuleApp');
    const inputNewAppName = document.getElementById('newRuleAppName');
    const inputNewAppPkg = document.getElementById('newRuleAppPkg');
    const selectNewAppDefault = document.getElementById('newRuleAppDefault');

    if (btnAddRuleApp && modalAddRule) {
        btnAddRuleApp.addEventListener('click', () => {
            modalAddRule.style.display = 'flex';
            if (inputNewAppName) inputNewAppName.focus();
        });
    }

    if (btnCancelRuleApp && modalAddRule) {
        btnCancelRuleApp.addEventListener('click', () => {
            modalAddRule.style.display = 'none';
        });
    }

    if (btnSaveRuleApp && modalAddRule) {
        btnSaveRuleApp.addEventListener('click', () => {
            const name = inputNewAppName ? inputNewAppName.value.trim() : '';
            const pkg = inputNewAppPkg ? inputNewAppPkg.value.trim() : ('custom.' + name.toLowerCase().replace(/[^a-z0-9]/g, ''));
            const isAllowed = selectNewAppDefault ? selectNewAppDefault.value === 'allowed' : false;

            if (!name) {
                alert('Please enter an application or website name.');
                return;
            }

            const rules = getStoredAppRules();
            if (!rules.customApps) rules.customApps = [];
            rules.customApps.push({
                id: pkg,
                name: name,
                pkg: pkg,
                icon: 'fa-solid fa-cube',
                bg: '#334155',
                color: '#fff'
            });

            if (isAllowed) {
                if (currentMode === 'academics') rules.academicsAllowed.push(pkg);
                else rules.healthAllowed.push(pkg);
            }

            saveAppRules(rules);
            modalAddRule.style.display = 'none';
            if (inputNewAppName) inputNewAppName.value = '';
            if (inputNewAppPkg) inputNewAppPkg.value = '';
            renderSessionAppRules();
        });
    }

    // --- 7.5 DEDICATED VIEW TOGGLE: DISTRACTION BLOCKER BUTTON ---
    const btnOpenBlocker = document.getElementById('btnOpenBlocker');
    const btnBackToMe = document.getElementById('btnBackToMe');
    const meHubView = document.getElementById('meHubView');
    const distractionBlockerView = document.getElementById('distractionBlockerView');

    if (btnOpenBlocker && meHubView && distractionBlockerView) {
        btnOpenBlocker.addEventListener('click', () => {
            meHubView.style.display = 'none';
            distractionBlockerView.style.display = 'flex';
            renderSessionAppRules();
            syncContentToggles();
            checkScheduleGuardian();
            if (window.NativeBridge && window.NativeBridge.vibrate) window.NativeBridge.vibrate(30);
        });
    }

    if (btnBackToMe && meHubView && distractionBlockerView) {
        btnBackToMe.addEventListener('click', () => {
            distractionBlockerView.style.display = 'none';
            meHubView.style.display = 'flex';
            renderInterceptionsCount();
            if (window.NativeBridge && window.NativeBridge.vibrate) window.NativeBridge.vibrate(20);
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // --- 8. REACTIVE SCHEDULE DATA LISTENER ---
    window.addEventListener('storage', (e) => {
        if (e.key === 'productometer_chrono_planner_list') {
            checkScheduleGuardian();
        }
    });

    // --- 9. INITIALIZE ---
    renderSessionAppRules();
    syncContentToggles();
    checkScheduleGuardian();
    renderInterceptionsCount();

    // Auto-refresh schedule check
    setInterval(checkScheduleGuardian, 10000);
});
