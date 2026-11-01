package com.productometer.app;

import android.accessibilityservice.AccessibilityService;
import android.annotation.SuppressLint;
import android.content.Context;
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
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.util.List;

/**
 * Productometer Doomscroll Guardian (Accessibility Service)
 *
 * Rules:
 * 1. Allows the 1st Reel / Short freely (grace rule).
 * 2. On the 2nd Reel / Short, displays a 5-second countdown popup overlay.
 * 3. Triggers GLOBAL_ACTION_BACK only once when countdown completes, returning the user
 *    to the exact screen from where they were distracted.
 */
public class ShortsReelsBlockerService extends AccessibilityService {

    public static final String PREFS_NAME = "productometer_blocker_prefs";
    public static final String KEY_SHORTS_ENABLED = "blocker_shorts_enabled";
    public static final String KEY_REELS_ENABLED = "blocker_reels_enabled";

    public static boolean isServiceRunning = false;

    private static final String PKG_YOUTUBE = "com.google.android.youtube";
    private static final String PKG_INSTAGRAM = "com.instagram.android";

    // Session tracking variables
    private int reelCount = 0;
    private String lastReelSignature = "";
    private long lastReelDetectedTimestamp = 0;
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

        if (!PKG_YOUTUBE.equals(packageName) && !PKG_INSTAGRAM.equals(packageName)) {
            // User switched to another app - reset reel counter
            resetReelSession();
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isShortsBlocked = prefs.getBoolean(KEY_SHORTS_ENABLED, true);
        boolean isReelsBlocked = prefs.getBoolean(KEY_REELS_ENABLED, true);

        if (PKG_YOUTUBE.equals(packageName) && !isShortsBlocked) return;
        if (PKG_INSTAGRAM.equals(packageName) && !isReelsBlocked) return;

        // Skip detection while overlay or back-cooldown is active
        if (isOverlayActive || isCoolingDown) return;

        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return;

        try {
            boolean isReelActive = false;
            String reelSignature = "";

            if (PKG_YOUTUBE.equals(packageName)) {
                reelSignature = detectYouTubeShort(rootNode, event);
                isReelActive = (reelSignature != null && !reelSignature.isEmpty());
            } else if (PKG_INSTAGRAM.equals(packageName)) {
                reelSignature = detectInstagramReel(rootNode, event);
                isReelActive = (reelSignature != null && !reelSignature.isEmpty());
            }

            if (isReelActive) {
                handleReelDetected(reelSignature);
            } else {
                // If user is in YouTube or Instagram but NOT in Reels/Shorts (e.g. search, channel, feed)
                long now = System.currentTimeMillis();
                if (now - lastReelDetectedTimestamp > 8000) {
                    resetReelSession();
                }
            }
        } finally {
            rootNode.recycle();
        }
    }

    /**
     * Inspects YouTube UI nodes to detect if a Short is currently on screen.
     */
    private String detectYouTubeShort(AccessibilityNodeInfo root, AccessibilityEvent event) {
        // 1. Look for reel player resource identifiers
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

        // 2. Also inspect content descriptions or active titles
        CharSequence className = event.getClassName();
        String classStr = className != null ? className.toString() : "";
        boolean isReelScroll = event.getEventType() == AccessibilityEvent.TYPE_VIEW_SCROLLED && hasReelNode;

        if (hasReelNode || classStr.contains("Reel") || isReelScroll) {
            // Generate a signature using current visible text / time to distinguish consecutive shorts
            String textDump = extractVisibleTextSignature(root);
            return "yt_short_" + (textDump.isEmpty() ? String.valueOf(System.currentTimeMillis() / 3000) : textDump);
        }

        return null;
    }

    /**
     * Inspects Instagram UI nodes to detect if a Reel is currently on screen.
     */
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

    /**
     * State Engine:
     * - 1st Reel -> Allowed! (Grace reel).
     * - 2nd Reel -> Trigger 5-second countdown popup & return once.
     */
    private synchronized void handleReelDetected(String signature) {
        long now = System.currentTimeMillis();
        lastReelDetectedTimestamp = now;

        // Debounce repeated events for the exact same reel
        if (signature.equals(lastReelSignature)) {
            return;
        }

        lastReelSignature = signature;
        reelCount++;

        if (reelCount == 1) {
            // First reel is allowed freely
            mainHandler.post(() -> Toast.makeText(
                    getApplicationContext(),
                    "🛡️ Productometer: 1st Reel allowed. 2nd Reel will be blocked.",
                    Toast.LENGTH_SHORT
            ).show());
        } else if (reelCount >= 2) {
            // Second reel detected: Launch 5-second countdown popup!
            mainHandler.post(this::showCountdownOverlay);
        }
    }

    private void resetReelSession() {
        reelCount = 0;
        lastReelSignature = "";
    }

    /**
     * Builds and attaches the floating 5-second countdown dialog over the screen.
     */
    @SuppressLint("SetTextI18n")
    private void showCountdownOverlay() {
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

        // Root container with dark cyberpunk frosted aesthetic
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setGravity(Gravity.CENTER);
        int pad = dpToPx(20);
        rootLayout.setPadding(pad, pad, pad, pad);

        GradientDrawable bgShape = new GradientDrawable();
        bgShape.setColor(Color.parseColor("#EE0B0D17")); // 93% opacity obsidian
        bgShape.setCornerRadius(dpToPx(20));
        bgShape.setStroke(dpToPx(2), Color.parseColor("#FF1744")); // Cyberpunk crimson border
        rootLayout.setBackground(bgShape);

        // Header Title
        TextView titleView = new TextView(this);
        titleView.setText("🛡️ DOOMSCROLL GUARDIAN");
        titleView.setTextSize(16);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setTextColor(Color.parseColor("#00E5FF"));
        titleView.setGravity(Gravity.CENTER);
        rootLayout.addView(titleView);

        // Subtitle Alert
        TextView subtitleView = new TextView(this);
        subtitleView.setText("Second Reel Detected!");
        subtitleView.setTextSize(18);
        subtitleView.setTypeface(Typeface.DEFAULT_BOLD);
        subtitleView.setTextColor(Color.WHITE);
        subtitleView.setGravity(Gravity.CENTER);
        subtitleView.setPadding(0, dpToPx(6), 0, 0);
        rootLayout.addView(subtitleView);

        // Notice Message
        TextView descView = new TextView(this);
        descView.setText("Returning to your previous screen to protect your focus.");
        descView.setTextSize(13);
        descView.setTextColor(Color.parseColor("#94A3B8"));
        descView.setGravity(Gravity.CENTER);
        descView.setPadding(0, dpToPx(4), 0, dpToPx(14));
        rootLayout.addView(descView);

        // Big Countdown Number Circle
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

        // Action Button: "Return Now"
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

        // 5-second countdown timer
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
     * Dismisses the popup and triggers GLOBAL_ACTION_BACK only once.
     * Takes the user right back to the screen from where they got distracted.
     */
    private synchronized void performBackActionOnce() {
        dismissOverlay();

        if (isCoolingDown) return;
        isCoolingDown = true;

        // Perform system BACK only once
        boolean success = performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK);

        if (success) {
            Toast.makeText(
                    getApplicationContext(),
                    "🛡️ Productometer: Returned to your previous screen",
                    Toast.LENGTH_SHORT
            ).show();
        }

        // Reset counters and allow safety cooldown
        resetReelSession();

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

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onInterrupt() {
        dismissOverlay();
    }
}
