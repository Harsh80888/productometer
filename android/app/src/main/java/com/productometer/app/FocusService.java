package com.productometer.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class FocusService extends Service {

    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_PAUSE = "ACTION_PAUSE";
    public static final String ACTION_BREAK = "ACTION_BREAK";
    public static final String ACTION_RESUME = "ACTION_RESUME";
    public static final String ACTION_STOP = "ACTION_STOP";

    private static final int NOTIFICATION_ID = 2001;
    private CountDownTimer countDownTimer;
    private CountDownTimer breakTimer;
    private String currentTaskTitle = "Study Session";
    private long currentRemainingSeconds = 25 * 60;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (action == null) action = ACTION_START;

            String title = intent.getStringExtra("task_title");
            if (title != null && !title.isEmpty()) {
                currentTaskTitle = title;
            }

            switch (action) {
                case ACTION_PAUSE:
                    handlePause();
                    break;
                case ACTION_BREAK:
                    long breakSecs = intent.getLongExtra("break_seconds", 5 * 60);
                    handleBreak(breakSecs);
                    break;
                case ACTION_RESUME:
                    long resumeSecs = intent.getLongExtra("duration_seconds", currentRemainingSeconds);
                    handleResume(resumeSecs);
                    break;
                case ACTION_STOP:
                    handleStop();
                    break;
                case ACTION_START:
                default:
                    long durationSeconds = intent.getLongExtra("duration_seconds", 25 * 60);
                    handleStart(durationSeconds);
                    break;
            }
        }

        return START_NOT_STICKY;
    }

    private void handleStart(long totalSeconds) {
        currentRemainingSeconds = totalSeconds;
        cancelAllTimers();
        Notification notif = buildNotification("Focus: " + currentTaskTitle, "Starting focus session...");
        startForeground(NOTIFICATION_ID, notif);
        startStudyCountdown(totalSeconds);
    }

    private void handlePause() {
        cancelAllTimers();
        long m = currentRemainingSeconds / 60;
        long s = currentRemainingSeconds % 60;
        updateNotification("⏸️ Focus Paused: " + currentTaskTitle, String.format("Paused at %02d:%02d · Tap to return", m, s));
    }

    private void handleBreak(long breakSecs) {
        cancelAllTimers();
        startBreakCountdown(breakSecs);
    }

    private void handleResume(long resumeSecs) {
        if (resumeSecs > 0) currentRemainingSeconds = resumeSecs;
        cancelAllTimers();
        startStudyCountdown(currentRemainingSeconds);
    }

    private void handleStop() {
        cancelAllTimers();
        stopForeground(true);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
        }
        ShortsReelsBlockerService.isFocusSessionOngoing = false;
        try {
            SharedPreferences prefs = getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean(ShortsReelsBlockerService.KEY_FOCUS_ACTIVE, false)
                    .remove("focus_session_end_time")
                    .apply();
        } catch (Exception ignored) {}
        stopSelf();
    }

    private void cancelAllTimers() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
            countDownTimer = null;
        }
        if (breakTimer != null) {
            breakTimer.cancel();
            breakTimer = null;
        }
    }

    private void startStudyCountdown(long seconds) {
        countDownTimer = new CountDownTimer(seconds * 1000L, 1000L) {
            @Override
            public void onTick(long millisUntilFinished) {
                currentRemainingSeconds = millisUntilFinished / 1000L;
                long minutes = currentRemainingSeconds / 60L;
                long secs = currentRemainingSeconds % 60L;
                updateNotification("Focus: " + currentTaskTitle, String.format("⏳ %02d:%02d remaining", minutes, secs));
            }

            @Override
            public void onFinish() {
                cancelAllTimers();
                stopForeground(true);
                NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    manager.cancel(NOTIFICATION_ID);
                }
                ShortsReelsBlockerService.isFocusSessionOngoing = false;
                try {
                    SharedPreferences prefs = getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
                    prefs.edit()
                            .putBoolean(ShortsReelsBlockerService.KEY_FOCUS_ACTIVE, false)
                            .remove("focus_session_end_time")
                            .apply();
                } catch (Exception ignored) {}

                postSessionCompleteNotification(currentTaskTitle);
                stopSelf();
            }
        }.start();
    }

    private void postSessionCompleteNotification(String title) {
        try {
            AlarmReceiver.ensureGeneralChannel(this);
            AlarmReceiver.wakeScreen(this, 10000L);
            AlarmReceiver.playBedtimeReminderSound(this);

            Intent openAppIntent = new Intent(this, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openAppIntent.putExtra("from_session_alarm", true);
            PendingIntent pi = PendingIntent.getActivity(
                    this,
                    9999,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MainActivity.CHANNEL_ID_GENERAL)
                    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                    .setContentTitle("🎉 Session Completed: " + (title != null ? title : "Study Session"))
                    .setContentText("Outstanding focus! Marked complete in Day Planner. Tap to review.")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setVibrate(new long[]{0, 500, 200, 500});

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(9999, builder.build());
            }
        } catch (Exception ignored) {}
    }

    private void startBreakCountdown(long seconds) {
        breakTimer = new CountDownTimer(seconds * 1000L, 1000L) {
            @Override
            public void onTick(long millisUntilFinished) {
                long rem = millisUntilFinished / 1000L;
                long minutes = rem / 60L;
                long secs = rem % 60L;
                updateNotification("☕ Break Time (" + currentTaskTitle + ")", String.format("⏳ %02d:%02d break remaining", minutes, secs));
            }

            @Override
            public void onFinish() {
                updateNotification("☕ Break Finished!", "Ready to resume studying?");
            }
        }.start();
    }

    private Notification buildNotification(String title, String content) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(this, MainActivity.CHANNEL_ID_FOCUS)
                .setContentTitle(title)
                .setContentText(content)
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification(String title, String content) {
        Notification notification = buildNotification(title, content);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, notification);
        }
    }

    @Override
    public void onDestroy() {
        cancelAllTimers();
        stopForeground(true);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
        }
        ShortsReelsBlockerService.isFocusSessionOngoing = false;
        try {
            SharedPreferences prefs = getSharedPreferences(ShortsReelsBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean(ShortsReelsBlockerService.KEY_FOCUS_ACTIVE, false)
                    .remove("focus_session_end_time")
                    .apply();
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
