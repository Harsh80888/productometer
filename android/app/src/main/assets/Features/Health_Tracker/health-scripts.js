/* ==========================================================================
   🌿 PRODUCTOMETER PORTAL - HEALTH TRACKER CONTROLLER SCRIPT
   - Biometrics & BMI calculation & persistence
   - Day Planner sync for today's health sessions
   - Exercise routine & All Exercises library
   - 3D Anatomical Muscle Motion Graphics (Full 3D Loop - NO Video Player Chrome)
   - Active time & MET-based calorie burn calculator
   - 7-day Weekly Split Scheduler
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. EXERCISE MASTER REGISTRY (3D ANATOMICAL MOTION & TARGET MUSCLES)
    // ==========================================================================
    const exerciseCatalog = [
        {
            id: "barbell_bench_press",
            title: "Barbell Bench Press",
            category: "chest",
            focus: "Pectoralis Major, Anterior Deltoids, Triceps",
            primaryMuscle: "Pectoralis Major (Mid/Lower)",
            secondaryMuscle: "Triceps Brachii, Anterior Deltoids",
            difficulty: "Intermediate",
            repsDefault: "4 sets \u00d7 8-10 reps",
            animationSrc: "./assets/barbell_bench_press.gif",
            formCues: [
                "Plant feet flat on the floor and maintain a natural arch in your lower back.",
                "Retract and depress your scapulae to create a stable pressing platform.",
                "Lower the barbell with control to your mid-chest line.",
                "Drive through the heels and press upward until arms extend, keeping shoulders pinned."
            ]
        },
        {
            id: "incline_dumbbell_press",
            title: "Incline Dumbbell Press",
            category: "chest",
            focus: "Clavicular Upper Pectoralis, Anterior Delts",
            primaryMuscle: "Upper Pectoralis Major",
            secondaryMuscle: "Anterior Deltoids, Triceps",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/incline_dumbbell_press.gif",
            formCues: [
                "Set the bench at a 30 to 45 degree angle to emphasize upper chest fibers.",
                "Lower dumbbells laterally until you feel a deep stretch across upper pectorals.",
                "Press upward converging dumbbells toward centerline without clanking weights.",
                "Maintain engaged core and keep wrists stacked over elbows throughout."
            ]
        },
        {
            id: "decline_barbell_bench_press",
            title: "Decline Barbell Bench Press",
            category: "chest",
            focus: "Sternal Lower Pectoralis, Triceps",
            primaryMuscle: "Lower Pectoralis Major",
            secondaryMuscle: "Triceps, Core Stabilizers",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/decline_barbell_bench_press.gif",
            formCues: [
                "Secure your legs firmly into the decline bench pads.",
                "Unrack the bar directly over lower chest with arms straight.",
                "Lower smoothly to the lower chest / xiphoid process area.",
                "Drive the barbell back up vertically while locking the torso into the pad."
            ]
        },
        {
            id: "pushups",
            title: "Standard Push-ups",
            category: "chest",
            focus: "Pectoralis Major, Triceps, Anterior Deltoids, Core",
            primaryMuscle: "Pectoralis Major",
            secondaryMuscle: "Triceps, Core Abdominals, Anterior Delts",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 15-20 reps",
            animationSrc: "./assets/pushups.gif",
            formCues: [
                "Maintain a rigid straight plank line from head through hips down to heels.",
                "Tuck elbows at a 45-degree angle to protect glenohumeral shoulder joints.",
                "Descend until chest is 1-2 inches off the ground.",
                "Exhale and push the floor away powerfully to full elbow extension."
            ]
        },
        {
            id: "diamond_pushups",
            title: "Diamond Push-ups",
            category: "chest",
            focus: "Inner Pectoralis, Triceps Brachii Medial/Lateral Head",
            primaryMuscle: "Triceps Brachii",
            secondaryMuscle: "Inner Chest, Anterior Deltoids",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 12-15 reps",
            animationSrc: "./assets/diamond_pushups.gif",
            formCues: [
                "Place index fingers and thumbs together under sternum creating a diamond shape.",
                "Keep elbows tracking close to the ribcage as you lower downward.",
                "Lower chest close to touch hands while bracing glutes and abdominals.",
                "Press back up focusing maximum force output into the triceps."
            ]
        },
        {
            id: "chest_dips",
            title: "Chest Dips",
            category: "chest",
            focus: "Lower Pectorals, Anterior Deltoids, Triceps",
            primaryMuscle: "Lower Chest",
            secondaryMuscle: "Triceps Brachii, Anterior Deltoids",
            difficulty: "Advanced",
            repsDefault: "3 sets \u00d7 8-12 reps",
            animationSrc: "./assets/chest_dips.gif",
            formCues: [
                "Lean your torso forward 20-30 degrees to bias chest rather than triceps.",
                "Lower until your upper arms are roughly parallel to the parallel bars.",
                "Do not allow shoulders to roll forward or shrug toward ears at the bottom.",
                "Drive up through the palms, flexing lower pectorals at the lockout."
            ]
        },
        {
            id: "cable_crossover",
            title: "Cable Chest Crossovers",
            category: "chest",
            focus: "Sternal Squeeze, Sternal Pectoralis Major",
            primaryMuscle: "Pectoralis Major",
            secondaryMuscle: "Anterior Deltoids, Biceps Short Head",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 12-15 reps",
            animationSrc: "./assets/cable_crossover.gif",
            formCues: [
                "Set pulleys high, step forward into a staggered stance with slight forward lean.",
                "Keep a slight fixed bend in elbows as arms sweep forward in an arc.",
                "Bring hands together at waist level, squeezing pecs intensely for 1 second.",
                "Return under constant cable tension feeling deep horizontal abduction stretch."
            ]
        },
        {
            id: "dumbbell_fly",
            title: "Dumbbell Chest Fly",
            category: "chest",
            focus: "Chest Outer Fibers, Pectoralis Hypertrophy Stretch",
            primaryMuscle: "Pectoralis Major",
            secondaryMuscle: "Anterior Deltoid, Biceps Brachii",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12 reps",
            animationSrc: "./assets/dumbbell_fly.gif",
            formCues: [
                "Lie flat on the bench with arms holding dumbbells directly above chest.",
                "Maintain a fixed soft bend at the elbow joints as arms open laterally.",
                "Descend until dumbbells are level with chest, feeling strong pec elongation.",
                "Contract chest to pull weights back up along the same sweeping circular trajectory."
            ]
        },
        {
            id: "barbell_deadlift",
            title: "Barbell Conventional Deadlift",
            category: "back",
            focus: "Erector Spinae, Latissimus Dorsi, Gluteus, Hamstrings",
            primaryMuscle: "Erector Spinae & Gluteus Maximus",
            secondaryMuscle: "Hamstrings, Latissimus Dorsi, Trapezius, Forearms",
            difficulty: "Advanced",
            repsDefault: "4 sets \u00d7 5 reps",
            animationSrc: "./assets/barbell_deadlift.gif",
            formCues: [
                "Barbell over mid-foot; hinge at hips and grip bar just outside knees.",
                "Pull slack out of the bar, pull chest tall, and brace core like taking a punch.",
                "Drive the floor away with legs while keeping the bar in contact with shins/thighs.",
                "Lock out standing tall by squeezing glutes; do not hyperextend lower spine."
            ]
        },
        {
            id: "pullups",
            title: "Overhand Pull-ups",
            category: "back",
            focus: "Latissimus Dorsi, Rhomboids, Biceps Brachii, Mid-Traps",
            primaryMuscle: "Latissimus Dorsi",
            secondaryMuscle: "Biceps Brachii, Rhomboids, Teres Major",
            difficulty: "Intermediate / Advanced",
            repsDefault: "3 sets \u00d7 8-10 reps",
            animationSrc: "./assets/pullups.gif",
            formCues: [
                "Take a shoulder-width pronated grip; initiate movement by depressing scapulae.",
                "Drive elbows down and back toward your back pockets.",
                "Pull until chin clears the bar with zero swinging or kicking momentum.",
                "Lower with complete control to a full dead hang before starting the next rep."
            ]
        },
        {
            id: "lat_pulldown",
            title: "Wide-Grip Lat Pulldown",
            category: "back",
            focus: "Latissimus Dorsi, Teres Major, Biceps",
            primaryMuscle: "Latissimus Dorsi",
            secondaryMuscle: "Biceps Brachii, Posterior Deltoid, Mid-Trapezius",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/lat_pulldown.gif",
            formCues: [
                "Anchor thighs firmly beneath roller pads and maintain slight backward torso lean.",
                "Pull bar down smoothly toward upper sternum by leading with elbows.",
                "Hold peak contraction for a split second, retracting shoulder blades.",
                "Resist cable weight smoothly on return to allow lats to fully stretch at top."
            ]
        },
        {
            id: "seated_cable_row",
            title: "Seated Cable Row",
            category: "back",
            focus: "Mid-Trapezius, Rhomboids, Lats, Erector Spinae",
            primaryMuscle: "Rhomboids & Mid-Trapezius",
            secondaryMuscle: "Latissimus Dorsi, Biceps, Posterior Deltoids",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 12 reps",
            animationSrc: "./assets/seated_cable_row.gif",
            formCues: [
                "Sit with knees slightly bent and torso perpendicular to seat bench.",
                "Initiate row by pulling shoulder blades back together before bending elbows.",
                "Pull attachment straight into upper abdomen / lower ribcage.",
                "Avoid excessive rocking or swinging of lower back throughout set."
            ]
        },
        {
            id: "bent_over_barbell_row",
            title: "Bent-Over Barbell Row",
            category: "back",
            focus: "Latissimus Dorsi, Posterior Deltoid, Trapezius, Core",
            primaryMuscle: "Latissimus Dorsi & Rhomboids",
            secondaryMuscle: "Erector Spinae, Hamstrings, Biceps",
            difficulty: "Intermediate / Advanced",
            repsDefault: "4 sets \u00d7 8-10 reps",
            animationSrc: "./assets/bent_over_barbell_row.gif",
            formCues: [
                "Hinge at hips at 45 to 60 degrees with flat spine and engaged core.",
                "Pull barbell toward belly button keeping elbows tucked close to sides.",
                "Squeeze shoulder blades hard at top of contraction.",
                "Lower barbell under control without losing lumbar spine neutrality."
            ]
        },
        {
            id: "single_arm_dumbbell_row",
            title: "Single-Arm Dumbbell Row",
            category: "back",
            focus: "Latissimus Dorsi Unilateral Isolation, Core Anti-Rotation",
            primaryMuscle: "Latissimus Dorsi",
            secondaryMuscle: "Rhomboids, Biceps, Rear Deltoids, Obliques",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 10 reps per side",
            animationSrc: "./assets/single_arm_dumbbell_row.gif",
            formCues: [
                "Place one knee and hand on flat bench; back remains parallel to the floor.",
                "Reach dumbbell toward floor at bottom for lat pre-stretch.",
                "Drive elbow upward in a curved arc toward hip pocket.",
                "Keep torso square to prevent body twisting or momentum jerk."
            ]
        },
        {
            id: "inverted_rows",
            title: "Inverted Horizontal Rows",
            category: "back",
            focus: "Upper Back, Rhomboids, Posterior Delts, Core",
            primaryMuscle: "Upper Back / Scapular Retractors",
            secondaryMuscle: "Biceps, Forearms, Gluteal Bracing",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/inverted_rows.gif",
            formCues: [
                "Grip bar slightly wider than shoulder width under a Smith machine or racked bar.",
                "Brace core and glutes so body forms a straight rigid bridge.",
                "Pull sternum up to touch bar by driving elbows behind body.",
                "Control descent until arms are completely straight."
            ]
        },
        {
            id: "t_bar_row",
            title: "T-Bar Supported Row",
            category: "back",
            focus: "Middle Back Thickness, Rhomboids, Latissimus Dorsi",
            primaryMuscle: "Rhomboids & Lats",
            secondaryMuscle: "Trapezius, Biceps, Posterior Deltoid",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/t_bar_row.gif",
            formCues: [
                "Straddle bar with feet shoulder-width and grip handles firmly.",
                "Maintain neutral spinal alignment with chest elevated 45 degrees.",
                "Pull weight into upper abdomen, pinching shoulder blades tight.",
                "Lower weight smoothly without rounding cervical or lumbar spine."
            ]
        },
        {
            id: "hyperextensions",
            title: "Hyperextensions / Back Extensions",
            category: "back",
            focus: "Lower Back Erector Spinae, Gluteus, Hamstrings",
            primaryMuscle: "Erector Spinae",
            secondaryMuscle: "Gluteus Maximus, Biceps Femoris",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12-15 reps",
            animationSrc: "./assets/hyperextensions.gif",
            formCues: [
                "Position hips just over edge of pad so hip flexors can hinge freely.",
                "Cross arms over chest or place fingertips behind ears.",
                "Lower upper body forward until hamstrings feel stretch.",
                "Extend back upward until body aligns straight; do not violently arch backward."
            ]
        },
        {
            id: "barbell_squat",
            title: "Barbell Back Squat",
            category: "legs",
            focus: "Quadriceps Femoris, Gluteus Maximus, Adductor Magnus",
            primaryMuscle: "Quadriceps & Gluteus Maximus",
            secondaryMuscle: "Hamstrings, Abdominal Core, Erector Spinae",
            difficulty: "Intermediate / Advanced",
            repsDefault: "4 sets \u00d7 8 reps",
            animationSrc: "./assets/barbell_squat.gif",
            formCues: [
                "Rest barbell across upper traps; feet shoulder-width with toes flared 15-30\u00b0.",
                "Brace core with diaphragmatic 360-degree breath before starting descent.",
                "Break simultaneously at hips and knees, sitting down between heels.",
                "Reach hip crease below parallel, then drive floor away to full hip extension."
            ]
        },
        {
            id: "bodyweight_squats",
            title: "Bodyweight Air Squats",
            category: "legs",
            focus: "Quadriceps, Glutes, Hip Mobility & Core",
            primaryMuscle: "Quadriceps",
            secondaryMuscle: "Gluteus, Calves, Hip Flexors",
            difficulty: "Beginner",
            repsDefault: "3 sets \u00d7 20 reps",
            animationSrc: "./assets/bodyweight_squats.gif",
            formCues: [
                "Stand with feet shoulder-width apart, arms extended in front for balance.",
                "Sit back and down as if lowering into a chair, keeping heels glued to floor.",
                "Descend until thighs are parallel to ground while keeping torso upright.",
                "Press through midfoot to stand tall, squeezing glutes at the peak."
            ]
        },
        {
            id: "bulgarian_split_squat",
            title: "Bulgarian Split Squats",
            category: "legs",
            focus: "Quadriceps, Gluteus Medius/Maximus, Core Stability",
            primaryMuscle: "Quadriceps & Gluteus Maximus",
            secondaryMuscle: "Hamstrings, Calves, Core Stabilizers",
            difficulty: "Intermediate / Advanced",
            repsDefault: "3 sets \u00d7 10 reps per leg",
            animationSrc: "./assets/bulgarian_split_squat.gif",
            formCues: [
                "Elevate rear foot on bench behind you; step lead foot forward.",
                "Descend until back knee hovers 1 inch off the ground.",
                "Keep front knee tracking in line with second toe, torso leaning slightly forward.",
                "Drive through front heel to ascend smoothly without bouncing."
            ]
        },
        {
            id: "romanian_deadlift",
            title: "Romanian Deadlift (RDL)",
            category: "legs",
            focus: "Hamstrings, Gluteus Maximus, Posterior Chain",
            primaryMuscle: "Hamstrings (Biceps Femoris/Semitendinosus)",
            secondaryMuscle: "Gluteus Maximus, Erector Spinae",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/romanian_deadlift.gif",
            formCues: [
                "Maintain a slight knee unlock; hinge backward by sending hips to the back wall.",
                "Glide barbell or dumbbells down shins while keeping spine straight and chest high.",
                "Descend until hamstrings reach end of active stretch (usually just below knees).",
                "Squeeze glutes and thrust hips forward to return to standing lockout."
            ]
        },
        {
            id: "leg_press",
            title: "45-Degree Sled Leg Press",
            category: "legs",
            focus: "Quadriceps, Glutes, Adductors",
            primaryMuscle: "Quadriceps Femoris",
            secondaryMuscle: "Gluteus Maximus, Hamstrings",
            difficulty: "Intermediate",
            repsDefault: "4 sets \u00d7 10-12 reps",
            animationSrc: "./assets/leg_press.gif",
            formCues: [
                "Place feet shoulder-width on center platform; keep lower back glued to seat pad.",
                "Release safety pins and lower sled until knees reach a 90-degree angle.",
                "Never allow lower pelvis or tailbone to lift off pad at bottom.",
                "Press through whole foot to extend knees, stopping just short of hyperextension lockout."
            ]
        },
        {
            id: "leg_extensions",
            title: "Seated Leg Extensions",
            category: "legs",
            focus: "Quadriceps Isolation (Rectus Femoris, Vastus Lateralis/Medialis)",
            primaryMuscle: "Quadriceps Femoris",
            secondaryMuscle: "Patellar Tendon Conditioning",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12-15 reps",
            animationSrc: "./assets/leg_extensions.gif",
            formCues: [
                "Align knee joint pivot with machine axis; pad rests over lower shins above ankles.",
                "Extend knees upward smoothly to full extension, flexing quads hard at the top.",
                "Pause 1 second at full contraction.",
                "Lower weight smoothly over 2-3 seconds resisting gravity."
            ]
        },
        {
            id: "lying_leg_curl",
            title: "Lying Hamstring Leg Curls",
            category: "legs",
            focus: "Hamstrings (Biceps Femoris, Semitendinosus, Semimembranosus)",
            primaryMuscle: "Hamstrings",
            secondaryMuscle: "Gastrocnemius (Calves)",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12 reps",
            animationSrc: "./assets/lying_leg_curl.gif",
            formCues: [
                "Lie facedown with pad resting on lower calf just below gastrocnemius.",
                "Keep hips firmly pressed against pad to prevent lower back arching.",
                "Curl heels toward glutes as far as possible, squeezing hamstrings at peak.",
                "Lower weight with controlled tempo to full extension."
            ]
        },
        {
            id: "walking_lunges",
            title: "Dumbbell Walking Lunges",
            category: "legs",
            focus: "Quadriceps, Gluteus Maximus, Balance & Unilateral Strength",
            primaryMuscle: "Quadriceps & Gluteus Maximus",
            secondaryMuscle: "Hamstrings, Calves, Core",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 12 steps per leg",
            animationSrc: "./assets/walking_lunges.gif",
            formCues: [
                "Hold dumbbells at sides; take a controlled stride forward.",
                "Lower hips until both knees bend to approximately 90 degrees.",
                "Drive through front heel and step straight through into the next forward lunge.",
                "Keep torso upright and shoulders pulled down throughout."
            ]
        },
        {
            id: "standing_calf_raise",
            title: "Standing Calf Raises",
            category: "legs",
            focus: "Gastrocnemius & Soleus Calf Hypertrophy",
            primaryMuscle: "Gastrocnemius",
            secondaryMuscle: "Soleus, Plantaris, Achilles Tendon",
            difficulty: "Beginner",
            repsDefault: "4 sets \u00d7 15-20 reps",
            animationSrc: "./assets/standing_calf_raise.gif",
            formCues: [
                "Place balls of feet on elevated block with heels hanging off edge.",
                "Lower heels deep for a full 2-second Achilles stretch.",
                "Drive up explosively onto tiptoes onto first and second metatarsals.",
                "Squeeze calf peak hard for a full 1-second pause at top."
            ]
        },
        {
            id: "hip_thrust",
            title: "Barbell Glute Hip Thrust",
            category: "legs",
            focus: "Gluteus Maximus Terminal Hip Extension, Hamstrings",
            primaryMuscle: "Gluteus Maximus",
            secondaryMuscle: "Hamstrings, Adductor Magnus, Abdominals",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/hip_thrust.gif",
            formCues: [
                "Rest upper back against bench with padded bar placed across hip crease.",
                "Feet planted hip-width so shins become vertical at top of thrust.",
                "Drive through heels, locking hips out until body is parallel from knees to shoulders.",
                "Tuck chin and look forward; hold top contraction for 1 count."
            ]
        },
        {
            id: "goblet_squat",
            title: "Dumbbell Goblet Squat",
            category: "legs",
            focus: "Quadriceps, Hip Mobility, Anterior Core",
            primaryMuscle: "Quadriceps",
            secondaryMuscle: "Gluteus Maximus, Core Abdominals",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12 reps",
            animationSrc: "./assets/goblet_squat.gif",
            formCues: [
                "Hold dumbbell vertically against chest with both palms cupping top weight bell.",
                "Squat down between knees, keeping chest high and elbows inside knees.",
                "Descend until elbows gently touch inside of knees.",
                "Drive back up through midfoot to full standing upright position."
            ]
        },
        {
            id: "bicep_curls",
            title: "Standing Dumbbell Bicep Curls",
            category: "arms",
            focus: "Biceps Brachii (Short & Long Head), Brachialis",
            primaryMuscle: "Biceps Brachii",
            secondaryMuscle: "Brachioradialis, Anterior Deltoids",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12 reps",
            animationSrc: "./assets/bicep_curls.gif",
            formCues: [
                "Pin elbows tight against ribcage and stand tall with chest proud.",
                "Supinate wrists as you curl upward so palms face ceiling at peak.",
                "Squeeze biceps maximally at top without letting elbows drift forward.",
                "Lower dumbbells slowly over 2-3 seconds to full elbow extension."
            ]
        },
        {
            id: "hammer_curls",
            title: "Neutral Grip Hammer Curls",
            category: "arms",
            focus: "Brachialis & Brachioradialis Forearm Thickness",
            primaryMuscle: "Brachialis & Brachioradialis",
            secondaryMuscle: "Biceps Brachii Long Head",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/hammer_curls.gif",
            formCues: [
                "Keep palms facing each other throughout entire range of motion.",
                "Curl dumbbells upward along an angle towards center of chest.",
                "Isolate movement solely at elbow joint with zero torso swaying.",
                "Control negative descent, maintaining solid wrist rigidity."
            ]
        },
        {
            id: "preacher_curls",
            title: "Preacher Bicep Curls",
            category: "arms",
            focus: "Biceps Brachii Short Head Isolation, Strict Elimination of Momentum",
            primaryMuscle: "Biceps Brachii (Short Head)",
            secondaryMuscle: "Brachialis, Forearm Flexors",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/preacher_curls.gif",
            formCues: [
                "Rest armpits firmly over top lip of angled preacher bench pad.",
                "Lower weight until arms are almost fully extended, feeling deep stretch.",
                "Curl bar or dumbbell upward toward face using pure bicep torque.",
                "Never snap or bounce weight out of bottom position."
            ]
        },
        {
            id: "concentration_curls",
            title: "Isolated Concentration Curls",
            category: "arms",
            focus: "Biceps Peak Contraction, Strict Peak Hypertrophy",
            primaryMuscle: "Biceps Brachii (Long Head)",
            secondaryMuscle: "Brachialis",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12 reps per arm",
            animationSrc: "./assets/concentration_curls.gif",
            formCues: [
                "Sit on bench and brace back of upper arm against inside of thigh.",
                "Curl dumbbell upward toward shoulder without moving leg.",
                "Pause at top for 1 full second squeezing bicep peak.",
                "Lower weight smoothly until arm is completely extended."
            ]
        },
        {
            id: "overhead_press",
            title: "Standing Overhead Shoulder Press",
            category: "arms",
            focus: "Anterior & Lateral Deltoids, Triceps, Trapezius",
            primaryMuscle: "Deltoids (Anterior & Lateral)",
            secondaryMuscle: "Triceps Brachii, Upper Trapezius, Core",
            difficulty: "Intermediate / Advanced",
            repsDefault: "4 sets \u00d7 8-10 reps",
            animationSrc: "./assets/overhead_press.gif",
            formCues: [
                "Hold weights at collarbone level with elbows positioned directly under wrists.",
                "Squeeze glutes and brace abdominals to create a solid column.",
                "Press vertically overhead, locking arms out directly above ears.",
                "Lower under control back to front shoulder shelf."
            ]
        },
        {
            id: "lateral_raises",
            title: "Dumbbell Lateral Delt Raises",
            category: "arms",
            focus: "Lateral Deltoids (Shoulder Width & V-Taper)",
            primaryMuscle: "Lateral Deltoid",
            secondaryMuscle: "Supraspinatus, Upper Trapezius",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12-15 reps",
            animationSrc: "./assets/lateral_raises.gif",
            formCues: [
                "Lean slightly forward with a tiny bend in elbows.",
                "Raise arms laterally leading with elbows until parallel to the floor.",
                "Pour imaginary pitchers at peak (pinkies slightly higher than thumbs).",
                "Lower slowly resisting gravity, avoiding swinging with hips."
            ]
        },
        {
            id: "tricep_pushdown",
            title: "Cable Triceps Rope Pushdown",
            category: "arms",
            focus: "Triceps Lateral & Medial Head Isolation",
            primaryMuscle: "Triceps Brachii",
            secondaryMuscle: "Anconeus, Forearm Extensors",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 12-15 reps",
            animationSrc: "./assets/tricep_pushdown.gif",
            formCues: [
                "Keep elbows locked against sides of ribcage throughout the set.",
                "Push rope attachment straight down toward thighs.",
                "Spread rope ends apart at bottom for intense lateral head contraction.",
                "Return handle to chest level without letting elbows swing forward."
            ]
        },
        {
            id: "bench_dips",
            title: "Bench Triceps Dips",
            category: "arms",
            focus: "Triceps Brachii Extension, Anterior Deltoids",
            primaryMuscle: "Triceps Brachii",
            secondaryMuscle: "Anterior Deltoids, Pectoralis Minor",
            difficulty: "Beginner",
            repsDefault: "3 sets \u00d7 15 reps",
            animationSrc: "./assets/bench_dips.gif",
            formCues: [
                "Grip edge of bench with hands next to hips; extend legs forward.",
                "Lower body by bending elbows until upper arms reach parallel.",
                "Keep back skimming close to bench to protect shoulder caps.",
                "Press through palms to full elbow lockout, flexing triceps at top."
            ]
        },
        {
            id: "skull_crushers",
            title: "Barbell Skull Crushers",
            category: "arms",
            focus: "Triceps Long Head & Medial Head Extension",
            primaryMuscle: "Triceps Brachii (Long Head)",
            secondaryMuscle: "Anconeus",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/skull_crushers.gif",
            formCues: [
                "Lie flat on bench holding EZ-curl bar directly above shoulders with arms vertical.",
                "Keep upper arms angled slightly backward past vertical to maintain tension.",
                "Bend only at elbows, lowering bar toward forehead or crown of head.",
                "Extend forearms back to starting position squeezing triceps hard."
            ]
        },
        {
            id: "overhead_tricep_extension",
            title: "Overhead Barbell Triceps Extension",
            category: "arms",
            focus: "Triceps Long Head Deep Stretch",
            primaryMuscle: "Triceps Brachii (Long Head)",
            secondaryMuscle: "Core Abdominals, Forearms",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 12 reps",
            animationSrc: "./assets/overhead_tricep_extension.gif",
            formCues: [
                "Hold weight directly overhead with arms fully extended.",
                "Keep upper arms pointed vertical alongside ears.",
                "Lower weight behind head until forearms compress against biceps.",
                "Press weight back overhead to full lockout without flaring elbows."
            ]
        },
        {
            id: "rear_delt_fly",
            title: "Cable Rope Rear Delt High Row",
            category: "arms",
            focus: "Posterior Deltoids, Rhomboids, External Rotators",
            primaryMuscle: "Posterior Deltoids",
            secondaryMuscle: "Infraspinatus, Teres Minor, Trapezius",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 15 reps",
            animationSrc: "./assets/rear_delt_fly.gif",
            formCues: [
                "Set cable at eye level with rope attachment; step back for tension.",
                "Pull rope towards face, pulling hands apart and leading with elbows high.",
                "Squeeze rear shoulders and shoulder blades at peak contraction.",
                "Return slowly to starting position under continuous cable tension."
            ]
        },
        {
            id: "plank_hold",
            title: "Isometric Core Plank Hold",
            category: "core",
            focus: "Transverse Abdominis, Rectus Abdominis, Spinal Stabilizers",
            primaryMuscle: "Transverse Abdominis & Rectus Abdominis",
            secondaryMuscle: "Erector Spinae, Gluteal Stabilizers, Serratus Anterior",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 60s hold",
            animationSrc: "./assets/plank_hold.gif",
            formCues: [
                "Rest on forearms and toes; elbows positioned directly beneath shoulders.",
                "Contract glutes and tuck pelvis into a slight posterior tilt.",
                "Keep cervical spine neutral by looking at floor between thumbs.",
                "Breathe rhythmically while maintaining rigid full-body tension."
            ]
        },
        {
            id: "hanging_leg_raises",
            title: "Hanging Leg / Knee Raises",
            category: "core",
            focus: "Lower Rectus Abdominis, Iliopsoas, Grip Strength",
            primaryMuscle: "Lower Abdominals (Rectus Abdominis)",
            secondaryMuscle: "Hip Flexors, Forearm Grip, Obliques",
            difficulty: "Advanced",
            repsDefault: "3 sets \u00d7 10-12 reps",
            animationSrc: "./assets/hanging_leg_raises.gif",
            formCues: [
                "Hang from overhead bar with shoulders engaged (scapular depression).",
                "Curl pelvis upward toward chest as legs or knees elevate.",
                "Avoid swinging body or using arching momentum from bottom.",
                "Lower legs slowly with controlled abdominal eccentric control."
            ]
        },
        {
            id: "russian_twists",
            title: "Rotational Russian Twists",
            category: "core",
            focus: "Internal & External Obliques, Transverse Abdominis",
            primaryMuscle: "Obliques (Internal & External)",
            secondaryMuscle: "Rectus Abdominis, Hip Flexors",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 20 reps (10/side)",
            animationSrc: "./assets/russian_twists.gif",
            formCues: [
                "Sit on floor with knees bent and feet hovered slightly off ground.",
                "Lean torso back 45 degrees into V-position with spine neutral.",
                "Rotate torso from side to side, touching hands to floor near hip.",
                "Move ribs and shoulders with control rather than flinging arms."
            ]
        },
        {
            id: "ab_wheel_rollout",
            title: "Abdominal Wheel Rollouts",
            category: "core",
            focus: "Anti-Extension Core Strength, Rectus Abdominis, Lats",
            primaryMuscle: "Rectus Abdominis (Anti-Extension)",
            secondaryMuscle: "Transverse Abdominis, Latissimus Dorsi, Hip Flexors",
            difficulty: "Advanced",
            repsDefault: "3 sets \u00d7 8-10 reps",
            animationSrc: "./assets/ab_wheel_rollout.gif",
            formCues: [
                "Kneel on mat with wheel directly under shoulders, round upper back slightly.",
                "Roll wheel forward slowly, extending body out into straight line.",
                "Do not allow hips or lower back to sag toward floor at extension.",
                "Contract abdominals to pull wheel back under shoulders."
            ]
        },
        {
            id: "bicycle_crunches",
            title: "Cross-Body Bicycle Crunches",
            category: "core",
            focus: "Obliques, Rectus Abdominis, Dynamic Core Endurance",
            primaryMuscle: "Obliques & Rectus Abdominis",
            secondaryMuscle: "Hip Flexors, Transverse Abdominis",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 20 reps (10/side)",
            animationSrc: "./assets/bicycle_crunches.gif",
            formCues: [
                "Lie flat with fingertips behind head; elevate shoulders off mat.",
                "Bring opposite elbow to knee while extending opposite leg straight.",
                "Rotate from thoracic spine and obliques, keeping lower back anchored.",
                "Alternate sides in smooth, rhythmic cadence without yanking neck."
            ]
        },
        {
            id: "mountain_climbers",
            title: "Dynamic Mountain Climbers",
            category: "core",
            focus: "Core Stabilization, Hip Flexor Speed, Cardiovascular Drive",
            primaryMuscle: "Core Abdominals",
            secondaryMuscle: "Hip Flexors, Deltoids, Quadriceps",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 45s cadence",
            animationSrc: "./assets/mountain_climbers.gif",
            formCues: [
                "Start in strong high push-up plank with hands under shoulders.",
                "Drive one knee vigorously toward chest without letting hips pike high.",
                "Quickly switch legs in rapid running cadence on balls of feet.",
                "Keep core locked and shoulders stable throughout duration."
            ]
        },
        {
            id: "side_plank",
            title: "Oblique Side Plank",
            category: "core",
            focus: "Lateral Core Stability, Obliques, Quadratus Lumborum",
            primaryMuscle: "Internal & External Obliques",
            secondaryMuscle: "Quadratus Lumborum, Gluteus Medius, Deltoids",
            difficulty: "Intermediate",
            repsDefault: "3 sets \u00d7 40s per side",
            animationSrc: "./assets/side_plank.gif",
            formCues: [
                "Lie on side propped on elbow, forearm perpendicular to body.",
                "Lift hips off floor until body forms a straight diagonal line.",
                "Keep top shoulder and hip stacked directly over bottom shoulder and hip.",
                "Brace core firmly and hold position without letting bottom hip drop."
            ]
        },
        {
            id: "burpees",
            title: "Full-Body Athletic Burpees",
            category: "cardio",
            focus: "Cardiovascular Stamina, Full Body Plyometric Power",
            primaryMuscle: "Cardiovascular System & Quadriceps",
            secondaryMuscle: "Pectorals, Triceps, Calves, Core",
            difficulty: "Advanced",
            repsDefault: "3 sets \u00d7 12-15 reps",
            animationSrc: "./assets/burpees.gif",
            formCues: [
                "Drop hands to floor from standing position and kick feet back to plank.",
                "Perform a quick chest-to-floor push-up with control.",
                "Snap feet forward toward hands and immediately explode into a vertical jump.",
                "Land softly on balls of feet and flow directly into next repetition."
            ]
        },
        {
            id: "jumping_jacks",
            title: "Cardio Jumping Jacks",
            category: "cardio",
            focus: "Cardiovascular Conditioning, Calves, Shoulder Abductors",
            primaryMuscle: "Cardiovascular System",
            secondaryMuscle: "Calves, Deltoids, Hip Abductors",
            difficulty: "Beginner",
            repsDefault: "3 sets \u00d7 60s cadence",
            animationSrc: "./assets/jumping_jacks.gif",
            formCues: [
                "Start with feet together and arms resting at your sides.",
                "Jump feet out to shoulder-width while raising arms overhead.",
                "Jump back to starting stance in continuous springy cadence.",
                "Land lightly on midfoot to absorb impact through ankles and knees."
            ]
        },
        {
            id: "high_knees",
            title: "Sprint High Knees in Place",
            category: "cardio",
            focus: "Hip Flexor Explosiveness, Sprint Conditioning",
            primaryMuscle: "Hip Flexors & Quadriceps",
            secondaryMuscle: "Calves, Core Abdominals, Cardiovascular System",
            difficulty: "Beginner / Intermediate",
            repsDefault: "3 sets \u00d7 45s sprint",
            animationSrc: "./assets/high_knees.gif",
            formCues: [
                "Run in place driving knees up to hip height with quick ground contact.",
                "Pump opposite arms vigorously in sync with leg turnover.",
                "Stay on balls of feet with upright posture and engaged core.",
                "Maintain fast rhythmic cadence without leaning back."
            ]
        },
        {
            id: "box_jumps",
            title: "Plyometric Box Jumps",
            category: "cardio",
            focus: "Explosive Leg Power, Rate of Force Development",
            primaryMuscle: "Gluteus Maximus & Quadriceps",
            secondaryMuscle: "Calves, Hamstrings, Core",
            difficulty: "Intermediate / Advanced",
            repsDefault: "3 sets \u00d7 10 reps",
            animationSrc: "./assets/box_jumps.gif",
            formCues: [
                "Stand facing plyo box with feet shoulder-width apart.",
                "Swing arms back and hinge hips into half-squat loading position.",
                "Explode upward, swinging arms forward to land softly on box.",
                "Step down one foot at a time to minimize Achilles/joint stress."
            ]
        }
    ];

    // ==========================================================================
    // 2. BIOMETRICS & BMI ONBOARDING HUD SYSTEM
    // ==========================================================================
    const bioProfileCard = document.getElementById('bioProfileCard');
    const bioProfileDialog = document.getElementById('bioProfileDialog');
    const bioProfileForm = document.getElementById('bioProfileForm');
    const editBioBtn = document.getElementById('editBioBtn');

    const displayWeight = document.getElementById('displayWeight');
    const displayHeight = document.getElementById('displayHeight');
    const displayBMI = document.getElementById('displayBMI');
    const bmiStatusPill = document.getElementById('bmiStatusPill');
    const bmiGaugeNeedle = document.getElementById('bmiGaugeNeedle');

    const inputWeight = document.getElementById('inputWeight');
    const inputHeight = document.getElementById('inputHeight');
    const inputGender = document.getElementById('inputGender');

    function getHealthProfile() {
        const saved = localStorage.getItem('productometer_health_profile');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return null;
    }

    function saveHealthProfile(data) {
        localStorage.setItem('productometer_health_profile', JSON.stringify(data));
        updateBiometricsHUD(data);
    }

    function calculateBMI(weightKg, heightCm) {
        if (!weightKg || !heightCm) return 0;
        const hMeters = heightCm / 100;
        return (weightKg / (hMeters * hMeters)).toFixed(1);
    }

    function getBMICategory(bmi) {
        const b = parseFloat(bmi);
        if (b < 18.5) return { category: 'Underweight', pillClass: 'bmi-underweight', pct: 15 };
        if (b < 25.0) return { category: 'Healthy / Normal', pillClass: 'bmi-normal', pct: 37 };
        if (b < 30.0) return { category: 'Overweight', pillClass: 'bmi-overweight', pct: 65 };
        return { category: 'Obese', pillClass: 'bmi-obese', pct: 88 };
    }

    function updateBiometricsHUD(profile) {
        if (!profile) {
            displayWeight.textContent = '--';
            displayHeight.textContent = '--';
            displayBMI.textContent = '--';
            bmiStatusPill.textContent = 'Calibrate';
            bmiStatusPill.className = 'bmi-badge-pill bmi-normal';
            bmiGaugeNeedle.style.left = '37%';
            return;
        }

        displayWeight.textContent = profile.weight;
        displayHeight.textContent = profile.height;

        const bmi = calculateBMI(profile.weight, profile.height);
        displayBMI.textContent = bmi;

        const catInfo = getBMICategory(bmi);
        bmiStatusPill.textContent = catInfo.category;
        bmiStatusPill.className = `bmi-badge-pill ${catInfo.pillClass}`;
        bmiGaugeNeedle.style.left = `${catInfo.pct}%`;
    }

    const currentProfile = getHealthProfile();
    if (!currentProfile) {
        setTimeout(() => {
            if (bioProfileDialog) bioProfileDialog.showModal();
        }, 600);
    } else {
        updateBiometricsHUD(currentProfile);
    }

    if (editBioBtn) {
        editBioBtn.addEventListener('click', () => {
            const p = getHealthProfile();
            if (p) {
                inputWeight.value = p.weight;
                inputHeight.value = p.height;
                if (inputGender) inputGender.value = p.gender || 'male';
            }
            bioProfileDialog.showModal();
        });
    }

    if (bioProfileForm) {
        bioProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const w = parseFloat(inputWeight.value);
            const h = parseFloat(inputHeight.value);
            const g = inputGender ? inputGender.value : 'male';

            if (w > 0 && h > 0) {
                saveHealthProfile({ weight: w, height: h, gender: g });
                bioProfileDialog.close();
                calculateActiveMetrics();
            }
        });
    }

    // ==========================================================================
    // 3. SCHEDULED PRACTICE SESSIONS (DAY PLANNER INTEGRATION)
    // ==========================================================================
    const scheduledSessionsBucket = document.getElementById('scheduledSessionsBucket');

    function syncScheduledHealthSessions() {
        if (!scheduledSessionsBucket) return;
        scheduledSessionsBucket.innerHTML = '';

        let plannerListData = [];
        try {
            const rawList = localStorage.getItem('productometer_chrono_planner_list');
            if (rawList) plannerListData = JSON.parse(rawList);
        } catch (e) {
            console.error("Error reading Day Planner tasks:", e);
        }

        const healthKeywords = ['running', 'exercise', 'workout', 'gym', 'stretching', 'yoga', 'calisthenics', 'cardio', 'walk', 'run', 'swim', 'mobility', 'hiit', 'sprint'];

        const healthSessions = plannerListData.filter(task => {
            if (task.category === 'health') return true;
            if (task.title) {
                const titleLower = task.title.toLowerCase();
                return healthKeywords.some(kw => titleLower.includes(kw));
            }
            return false;
        });

        if (healthSessions.length === 0) {
            scheduledSessionsBucket.innerHTML = `
                <div class="empty-sessions-placeholder">
                    No workout sessions scheduled for today in Day Planner.<br>
                    <span style="font-size: 0.72rem; color: #5a6e62;">Tap "+ Day Planner" in the corner to schedule a session!</span>
                </div>
            `;
            return;
        }

        healthSessions.forEach(task => {
            const sessionCard = document.createElement('div');
            sessionCard.className = `session-card ${task.completed ? 'session-completed' : ''}`;

            const timeStr = task.timeDisplayStr ? task.timeDisplayStr : (task.startMin !== undefined ? formatMinutesToTime(task.startMin) : 'Scheduled');
            const duration = task.durationMinutes || task.duration || 45;

            sessionCard.innerHTML = `
                <div class="session-info-stack">
                    <div class="session-title">${task.title}</div>
                    <div class="session-meta-row">
                        <span class="session-time-badge"><i class="fa-solid fa-clock"></i> ${timeStr}</span>
                        <span class="session-duration-tag">${duration} min duration</span>
                    </div>
                </div>
                <label class="session-checkbox-wrapper" title="Mark Session Completed">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} class="native-health-session-checkbox">
                    <span class="session-checkbox-indicator"></span>
                </label>
            `;

            const checkbox = sessionCard.querySelector('.native-health-session-checkbox');
            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;
                localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(plannerListData));

                if (task.completed) {
                    sessionCard.classList.add('session-completed');
                } else {
                    sessionCard.classList.remove('session-completed');
                }

                calculateActiveMetrics();
            });

            scheduledSessionsBucket.appendChild(sessionCard);
        });
    }

    function formatMinutesToTime(totalMins) {
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    // High-Precision Millisecond Stopwatch Formatter (MM:SS.ms)
    function formatMs(totalMs) {
        if (isNaN(totalMs) || totalMs < 0) totalMs = 0;
        const ms = Math.floor((totalMs % 1000) / 100);
        const totalSecs = Math.floor(totalMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${ms}`;
    }

    // ==========================================================================
    // 🎭 CUSTOM CYBERPUNK POPUP SYSTEM (REPLACES BROWSER ALERTS & CONFIRMS)
    // ==========================================================================
    function showCyberpunkConfirm({ title, message, iconClass = 'fa-triangle-exclamation', confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('themeConfirmModal');
            const titleEl = document.getElementById('confirmPopupTitle');
            const msgEl = document.getElementById('confirmPopupMessage');
            const iconEl = document.getElementById('confirmPopupIcon');
            const btnCancel = document.getElementById('btnConfirmPopupCancel');
            const btnOk = document.getElementById('btnConfirmPopupOk');

            if (!modal) {
                resolve(window.confirm(message));
                return;
            }

            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            if (iconEl) {
                iconEl.className = `popup-icon-badge ${isDanger ? 'danger' : ''}`;
                iconEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
            }
            if (btnCancel) btnCancel.textContent = cancelText;
            if (btnOk) {
                btnOk.textContent = confirmText;
                btnOk.className = `btn-popup-confirm ${isDanger ? 'danger' : ''}`;
            }

            const onOk = () => {
                cleanup();
                modal.close();
                resolve(true);
            };
            const onCancel = () => {
                cleanup();
                modal.close();
                resolve(false);
            };
            const cleanup = () => {
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
            };

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);

            modal.showModal();
        });
    }

    function showCyberpunkNotice({ title, message, iconClass = 'fa-trophy', buttonText = 'Continue', stats = [] }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('themeNoticeModal');
            const titleEl = document.getElementById('noticePopupTitle');
            const msgEl = document.getElementById('noticePopupMessage');
            const iconEl = document.getElementById('noticePopupIcon');
            const statsGrid = document.getElementById('noticePopupStatsGrid');
            const btnClose = document.getElementById('btnNoticePopupClose');

            if (!modal) {
                window.alert(message);
                resolve();
                return;
            }

            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            if (iconEl) {
                iconEl.className = 'popup-icon-badge success';
                iconEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
            }
            if (btnClose) {
                btnClose.innerHTML = `${buttonText} <i class="fa-solid fa-arrow-right"></i>`;
            }

            if (stats && stats.length > 0 && statsGrid) {
                statsGrid.innerHTML = stats.map(s => `
                    <div class="popup-stat-item">
                        <span class="popup-stat-lbl">${s.label}</span>
                        <span class="popup-stat-val ${s.colorClass || 'text-emerald'}">${s.value}</span>
                    </div>
                `).join('');
                statsGrid.style.display = 'grid';
            } else if (statsGrid) {
                statsGrid.style.display = 'none';
            }

            const onClose = () => {
                btnClose.removeEventListener('click', onClose);
                modal.close();
                resolve();
            };

            btnClose.addEventListener('click', onClose);
            modal.showModal();
        });
    }

    // ==========================================================================
    // 4. TOTAL ACTIVE TIME & CALORIES BURNED (MET CALCULATION)
    // ==========================================================================
    const hudActiveTime = document.getElementById('hudActiveTime');
    const hudCaloriesBurned = document.getElementById('hudCaloriesBurned');

    function calculateActiveMetrics() {
        let totalActiveMinutes = 0;
        let bonusCalories = parseInt(localStorage.getItem('productometer_health_session_calories') || '0', 10);

        try {
            const rawList = localStorage.getItem('productometer_chrono_planner_list');
            if (rawList) {
                const list = JSON.parse(rawList);
                const healthKeywords = ['running', 'exercise', 'workout', 'gym', 'stretching', 'yoga', 'calisthenics', 'cardio', 'walk', 'run', 'swim', 'mobility', 'hiit', 'sprint'];
                list.forEach(task => {
                    const isHealth = task.category === 'health' || (task.title && healthKeywords.some(kw => task.title.toLowerCase().includes(kw)));
                    if (isHealth && task.completed) {
                        totalActiveMinutes += (task.durationMinutes || 45);
                    }
                });
            }
        } catch (e) {}

        try {
            const myEx = JSON.parse(localStorage.getItem('productometer_my_exercises')) || [];
            myEx.forEach(ex => {
                if (ex.completedToday) totalActiveMinutes += 10;
            });
        } catch (e) {}

        const sessionMinutes = parseInt(localStorage.getItem('productometer_health_session_mins') || '0', 10);
        totalActiveMinutes += sessionMinutes;

        if (hudActiveTime) {
            if (totalActiveMinutes >= 60) {
                const hrs = (totalActiveMinutes / 60).toFixed(1);
                hudActiveTime.textContent = `${hrs} hrs`;
            } else {
                hudActiveTime.textContent = `${totalActiveMinutes} min`;
            }
        }

        let userWeight = 70;
        try {
            const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
            if (p && p.weight) userWeight = parseFloat(p.weight);
        } catch (e) {}

        const baseCalories = Math.round((6.0 * 3.5 * userWeight / 200) * totalActiveMinutes);
        const totalCalories = baseCalories + bonusCalories;
        if (hudCaloriesBurned) hudCaloriesBurned.textContent = `${totalCalories} kcal`;

        localStorage.setItem('productometer_health_active_mins', totalActiveMinutes);
        localStorage.setItem('productometer_health_calories', totalCalories);
    }

    // ==========================================================================
    // 5. AUDIO SYNTHESIZER (WEB AUDIO API - ZERO EXTERNAL ASSETS NEEDED)
    // ==========================================================================
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playAudioChime(type = 'notification') {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'notification') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, now);
                osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.18);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                osc.start(now);
                osc.stop(now + 0.45);
            } else if (type === 'timer_done' || type === 'break_done') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.setValueAtTime(1174.66, now + 0.12);
                osc.frequency.setValueAtTime(1760.00, now + 0.24);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
            } else if (type === 'set_complete') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'sprint_whistle') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(2200, now);
                osc.frequency.setValueAtTime(2600, now + 0.08);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            }
        } catch (e) {
            console.warn('Audio chime unavailable:', e);
        }
    }

    // ==========================================================================
    // 6. SCHEDULED WORKOUT NOTIFICATION SYSTEM
    // ==========================================================================
    const workoutNotificationBanner = document.getElementById('workoutNotificationBanner');
    const notifWorkoutTitle = document.getElementById('notifWorkoutTitle');
    const notifWorkoutTime = document.getElementById('notifWorkoutTime');
    const notifWorkoutDesc = document.getElementById('notifWorkoutDesc');
    const btnNotifStartWorkout = document.getElementById('btnNotifStartWorkout');
    const btnNotifDismiss = document.getElementById('btnNotifDismiss');
    const toggleNotifsBtn = document.getElementById('toggleNotifsBtn');
    const notifStatusText = document.getElementById('notifStatusText');

    let notificationsEnabled = localStorage.getItem('productometer_workout_notifs_active') !== 'false';
    let bannerDismissedSession = false;

    function updateNotifToggleUI() {
        if (!notifStatusText) return;
        if (notificationsEnabled) {
            notifStatusText.textContent = 'ON';
            if (toggleNotifsBtn) toggleNotifsBtn.classList.remove('disabled');
        } else {
            notifStatusText.textContent = 'OFF';
            if (toggleNotifsBtn) toggleNotifsBtn.classList.add('disabled');
            if (workoutNotificationBanner) workoutNotificationBanner.style.display = 'none';
        }
    }
    updateNotifToggleUI();

    if (toggleNotifsBtn) {
        toggleNotifsBtn.addEventListener('click', async () => {
            notificationsEnabled = !notificationsEnabled;
            localStorage.setItem('productometer_workout_notifs_active', notificationsEnabled ? 'true' : 'false');
            updateNotifToggleUI();

            if (notificationsEnabled && ('Notification' in window)) {
                if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                    await Notification.requestPermission();
                }
            }
            checkScheduledWorkoutNotifications();
        });
    }

    if (btnNotifDismiss) {
        btnNotifDismiss.addEventListener('click', () => {
            bannerDismissedSession = true;
            if (workoutNotificationBanner) workoutNotificationBanner.style.display = 'none';
        });
    }

    if (btnNotifStartWorkout) {
        btnNotifStartWorkout.addEventListener('click', () => {
            if (workoutNotificationBanner) workoutNotificationBanner.style.display = 'none';
            openActiveWorkoutModal();
        });
    }

    function checkScheduledWorkoutNotifications() {
        if (!notificationsEnabled || bannerDismissedSession) return;

        let scheduledWorkout = null;

        // 1. Day Planner task
        try {
            const rawList = localStorage.getItem('productometer_chrono_planner_list');
            if (rawList) {
                const list = JSON.parse(rawList);
                const healthKeywords = ['workout', 'exercise', 'gym', 'running', 'run', 'stretching', 'cardio', 'hiit', 'training'];
                const found = list.find(task => {
                    if (task.completed) return false;
                    return task.category === 'health' || (task.title && healthKeywords.some(kw => task.title.toLowerCase().includes(kw)));
                });
                if (found) {
                    scheduledWorkout = {
                        title: found.title || 'Scheduled Workout Session',
                        time: found.timeDisplayStr || (found.startMin !== undefined ? formatMinutesToTime(found.startMin) : 'Today'),
                        source: 'Day Planner'
                    };
                }
            }
        } catch (e) {}

        // 2. Weekly Split
        if (!scheduledWorkout) {
            try {
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const todayKey = dayNames[new Date().getDay()];
                const rawSplit = localStorage.getItem('productometer_weekly_split');
                let split = {};
                if (rawSplit) split = JSON.parse(rawSplit);
                const proto = split[todayKey] || 'workout';
                if (proto === 'workout' || proto === 'running' || proto === 'hiit') {
                    const titles = {
                        workout: 'Active Strength & Hypertrophy Split',
                        running: 'Running & Cardio Conditioning',
                        hiit: 'HIIT High Intensity Sprints'
                    };
                    scheduledWorkout = {
                        title: titles[proto] || 'Active Workout Split',
                        time: 'Today (Protocol Active)',
                        source: 'Weekly Split'
                    };
                }
            } catch (e) {}
        }

        if (scheduledWorkout && workoutNotificationBanner) {
            notifWorkoutTitle.textContent = scheduledWorkout.title;
            notifWorkoutTime.textContent = scheduledWorkout.time;
            notifWorkoutDesc.textContent = `Your ${scheduledWorkout.source} has a workout scheduled today. Click Start Session to begin!`;
            workoutNotificationBanner.style.display = 'flex';
        }
    }

    // ==========================================================================
    // 7. THE 3 TRAINING DISCIPLINES HUB CONTROLLER (WORKOUT, RUNNING, HIITS)
    // ==========================================================================
    const disciplineNavTabs = document.getElementById('disciplineNavTabs');
    const tabContentWorkout = document.getElementById('tabContentWorkout');
    const tabContentRunning = document.getElementById('tabContentRunning');
    const tabContentHIIT = document.getElementById('tabContentHIIT');

    if (disciplineNavTabs) {
        disciplineNavTabs.querySelectorAll('.discipline-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                disciplineNavTabs.querySelectorAll('.discipline-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetTab = btn.dataset.tab;
                if (tabContentWorkout) tabContentWorkout.style.display = (targetTab === 'workout') ? 'block' : 'none';
                if (tabContentRunning) tabContentRunning.style.display = (targetTab === 'running') ? 'block' : 'none';
                if (tabContentHIIT) tabContentHIIT.style.display = (targetTab === 'hiit') ? 'block' : 'none';

                if (targetTab === 'hiit') {
                    renderHiitRoutine();
                    renderHIITBucket();
                }
            });
        });
    }

    // ==========================================================================
    // 8. EXERCISE TYPE JUDGMENT & SETS/REPS ADJUSTMENT MODAL
    // ==========================================================================
    function getExerciseType(exercise) {
        if (exercise.type === 'hold' || exercise.type === 'reps') return exercise.type;
        const titleLower = (exercise.title || '').toLowerCase();
        const repsLower = (exercise.repsDefault || exercise.reps || '').toLowerCase();
        const focusLower = (exercise.focus || '').toLowerCase();

        const holdKeywords = ['plank', 'hold', 'side plank', 'wall sit', 'mountain climber', 'high knee', 'jumping jack', 'burpee', 'sec', 'second', 's hold'];
        if (holdKeywords.some(kw => titleLower.includes(kw) || repsLower.includes(kw) || focusLower.includes(kw))) {
            return 'hold';
        }
        return 'reps';
    }

    const adjustSetsRepsDialog = document.getElementById('adjustSetsRepsDialog');
    const adjustExThumb = document.getElementById('adjustExThumb');
    const adjustExTitle = document.getElementById('adjustExTitle');
    const adjustExFocus = document.getElementById('adjustExFocus');
    const adjustTypePills = document.getElementById('adjustTypePills');
    const repsFieldGroup = document.getElementById('repsFieldGroup');
    const holdFieldGroup = document.getElementById('holdFieldGroup');

    const adjustSetsInput = document.getElementById('adjustSetsInput');
    const adjustRepsInput = document.getElementById('adjustRepsInput');
    const adjustHoldInput = document.getElementById('adjustHoldInput');
    const btnConfirmAddToRoutine = document.getElementById('btnConfirmAddToRoutine');

    const btnDecSets = document.getElementById('btnDecSets');
    const btnIncSets = document.getElementById('btnIncSets');
    const btnDecReps = document.getElementById('btnDecReps');
    const btnIncReps = document.getElementById('btnIncReps');
    const btnDecHold = document.getElementById('btnDecHold');
    const btnIncHold = document.getElementById('btnIncHold');

    let exercisePendingAdjustment = null;
    let selectedAdjustType = 'reps';
    let adjustTargetRoutine = 'workout'; // 'workout' or 'hiit'

    function openAdjustDialog(exercise, targetRoutine = 'workout') {
        exercisePendingAdjustment = exercise;
        adjustTargetRoutine = targetRoutine;
        selectedAdjustType = getExerciseType(exercise);

        if (adjustExTitle) adjustExTitle.textContent = exercise.title;
        if (adjustExFocus) adjustExFocus.textContent = exercise.focus || 'Target Muscles';
        if (adjustExThumb) adjustExThumb.src = exercise.animationSrc || './assets/pushups.gif';

        if (btnConfirmAddToRoutine) {
            btnConfirmAddToRoutine.innerHTML = (targetRoutine === 'hiit') ?
                '<i class="fa-solid fa-bolt"></i> Add to HIIT Routine' :
                '<i class="fa-solid fa-plus"></i> Add to Routine';
        }

        updateAdjustTypeUI(selectedAdjustType);

        // Pre-fill default sets & reps
        if (adjustSetsInput) adjustSetsInput.value = exercise.sets || 3;
        if (selectedAdjustType === 'reps') {
            let r = 12;
            const match = (exercise.repsDefault || exercise.reps || '').match(/(\d+)\s*reps?/);
            if (match) r = parseInt(match[1], 10);
            if (adjustRepsInput) adjustRepsInput.value = exercise.repsCount || r;
        } else {
            let h = 45;
            const match = (exercise.repsDefault || exercise.reps || '').match(/(\d+)\s*(?:s|sec)/);
            if (match) h = parseInt(match[1], 10);
            if (adjustHoldInput) adjustHoldInput.value = exercise.holdSeconds || h;
        }

        if (adjustSetsRepsDialog) adjustSetsRepsDialog.showModal();
    }

    function updateAdjustTypeUI(type) {
        selectedAdjustType = type;
        if (adjustTypePills) {
            adjustTypePills.querySelectorAll('.type-pill-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });
        }
        if (repsFieldGroup) repsFieldGroup.style.display = (type === 'reps') ? 'flex' : 'none';
        if (holdFieldGroup) holdFieldGroup.style.display = (type === 'hold') ? 'flex' : 'none';
    }

    if (adjustTypePills) {
        adjustTypePills.querySelectorAll('.type-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                updateAdjustTypeUI(btn.dataset.type);
            });
        });
    }

    // Steppers
    if (btnDecSets) btnDecSets.addEventListener('click', () => {
        adjustSetsInput.value = Math.max(1, parseInt(adjustSetsInput.value || 3, 10) - 1);
    });
    if (btnIncSets) btnIncSets.addEventListener('click', () => {
        adjustSetsInput.value = Math.min(10, parseInt(adjustSetsInput.value || 3, 10) + 1);
    });
    if (btnDecReps) btnDecReps.addEventListener('click', () => {
        adjustRepsInput.value = Math.max(1, parseInt(adjustRepsInput.value || 12, 10) - 1);
    });
    if (btnIncReps) btnIncReps.addEventListener('click', () => {
        adjustRepsInput.value = Math.min(100, parseInt(adjustRepsInput.value || 12, 10) + 1);
    });
    if (btnDecHold) btnDecHold.addEventListener('click', () => {
        adjustHoldInput.value = Math.max(5, parseInt(adjustHoldInput.value || 45, 10) - 5);
    });
    if (btnIncHold) btnIncHold.addEventListener('click', () => {
        adjustHoldInput.value = Math.min(300, parseInt(adjustHoldInput.value || 45, 10) + 5);
    });

    if (btnConfirmAddToRoutine) {
        btnConfirmAddToRoutine.addEventListener('click', () => {
            if (!exercisePendingAdjustment) return;

            const sets = parseInt(adjustSetsInput.value || 3, 10);
            const type = selectedAdjustType;
            let repsLabel = '';
            let repsCount = 12;
            let holdSeconds = 45;

            if (type === 'reps') {
                repsCount = parseInt(adjustRepsInput.value || 12, 10);
                repsLabel = `${sets} sets × ${repsCount} reps`;
            } else {
                holdSeconds = parseInt(adjustHoldInput.value || 45, 10);
                repsLabel = `${sets} sets × ${holdSeconds} sec hold`;
            }

            const routineItem = {
                id: exercisePendingAdjustment.id,
                customTitle: exercisePendingAdjustment.title,
                focus: exercisePendingAdjustment.focus,
                reps: repsLabel,
                sets: sets,
                repsCount: repsCount,
                holdSeconds: holdSeconds,
                type: type,
                completedToday: false
            };

            if (adjustTargetRoutine === 'hiit') {
                const list = getHiitExercises();
                const existingIdx = list.findIndex(e => e.id === routineItem.id);
                if (existingIdx !== -1) {
                    list[existingIdx] = routineItem;
                } else {
                    list.push(routineItem);
                }
                saveHiitExercises(list);
            } else {
                const list = getMyExercises();
                const existingIdx = list.findIndex(e => e.id === routineItem.id);
                if (existingIdx !== -1) {
                    list[existingIdx] = routineItem;
                } else {
                    list.push(routineItem);
                }
                saveMyExercises(list);
            }

            playAudioChime('set_complete');
            if (adjustSetsRepsDialog) adjustSetsRepsDialog.close();

            if (exerciseDetailDialog && exerciseDetailDialog.open) {
                exerciseDetailDialog.close();
            }
        });
    }

    // ==========================================================================
    // 9. ROUTINE STORAGE (PERMANENT & FREE FROM FORCED BICEP CURLS)
    // ==========================================================================
    const myExercisesBucket = document.getElementById('myExercisesBucket');
    const workoutRoutineCount = document.getElementById('workoutRoutineCount');
    const workoutEstDuration = document.getElementById('workoutEstDuration');
    const workoutEstBurn = document.getElementById('workoutEstBurn');

    function getMyExercises() {
        const saved = localStorage.getItem('productometer_my_exercises');
        if (saved !== null) {
            try { 
                return JSON.parse(saved);
            } catch (e) {}
        }

        // Clean default starting routine (only created on very first launch)
        const initial = [
            { id: 'pushups', customTitle: 'Standard Push-ups', focus: 'Chest & Triceps', reps: '3 sets × 15 reps', sets: 3, repsCount: 15, type: 'reps', completedToday: false },
            { id: 'bodyweight_squats', customTitle: 'Bodyweight Air Squats', focus: 'Quadriceps & Glutes', reps: '3 sets × 20 reps', sets: 3, repsCount: 20, type: 'reps', completedToday: false },
            { id: 'plank_hold', customTitle: 'Isometric Core Plank Hold', focus: 'Core Abdominals', reps: '3 sets × 45 sec hold', sets: 3, holdSeconds: 45, type: 'hold', completedToday: false },
            { id: 'pullups', customTitle: 'Overhand Pull-ups', focus: 'Latissimus Dorsi & Back', reps: '3 sets × 8 reps', sets: 3, repsCount: 8, type: 'reps', completedToday: false }
        ];
        localStorage.setItem('productometer_my_exercises', JSON.stringify(initial));
        return initial;
    }

    function saveMyExercises(list) {
        localStorage.setItem('productometer_my_exercises', JSON.stringify(list));
        renderMyExercises();
        calculateActiveMetrics();
    }

    function renderMyExercises() {
        if (!myExercisesBucket) return;
        myExercisesBucket.innerHTML = '';

        const myExercises = getMyExercises();

        // Update Routine Launch Summary
        if (workoutRoutineCount) workoutRoutineCount.textContent = myExercises.length;
        const estMinutes = myExercises.length * 5;
        if (workoutEstDuration) workoutEstDuration.textContent = `${estMinutes} min`;

        let userWeight = 70;
        try {
            const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
            if (p && p.weight) userWeight = parseFloat(p.weight);
        } catch (e) {}
        const estKcal = Math.round((6.5 * 3.5 * userWeight / 200) * estMinutes);
        if (workoutEstBurn) workoutEstBurn.textContent = `${estKcal} kcal`;

        if (myExercises.length === 0) {
            myExercisesBucket.innerHTML = `
                <div class="empty-sessions-placeholder">
                    No exercises in your routine yet.<br>
                    Click <strong>"Exercise Library"</strong> above to browse and add some!
                </div>
            `;
            return;
        }

        myExercises.forEach((ex, index) => {
            const found = getCompleteExerciseCatalog().find(item => item.id === ex.id);
            const title = ex.customTitle || (found ? found.title : ex.id);
            const focus = ex.focus || (found ? found.focus : 'Full Body');
            const reps = ex.reps || (found ? found.repsDefault : '3 sets × 12 reps');
            const type = getExerciseType(ex);

            const card = document.createElement('div');
            card.className = `my-exercise-card ${ex.completedToday ? 'exercise-done' : ''}`;

            card.innerHTML = `
                <div class="ex-card-main">
                    <div class="ex-title-row">
                        <span class="ex-title-text">${title}</span>
                        <span class="exercise-type-tag"><i class="fa-solid ${type === 'hold' ? 'fa-stopwatch' : 'fa-repeat'}"></i> ${type.toUpperCase()}</span>
                    </div>
                    <span class="ex-focus-caption">${focus}</span>
                    <span class="ex-reps-badge"><i class="fa-solid fa-layer-group"></i> ${reps}</span>
                </div>
                <div class="ex-actions-cell">
                    <button type="button" class="btn-ex-view" data-id="${ex.id}" title="View 3D Form & Muscle Activation">
                        <i class="fa-solid fa-play"></i> Form
                    </button>
                    <button type="button" class="btn-ex-adjust" data-index="${index}" title="Edit Sets & Reps">
                        <i class="fa-solid fa-sliders"></i>
                    </button>
                    <button type="button" class="btn-ex-delete" data-index="${index}" title="Remove from Routine">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            card.querySelector('.btn-ex-view').addEventListener('click', () => {
                if (found) {
                    openExerciseDetailModal(found);
                } else {
                    openExerciseDetailModal({
                        id: ex.id,
                        title: title,
                        category: 'arms',
                        focus: focus,
                        primaryMuscle: focus,
                        secondaryMuscle: 'Stabilizers',
                        difficulty: 'Intermediate',
                        repsDefault: reps,
                        animationSrc: `./assets/${ex.id}.gif`,
                        formCues: ['Maintain solid posture and strict cadence throughout entire set.']
                    });
                }
            });

            card.querySelector('.btn-ex-adjust').addEventListener('click', () => {
                openAdjustDialog(found || ex);
            });

            // True deletion with Cyberpunk Confirm Modal
            card.querySelector('.btn-ex-delete').addEventListener('click', async () => {
                const confirmed = await showCyberpunkConfirm({
                    title: 'Remove Exercise?',
                    message: `Remove "${title}" from today's workout routine?`,
                    iconClass: 'fa-trash-can',
                    confirmText: 'Remove',
                    cancelText: 'Keep',
                    isDanger: true
                });
                if (confirmed) {
                    const updatedList = getMyExercises();
                    updatedList.splice(index, 1);
                    saveMyExercises(updatedList);
                }
            });

            myExercisesBucket.appendChild(card);
        });
    }

    // ==========================================================================
    // 10. EXERCISE CATALOG MODAL WITH SEARCH & "+ CUSTOM EXERCISE"
    // ==========================================================================
    const openAllExercisesBtn = document.getElementById('openAllExercisesBtn');
    const allExercisesDialog = document.getElementById('allExercisesDialog');
    const openCreateExerciseBtn = document.getElementById('openCreateExerciseBtn');
    const exerciseSearchInput = document.getElementById('exerciseSearchInput');
    const catalogFilterTabs = document.getElementById('catalogFilterTabs');
    const catalogListBucket = document.getElementById('catalogListBucket');

    const exerciseDetailDialog = document.getElementById('exerciseDetailDialog');
    const detailExerciseTitle = document.getElementById('detailExerciseTitle');
    const detailFocusTag = document.getElementById('detailFocusTag');
    const detailDifficultyBadge = document.getElementById('detailDifficultyBadge');
    const detailFormCuesBucket = document.getElementById('detailFormCuesBucket');
    const detailAddRoutineBtn = document.getElementById('detailAddRoutineBtn');
    const detail3dAnimationImg = document.getElementById('detail3dAnimationImg');
    const legendPrimaryText = document.getElementById('legendPrimaryText');
    const legendSecondaryText = document.getElementById('legendSecondaryText');

    let currentSelectedExerciseForDetail = null;
    let currentActiveCategory = 'all';

    function getCustomExercises() {
        const saved = localStorage.getItem('productometer_custom_exercises');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    }

    function saveCustomExercise(newEx) {
        const list = getCustomExercises();
        list.unshift(newEx);
        localStorage.setItem('productometer_custom_exercises', JSON.stringify(list));
    }

    function deleteCustomExercise(exId) {
        let list = getCustomExercises();
        list = list.filter(e => e.id !== exId);
        localStorage.setItem('productometer_custom_exercises', JSON.stringify(list));
        renderCatalog(currentActiveCategory, exerciseSearchInput ? exerciseSearchInput.value : '');
    }

    function getCompleteExerciseCatalog() {
        return [...getCustomExercises(), ...exerciseCatalog];
    }

    if (openAllExercisesBtn) {
        openAllExercisesBtn.addEventListener('click', () => {
            allExercisesDialog.showModal();
            if (exerciseSearchInput) exerciseSearchInput.value = '';
            renderCatalog('all', '');
        });
    }

    if (openCreateExerciseBtn) {
        openCreateExerciseBtn.addEventListener('click', () => {
            createExerciseDialog.showModal();
        });
    }

    if (exerciseSearchInput) {
        exerciseSearchInput.addEventListener('input', (e) => {
            renderCatalog(currentActiveCategory, e.target.value);
        });
    }

    if (catalogFilterTabs) {
        catalogFilterTabs.querySelectorAll('.filter-tab-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                catalogFilterTabs.querySelectorAll('.filter-tab-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderCatalog(btn.dataset.category, exerciseSearchInput ? exerciseSearchInput.value : '');
            });
        });
    }

    function renderCatalog(category = 'all', searchQuery = '') {
        if (!catalogListBucket) return;
        catalogListBucket.innerHTML = '';
        currentActiveCategory = category;

        const q = searchQuery.trim().toLowerCase();
        const allItems = getCompleteExerciseCatalog();

        const filtered = allItems.filter(item => {
            const matchCat = (category === 'all') || (item.category === category);
            const matchSearch = !q || 
                item.title.toLowerCase().includes(q) ||
                (item.focus && item.focus.toLowerCase().includes(q)) ||
                (item.primaryMuscle && item.primaryMuscle.toLowerCase().includes(q)) ||
                (item.category && item.category.toLowerCase().includes(q));
            return matchCat && matchSearch;
        });

        if (filtered.length === 0) {
            catalogListBucket.innerHTML = `
                <div class="empty-sessions-placeholder" style="padding: 24px 12px; text-align: center;">
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 1.5rem; color: #64756b; margin-bottom: 8px; display: block;"></i>
                    No exercises found matching "${searchQuery}".<br>
                    <button type="button" class="btn-new-exercise-pill" style="margin-top: 12px;" onclick="document.getElementById('createExerciseDialog').showModal()">
                        <i class="fa-solid fa-plus"></i> Custom Exercise
                    </button>
                </div>
            `;
            return;
        }

        filtered.forEach(item => {
            const row = document.createElement('div');
            row.className = 'catalog-card-item';

            const isCustomBadge = item.isCustom ? `<span class="badge-custom-tag"><i class="fa-solid fa-star"></i> Custom</span>` : '';
            const exType = getExerciseType(item);

            row.innerHTML = `
                <div class="catalog-card-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="catalog-title">${item.title}</span>
                        ${isCustomBadge}
                    </div>
                    <div class="catalog-badges-row">
                        <span class="badge-3d-pulse"><i class="fa-solid fa-cube"></i> 3D Loop</span>
                        <span class="exercise-type-tag"><i class="fa-solid ${exType === 'hold' ? 'fa-stopwatch' : 'fa-repeat'}"></i> ${exType.toUpperCase()}</span>
                        <span class="exercise-focus-tag">${item.category.toUpperCase()}</span>
                    </div>
                </div>
                <p class="catalog-desc"><strong>Target:</strong> ${item.focus}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                    <span style="font-size: 0.75rem; color: #72809d;">Default: ${item.repsDefault}</span>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn-view-animation" data-id="${item.id}">
                            <i class="fa-solid fa-play"></i> Form & Muscles
                        </button>
                        <button type="button" class="corner-action-btn add-catalog-btn" data-id="${item.id}" style="padding: 6px 12px;">
                            <i class="fa-solid fa-plus"></i> Add
                        </button>
                        ${item.isCustom ? `<button type="button" class="corner-action-btn delete-custom-btn" data-id="${item.id}" style="padding: 6px 8px; color: #ff1744; border-color: rgba(255,23,68,0.3);" title="Delete custom exercise"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </div>
                </div>
            `;

            row.querySelector('.btn-view-animation').addEventListener('click', () => {
                openExerciseDetailModal(item);
            });

            // Opens Adjust Sets & Reps modal before adding!
            row.querySelector('.add-catalog-btn').addEventListener('click', () => {
                openAdjustDialog(item);
            });

            if (item.isCustom) {
                row.querySelector('.delete-custom-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmed = await showCyberpunkConfirm({
                        title: 'Delete Custom Exercise?',
                        message: `Are you sure you want to permanently remove "${item.title}" from your library?`,
                        iconClass: 'fa-trash-can',
                        confirmText: 'Delete Exercise',
                        cancelText: 'Cancel',
                        isDanger: true
                    });
                    if (confirmed) {
                        deleteCustomExercise(item.id);
                    }
                });
            }

            catalogListBucket.appendChild(row);
        });
    }

    // ==========================================================================
    // 11. SIMPLIFIED CUSTOM EXERCISE CREATION (ONLY NAME & TYPE MANDATORY)
    // ==========================================================================
    const createExerciseDialog = document.getElementById('createExerciseDialog');
    const createExerciseForm = document.getElementById('createExerciseForm');
    const customExTypePills = document.getElementById('customExTypePills');
    const newExTypeInput = document.getElementById('newExType');

    if (customExTypePills) {
        customExTypePills.querySelectorAll('.type-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                customExTypePills.querySelectorAll('.type-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (newExTypeInput) newExTypeInput.value = btn.dataset.type;
            });
        });
    }

    if (createExerciseForm) {
        createExerciseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('newExTitle').value.trim();
            const type = newExTypeInput ? newExTypeInput.value : 'reps';

            // Optional fields with fallback defaults
            const category = document.getElementById('newExCategory').value || 'arms';
            const difficulty = document.getElementById('newExDifficulty').value || 'Intermediate';
            const focus = document.getElementById('newExFocus').value.trim() || 'Target Muscles & Core';
            const repsRaw = document.getElementById('newExReps').value.trim() || (type === 'reps' ? '3 sets × 12 reps' : '3 sets × 45 sec hold');
            const animUrlInput = document.getElementById('newExAnimationUrl').value.trim();
            const fileInput = document.getElementById('newExFileInput');
            const cuesRaw = document.getElementById('newExCues').value.trim();

            const safeId = 'custom_' + Date.now() + '_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const cuesList = cuesRaw ? cuesRaw.split('\n').map(c => c.trim()).filter(Boolean) : [
                'Maintain deliberate controlled cadence and neutral posture throughout movement.',
                'Exhale on contraction and inhale smoothly on return.'
            ];

            const finishSave = (finalAnimSrc) => {
                const customEx = {
                    id: safeId,
                    title: title,
                    type: type,
                    category: category,
                    focus: focus,
                    primaryMuscle: focus.split(',')[0].trim(),
                    secondaryMuscle: focus.split(',').slice(1).join(',').trim() || 'Core & Stabilizers',
                    difficulty: difficulty,
                    repsDefault: repsRaw,
                    animationSrc: finalAnimSrc || './assets/pushups.gif',
                    formCues: cuesList,
                    isCustom: true
                };

                saveCustomExercise(customEx);
                createExerciseForm.reset();
                createExerciseDialog.close();

                if (allExercisesDialog.open) {
                    renderCatalog(currentActiveCategory, exerciseSearchInput ? exerciseSearchInput.value : '');
                }

                // Prompt user to customize sets/reps to add straight to routine
                openAdjustDialog(customEx);
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (uploadEvent) => {
                    finishSave(uploadEvent.target.result);
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                finishSave(animUrlInput || './assets/pushups.gif');
            }
        });
    }

    // ==========================================================================
    // 12. EXERCISE 3D DETAIL SHOWCASE & FLOATING STOPWATCH
    // ==========================================================================
    function openExerciseDetailModal(exercise) {
        currentSelectedExerciseForDetail = exercise;
        detailExerciseTitle.textContent = exercise.title;
        detailFocusTag.textContent = exercise.focus;
        detailDifficultyBadge.textContent = exercise.difficulty;

        if (detail3dAnimationImg && exercise.animationSrc) {
            detail3dAnimationImg.style.opacity = '0';
            detail3dAnimationImg.src = exercise.animationSrc;
            detail3dAnimationImg.onload = () => {
                detail3dAnimationImg.style.opacity = '1';
            };
            if (detail3dAnimationImg.complete) {
                detail3dAnimationImg.style.opacity = '1';
            }
        }

        if (legendPrimaryText) legendPrimaryText.textContent = `Primary: ${exercise.primaryMuscle || exercise.focus}`;
        if (legendSecondaryText) legendSecondaryText.textContent = `Synergist: ${exercise.secondaryMuscle || 'Stabilizers'}`;

        if (detailFormCuesBucket) {
            detailFormCuesBucket.innerHTML = '';
            (exercise.formCues || ['Maintain strict posture and neutral spine.']).forEach(cue => {
                const cueDiv = document.createElement('div');
                cueDiv.className = 'form-cue-item';
                cueDiv.innerHTML = `<span class="cue-bullet"></span><span class="cue-text">${cue}</span>`;
                detailFormCuesBucket.appendChild(cueDiv);
            });
        }

        resetDetailSw();
        exerciseDetailDialog.showModal();
    }

    if (detailAddRoutineBtn) {
        detailAddRoutineBtn.addEventListener('click', () => {
            if (currentSelectedExerciseForDetail) {
                openAdjustDialog(currentSelectedExerciseForDetail);
            }
        });
    }

    // Floating stopwatch inside detail modal
    const detailStopwatchDisplay = document.getElementById('detailStopwatchDisplay');
    const btnDetailSwStart = document.getElementById('btnDetailSwStart');
    const btnDetailSwPause = document.getElementById('btnDetailSwPause');
    const btnDetailSwReset = document.getElementById('btnDetailSwReset');

    let detailSwRunning = false;
    let detailSwElapsedMs = 0;
    let detailSwStartTime = 0;
    let detailSwInterval = null;

    function startDetailSw() {
        if (detailSwRunning) return;
        detailSwRunning = true;
        detailSwStartTime = performance.now() - detailSwElapsedMs;
        if (btnDetailSwStart) btnDetailSwStart.style.display = 'none';
        if (btnDetailSwPause) btnDetailSwPause.style.display = 'inline-flex';

        clearInterval(detailSwInterval);
        detailSwInterval = setInterval(() => {
            detailSwElapsedMs = performance.now() - detailSwStartTime;
            if (detailStopwatchDisplay) detailStopwatchDisplay.textContent = formatMs(detailSwElapsedMs);
        }, 100);
    }

    function pauseDetailSw() {
        detailSwRunning = false;
        clearInterval(detailSwInterval);
        if (btnDetailSwStart) btnDetailSwStart.style.display = 'inline-flex';
        if (btnDetailSwPause) btnDetailSwPause.style.display = 'none';
    }

    function resetDetailSw() {
        pauseDetailSw();
        detailSwElapsedMs = 0;
        if (detailStopwatchDisplay) detailStopwatchDisplay.textContent = '00:00.0';
    }

    if (btnDetailSwStart) btnDetailSwStart.addEventListener('click', startDetailSw);
    if (btnDetailSwPause) btnDetailSwPause.addEventListener('click', pauseDetailSw);
    if (btnDetailSwReset) btnDetailSwReset.addEventListener('click', resetDetailSw);

    // ==========================================================================
    // 13. FULLSCREEN ACTIVE WORKOUT DIALOG MODAL & REST BREAK POPUP
    // ==========================================================================
    const activeWorkoutDialog = document.getElementById('activeWorkoutDialog');
    const btnOpenWorkoutDialog = document.getElementById('btnOpenWorkoutDialog');
    const btnCancelWorkoutModal = document.getElementById('btnCancelWorkoutModal');

    const activeModalExTitle = document.getElementById('activeModalExTitle');
    const activeModalElapsed = document.getElementById('activeModalElapsed');
    const activeModalKcal = document.getElementById('activeModalKcal');
    const activeModalProgress = document.getElementById('activeModalProgress');
    const modalProgressBarFill = document.getElementById('modalProgressBarFill');

    const modalWorkoutAnimationImg = document.getElementById('modalWorkoutAnimationImg');
    const modalExCategory = document.getElementById('modalExCategory');
    const modalExTypeTag = document.getElementById('modalExTypeTag');
    const modalExTargetDisplay = document.getElementById('modalExTargetDisplay');
    const modalCurrentSetDisplay = document.getElementById('modalCurrentSetDisplay');

    const modalStopwatchContainer = document.getElementById('modalStopwatchContainer');
    const swModeStopwatchBtn = document.getElementById('swModeStopwatchBtn');
    const swModeCountdownBtn = document.getElementById('swModeCountdownBtn');
    const modalSwModeTag = document.getElementById('modalSwModeTag');
    const modalStopwatchReadout = document.getElementById('modalStopwatchReadout');
    const modalSwPresetsRow = document.getElementById('modalSwPresetsRow');

    const btnModalSwStart = document.getElementById('btnModalSwStart');
    const btnModalSwPause = document.getElementById('btnModalSwPause');
    const btnModalSwReset = document.getElementById('btnModalSwReset');

    const btnModalCompleteSet = document.getElementById('btnModalCompleteSet');
    const btnModalSetNum = document.getElementById('btnModalSetNum');
    const setCaloriesIncrement = document.getElementById('setCaloriesIncrement');

    const btnModalPrevEx = document.getElementById('btnModalPrevEx');
    const btnModalNextEx = document.getElementById('btnModalNextEx');
    const btnModalFinishWorkout = document.getElementById('btnModalFinishWorkout');

    // Rest Break Modal
    const workoutRestModal = document.getElementById('workoutRestModal');
    const restNextSetPreview = document.getElementById('restNextSetPreview');
    const restModalCountdown = document.getElementById('restModalCountdown');
    const restProgressFill = document.getElementById('restProgressFill');
    const btnModalRestAdd15 = document.getElementById('btnModalRestAdd15');
    const btnModalRestAdd30 = document.getElementById('btnModalRestAdd30');
    const btnModalSkipBreak = document.getElementById('btnModalSkipBreak');

    let activeWorkoutList = [];
    let workoutExIndex = 0;
    let workoutSetNumber = 1;
    let workoutTotalSets = 3;

    let workoutElapsedSeconds = 0;
    let workoutCaloriesBurned = 0; // STRICT: ONLY INCREASES ON COMPLETE SET OR FINISH WORKOUT!
    let workoutTimerInterval = null;

    // Workout Stopwatch Engine
    let workoutSwMode = 'stopwatch'; // 'stopwatch' or 'countdown'
    let workoutSwTargetSec = 0;
    let workoutSwElapsedMs = 0;
    let workoutSwRunning = false;
    let workoutSwInterval = null;
    let workoutSwStartTime = 0;

    // 1-min Break Countdown
    let breakSecondsLeft = 60;
    let breakTotalSec = 60;
    let breakInterval = null;

    let isCurrentSessionHiit = false;

    async function openActiveWorkoutModal(isHiit = false) {
        isCurrentSessionHiit = isHiit;
        activeWorkoutList = isHiit ? getHiitExercises() : getMyExercises();

        if (activeWorkoutList.length === 0) {
            if (isHiit) {
                await showCyberpunkNotice({
                    title: 'HIIT Routine is Empty',
                    message: 'Please tap [+ Add] on explosive HIIT exercises below to build your circuit before starting a session.',
                    iconClass: 'fa-bolt',
                    buttonText: 'Got It'
                });
            } else {
                await showCyberpunkNotice({
                    title: 'Routine is Empty',
                    message: 'Please add some exercises from the Exercise Library to your routine before starting a session.',
                    iconClass: 'fa-dumbbell',
                    buttonText: 'Open Exercise Library'
                });
                if (allExercisesDialog) allExercisesDialog.showModal();
            }
            return;
        }

        const badgeEl = document.querySelector('.workout-badge-active');
        if (badgeEl) {
            badgeEl.innerHTML = isHiit ?
                '<i class="fa-solid fa-fire text-neon-orange"></i> Live HIIT Circuit' :
                '<i class="fa-solid fa-bolt text-emerald"></i> Live Workout';
        }

        workoutExIndex = 0;
        workoutSetNumber = 1;
        workoutElapsedSeconds = 0;
        workoutCaloriesBurned = 0; // Reset session calories

        if (activeModalKcal) activeModalKcal.textContent = '0 kcal';
        if (activeModalElapsed) activeModalElapsed.textContent = '00:00';

        clearInterval(workoutTimerInterval);
        workoutTimerInterval = setInterval(() => {
            workoutElapsedSeconds++;
            const mins = Math.floor(workoutElapsedSeconds / 60);
            const secs = workoutElapsedSeconds % 60;
            if (activeModalElapsed) {
                activeModalElapsed.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
        }, 1000);

        renderWorkoutModalExercise();
        if (activeWorkoutDialog) activeWorkoutDialog.showModal();
        playAudioChime('set_complete');
    }

    function renderWorkoutModalExercise() {
        if (activeWorkoutList.length === 0) return;
        const cur = activeWorkoutList[workoutExIndex];
        const catalogItem = getCompleteExerciseCatalog().find(e => e.id === cur.id) || {
            title: cur.customTitle || cur.id,
            category: 'arms',
            focus: cur.focus || 'Target Muscles',
            repsDefault: cur.reps || '3 sets × 12 reps',
            animationSrc: `./assets/${cur.id}.gif`
        };

        const exType = getExerciseType(cur);
        workoutTotalSets = cur.sets || 3;

        if (activeModalExTitle) activeModalExTitle.textContent = catalogItem.title;
        if (modalExCategory) modalExCategory.textContent = (catalogItem.category || 'WORKOUT').toUpperCase();
        if (modalExTypeTag) {
            modalExTypeTag.innerHTML = `<i class="fa-solid ${exType === 'hold' ? 'fa-stopwatch' : 'fa-repeat'}"></i> ${exType === 'hold' ? 'Hold-based' : 'Reps-based'}`;
        }
        if (modalExTargetDisplay) modalExTargetDisplay.textContent = cur.reps || catalogItem.repsDefault;

        if (modalCurrentSetDisplay) {
            modalCurrentSetDisplay.textContent = `Set ${workoutSetNumber} of ${workoutTotalSets}`;
        }
        if (btnModalSetNum) btnModalSetNum.textContent = workoutSetNumber;

        // Progress
        if (activeModalProgress) {
            activeModalProgress.textContent = `${workoutExIndex + 1} / ${activeWorkoutList.length}`;
        }
        if (modalProgressBarFill) {
            const pct = Math.round(((workoutExIndex + 1) / activeWorkoutList.length) * 100);
            modalProgressBarFill.style.width = `${pct}%`;
        }

        // 3D Animation GIF
        if (modalWorkoutAnimationImg) {
            modalWorkoutAnimationImg.style.opacity = '0';
            modalWorkoutAnimationImg.src = catalogItem.animationSrc || `./assets/${cur.id}.gif`;
            modalWorkoutAnimationImg.onload = () => {
                modalWorkoutAnimationImg.style.opacity = '1';
            };
            if (modalWorkoutAnimationImg.complete) {
                modalWorkoutAnimationImg.style.opacity = '1';
            }
        }

        // Configure Stopwatch:
        // The user specifically requested: "The stopwatch will only appear if it is a rep excercise"
        if (modalStopwatchContainer) {
            if (exType === 'reps') {
                modalStopwatchContainer.style.display = 'flex';
                setWorkoutSwMode('stopwatch');
            } else {
                // If it is a hold exercise, countdown mode
                modalStopwatchContainer.style.display = 'flex';
                setWorkoutSwMode('countdown', cur.holdSeconds || 45);
            }
        }

        // Dynamic Calories per set based on user weight
        let userWeight = 70;
        try {
            const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
            if (p && p.weight) userWeight = parseFloat(p.weight);
        } catch (e) {}
        const kcalPerSet = Math.max(10, Math.round(15 * (userWeight / 70)));
        if (setCaloriesIncrement) setCaloriesIncrement.textContent = kcalPerSet;
    }

    function setWorkoutSwMode(mode, targetSec = 0) {
        workoutSwMode = mode;
        resetWorkoutSw();

        if (swModeStopwatchBtn) swModeStopwatchBtn.classList.toggle('active', mode === 'stopwatch');
        if (swModeCountdownBtn) swModeCountdownBtn.classList.toggle('active', mode === 'countdown');

        if (mode === 'stopwatch') {
            if (modalSwModeTag) modalSwModeTag.textContent = 'Count-up';
            if (modalSwPresetsRow) modalSwPresetsRow.style.display = 'none';
            if (modalStopwatchReadout) modalStopwatchReadout.textContent = '00:00.0';
            workoutSwTargetSec = 0;
        } else {
            const sec = targetSec || 45;
            workoutSwTargetSec = sec;
            if (modalSwModeTag) modalSwModeTag.textContent = `${sec}s Countdown`;
            if (modalSwPresetsRow) modalSwPresetsRow.style.display = 'flex';
            if (modalStopwatchReadout) modalStopwatchReadout.textContent = formatMs(sec * 1000);

            if (modalSwPresetsRow) {
                modalSwPresetsRow.querySelectorAll('.stopwatch-preset-chip').forEach(c => {
                    c.classList.toggle('active', parseInt(c.dataset.time, 10) === sec);
                });
            }
        }
    }

    if (swModeStopwatchBtn) swModeStopwatchBtn.addEventListener('click', () => setWorkoutSwMode('stopwatch'));
    if (swModeCountdownBtn) swModeCountdownBtn.addEventListener('click', () => setWorkoutSwMode('countdown', 45));

    if (modalSwPresetsRow) {
        modalSwPresetsRow.querySelectorAll('.stopwatch-preset-chip').forEach(c => {
            c.addEventListener('click', () => {
                const sec = parseInt(c.dataset.time, 10);
                setWorkoutSwMode('countdown', sec);
            });
        });
    }

    function startWorkoutSw() {
        if (workoutSwRunning) return;
        workoutSwRunning = true;
        workoutSwStartTime = performance.now() - workoutSwElapsedMs;

        if (btnModalSwStart) btnModalSwStart.style.display = 'none';
        if (btnModalSwPause) btnModalSwPause.style.display = 'inline-flex';

        clearInterval(workoutSwInterval);
        workoutSwInterval = setInterval(() => {
            const now = performance.now();
            workoutSwElapsedMs = now - workoutSwStartTime;

            if (workoutSwMode === 'countdown') {
                const remainingMs = Math.max(0, (workoutSwTargetSec * 1000) - workoutSwElapsedMs);
                if (modalStopwatchReadout) modalStopwatchReadout.textContent = formatMs(remainingMs);
                if (remainingMs <= 0) {
                    pauseWorkoutSw();
                    playAudioChime('timer_done');
                    modalStopwatchReadout.textContent = '00:00.0';
                }
            } else {
                if (modalStopwatchReadout) modalStopwatchReadout.textContent = formatMs(workoutSwElapsedMs);
            }
        }, 100);
    }

    function pauseWorkoutSw() {
        workoutSwRunning = false;
        clearInterval(workoutSwInterval);
        if (btnModalSwStart) btnModalSwStart.style.display = 'inline-flex';
        if (btnModalSwPause) btnModalSwPause.style.display = 'none';
    }

    function resetWorkoutSw() {
        pauseWorkoutSw();
        workoutSwElapsedMs = 0;
        if (workoutSwMode === 'countdown' && workoutSwTargetSec > 0) {
            if (modalStopwatchReadout) modalStopwatchReadout.textContent = formatMs(workoutSwTargetSec * 1000);
        } else {
            if (modalStopwatchReadout) modalStopwatchReadout.textContent = '00:00.0';
        }
    }

    if (btnModalSwStart) btnModalSwStart.addEventListener('click', startWorkoutSw);
    if (btnModalSwPause) btnModalSwPause.addEventListener('click', pauseWorkoutSw);
    if (btnModalSwReset) btnModalSwReset.addEventListener('click', resetWorkoutSw);

    // ==========================================================================
    // COMPLETE SET ACTION (ONLY WHEN CLICKED: INCREMENTS CALORIES & SHOWS 1-MIN BREAK)
    // ==========================================================================
    if (btnModalCompleteSet) {
        btnModalCompleteSet.addEventListener('click', () => {
            playAudioChime('set_complete');

            // 1. Strict: Calorie meter ONLY increases on completed set!
            let userWeight = 70;
            try {
                const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
                if (p && p.weight) userWeight = parseFloat(p.weight);
            } catch (e) {}
            const setKcal = Math.max(10, Math.round(15 * (userWeight / 70)));
            workoutCaloriesBurned += setKcal;
            if (activeModalKcal) activeModalKcal.textContent = `${workoutCaloriesBurned} kcal`;

            // Reset set stopwatch
            resetWorkoutSw();

            if (workoutSetNumber < workoutTotalSets) {
                // Next set of current exercise
                workoutSetNumber++;
                openBreakModal(`Next: Set ${workoutSetNumber} of ${workoutTotalSets}`);
            } else {
                // Exercise Completed!
                const currentEx = activeWorkoutList[workoutExIndex];
                currentEx.completedToday = true;
                saveMyExercises(activeWorkoutList);

                if (workoutExIndex < activeWorkoutList.length - 1) {
                    workoutExIndex++;
                    workoutSetNumber = 1;
                    const nextEx = activeWorkoutList[workoutExIndex];
                    openBreakModal(`Next: ${nextEx.customTitle || nextEx.id} (Set 1 of ${nextEx.sets || 3})`, 75);
                } else {
                    // All exercises completed!
                    finishActiveWorkout();
                }
            }
        });
    }

    // 1-Minute Break Countdown Popup Logic
    function openBreakModal(nextPreviewText, totalSeconds = 60) {
        breakTotalSec = totalSeconds;
        breakSecondsLeft = totalSeconds;

        if (restNextSetPreview) restNextSetPreview.textContent = nextPreviewText;
        updateBreakUI();

        if (workoutRestModal) workoutRestModal.showModal();

        clearInterval(breakInterval);
        breakInterval = setInterval(() => {
            breakSecondsLeft--;
            updateBreakUI();
            if (breakSecondsLeft <= 0) {
                clearInterval(breakInterval);
                playAudioChime('break_done');
                if (workoutRestModal) workoutRestModal.close();
                renderWorkoutModalExercise();
            }
        }, 1000);
    }

    function updateBreakUI() {
        const mins = Math.floor(breakSecondsLeft / 60);
        const secs = breakSecondsLeft % 60;
        if (restModalCountdown) {
            restModalCountdown.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        if (restProgressFill) {
            const pct = Math.max(0, Math.round((breakSecondsLeft / breakTotalSec) * 100));
            restProgressFill.style.width = `${pct}%`;
        }
    }

    if (btnModalSkipBreak) {
        btnModalSkipBreak.addEventListener('click', () => {
            clearInterval(breakInterval);
            if (workoutRestModal) workoutRestModal.close();
            renderWorkoutModalExercise();
        });
    }

    if (btnModalRestAdd15) {
        btnModalRestAdd15.addEventListener('click', () => {
            breakSecondsLeft += 15;
            breakTotalSec += 15;
            updateBreakUI();
        });
    }

    if (btnModalRestAdd30) {
        btnModalRestAdd30.addEventListener('click', () => {
            breakSecondsLeft += 30;
            breakTotalSec += 30;
            updateBreakUI();
        });
    }

    // Navigation inside workout modal
    if (btnModalPrevEx) {
        btnModalPrevEx.addEventListener('click', () => {
            if (workoutExIndex > 0) {
                workoutExIndex--;
                workoutSetNumber = 1;
                renderWorkoutModalExercise();
            }
        });
    }

    if (btnModalNextEx) {
        btnModalNextEx.addEventListener('click', () => {
            if (workoutExIndex < activeWorkoutList.length - 1) {
                workoutExIndex++;
                workoutSetNumber = 1;
                renderWorkoutModalExercise();
            }
        });
    }

    // Cancel Workout Button with Cyberpunk Confirmation Modal
    if (btnCancelWorkoutModal) {
        btnCancelWorkoutModal.addEventListener('click', async () => {
            const confirmed = await showCyberpunkConfirm({
                title: 'Cancel Workout Session?',
                message: 'Are you sure you want to exit? Your active session progress and elapsed time will be discarded.',
                iconClass: 'fa-triangle-exclamation',
                confirmText: 'Exit Session',
                cancelText: 'Keep Training',
                isDanger: true
            });
            if (confirmed) {
                clearInterval(workoutTimerInterval);
                clearInterval(workoutSwInterval);
                clearInterval(breakInterval);
                if (workoutRestModal && workoutRestModal.open) workoutRestModal.close();
                if (activeWorkoutDialog) activeWorkoutDialog.close();
            }
        });
    }

    // Finish Workout Button with Cyberpunk Confirmation Modal
    if (btnModalFinishWorkout) {
        btnModalFinishWorkout.addEventListener('click', async () => {
            const confirmed = await showCyberpunkConfirm({
                title: 'Finish Workout Session?',
                message: 'Ready to finish? All completed sets and burned calories will be recorded into your daily health HUD.',
                iconClass: 'fa-flag-checkered',
                confirmText: 'Yes, Finish Workout',
                cancelText: 'Keep Working Out',
                isDanger: false
            });
            if (confirmed) {
                finishActiveWorkout();
            }
        });
    }

    async function finishActiveWorkout() {
        clearInterval(workoutTimerInterval);
        clearInterval(workoutSwInterval);
        clearInterval(breakInterval);
        if (workoutRestModal && workoutRestModal.open) workoutRestModal.close();

        const completedMinutes = Math.max(1, Math.round(workoutElapsedSeconds / 60));

        // Mark exercises completed in appropriate routine
        activeWorkoutList.forEach(ex => ex.completedToday = true);
        if (isCurrentSessionHiit) {
            saveHiitExercises(activeWorkoutList);
        } else {
            saveMyExercises(activeWorkoutList);
        }

        // Sync minutes and burned calories to HUD persistence
        const currentSavedMins = parseInt(localStorage.getItem('productometer_health_session_mins') || '0', 10);
        const currentSavedKcal = parseInt(localStorage.getItem('productometer_health_session_calories') || '0', 10);

        localStorage.setItem('productometer_health_session_mins', currentSavedMins + completedMinutes);
        localStorage.setItem('productometer_health_session_calories', currentSavedKcal + workoutCaloriesBurned);

        // Sync Day Planner task if scheduled
        try {
            const rawList = localStorage.getItem('productometer_chrono_planner_list');
            if (rawList) {
                const list = JSON.parse(rawList);
                const healthKeywords = ['workout', 'exercise', 'gym', 'running', 'stretching', 'cardio', 'hiit'];
                const task = list.find(t => t.category === 'health' || (t.title && healthKeywords.some(kw => t.title.toLowerCase().includes(kw))));
                if (task) {
                    task.completed = true;
                    localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(list));
                    syncScheduledHealthSessions();
                }
            }
        } catch (e) {}

        calculateActiveMetrics();
        playAudioChime('timer_done');

        if (activeWorkoutDialog) activeWorkoutDialog.close();

        await showCyberpunkNotice({
            title: 'Workout Completed!',
            message: 'Incredible work! All session metrics and burned calories have been saved.',
            iconClass: 'fa-trophy',
            buttonText: 'Awesome! Back to Hub',
            stats: [
                { label: 'Elapsed Time', value: `${completedMinutes} min`, colorClass: 'text-cyan' },
                { label: 'Calories Burned', value: `${workoutCaloriesBurned} kcal`, colorClass: 'text-neon-orange' },
                { label: 'Exercises Done', value: `${activeWorkoutList.length}`, colorClass: 'text-emerald' }
            ]
        });
    }

    if (btnOpenWorkoutDialog) {
        btnOpenWorkoutDialog.addEventListener('click', openActiveWorkoutModal);
    }

    // ==========================================================================
    // 14. RUNNING MODULE: GPS DISTANCE CALCULATOR, STOPWATCH & PEDOMETER
    // ==========================================================================
    const runningTimerDisplay = document.getElementById('runningTimerDisplay');
    const runningDistanceDisplay = document.getElementById('runningDistanceDisplay');
    const runningStepsDisplay = document.getElementById('runningStepsDisplay');
    const runningPaceDisplay = document.getElementById('runningPaceDisplay');
    const runningKcalDisplay = document.getElementById('runningKcalDisplay');
    const runningGpsStatusBadge = document.getElementById('runningGpsStatusBadge');

    const btnStartRun = document.getElementById('btnStartRun');
    const btnPauseRun = document.getElementById('btnPauseRun');
    const btnFinishRun = document.getElementById('btnFinishRun');
    const btnResetRun = document.getElementById('btnResetRun');

    let runRunning = false;
    let runElapsedMs = 0;
    let runStartTime = 0;
    let runTimerInterval = null;

    let runDistanceKm = 0;
    let runSteps = 0;
    let runWatchId = null;
    let lastGpsLat = null;
    let lastGpsLng = null;

    function calcHaversine(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function startRunTracking() {
        if (runRunning) return;
        runRunning = true;
        runStartTime = performance.now() - runElapsedMs;

        if (btnStartRun) btnStartRun.style.display = 'none';
        if (btnPauseRun) btnPauseRun.style.display = 'inline-flex';
        if (btnFinishRun) btnFinishRun.style.display = 'inline-flex';

        clearInterval(runTimerInterval);
        runTimerInterval = setInterval(() => {
            runElapsedMs = performance.now() - runStartTime;
            if (runningTimerDisplay) runningTimerDisplay.textContent = formatMs(runElapsedMs);

            // Sync with Native Hardware Step Counter if available
            if (window.NativeBridge && window.NativeBridge.isAvailable()) {
                const hwSteps = window.NativeBridge.getStepCount();
                if (hwSteps > 0 && hwSteps > runSteps) {
                    runSteps = hwSteps;
                    if (runDistanceKm === 0 || runDistanceKm < (runSteps * 0.00075)) {
                        runDistanceKm = parseFloat((runSteps * 0.00075).toFixed(2));
                    }
                }
            }
            updateRunTelemetry();
        }, 150);

        // Start GPS Geolocation Tracking
        if ('geolocation' in navigator) {
            if (runningGpsStatusBadge) {
                runningGpsStatusBadge.className = 'gps-status-badge tracking';
                runningGpsStatusBadge.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> <span>GPS Tracking</span>';
            }
            try {
                runWatchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        if (lastGpsLat !== null && lastGpsLng !== null) {
                            const delta = calcHaversine(lastGpsLat, lastGpsLng, lat, lng);
                            if (delta > 0.003) { // Filter jitter (< 3 meters)
                                runDistanceKm += delta;
                                runSteps = Math.round(runDistanceKm * 1320);
                                updateRunTelemetry();
                            }
                        }
                        lastGpsLat = lat;
                        lastGpsLng = lng;
                    },
                    (err) => {
                        console.warn('GPS notice:', err.message);
                    },
                    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
                );
            } catch (e) {}
        }
    }

    function pauseRunTracking() {
        runRunning = false;
        clearInterval(runTimerInterval);
        if (runWatchId !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(runWatchId);
            runWatchId = null;
        }
        if (runningGpsStatusBadge) {
            runningGpsStatusBadge.className = 'gps-status-badge';
            runningGpsStatusBadge.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> <span>GPS Paused</span>';
        }
        if (btnStartRun) btnStartRun.style.display = 'inline-flex';
        if (btnPauseRun) btnPauseRun.style.display = 'none';
    }

    function resetRunTracking() {
        pauseRunTracking();
        runElapsedMs = 0;
        runDistanceKm = 0;
        runSteps = 0;
        if (window.NativeBridge && window.NativeBridge.isAvailable()) {
            window.NativeBridge.resetStepCount();
        }
        lastGpsLat = null;
        lastGpsLng = null;

        if (runningTimerDisplay) runningTimerDisplay.textContent = '00:00.0';
        if (runningDistanceDisplay) runningDistanceDisplay.textContent = '0.00';
        if (runningStepsDisplay) runningStepsDisplay.textContent = '0';
        if (runningPaceDisplay) runningPaceDisplay.textContent = `0'00"`;
        if (runningKcalDisplay) runningKcalDisplay.textContent = '0';

        if (btnFinishRun) btnFinishRun.style.display = 'none';
    }

    function updateRunTelemetry() {
        if (runningDistanceDisplay) runningDistanceDisplay.textContent = runDistanceKm.toFixed(2);
        if (runningStepsDisplay) runningStepsDisplay.textContent = runSteps;

        // Calculate Pace (min/km)
        const elapsedMinutes = (runElapsedMs / 1000) / 60;
        if (runDistanceKm > 0.05 && runningPaceDisplay) {
            const paceMinPerKm = elapsedMinutes / runDistanceKm;
            const paceM = Math.floor(paceMinPerKm);
            const paceS = Math.floor((paceMinPerKm - paceM) * 60);
            runningPaceDisplay.textContent = `${paceM}'${String(paceS).padStart(2, '0')}"`;
        }

        // Calculate Running Calories (Requires mechanical movement: distance or steps!)
        let userWeight = 70;
        try {
            const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
            if (p && p.weight) userWeight = parseFloat(p.weight);
        } catch (e) {}

        let runKcal = 0;
        if (runDistanceKm > 0.01) {
            // Running distance: ~1.036 kcal / kg / km
            runKcal = Math.round(runDistanceKm * userWeight * 1.036);
        } else if (runSteps > 10) {
            // Pedometer cadence: ~0.045 kcal per step
            runKcal = Math.round(runSteps * 0.045 * (userWeight / 70));
        } else {
            // Stationary: exactly 0 kcal without moving!
            runKcal = 0;
        }
        if (runningKcalDisplay) runningKcalDisplay.textContent = runKcal;
    }

    if (btnStartRun) btnStartRun.addEventListener('click', startRunTracking);
    if (btnPauseRun) btnPauseRun.addEventListener('click', pauseRunTracking);
    if (btnResetRun) btnResetRun.addEventListener('click', resetRunTracking);

    if (btnFinishRun) {
        btnFinishRun.addEventListener('click', async () => {
            const elapsedMins = Math.max(1, Math.round((runElapsedMs / 1000) / 60));
            let userWeight = 70;
            try {
                const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
                if (p && p.weight) userWeight = parseFloat(p.weight);
            } catch (e) {}

            let runKcal = 0;
            if (runDistanceKm > 0.01) {
                runKcal = Math.round(runDistanceKm * userWeight * 1.036);
            } else if (runSteps > 10) {
                runKcal = Math.round(runSteps * 0.045 * (userWeight / 70));
            } else {
                runKcal = 0;
            }

            const curMins = parseInt(localStorage.getItem('productometer_health_session_mins') || '0', 10);
            const curKcal = parseInt(localStorage.getItem('productometer_health_session_calories') || '0', 10);
            localStorage.setItem('productometer_health_session_mins', curMins + elapsedMins);
            localStorage.setItem('productometer_health_session_calories', curKcal + runKcal);

            calculateActiveMetrics();
            playAudioChime('timer_done');

            await showCyberpunkNotice({
                title: 'Run Finished!',
                message: 'Great cardiovascular effort! GPS telemetry and calories have been logged.',
                iconClass: 'fa-person-running',
                buttonText: 'Save & Return',
                stats: [
                    { label: 'Run Time', value: `${elapsedMins} min`, colorClass: 'text-cyan' },
                    { label: 'GPS Distance', value: `${runDistanceKm.toFixed(2)} km`, colorClass: 'text-emerald' },
                    { label: 'Calories', value: `${runKcal} kcal`, colorClass: 'text-neon-orange' }
                ]
            });

            resetRunTracking();
        });
    }

    // ==========================================================================
    // 15. HIITS MODULE: TABATA SPRINT ENGINE & CURATED EXERCISES
    // ==========================================================================
    const sprintRoundDisplay = document.getElementById('sprintRoundDisplay');
    const sprintPhaseBanner = document.getElementById('sprintPhaseBanner');
    const sprintPhaseText = document.getElementById('sprintPhaseText');
    const sprintTimerDisplay = document.getElementById('sprintTimerDisplay');

    const sprintWorkDuration = document.getElementById('sprintWorkDuration');
    const sprintRestDuration = document.getElementById('sprintRestDuration');
    const sprintTotalRounds = document.getElementById('sprintTotalRounds');

    const btnStartSprint = document.getElementById('btnStartSprint');
    const btnPauseSprint = document.getElementById('btnPauseSprint');
    const btnResetSprint = document.getElementById('btnResetSprint');
    const hiitExercisesBucket = document.getElementById('hiitExercisesBucket');

    let sprintRunning = false;
    let sprintRound = 1;
    let sprintMaxRounds = 8;
    let sprintPhase = 'work'; // 'work' or 'rest'
    let sprintSecondsLeft = 20;
    let sprintInterval = null;

    function syncSprintSettings() {
        if (sprintTotalRounds) {
            sprintMaxRounds = parseInt(sprintTotalRounds.value, 10) || 8;
        }
        if (!sprintRunning && sprintRound === 1 && sprintPhase === 'work' && sprintWorkDuration) {
            sprintSecondsLeft = parseInt(sprintWorkDuration.value, 10) || 20;
        }
        updateSprintBannerUI();
    }

    function startSprintIntervals() {
        if (sprintRunning) return;
        sprintRunning = true;

        if (btnStartSprint) btnStartSprint.style.display = 'none';
        if (btnPauseSprint) btnPauseSprint.style.display = 'inline-flex';

        syncSprintSettings();
        const workSec = parseInt(sprintWorkDuration ? sprintWorkDuration.value : 20, 10);
        const restSec = parseInt(sprintRestDuration ? sprintRestDuration.value : 10, 10);

        if (sprintSecondsLeft <= 0 || (sprintRound === 1 && sprintPhase === 'work')) {
            sprintSecondsLeft = workSec;
        }

        playAudioChime('sprint_whistle');
        updateSprintBannerUI();

        clearInterval(sprintInterval);
        sprintInterval = setInterval(() => {
            sprintSecondsLeft--;
            if (sprintTimerDisplay) {
                const s = Math.max(0, sprintSecondsLeft);
                sprintTimerDisplay.textContent = `00:${String(s).padStart(2, '0')}.0`;
            }

            if (sprintSecondsLeft <= 0) {
                if (sprintPhase === 'work') {
                    // Switch to Rest
                    sprintPhase = 'rest';
                    sprintSecondsLeft = restSec;
                    playAudioChime('notification');
                    updateSprintBannerUI();
                } else {
                    // Rest finished -> Advance round
                    if (sprintRound < sprintMaxRounds) {
                        sprintRound++;
                        sprintPhase = 'work';
                        sprintSecondsLeft = workSec;
                        playAudioChime('sprint_whistle');
                        updateSprintBannerUI();
                    } else {
                        // All rounds complete!
                        finishSprintSession();
                    }
                }
            }
        }, 1000);
    }

    function updateSprintBannerUI() {
        if (sprintRoundDisplay) sprintRoundDisplay.textContent = `Round ${sprintRound} / ${sprintMaxRounds}`;
        if (sprintPhaseBanner) {
            if (sprintPhase === 'work') {
                sprintPhaseBanner.className = 'sprint-phase-banner sprint-work';
                if (sprintPhaseText) sprintPhaseText.textContent = '⚡ ALL-OUT SPRINT';
            } else {
                sprintPhaseBanner.className = 'sprint-phase-banner sprint-rest';
                if (sprintPhaseText) sprintPhaseText.textContent = '❄️ WALK / REST';
            }
        }
        if (sprintTimerDisplay) {
            sprintTimerDisplay.textContent = `00:${String(sprintSecondsLeft).padStart(2, '0')}.0`;
        }
    }

    function pauseSprintIntervals() {
        sprintRunning = false;
        clearInterval(sprintInterval);
        if (btnStartSprint) btnStartSprint.style.display = 'inline-flex';
        if (btnPauseSprint) btnPauseSprint.style.display = 'none';
    }

    function resetSprintIntervals() {
        pauseSprintIntervals();
        sprintRound = 1;
        sprintPhase = 'work';
        syncSprintSettings();
    }

    async function finishSprintSession() {
        pauseSprintIntervals();
        playAudioChime('timer_done');

        const workSec = parseInt(sprintWorkDuration ? sprintWorkDuration.value : 20, 10);
        const restSec = parseInt(sprintRestDuration ? sprintRestDuration.value : 10, 10);
        const totalDurationMins = Math.max(1, Math.round((sprintMaxRounds * (workSec + restSec)) / 60));

        let userWeight = 70;
        try {
            const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
            if (p && p.weight) userWeight = parseFloat(p.weight);
        } catch (e) {}
        const sprintKcal = Math.round((12.0 * 3.5 * userWeight / 200) * totalDurationMins);

        const curMins = parseInt(localStorage.getItem('productometer_health_session_mins') || '0', 10);
        const curKcal = parseInt(localStorage.getItem('productometer_health_session_calories') || '0', 10);
        localStorage.setItem('productometer_health_session_mins', curMins + totalDurationMins);
        localStorage.setItem('productometer_health_session_calories', curKcal + sprintKcal);

        calculateActiveMetrics();

        await showCyberpunkNotice({
            title: 'Sprint Tabata Crushed!',
            message: 'High-intensity interval sprints completed with maximum heart rate drive!',
            iconClass: 'fa-bolt',
            buttonText: 'Awesome! Back to Hub',
            stats: [
                { label: 'Rounds', value: `${sprintMaxRounds} Rounds`, colorClass: 'text-yellow' },
                { label: 'Duration', value: `${totalDurationMins} min`, colorClass: 'text-cyan' },
                { label: 'Calories', value: `${sprintKcal} kcal`, colorClass: 'text-neon-orange' }
            ]
        });

        resetSprintIntervals();
    }

    if (btnStartSprint) btnStartSprint.addEventListener('click', startSprintIntervals);
    if (btnPauseSprint) btnPauseSprint.addEventListener('click', pauseSprintIntervals);
    if (btnResetSprint) btnResetSprint.addEventListener('click', resetSprintIntervals);

    if (sprintTotalRounds) sprintTotalRounds.addEventListener('change', syncSprintSettings);
    if (sprintWorkDuration) sprintWorkDuration.addEventListener('change', syncSprintSettings);
    if (sprintRestDuration) sprintRestDuration.addEventListener('change', syncSprintSettings);

    // Initial sync of sprint settings
    syncSprintSettings();

    // Treadmill / Indoor Pedometer click support
    if (runningStepsDisplay && runningStepsDisplay.parentElement) {
        runningStepsDisplay.parentElement.style.cursor = 'pointer';
        runningStepsDisplay.parentElement.title = 'Treadmill / Indoor: Click while running to record steps';
        runningStepsDisplay.parentElement.addEventListener('click', () => {
            if (runRunning) {
                runSteps += 50;
                if (runDistanceKm === 0) {
                    runDistanceKm = parseFloat((runSteps * 0.00076).toFixed(2));
                }
                updateRunTelemetry();
            }
        });
    }

    // ==========================================================================
    // HIIT ROUTINE & EXPLOSIVE CIRCUIT ENGINE
    // ==========================================================================
    const hiitRoutineBucket = document.getElementById('hiitRoutineBucket');
    const hiitRoutineCount = document.getElementById('hiitRoutineCount');
    const hiitEstDuration = document.getElementById('hiitEstDuration');
    const hiitEstBurn = document.getElementById('hiitEstBurn');
    const btnOpenHiitWorkoutDialog = document.getElementById('btnOpenHiitWorkoutDialog');

    function getHiitExercises() {
        const saved = localStorage.getItem('productometer_hiit_exercises');
        if (saved !== null) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        // Clean default starting explosive HIIT circuit
        const initial = [
            {
                id: 'burpees',
                customTitle: 'Full-Body Athletic Burpees',
                focus: 'Full Body Conditioning, Chest, Quads & Core',
                reps: '4 sets × 12 reps',
                sets: 4,
                repsCount: 12,
                holdSeconds: 45,
                type: 'reps',
                completedToday: false
            },
            {
                id: 'mountain_climbers',
                customTitle: 'Dynamic Mountain Climbers',
                focus: 'Rectus Abdominis, Hip Flexors & Cardio Endurance',
                reps: '3 sets × 45 sec hold',
                sets: 3,
                repsCount: 12,
                holdSeconds: 45,
                type: 'hold',
                completedToday: false
            },
            {
                id: 'high_knees',
                customTitle: 'Sprint High Knees in Place',
                focus: 'Cardiovascular Drive, Hip Flexors & Calves',
                reps: '3 sets × 30 sec hold',
                sets: 3,
                repsCount: 12,
                holdSeconds: 30,
                type: 'hold',
                completedToday: false
            }
        ];
        localStorage.setItem('productometer_hiit_exercises', JSON.stringify(initial));
        return initial;
    }

    function saveHiitExercises(list) {
        localStorage.setItem('productometer_hiit_exercises', JSON.stringify(list));
        renderHiitRoutine();
        renderHIITBucket();
        calculateActiveMetrics();
    }

    function renderHiitRoutine() {
        if (!hiitRoutineBucket) return;
        hiitRoutineBucket.innerHTML = '';

        const hiitExercises = getHiitExercises();

        if (hiitRoutineCount) hiitRoutineCount.textContent = hiitExercises.length;
        const estMinutes = hiitExercises.length * 4;
        if (hiitEstDuration) hiitEstDuration.textContent = `${estMinutes} min`;

        let userWeight = 70;
        try {
            const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
            if (p && p.weight) userWeight = parseFloat(p.weight);
        } catch (e) {}
        const estKcal = Math.round((11.5 * 3.5 * userWeight / 200) * estMinutes);
        if (hiitEstBurn) hiitEstBurn.textContent = `${estKcal} kcal`;

        if (hiitExercises.length === 0) {
            hiitRoutineBucket.innerHTML = `
                <div class="empty-sessions-placeholder">
                    No HIIT exercises in your routine yet.<br>
                    Tap <strong>[+ Add]</strong> from the Explosive HIIT Library below to build your circuit!
                </div>
            `;
            return;
        }

        hiitExercises.forEach((ex, index) => {
            const found = getCompleteExerciseCatalog().find(item => item.id === ex.id);
            const title = ex.customTitle || (found ? found.title : ex.id);
            const focus = ex.focus || (found ? found.focus : 'HIIT Full Body');
            const reps = ex.reps || (found ? found.repsDefault : '3 sets × 12 reps');

            const card = document.createElement('div');
            card.className = `my-exercise-card ${ex.completedToday ? 'exercise-done' : ''}`;

            card.innerHTML = `
                <div class="ex-card-main">
                    <div class="ex-title-row">
                        <span class="ex-title-text">${title}</span>
                        <span class="exercise-type-tag hiit-tag"><i class="fa-solid fa-bolt"></i> HIIT</span>
                    </div>
                    <span class="ex-focus-caption">${focus}</span>
                    <span class="ex-reps-badge"><i class="fa-solid fa-fire"></i> ${reps}</span>
                </div>
                <div class="ex-actions-cell">
                    <button type="button" class="btn-ex-view" data-id="${ex.id}" title="View Form">
                        <i class="fa-solid fa-play"></i> Form
                    </button>
                    <button type="button" class="btn-ex-adjust" data-index="${index}" title="Edit Sets & Reps">
                        <i class="fa-solid fa-sliders"></i>
                    </button>
                    <button type="button" class="btn-ex-delete" data-index="${index}" title="Remove from HIIT Routine">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            card.querySelector('.btn-ex-view').addEventListener('click', () => {
                if (found) {
                    openExerciseDetailModal(found);
                } else {
                    openExerciseDetailModal({
                        id: ex.id,
                        title: title,
                        category: 'cardio',
                        focus: focus,
                        repsDefault: reps,
                        animationSrc: './assets/pushups.gif',
                        formCues: ['Maintain high explosive cadence.', 'Keep core locked and breathe rhythmically.']
                    });
                }
            });

            card.querySelector('.btn-ex-adjust').addEventListener('click', () => {
                openAdjustDialog(found || ex, 'hiit');
            });

            card.querySelector('.btn-ex-delete').addEventListener('click', async () => {
                const confirmed = await showCyberpunkConfirm({
                    title: 'Remove HIIT Exercise?',
                    message: `Remove "${title}" from today's HIIT circuit?`,
                    iconClass: 'fa-trash-can',
                    confirmText: 'Remove',
                    cancelText: 'Keep',
                    isDanger: true
                });
                if (confirmed) {
                    const updatedList = getHiitExercises();
                    updatedList.splice(index, 1);
                    saveHiitExercises(updatedList);
                }
            });

            hiitRoutineBucket.appendChild(card);
        });
    }

    if (btnOpenHiitWorkoutDialog) {
        btnOpenHiitWorkoutDialog.addEventListener('click', () => openActiveWorkoutModal(true));
    }

    function renderHIITBucket() {
        if (!hiitExercisesBucket) return;
        hiitExercisesBucket.innerHTML = '';

        const hiitKeys = ['burpees', 'mountain_climbers', 'jumping_jacks', 'high_knees', 'box_jumps', 'bodyweight_squats', 'plank_hold', 'side_plank'];
        const allExercises = getCompleteExerciseCatalog();
        const hiitItems = [];

        hiitKeys.forEach(k => {
            const found = allExercises.find(ex => ex.id === k);
            if (found) hiitItems.push(found);
        });

        allExercises.forEach(ex => {
            if (ex.category === 'cardio' && !hiitItems.some(h => h.id === ex.id)) {
                hiitItems.push(ex);
            }
        });

        const currentHiitList = getHiitExercises();

        hiitItems.forEach(item => {
            const isInRoutine = currentHiitList.some(h => h.id === item.id);
            const card = document.createElement('div');
            card.className = 'my-exercise-card';
            card.innerHTML = `
                <div class="ex-card-main">
                    <div class="ex-title-row">
                        <span class="ex-title-text">${item.title}</span>
                        <span class="exercise-type-tag hiit-tag"><i class="fa-solid fa-bolt"></i> HIIT</span>
                    </div>
                    <span class="ex-focus-caption">${item.focus}</span>
                    <span class="ex-reps-badge"><i class="fa-solid fa-fire"></i> ${item.repsDefault}</span>
                </div>
                <div class="ex-actions-cell">
                    <button type="button" class="btn-ex-view" data-id="${item.id}" title="View 3D Form">
                        <i class="fa-solid fa-play"></i> Form
                    </button>
                    <button type="button" class="btn-ex-adjust add-hiit-btn ${isInRoutine ? 'in-routine' : ''}" data-id="${item.id}" title="${isInRoutine ? 'In HIIT Routine (Tap to edit)' : 'Add to HIIT Routine'}">
                        <i class="fa-solid ${isInRoutine ? 'fa-check' : 'fa-plus'}"></i> ${isInRoutine ? 'Added' : 'Add'}
                    </button>
                </div>
            `;
            card.querySelector('.btn-ex-view').addEventListener('click', () => openExerciseDetailModal(item));
            card.querySelector('.add-hiit-btn').addEventListener('click', () => openAdjustDialog(item, 'hiit'));
            hiitExercisesBucket.appendChild(card);
        });
    }

    // ==========================================================================
    // 16. WEEKLY SPLIT PROTOCOL SCHEDULER (MON - SUN)
    // ==========================================================================
    const weeklyDaysGrid = document.getElementById('weeklyDaysGrid');
    const dayProtocolDialog = document.getElementById('dayProtocolDialog');
    const protocolDayTitle = document.getElementById('protocolDayTitle');
    const protocolOptionsList = document.getElementById('protocolOptionsList');

    const defaultWeeklySplit = {
        monday: 'workout',
        tuesday: 'running',
        wednesday: 'stretching',
        thursday: 'workout',
        friday: 'hiit',
        saturday: 'workout',
        sunday: 'rest'
    };

    const protocolMeta = {
        workout: { label: 'Workout', icon: 'fa-dumbbell', class: 'proto-workout' },
        running: { label: 'Running', icon: 'fa-person-running', class: 'proto-running' },
        stretching: { label: 'Stretch', icon: 'fa-child-reaching', class: 'proto-stretching' },
        hiit: { label: 'HIIT', icon: 'fa-bolt', class: 'proto-hiit' },
        rest: { label: 'Rest', icon: 'fa-bed', class: 'proto-rest' }
    };

    let selectedDayToEdit = null;

    function getWeeklySplit() {
        const saved = localStorage.getItem('productometer_weekly_split');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return defaultWeeklySplit;
    }

    function saveWeeklySplit(split) {
        localStorage.setItem('productometer_weekly_split', JSON.stringify(split));
        renderWeeklyGrid();
    }

    function renderWeeklyGrid() {
        if (!weeklyDaysGrid) return;
        weeklyDaysGrid.innerHTML = '';

        const split = getWeeklySplit();
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayInitials = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        const todayIdx = new Date().getDay();
        const adjustedTodayIdx = (todayIdx === 0) ? 6 : todayIdx - 1;

        days.forEach((dayKey, idx) => {
            const protoKey = split[dayKey] || 'workout';
            const meta = protocolMeta[protoKey] || protocolMeta.workout;
            const isToday = (idx === adjustedTodayIdx);

            const dayCard = document.createElement('div');
            dayCard.className = `week-day-card ${isToday ? 'current-day' : ''}`;
            dayCard.dataset.day = dayKey;

            dayCard.innerHTML = `
                <div class="day-initial">${dayInitials[idx]}</div>
                <div class="day-proto-icon ${meta.class}"><i class="fa-solid ${meta.icon}"></i></div>
                <div class="day-proto-tag">${meta.label}</div>
                ${isToday ? '<span class="today-marker-dot"></span>' : ''}
            `;

            dayCard.addEventListener('click', () => {
                selectedDayToEdit = dayKey;
                if (protocolDayTitle) {
                    protocolDayTitle.textContent = `Edit ${dayInitials[idx]} Split`;
                }
                dayProtocolDialog.showModal();
            });

            weeklyDaysGrid.appendChild(dayCard);
        });
    }

    if (protocolOptionsList) {
        protocolOptionsList.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!selectedDayToEdit) return;
                const proto = btn.dataset.proto;
                const split = getWeeklySplit();
                split[selectedDayToEdit] = proto;
                saveWeeklySplit(split);
                dayProtocolDialog.close();
                checkScheduledWorkoutNotifications();
            });
        });
    }

    // ==========================================================================


    // ==========================================================================
    // 🥗 17. GAMIFIED DIET & MACRO CALCULATOR ENGINE (INTERACTIVE PIE & FOOD LIBRARY)
    // ==========================================================================
    const btnOpenDietCalculator = document.getElementById('btnOpenDietCalculator');
    const dietCalculatorModal = document.getElementById('dietCalculatorModal');
    const btnCloseDietModal = document.getElementById('btnCloseDietModal');

    const dietBiometricsRefText = document.getElementById('dietBiometricsRefText');
    const dietTargetCalories = document.getElementById('dietTargetCalories');
    const dietBmrDisplay = document.getElementById('dietBmrDisplay');
    const dietConsumedCalories = document.getElementById('dietConsumedCalories');
    const dietRemainingCalories = document.getElementById('dietRemainingCalories');

    const dietPieDropZone = document.getElementById('dietPieDropZone');
    const pieSliceCarbs = document.getElementById('pieSliceCarbs');
    const pieSliceProtein = document.getElementById('pieSliceProtein');
    const pieSliceFat = document.getElementById('pieSliceFat');

    const pieCenterConsumed = document.getElementById('pieCenterConsumed');
    const pieCenterTarget = document.getElementById('pieCenterTarget');
    const pieCenterStatus = document.getElementById('pieCenterStatus');

    const macroCarbPercent = document.getElementById('macroCarbPercent');
    const macroCarbBar = document.getElementById('macroCarbBar');
    const macroCarbVal = document.getElementById('macroCarbVal');
    const macroCarbTarget = document.getElementById('macroCarbTarget');
    const macroCarbKcal = document.getElementById('macroCarbKcal');

    const macroProPercent = document.getElementById('macroProPercent');
    const macroProBar = document.getElementById('macroProBar');
    const macroProVal = document.getElementById('macroProVal');
    const macroProTarget = document.getElementById('macroProTarget');
    const macroProKcal = document.getElementById('macroProKcal');

    const macroFatPercent = document.getElementById('macroFatPercent');
    const macroFatBar = document.getElementById('macroFatBar');
    const macroFatVal = document.getElementById('macroFatVal');
    const macroFatTarget = document.getElementById('macroFatTarget');
    const macroFatKcal = document.getElementById('macroFatKcal');

    const regularFoodsTray = document.getElementById('regularFoodsTray');
    const dailyDietLogList = document.getElementById('dailyDietLogList');
    const btnClearDietLog = document.getElementById('btnClearDietLog');
    const btnOpenFoodLibrary = document.getElementById('btnOpenFoodLibrary');

    const foodQuantityModal = document.getElementById('foodQuantityModal');
    const qtyFoodIcon = document.getElementById('qtyFoodIcon');
    const qtyFoodTitle = document.getElementById('qtyFoodTitle');
    const qtyFoodServingBase = document.getElementById('qtyFoodServingBase');
    const foodQuantityInput = document.getElementById('foodQuantityInput');
    const btnDecFoodQty = document.getElementById('btnDecFoodQty');
    const btnIncFoodQty = document.getElementById('btnIncFoodQty');
    const qtyCalcCalories = document.getElementById('qtyCalcCalories');
    const qtyCalcCarbs = document.getElementById('qtyCalcCarbs');
    const qtyCalcProtein = document.getElementById('qtyCalcProtein');
    const qtyCalcFat = document.getElementById('qtyCalcFat');
    const btnConfirmFeedFood = document.getElementById('btnConfirmFeedFood');

    const foodLibraryModal = document.getElementById('foodLibraryModal');
    const foodSearchInput = document.getElementById('foodSearchInput');
    const foodCategoryFilters = document.getElementById('foodCategoryFilters');
    const foodLibraryGrid = document.getElementById('foodLibraryGrid');
    const btnOpenCustomFood = document.getElementById('btnOpenCustomFood');
    const customFoodModal = document.getElementById('customFoodModal');
    const customFoodForm = document.getElementById('customFoodForm');

    // --- COMPLETE FOOD NUTRITION DATABASE (COMBINED STAPLES & SIMILARS) ---
    const initialFoodCatalog = [
        // STAPLES: ROTI & RICE GROUP (TOP PRIORITY)
        {
            id: 'roti_wheat',
            name: 'Roti / Chapati / Phulka',
            category: 'staples',
            icon: '🫓',
            unit: '1 Piece (35g)',
            carbs: 25,
            protein: 3.5,
            fat: 0.5,
            calories: 115
        },
        {
            id: 'plain_paratha',
            name: 'Plain Tawa Paratha',
            category: 'staples',
            icon: '🫓',
            unit: '1 Paratha (50g)',
            carbs: 30,
            protein: 4,
            fat: 7,
            calories: 200
        },
        {
            id: 'steamed_rice',
            name: 'Steamed Rice (White/Brown)',
            category: 'staples',
            icon: '🍚',
            unit: '1 Medium Bowl (150g)',
            carbs: 43,
            protein: 4,
            fat: 0.5,
            calories: 195
        },
        {
            id: 'poha_cooked',
            name: 'Poha / Flattened Rice',
            category: 'staples',
            icon: '🥣',
            unit: '1 Medium Bowl (150g)',
            carbs: 38,
            protein: 3.5,
            fat: 2,
            calories: 180
        },
        {
            id: 'murmura_puffed',
            name: 'Murmura / Puffed Rice',
            category: 'staples',
            icon: '🥣',
            unit: '1 Bowl (50g)',
            carbs: 36,
            protein: 3,
            fat: 0.5,
            calories: 150
        },

        // HIGH PROTEIN & SOYA
        {
            id: 'soya_chunks',
            name: 'Soya Chunks / Nutrela',
            category: 'protein',
            icon: '🫘',
            unit: '50g Dry (High Protein)',
            carbs: 16,
            protein: 26,
            fat: 0.5,
            calories: 175
        },
        {
            id: 'paneer_fresh',
            name: 'Fresh Paneer / Cottage Cheese',
            category: 'dairy',
            icon: '🧀',
            unit: '100g Portion',
            carbs: 4,
            protein: 18,
            fat: 20,
            calories: 265
        },
        {
            id: 'organic_tofu',
            name: 'Organic Tofu',
            category: 'protein',
            icon: '🧊',
            unit: '100g Block',
            carbs: 2,
            protein: 10,
            fat: 5,
            calories: 85
        },
        {
            id: 'chicken_breast',
            name: 'Cooked Chicken Breast',
            category: 'protein',
            icon: '🍗',
            unit: '100g Fillet',
            carbs: 0,
            protein: 31,
            fat: 3.6,
            calories: 165
        },
        {
            id: 'whey_protein',
            name: 'Whey Protein Isolate',
            category: 'protein',
            icon: '🥤',
            unit: '1 Scoop (30g)',
            carbs: 2.5,
            protein: 25,
            fat: 1.5,
            calories: 125
        },
        {
            id: 'whole_egg',
            name: 'Whole Boiled Egg',
            category: 'protein',
            icon: '🥚',
            unit: '1 Egg (50g)',
            carbs: 0.5,
            protein: 6.5,
            fat: 5,
            calories: 75
        },
        {
            id: 'egg_whites',
            name: 'Egg Whites',
            category: 'protein',
            icon: '🍳',
            unit: '3 Egg Whites',
            carbs: 0.5,
            protein: 11,
            fat: 0.2,
            calories: 50
        },

        // DAIRY & MILK
        {
            id: 'milk_cow',
            name: 'Cow Milk / Toned Milk',
            category: 'dairy',
            icon: '🥛',
            unit: '1 Glass (250ml)',
            carbs: 12,
            protein: 8,
            fat: 8,
            calories: 150
        },
        {
            id: 'curd_dahi',
            name: 'Fresh Dahi / Curd',
            category: 'dairy',
            icon: '🥣',
            unit: '1 Bowl (150g)',
            carbs: 7,
            protein: 6,
            fat: 5,
            calories: 100
        },

        // DAL & LENTILS
        {
            id: 'mixed_dal',
            name: 'Cooked Dal (Moong / Masoor / Toor)',
            category: 'lentils',
            icon: '🥣',
            unit: '1 Bowl (150g)',
            carbs: 20,
            protein: 9,
            fat: 2.5,
            calories: 140
        },
        {
            id: 'sprouts_chana',
            name: 'Kala Chana / Boiled Sprouts',
            category: 'lentils',
            icon: '🌱',
            unit: '1 Cup (100g)',
            carbs: 22,
            protein: 10,
            fat: 2,
            calories: 145
        },

        // GRAINS & OATS
        {
            id: 'rolled_oats',
            name: 'Rolled Oats (Cooked)',
            category: 'grains',
            icon: '🥣',
            unit: '1 Bowl (50g dry)',
            carbs: 34,
            protein: 7,
            fat: 3,
            calories: 190
        },
        {
            id: 'wheat_bread',
            name: 'Whole Wheat Bread Toast',
            category: 'grains',
            icon: '🍞',
            unit: '2 Slices',
            carbs: 26,
            protein: 6,
            fat: 1.5,
            calories: 140
        },

        // NUTS & HEALTHY FATS
        {
            id: 'desi_ghee',
            name: 'Pure Desi Ghee / Oil',
            category: 'fats',
            icon: '🧈',
            unit: '1 tsp (5g)',
            carbs: 0,
            protein: 0,
            fat: 5,
            calories: 45
        },
        {
            id: 'peanut_butter',
            name: 'Natural Peanut Butter',
            category: 'fats',
            icon: '🥜',
            unit: '1 tbsp (16g)',
            carbs: 3,
            protein: 4,
            fat: 8,
            calories: 95
        },
        {
            id: 'raw_almonds',
            name: 'Raw Almonds / Walnuts',
            category: 'fats',
            icon: '🌰',
            unit: '1 Handful (25g)',
            carbs: 5,
            protein: 5.5,
            fat: 13,
            calories: 150
        },

        // FRUITS & GREENS
        {
            id: 'banana_fresh',
            name: 'Fresh Banana',
            category: 'fruits',
            icon: '🍌',
            unit: '1 Medium (110g)',
            carbs: 27,
            protein: 1.2,
            fat: 0.3,
            calories: 105
        },
        {
            id: 'apple_fresh',
            name: 'Crisp Apple',
            category: 'fruits',
            icon: '🍎',
            unit: '1 Medium (150g)',
            carbs: 21,
            protein: 0.5,
            fat: 0.3,
            calories: 80
        },
        {
            id: 'green_salad',
            name: 'Green Salad (Cucumber, Tomato, Greens)',
            category: 'fruits',
            icon: '🥗',
            unit: '1 Big Bowl',
            carbs: 7,
            protein: 1.5,
            fat: 0.5,
            calories: 35
        }
    ];

    let currentPendingFeedFood = null;
    let currentFoodCatFilter = 'all';

    // 1. Food Catalog Getters
    function getCustomFoods() {
        const saved = localStorage.getItem('productometer_custom_foods');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    }

    function saveCustomFood(food) {
        const list = getCustomFoods();
        list.push(food);
        localStorage.setItem('productometer_custom_foods', JSON.stringify(list));
    }

    function getAllFoodsCatalog() {
        return [...initialFoodCatalog, ...getCustomFoods()];
    }

    // 2. Regular Foods Tray Persistence
    function getRegularFoodsKeys() {
        const saved = localStorage.getItem('productometer_regular_foods');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        // Default pinned staples: Roti & Rice top, Soya, Paneer, Milk, Dal, Eggs, Oats
        return ['roti_wheat', 'steamed_rice', 'poha_cooked', 'paneer_fresh', 'soya_chunks', 'milk_cow', 'mixed_dal', 'whole_egg', 'rolled_oats'];
    }

    function saveRegularFoodsKeys(keys) {
        localStorage.setItem('productometer_regular_foods', JSON.stringify(keys));
        renderRegularFoodsTray();
    }

    function togglePinFood(foodId) {
        const keys = getRegularFoodsKeys();
        const idx = keys.indexOf(foodId);
        if (idx !== -1) {
            keys.splice(idx, 1);
        } else {
            keys.push(foodId);
        }
        saveRegularFoodsKeys(keys);
        renderFoodLibraryGrid();
    }

    // 3. Daily Diet Log Persistence
    function getDailyDietLog() {
        const saved = localStorage.getItem('productometer_daily_diet_log');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    }

    function saveDailyDietLog(log) {
        localStorage.setItem('productometer_daily_diet_log', JSON.stringify(log));
        updateDietHUD();
    }

    // 4. Goal Calibration & Macro Targets (Connected to Biometrics)
    function getDietGoal() {
        return localStorage.getItem('productometer_diet_goal') || 'maintain';
    }

    function setDietGoal(goal) {
        localStorage.setItem('productometer_diet_goal', goal);
        document.querySelectorAll('.diet-goal-pill').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.goal === goal);
        });
        updateDietHUD();
    }

    function calculateBiometricTargets() {
        let userWeight = 70;
        let userHeight = 175;
        let userAge = 25;
        let userGender = 'male';

        try {
            const p = JSON.parse(localStorage.getItem('productometer_health_profile'));
            if (p) {
                if (p.weight) userWeight = parseFloat(p.weight);
                if (p.height) userHeight = parseFloat(p.height);
                if (p.age) userAge = parseInt(p.age, 10);
                if (p.gender) userGender = p.gender.toLowerCase();
            }
        } catch (e) {}

        // Mifflin-St Jeor Equation
        let bmr = Math.round((10 * userWeight) + (6.25 * userHeight) - (5 * userAge) + (userGender === 'female' ? -161 : 5));
        let tdee = Math.round(bmr * 1.35); // Moderate activity multiplier

        const goal = getDietGoal();
        let targetKcal = tdee;

        let carbPct = 0.45;
        let proPct = 0.25;
        let fatPct = 0.30;

        if (goal === 'loss') {
            targetKcal = Math.max(1200, tdee - 500);
            carbPct = 0.35;
            proPct = 0.35;
            fatPct = 0.30;
        } else if (goal === 'gain') {
            targetKcal = tdee + 350;
            carbPct = 0.50;
            proPct = 0.25;
            fatPct = 0.25;
        }

        const targetCarbGrams = Math.round((targetKcal * carbPct) / 4);
        const targetProGrams = Math.round((targetKcal * proPct) / 4);
        const targetFatGrams = Math.round((targetKcal * fatPct) / 9);

        return {
            weight: userWeight,
            height: userHeight,
            bmr: bmr,
            tdee: tdee,
            targetKcal: targetKcal,
            targetCarbGrams: targetCarbGrams,
            targetProGrams: targetProGrams,
            targetFatGrams: targetFatGrams
        };
    }

    // 5. Reactive Donut / Pie Chart & HUD Updater
    function updateDietHUD() {
        const targets = calculateBiometricTargets();
        const log = getDailyDietLog();

        if (dietBiometricsRefText) {
            dietBiometricsRefText.textContent = `Height: ${targets.height} cm • Weight: ${targets.weight} kg`;
        }
        if (dietTargetCalories) dietTargetCalories.textContent = targets.targetKcal.toLocaleString();
        if (dietBmrDisplay) dietBmrDisplay.textContent = targets.bmr.toLocaleString();

        let totalKcal = 0;
        let totalCarbGrams = 0;
        let totalProGrams = 0;
        let totalFatGrams = 0;

        log.forEach(item => {
            totalKcal += (item.calories || 0);
            totalCarbGrams += (item.carbs || 0);
            totalProGrams += (item.protein || 0);
            totalFatGrams += (item.fat || 0);
        });

        const carbKcal = Math.round(totalCarbGrams * 4);
        const proKcal = Math.round(totalProGrams * 4);
        const fatKcal = Math.round(totalFatGrams * 9);
        const totalMacroKcal = carbKcal + proKcal + fatKcal;

        if (dietConsumedCalories) dietConsumedCalories.textContent = totalKcal.toLocaleString();

        const remainingKcal = targets.targetKcal - totalKcal;
        if (dietRemainingCalories) {
            if (remainingKcal >= 0) {
                dietRemainingCalories.textContent = remainingKcal.toLocaleString();
                dietRemainingCalories.className = 'diet-summary-val text-emerald';
            } else {
                dietRemainingCalories.textContent = `+${Math.abs(remainingKcal).toLocaleString()}`;
                dietRemainingCalories.className = 'diet-summary-val text-neon-orange';
            }
        }

        // Update Donut Center
        if (pieCenterConsumed) pieCenterConsumed.textContent = totalKcal.toLocaleString();
        if (pieCenterTarget) pieCenterTarget.textContent = `/ ${targets.targetKcal.toLocaleString()} kcal`;
        if (pieCenterStatus) {
            if (remainingKcal >= 0) {
                const pctLeft = Math.round((remainingKcal / targets.targetKcal) * 100);
                pieCenterStatus.textContent = `${pctLeft}% Remaining`;
                pieCenterStatus.className = 'pie-center-badge text-emerald';
            } else {
                pieCenterStatus.textContent = 'Target Exceeded';
                pieCenterStatus.className = 'pie-center-badge text-neon-orange';
            }
        }

        // SVG Donut Slices Calculation (Radius = 70, Circumference = 2 * PI * 70 = 439.82)
        const C = 2 * Math.PI * 70; // ~439.82

        if (totalMacroKcal <= 0) {
            if (pieSliceCarbs) pieSliceCarbs.style.strokeDasharray = `0 ${C}`;
            if (pieSliceProtein) pieSliceProtein.style.strokeDasharray = `0 ${C}`;
            if (pieSliceFat) pieSliceFat.style.strokeDasharray = `0 ${C}`;

            if (macroCarbPercent) macroCarbPercent.textContent = '0%';
            if (macroProPercent) macroProPercent.textContent = '0%';
            if (macroFatPercent) macroFatPercent.textContent = '0%';
        } else {
            const carbRatio = carbKcal / totalMacroKcal;
            const proRatio = proKcal / totalMacroKcal;
            const fatRatio = fatKcal / totalMacroKcal;

            const carbArc = carbRatio * C;
            const proArc = proRatio * C;
            const fatArc = fatRatio * C;

            if (pieSliceCarbs) {
                pieSliceCarbs.style.strokeDasharray = `${carbArc} ${C}`;
                pieSliceCarbs.style.strokeDashoffset = '0';
            }
            if (pieSliceProtein) {
                pieSliceProtein.style.strokeDasharray = `${proArc} ${C}`;
                pieSliceProtein.style.strokeDashoffset = `-${carbArc}`;
            }
            if (pieSliceFat) {
                pieSliceFat.style.strokeDasharray = `${fatArc} ${C}`;
                pieSliceFat.style.strokeDashoffset = `-${carbArc + proArc}`;
            }

            if (macroCarbPercent) macroCarbPercent.textContent = `${Math.round(carbRatio * 100)}%`;
            if (macroProPercent) macroProPercent.textContent = `${Math.round(proRatio * 100)}%`;
            if (macroFatPercent) macroFatPercent.textContent = `${Math.round(fatRatio * 100)}%`;
        }

        // Macro Meters Progress
        if (macroCarbVal) macroCarbVal.textContent = `${Math.round(totalCarbGrams)}g`;
        if (macroCarbTarget) macroCarbTarget.textContent = `${targets.targetCarbGrams}g target`;
        if (macroCarbKcal) macroCarbKcal.textContent = `${carbKcal} kcal`;
        if (macroCarbBar) {
            const pct = Math.min(100, Math.round((totalCarbGrams / targets.targetCarbGrams) * 100));
            macroCarbBar.style.width = `${pct}%`;
        }

        if (macroProVal) macroProVal.textContent = `${Math.round(totalProGrams)}g`;
        if (macroProTarget) macroProTarget.textContent = `${targets.targetProGrams}g target`;
        if (macroProKcal) macroProKcal.textContent = `${proKcal} kcal`;
        if (macroProBar) {
            const pct = Math.min(100, Math.round((totalProGrams / targets.targetProGrams) * 100));
            macroProBar.style.width = `${pct}%`;
        }

        if (macroFatVal) macroFatVal.textContent = `${Math.round(totalFatGrams)}g`;
        if (macroFatTarget) macroFatTarget.textContent = `${targets.targetFatGrams}g target`;
        if (macroFatKcal) macroFatKcal.textContent = `${fatKcal} kcal`;
        if (macroFatBar) {
            const pct = Math.min(100, Math.round((totalFatGrams / targets.targetFatGrams) * 100));
            macroFatBar.style.width = `${pct}%`;
        }

        renderDailyDietLogList();
    }

    // 6. Food Tile HTML Card Generator
    function createFoodTileElement(food, isPinned = true) {
        const card = document.createElement('div');
        card.className = 'food-tile-card';
        card.draggable = true;
        card.dataset.foodId = food.id;

        card.innerHTML = `
            <div class="food-tile-top-row">
                <div class="food-tile-icon-wrap">${food.icon || '🍽️'}</div>
                <div class="food-tile-info">
                    <span class="food-tile-name" title="${food.name}">${food.name}</span>
                    <span class="food-tile-serving">${food.unit}</span>
                </div>
            </div>
            <div class="food-tile-macro-pills">
                <span class="food-macro-chip carbs">${food.carbs}g C</span>
                <span class="food-macro-chip pro">${food.protein}g P</span>
                <span class="food-macro-chip fat">${food.fat}g F</span>
                <span class="food-macro-chip kcal">${food.calories} kcal</span>
            </div>
            <div class="food-tile-actions-row">
                <button type="button" class="btn-feed-chip btn-feed-action">
                    <i class="fa-solid fa-plus"></i> Feed
                </button>
                <button type="button" class="btn-pin-toggle ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin from Regulars' : 'Pin to Regular Foods'}">
                    <i class="fa-solid fa-star"></i>
                </button>
            </div>
        `;

        // Drag & Drop Handlers
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', JSON.stringify(food));
            e.dataTransfer.effectAllowed = 'copy';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        // Click to feed (fallback for touch/tap)
        card.querySelector('.btn-feed-action').addEventListener('click', (e) => {
            e.stopPropagation();
            openFoodQuantityModal(food);
        });

        card.addEventListener('click', () => {
            openFoodQuantityModal(food);
        });

        // Pin toggle
        card.querySelector('.btn-pin-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            togglePinFood(food.id);
        });

        return card;
    }

    // 7. Render Regular Foods Tray (Pinned Staples)
    function renderRegularFoodsTray() {
        if (!regularFoodsTray) return;
        regularFoodsTray.innerHTML = '';

        const pinnedKeys = getRegularFoodsKeys();
        const allFoods = getAllFoodsCatalog();

        const pinnedFoods = [];
        pinnedKeys.forEach(k => {
            const found = allFoods.find(f => f.id === k);
            if (found) pinnedFoods.push(found);
        });

        if (pinnedFoods.length === 0) {
            regularFoodsTray.innerHTML = `
                <div class="empty-sessions-placeholder" style="grid-column: 1 / -1; padding: 18px; text-align: center;">
                    No regular foods pinned yet.<br>
                    Tap <strong>"Full Food Library"</strong> above to pin your daily meals!
                </div>
            `;
            return;
        }

        pinnedFoods.forEach(food => {
            regularFoodsTray.appendChild(createFoodTileElement(food, true));
        });
    }

    // 8. Render Food Library Grid
    function renderFoodLibraryGrid() {
        if (!foodLibraryGrid) return;
        foodLibraryGrid.innerHTML = '';

        const allFoods = getAllFoodsCatalog();
        const pinnedKeys = getRegularFoodsKeys();
        const searchQ = (foodSearchInput ? foodSearchInput.value : '').toLowerCase().trim();

        const filtered = allFoods.filter(f => {
            const matchCat = (currentFoodCatFilter === 'all') || (f.category === currentFoodCatFilter);
            const matchSearch = !searchQ || f.name.toLowerCase().includes(searchQ) || (f.unit && f.unit.toLowerCase().includes(searchQ));
            return matchCat && matchSearch;
        });

        if (filtered.length === 0) {
            foodLibraryGrid.innerHTML = `
                <div class="empty-sessions-placeholder" style="grid-column: 1 / -1; padding: 22px; text-align: center;">
                    No foods found matching "${searchQ}".<br>
                    Tap "+ Custom Food" to create your own!
                </div>
            `;
            return;
        }

        filtered.forEach(food => {
            const isPinned = pinnedKeys.includes(food.id);
            foodLibraryGrid.appendChild(createFoodTileElement(food, isPinned));
        });
    }

    // 9. Render Daily Diet Log Feed
    function renderDailyDietLogList() {
        if (!dailyDietLogList) return;
        dailyDietLogList.innerHTML = '';

        const log = getDailyDietLog();

        if (log.length === 0) {
            dailyDietLogList.innerHTML = `
                <div class="empty-sessions-placeholder" style="padding: 16px; text-align: center;">
                    No foods logged yet today.<br>
                    Drag food tiles into the Pie Chart above or tap "+ Feed"!
                </div>
            `;
            return;
        }

        log.slice().reverse().forEach((item, revIdx) => {
            const originalIndex = log.length - 1 - revIdx;
            const row = document.createElement('div');
            row.className = 'diet-log-item-card';

            row.innerHTML = `
                <div class="diet-log-left">
                    <span class="diet-log-icon">${item.icon || '🍽️'}</span>
                    <div class="diet-log-info">
                        <span class="diet-log-title">${item.name} <span style="color: #00e676; font-weight: 900;">× ${item.qty}</span></span>
                        <span class="diet-log-details">${item.unit} • ${item.carbs}g C | ${item.protein}g P | ${item.fat}g F</span>
                    </div>
                </div>
                <div class="diet-log-right">
                    <span class="diet-log-kcal-badge">${item.calories} kcal</span>
                    <button type="button" class="btn-delete-diet-log" data-index="${originalIndex}" title="Remove entry">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            row.querySelector('.btn-delete-diet-log').addEventListener('click', () => {
                const updatedLog = getDailyDietLog();
                updatedLog.splice(originalIndex, 1);
                saveDailyDietLog(updatedLog);
                playAudioChime('notification');
            });

            dailyDietLogList.appendChild(row);
        });
    }

    // 10. Food Quantity Stepper Modal Logic
    function openFoodQuantityModal(food) {
        currentPendingFeedFood = food;

        if (qtyFoodIcon) qtyFoodIcon.textContent = food.icon || '🍽️';
        if (qtyFoodTitle) qtyFoodTitle.textContent = food.name;
        if (qtyFoodServingBase) qtyFoodServingBase.textContent = `Base: ${food.unit} (${food.carbs}g C • ${food.protein}g P • ${food.fat}g F)`;

        if (foodQuantityInput) foodQuantityInput.value = '1';
        recalculateQtyPreview(1);

        if (foodQuantityModal) foodQuantityModal.showModal();
    }

    function recalculateQtyPreview(qty) {
        if (!currentPendingFeedFood) return;
        if (isNaN(qty) || qty <= 0) qty = 1;

        const c = Math.round(currentPendingFeedFood.carbs * qty * 10) / 10;
        const p = Math.round(currentPendingFeedFood.protein * qty * 10) / 10;
        const f = Math.round(currentPendingFeedFood.fat * qty * 10) / 10;
        const kcal = Math.round(currentPendingFeedFood.calories * qty);

        if (qtyCalcCalories) qtyCalcCalories.textContent = `${kcal} kcal`;
        if (qtyCalcCarbs) qtyCalcCarbs.textContent = `${c}g`;
        if (qtyCalcProtein) qtyCalcProtein.textContent = `${p}g`;
        if (qtyCalcFat) qtyCalcFat.textContent = `${f}g`;
    }

    if (foodQuantityInput) {
        foodQuantityInput.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value) || 1;
            recalculateQtyPreview(v);
        });
    }

    if (btnDecFoodQty) {
        btnDecFoodQty.addEventListener('click', () => {
            let v = parseFloat(foodQuantityInput ? foodQuantityInput.value : 1) || 1;
            v = Math.max(0.5, v - 0.5);
            if (foodQuantityInput) foodQuantityInput.value = v;
            recalculateQtyPreview(v);
        });
    }

    if (btnIncFoodQty) {
        btnIncFoodQty.addEventListener('click', () => {
            let v = parseFloat(foodQuantityInput ? foodQuantityInput.value : 1) || 1;
            v = Math.min(20, v + 0.5);
            if (foodQuantityInput) foodQuantityInput.value = v;
            recalculateQtyPreview(v);
        });
    }

    if (btnConfirmFeedFood) {
        btnConfirmFeedFood.addEventListener('click', () => {
            if (!currentPendingFeedFood) return;
            const qty = parseFloat(foodQuantityInput ? foodQuantityInput.value : 1) || 1;

            const c = Math.round(currentPendingFeedFood.carbs * qty * 10) / 10;
            const p = Math.round(currentPendingFeedFood.protein * qty * 10) / 10;
            const f = Math.round(currentPendingFeedFood.fat * qty * 10) / 10;
            const kcal = Math.round(currentPendingFeedFood.calories * qty);

            const logItem = {
                id: Date.now(),
                foodId: currentPendingFeedFood.id,
                name: currentPendingFeedFood.name,
                icon: currentPendingFeedFood.icon || '🍽️',
                qty: qty,
                unit: currentPendingFeedFood.unit,
                carbs: c,
                protein: p,
                fat: f,
                calories: kcal,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            const log = getDailyDietLog();
            log.push(logItem);
            saveDailyDietLog(log);

            playAudioChime('set_complete');
            if (foodQuantityModal) foodQuantityModal.close();

            // Pulsing feedback on pie chart
            if (dietPieDropZone) {
                dietPieDropZone.classList.add('drag-active');
                setTimeout(() => dietPieDropZone.classList.remove('drag-active'), 500);
            }
        });
    }

    // 11. Pie Chart Drag and Drop Listeners
    if (dietPieDropZone) {
        dietPieDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            dietPieDropZone.classList.add('drag-active');
        });

        dietPieDropZone.addEventListener('dragleave', () => {
            dietPieDropZone.classList.remove('drag-active');
        });

        dietPieDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dietPieDropZone.classList.remove('drag-active');
            try {
                const data = e.dataTransfer.getData('text/plain');
                if (data) {
                    const food = JSON.parse(data);
                    openFoodQuantityModal(food);
                }
            } catch (err) {
                console.error('Drop error:', err);
            }
        });

        // Click on drop zone opens food library
        dietPieDropZone.addEventListener('click', () => {
            if (foodLibraryModal) {
                renderFoodLibraryGrid();
                foodLibraryModal.showModal();
            }
        });
    }

    // 12. Modal Open / Close & Goal Controls
    if (btnOpenDietCalculator) {
        btnOpenDietCalculator.addEventListener('click', () => {
            const currentGoal = getDietGoal();
            document.querySelectorAll('.diet-goal-pill').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.goal === currentGoal);
            });
            updateDietHUD();
            renderRegularFoodsTray();
            if (dietCalculatorModal) dietCalculatorModal.showModal();
        });
    }

    if (btnCloseDietModal) {
        btnCloseDietModal.addEventListener('click', () => {
            if (dietCalculatorModal) dietCalculatorModal.close();
        });
    }

    document.querySelectorAll('.diet-goal-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            setDietGoal(btn.dataset.goal);
            playAudioChime('notification');
        });
    });

    if (btnClearDietLog) {
        btnClearDietLog.addEventListener('click', async () => {
            const confirmed = await showCyberpunkConfirm({
                title: 'Clear Today\'s Food Log?',
                message: 'Are you sure you want to reset all logged meals and macro calories for today?',
                iconClass: 'fa-trash-can',
                confirmText: 'Reset Log',
                cancelText: 'Cancel',
                isDanger: true
            });
            if (confirmed) {
                saveDailyDietLog([]);
                playAudioChime('timer_done');
            }
        });
    }

    if (btnOpenFoodLibrary) {
        btnOpenFoodLibrary.addEventListener('click', () => {
            renderFoodLibraryGrid();
            if (foodLibraryModal) foodLibraryModal.showModal();
        });
    }

    if (foodSearchInput) {
        foodSearchInput.addEventListener('input', renderFoodLibraryGrid);
    }

    if (foodCategoryFilters) {
        foodCategoryFilters.querySelectorAll('.filter-tab-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                foodCategoryFilters.querySelectorAll('.filter-tab-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFoodCatFilter = btn.dataset.fcat;
                renderFoodLibraryGrid();
            });
        });
    }

    if (btnOpenCustomFood) {
        btnOpenCustomFood.addEventListener('click', () => {
            if (customFoodModal) customFoodModal.showModal();
        });
    }

    if (customFoodForm) {
        customFoodForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('customFoodName').value.trim();
            const unit = document.getElementById('customFoodServing').value.trim();
            const carbs = parseFloat(document.getElementById('customFoodCarbs').value) || 0;
            const protein = parseFloat(document.getElementById('customFoodProtein').value) || 0;
            const fat = parseFloat(document.getElementById('customFoodFat').value) || 0;
            let calories = parseInt(document.getElementById('customFoodCalories').value, 10);
            if (isNaN(calories) || calories <= 0) {
                calories = Math.round((carbs * 4) + (protein * 4) + (fat * 9));
            }

            const newFood = {
                id: 'custom_' + Date.now(),
                name: name,
                category: 'staples',
                icon: '🥗',
                unit: unit,
                carbs: carbs,
                protein: protein,
                fat: fat,
                calories: calories,
                isCustom: true
            };

            saveCustomFood(newFood);
            togglePinFood(newFood.id); // Pin to regular foods by default

            playAudioChime('set_complete');
            customFoodForm.reset();
            if (customFoodModal) customFoodModal.close();
            renderFoodLibraryGrid();
        });
    }

    // Initialize Diet & Macro Reactor
    updateDietHUD();
    renderRegularFoodsTray();

        // INITIALIZATION & BACKGROUND DAEMON INTERVALS
    // ==========================================================================
    syncScheduledHealthSessions();
    renderMyExercises();
    renderHiitRoutine();
    renderHIITBucket();
    renderWeeklyGrid();
    calculateActiveMetrics();
    checkScheduledWorkoutNotifications();

    setInterval(() => {
        syncScheduledHealthSessions();
        checkScheduledWorkoutNotifications();
        calculateActiveMetrics();
    }, 30000);

});
