package com.productometer.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.os.Vibrator;
import android.os.VibrationEffect;

import androidx.core.app.NotificationCompat;

import java.util.Calendar;

public class AlarmReceiver extends BroadcastReceiver {

    public static final String PREFS_NAME = "ShortsReelsBlockerPrefs";
    private static MediaPlayer activeMediaPlayer = null;
    private static Ringtone activeRingtone = null;
    private static Vibrator activeVibrator = null;
    private static PowerManager.WakeLock activeWakeLock = null;

    /**
     * Ensures high-priority alarm notification channel exists across all Android versions.
     */
    public static void ensureAlarmChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;
            NotificationChannel channel = manager.getNotificationChannel(MainActivity.CHANNEL_ID_ALARMS);
            if (channel == null) {
                channel = new NotificationChannel(
                        MainActivity.CHANNEL_ID_ALARMS,
                        "Wakeup & Study Alarms",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("High-priority alarm siren & wakeup alerts");
                channel.enableLights(true);
                channel.setLightColor(Color.CYAN);
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 800, 300, 800, 300, 800});
                channel.setBypassDnd(true);
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

                Uri alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmSoundUri == null) alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                if (alarmSoundUri == null) alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build();
                channel.setSound(alarmSoundUri, audioAttributes);
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Plays the loud wakeup alarm siren continuously and vibrates device until dismissed.
     */
    public static synchronized void playAlarmSiren(Context context) {
        stopAlarm(); // Stop any existing playback first

        // 1. Boost Alarm Audio Stream Volume to maximum
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                am.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0);
            }
        } catch (Exception ignored) {}

        // 2. Play Alarm Sound via looping MediaPlayer with fallback to Ringtone
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        try {
            activeMediaPlayer = new MediaPlayer();
            activeMediaPlayer.setDataSource(context, alarmUri);
            activeMediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            activeMediaPlayer.setLooping(true);
            activeMediaPlayer.prepare();
            activeMediaPlayer.start();
        } catch (Exception e) {
            try {
                activeRingtone = RingtoneManager.getRingtone(context, alarmUri);
                if (activeRingtone != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        activeRingtone.setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build());
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        activeRingtone.setLooping(true);
                    }
                    activeRingtone.play();
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }

        // 3. Continuous hardware vibration in pattern
        try {
            activeVibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (activeVibrator != null) {
                long[] pattern = { 0, 800, 300, 800, 300, 800 };
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    activeVibrator.vibrate(VibrationEffect.createWaveform(pattern, 0)); // 0 = loop from start
                } else {
                    activeVibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {}
    }

    /**
     * Silences any active alarm ringtone and cancels vibration immediately.
     */
    public static synchronized void stopAlarm() {
        if (activeMediaPlayer != null) {
            try {
                if (activeMediaPlayer.isPlaying()) {
                    activeMediaPlayer.stop();
                }
                activeMediaPlayer.release();
            } catch (Exception ignored) {}
            activeMediaPlayer = null;
        }

        if (activeRingtone != null) {
            try {
                if (activeRingtone.isPlaying()) {
                    activeRingtone.stop();
                }
            } catch (Exception ignored) {}
            activeRingtone = null;
        }

        if (activeVibrator != null) {
            try {
                activeVibrator.cancel();
            } catch (Exception ignored) {}
            activeVibrator = null;
        }

        if (activeWakeLock != null) {
            try {
                if (activeWakeLock.isHeld()) {
                    activeWakeLock.release();
                }
            } catch (Exception ignored) {}
            activeWakeLock = null;
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String taskId = intent != null ? intent.getStringExtra("task_id") : "";
        if (taskId == null) taskId = "";

        boolean isStepCheck = intent != null && intent.getBooleanExtra("is_step_check", false);
        int nextGraceMins = intent != null ? intent.getIntExtra("next_grace_mins", 5) : 5;

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

        // 1. Check if master alarm toggle is enabled
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
            // Alarm was skipped for today. Consume the skip and reschedule for tomorrow!
            prefs.edit().remove("wakeup_alarm_skipped_date").apply();
            scheduleNextMorningWakeupAlarm(context);
            return;
        }

        // 3. Clear any stale completed date so this alarm session rings reliably
        prefs.edit().remove("wakeup_mission_completed_date").apply();

        // 4. Wake the screen and start audio siren IMMEDIATELY
        wakeScreen(context, 30000L);
        playAlarmSiren(context);

        // 5. Ensure notification channel exists
        ensureAlarmChannel(context);

        // 6. Launch Full-Screen Alarm Activity (10 Hard Shakes -> 50 Steps)
        Intent alarmIntent = new Intent(context, AlarmActivity.class);
        alarmIntent.putExtra("grace_mins", 15);
        alarmIntent.putExtra("is_re_ring", false);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                1001,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID_ALARMS)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("⏰ WAKE UP! Brain Activation Mission")
                .setContentText("Shake phone 10 times to silence siren & start 50-step mission")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)
                .setSound(alarmUri)
                .setVibrate(new long[]{0, 800, 300, 800, 300, 800})
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

        // Schedule next morning's alarm so it automatically repeats every day
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
        // Ring again with 5-minute loop until completed
        wakeScreen(context, 30000L);
        playAlarmSiren(context);

        ensureAlarmChannel(context);

        Intent alarmIntent = new Intent(context, AlarmActivity.class);
        alarmIntent.putExtra("grace_mins", nextGraceMins); // 5 minutes!
        alarmIntent.putExtra("is_re_ring", true);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                1002,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID_ALARMS)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("⚠️ 50 STEPS MISSED! WAKEUP ALARM RE-RINGING")
                .setContentText("You must complete 50 steps! Deliver 10 hard shakes to restart 5-min timer.")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)
                .setSound(alarmUri)
                .setVibrate(new long[]{0, 800, 300, 800, 300, 800})
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
        String taskTitle = intent != null ? intent.getStringExtra("task_title") : null;
        if (taskTitle == null || taskTitle.isEmpty()) {
            taskTitle = "Scheduled Objective";
        }
        String taskTime = intent != null ? intent.getStringExtra("task_time") : null;

        wakeScreen(context, 15000L);
        playAlarmSiren(context);
        ensureAlarmChannel(context);

        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

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
                if (activeWakeLock != null && activeWakeLock.isHeld()) {
                    try { activeWakeLock.release(); } catch (Exception ignored) {}
                }
                activeWakeLock = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                        "ProductivityMeter:AlarmWakeLock"
                );
                activeWakeLock.acquire(durationMs);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Schedules the next morning's wake-up alarm using high-priority setAlarmClock
     * with graceful fallbacks across all Android OS versions.
     */
    public static void scheduleNextMorningWakeupAlarm(Context context) {
        try {
            ensureAlarmChannel(context);
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

            // If time today already passed by more than 60 seconds, target tomorrow
            long diff = now.getTimeInMillis() - target.getTimeInMillis();
            if (diff > 60000L) {
                target.add(Calendar.DAY_OF_YEAR, 1);
            } else if (target.getTimeInMillis() <= now.getTimeInMillis()) {
                // If set to the current minute (or within past 60s), fire in 2 seconds for immediate response
                target.setTimeInMillis(now.getTimeInMillis() + 2000L);
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

            // Hierarchy of scheduling methods:
            // 1. setAlarmClock (Highest priority in Android, immune to Doze & App Standby)
            // 2. setExactAndAllowWhileIdle (Android 6.0+)
            // 3. setExact
            // 4. set
            boolean scheduled = false;
            try {
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(target.getTimeInMillis(), showPendingIntent);
                alarmManager.setAlarmClock(clockInfo, pi);
                scheduled = true;
            } catch (Throwable t1) {
                // SecurityException on Android 12+ or OEM restriction
            }

            if (!scheduled) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pi);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pi);
                    }
                    scheduled = true;
                } catch (Throwable t2) {
                    try {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pi);
                        scheduled = true;
                    } catch (Throwable t3) {
                        t3.printStackTrace();
                    }
                }
            }

            if (scheduled) {
                prefs.edit().putLong("productometer_next_alarm_epoch", target.getTimeInMillis()).apply();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
