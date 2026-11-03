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
        { id: 'app_prod_meter', name: 'Productometer (Academics Timer)', category: 'productivity', seconds: 0, icon: 'fa-solid fa-graduation-cap', bg: '#00e5ff', color: '#fff' },
        { id: 'app_active_session', name: 'Productometer (Active Focus)', category: 'productivity', seconds: 0, icon: 'fa-solid fa-bolt', bg: '#0284c7', color: '#fff' }
    ];

    // --- 2. ACTIVE SESSION TRACKER ---

    let activeWebSeconds = parseInt(localStorage.getItem(KEY_ACTIVE_WEB_SECONDS), 10) || 0;

    setInterval(() => {

        if (!document.hidden) {

            activeWebSeconds++;

            localStorage.setItem(KEY_ACTIVE_WEB_SECONDS, activeWebSeconds.toString());

        }

    }, 1000);

    

    // Clean App Name Resolver

    const KNOWN_APP_NAMES = {

        'com.google.android.youtube': 'YouTube',

        'com.whatsapp': 'WhatsApp',

        'com.instagram.android': 'Instagram',

        'com.facebook.katana': 'Facebook',

        'com.facebook.orca': 'Messenger',

        'com.android.chrome': 'Google Chrome',

        'com.google.android.apps.messaging': 'Messages',

        'com.google.android.gm': 'Gmail',

        'com.google.android.apps.maps': 'Google Maps',

        'com.spotify.music': 'Spotify',

        'com.snapchat.android': 'Snapchat',

        'com.twitter.android': 'X (Twitter)',

        'org.telegram.messenger': 'Telegram',

        'com.netflix.mediaclient': 'Netflix',

        'com.reddit.frontpage': 'Reddit',

        'com.google.android.apps.photos': 'Google Photos',

        'com.google.android.apps.docs': 'Google Drive',

        'com.google.android.calendar': 'Google Calendar',

        'com.google.android.deskclock': 'Clock',

        'com.google.android.calculator': 'Calculator',

        'com.google.android.dialer': 'Phone',

        'com.android.settings': 'Settings',

        'com.android.camera': 'Camera'

    };

        function getAppFallbackIcon(appName, pkgName) {
        const combined = ((appName || '') + ' ' + (pkgName || '')).toLowerCase();
        if (combined.includes('youtube')) return 'fa-brands fa-youtube';
        if (combined.includes('whatsapp')) return 'fa-brands fa-whatsapp';
        if (combined.includes('chrome')) return 'fa-brands fa-chrome';
        if (combined.includes('instagram')) return 'fa-brands fa-instagram';
        if (combined.includes('facebook') || combined.includes('meta')) return 'fa-brands fa-facebook';
        if (combined.includes('twitter') || combined.includes('x.com')) return 'fa-brands fa-x-twitter';
        if (combined.includes('telegram')) return 'fa-brands fa-telegram';
        if (combined.includes('spotify')) return 'fa-brands fa-spotify';
        if (combined.includes('github')) return 'fa-brands fa-github';
        if (combined.includes('camera')) return 'fa-solid fa-camera';
        if (combined.includes('gallery') || combined.includes('photo')) return 'fa-solid fa-images';
        if (combined.includes('map')) return 'fa-solid fa-map-location-dot';
        if (combined.includes('mail') || combined.includes('gmail')) return 'fa-solid fa-envelope';
        if (combined.includes('drive') || combined.includes('doc')) return 'fa-solid fa-file-lines';
        if (combined.includes('clock') || combined.includes('alarm')) return 'fa-solid fa-clock';
        if (combined.includes('calc')) return 'fa-solid fa-calculator';
        if (combined.includes('code') || combined.includes('term')) return 'fa-solid fa-terminal';
        if (combined.includes('game')) return 'fa-solid fa-gamepad';
        return 'fa-solid fa-mobile-screen-button';
    }

    function formatCleanAppName(rawName, pkgName) {

        if (pkgName && KNOWN_APP_NAMES[pkgName]) return KNOWN_APP_NAMES[pkgName];

        if (rawName && KNOWN_APP_NAMES[rawName]) return KNOWN_APP_NAMES[rawName];

        let name = rawName || pkgName || 'App';

        if (name.includes('.') && (name.startsWith('com.') || name.startsWith('org.') || name.startsWith('in.'))) {

            const parts = name.split('.');

            let last = parts[parts.length - 1];

            if (last.toLowerCase() === 'android' && parts.length > 1) {

                last = parts[parts.length - 2];

            }

            if (last) {

                name = last.charAt(0).toUpperCase() + last.slice(1).replace(/_/g, ' ');

            }

        }

        return name;

    }

    // --- 3. GET & SYNCHRONIZE REAL APP USAGE ---

    function getRealScreenApps() {

        let apps = [];

        // Load user category overrides if any

        let savedOverrides = {};

        try {

            const raw = localStorage.getItem(KEY_APPS);

            if (raw) {

                JSON.parse(raw).forEach(a => { if (a && a.id) savedOverrides[a.id] = a.category; });

            }

        } catch (e) {}

        // A. If on Android Native with UsageStats permission:
        const permBanner = document.getElementById('androidPermissionBanner');
        const specialPermCard = document.getElementById('screenSpecialPermCard');

        if (window.NativeBridge && window.NativeBridge.isAvailable()) {
            let androidStats = null;
            try {
                androidStats = window.NativeBridge.getRealAppUsageStats();
            } catch (e) {}

            const hasValidStats = (androidStats && Array.isArray(androidStats) && androidStats.length > 0);
            let hasPerm = hasValidStats;
            if (!hasPerm && window.NativeBridge.hasUsageStatsPermission) {
                try {
                    hasPerm = window.NativeBridge.hasUsageStatsPermission();
                } catch (e) {}
            }

            if (hasValidStats) {
                if (permBanner) permBanner.style.display = 'none';
                if (specialPermCard) specialPermCard.style.display = 'none';

                const mappedApps = androidStats.map(item => {
                    const cleanTitle = formatCleanAppName(item.appName, item.packageName);
                    const assignedCategory = savedOverrides[item.packageName] || (item.category === 'productivity' ? 'productivity' : 'others');
                    return {
                        id: item.packageName,
                        name: cleanTitle,
                        category: assignedCategory,
                        seconds: item.totalSeconds || (item.minutes * 60) || 0,
                        iconBase64: item.iconBase64 || null,
                        icon: getAppFallbackIcon(cleanTitle, item.packageName),
                        bg: assignedCategory === 'productivity' ? '#00e5ff' : '#334155',
                        color: '#fff',
                        isNativeAndroid: true,
                        isGame: !!item.isGame,
                        isCompulsory: !!item.isCompulsory,
                        limitMinutes: typeof item.limitMinutes === 'number' ? item.limitMinutes : (item.isCompulsory ? 30 : 0),
                        isFrozen: !!item.isFrozen,
                        isGrace: !!item.isGrace,
                        graceRemaining: typeof item.graceRemaining === 'number' ? item.graceRemaining : 0,
                        isUnchangeable: !!item.isUnchangeable
                    };
                });

                try {
                    const lightApps = mappedApps.map(a => ({
                        id: a.id,
                        name: a.name,
                        category: a.category,
                        seconds: a.seconds,
                        limitMinutes: a.limitMinutes,
                        isGame: a.isGame,
                        isCompulsory: a.isCompulsory
                    }));
                    localStorage.setItem(KEY_APPS, JSON.stringify(lightApps));
                } catch (e) {}

                return mappedApps;
            } else if (!hasPerm) {
                if (permBanner) permBanner.style.display = 'flex';
                if (specialPermCard) specialPermCard.style.display = 'flex';
            } else {
                if (permBanner) permBanner.style.display = 'none';
                if (specialPermCard) specialPermCard.style.display = 'none';
            }
        } else {
            if (permBanner) permBanner.style.display = 'none';
            if (specialPermCard) specialPermCard.style.display = 'none';
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

                name: 'Productometer (Academics Timer)',

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

        // E. EXACT ALIGNMENT WITH DAY PLANNER TIMELINE SCREEN SLOTS:
        let timelineScreenSecs = 0;
        try {
            const rawTimeline = localStorage.getItem('productometer_timeline');
            if (rawTimeline) {
                const parsedTimeline = JSON.parse(rawTimeline);
                if (Array.isArray(parsedTimeline)) {
                    parsedTimeline.forEach(slot => {
                        if (slot === 'screen') timelineScreenSecs += (30 * 60);
                    });
                }
            }
        } catch (e) {}

        if (timelineScreenSecs > 0) {
            let timelineApp = apps.find(a => a.id === 'app_timeline_screen');
            if (timelineApp) {
                timelineApp.seconds = timelineScreenSecs;
            } else {
                apps.push({
                    id: 'app_timeline_screen',
                    name: 'Day Planner Screen Time',
                    category: 'others',
                    seconds: timelineScreenSecs,
                    icon: 'fa-solid fa-tv',
                    bg: '#ef4444',
                    color: '#fff'
                });
            }
        }

        // Web Fallback: calculate limit & compulsory rules
        let localLimits = {};
        try {
            localLimits = JSON.parse(localStorage.getItem('productometer_app_limits') || '{}');
        } catch (e) {}

        apps.forEach(app => {
            const lower = ((app.id || '') + ' ' + (app.name || '')).toLowerCase();
            const isGame = lower.includes('game') || lower.includes('chess') || lower.includes('daman');
            const isCompulsory = isGame || lower.includes('facebook') || lower.includes('instagram');
            app.isGame = isGame;
            app.isCompulsory = isCompulsory;

            let lim = localLimits[app.id];
            if (typeof lim !== 'number') {
                lim = isCompulsory ? 30 : 0;
            }
            app.limitMinutes = lim;

            const usedMinutes = Math.round((app.seconds || 0) / 60);
            if (lim > 0) {
                if (usedMinutes >= lim + 10) {
                    app.isFrozen = true;
                    app.isUnchangeable = true;
                    app.isGrace = false;
                    app.graceRemaining = 0;
                } else if (usedMinutes >= lim) {
                    app.isGrace = true;
                    app.isUnchangeable = true;
                    app.isFrozen = false;
                    app.graceRemaining = (lim + 10) - usedMinutes;
                } else {
                    app.isFrozen = false;
                    app.isGrace = false;
                    app.isUnchangeable = false;
                    app.graceRemaining = 0;
                }
            } else {
                app.isFrozen = false;
                app.isGrace = false;
                app.isUnchangeable = false;
                app.graceRemaining = 0;
            }
        });

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

        // 🎯 BIDIRECTIONAL SYNC: Commit to 'productometer_screen_data' and hours so Features tab & AI Coach match!
        if (totalSecs === 0) {
            try {
                const cached = localStorage.getItem(KEY_SCREEN_DATA);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.date === todayStr && parsed.totalScreenSecondsToday > 0) {
                        totalSecs = parsed.totalScreenSecondsToday;
                        prodSecs = parsed.productiveSeconds || 0;
                        othersSecs = parsed.othersSeconds || totalSecs;
                    }
                }
            } catch (e) {}
        }

        if (totalSecs > 0) {
            try {
                localStorage.setItem(KEY_SCREEN_DATA, JSON.stringify({
                    totalScreenSecondsToday: totalSecs,
                    productiveSeconds: prodSecs,
                    othersSeconds: othersSecs,
                    date: todayStr
                }));
                localStorage.setItem('screen_total_hours', (totalSecs / 3600).toFixed(2));
                localStorage.setItem('screen_nonprod_hours', (othersSecs / 3600).toFixed(2));
            } catch (e) {}
        }

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

                // Tri-Metrics: Goal & Danger Over-Limit Evaluation (RED strictly when over target!)
        const goalHours = parseFloat(localStorage.getItem(KEY_GOAL_HOURS)) || 4.0;
        const totalHoursDecimal = totalSecs / 3600;
        const goalPct = Math.round((totalHoursDecimal / goalHours) * 100);
        const goalEl = document.getElementById('metricGoalAchieved');

        const isOverLimit = totalHoursDecimal > goalHours;
        const isNearLimit = !isOverLimit && totalHoursDecimal >= (goalHours * 0.8);

        const heroCard = document.getElementById('heroScreenCard');
        const alertBanner = document.getElementById('excessiveAlertBanner');
        const alertHeadline = document.getElementById('alertHeadlineText');
        const alertSubtext = document.getElementById('alertSubtext');
        const topChip = document.getElementById('topModuleChip');
        const healthStatus = document.getElementById('screenHealthStatus');
        const goalInputBox = document.getElementById('dailyGoalInput');
        let barOthers = document.getElementById('segOthers');

        if (isOverLimit) {
            // 🚨 THINGS GOING WRONG: Excessive Screentime triggers RED warnings!
            const overMinutes = Math.round((totalHoursDecimal - goalHours) * 60);
            const overHours = Math.floor(overMinutes / 60);
            const remOverM = overMinutes % 60;
            const overStr = overHours > 0 ? `${overHours}h ${remOverM}m` : `${remOverM}m`;

            if (alertBanner) {
                alertBanner.style.display = 'flex';
                if (alertHeadline) alertHeadline.textContent = `🚨 Excessive Screen Time: Target Exceeded (+${overStr})`;
                if (alertSubtext) alertSubtext.textContent = `You have exceeded your ${goalHours.toFixed(1)}h daily limit by ${overStr}. Consider resting your eyes or stepping away from screens.`;
            }

            if (heroCard) heroCard.classList.add('over-limit');
            if (topChip) topChip.classList.add('over-limit');
            if (goalInputBox) goalInputBox.classList.add('over-limit');
            if (barOthers && othersPct >= 60) barOthers.classList.add('over-limit');

            if (healthStatus) {
                healthStatus.textContent = '🔴 OVER LIMIT';
                healthStatus.style.color = '#ff1744';
            }

            if (goalEl) {
                goalEl.textContent = `${goalPct}% (${totalHoursDecimal.toFixed(1)}/${goalHours}h) - OVER`;
                goalEl.style.color = '#ff1744';
            }
        } else if (isNearLimit) {
            // 🟡 Caution Zone (Amber #ffab00)
            if (alertBanner) alertBanner.style.display = 'none';
            if (heroCard) heroCard.classList.remove('over-limit');
            if (topChip) topChip.classList.remove('over-limit');
            if (goalInputBox) goalInputBox.classList.remove('over-limit');
            if (barOthers) barOthers.classList.remove('over-limit');

            if (healthStatus) {
                healthStatus.textContent = '🟡 NEAR LIMIT';
                healthStatus.style.color = '#ffab00';
            }

            if (goalEl) {
                goalEl.textContent = `${goalPct}% (${totalHoursDecimal.toFixed(1)}/${goalHours}h)`;
                goalEl.style.color = '#ffab00';
            }
        } else {
            // 🟢 Healthy & Balanced (Emerald Green #00e676 / Cyan #00e5ff)
            if (alertBanner) alertBanner.style.display = 'none';
            if (heroCard) heroCard.classList.remove('over-limit');
            if (topChip) topChip.classList.remove('over-limit');
            if (goalInputBox) goalInputBox.classList.remove('over-limit');
            if (barOthers) barOthers.classList.remove('over-limit');

            if (healthStatus) {
                healthStatus.textContent = '🟢 BALANCED';
                healthStatus.style.color = '#00e676';
            }

            if (goalEl) {
                goalEl.textContent = `${goalPct}% (${totalHoursDecimal.toFixed(1)}/${goalHours}h)`;
                goalEl.style.color = '#00e5ff';
            }
        }

        // Dynamic Bedtime & App Limits Refresh
        updateBedtimeUI();
        renderActiveLimitsSection(apps);

        // Dedicated Productivity vs Others Bar

        const barProd = document.getElementById('segProductive');

        barOthers = document.getElementById('segOthers');

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

                if (currentFilter === 'others') return app.category !== 'productivity';

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
            let timeStr = '0m';
            if (h > 0) {
                timeStr = `${h}h ${remM}m`;
            } else if (m > 0) {
                timeStr = `${m}m`;
            } else if (s > 0) {
                timeStr = `${s}s`;
            }
            const appPct = totalSecs > 0 ? Math.round((s / totalSecs) * 100) : 0;
            const isProd = app.category === 'productivity';
            const isExcessiveApp = !isProd && (s > 3600);

            // Build Limit Badge
            let limitBadgeHtml = '';
            const limit = app.limitMinutes || 0;

            if (app.isFrozen) {
                limitBadgeHtml = `
                    <button class="app-limit-badge badge-frozen badge-locked" data-app-id="${app.id}" title="App is frozen until midnight">
                        <i class="fa-solid fa-lock"></i> ❄️ Frozen (${limit}m)
                    </button>`;
            } else if (app.isGrace) {
                limitBadgeHtml = `
                    <button class="app-limit-badge badge-grace badge-locked" data-app-id="${app.id}" title="10-minute grace period active">
                        <i class="fa-solid fa-lock"></i> ⏳ Grace (${app.graceRemaining || 1}m left)
                    </button>`;
            } else if (limit > 0) {
                if (app.isCompulsory) {
                    limitBadgeHtml = `
                        <button class="app-limit-badge badge-active badge-compulsory" data-app-id="${app.id}" title="Compulsory daily limit (click to adjust)">
                            <i class="fa-solid fa-bolt"></i> ${limit}m (Compulsory)
                        </button>`;
                } else {
                    limitBadgeHtml = `
                        <button class="app-limit-badge badge-active" data-app-id="${app.id}" title="Daily time limit (click to adjust)">
                            <i class="fa-solid fa-stopwatch"></i> ${limit}m limit
                        </button>`;
                }
            } else {
                limitBadgeHtml = `
                    <button class="app-limit-badge badge-none" data-app-id="${app.id}" title="Set daily time limit">
                        <i class="fa-solid fa-plus"></i> Set Limit
                    </button>`;
            }

            let trackFillClass = isProd ? 'fill-prod' : (isExcessiveApp ? 'fill-excessive' : 'fill-oth');
            if (app.isFrozen || app.isGrace) {
                trackFillClass = 'fill-excessive';
            }

            return `

            <div class="app-card-item" data-id="${app.id}">

                <div class="app-top-info">

                    <div class="app-brand">
                        ${app.iconBase64 ? 
                            `<img src="${app.iconBase64}" class="app-native-logo" alt="" style="width: 38px; height: 38px; border-radius: 9px; object-fit: contain; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.4); margin-right: 10px;">` :
                            `<div class="app-avatar" style="background: ${app.bg || '#334155'}; color: ${app.color || '#fff'}; font-size: 1.15rem; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 9px; margin-right: 10px; flex-shrink: 0;">
                                <i class="${getAppFallbackIcon(app.name, app.id)}"></i>
                            </div>`
                        }

                        <div class="app-meta-box">

                            <span class="app-label-title">${escapeHTML(app.name)}</span>

                            <div class="app-tags-row">
                                <button class="app-category-toggle ${isProd ? 'cat-prod' : 'cat-others'}" data-app-id="${app.id}" title="Click to reclassify">
                                    ${isProd ? '🎓 Productivity' : '🌐 Others'}
                                </button>
                                ${limitBadgeHtml}
                            </div>

                        </div>

                    </div>

                    <div class="app-duration-box">

                        <span class="app-time-bold">${timeStr}</span>

                        <span class="app-pct-sub">${appPct}%</span>

                    </div>

                </div>

                <div class="app-track-rail">

                    <div class="app-track-fill ${trackFillClass}" style="width: ${appPct}%;"></div>

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

        // Limit button click listeners (Enforce strict immutability if in grace or frozen)
        container.querySelectorAll('.app-limit-badge').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appId = btn.dataset.appId;
                const currentApps = getRealScreenApps();
                const app = currentApps.find(a => a.id === appId);
                if (!app) return;

                if (app.isUnchangeable) {
                    if (window.NativeBridge && window.NativeBridge.vibrate) {
                        window.NativeBridge.vibrate(120);
                    }
                    if (app.isFrozen) {
                        alert(`❄️ App Frozen: "${app.name}" has reached its ${app.limitMinutes}m daily limit and the 10-minute grace period has expired.\n\n🔒 Daily limits cannot be changed, increased, or removed once an app is frozen.`);
                    } else if (app.isGrace) {
                        alert(`⏳ Grace Period Active: "${app.name}" has reached its ${app.limitMinutes}m daily limit and is in its 10-minute grace window (${app.graceRemaining || 1}m remaining).\n\n🔒 Daily limits are locked and cannot be changed or increased during the grace period.`);
                    }
                    return;
                }

                // If editable, open limit configuration modal
                openAppLimitModal(app);
            });
        });

    }

    // --- APP LIMIT MODAL CONTROLLER ---
    let selectedAppForLimit = null;
    let selectedLimitMinutes = 30;

    function openAppLimitModal(app) {
        selectedAppForLimit = app;
        selectedLimitMinutes = app.limitMinutes || (app.isCompulsory ? 30 : 0);

        const modal = document.getElementById('appLimitModal');
        const titleEl = document.getElementById('limitModalAppName');
        const compulsoryNotice = document.getElementById('limitCompulsoryNotice');
        const btnNoLimit = document.getElementById('btnChipNoLimit');

        if (!modal) return;

        if (titleEl) titleEl.textContent = `Limit for ${app.name}`;

        if (app.isCompulsory) {
            if (compulsoryNotice) compulsoryNotice.style.display = 'flex';
            if (btnNoLimit) btnNoLimit.style.display = 'none'; // Compulsory: cannot disable limit
            if (selectedLimitMinutes <= 0) selectedLimitMinutes = 30;
            if (selectedLimitMinutes > 60) selectedLimitMinutes = 60; // Compulsory max 60 min limit cap

            // Hide preset chips > 60m for compulsory apps
            document.querySelectorAll('.limit-preset-chip').forEach(chip => {
                const mins = parseInt(chip.dataset.mins, 10);
                if (mins > 60) {
                    chip.style.display = 'none';
                } else if (chip !== btnNoLimit) {
                    chip.style.display = '';
                }
            });
        } else {
            if (compulsoryNotice) compulsoryNotice.style.display = 'none';
            if (btnNoLimit) btnNoLimit.style.display = '';
            document.querySelectorAll('.limit-preset-chip').forEach(chip => {
                chip.style.display = '';
            });
        }

        // Highlight active preset chip
        document.querySelectorAll('.limit-preset-chip').forEach(chip => {
            const mins = parseInt(chip.dataset.mins, 10);
            if (mins === selectedLimitMinutes) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });

        modal.style.display = 'flex';
    }

    function closeAppLimitModal() {
        const modal = document.getElementById('appLimitModal');
        if (modal) modal.style.display = 'none';
        selectedAppForLimit = null;
    }

    // Modal preset chips click handler
    document.querySelectorAll('.limit-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.limit-preset-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedLimitMinutes = parseInt(chip.dataset.mins, 10);
        });
    });

    const btnCloseModal = document.getElementById('btnCloseLimitModal');
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeAppLimitModal);
    const btnCancelModal = document.getElementById('btnCancelLimitModal');
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeAppLimitModal);

    const btnSaveLimit = document.getElementById('btnSaveAppLimit');
    if (btnSaveLimit) {
        btnSaveLimit.addEventListener('click', () => {
            if (!selectedAppForLimit) return;
            const appId = selectedAppForLimit.id;
            const appName = selectedAppForLimit.name;

            // Compulsory protection: default 30, max 60, min > 0
            if (selectedAppForLimit.isCompulsory) {
                if (selectedLimitMinutes <= 0) {
                    selectedLimitMinutes = 30;
                } else if (selectedLimitMinutes > 60) {
                    selectedLimitMinutes = 60;
                }
            }

            // Save locally
            let localLimits = {};
            try {
                localLimits = JSON.parse(localStorage.getItem('productometer_app_limits') || '{}');
            } catch (e) {}

            if (selectedLimitMinutes > 0) {
                localLimits[appId] = selectedLimitMinutes;
            } else {
                delete localLimits[appId];
            }
            localStorage.setItem('productometer_app_limits', JSON.stringify(localLimits));

            // Sync to Native Android Bridge
            if (window.NativeBridge && window.NativeBridge.setAppDailyLimit) {
                const ok = window.NativeBridge.setAppDailyLimit(appId, selectedLimitMinutes);
                if (ok === false) {
                    alert('⚠️ Limit is locked! This app is currently in grace period or frozen and cannot be edited.');
                    closeAppLimitModal();
                    refreshDigitalWellbeingDashboard();
                    return;
                }
            }

            if (window.NativeBridge && window.NativeBridge.showToast) {
                if (selectedLimitMinutes > 0) {
                    window.NativeBridge.showToast(`Daily limit for "${appName}" set to ${selectedLimitMinutes}m`);
                } else {
                    window.NativeBridge.showToast(`Daily limit removed for "${appName}"`);
                }
            }

            closeAppLimitModal();
            refreshDigitalWellbeingDashboard();
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

    // Android Usage Access Handlers (Both Banner & Proactive Card)
    function handleOpenUsageAccess() {
        if (window.NativeBridge && window.NativeBridge.openUsageAccessSettings) {
            window.NativeBridge.openUsageAccessSettings();
        } else {
            alert('Please enable Android Usage Access in Settings -> Apps -> Special Access -> Usage Access.');
        }
    }

    function handleOpenAppDetails() {
        if (window.NativeBridge && window.NativeBridge.openAppDetailsSettings) {
            window.NativeBridge.openAppDetailsSettings();
        } else {
            alert('Open phone Settings -> Apps -> Productometer -> Tap 3 dots (⋮) in top-right -> Allow restricted settings');
        }
    }

    const btnGrant = document.getElementById('btnGrantUsageAccess');
    const btnUnlockUsage = document.getElementById('btnUnlockUsageAccess');
    const btnProactiveGrant = document.getElementById('btnProactiveGrantUsage');
    const btnProactiveUnlock = document.getElementById('btnProactiveUnlockRestricted');

    if (btnGrant) btnGrant.addEventListener('click', handleOpenUsageAccess);
    if (btnProactiveGrant) btnProactiveGrant.addEventListener('click', handleOpenUsageAccess);
    if (btnUnlockUsage) btnUnlockUsage.addEventListener('click', handleOpenAppDetails);
    if (btnProactiveUnlock) btnProactiveUnlock.addEventListener('click', handleOpenAppDetails);

    // Expose globally for Android WebView onResume calls
    window.refreshDigitalWellbeingDashboard = refreshDigitalWellbeingDashboard;

    // Auto-refresh when user returns to app from system settings
    window.addEventListener('focus', () => {
        refreshDigitalWellbeingDashboard();
        updateFocusShieldUI();
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshDigitalWellbeingDashboard();
            updateFocusShieldUI();
        }
    });

    window.addEventListener('storage', (e) => {
        if (e && e.key && (e.key.includes('screen') || e.key.includes('timeline') || e.key.includes('study'))) {
            refreshDigitalWellbeingDashboard();
        }
    });

    // --- 🛡️ FOCUS SHIELD & ACCESSIBILITY GUARDIAN HANDLERS ---
    function updateFocusShieldUI() {
        const badge = document.getElementById('shieldServiceStatusBadge');
        const btnToggle = document.getElementById('btnToggleAccessibilityService');
        const toggleShorts = document.getElementById('toggleBlockYouTubeShorts');
        const toggleReels = document.getElementById('toggleBlockInstaReels');

        let isServiceRunning = false;
        if (window.NativeBridge && window.NativeBridge.isAccessibilityServiceEnabled) {
            isServiceRunning = window.NativeBridge.isAccessibilityServiceEnabled();
        }

        if (badge) {
            if (isServiceRunning) {
                badge.style.background = 'rgba(0, 230, 118, 0.15)';
                badge.style.color = '#00e676';
                badge.style.borderColor = 'rgba(0, 230, 118, 0.35)';
                badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Shield Active';
            } else {
                badge.style.background = 'rgba(255, 61, 113, 0.15)';
                badge.style.color = '#ff3d71';
                badge.style.borderColor = 'rgba(255, 61, 113, 0.35)';
                badge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Service Disabled';
            }
        }

        if (btnToggle) {
            if (isServiceRunning) {
                btnToggle.style.background = 'rgba(0, 230, 118, 0.15)';
                btnToggle.style.color = '#00e676';
                btnToggle.style.border = '1px solid rgba(0, 230, 118, 0.35)';
                btnToggle.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Focus Shield Active (Tap to Configure)';
            } else {
                btnToggle.style.background = 'linear-gradient(135deg, #00e5ff, #00e676)';
                btnToggle.style.color = '#030305';
                btnToggle.style.border = 'none';
                btnToggle.innerHTML = '<i class="fa-solid fa-power-off"></i> Enable Focus Shield in Accessibility';
            }
        }

        if (toggleShorts && window.NativeBridge && window.NativeBridge.isShortsBlockerEnabled) {
            toggleShorts.checked = window.NativeBridge.isShortsBlockerEnabled();
        }
        if (toggleReels && window.NativeBridge && window.NativeBridge.isReelsBlockerEnabled) {
            toggleReels.checked = window.NativeBridge.isReelsBlockerEnabled();
        }
    }

    const btnToggleShield = document.getElementById('btnToggleAccessibilityService');
    if (btnToggleShield) {
        btnToggleShield.addEventListener('click', () => {
            if (window.NativeBridge && window.NativeBridge.openAccessibilitySettings) {
                window.NativeBridge.openAccessibilitySettings();
            } else {
                alert('On Android, Accessibility Settings opens to let you enable Productometer Focus Shield.');
            }
        });
    }

    const toggleShortsEl = document.getElementById('toggleBlockYouTubeShorts');
    if (toggleShortsEl) {
        toggleShortsEl.addEventListener('change', () => {
            if (window.NativeBridge && window.NativeBridge.setShortsBlockerEnabled) {
                window.NativeBridge.setShortsBlockerEnabled(toggleShortsEl.checked);
            }
        });
    }

    const toggleReelsEl = document.getElementById('toggleBlockInstaReels');
    if (toggleReelsEl) {
        toggleReelsEl.addEventListener('change', () => {
            if (window.NativeBridge && window.NativeBridge.setReelsBlockerEnabled) {
                window.NativeBridge.setReelsBlockerEnabled(toggleReelsEl.checked);
            }
        });
    }

    // Modal Guide Handlers
    const guideModal = document.getElementById('restrictedGuideModal');
    const btnShowGuide = document.getElementById('btnShowRestrictedGuide');
    const btnCloseGuide = document.getElementById('btnCloseRestrictedGuide');
    const btnDismissGuide = document.getElementById('btnModalDismissGuide');
    const btnModalAppInfo = document.getElementById('btnModalOpenAppInfo');

    if (btnShowGuide && guideModal) {
        btnShowGuide.addEventListener('click', () => {
            guideModal.style.display = 'flex';
        });
    }
    if (btnCloseGuide && guideModal) {
        btnCloseGuide.addEventListener('click', () => {
            guideModal.style.display = 'none';
        });
    }
    if (btnDismissGuide && guideModal) {
        btnDismissGuide.addEventListener('click', () => {
            guideModal.style.display = 'none';
        });
    }
    if (btnModalAppInfo) {
        btnModalAppInfo.addEventListener('click', () => {
            handleOpenAppDetails();
        });
    }

    updateFocusShieldUI();

    // (Manual app modal removed: All apps & sites are automatically captured)

    function escapeHTML(str) {

        if (!str) return '';

        return String(str)

            .replace(/&/g, '&amp;')

            .replace(/</g, '&lt;')

            .replace(/>/g, '&gt;')

            .replace(/"/g, '&quot;')

            .replace(/'/g, '&#39;');

    }




    // ==========================================================================
    // 🌙 BEDTIME MODE & DIGITAL WIND-DOWN CONTROLLER
    // ==========================================================================
    const KEY_BEDTIME_ENABLED = 'productometer_bedtime_enabled';
    const KEY_BEDTIME_START = 'productometer_bedtime_start';
    const KEY_BEDTIME_END = 'productometer_bedtime_end';

    let isBedtimeEnabled = localStorage.getItem(KEY_BEDTIME_ENABLED) !== 'false';
    let bedtimeStartTime = localStorage.getItem(KEY_BEDTIME_START) || '22:30';
    let bedtimeEndTime = localStorage.getItem(KEY_BEDTIME_END) || '06:30';

    // Synchronize with Android SharedPreferences if available
    if (window.NativeBridge && window.NativeBridge.getBedtimeSchedule) {
        const sched = window.NativeBridge.getBedtimeSchedule();
        if (sched) {
            if (typeof sched.enabled === 'boolean') isBedtimeEnabled = sched.enabled;
            if (sched.start) bedtimeStartTime = sched.start;
            if (sched.end) bedtimeEndTime = sched.end;
        }
    }

    function updateBedtimeUI() {
        const toggleEl = document.getElementById('toggleBedtimeEnabled');
        const startInput = document.getElementById('inputBedtimeStart');
        const endInput = document.getElementById('inputBedtimeEnd');
        const statusText = document.getElementById('bedtimeRemainingText');
        const metricEl = document.getElementById('metricBedtimeStatus');

        if (toggleEl) toggleEl.checked = isBedtimeEnabled;
        if (startInput) startInput.value = bedtimeStartTime;
        if (endInput) endInput.value = bedtimeEndTime;

        const now = new Date();
        const curMins = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = bedtimeStartTime.split(':').map(Number);
        const [eh, em] = bedtimeEndTime.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        let isBedtimeActiveNow = false;
        if (startMins > endMins) {
            isBedtimeActiveNow = (curMins >= startMins || curMins < endMins);
        } else {
            isBedtimeActiveNow = (curMins >= startMins && curMins < endMins);
        }

        if (!isBedtimeEnabled) {
            if (metricEl) {
                metricEl.textContent = 'Disabled';
                metricEl.style.color = '#64748b';
            }
            if (statusText) {
                statusText.textContent = 'Bedtime schedule is currently turned off.';
                statusText.style.color = '#94a3b8';
            }
            return;
        }

        if (isBedtimeActiveNow) {
            if (metricEl) {
                metricEl.textContent = `🌙 Active (Until ${bedtimeEndTime})`;
                metricEl.style.color = '#ffd600';
            }
            if (statusText) {
                statusText.textContent = `🌙 Bedtime Active until ${bedtimeEndTime}. Rest your eyes and disconnect.`;
                statusText.style.color = '#ffd600';
            }
        } else {
            let diffMins = startMins - curMins;
            if (diffMins < 0) diffMins += 24 * 60;
            const diffH = Math.floor(diffMins / 60);
            const diffM = diffMins % 60;
            const timeUntilStr = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;

            if (metricEl) {
                metricEl.textContent = `Off (${bedtimeStartTime})`;
                metricEl.style.color = '#00e5ff';
            }
            if (statusText) {
                statusText.textContent = `⏰ Bedtime begins at ${bedtimeStartTime} (in ${timeUntilStr}).`;
                statusText.style.color = '#cbd5e1';
            }
        }
    }

    function saveBedtimeSettings() {
        localStorage.setItem(KEY_BEDTIME_ENABLED, isBedtimeEnabled.toString());
        localStorage.setItem(KEY_BEDTIME_START, bedtimeStartTime);
        localStorage.setItem(KEY_BEDTIME_END, bedtimeEndTime);

        if (window.NativeBridge && window.NativeBridge.setBedtimeSchedule) {
            window.NativeBridge.setBedtimeSchedule(isBedtimeEnabled, bedtimeStartTime, bedtimeEndTime);
        }

        updateBedtimeUI();
    }

    const toggleBedtime = document.getElementById('toggleBedtimeEnabled');
    if (toggleBedtime) {
        toggleBedtime.addEventListener('change', (e) => {
            isBedtimeEnabled = e.target.checked;
            saveBedtimeSettings();
            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast(isBedtimeEnabled ? `🌙 Bedtime scheduled (${bedtimeStartTime} - ${bedtimeEndTime})` : 'Bedtime mode disabled');
            }
        });
    }

    const inputBedStart = document.getElementById('inputBedtimeStart');
    if (inputBedStart) {
        inputBedStart.addEventListener('change', (e) => {
            if (e.target.value) {
                bedtimeStartTime = e.target.value;
                saveBedtimeSettings();
            }
        });
    }

    const inputBedEnd = document.getElementById('inputBedtimeEnd');
    if (inputBedEnd) {
        inputBedEnd.addEventListener('change', (e) => {
            if (e.target.value) {
                bedtimeEndTime = e.target.value;
                saveBedtimeSettings();
            }
        });
    }

    // ==========================================================================
    // ⏱️ DEDICATED APP LIMITS & PARENTAL CONTROLS CONTROLLER
    // ==========================================================================
    let currentLimitsTab = 'active';

    function renderActiveLimitsSection(apps) {
        const container = document.getElementById('activeLimitsCardsContainer');
        if (!container) return;

        // Update compact summary banner subtext
        const summarySubtext = document.getElementById('limitsSummarySubtext');
        if (summarySubtext) {
            const activeCount = apps.filter(a => a.limitMinutes > 0).length;
            const frozenCount = apps.filter(a => a.isFrozen).length;
            if (frozenCount > 0) {
                summarySubtext.textContent = `${activeCount} limits active • ❄️ ${frozenCount} frozen app`;
            } else if (activeCount > 0) {
                summarySubtext.textContent = `${activeCount} app limit active • Tap to manage`;
            } else {
                summarySubtext.textContent = 'Tap to configure & manage app limits';
            }
        }

        let filtered = [];
        if (currentLimitsTab === 'active') {
            filtered = apps.filter(a => (a.limitMinutes > 0));
        } else if (currentLimitsTab === 'compulsory') {
            filtered = apps.filter(a => a.isCompulsory);
        } else {
            filtered = apps;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 20px 10px; font-size: 0.82rem; background: rgba(255,255,255,0.02); border-radius: 12px;">
                    <i class="fa-solid fa-stopwatch" style="font-size: 1.5rem; color: #475569; margin-bottom: 8px; display: block;"></i>
                    No app limits configured in this view.<br>
                    <button type="button" class="btn-add-app-limit" style="margin: 10px auto 0 auto; display: inline-flex;" onclick="document.getElementById('btnOpenAddLimitModal').click()">
                        <i class="fa-solid fa-plus"></i> Set Daily Limit
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(app => {
            const limit = app.limitMinutes || (app.isCompulsory ? 30 : 0);
            const usedMins = Math.round((app.seconds || 0) / 60);
            const pct = limit > 0 ? Math.min(100, Math.round((usedMins / limit) * 100)) : 0;

            let fillClass = 'safe';
            let statusBadge = '';

            if (app.isFrozen) {
                fillClass = 'frozen';
                statusBadge = '<span style="color: #00e5ff; font-weight: 800; font-size: 0.74rem;"><i class="fa-solid fa-snowflake"></i> Frozen (Until Midnight)</span>';
            } else if (app.isGrace) {
                fillClass = 'grace';
                statusBadge = `<span style="color: #ff9100; font-weight: 800; font-size: 0.74rem;"><i class="fa-solid fa-hourglass-half"></i> 10m Grace (${app.graceRemaining || 1}m left)</span>`;
            } else if (limit > 0) {
                const rem = Math.max(0, limit - usedMins);
                if (rem <= 5) fillClass = 'warning';
                statusBadge = `<span style="color: #94a3b8; font-size: 0.74rem;">${rem}m remaining of ${limit}m</span>`;
            } else {
                statusBadge = '<span style="color: #64748b; font-size: 0.74rem;">No Limit Set</span>';
            }

            return `
            <div class="active-limit-item-card" data-app-id="${app.id}">
                <div class="limit-card-top">
                    <div class="limit-card-left">
                        ${app.iconBase64 ?
                            `<img src="${app.iconBase64}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: contain;">` :
                            `<div style="width: 32px; height: 32px; border-radius: 8px; background: ${app.bg || '#334155'}; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; color: #fff;">
                                <i class="${getAppFallbackIcon(app.name, app.id)}"></i>
                            </div>`
                        }
                        <div>
                            <div class="limit-app-name">
                                ${escapeHTML(app.name)}
                                ${app.isCompulsory ? '<span style="background: rgba(255,214,0,0.15); border: 1px solid rgba(255,214,0,0.4); color: #ffd600; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">MANDATORY</span>' : ''}
                            </div>
                            <div style="font-size: 0.74rem; color: #cbd5e1; margin-top: 1px;">Used ${usedMins}m today</div>
                        </div>
                    </div>
                    <div class="limit-card-right">
                        ${statusBadge}
                        <button type="button" class="btn-adjust-limit" data-app-id="${app.id}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #00e5ff; font-weight: 800; font-size: 0.74rem; padding: 5px 10px; border-radius: 8px; cursor: pointer; white-space: nowrap;">
                            ${limit > 0 ? `${limit}m Limit` : '+ Set'}
                        </button>
                    </div>
                </div>
                ${limit > 0 ? `
                <div class="limit-progress-bar">
                    <div class="limit-progress-fill ${fillClass}" style="width: ${pct}%;"></div>
                </div>` : ''}
            </div>`;
        }).join('');

        // Adjust limit button click
        container.querySelectorAll('.btn-adjust-limit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appId = btn.dataset.appId;
                const app = apps.find(a => a.id === appId);
                if (app) {
                    if (app.isUnchangeable) {
                        if (window.NativeBridge && window.NativeBridge.vibrate) window.NativeBridge.vibrate(120);
                        alert(`🔒 Limit is locked! "${app.name}" is in its grace period or frozen and cannot be changed until midnight.`);
                        return;
                    }
                    openAppLimitModal(app);
                }
            });
        });
    }

    // Limit Tab switching
    document.querySelectorAll('.limit-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.limit-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLimitsTab = btn.dataset.tab;
            renderActiveLimitsSection(getRealScreenApps());
        });
    });


    // --- ⏱️ APP LIMITS OVERVIEW MODAL POPUP ---
    const bannerOpenLimits = document.getElementById('bannerOpenLimitsOverview');
    const btnTriggerLimitsModal = document.getElementById('btnTriggerLimitsModal');
    const limitsOverviewModal = document.getElementById('appLimitsOverviewModal');
    const btnCloseLimitsOverview = document.getElementById('btnCloseLimitsOverviewModal');

    function openLimitsOverviewModal() {
        if (!limitsOverviewModal) return;
        renderActiveLimitsSection(getRealScreenApps());
        if (typeof limitsOverviewModal.showModal === 'function') {
            limitsOverviewModal.showModal();
        } else {
            limitsOverviewModal.style.display = 'block';
        }
    }

    function closeLimitsOverviewModal() {
        if (!limitsOverviewModal) return;
        if (typeof limitsOverviewModal.close === 'function') {
            limitsOverviewModal.close();
        } else {
            limitsOverviewModal.style.display = 'none';
        }
    }

    if (bannerOpenLimits) {
        bannerOpenLimits.addEventListener('click', openLimitsOverviewModal);
    }
    if (btnTriggerLimitsModal) {
        btnTriggerLimitsModal.addEventListener('click', (e) => {
            e.stopPropagation();
            openLimitsOverviewModal();
        });
    }
    if (btnCloseLimitsOverview) {
        btnCloseLimitsOverview.addEventListener('click', closeLimitsOverviewModal);
    }
    if (limitsOverviewModal) {
        limitsOverviewModal.addEventListener('click', (e) => {
            if (e.target === limitsOverviewModal) closeLimitsOverviewModal();
        });
    }

    // App Picker Modal Setup
    const btnOpenPicker = document.getElementById('btnOpenAddLimitModal');
    const pickerModal = document.getElementById('appPickerModal');
    const btnClosePicker = document.getElementById('btnCloseAppPicker');
    const pickerSearch = document.getElementById('appPickerSearch');
    const pickerList = document.getElementById('appPickerList');

    function openAppPicker() {
        const apps = getRealScreenApps();
        renderPickerList(apps);
        if (pickerModal) {
            if (typeof pickerModal.showModal === 'function') pickerModal.showModal();
            else pickerModal.setAttribute('open', 'true');
        }
    }

    function renderPickerList(apps, query = '') {
        if (!pickerList) return;
        const q = query.toLowerCase().trim();
        const filtered = apps.filter(a => {
            if (!q) return true;
            return (a.name || '').toLowerCase().includes(q) || (a.id || '').toLowerCase().includes(q);
        });

        if (filtered.length === 0) {
            pickerList.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No applications found matching search.</div>';
            return;
        }

        pickerList.innerHTML = filtered.map(app => `
            <div class="app-picker-item" data-app-id="${app.id}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${app.iconBase64 ?
                        `<img src="${app.iconBase64}" style="width: 28px; height: 28px; border-radius: 6px; object-fit: contain;">` :
                        `<div style="width: 28px; height: 28px; border-radius: 6px; background: ${app.bg || '#334155'}; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; color: #fff;">
                            <i class="${getAppFallbackIcon(app.name, app.id)}"></i>
                        </div>`
                    }
                    <div>
                        <div style="font-size: 0.84rem; font-weight: 700; color: #fff;">${escapeHTML(app.name)}</div>
                        <div style="font-size: 0.7rem; color: #64748b;">${app.limitMinutes > 0 ? `Current: ${app.limitMinutes}m limit` : 'No limit set'}</div>
                    </div>
                </div>
                <button type="button" style="background: rgba(0,229,255,0.12); border: 1px solid rgba(0,229,255,0.3); color: #00e5ff; padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 800; cursor: pointer;">Select</button>
            </div>
        `).join('');

        pickerList.querySelectorAll('.app-picker-item').forEach(item => {
            item.addEventListener('click', () => {
                const appId = item.dataset.appId;
                const target = apps.find(a => a.id === appId);
                if (pickerModal) {
                    if (typeof pickerModal.close === 'function') pickerModal.close();
                    else pickerModal.removeAttribute('open');
                }
                if (target) {
                    openAppLimitModal(target);
                }
            });
        });
    }

    if (btnOpenPicker) btnOpenPicker.addEventListener('click', openAppPicker);
    if (btnClosePicker && pickerModal) {
        btnClosePicker.addEventListener('click', () => {
            if (typeof pickerModal.close === 'function') pickerModal.close();
            else pickerModal.removeAttribute('open');
        });
    }
    if (pickerSearch) {
        pickerSearch.addEventListener('input', (e) => {
            renderPickerList(getRealScreenApps(), e.target.value);
        });
    }

    // Initial render & background tick (Executed after all controllers and listeners are initialized)
    refreshDigitalWellbeingDashboard();
    setInterval(refreshDigitalWellbeingDashboard, 10000);

});

