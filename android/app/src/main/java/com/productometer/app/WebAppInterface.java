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
import java.util.Set;
import java.util.HashSet;
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
     * Identifies if a package belongs to a game based on Android categories, flags, and known patterns.
     */
    public static boolean isGameApp(PackageManager pm, String pkgName, String appLabel) {
        try {
            ApplicationInfo appInfo = pm.getApplicationInfo(pkgName, 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (appInfo.category == ApplicationInfo.CATEGORY_GAME) {
                    return true;
                }
            }
            if ((appInfo.flags & ApplicationInfo.FLAG_IS_GAME) != 0) {
                return true;
            }
        } catch (Exception ignored) {}

        String combined = ((pkgName != null ? pkgName : "") + " " + (appLabel != null ? appLabel : "")).toLowerCase();
        return combined.contains("game") || combined.contains("chess") || combined.contains("daman") ||
               combined.contains("pubg") || combined.contains("freefire") || combined.contains("ludo") ||
               combined.contains("candycrush") || combined.contains("subway") || combined.contains("roblox") ||
               combined.contains("minecraft") || combined.contains("clash") || combined.contains("asphalt") ||
               combined.contains("bgmi") || combined.contains("fifa") || combined.contains("pes") ||
               combined.contains("supercell") || combined.contains("gameloft") || combined.contains("ea.games") ||
               combined.contains("unity3d") || combined.contains("epicgames") || combined.contains("puzzle") ||
               combined.contains("arcade") || combined.contains("casino") || combined.contains("poker") ||
               combined.contains("teenpatti");
    }

    /**
     * Determines whether an application has mandatory compulsory screen limits (FB, IG, Games).
     */
    public static boolean isCompulsoryApp(PackageManager pm, String pkgName, String appLabel, boolean isGame) {
        if (isGame) return true;
        String combined = ((pkgName != null ? pkgName : "") + " " + (appLabel != null ? appLabel : "")).toLowerCase();
        return pkgName.equals("com.facebook.katana") || pkgName.equals("com.facebook.lite") ||
               pkgName.equals("com.facebook.orca") || pkgName.equals("com.instagram.android") ||
               pkgName.equals("com.instagram.lite") || combined.contains("facebook") ||
               combined.contains("instagram");
    }

    /**
     * Authoritative daily foreground screen time helper using Android OS kernel UsageStats.
     */
    public static long getAppTodayForegroundMs(Context context, String packageName) {
        try {
            UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return 0L;

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startOfDay = calendar.getTimeInMillis();
            long now = System.currentTimeMillis();

            List<UsageStats> statsList = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now);
            if (statsList != null) {
                long total = 0L;
                for (UsageStats u : statsList) {
                    if (u != null && packageName.equals(u.getPackageName())) {
                        if (u.getLastTimeUsed() >= startOfDay || u.getLastTimeStamp() >= startOfDay) {
                            total += u.getTotalTimeInForeground();
                        }
                    }
                }
                if (total > 0) return total;
            }

            Map<String, UsageStats> map = usm.queryAndAggregateUsageStats(startOfDay, now);
            if (map != null && map.containsKey(packageName)) {
                UsageStats u = map.get(packageName);
                if (u != null) return u.getTotalTimeInForeground();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0L;
    }

    /**
     * Queries actual daily app screen time from Android UsageStatsManager (ground truth).
     * Strictly matches Android Digital Wellbeing by reading OS kernel foreground aggregations.
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

            // 1. Authoritative ground truth from UsageStatsManager daily interval
            List<UsageStats> statsList = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now);
            if (statsList != null) {
                for (UsageStats u : statsList) {
                    if (u == null) continue;
                    // Filter out buckets that ended prior to startOfDay
                    if (u.getLastTimeUsed() < startOfDay && u.getLastTimeStamp() < startOfDay) {
                        continue;
                    }
                    long fg = u.getTotalTimeInForeground();
                    if (fg > 0) {
                        long prev = foregroundTimeMap.containsKey(u.getPackageName()) ? foregroundTimeMap.get(u.getPackageName()) : 0L;
                        foregroundTimeMap.put(u.getPackageName(), prev + fg);
                    }
                }
            }

            // Fallback to queryAndAggregateUsageStats if queryUsageStats was empty
            if (foregroundTimeMap.isEmpty()) {
                Map<String, UsageStats> aggregated = usageStatsManager.queryAndAggregateUsageStats(startOfDay, now);
                if (aggregated != null) {
                    for (Map.Entry<String, UsageStats> entry : aggregated.entrySet()) {
                        UsageStats u = entry.getValue();
                        if (u.getLastTimeUsed() >= startOfDay || u.getLastTimeStamp() >= startOfDay) {
                            long fg = u.getTotalTimeInForeground();
                            if (fg > 0) {
                                foregroundTimeMap.put(entry.getKey(), fg);
                            }
                        }
                    }
                }
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

            // Load saved daily app limits
            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            String limitsJsonStr = prefs.getString("productometer_app_limits_json", "{}");
            JSONObject limitsObj = new JSONObject(limitsJsonStr);

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

                boolean isGame = isGameApp(pm, pkgName, appLabel);
                boolean isCompulsory = isCompulsoryApp(pm, pkgName, appLabel, isGame);

                // Determine limit: compulsory apps default to 30 minutes if unconfigured
                int limitMinutes = 0;
                if (limitsObj.has(pkgName)) {
                    limitMinutes = limitsObj.optInt(pkgName, 0);
                } else if (isCompulsory) {
                    limitMinutes = 30; // Default 30 min for compulsory apps (FB, IG, Games)
                }

                int usedMinutes = Math.round(totalForegroundMs / 60000f);
                boolean isFrozen = false;
                boolean isGrace = false;
                int graceRemaining = 0;
                boolean isUnchangeable = false;

                if (limitMinutes > 0) {
                    if (usedMinutes >= limitMinutes + 10) {
                        isFrozen = true;
                        isUnchangeable = true;
                    } else if (usedMinutes >= limitMinutes) {
                        isGrace = true;
                        graceRemaining = (limitMinutes + 10) - usedMinutes;
                        isUnchangeable = true;
                    }
                }

                JSONObject obj = new JSONObject();
                obj.put("packageName", pkgName);
                obj.put("appName", appLabel);
                obj.put("totalSeconds", totalForegroundMs / 1000L);
                obj.put("minutes", usedMinutes);
                obj.put("isGame", isGame);
                obj.put("isCompulsory", isCompulsory);
                obj.put("limitMinutes", limitMinutes);
                obj.put("isFrozen", isFrozen);
                obj.put("isGrace", isGrace);
                obj.put("graceRemaining", graceRemaining);
                obj.put("isUnchangeable", isUnchangeable);
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
     * Sets daily time limit for an app.
     * Enforces strict immutability if the app is currently in grace period or frozen.
     */
    @JavascriptInterface
    public boolean setAppDailyLimit(String packageName, int limitMinutes) {
        try {
            long usedMs = getAppTodayForegroundMs(context, packageName);
            int usedMinutes = Math.round(usedMs / 60000f);

            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            String currentLimitsJson = prefs.getString("productometer_app_limits_json", "{}");
            JSONObject limitsObj = new JSONObject(currentLimitsJson);

            PackageManager pm = context.getPackageManager();
            String appLabel = getFriendlyAppName(pm, packageName);
            boolean isGame = isGameApp(pm, packageName, appLabel);
            boolean isCompulsory = isCompulsoryApp(pm, packageName, appLabel, isGame);

            int currentLimit = limitsObj.optInt(packageName, isCompulsory ? 30 : 0);

            // Strict immutability rule: Cannot change or increase if in grace period or frozen!
            if (currentLimit > 0 && usedMinutes >= currentLimit) {
                return false;
            }

            // Compulsory apps cannot have 0 limit (no limit)
            if (isCompulsory && limitMinutes <= 0) {
                limitMinutes = 30;
            }

            if (limitMinutes > 0) {
                limitsObj.put(packageName, limitMinutes);
            } else {
                limitsObj.remove(packageName);
            }

            prefs.edit().putString("productometer_app_limits_json", limitsObj.toString()).apply();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Gets all configured app daily limits as a JSON map string.
     */
    @JavascriptInterface
    public String getAppDailyLimits() {
        try {
            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getString("productometer_app_limits_json", "{}");
        } catch (Exception e) {
            return "{}";
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
            ShortsReelsBlockerService.isFocusSessionOngoing = true;
            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean(ShortsReelsBlockerService.KEY_FOCUS_ACTIVE, true)
                    .putString("focus_session_title", title != null ? title : "Focus Session")
                    .putLong("focus_session_end_time", System.currentTimeMillis() + (durationSeconds * 1000L))
                    .apply();

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
     * Terminates the foreground countdown service and notifies guardian blocker.
     */
    @JavascriptInterface
    public void stopFocusSession() {
        try {
            ShortsReelsBlockerService.isFocusSessionOngoing = false;
            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean(ShortsReelsBlockerService.KEY_FOCUS_ACTIVE, false)
                    .apply();

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

    /**
     * Master Switch: Enable or disable The Distraction Blocker manually.
     */
    @JavascriptInterface
    public void setDistractionBlockerMasterEnabled(boolean enabled) {
        try {
            ShortsReelsBlockerService.isMasterBlockerEnabled = enabled;
            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean(ShortsReelsBlockerService.KEY_MASTER_ENABLED, enabled)
                    .apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Queries whether The Distraction Blocker Master Switch is currently enabled.
     */
    @JavascriptInterface
    public boolean isDistractionBlockerMasterEnabled() {
        try {
            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getBoolean(ShortsReelsBlockerService.KEY_MASTER_ENABLED, false);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Queries whether a focus session is currently ongoing.
     */
    @JavascriptInterface
    public boolean isFocusSessionOngoing() {
        try {
            if (ShortsReelsBlockerService.isFocusSessionOngoing) return true;
            SharedPreferences prefs = context.getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getBoolean(ShortsReelsBlockerService.KEY_FOCUS_ACTIVE, false);
        } catch (Exception e) {
            return false;
        }
    }
}
