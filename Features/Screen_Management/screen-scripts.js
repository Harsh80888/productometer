// ==========================================================================
// PRODUCTOMETER - SCREEN MANAGEMENT: DIGITAL WELLBEING ENGINE
// Synchronized with Academics Monitoring · Day Planner · Android UsageStats
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. LOCAL STORAGE KEYS ---
    const KEY_APPS = 'productometer_screentime_apps_v2';
    const KEY_GOAL_HOURS = 'productometer_daily_screentime_goal';
    const KEY_UNLOCKS = 'productometer_daily_unlocks';
    const KEY_ACTIVE_WEB_SECONDS = 'productometer_active_web_session_seconds';
    const KEY_DATE = 'productometer_screen_date';
    const KEY_SCREEN_DATA = 'productometer_screen_data';

    // Daily reset check
    const todayStr = new Date().toDateString();
    const storedDate = localStorage.getItem(KEY_DATE);
    if (storedDate !== todayStr) {
        localStorage.setItem(KEY_DATE, todayStr);
        localStorage.setItem(KEY_ACTIVE_WEB_SECONDS, '0');
        localStorage.setItem(KEY_UNLOCKS, '1');
    } else {
        let currentUnlocks = parseInt(localStorage.getItem(KEY_UNLOCKS), 10) || 0;
        currentUnlocks++;
        localStorage.setItem(KEY_UNLOCKS, currentUnlocks.toString());
    }

    // Default monitored apps template (starts aligned with real tracked time)
    const DEFAULT_APPS = [
        { id: 'app_prod_meter', name: 'Productivity Meter (Academics Timer)', category: 'productivity', seconds: 0, icon: 'fa-solid fa-graduation-cap', bg: '#ff1744', color: '#fff' },
        { id: 'app_active_session', name: 'Productivity Meter (Active Dashboard Focus)', category: 'productivity', seconds: 0, icon: 'fa-solid fa-bolt', bg: '#d50000', color: '#fff' },
        { id: 'app_yt', name: 'YouTube (Lectures & Notes)', category: 'productivity', seconds: 1800, icon: 'fa-brands fa-youtube', bg: '#e50914', color: '#fff' },
        { id: 'app_chrome', name: 'Chrome (Browser & Research)', category: 'productivity', seconds: 1200, icon: 'fa-brands fa-chrome', bg: '#4285f4', color: '#fff' },
        { id: 'app_insta', name: 'Instagram', category: 'others', seconds: 900, icon: 'fa-brands fa-instagram', bg: '#e1306c', color: '#fff' },
        { id: 'app_whatsapp', name: 'WhatsApp & Messages', category: 'others', seconds: 600, icon: 'fa-brands fa-whatsapp', bg: '#25d366', color: '#fff' }
    ];

    // --- 2. ACTIVE SESSION TRACKER ---
    let activeWebSeconds = parseInt(localStorage.getItem(KEY_ACTIVE_WEB_SECONDS), 10) || 0;
    setInterval(() => {
        if (!document.hidden) {
            activeWebSeconds++;
            localStorage.setItem(KEY_ACTIVE_WEB_SECONDS, activeWebSeconds.toString());
        }
    }, 1000);

    // --- 3. GET & SYNCHRONIZE REAL APP USAGE ---
    function getRealScreenApps() {
        let apps = [];

        // A. If on Android Native with UsageStats permission:
        if (window.NativeBridge && window.NativeBridge.isAvailable()) {
            if (window.NativeBridge.hasUsageStatsPermission()) {
                const androidStats = window.NativeBridge.getRealAppUsageStats();
                if (androidStats && Array.isArray(androidStats) && androidStats.length > 0) {
                    return androidStats.map(item => ({
                        id: item.packageName,
                        name: item.appName || item.packageName,
                        category: item.category || 'others',
                        seconds: item.totalSeconds || (item.minutes * 60) || 0,
                        icon: 'fa-solid fa-mobile-screen',
                        bg: '#334155',
                        color: '#fff',
                        isNativeAndroid: true
                    }));
                }
            } else {
                const permBanner = document.getElementById('androidPermissionBanner');
                if (permBanner) permBanner.style.display = 'flex';
            }
        }

        // B. Load stored apps or defaults
        try {
            const raw = localStorage.getItem(KEY_APPS);
            if (raw) apps = JSON.parse(raw);
            else apps = DEFAULT_APPS;
        } catch (e) {
            apps = DEFAULT_APPS;
        }

        // C. EXACT ALIGNMENT WITH ACADEMICS STUDY TIMER:
        const realStudySeconds = parseInt(localStorage.getItem('productometer_daily_study_seconds'), 10) || 0;
        let meterApp = apps.find(a => a.id === 'app_prod_meter');
        if (meterApp) {
            meterApp.seconds = realStudySeconds;
        } else {
            apps.unshift({
                id: 'app_prod_meter',
                name: 'Productivity Meter (Academics Timer)',
                category: 'productivity',
                seconds: realStudySeconds,
                icon: 'fa-solid fa-graduation-cap',
                bg: '#ff1744',
                color: '#fff'
            });
        }

        // D. EXACT ALIGNMENT WITH ACTIVE SESSION FOCUS:
        let activeApp = apps.find(a => a.id === 'app_active_session');
        if (activeApp) {
            activeApp.seconds = activeWebSeconds;
        }

        return apps;
    }

    function saveApps(apps) {
        try {
            localStorage.setItem(KEY_APPS, JSON.stringify(apps));
        } catch (e) {
            console.error('Failed to save apps:', e);
        }
    }

    // --- 4. DIGITAL WELLBEING CALCULATION & SHARED METRICS COMMIT ---
    let currentFilter = 'all';

    function refreshDigitalWellbeingDashboard() {
        const apps = getRealScreenApps();

        let totalSecs = 0;
        let prodSecs = 0;
        let othersSecs = 0;

        apps.forEach(app => {
            const s = parseInt(app.seconds, 10) || 0;
            totalSecs += s;
            if (app.category === 'productivity') {
                prodSecs += s;
            } else {
                othersSecs += s;
            }
        });

        // 🎯 BIDIRECTIONAL SYNC: Commit to 'productometer_screen_data' so Features tab displays matching live hours!
        try {
            localStorage.setItem(KEY_SCREEN_DATA, JSON.stringify({
                totalScreenSecondsToday: totalSecs,
                productiveSeconds: prodSecs,
                othersSeconds: othersSecs,
                date: todayStr
            }));
        } catch (e) {}

        const totalMins = Math.round(totalSecs / 60);
        const prodMins = Math.round(prodSecs / 60);
        const othersMins = Math.round(othersSecs / 60);

        const totalH = Math.floor(totalMins / 60);
        const remTotalM = totalMins % 60;

        const prodH = Math.floor(prodMins / 60);
        const remProdM = prodMins % 60;

        const othersH = Math.floor(othersMins / 60);
        const remOthersM = othersMins % 60;

        // Ratio percentages
        const prodPct = totalSecs > 0 ? Math.round((prodSecs / totalSecs) * 100) : 0;
        const othersPct = totalSecs > 0 ? (100 - prodPct) : 0;

        // Hero total time
        const heroH = document.getElementById('heroHours');
        const heroM = document.getElementById('heroMinutes');
        if (heroH) heroH.textContent = totalH;
        if (heroM) heroM.textContent = remTotalM;

        // Tri-Metrics: Device Sessions
        const unlocksEl = document.getElementById('metricUnlocks');
        if (unlocksEl) {
            unlocksEl.textContent = localStorage.getItem(KEY_UNLOCKS) || '1';
        }

        // Tri-Metrics: Goal
        const goalHours = parseFloat(localStorage.getItem(KEY_GOAL_HOURS)) || 4.0;
        const totalHoursDecimal = totalSecs / 3600;
        const goalPct = Math.round((totalHoursDecimal / goalHours) * 100);
        const goalEl = document.getElementById('metricGoalAchieved');
        if (goalEl) {
            goalEl.textContent = `${goalPct}% (${totalHoursDecimal.toFixed(1)}/${goalHours}h)`;
            goalEl.style.color = totalHoursDecimal > goalHours ? '#ff5252' : '#00e5ff';
        }

        // Tri-Metrics: Bedtime
        const bedtimeStatusEl = document.getElementById('metricBedtimeStatus');
        if (bedtimeStatusEl) {
            const nowH = new Date().getHours();
            if (nowH >= 22 || nowH < 6) {
                bedtimeStatusEl.textContent = '🌙 Active';
                bedtimeStatusEl.style.color = '#ffb300';
            } else {
                bedtimeStatusEl.textContent = 'Off (10:30 PM)';
                bedtimeStatusEl.style.color = '#94a3b8';
            }
        }

        // Dedicated Productivity vs Others Bar
        const barProd = document.getElementById('segProductive');
        const barOthers = document.getElementById('segOthers');
        const ratioBadge = document.getElementById('ratioPercentageBadge');

        if (barProd) barProd.style.width = `${prodPct}%`;
        if (barOthers) barOthers.style.width = `${othersPct}%`;
        if (ratioBadge) ratioBadge.textContent = `${prodPct}%`;

        // Legend row
        const legProd = document.getElementById('legendProductiveText');
        const legOth = document.getElementById('legendOthersText');
        if (legProd) legProd.textContent = `· ${prodH}h ${remProdM}m (${prodPct}%)`;
        if (legOth) legOth.textContent = `· ${othersH}h ${remOthersM}m (${othersPct}%)`;

        // Render app list
        renderAppList(apps, totalSecs);
    }

    // --- 5. RENDER APP LIST ---
    function renderAppList(apps, totalSecs) {
        const container = document.getElementById('appBreakdownList');
        if (!container) return;

        const filtered = apps
            .filter(app => {
                if (currentFilter === 'productivity') return app.category === 'productivity';
                if (currentFilter === 'others') return app.category === 'others';
                return true;
            })
            .sort((a, b) => (b.seconds || 0) - (a.seconds || 0));

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 24px; font-size: 0.82rem;">
                    No applications in this category.
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(app => {
            const s = app.seconds || 0;
            const m = Math.round(s / 60);
            const h = Math.floor(m / 60);
            const remM = m % 60;
            const timeStr = h > 0 ? `${h}h ${remM}m` : `${remM}m`;
            const appPct = totalSecs > 0 ? Math.round((s / totalSecs) * 100) : 0;
            const isProd = app.category === 'productivity';

            return `
            <div class="app-card-item" data-id="${app.id}">
                <div class="app-top-info">
                    <div class="app-brand">
                        <div class="app-avatar" style="background: ${app.bg || '#334155'}; color: ${app.color || '#fff'};">
                            <i class="${app.icon || 'fa-solid fa-cube'}"></i>
                        </div>
                        <div class="app-meta-box">
                            <span class="app-label-title">${escapeHTML(app.name)}</span>
                            <button class="app-category-toggle ${isProd ? 'cat-prod' : 'cat-others'}" data-app-id="${app.id}" title="Click to reclassify">
                                ${isProd ? '🎓 Productivity' : '🌐 Others'} (Click to change)
                            </button>
                        </div>
                    </div>
                    <div class="app-duration-box">
                        <span class="app-time-bold">${timeStr}</span>
                        <span class="app-pct-sub">${appPct}%</span>
                    </div>
                </div>
                <div class="app-track-rail">
                    <div class="app-track-fill ${isProd ? 'fill-prod' : 'fill-oth'}" style="width: ${appPct}%;"></div>
                </div>
            </div>`;
        }).join('');

        // Reclassify button click listeners
        container.querySelectorAll('.app-category-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appId = btn.dataset.appId;
                toggleAppCategory(appId);
            });
        });
    }

    function toggleAppCategory(appId) {
        const apps = getRealScreenApps();
        const target = apps.find(a => a.id === appId);
        if (target) {
            target.category = target.category === 'productivity' ? 'others' : 'productivity';
            saveApps(apps);
            refreshDigitalWellbeingDashboard();

            if (window.NativeBridge && window.NativeBridge.vibrate) {
                window.NativeBridge.vibrate(30);
            }
            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast(`Updated "${target.name}" to ${target.category.toUpperCase()}`);
            }
        }
    }

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            refreshDigitalWellbeingDashboard();
        });
    });

    // Daily Goal Input
    const goalInput = document.getElementById('dailyGoalInput');
    if (goalInput) {
        goalInput.value = localStorage.getItem(KEY_GOAL_HOURS) || '4.0';
        goalInput.addEventListener('change', (e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val) || val <= 0) val = 4.0;
            localStorage.setItem(KEY_GOAL_HOURS, val.toFixed(1));
            refreshDigitalWellbeingDashboard();
        });
    }

    // Android Usage Access
    const btnGrant = document.getElementById('btnGrantUsageAccess');
    if (btnGrant) {
        btnGrant.addEventListener('click', () => {
            if (window.NativeBridge && window.NativeBridge.openUsageAccessSettings) {
                window.NativeBridge.openUsageAccessSettings();
            }
        });
    }

    // Modal: Add Custom App
    const btnAddApp = document.getElementById('btnAddCustomApp');
    const modalAdd = document.getElementById('modalAddApp');
    const btnSaveCustomApp = document.getElementById('btnSaveCustomApp');
    const btnCancelCustomApp = document.getElementById('btnCancelCustomApp');
    const inputAppName = document.getElementById('customAppName');
    const selectAppCategory = document.getElementById('customAppCategory');
    const inputAppMinutes = document.getElementById('customAppMinutes');

    if (btnAddApp && modalAdd) {
        btnAddApp.addEventListener('click', () => {
            modalAdd.style.display = 'flex';
            if (inputAppName) inputAppName.focus();
        });
    }

    if (btnCancelCustomApp && modalAdd) {
        btnCancelCustomApp.addEventListener('click', () => {
            modalAdd.style.display = 'none';
        });
    }

    if (btnSaveCustomApp && modalAdd) {
        btnSaveCustomApp.addEventListener('click', () => {
            const name = (inputAppName ? inputAppName.value.trim() : '');
            const category = (selectAppCategory ? selectAppCategory.value : 'others');
            const minutes = parseInt(inputAppMinutes ? inputAppMinutes.value : '30', 10) || 30;

            if (!name) {
                alert('Please enter an application or website name.');
                return;
            }

            const apps = getRealScreenApps();
            const newApp = {
                id: 'custom_' + Date.now(),
                name: name,
                category: category,
                seconds: minutes * 60,
                icon: 'fa-solid fa-cube',
                bg: category === 'productivity' ? '#ff1744' : '#64748b',
                color: '#fff'
            };
            apps.push(newApp);
            saveApps(apps);

            modalAdd.style.display = 'none';
            if (inputAppName) inputAppName.value = '';
            refreshDigitalWellbeingDashboard();
        });
    }

    // --- 6. REACTIVE CROSS-MODULE DATA ALIGNMENT ---
    // Auto-update when Academics Monitoring study seconds or Day Planner tasks change in another tab/module!
    window.addEventListener('storage', (e) => {
        if (e.key === 'productometer_daily_study_seconds' || e.key === 'productometer_chrono_planner_list') {
            refreshDigitalWellbeingDashboard();
        }
    });

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Initial render & background tick
    refreshDigitalWellbeingDashboard();
    setInterval(refreshDigitalWellbeingDashboard, 10000);
});
