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
    }
};

window.NativeBridge = NativeBridge;
