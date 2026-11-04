package com.productometer.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.Vibrator;
import android.os.VibrationEffect;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.util.Calendar;

/**
 * Dedicated foreground service that tracks walking steps during the Wake-up Mission.
 * Uses a dual-sensor architecture:
 * 1. Hardware Step Detector / Counter (battery efficient when available).
 * 2. Accelerometer Peak Detection (100% universal across all phones, works with screen off).
 * Runs with a partial wake lock so movement is accurately captured even when the phone
 * is locked or kept in the user's pocket while walking.
 */
public class WakeupStepTrackerService extends Service implements SensorEventListener {

    public static final String CHANNEL_ID_STEP_MISSION = "channel_wakeup_step_mission";
    public static final int NOTIFICATION_ID = 3003;
    public static final String ACTION_START = "ACTION_START_STEP_TRACKER";
    public static final String ACTION_STOP = "ACTION_STOP_STEP_TRACKER";

    private static final int TARGET_STEPS = 50;

    // Accelerometer walking step detection constants
    private static final double ACCEL_STEP_HIGH_THRESHOLD = 11.5; // m/s^2 footfall peak
    private static final double ACCEL_STEP_LOW_THRESHOLD = 8.6;   // m/s^2 trough
    private static final long MIN_STEP_GAP_MS = 240;              // Max ~4 steps/sec (running cadence)
    private static final long MAX_STEP_GAP_MS = 2500;             // Min 1 step every 2.5s

    private PowerManager.WakeLock wakeLock;
    private SensorManager sensorManager;
    private Sensor stepDetectorSensor;
    private Sensor accelerometerSensor;
    private Sensor stepCounterSensor;

    private int currentSteps = 0;
    private boolean isAboveThreshold = false;
    private long lastStepTimestamp = 0;
    private long lastHardwareStepTimestamp = 0;

    private CountDownTimer missionCountdownTimer;
    private long deadlineMillis = 0;
    private Handler mainHandler;
    private Vibrator vibrator;
    private boolean isCompleted = false;

