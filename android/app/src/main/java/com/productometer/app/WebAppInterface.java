package com.productometer.app;

import android.app.AlarmManager;
import android.app.AppOpsManager;
import android.app.PendingIntent;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class WebAppInterface {

    private final Context context;

    public WebAppInterface(Context context) {
        this.context = context.getApplicationContext();
    }

    /**
     * Confirms to web JavaScript that it is running inside the native Android App wrapper.
     */
    @JavascriptInterface
    public boolean isNativeApp() {
        return true;
    }

    /**
     * Native haptic feedback trigger for buttons and clock drums.
     */
    @JavascriptInterface
    public void vibrate(long milliseconds) {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(milliseconds);
                }
            }
        } catch (Exception ignored) {}
    }

    /**
     * Displays a native Android toast notification.
     */
    @JavascriptInterface
    public void showToast(String message) {
        try {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {}
    }

    /**
     * Reads hardware step count measured by device step sensor.
     */
    @JavascriptInterface
    public int getStepCount() {
        return MainActivity.liveStepCount;
    }

    /**
     * Resets hardware step counter for a new workout/running session.
     */
    @JavascriptInterface
    public void resetStepCount() {
        MainActivity.resetSteps();
    }

    /**
     * Silences any active alarm ringtone immediately.
     */
    @JavascriptInterface
    public void stopAlarm() {
        AlarmReceiver.stopAlarm();
    }

    /**
     * Checks if the user has granted PACKAGE_USAGE_STATS permission for Digital Wellbeing stats.
     */
    @JavascriptInterface
    public boolean hasUsageStatsPermission() {
        try {
            AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
            if (appOps != null) {
                int mode;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    mode = appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.getPackageName());
                } else {
                    mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.getPackageName());
                }
                if (mode == AppOpsManager.MODE_ALLOWED) return true;
            }

            // Secondary check: query small slice to see if system permits usage stats
            UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm != null) {
                long now = System.currentTimeMillis();
                List<UsageStats> list = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 60000L, now);
                if (list != null && !list.isEmpty()) return true;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Opens Android System Settings directly to the Usage Access configuration screen.
     */
    @JavascriptInterface
    public void openUsageAccessSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            showToast("Please enable Usage Access in Settings");
        }
    }

    /**
     * Resolves human-readable clean application labels rather than raw package IDs.
     */
    private String getFriendlyAppName(PackageManager pm, String pkgName) {
        if (pkgName == null) return "Unknown";
        switch (pkgName) {
            case "com.google.android.youtube": return "YouTube";
            case "com.whatsapp": return "WhatsApp";
            case "com.instagram.android": return "Instagram";
            case "com.facebook.katana": return "Facebook";
            case "com.facebook.orca": return "Messenger";
            case "com.android.chrome": return "Google Chrome";
            case "com.google.android.apps.messaging": return "Messages";
            case "com.google.android.gm": return "Gmail";
            case "com.google.android.apps.maps": return "Google Maps";
            case "com.spotify.music": return "Spotify";
            case "com.snapchat.android": return "Snapchat";
            case "com.twitter.android": return "X (Twitter)";
            case "org.telegram.messenger": return "Telegram";
            case "com.netflix.mediaclient": return "Netflix";
            case "com.reddit.frontpage": return "Reddit";
            case "com.google.android.apps.photos": return "Google Photos";
            case "com.google.android.apps.docs": return "Google Drive";
            case "com.google.android.calendar": return "Google Calendar";
            case "com.google.android.deskclock": return "Clock";
            case "com.google.android.calculator": return "Calculator";
        }

        try {
            ApplicationInfo appInfo = pm.getApplicationInfo(pkgName, 0);
            String label = pm.getApplicationLabel(appInfo).toString();
            if (label != null && !label.trim().isEmpty() && !label.equals(pkgName)) {
                return label;
            }
        } catch (Exception ignored) {}

        try {
            String[] segments = pkgName.split("\\.");
            if (segments.length > 0) {
                String segment = segments[segments.length - 1];
                if (segment.equalsIgnoreCase("android") && segments.length > 1) {
                    segment = segments[segments.length - 2];
                }
                if (segment.length() > 0) {
                    return Character.toUpperCase(segment.charAt(0)) + segment.substring(1).replace("_", " ");
                }
            }
        } catch (Exception ignored) {}

        return pkgName;
    }

    /**
     * Queries actual daily app screen time from Android UsageStatsManager (from 00:00 midnight to now).
     * Returns a JSON array of real apps with clean label, package name, and foreground seconds.
     */
    /**
     * Extracts an application's native icon as a compact Base64 PNG data URL.
     */
    private String getAppIconBase64(PackageManager pm, String pkgName) {
        try {
            Drawable drawable = pm.getApplicationIcon(pkgName);
            if (drawable == null) return null;

            int w = drawable.getIntrinsicWidth() > 0 ? drawable.getIntrinsicWidth() : 96;
            int h = drawable.getIntrinsicHeight() > 0 ? drawable.getIntrinsicHeight() : 96;
            w = Math.min(Math.max(w, 48), 192);
            h = Math.min(Math.max(h, 48), 192);

            Bitmap bitmap;
            if (drawable instanceof BitmapDrawable) {
                bitmap = ((BitmapDrawable) drawable).getBitmap();
            } else {
                bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                drawable.draw(canvas);
            }
            if (bitmap == null) return null;

            // Scale to 64x64 for crystal-clear retina rendering
            Bitmap scaled = Bitmap.createScaledBitmap(bitmap, 64, 64, true);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            scaled.compress(Bitmap.CompressFormat.PNG, 90, baos);
            byte[] bytes = baos.toByteArray();
            return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
        } catch (Exception ignored) {
            return null;
        }
    }

    /**
     * Queries actual daily app screen time from Android UsageStatsManager (ground truth).
     * Accurately tracks multi-activity transitions, screen locks, and daily aggregations.
     */
    @JavascriptInterface
    public String getRealAppUsageStats() {
        try {
            if (!hasUsageStatsPermission()) {
                return "[]";
            }

            UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
            if (usageStatsManager == null) return "[]";

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startOfDay = calendar.getTimeInMillis();
            long now = System.currentTimeMillis();

            PackageManager pm = context.getPackageManager();
            Map<String, Long> foregroundTimeMap = new HashMap<>();

            // 1. Primary Engine: UsageEvents stream with activity ref-counting & screen state awareness
            try {
                // Look back 2 hours before midnight to capture ongoing sessions starting yesterday
                long queryStart = startOfDay - (2 * 3600 * 1000L);
                UsageEvents events = usageStatsManager.queryEvents(queryStart, now);
                
                Map<String, Integer> activeActivityCounts = new HashMap<>();
                Map<String, Long> packageFirstResumedTimes = new HashMap<>();
                UsageEvents.Event event = new UsageEvents.Event();

                while (events != null && events.hasNextEvent()) {
                    events.getNextEvent(event);
                    String pkg = event.getPackageName();
                    int type = event.getEventType();
                    long time = event.getTimeStamp();

                    if (type == UsageEvents.Event.ACTIVITY_RESUMED || type == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        int count = activeActivityCounts.containsKey(pkg) ? activeActivityCounts.get(pkg) : 0;
                        if (count == 0) {
                            packageFirstResumedTimes.put(pkg, Math.max(time, startOfDay));
                        }
                        activeActivityCounts.put(pkg, count + 1);
                    } else if (type == UsageEvents.Event.ACTIVITY_PAUSED || type == UsageEvents.Event.ACTIVITY_STOPPED || type == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                        int count = activeActivityCounts.containsKey(pkg) ? activeActivityCounts.get(pkg) : 0;
                        count = Math.max(0, count - 1);
                        if (count == 0) {
                            activeActivityCounts.remove(pkg);
                            Long openTime = packageFirstResumedTimes.remove(pkg);
                            if (openTime != null && time > openTime) {
                                long effectiveStart = Math.max(openTime, startOfDay);
                                if (time > effectiveStart) {
                                    long delta = time - effectiveStart;
                                    long current = foregroundTimeMap.containsKey(pkg) ? foregroundTimeMap.get(pkg) : 0L;
                                    foregroundTimeMap.put(pkg, current + delta);
                                }
                            }
                        } else {
                            activeActivityCounts.put(pkg, count);
                        }
                    } else if (type == UsageEvents.Event.SCREEN_NON_INTERACTIVE || type == UsageEvents.Event.KEYGUARD_SHOWN) {
                        // Phone screen locked or turned off: commit any open foreground session
                        for (Map.Entry<String, Long> entry : packageFirstResumedTimes.entrySet()) {
                            long effectiveStart = Math.max(entry.getValue(), startOfDay);
                            if (time > effectiveStart) {
                                long delta = time - effectiveStart;
                                long current = foregroundTimeMap.containsKey(entry.getKey()) ? foregroundTimeMap.get(entry.getKey()) : 0L;
                                foregroundTimeMap.put(entry.getKey(), current + delta);
                            }
                        }
                        packageFirstResumedTimes.clear();
                        activeActivityCounts.clear();
                    }
                }

                // Add time for any app currently active in foreground right now
                for (Map.Entry<String, Long> entry : packageFirstResumedTimes.entrySet()) {
                    long effectiveStart = Math.max(entry.getValue(), startOfDay);
                    long delta = now - effectiveStart;
                    if (delta > 0 && delta < 12 * 3600 * 1000L) {
                        long current = foregroundTimeMap.containsKey(entry.getKey()) ? foregroundTimeMap.get(entry.getKey()) : 0L;
                        foregroundTimeMap.put(entry.getKey(), current + delta);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            // 2. Official Android Daily Aggregator Baseline:
            try {
                Map<String, UsageStats> aggregated = usageStatsManager.queryAndAggregateUsageStats(startOfDay, now);
                if (aggregated != null && !aggregated.isEmpty()) {
                    for (Map.Entry<String, UsageStats> entry : aggregated.entrySet()) {
                        long fg = entry.getValue().getTotalTimeInForeground();
                        if (fg > 0) {
                            long current = foregroundTimeMap.containsKey(entry.getKey()) ? foregroundTimeMap.get(entry.getKey()) : 0L;
                            foregroundTimeMap.put(entry.getKey(), Math.max(current, fg));
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            // 3. Multi-slice sum aggregation over queryUsageStats (handles device reboots):
            try {
                List<UsageStats> statsList = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now);
                if (statsList != null && !statsList.isEmpty()) {
                    Map<String, Long> summedSlices = new HashMap<>();
                    for (UsageStats stat : statsList) {
                        long fg = stat.getTotalTimeInForeground();
                        if (fg > 0) {
                            summedSlices.put(stat.getPackageName(), (summedSlices.containsKey(stat.getPackageName()) ? summedSlices.get(stat.getPackageName()) : 0L) + fg);
                        }
                    }
                    for (Map.Entry<String, Long> entry : summedSlices.entrySet()) {
                        long current = foregroundTimeMap.containsKey(entry.getKey()) ? foregroundTimeMap.get(entry.getKey()) : 0L;
                        foregroundTimeMap.put(entry.getKey(), Math.max(current, entry.getValue()));
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            // Determine default home launcher to filter out home screen wallpaper time
            String defaultLauncherPkg = "";
            try {
                Intent homeIntent = new Intent(Intent.ACTION_MAIN);
                homeIntent.addCategory(Intent.CATEGORY_HOME);
                ResolveInfo defaultLauncher = pm.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY);
                if (defaultLauncher != null && defaultLauncher.activityInfo != null) {
                    defaultLauncherPkg = defaultLauncher.activityInfo.packageName;
                }
            } catch (Exception ignored) {}

            JSONArray jsonArray = new JSONArray();

            for (Map.Entry<String, Long> entry : foregroundTimeMap.entrySet()) {
                String pkgName = entry.getKey();
                long totalForegroundMs = entry.getValue();

                // Skip system internal daemons, default launcher, and productometer itself
                if (totalForegroundMs < 1000L) continue;
                if (pkgName.equals("com.android.systemui") || pkgName.equals("android")) continue;
                if (pkgName.equals(context.getPackageName())) continue;
                if (!defaultLauncherPkg.isEmpty() && pkgName.equals(defaultLauncherPkg)) continue;

                String appLabel = getFriendlyAppName(pm, pkgName);
                String iconBase64 = getAppIconBase64(pm, pkgName);

                JSONObject obj = new JSONObject();
                obj.put("packageName", pkgName);
                obj.put("appName", appLabel);
                obj.put("totalSeconds", totalForegroundMs / 1000L);
                obj.put("minutes", Math.round(totalForegroundMs / 60000f));
                if (iconBase64 != null) {
                    obj.put("iconBase64", iconBase64);
                }

                // Smart default category tagging
                String lower = (pkgName + " " + appLabel).toLowerCase();
                boolean isProd = lower.contains("study") || lower.contains("learn") || lower.contains("doc") || 
                                 lower.contains("pdf") || lower.contains("book") || lower.contains("productivity") ||
                                 lower.contains("school") || lower.contains("calculator") || lower.contains("notes") ||
                                 lower.contains("productometer") || lower.contains("drive") || lower.contains("classroom") ||
                                 lower.contains("code") || lower.contains("term") || lower.contains("sheet");
                obj.put("category", isProd ? "productivity" : "others");

                jsonArray.put(obj);
            }

            return jsonArray.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return "[]";
        }
    }

    /**
     * Synchronizes user's blocked applications list into SharedPreferences for ShortsReelsBlockerService.
     */
    @JavascriptInterface
    public void syncBlockedApps(String jsonArrayStr) {
        try {
            JSONArray arr = new JSONArray(jsonArrayStr);
            Set<String> set = new HashSet<>();
            for (int i = 0; i < arr.length(); i++) {
                set.add(arr.getString(i));
            }
            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putStringSet("blocked_packages_set", set).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @JavascriptInterface
    public String getInstalledApps() {
        try {
            PackageManager pm = context.getPackageManager();
            Intent intent = new Intent(Intent.ACTION_MAIN, null);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);

            List<ResolveInfo> activities = pm.queryIntentActivities(intent, 0);
            JSONArray jsonArray = new JSONArray();

            for (ResolveInfo ri : activities) {
                String pkg = ri.activityInfo.packageName;
                if (pkg.equals(context.getPackageName())) continue;

                String label = ri.loadLabel(pm).toString();
                if (label == null || label.isEmpty() || label.equals(pkg)) {
                    label = getFriendlyAppName(pm, pkg);
                }

                JSONObject obj = new JSONObject();
                obj.put("packageName", pkg);
                obj.put("appName", label);
                jsonArray.put(obj);
            }

            return jsonArray.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return "[]";
        }
    }

    /**
     * Schedules a hardware alarm via Android AlarmManager that rings even if app is closed.
     */
    @JavascriptInterface
    public void scheduleTaskAlarm(String taskId, String title, String timeStr, long triggerEpochMillis) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra("task_id", taskId);
            intent.putExtra("task_title", title);
            intent.putExtra("task_time", timeStr);

            int requestCode = taskId != null ? taskId.hashCode() : (int) System.currentTimeMillis();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerEpochMillis, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerEpochMillis, pendingIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Cancels an existing hardware alarm when a user deletes or completes a task.
     */
    @JavascriptInterface
    public void cancelTaskAlarm(String taskId) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null || taskId == null) return;

            Intent intent = new Intent(context, AlarmReceiver.class);
            int requestCode = taskId.hashCode();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }
        } catch (Exception ignored) {}
    }

    /**
     * Launches the foreground FocusService ticker.
     */
    @JavascriptInterface
    public void startFocusSession(String title, long durationSeconds) {
        try {
            Intent serviceIntent = new Intent(context, FocusService.class);
            serviceIntent.putExtra("task_title", title);
            serviceIntent.putExtra("duration_seconds", durationSeconds);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Terminates the foreground countdown service.
     */
    @JavascriptInterface
    public void stopFocusSession() {
        try {
            Intent serviceIntent = new Intent(context, FocusService.class);
            context.stopService(serviceIntent);
        } catch (Exception ignored) {}
    }

    /**
     * Checks if the Productometer Accessibility Service (Doomscroll Guardian) is active.
     */
    @JavascriptInterface
    public boolean isAccessibilityServiceEnabled() {
        if (ShortsReelsBlockerService.isServiceRunning) return true;
        try {
            int accessibilityEnabled = Settings.Secure.getInt(
                    context.getContentResolver(),
                    Settings.Secure.ACCESSIBILITY_ENABLED
            );
            if (accessibilityEnabled == 1) {
                String services = Settings.Secure.getString(
                        context.getContentResolver(),
                        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                );
                if (services != null && services.contains(context.getPackageName())) {
                    return true;
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    /**
     * Opens Android Accessibility Settings page directly so user can enable Doomscroll Guardian.
     */
    @JavascriptInterface
    public void openAccessibilitySettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Sets Shorts blocking rule preference.
     */
    @JavascriptInterface
    public void setShortsBlockerEnabled(boolean enabled) {
        SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(ShortsReelsBlockerService.KEY_SHORTS_ENABLED, enabled).apply();
    }

    /**
     * Sets Reels blocking rule preference.
     */
    @JavascriptInterface
    public void setReelsBlockerEnabled(boolean enabled) {
        SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(ShortsReelsBlockerService.KEY_REELS_ENABLED, enabled).apply();
    }

    @JavascriptInterface
    public boolean isShortsBlockerEnabled() {
        SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(ShortsReelsBlockerService.KEY_SHORTS_ENABLED, true);
    }

    @JavascriptInterface
    public boolean isReelsBlockerEnabled() {
        SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(ShortsReelsBlockerService.KEY_REELS_ENABLED, true);
    }

    /**
     * Opens Application Details Settings in Android (App Info page).
     * On Android 13/14, this is where users tap the top-right 3-dots (⋮) -> "Allow restricted settings"
     * to unlock Accessibility and other advanced system features for sideloaded APKs.
     */
    @JavascriptInterface
    public void openAppDetailsSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", context.getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            showToast("Open phone Settings -> Apps -> Productometer to unlock restricted settings");
        }
    }

    /**
     * Checks if Display Over Other Apps (Overlay) permission is granted.
     */
    @JavascriptInterface
    public boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }

    /**
     * Opens Display Over Other Apps permission settings screen.
     */
    @JavascriptInterface
    public void openOverlaySettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
        } catch (Exception e) {
            showToast("Please allow Display over other apps in Settings");
        }
    }
}
