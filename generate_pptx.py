"""
Generate high-fidelity PowerPoint Presentation (.pptx) for Productometer
Faithfully based on the 8-Page Project Writeout Specification (Version 2.0).
Uses python-pptx with widescreen 16:9 aspect ratio, dark cosmic theme,
high-contrast typography, styled cards, and embedded screenshots.
"""

import os
import tempfile
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml import parse_xml

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Palette
    BG_COLOR = RGBColor(7, 11, 25)          # Deep cosmic navy
    CARD_BG = RGBColor(16, 23, 48)          # Elevated card navy
    CARD_BORDER = RGBColor(38, 52, 92)      # Subtle glass border
    CYAN = RGBColor(0, 229, 255)            # Accent Cyan
    EMERALD = RGBColor(0, 230, 118)         # Success Emerald
    AMBER = RGBColor(255, 179, 0)           # Warm Amber
    PURPLE = RGBColor(168, 85, 247)         # Royal Purple
    CRIMSON = RGBColor(255, 23, 68)         # Danger Red
    WHITE = RGBColor(248, 250, 252)         # Crisp White
    SLATE = RGBColor(148, 163, 184)         # Muted Slate
    SLATE_LIGHT = RGBColor(203, 213, 225)   # Body text light slate

    # Helper: ensure image is JPEG/PNG for python-pptx
    temp_files = []
    def prepare_image(src_path):
        if not os.path.exists(src_path):
            return None
        ext = os.path.splitext(src_path)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png']:
            return src_path
        try:
            im = Image.open(src_path)
            tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            tmp_path = tmp.name
            tmp.close()
            im.save(tmp_path, 'PNG')
            temp_files.append(tmp_path)
            return tmp_path
        except Exception as e:
            print(f"Error preparing {src_path}: {e}")
            return None

    # Base assets
    base_assets_dir = r"C:\Users\USER\My Projects\Productivity_Meter\Features\assets"
    img_planner = prepare_image(os.path.join(base_assets_dir, "1.avif"))
    img_acad = prepare_image(os.path.join(base_assets_dir, "2.jpg"))
    img_screen = prepare_image(os.path.join(base_assets_dir, "3.avif"))
    img_health = prepare_image(os.path.join(base_assets_dir, "4.avif"))
    img_sleep = prepare_image(os.path.join(base_assets_dir, "5.jpeg"))

    def add_slide_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()
        return bg

    def add_header(slide, tag_text, title_text, subtitle_text=None, tag_color=CYAN):
        # Badge
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.5), Inches(3.8), Inches(0.35))
        badge.fill.solid()
        badge.fill.fore_color.rgb = CARD_BG
        badge.line.color.rgb = tag_color
        badge.line.width = Pt(1)
        tf = badge.text_frame
        tf.word_wrap = True
        tf.margin_top = Pt(3)
        tf.margin_bottom = Pt(3)
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        run.text = tag_text.upper()
        run.font.size = Pt(9.5)
        run.font.bold = True
        run.font.color.rgb = tag_color

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.95), Inches(11.7), Inches(0.65))
        tf_t = title_box.text_frame
        tf_t.word_wrap = True
        tf_t.margin_top = Inches(0)
        p_t = tf_t.paragraphs[0]
        r_t = p_t.add_run()
        r_t.text = title_text
        r_t.font.size = Pt(24)
        r_t.font.bold = True
        r_t.font.color.rgb = WHITE

        # Subtitle
        if subtitle_text:
            sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.55), Inches(11.7), Inches(0.45))
            tf_s = sub_box.text_frame
            tf_s.word_wrap = True
            tf_s.margin_top = Inches(0)
            p_s = tf_s.paragraphs[0]
            r_s = p_s.add_run()
            r_s.text = subtitle_text
            r_s.font.size = Pt(12)
            r_s.font.color.rgb = SLATE

    # ========================================================
    # SLIDE 1: Title & System Vision (Sheet 1)
    # ========================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s1)

    # Greeting tag
    badge1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.6), Inches(3.6), Inches(0.35))
    badge1.fill.solid()
    badge1.fill.fore_color.rgb = CARD_BG
    badge1.line.color.rgb = CYAN
    badge1.text_frame.margin_top = Pt(3)
    p = badge1.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = "STUDENT DISCIPLINE & PRODUCTIVITY SYSTEM • V2.0"
    r.font.size = Pt(9)
    r.font.bold = True
    r.font.color.rgb = CYAN

    # Big Title
    tb = s1.shapes.add_textbox(Inches(0.8), Inches(1.05), Inches(11.7), Inches(0.9))
    p = tb.text_frame.paragraphs[0]
    r = p.add_run()
    r.text = "Productometer"
    r.font.size = Pt(38)
    r.font.bold = True
    r.font.color.rgb = WHITE

    # Subtitle
    tb_sub = s1.shapes.add_textbox(Inches(0.8), Inches(1.95), Inches(11.7), Inches(0.5))
    p = tb_sub.text_frame.paragraphs[0]
    r = p.add_run()
    r.text = "An ultimate destination built for students to track and master their entire 24-hour day—Studies, Health, Screen Time, and Sleep cycle."
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = CYAN

    # Problem & Philosophy Card (Why Productometer Was Created)
    card_why = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.6), Inches(11.733), Inches(1.7))
    card_why.fill.solid()
    card_why.fill.fore_color.rgb = CARD_BG
    card_why.line.color.rgb = AMBER
    card_why.line.width = Pt(1.5)
    tf_why = card_why.text_frame
    tf_why.word_wrap = True
    tf_why.margin_left = Inches(0.3)
    tf_why.margin_right = Inches(0.3)
    tf_why.margin_top = Inches(0.2)

    p1 = tf_why.paragraphs[0]
    r = p1.add_run()
    r.text = "💡 Why Productometer Was Created\n"
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = AMBER

    p2 = tf_why.add_paragraph()
    r = p2.add_run()
    r.text = (
        "Most students today juggle 4 to 6 disconnected apps (a Pomodoro timer, a calendar, a habit checklist, "
        "a workout app, and a sleep alarm). Worse, conventional app blockers fail because they lock phones completely, "
        "creating frustration that leads students to uninstall the blocker within 48 hours.\n\n"
        "Productometer replaces willpower with smart, friendly architecture—connecting your daily academic goals, "
        "physical movement, healthy screen limits, and restful bedtime sleep into one cohesive system that works completely offline."
    )
    r.font.size = Pt(11)
    r.font.color.rgb = SLATE_LIGHT

    # 4 Core Domains (4 Cards Side by Side)
    domains = [
        ("1. Academics & Focus", "Lecture-safe study sessions that let you watch educational tutorials freely while preventing rabbit holes.", CYAN),
        ("2. PulseFit Health", "Built-in step pedometer, active calorie targets, and 40+ workout guides to keep body energy high.", EMERALD),
        ("3. Screen Management", "Ground-truth automated screen time tracking from midnight with the friendly 1-Reel Grace Rule.", AMBER),
        ("4. Sleep & Recovery", "Circadian Bedtime Shield that dims blue light 15 minutes before bed, plus smart wake-up alarms.", PURPLE)
    ]

    card_w = Inches(2.78)
    card_gap = Inches(0.2)
    left_start = Inches(0.8)
    top_pos = Inches(4.55)

    for i, (d_title, d_desc, d_color) in enumerate(domains):
        x = left_start + i * (card_w + card_gap)
        c = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, top_pos, card_w, Inches(2.35))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = d_color
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.2)
        tf.margin_right = Inches(0.2)
        tf.margin_top = Inches(0.25)

        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = d_title + "\n\n"
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.color.rgb = d_color

        p_desc = tf.add_paragraph()
        r_desc = p_desc.add_run()
        r_desc.text = d_desc
        r_desc.font.size = Pt(10.5)
        r_desc.font.color.rgb = SLATE_LIGHT

    # ========================================================
    # SLIDE 2: Phone Permissions & Security (Sheet 2)
    # ========================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s2)
    add_header(s2, "SYSTEM SECURITY & COMPLIANCE • SAFE & OFFLINE", 
               "Why Does Productometer Need Phone Permissions?", 
               "A brief and transparent guide to the 4 essential permissions requested from your smartphone.")

    perms = [
        ("1. Accessibility Permission", "Shorts & Reels Guardian",
         "Why it's needed: Gently detects when YouTube Shorts or Instagram Reels open. Powers our 1-Reel Grace Rule (30s grace).",
         "100% Safe: Never reads chats, passwords, or personal messages. Only detects short-form video screens.", AMBER),
        ("2. Usage Access Permission", "Automatic Screen Time",
         "Why it's needed: Automatically calculates exact minutes and hours spent on apps from 00:00 midnight to right now.",
         "100% Safe: Reads only phone's internal usage counter. No personal files or browsing histories are touched.", CYAN),
        ("3. Alarms & Notifications", "Exact Timers & Waking Alarms",
         "Why it's needed: Allows study session countdowns, rest reminders, and morning alarms to ring on the exact second.",
         "100% Safe: Rings strictly for your scheduled tasks and automatically survives device reboots.", PURPLE),
        ("4. Physical Activity Sensor", "Built-in Step Pedometer",
         "Why it's needed: Tracks daily walking steps and physical movement using phone's built-in step counter sensor.",
         "100% Safe: Uses low-power hardware step counting (< 0.02% battery/hr) with zero GPS tracking.", EMERALD)
    ]

    p_w = Inches(5.75)
    p_h = Inches(1.9)
    for i, (p_title, p_sub, p_why, p_safe, p_col) in enumerate(perms):
        col_idx = i % 2
        row_idx = i // 2
        px = Inches(0.8) + col_idx * Inches(6.0)
        py = Inches(2.15) + row_idx * Inches(2.1)

        c = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px, py, p_w, p_h)
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = p_col
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.25)
        tf.margin_right = Inches(0.25)
        tf.margin_top = Inches(0.18)

        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = f"{p_title} "
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = p_col

        r_sub = p.add_run()
        r_sub.text = f"({p_sub})\n"
        r_sub.font.size = Pt(10)
        r_sub.font.color.rgb = SLATE

        p_w_text = tf.add_paragraph()
        r_w = p_w_text.add_run()
        r_w.text = p_why + "\n"
        r_w.font.size = Pt(9.5)
        r_w.font.color.rgb = SLATE_LIGHT

        p_s_text = tf.add_paragraph()
        r_s = p_s_text.add_run()
        r_s.text = f"✓ {p_safe}"
        r_s.font.size = Pt(9.5)
        r_s.font.bold = True
        r_s.font.color.rgb = WHITE

    # Offline Guarantee Banner
    off_banner = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.45), Inches(11.75), Inches(0.7))
    off_banner.fill.solid()
    off_banner.fill.fore_color.rgb = CARD_BG
    off_banner.line.color.rgb = EMERALD
    off_banner.line.width = Pt(1)
    tf_off = off_banner.text_frame
    tf_off.word_wrap = True
    tf_off.margin_left = Inches(0.25)
    tf_off.margin_top = Inches(0.1)
    p_off = tf_off.paragraphs[0]
    r_off1 = p_off.add_run()
    r_off1.text = "🛡️ Zero-Cloud Offline Privacy Guarantee: "
    r_off1.font.size = Pt(10.5)
    r_off1.font.bold = True
    r_off1.font.color.rgb = EMERALD

    r_off2 = p_off.add_run()
    r_off2.text = "100% self-contained. All schedules, screen statistics, and health metrics are saved securely inside your phone's encrypted memory. No accounts, no logins, and zero data ever uploaded to cloud servers."
    r_off2.font.size = Pt(9.5)
    r_off2.font.color.rgb = SLATE_LIGHT

    # ========================================================
    # SLIDE 3: Feature 1 — Day Planner (Sheet 3)
    # ========================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s3)
    add_header(s3, "MODULE 1 • TIME ALLOCATION • TIME MASTERY", 
               "Feature 1: The 48-Slot Continuous Day Planner", 
               "Schedule your entire 24-hour day in effortless touch swipe painting.")

    # Left Column: Features (3 Cards)
    f1_cards = [
        ("Automatic Hardware Wake Alarms",
         "Every scheduled block automatically configures an exact Android alarm that rings on time to keep you disciplined, waking the phone screen even in deep battery sleep.",
         AMBER),
        ("Survives Phone Reboots",
         "If your phone runs out of battery or restarts overnight, Productometer automatically restores all your planned task alarms the moment the phone turns back on.",
         CYAN),
        ("Direct Activity Point Rewards",
         "Completing your scheduled day blocks awards +50 execution points toward your daily Net AP score, turning time discipline into a fun daily achievement.",
         EMERALD)
    ]

    card_y = Inches(2.1)
    for title, desc, col in f1_cards:
        c = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), card_y, Inches(6.8), Inches(1.4))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = col
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.25)
        tf.margin_right = Inches(0.25)
        tf.margin_top = Inches(0.18)

        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = f"★ {title}\n"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = col

        p2 = tf.add_paragraph()
        r2 = p2.add_run()
        r2.text = desc
        r2.font.size = Pt(10)
        r2.font.color.rgb = SLATE_LIGHT

        card_y += Inches(1.55)

    # Right Column: Screenshot Card
    if img_planner:
        s3.shapes.add_picture(img_planner, Inches(8.0), Inches(2.1), width=Inches(4.5), height=Inches(4.5))

    # ========================================================
    # SLIDE 4: Feature 2 — The 1-Reel Grace Rule (Sheet 4)
    # ========================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s4)
    add_header(s4, "MODULE 2 • FOCUS SECURITY • SMART INTERCEPTION", 
               "Feature 2: The 1-Reel Grace Rule", 
               "Why traditional app blockers fail—and how our friendly state machine protects your attention.")

    # Top Comparison Box
    comp_flaw = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.1), Inches(5.7), Inches(1.2))
    comp_flaw.fill.solid()
    comp_flaw.fill.fore_color.rgb = CARD_BG
    comp_flaw.line.color.rgb = CRIMSON
    tf_f = comp_flaw.text_frame
    tf_f.word_wrap = True
    tf_f.margin_left = Inches(0.2)
    tf_f.margin_top = Inches(0.15)
    p = tf_f.paragraphs[0]
    r = p.add_run()
    r.text = "✕ Traditional Blockers (The Flaw)\n"
    r.font.size = Pt(11.5)
    r.font.bold = True
    r.font.color.rgb = CRIMSON
    p2 = tf_f.add_paragraph()
    r2 = p2.add_run()
    r2.text = "Lock apps completely. If a classmate sends an important video link, you can't view it. Users get annoyed and uninstall the blocker within 48 hours."
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = SLATE_LIGHT

    comp_sol = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(2.1), Inches(5.733), Inches(1.2))
    comp_sol.fill.solid()
    comp_sol.fill.fore_color.rgb = CARD_BG
    comp_sol.line.color.rgb = EMERALD
    tf_s = comp_sol.text_frame
    tf_s.word_wrap = True
    tf_s.margin_left = Inches(0.2)
    tf_s.margin_top = Inches(0.15)
    p = tf_s.paragraphs[0]
    r = p.add_run()
    r.text = "✓ Productometer 1-Reel Grace (The Solution)\n"
    r.font.size = Pt(11.5)
    r.font.bold = True
    r.font.color.rgb = EMERALD
    p2 = tf_s.add_paragraph()
    r2 = p2.add_run()
    r2.text = "Permits the 1st short with a gentle 30-second reminder. Only intervenes when you swipe consecutively into algorithmic doomscrolling."
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = SLATE_LIGHT

    # 3-Step State Machine Heading
    sub_sm = s4.shapes.add_textbox(Inches(0.8), Inches(3.45), Inches(11.7), Inches(0.35))
    p_sm = sub_sm.text_frame.paragraphs[0]
    r_sm = p_sm.add_run()
    r_sm.text = "HOW THE 1-REEL GRACE STATE MACHINE WORKS IN PRACTICE"
    r_sm.font.size = Pt(10.5)
    r_sm.font.bold = True
    r_sm.font.color.rgb = CYAN

    # 3 Steps Cards
    steps = [
        ("STEP 1", "1st Short Allowed (Grace Period)",
         "You open YouTube Shorts or Instagram Reels. The app detects it and shows a friendly toast:\n\"1 Reel Allowed • 30s Grace Active\". Watch what you need without interruption.",
         EMERALD),
        ("STEP 2", "2nd Consecutive Swipe (Intervention HUD)",
         "If you swipe up again to start scrolling uncontrollably, a soft audio reminder sounds and a clean 5-second countdown HUD appears over the video.",
         AMBER),
        ("STEP 3", "Automatic Return to Study Notes",
         "At 0 seconds, the app automatically triggers a smooth back navigation, bringing you right back to your notes or study session with zero lost work.",
         CYAN)
    ]

    st_w = Inches(3.75)
    st_gap = Inches(0.24)
    for i, (tag, st_title, st_desc, st_col) in enumerate(steps):
        sx = Inches(0.8) + i * (st_w + st_gap)
        c = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, sx, Inches(3.85), st_w, Inches(2.2))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = st_col
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.2)
        tf.margin_right = Inches(0.2)
        tf.margin_top = Inches(0.18)

        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = tag + "\n"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = st_col

        p2 = tf.add_paragraph()
        r2 = p2.add_run()
        r2.text = st_title + "\n\n"
        r2.font.size = Pt(11)
        r2.font.bold = True
        r2.font.color.rgb = WHITE

        p3 = tf.add_paragraph()
        r3 = p3.add_run()
        r3.text = st_desc
        r3.font.size = Pt(9.5)
        r3.font.color.rgb = SLATE_LIGHT

    # Emergency Override Pass Callout
    pass_box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.2), Inches(11.733), Inches(0.75))
    pass_box.fill.solid()
    pass_box.fill.fore_color.rgb = CARD_BG
    pass_box.line.color.rgb = AMBER
    pass_box.line.width = Pt(1)
    tf_p = pass_box.text_frame
    tf_p.word_wrap = True
    tf_p.margin_left = Inches(0.25)
    tf_p.margin_top = Inches(0.12)
    p_p = tf_p.paragraphs[0]
    r_p1 = p_p.add_run()
    r_p1.text = "🔑 30-Second Emergency Override Pass: "
    r_p1.font.size = Pt(10.5)
    r_p1.font.bold = True
    r_p1.font.color.rgb = AMBER
    r_p2 = p_p.add_run()
    r_p2.text = "Have an urgent message to check or need to copy something quickly? Simply tap \"Emergency Pass\" to receive an immediate 30-second window before focus monitoring re-engages."
    r_p2.font.size = Pt(9.5)
    r_p2.font.color.rgb = SLATE_LIGHT

    # ========================================================
    # SLIDE 5: Feature 3 — Academics & Lecture Security (Sheet 5)
    # ========================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s5)
    add_header(s5, "MODULE 3 • ACADEMIC FOCUS • STUDY SHIELD", 
               "Feature 3: Academics & Lecture Security", 
               "Learn freely on YouTube without falling into algorithmic entertainment traps.")

    f3_cards = [
        ("Whitelists Educational Videos",
         "Students rely on online video lectures to learn. Productometer inspects video titles for keywords like lecture, tutorial, class, coding, physics, exam and allows uninterrupted full-screen playback.",
         CYAN),
        ("15-Second Casual Video Reminder",
         "If you click on non-educational entertainment (gaming streams, reaction vlogs) during an active study session, a gentle 15-second grace timer prompts you to stay on track before issuing an alert.",
         AMBER),
        ("Ongoing Status Bar Countdown Ticker",
         "Your study Pomodoro session runs as an ongoing notification ticker in your phone's status bar, showing time remaining and focus points earned without getting killed by the phone's memory.",
         EMERALD),
        ("Direct +100 Points per Study Hour",
         "Every hour spent in verified deep study adds +100 points directly to your daily score, incentivizing consistent academic focus.",
         PURPLE)
    ]

    card_y = Inches(2.1)
    for title, desc, col in f3_cards:
        c = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), card_y, Inches(6.8), Inches(1.1))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = col
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.2)
        tf.margin_top = Inches(0.12)

        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = f"🎓 {title}\n"
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = col

        p2 = tf.add_paragraph()
        r2 = p2.add_run()
        r2.text = desc
        r2.font.size = Pt(9.5)
        r2.font.color.rgb = SLATE_LIGHT

        card_y += Inches(1.22)

    # Right Column: Academics Screenshot
    if img_acad:
        s5.shapes.add_picture(img_acad, Inches(8.0), Inches(2.1), width=Inches(4.5), height=Inches(4.7))

    # ========================================================
    # SLIDE 6: Feature 4 — Automated Screen Management (Sheet 6)
    # ========================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s6)
    add_header(s6, "MODULE 4 • DIGITAL WELLBEING • ZERO TYPING", 
               "Feature 4: Automated Screen Management", 
               "True foreground device consumption calculated automatically from midnight with smart color psychology.")

    # Left Column: Features + Color Rules
    c_calc = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.1), Inches(6.8), Inches(1.1))
    c_calc.fill.solid()
    c_calc.fill.fore_color.rgb = CARD_BG
    c_calc.line.color.rgb = CYAN
    tf = c_calc.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.2)
    tf.margin_top = Inches(0.12)
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = "⚡ Calculated From Midnight to Now\n"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = CYAN
    p2 = tf.add_paragraph()
    r2 = p2.add_run()
    r2.text = "Never waste time manually starting timers. Productometer automatically streams exact foreground app minutes from 00:00 midnight to the current second."
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = SLATE_LIGHT

    c_apps = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(3.32), Inches(6.8), Inches(1.1))
    c_apps.fill.solid()
    c_apps.fill.fore_color.rgb = CARD_BG
    c_apps.line.color.rgb = EMERALD
    tf = c_apps.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.2)
    tf.margin_top = Inches(0.12)
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = "📱 App Icons & Real App Names\n"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = EMERALD
    p2 = tf.add_paragraph()
    r2 = p2.add_run()
    r2.text = "Displays crisp native app icons and names (e.g. YouTube, WhatsApp, Instagram) with exact minutes spent and total Shorts swipe counts side by side."
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = SLATE_LIGHT

    # Color Psychology Card
    c_col = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.55), Inches(6.8), Inches(2.25))
    c_col.fill.solid()
    c_col.fill.fore_color.rgb = CARD_BG
    c_col.line.color.rgb = CARD_BORDER
    tf = c_col.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.2)
    tf.margin_top = Inches(0.12)
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = "STRICT COLOR PSYCHOLOGY RULES:\n"
    r.font.size = Pt(10.5)
    r.font.bold = True
    r.font.color.rgb = WHITE

    color_rules = [
        ("Calm Blue & Emerald Green (Healthy Usage):", "Normal daily usage and study applications display in peaceful, encouraging tones.", EMERALD),
        ("Warm Amber (Attention Needed):", "Highlights when non-academic screen scrolling begins to creep upward.", AMBER),
        ("Strict Red Alert (Excessive Limits Only):", "Reserved strictly for when entertainment screen time crosses high limits (> 3.5 hrs) or triggers doomscroll warnings.", CRIMSON)
    ]
    for lbl, desc, col in color_rules:
        p_c = tf.add_paragraph()
        r1 = p_c.add_run()
        r1.text = "● " + lbl + " "
        r1.font.size = Pt(9.5)
        r1.font.bold = True
        r1.font.color.rgb = col
        r2 = p_c.add_run()
        r2.text = desc + "\n"
        r2.font.size = Pt(9)
        r2.font.color.rgb = SLATE_LIGHT

    # Right Column: Screenshot
    if img_screen:
        s6.shapes.add_picture(img_screen, Inches(8.0), Inches(2.1), width=Inches(4.5), height=Inches(4.7))

    # ========================================================
    # SLIDE 7: Features 5 & 6 — Health, Sleep & AI Coach (Sheet 7)
    # ========================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s7)
    add_header(s7, "MODULES 5 & 6 • BIOLOGY & RECOVERY • TOTAL RECOVERY", 
               "Features 5 & 6: Health, Sleep & AI Coach", 
               "Physical energy drives academic excellence—step tracking, nighttime blue-light shields, and AI assistance.")

    pillars = [
        ("PulseFit Health",
         [("Step Pedometer", "Automatically counts daily steps using your phone's built-in motion sensor with under 0.02% battery drain per hour."),
          ("Active Calorie Targets", "Estimates daily calories burned to ensure your body is fueled for long study blocks."),
          ("40+ Exercise Guides", "Built-in video/form guides for safe stretching, bodyweight exercises, and gym routines.")],
         EMERALD),
        ("Circadian Sleep Shield",
         [("15-Min Bedtime Barrier", "Engages 15 minutes before your planned sleep, dimming blue light to protect your natural melatonin and sleep quality."),
          ("Smart Morning Alarms", "Configures loud, reliable wake-up alarms that ensure you get 7–8 hours of memory-consolidating sleep."),
          ("Sleep Bonus", "Meeting your sleep targets awards positive bonus points to your daily productivity score.")],
         PURPLE),
        ("Producto AI Coach",
         [("Syllabus Chunking", "Takes intimidating multi-chapter course syllabi and breaks them down into realistic 30-minute study blocks."),
          ("Cognitive Debriefs", "Detects mental fatigue after long study marathons, recommending water, stretches, and break intervals."),
          ("Schedule Advice", "Helps you balance heavy exam study with daily gym and sleep.")],
         CYAN)
    ]

    p_w = Inches(3.75)
    p_gap = Inches(0.24)
    for i, (p_title, bullets, p_col) in enumerate(pillars):
        px = Inches(0.8) + i * (p_w + p_gap)
        c = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px, Inches(2.1), p_w, Inches(4.8))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = p_col
        c.line.width = Pt(1.5)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.2)
        tf.margin_right = Inches(0.2)
        tf.margin_top = Inches(0.2)

        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = p_title + "\n\n"
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.color.rgb = p_col

        for b_name, b_desc in bullets:
            p_b = tf.add_paragraph()
            r_bn = p_b.add_run()
            r_bn.text = "✓ " + b_name + ": "
            r_bn.font.size = Pt(9.5)
            r_bn.font.bold = True
            r_bn.font.color.rgb = WHITE

            r_bd = p_b.add_run()
            r_bd.text = b_desc + "\n\n"
            r_bd.font.size = Pt(9)
            r_bd.font.color.rgb = SLATE_LIGHT

    # ========================================================
    # SLIDE 8: Feature 7 — Gamified Productivity (Sheet 8)
    # ========================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s8)
    add_header(s8, "MODULE 7 • EVALUATION ENGINE • BALANCED DISCIPLINE", 
               "Feature 7: Gamified Productivity Scoring", 
               "A balanced scoring formula that rewards healthy consistency instead of toxic burnout.")

    # Formula Box
    form_box = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.1), Inches(11.733), Inches(1.85))
    form_box.fill.solid()
    form_box.fill.fore_color.rgb = CARD_BG
    form_box.line.color.rgb = CYAN
    form_box.line.width = Pt(1.5)
    tf_fb = form_box.text_frame
    tf_fb.word_wrap = True
    tf_fb.margin_left = Inches(0.3)
    tf_fb.margin_top = Inches(0.18)

    p = tf_fb.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = "HOW YOUR DAILY PRODUCTIVITY SCORE (NET AP) IS CALCULATED\n"
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = CYAN

    p_f = tf_fb.add_paragraph()
    p_f.alignment = PP_ALIGN.CENTER
    r_f = p_f.add_run()
    r_f.text = "Net Score = Study Points + Workout Bonus + Completed Tasks − Screen Time Deductions\n\n"
    r_f.font.size = Pt(14)
    r_f.font.bold = True
    r_f.font.color.rgb = WHITE

    p_parts = tf_fb.add_paragraph()
    p_parts.alignment = PP_ALIGN.CENTER
    r_p = p_parts.add_run()
    r_p.text = "+100 Pts/Hour (Deep Study)   •   +Workout Bonus (1–2h Exercise)   •   +50 Pts/Block (Day Planner)   •   −Screen Deductions"
    r_p.font.size = Pt(10.5)
    r_p.font.color.rgb = SLATE_LIGHT

    # Operative Discipline Tiers (4 Cards)
    tiers = [
        ("NOVICE", "< 150 AP", "Screen scrolling exceeds study. Focus guardian recommended.", CRIMSON),
        ("FOCUSED", "150 – 300 AP", "Core study met. Consistency in planning or workout needed.", AMBER),
        ("DISCIPLINED", "300 – 480 AP", "3+ hrs study, daily workout, and tight screen time caps.", CYAN),
        ("TITANIUM", "≥ 480 AP", "All planned blocks done, zero doomscrolling, full 8h sleep.", EMERALD)
    ]

    tier_w = Inches(2.78)
    tier_gap = Inches(0.2)
    for i, (t_name, t_score, t_desc, t_col) in enumerate(tiers):
        tx = Inches(0.8) + i * (tier_w + tier_gap)
        c = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, tx, Inches(4.2), tier_w, Inches(2.7))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = t_col
        c.line.width = Pt(1.5)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.2)
        tf.margin_right = Inches(0.2)
        tf.margin_top = Inches(0.25)

        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = t_name + "\n"
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.color.rgb = t_col

        p_s = tf.add_paragraph()
        p_s.alignment = PP_ALIGN.CENTER
        r_s = p_s.add_run()
        r_s.text = t_score + "\n\n"
        r_s.font.size = Pt(16)
        r_s.font.bold = True
        r_s.font.color.rgb = WHITE

        p_d = tf.add_paragraph()
        p_d.alignment = PP_ALIGN.CENTER
        r_d = p_d.add_run()
        r_d.text = t_desc
        r_d.font.size = Pt(10)
        r_d.font.color.rgb = SLATE_LIGHT

    # ========================================================
    # SLIDE 9: Examiner Defense & Conclusion (Sheet 8 Defense)
    # ========================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_slide_bg(s9)
    add_header(s9, "CONCLUSION • PROJECT DEFENSE • EXAMINER SUMMARY", 
               "Examiner Defense & Real-World Impact", 
               "Why Productometer succeeds where conventional student tools fail.")

    defenses = [
        ("Complete Offline Autonomy",
         "100% private, self-contained local storage with zero cloud tracking servers. Zero user accounts, zero ads, and zero personal privacy liabilities.",
         CYAN),
        ("Negligible Battery Overhead",
         "Total background battery impact benchmarked at under 1.8% per 24 hours through intelligent event-driven Android listeners instead of aggressive polling.",
         EMERALD),
        ("Human-Centered Discipline",
         "The 1-Reel Grace Rule and Lecture Security respect real student needs, preventing the typical 48-hour uninstallation cycle of conventional blockers.",
         PURPLE)
    ]

    dy = Inches(2.1)
    for title, desc, col in defenses:
        c = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), dy, Inches(11.733), Inches(1.05))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = col
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.3)
        tf.margin_top = Inches(0.15)

        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = f"🛡️ {title}: "
        r.font.size = Pt(11.5)
        r.font.bold = True
        r.font.color.rgb = col

        r2 = p.add_run()
        r2.text = desc
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = SLATE_LIGHT

        dy += Inches(1.18)

    # Philosophy Quote Card
    quote_card = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.75), Inches(11.733), Inches(1.2))
    quote_card.fill.solid()
    quote_card.fill.fore_color.rgb = CARD_BG
    quote_card.line.color.rgb = AMBER
    quote_card.line.width = Pt(1.5)
    tf_q = quote_card.text_frame
    tf_q.word_wrap = True
    tf_q.margin_left = Inches(0.3)
    tf_q.margin_top = Inches(0.18)
    p_q = tf_q.paragraphs[0]
    p_q.alignment = PP_ALIGN.CENTER
    r_q = p_q.add_run()
    r_q.text = "“Discipline isn't about punishment or fighting your phone. It's about designing a setup that protects your focus so doing the right thing becomes effortless.”\n"
    r_q.font.size = Pt(12)
    r_q.font.bold = True
    r_q.font.color.rgb = WHITE

    p_sign = tf_q.add_paragraph()
    p_sign.alignment = PP_ALIGN.CENTER
    r_sign = p_sign.add_run()
    r_sign.text = "Productometer • Academic & Technical Project Defense • You've Got This."
    r_sign.font.size = Pt(10)
    r_sign.font.color.rgb = CYAN

    # Add native smooth fade transition animations to every slide
    for slide in prs.slides:
        transition_elem = parse_xml(
            '<p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" spd="med">'
            '<p:fade/>'
            '</p:transition>'
        )
        slide._element.append(transition_elem)

    # Output files: Both Standard PPTX and Full-Screen Auto-Play PPSX
    output_dir = r"C:\Users\USER\My Projects\Productivity_Meter\Presentation"
    output_pptx = os.path.join(output_dir, "Productometer_Presentation.pptx")
    output_ppsx = os.path.join(output_dir, "Productometer_Presentation.ppsx")

    prs.save(output_pptx)
    prs.save(output_ppsx)
    print(f"PowerPoint Presentation successfully saved to: {output_pptx}")
    print(f"PowerPoint Full-Screen Slide Show saved to: {output_ppsx}")
    print(f"Total slides: {len(prs.slides)}")

    # Clean up temp files
    for t in temp_files:
        try:
            os.remove(t)
        except:
            pass

if __name__ == "__main__":
    create_deck()
