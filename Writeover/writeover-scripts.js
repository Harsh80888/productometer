/**
 * PRODUCTOMETER PROJECT WRITEOVER — ACADEMIC TECHNICAL SPECIFICATION ENGINE
 * Multi-Page Academic Reader with Ground-Truth Simulators & Mathematical Net AP Engine
 */

document.addEventListener('DOMContentLoaded', () => {

    const totalPages = 8;
    let currentPage = 1;

    // Core Reader Elements
    const pages = document.querySelectorAll('.report-page');
    const topChapterTitle = document.getElementById('topChapterTitle');
    const currentPageNum = document.getElementById('currentPageNum');
    const readingProgressFill = document.getElementById('readingProgressFill');
    const btnToggleToc = document.getElementById('btnToggleToc');
    const btnCloseToc = document.getElementById('btnCloseToc');
    const tocDrawer = document.getElementById('tocDrawer');
    const tocItems = document.querySelectorAll('.toc-item');
    const btnBottomPrev = document.getElementById('btnBottomPrev');
    const btnBottomNext = document.getElementById('btnBottomNext');
    const btnBackToTop = document.getElementById('btnBackToTop');
    const btnPrintDoc = document.getElementById('btnPrintDoc');
    const pageDotsRail = document.getElementById('pageDotsRail');

    // ========================================================
    // 1. GENERATE BOTTOM PAGE DOTS
    // ========================================================
    function initBottomDots() {
        if (!pageDotsRail) return;
        pageDotsRail.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const dot = document.createElement('div');
            dot.className = `rail-dot ${i === 1 ? 'active' : ''}`;
            dot.title = `Jump to Section ${i}.0`;
            dot.addEventListener('click', () => goToPage(i));
            pageDotsRail.appendChild(dot);
        }
    }
    initBottomDots();

    // ========================================================
    // 2. PAGE NAVIGATION ENGINE
    // ========================================================
    function goToPage(targetPage) {
        if (targetPage < 1 || targetPage > totalPages) return;

        pages.forEach(p => p.classList.remove('active'));

        currentPage = targetPage;
        const activePage = document.querySelector(`.report-page[data-page="${currentPage}"]`);
        if (activePage) {
            activePage.classList.add('active');
            const title = activePage.dataset.title || `Section ${currentPage}.0`;
            if (topChapterTitle) topChapterTitle.textContent = title;
        }

        if (currentPageNum) currentPageNum.textContent = `Page ${currentPage} / ${totalPages}`;
        if (readingProgressFill) {
            const pct = (currentPage / totalPages) * 100;
            readingProgressFill.style.width = `${pct}%`;
        }

        tocItems.forEach(item => {
            const itemTarget = parseInt(item.dataset.target, 10);
            item.classList.toggle('active', itemTarget === currentPage);
        });

        if (pageDotsRail) {
            const dots = pageDotsRail.querySelectorAll('.rail-dot');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx + 1 === currentPage);
            });
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (btnBottomPrev) btnBottomPrev.addEventListener('click', () => goToPage(currentPage - 1));
    if (btnBottomNext) btnBottomNext.addEventListener('click', () => goToPage(currentPage + 1));

    document.querySelectorAll('button[data-goto]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = parseInt(btn.dataset.goto, 10);
            if (target) goToPage(target);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            if (currentPage < totalPages) goToPage(currentPage + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            if (currentPage > 1) goToPage(currentPage - 1);
        }
    });

    if (btnBackToTop) {
        btnBackToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (btnPrintDoc) {
        btnPrintDoc.addEventListener('click', () => {
            window.print();
        });
    }

    // TOC Drawer Toggle
    if (btnToggleToc && tocDrawer) {
        btnToggleToc.addEventListener('click', () => {
            tocDrawer.classList.toggle('open');
        });
    }

    if (btnCloseToc && tocDrawer) {
        btnCloseToc.addEventListener('click', () => {
            tocDrawer.classList.remove('open');
        });
    }

    tocItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = parseInt(item.dataset.target, 10);
            if (target) {
                goToPage(target);
                if (tocDrawer) tocDrawer.classList.remove('open');
            }
        });
    });

    // ========================================================
    // 3. PAGE 1: SYSTEM BENCHMARK COMPARISON MATRIX
    // ========================================================
    const btnCompProductometer = document.getElementById('btnCompProductometer');
    const btnCompLegacy = document.getElementById('btnCompLegacy');
    const compMetricsGrid = document.getElementById('compMetricsGrid');

    const metricsData = {
        productometer: [
            { title: 'RAM Memory Footprint', value: '42 MB', delta: '-90% Memory', tagClass: 'positive', desc: 'Single hardware-accelerated WebView instance with lightweight background daemons.' },
            { title: 'Daily Battery Consumption', value: '< 1.8%', delta: '-78% Drain', tagClass: 'positive', desc: 'Event-driven OS hooks without continuous CPU wakeups or background GPS polling.' },
            { title: 'Doomscroll Distraction Leak', value: '0 Minutes', delta: '100% Preserved', tagClass: 'positive', desc: '1-Reel Grace State Machine detects and collapses vertical short loops within 5 seconds.' },
            { title: 'Daily Manual Logging Burden', value: '0 Minutes', delta: 'Zero Friction', tagClass: 'positive', desc: 'Ground-truth UsageEvents streamed directly from Android kernel from 00:00 midnight.' },
            { title: 'Data Privacy & Telemetry', value: '100% Offline', delta: 'Zero Telemetry', tagClass: 'positive', desc: 'Encrypted local SQLite storage. No remote tracking servers or cloud leakage.' }
        ],
        legacy: [
            { title: 'RAM Memory Footprint', value: '420 MB', delta: '+900% Bloat', tagClass: 'negative', desc: '5 separate runtimes simultaneously loaded into memory (Timer, Calendar, Habit, Sleep, Blocker).' },
            { title: 'Daily Battery Consumption', value: '8.4%', delta: 'High Drain', tagClass: 'negative', desc: 'Multiple polling alarm loops running continuous background synchronization.' },
            { title: 'Doomscroll Distraction Leak', value: '142 Minutes', delta: 'Unchecked Loop', tagClass: 'negative', desc: 'Draconian blockers are uninstalled or disabled after frustrating full app lockouts.' },
            { title: 'Daily Manual Logging Burden', value: '18 Minutes', delta: 'High Friction', tagClass: 'negative', desc: 'Requires manual timer start/stop and daily checkbox tapping across multiple tools.' },
            { title: 'Data Privacy & Telemetry', value: '5 Remote Clouds', delta: 'Privacy Leak', tagClass: 'negative', desc: 'Behavioral, biometric, and browsing data synced to 5 disparate commercial servers.' }
        ]
    };

    function renderComparisonMetrics(mode) {
        if (!compMetricsGrid) return;
        const list = metricsData[mode] || metricsData.productometer;
        compMetricsGrid.innerHTML = list.map(m => `
            <div class="comp-metric-card">
                <div>
                    <span class="comp-card-metric-title">${m.title}</span>
                    <div class="comp-card-val-row">
                        <span class="comp-card-main-val">${m.value}</span>
                        <span class="comp-card-tag ${m.tagClass}">${m.delta}</span>
                    </div>
                </div>
                <p class="comp-card-desc">${m.desc}</p>
            </div>
        `).join('');
    }

    if (btnCompProductometer && btnCompLegacy) {
        btnCompProductometer.addEventListener('click', () => {
            btnCompProductometer.classList.add('active');
            btnCompLegacy.classList.remove('active');
            renderComparisonMetrics('productometer');
        });
        btnCompLegacy.addEventListener('click', () => {
            btnCompLegacy.classList.add('active');
            btnCompProductometer.classList.remove('active');
            renderComparisonMetrics('legacy');
        });
        renderComparisonMetrics('productometer');
    }

    // ========================================================
    // 4. PAGE 2: NATIVE JAVASCRIPT BRIDGE TERMINAL INSPECTOR
    // ========================================================
    const bridgeBtns = document.querySelectorAll('.bridge-btn');
    const terminalBridgeMethodTitle = document.getElementById('terminalBridgeMethodTitle');
    const terminalBridgeLatency = document.getElementById('terminalBridgeLatency');
    const terminalBridgeOutput = document.getElementById('terminalBridgeOutput');

    const bridgeMethodPayloads = {
        usageStats: {
            title: 'Executing: window.AndroidBridge.getRealAppUsageStats()',
            latency: 'Latency: 1.2ms • Status: 200 OK',
            payload: `// Android Native Bridge -> UsageStatsManager.queryEvents(startOfDay, now)
{
  "status": "SUCCESS",
  "queryStartEpoch": 1718236800000, // 00:00:00 Local Midnight
  "queryEndEpoch": 1718274600000,   // Current System Timestamp
  "foregroundApps": [
    {
      "packageName": "com.google.android.youtube",
      "appName": "YouTube",
      "totalForegroundSeconds": 3240,
      "iconBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHe...",
      "shortsSwipeCount": 1
    },
    {
      "packageName": "com.instagram.android",
      "appName": "Instagram",
      "totalForegroundSeconds": 840,
      "iconBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHe...",
      "shortsSwipeCount": 0
    }
  ]
}`
        },
        permissionCheck: {
            title: 'Executing: window.AndroidBridge.hasUsageStatsPermission()',
            latency: 'Latency: 0.4ms • Status: 200 OK',
            payload: `// AppOpsManager check: AppOpsManager.OPSTR_GET_USAGE_STATS
{
  "permission": "android.permission.PACKAGE_USAGE_STATS",
  "granted": true,
  "appOpsMode": "MODE_ALLOWED",
  "restrictedSettingsBypassed": true
}`
        },
        scheduleAlarm: {
            title: 'Executing: window.AndroidBridge.scheduleTaskAlarm(101, "Linear Algebra Focus", 1718278200000)',
            latency: 'Latency: 1.8ms • Status: 200 OK',
            payload: `// Intent dispatched to AlarmManager.setExactAndAllowWhileIdle(RTC_WAKEUP, epochMs, pendingIntent)
{
  "alarmId": 101,
  "taskTitle": "Linear Algebra Focus",
  "epochTriggerMs": 1718278200000,
  "formattedTime": "14:30:00",
  "receiverClass": "com.productometer.receivers.AlarmReceiver",
  "survivesDoze": true,
  "bootReceiverPersisted": true
}`
        },
        startFocus: {
            title: 'Executing: window.AndroidBridge.startFocusSession("Operating Systems", 2700)',
            latency: 'Latency: 2.1ms • Status: 200 OK',
            payload: `// Native Context.startForegroundService(new Intent(context, FocusService.class))
{
  "serviceClass": "com.productometer.services.FocusService",
  "foregroundServiceType": "FOREGROUND_SERVICE_TYPE_DATA_SYNC",
  "notificationId": 9001,
  "channelId": "FOCUS_STATUS_CHANNEL",
  "sessionDurationSeconds": 2700,
  "ongoingNotificationActive": true
}`
        },
        accessibilityCheck: {
            title: 'Executing: window.AndroidBridge.isAccessibilityServiceEnabled()',
            latency: 'Latency: 0.5ms • Status: 200 OK',
            payload: `// AccessibilityManager.getEnabledAccessibilityServiceList()
{
  "serviceId": "com.productometer/.services.ShortsReelsBlockerService",
  "connected": true,
  "eventTypes": [
    "TYPE_VIEW_SCROLLED",
    "TYPE_WINDOW_STATE_CHANGED"
  ],
  "feedbackType": "FEEDBACK_GENERIC",
  "canPerformGestures": true
}`
        }
    };

    bridgeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            bridgeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const key = btn.dataset.method;
            const data = bridgeMethodPayloads[key];
            if (data) {
                if (terminalBridgeMethodTitle) terminalBridgeMethodTitle.textContent = data.title;
                if (terminalBridgeLatency) terminalBridgeLatency.textContent = data.latency;
                if (terminalBridgeOutput) terminalBridgeOutput.textContent = data.payload;
            }
        });
    });

    if (terminalBridgeOutput && bridgeMethodPayloads.usageStats) {
        terminalBridgeOutput.textContent = bridgeMethodPayloads.usageStats.payload;
    }

    // ========================================================
    // 5. PAGE 3: 48-SLOT MATRIX CONTINUOUS PAINTER (24-HOUR)
    // ========================================================
    const matrixGridAM = document.getElementById('matrixGridAM');
    const matrixGridPM = document.getElementById('matrixGridPM');
    const matrix48MetricSummary = document.getElementById('matrix48MetricSummary');
    const paletteChips = document.querySelectorAll('.palette-chip');
    const btnPresetExamDay = document.getElementById('btnPresetExamDay');
    const btnPresetBalanced = document.getElementById('btnPresetBalanced');
    const btnClear48Matrix = document.getElementById('btnClear48Matrix');

    let currentSelectedCategory = 'study';
    let isMatrixMouseDown = false;
    const matrix48Slots = new Array(48).fill('unallocated');

    paletteChips.forEach(chip => {
        chip.addEventListener('click', () => {
            paletteChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentSelectedCategory = chip.dataset.cat;
        });
    });

    function getSlotTime(idx) {
        const hour = Math.floor(idx / 2);
        const min = (idx % 2 === 0) ? '00' : '30';
        return `${String(hour).padStart(2, '0')}:${min}`;
    }

    function render48Matrix() {
        if (!matrixGridAM || !matrixGridPM) return;
        matrixGridAM.innerHTML = '';
        matrixGridPM.innerHTML = '';

        for (let i = 0; i < 48; i++) {
            const slot = document.createElement('div');
            const cat = matrix48Slots[i];
            let catClass = '';
            let labelText = 'Free';

            if (cat === 'study') { catClass = 'active-study'; labelText = 'Study'; }
            else if (cat === 'health') { catClass = 'active-health'; labelText = 'Health'; }
            else if (cat === 'sleep') { catClass = 'active-sleep'; labelText = 'Sleep'; }

            slot.className = `matrix-slot-unit ${catClass}`;
            slot.dataset.index = i;
            slot.innerHTML = `
                <span class="matrix-slot-time">${getSlotTime(i)}</span>
                <span class="matrix-slot-label">${labelText}</span>
            `;

            slot.addEventListener('mousedown', () => {
                isMatrixMouseDown = true;
                applyCategoryToSlot(i);
            });

            slot.addEventListener('mouseenter', () => {
                if (isMatrixMouseDown) {
                    applyCategoryToSlot(i);
                }
            });

            if (i < 24) matrixGridAM.appendChild(slot);
            else matrixGridPM.appendChild(slot);
        }
        update48MatrixMetrics();
    }

    document.addEventListener('mouseup', () => { isMatrixMouseDown = false; });

    function applyCategoryToSlot(index) {
        matrix48Slots[index] = currentSelectedCategory === 'clear' ? 'unallocated' : currentSelectedCategory;
        updateSingleSlotUI(index);
        update48MatrixMetrics();
    }

    function updateSingleSlotUI(index) {
        const container = index < 24 ? matrixGridAM : matrixGridPM;
        if (!container) return;
        const slotEl = container.querySelector(`[data-index="${index}"]`);
        if (!slotEl) return;

        const cat = matrix48Slots[index];
        slotEl.className = 'matrix-slot-unit';
        let labelText = 'Free';

        if (cat === 'study') { slotEl.classList.add('active-study'); labelText = 'Study'; }
        else if (cat === 'health') { slotEl.classList.add('active-health'); labelText = 'Health'; }
        else if (cat === 'sleep') { slotEl.classList.add('active-sleep'); labelText = 'Sleep'; }

        const label = slotEl.querySelector('.matrix-slot-label');
        if (label) label.textContent = labelText;
    }

    function update48MatrixMetrics() {
        const studyCount = matrix48Slots.filter(s => s === 'study').length;
        const healthCount = matrix48Slots.filter(s => s === 'health').length;
        const sleepCount = matrix48Slots.filter(s => s === 'sleep').length;

        const studyHours = (studyCount * 0.5).toFixed(1);
        const healthHours = (healthCount * 0.5).toFixed(1);
        const sleepHours = (sleepCount * 0.5).toFixed(1);

        const alarmsCount = studyCount + healthCount + (sleepCount > 0 ? 1 : 0);
        const netApPotential = (studyCount * 50) + (healthCount > 0 ? Math.round(150 - (healthCount * 15)) : 0) + (sleepCount >= 14 ? 50 : 0);

        if (matrix48MetricSummary) {
            matrix48MetricSummary.innerHTML = `Study: <strong>${studyHours}h</strong> &bull; Health: <strong>${healthHours}h</strong> &bull; Sleep: <strong>${sleepHours}h</strong> &bull; Armed Alarms: <strong>${alarmsCount} RTC_WAKEUP</strong> &bull; Net AP: <strong>+${netApPotential} AP</strong>`;
        }
    }

    function loadMatrixPreset(type) {
        matrix48Slots.fill('unallocated');
        if (type === 'balanced') {
            // Sleep: 00:00 to 07:00 (14 slots)
            for (let i = 0; i < 14; i++) matrix48Slots[i] = 'sleep';
            // Morning Study: 09:00 to 12:00 (6 slots)
            for (let i = 18; i < 24; i++) matrix48Slots[i] = 'study';
            // Afternoon Study: 14:00 to 16:00 (4 slots)
            for (let i = 28; i < 32; i++) matrix48Slots[i] = 'study';
            // Health/Workout: 17:30 to 18:30 (2 slots)
            for (let i = 35; i < 37; i++) matrix48Slots[i] = 'health';
            // Bedtime Prep: 23:00 to 24:00 (2 slots)
            for (let i = 46; i < 48; i++) matrix48Slots[i] = 'sleep';
        } else if (type === 'exam') {
            // Sleep: 00:00 to 06:30 (13 slots)
            for (let i = 0; i < 13; i++) matrix48Slots[i] = 'sleep';
            // Deep Study 1: 08:00 to 12:00 (8 slots)
            for (let i = 16; i < 24; i++) matrix48Slots[i] = 'study';
            // Deep Study 2: 13:30 to 17:30 (8 slots)
            for (let i = 27; i < 35; i++) matrix48Slots[i] = 'study';
            // Exercise/Walk: 18:00 to 19:00 (2 slots)
            for (let i = 36; i < 38; i++) matrix48Slots[i] = 'health';
            // Evening Review: 20:00 to 22:30 (5 slots)
            for (let i = 40; i < 45; i++) matrix48Slots[i] = 'study';
        }
        render48Matrix();
    }

    if (btnPresetBalanced) btnPresetBalanced.addEventListener('click', () => loadMatrixPreset('balanced'));
    if (btnPresetExamDay) btnPresetExamDay.addEventListener('click', () => loadMatrixPreset('exam'));
    if (btnClear48Matrix) btnClear48Matrix.addEventListener('click', () => loadMatrixPreset('clear'));

    loadMatrixPreset('balanced');

    // ========================================================
    // 6. PAGE 4: 1-REEL GRACE STATE SIMULATOR & AUDIO SYNTH
    // ========================================================
    const simContextBtns = document.querySelectorAll('.context-btn');
    const simHierarchyCode = document.getElementById('simHierarchyCode');
    const stateSteps = [
        document.getElementById('stateStep1'),
        document.getElementById('stateStep2'),
        document.getElementById('stateStep3'),
        document.getElementById('stateStep4')
    ];
    const simStageBadge = document.getElementById('simStageBadge');
    const simStageMessage = document.getElementById('simStageMessage');
    const simHudOverlay = document.getElementById('simHudOverlay');
    const simCountdownVal = document.getElementById('simCountdownVal');
    const btnSimSwipe = document.getElementById('btnSimSwipe');
    const btnSimReset = document.getElementById('btnSimReset');
    const btnSimManualReturn = document.getElementById('btnSimManualReturn');
    const btnSimOverride30s = document.getElementById('btnSimOverride30s');

    let simSwipeCount = 0;
    let simCountdownTimer = null;
    let currentAppContext = 'ytShorts';

    // Web Audio API Synthesizer for Alert Chime
    function playSyntheticChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz (A5)
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
            // Audio context blocked or unsupported
        }
    }

    const contextHierarchySignatures = {
        ytShorts: 'com.google.android.youtube:id/reel_recycler • Class: androidx.recyclerview.widget.RecyclerView • Visible: true',
        igReels: 'com.instagram.android:id/clips_video_container • Class: android.widget.FrameLayout • Visible: true',
        ytLecture: 'com.google.android.youtube:id/watch_player • Node Text contains: "lecture", "algebra" • Whitelisted: true',
        whatsapp: 'com.whatsapp:id/conversation_layout • Class: android.widget.LinearLayout • Safe App: true'
    };

    simContextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            simContextBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAppContext = btn.dataset.context;
            if (simHierarchyCode) {
                simHierarchyCode.textContent = contextHierarchySignatures[currentAppContext] || 'Node inspect standby';
            }
            resetSimState();
        });
    });

    function setSimStep(stepNum) {
        stateSteps.forEach((step, idx) => {
            if (!step) return;
            step.classList.remove('active', 'alert');
            if (idx === stepNum - 1) {
                step.classList.add('active');
                if (stepNum === 3) step.classList.add('alert');
            }
        });
    }

    if (btnSimSwipe) {
        btnSimSwipe.addEventListener('click', () => {
            if (currentAppContext === 'ytLecture' || currentAppContext === 'whatsapp') {
                if (simStageBadge) {
                    simStageBadge.textContent = 'Current State: WHITELISTED_PLAYBACK';
                    simStageBadge.style.color = 'var(--accent-emerald)';
                }
                if (simStageMessage) {
                    simStageMessage.innerHTML = '<strong>No Interception:</strong> Target view contains educational or communication nodes. Video playback allowed without interruption.';
                }
                return;
            }

            simSwipeCount++;

            if (simSwipeCount === 1) {
                setSimStep(2);
                if (simStageBadge) {
                    simStageBadge.textContent = 'Current State: GRACE_PERIOD_ACTIVE (1st Swipe Allowed)';
                    simStageBadge.style.color = 'var(--accent-emerald)';
                }
                if (simStageMessage) {
                    simStageMessage.innerHTML = '<strong>Toast Dispatched:</strong> "1 Reel Allowed — 30s Grace Period Active." Playback permitted. Consecutive swipe will trigger interception.';
                }
                if (simHudOverlay) simHudOverlay.style.display = 'none';
            } else if (simSwipeCount >= 2) {
                setSimStep(3);
                playSyntheticChime();

                if (simStageBadge) {
                    simStageBadge.textContent = 'Current State: INTERCEPTION_OVERLAY (Consecutive Swipe Intercepted)';
                    simStageBadge.style.color = 'var(--alert-crimson)';
                }
                if (simStageMessage) {
                    simStageMessage.innerHTML = '<strong>Interception HUD Engaged!</strong> Synthesized alert chime sounded. 5-second countdown started to execute GLOBAL_ACTION_BACK.';
                }

                if (simHudOverlay) simHudOverlay.style.display = 'flex';
                startSimCountdown();
            }
        });
    }

    function startSimCountdown() {
        if (simCountdownTimer) clearInterval(simCountdownTimer);
        let sec = 5;
        if (simCountdownVal) simCountdownVal.textContent = sec;

        simCountdownTimer = setInterval(() => {
            sec--;
            if (simCountdownVal) simCountdownVal.textContent = sec;
            if (sec <= 0) {
                clearInterval(simCountdownTimer);
                restoreFocus();
            }
        }, 1000);
    }

    function restoreFocus() {
        if (simCountdownTimer) clearInterval(simCountdownTimer);
        if (simHudOverlay) simHudOverlay.style.display = 'none';

        setSimStep(4);
        if (simStageBadge) {
            simStageBadge.textContent = 'Current State: GESTURE_RESTORE_COMPLETE (Restored)';
            simStageBadge.style.color = 'var(--accent-cobalt)';
        }
        if (simStageMessage) {
            simStageMessage.innerHTML = '<strong>Restoration Complete:</strong> <code class="mono-code">performGlobalAction(GLOBAL_ACTION_BACK)</code> executed. Focus preserved with zero lost notes.';
        }
    }

    if (btnSimManualReturn) btnSimManualReturn.addEventListener('click', restoreFocus);

    if (btnSimOverride30s) {
        btnSimOverride30s.addEventListener('click', () => {
            if (simCountdownTimer) clearInterval(simCountdownTimer);
            if (simHudOverlay) simHudOverlay.style.display = 'none';
            setSimStep(2);

            if (simStageBadge) {
                simStageBadge.textContent = 'Current State: EMERGENCY_PASS_ACTIVE (30s Extended Grace)';
                simStageBadge.style.color = 'var(--accent-amber)';
            }
            if (simStageMessage) {
                simStageMessage.innerHTML = '<strong>Emergency Pass Granted:</strong> 30-second window engaged for urgent message response. Focus monitoring re-arms at timer expiry.';
            }
        });
    }

    function resetSimState() {
        if (simCountdownTimer) clearInterval(simCountdownTimer);
        if (simHudOverlay) simHudOverlay.style.display = 'none';
        simSwipeCount = 0;
        setSimStep(1);

        if (simStageBadge) {
            simStageBadge.textContent = 'Current State: STANDBY / IDLE';
            simStageBadge.style.color = 'var(--accent-cobalt)';
        }
        if (simStageMessage) {
            simStageMessage.innerHTML = 'Accessibility service initialized. Listening for short-form feed nodes (reel_recycler / clips_video_container)...';
        }
    }

    if (btnSimReset) btnSimReset.addEventListener('click', resetSimState);

    // ========================================================
    // 7. PAGE 5: LECTURE TITLE CLASSIFIER & FOREGROUND SERVICE
    // ========================================================
    const inputVideoTitle = document.getElementById('inputVideoTitle');
    const btnTestTitle = document.getElementById('btnTestTitle');
    const nlpPresetChips = document.querySelectorAll('.nlp-preset-chip');
    const nlpBadge = document.getElementById('nlpBadge');
    const nlpMatchDetails = document.getElementById('nlpMatchDetails');
    const nlpActionText = document.getElementById('nlpActionText');

    const educationalKeywords = [
        'lecture', 'tutorial', 'class', 'course', 'physics', 'mathematics',
        'math', 'algebra', 'calculus', 'chemistry', 'programming', 'coding',
        'exam', 'chapter', 'dsa', 'algorithm', 'system', 'prep', 'synthesis'
    ];

    function evaluateVideoTitle(title) {
        if (!title) return;
        const lower = title.toLowerCase();
        const matches = educationalKeywords.filter(k => lower.includes(k));

        if (matches.length > 0) {
            if (nlpBadge) {
                nlpBadge.className = 'nlp-badge edu';
                nlpBadge.textContent = 'CLASSIFICATION: EDUCATIONAL LECTURE';
            }
            if (nlpMatchDetails) {
                nlpMatchDetails.textContent = `Matched tokens: "${matches.join('", "')}" • Whitelist Active`;
            }
            if (nlpActionText) {
                nlpActionText.innerHTML = '<strong>Action Dispatched:</strong> Video playback permitted with zero interruptions. Student focus block active (+100 Net AP/h accrual).';
            }
        } else {
            if (nlpBadge) {
                nlpBadge.className = 'nlp-badge casual';
                nlpBadge.textContent = 'CLASSIFICATION: CASUAL ENTERTAINMENT';
            }
            if (nlpMatchDetails) {
                nlpMatchDetails.textContent = 'No educational tokens detected • 15s Grace Timer Armed';
            }
            if (nlpActionText) {
                nlpActionText.innerHTML = '<strong>Action Dispatched:</strong> Initiated silent 15,000ms grace countdown. Audio alert prepared via asset <code class="mono-code">2.mp3</code> if playback continues.';
            }
        }
    }

    if (btnTestTitle && inputVideoTitle) {
        btnTestTitle.addEventListener('click', () => evaluateVideoTitle(inputVideoTitle.value));
    }

    nlpPresetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const title = chip.dataset.title;
            if (inputVideoTitle) inputVideoTitle.value = title;
            evaluateVideoTitle(title);
        });
    });

    // Foreground Service Pomodoro Ticker Simulator
    const btnToggleFgsTimer = document.getElementById('btnToggleFgsTimer');
    const btnResetFgsTimer = document.getElementById('btnResetFgsTimer');
    const fgsTimerDigits = document.getElementById('fgsTimerDigits');
    const fgsApAccrual = document.getElementById('fgsApAccrual');

    let fgsSeconds = 2700; // 45 minutes
    let fgsInterval = null;
    let isFgsRunning = false;

    function formatFgsTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    if (btnToggleFgsTimer) {
        btnToggleFgsTimer.addEventListener('click', () => {
            if (!isFgsRunning) {
                isFgsRunning = true;
                btnToggleFgsTimer.textContent = 'Pause Timer';
                btnToggleFgsTimer.style.backgroundColor = '#D97706';

                fgsInterval = setInterval(() => {
                    if (fgsSeconds > 0) {
                        fgsSeconds--;
                        if (fgsTimerDigits) fgsTimerDigits.textContent = formatFgsTime(fgsSeconds);
                        const elapsedMins = (2700 - fgsSeconds) / 60;
                        const apEarned = Math.round(elapsedMins * (100 / 60));
                        if (fgsApAccrual) fgsApAccrual.textContent = `+${apEarned} AP Earned`;
                    } else {
                        clearInterval(fgsInterval);
                        isFgsRunning = false;
                        btnToggleFgsTimer.textContent = 'Complete!';
                    }
                }, 1000);
            } else {
                isFgsRunning = false;
                clearInterval(fgsInterval);
                btnToggleFgsTimer.textContent = 'Resume Timer';
                btnToggleFgsTimer.style.backgroundColor = 'var(--accent-cobalt)';
            }
        });
    }

    if (btnResetFgsTimer) {
        btnResetFgsTimer.addEventListener('click', () => {
            clearInterval(fgsInterval);
            isFgsRunning = false;
            fgsSeconds = 2700;
            if (fgsTimerDigits) fgsTimerDigits.textContent = '45:00';
            if (fgsApAccrual) fgsApAccrual.textContent = '+0 AP Earned';
            if (btnToggleFgsTimer) {
                btnToggleFgsTimer.textContent = 'Start Timer';
                btnToggleFgsTimer.style.backgroundColor = 'var(--accent-cobalt)';
            }
        });
    }

    // ========================================================
    // 8. PAGE 6: USAGEEVENTS KERNEL STREAM SIMULATOR
    // ========================================================
    const btnStepKernelEvent = document.getElementById('btnStepKernelEvent');
    const btnAutoPlayKernel = document.getElementById('btnAutoPlayKernel');
    const btnResetKernel = document.getElementById('btnResetKernel');
    const kernelStreamLog = document.getElementById('kernelStreamLog');
    const aggTotalForeground = document.getElementById('aggTotalForeground');
    const aggYtTime = document.getElementById('aggYtTime');
    const aggIgTime = document.getElementById('aggIgTime');
    const aggSwipeTally = document.getElementById('aggSwipeTally');

    const kernelEventsTrace = [
        { time: '08:00:10', token: 'SCREEN_INTERACTIVE', pkg: 'android', note: 'Device screen unlocked' },
        { time: '08:00:25', token: 'ACTIVITY_RESUMED', pkg: 'com.google.android.youtube', note: 'Foreground active' },
        { time: '08:35:45', token: 'ACTIVITY_PAUSED', pkg: 'com.google.android.youtube', dur: '35m 20s', yt: 2120 },
        { time: '08:35:50', token: 'ACTIVITY_RESUMED', pkg: 'com.instagram.android', note: 'Foreground active' },
        { time: '08:42:15', token: 'TYPE_VIEW_SCROLLED', pkg: 'com.instagram.android', note: 'Reel vertical swipe #1', swipe: 1 },
        { time: '08:44:30', token: 'ACTIVITY_PAUSED', pkg: 'com.instagram.android', dur: '8m 40s', ig: 520 },
        { time: '08:45:00', token: 'KEYGUARD_SHOWN', pkg: 'android', note: 'Screen locked (Sleep)' },
        { time: '09:00:00', token: 'ACTIVITY_RESUMED', pkg: 'com.productometer.app', note: 'Session started' }
    ];

    let kernelStepIndex = 0;
    let kernelAutoPlayInterval = null;
    let accumulatedYtSec = 0;
    let accumulatedIgSec = 0;
    let accumulatedSwipes = 0;

    function stepKernelEvent() {
        if (!kernelStreamLog || kernelStepIndex >= kernelEventsTrace.length) return;
        const ev = kernelEventsTrace[kernelStepIndex];

        const row = document.createElement('div');
        row.className = 'kernel-log-entry';
        row.innerHTML = `
            <span class="k-time">${ev.time}</span>
            <span class="k-token">${ev.token}</span>
            <span class="k-pkg">${ev.pkg}</span>
            <span class="k-dur">${ev.dur || ev.note || ''}</span>
        `;
        kernelStreamLog.appendChild(row);
        kernelStreamLog.scrollTop = kernelStreamLog.scrollHeight;

        if (ev.yt) accumulatedYtSec += ev.yt;
        if (ev.ig) accumulatedIgSec += ev.ig;
        if (ev.swipe) accumulatedSwipes += ev.swipe;

        const totalSec = accumulatedYtSec + accumulatedIgSec;
        const tMins = Math.floor(totalSec / 60);
        const ytMins = Math.floor(accumulatedYtSec / 60);
        const igMins = Math.floor(accumulatedIgSec / 60);

        if (aggTotalForeground) aggTotalForeground.textContent = `${Math.floor(tMins / 60)}h ${tMins % 60}m`;
        if (aggYtTime) aggYtTime.textContent = `${Math.floor(ytMins / 60)}h ${ytMins % 60}m`;
        if (aggIgTime) aggIgTime.textContent = `${Math.floor(igMins / 60)}h ${igMins % 60}m`;
        if (aggSwipeTally) aggSwipeTally.textContent = `${accumulatedSwipes} Swipes`;

        kernelStepIndex++;
    }

    if (btnStepKernelEvent) btnStepKernelEvent.addEventListener('click', stepKernelEvent);

    if (btnAutoPlayKernel) {
        btnAutoPlayKernel.addEventListener('click', () => {
            if (kernelAutoPlayInterval) {
                clearInterval(kernelAutoPlayInterval);
                kernelAutoPlayInterval = null;
                btnAutoPlayKernel.textContent = 'Auto-Play Trace';
            } else {
                btnAutoPlayKernel.textContent = 'Pause Trace';
                kernelAutoPlayInterval = setInterval(() => {
                    if (kernelStepIndex < kernelEventsTrace.length) {
                        stepKernelEvent();
                    } else {
                        clearInterval(kernelAutoPlayInterval);
                        kernelAutoPlayInterval = null;
                        btnAutoPlayKernel.textContent = 'Trace Complete';
                    }
                }, 800);
            }
        });
    }

    if (btnResetKernel) {
        btnResetKernel.addEventListener('click', () => {
            if (kernelAutoPlayInterval) clearInterval(kernelAutoPlayInterval);
            kernelAutoPlayInterval = null;
            kernelStepIndex = 0;
            accumulatedYtSec = 0;
            accumulatedIgSec = 0;
            accumulatedSwipes = 0;
            if (kernelStreamLog) kernelStreamLog.innerHTML = '';
            if (aggTotalForeground) aggTotalForeground.textContent = '0h 00m';
            if (aggYtTime) aggYtTime.textContent = '0h 00m';
            if (aggIgTime) aggIgTime.textContent = '0h 00m';
            if (aggSwipeTally) aggSwipeTally.textContent = '0 Swipes';
            if (btnAutoPlayKernel) btnAutoPlayKernel.textContent = 'Auto-Play Trace';
        });
    }

    // ========================================================
    // 9. PAGE 7: STEP COUNTER, BEDTIME & PRODUCTO AI
    // ========================================================
    const sliderSteps = document.getElementById('sliderSteps');
    const valStepCount = document.getElementById('valStepCount');
    const valStepDist = document.getElementById('valStepDist');
    const valStepCal = document.getElementById('valStepCal');

    if (sliderSteps) {
        sliderSteps.addEventListener('input', () => {
            const steps = parseInt(sliderSteps.value, 10);
            if (valStepCount) valStepCount.textContent = `${steps.toLocaleString()} Steps`;
            const km = (steps * 0.00075).toFixed(1);
            const cal = Math.round(steps * 0.042);
            if (valStepDist) valStepDist.textContent = `${km} km`;
            if (valStepCal) valStepCal.textContent = `${cal} kcal`;
        });
    }

    const sliderBedtime = document.getElementById('sliderBedtime');
    const valBedtimeClock = document.getElementById('valBedtimeClock');
    const bedtimeStatusBanner = document.getElementById('bedtimeStatusBanner');
    const bedtimeStatusText = document.getElementById('bedtimeStatusText');

    if (sliderBedtime) {
        sliderBedtime.addEventListener('input', () => {
            const totalMins = parseInt(sliderBedtime.value, 10);
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            if (valBedtimeClock) valBedtimeClock.textContent = timeStr;

            // Bedtime target is 23:00 (1380 mins). Barrier engages at 22:45 (1365 mins).
            if (totalMins >= 1365) {
                if (bedtimeStatusBanner) bedtimeStatusBanner.classList.add('active');
                if (bedtimeStatusText) bedtimeStatusText.textContent = `Bedtime Shield Engaged (${timeStr})! Warm circadian overlay active. Wake alarm armed for 07:00 (RTC_WAKEUP).`;
            } else {
                if (bedtimeStatusBanner) bedtimeStatusBanner.classList.remove('active');
                if (bedtimeStatusText) bedtimeStatusText.textContent = `Bedtime Shield: Standing by (Engages at 22:45 • Current: ${timeStr})`;
            }
        });
    }

    // Producto AI Prompts
    const aiPromptBtns = document.querySelectorAll('.ai-prompt-btn');
    const aiResponseText = document.getElementById('aiResponseText');

    const aiResponses = {
        chunk: `
            <p><strong>Actionable Day Planner Import:</strong> I have broken your 4-chapter Operating Systems exam into 30-minute intervals:</p>
            <ul>
                <li><strong>09:00 &ndash; 10:30:</strong> Chapter 1 & 2: Process Scheduling & Inter-Process Communication (3 slots • +150 AP)</li>
                <li><strong>10:30 &ndash; 11:00:</strong> 30m Mental Refresh: Hydration & Light Walk (1 slot)</li>
                <li><strong>11:00 &ndash; 12:30:</strong> Chapter 3: Virtual Memory & Page Replacement Algorithms (3 slots • +150 AP)</li>
                <li><strong>14:00 &ndash; 15:30:</strong> Chapter 4: File Systems & Concurrency Locks (3 slots • +150 AP)</li>
            </ul>
            <p><em>Click "Preset Focus" in Module 1 to sync these blocks directly to Android AlarmManager.</em></p>
        `,
        fatigue: `
            <p><strong>Cognitive Fatigue Debrief:</strong> 4 continuous hours of cognitive exertion without movement causes neural glucose depletion.</p>
            <ul>
                <li><strong>Immediate Step:</strong> Step away from all digital screens for 20 minutes.</li>
                <li><strong>Biomechanics:</strong> Perform 10 light shoulder dislocations and drink 400ml water.</li>
                <li><strong>Recovery Allocation:</strong> Net AP model rewards a 30-minute workout now with <strong>+120 AP</strong>, resetting cognitive attention before the next block.</li>
            </ul>
        `,
        balance: `
            <p><strong>Circadian Balance Strategy:</strong> Balancing heavy mathematics with physical exercise preserves cognitive retention:</p>
            <ul>
                <li><strong>08:30 &ndash; 11:30:</strong> Calculus Module 1: Multivariable Integrals (Fresh cognitive peak • +300 AP)</li>
                <li><strong>11:30 &ndash; 12:30:</strong> PulseFit Workout: Resistance training (Metabolic activation • +120 AP)</li>
                <li><strong>14:00 &ndash; 17:00:</strong> Calculus Module 2: Stokes' & Green's Theorems (+300 AP)</li>
                <li><strong>22:45:</strong> Bedtime Shield engages to guarantee 8 hours of hippocampal memory consolidation.</li>
            </ul>
        `
    };

    aiPromptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            aiPromptBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const key = btn.dataset.prompt;
            if (aiResponseText && aiResponses[key]) {
                aiResponseText.innerHTML = aiResponses[key];
            }
        });
    });

    if (aiResponseText && aiResponses.chunk) {
        aiResponseText.innerHTML = aiResponses.chunk;
    }

    // ========================================================
    // 10. PAGE 8: MATHEMATICAL NET AP EVALUATION SANDBOX
    // ========================================================
    const sliderAcad = document.getElementById('sliderAcad');
    const sliderHealth = document.getElementById('sliderHealth');
    const sliderOther = document.getElementById('sliderOther');
    const sliderScreen = document.getElementById('sliderScreen');
    const sliderTasks = document.getElementById('sliderTasks');

    const valAcadHours = document.getElementById('valAcadHours');
    const valHealthHours = document.getElementById('valHealthHours');
    const valOtherHours = document.getElementById('valOtherHours');
    const valScreenHours = document.getElementById('valScreenHours');
    const valTasksCount = document.getElementById('valTasksCount');

    const calcScoreTotal = document.getElementById('calcScoreTotal');
    const calcScoreTier = document.getElementById('calcScoreTier');
    const calcDiagnosticText = document.getElementById('calcDiagnosticText');

    const bdAcad = document.getElementById('bdAcad');
    const bdHealth = document.getElementById('bdHealth');
    const bdOther = document.getElementById('bdOther');
    const bdScreen = document.getElementById('bdScreen');
    const bdTasks = document.getElementById('bdTasks');

    function calculateNetAP() {
        if (!sliderAcad || !sliderHealth || !sliderOther || !sliderScreen || !sliderTasks) return;

        const hAcad = parseFloat(sliderAcad.value);
        const hHealth = parseFloat(sliderHealth.value);
        const hOther = parseFloat(sliderOther.value);
        const hScreen = parseFloat(sliderScreen.value);
        const nTasks = parseInt(sliderTasks.value, 10);

        if (valAcadHours) valAcadHours.textContent = `${hAcad.toFixed(1)} hrs`;
        if (valHealthHours) valHealthHours.textContent = `${hHealth.toFixed(1)} hrs`;
        if (valOtherHours) valOtherHours.textContent = `${hOther.toFixed(1)} hrs`;
        if (valScreenHours) valScreenHours.textContent = `${hScreen.toFixed(1)} hrs`;
        if (valTasksCount) valTasksCount.textContent = `${nTasks} Tasks`;

        const ptsAcad = Math.round(100 * hAcad);
        const ptsHealth = (hHealth > 0) ? Math.round(150 - (30 * hHealth)) : 0;
        const ptsOther = Math.round(50 * hOther);
        const penScreen = (hScreen > 0) ? Math.round(50 + (50 * hScreen)) : 0;
        const bnsTasks = Math.round(50 * nTasks);

        const totalNetAP = ptsAcad + ptsHealth + ptsOther - penScreen + bnsTasks;

        if (bdAcad) bdAcad.textContent = `+${ptsAcad} AP`;
        if (bdHealth) bdHealth.textContent = `+${ptsHealth} AP`;
        if (bdOther) bdOther.textContent = `+${ptsOther} AP`;
        if (bdScreen) bdScreen.textContent = `-${penScreen} AP`;
        if (bdTasks) bdTasks.textContent = `+${bnsTasks} AP`;

        if (calcScoreTotal) calcScoreTotal.textContent = totalNetAP;

        let tier = 'NOVICE OPERATIVE';
        let tierColor = '#64748B';
        let diagText = '';

        if (totalNetAP >= 480) {
            tier = 'TITANIUM / LEGEND OPERATIVE';
            tierColor = '#0284C7';
            diagText = 'Calculated Tier: Exceptional daily execution. Deep academic study and completed planner tasks easily offset modest entertainment consumption.';
        } else if (totalNetAP >= 300) {
            tier = 'DISCIPLINED OPERATIVE';
            tierColor = '#16A34A';
            diagText = 'Calculated Tier: Strong daily balance. Core academic focus achieved alongside physical exercise. Ready to climb to Titanium tier.';
        } else if (totalNetAP >= 150) {
            tier = 'FOCUSED OPERATIVE';
            tierColor = '#D97706';
            diagText = 'Calculated Tier: Baseline academic requirements met. Increase structured study blocks and cap evening screen scrolling to boost score.';
        } else {
            tier = 'NOVICE OPERATIVE';
            tierColor = '#DC2626';
            diagText = 'Calculated Tier: Screen time heavily outweighs productive blocks. Significant dopamine leakage detected; engage 1-Reel Grace Rule.';
        }

        if (calcScoreTier) {
            calcScoreTier.textContent = tier;
            calcScoreTier.style.color = tierColor;
            calcScoreTier.style.borderColor = tierColor;
        }

        if (calcDiagnosticText) calcDiagnosticText.textContent = diagText;
    }

    [sliderAcad, sliderHealth, sliderOther, sliderScreen, sliderTasks].forEach(slider => {
        if (slider) slider.addEventListener('input', calculateNetAP);
    });

    // Scenario Presets
    const btnScenarioTitanium = document.getElementById('btnScenarioTitanium');
    const btnScenarioDisciplined = document.getElementById('btnScenarioDisciplined');
    const btnScenarioFocused = document.getElementById('btnScenarioFocused');
    const btnScenarioDoomscroll = document.getElementById('btnScenarioDoomscroll');
    const btnScenarioOvertraining = document.getElementById('btnScenarioOvertraining');

    function loadScenario(acad, health, other, screen, tasks) {
        if (sliderAcad) sliderAcad.value = acad;
        if (sliderHealth) sliderHealth.value = health;
        if (sliderOther) sliderOther.value = other;
        if (sliderScreen) sliderScreen.value = screen;
        if (sliderTasks) sliderTasks.value = tasks;
        calculateNetAP();
    }

    if (btnScenarioTitanium) btnScenarioTitanium.addEventListener('click', () => loadScenario(5.0, 1.5, 1.0, 1.0, 4));
    if (btnScenarioDisciplined) btnScenarioDisciplined.addEventListener('click', () => loadScenario(3.5, 1.0, 1.0, 2.0, 3));
    if (btnScenarioFocused) btnScenarioFocused.addEventListener('click', () => loadScenario(2.5, 0.5, 0.5, 2.5, 2));
    if (btnScenarioDoomscroll) btnScenarioDoomscroll.addEventListener('click', () => loadScenario(1.0, 0.0, 0.0, 5.0, 0));
    if (btnScenarioOvertraining) btnScenarioOvertraining.addEventListener('click', () => loadScenario(1.5, 3.5, 0.0, 2.0, 1));

    calculateNetAP();

    // ========================================================
    // 11. EXAMINER DEFENSE ACCORDION
    // ========================================================
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isOpen = item.classList.contains('open');

            // Close other items
            document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));

            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });

});
