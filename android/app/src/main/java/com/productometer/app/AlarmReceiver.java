package com.productometer.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

import java.util.Calendar;

public class AlarmReceiver extends BroadcastReceiver {

    public static final String PREFS_NAME = "ShortsReelsBlockerPrefs";
    private static Ringtone activeRingtone = null;

    /**
     * Silences any active alarm ringtone immediately.
     */
    public static synchronized void stopAlarm() {
        if (activeRingtone != null) {
            try {
                if (activeRingtone.isPlaying()) {
                    activeRingtone.stop();
                }
            } catch (Exception ignored) {}
            activeRingtone = null;
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String taskId = intent.getStringExtra("task_id");
        if (taskId == null) taskId = "";

        boolean isStepCheck = intent.getBooleanExtra("is_step_check", false);
        int nextGraceMins = intent.getIntExtra("next_grace_mins", 5);

        // Case 1: Step Verification Check (15-min or 5-min post-shake deadline)
        if (isStepCheck) {
            handleStepVerificationCheck(context, nextGraceMins);
            return;
        }

        // Case 2: Smart Wakeup Alarm
        if (taskId.startsWith("wakeup_smart_alarm")) {
            handleSmartWakeupAlarm(context, intent);
            return;
        }

        // Case 3: Standard planner study alarms
        handleStandardPlannerAlarm(context, intent);
    }

    private void handleSmartWakeupAlarm(Context context, Intent intent) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // 1. Check if alarm is enabled
        boolean isAlarmEnabled = prefs.getBoolean("productometer_smart_alarm_enabled", true);
        if (!isAlarmEnabled) {
            scheduleNextMorningWakeupAlarm(context);
            return;
        }

        // 2. Check if skipped for today
        Calendar c = Calendar.getInstance();
        String todayDateStr = String.format("%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
        String skippedDate = prefs.getString("wakeup_alarm_skipped_date", "");
        if (todayDateStr.equals(skippedDate)) {
            // Today's alarm was skipped by user. Reschedule for tomorrow and exit.
            scheduleNextMorningWakeupAlarm(context);
            return;
        }

        // 3. Check if 50 steps were already completed today
        String completedDate = prefs.getString("wakeup_mission_completed_date", "");
        if (todayDateStr.equals(completedDate)) {
            // Already finished 50 steps earlier today. Reschedule for tomorrow.
            scheduleNextMorningWakeupAlarm(context);
            return;
        }

        // 4. Wake the screen
        wakeScreen(context, 15000L);

        // 5. Launch Full-Screen Alarm Activity (10 Hard Shakes -> 50 Steps)
        Intent alarmIntent = new Intent(context, AlarmActivity.class);
        alarmIntent.putExtra("grace_mins", 15);
        alarmIntent.putExtra("is_re_ring", false);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                1001,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID_ALARMS)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("⏰ WAKE UP! Brain Activation Mission")
                .setContentText("Shake phone 10 times to silence siren & start 50-step mission")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(8888, builder.build());
        }

        try {
            context.startActivity(alarmIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Schedule next alarm for tomorrow so it repeats every morning
        scheduleNextMorningWakeupAlarm(context);
    }

    private void handleStepVerificationCheck(Context context, int nextGraceMins) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean missionActive = prefs.getBoolean("wakeup_step_mission_active", false);
        if (!missionActive) return;

        Calendar c = Calendar.getInstance();
        String todayDateStr = String.format("%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
        String completedDate = prefs.getString("wakeup_mission_completed_date", "");
        if (todayDateStr.equals(completedDate)) {
            // Mission already cleared!
            return;
        }

        int startSteps = prefs.getInt("wakeup_start_step_count", 0);
        int currentSteps = MainActivity.liveStepCount;
        int diff = currentSteps - startSteps;

        if (diff >= 50) {
            // User covered 50 steps! Mark completed!
            prefs.edit()
                    .putBoolean("wakeup_step_mission_active", false)
                    .putString("wakeup_mission_completed_date", todayDateStr)
                    .apply();
            return;
        }

        // User DID NOT cover 50 steps within the grace period!
        // Requirement: "if the user didnt made any step count under 15 minutes of disabling the alarm will rang again and this time it will give just 5 minutes to cover the step count and will be in a loop until the user completes it"
        wakeScreen(context, 15000L);

        Intent alarmIntent = new Intent(context, AlarmActivity.class);
        alarmIntent.putExtra("grace_mins", nextGraceMins); // 5 minutes!
        alarmIntent.putExtra("is_re_ring", true);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                1002,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID_ALARMS)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("⚠️ 50 STEPS MISSED! WAKEUP ALARM RE-RINGING")
                .setContentText("You must complete 50 steps! Deliver 10 hard shakes to restart 5-min timer.")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(8889, builder.build());
        }

