package com.productometer.app;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.util.Calendar;

public class AlarmActivity extends AppCompatActivity implements SensorEventListener {

    public static final String PREFS_NAME = "ShortsReelsBlockerPrefs";
    private static final int REQUIRED_SHAKES = 10;
    private static final int REQUIRED_STEPS = 50;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private SensorManager sensorManager;
    private Sensor accelerometer;

    private int shakeCount = 0;
    private long lastShakeTime = 0;
    private int graceMinutes = 15;
    private boolean isReRing = false;

    private TextView titleView;
    private TextView countView;
    private TextView subtitleView;
    private ProgressBar progressBar;
    private Handler handler;

    @SuppressLint("SetTextI18n")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        handler = new Handler(Looper.getMainLooper());

        // Parse intent parameters
        graceMinutes = getIntent().getIntExtra("grace_mins", 15);
        isReRing = getIntent().getBooleanExtra("is_re_ring", false);

        // Configure full screen wake locks over lock screen
        configureWindowWakeFlags();

        // Build glowing alarm UI
        setContentView(createAlarmView());

        // Start hardware sensors
        setupSensor();

        // Start siren audio & vibration
        startAlarmAlerts();
    }

    private void configureWindowWakeFlags() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            window.addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }
        window.setStatusBarColor(Color.parseColor("#05070D"));
        window.setNavigationBarColor(Color.parseColor("#05070D"));
    }

    private View createAlarmView() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#05070D"));
        root.setPadding(dpToPx(24), dpToPx(32), dpToPx(24), dpToPx(32));

        // Re-ring warning badge if applicable
        if (isReRing) {
            TextView warningBadge = new TextView(this);
            warningBadge.setText("⚠️ STEP MISSION MISSED! 5-MIN RE-RING ACTIVE");
            warningBadge.setTextSize(12);
            warningBadge.setTextColor(Color.parseColor("#FFD600"));
            warningBadge.setTypeface(Typeface.DEFAULT_BOLD);
            warningBadge.setGravity(Gravity.CENTER);
            warningBadge.setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6));

            GradientDrawable warnBg = new GradientDrawable();
            warnBg.setColor(Color.parseColor("#262208"));
            warnBg.setCornerRadius(dpToPx(8));
            warnBg.setStroke(dpToPx(1), Color.parseColor("#FFD600"));
            warningBadge.setBackground(warnBg);

            LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            badgeParams.bottomMargin = dpToPx(16);
            root.addView(warningBadge, badgeParams);
        }

        // Alarm Emoji / Icon Halo
        TextView iconHalo = new TextView(this);
        iconHalo.setText("⏰");
        iconHalo.setTextSize(64);
        iconHalo.setGravity(Gravity.CENTER);
        root.addView(iconHalo);

        // Header Title
        titleView = new TextView(this);
        titleView.setText("WAKE UP!");
        titleView.setTextSize(32);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setTextColor(Color.parseColor("#00E5FF"));
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0, dpToPx(8), 0, 0);
        root.addView(titleView);

        TextView subHeader = new TextView(this);
        subHeader.setText("Brain Activation Mission");
        subHeader.setTextSize(14);
        subHeader.setTypeface(Typeface.DEFAULT_BOLD);
        subHeader.setTextColor(Color.parseColor("#A855F7"));
        subHeader.setGravity(Gravity.CENTER);
        subHeader.setPadding(0, dpToPx(2), 0, dpToPx(24));
        root.addView(subHeader);

        // Card Container for Shake Tracker
        LinearLayout shakeCard = new LinearLayout(this);
        shakeCard.setOrientation(LinearLayout.VERTICAL);
        shakeCard.setGravity(Gravity.CENTER);
        shakeCard.setPadding(dpToPx(20), dpToPx(20), dpToPx(20), dpToPx(20));

        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.parseColor("#0E1322"));
        cardBg.setCornerRadius(dpToPx(18));
        cardBg.setStroke(dpToPx(1), Color.parseColor("#00E5FF"));
        shakeCard.setBackground(cardBg);

        TextView shakeLabel = new TextView(this);
        shakeLabel.setText("PHASE 1: HARD SHAKES");
        shakeLabel.setTextSize(12);
        shakeLabel.setTypeface(Typeface.DEFAULT_BOLD);
        shakeLabel.setTextColor(Color.parseColor("#94A3B8"));
        shakeLabel.setGravity(Gravity.CENTER);
        shakeCard.addView(shakeLabel);

        // Big Shake Number Counter
        countView = new TextView(this);
        countView.setText("0 / " + REQUIRED_SHAKES);
        countView.setTextSize(48);
        countView.setTypeface(Typeface.DEFAULT_BOLD);
        countView.setTextColor(Color.parseColor("#00E676"));
        countView.setGravity(Gravity.CENTER);
        countView.setPadding(0, dpToPx(10), 0, dpToPx(10));
        shakeCard.addView(countView);

        // Progress Bar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(REQUIRED_SHAKES);
        progressBar.setProgress(0);
        LinearLayout.LayoutParams barParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(12)
        );
        barParams.setMargins(0, dpToPx(6), 0, dpToPx(10));
        shakeCard.addView(progressBar, barParams);

        subtitleView = new TextView(this);
        subtitleView.setText("Shake your device firmly 10 times to silence the alarm siren!");
        subtitleView.setTextSize(13);
        subtitleView.setTextColor(Color.parseColor("#CBD5E1"));
        subtitleView.setGravity(Gravity.CENTER);
        subtitleView.setLineSpacing(1.2f, 1.2f);
        shakeCard.addView(subtitleView);

        root.addView(shakeCard);

        // Phase 2 Explanation Card
        LinearLayout phase2Card = new LinearLayout(this);
        phase2Card.setOrientation(LinearLayout.HORIZONTAL);
        phase2Card.setGravity(Gravity.CENTER_VERTICAL);
        phase2Card.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(12));

        GradientDrawable p2Bg = new GradientDrawable();
        p2Bg.setColor(Color.parseColor("#150E26"));
        p2Bg.setCornerRadius(dpToPx(12));
        p2Bg.setStroke(dpToPx(1), Color.parseColor("#7C3AED"));
        phase2Card.setBackground(p2Bg);

        LinearLayout.LayoutParams p2Params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        p2Params.topMargin = dpToPx(18);
        root.addView(phase2Card, p2Params);

        TextView p2Icon = new TextView(this);
        p2Icon.setText("🏃‍♂️");
        p2Icon.setTextSize(24);
        phase2Card.addView(p2Icon);

        TextView p2Text = new TextView(this);
        p2Text.setText("Phase 2: Complete 50 steps in Running Module within " + graceMinutes + " mins, or alarm loops again!");
        p2Text.setTextSize(12);
        p2Text.setTextColor(Color.parseColor("#E0E7FF"));
        p2Text.setPadding(dpToPx(10), 0, 0, 0);
        phase2Card.addView(p2Text);

        // Emergency Silence & Dismiss Fail-safe Button
        Button btnDismiss = new Button(this);
        btnDismiss.setText("🔇 SILENCE & DISMISS ALARM");
        btnDismiss.setTextColor(Color.WHITE);
        btnDismiss.setTextSize(14);
        btnDismiss.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable dismissBg = new GradientDrawable();
        dismissBg.setColor(Color.parseColor("#33101C"));
        dismissBg.setCornerRadius(dpToPx(12));
        dismissBg.setStroke(dpToPx(1), Color.parseColor("#FF3D71"));
        btnDismiss.setBackground(dismissBg);
        btnDismiss.setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12));
        btnDismiss.setOnClickListener(v -> {
            stopAlarmAlerts();
            Toast.makeText(AlarmActivity.this, "Alarm Silenced.", Toast.LENGTH_SHORT).show();
            finish();
        });

        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        btnParams.topMargin = dpToPx(20);
        root.addView(btnDismiss, btnParams);

        return root;
    }

    private void setupSensor() {
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (accelerometer != null) {
                sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
            }
        }
    }

    private void startAlarmAlerts() {
        AlarmReceiver.playAlarmSiren(this);
    }

    private void stopAlarmAlerts() {
        AlarmReceiver.stopAlarm();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;

        float x = event.values[0] / SensorManager.GRAVITY_EARTH;
        float y = event.values[1] / SensorManager.GRAVITY_EARTH;
        float z = event.values[2] / SensorManager.GRAVITY_EARTH;

        float gForce = (float) Math.sqrt(x * x + y * y + z * z);

        // Require firm hard shake
        if (gForce > 2.1f) {
            long now = System.currentTimeMillis();
            if (now - lastShakeTime > 320) { // 320ms debounce between shakes
                lastShakeTime = now;
                shakeCount++;

                vibratePulse();

                handler.post(() -> {
                    countView.setText(shakeCount + " / " + REQUIRED_SHAKES);
                    progressBar.setProgress(shakeCount);

                    if (shakeCount >= REQUIRED_SHAKES) {
                        onHardShakesCompleted();
                    }
                });
            }
        }
    }

    private void vibratePulse() {
        try {
            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(80);
                }
            }
        } catch (Exception ignored) {}
    }

    @SuppressLint("SetTextI18n")
    private void onHardShakesCompleted() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }

        // 1. SILENCE THE ALARM!
        stopAlarmAlerts();

        titleView.setText("SIREN SILENCED!");
        titleView.setTextColor(Color.parseColor("#00E676"));
        subtitleView.setText("10 hard shakes verified! Now complete 50 steps within " + graceMinutes + " minutes!");

        Toast.makeText(this, "✅ 10 Shakes Verified! Starting 50-Step Mission (" + graceMinutes + "m timer)", Toast.LENGTH_LONG).show();

        // 2. RECORD WAKEUP MISSION STATE IN SHAREDPREFERENCES
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        long deadline = now + (graceMinutes * 60 * 1000L);
        int currentSteps = MainActivity.liveStepCount;

        prefs.edit()
                .putBoolean("wakeup_step_mission_active", true)
                .putLong("wakeup_step_mission_deadline", deadline)
                .putInt("wakeup_start_step_count", currentSteps)
                .putInt("wakeup_target_steps", REQUIRED_STEPS)
                .putInt("wakeup_grace_minutes", graceMinutes)
                .apply();

        // 3. SCHEDULE RE-RING VERIFICATION ALARM IF 50 STEPS NOT MET
        scheduleReRingStepVerificationAlarm(deadline);

        // 4. AUTO-ACTIVATE RUNNING SECTION IN HEALTH TRACKER
        handler.postDelayed(() -> {
            Intent mainIntent = new Intent(AlarmActivity.this, MainActivity.class);
            mainIntent.putExtra("openSection", "run");
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(mainIntent);
            finish();
        }, 1200);
    }

    private void scheduleReRingStepVerificationAlarm(long deadlineEpochMillis) {
        try {
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(this, AlarmReceiver.class);
            intent.putExtra("task_id", "wakeup_smart_alarm_step_check");
            intent.putExtra("is_step_check", true);
            intent.putExtra("next_grace_mins", 5); // When re-ringing, gives only 5 mins loop!
            intent.putExtra("task_title", "Wakeup Mission Alert: 50 Steps Incomplete!");

            PendingIntent pi = PendingIntent.getBroadcast(
                    this,
                    998877,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, deadlineEpochMillis, pi);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, deadlineEpochMillis, pi);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Override
    protected void onDestroy() {
        stopAlarmAlerts();
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        super.onDestroy();
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }
}
