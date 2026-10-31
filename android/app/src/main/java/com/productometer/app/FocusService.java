package com.productometer.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class FocusService extends Service {

    private static final int NOTIFICATION_ID = 2001;
    private CountDownTimer countDownTimer;
    private String currentTaskTitle = "Study Block";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String title = intent.getStringExtra("task_title");
            if (title != null && !title.isEmpty()) {
                currentTaskTitle = title;
            }
            long durationSeconds = intent.getLongExtra("duration_seconds", 25 * 60);
            startCountdown(durationSeconds);
        }

        Notification initialNotification = buildNotification("Focus In Progress: " + currentTaskTitle, "Initializing timer...");
        startForeground(NOTIFICATION_ID, initialNotification);

        return START_NOT_STICKY;
    }

    private void startCountdown(long totalSeconds) {
        if (countDownTimer != null) {
            countDownTimer.cancel();
        }

        countDownTimer = new CountDownTimer(totalSeconds * 1000L, 1000L) {
            @Override
            public void onTick(long millisUntilFinished) {
                long secondsLeft = millisUntilFinished / 1000L;
                long minutes = secondsLeft / 60L;
                long seconds = secondsLeft % 60L;
                String timeFormatted = String.format("%02d:%02d", minutes, seconds);

                updateNotification("Focus: " + currentTaskTitle, "⏳ " + timeFormatted + " remaining");
            }

            @Override
            public void onFinish() {
                updateNotification("🎯 " + currentTaskTitle + " Complete!", "Great job! Take a well-earned break.");
                stopForeground(false);
                stopSelf();
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
        if (countDownTimer != null) {
            countDownTimer.cancel();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
