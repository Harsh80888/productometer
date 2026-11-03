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
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
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
    private static Thread audioTrackSirenThread = null;
    private static volatile boolean isSirenRunning = false;

    private static synchronized void startAudioTrackSiren() {
        if (isSirenRunning) return;
        isSirenRunning = true;
        audioTrackSirenThread = new Thread(() -> {
            AudioTrack track = null;
            try {
                int sampleRate = 22050;
                int bufferSize = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
                if (bufferSize < sampleRate) bufferSize = sampleRate;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    track = new AudioTrack.Builder()
                            .setAudioAttributes(new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_ALARM)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                    .build())
                            .setAudioFormat(new AudioFormat.Builder()
                                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                    .setSampleRate(sampleRate)
                                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                                    .build())
                            .setBufferSizeInBytes(bufferSize)
                            .setTransferMode(AudioTrack.MODE_STREAM)
                            .build();
                } else {
                    track = new AudioTrack(
                            AudioManager.STREAM_ALARM,
                            sampleRate,
                            AudioFormat.CHANNEL_OUT_MONO,
                            AudioFormat.ENCODING_PCM_16BIT,
                            bufferSize,
                            AudioTrack.MODE_STREAM
                    );
                }

                track.play();

                short[] buffer = new short[2205]; // 100ms chunk
                double phase = 0.0;
                long startTime = System.currentTimeMillis();

                while (isSirenRunning) {
                    long elapsed = System.currentTimeMillis() - startTime;
                    // European emergency siren: 880 Hz alternating with 1175 Hz every 400ms
                    double freq = ((elapsed / 400) % 2 == 0) ? 880.0 : 1175.0;
                    double phaseIncrement = (2.0 * Math.PI * freq) / sampleRate;

                    for (int i = 0; i < buffer.length; i++) {
                        buffer[i] = (short) (Math.sin(phase) * 28000);
                        phase += phaseIncrement;
                        if (phase > 2.0 * Math.PI) phase -= 2.0 * Math.PI;
                    }

                    track.write(buffer, 0, buffer.length);
                }
            } catch (Throwable t) {
                t.printStackTrace();
            } finally {
                if (track != null) {
                    try {
                        track.stop();
                        track.release();
                    } catch (Throwable ignored) {}
                }
            }
        }, "AudioTrackSirenThread");
        audioTrackSirenThread.start();
    }

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
        // If alarm audio is already playing actively, don't interrupt it!
        if (activeMediaPlayer != null) {
            try {
                if (activeMediaPlayer.isPlaying()) return;
            } catch (Exception ignored) {}
        }
        if (activeRingtone != null) {
            try {
                if (activeRingtone.isPlaying()) return;
            } catch (Exception ignored) {}
        }

        stopAlarm(); // Stop any stale playback

        // 1. Boost Alarm Audio Stream Volume AND Music Stream Volume to maximum
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int maxAlarm = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                am.setStreamVolume(AudioManager.STREAM_ALARM, maxAlarm, 0);
                int maxMusic = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                am.setStreamVolume(AudioManager.STREAM_MUSIC, maxMusic, 0);
            }
        } catch (Exception ignored) {}

        // 2. Play Alarm Sound via looping MediaPlayer with fallback to Ringtone
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        boolean soundStarted = false;
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
            soundStarted = true;
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
                    soundStarted = true;
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }

        // 3. HARDWARE-LEVEL SYNTHESIZED PCM SIREN VIA AudioTrack
        // 100% immune to silent mode, missing ringtone files, or OEM bugs!
        startAudioTrackSiren();

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
    /**
     * Plays a brief, gentle 3-second bedtime reminder notification chime.
     * Automatically stops itself after 3.5 seconds so it NEVER loops!
     */
    public static void playBedtimeReminderSound(Context context) {
        try {
            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            if (soundUri == null) soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            final Ringtone r = RingtoneManager.getRingtone(context, soundUri);
            if (r != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    r.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
                }
                r.play();
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        if (r.isPlaying()) r.stop();
                    } catch (Exception ignored) {}
                }, 3500L);
            }
        } catch (Exception ignored) {}
    }

    public static synchronized void stopAlarm() {
        isSirenRunning = false;
        if (audioTrackSirenThread != null) {
            try {
                audioTrackSirenThread.interrupt();
            } catch (Exception ignored) {}
            audioTrackSirenThread = null;
        }

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

        if ("dismiss_bedtime_notification".equals(taskId)) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(7777);
            }
            return;
        }

        // Case 2: Bedtime Start Reminder Alarm
        if (taskId.startsWith("bedtime_start_alarm")) {
            handleBedtimeStartAlarm(context, intent);
            return;
        }

        // Case 3: Smart Wakeup Alarm
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

        // 2. Clear any stale skip or mission completed date so this alarm session rings reliably
        prefs.edit()
                .remove("wakeup_alarm_skipped_date")
                .remove("wakeup_mission_completed_date")
                .apply();

        // 3. Wake the screen and start audio siren IMMEDIATELY
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

    public static void wakeScreen(Context context, long durationMs) {
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
     * Schedules the Wake-up Smart Alarm using the exact same reliable setExactAndAllowWhileIdle
     * engine as Day Planner session alarms.
     */
    public static void scheduleSmartWakeupAlarm(Context context, String wakeTimeStr, long triggerEpochMillis) {
        try {
            ensureAlarmChannel(context);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isAlarmEnabled = prefs.getBoolean("productometer_smart_alarm_enabled", true);
            if (!isAlarmEnabled) return;

            long targetMillis = triggerEpochMillis;
            long nowMillis = System.currentTimeMillis();

            if (targetMillis <= nowMillis) {
                if (wakeTimeStr == null || wakeTimeStr.isEmpty()) {
                    wakeTimeStr = prefs.getString("productometer_bedtime_end", "06:30");
                }
                String[] parts = wakeTimeStr.split(":");
                int hour = Integer.parseInt(parts[0].trim());
                int minute = Integer.parseInt(parts[1].trim());

                Calendar target = Calendar.getInstance();
                target.set(Calendar.HOUR_OF_DAY, hour);
                target.set(Calendar.MINUTE, minute);
                target.set(Calendar.SECOND, 0);
                target.set(Calendar.MILLISECOND, 0);

                if (target.getTimeInMillis() <= nowMillis) {
                    target.add(Calendar.DAY_OF_YEAR, 1);
                }
                targetMillis = target.getTimeInMillis();
            }

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra("task_id", "wakeup_smart_alarm");
            intent.putExtra("task_title", "Brain Activation Smart Alarm");
            intent.putExtra("task_time", wakeTimeStr);

            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    12345,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, targetMillis, pi);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, targetMillis, pi);
            }

            prefs.edit().putLong("productometer_next_alarm_epoch", targetMillis).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Reschedules alarm for tomorrow morning after an alarm session has triggered.
     * Guaranteed to NEVER reschedule in a 3-second loop!
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

            Calendar target = Calendar.getInstance();
            target.set(Calendar.HOUR_OF_DAY, hour);
            target.set(Calendar.MINUTE, minute);
            target.set(Calendar.SECOND, 0);
            target.set(Calendar.MILLISECOND, 0);

            // ALWAYS target next morning:
            target.add(Calendar.DAY_OF_YEAR, 1);
            long targetMillis = target.getTimeInMillis();

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

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, targetMillis, pi);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, targetMillis, pi);
            }

            prefs.edit().putLong("productometer_next_alarm_epoch", targetMillis).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Schedules the Bedtime Start Wind-Down alarm so the user is audibly notified at bedtime.
     */
    public static void scheduleBedtimeStartReminderAlarm(Context context) {
        try {
            ensureAlarmChannel(context);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isBedtimeEnabled = prefs.getBoolean("productometer_bedtime_enabled", true);
            if (!isBedtimeEnabled) return;

            String bedtimeStart = prefs.getString("productometer_bedtime_start", "22:30");
            String[] parts = bedtimeStart.split(":");
            int hour = Integer.parseInt(parts[0].trim());
            int minute = Integer.parseInt(parts[1].trim());

            Calendar now = Calendar.getInstance();
            Calendar target = Calendar.getInstance();
            target.set(Calendar.HOUR_OF_DAY, hour);
            target.set(Calendar.MINUTE, minute);
            target.set(Calendar.SECOND, 0);
            target.set(Calendar.MILLISECOND, 0);

            long diff = now.getTimeInMillis() - target.getTimeInMillis();
            if (diff > 0 && diff <= 300000L) {
                // User set bedtime to current/recent minute for testing, fire in 3 seconds!
                target.setTimeInMillis(now.getTimeInMillis() + 3000L);
            } else if (target.getTimeInMillis() <= now.getTimeInMillis()) {
                target.add(Calendar.DAY_OF_YEAR, 1);
            }

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra("task_id", "bedtime_start_alarm");
            intent.putExtra("task_title", "Bedtime Wind-Down Reminder");
            intent.putExtra("task_time", bedtimeStart);

            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    23456,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            Intent showIntent = new Intent(context, MainActivity.class);
            PendingIntent showPendingIntent = PendingIntent.getActivity(
                    context,
                    23457,
                    showIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            boolean scheduled = false;
            try {
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(target.getTimeInMillis(), showPendingIntent);
                alarmManager.setAlarmClock(clockInfo, pi);
                scheduled = true;
            } catch (Throwable ignored) {}

            if (!scheduled) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pi);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pi);
                    }
                    scheduled = true;
                } catch (Throwable t) {
                    try {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pi);
                        scheduled = true;
                    } catch (Throwable ignored) {}
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleBedtimeStartAlarm(Context context, Intent intent) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isBedtimeEnabled = prefs.getBoolean("productometer_bedtime_enabled", true);
        if (!isBedtimeEnabled) {
            scheduleBedtimeStartReminderAlarm(context);
            return;
        }

        // 1. Brief screen wake (5 seconds)
        wakeScreen(context, 5000L);

        // 2. Play gentle 3-second notification chime (NEVER looping siren!)
        playBedtimeReminderSound(context);

        // 3. Single gentle vibration pulse (500ms once)
        try {
            Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(500);
                }
            }
        } catch (Exception ignored) {}

        ensureAlarmChannel(context);

        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Intent dismissIntent = new Intent(context, AlarmReceiver.class);
        dismissIntent.putExtra("task_id", "dismiss_bedtime_notification");
        PendingIntent dismissPi = PendingIntent.getBroadcast(
                context,
                7778,
                dismissIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID_ALARMS)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("🌙 Bedtime Wind-Down Active")
                .setContentText("It's bedtime! Put away distractions. Social media & doomscroll apps capped at 15m.")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(contentPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "DISMISS", dismissPi);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(7777, builder.build());
        }

        // Reschedule for tomorrow
        scheduleBedtimeStartReminderAlarm(context);
    }
}