        try {
            context.startActivity(alarmIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleStandardPlannerAlarm(Context context, Intent intent) {
        String taskTitle = intent.getStringExtra("task_title");
        if (taskTitle == null || taskTitle.isEmpty()) {
            taskTitle = "Scheduled Objective";
        }
        String taskTime = intent.getStringExtra("task_time");

        wakeScreen(context, 10000L);

        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        AudioAttributes alarmAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        try {
            Ringtone ringtone = RingtoneManager.getRingtone(context, alarmUri);
            if (ringtone != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    ringtone.setAudioAttributes(alarmAttributes);
                }
                stopAlarm();
                activeRingtone = ringtone;
                ringtone.play();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String contentText = taskTime != null ? "Scheduled for " + taskTime + " - Tap to start focus session" : "Your study session is ready to begin!";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID_ALARMS)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("🎯 " + taskTitle)
                .setContentText(contentText)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(contentPendingIntent)
                .addAction(android.R.drawable.ic_media_play, "✅ I AM READY", contentPendingIntent)
                .setSound(alarmUri)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVibrate(new long[]{0, 500, 200, 500, 200, 500});

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify((int) System.currentTimeMillis(), builder.build());
        }
    }

    private void wakeScreen(Context context, long durationMs) {
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                        "ProductivityMeter:AlarmWakeLock"
                );
                wakeLock.acquire(durationMs);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Schedules the next morning's wake-up alarm using high-priority setAlarmClock.
     */
    public static void scheduleNextMorningWakeupAlarm(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isAlarmEnabled = prefs.getBoolean("productometer_smart_alarm_enabled", true);
            if (!isAlarmEnabled) return;

            String wakeTime = prefs.getString("productometer_bedtime_end", "06:30");
            String[] parts = wakeTime.split(":");
            int hour = Integer.parseInt(parts[0].trim());
            int minute = Integer.parseInt(parts[1].trim());

            Calendar now = Calendar.getInstance();
            Calendar target = Calendar.getInstance();
            target.set(Calendar.HOUR_OF_DAY, hour);
            target.set(Calendar.MINUTE, minute);
            target.set(Calendar.SECOND, 0);
            target.set(Calendar.MILLISECOND, 0);

            // If time today already passed, target tomorrow morning
            if (now.getTimeInMillis() >= target.getTimeInMillis()) {
                target.add(Calendar.DAY_OF_YEAR, 1);
            }

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra("task_id", "wakeup_smart_alarm");
            intent.putExtra("task_title", "Brain Activation Smart Alarm");
            intent.putExtra("task_time", wakeTime);

            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    12345,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            Intent showIntent = new Intent(context, AlarmActivity.class);
            PendingIntent showPendingIntent = PendingIntent.getActivity(
                    context,
                    12346,
                    showIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            // Use setAlarmClock: the highest priority alarm in Android, immune to Doze & battery savings
            AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(target.getTimeInMillis(), showPendingIntent);
            alarmManager.setAlarmClock(clockInfo, pi);

            prefs.edit().putLong("productometer_next_alarm_epoch", target.getTimeInMillis()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
