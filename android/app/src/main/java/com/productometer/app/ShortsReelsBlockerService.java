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
import android.content.pm.PackageManager;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Calendar;
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
    public static final String KEY_YOUTUBE_MODE = "productometer_youtube_mode";
    public static final String MODE_LECTURE_ONLY = "lecture_only";
    public static final String MODE_BLOCK_SHORTS = "block_shorts";

    public static boolean isServiceRunning = false;
    public static boolean isFocusSessionOngoing = false;
    public static boolean isMasterBlockerEnabled = false;

    private static final String PKG_YOUTUBE = "com.google.android.youtube";
    private static final String PKG_INSTAGRAM = "com.instagram.android";

    // Supported Android Browser packages
    public static final Set<String> BROWSER_PACKAGES = new HashSet<>(Arrays.asList(
            "com.android.chrome",
            "com.brave.browser",
            "com.sec.android.app.sbrowser",
            "com.microsoft.emmx",
            "org.mozilla.firefox",
            "com.opera.browser",
            "com.opera.mini.native",
            "com.duckduckgo.mobile.android",
            "com.android.browser",
            "com.mi.globalbrowser",
            "com.vivo.browser",
            "com.heytap.browser"
    ));

    public static boolean isBrowserPackage(String pkg) {
        if (pkg == null) return false;
        if (BROWSER_PACKAGES.contains(pkg)) return true;
        String p = pkg.toLowerCase();
        return p.contains("browser") || p.contains("chrome") || p.contains("firefox");
    }

    // Set of whitelisted lecture video signatures (allowed by user or verified)
    private static final Set<String> whitelistedLectureSignatures = Collections.synchronizedSet(new HashSet<>());
    // Click / search pre-watch memory
    private static long lastStudyClickedTimestamp = 0L;
    private static String lastStudyClickedText = "";
    // Settle grace period for video titles & metadata loading
    private static String activePendingLectureSignature = "";
    private static long pendingLectureStartTimestamp = 0L;

    private final Runnable pendingLectureCheckRunnable = new Runnable() {
        @Override
        public void run() {
            if (isOverlayActive || isCoolingDown) return;
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) return;
            try {
                CharSequence currentPkg = root.getPackageName();
                if (currentPkg == null) return;
                String pkgStr = currentPkg.toString();

                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String ytMode = prefs.getString(KEY_YOUTUBE_MODE, MODE_BLOCK_SHORTS);
                boolean isLectureMode = MODE_LECTURE_ONLY.equals(ytMode);
                if (!isLectureMode) return;

                if (PKG_YOUTUBE.equals(pkgStr)) {
                    if (isYouTubeVideoPlaying(root, 0)) {
                        String activeTitle = extractActiveYouTubeTitle(root).toLowerCase();
                        if (!containsStudyKeyword(activeTitle) && !isEducationalChannel(activeTitle)) {
                            long now = System.currentTimeMillis();
                            if (now - lastStudyClickedTimestamp >= 10000L) {
                                String sig = "yt_v_" + (activeTitle.isEmpty() ? "non_study" : (activeTitle.length() > 35 ? activeTitle.substring(0, 35) : activeTitle));
                                if (!whitelistedLectureSignatures.contains(sig)) {
                                    handleDistractionDetected(sig, "YouTube (Lecture Only: Study Lectures Only)");
                                }
                            }
                        }
                    }
                } else if (isBrowserPackage(pkgStr)) {
                    boolean isShortsBlocked = prefs.getBoolean(KEY_SHORTS_ENABLED, true);
                    String sig = detectBrowserYouTubeDistraction(root, null, isShortsBlocked, true);
                    if (sig != null && !sig.isEmpty()) {
                        handleDistractionDetected(sig, "Browser YouTube (Lecture Only Mode)");
                    }
                }
            } finally {
                root.recycle();
            }
        }
    };

    private void schedulePendingLectureCheck() {
        if (mainHandler != null) {
            mainHandler.removeCallbacks(pendingLectureCheckRunnable);
            mainHandler.postDelayed(pendingLectureCheckRunnable, 2500L);
        }
    }

    private void cancelPendingLectureCheck() {
        if (mainHandler != null) {
            mainHandler.removeCallbacks(pendingLectureCheckRunnable);
        }
    }

    // Strict, unambiguous entertainment keywords (clean of false positives like reaction, challenge, song, highlights)
    public static boolean containsEntertainmentKeyword(String text) {
        if (text == null || text.isEmpty()) return false;
        String t = text.toLowerCase();
        return t.contains("gameplay") || t.contains("gaming") || t.contains("gta") ||
               t.contains("minecraft") || t.contains("roblox") || t.contains("free fire") ||
               t.contains("bgmi") || t.contains("pubg") || t.contains("trailer") ||
               t.contains("teaser") || t.contains("official music video") || t.contains("music video") ||
               t.contains("vlog") || t.contains("vlogs") || t.contains("daily vlog") ||
               t.contains("prank") || t.contains("pranks") || t.contains("roast") ||
               t.contains("standup comedy") || t.contains("stand-up comedy") ||
               t.contains("unboxing") || t.contains("full movie") || t.contains("web series") ||
               t.contains("anime fight") || t.contains("streamer") || t.contains("tiktok") ||
               t.contains("meme compilation") || t.contains("funny moments");
    }

    public static boolean isEducationalChannel(String channel) {
        if (channel == null || channel.isEmpty()) return false;
        String c = channel.toLowerCase();
        return c.contains("physics wallah") || c.contains("alakh pandey") || c.contains("pw") ||
               c.contains("khan academy") || c.contains("unacademy") || c.contains("vedantu") ||
               c.contains("mit opencourseware") || c.contains("stanford") || c.contains("harvard") ||
               c.contains("crashcourse") || c.contains("3blue1brown") || c.contains("veritasium") ||
               c.contains("freecodecamp") || c.contains("apna college") || c.contains("apni kaksha") ||
               c.contains("aman dhattarwal") || c.contains("code with harry") || c.contains("neso academy") ||
               c.contains("gate smashers") || c.contains("abdul bari") || c.contains("take u forward") ||
               c.contains("striver") || c.contains("mohit tyagi") || c.contains("competishun") ||
               c.contains("eduniti") || c.contains("physics galaxy") || c.contains("ashish arora") ||
               c.contains("ncert") || c.contains("nptel") || c.contains("ignou") || c.contains("studyiq") ||
               c.contains("drishti ias") || c.contains("magnet brains") || c.contains("dear sir") ||
               c.contains("edx") || c.contains("coursera") || c.contains("simplilearn") ||
               c.contains("byju") || c.contains("allen") || c.contains("resonance") ||
               c.contains("fiitjee") || c.contains("aakash");
    }

    // Comprehensive Academic & Study Keyword Library (160+ Academic Terms)
    public static boolean containsStudyKeyword(String text) {
        if (text == null || text.isEmpty()) return false;
        String t = text.toLowerCase();
        return t.contains("class") || t.contains("classes") || t.contains("classroom") ||
               t.contains("lecture") || t.contains("lectures") ||
               t.contains("tutorial") || t.contains("tutorials") ||
               t.contains("course") || t.contains("courses") ||
               t.contains("chapter") || t.contains("lesson") || t.contains("lessons") ||
               t.contains("batch") || t.contains("revision") ||
               t.contains("oneshot") || t.contains("one shot") || t.contains("one-shot") ||
               t.contains("study") || t.contains("education") || t.contains("learning") ||
               t.contains("curriculum") || t.contains("syllabus") || t.contains("semester") ||
               t.contains("module") || t.contains("unit") || t.contains("topic") ||
               t.contains("concept") || t.contains("notes") || t.contains("summary") ||
               t.contains("cbse") || t.contains("ncert") || t.contains("icse") || t.contains("isc") ||
               t.contains("state board") || t.contains("board exam") || t.contains("boards") ||
               t.contains("jee") || t.contains("jee mains") || t.contains("jee advanced") ||
               t.contains("neet") || t.contains("upsc") || t.contains("gate") || t.contains("cat") ||
               t.contains("ssc") || t.contains("nda") || t.contains("clat") || t.contains("cuet") ||
               t.contains("iit") || t.contains("aiims") || t.contains("bitsat") || t.contains("olympiad") ||
               t.contains("mock test") || t.contains("sample paper") || t.contains("pyq") ||
               t.contains("previous year") || t.contains("question paper") || t.contains("solution") ||
               t.contains("solutions") || t.contains("paper analysis") || t.contains("answer key") ||
               t.contains("physics") || t.contains("kinematics") || t.contains("thermodynamics") ||
               t.contains("optics") || t.contains("electrostatics") || t.contains("electromagnetism") ||
               t.contains("gravitation") || t.contains("mechanics") || t.contains("quantum") ||
               t.contains("semiconductor") || t.contains("current electricity") || t.contains("capacitance") ||
               t.contains("magnetic") || t.contains("oscillation") || t.contains("waves") ||
               t.contains("chemistry") || t.contains("organic chemistry") || t.contains("inorganic chemistry") ||
               t.contains("physical chemistry") || t.contains("periodic table") || t.contains("chemical bonding") ||
               t.contains("chemical reaction") || t.contains("chemical kinetics") || t.contains("equilibrium") ||
               t.contains("atomic structure") || t.contains("electrochemistry") || t.contains("hydrocarbons") ||
               t.contains("polymers") || t.contains("biomolecules") || t.contains("aldehydes") ||
               t.contains("amines") || t.contains("coordination compounds") ||
               t.contains("math") || t.contains("maths") || t.contains("mathematics") ||
               t.contains("calculus") || t.contains("algebra") || t.contains("trigonometry") ||
               t.contains("geometry") || t.contains("coordinate geometry") || t.contains("integration") ||
               t.contains("differentiation") || t.contains("derivative") || t.contains("differential equation") ||
               t.contains("matrices") || t.contains("determinants") || t.contains("probability") ||
               t.contains("statistics") || t.contains("vectors") || t.contains("linear programming") ||
               t.contains("complex numbers") || t.contains("quadratic equation") || t.contains("binomial theorem") ||
               t.contains("biology") || t.contains("botany") || t.contains("zoology") ||
               t.contains("genetics") || t.contains("evolution") || t.contains("anatomy") ||
               t.contains("physiology") || t.contains("ecology") || t.contains("cell biology") ||
               t.contains("human physiology") || t.contains("plant physiology") || t.contains("biotechnology") ||
               t.contains("coding") || t.contains("programming") || t.contains("computer science") ||
               t.contains("dsa") || t.contains("data structure") || t.contains("algorithm") ||
               t.contains("python") || t.contains("java") || t.contains("c++") || t.contains("cpp") ||
               t.contains("javascript") || t.contains("typescript") || t.contains("html") || t.contains("css") ||
               t.contains("react") || t.contains("node") || t.contains("sql") || t.contains("database") ||
               t.contains("dbms") || t.contains("operating system") || t.contains("computer network") ||
               t.contains("cyber security") || t.contains("machine learning") || t.contains("deep learning") ||
               t.contains("artificial intelligence") || t.contains("data science") || t.contains("web development") ||
               t.contains("app development") || t.contains("android development") || t.contains("flutter") ||
               t.contains("kotlin") || t.contains("leetcode") || t.contains("system design") ||
               t.contains("economics") || t.contains("microeconomics") || t.contains("macroeconomics") ||
               t.contains("accountancy") || t.contains("accounts") || t.contains("business studies") ||
               t.contains("commerce") || t.contains("finance") || t.contains("marketing") ||
               t.contains("taxation") || t.contains("gst") ||
               t.contains("history") || t.contains("geography") || t.contains("polity") ||
               t.contains("political science") || t.contains("sociology") || t.contains("psychology") ||
               t.contains("literature") || t.contains("english grammar") || t.contains("vocabulary") ||
               t.contains("essay") || t.contains("comprehension") || t.contains("anthropology") ||
               isEducationalChannel(text);
    }

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
    // 2-Minute Bedtime Emergency Pass Timestamp
    public static long bedtimeEmergencyPassUntilTimestamp = 0L;
    private long lastBedtimeTrackTimestamp = 0L;
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

    // Daily Limit Grace Period Audio & Notification State
    private long lastGraceAudioWarningTimestamp = 0L;
    private String lastGraceWarnedPackage = "";

    private WindowManager windowManager;
    private View overlayView;
    private CountDownTimer countdownTimer;
    private Handler mainHandler;

    public static long getBedtimeWindowStartMillis(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String startStr = prefs.getString("productometer_bedtime_start", "22:30");
            String[] sParts = startStr.split(":");
            int sHour = Integer.parseInt(sParts[0].trim());
            int sMinute = Integer.parseInt(sParts[1].trim());

            Calendar now = Calendar.getInstance();
            Calendar startCal = Calendar.getInstance();
            startCal.set(Calendar.HOUR_OF_DAY, sHour);
            startCal.set(Calendar.MINUTE, sMinute);
            startCal.set(Calendar.SECOND, 0);
            startCal.set(Calendar.MILLISECOND, 0);

            if (now.before(startCal)) {
                startCal.add(Calendar.DAY_OF_YEAR, -1);
            }
            return startCal.getTimeInMillis();
        } catch (Exception e) {
            return System.currentTimeMillis() - (15 * 60 * 1000L);
        }
    }

    public static boolean isDistractingPackage(Context context, String pkg) {
        if (pkg == null) return false;
        if (DISTRACTING_APPS.contains(pkg) || PKG_YOUTUBE.equals(pkg)) return true;
        try {
            PackageManager pm = context.getPackageManager();
            CharSequence label = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0));
            return WebAppInterface.isGameApp(pm, pkg, label != null ? label.toString() : pkg);
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean isBedtimeActiveNow(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean("productometer_bedtime_enabled", true);
            if (!enabled) return false;

            String startStr = prefs.getString("productometer_bedtime_start", "22:30");
            String endStr = prefs.getString("productometer_bedtime_end", "06:30");

            Calendar now = Calendar.getInstance();
            int curMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

            String[] sParts = startStr.split(":");
            int sMinutes = Integer.parseInt(sParts[0].trim()) * 60 + Integer.parseInt(sParts[1].trim());

            String[] eParts = endStr.split(":");
            int eMinutes = Integer.parseInt(eParts[0].trim()) * 60 + Integer.parseInt(eParts[1].trim());

            if (sMinutes <= eMinutes) {
                return curMinutes >= sMinutes && curMinutes < eMinutes;
            } else {
                return curMinutes >= sMinutes || curMinutes < eMinutes;
            }
        } catch (Exception e) {
            return false;
        }
    }

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

        if (packageName.equals(getPackageName())) return;

        // --- 1. DAILY APP LIMITS & 10-MINUTE GRACE / FREEZING ENGINE ---
        // Operates independently of focus session to enforce mandatory daily limits (FB, IG, Games)
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String limitsJsonStr = prefs.getString("productometer_app_limits_json", "{}");
            JSONObject limitsObj = new JSONObject(limitsJsonStr);

            PackageManager pm = getPackageManager();
            String appLabel = getFriendlyName(packageName);
            boolean isGame = WebAppInterface.isGameApp(pm, packageName, appLabel);
            boolean isCompulsory = WebAppInterface.isCompulsoryApp(pm, packageName, appLabel, isGame);

            int limitMinutes = 0;
            if (limitsObj.has(packageName)) {
                limitMinutes = limitsObj.optInt(packageName, 0);
            }
            // Compulsory overrides removed - strictly respect user configuration

            if (limitMinutes > 0) {
                long usedMs = WebAppInterface.getAppTodayForegroundMs(getApplicationContext(), packageName);
                int usedMinutes = Math.round(usedMs / 60000f);

                // Case A: FROZEN (daily limit + 10-minute grace exceeded)
                if (usedMinutes >= limitMinutes + 10) {
                    if (!isOverlayActive) {
                        final int fLimit = limitMinutes;
                        final int fUsed = usedMinutes;
                        mainHandler.post(() -> showAppFrozenDialog(packageName, appLabel, fLimit, fUsed));
                    }
                    return;
                }

                // Case B: 10-MINUTE GRACE PERIOD
                if (usedMinutes >= limitMinutes) {
                    int graceRemaining = (limitMinutes + 10) - usedMinutes;
                    handleGracePeriodWarning(packageName, appLabel, graceRemaining);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // --- 1.25 BEDTIME SLEEP GUARDIAN & 15-MINUTE DISTRACTIVE SCREEN CAP ---
        try {
            if (isBedtimeActiveNow(this)) {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                boolean masterEnabled = isMasterBlockerEnabled || prefs.getBoolean(KEY_MASTER_ENABLED, false);

                boolean isDistracting = isDistractingPackage(this, packageName);

                if (isDistracting) {
                    long now = System.currentTimeMillis();
                    long currentNightDistractionMs = prefs.getLong("night_distraction_total_ms", 0L);

                    if (lastBedtimeTrackTimestamp > 0) {
                        long delta = now - lastBedtimeTrackTimestamp;
                        if (delta > 0 && delta <= 60000L) { // Accumulate up to 60s per gap
                            currentNightDistractionMs += delta;
                            prefs.edit().putLong("night_distraction_total_ms", currentNightDistractionMs).apply();
                        }
                    }
                    lastBedtimeTrackTimestamp = now;

                    // Query UsageStatsManager for accurate foreground usage since bedtime window began
                    long usmDistractionMs = 0L;
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            android.app.usage.UsageStatsManager usm = (android.app.usage.UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
                            if (usm != null) {
                                long bStart = getBedtimeWindowStartMillis(this);
                                java.util.List<android.app.usage.UsageStats> stats = usm.queryUsageStats(android.app.usage.UsageStatsManager.INTERVAL_BEST, bStart, now);
                                if (stats != null) {
                                    for (android.app.usage.UsageStats u : stats) {
                                        if (isDistractingPackage(this, u.getPackageName())) {
                                            usmDistractionMs += u.getTotalTimeInForeground();
                                        }
                                    }
                                }
                            }
                        }
                    } catch (Exception ignored) {}

                    long effectiveDistractionMs = Math.max(currentNightDistractionMs, usmDistractionMs);

                    // User requirement: "Also if the user uses the phone while keeping the distraction blocker on, then allow him"
                    // If Master Blocker is ON: Allowed to use phone, blocker will handle shorts/reels below!
                    // If Master Blocker is OFF: User has no protection, so strictly cap at 15 minutes!
                    if (!masterEnabled) {
                        if (effectiveDistractionMs >= 900000L) { // 15 minutes = 900,000 ms
                            if (now > bedtimeEmergencyPassUntilTimestamp) {
                                if (!isOverlayActive) {
                                    final int usedMins = (int) (effectiveDistractionMs / 60000L);
                                    final String fLabel = getFriendlyName(packageName);
                                    mainHandler.post(() -> showBedtimeDialog(packageName, fLabel, usedMins));
                                }
                                return;
                            }
                        }
                    }
                } else {
                    lastBedtimeTrackTimestamp = 0L;
                }
            } else {
                lastBedtimeTrackTimestamp = 0L;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Track study click memory from search/feed
        if (event.getEventType() == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            List<CharSequence> textList = event.getText();
            StringBuilder clickSb = new StringBuilder();
            if (textList != null) {
                for (CharSequence cs : textList) {
                    if (cs != null) clickSb.append(cs).append(" ");
                }
            }
            if (event.getContentDescription() != null) {
                clickSb.append(event.getContentDescription()).append(" ");
            }
            String clickedText = clickSb.toString();
            if (containsStudyKeyword(clickedText)) {
                lastStudyClickedTimestamp = System.currentTimeMillis();
                lastStudyClickedText = clickedText;
            }
        }

        boolean isYouTube = PKG_YOUTUBE.equals(packageName);
        boolean isInstagram = PKG_INSTAGRAM.equals(packageName);
        boolean isBrowser = isBrowserPackage(packageName);
        boolean isDistracting = DISTRACTING_APPS.contains(packageName) || isYouTube;

        // Track user's productive / previous app
        if (!isDistracting && !isBrowser) {
            previousNonDistractingPackage = packageName;
            resetDistractionSession();
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean masterEnabled = isMasterBlockerEnabled || prefs.getBoolean(KEY_MASTER_ENABLED, true);
        boolean sessionOngoing = isFocusSessionOngoing || prefs.getBoolean(KEY_FOCUS_ACTIVE, false);

        String ytMode = prefs.getString(KEY_YOUTUBE_MODE, MODE_BLOCK_SHORTS);
        boolean isLectureMode = MODE_LECTURE_ONLY.equals(ytMode);

        // In lecture only mode: lecture filtering is ALWAYS active for YouTube and Browsers!
        // Otherwise, master blocker switch or focus session must be ON.
        if (!masterEnabled && !sessionOngoing && !isLectureMode) {
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

                // Shorts blocked in both modes (in block_shorts if enabled, always in lecture_only)
                if (isShortsBlocked || isLectureMode) {
                    signature = detectYouTubeShort(rootNode, event);
                    if (signature != null && !signature.isEmpty()) {
                        isDistractionActive = true;
                        distractionLabel = isLectureMode ? "YouTube Shorts (Blocked in Lecture Mode)" : "YouTube Shorts";
                    }
                }

                // In lecture only mode: ONLY study material tracked by the word 'Class' is allowed
                if (!isDistractionActive && isLectureMode) {
                    signature = detectYouTubeNonStudyVideo(rootNode, event);
                    if (signature != null && !signature.isEmpty()) {
                        isDistractionActive = true;
                        distractionLabel = "YouTube (Lecture Only: Only 'Class' Videos Allowed)";
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
            } else if (isBrowser) {

                signature = detectBrowserYouTubeDistraction(rootNode, event, isShortsBlocked, isLectureMode);
                if (signature != null && !signature.isEmpty()) {
                    isDistractionActive = true;
                    if (signature.contains("short")) {
                        distractionLabel = isLectureMode ? "Browser YouTube Shorts (Blocked in Lecture Mode)" : "Browser YouTube Shorts";
                    } else {
                        distractionLabel = "Browser YouTube (Lecture Only Mode)";
                    }
                }
            }

            if (isDistractionActive) {
                handleDistractionDetected(signature, distractionLabel);
            } else {
                long now = System.currentTimeMillis();
                if (now - lastDistractionTimestamp > 15000L) {
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

    // Robust check for active YouTube video watch page (Compose & Litho safe)
    private boolean isYouTubeVideoPlaying(AccessibilityNodeInfo root, int depth) {
        if (root == null) return false;

        // 1. Direct view ID searches for player containers (O(1) index lookup)
        String[] playerViewIds = {
            "com.google.android.youtube:id/player_view",
            "com.google.android.youtube:id/watch_while_layout",
            "com.google.android.youtube:id/watch_panel",
            "com.google.android.youtube:id/watch_metadata",
            "com.google.android.youtube:id/movie_player",
            "com.google.android.youtube:id/fullscreen_button"
        };
        for (String id : playerViewIds) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(id);
            if (nodes != null && !nodes.isEmpty()) {
                for (AccessibilityNodeInfo n : nodes) n.recycle();
                return true;
            }
        }

        // 2. Recursive content description / control check (depth up to 25)
        return scanForPlayerControls(root, 0);
    }

    private boolean scanForPlayerControls(AccessibilityNodeInfo node, int depth) {
        if (node == null || depth > 25) return false;

        CharSequence desc = node.getContentDescription();
        if (desc != null) {
            String d = desc.toString().toLowerCase();
            if (d.contains("pause video") || d.contains("play video") || d.contains("replay video") ||
                d.contains("enter full screen") || d.contains("enter fullscreen") || d.contains("exit full screen") ||
                d.contains("like this video") || d.contains("dislike this video") || d.contains("seek slider")) {
                return true;
            }
        }

        CharSequence vId = node.getViewIdResourceName();
        if (vId != null) {
            String v = vId.toString().toLowerCase();
            if (v.contains("player") || v.contains("watch_while") || v.contains("watch_panel") || v.contains("watch_metadata")) {
                return true;
            }
        }

        int count = Math.min(node.getChildCount(), 16);
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                boolean active = scanForPlayerControls(child, depth + 1);
                child.recycle();
                if (active) return true;
            }
        }
        return false;
    }

    // Collect active video title & channel: strictly inspects only the first 2 children of list/recycler containers
    // (Child 0 = title & metadata, Child 1 = channel row) to 100% prevent recommendation feed leakage!
    private void collectTopWatchTextNodes(AccessibilityNodeInfo node, List<String> texts, int depth, int maxNodes) {
        if (node == null || depth > 25 || texts.size() >= maxNodes) return;

        CharSequence viewId = node.getViewIdResourceName();
        boolean isListContainer = false;
        if (viewId != null) {
            String vId = viewId.toString().toLowerCase();
            if (vId.contains("recycler") || vId.contains("list") || vId.contains("feed") || vId.contains("results")) {
                isListContainer = true;
            }
            if (vId.contains("comment") || vId.contains("bottom_sheet_footer")) {
                return; // Skip comments and secondary bottom sheets
            }
        }

        CharSequence desc = node.getContentDescription();
        if (desc != null && desc.length() > 3) {
            String d = desc.toString().trim();
            String dLower = d.toLowerCase();
            if (dLower.startsWith("comments") || dLower.contains("up next")) {
                return; // Stop traversal before recommendations!
            }
            if (!dLower.contains("play video") && !dLower.contains("pause video") &&
                !dLower.contains("enter full screen") && !dLower.contains("exit full screen") &&
                !dLower.contains("seek slider") && !dLower.contains("collapse") &&
                !dLower.contains("settings") && !dLower.contains("options")) {
                texts.add(d);
            }
        }

        CharSequence txt = node.getText();
        if (txt != null && txt.length() > 3) {
            String t = txt.toString().trim();
            String tLower = t.toLowerCase();
            if (tLower.startsWith("comments") || tLower.contains("up next")) {
                return; // Stop traversal before recommendations!
            }
            if (!tLower.equals("subscribe") && !tLower.equals("subscribed") &&
                !tLower.equals("share") && !tLower.equals("remix") &&
                !tLower.equals("download") && !tLower.equals("thanks") && !tLower.equals("clip")) {
                texts.add(t);
            }
        }

        int childCount = node.getChildCount();
        // If container is a recycler/list on watch page: Child 0 is video metadata/title, Child 1 is channel.
        // Child 2+ are comments & recommendations, so we strictly cap at 2!
        int maxChildren = isListContainer ? Math.min(childCount, 2) : Math.min(childCount, 16);
        for (int i = 0; i < maxChildren; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                collectTopWatchTextNodes(child, texts, depth + 1, maxNodes);
                child.recycle();
            }
        }
    }

    private String extractActiveYouTubeTitle(AccessibilityNodeInfo root) {
        if (root == null) return "";

        // 1. Try finding specific title view IDs first
        String[] titleNodeIds = {
            "com.google.android.youtube:id/title",
            "com.google.android.youtube:id/video_title",
            "com.google.android.youtube:id/collapsed_title",
            "com.google.android.youtube:id/expandable_title",
            "com.google.android.youtube:id/watch_headline"
        };
        for (String id : titleNodeIds) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(id);
            if (nodes != null && !nodes.isEmpty()) {
                AccessibilityNodeInfo firstNode = nodes.get(0);
                StringBuilder sb = new StringBuilder();
                if (firstNode.getContentDescription() != null) sb.append(firstNode.getContentDescription()).append(" ");
                if (firstNode.getText() != null) sb.append(firstNode.getText()).append(" ");
                for (AccessibilityNodeInfo n : nodes) n.recycle();
                String res = sb.toString().trim();
                if (!res.isEmpty()) return res;
            }
        }

        // 2. Compose / Litho Fallback: collect active video info (capped before recommendations)
        List<String> topTexts = new ArrayList<>();
        collectTopWatchTextNodes(root, topTexts, 0, 4);
        StringBuilder topSb = new StringBuilder();
        for (String t : topTexts) {
            topSb.append(t).append(" ");
        }
        return topSb.toString().trim();
    }

    private String detectYouTubeNonStudyVideo(AccessibilityNodeInfo root, AccessibilityEvent event) {
        if (root == null) return null;

        // 1. Verify if YouTube is actively on a video watch page (Compose & Litho safe)
        if (!isYouTubeVideoPlaying(root, 0)) {
            cancelPendingLectureCheck();
            return null; // In search bar, channel list, home tabs, or feed
        }

        long now = System.currentTimeMillis();
        // Pre-watch click memory (tapped from search)
        if (now - lastStudyClickedTimestamp < 10000L) {
            cancelPendingLectureCheck();
            return null; // Allowed! Legitimate lecture opened from search
        }

        // Extract active video title & channel safely (Compose-safe, no recommendation leakage)
        String activeTitle = extractActiveYouTubeTitle(root).toLowerCase();

        // 1. Check if user already whitelisted this video
        String sig = "yt_v_" + (activeTitle.isEmpty() ? "unknown_video" : (activeTitle.length() > 35 ? activeTitle.substring(0, 35) : activeTitle));
        if (whitelistedLectureSignatures.contains(sig)) {
            cancelPendingLectureCheck();
            return null;
        }

        // 2. CRITICAL FIX: POSITIVE STUDY KEYWORDS CHECKED FIRST!
        // If the title or channel contains academic keywords, it is 100% permitted immediately!
        if (containsStudyKeyword(activeTitle) || isEducationalChannel(activeTitle)) {
            activePendingLectureSignature = "";
            cancelPendingLectureCheck();
            return null; // Allowed! Legitimate study lecture
        }

        // 3. ENTERTAINMENT BLACKLIST (NEGATIVE MATCHING)
        // Strictly catches gaming, vlogs, comedy, songs, trailers, roasts, pranks!
        if (containsEntertainmentKeyword(activeTitle)) {
            cancelPendingLectureCheck();
            return "yt_entertainment_" + (activeTitle.length() > 30 ? activeTitle.substring(0, 30) : activeTitle);
        }

        // 4. Settle grace period (2.5 seconds) to let title finish loading
        if (!sig.equals(activePendingLectureSignature)) {
            activePendingLectureSignature = sig;
            pendingLectureStartTimestamp = now;
            schedulePendingLectureCheck();
            return null; // Loading buffer
        }
        if (now - pendingLectureStartTimestamp < 2500L) {
            schedulePendingLectureCheck();
            return null;
        }

        // If after 2.5s video has NO study keywords, it is uneducational content!
        cancelPendingLectureCheck();
        return sig;
    }

    private String detectBrowserYouTubeDistraction(AccessibilityNodeInfo root, AccessibilityEvent event, boolean isShortsBlocked, boolean isLectureMode) {
        if (root == null) return null;

        String textDump = extractVisibleTextSignature(root).toLowerCase();
        boolean hasYouTube = textDump.contains("youtube.com") || textDump.contains("youtu.be") ||
                             textDump.contains("m.youtube.com");

        // Also check URL bar node specifically across major browsers
        if (!hasYouTube) {
            String[] urlBarIds = {
                "com.android.chrome:id/url_bar",
                "com.brave.browser:id/url_bar",
                "com.sec.android.app.sbrowser:id/location_bar_edit_text",
                "com.microsoft.emmx:id/url_bar",
                "org.mozilla.firefox:id/mozac_browser_toolbar_url_view",
                "com.opera.browser:id/url_field"
            };
            for (String barId : urlBarIds) {
                List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(barId);
                if (nodes != null && !nodes.isEmpty()) {
                    for (AccessibilityNodeInfo n : nodes) {
                        CharSequence txt = n.getText();
                        if (txt != null) {
                            String url = txt.toString().toLowerCase();
                            if (url.contains("youtube.com") || url.contains("youtu.be")) {
                                hasYouTube = true;
                            }
                        }
                        n.recycle();
                    }
                    if (hasYouTube) break;
                }
            }
        }

        if (!hasYouTube) return null; // Browser is not visiting YouTube! Allowed.

        // 1. YouTube Shorts in Browser
        boolean isShort = textDump.contains("/shorts/") || textDump.contains("youtube.com/shorts") ||
                          textDump.contains("#shorts");
        if (isShort && (isShortsBlocked || isLectureMode)) {
            return "browser_yt_short_" + (System.currentTimeMillis() / 4000);
        }

        // 2. In Lecture Only mode, check if watching non-study YouTube video
        if (isLectureMode) {
            boolean isWatchPage = textDump.contains("/watch") || textDump.contains("watch?v=") ||
                                  textDump.contains("up next") || textDump.contains("comments") ||
                                  textDump.contains("views");
            if (isWatchPage) {
                // Extract active title from top nodes (skip bottom recommendations)
                List<String> topTexts = new ArrayList<>();
                collectTopWatchTextNodes(root, topTexts, 0, 4);
                StringBuilder activeBrowserTitleSb = new StringBuilder();
                for (String s : topTexts) activeBrowserTitleSb.append(s).append(" ");
                String activeBrowserTitle = activeBrowserTitleSb.toString().toLowerCase().trim();
                if (activeBrowserTitle.isEmpty()) activeBrowserTitle = textDump;

                // 1. Study keywords checked FIRST!
                if (containsStudyKeyword(activeBrowserTitle) || isEducationalChannel(activeBrowserTitle)) {
                    activePendingLectureSignature = "";
                    cancelPendingLectureCheck();
                    return null; // Allowed! Study lecture verified
                }

                // 2. Entertainment blacklist
                if (containsEntertainmentKeyword(activeBrowserTitle)) {
                    cancelPendingLectureCheck();
                    return "browser_yt_entertainment_" + (activeBrowserTitle.length() > 30 ? activeBrowserTitle.substring(0, 30) : activeBrowserTitle);
                }

                // 3. Settle grace period (2.5 seconds)
                long now = System.currentTimeMillis();
                String rawSig = "browser_yt_" + (activeBrowserTitle.length() > 30 ? activeBrowserTitle.substring(0, 30) : activeBrowserTitle);
                if (whitelistedLectureSignatures.contains(rawSig)) {
                    cancelPendingLectureCheck();
                    return null;
                }
                if (!rawSig.equals(activePendingLectureSignature)) {
                    activePendingLectureSignature = rawSig;
                    pendingLectureStartTimestamp = now;
                    schedulePendingLectureCheck();
                    return null; // Grace period start
                }
                if (now - pendingLectureStartTimestamp < 2500L) {
                    schedulePendingLectureCheck();
                    return null; // Within 2.5-second loading buffer
                }

                cancelPendingLectureCheck();
                return rawSig;
            }
        }

        return null;
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
        if (node == null || depth > 16) return;
        CharSequence desc = node.getContentDescription();
        if (desc != null && desc.length() > 1) {
            sb.append(desc.toString().trim()).append(" ");
        }
        CharSequence txt = node.getText();
        if (txt != null && txt.length() > 1) {
            sb.append(txt.toString().trim()).append(" ");
        }
        int childCount = Math.min(node.getChildCount(), 24);
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
            if (!isOverlayActive && !isCoolingDown) {
                mainHandler.post(() -> showCountdownOverlay(label));
            }
            return;
        }

        lastDistractionSignature = signature;
        distractionCount++;

        // Trigger countdown overlay immediately (no grace loopholes!)
        mainHandler.post(() -> showCountdownOverlay(label));
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
                WindowManager.LayoutParams.MATCH_PARENT,
                windowType,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        // Fullscreen backdrop consuming all touch events
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setGravity(Gravity.CENTER);
        rootLayout.setBackgroundColor(Color.parseColor("#E605070E"));
        rootLayout.setClickable(true);
        rootLayout.setFocusable(true);
        rootLayout.setOnTouchListener((v, e) -> true);

        // Centered modal card
        LinearLayout cardLayout = new LinearLayout(this);
        cardLayout.setOrientation(LinearLayout.VERTICAL);
        cardLayout.setGravity(Gravity.CENTER);
        int pad = dpToPx(24);
        cardLayout.setPadding(pad, pad, pad, pad);

        GradientDrawable bgShape = new GradientDrawable();
        bgShape.setColor(Color.parseColor("#EE0B0D17"));
        bgShape.setCornerRadius(dpToPx(22));
        bgShape.setStroke(dpToPx(2), Color.parseColor("#FF1744"));
        cardLayout.setBackground(bgShape);

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.setMargins(dpToPx(24), dpToPx(24), dpToPx(24), dpToPx(24));
        rootLayout.addView(cardLayout, cardParams);

        // Shield / Ban Icon
        TextView iconView = new TextView(this);
        iconView.setText("🚫");
        iconView.setTextSize(36);
        iconView.setGravity(Gravity.CENTER);
        cardLayout.addView(iconView);

        // Title: Access Intercepted
        TextView titleView = new TextView(this);
        titleView.setText("Access Intercepted");
        titleView.setTextSize(19);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setTextColor(Color.WHITE);
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0, dpToPx(8), 0, 0);
        cardLayout.addView(titleView);

        // Reason box
        TextView reasonView = new TextView(this);
        reasonView.setText(appLabel + " is restricted by Productometer Guardian during your active session. Keep focused!");
        reasonView.setTextSize(13);
        reasonView.setTextColor(Color.parseColor("#94A3B8"));
        reasonView.setGravity(Gravity.CENTER);
        reasonView.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(18));
        cardLayout.addView(reasonView);

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
        cardLayout.addView(returnBtn, btnParams);

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
        cardLayout.addView(emergencyBtn, emParams);

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

    private void handleGracePeriodWarning(String pkg, String appLabel, int minutesLeft) {
        long now = System.currentTimeMillis();
        // Warn at most once every 60 seconds per package, or immediately on package switch
        if (!pkg.equals(lastGraceWarnedPackage) || (now - lastGraceAudioWarningTimestamp > 60000L)) {
            lastGraceWarnedPackage = pkg;
            lastGraceAudioWarningTimestamp = now;
            mainHandler.post(() -> {
                playWarningAudioTrack();
                Toast.makeText(
                        getApplicationContext(),
                        "⏳ Grace Period: " + minutesLeft + "m left for " + appLabel + " before it freezes!",
                        Toast.LENGTH_LONG
                ).show();
            });
        }
    }

    @SuppressLint("SetTextI18n")
    private void showAppFrozenDialog(String pkgName, String appLabel, int limitMinutes, int usedMinutes) {
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
                WindowManager.LayoutParams.MATCH_PARENT,
                windowType,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        // Fullscreen backdrop consuming all touch events
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setGravity(Gravity.CENTER);
        rootLayout.setBackgroundColor(Color.parseColor("#F5050A14"));
        rootLayout.setClickable(true);
        rootLayout.setFocusable(true);
        rootLayout.setOnTouchListener((v, e) -> true);

        // Centered frost card
        LinearLayout cardLayout = new LinearLayout(this);
        cardLayout.setOrientation(LinearLayout.VERTICAL);
        cardLayout.setGravity(Gravity.CENTER);
        int pad = dpToPx(24);
        cardLayout.setPadding(pad, pad, pad, pad);

        // Cyberpunk Ice-Frost Theme
        GradientDrawable bgShape = new GradientDrawable();
        bgShape.setColor(Color.parseColor("#EE060D1A"));
        bgShape.setCornerRadius(dpToPx(22));
        bgShape.setStroke(dpToPx(2), Color.parseColor("#00E5FF"));
        cardLayout.setBackground(bgShape);

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.setMargins(dpToPx(24), dpToPx(24), dpToPx(24), dpToPx(24));
        rootLayout.addView(cardLayout, cardParams);

        // Frost Snowflake Icon
        TextView iconView = new TextView(this);
        iconView.setText("❄️");
        iconView.setTextSize(40);
        iconView.setGravity(Gravity.CENTER);
        cardLayout.addView(iconView);

        // Title: App Frozen
        TextView titleView = new TextView(this);
        titleView.setText("App Frozen: Daily Limit Exceeded");
        titleView.setTextSize(18);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setTextColor(Color.parseColor("#E0F2FE"));
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0, dpToPx(8), 0, 0);
        cardLayout.addView(titleView);

        // Details
        TextView reasonView = new TextView(this);
        reasonView.setText(appLabel + " has reached its daily limit of " + limitMinutes + "m (" + usedMinutes + "m used today).\n\n🔒 This app is frozen for the remainder of today. Limits cannot be adjusted while an app is frozen.");
        reasonView.setTextSize(13);
        reasonView.setTextColor(Color.parseColor("#94A3B8"));
        reasonView.setGravity(Gravity.CENTER);
        reasonView.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(20));
        cardLayout.addView(reasonView);

        // Action 1: Return to Home
        Button returnBtn = new Button(this);
        returnBtn.setText("⬅️ Return to Home");
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
        cardLayout.addView(returnBtn, btnParams);

        // Action 2: Open Productometer
        Button openAppBtn = new Button(this);
        openAppBtn.setText("📱 Open Productometer");
        openAppBtn.setTextSize(14);
        openAppBtn.setTypeface(Typeface.DEFAULT_BOLD);
        openAppBtn.setTextColor(Color.WHITE);

        GradientDrawable openBg = new GradientDrawable();
        openBg.setColor(Color.parseColor("#151D2A"));
        openBg.setStroke(dpToPx(1), Color.parseColor("#334155"));
        openBg.setCornerRadius(dpToPx(12));
        openAppBtn.setBackground(openBg);

        LinearLayout.LayoutParams openParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(44)
        );
        openParams.setMargins(0, dpToPx(10), 0, 0);
        cardLayout.addView(openAppBtn, openParams);

        returnBtn.setOnClickListener(v -> {
            dismissOverlay();
            performBackActionOnce();
            performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
        });

        openAppBtn.setOnClickListener(v -> {
            dismissOverlay();
            try {
                Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    startActivity(launchIntent);
                }
            } catch (Exception ignored) {}
        });

        overlayView = rootLayout;

        try {
            windowManager.addView(overlayView, params);
        } catch (Exception e) {
            e.printStackTrace();
            isOverlayActive = false;
            performBackActionOnce();
            performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
        }
    }

    @SuppressLint("SetTextI18n")
    private void showBedtimeDialog(String pkgName, String appLabel, int distractionMinutes) {
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
                WindowManager.LayoutParams.MATCH_PARENT,
                windowType,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        // Fullscreen dark celestial indigo backdrop consuming all touches
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setGravity(Gravity.CENTER);
        rootLayout.setBackgroundColor(Color.parseColor("#F5060A1A"));
        rootLayout.setClickable(true);
        rootLayout.setFocusable(true);
        rootLayout.setOnTouchListener((v, e) -> true);

        // Centered Night Card
        LinearLayout cardLayout = new LinearLayout(this);
        cardLayout.setOrientation(LinearLayout.VERTICAL);
        cardLayout.setGravity(Gravity.CENTER);
        int pad = dpToPx(24);
        cardLayout.setPadding(pad, pad, pad, pad);

        GradientDrawable bgShape = new GradientDrawable();
        bgShape.setColor(Color.parseColor("#EE0B1226"));
        bgShape.setCornerRadius(dpToPx(24));
        bgShape.setStroke(dpToPx(2), Color.parseColor("#7C3AED")); // Purple accent
        cardLayout.setBackground(bgShape);

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.setMargins(dpToPx(24), dpToPx(24), dpToPx(24), dpToPx(24));
        rootLayout.addView(cardLayout, cardParams);

        // Glowing Moon Icon
        TextView iconView = new TextView(this);
        iconView.setText("🌙");
        iconView.setTextSize(42);
        iconView.setGravity(Gravity.CENTER);
        cardLayout.addView(iconView);

        // Title
        TextView titleView = new TextView(this);
        titleView.setText("Bedtime Wind-Down Alert");
        titleView.setTextSize(18);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setTextColor(Color.parseColor("#E0E7FF"));
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0, dpToPx(8), 0, 0);
        cardLayout.addView(titleView);

        // Description
        TextView reasonView = new TextView(this);
        reasonView.setText("You have used 15+ minutes on distracting apps during your bedtime window (" + Math.max(15, distractionMinutes) + "m total).\n\n💡 You can freely use your phone for productive tasks or reading if the Distraction Blocker is turned ON.");
        reasonView.setTextSize(13);
        reasonView.setTextColor(Color.parseColor("#94A3B8"));
        reasonView.setGravity(Gravity.CENTER);
        reasonView.setPadding(dpToPx(10), dpToPx(10), dpToPx(10), dpToPx(16));
        cardLayout.addView(reasonView);

        // Action 1: Turn ON Distraction Blocker & Continue
        Button enableBlockerBtn = new Button(this);
        enableBlockerBtn.setText("🛡️ Turn ON Distraction Blocker & Continue");
        enableBlockerBtn.setTextSize(13);
        enableBlockerBtn.setTypeface(Typeface.DEFAULT_BOLD);
        enableBlockerBtn.setTextColor(Color.BLACK);
        GradientDrawable blockerBg = new GradientDrawable();
        blockerBg.setColor(Color.parseColor("#00E5FF"));
        blockerBg.setCornerRadius(dpToPx(12));
        enableBlockerBtn.setBackground(blockerBg);
        LinearLayout.LayoutParams bParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dpToPx(48));
        cardLayout.addView(enableBlockerBtn, bParams);

        enableBlockerBtn.setOnClickListener(v -> {
            dismissOverlay();
            isMasterBlockerEnabled = true;
            SharedPreferences p = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            p.edit().putBoolean(KEY_MASTER_ENABLED, true).apply();
            performBackActionOnce();
            Toast.makeText(getApplicationContext(), "🛡️ Distraction Blocker ON: Productive phone use is now allowed!", Toast.LENGTH_LONG).show();
        });

        // Action 2: 2-Minute Emergency Pass
        Button emergencyBtn = new Button(this);
        emergencyBtn.setText("⏱️ 2-Minute Emergency Pass");
        emergencyBtn.setTextSize(12);
        emergencyBtn.setTypeface(Typeface.DEFAULT_BOLD);
        emergencyBtn.setTextColor(Color.parseColor("#CBD5E1"));
        GradientDrawable emBg = new GradientDrawable();
        emBg.setColor(Color.parseColor("#1E1B4B"));
        emBg.setStroke(dpToPx(1), Color.parseColor("#4338CA"));
        emBg.setCornerRadius(dpToPx(12));
        emergencyBtn.setBackground(emBg);
        LinearLayout.LayoutParams emParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dpToPx(44));
        emParams.setMargins(0, dpToPx(10), 0, 0);
        cardLayout.addView(emergencyBtn, emParams);

        emergencyBtn.setOnClickListener(v -> {
            dismissOverlay();
            bedtimeEmergencyPassUntilTimestamp = System.currentTimeMillis() + 120000L; // 2 minutes
            Toast.makeText(getApplicationContext(), "⏱️ Bedtime Emergency Pass: 2 minutes granted", Toast.LENGTH_SHORT).show();
        });

        // Action 3: Go to Sleep (Exit to Home)
        Button sleepBtn = new Button(this);
        sleepBtn.setText("😴 Go to Sleep (Exit to Home)");
        sleepBtn.setTextSize(12);
        sleepBtn.setTextColor(Color.parseColor("#94A3B8"));
        GradientDrawable sleepBg = new GradientDrawable();
        sleepBg.setColor(Color.parseColor("#0F172A"));
        sleepBg.setCornerRadius(dpToPx(12));
        sleepBtn.setBackground(sleepBg);
        LinearLayout.LayoutParams sParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dpToPx(42));
        sParams.setMargins(0, dpToPx(8), 0, 0);
        cardLayout.addView(sleepBtn, sParams);

        sleepBtn.setOnClickListener(v -> {
            dismissOverlay();
            performBackActionOnce();
            performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
        });

        overlayView = rootLayout;
        try {
            windowManager.addView(overlayView, params);
        } catch (Exception e) {
            e.printStackTrace();
            isOverlayActive = false;
            performBackActionOnce();
            performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
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
                WindowManager.LayoutParams.MATCH_PARENT,
                windowType,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        // Fullscreen backdrop consuming all touch events
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setGravity(Gravity.CENTER);
        rootLayout.setBackgroundColor(Color.parseColor("#E605070E"));
        rootLayout.setClickable(true);
        rootLayout.setFocusable(true);
        rootLayout.setOnTouchListener((v, e) -> true);

        // Centered warning card
        LinearLayout cardLayout = new LinearLayout(this);
        cardLayout.setOrientation(LinearLayout.VERTICAL);
        cardLayout.setGravity(Gravity.CENTER);
        int pad = dpToPx(20);
        cardLayout.setPadding(pad, pad, pad, pad);

        GradientDrawable bgShape = new GradientDrawable();
        bgShape.setColor(Color.parseColor("#EE0B0D17"));
        bgShape.setCornerRadius(dpToPx(20));
        bgShape.setStroke(dpToPx(2), Color.parseColor("#FF1744"));
        cardLayout.setBackground(bgShape);

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.setMargins(dpToPx(24), dpToPx(24), dpToPx(24), dpToPx(24));
        rootLayout.addView(cardLayout, cardParams);

        TextView titleView = new TextView(this);
        titleView.setText("🛡️ DOOMSCROLL GUARDIAN");
        titleView.setTextSize(16);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setTextColor(Color.parseColor("#00E5FF"));
        titleView.setGravity(Gravity.CENTER);
        cardLayout.addView(titleView);

        TextView subtitleView = new TextView(this);
        subtitleView.setText(label + " Detected!");
        subtitleView.setTextSize(18);
        subtitleView.setTypeface(Typeface.DEFAULT_BOLD);
        subtitleView.setTextColor(Color.WHITE);
        subtitleView.setGravity(Gravity.CENTER);
        subtitleView.setPadding(0, dpToPx(6), 0, 0);
        cardLayout.addView(subtitleView);

        TextView descView = new TextView(this);
        descView.setText("Returning to your previous screen to protect your focus.");
        descView.setTextSize(13);
        descView.setTextColor(Color.parseColor("#94A3B8"));
        descView.setGravity(Gravity.CENTER);
        descView.setPadding(0, dpToPx(4), 0, dpToPx(14));
        cardLayout.addView(descView);

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
        cardLayout.addView(countdownNumberView, circleParams);

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
        cardLayout.addView(returnBtn, btnParams);

        returnBtn.setOnClickListener(v -> performBackActionOnce());

        Button allowLectureBtn = new Button(this);
        allowLectureBtn.setText("🎓 Allow This Lecture (Whitelist)");
        allowLectureBtn.setTextSize(13);
        allowLectureBtn.setTypeface(Typeface.DEFAULT_BOLD);
        allowLectureBtn.setTextColor(Color.WHITE);

        GradientDrawable allowBg = new GradientDrawable();
        allowBg.setColor(Color.parseColor("#1E293B"));
        allowBg.setStroke(dpToPx(1), Color.parseColor("#00E5FF"));
        allowBg.setCornerRadius(dpToPx(12));
        allowLectureBtn.setBackground(allowBg);

        LinearLayout.LayoutParams allowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(42)
        );
        allowParams.setMargins(0, dpToPx(8), 0, 0);
        cardLayout.addView(allowLectureBtn, allowParams);

        allowLectureBtn.setOnClickListener(v -> {
            if (lastDistractionSignature != null && !lastDistractionSignature.isEmpty()) {
                whitelistedLectureSignatures.add(lastDistractionSignature);
            }
            if (activePendingLectureSignature != null && !activePendingLectureSignature.isEmpty()) {
                whitelistedLectureSignatures.add(activePendingLectureSignature);
            }
            dismissOverlay();
            resetDistractionSession();
            Toast.makeText(getApplicationContext(), "✅ Lecture whitelisted & permitted for session", Toast.LENGTH_SHORT).show();
        });

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
        try {
            PackageManager pm = getPackageManager();
            CharSequence label = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0));
            if (label != null && label.length() > 0) return label.toString();
        } catch (Exception ignored) {}
        if (pkg.contains("facebook")) return "Facebook";
        if (pkg.contains("instagram")) return "Instagram";
        if (pkg.contains("twitter")) return "X (Twitter)";
        if (pkg.contains("snapchat")) return "Snapchat";
        if (pkg.contains("reddit")) return "Reddit";
        if (pkg.contains("netflix")) return "Netflix";
        if (pkg.contains("tiktok") || pkg.contains("musically")) return "TikTok";
        return "Application";
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onInterrupt() {
        dismissOverlay();
    }
}
