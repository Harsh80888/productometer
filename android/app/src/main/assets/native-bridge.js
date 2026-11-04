// --- 📱 PRODUCTOMETER NATIVE ANDROID BRIDGE ---
const NativeBridge = {
    isAvailable: () => typeof window.AndroidBridge !== 'undefined',

    vibrate: (ms = 50) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.vibrate) {
                window.AndroidBridge.vibrate(ms);
            } else if (navigator.vibrate) {
                navigator.vibrate(ms);
            }
        } catch (e) {}
    },

    showToast: (msg) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.showToast) {
                window.AndroidBridge.showToast(msg);
            } else {
                console.log('[NativeBridge Toast]:', msg);
            }
        } catch (e) {}
    },

    // --- 🏃 HARDWARE PEDOMETER & STEP COUNTER ---
    getStepCount: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getStepCount) {
                return window.AndroidBridge.getStepCount();
            }
        } catch (e) {}
        return 0;
    },

    resetStepCount: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.resetStepCount) {
                window.AndroidBridge.resetStepCount();
            }
        } catch (e) {}
    },

    // --- 📊 ANDROID USAGE STATS & DIGITAL WELLBEING BRIDGE ---
    hasUsageStatsPermission: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.hasUsageStatsPermission) {
                return window.AndroidBridge.hasUsageStatsPermission();
            }
        } catch (e) {}
        return false;
    },

    openUsageAccessSettings: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.openUsageAccessSettings) {
                window.AndroidBridge.openUsageAccessSettings();
            } else {
                console.log('[NativeBridge]: openUsageAccessSettings called on web');
            }
        } catch (e) {}
    },

    getRealAppUsageStats: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getRealAppUsageStats) {
                const raw = window.AndroidBridge.getRealAppUsageStats();
                if (raw) return JSON.parse(raw);
            }
        } catch (e) {
            console.error('[NativeBridge] getRealAppUsageStats error:', e);
        }
        return null;
    },

    syncBlockedApps: (jsonArrayStr) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.syncBlockedApps) {
                window.AndroidBridge.syncBlockedApps(jsonArrayStr);
            }
        } catch (e) {}
    },

    setAppDailyLimit: (packageName, limitMinutes) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.setAppDailyLimit) {
                return window.AndroidBridge.setAppDailyLimit(packageName, limitMinutes);
            }
        } catch (e) {
            console.error('[NativeBridge] setAppDailyLimit error:', e);
        }
        return true;
    },

    getAppDailyLimits: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getAppDailyLimits) {
                const raw = window.AndroidBridge.getAppDailyLimits();
                if (raw) return JSON.parse(raw);
            }
        } catch (e) {
            console.error('[NativeBridge] getAppDailyLimits error:', e);
        }
        return {};
    },

    getInstalledApps: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getInstalledApps) {
                const raw = window.AndroidBridge.getInstalledApps();
                if (raw) return JSON.parse(raw);
            }
        } catch (e) {
            console.error('[NativeBridge] getInstalledApps error:', e);
        }
        return null;
    },

    // --- ⏰ HARDWARE ALARMS & FOCUS SERVICE ---
    scheduleAlarm: (taskId, title, timeStr, epochMillis) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.scheduleTaskAlarm) {
                window.AndroidBridge.scheduleTaskAlarm(taskId, title, timeStr, epochMillis);
            }
        } catch (e) {}
    },

    cancelAlarm: (taskId) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.cancelTaskAlarm) {
                window.AndroidBridge.cancelTaskAlarm(taskId);
            }
        } catch (e) {}
    },

    stopAlarm: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.stopAlarm) {
                window.AndroidBridge.stopAlarm();
            }
        } catch (e) {}
    },

    startFocusSession: (title, durationSeconds) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.startFocusSession) {
                window.AndroidBridge.startFocusSession(title, durationSeconds);
            }
        } catch (e) {}
    },

    pauseFocusSession: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.pauseFocusSession) {
                window.AndroidBridge.pauseFocusSession();
            }
        } catch (e) {}
    },

    setFocusSessionBreak: (breakSeconds) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.setFocusSessionBreak) {
                window.AndroidBridge.setFocusSessionBreak(breakSeconds);
            }
        } catch (e) {}
    },

    resumeFocusSession: (title, durationSeconds) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.resumeFocusSession) {
                window.AndroidBridge.resumeFocusSession(title, durationSeconds);
            }
        } catch (e) {}
    },

    stopFocusSession: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.stopFocusSession) {
                window.AndroidBridge.stopFocusSession();
            }
        } catch (e) {}
    },

    setBedtimeSchedule: (enabled, startStr, endStr) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.setBedtimeSchedule) {
                window.AndroidBridge.setBedtimeSchedule(enabled, startStr, endStr);
            }
        } catch (e) {}
    },

    getBedtimeSchedule: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getBedtimeSchedule) {
                const raw = window.AndroidBridge.getBedtimeSchedule();
                if (raw) return JSON.parse(raw);
            }
        } catch (e) {}
        return null;
    },

    setDistractionBlockerMasterEnabled: (enabled) => {
        try {
            localStorage.setItem('productometer_distraction_blocker_master_enabled', enabled ? 'true' : 'false');
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.setDistractionBlockerMasterEnabled) {
                window.AndroidBridge.setDistractionBlockerMasterEnabled(enabled);
            }
        } catch (e) {}
    },

    isDistractionBlockerMasterEnabled: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.isDistractionBlockerMasterEnabled) {
                return window.AndroidBridge.isDistractionBlockerMasterEnabled();
            }
        } catch (e) {}
        const val = localStorage.getItem('productometer_distraction_blocker_master_enabled');
        return val === null ? true : (val === 'true');
    },

    // --- 🌙 BEDTIME & CIRCADIAN GUARDIAN METHODS ---
    setBedtimeSchedule: (enabled, startStr, endStr) => {
        try {
            localStorage.setItem('productometer_bedtime_enabled', enabled ? 'true' : 'false');
            if (startStr) localStorage.setItem('productometer_bedtime_start', startStr);
            if (endStr) localStorage.setItem('productometer_bedtime_end', endStr);
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.setBedtimeSchedule) {
                window.AndroidBridge.setBedtimeSchedule(enabled, startStr, endStr);
            }
        } catch (e) {}
    },

    getBedtimeSchedule: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getBedtimeSchedule) {
                const res = window.AndroidBridge.getBedtimeSchedule();
                if (res) return JSON.parse(res);
            }
        } catch (e) {}
        return {
            enabled: localStorage.getItem('productometer_bedtime_enabled') !== 'false',
            start: localStorage.getItem('productometer_bedtime_start') || '22:30',
            end: localStorage.getItem('productometer_bedtime_end') || '06:30'
        };
    },

    getBedtimeDistractionMinutes: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getBedtimeDistractionMinutes) {
                return window.AndroidBridge.getBedtimeDistractionMinutes();
            }
        } catch (e) {}
        return parseInt(localStorage.getItem('bedtime_distraction_mins_mock') || '0', 10);
    },

    getBedtimeDistractionSeconds: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getBedtimeDistractionSeconds) {
                return window.AndroidBridge.getBedtimeDistractionSeconds();
            }
        } catch (e) {}
        return parseInt(localStorage.getItem('bedtime_distraction_secs_mock') || '0', 10);
    },

    getBedtimeDistractionStatus: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getBedtimeDistractionStatus) {
                const raw = window.AndroidBridge.getBedtimeDistractionStatus();
                return JSON.parse(raw);
            }
        } catch (e) {}
        return {
            isBedtimeActive: true,
            distractionSeconds: 0,
            distractionMinutes: 0,
            capMinutes: 15,
            capSeconds: 900,
            isCapExceeded: false,
            emergencyPassActive: false,
            emergencyPassRemainingSeconds: 0
        };
    },

    grantBedtimeEmergencyPass: (minutes) => {
        try {
            const until = Date.now() + (minutes * 60000);
            localStorage.setItem('bedtime_emergency_pass_until', until.toString());
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.grantBedtimeEmergencyPass) {
                window.AndroidBridge.grantBedtimeEmergencyPass(minutes);
            }
        } catch (e) {}
    },

    // --- ⏰ SMART WAKEUP ALARM HARDWARE BRIDGE ---
    scheduleSmartWakeupAlarm: (wakeTimeStr, epochMillis) => {
        try {
            localStorage.setItem('productometer_smart_alarm_enabled', 'true');
            localStorage.removeItem('wakeup_alarm_skipped_date');
            localStorage.removeItem('wakeup_mission_completed_date');
            if (wakeTimeStr) localStorage.setItem('productometer_bedtime_end', wakeTimeStr);

            if (!epochMillis && wakeTimeStr) {
                const parts = wakeTimeStr.split(':').map(Number);
                const target = new Date();
                target.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
                const now = Date.now();
                if (now >= target.getTime()) {
                    target.setDate(target.getDate() + 1);
                }
                epochMillis = target.getTime();
            }

            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.scheduleSmartWakeupAlarm) {
                if (epochMillis) {
                    window.AndroidBridge.scheduleSmartWakeupAlarm(wakeTimeStr, epochMillis);
                } else {
                    window.AndroidBridge.scheduleSmartWakeupAlarm(wakeTimeStr);
                }
            }
        } catch (e) {}
    },

    skipUpcomingAlarm: (dateStr) => {
        try {
            localStorage.setItem('wakeup_alarm_skipped_date', dateStr);
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.skipUpcomingAlarm) {
                window.AndroidBridge.skipUpcomingAlarm(dateStr);
            }
        } catch (e) {}
    },

    triggerWakeupAlarmNow: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.triggerWakeupAlarmNow) {
                window.AndroidBridge.triggerWakeupAlarmNow();
                return true;
            }
        } catch (e) {}
        return false;
    },

    cancelSmartWakeupAlarm: () => {
        try {
            localStorage.setItem('productometer_smart_alarm_enabled', 'false');
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.cancelSmartWakeupAlarm) {
                window.AndroidBridge.cancelSmartWakeupAlarm();
            }
        } catch (e) {}
    },

    getWakeupMissionStatus: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getWakeupMissionStatus) {
                const res = window.AndroidBridge.getWakeupMissionStatus();
                if (res) return JSON.parse(res);
            }
        } catch (e) {}
        const isMissionActive = localStorage.getItem('wakeup_step_mission_active') === 'true';
        const deadline = parseInt(localStorage.getItem('wakeup_step_mission_deadline') || '0', 10);
        const remainingSeconds = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
        return {
            active: isMissionActive && remainingSeconds > 0,
            targetSteps: 50,
            currentSteps: parseInt(localStorage.getItem('wakeup_mission_current_steps') || '0', 10),
            remainingSeconds: remainingSeconds,
            isCompleted: localStorage.getItem('wakeup_mission_completed') === 'true'
        };
    },

    completeWakeupStepMission: () => {
        try {
            localStorage.setItem('wakeup_step_mission_active', 'false');
            localStorage.setItem('wakeup_mission_completed', 'true');
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.completeWakeupStepMission) {
                window.AndroidBridge.completeWakeupStepMission();
            }
        } catch (e) {}
    },

    isFocusSessionOngoing: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.isFocusSessionOngoing) {
                return window.AndroidBridge.isFocusSessionOngoing();
            }
        } catch (e) {}
        return false;
    },

    // --- 🛡️ DOOMSCROLL GUARDIAN (REELS & SHORTS) ---
    isAccessibilityServiceEnabled: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.isAccessibilityServiceEnabled) {
                return window.AndroidBridge.isAccessibilityServiceEnabled();
            }
        } catch (e) {}
        return false;
    },

    openAccessibilitySettings: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.openAccessibilitySettings) {
                window.AndroidBridge.openAccessibilitySettings();
            }
        } catch (e) {}
    },

    setShortsBlockerEnabled: (enabled) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.setShortsBlockerEnabled) {
                window.AndroidBridge.setShortsBlockerEnabled(enabled);
            }
        } catch (e) {}
    },

        setYouTubeMode: (mode) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.setYouTubeMode) {
                window.AndroidBridge.setYouTubeMode(mode);
            }
            localStorage.setItem('productometer_youtube_mode', mode);
        } catch (e) {}
    },

    getYouTubeMode: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.getYouTubeMode) {
                return window.AndroidBridge.getYouTubeMode();
            }
        } catch (e) {}
        return localStorage.getItem('productometer_youtube_mode') || 'block_shorts';
    },

    setReelsBlockerEnabled: (enabled) => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.setReelsBlockerEnabled) {
                window.AndroidBridge.setReelsBlockerEnabled(enabled);
            }
        } catch (e) {}
    },

    isShortsBlockerEnabled: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.isShortsBlockerEnabled) {
                return window.AndroidBridge.isShortsBlockerEnabled();
            }
        } catch (e) {}
        return true;
    },

    isReelsBlockerEnabled: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.isReelsBlockerEnabled) {
                return window.AndroidBridge.isReelsBlockerEnabled();
            }
        } catch (e) {}
        return true;
    },

    // --- 🔑 ANDROID 13/14 RESTRICTED SETTINGS & PERMISSIONS ---
    openAppDetailsSettings: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.openAppDetailsSettings) {
                window.AndroidBridge.openAppDetailsSettings();
            }
        } catch (e) {}
    },

    openOverlaySettings: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.openOverlaySettings) {
                window.AndroidBridge.openOverlaySettings();
            }
        } catch (e) {}
    },

    hasOverlayPermission: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.hasOverlayPermission) {
                return window.AndroidBridge.hasOverlayPermission();
            }
        } catch (e) {}
        return true;
    }
};

window.NativeBridge = NativeBridge;
