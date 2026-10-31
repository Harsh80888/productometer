"""
=============================================================================
PRODUCTOMETER HEALTH TRACKER - AUTOMATED EXERCISE ADDER & ANIMATION MANAGER
=============================================================================
Usage:
  1. Auto-search & import from 1,324 exercises database:
     python auto_add_exercise.py "dumbbell lateral raise"
     python auto_add_exercise.py "barbell deadlift"

  2. Import any custom local GIF:
     python auto_add_exercise.py --file my_file.gif --id my_exercise --title "My Exercise" --category arms
=============================================================================
"""

import sys
import os
import re
import json
import urllib.request
import argparse
from PIL import Image, ImageSequence
import numpy as np

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')
SCRIPTS_JS = os.path.join(BASE_DIR, 'health-scripts.js')
DATASET_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json"
MEDIA_BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/"

CATEGORY_MAP = {
    'chest': 'chest',
    'back': 'back',
    'upper legs': 'legs',
    'lower legs': 'legs',
    'legs': 'legs',
    'waist': 'core',
    'core': 'core',
    'upper arms': 'arms',
    'lower arms': 'arms',
    'arms': 'arms',
    'shoulders': 'arms',
    'cardio': 'cardio',
    'neck': 'back'
}

def save_original_white_gif(src_path, dst_path):
    """Saves GIF with crisp original studio white background."""
    print(f"[*] Saving original white animation for {os.path.basename(dst_path)}...")
    import shutil
    shutil.copyfile(src_path, dst_path)
    print(f"[✓] Saved original white animation: {dst_path}")

def append_to_health_scripts(entry):
    """Appends the exercise entry to exerciseCatalog in health-scripts.js if not already present."""
    if not os.path.exists(SCRIPTS_JS):
        print(f"[!] Could not find {SCRIPTS_JS}")
        return False
        
    with open(SCRIPTS_JS, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if f"id: '{entry['id']}'" in content or f'id: "{entry["id"]}"' in content:
        print(f"[!] Exercise '{entry['id']}' already exists in health-scripts.js catalog.")
        return False
        
    # Format entry as JavaScript object
    cues_str = ",\n".join([f"                {json.dumps(cue)}" for cue in entry['formCues']])
    entry_code = f"""        {{
            id: {json.dumps(entry['id'])},
            title: {json.dumps(entry['title'])},
            category: {json.dumps(entry['category'])},
            focus: {json.dumps(entry['focus'])},
            primaryMuscle: {json.dumps(entry['primaryMuscle'])},
            secondaryMuscle: {json.dumps(entry['secondaryMuscle'])},
            difficulty: {json.dumps(entry['difficulty'])},
            repsDefault: {json.dumps(entry['repsDefault'])},
            animationSrc: {json.dumps(entry['animationSrc'])},
            formCues: [
{cues_str}
            ]
        }},"""

    # Inject right after 'const exerciseCatalog = ['
    target = 'const exerciseCatalog = ['
    if target in content:
        idx = content.find(target) + len(target)
        new_content = content[:idx] + "\n" + entry_code + content[idx:]
        with open(SCRIPTS_JS, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"[✓] Successfully injected '{entry['title']}' into health-scripts.js!")
        return True
    else:
        print("[!] Target marker 'const exerciseCatalog = [' not found in health-scripts.js")
        return False

def search_and_add_from_dataset(query):
    print(f"[*] Fetching database index for '{query}'...")
    req = urllib.request.Request(DATASET_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        dataset = json.loads(resp.read().decode('utf-8'))
        
    query_lower = query.strip().lower()
    matches = [e for e in dataset if query_lower in e['name'].lower()]
    
    if not matches:
        # Try word-by-word matching
        words = query_lower.split()
        matches = [e for e in dataset if all(w in e['name'].lower() for w in words)]
        
    if not matches:
        print(f"[!] No exercise found matching '{query}'. Try broader terms like 'press', 'squat', 'curl', 'row'.")
        return

    best = matches[0]
    print(f"[✓] Found match: '{best['name']}' (Category: {best['category']}, Target: {best['target']})")
    
    gif_rel = best.get('gif_url')
    if not gif_rel:
        print("[!] No animation GIF URL for this exercise.")
        return
        
    gif_full_url = MEDIA_BASE + gif_rel
    safe_id = re.sub(r'[^a-z0-9_]', '_', best['name'].lower().strip().replace(' ', '_'))
    temp_gif = os.path.join(ASSETS_DIR, f"temp_{safe_id}.gif")
    final_gif = os.path.join(ASSETS_DIR, f"{safe_id}.gif")
    
    print(f"[*] Downloading 3D animation from: {gif_full_url}...")
    urllib.request.urlretrieve(gif_full_url, temp_gif)
    
    save_original_white_gif(temp_gif, final_gif)
    if os.path.exists(temp_gif):
        os.remove(temp_gif)
        
    # Map category
    cat = CATEGORY_MAP.get(best.get('body_part', '').lower(), 'arms')
    target = best.get('target', 'Muscles').title()
    sec = ", ".join(best.get('secondary_muscles', [])).title() or 'Stabilizers'
    cues = best.get('instruction_steps', {}).get('en', [])
    if not cues and 'instructions' in best and 'en' in best['instructions']:
        cues = [s.strip() for s in best['instructions']['en'].split('. ') if s.strip()]

    entry = {
        'id': safe_id,
        'title': best['name'].title(),
        'category': cat,
        'focus': f"{target}, {sec}",
        'primaryMuscle': target,
        'secondaryMuscle': sec,
        'difficulty': 'Intermediate',
        'repsDefault': '3 sets × 12 reps',
        'animationSrc': f"./assets/{safe_id}.gif",
        'formCues': cues[:4] if cues else ['Maintain proper biomechanical posture throughout movement.']
    }
    
    append_to_health_scripts(entry)
    print(f"\n[DONE] Successfully added '{entry['title']}'! Refresh your browser to see it in the library.")

def main():
    parser = argparse.ArgumentParser(description="Automate adding 3D animated exercises with solid black backgrounds.")
    parser.add_argument("query", nargs="?", help="Exercise name to auto-search and import (e.g. 'lateral raise', 'deadlift')")
    parser.add_argument("--file", help="Path to a custom local GIF file to convert")
    parser.add_argument("--id", help="Unique ID for custom exercise")
    parser.add_argument("--title", help="Title for custom exercise")
    parser.add_argument("--category", default="arms", help="Category (chest, back, legs, core, arms, cardio)")
    
    args = parser.parse_args()
    
    if args.file:
        if not os.path.exists(args.file):
            print(f"[!] File not found: {args.file}")
            return
        safe_id = args.id or os.path.splitext(os.path.basename(args.file))[0]
        final_gif = os.path.join(ASSETS_DIR, f"{safe_id}.gif")
        convert_gif_to_black(args.file, final_gif)
        title = args.title or safe_id.replace('_', ' ').title()
        entry = {
            'id': safe_id,
            'title': title,
            'category': args.category,
            'focus': f"{title} targets",
            'primaryMuscle': f"{title} Primary",
            'secondaryMuscle': 'Core & Stabilizers',
            'difficulty': 'Beginner / Intermediate',
            'repsDefault': '3 sets × 12 reps',
            'animationSrc': f"./assets/{safe_id}.gif",
            'formCues': [
                'Perform movement with deliberate cadence and controlled eccentric descent.',
                'Maintain neutral spine and breathe out during the contraction phase.'
            ]
        }
        append_to_health_scripts(entry)
    elif args.query:
        search_and_add_from_dataset(args.query)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
