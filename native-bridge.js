// --- 📱 PRODUCTIVITY METER NATIVE ANDROID BRIDGE ---
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

    stopFocusSession: () => {
        try {
            if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge.stopFocusSession) {
                window.AndroidBridge.stopFocusSession();
            }
        } catch (e) {}
    },

    setDistractionBlockerMasterEnabled: (enabled) => {
        try {
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
        return false;
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
