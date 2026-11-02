/**
 * PRODUCTOMETER SHOWCASE WEBSITE — INTERACTIVE ENGINE
 * Features:
 * 1. Ambient Particle & Cyber Grid Background
 * 2. 1-Reel Grace Rule & Interception Simulator (Audio + Countdown + Back-Action)
 * 3. 48-Slot Matrix Swipe-Paint Engine
 * 4. Net AP Formula Playground & Real-Time Canvas Curve
 * 5. Hero Phone Dynamic Telemetry
 */

document.addEventListener('DOMContentLoaded', () => {

    // ========================================================
    // 1. GLOBAL STATE & SOUND ENGINE
    // ========================================================
    let isAudioEnabled = true;
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    const audioWarningEl = document.getElementById('audioWarning');

    function toggleAudio() {
        isAudioEnabled = !isAudioEnabled;
        if (isAudioEnabled) {
            soundIcon.className = 'fa-solid fa-volume-high';
            soundToggleBtn.querySelector('.sound-label').textContent = 'Audio ON';
            soundToggleBtn.classList.add('active');
        } else {
            soundIcon.className = 'fa-solid fa-volume-xmark';
            soundToggleBtn.querySelector('.sound-label').textContent = 'Audio OFF';
            soundToggleBtn.classList.remove('active');
        }
    }

    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', toggleAudio);
    }

    // Audio synthesizer fallback using Web Audio API
    function playCyberWarningSound() {
        if (!isAudioEnabled) return;

        // Try playing native mp3 first
        if (audioWarningEl) {
            audioWarningEl.currentTime = 0;
            const playPromise = audioWarningEl.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Fallback to Web Audio Synthesizer beep
                    synthesizeCyberAlertTone();
                });
                return;
            }
        }
        synthesizeCyberAlertTone();
    }

    function synthesizeCyberAlertTone() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
            osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.35);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
            console.log('[Showcase Audio] WebAudio unavailable');
        }
    }

    // ========================================================
    // 2. HERO PHONE LIVE TELEMETRY & CLOCK
    // ========================================================
    function updateHeroClock() {
        const timeEl = document.getElementById('mockTime');
        if (!timeEl) return;
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateHeroClock();
    setInterval(updateHeroClock, 10000);

    // Hero phone mini canvas graph
    function drawHeroCanvas() {
        const canvas = document.getElementById('mockHeroCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Gradient under curve
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
        grad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

        ctx.beginPath();
        ctx.moveTo(10, h - 10);
        ctx.bezierCurveTo(w * 0.3, h - 15, w * 0.45, h * 0.4, w * 0.7, h * 0.25);
        ctx.bezierCurveTo(w * 0.85, h * 0.15, w * 0.95, h * 0.2, w - 10, 15);

        ctx.lineTo(w - 10, h);
        ctx.lineTo(10, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Glowing Line
        ctx.beginPath();
        ctx.moveTo(10, h - 10);
        ctx.bezierCurveTo(w * 0.3, h - 15, w * 0.45, h * 0.4, w * 0.7, h * 0.25);
        ctx.bezierCurveTo(w * 0.85, h * 0.15, w * 0.95, h * 0.2, w - 10, 15);

        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    drawHeroCanvas();

    // ========================================================
    // 3. SIMULATOR 01: 1-REEL GRACE RULE & INTERCEPTION
    // ========================================================
    const vpStudyView = document.getElementById('vpStudyView');
    const vpShortsView = document.getElementById('vpShortsView');
    const vpGuardianOverlay = document.getElementById('vpGuardianOverlay');
    const btnLaunchShorts = document.getElementById('btnLaunchShorts');
    const btnSwipeNextShort = document.getElementById('btnSwipeNextShort');
    const btnSimReset = document.getElementById('btnSimReset');
    const btnSimReturnNow = document.getElementById('btnSimReturnNow');
    const simCountdownNum = document.getElementById('simCountdownNum');
    const vpSwipesBadge = document.getElementById('vpSwipesBadge');
    const shortsAuthor = document.getElementById('shortsAuthor');
    const shortsCaption = document.getElementById('shortsCaption');
    const simGuardianStatus = document.getElementById('simGuardianStatus');
    const telemetryLogStream = document.getElementById('telemetryLogStream');

    let shortsCount = 0;
    let countdownInterval = null;

    function logTelemetry(type, msg) {
        if (!telemetryLogStream) return;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${timeStr}] ${msg}`;
        telemetryLogStream.appendChild(entry);
        telemetryLogStream.scrollTop = telemetryLogStream.scrollHeight;
    }

    // Launch into Shorts from study
    if (btnLaunchShorts) {
        btnLaunchShorts.addEventListener('click', () => {
            shortsCount = 1;
            vpStudyView.classList.remove('active');
            vpShortsView.classList.add('active');

            vpSwipesBadge.textContent = 'Short 1 / 1 (Grace)';
            vpSwipesBadge.style.color = '#00E676';
            vpSwipesBadge.style.borderColor = '#00E676';
            vpSwipesBadge.style.background = 'rgba(0, 230, 118, 0.2)';

            shortsAuthor.textContent = '@science_clips';
            shortsCaption.textContent = '1st Short: Grace period active! Enjoy your quick breather.';

            simGuardianStatus.className = 'sim-state-badge state-safe';
            simGuardianStatus.textContent = 'GRACE PERIOD';

            logTelemetry('info', 'Switched package to com.google.android.youtube. Shorts feed active.');
            logTelemetry('sys', '1st Short detected: Smart Grace Rule applied. No alert triggered.');
        });
    }

    // Swipe next short (triggers guardian on 2nd)
    if (btnSwipeNextShort) {
        btnSwipeNextShort.addEventListener('click', () => {
            shortsCount++;

            if (shortsCount >= 2) {
                // Trigger Guardian Interception
                vpSwipesBadge.textContent = `Short ${shortsCount} (Over Limit)`;
                vpSwipesBadge.style.color = '#FF1744';
                vpSwipesBadge.style.borderColor = '#FF1744';
                vpSwipesBadge.style.background = 'rgba(255, 23, 68, 0.2)';

                shortsAuthor.textContent = '@endless_doomscroll';
                shortsCaption.textContent = '2nd Short: Consecutive distraction detected! Guardian engaging...';

                simGuardianStatus.className = 'sim-state-badge state-interception';
                simGuardianStatus.textContent = 'INTERCEPTION ACTIVE';

                logTelemetry('alert', 'AccessibilityEvent (TYPE_VIEW_SCROLLED): Consecutive Short #2 detected!');
                logTelemetry('alert', 'WindowManager: Deploying 5-Second Doomscroll Guardian HUD.');

                playCyberWarningSound();
                showGuardianOverlay();
            }
        });
    }

    function showGuardianOverlay() {
        if (!vpGuardianOverlay) return;
        vpGuardianOverlay.classList.add('active');
        let secondsLeft = 5;
        simCountdownNum.textContent = secondsLeft;

        if (countdownInterval) clearInterval(countdownInterval);

        countdownInterval = setInterval(() => {
            secondsLeft--;
            simCountdownNum.textContent = secondsLeft;

            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
                triggerBackAction();
            }
        }, 1000);
    }

    function triggerBackAction() {
        if (countdownInterval) clearInterval(countdownInterval);
        vpGuardianOverlay.classList.remove('active');

        logTelemetry('sys', 'Executing performGlobalAction(GLOBAL_ACTION_BACK) after 250ms window sync.');
        logTelemetry('sys', 'Restoring focus to Quantum Physics lecture. Session preserved!');

        // 250ms delay replicating gesture navigation timing in ShortsReelsBlockerService
        setTimeout(() => {
            vpShortsView.classList.remove('active');
            vpStudyView.classList.add('active');

            simGuardianStatus.className = 'sim-state-badge state-safe';
            simGuardianStatus.textContent = 'STANDBY';
            shortsCount = 0;
        }, 300);
    }

    if (btnSimReturnNow) {
        btnSimReturnNow.addEventListener('click', triggerBackAction);
    }

    if (btnSimReset) {
        btnSimReset.addEventListener('click', () => {
            if (countdownInterval) clearInterval(countdownInterval);
            vpGuardianOverlay.classList.remove('active');
            vpShortsView.classList.remove('active');
            vpStudyView.classList.add('active');
            shortsCount = 0;
            simGuardianStatus.className = 'sim-state-badge state-safe';
            simGuardianStatus.textContent = 'STANDBY';
            logTelemetry('info', 'Simulator reset to initial productive focus state.');
        });
    }

    // ========================================================
    // 4. SIMULATOR 02: 48-SLOT SWIPE-PAINT MATRIX
    // ========================================================
    const matrixGridContainer = document.getElementById('matrixGridContainer');
    const matrixFillCount = document.getElementById('matrixFillCount');
    const matAcadTime = document.getElementById('matAcadTime');
    const matHealthTime = document.getElementById('matHealthTime');
    const matSleepTime = document.getElementById('matSleepTime');
    const btnClearMatrix = document.getElementById('btnClearMatrix');
    const paletteButtons = document.querySelectorAll('.palette-btn');

    let currentSelectedCategory = 'study'; // 'study', 'health', 'sleep', 'empty'
    let isMouseDownOnMatrix = false;
    const slotData = new Array(48).fill('empty');

    // Pre-populate realistic default matrix schedule
    for (let i = 0; i < 16; i++) slotData[i] = 'sleep'; // 00:00 - 08:00 (8h sleep)
    for (let i = 18; i < 24; i++) slotData[i] = 'study'; // 09:00 - 12:00 (3h study)
    for (let i = 34; i < 36; i++) slotData[i] = 'health'; // 17:00 - 18:00 (1h workout)

    function renderMatrix() {
        if (!matrixGridContainer) return;
        matrixGridContainer.innerHTML = '';

        for (let i = 0; i < 48; i++) {
            const hour = Math.floor(i / 2);
            const mins = (i % 2 === 0) ? '00' : '30';
            const timeLabel = `${String(hour).padStart(2, '0')}:${mins}`;

            const slot = document.createElement('div');
            slot.className = 'matrix-slot';
            slot.dataset.index = i;
            slot.textContent = timeLabel;

            if (slotData[i] === 'study') slot.classList.add('slot-study');
            else if (slotData[i] === 'health') slot.classList.add('slot-health');
            else if (slotData[i] === 'sleep') slot.classList.add('slot-sleep');

            // Mouse painting triggers
            slot.addEventListener('mousedown', () => {
                isMouseDownOnMatrix = true;
                paintSlot(i);
            });

            slot.addEventListener('mouseenter', () => {
                if (isMouseDownOnMatrix) paintSlot(i);
            });

            // Touch support for mobile dragging
            slot.addEventListener('touchstart', (e) => {
                isMouseDownOnMatrix = true;
                paintSlot(i);
            }, { passive: true });

            matrixGridContainer.appendChild(slot);
        }
        updateMatrixCalculations();
    }

    document.addEventListener('mouseup', () => { isMouseDownOnMatrix = false; });
    document.addEventListener('touchend', () => { isMouseDownOnMatrix = false; });

    function paintSlot(index) {
        slotData[index] = currentSelectedCategory;
        const slotEl = matrixGridContainer.querySelector(`[data-index="${index}"]`);
        if (!slotEl) return;

        slotEl.className = 'matrix-slot';
        if (currentSelectedCategory === 'study') slotEl.classList.add('slot-study');
        else if (currentSelectedCategory === 'health') slotEl.classList.add('slot-health');
        else if (currentSelectedCategory === 'sleep') slotEl.classList.add('slot-sleep');

        updateMatrixCalculations();
    }

    function updateMatrixCalculations() {
        let studySlots = 0;
        let healthSlots = 0;
        let sleepSlots = 0;
        let totalFilled = 0;

        slotData.forEach(cat => {
            if (cat === 'study') { studySlots++; totalFilled++; }
            else if (cat === 'health') { healthSlots++; totalFilled++; }
            else if (cat === 'sleep') { sleepSlots++; totalFilled++; }
        });

        if (matAcadTime) matAcadTime.textContent = `${(studySlots * 0.5).toFixed(1)} hrs`;
        if (matHealthTime) matHealthTime.textContent = `${(healthSlots * 0.5).toFixed(1)} hrs`;
        if (matSleepTime) matSleepTime.textContent = `${(sleepSlots * 0.5).toFixed(1)} hrs`;
        if (matrixFillCount) matrixFillCount.textContent = `${totalFilled}/48 Slots`;
    }

    paletteButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            paletteButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSelectedCategory = btn.dataset.cat;
        });
    });

    if (btnClearMatrix) {
        btnClearMatrix.addEventListener('click', () => {
            slotData.fill('empty');
            renderMatrix();
        });
    }

    renderMatrix();

    // ========================================================
    // 5. NET AP FORMULA PLAYGROUND & CANVAS ENGINE
    // ========================================================
    const rangeAcad = document.getElementById('rangeAcad');
    const rangeHealth = document.getElementById('rangeHealth');
    const rangeOther = document.getElementById('rangeOther');
    const rangeScreen = document.getElementById('rangeScreen');
    const rangeTasks = document.getElementById('rangeTasks');

    const readoutAcad = document.getElementById('readoutAcad');
    const readoutHealth = document.getElementById('readoutHealth');
    const readoutOther = document.getElementById('readoutOther');
    const readoutScreen = document.getElementById('readoutScreen');
    const readoutTasks = document.getElementById('readoutTasks');

    const calcBigScore = document.getElementById('calcBigScore');
    const calcRankPill = document.getElementById('calcRankPill');
    const calcRankText = document.getElementById('calcRankText');
    const calcResultCard = document.getElementById('calcResultCard');
    const calcFeedbackBanner = document.getElementById('calcFeedbackBanner');
    const calcFeedbackIcon = document.getElementById('calcFeedbackIcon');
    const calcFeedbackText = document.getElementById('calcFeedbackText');
    const calcGraphCanvas = document.getElementById('calcGraphCanvas');

    function calculateNetAP() {
        if (!rangeAcad || !rangeHealth || !rangeOther || !rangeScreen || !rangeTasks) return;

        const hAcad = parseFloat(rangeAcad.value);
        const hHealth = parseFloat(rangeHealth.value);
        const hOther = parseFloat(rangeOther.value);
        const hScreen = parseFloat(rangeScreen.value);
        const nTasks = parseInt(rangeTasks.value, 10);

        // FORMULA IMPLEMENTATION
        const acadPts = Math.round(100 * hAcad);
        const healthPts = (hHealth > 0) ? Math.round(150 - (30 * hHealth)) : 0;
        const otherPts = Math.round(50 * hOther);
        const screenPenalty = (hScreen > 0) ? Math.round(50 + (50 * hScreen)) : 0;
        const tasksBonus = Math.round(50 * nTasks);

        const totalAP = acadPts + healthPts + otherPts - screenPenalty + tasksBonus;

        // Update Slider Readouts
        readoutAcad.textContent = `${hAcad.toFixed(1)} hrs (+${acadPts} AP)`;
        readoutHealth.textContent = `${hHealth.toFixed(1)} hrs (+${healthPts} AP)`;
        readoutOther.textContent = `${hOther.toFixed(1)} hrs (+${otherPts} AP)`;
        readoutScreen.textContent = `${hScreen.toFixed(1)} hrs (-${screenPenalty} AP)`;
        readoutTasks.textContent = `${nTasks} Sessions (+${tasksBonus} AP)`;

        // Update Result Score Display
        calcBigScore.textContent = totalAP;

        // Rank Evaluation
        let rank = 'NOVICE OPERATIVE';
        let rankColor = '#94A3B8';
        if (totalAP >= 500) { rank = 'CYBER LEGEND'; rankColor = '#00E5FF'; }
        else if (totalAP >= 350) { rank = 'TITANIUM OPERATIVE'; rankColor = '#FFB300'; }
        else if (totalAP >= 200) { rank = 'DISCIPLINED'; rankColor = '#00E676'; }

        calcRankText.textContent = rank;
        calcRankPill.style.color = rankColor;
        calcRankPill.style.borderColor = rankColor;

        // STRICT RED RULE: Warning Red ONLY when excessive screen time (> 3.0h) or score is negative
        const isExcessiveScreen = hScreen >= 3.5 || (hScreen > hAcad && hScreen >= 2.5);

        if (isExcessiveScreen) {
            calcResultCard.classList.add('is-excessive');
            calcFeedbackBanner.classList.add('is-excessive');
            calcFeedbackIcon.className = 'fa-solid fa-triangle-exclamation text-crimson';
            calcFeedbackText.textContent = `Excessive Screen Time Warning: ${hScreen.toFixed(1)} hrs of non-productive consumption is severely penalizing your Net AP!`;
        } else {
            calcResultCard.classList.remove('is-excessive');
            calcFeedbackBanner.classList.remove('is-excessive');
            calcFeedbackIcon.className = 'fa-solid fa-circle-check text-emerald';
            calcFeedbackText.textContent = 'Optimal performance! Productive focus easily outpaces screen entertainment.';
        }

        drawCalculatorGraph(totalAP, isExcessiveScreen);
    }

    function drawCalculatorGraph(score, isExcessive) {
        if (!calcGraphCanvas) return;
        const ctx = calcGraphCanvas.getContext('2d');
        const w = calcGraphCanvas.width;
        const h = calcGraphCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background subtle grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 40; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 30; y < h; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Color based on performance
        const mainColor = isExcessive ? '#FF1744' : (score > 350 ? '#00E5FF' : '#00E676');
        const endY = Math.max(15, Math.min(h - 20, h - (score / 700 * (h - 35)) - 20));

        // Gradient under curve
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, isExcessive ? 'rgba(255, 23, 68, 0.35)' : 'rgba(0, 229, 255, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(15, h - 20);
        ctx.bezierCurveTo(w * 0.25, h - 25, w * 0.45, h * 0.6, w * 0.65, (h + endY) / 2);
        ctx.bezierCurveTo(w * 0.8, endY + 10, w * 0.9, endY - 5, w - 15, endY);
        ctx.lineTo(w - 15, h);
        ctx.lineTo(15, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        ctx.moveTo(15, h - 20);
        ctx.bezierCurveTo(w * 0.25, h - 25, w * 0.45, h * 0.6, w * 0.65, (h + endY) / 2);
        ctx.bezierCurveTo(w * 0.8, endY + 10, w * 0.9, endY - 5, w - 15, endY);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // End Point Glow
        ctx.beginPath();
        ctx.arc(w - 15, endY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF';
        ctx.fill();
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    [rangeAcad, rangeHealth, rangeOther, rangeScreen, rangeTasks].forEach(slider => {
        if (slider) slider.addEventListener('input', calculateNetAP);
    });

    calculateNetAP();

    // ========================================================
    // 6. AMBIENT PARTICLE BACKGROUND CANVAS
    // ========================================================
    const ambientCanvas = document.getElementById('ambientCanvas');
    if (ambientCanvas) {
        const ctx = ambientCanvas.getContext('2d');
        let width = (ambientCanvas.width = window.innerWidth);
        let height = (ambientCanvas.height = window.innerHeight);

        window.addEventListener('resize', () => {
            width = ambientCanvas.width = window.innerWidth;
            height = ambientCanvas.height = window.innerHeight;
        });

        const particles = [];
        const count = Math.floor(width / 35);

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                radius: Math.random() * 1.5 + 0.5,
                color: Math.random() > 0.4 ? 'rgba(0, 229, 255, 0.4)' : 'rgba(0, 230, 118, 0.3)'
            });
        }

        function animateParticles() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                // Connect nearby particles with subtle cyber lines
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 110) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(0, 229, 255, ${0.12 * (1 - dist / 110)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }

    // ========================================================
    // 7. MOBILE NAVIGATION DRAWER TOGGLE
    // ========================================================
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const navLinks = document.getElementById('navLinks');

    if (mobileNavToggle && navLinks) {
        mobileNavToggle.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
        });

        // Close on nav link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('mobile-open');
            });
        });
    }

});
