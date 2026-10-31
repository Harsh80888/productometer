package com.productometer.app;

import android.app.AlarmManager;
import android.app.AppOpsManager;
import android.app.PendingIntent;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.os.Process;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
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
        MainActivity.liveStepCount = 0;
    }

    /**
     * Checks if the user has granted PACKAGE_USAGE_STATS permission for Digital Wellbeing stats.
     */
    @JavascriptInterface
    public boolean hasUsageStatsPermission() {
        try {
            AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
            if (appOps == null) return false;
            int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
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
    @JavascriptInterface
    public String getRealAppUsageStats() {
        try {
            if (!hasUsageStatsPermission()) {
                return null;
            }

            UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
            if (usageStatsManager == null) return null;

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startOfDay = calendar.getTimeInMillis();
            long now = System.currentTimeMillis();

            Map<String, UsageStats> statsMap = usageStatsManager.queryAndAggregateUsageStats(startOfDay, now);
            if (statsMap == null || statsMap.isEmpty()) return null;

            PackageManager pm = context.getPackageManager();
            JSONArray jsonArray = new JSONArray();

            for (Map.Entry<String, UsageStats> entry : statsMap.entrySet()) {
                UsageStats stats = entry.getValue();
                long totalForegroundMs = stats.getTotalTimeInForeground();
                if (totalForegroundMs < 60000) continue; // Skip apps with less than 1 minute usage

                String pkgName = entry.getKey();
                String appLabel = getFriendlyAppName(pm, pkgName);

                JSONObject obj = new JSONObject();
                obj.put("packageName", pkgName);
                obj.put("appName", appLabel);
                obj.put("totalSeconds", totalForegroundMs / 1000);
                obj.put("minutes", Math.round(totalForegroundMs / 60000f));
                
                // Smart default category tagging
                String lower = (pkgName + " " + appLabel).toLowerCase();
                boolean isProd = lower.contains("study") || lower.contains("learn") || lower.contains("doc") || 
                                 lower.contains("pdf") || lower.contains("book") || lower.contains("productivity") ||
                                 lower.contains("school") || lower.contains("calculator") || lower.contains("notes") ||
                                 lower.contains("productometer");
                obj.put("category", isProd ? "productivity" : "others");

                jsonArray.put(obj);
            }

            return jsonArray.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Returns all user-launchable apps installed on the device with clean names.
     */
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
}
