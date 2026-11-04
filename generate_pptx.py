"""
Generate high-fidelity 16:9 PowerPoint Presentation (.pptx and .ppsx) for Productometer
Built from the official high-resolution screenshots in 'pics/', cropped to remove
browser chrome and navigation strips, with side margins matching the cosmic navy theme,
card layout adjustments (Slide 12 2x2 grid, Slide 7/9/10 clean card stacking),
Slide 13 clean ending with last 3 options removed, and native PowerPoint fade animations.
"""

import os
from PIL import Image
from pptx import Presentation
from pptx.util import Inches
from pptx.oxml import parse_xml

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PICS_DIR = os.path.join(BASE_DIR, "pics")
PRES_DIR = os.path.join(BASE_DIR, "Presentation")
TEMP_SLIDES_DIR = os.path.join(PRES_DIR, "compiled_slides")
os.makedirs(TEMP_SLIDES_DIR, exist_ok=True)

BG = (7, 11, 25)
W, H = 1600, 900 # Standard 16:9 widescreen canvas

def make_slide(img_cropped):
    canvas = Image.new('RGB', (W, H), color=BG)
    cw, ch = img_cropped.size
    x = (W - cw) // 2
    y = (H - ch) // 2
    canvas.paste(img_cropped, (x, y))
    return canvas

def crop_standard(fname):
    p = os.path.join(PICS_DIR, fname)
    with Image.open(p) as im:
        return im.crop((30, 62, 994, 704))

