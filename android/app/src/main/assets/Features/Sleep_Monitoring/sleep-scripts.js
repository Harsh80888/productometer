/**
 * ==========================================================================
 * 🌙 PRODUCTOMETER - SLEEP & BEDTIME MONITORING CONTROLLER
 * Flexible Sleep Duration · Real-time Alarm Updates · Today vs Tomorrow Skip · Distraction Switch
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM REFERENCES ---
    const inputBedtimeStart = document.getElementById('sleepInputBedtimeStart');
    const inputBedtimeEnd = document.getElementById('sleepInputBedtimeEnd');
    const targetHoursDisplay = document.getElementById('sleepTargetHoursDisplay');
    const btnSleepMinus = document.getElementById('btnSleepTargetMinus');
    const btnSleepPlus = document.getElementById('btnSleepTargetPlus');
    const targetChipsRow = document.getElementById('targetChipsRow');
    const targetSleepModeDesc = document.getElementById('targetSleepModeDesc');
    const sleepRemainingText = document.getElementById('sleepRemainingText');
    const sleepScheduleStatusBadge = document.getElementById('sleepScheduleStatusBadge');

    const toggleSmartAlarm = document.getElementById('toggleSmartWakeupAlarm');
    const smartAlarmDisplayTime = document.getElementById('smartAlarmDisplayTime');
    const smartAlarmCountdownText = document.getElementById('smartAlarmCountdownText');
    const btnSkipUpcomingAlarm = document.getElementById('btnSkipUpcomingAlarm');
    const skipAlarmBtnLabel = document.getElementById('skipAlarmBtnLabel');
    const alarmSkippedNoticeBanner = document.getElementById('alarmSkippedNoticeBanner');
    const alarmSkippedNoticeText = document.getElementById('alarmSkippedNoticeText');
    const btnResumeUpcomingAlarm = document.getElementById('btnResumeUpcomingAlarm');

    const sleepDistractionStatusBadge = document.getElementById('sleepDistractionStatusBadge');
    const sleepDistractionProgressFill = document.getElementById('sleepDistractionProgressFill');
    const sleepDistractionUsedLabel = document.getElementById('sleepDistractionUsedLabel');
    const btnTestEmergencyPass = document.getElementById('btnTestEmergencyPass');

    const toggleNightBlocker = document.getElementById('toggleNightDistractionBlocker');
    const blockerSwitchStateBadge = document.getElementById('blockerSwitchStateBadge');

    // --- 2. TIME FORMATTING HELPERS ---
    function formatTime12h(timeStr) {
        if (!timeStr) return '06:30 AM';
        const parts = timeStr.split(':').map(Number);
        const h = parts[0] || 0;
        const m = parts[1] || 0;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    }

    function formatDuration(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    }

    function calculateMinutesBetween(startStr, endStr) {
        const [sh, sm] = (startStr || '22:30').split(':').map(Number);
        const [eh, em] = (endStr || '06:30').split(':').map(Number);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff <= 0) diff += 24 * 60;
        return diff;
    }

    function addMinutesToTime(timeStr, minutesToAdd) {
        const [h, m] = (timeStr || '22:30').split(':').map(Number);
        const total = (h * 60 + m + minutesToAdd) % (24 * 60);
        const newH = Math.floor(total / 60);
        const newM = total % 60;
        return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    }

    // --- 3. UPCOMING ALARM DETERMINATION (TODAY VS TOMORROW) ---
    function getUpcomingAlarmDetails() {
        const now = new Date();
        const wakeTime = (inputBedtimeEnd ? inputBedtimeEnd.value : null)
                         || localStorage.getItem('productometer_bedtime_end')
                         || '06:30';
        const parts = wakeTime.split(':').map(Number);
        const wh = parts[0] || 0;
        const wm = parts[1] || 0;

        let target = new Date();
        target.setHours(wh, wm, 0, 0);

        let isTomorrow = false;
        if (now >= target) {
            // Alarm time today has already passed! The next upcoming alarm is tomorrow.
            target.setDate(target.getDate() + 1);
            isTomorrow = true;
        }

        const targetDateStr = `${target.getFullYear()}-${(target.getMonth() + 1).toString().padStart(2, '0')}-${target.getDate().toString().padStart(2, '0')}`;
        const dayLabel = isTomorrow ? 'Tomorrow' : 'Today';
        const dateFormatted = target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        return {
            wakeTime,
            target,
            isTomorrow,
            dayLabel,
            targetDateStr,
            dateFormatted
        };
    }

    // --- 4. STATE INITIALIZATION ---
    let bedtimeSchedule = {
        enabled: true,
        start: '22:30',
        end: '06:30'
    };

    if (window.NativeBridge && window.NativeBridge.getBedtimeSchedule) {
        const schedule = window.NativeBridge.getBedtimeSchedule();
        if (schedule) {
            bedtimeSchedule.start = schedule.start || '22:30';
            bedtimeSchedule.end = schedule.end || '06:30';
        }
    } else {
        bedtimeSchedule.start = localStorage.getItem('productometer_bedtime_start') || '22:30';
        bedtimeSchedule.end = localStorage.getItem('productometer_bedtime_end') || '06:30';
    }

    // Target sleep minutes
    let targetSleepMinutes = parseInt(localStorage.getItem('productometer_target_sleep_minutes'), 10);
    if (!targetSleepMinutes || isNaN(targetSleepMinutes)) {
        targetSleepMinutes = calculateMinutesBetween(bedtimeSchedule.start, bedtimeSchedule.end);
        localStorage.setItem('productometer_target_sleep_minutes', targetSleepMinutes.toString());
    }

    // Set initial values on input elements
    if (inputBedtimeStart) inputBedtimeStart.value = bedtimeSchedule.start;
    if (inputBedtimeEnd) inputBedtimeEnd.value = bedtimeSchedule.end;

    // --- 5. RENDER FUNCTIONS ---
    function updateTargetSleepUI() {
        if (targetHoursDisplay) {
            targetHoursDisplay.textContent = formatDuration(targetSleepMinutes);
        }

        // Highlight matching preset chip
        if (targetChipsRow) {
            targetChipsRow.querySelectorAll('.target-chip').forEach(chip => {
                const chipMins = parseInt(chip.dataset.mins, 10);
                if (chipMins === targetSleepMinutes) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });
        }

        if (targetSleepModeDesc) {
            const h = (targetSleepMinutes / 60).toFixed(1);
            targetSleepModeDesc.textContent = `Flexible sleep goal set to ${formatDuration(targetSleepMinutes)} (${h} hours).`;
        }
    }

    function updateBedtimeRemainingHUD() {
        const startVal = inputBedtimeStart ? inputBedtimeStart.value : (localStorage.getItem('productometer_bedtime_start') || '22:30');
        const endVal = inputBedtimeEnd ? inputBedtimeEnd.value : (localStorage.getItem('productometer_bedtime_end') || '06:30');
        const [sh, sm] = startVal.split(':').map(Number);
        const [eh, em] = endVal.split(':').map(Number);

        const now = new Date();
        const curMins = now.getHours() * 60 + now.getMinutes();
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        let isBedtimeNow = false;
        if (startMins <= endMins) {
            isBedtimeNow = (curMins >= startMins && curMins < endMins);
        } else {
            isBedtimeNow = (curMins >= startMins || curMins < endMins);
        }

        if (sleepRemainingText) {
            if (isBedtimeNow) {
                sleepRemainingText.textContent = `🌙 Bedtime Guardian Active: Wind-down window (Ends at ${formatTime12h(endVal)})`;
            } else {
                let minsUntil = startMins - curMins;
                if (minsUntil < 0) minsUntil += 24 * 60;
                const hUntil = Math.floor(minsUntil / 60);
                const mUntil = minsUntil % 60;
                sleepRemainingText.textContent = `Bedtime starts in ${hUntil}h ${mUntil}m (at ${formatTime12h(startVal)})`;
            }
        }

        if (sleepScheduleStatusBadge) {
            if (isBedtimeNow) {
                sleepScheduleStatusBadge.className = 'sleep-status-badge badge-purple';
                sleepScheduleStatusBadge.textContent = '🌙 Night Active';
            } else {
                sleepScheduleStatusBadge.className = 'sleep-status-badge badge-green';
                sleepScheduleStatusBadge.textContent = 'Schedule Active';
            }
        }
    }

    function updateSmartAlarmUI() {
        const upcoming = getUpcomingAlarmDetails();
        const isAlarmOn = localStorage.getItem('productometer_smart_alarm_enabled') !== 'false';

        // 1. Live display time updates immediately
        if (smartAlarmDisplayTime) {
            smartAlarmDisplayTime.textContent = formatTime12h(upcoming.wakeTime);
        }

        // 2. Toggle state
        if (toggleSmartAlarm) {
            toggleSmartAlarm.checked = isAlarmOn;
        }

        // 3. Check if upcoming alarm is skipped
        const skippedDate = localStorage.getItem('wakeup_alarm_skipped_date');
        const isUpcomingSkipped = (skippedDate === upcoming.targetDateStr);

        // 4. Update Skip Button vs Banner
        if (btnSkipUpcomingAlarm) {
            btnSkipUpcomingAlarm.style.display = isUpcomingSkipped ? 'none' : 'inline-flex';
        }
        if (skipAlarmBtnLabel) {
            skipAlarmBtnLabel.textContent = `Skip ${upcoming.dayLabel}'s Alarm (${formatTime12h(upcoming.wakeTime)})`;
        }

        if (alarmSkippedNoticeBanner) {
            alarmSkippedNoticeBanner.style.display = isUpcomingSkipped ? 'flex' : 'none';
        }
        if (alarmSkippedNoticeText) {
            alarmSkippedNoticeText.innerHTML = `⚠️ Alarm is <strong>skipped</strong> for <strong>${upcoming.dayLabel}</strong> (${upcoming.dateFormatted} at ${formatTime12h(upcoming.wakeTime)}). Resumes the next day automatically.`;
        }

        // 5. Live Countdown string
        if (smartAlarmCountdownText) {
            if (!isAlarmOn) {
                smartAlarmCountdownText.textContent = 'Alarm is turned OFF';
                smartAlarmCountdownText.style.color = '#ff3d71';
            } else if (isUpcomingSkipped) {
                smartAlarmCountdownText.textContent = `Skipped for ${upcoming.dayLabel} • Resumes next cycle at ${formatTime12h(upcoming.wakeTime)}`;
                smartAlarmCountdownText.style.color = '#ffd600';
            } else {
                const now = new Date();
                const diffMs = upcoming.target - now;
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                smartAlarmCountdownText.textContent = `Rings ${upcoming.dayLabel.toLowerCase()} in ${diffHrs}h ${diffMins}m (${formatTime12h(upcoming.wakeTime)})`;
                smartAlarmCountdownText.style.color = '#cbd5e1';
            }
        }
    }

    function updateDistractionCapUI() {
        let distMins = 0;
        if (window.NativeBridge && window.NativeBridge.getBedtimeDistractionMinutes) {
            distMins = window.NativeBridge.getBedtimeDistractionMinutes();
        } else {
            distMins = parseInt(localStorage.getItem('bedtime_distraction_mins_mock') || '0', 10);
        }

        const cap = 15;
        const pct = Math.min(100, Math.round((distMins / cap) * 100));

        if (sleepDistractionProgressFill) {
            sleepDistractionProgressFill.style.width = `${pct}%`;
            if (distMins >= cap) {
                sleepDistractionProgressFill.style.background = '#ff3d71';
            } else if (distMins >= 10) {
                sleepDistractionProgressFill.style.background = '#ffd600';
            } else {
                sleepDistractionProgressFill.style.background = '#00e676';
            }
        }

        if (sleepDistractionUsedLabel) {
            sleepDistractionUsedLabel.textContent = `${distMins}m used tonight`;
        }

        if (sleepDistractionStatusBadge) {
            if (distMins >= cap) {
                sleepDistractionStatusBadge.className = 'sleep-status-badge badge-danger';
                sleepDistractionStatusBadge.textContent = '15m Cap Exceeded';
            } else if (distMins >= 10) {
                sleepDistractionStatusBadge.className = 'sleep-status-badge badge-warn';
                sleepDistractionStatusBadge.textContent = `${distMins}m / 15m Used`;
            } else {
                sleepDistractionStatusBadge.className = 'sleep-status-badge badge-green';
                sleepDistractionStatusBadge.textContent = `${distMins}m / 15m Used`;
            }
        }
    }

    function updateBlockerSwitchUI() {
        let isMasterOn = true;
        if (window.NativeBridge && window.NativeBridge.isDistractionBlockerMasterEnabled) {
            isMasterOn = window.NativeBridge.isDistractionBlockerMasterEnabled();
        } else {
            const raw = localStorage.getItem('productometer_distraction_blocker_master_enabled');
            isMasterOn = (raw === null || raw === 'true');
        }

        if (toggleNightBlocker) {
            toggleNightBlocker.checked = isMasterOn;
        }

        if (blockerSwitchStateBadge) {
            if (isMasterOn) {
                blockerSwitchStateBadge.textContent = 'ACTIVE';
                blockerSwitchStateBadge.style.background = 'rgba(0, 230, 118, 0.15)';
                blockerSwitchStateBadge.style.color = '#00e676';
            } else {
                blockerSwitchStateBadge.textContent = 'PAUSED';
                blockerSwitchStateBadge.style.background = 'rgba(255, 214, 0, 0.15)';
                blockerSwitchStateBadge.style.color = '#ffd600';
            }
        }
    }

    // --- 6. EVENT HANDLERS ---

    // A. Bedtime Start & Wake-up Time Live Listeners ('input' & 'change')
    function handleTimeInputChange() {
        const startVal = inputBedtimeStart ? inputBedtimeStart.value : '22:30';
        const endVal = inputBedtimeEnd ? inputBedtimeEnd.value : '06:30';

        localStorage.setItem('productometer_bedtime_start', startVal);
        localStorage.setItem('productometer_bedtime_end', endVal);

        // Recalculate duration and update flexible target
        targetSleepMinutes = calculateMinutesBetween(startVal, endVal);
        localStorage.setItem('productometer_target_sleep_minutes', targetSleepMinutes.toString());

        if (window.NativeBridge && window.NativeBridge.setBedtimeSchedule) {
            window.NativeBridge.setBedtimeSchedule(true, startVal, endVal);
        }

        const isAlarmOn = localStorage.getItem('productometer_smart_alarm_enabled') !== 'false';
        if (isAlarmOn && window.NativeBridge && window.NativeBridge.scheduleSmartWakeupAlarm) {
            window.NativeBridge.scheduleSmartWakeupAlarm(endVal);
        }

        updateTargetSleepUI();
        updateBedtimeRemainingHUD();
        updateSmartAlarmUI();
    }

    if (inputBedtimeStart) {
        inputBedtimeStart.addEventListener('input', handleTimeInputChange);
        inputBedtimeStart.addEventListener('change', handleTimeInputChange);
    }

    if (inputBedtimeEnd) {
        inputBedtimeEnd.addEventListener('input', handleTimeInputChange);
        inputBedtimeEnd.addEventListener('change', handleTimeInputChange);
    }

    // B. Flexible Sleep Target Steppers
    if (btnSleepMinus) {
        btnSleepMinus.addEventListener('click', () => {
            if (targetSleepMinutes > 240) { // minimum 4 hours
                targetSleepMinutes -= 30;
                localStorage.setItem('productometer_target_sleep_minutes', targetSleepMinutes.toString());

                // Adjust Wake-Up Time automatically to match target sleep
                const startVal = inputBedtimeStart ? inputBedtimeStart.value : '22:30';
                const newEndVal = addMinutesToTime(startVal, targetSleepMinutes);
                if (inputBedtimeEnd) inputBedtimeEnd.value = newEndVal;
                localStorage.setItem('productometer_bedtime_end', newEndVal);

                if (window.NativeBridge && window.NativeBridge.setBedtimeSchedule) {
                    window.NativeBridge.setBedtimeSchedule(true, startVal, newEndVal);
                }
                if (window.NativeBridge && window.NativeBridge.scheduleSmartWakeupAlarm) {
                    window.NativeBridge.scheduleSmartWakeupAlarm(newEndVal);
                }

                updateTargetSleepUI();
                updateBedtimeRemainingHUD();
                updateSmartAlarmUI();
            }
        });
    }

    if (btnSleepPlus) {
        btnSleepPlus.addEventListener('click', () => {
            if (targetSleepMinutes < 720) { // maximum 12 hours
                targetSleepMinutes += 30;
                localStorage.setItem('productometer_target_sleep_minutes', targetSleepMinutes.toString());

                // Adjust Wake-Up Time automatically to match target sleep
                const startVal = inputBedtimeStart ? inputBedtimeStart.value : '22:30';
                const newEndVal = addMinutesToTime(startVal, targetSleepMinutes);
                if (inputBedtimeEnd) inputBedtimeEnd.value = newEndVal;
                localStorage.setItem('productometer_bedtime_end', newEndVal);

                if (window.NativeBridge && window.NativeBridge.setBedtimeSchedule) {
                    window.NativeBridge.setBedtimeSchedule(true, startVal, newEndVal);
                }
                if (window.NativeBridge && window.NativeBridge.scheduleSmartWakeupAlarm) {
                    window.NativeBridge.scheduleSmartWakeupAlarm(newEndVal);
                }

                updateTargetSleepUI();
                updateBedtimeRemainingHUD();
                updateSmartAlarmUI();
            }
        });
    }

    // C. Quick Preset Chips
    if (targetChipsRow) {
        targetChipsRow.querySelectorAll('.target-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const mins = parseInt(chip.dataset.mins, 10);
                if (!isNaN(mins)) {
                    targetSleepMinutes = mins;
                    localStorage.setItem('productometer_target_sleep_minutes', targetSleepMinutes.toString());

                    // Adjust Wake-Up Time automatically
                    const startVal = inputBedtimeStart ? inputBedtimeStart.value : '22:30';
                    const newEndVal = addMinutesToTime(startVal, targetSleepMinutes);
                    if (inputBedtimeEnd) inputBedtimeEnd.value = newEndVal;
                    localStorage.setItem('productometer_bedtime_end', newEndVal);

                    if (window.NativeBridge && window.NativeBridge.setBedtimeSchedule) {
                        window.NativeBridge.setBedtimeSchedule(true, startVal, newEndVal);
                    }

                    updateTargetSleepUI();
                    updateBedtimeRemainingHUD();
                    updateSmartAlarmUI();
                }
            });
        });
    }

    // D. Smart Alarm Master Toggle
    if (toggleSmartAlarm) {
        toggleSmartAlarm.addEventListener('change', () => {
            const isEnabled = toggleSmartAlarm.checked;
            localStorage.setItem('productometer_smart_alarm_enabled', isEnabled ? 'true' : 'false');

            const wakeTime = (inputBedtimeEnd ? inputBedtimeEnd.value : null) || localStorage.getItem('productometer_bedtime_end') || '06:30';

            if (isEnabled) {
                if (window.NativeBridge && window.NativeBridge.scheduleSmartWakeupAlarm) {
                    window.NativeBridge.scheduleSmartWakeupAlarm(wakeTime);
                }
                if (window.NativeBridge && window.NativeBridge.showToast) {
                    window.NativeBridge.showToast('⏰ Wakeup Smart Alarm Scheduled for ' + formatTime12h(wakeTime));
                }
            } else {
                if (window.NativeBridge && window.NativeBridge.cancelSmartWakeupAlarm) {
                    window.NativeBridge.cancelSmartWakeupAlarm();
                }
                if (window.NativeBridge && window.NativeBridge.showToast) {
                    window.NativeBridge.showToast('⏸️ Wakeup Smart Alarm Disabled');
                }
            }
            updateSmartAlarmUI();
        });
    }

    // E. Skip Upcoming Alarm Button (Accurate Today vs Tomorrow handling)
    if (btnSkipUpcomingAlarm) {
        btnSkipUpcomingAlarm.addEventListener('click', () => {
            const upcoming = getUpcomingAlarmDetails();
            localStorage.setItem('wakeup_alarm_skipped_date', upcoming.targetDateStr);

            if (window.NativeBridge && window.NativeBridge.cancelSmartWakeupAlarm) {
                window.NativeBridge.cancelSmartWakeupAlarm();
            }
            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast(`⏸️ ${upcoming.dayLabel}'s alarm skipped (${upcoming.dateFormatted})`);
            }
            updateSmartAlarmUI();
        });
    }

    // F. Resume Upcoming Alarm Button
    if (btnResumeUpcomingAlarm) {
        btnResumeUpcomingAlarm.addEventListener('click', () => {
            const upcoming = getUpcomingAlarmDetails();
            localStorage.removeItem('wakeup_alarm_skipped_date');

            if (window.NativeBridge && window.NativeBridge.scheduleSmartWakeupAlarm) {
                window.NativeBridge.scheduleSmartWakeupAlarm(upcoming.wakeTime);
            }
            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast(`⏰ ${upcoming.dayLabel}'s alarm resumed (${formatTime12h(upcoming.wakeTime)})`);
            }
            updateSmartAlarmUI();
        });
    }

    // G. Distraction Blocker Master Switch
    if (toggleNightBlocker) {
        toggleNightBlocker.addEventListener('change', () => {
            const isChecked = toggleNightBlocker.checked;
            localStorage.setItem('productometer_distraction_blocker_master_enabled', isChecked ? 'true' : 'false');

            if (window.NativeBridge && window.NativeBridge.setDistractionBlockerMasterEnabled) {
                window.NativeBridge.setDistractionBlockerMasterEnabled(isChecked);
            }

            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast(isChecked ? '🛡️ Distraction Blocker Enabled' : '⏸️ Distraction Blocker Paused');
            }
            updateBlockerSwitchUI();
        });
    }

    // H. Emergency Pass Test Button
    if (btnTestEmergencyPass) {
        btnTestEmergencyPass.addEventListener('click', () => {
            if (window.NativeBridge && window.NativeBridge.grantBedtimeEmergencyPass) {
                window.NativeBridge.grantBedtimeEmergencyPass(2);
            } else {
                localStorage.setItem('bedtime_emergency_pass_until', (Date.now() + 120000).toString());
            }
            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast('⏱️ 2-Minute Bedtime Emergency Pass Granted');
            } else {
                alert('2-Minute Bedtime Emergency Pass granted. Distraction blocker will exempt doomscroll apps for 2 minutes.');
            }
        });
    }

    // --- 7. INITIAL RENDER & BACKGROUND TICKER ---
    updateTargetSleepUI();
    updateBedtimeRemainingHUD();
    updateSmartAlarmUI();
    updateDistractionCapUI();
    updateBlockerSwitchUI();

    // Live ticker every 30 seconds to keep countdown and bedtime window fresh
    setInterval(() => {
        updateBedtimeRemainingHUD();
        updateSmartAlarmUI();
        updateDistractionCapUI();
    }, 30000);

    // --- 8. SIMULATOR & TESTER CONTROLLERS ---
    const btnTestSmartAlarm = document.getElementById('btnTestSmartAlarm');
    const alarmSimulatorModal = document.getElementById('alarmSimulatorModal');
    const simShakeCountDisplay = document.getElementById('simShakeCountDisplay');
    const simShakeProgressBar = document.getElementById('simShakeProgressBar');
    const btnSimulateShakeClick = document.getElementById('btnSimulateShakeClick');
    let simShakeCount = 0;

    function resetAlarmSimulator() {
        simShakeCount = 0;
        if (simShakeCountDisplay) simShakeCountDisplay.textContent = '0 / 10';
        if (simShakeProgressBar) simShakeProgressBar.style.width = '0%';
    }

    // Web Audio synthesizer siren for browser preview testing
    let browserAudioCtx = null;
    let browserSirenOsc = null;
    let browserSirenInterval = null;

    function playBrowserAlarmSiren() {
        try {
            if (!browserAudioCtx) {
                browserAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (browserAudioCtx.state === 'suspended') {
                browserAudioCtx.resume();
            }
            stopBrowserAlarmSiren();

            browserSirenOsc = browserAudioCtx.createOscillator();
            const gain = browserAudioCtx.createGain();
            browserSirenOsc.type = 'sawtooth';
            browserSirenOsc.frequency.setValueAtTime(880, browserAudioCtx.currentTime); // 880 Hz
            gain.gain.setValueAtTime(0.25, browserAudioCtx.currentTime);
            browserSirenOsc.connect(gain);
            gain.connect(browserAudioCtx.destination);
            browserSirenOsc.start();

            // Modulate pitch between 700Hz and 1100Hz every 350ms to simulate siren
            let high = false;
            browserSirenInterval = setInterval(() => {
                if (!browserSirenOsc) return;
                high = !high;
                try {
                    browserSirenOsc.frequency.setValueAtTime(high ? 1100 : 700, browserAudioCtx.currentTime);
                } catch (e) {}
            }, 350);
        } catch (e) {}
    }

    function stopBrowserAlarmSiren() {
        try {
            if (browserSirenInterval) {
                clearInterval(browserSirenInterval);
                browserSirenInterval = null;
            }
            if (browserSirenOsc) {
                browserSirenOsc.stop();
                browserSirenOsc.disconnect();
                browserSirenOsc = null;
            }
        } catch (e) {}
    }

    if (btnTestSmartAlarm) {
        btnTestSmartAlarm.addEventListener('click', () => {
            // 1. If running inside the Android APK with NativeBridge: trigger the REAL phone alarm siren!
            if (window.NativeBridge && window.NativeBridge.triggerWakeupAlarmNow) {
                const triggered = window.NativeBridge.triggerWakeupAlarmNow();
                if (triggered && window.NativeBridge.showToast) {
                    window.NativeBridge.showToast('🚨 Real Alarm Triggered! Deliver 10 Hard Shakes.');
                    return;
                }
            }

            // 2. In browser fallback: play synthesizer siren and open simulator modal
            resetAlarmSimulator();
            if (alarmSimulatorModal) alarmSimulatorModal.showModal();
            playBrowserAlarmSiren();
            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast('🚨 Smart Alarm Triggered! Deliver 10 Hard Shakes.');
            }
        });
    }

    if (alarmSimulatorModal) {
        alarmSimulatorModal.addEventListener('close', () => {
            stopBrowserAlarmSiren();
        });
    }

    if (btnSimulateShakeClick) {
        btnSimulateShakeClick.addEventListener('click', () => {
            simShakeCount++;
            if (simShakeCountDisplay) simShakeCountDisplay.textContent = `${simShakeCount} / 10`;
            if (simShakeProgressBar) simShakeProgressBar.style.width = `${Math.min(100, simShakeCount * 10)}%`;

            if (simShakeCount >= 10) {
                // Mission Phase 1 Cleared!
                stopBrowserAlarmSiren();
                const deadline = Date.now() + (15 * 60 * 1000);
                localStorage.setItem('wakeup_step_mission_active', 'true');
                localStorage.setItem('wakeup_step_mission_deadline', deadline.toString());
                localStorage.setItem('wakeup_mission_current_steps', '0');
                localStorage.setItem('wakeup_mission_completed', 'false');

                if (window.NativeBridge && window.NativeBridge.showToast) {
                    window.NativeBridge.showToast('✅ 10 Shakes Verified! Starting 50-Step Mission in Running Module.');
                }

                setTimeout(() => {
                    if (alarmSimulatorModal) alarmSimulatorModal.close();
                    window.location.href = '../Health_Tracker/index.html?section=run';
                }, 800);
            }
        });
    }

    // Bedtime Overlay Tester
    const btnTestBedtimeBlocker = document.getElementById('btnTestBedtimeBlocker');
    const bedtimeOverlayModal = document.getElementById('bedtimeOverlayModal');
    const btnOverlayTurnOnBlocker = document.getElementById('btnOverlayTurnOnBlocker');
    const btnOverlayEmergencyPass = document.getElementById('btnOverlayEmergencyPass');

    if (btnTestBedtimeBlocker && bedtimeOverlayModal) {
        btnTestBedtimeBlocker.addEventListener('click', () => {
            bedtimeOverlayModal.showModal();
        });
    }

    if (btnOverlayTurnOnBlocker) {
        btnOverlayTurnOnBlocker.addEventListener('click', () => {
            if (toggleNightBlocker) {
                toggleNightBlocker.checked = true;
                toggleNightBlocker.dispatchEvent(new Event('change'));
            }
            if (bedtimeOverlayModal) bedtimeOverlayModal.close();
            if (window.NativeBridge && window.NativeBridge.showToast) {
                window.NativeBridge.showToast('🛡️ Distraction Blocker ON: Productive phone use is now unlocked!');
            }
        });
    }

    if (btnOverlayEmergencyPass) {
        btnOverlayEmergencyPass.addEventListener('click', () => {
            if (btnTestEmergencyPass) btnTestEmergencyPass.click();
            if (bedtimeOverlayModal) bedtimeOverlayModal.close();
        });
    }

    // Ensure Alarm Clock is registered in Android AlarmManager on load
    const isAlarmEnabledInit = localStorage.getItem('productometer_smart_alarm_enabled') !== 'false';
    const initWakeTime = (inputBedtimeEnd ? inputBedtimeEnd.value : null) || localStorage.getItem('productometer_bedtime_end') || '06:30';
    if (isAlarmEnabledInit && window.NativeBridge && window.NativeBridge.scheduleSmartWakeupAlarm) {
        window.NativeBridge.scheduleSmartWakeupAlarm(initWakeTime);
    }
});

