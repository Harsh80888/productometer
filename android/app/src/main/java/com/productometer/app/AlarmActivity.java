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
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import android.app.Notification;
import android.app.NotificationManager;
import androidx.core.app.NotificationCompat;
import androidx.appcompat.app.AppCompatActivity;

import java.util.Calendar;

public class AlarmActivity extends AppCompatActivity implements SensorEventListener {

    public static final String PREFS_NAME = "ShortsReelsBlockerPrefs";
    private static final int REQUIRED_SHAKES = 10;
    private static final int REQUIRED_STEPS = 50;
    public static final String DISMISS_PASSPHRASE = "I am awaken but don't want to walk now so I am using this typing method to disable the alarm";

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
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setBackgroundColor(Color.parseColor("#05070D"));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(Color.parseColor("#05070D"));
        root.setPadding(dpToPx(20), dpToPx(24), dpToPx(20), dpToPx(36));

        scrollView.addView(root);

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

        // --- ✍️ CONSCIOUS TYPING VERIFICATION CHALLENGE (REPLACES DIRECT DISMISS BUTTON) ---
        LinearLayout typingCard = new LinearLayout(this);
        typingCard.setOrientation(LinearLayout.VERTICAL);
        typingCard.setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16));

        GradientDrawable typingBg = new GradientDrawable();
        typingBg.setColor(Color.parseColor("#0E1322"));
        typingBg.setCornerRadius(dpToPx(14));
        typingBg.setStroke(dpToPx(1), Color.parseColor("#374151"));
        typingCard.setBackground(typingBg);

        LinearLayout.LayoutParams tcParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        tcParams.topMargin = dpToPx(20);
        root.addView(typingCard, tcParams);

        TextView typingTitle = new TextView(this);
        typingTitle.setText("✍️ Don't want to walk? Typing Challenge");
        typingTitle.setTextSize(13);
        typingTitle.setTypeface(Typeface.DEFAULT_BOLD);
        typingTitle.setTextColor(Color.parseColor("#F59E0B")); // Amber
        typingCard.addView(typingTitle);

        TextView typingDesc = new TextView(this);
        typingDesc.setText("To prove conscious awareness and disable the alarm without walking 50 steps, type the exact statement below:");
        typingDesc.setTextSize(11);
        typingDesc.setTextColor(Color.parseColor("#94A3B8"));
        typingDesc.setPadding(0, dpToPx(4), 0, dpToPx(10));
        typingCard.addView(typingDesc);

        TextView phraseBox = new TextView(this);
        phraseBox.setText("\"" + DISMISS_PASSPHRASE + "\"");
        phraseBox.setTextSize(12);
        phraseBox.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.ITALIC));
        phraseBox.setTextColor(Color.parseColor("#E0E7FF"));
        phraseBox.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        GradientDrawable phraseBg = new GradientDrawable();
        phraseBg.setColor(Color.parseColor("#1E1B4B"));
        phraseBg.setCornerRadius(dpToPx(8));
        phraseBg.setStroke(dpToPx(1), Color.parseColor("#4338CA"));
        phraseBox.setBackground(phraseBg);
        typingCard.addView(phraseBox);

        EditText inputField = new EditText(this);
        inputField.setHint("Type the exact sentence here...");
        inputField.setHintTextColor(Color.parseColor("#475569"));
        inputField.setTextColor(Color.WHITE);
        inputField.setTextSize(13);
        inputField.setMinLines(2);
        inputField.setMaxLines(4);
        inputField.setGravity(Gravity.TOP | Gravity.START);
        inputField.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        inputField.setPadding(dpToPx(10), dpToPx(10), dpToPx(10), dpToPx(10));

        GradientDrawable inputBg = new GradientDrawable();
        inputBg.setColor(Color.parseColor("#060913"));
        inputBg.setCornerRadius(dpToPx(8));
        inputBg.setStroke(dpToPx(1), Color.parseColor("#334155"));
        inputField.setBackground(inputBg);

        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        inputParams.topMargin = dpToPx(10);
        typingCard.addView(inputField, inputParams);

        TextView matchFeedback = new TextView(this);
        matchFeedback.setText("0 / " + DISMISS_PASSPHRASE.length() + " characters matched");
        matchFeedback.setTextSize(11);
        matchFeedback.setTextColor(Color.parseColor("#64748B"));
        matchFeedback.setPadding(0, dpToPx(6), 0, dpToPx(8));
        typingCard.addView(matchFeedback);

        Button btnConfirmDismiss = new Button(this);
        btnConfirmDismiss.setText("🔒 Complete Typing to Disable Alarm");
        btnConfirmDismiss.setTextColor(Color.parseColor("#6B7280"));
        btnConfirmDismiss.setTextSize(13);
        btnConfirmDismiss.setTypeface(Typeface.DEFAULT_BOLD);
        btnConfirmDismiss.setEnabled(false);

        GradientDrawable btnDisabledBg = new GradientDrawable();
        btnDisabledBg.setColor(Color.parseColor("#1F2937"));
        btnDisabledBg.setCornerRadius(dpToPx(10));
        btnConfirmDismiss.setBackground(btnDisabledBg);

        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(46)
        );
        typingCard.addView(btnConfirmDismiss, btnParams);

        inputField.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(Editable s) {
                String typed = s != null ? s.toString().trim() : "";
                String normalizedTyped = typed.replace('’', '\'').replace('‘', '\'').replaceAll("\\s+", " ");
                String normalizedTarget = DISMISS_PASSPHRASE.replaceAll("\\s+", " ");

                int matchedChars = 0;
                int minLen = Math.min(normalizedTyped.length(), normalizedTarget.length());
                for (int i = 0; i < minLen; i++) {
                    if (Character.toLowerCase(normalizedTyped.charAt(i)) == Character.toLowerCase(normalizedTarget.charAt(i))) {
                        matchedChars++;
                    } else {
                        break;
                    }
                }

                if (normalizedTarget.equalsIgnoreCase(normalizedTyped)) {
                    matchFeedback.setText("✅ Exact Match Verified! Tap below to disable alarm.");
                    matchFeedback.setTextColor(Color.parseColor("#00E676"));

                    btnConfirmDismiss.setEnabled(true);
                    btnConfirmDismiss.setText("✅ DISABLE ALARM & CANCEL MISSION");
                    btnConfirmDismiss.setTextColor(Color.BLACK);

                    GradientDrawable btnActiveBg = new GradientDrawable();
                    btnActiveBg.setColor(Color.parseColor("#00E5FF"));
                    btnActiveBg.setCornerRadius(dpToPx(10));
                    btnConfirmDismiss.setBackground(btnActiveBg);
                } else {
                    btnConfirmDismiss.setEnabled(false);
                    btnConfirmDismiss.setText("🔒 Complete Typing to Disable Alarm");
                    btnConfirmDismiss.setTextColor(Color.parseColor("#6B7280"));

                    GradientDrawable btnDisabledBg = new GradientDrawable();
                    btnDisabledBg.setColor(Color.parseColor("#1F2937"));
                    btnDisabledBg.setCornerRadius(dpToPx(10));
                    btnConfirmDismiss.setBackground(btnDisabledBg);

                    matchFeedback.setText(matchedChars + " / " + normalizedTarget.length() + " characters matched");
                    matchFeedback.setTextColor(Color.parseColor("#94A3B8"));
                }
            }
        });

        btnConfirmDismiss.setOnClickListener(v -> {
            stopAlarmAlerts();
            if (sensorManager != null) {
                sensorManager.unregisterListener(AlarmActivity.this);
            }

            // Stop background step tracker service
            WakeupStepTrackerService.stopService(AlarmActivity.this);

            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            Calendar c = Calendar.getInstance();
            String todayDateStr = String.format("%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
            prefs.edit()
                    .putBoolean("wakeup_step_mission_active", false)
                    .putString("wakeup_mission_completed_date", todayDateStr)
                    .remove("wakeup_alarm_skipped_date")
                    .apply();

            try {
                AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    Intent stepIntent = new Intent(AlarmActivity.this, AlarmReceiver.class);
                    stepIntent.putExtra("task_id", "wakeup_smart_alarm_step_check");
                    stepIntent.putExtra("is_step_check", true);
                    PendingIntent stepPi = PendingIntent.getBroadcast(
                            AlarmActivity.this,
                            998877,
                            stepIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                    );
                    am.cancel(stepPi);
                }
            } catch (Exception ignored) {}

            try {
                AlarmReceiver.ensureGeneralChannel(AlarmActivity.this);
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    Intent openIntent = new Intent(AlarmActivity.this, MainActivity.class);
                    PendingIntent openPi = PendingIntent.getActivity(
                            AlarmActivity.this,
                            4004,
                            openIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                    );
                    Notification disarmedNotif = new NotificationCompat.Builder(AlarmActivity.this, MainActivity.CHANNEL_ID_GENERAL)
                            .setSmallIcon(android.R.drawable.ic_dialog_info)
                            .setContentTitle("✅ Alarm Disabled (Typing Verified)")
                            .setContentText("Wake-up mission cleared. Have a productive day!")
                            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                            .setAutoCancel(true)
                            .setContentIntent(openPi)
                            .build();
                    nm.notify(3004, disarmedNotif);
                }
            } catch (Exception ignored) {}

            Toast.makeText(AlarmActivity.this, "✅ Alarm disabled via conscious typing verification.", Toast.LENGTH_LONG).show();
            finish();
        });

        return scrollView;
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

        prefs.edit()
                .putBoolean("wakeup_step_mission_active", true)
                .putLong("wakeup_step_mission_deadline", deadline)
                .putInt("wakeup_current_steps", 0)
                .putInt("wakeup_start_step_count", 0)
                .putInt("wakeup_target_steps", REQUIRED_STEPS)
                .putInt("wakeup_grace_minutes", graceMinutes)
                .apply();

        // 3. START BACKGROUND FOREGROUND STEP TRACKER SERVICE (ACCELEROMETER + HARDWARE STEP DETECTOR)!
        WakeupStepTrackerService.startService(this, graceMinutes);

        // 4. SCHEDULE RE-RING VERIFICATION ALARM IF 50 STEPS NOT MET
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