def build_all_slides():
    print("Building 13 high-resolution 16:9 slide images...")
    
    # Slide 1: Welcome (Screenshot 688)
    make_slide(crop_standard("Screenshot (688).png")).save(os.path.join(TEMP_SLIDES_DIR, "slide_01.png"))
    
    # Slide 2: Everything in One Place (Screenshot 689)
    make_slide(crop_standard("Screenshot (689).png")).save(os.path.join(TEMP_SLIDES_DIR, "slide_02.png"))
    
    # Slide 3: Habits & Discipline (Screenshot 690)
    make_slide(crop_standard("Screenshot (690).png")).save(os.path.join(TEMP_SLIDES_DIR, "slide_03.png"))
    
    # Slide 4: Daily Score (Screenshot 691)
    make_slide(crop_standard("Screenshot (691).png")).save(os.path.join(TEMP_SLIDES_DIR, "slide_04.png"))
    
    # Slide 5: Producto AI (Screenshot 692)
    make_slide(crop_standard("Screenshot (692).png")).save(os.path.join(TEMP_SLIDES_DIR, "slide_05.png"))
    
    # Slide 6: Distraction Blocker (Screenshot 693)
    make_slide(crop_standard("Screenshot (693).png")).save(os.path.join(TEMP_SLIDES_DIR, "slide_06.png"))
    
    # Slide 7: Day Planner (Screenshot 694 + 695)
    with Image.open(os.path.join(PICS_DIR, "Screenshot (694).png")) as img694, \
         Image.open(os.path.join(PICS_DIR, "Screenshot (695).png")) as img695:
        head7 = img694.crop((30, 62, 994, 235))
        cards7 = img695.crop((30, 440, 994, 690))
        s7 = Image.new('RGB', (W, H), color=BG)
        total_h = head7.height + cards7.height + 40
        start_y = (H - total_h) // 2
        s7.paste(head7, ((W - head7.width)//2, start_y))
        s7.paste(cards7, ((W - cards7.width)//2, start_y + head7.height + 40))
        s7.save(os.path.join(TEMP_SLIDES_DIR, "slide_07.png"))
        
    # Slide 8: Academics Monitoring (Screenshot 696)
    make_slide(crop_standard("Screenshot (696).png")).save(os.path.join(TEMP_SLIDES_DIR, "slide_08.png"))
    
    # Slide 9: Health & Workouts (Screenshot 697 + 698)
    with Image.open(os.path.join(PICS_DIR, "Screenshot (697).png")) as img697, \
         Image.open(os.path.join(PICS_DIR, "Screenshot (698).png")) as img698:
        head9 = img697.crop((30, 62, 994, 235))
        cards9 = img698.crop((30, 440, 994, 690))
        s9 = Image.new('RGB', (W, H), color=BG)
        total_h = head9.height + cards9.height + 40
        start_y = (H - total_h) // 2
        s9.paste(head9, ((W - head9.width)//2, start_y))
        s9.paste(cards9, ((W - cards9.width)//2, start_y + head9.height + 40))
        s9.save(os.path.join(TEMP_SLIDES_DIR, "slide_09.png"))
        
    # Slide 10: Screen Management (Screenshot 699 + 700)
    with Image.open(os.path.join(PICS_DIR, "Screenshot (699).png")) as img699, \
         Image.open(os.path.join(PICS_DIR, "Screenshot (700).png")) as img700:
        head10 = img699.crop((30, 62, 994, 215))
        c10_1 = img699.crop((30, 560, 994, 675))
        c10_23 = img700.crop((30, 500, 994, 690))
        s10 = Image.new('RGB', (W, H), color=BG)
        total_h = head10.height + c10_1.height + c10_23.height + 50
        start_y = (H - total_h) // 2
        s10.paste(head10, ((W - head10.width)//2, start_y))
        s10.paste(c10_1, ((W - c10_1.width)//2, start_y + head10.height + 30))
        s10.paste(c10_23, ((W - c10_23.width)//2, start_y + head10.height + 30 + c10_1.height + 20))
        s10.save(os.path.join(TEMP_SLIDES_DIR, "slide_10.png"))
        
    # Slide 11: Bedtime & Alarms (Screenshot 701)
    make_slide(crop_standard("Screenshot (701).png")).save(os.path.join(TEMP_SLIDES_DIR, "slide_11.png"))
    
    # Slide 12: How It All Works Together (Screenshot 702 + 703)
    with Image.open(os.path.join(PICS_DIR, "Screenshot (702).png")) as img702, \
         Image.open(os.path.join(PICS_DIR, "Screenshot (703).png")) as img703:
        header12 = img702.crop((30, 62, 994, 230))
        c01 = img702.crop((30, 245, 994, 460))
        c02 = img702.crop((30, 470, 994, 685))
        c03 = img703.crop((30, 140, 994, 360))
        c04 = img703.crop((30, 380, 994, 600))
        banner12 = img703.crop((30, 610, 994, 695))

        s12 = Image.new('RGB', (W, H), color=BG)
        s12.paste(header12, ((W - header12.width)//2, 35))

        target_cw = 690
        target_ch = int(c01.height * (target_cw / c01.width))
        c01_s = c01.resize((target_cw, target_ch), Image.Resampling.LANCZOS)
        c02_s = c02.resize((target_cw, target_ch), Image.Resampling.LANCZOS)
        c03_s = c03.resize((target_cw, target_ch), Image.Resampling.LANCZOS)
        c04_s = c04.resize((target_cw, target_ch), Image.Resampling.LANCZOS)

        gap_x = 40
        start_x = (W - (target_cw * 2 + gap_x)) // 2
        row1_y = 225
        s12.paste(c01_s, (start_x, row1_y))
        s12.paste(c02_s, (start_x + target_cw + gap_x, row1_y))

        row2_y = row1_y + target_ch + 20
        s12.paste(c03_s, (start_x, row2_y))
        s12.paste(c04_s, (start_x + target_cw + gap_x, row2_y))

        s12.paste(banner12, ((W - banner12.width)//2, row2_y + target_ch + 30))
        s12.save(os.path.join(TEMP_SLIDES_DIR, "slide_12.png"))
        
    # Slide 13: Conclusion (Screenshot 704)
    with Image.open(os.path.join(PICS_DIR, "Screenshot (704).png")) as img704:
        top13 = img704.crop((30, 62, 994, 520))
        quote13 = img704.crop((150, 625, 850, 665))
        s13 = Image.new('RGB', (W, H), color=BG)
        total_h = top13.height + quote13.height + 40
        start_y = (H - total_h) // 2
        s13.paste(top13, ((W - top13.width)//2, start_y))
        s13.paste(quote13, ((W - quote13.width)//2, start_y + top13.height + 40))
        s13.save(os.path.join(TEMP_SLIDES_DIR, "slide_13.png"))

def create_deck():
    build_all_slides()
    
    prs = Presentation()
    prs.slide_width = Inches(13.333333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    for i in range(1, 14):
        slide_file = os.path.join(TEMP_SLIDES_DIR, f"slide_{i:02d}.png")
        if not os.path.exists(slide_file):
            continue
        slide = prs.slides.add_slide(blank_layout)
        slide.shapes.add_picture(slide_file, 0, 0, width=prs.slide_width, height=prs.slide_height)

        # Native PowerPoint fade transition animation
        transition_xml = parse_xml(
            '<p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" spd="med">'
            '<p:fade/>'
            '</p:transition>'
        )
        slide._element.append(transition_xml)

    # Save to both standard PPTX and Full-Screen Show PPSX
    for fname in ["Productometer_Presentation_v2.pptx", "Productometer_Presentation_v2.ppsx", "Productometer_Presentation.ppsx"]:
        p = os.path.join(PRES_DIR, fname)
        try:
            prs.save(p)
            print(f"Saved: {p} ({os.path.getsize(p)} bytes)")
        except Exception as e:
            print(f"Notice: {fname} lock status: {e}")

    try:
        orig = os.path.join(PRES_DIR, "Productometer_Presentation.pptx")
        prs.save(orig)
        print(f"Saved: {orig}")
    except Exception as e:
        print(f"Notice: Productometer_Presentation.pptx in use by PowerPoint. Access through v2: {e}")

if __name__ == "__main__":
    create_deck()