    public static void startService(Context context, int graceMinutes) {
        try {
            Intent intent = new Intent(context, WakeupStepTrackerService.class);
            intent.setAction(ACTION_START);
            intent.putExtra("grace_mins", graceMinutes);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void stopService(Context context) {
        try {
            Intent intent = new Intent(context, WakeupStepTrackerService.class);
            intent.setAction(ACTION_STOP);
            context.startService(intent);
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mainHandler = new Handler(Looper.getMainLooper());
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);

        // 1. Acquire partial wake lock to keep counting steps with screen off in pocket
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Productometer:WakeupStepTrackerWakeLock");
                wakeLock.acquire(16 * 60 * 1000L); // Max 16 minutes safety cap
            }
        } catch (Exception ignored) {}

        // 2. Ensure notification channel
        ensureChannel();

        // 3. Register sensors (Step detector + Accelerometer universal fallback)
        setupSensors();
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = nm.getNotificationChannel(CHANNEL_ID_STEP_MISSION);
                if (channel == null) {
                    channel = new NotificationChannel(
                            CHANNEL_ID_STEP_MISSION,
                            "Wakeup Step Mission Tracker",
                            NotificationManager.IMPORTANCE_LOW
                    );
                    channel.setDescription("Live step tracking for Wake-up Alarm mission");
                    channel.enableVibration(false);
                    channel.setSound(null, null);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }

    private void setupSensors() {
        try {
            sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
            if (sensorManager != null) {
                // Hardware step detector (very battery efficient if present)
                stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
                if (stepDetectorSensor != null) {
                    sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_FASTEST);
                }

                // Accelerometer (100% universal across all phones, works reliably with screen off)
                accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
                if (accelerometerSensor != null) {
                    sensorManager.registerListener(this, accelerometerSensor, SensorManager.SENSOR_DELAY_GAME);
                }

                // Step counter as secondary backup
                stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
                if (stepCounterSensor != null) {
                    sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_UI);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelfClean();
            return START_NOT_STICKY;
        }

        int graceMinutes = intent != null ? intent.getIntExtra("grace_mins", 15) : 15;
        currentSteps = 0;
        isCompleted = false;
        long durationMs = graceMinutes * 60 * 1000L;
        deadlineMillis = System.currentTimeMillis() + durationMs;

        SharedPreferences prefs = getSharedPreferences(AlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean("wakeup_step_mission_active", true)
                .putInt("wakeup_current_steps", 0)
                .putLong("wakeup_step_mission_deadline", deadlineMillis)
                .apply();

        startForeground(NOTIFICATION_ID, buildNotification(0, graceMinutes));

        // Start 15-minute countdown ticker to keep notification updated
        if (missionCountdownTimer != null) missionCountdownTimer.cancel();
        missionCountdownTimer = new CountDownTimer(durationMs, 10000L) { // update every 10s
            @Override
            public void onTick(long millisUntilFinished) {
                if (isCompleted) return;
                int minsLeft = (int) Math.ceil(millisUntilFinished / 60000.0);
                updateNotification(currentSteps, minsLeft);
            }

            @Override
            public void onFinish() {
                // 15-min timer expired; AlarmReceiver handles re-ring verification check
            }
        }.start();

        return START_STICKY;
    }

    private Notification buildNotification(int steps, int minutesLeft) {
        Intent tapIntent = new Intent(this, MainActivity.class);
        tapIntent.putExtra("openSection", "run");
        PendingIntent tapPi = PendingIntent.getActivity(
                this,
                4001,
                tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Intent typeIntent = new Intent(this, AlarmActivity.class);
        PendingIntent typePi = PendingIntent.getActivity(
                this,
                4002,
                typeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID_STEP_MISSION)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("🚶‍♂️ Wake-up Mission: " + steps + " / " + TARGET_STEPS + " Steps")
                .setContentText("Walk 50 steps to disarm the alarm • " + minutesLeft + "m left")
                .setProgress(TARGET_STEPS, steps, false)
                .setOngoing(true)
                .setContentIntent(tapPi)
                .addAction(android.R.drawable.ic_menu_edit, "✍️ TYPE TO DISMISS", typePi)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification(int steps, int minutesLeft) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIFICATION_ID, buildNotification(steps, minutesLeft));
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (isCompleted) return;
        long now = System.currentTimeMillis();

        if (event.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
            if (event.values[0] == 1.0f) {
                if (now - lastHardwareStepTimestamp >= 200) {
                    lastHardwareStepTimestamp = now;
                    handleStepDetected(now);
                }
            }
        } else if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            double mag = Math.sqrt(x * x + y * y + z * z);

            if (!isAboveThreshold && mag > ACCEL_STEP_HIGH_THRESHOLD) {
                isAboveThreshold = true;
            } else if (isAboveThreshold && mag < ACCEL_STEP_LOW_THRESHOLD) {
                isAboveThreshold = false;
                long interval = now - lastStepTimestamp;
                // Avoid double-counting if hardware step detector just recorded a step
                if (now - lastHardwareStepTimestamp > 220) {
                    if (interval >= MIN_STEP_GAP_MS && interval <= MAX_STEP_GAP_MS) {
                        lastStepTimestamp = now;
                        handleStepDetected(now);
                    } else if (lastStepTimestamp == 0) {
                        lastStepTimestamp = now;
                        handleStepDetected(now);
                    }
                }
            }
        }
    }

    private synchronized void handleStepDetected(long timestamp) {
        if (isCompleted) return;
        currentSteps++;
        MainActivity.liveStepCount = currentSteps;

        SharedPreferences prefs = getSharedPreferences(AlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putInt("wakeup_current_steps", currentSteps).apply();

        long remainingMs = Math.max(0, deadlineMillis - timestamp);
        int minsLeft = (int) Math.ceil(remainingMs / 60000.0);
        updateNotification(currentSteps, minsLeft);

        // Check if TARGET (50 STEPS) COMPLETED!
        if (currentSteps >= TARGET_STEPS) {
            onFiftyStepsCompleted();
        }
    }

    private void onFiftyStepsCompleted() {
        if (isCompleted) return;
        isCompleted = true;

        // 1. UNREGISTER SENSORS IMMEDIATELY
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }

        // 2. MARK MISSION COMPLETED IN SHAREDPREFERENCES
        SharedPreferences prefs = getSharedPreferences(AlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
        Calendar c = Calendar.getInstance();
        String todayDateStr = String.format("%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
        prefs.edit()
                .putBoolean("wakeup_step_mission_active", false)
                .putString("wakeup_mission_completed_date", todayDateStr)
                .remove("wakeup_alarm_skipped_date")
                .apply();

        // 3. CANCEL THE RE-RING STEP VERIFICATION ALARM (998877)
        try {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent stepIntent = new Intent(this, AlarmReceiver.class);
                stepIntent.putExtra("task_id", "wakeup_smart_alarm_step_check");
                stepIntent.putExtra("is_step_check", true);
                PendingIntent stepPi = PendingIntent.getBroadcast(
                        this,
                        998877,
                        stepIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                );
                am.cancel(stepPi);
            }
        } catch (Exception ignored) {}

        // 4. CELEBRATORY VIBRATION
        try {
            if (vibrator != null) {
                long[] pat = {0, 150, 80, 150, 80, 350};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pat, -1));
                } else {
                    vibrator.vibrate(pat, -1);
                }
            }
        } catch (Exception ignored) {}

        // 5. POST GENTLE TRIUMPH NOTIFICATION (NOTIFICATION ONLY - NO ALARM TONE!)
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            AlarmReceiver.ensureGeneralChannel(this);
            Intent openIntent = new Intent(this, MainActivity.class);
            PendingIntent openPi = PendingIntent.getActivity(
                    this,
                    4003,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            Notification victoryNotif = new NotificationCompat.Builder(this, MainActivity.CHANNEL_ID_GENERAL)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle("🎉 50 Steps Completed! Mission Cleared")
                    .setContentText("Wake-up Alarm is disarmed. Have a productive day!")
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .setAutoCancel(true)
                    .setContentIntent(openPi)
                    .build();

            nm.notify(3004, victoryNotif);
        }

        // 6. STOP SERVICE CLEANLY AFTER BRIEF DELAY
        mainHandler.postDelayed(this::stopSelfClean, 2500L);
    }

    private void stopSelfClean() {
        if (missionCountdownTimer != null) {
            missionCountdownTimer.cancel();
            missionCountdownTimer = null;
        }
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
            wakeLock = null;
        }
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopSelfClean();
        super.onDestroy();
    }
}
