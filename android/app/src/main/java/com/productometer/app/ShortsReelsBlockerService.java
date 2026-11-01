package com.productometer.app;

import android.accessibilityservice.AccessibilityService;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.content.res.AssetFileDescriptor;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Productometer Distraction Guardian & Doomscroll Blocker
 *
 * Rules:
 * 1. 1st Short / Reel / Casual Video -> Grace period (allowed).
 * 2. 2nd consecutive Short / Reel / Casual Video or Distracting App -> 5-second countdown alert.
 * 3. Safely returns user to their previous screen/application (compatible with Gesture Navigation).
 */
public class ShortsReelsBlockerService extends AccessibilityService {
    private boolean isPermanentlyBlocked(String pkg) {
        if (PERMANENTLY_BLOCKED_APPS.contains(pkg)) return true;
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            Set<String> customSet = prefs.getStringSet("blocked_packages_set", null);
            if (customSet != null && customSet.contains(pkg)) return true;
        } catch (Exception ignored) {}
        return false;
    }

    private void playWarningAudioTrack() {
        try {
            MediaPlayer mp = new MediaPlayer();
            AssetFileDescriptor afd = null;
            try {
                afd = getAssets().openFd("assets/2.mp3");
            } catch (Exception e) {
                afd = getAssets().openFd("Features/assets/2.mp3");
            }
            if (afd != null) {
                mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
                mp.prepare();
                mp.start();
                mp.setOnCompletionListener(MediaPlayer::release);
            }
        } catch (Exception e) {
            // Fallback system notification beep
            try {
                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                Ringtone r = RingtoneManager.getRingtone(getApplicationContext(), soundUri);
                if (r != null) r.play();
            } catch (Exception ignored) {}
        }
    }


    public static final String PREFS_NAME = "productometer_blocker_prefs";
    public static final String KEY_SHORTS_ENABLED = "blocker_shorts_enabled";
    public static final String KEY_REELS_ENABLED = "blocker_reels_enabled";
    public static final String KEY_MASTER_ENABLED = "master_blocker_enabled";
    public static final String KEY_FOCUS_ACTIVE = "focus_session_active";

    public static boolean isServiceRunning = false;
    public static boolean isFocusSessionOngoing = false;
    public static boolean isMasterBlockerEnabled = false;

    private static final String PKG_YOUTUBE = "com.google.android.youtube";
    private static final String PKG_INSTAGRAM = "com.instagram.android";

    private static final Set<String> PERMANENTLY_BLOCKED_APPS = new HashSet<>(Arrays.asList(
            "com.whatsapp",
            "com.facebook.katana",
            "com.facebook.orca",
            "com.instagram.android",
            "com.twitter.android",
            "com.snapchat.android",
            "com.zhiliaoapp.musically",
            "com.ss.android.ugc.trill",
            "com.reddit.frontpage",
            "com.netflix.mediaclient",
            "com.amazon.avod.thirdpartyclient"
    ));
    private static final Set<String> DISTRACTING_APPS = PERMANENTLY_BLOCKED_APPS;

    // 30-Second Emergency Pass Timestamp
    public static long emergencyPassUntilTimestamp = 0L;
    private String activeCasualVideoSignature = "";
    private long casualVideoStartTimestamp = 0L;
    private Runnable casualVideoWarningRunnable = null;

    // Session tracking variables
    private int distractionCount = 0;
    private String lastDistractionSignature = "";
    private long lastDistractionTimestamp = 0;
    private String previousNonDistractingPackage = null;
    private boolean isOverlayActive = false;
    private boolean isCoolingDown = false;

    private WindowManager windowManager;
    private View overlayView;
    private CountDownTimer countdownTimer;
    private Handler mainHandler;

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
        mainHandler = new Handler(Looper.getMainLooper());
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        isServiceRunning = true;
    }

    @Override
    public void onDestroy() {
        isServiceRunning = false;
        dismissOverlay();
        super.onDestroy();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        CharSequence packageNameChar = event.getPackageName();
        if (packageNameChar == null) return;
        String packageName = packageNameChar.toString();

        // Track user's productive / previous app
        if (!DISTRACTING_APPS.contains(packageName) && !PKG_YOUTUBE.equals(packageName) && !packageName.equals(getPackageName())) {
            previousNonDistractingPackage = packageName;
            resetDistractionSession();
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean masterEnabled = isMasterBlockerEnabled || prefs.getBoolean(KEY_MASTER_ENABLED, false);
        boolean sessionOngoing = isFocusSessionOngoing || prefs.getBoolean(KEY_FOCUS_ACTIVE, false);

        // The Distraction Blocker is ONLY active when a focus session is ongoing OR master switch is ON!
        if (!masterEnabled && !sessionOngoing) {
            return;
        }

        boolean isShortsBlocked = prefs.getBoolean(KEY_SHORTS_ENABLED, true);
        boolean isReelsBlocked = prefs.getBoolean(KEY_REELS_ENABLED, true);

        // Skip detection while overlay or back-cooldown is active
        if (isOverlayActive || isCoolingDown) return;

        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return;

        try {
            // Check Emergency Pass status
            long nowTime = System.currentTimeMillis();
            boolean hasEmergencyPass = nowTime < emergencyPassUntilTimestamp;

            // 1. Permanently Blocked Apps (WhatsApp, FB, Instagram, etc.)
            if (isPermanentlyBlocked(packageName)) {
                if (hasEmergencyPass) {
                    return; // Grace pass active
                }
                mainHandler.post(() -> showInterceptionDialog(packageName, getFriendlyName(packageName)));
                return;
            }

            boolean isDistractionActive = false;
            String signature = "";
            String distractionLabel = "Distraction";

            if (PKG_YOUTUBE.equals(packageName)) {
                if (isShortsBlocked) {
                    signature = detectYouTubeShort(rootNode, event);
                    if (signature != null && !signature.isEmpty()) {
                        isDistractionActive = true;
                        distractionLabel = "YouTube Shorts";
                    }
                }
                if (!isDistractionActive) {
                    // Casual YouTube video: 15-second delay warning with 2.mp3 (no abrupt navigation back)
                    signature = detectYouTubeCasualVideo(rootNode, event);
                    if (signature != null && !signature.isEmpty()) {
                        handleCasualYouTubeVideoDelayed(signature);
                        return;
                    } else {
                        // Cleared casual video
                        activeCasualVideoSignature = "";
                    }
                }
            } else if (PKG_INSTAGRAM.equals(packageName)) {
                if (isReelsBlocked) {
                    signature = detectInstagramReel(rootNode, event);
                    if (signature != null && !signature.isEmpty()) {
                        isDistractionActive = true;
                        distractionLabel = "Instagram Reels";
                    }
                }
            }

            if (isDistractionActive) {
                handleDistractionDetected(signature, distractionLabel);
            } else {
                long now = System.currentTimeMillis();
                if (now - lastDistractionTimestamp > 8000) {
                    resetDistractionSession();
                }
            }
        } finally {
            rootNode.recycle();
        }
    }

    private String detectYouTubeShort(AccessibilityNodeInfo root, AccessibilityEvent event) {
        List<AccessibilityNodeInfo> reelNodes = root.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/reel_recycler");
        if (reelNodes == null || reelNodes.isEmpty()) {
            reelNodes = root.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/reel_player_page_container");
        }
        if (reelNodes == null || reelNodes.isEmpty()) {
            reelNodes = root.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/reel_player_overlay_layout");
        }

        boolean hasReelNode = (reelNodes != null && !reelNodes.isEmpty());
        if (reelNodes != null) {
            for (AccessibilityNodeInfo n : reelNodes) n.recycle();
        }

        CharSequence className = event.getClassName();
        String classStr = className != null ? className.toString() : "";
        boolean isReelScroll = event.getEventType() == AccessibilityEvent.TYPE_VIEW_SCROLLED && hasReelNode;

        if (hasReelNode || classStr.contains("Reel") || isReelScroll) {
            String textDump = extractVisibleTextSignature(root);
            return "yt_short_" + (textDump.isEmpty() ? String.valueOf(System.currentTimeMillis() / 3000) : textDump);
        }

        return null;
    }

    private String detectYouTubeCasualVideo(AccessibilityNodeInfo root, AccessibilityEvent event) {
        // Exclude inline_player so home feed autoplay previews are completely ignored!
        List<AccessibilityNodeInfo> playerNodes = root.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/player_view");
        if (playerNodes == null || playerNodes.isEmpty()) {
            playerNodes = root.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/watch_while_layout");
        }

        boolean hasPlayer = (playerNodes != null && !playerNodes.isEmpty());
        if (playerNodes != null) {
            for (AccessibilityNodeInfo n : playerNodes) n.recycle();
        }

        if (!hasPlayer) return null;

        String textDump = extractVisibleTextSignature(root).toLowerCase();
        boolean isEducational = textDump.contains("lecture") || textDump.contains("tutorial") ||
                textDump.contains("class") || textDump.contains("course") ||
                textDump.contains("physics") || textDump.contains("math") ||
                textDump.contains("chemistry") || textDump.contains("study") ||
                textDump.contains("programming") || textDump.contains("coding") ||
                textDump.contains("exam") || textDump.contains("dsa") ||
                textDump.contains("chapter");

        if (isEducational) {
            return null; // Allowed! Educational content
        }

        return "yt_casual_" + (textDump.isEmpty() ? String.valueOf(System.currentTimeMillis() / 5000) : textDump);
    }

    private String detectInstagramReel(AccessibilityNodeInfo root, AccessibilityEvent event) {
        List<AccessibilityNodeInfo> clipsNodes = root.findAccessibilityNodeInfosByViewId("com.instagram.android:id/clips_video_container");
        if (clipsNodes == null || clipsNodes.isEmpty()) {
            clipsNodes = root.findAccessibilityNodeInfosByViewId("com.instagram.android:id/clips_viewer_view_pager");
        }
        if (clipsNodes == null || clipsNodes.isEmpty()) {
            clipsNodes = root.findAccessibilityNodeInfosByViewId("com.instagram.android:id/reel_viewer_view_pager");
        }

        boolean hasClipsNode = (clipsNodes != null && !clipsNodes.isEmpty());
        if (clipsNodes != null) {
            for (AccessibilityNodeInfo n : clipsNodes) n.recycle();
        }

        CharSequence className = event.getClassName();
        String classStr = className != null ? className.toString() : "";
        boolean isClipsFragment = classStr.contains("Clips") || classStr.contains("ReelViewer");

        if (hasClipsNode || isClipsFragment) {
            String textDump = extractVisibleTextSignature(root);
            return "ig_reel_" + (textDump.isEmpty() ? String.valueOf(System.currentTimeMillis() / 3000) : textDump);
        }

        return null;
    }

    private String extractVisibleTextSignature(AccessibilityNodeInfo node) {
        if (node == null) return "";
        StringBuilder sb = new StringBuilder();
        collectText(node, sb, 0);
        return sb.toString();
    }

    private void collectText(AccessibilityNodeInfo node, StringBuilder sb, int depth) {
        if (node == null || depth > 5) return;
        CharSequence desc = node.getContentDescription();
        if (desc != null && desc.length() > 2) {
            sb.append(desc.toString().trim()).append("|");
            return;
        }
        CharSequence txt = node.getText();
        if (txt != null && txt.length() > 2) {
            sb.append(txt.toString().trim()).append("|");
            return;
        }
        int childCount = Math.min(node.getChildCount(), 6);
        for (int i = 0; i < childCount; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                collectText(child, sb, depth + 1);
                child.recycle();
            }
        }
    }

    private synchronized void handleDistractionDetected(String signature, String label) {
        long now = System.currentTimeMillis();
        lastDistractionTimestamp = now;

        if (signature.equals(lastDistractionSignature)) {
            return;
        }

        lastDistractionSignature = signature;
        distractionCount++;

        if (distractionCount == 1) {
            mainHandler.post(() -> Toast.makeText(
                    getApplicationContext(),
                    "🛡️ Productometer: 1st " + label + " allowed (grace). Next will trigger guardian alert.",
                    Toast.LENGTH_SHORT
            ).show());
        } else if (distractionCount >= 2) {
            mainHandler.post(() -> showCountdownOverlay(label));
        }
    }

    private void resetDistractionSession() {
        distractionCount = 0;
        lastDistractionSignature = "";
    }

    @SuppressLint("SetTextI18n")
    
    private void handleCasualYouTubeVideoDelayed(String signature) {
        long now = System.currentTimeMillis();
        if (!signature.equals(activeCasualVideoSignature)) {
            activeCasualVideoSignature = signature;
            casualVideoStartTimestamp = now;
            return; // Grace start of 15 seconds
        }

        // If user has been watching this casual video continuously for >= 15 seconds
        if (now - casualVideoStartTimestamp >= 15000L) {
            casualVideoStartTimestamp = now + 45000L; // Don't spam: remind again after 45s if still watching
            mainHandler.post(() -> {
                playWarningAudioTrack();
                Toast.makeText(
                        getApplicationContext(),
                        "⚠️ Focus Alert: 15s elapsed on casual entertainment video",
                        Toast.LENGTH_LONG
                ).show();
            });
        }
    }

    @SuppressLint("SetTextI18n")
    private void showInterceptionDialog(String pkgName, String appLabel) {
        if (isOverlayActive) return;
        isOverlayActive = true;

        int windowType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            windowType = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            windowType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            windowType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                windowType,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setGravity(Gravity.CENTER);
        int pad = dpToPx(24);
        rootLayout.setPadding(pad, pad, pad, pad);

        GradientDrawable bgShape = new GradientDrawable();
        bgShape.setColor(Color.parseColor("#EE0B0D17"));
        bgShape.setCornerRadius(dpToPx(22));
        bgShape.setStroke(dpToPx(2), Color.parseColor("#FF1744"));
        rootLayout.setBackground(bgShape);

        // Shield / Ban Icon
        TextView iconView = new TextView(this);
        iconView.setText("🚫");
        iconView.setTextSize(36);
        iconView.setGravity(Gravity.CENTER);
        rootLayout.addView(iconView);

        // Title: Access Intercepted
        TextView titleView = new TextView(this);
        titleView.setText("Access Intercepted");
        titleView.setTextSize(19);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setTextColor(Color.WHITE);
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0, dpToPx(8), 0, 0);
        rootLayout.addView(titleView);

        // Reason box
        TextView reasonView = new TextView(this);
        reasonView.setText(appLabel + " is restricted by Productometer Guardian during your active session. Keep focused!");
        reasonView.setTextSize(13);
        reasonView.setTextColor(Color.parseColor("#94A3B8"));
        reasonView.setGravity(Gravity.CENTER);
        reasonView.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(18));
        rootLayout.addView(reasonView);

        // Primary Action: Return to Focus
        Button returnBtn = new Button(this);
        returnBtn.setText("⬅️ Return to Focus");
        returnBtn.setTextSize(14);
        returnBtn.setTypeface(Typeface.DEFAULT_BOLD);
        returnBtn.setTextColor(Color.BLACK);

        GradientDrawable returnBg = new GradientDrawable();
        returnBg.setColor(Color.parseColor("#00E5FF"));
        returnBg.setCornerRadius(dpToPx(12));
        returnBtn.setBackground(returnBg);

        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(48)
        );
        rootLayout.addView(returnBtn, btnParams);

        // Override Action: Emergency Pass (30 Seconds)
        Button emergencyBtn = new Button(this);
        emergencyBtn.setText("Emergency Pass (30 Seconds)");
        emergencyBtn.setTextSize(12);
        emergencyBtn.setTypeface(Typeface.DEFAULT_BOLD);
        emergencyBtn.setTextColor(Color.parseColor("#A0A0AB"));

        GradientDrawable emergencyBg = new GradientDrawable();
        emergencyBg.setColor(Color.parseColor("#151D2A"));
        emergencyBg.setStroke(dpToPx(1), Color.parseColor("#334155"));
        emergencyBg.setCornerRadius(dpToPx(12));
        emergencyBtn.setBackground(emergencyBg);

        LinearLayout.LayoutParams emParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(44)
        );
        emParams.setMargins(0, dpToPx(10), 0, 0);
        rootLayout.addView(emergencyBtn, emParams);

        returnBtn.setOnClickListener(v -> performBackActionOnce());

        emergencyBtn.setOnClickListener(v -> {
            emergencyPassUntilTimestamp = System.currentTimeMillis() + 30000L;
            dismissOverlay();
            Toast.makeText(
                    getApplicationContext(),
                    "⏱️ Emergency pass active: 30 seconds granted",
                    Toast.LENGTH_SHORT
            ).show();
        });

        overlayView = rootLayout;

        try {
            windowManager.addView(overlayView, params);
        } catch (Exception e) {
            e.printStackTrace();
            isOverlayActive = false;
            performBackActionOnce();
        }
    }

    @SuppressLint("SetTextI18n")
    private void showCountdownOverlay(String label) {
        if (isOverlayActive) return;
        isOverlayActive = true;

        int windowType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            windowType = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            windowType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            windowType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                windowType,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setGravity(Gravity.CENTER);
        int pad = dpToPx(20);
        rootLayout.setPadding(pad, pad, pad, pad);

        GradientDrawable bgShape = new GradientDrawable();
        bgShape.setColor(Color.parseColor("#EE0B0D17"));
        bgShape.setCornerRadius(dpToPx(20));
        bgShape.setStroke(dpToPx(2), Color.parseColor("#FF1744"));
        rootLayout.setBackground(bgShape);

        TextView titleView = new TextView(this);
        titleView.setText("🛡️ DOOMSCROLL GUARDIAN");
        titleView.setTextSize(16);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setTextColor(Color.parseColor("#00E5FF"));
        titleView.setGravity(Gravity.CENTER);
        rootLayout.addView(titleView);

        TextView subtitleView = new TextView(this);
        subtitleView.setText(label + " Detected!");
        subtitleView.setTextSize(18);
        subtitleView.setTypeface(Typeface.DEFAULT_BOLD);
        subtitleView.setTextColor(Color.WHITE);
        subtitleView.setGravity(Gravity.CENTER);
        subtitleView.setPadding(0, dpToPx(6), 0, 0);
        rootLayout.addView(subtitleView);

        TextView descView = new TextView(this);
        descView.setText("Returning to your previous screen to protect your focus.");
        descView.setTextSize(13);
        descView.setTextColor(Color.parseColor("#94A3B8"));
        descView.setGravity(Gravity.CENTER);
        descView.setPadding(0, dpToPx(4), 0, dpToPx(14));
        rootLayout.addView(descView);

        final TextView countdownNumberView = new TextView(this);
        countdownNumberView.setText("5");
        countdownNumberView.setTextSize(36);
        countdownNumberView.setTypeface(Typeface.DEFAULT_BOLD);
        countdownNumberView.setTextColor(Color.parseColor("#FF1744"));
        countdownNumberView.setGravity(Gravity.CENTER);

        GradientDrawable circleDrawable = new GradientDrawable();
        circleDrawable.setColor(Color.parseColor("#1E293B"));
        circleDrawable.setShape(GradientDrawable.OVAL);
        circleDrawable.setSize(dpToPx(64), dpToPx(64));
        circleDrawable.setStroke(dpToPx(2), Color.parseColor("#FF1744"));
        countdownNumberView.setBackground(circleDrawable);

        LinearLayout.LayoutParams circleParams = new LinearLayout.LayoutParams(dpToPx(64), dpToPx(64));
        circleParams.gravity = Gravity.CENTER;
        rootLayout.addView(countdownNumberView, circleParams);

        Button returnBtn = new Button(this);
        returnBtn.setText("↩️ Return Now");
        returnBtn.setTextSize(14);
        returnBtn.setTypeface(Typeface.DEFAULT_BOLD);
        returnBtn.setTextColor(Color.BLACK);

        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setColor(Color.parseColor("#00E5FF"));
        btnBg.setCornerRadius(dpToPx(12));
        returnBtn.setBackground(btnBg);

        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(46)
        );
        btnParams.setMargins(0, dpToPx(16), 0, 0);
        rootLayout.addView(returnBtn, btnParams);

        returnBtn.setOnClickListener(v -> performBackActionOnce());

        overlayView = rootLayout;

        try {
            windowManager.addView(overlayView, params);
        } catch (Exception e) {
            e.printStackTrace();
            isOverlayActive = false;
            performBackActionOnce();
            return;
        }

        countdownTimer = new CountDownTimer(5000L, 1000L) {
            @Override
            public void onTick(long millisUntilFinished) {
                int secondsRemaining = (int) Math.ceil(millisUntilFinished / 1000.0);
                countdownNumberView.setText(String.valueOf(secondsRemaining));
            }

            @Override
            public void onFinish() {
                performBackActionOnce();
            }
        }.start();
    }

    /**
     * Dismisses popup and executes BACK action with a 250ms delay for Gesture Navigation.
     * Also brings previous non-distracting application back to front.
     */
    private synchronized void performBackActionOnce() {
        dismissOverlay();

        if (isCoolingDown) return;
        isCoolingDown = true;

        final String targetPkg = previousNonDistractingPackage;

        // CRITICAL FOR GESTURE NAVIGATION:
        // Wait 250ms for Android WindowManager to restore input focus to the target app window!
        mainHandler.postDelayed(() -> {
            boolean success = performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK);

            // Double back after 350ms to collapse YouTube video players or exit nested screens
            mainHandler.postDelayed(() -> {
                performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK);

                // Fallback Intent directly to previous app
                if (targetPkg != null && !targetPkg.equals(getPackageName())) {
                    mainHandler.postDelayed(() -> {
                        try {
                            Intent intent = getPackageManager().getLaunchIntentForPackage(targetPkg);
                            if (intent != null) {
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                                startActivity(intent);
                            }
                        } catch (Exception ignored) {}
                    }, 300L);
                }
            }, 350L);
        }, 250L);

        Toast.makeText(
                getApplicationContext(),
                "🛡️ Productometer: Returned to protect your focus",
                Toast.LENGTH_SHORT
        ).show();

        resetDistractionSession();

        mainHandler.postDelayed(() -> {
            isCoolingDown = false;
        }, 3000L);
    }

    private void dismissOverlay() {
        if (countdownTimer != null) {
            countdownTimer.cancel();
            countdownTimer = null;
        }
        if (overlayView != null && windowManager != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception ignored) {}
            overlayView = null;
        }
        isOverlayActive = false;
    }

    private String getFriendlyName(String pkg) {
        if (pkg.contains("facebook")) return "Facebook";
        if (pkg.contains("instagram")) return "Instagram";
        if (pkg.contains("twitter")) return "X (Twitter)";
        if (pkg.contains("snapchat")) return "Snapchat";
        if (pkg.contains("reddit")) return "Reddit";
        if (pkg.contains("netflix")) return "Netflix";
        if (pkg.contains("tiktok") || pkg.contains("musically")) return "TikTok";
        return "Distracting App";
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onInterrupt() {
        dismissOverlay();
    }
}
