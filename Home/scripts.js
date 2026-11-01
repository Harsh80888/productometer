// ==========================================================================
// 🪐 PRODUCTOMETER - CORE HOME TAB ENGINE
// Synchronized with Day Planner, Health Tracker & Screen Management
// Features: Chronological Daily Productivity Curve (Top), 7-Day Weekly Analytics (Bottom),
// Calories Consumed, Screentime & Upcoming Sessions
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM SELECTORS
    const homeProductivityScore = document.getElementById('homeProductivityScore');
    const homeScoreRatingPill = document.getElementById('homeScoreRatingPill');
    const homeScoreRatingIcon = document.getElementById('homeScoreRatingIcon');
    const homeScoreRatingText = document.getElementById('homeScoreRatingText');

    // Math Formula Chips Selectors
    const chipValAcad = document.getElementById('chipValAcad');
    const chipValHealth = document.getElementById('chipValHealth');
    const chipValOtherProd = document.getElementById('chipValOtherProd');
    const chipValScreen = document.getElementById('chipValScreen');
    const chipValTasks = document.getElementById('chipValTasks');

    // Canvas Elements
    const dailyGraphCanvas = document.getElementById('dailyGraphCanvas');
    const weeklyGraphCanvas = document.getElementById('weeklyGraphCanvas');

    // Weekly Summary Chips
    const weeklyTotalScore = document.getElementById('weeklyTotalScore');
    const weeklyAvgScore = document.getElementById('weeklyAvgScore');
    const weeklyBestDay = document.getElementById('weeklyBestDay');

    // Live Metrics Deck Selectors
    const homeCaloriesVal = document.getElementById('homeCaloriesVal');
    const homeCaloriesSub = document.getElementById('homeCaloriesSub');
    const homeCaloriesBar = document.getElementById('homeCaloriesBar');

    const homeScreenVal = document.getElementById('homeScreenVal');
    const homeScreenSub = document.getElementById('homeScreenSub');
    const homeScreenBar = document.getElementById('homeScreenBar');

    // Upcoming Sessions Selectors
    const homeTasksBucket = document.getElementById('homeTasksBucket');
    const upcomingCountBadge = document.getElementById('upcomingCountBadge');

    const dCtx = dailyGraphCanvas ? dailyGraphCanvas.getContext('2d') : null;
    const wCtx = weeklyGraphCanvas ? weeklyGraphCanvas.getContext('2d') : null;

    // Vibrant Activity Colors
    const activityColors = {
        academics: '#00e5ff',
        study: '#00e5ff',
        health: '#00e676',
        skills: '#d500f9',
        school: '#d500f9',
        other_prod: '#d500f9',
        screen: '#ff1744',
        tasks: '#ff00ea',
        other: '#78909c'
    };

    // 7-Day Spectrum Palette
    const dayPalette = {
        'MON': '#00e5ff',
        'TUE': '#00e676',
        'WED': '#ffd600',
        'THU': '#d500f9',
        'FRI': '#ff00ea',
        'SAT': '#3d5afe',
        'SUN': '#ff6d00'
    };

    // --- 2. DATA LOADERS FROM MODULES ---

    // A. HEALTH TRACKER: Calories Consumed & Active Workout Minutes
    function loadHealthMetrics() {
        let caloriesConsumed = 0;
        try {
            const raw = localStorage.getItem('productometer_daily_diet_log');
            if (raw) {
                const log = JSON.parse(raw);
                if (Array.isArray(log)) {
                    log.forEach(item => {
                        caloriesConsumed += (parseInt(item.calories, 10) || 0);
                    });
                }
            }
        } catch (e) {
            console.error('Error loading diet log:', e);
        }

        // Target Calories from user biometrics
        let weight = 70, height = 175, age = 25, gender = 'male';
        try {
            const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
            if (p) {
                if (p.weight) weight = parseFloat(p.weight);
                if (p.height) height = parseFloat(p.height);
                if (p.age) age = parseInt(p.age, 10);
                if (p.gender) gender = p.gender.toLowerCase();
            }
        } catch (e) {}

        const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + (gender === 'female' ? -161 : 5));
        const tdee = Math.round(bmr * 1.35);
        const goal = localStorage.getItem('productometer_diet_goal') || 'maintain';
        let targetKcal = tdee;
        if (goal === 'loss') targetKcal = Math.max(1200, tdee - 500);
        else if (goal === 'gain') targetKcal = tdee + 350;

        const remaining = targetKcal - caloriesConsumed;
        const progressPct = Math.min(100, Math.round((caloriesConsumed / targetKcal) * 100));

        // Workout minutes logged in Health Tracker
        const sessionMins = parseFloat(localStorage.getItem('productometer_health_session_mins')) || 0;
        const activeMins = parseFloat(localStorage.getItem('productometer_health_active_mins')) || 0;
        const totalWorkoutMins = Math.max(sessionMins, activeMins);
        const workoutHours = totalWorkoutMins / 60;

        // Render to UI
        if (homeCaloriesVal) {
            homeCaloriesVal.innerHTML = `${caloriesConsumed.toLocaleString()} <small>kcal</small>`;
        }
        if (homeCaloriesSub) {
            if (remaining >= 0) {
                homeCaloriesSub.textContent = `/ ${targetKcal.toLocaleString()} kcal • ${remaining.toLocaleString()} left`;
            } else {
                homeCaloriesSub.textContent = `/ ${targetKcal.toLocaleString()} kcal • +${Math.abs(remaining).toLocaleString()} over`;
            }
        }
        if (homeCaloriesBar) {
            homeCaloriesBar.style.width = `${progressPct}%`;
        }

        return { caloriesConsumed, targetKcal, progressPct, workoutHours };
    }

    // B. SCREEN MANAGEMENT: Total Screentime & Non-Productive Screentime
    function loadScreenTimeMetrics() {
        let totalSecs = 0;
        let prodSecs = 0;
        let nonProdSecs = 0;

        // 1. Direct Ground Truth Query from NativeBridge if available
        if (window.NativeBridge && window.NativeBridge.isAvailable && window.NativeBridge.isAvailable()) {
            try {
                if (window.NativeBridge.hasUsageStatsPermission && window.NativeBridge.hasUsageStatsPermission()) {
                    const realStats = window.NativeBridge.getRealAppUsageStats();
                    if (realStats && Array.isArray(realStats) && realStats.length > 0) {
                        let savedOverrides = {};
                        try {
                            const rawOverrides = localStorage.getItem('productometer_screentime_apps_v2');
                            if (rawOverrides) JSON.parse(rawOverrides).forEach(a => { if (a && a.id) savedOverrides[a.id] = a.category; });
                        } catch (e) {}

                        realStats.forEach(app => {
                            const s = app.totalSeconds || (app.minutes * 60) || 0;
                            totalSecs += s;
                            const cat = savedOverrides[app.packageName] || app.category || 'others';
                            if (cat === 'productivity') prodSecs += s;
                            else nonProdSecs += s;
                        });

                        try {
                            localStorage.setItem('productometer_screen_data', JSON.stringify({
                                totalScreenSecondsToday: totalSecs,
                                productiveSeconds: prodSecs,
                                othersSeconds: nonProdSecs,
                                date: new Date().toDateString()
                            }));
                        } catch (e) {}
                    }
                }
            } catch (e) {
                console.warn('[Home] Live screen stats notice:', e);
            }
        }

        if (!totalSecs) {
            try {
                const screenData = JSON.parse(localStorage.getItem('productometer_screen_data'));
                if (screenData && typeof screenData.totalScreenSecondsToday === 'number') {
                    totalSecs = screenData.totalScreenSecondsToday;
                    prodSecs = screenData.productiveSeconds || 0;
                    nonProdSecs = typeof screenData.othersSeconds === 'number' ? 
                        screenData.othersSeconds : Math.max(0, totalSecs - prodSecs);
                }
            } catch (e) {}
        }

        // Fallback to app list
        if (!totalSecs) {
            try {
                const apps = JSON.parse(localStorage.getItem('productometer_screentime_apps_v2'));
                if (apps && Array.isArray(apps)) {
                    apps.forEach(a => {
                        const s = parseInt(a.seconds, 10) || 0;
                        totalSecs += s;
                        if (a.category === 'productivity') prodSecs += s;
                        else nonProdSecs += s;
                    });
                }
            } catch (e) {}
        }

        const activeWeb = parseInt(localStorage.getItem('productometer_active_web_session_seconds'), 10) || 0;
        totalSecs += activeWeb;
        prodSecs += activeWeb;

        const totalMins = Math.round(totalSecs / 60);
        const prodMins = Math.round(prodSecs / 60);
        const totalH = Math.floor(totalMins / 60);
        const remM = totalMins % 60;
        const prodH = Math.floor(prodMins / 60);
        const remProdM = prodMins % 60;

        const prodRatioPct = totalSecs > 0 ? Math.min(100, Math.round((prodSecs / totalSecs) * 100)) : 100;
        const nonProdHours = nonProdSecs / 3600;

        // Render to UI
        if (homeScreenVal) {
            if (totalH > 0) {
                homeScreenVal.textContent = `${totalH}h ${remM}m`;
            } else {
                homeScreenVal.textContent = `${totalMins}m`;
            }
        }
        if (homeScreenSub) {
            if (prodH > 0) {
                homeScreenSub.textContent = `${prodH}h ${remProdM}m productive (${prodRatioPct}%)`;
            } else {
                homeScreenSub.textContent = `${prodMins}m productive (${prodRatioPct}%)`;
            }
        }
        if (homeScreenBar) {
            homeScreenBar.style.width = `${prodRatioPct}%`;
        }

        return { totalSecs, prodSecs, nonProdSecs, nonProdHours, prodRatioPct };
    }

    // C. ACADEMICS MONITORING: Study Seconds
    function loadAcademicsMetrics() {
        const studySeconds = parseInt(localStorage.getItem('productometer_daily_study_seconds'), 10) || 0;
        const studyHours = studySeconds / 3600;
        return { studySeconds, studyHours };
    }

    // D. DAY PLANNER: Upcoming Sessions & Planned Hours by Category
    function loadUpcomingSessions() {
        let plannerList = [];
        try {
            const raw = localStorage.getItem('productometer_chrono_planner_list');
            if (raw) plannerList = JSON.parse(raw);
        } catch (e) {
            console.error('Error loading planner list:', e);
        }

        let plannerAcadMins = 0;
        let plannerHealthMins = 0;
        let plannerOtherProdMins = 0;
        let plannerScreenMins = 0;

        let completedAcadMins = 0;
        let completedHealthMins = 0;
        let completedOtherProdMins = 0;
        let completedScreenMins = 0;

        plannerList.forEach(task => {
            const dur = parseFloat(task.durationMin || task.durationMinutes || task.duration) || 0;
            const cat = (task.category || '').toLowerCase();
            const isDone = !!task.completed;

            if (cat === 'academics' || cat === 'study' || cat === 'academic' || cat === 'school') {
                plannerAcadMins += dur;
                if (isDone) completedAcadMins += dur;
            } else if (cat === 'health' || cat === 'fitness' || cat === 'workout') {
                plannerHealthMins += dur;
                if (isDone) completedHealthMins += dur;
            } else if (cat === 'skills' || cat === 'school' || cat === 'work' || cat === 'other' || cat === 'general') {
                plannerOtherProdMins += dur;
                if (isDone) completedOtherProdMins += dur;
            } else if (cat === 'screen') {
                plannerScreenMins += dur;
                if (isDone) completedScreenMins += dur;
            }
        });

        if (!homeTasksBucket) {
            return {
                upcomingCount: 0, totalCount: 0, completedCount: 0,
                plannerAcadHours: plannerAcadMins / 60,
                plannerHealthHours: plannerHealthMins / 60,
                plannerOtherProdHours: plannerOtherProdMins / 60,
                plannerScreenHours: plannerScreenMins / 60,
                plannerList: []
            };
        }

        homeTasksBucket.innerHTML = '';
        const upcomingTasks = plannerList.filter(t => !t.completed);
        const completedTasks = plannerList.filter(t => t.completed);

        if (upcomingCountBadge) {
            if (upcomingTasks.length > 0) {
                upcomingCountBadge.textContent = `${upcomingTasks.length} Upcoming`;
                upcomingCountBadge.className = 'upcoming-count-badge';
            } else if (plannerList.length > 0) {
                upcomingCountBadge.textContent = 'All Done 🎉';
                upcomingCountBadge.className = 'upcoming-count-badge optimal';
            } else {
                upcomingCountBadge.textContent = '0 Sessions';
                upcomingCountBadge.className = 'upcoming-count-badge';
            }
        }

        if (plannerList.length === 0) {
            const isHomeDir = window.location.pathname.includes('/Home/');
            const plannerHref = isHomeDir ? '../Features/Day Planner/planner-index.html' : './Features/Day Planner/planner-index.html';
            homeTasksBucket.innerHTML = `
                <div class="home-empty-placeholder">
                    <i class="fa-solid fa-calendar-plus"></i>
                    No sessions scheduled yet today.<br>
                    <a href="${plannerHref}" class="corner-edit-btn" style="margin-top: 10px; display: inline-flex;">
                        <i class="fa-solid fa-plus"></i> Plan Today's Sessions
                    </a>
                </div>
            `;
            return {
                upcomingCount: 0, totalCount: 0, completedCount: 0,
                plannerAcadHours: 0, plannerHealthHours: 0, plannerOtherProdHours: 0, plannerScreenHours: 0,
                plannerList: []
            };
        }

        if (upcomingTasks.length === 0 && completedTasks.length > 0) {
            homeTasksBucket.innerHTML = `
                <div class="home-empty-placeholder" style="color: #00e676; border-color: rgba(0, 230, 118, 0.3);">
                    <i class="fa-solid fa-circle-check" style="color: #00e676;"></i>
                    <strong>All ${completedTasks.length} sessions completed today!</strong><br>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">You've crushed today's schedule. Productivity score is at peak!</span>
                </div>
            `;
        }

        const displayList = [...upcomingTasks, ...completedTasks];

        displayList.forEach(task => {
            const card = document.createElement('div');
            card.className = `home-chrono-row-card ${task.completed ? 'home-task-completed-state' : ''}`;
            const catColor = task.color || '#00e5ff';
            card.style.borderColor = task.completed ? 'rgba(255,255,255,0.06)' : `${catColor}44`;

            let iconClass = 'fa-solid fa-circle-dot';
            if (task.category === 'health') iconClass = 'fa-solid fa-dumbbell';
            else if (task.category === 'academics' || task.category === 'study') iconClass = 'fa-solid fa-graduation-cap';
            else if (task.category === 'skills' || task.category === 'work') iconClass = 'fa-solid fa-briefcase';

            card.innerHTML = `
                <label class="home-task-checkbox-wrapper" title="${task.completed ? 'Mark pending' : 'Mark completed'}">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} class="home-native-task-checkbox">
                </label>
                <div class="home-task-card-info-stack">
                    <span class="home-task-main-title">${task.title}</span>
                    <div class="home-task-badges-row">
                        <span class="home-task-time-badge" style="color: ${catColor};">
                            <i class="fa-solid fa-clock"></i> ${task.timeDisplayStr || 'Today'}
                        </span>
                        <span class="home-task-cat-badge" style="background: ${catColor}18; color: ${catColor}; border: 1px solid ${catColor}33;">
                            <i class="${iconClass}"></i> ${task.category || 'General'}
                        </span>
                    </div>
                </div>
            `;

            const checkbox = card.querySelector('.home-native-task-checkbox');
            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;
                try {
                    localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(plannerList));
                } catch (e) {}

                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(task.completed ? 880 : 440, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.3);
                } catch (e) {}

                refreshHomeDashboard();
            });

            homeTasksBucket.appendChild(card);
        });

        return {
            upcomingCount: upcomingTasks.length,
            totalCount: plannerList.length,
            completedCount: completedTasks.length,
            plannerAcadHours: plannerAcadMins / 60,
            plannerHealthHours: plannerHealthMins / 60,
            plannerOtherProdHours: plannerOtherProdMins / 60,
            plannerScreenHours: plannerScreenMins / 60,
            completedAcadHours: completedAcadMins / 60,
            completedHealthHours: completedHealthMins / 60,
            completedOtherProdHours: completedOtherProdMins / 60,
            completedScreenHours: completedScreenMins / 60,
            plannerList
        };
    }

    // --- 3. EXACT SCORE MATHEMATICAL FORMULATION ---
    // Health: 150 - 30n, n = no of hours (if n > 0, else 0)
    // Academics: 100n
    // Other productive tasks: 50n
    // Non productive screen: -(50 + 50n) (if n > 0, else 0)
    // Others: 0
    // Completed Task/Session Bonus: +50 pts each
    function calculateProductivityScore(healthData, screenData, acadData, plannerData) {
        // Earned hours from live-tracked sessions or completed planner tasks
        const nHealth = Math.max(healthData.workoutHours || 0, plannerData.completedHealthHours || 0);
        const nAcad = Math.max(acadData.studyHours || 0, plannerData.completedAcadHours || 0);
        const nOtherProd = plannerData.completedOtherProdHours || 0;
        const nScreen = screenData.nonProdHours || 0;

        const healthScore = nHealth > 0 ? Math.max(0, (150.0 - (30.0 * nHealth))) : 0.0;
        const acadScore = 100.0 * nAcad;
        const otherProdScore = 50.0 * nOtherProd;
        const screenScore = nScreen > 0 ? -(50.0 + (50.0 * nScreen)) : 0.0;

        const tasksBonus = (plannerData.completedCount || 0) * 50.0;
        const netTotalScore = Math.round(healthScore + acadScore + otherProdScore + screenScore + tasksBonus);

        return {
            nHealth, healthScore,
            nAcad, acadScore,
            nOtherProd, otherProdScore,
            nScreen, screenScore,
            tasksBonus,
            netTotalScore
        };
    }

    // --- 4. 24-HOUR CHRONOLOGICAL DAILY TREND GRAPH RENDERER (AT TOP) ---
    function renderDailyTrendGraph(scoreObj, plannerList) {
        if (!dailyGraphCanvas || !dCtx) return;

        const cw = dailyGraphCanvas.width;
        const ch = dailyGraphCanvas.height;
        dCtx.clearRect(0, 0, cw, ch);

        const isLight = document.body.classList.contains('theme-light');
        const padL = 48, padR = 20, padT = 20, padB = 28;
        const graphW = cw - padL - padR;
        const graphH = ch - padT - padB;

        // Build 48-slot array of activities across 24h
        const slots = Array(48).fill(null);

        // Try productometer_timeline first
        try {
            const rawTL = localStorage.getItem('productometer_timeline');
            if (rawTL) {
                const arr = JSON.parse(rawTL);
                if (Array.isArray(arr) && arr.length === 48) {
                    for (let i = 0; i < 48; i++) {
                        if (arr[i]) slots[i] = arr[i];
                    }
                }
            }
        } catch (e) {}

        // Map planner tasks into slots
        if (plannerList && plannerList.length > 0) {
            plannerList.forEach(task => {
                const startSlot = Math.floor((task.startMin || 0) / 30);
                const count = Math.max(1, Math.round((task.durationMin || 30) / 30));
                for (let s = 0; s < count; s++) {
                    if (startSlot + s < 48) {
                        slots[startSlot + s] = task.category || 'other_prod';
                    }
                }
            });
        }

        // Compute cumulative points trajectory across 48 slots
        const points = [];
        const runningCounts = { academics: 0, health: 0, skills: 0, screen: 0 };
        const activeSlotIndices = [];
        for (let s = 0; s < 48; s++) { if (slots[s]) activeSlotIndices.push(s); }
        const lastActiveSlot = activeSlotIndices.length > 0 ? activeSlotIndices[activeSlotIndices.length - 1] : 47;

        for (let s = 0; s < 48; s++) {
            const act = slots[s];
            if (act) {
                if (act === 'academics' || act === 'study') runningCounts.academics++;
                else if (act === 'health') runningCounts.health++;
                else if (act === 'skills' || act === 'school' || act === 'work') runningCounts.skills++;
                else if (act === 'screen') runningCounts.screen++;
            }

            const curH = runningCounts.health * 0.5;
            const curA = runningCounts.academics * 0.5;
            const curOP = runningCounts.skills * 0.5;
            const curSC = runningCounts.screen * 0.5;

            const hs = curH > 0 ? (150.0 - (30.0 * curH)) : 0.0;
            const as_ = 100.0 * curA;
            const ops = 50.0 * curOP;
            const scs = curSC > 0 ? -(50.0 + (50.0 * curSC)) : 0.0;

            const bProg = activeSlotIndices.length > 0 ? Math.min(1.0, (s + 1) / (lastActiveSlot + 1)) : 1.0;
            const curScore = Math.round(hs + as_ + ops + scs + (scoreObj.tasksBonus * bProg));

            points.push({
                slot: s,
                hour: s * 0.5,
                score: curScore,
                activity: act
            });
        }

        // Min/Max computation
        let minVal = 0, maxVal = 500;
        points.forEach(p => {
            if (p.score < minVal) minVal = p.score;
            if (p.score > maxVal) maxVal = p.score;
        });
        minVal = Math.min(-200, Math.floor(minVal / 200) * 200);
        maxVal = Math.max(800, Math.ceil(maxVal / 200) * 200);

        function getCanvasY(val) {
            const ratio = (val - minVal) / (maxVal - minVal);
            return padT + graphH - (graphH * Math.max(0, Math.min(1, ratio)));
        }

        const zeroY = getCanvasY(0);

        // 1. Grid Guides
        dCtx.lineWidth = 1;
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const stepVal = minVal + ((maxVal - minVal) * (i / gridSteps));
            const y = getCanvasY(stepVal);

            dCtx.beginPath();
            dCtx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
            dCtx.moveTo(padL, y);
            dCtx.lineTo(cw - padR, y);
            dCtx.stroke();

            dCtx.fillStyle = stepVal === 0 ? (isLight ? '#0284c7' : '#ffffff') : (isLight ? '#94a3b8' : '#646475');
            dCtx.font = stepVal === 0 ? '700 10px Inter' : '600 9px Inter';
            dCtx.textAlign = 'right';
            dCtx.textBaseline = 'middle';
            dCtx.fillText((stepVal > 0 ? `+${Math.round(stepVal)}` : Math.round(stepVal)), padL - 8, y);
        }

        // Glowing Zero Baseline
        dCtx.beginPath();
        dCtx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        dCtx.lineWidth = 1.5;
        dCtx.moveTo(padL, zeroY);
        dCtx.lineTo(cw - padR, zeroY);
        dCtx.stroke();

        // X-Axis Time Labels
        dCtx.fillStyle = isLight ? '#94a3b8' : '#646475';
        dCtx.font = '700 9px Inter';
        dCtx.textAlign = 'center';
        dCtx.textBaseline = 'top';
        const timeLabels = [
            { text: '12 AM', idx: 0 },
            { text: '6 AM',  idx: 12 },
            { text: '12 PM', idx: 24 },
            { text: '6 PM',  idx: 36 },
            { text: '12 AM', idx: 47 }
        ];
        timeLabels.forEach(lbl => {
            const x = padL + (graphW * (lbl.idx / 47));
            dCtx.fillText(lbl.text, x, padT + graphH + 8);
        });

        // Coordinates mapping
        const coords = points.map((pt, i) => ({
            x: padL + (graphW * (i / 47)),
            y: getCanvasY(pt.score),
            score: pt.score,
            activity: pt.activity
        }));

        // 2. Multi-Stop Glowing Area Fill
        const areaGrad = dCtx.createLinearGradient(0, padT, 0, padT + graphH);
        areaGrad.addColorStop(0, 'rgba(0, 229, 255, 0.32)');
        areaGrad.addColorStop(0.35, 'rgba(0, 230, 118, 0.20)');
        areaGrad.addColorStop(0.7, 'rgba(255, 214, 0, 0.10)');
        areaGrad.addColorStop(1, 'rgba(8, 8, 13, 0.0)');

        dCtx.beginPath();
        dCtx.moveTo(coords[0].x, zeroY);
        coords.forEach(pt => { dCtx.lineTo(pt.x, pt.y); });
        dCtx.lineTo(coords[coords.length - 1].x, zeroY);
        dCtx.closePath();
        dCtx.fillStyle = areaGrad;
        dCtx.fill();

        // 3. Multi-Stop Rainbow Line Stroke
        const strokeGrad = dCtx.createLinearGradient(padL, 0, cw - padR, 0);
        strokeGrad.addColorStop(0, '#00e5ff');
        strokeGrad.addColorStop(0.25, '#00e676');
        strokeGrad.addColorStop(0.5, '#ffd600');
        strokeGrad.addColorStop(0.75, '#d500f9');
        strokeGrad.addColorStop(1, '#ff00ea');

        dCtx.beginPath();
        dCtx.moveTo(coords[0].x, coords[0].y);
        for (let i = 1; i < coords.length; i++) {
            const xc = (coords[i].x + coords[i - 1].x) / 2;
            const yc = (coords[i].y + coords[i - 1].y) / 2;
            dCtx.quadraticCurveTo(coords[i - 1].x, coords[i - 1].y, xc, yc);
        }
        dCtx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
        dCtx.lineWidth = 3;
        dCtx.strokeStyle = strokeGrad;
        dCtx.lineCap = 'round';
        dCtx.lineJoin = 'round';
        dCtx.shadowBlur = 12;
        dCtx.shadowColor = 'rgba(0, 229, 255, 0.4)';
        dCtx.stroke();
        dCtx.shadowBlur = 0;

        // 4. Activity-Colored Nodes
        let latestIdx = -1;
        coords.forEach((c, idx) => {
            if (c.activity) {
                latestIdx = idx;
                const actCol = activityColors[c.activity] || '#ffffff';
                dCtx.beginPath();
                dCtx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
                dCtx.fillStyle = actCol;
                dCtx.shadowBlur = 6;
                dCtx.shadowColor = actCol;
                dCtx.fill();
                dCtx.shadowBlur = 0;
            }
        });

        // Pulsing Beacon on End/Latest Node
        const targetNode = latestIdx >= 0 ? coords[latestIdx] : coords[coords.length - 1];
        if (targetNode) {
            dCtx.beginPath();
            dCtx.arc(targetNode.x, targetNode.y, 6, 0, Math.PI * 2);
            dCtx.fillStyle = '#ffffff';
            dCtx.shadowBlur = 14;
            dCtx.shadowColor = '#00e5ff';
            dCtx.fill();
            dCtx.shadowBlur = 0;

            dCtx.beginPath();
            dCtx.arc(targetNode.x, targetNode.y, 10, 0, Math.PI * 2);
            dCtx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
            dCtx.lineWidth = 1.5;
            dCtx.stroke();

            // Score Badge Float above Node
            const badgeY = Math.max(padT + 10, targetNode.y - 12);
            dCtx.fillStyle = '#ffffff';
            dCtx.font = '800 10px Inter';
            dCtx.textAlign = 'center';
            dCtx.fillText(targetNode.score >= 0 ? `+${targetNode.score}` : `${targetNode.score}`, targetNode.x, badgeY);
        }
    }

    // --- 🌟 5. 7-DAY WEEKLY COMPARISON PERFORMANCE BAR & SPLINE RENDERER (AT BOTTOM) ---
    function renderWeeklyComparisonGraph(todayScore) {
        if (!weeklyGraphCanvas || !wCtx) return;

        const cw = weeklyGraphCanvas.width;
        const ch = weeklyGraphCanvas.height;
        wCtx.clearRect(0, 0, cw, ch);

        const isLight = document.body.classList.contains('theme-light');
        const padL = 48, padR = 20, padT = 24, padB = 28;
        const graphW = cw - padL - padR;
        const graphH = ch - padT - padB;

        const today = new Date();
        const daysNameIndex = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const currentDayName = daysNameIndex[today.getDay()];

        // Load or create 7-day weekly history
        let weeklyHistory = [];
        try {
            const raw = localStorage.getItem('productometer_weekly_history');
            if (raw) weeklyHistory = JSON.parse(raw);
        } catch (e) {}

        if (!Array.isArray(weeklyHistory) || weeklyHistory.length !== 7) {
            weeklyHistory = [
                { day: 'MON', score: 0 }, { day: 'TUE', score: 0 }, { day: 'WED', score: 0 },
                { day: 'THU', score: 0 }, { day: 'FRI', score: 0 }, { day: 'SAT', score: 0 }, { day: 'SUN', score: 0 }
            ];
        }

        // Commit today's score
        weeklyHistory.forEach(item => {
            if (item.day === currentDayName) item.score = todayScore;
        });

        try {
            localStorage.setItem('productometer_weekly_history', JSON.stringify(weeklyHistory));
        } catch (e) {}

        // Update Weekly Summary Deck
        const total = weeklyHistory.reduce((acc, cur) => acc + (cur.score || 0), 0);
        const avg = Math.round(total / 7);
        let best = weeklyHistory[0];
        weeklyHistory.forEach(d => {
            if ((d.score || 0) > (best.score || 0)) best = d;
        });

        if (weeklyTotalScore) weeklyTotalScore.textContent = total >= 0 ? `+${total}` : `${total}`;
        if (weeklyAvgScore) weeklyAvgScore.textContent = avg >= 0 ? `+${avg}` : `${avg}`;
        if (weeklyBestDay) weeklyBestDay.textContent = best && best.score > 0 ? `${best.day} (+${best.score})` : `${best.day || '--'}`;

        // Min/Max computation
        let minVal = 0, maxVal = 600;
        weeklyHistory.forEach(item => {
            if (item.score < minVal) minVal = item.score;
            if (item.score > maxVal) maxVal = item.score;
        });
        minVal = Math.min(-200, Math.floor(minVal / 200) * 200);
        maxVal = Math.max(800, Math.ceil(maxVal / 200) * 200);

        function getCanvasY(val) {
            const ratio = (val - minVal) / (maxVal - minVal);
            return padT + graphH - (graphH * Math.max(0, Math.min(1, ratio)));
        }

        const zeroY = getCanvasY(0);

        // 1. Grid Guides
        wCtx.lineWidth = 1;
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const stepVal = minVal + ((maxVal - minVal) * (i / gridSteps));
            const y = getCanvasY(stepVal);

            wCtx.beginPath();
            wCtx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
            wCtx.moveTo(padL, y);
            wCtx.lineTo(cw - padR, y);
            wCtx.stroke();

            wCtx.fillStyle = stepVal === 0 ? (isLight ? '#ff00ea' : '#ffffff') : (isLight ? '#94a3b8' : '#646475');
            wCtx.font = stepVal === 0 ? '700 10px Inter' : '600 9px Inter';
            wCtx.textAlign = 'right';
            wCtx.textBaseline = 'middle';
            wCtx.fillText((stepVal > 0 ? `+${Math.round(stepVal)}` : Math.round(stepVal)), padL - 8, y);
        }

        // Glowing Zero Baseline
        wCtx.beginPath();
        wCtx.strokeStyle = 'rgba(255, 0, 234, 0.35)';
        wCtx.lineWidth = 1.5;
        wCtx.moveTo(padL, zeroY);
        wCtx.lineTo(cw - padR, zeroY);
        wCtx.stroke();

        const barWidth = 32;
        const splinePoints = [];

        // 2. Render 7 Distinctly Colored 3D Bars
        weeklyHistory.forEach((item, idx) => {
            const barCenterX = padL + (graphW * (idx / 6));
            const barTopY = getCanvasY(item.score);
            const dayColor = dayPalette[item.day] || '#00e5ff';

            splinePoints.push({ x: barCenterX, y: barTopY, score: item.score, color: dayColor });

            const barGrad = wCtx.createLinearGradient(0, Math.min(barTopY, zeroY), 0, Math.max(barTopY, zeroY));
            if (item.score >= 0) {
                barGrad.addColorStop(0, dayColor);
                barGrad.addColorStop(1, dayColor + '22');
            } else {
                barGrad.addColorStop(0, '#ff174422');
                barGrad.addColorStop(1, '#ff1744');
            }

            const barHeight = Math.abs(zeroY - barTopY);
            const drawTop = item.score >= 0 ? barTopY : zeroY;

            wCtx.beginPath();
            if (barHeight > 5) {
                if (wCtx.roundRect) {
                    wCtx.roundRect(barCenterX - (barWidth / 2), drawTop, barWidth, barHeight, [6, 6, 3, 3]);
                } else {
                    wCtx.rect(barCenterX - (barWidth / 2), drawTop, barWidth, barHeight);
                }
            } else {
                wCtx.rect(barCenterX - (barWidth / 2), zeroY - 2, barWidth, 4);
            }
            wCtx.fillStyle = barGrad;
            wCtx.shadowBlur = 10;
            wCtx.shadowColor = (item.score >= 0 ? dayColor : '#ff1744') + '55';
            wCtx.fill();
            wCtx.shadowBlur = 0;

            // X-Axis Day Labels
            wCtx.fillStyle = dayColor;
            wCtx.font = '800 10px Inter';
            wCtx.textAlign = 'center';
            wCtx.textBaseline = 'top';
            wCtx.fillText(item.day, barCenterX, padT + graphH + 8);

            // Numeric Scores Above/Below Bars
            wCtx.font = '700 10px Inter';
            if (item.score >= 0) {
                wCtx.fillStyle = isLight ? '#0f172a' : '#ffffff';
                wCtx.textBaseline = 'bottom';
                wCtx.fillText(`+${item.score}`, barCenterX, barTopY - 5);
            } else {
                wCtx.fillStyle = '#ff1744';
                wCtx.textBaseline = 'top';
                wCtx.fillText(`${item.score}`, barCenterX, barTopY + 5);
            }
        });

        // 3. Smooth Curved Spline Connecting Bar Peaks
        if (splinePoints.length > 1) {
            const splineGrad = wCtx.createLinearGradient(padL, 0, cw - padR, 0);
            splineGrad.addColorStop(0, '#00e5ff');
            splineGrad.addColorStop(0.35, '#00e676');
            splineGrad.addColorStop(0.7, '#ffd600');
            splineGrad.addColorStop(1, '#ff00ea');

            wCtx.beginPath();
            wCtx.moveTo(splinePoints[0].x, splinePoints[0].y);
            for (let i = 1; i < splinePoints.length; i++) {
                const xc = (splinePoints[i].x + splinePoints[i - 1].x) / 2;
                const yc = (splinePoints[i].y + splinePoints[i - 1].y) / 2;
                wCtx.quadraticCurveTo(splinePoints[i - 1].x, splinePoints[i - 1].y, xc, yc);
            }
            wCtx.lineTo(splinePoints[splinePoints.length - 1].x, splinePoints[splinePoints.length - 1].y);
            wCtx.lineWidth = 2.5;
            wCtx.strokeStyle = splineGrad;
            wCtx.stroke();

            splinePoints.forEach(pt => {
                wCtx.beginPath();
                wCtx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
                wCtx.fillStyle = '#ffffff';
                wCtx.shadowBlur = 6;
                wCtx.shadowColor = pt.color;
                wCtx.fill();
                wCtx.shadowBlur = 0;
            });
        }
    }

    // --- 6. REFRESH & SYNCHRONIZE DASHBOARD ---
    function refreshHomeDashboard() {
        const healthData = loadHealthMetrics();
        const screenData = loadScreenTimeMetrics();
        const acadData = loadAcademicsMetrics();
        const plannerData = loadUpcomingSessions();

        const scoreObj = calculateProductivityScore(healthData, screenData, acadData, plannerData);

        // Update Score Readout
        if (homeProductivityScore) {
            homeProductivityScore.textContent = scoreObj.netTotalScore > 0 ? 
                `+${scoreObj.netTotalScore}` : `${scoreObj.netTotalScore}`;
        }

        // Update Math Chips Real-Time Values
        if (chipValAcad) chipValAcad.textContent = scoreObj.acadScore > 0 ? `+${Math.round(scoreObj.acadScore)}` : `${Math.round(scoreObj.acadScore)}`;
        if (chipValHealth) chipValHealth.textContent = scoreObj.healthScore > 0 ? `+${Math.round(scoreObj.healthScore)}` : `${Math.round(scoreObj.healthScore)}`;
        if (chipValOtherProd) chipValOtherProd.textContent = scoreObj.otherProdScore > 0 ? `+${Math.round(scoreObj.otherProdScore)}` : `${Math.round(scoreObj.otherProdScore)}`;
        if (chipValScreen) chipValScreen.textContent = scoreObj.screenScore !== 0 ? `${Math.round(scoreObj.screenScore)}` : "0";
        if (chipValTasks) chipValTasks.textContent = scoreObj.tasksBonus > 0 ? `+${Math.round(scoreObj.tasksBonus)}` : "+0";

        // Rating Pill & Status Text
        if (homeScoreRatingPill && homeScoreRatingText && homeScoreRatingIcon) {
            homeScoreRatingPill.className = 'score-rating-pill';
            if (scoreObj.netTotalScore >= 350) {
                homeScoreRatingPill.classList.add('peak');
                homeScoreRatingIcon.className = 'fa-solid fa-fire';
                homeScoreRatingText.textContent = 'Peak Momentum';
            } else if (scoreObj.netTotalScore >= 150) {
                homeScoreRatingPill.classList.add('productive');
                homeScoreRatingIcon.className = 'fa-solid fa-bolt';
                homeScoreRatingText.textContent = 'Productive Flow';
            } else if (scoreObj.netTotalScore >= 0) {
                homeScoreRatingPill.classList.add('building');
                homeScoreRatingIcon.className = 'fa-solid fa-seedling';
                homeScoreRatingText.textContent = 'Building Focus';
            } else {
                homeScoreRatingPill.classList.add('deficit');
                homeScoreRatingIcon.className = 'fa-solid fa-triangle-exclamation';
                homeScoreRatingText.textContent = 'Deficit Recovery';
            }
        }

        // Render Graphs
        renderDailyTrendGraph(scoreObj, plannerData.plannerList);
        renderWeeklyComparisonGraph(scoreObj.netTotalScore);
    }

    // Initial Refresh
    refreshHomeDashboard();

    // Cross-tab Synchronization on LocalStorage Changes
    window.addEventListener('storage', (e) => {
        if (e.key && (
            e.key.includes('planner') ||
            e.key.includes('diet') ||
            e.key.includes('health') ||
            e.key.includes('screen') ||
            e.key.includes('study') ||
            e.key.includes('timeline')
        )) {
            refreshHomeDashboard();
        }
    });

    // Auto Refresh every 30 seconds
    setInterval(refreshHomeDashboard, 30000);
});
