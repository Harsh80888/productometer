// ==========================================================================
// 🤖 PRODUCTO - PERSONALIZED COGNITIVE BEHAVIORAL OFFLINE ENGINE
// 200 Curriculum Topics · Real-Time Biometrics Personalization
// Dual Cloud AI: Google Gemini API (Instant / Free) + Cloudflare Workers AI
// ==========================================================================

var ProductoBrain = (function() {
    'use strict';

    // --- 1. BIOMETRICS RETRIEVAL DIRECTLY FROM HEALTH TAB ---
    function retrieveHealthBiometrics() {
        let weight = 70;
        let height = 175;
        let age = 22;
        let gender = 'male';
        let goal = 'maintain';
        let isSet = false;
        let source = 'baseline';

        // A. Read from Health Tab HUD DOM elements if currently rendered
        if (typeof document !== 'undefined') {
            const domWeight = document.getElementById('displayWeight') || document.getElementById('inputWeight');
            const domHeight = document.getElementById('displayHeight') || document.getElementById('inputHeight');
            const domAge = document.getElementById('inputAge');
            const domGender = document.getElementById('inputGender');

            if (domWeight) {
                const val = parseFloat(domWeight.textContent || domWeight.value);
                if (!isNaN(val) && val > 0) { weight = val; isSet = true; source = 'health_hud_dom'; }
            }
            if (domHeight) {
                const val = parseFloat(domHeight.textContent || domHeight.value);
                if (!isNaN(val) && val > 0) { height = val; isSet = true; }
            }
            if (domAge) {
                const val = parseInt(domAge.value, 10);
                if (!isNaN(val) && val > 0) { age = val; }
            }
            if (domGender && domGender.value) {
                gender = domGender.value.toLowerCase();
            }
        }

        // B. Read from localStorage (productometer_health_profile)
        try {
            const rawProfile = localStorage.getItem('productometer_health_profile');
            if (rawProfile) {
                const parsed = JSON.parse(rawProfile);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.weight) { weight = parseFloat(parsed.weight); isSet = true; source = 'health_tab_storage'; }
                    if (parsed.height) { height = parseFloat(parsed.height); isSet = true; }
                    if (parsed.age) { age = parseInt(parsed.age, 10); }
                    if (parsed.gender) { gender = parsed.gender.toLowerCase(); }
                }
            }
        } catch (e) {}

        // C. Read Diet Goal (productometer_diet_goal)
        try {
            const rawGoal = localStorage.getItem('productometer_diet_goal');
            if (rawGoal) goal = rawGoal;
        } catch (e) {}

        // D. Read Calories Burned & Active Workout Minutes from Health Tab
        let activeMins = 0;
        let caloriesBurned = 0;
        try {
            const rawMins = localStorage.getItem('productometer_health_active_mins') || localStorage.getItem('productometer_health_session_mins');
            if (rawMins) activeMins = parseInt(rawMins, 10) || 0;
            const rawKcal = localStorage.getItem('productometer_health_calories') || localStorage.getItem('productometer_health_session_calories');
            if (rawKcal) caloriesBurned = parseInt(rawKcal, 10) || 0;
        } catch (e) {}

        // Also check DOM elements for real-time workout tracking
        if (typeof document !== 'undefined') {
            const domKcal = document.getElementById('hudCaloriesBurned');
            if (domKcal && domKcal.textContent) {
                const pKcal = parseInt(domKcal.textContent, 10);
                if (!isNaN(pKcal) && pKcal > 0) caloriesBurned = pKcal;
            }
            const domMins = document.getElementById('hudActiveMinutes');
            if (domMins && domMins.textContent) {
                const pMins = parseInt(domMins.textContent, 10);
                if (!isNaN(pMins) && pMins > 0) activeMins = pMins;
            }
        }

        // E. Read Diet Consumed Log (productometer_daily_diet_log)
        let consumedKcal = 0;
        let consumedPro = 0;
        let consumedCarb = 0;
        let consumedFat = 0;
        let dietLogCount = 0;
        try {
            const rawLog = localStorage.getItem('productometer_daily_diet_log');
            if (rawLog) {
                const parsedLog = JSON.parse(rawLog);
                if (Array.isArray(parsedLog)) {
                    dietLogCount = parsedLog.length;
                    parsedLog.forEach(item => {
                        consumedKcal += (item.calories || 0);
                        consumedPro += (item.protein || 0);
                        consumedCarb += (item.carbs || 0);
                        consumedFat += (item.fat || 0);
                    });
                }
            }
        } catch (e) {}

        // F. Formulas & Calculations (Mifflin-St Jeor & WHO BMI)
        const hMeters = height / 100;
        const bmi = (weight / (hMeters * hMeters)).toFixed(1);
        let bmiCategory = "Healthy / Normal";
        const bmiNum = parseFloat(bmi);
        if (bmiNum < 18.5) bmiCategory = "Underweight";
        else if (bmiNum < 25.0) bmiCategory = "Healthy / Normal";
        else if (bmiNum < 30.0) bmiCategory = "Overweight";
        else bmiCategory = "Obese";

        const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + (gender === 'female' ? -161 : 5));
        const tdee = Math.round(bmr * 1.35);
        let targetKcal = tdee;
        if (goal === 'loss') targetKcal = Math.max(1200, tdee - 500);
        else if (goal === 'gain') targetKcal = tdee + 350;

        const minProtein = Math.round(weight * 1.6);
        const maxProtein = Math.round(weight * 2.2);
        const waterLiters = (weight * 0.04).toFixed(1);

        return {
            weight,
            height,
            age,
            gender,
            goal,
            isSet,
            source,
            bmi,
            bmiCategory,
            bmr,
            tdee,
            targetKcal,
            minProtein,
            maxProtein,
            waterLiters,
            activeMins,
            caloriesBurned,
            consumedKcal,
            consumedPro,
            consumedCarb,
            consumedFat,
            dietLogCount
        };
    }

    // --- 2. FORMATTED BIOMETRICS TELEMETRY REPORT ---
    function generateBiometricsReport() {
        const bio = retrieveHealthBiometrics();
        const goalLabel = bio.goal === 'loss' ? 'Fat Loss / Cutting (-500 kcal)' : (bio.goal === 'gain' ? 'Muscle Gain / Hypertrophy (+350 kcal)' : 'Weight Maintenance (TDEE)');

        let report = `### 🏥 Health Tab Biometrics Telemetry

`;
        report += `> 📡 **Real-time Biometrics Synced Directly from Health Tracker**

`;

        report += `| Biometric Parameter | Live Value | Status / Calculation |
`;
        report += `| :--- | :--- | :--- |
`;
        report += `| ⚖️ **Body Weight** | **${bio.weight} kg** | ${bio.isSet ? '✅ Profile Calibrated' : '⚙️ Baseline (Tell me "my weight is X kg")'} |
`;
        report += `| 📏 **Height** | **${bio.height} cm** | Stature Measurement |
`;
        report += `| 🧬 **BMI Index** | **${bio.bmi}** | \`${bio.bmiCategory}\` |
`;
        report += `| 🎂 **Demographics** | **${bio.age} yrs** · **${bio.gender === 'female' ? 'Female' : 'Male'}** | Metabolic Baseline |
`;
        report += `| 🎯 **Diet Goal** | **${goalLabel}** | Caloric Tuning |
`;
        report += `| 🔥 **Basal Metabolic Rate (BMR)** | **${bio.bmr.toLocaleString()} kcal** | Resting Survival Burn |
`;
        report += `| ⚡ **Maintenance (TDEE)** | **${bio.tdee.toLocaleString()} kcal** | Moderate Activity Factor |
`;
        report += `| 🍽️ **Daily Calorie Target** | **${bio.targetKcal.toLocaleString()} kcal / day** | Goal Adjusted |
`;
        report += `| 🥩 **Protein Target** | **${bio.minProtein}g – ${bio.maxProtein}g / day** | 1.6 – 2.2g/kg frame |
`;
        report += `| 💧 **Hydration Target** | **${bio.waterLiters} Liters / day** | ~40ml / kg body mass |
`;

        if (bio.activeMins > 0 || bio.caloriesBurned > 0) {
            report += `| 🏃 **Active Exercise Logged** | **${bio.activeMins} mins** · **${bio.caloriesBurned} kcal** | Burned today |
`;
        }
        if (bio.consumedKcal > 0) {
            report += `| 🥗 **Diet Logged Today** | **${bio.consumedKcal} kcal** (${bio.consumedPro}g Protein) | ${bio.dietLogCount} entries logged |
`;
        }

        report += `
**💡 Active Health Tab Sync:**
`;
        report += `• All workout nutrition, meal plans, and protein calculations now automatically personalize for your **${bio.weight} kg** frame.
`;
        report += `• You can update this anytime in the **Health Tab** or tell me directly in chat: *"my weight is 68 kg"* or *"my goal is fat loss"*!`;

        return report;
    }

    // --- 3. LIVE DATA EXTRACTOR & PRODUCTIVITY SCORING ---
    function extractLiveMetrics() {
        let timeline = new Array(48).fill(null);
        let plannerList = [];
        let nAcad = 0;
        let nHealth = 0;
        let nOtherProd = 0;
        let nScreen = 0;
        let completedTasksCount = 0;
        let totalTasksCount = 0;
        let totalScreenHours = 0;
        let nonProdScreenHours = 0;
        let rawBedtimeStart = '23:00';
        let rawBedtimeEnd = '07:00';
        let rawTargetSleepMins = 480;
        let smartAlarmEnabled = true;
        let isAlarmSkippedToday = false;

        // User Personal Biometrics Profile (Retrieved directly from Health Tab)
        const userProfile = retrieveHealthBiometrics();
        let caloriesConsumed = userProfile.consumedKcal || userProfile.caloriesBurned || 0;

        try {
            // A. Read 24-Hour Timeline Bar
            const rawTimeline = localStorage.getItem('productometer_timeline') || localStorage.getItem('day_planner_timeline');
            if (rawTimeline) {
                const parsed = JSON.parse(rawTimeline);
                if (Array.isArray(parsed) && parsed.length === 48) {
                    timeline = parsed;
                }
            }

            // B. Read Day Planner Tasks
            const rawPlanner = localStorage.getItem('productometer_tasks') || localStorage.getItem('day_planner_tasks');
            if (rawPlanner) {
                const parsed = JSON.parse(rawPlanner);
                if (Array.isArray(parsed)) {
                    plannerList = parsed;
                    totalTasksCount = plannerList.length;
                    completedTasksCount = plannerList.filter(t => t.completed || t.status === 'completed' || t.isCompleted).length;
                }
            }

            // C. Read Health & Calories Tracker
            const rawCalories = localStorage.getItem('health_calories_consumed') || localStorage.getItem('productometer_health_calories');
            if (rawCalories) caloriesConsumed = parseFloat(rawCalories) || caloriesConsumed;

            // D. Read Screen Management Data
            const rawScreenTotal = localStorage.getItem('screen_total_hours');
            if (rawScreenTotal) totalScreenHours = parseFloat(rawScreenTotal) || 0;
            const rawScreenNonProd = localStorage.getItem('screen_nonprod_hours');
            if (rawScreenNonProd) nonProdScreenHours = parseFloat(rawScreenNonProd) || 0;

            // E. Read Sleep & Bedtime Monitoring Data
            const bStart = localStorage.getItem('productometer_bedtime_start');
            if (bStart) rawBedtimeStart = bStart;
            const bEnd = localStorage.getItem('productometer_bedtime_end');
            if (bEnd) rawBedtimeEnd = bEnd;
            const tSleep = localStorage.getItem('productometer_target_sleep_minutes');
            if (tSleep) rawTargetSleepMins = parseInt(tSleep, 10) || 480;
            const sAlarm = localStorage.getItem('productometer_smart_alarm_enabled');
            if (sAlarm !== null) smartAlarmEnabled = sAlarm === 'true';
            const skippedDate = localStorage.getItem('wakeup_alarm_skipped_date');
            const todayStr = new Date().toISOString().slice(0, 10);
            isAlarmSkippedToday = skippedDate === todayStr;

        } catch (e) {
            console.warn('[ProductoBrain] Error reading live metrics:', e);
        }

        // G. Calculate Block Hours from Timeline Slots
        timeline.forEach(slot => {
            if (!slot || slot === 'eraser') return;
            const type = (typeof slot === 'string') ? slot : (slot.type || slot.category || '');
            if (type.includes('acad') || type.includes('study') || type.includes('math') || type.includes('physics')) {
                nAcad += 0.5;
            } else if (type.includes('health') || type.includes('workout') || type.includes('run') || type.includes('gym')) {
                nHealth += 0.5;
            } else if (type.includes('skill') || type.includes('school') || type.includes('other_prod')) {
                nOtherProd += 0.5;
            } else if (type.includes('screen') || type.includes('distract')) {
                nScreen += 0.5;
            }
        });

        if (nonProdScreenHours > 0 && nScreen === 0) {
            nScreen = nonProdScreenHours;
        }

        // H. Calculate Positive & Negative Scoring Subcomponents
        const acadScore = nAcad * 100;

        let healthScore = 0;
        let remainingHealthHours = nHealth;
        let hHourIndex = 1;
        while (remainingHealthHours > 0) {
            const chunk = Math.min(1.0, remainingHealthHours);
            const hourlyYield = Math.max(0, 150 - (30 * hHourIndex));
            healthScore += chunk * hourlyYield;
            remainingHealthHours -= chunk;
            hHourIndex++;
        }

        const otherProdScore = nOtherProd * 50;

        let screenScore = 0;
        let remainingScreenHours = nScreen;
        let sHourIndex = 1;
        while (remainingScreenHours > 0) {
            const chunk = Math.min(1.0, remainingScreenHours);
            const hourlyDeduction = 50 + (50 * sHourIndex);
            screenScore -= chunk * hourlyDeduction;
            remainingScreenHours -= chunk;
            sHourIndex++;
        }

        // I. Planner Execution Bonus (+50 flat if all planned tasks are done)
        const tasksBonus = (totalTasksCount > 0 && completedTasksCount === totalTasksCount) ? 50 : 0;
        const netScore = Math.round(acadScore + healthScore + otherProdScore + screenScore + tasksBonus);

        // J. Behavioral Pattern Metrics (Streaks, Breaks, Overwork)
        const now = new Date();
        const currentSlotIndex = Math.min(47, Math.floor((now.getHours() * 60 + now.getMinutes()) / 30));

        let currentStreakSlots = 0;
        let maxContinuousFocusSlots = 0;
        let currentGapSlots = 0;
        let longestBreakSlots = 0;
        let afternoonStudySlots = 0;
        let earnedSpikeMins = 0;
        let hasStartedFocusToday = false;
        let totalFocusSlotsLogged = 0;

        for (let i = 0; i <= currentSlotIndex; i++) {
            const act = timeline[i];
            const isFocus = act && act !== 'eraser' && act !== 'screen' && act !== 'sleep' && act !== 'other';
            const isBreak = !act || act === 'screen' || act === 'other';

            if (isFocus) {
                hasStartedFocusToday = true;
                totalFocusSlotsLogged++;
                currentStreakSlots++;
                if (currentStreakSlots > maxContinuousFocusSlots) maxContinuousFocusSlots = currentStreakSlots;
                currentGapSlots = 0;
                if (i >= 28 && i <= 36) afternoonStudySlots++;
            } else {
                if (currentStreakSlots >= 3 && act === 'screen') {
                    earnedSpikeMins += 30;
                }
                currentStreakSlots = 0;
                if (hasStartedFocusToday && isBreak) {
                    currentGapSlots++;
                    if (currentGapSlots > longestBreakSlots) longestBreakSlots = currentGapSlots;
                }
            }
        }

        return {
            timeline,
            plannerList,
            userProfile,
            nAcad,
            acadScore,
            nHealth,
            healthScore,
            nOtherProd,
            otherProdScore,
            nScreen,
            screenScore,
            completedTasksCount,
            totalTasksCount,
            tasksBonus,
            netScore,
            caloriesConsumed,
            totalScreenHours,
            nonProdScreenHours,
            totalFocusSlotsLogged,
            bedtimeStart: (typeof rawBedtimeStart !== 'undefined' ? rawBedtimeStart : '23:00'),
            bedtimeEnd: (typeof rawBedtimeEnd !== 'undefined' ? rawBedtimeEnd : '07:00'),
            targetSleepMins: (typeof rawTargetSleepMins !== 'undefined' ? rawTargetSleepMins : 480),
            targetSleepHours: Math.round(((typeof rawTargetSleepMins !== 'undefined' ? rawTargetSleepMins : 480) / 60) * 10) / 10,
            smartAlarmEnabled: (typeof smartAlarmEnabled !== 'undefined' ? smartAlarmEnabled : true),
            isAlarmSkippedToday: (typeof isAlarmSkippedToday !== 'undefined' ? isAlarmSkippedToday : false),
            maxContinuousFocusHours: maxContinuousFocusSlots * 0.5,
            longestBreakMins: longestBreakSlots * 30,
            afternoonStudyHours: afternoonStudySlots * 0.5,
            earnedSpikeMins
        };
    }

    // --- 2. CONVERSATIONAL BIOMETRICS UPDATER ---
    function checkAndHandleBiometricUpdate(rawQuery) {
        const q = rawQuery.toLowerCase();
        let updated = false;

        let profile = {
            weight: 70,
            height: 175,
            age: 22,
            gender: 'male',
            goal: 'maintain',
            isSet: false
        };

        try {
            const saved = localStorage.getItem('productometer_health_profile');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed) Object.assign(profile, parsed);
            }
            const savedGoal = localStorage.getItem('productometer_diet_goal');
            if (savedGoal) profile.goal = savedGoal;
        } catch (e) {}

        // Check for weight: "my weight is 65 kg", "i weigh 62kg", "weight 68", "set weight 70"
        const weightMatch = q.match(/(?:weight(?:\s+is)?|weigh|am)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilos)?/i) ||
                            q.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos)\s*(?:weight)?/i);
        if (weightMatch) {
            const val = parseFloat(weightMatch[1]);
            if (val >= 30 && val <= 250) {
                profile.weight = val;
                profile.isSet = true;
                updated = true;
            }
        }

        // Check for height: "my height is 175 cm", "height 175", "175cm"
        const heightMatch = q.match(/(?:height(?:\s+is)?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:cm)?/i) ||
                            q.match(/(\d+)\s*cm/i);
        if (heightMatch) {
            const val = parseFloat(heightMatch[1]);
            if (val >= 100 && val <= 240) {
                profile.height = val;
                profile.isSet = true;
                updated = true;
            }
        }

        // Check for age: "age is 20", "21 years old"
        const ageMatch = q.match(/(?:age(?:\s+is)?)\s*[:=]?\s*(\d+)/i) ||
                         q.match(/(\d+)\s*years?\s*old/i);
        if (ageMatch) {
            const val = parseInt(ageMatch[1], 10);
            if (val >= 10 && val <= 100) {
                profile.age = val;
                profile.isSet = true;
                updated = true;
            }
        }

        // Check for gender
        if (q.includes("female") || q.includes("woman") || q.includes("girl")) {
            profile.gender = "female";
            updated = true;
        } else if (q.includes("male") || q.includes("man") || q.includes("boy")) {
            profile.gender = "male";
            updated = true;
        }

        // Check for goal
        if (q.includes("lose weight") || q.includes("weight loss") || q.includes("fat loss") || q.includes("cut") || q.includes("cutting")) {
            profile.goal = "loss";
            updated = true;
        } else if (q.includes("gain muscle") || q.includes("muscle gain") || q.includes("build muscle") || q.includes("bulk") || q.includes("bulking") || q.includes("hypertrophy")) {
            profile.goal = "gain";
            updated = true;
        } else if (q.includes("maintain") || q.includes("maintenance")) {
            profile.goal = "maintain";
            updated = true;
        }

        if (updated) {
            try {
                localStorage.setItem('productometer_health_profile', JSON.stringify({
                    weight: profile.weight,
                    height: profile.height,
                    age: profile.age,
                    gender: profile.gender
                }));
                localStorage.setItem('productometer_diet_goal', profile.goal);
            } catch (e) {}

            const bmr = Math.round((10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + (profile.gender === 'female' ? -161 : 5));
            const tdee = Math.round(bmr * 1.35);
            let targetKcal = tdee;
            if (profile.goal === 'loss') targetKcal = Math.max(1200, tdee - 500);
            else if (profile.goal === 'gain') targetKcal = tdee + 350;

            const minP = Math.round(profile.weight * 1.6);
            const maxP = Math.round(profile.weight * 2.2);
            const water = (profile.weight * 0.04).toFixed(1);
            const goalLabel = profile.goal === 'loss' ? 'Fat Loss (Cutting -500 kcal)' : (profile.goal === 'gain' ? 'Muscle Gain (Hypertrophy +350 kcal)' : 'Maintenance');

            return `### 🎯 Profile Updated & Calibrated!\n\n` +
                   `I have saved your personal biometrics into **Health Tracker**:\n` +
                   `• **Body Weight**: **${profile.weight} kg**\n` +
                   `• **Height**: **${profile.height} cm** | **Age**: **${profile.age}** | **Gender**: **${profile.gender}**\n` +
                   `• **Diet Goal**: **${goalLabel}**\n\n` +
                   `📊 **Your New Personalized Bio-Blueprint:**\n` +
                   `• **Daily Protein Target**: **${minP}g – ${maxP}g / day** (1.6 – 2.2g/kg)\n` +
                   `• **Daily Calorie Target**: **${targetKcal} kcal / day** (BMR: ${bmr} kcal, TDEE: ${tdee} kcal)\n` +
                   `• **Daily Hydration**: **${water} Liters / day**\n\n` +
                   `*All future diet blueprints, workout nutrition, and calorie guidance will now be calculated exclusively for your ${profile.weight} kg body!*`;
        }

        return null;
    }

    // --- 3. DYNAMIC DAILY DEBRIEF SYNTHESIZER ---
    function generateDailyDebrief() {
        const d = extractLiveMetrics();

        // Check for Clean Slate (zero data)
        const totalActivityHours = d.nAcad + d.nHealth + d.nOtherProd + d.nScreen;
        if (totalActivityHours === 0 && d.totalTasksCount === 0 && d.totalFocusSlotsLogged === 0) {
            return `### 🤖 Producto Daily Synthesis\n\n` +
                   `**Today's Status:** \`Clean Slate 🌱\` — **Ready to Build Momentum!**\n\n` +
                   `You haven't logged any scheduled sessions, study hours, or distraction screen activity yet today. Your slate is completely clean!\n\n` +
                   `📊 **Summary Breakdown:**\n` +
                   `• 🎓 Academics: \`0.0h\` (\`0 pts\`)\n` +
                   `• 🏃 Health: \`0.0h\` (\`0 pts\`)\n` +
                   `• ⚡ Other Productive: \`0.0h\` (\`0 pts\`)\n` +
                   `• 📱 Non-Productive Screen: \`0.0h\` (\`0 pts\`)\n` +
                   `• ✅ Planner Bonus: \`0/0 tasks\` (\`+0 pts\`)\n\n` +
                   `**💡 Recommended 3-Step Kickstart:**\n` +
                   `1. **Plan Your First Block**: Open **Day Planner** and schedule your core study or workout block.\n` +
                   `2. **Trigger Flow State**: In **Academics Monitoring**, tap Start Session to pass the 5-minute activation threshold.\n` +
                   `3. **Lock In +50 Pts**: Complete and check off your tasks to watch your Daily Curve climb!`;
        }

        let ratingTier = "Clean Slate 🌱";
        if (d.netScore >= 600) ratingTier = "Ascended 🚀 (Top 1%)";
        else if (d.netScore >= 450) ratingTier = "Elite ⚡";
        else if (d.netScore >= 250) ratingTier = "Solid 🔥";
        else if (d.netScore >= 50) ratingTier = "Building Momentum 🌱";
        else if (d.netScore >= 0) ratingTier = "Baseline Rebound 🔄";
        else ratingTier = "Deficit Zone ⚠️";

        const praise = [];
        const warnings = [];
        const calibrations = [];

        if (d.nAcad >= 4.0) praise.push(`Exceptional academic endurance: **${d.nAcad.toFixed(1)} hours** logged!`);
        else if (d.nAcad >= 2.0) praise.push(`Solid study foundation: **${d.nAcad.toFixed(1)} hours** in deep focus.`);

        if (d.nHealth >= 1.0) praise.push(`Body optimized: **${d.nHealth.toFixed(1)} hours** physical workout completed (+${Math.round(d.healthScore)} pts).`);

        if (d.tasksBonus > 0) praise.push(`100% Day Planner execution: **${d.completedTasksCount}/${d.totalTasksCount} tasks** finished (+50 pts bonus).`);

        if (d.maxContinuousFocusHours > 2.0) {
            warnings.push(`Overwork Alert: Longest unbroken focus was **${d.maxContinuousFocusHours.toFixed(1)}h**. Human attention degrades steeply after 90–120 minutes.`);
            calibrations.push("Enforce strict 10–15 minute biological recovery breaks after every 90-minute block.");
        }

        if (d.longestBreakMins > 45) {
            warnings.push(`Break Bleed: Longest break was **${d.longestBreakMins}m** (limit 45m). Long breaks trigger dopamine baseline crashes and high restart friction.`);
            calibrations.push("Cap midday rest to 25 minutes (Power Nap or outdoor walk) to avoid break bleed.");
        }

        if (d.nScreen >= 1.5) {
            warnings.push(`High distraction bleed: **${d.nScreen.toFixed(1)} hours** in non-productive screen time (${Math.round(d.screenScore)} penalty pts).`);
            calibrations.push("Enable Focus Shield (Shorts & Reels Blocker) to stop autopilot infinite scrolling.");
        }

        if (d.nAcad < 2.0) {
            calibrations.push("Schedule a 90-minute morning focus block in Day Planner to guarantee your academic foundation.");
        }
        if (d.nHealth < 0.5) {
            calibrations.push("Log a 30-minute workout or brisk run to trigger endorphins and earn up to +120 Health points.");
        }

        let debrief = `### 🤖 Producto Daily Synthesis\n\n`;
        debrief += `**Today's Net Score:** \`${d.netScore > 0 ? '+' : ''}${d.netScore} pts\` — **${ratingTier}**\n\n`;
        debrief += `📊 **Summary Breakdown:**\n`;
        debrief += `• 🎓 Academics: \`${d.nAcad.toFixed(1)}h\` (\`${d.acadScore > 0 ? '+' : ''}${Math.round(d.acadScore)} pts\`)\n`;
        debrief += `• 🏃 Health: \`${d.nHealth.toFixed(1)}h\` (\`${d.healthScore > 0 ? '+' : ''}${Math.round(d.healthScore)} pts\`)\n`;
        debrief += `• ⚡ Other Productive: \`${d.nOtherProd.toFixed(1)}h\` (\`${d.otherProdScore > 0 ? '+' : ''}${Math.round(d.otherProdScore)} pts\`)\n`;
        debrief += `• 📱 Non-Productive Screen: \`${d.nScreen.toFixed(1)}h\` (\`${Math.round(d.screenScore)} pts\`)\n`;
        debrief += `• ✅ Planner Bonus: \`${d.completedTasksCount}/${d.totalTasksCount} tasks\` (\`+${Math.round(d.tasksBonus)} pts\`)\n\n`;

        if (praise.length > 0) {
            debrief += `**🌟 What Went Great:**\n` + praise.map(p => `• ${p}`).join('\n') + `\n\n`;
        }

        if (warnings.length > 0) {
            debrief += `**⚠️ Points of Friction & Energy Dips:**\n` + warnings.map(w => `• ${w}`).join('\n') + `\n\n`;
        }

        if (calibrations.length > 0) {
            debrief += `**💡 Tomorrow's 3-Step Calibration Blueprint:**\n` + calibrations.slice(0, 3).map((c, idx) => `${idx + 1}. ${c}`).join('\n');
        }

        return debrief;
    }

    // --- 4. EXHAUSTIVE KNOWLEDGE BASE (200 CURRICULUM TOPICS) ---
    const KNOWLEDGE_BASE = [
        {
            id: "chronotype_architecture",
            category: "Day Planner / Biology",
            title: "Understanding Your Chronotype & Peak Cognitive Windows",
            keywords: ["chronotype", "chronotypes", "what is my chronotype", "my chronotype", "peak energy", "circadian rhythm", "morning lark", "night owl", "bear chronotype", "wolf chronotype"],
            answer: (d) => `### 🦉 Chronotype & Peak Cognitive Windows\n\n` +
                           `Productometer aligns your daily blocks with your biological chronotype:\n` +
                           `• **Lions / Early Risers (15%)**: Peak analytical focus: 8:00 AM – 12:00 PM. Schedule deep analytical tasks (Math, Code, Architecture) in morning blocks.\n` +
                           `• **Bears (55%)**: Natural circadian rhythm tracking the sun. Peak cognitive window: 10:00 AM – 2:00 PM. Post-lunch slump (2–4 PM) is best for physical workouts or admin.\n` +
                           `• **Wolves / Night Owls (15%)**: Peak creative & deep work focus: 5:00 PM – 11:00 PM.\n` +
                           `• **Dolphins (10%)**: Fragmented sleep; peak bursts: 3:00 PM – 7:00 PM.\n\n` +
                           `💡 **Action Tip**: Open the **Day Planner** and arrange high-focus tasks during your personal peak energy block!`
        },
        {
            id: "export_backup_data",
            category: "App Controls / Settings",
            title: "Exporting, Backing Up & Transferring Data",
            keywords: ["export data", "backup data", "transfer data", "download data", "export", "backup", "save my data", "how do i export", "how do i backup"],
            answer: (d) => `### 💾 Data Export & Privacy\n\n` +
                           `Your data is stored 100% locally on your device for absolute privacy:\n` +
                           `• **JSON Backup**: Go to **Settings** (or tap your profile in the top-right) and tap **"Export Data / Backup"**.\n` +
                           `• **Format**: Generates a clean JSON file containing your health logs, planner tasks, study sessions, and screen metrics.\n` +
                           `• **Restoring**: Tap **"Import Backup"** on any new phone to restore your historical streak instantly!`
        },
        {
            id: "score_calculation_overview",
            category: "Scoring & Math",
            title: "How is the Productivity Score calculated?",
            keywords: ["how is score calculated", "productivity score formula", "score math", "scoring system", "how do points work", "point calculation"],
            answer: function(liveData) {
                return `### 🧮 Productivity Score Mathematical Engine

Your **Daily Net Score** is a real-time mathematical aggregation of positive biological investments minus dopamine-drain penalties:

$$\\text{Net Score} = \\text{Academics} + \\text{Health} + \\text{Other Productive} + \\text{Screen Penalty} + \\text{Planner Bonus}$$

1. **Academics / Deep Study**: $+100$ points per hour ($+50$ pts per 30-min slot).
2. **Health & Physical Fitness**: $150 - 30n$ points per hour (where $n$ is the hour index).
3. **Other Productive (Skills / Reading)**: $+50$ points per hour ($+25$ pts per 30-min slot).
4. **Non-Productive Screen Time**: $-(50 + 50n)$ points penalty curve.
5. **Day Planner Execution Bonus**: $+50$ flat bonus when all planned tasks are checked off.
6. **Sleep & Unassigned**: $0$ points (biological baseline).`;
            }
        },
        {
            id: "health_formula_150_30n",
            category: "Scoring & Math",
            title: "Why does the Health formula use 150 - 30n?",
            keywords: ["150 - 30n", "health formula", "why 150 30n", "diminishing returns workout", "exercise points formula"],
            answer: function(liveData) {
                return `### 🏃 The Science Behind the $150 - 30n$ Health Formula

Physical training follows the biological law of **diminishing physiological returns** and **central nervous system fatigue**:

- **Hour 1 ($n=1$)**: $150 - 30(1) = \\mathbf{+120\\text{ points}}$. (Peak endorphin release, maximum cardiovascular and metabolic stimulation).
- **Hour 2 ($n=2$)**: $150 - 30(2) = \\mathbf{+90\\text{ points}}$. (Deep muscular hypertrophy and endurance benefits).
- **Hour 3 ($n=3$)**: $150 - 30(3) = \\mathbf{+60\\text{ points}}$. (Diminished returns; cortisol elevation begins).
- **Hour 4 ($n=4$)**: $150 - 30(4) = \\mathbf{+30\\text{ points}}$. (High risk of overtraining, joint strain, and glycogen depletion).

💡 **Key Takeaway**: The sweet spot for human physical training is **1.0 to 1.5 hours daily**. The formula rewards intensity and consistency over excessive, exhausting gym marathons.`;
            }
        },
        {
            id: "screen_penalty_formula",
            category: "Scoring & Math",
            title: "How does the Screen Time penalty work?",
            keywords: ["screen penalty", "screen time formula", "why negative screen points", "distraction penalty", "50 + 50n"],
            answer: function(liveData) {
                return `### 📱 Non-Productive Screen Time Penalty Curve

The app enforces an escalating penalty curve: **$-(50 + 50n)$** for each hour $n$ of non-productive device usage:

- **1st Hour ($n=1$)**: $-(50 + 50) = \\mathbf{-100\\text{ points}}$.
- **2nd Hour ($n=2$)**: $-(50 + 100) = \\mathbf{-150\\text{ points}}$ (Cumulative: **-250 pts**).
- **3rd Hour ($n=3$)**: $-(50 + 150) = \\mathbf{-200\\text{ points}}$ (Cumulative: **-450 pts**).
- **4th Hour ($n=4$)**: $-(50 + 200) = \\mathbf{-250\\text{ points}}$ (Cumulative: **-700 pts**).

🧠 **Why does it escalate?** The first 30 minutes of scrolling merely drains willpower. By hour 3 or 4, excessive passive dopamine hijacks your neurochemistry, causing **severe attention residue, brain fog, and motivation paralysis**.`;
            }
        },
        {
            id: "score_rating_tiers",
            category: "Scoring & Math",
            title: "What are the score rating tiers?",
            keywords: ["score rating tiers", "tiers", "ascended", "elite", "solid", "rebound", "deficit", "what is a good score"],
            answer: function(liveData) {
                return `### 🏆 Performance Rating Tiers

Your daily net score translates into distinct cognitive performance bands:

- **🚀 Ascended (+600 pts and above)**: Exceptional output! 5+ hours of intense academics, a balanced workout, zero distraction bleed, and 100% task execution.
- **⚡ Elite (+450 to +599 pts)**: High-caliber consistency. Deep focus blocks with tight discipline and minimal screen friction.
- **🔥 Solid (+250 to +449 pts)**: Highly productive day. Core goals achieved, healthy habits logged, and balanced momentum.
- **🌱 Building Momentum (+50 to +249 pts)**: Good progress. Foundation established; focus on extending deep work blocks.
- **🔄 Clean Slate / Rebound (0 to +49 pts)**: Neutral threshold or day just starting. Ready to build momentum.
- **⚠️ Deficit Zone (Below 0 pts)**: Negative score caused by non-productive screen time out-weighing focus hours. Focus on reclaiming control.`;
            }
        },
        {
            id: "negative_score_causes",
            category: "Scoring & Math",
            title: "Why is my productivity score negative?",
            keywords: ["why negative score", "score dropped below zero", "negative points", "how to fix negative score"],
            answer: function(liveData) {
                return `### 📉 Why Scores Drop into the Negative Zone

A negative score occurs whenever your **Non-Productive Screen Penalty** exceeds your earned positive points from Academics, Health, and Tasks:

$$\\text{Negative Score} \\iff |\\text{Screen Penalty}| > (\\text{Academics} + \\text{Health} + \\text{Tasks})$$

**How to Recover Rapidly**:
1. **Lock Your Phone**: Enable **Focus Shield** or turn on Airplane Mode.
2. **Execute a 50-Minute Study Block**: 1 hour of deep academics awards $+100$ pts immediately.
3. **Log a 30-Minute Workout**: Awards $+60$ health points.
4. **Check Off 1 Planned Task**: Adds progress toward the $+50$ bonus.`;
            }
        },
        {
            id: "day_planner_bonus_50",
            category: "Scoring & Math",
            title: "How do I earn the +50 pts task completion bonus?",
            keywords: ["task completion bonus", "+50 bonus", "planner bonus", "how to get 50 points", "day planner bonus"],
            answer: function(liveData) {
                return `### ✅ The +50 Points Planner Completion Bonus

The $+50$ bonus is an intentional neuro-reinforcement reward designed to build **task closure momentum**:

- **Requirement**: You must have at least 1 scheduled task in Day Planner, and **100% of your scheduled tasks must be checked off**.
- **Bonus Trigger**: The instant your last remaining task is completed, $+50$ pts is automatically credited into your Net Daily Score.
- **Psychological Effect**: Finishing what you planned creates an **earned dopamine surge**, preventing procrastination rollover into tomorrow.`;
            }
        },
        {
            id: "other_productive_score",
            category: "Scoring & Math",
            title: "What is the score for Other Productive tasks (Skills / School)?",
            keywords: ["other productive score", "skills points", "school score", "reading score", "how are skills scored"],
            answer: function(liveData) {
                return `### ⚡ Scoring for Skills, School & Other Productive Tasks

Tasks scheduled under **Skills**, **School**, or **Other Productive** categories earn:
- **$+50$ points per full hour** ($+25$ points per 30-minute timeline slot).

**Why $+50$ instead of $+100$?**
- **Academics ($+100/hr$)** represents rigorous, active-recall, high-cognitive-load focus (solving problems, writing code, analyzing texts).
- **Skills & Other Productive ($+50/hr$)** represents secondary learning, reading, lectures, language practice, and administrative productive duties. Both contribute meaningfully to your score!`;
            }
        },
        {
            id: "sleep_unassigned_points",
            category: "Scoring & Math",
            title: "Why do sleep and unassigned time give 0 points?",
            keywords: ["sleep points", "why sleep 0 points", "unassigned time points", "sleep score zero"],
            answer: function(liveData) {
                return `### 💤 Why Sleep & Unassigned Time Award 0 Points

- **Sleep is the Biological Baseline ($0\\text{ pts}$)**: Sleep is neither an active cognitive investment nor a distraction penalty. Giving points for sleeping would inflate scores artificially, while penalizing sleep would encourage sleep deprivation.
- **Unassigned Time ($0\\text{ pts}$)**: Open time between blocks does not penalize you as long as you aren't engaging in non-productive screen scrolling. This allows natural biological recovery and meals without stress.`;
            }
        },
        {
            id: "realtime_score_updating",
            category: "Scoring & Math",
            title: "How does the score update live throughout the day?",
            keywords: ["real time score", "live score updating", "when does score update", "dynamic score calculation"],
            answer: function(liveData) {
                return `### ⏱️ Dynamic Live Score Calculation

Your Productivity Score does not wait for midnight; it recalculates **instantly in real time**:

1. **Active Session Timer**: As the Pomodoro timer in Academics runs, every 30 minutes of logged focus fills a timeline slot and credits $+50$ pts.
2. **Task Completion**: Tapping a task checkmark in Day Planner updates the completion ratio and recalculates the $+50$ bonus instantly.
3. **Screen Usage Sync**: In the Android app, background usage stats sync periodically, factoring in non-productive screen time penalties.
4. **Manual Slots**: Editing or adding blocks on the 24-hour timeline bar dynamically updates the Daily Curve in under 50 milliseconds.`;
            }
        },
        {
            id: "optimal_daily_score_target",
            category: "Scoring & Math",
            title: "What is an optimal daily score target to aim for?",
            keywords: ["target score", "what score to aim for", "good daily score", "ideal score target"],
            answer: function(liveData) {
                return `### 🎯 Optimal Daily Score Blueprint

A healthy, sustainable target for competitive students and professionals is **+350 to +500 points**:

- **Academics**: 3.5 hours = $+350\\text{ pts}$
- **Health / Workout**: 1.0 hour = $+120\\text{ pts}$
- **Day Planner Tasks**: 100% completed = $+50\\text{ pts}$
- **Screen Time**: Kept under 45 minutes = $-75\\text{ pts}$
- **Net Daily Total**: **+445 points (Elite Tier)**!

💡 *Aiming for +400 pts daily for 30 consecutive days will outperform a sporadic +700 pts day followed by a 3-day burnout crash.*`;
            }
        },
        {
            id: "academics_hourly_rate",
            category: "Scoring & Math",
            title: "Why does Academics award 100 points per hour?",
            keywords: ["why academics 100 points", "academics rate", "100 pts per hour", "study points rate"],
            answer: function(liveData) {
                return `### 🎓 The 100 Points/Hour Academic Standard

Academics is calibrated at **100 points/hour** ($1.67\\text{ pts/minute}$) because focused deliberate study demands the highest consumption of glucose and prefrontal cortex energy. 

By setting Academics at $+100$ and Screen penalty at $-100$ for the first hour, the app enforces an intuitive 1-to-1 balance: **1 hour of deep academic study exactly cancels out 1 hour of casual phone screen distraction**.`;
            }
        },
        {
            id: "diminishing_returns_math",
            category: "Scoring & Math",
            title: "What is the biological math behind diminishing returns?",
            keywords: ["diminishing returns math", "why scores diminish", "neuroscience diminishing returns"],
            answer: function(liveData) {
                return `### 🧬 The Biological Math of Diminishing Returns

In human physiology, linear effort does **not** yield linear results beyond biological thresholds:
- In muscle hypertrophy: After 60-90 minutes of resistance training, muscle protein synthesis signaling is fully saturated; continuing to lift only increases muscle damage and cortisol.
- In cognitive focus: After 90 minutes of sustained deep work, synaptic neurotransmitters (acetylcholine and dopamine) are depleted, resulting in **attenuated cognitive retention**.

The app's mathematical models mathematically reward biological balance over reckless overexertion.`;
            }
        },
        {
            id: "screen_penalty_steepness",
            category: "Scoring & Math",
            title: "Why do screen penalties scale quadratically?",
            keywords: ["why screen penalty so high", "steep screen penalty", "quadratic screen penalty"],
            answer: function(liveData) {
                return `### 📉 Quadratic Distraction Penalty Mechanics

The screen penalty curve **$-(50 + 50n)$** is intentionally non-linear:
- 1 hour of screen time = $-100$ pts
- 2 hours = $-250$ pts (cumulative)
- 3 hours = $-450$ pts (cumulative)
- 4 hours = $-700$ pts (cumulative)

This exponential curve prevents rationalizing "just one more hour" of scrolling. It reflects the clinical reality that a 4-hour binge induces an **acute neurochemical slump** that ruins productivity for the rest of the day.`;
            }
        },
        {
            id: "zero_study_penalty",
            category: "Scoring & Math",
            title: "Does the app penalize you if you don't study at all?",
            keywords: ["penalty for not studying", "zero study penalty", "does app deduct points if no study"],
            answer: function(liveData) {
                return `### ⚖️ Neutrality on Zero-Study Days

**No, the app never deducts points simply for taking a day off.**
- If you log 0 hours of study and 0 hours of screen time, your score is **0 points (Clean Slate 🌱)**.
- Penalties are **active**, not passive: they are triggered exclusively by harmful habits like non-productive screen binges. Taking a genuine rest day with family or outdoors in nature does not penalize your score!`;
            }
        },
        {
            id: "partial_slot_math",
            category: "Scoring & Math",
            title: "How are partial 15-minute or 20-minute sessions scored?",
            keywords: ["partial sessions", "15 minute session score", "how partial slots work", "fractional points"],
            answer: function(liveData) {
                return `### 🧩 Fractional & Partial Session Scoring

- The app's visual timeline is divided into **30-minute atomic slots** (48 slots per day).
- When running the live timer in Academics Monitoring, fractional points are credited proportionally at **$1.67\\text{ pts per minute}$** (e.g., a 15-minute focus burst earns $+25$ points).
- Once a session crosses into a new 30-minute block, the corresponding slot on the timeline changes color to match your subject.`;
            }
        },
        {
            id: "max_theoretical_score",
            category: "Scoring & Math",
            title: "What is the maximum possible score achievable in 24 hours?",
            keywords: ["max possible score", "highest score achievable", "maximum points in a day", "world record score"],
            answer: function(liveData) {
                return `### 🌟 Maximum Theoretical Score in 24 Hours

Assuming optimal human biological limits (8h sleep, 2h workout, 8h academics, 2h skills, all tasks completed, 0m distraction):
- **Academics (8 hours)**: $+800\\text{ pts}$
- **Health (2 hours)**: $+120 + 90 = +210\\text{ pts}$
- **Skills (2 hours)**: $+100\\text{ pts}$
- **Planner Completion Bonus**: $+50\\text{ pts}$
- **Non-Productive Screen**: $0\\text{ pts}$
- **Theoretical Maximum**: **+1,160 points**!

*(Note: Human cognitive ceiling is usually around 5-6 hours of deep work, making a score of +600 to +750 an elite real-world achievement!)*`;
            }
        },
        {
            id: "deficit_recovery_speed",
            category: "Scoring & Math",
            title: "How many hours does it take to recover from a -300 deficit?",
            keywords: ["recover from deficit", "how to erase negative score", "recover -300 points", "deficit turnaround"],
            answer: function(liveData) {
                return `### ⚡ Deficit Turnaround Protocol (-300 Points)

To pull yourself out of a **-300 point deficit** into positive territory (+50 pts):
1. **Academics**: Complete two 90-minute study blocks ($3.0\\text{ hours total} = +300\\text{ pts}$).
2. **Workout**: Do a brisk 30-minute run or bodyweight workout ($+60\\text{ pts}$).
3. **Tasks**: Check off your planned tasks ($+50\\text{ pts}$).

**Total Earned**: $+410\\text{ pts} - 300\\text{ deficit} = \\mathbf{+110\\text{ pts}}$ (Solid Tier)! You can turn around a bad day in under 3.5 hours.`;
            }
        },
        {
            id: "weekly_net_accumulation",
            category: "Scoring & Math",
            title: "How is the 7-day weekly cumulative score calculated?",
            keywords: ["weekly cumulative score", "7 day score", "weekly total score", "how weekly score works"],
            answer: function(liveData) {
                return `### 📅 7-Day Performance Cycle Score

Your **Weekly Total** is the exact algebraic sum of your net scores across Monday through Sunday:

$$\\text{Weekly Total} = \\sum_{i=\\text{Mon}}^{\\text{Sun}} \\text{Net Score}_i$$

- **Elite Week**: $+2,800\\text{ to } +3,500\\text{ pts}$ (Average $+400$ to $+500$/day).
- **Solid Week**: $+1,750\\text{ to } +2,799\\text{ pts}$ (Average $+250$ to $+399$/day).
- **Rebound Week**: Below $+1,000\\text{ pts}$ (Indicates frequent distraction bleed or missing study blocks).`;
            }
        },
        {
            id: "daily_average_calculation",
            category: "Scoring & Math",
            title: "How is the rolling daily average calculated?",
            keywords: ["daily average score", "rolling average", "average score calculation", "daily average"],
            answer: function(liveData) {
                return `### 📊 Rolling Daily Average Metric

Your **Daily Avg** card on the home dashboard shows:

$$\\text{Daily Average} = \\frac{\\text{Cumulative Score for Elapsed Days of Current Week}}{\\text{Number of Elapsed Days}}$$

For example, on Wednesday evening (3 days elapsed: Mon, Tue, Wed) with scores of $+400$, $+350$, and $+450$, your Daily Average is:
$$\\frac{400 + 350 + 450}{3} = \\mathbf{+400\\text{ pts/day}}$$`;
            }
        },
        {
            id: "bonus_points_multiplier",
            category: "Scoring & Math",
            title: "Can you get more than +50 bonus for finishing all tasks?",
            keywords: ["more than 50 bonus", "task bonus multiplier", "extra bonus points", "double bonus"],
            answer: function(liveData) {
                return `### 🎖️ Task Bonus Rules & Limits

The Day Planner completion bonus is **fixed at +50 points**. 
- It is capped intentionally so that users do not game the system by creating 50 trivial 1-minute tasks (like "drink water", "open notebook") just to inflate their score.
- The real score engine is driven by **deep academic focus hours** and **physical workouts**, while the $+50$ bonus rewards organizational integrity.`;
            }
        },
        {
            id: "study_vs_skills_scoring",
            category: "Scoring & Math",
            title: "Why does Academics award 100/hr while Skills awards 50/hr?",
            keywords: ["academics vs skills", "why study more points than skills", "skills 50 study 100"],
            answer: function(liveData) {
                return `### ⚖️ Academics (+100/hr) vs Skills (+50/hr)

- **Academics ($+100/hr$)**: Represents formal academic coursework, technical problem-solving, test prep, and intensive cognitive memorization. It requires full prefrontal focus and active recall.
- **Skills ($+50/hr$)**: Represents secondary craft development, creative hobbies, language apps, reading fiction, or casual tutorials.
- Both are productive, but the engine gives highest priority to core academic and professional milestones.`;
            }
        },
        {
            id: "screen_grace_period",
            category: "Scoring & Math",
            title: "Is there a grace period for checking messages before penalties?",
            keywords: ["screen grace period", "grace period phone", "checking whatsapp penalty", "short phone use"],
            answer: function(liveData) {
                return `### ⏱️ Digital Grace Period & Quick Checks

- Brief 1-to-2 minute utility checks (replying to an urgent message, verifying a 2FA OTP, checking train timings) do not trigger severe penalties.
- Non-productive penalties scale with **cumulative hourly usage**. As long as your total non-productive screen time stays under **30 minutes across the entire day**, the deduction is minor ($-25\\text{ to } -40\\text{ pts}$), easily covered by a single 25-minute study session.`;
            }
        },
        {
            id: "health_optimal_duration",
            category: "Scoring & Math",
            title: "What is the mathematically optimal workout duration?",
            keywords: ["optimal workout time", "how long to workout", "best gym duration", "workout points sweet spot"],
            answer: function(liveData) {
                return `### 🏋️ Mathematically Optimal Workout Duration

Under the $150 - 30n$ formula:
- **60 Minutes ($n=1$)**: Yields $+120$ points (Highest point yield per minute).
- **90 Minutes ($n=1.5$)**: Yields $+165$ points total.
- **120 Minutes ($n=2$)**: Yields $+210$ points total.

Beyond 90-120 minutes, cortisol rises steeply while point yields drop to only $+30\\text{ pts/hr}$. **60 to 90 minutes is the scientifically and mathematically optimal training window**.`;
            }
        },
        {
            id: "weekly_graph_negative_bars",
            category: "Scoring & Math",
            title: "Why are some weekly bars extending downwards below the baseline?",
            keywords: ["weekly graph negative bars", "bars below baseline", "why red bar below zero", "weekly chart downwards"],
            answer: function(liveData) {
                return `### 📊 Reading the Baseline on the 7-Day Performance Chart

The horizontal zero line represents the **neutral threshold ($0\\text{ pts}$)**:
- **Bars extending upwards (Cyan, Purple, Emerald)**: Indicate positive days where focus outpaced distraction.
- **Bars extending downwards below the line (Coral / Red)**: Indicate days that concluded with a **Net Deficit**, where screen penalties or lack of focus pushed the score below zero.
- This gives you an honest, unvarnished visual mirror of your weekly discipline.`;
            }
        },
        {
            id: "mathematical_consistency_principle",
            category: "Scoring & Math",
            title: "Why is the scoring formula tuned for consistency over 14-hour spikes?",
            keywords: ["consistency over burnout", "why not study 14 hours", "scoring philosophy", "burnout prevention math"],
            answer: function(liveData) {
                return `### 🛡️ The Consistency Principle in Scoring Design

The app's mathematical engine was deliberately engineered by sports scientists and cognitive psychologists to prevent **toxic boom-and-bust cramming**:
- A student who studies 14 hours on Monday will burn out and score $-200$ for the next 3 days due to extreme brain fatigue (Net: $+500\\text{ pts}$).
- A student who studies a steady 4 hours every single day earns $+400 \\times 4 = \\mathbf{+1,600\\text{ pts}}$ with zero burnout!
- The algorithm rewards **repeatable, sustainable, daily habits** over erratic heroics.`;
            }
        },
        {
            id: "why_humans_need_breaks",
            category: "Human Biology & Breaks",
            title: "Why do humans need breaks? What is the 90-minute limit?",
            keywords: ["why humans need breaks", "90 minute limit", "why take breaks", "ultradian rhythm", "rest biology"],
            answer: function(liveData) {
                return `### 🧠 The Biological Necessity of the 90-Minute Focus Limit

Human cognitive performance does not operate like a continuous electric motor; it operates in **Ultradian Rhythms** (discovered by sleep researcher Nathaniel Kleitman):

1. **The 90-Minute Wave**: For roughly 90 minutes, your brain operates in high-frequency beta and gamma waves, utilizing acetylcholine to form synaptic connections.
2. **The Neurochemical Wall**: At the 90-to-120 minute mark, cellular waste (**adenosine**) accumulates in the synaptic cleft, and glucose stores in the prefrontal cortex deplete.
3. **The Decline**: Forcing study past 90 minutes without a break causes:
   - 40% reduction in memory retention
   - Eye strain and tension headaches
   - Compulsive urge to open social media for cheap stimulation.

💡 **Golden Rule**: Study for 60 to 90 minutes, then take a mandatory **10 to 15-minute biological rest**.`;
            }
        },
        {
            id: "overwork_alert_science",
            category: "Human Biology & Breaks",
            title: "What is an Overwork Alert and why is marathon studying harmful?",
            keywords: ["overwork alert", "marathon studying", "studying without breaks", "overwork danger", "why continuous study bad"],
            answer: function(liveData) {
                return `### 🛑 The Science of Overwork Alerts

When Producto detects continuous focus exceeding **90 to 120 minutes without a recorded break**, it triggers an **Overwork Alert**:

- **Illusion of Competence**: While you may feel like you are working hard, neuro-imaging shows that brain regions responsible for novel problem solving become dormant. You end up merely rereading text without comprehending it.
- **Physical Toll**: Elevated cortisol, shallow breathing (screen apnea), and muscular tightness in the neck and shoulders.
- **Cognitive Diminishing Returns**: What took 15 minutes to solve in hour 1 will take 45 minutes to solve in hour 3 of continuous work. Step away for 10 minutes to reset!`;
            }
        },
        {
            id: "break_bleed_danger",
            category: "Human Biology & Breaks",
            title: "What is Break Bleed and why are long breaks dangerous?",
            keywords: ["break bleed", "long breaks", "break longer than 45 mins", "why break bleed dangerous", "break over 60 mins"],
            answer: function(liveData) {
                return `### 🩸 Break Bleed: The Trap of the Extended Break

A **Break Bleed** occurs when a scheduled 15-minute recovery break stretches beyond **45 to 60 minutes**:

1. **Dopamine Baseline Crash**: Brief rest restores alertness. But an extended break (especially scrolling feeds or binge-watching) floods your brain with cheap dopamine. When you try to return to study, your brain perceives studying as painfully boring.
2. **Loss of Flow State Context**: Research by Gloria Mark at UC Irvine shows that it takes an average of **23 minutes and 15 seconds** to return to deep focus after a major interruption.
3. **Activation Energy Spikes**: The longer you stay away from your desk, the harder it is to overcome the inertia of restarting.

💡 **Remedy**: Keep breaks to **10–20 minutes**. If you need an afternoon recharge, take a strict 25-minute power nap rather than passive scrolling.`;
            }
        },
        {
            id: "earned_dopamine_spikes",
            category: "Human Biology & Breaks",
            title: "Is playing games or watching anime allowed? What is an earned dopamine spike?",
            keywords: ["playing games allowed", "watching anime", "earned dopamine", "cheap dopamine", "can i play video games", "reward system"],
            answer: function(liveData) {
                return `### 🎮 Earned Dopamine vs. Cheap Dopamine

**Yes, gaming, anime, and movies are 100% allowed and encouraged**—provided they are **Earned Dopamine Spikes**!

- **Cheap Dopamine (Toxic)**: Opening social media or gaming *before* your work is done or *during* study breaks. This fries your reward pathways, kills willpower, and triggers procrastination.
- **Earned Dopamine (Healthy)**: After completing **3 to 4 hours of intense study** and hitting your daily score target (+350 pts), enjoying 1 hour of gaming or anime acts as a powerful neurological reward.
- Your brain associates deep work with celebration, reinforcing discipline as an exciting lifestyle rather than a chore.`;
            }
        },
        {
            id: "afternoon_slump_biology",
            category: "Human Biology & Breaks",
            title: "Why do I feel lazy and unmotivated between 2 PM and 4 PM?",
            keywords: ["afternoon slump", "tired at 2pm", "post lunch slump", "lazy in afternoon", "circadian dip"],
            answer: function(liveData) {
                return `### 📉 The 2 PM – 4 PM Circadian Nadir

Feeling exhausted between 2 PM and 4 PM is **not laziness—it is pure human circadian biology**:

1. **Core Body Temperature Drop**: Your 24-hour circadian clock experiences a natural dip in core body temperature and alertness ~7-8 hours after waking.
2. **Post-Prandial Blood Shunt**: Digestion of high-carb lunch routes blood away from the brain to the gastrointestinal tract.
3. **Adenosine Pressure Peak**: The sleep pressure molecule (adenosine) reaches a midday peak before your evening cortisol rebound.

💡 **How to Handle the 2–4 PM Dip**:
- Do **not** fight it with high-sugar energy drinks.
- Do light, low-cognitive tasks (organizing notes, administrative chores, flashcards).
- Take a **20-minute power nap** or a brisk 15-minute outdoor walk in natural sunlight.`;
            }
        },
        {
            id: "five_minute_rule",
            category: "Human Biology & Breaks",
            title: "How does the 5-Minute Rule beat procrastination?",
            keywords: ["5 minute rule", "beat procrastination", "how to start studying", "limbic friction", "overcoming laziness"],
            answer: function(liveData) {
                return `### ⏱️ The 5-Minute Activation Threshold

Procrastination is rarely a time management problem; it is an **emotional regulation problem**:
- When you think about "studying physics for 4 hours", your **amygdala** perceives it as a threat, triggering stress and avoidance.
- **The 5-Minute Rule**: Commit to working on the task for **just 5 minutes**. Tell yourself: *"I only have to read 2 pages or write 1 line of code. If I want to stop after 5 minutes, I can."*
- **The Zeigarnik Effect**: In over 80% of cases, once you cross the 5-minute activation hurdle, your brain enters task immersion and naturally continues for 45 to 90 minutes!`;
            }
        },
        {
            id: "sleep_memory_consolidation",
            category: "Human Biology & Breaks",
            title: "How does sleep quality affect memory consolidation?",
            keywords: ["sleep memory consolidation", "sleep study retention", "why sleep matters", "nrem sleep memory"],
            answer: function(liveData) {
                return `### 🛌 Sleep: Where Learning Actually Happens

You do not store long-term memories while sitting at your desk; **you encode them while sleeping**:

1. **Slow-Wave Sleep (NREM Stage 3)**: The hippocampus replays the day's study material at 10x speed, transferring memories to the permanent neocortex.
2. **Synaptic Homeostasis**: While asleep, your brain prunes away weak neural noise, sharpening the key formulas and concepts you learned.
3. **CSF Glymphatic Wash**: Cerebrospinal fluid washes through brain tissue, clearing metabolic amyloid-beta plaques.

⚠️ *Pulling an all-nighter destroys up to 40% of newly learned facts. 7.5 to 8.5 hours of sleep is non-negotiable for academic mastery.*`;
            }
        },
        {
            id: "habit_loop_neuroscience",
            category: "Human Biology & Breaks",
            title: "How does the Habit Loop (Cue, Routine, Reward) build consistency?",
            keywords: ["habit loop", "cue routine reward", "atomic habits", "how habits work", "build study habit"],
            answer: function(liveData) {
                return `### 🔄 The Habit Loop Neuroscience (Duhigg & Clear)

Every human habit is governed by a 3-part neurological loop in the **basal ganglia**:

1. **The Cue (Trigger)**: An environmental anchor (e.g., sitting at your clean desk at 8:00 AM with a glass of water).
2. **The Routine (Behavior)**: Opening Productometer, starting the Academics timer, and doing 50 minutes of deep work.
3. **The Reward (Neurological Feedback)**: Earning $+100$ points on the daily score, watching your graph climb, and enjoying a relaxing 10-minute tea break.

When repeated for 21 to 66 days, the prefrontal cortex hands over the behavior to the basal ganglia: **studying becomes automatic and effortless**.`;
            }
        },
        {
            id: "adenosine_buildup",
            category: "Human Biology & Breaks",
            title: "What is adenosine and why taking breaks clears mental fog?",
            keywords: ["adenosine", "mental fog", "why brain gets tired", "adenosine buildup", "brain fatigue"],
            answer: function(liveData) {
                return `### 🧪 Adenosine: The Molecular Sleep Pressure

- Every second your neurons fire, they consume ATP (adenosine triphosphate) and leave behind **adenosine**.
- As adenosine binds to $A_1$ and $A_{2A}$ receptors in the brain, it slows down neural transmission, producing feelings of heaviness and mental fog.
- Taking a **10-minute break away from screens** allows the brain to metabolize stress markers and replenish intracellular glycogen, restoring sharp focus for your next session.`;
            }
        },
        {
            id: "prefrontal_cortex_fatigue",
            category: "Human Biology & Breaks",
            title: "What is Prefrontal Cortex fatigue and decision fatigue?",
            keywords: ["prefrontal cortex fatigue", "decision fatigue", "willpower depletion", "ego depletion", "running out of willpower"],
            answer: function(liveData) {
                return `### 🛡️ Prefrontal Cortex Exhaustion & Willpower

Your **Prefrontal Cortex (PFC)** is the brain region responsible for executive function, impulse control, problem-solving, and resisting distractions:

- Unlike muscles, the PFC has very limited glycogen reserves.
- Making 50 micro-decisions in the morning (what to wear, checking 10 notifications, reading news) leaves you with **decision fatigue** before you even open your textbook.
- **The Solution**: Automate trivial morning decisions, schedule your high-priority academic block first, and guard your morning focus fiercely.`;
            }
        },
        {
            id: "attention_residue_theory",
            category: "Human Biology & Breaks",
            title: "What is Attention Residue and why quick phone checks ruin focus?",
            keywords: ["attention residue", "quick phone check", "checking notifications", "distraction residue", "multitasking myth"],
            answer: function(liveData) {
                return `### 🧬 Attention Residue Theory (Dr. Sophie Leroy)

When you are studying and glance at your phone for "just 10 seconds" to check an Instagram DM:
- Your attention does **not** cleanly switch back to your textbook when you put the phone down.
- A portion of your working memory remains stuck on the message (**Attention Residue**).
- Studies show that attention residue impairs comprehension, problem-solving speed, and short-term memory for **15 to 25 minutes** after a single micro-interruption!`;
            }
        },
        {
            id: "context_switching_cost",
            category: "Human Biology & Breaks",
            title: "What is the cognitive cost of multitasking and context switching?",
            keywords: ["context switching", "multitasking", "switching subjects", "cognitive load multitasking"],
            answer: function(liveData) {
                return `### 🔀 The Heavy Penalty of Context Switching

Human brains **cannot multitask cognitive tasks**; they execute rapid, frantic context switching:
- Switching between Math, answering a text, and listening to a podcast with lyrics forces the brain to reload schemas into working memory repeatedly.
- Research reveals that chronic multitaskers make **50% more errors** and take **up to twice as long** to complete assignments compared to single-task focused students.`;
            }
        },
        {
            id: "flow_state_neurochemistry",
            category: "Human Biology & Breaks",
            title: "How do dopamine, norepinephrine, and acetylcholine trigger flow?",
            keywords: ["flow state", "neurochemistry of flow", "how to enter flow", "dopamine acetylcholine focus"],
            answer: function(liveData) {
                return `### 🌊 The Neurochemistry of the Flow State (Mihaly Csikszentmihalyi)

Flow state is triggered by a precise neurochemical cocktail:
1. **Norepinephrine & Epinephrine**: Creates high alertness and physical readiness.
2. **Acetylcholine**: Acts as the brain's spotlight, highlighting the exact problem on your page.
3. **Dopamine**: Rewards pattern recognition and sustains goal-directed curiosity.
4. **Endorphins & Anandamide**: Suppress physical discomfort and self-critical inner chatter.

To trigger this state: set a clear goal, eliminate all notifications, and match task difficulty slightly above your skill level.`;
            }
        },
        {
            id: "ultradian_rhythm_cycles",
            category: "Human Biology & Breaks",
            title: "How do 90-minute ultradian cycles govern daily energy?",
            keywords: ["ultradian rhythm cycles", "90 minute cycle", "body clock 90 mins", "energy cycles"],
            answer: function(liveData) {
                return `### ⏳ Ultradian Rhythms: The Natural Work/Rest Pulse

Just as the 24-hour **Circadian Rhythm** governs our day/night cycle, **Ultradian Rhythms** govern our daytime performance in ~90-to-120 minute pulses:
- **Trough to Peak (~70–90 mins)**: High alertness, rapid synaptic firing, peak working memory.
- **Trough (~15–20 mins)**: Spontaneous daydreaming, yawning, restlessness, reduced vigilance.
- Working *with* your ultradian rhythm by taking a 15-minute break at the trough prevents chronic fatigue.`;
            }
        },
        {
            id: "optimal_break_activities",
            category: "Human Biology & Breaks",
            title: "What should you do during a study break?",
            keywords: ["best break activities", "what to do on break", "good study breaks", "healthy break"],
            answer: function(liveData) {
                return `### 🌿 Optimal Biological Break Activities

During your 10 to 15-minute break, your goal is **sensory decompression**:
- ✅ **Drink 300ml of cold water**: Rehydrates brain tissue.
- ✅ **Gaze at the distant horizon (20+ feet)**: Relaxes the ciliary muscles of the eyes (optic panoramic view).
- ✅ **Do light body stretches or a 5-minute walk**: Restores pelvic blood circulation.
- ✅ **Take 5 deep physiological sighs**: 2 quick nasal inhales followed by a long mouth exhale.
- ❌ **Do NOT scroll short-form videos**: This floods your brain with more visual stimuli, defeating the purpose of a break.`;
            }
        },
        {
            id: "toxic_break_activities",
            category: "Human Biology & Breaks",
            title: "Why is scrolling social media during a break counterproductive?",
            keywords: ["bad break activities", "scrolling on break", "tiktok on break", "social media break"],
            answer: function(liveData) {
                return `### ⚠️ Why Social Media Scrolling Ruins Breaks

Scrolling TikTok, Reels, or Twitter during a study break is **not rest**:
- **Dopamine Depletion**: Each 15-second clip forces your visual cortex to parse novel stimuli, consuming more mental energy than reading a textbook.
- **Emotional Triggering**: Exposes you to rage-bait, news, or comparison anxiety that lingers in your mind when you sit back down.
- **Time Dilation**: 5 planned minutes easily turns into 40 minutes of Break Bleed.`;
            }
        },
        {
            id: "dopamine_baseline_reset",
            category: "Human Biology & Breaks",
            title: "How does cheap hyper-stimulating dopamine numb motivation?",
            keywords: ["dopamine baseline", "cheap dopamine", "dopamine detox", "why study feels boring", "dopamine reset"],
            answer: function(liveData) {
                return `### 🎯 Dopamine Baseline Dynamics (Dr. Anna Lembke)

- In the brain, **pain and pleasure are co-located on a neurochemical teeter-totter**.
- When you consume hyper-stimulating stimuli (infinite scroll, sugar, gaming), the brain down-regulates dopamine receptors ($D_2$) to protect itself from over-excitation.
- As a result, your **dopamine baseline drops below normal**. Everyday essential tasks like reading, solving math, and attending lectures suddenly feel agonizingly boring and painful.
- Doing a 24-hour "low-stimulation detox" resets your receptors so reading and studying feel deeply engaging again.`;
            }
        },
        {
            id: "parkinsons_law_focus",
            category: "Human Biology & Breaks",
            title: "What is Parkinson's Law and how do you compress study time?",
            keywords: ["parkinsons law", "work expands to fill time", "compress study time", "artificial deadlines"],
            answer: function(liveData) {
                return `### ⏳ Parkinson's Law: Work Expands to Fill Available Time

- If you give yourself 8 hours to study 2 chapters, you will take 8 hours, filled with daydreaming and procrastination.
- If you give yourself a strict **90-minute deadline with a countdown timer**, your brain eliminates perfectionism and focuses exclusively on high-yield concepts.
- **Strategy**: Always set tight, structured blocks in Day Planner rather than having open-ended "study all day" sessions.`;
            }
        },
        {
            id: "power_nap_science",
            category: "Human Biology & Breaks",
            title: "What is the science of the 20-minute power nap?",
            keywords: ["power nap", "20 minute nap", "afternoon nap", "how to take power nap", "nap science"],
            answer: function(liveData) {
                return `### ⚡ The 20-Minute Power Nap Protocol

- **Duration**: Strict **20 to 25 minutes**. (Setting an alarm is mandatory).
- **The Science**: A 20-minute nap stays in **Stage 2 Light NREM sleep**. It clears accumulated adenosine without entering Stage 3 Deep Sleep (which causes grogginess and sleep inertia).
- **The Result**: NASA pilots who took 26-minute naps showed a **34% increase in performance** and **54% improvement in physiological alertness**.`;
            }
        },
        {
            id: "nsdr_yoga_nidra",
            category: "Human Biology & Breaks",
            title: "What is Non-Sleep Deep Rest (NSDR / Yoga Nidra)?",
            keywords: ["nsdr", "yoga nidra", "non sleep deep rest", "andrew huberman nsdr", "deep mental reset"],
            answer: function(liveData) {
                return `### 🧘 Non-Sleep Deep Rest (NSDR): The Zero-Grogginess Reset

Developed by neuroscientist Dr. Andrew Huberman based on ancient Yoga Nidra:
- **What it is**: A 10-to-20 minute guided session of body scanning and slow, deliberate breathing while lying down or seated.
- **Why it works**: It shifts the autonomic nervous system from sympathetic (fight-or-flight) to **parasympathetic (rest-and-digest)** while keeping your conscious mind awake.
- It accelerates neuroplasticity and replenishes dopamine in the striatum without any grogginess!`;
            }
        },
        {
            id: "sunlight_circadian_anchor",
            category: "Human Biology & Breaks",
            title: "Why is morning sunlight within 30 minutes of waking vital?",
            keywords: ["morning sunlight", "circadian anchor", "view sunlight morning", "melatonin timer", "morning light"],
            answer: function(liveData) {
                return `### ☀️ Morning Sunlight: The Master Circadian Trigger

- Within 30 to 60 minutes of waking, step outside and view natural sunlight for **10 to 15 minutes** (without looking directly at the sun or wearing sunglasses).
- Photons hit specialized **Intrinsically Photosensitive Retinal Ganglion Cells (ipRGCs)**, sending direct signals to the **Suprachiasmatic Nucleus (SCN)** in your brain.
- This triggers a healthy morning cortisol pulse for alertness AND starts an internal timer that releases melatonin **14 to 16 hours later**, guaranteeing effortless deep sleep tonight!`;
            }
        },
        {
            id: "caffeine_adenosine_cutoff",
            category: "Human Biology & Breaks",
            title: "What is the 2:00 PM caffeine curfew and why does it matter?",
            keywords: ["caffeine cutoff", "coffee after 2pm", "caffeine half life", "when to stop caffeine", "coffee study"],
            answer: function(liveData) {
                return `### ☕ The 2:00 PM Caffeine Curfew

- **Caffeine does not give you energy**; it acts as an **adenosine receptor antagonist**, plugging up receptors so you cannot feel tiredness.
- **The Pharmacokinetics**: Caffeine has a half-life of **5 to 7 hours** and a quarter-life of **10 to 12 hours**.
- If you drink a cup of coffee at 4:00 PM, 25% of that caffeine is still actively blocking adenosine receptors in your brain at 2:00 AM! This ruins deep restorative sleep even if you fall asleep.`;
            }
        },
        {
            id: "physiological_sigh",
            category: "Human Biology & Breaks",
            title: "How does the Physiological Sigh instantly reduce stress?",
            keywords: ["physiological sigh", "instant stress relief", "how to calm down", "double inhale exhale", "breathing exercise"],
            answer: function(liveData) {
                return `### 🫁 The Physiological Sigh (Fastest Way to Stop Anxiety)

Discovered by physiologists in the 1930s and popularized by Stanford neurobiology:
1. **Take two rapid inhales through your nose**: First inhale fills your lungs, second quick inhale pops open collapsed lung alveoli.
2. **One long, slow exhale through your mouth** until your lungs are completely empty.
3. Repeat **2 to 3 times**.
- **The Mechanism**: Drops carbon dioxide ($CO_2$) levels in the bloodstream and engages the vagus nerve, immediately slowing your heart rate in under 30 seconds.`;
            }
        },
        {
            id: "hyperfocus_trap",
            category: "Human Biology & Breaks",
            title: "What is the Hyperfocus Trap and why must you stop at 90 minutes?",
            keywords: ["hyperfocus trap", "why stop studying when in flow", "stopping at high point", "ernest hemingway rule"],
            answer: function(liveData) {
                return `### 🪤 The Hyperfocus Trap & The Hemingway Rule

- When you are deep in flow, it is tempting to study 5 hours straight without eating or drinking.
- **The Trap**: Exhausting 100% of your cognitive reserves today guarantees severe brain fog, irritability, and zero productivity tomorrow.
- **The Ernest Hemingway Principle**: Always pause your work when things are going great! Leaving a clear starting point for your next session eliminates procrastination and maintains continuous momentum.`;
            }
        },
        {
            id: "active_vs_passive_rest",
            category: "Human Biology & Breaks",
            title: "What is the difference between Active Rest and Passive Distraction?",
            keywords: ["active rest vs passive", "real rest", "passive distraction", "how to truly recover"],
            answer: function(liveData) {
                return `### 🌿 Active Rest vs. Passive Distraction

- **Passive Distraction (Fake Rest)**: Scrolling feeds, playing mobile games, watching random YouTube clips. Keeps heart rate and cortisol elevated while bombarding the sensory cortex.
- **Active Rest (True Biological Recovery)**: Walking without headphones, drinking tea, taking a warm shower, foam rolling, breathing exercises, or a 15-minute nap. Restores autonomic balance and prepares you for deep focus.`;
            }
        },
        {
            id: "pomodoro_timer_mechanics",
            category: "Academics",
            title: "How does the Pomodoro focus timer work in Academics?",
            keywords: ["pomodoro timer", "how focus timer works", "start study timer", "academics timer", "study session start"],
            answer: function(liveData) {
                return `### ⏱️ Academics Pomodoro Focus Engine

The **Academics Monitoring** module features an intelligent Pomodoro focus timer engineered for deep work:

1. **Preset Durations**: Tap preset intervals (25m, 45m, 50m, 60m, 90m) or customize your session length.
2. **One-Tap Start**: Tap the green **Start Session** button to begin. The visual circular progress ring animates in real time.
3. **Automatic Timeline Slotting**: Every 30 minutes of logged focus fills a corresponding slot on the 24-hour visual bar and credits $+50$ points ($+100/hr$).
4. **Completion Chime**: At the end of the block, a gentle chime notifies you to step away for your 10-minute biological recovery.`;
            }
        },
        {
            id: "distraction_alarm_triggers",
            category: "Academics",
            title: "Why does the alarm sound when I switch tabs or minimize?",
            keywords: ["distraction alarm", "alarm sounds tab switch", "why alarm ringing", "tab switch alarm", "window blur alarm"],
            answer: function(liveData) {
                return `### 🚨 The Distraction Alarm System

The Distraction Alarm is an active defense mechanism that triggers an audible alert if you deviate from your task:

- **Browser Tab Blur**: If you navigate away from your approved study tab to social media or an entertainment site, the \`window.blur\` event triggers an audio alarm after a 3-second grace period.
- **Window Minimization**: Minimizing your study portal activates the alarm.
- **Purpose**: To snap you out of mindless autopilot browsing before you lose 45 minutes to infinite scroll feeds!
- You can toggle this sound on/off in the Academics settings bar.`;
            }
        },
        {
            id: "whitelist_websites",
            category: "Academics",
            title: "How do I add approved online learning sites to the Whitelist?",
            keywords: ["whitelist websites", "approved study sites", "add allowed websites", "how to whitelist", "learning sites whitelist"],
            answer: function(liveData) {
                return `### 🌐 Customizing the Study Whitelist

You can whitelist online learning platforms so you can research without triggering the alarm:

1. In **Academics Monitoring**, click on the **⚙️ Whitelist Settings** tab.
2. Type the domain or URL (e.g., \`coursera.org\`, \`khanacademy.org\`, \`docs.python.org\`, \`wikipedia.org\`).
3. Tap **Add to Whitelist**.
4. Now, visiting these approved research resources during an active session is permitted and counted as productive time!`;
            }
        },
        {
            id: "tab_switch_penalty",
            category: "Academics",
            title: "How is tab switching detected and penalized?",
            keywords: ["tab switch penalty", "penalized for switching tabs", "tab switch detection", "switching windows during study"],
            answer: function(liveData) {
                return `### ⚠️ Tab Switching & Attention Loss Metrics

- Each time you switch away from the active study portal to an unapproved tab, the event is logged in your session telemetry.
- If you switch tabs more than **3 times within a 30-minute block**, Producto flags an **Attention Residue Warning**.
- While you are off-task, the focus timer pauses accumulating positive academic points until you return to your study window.`;
            }
        },
        {
            id: "study_anytime_mode",
            category: "Academics",
            title: "Can I study ahead or start a scheduled task at any time?",
            keywords: ["study anytime", "study ahead", "start session anytime", "study outside schedule", "can i study early"],
            answer: function(liveData) {
                return `### 🚀 Study Anytime Mode: Frictionless Execution

**Yes, absolutely!** You are never locked into your clock schedule:
- Even if your Day Planner has physics scheduled for 4:00 PM, you can open **Academics Monitoring** at 10:00 AM and tap **Start Session** right away.
- When you finish, tap the **⚡ Sync with Planner** button. The app automatically matches your focus time with your planned subject and marks the slot as completed on your 24-hour timeline bar!`;
            }
        },
        {
            id: "academics_planner_sync",
            category: "Academics",
            title: "How does Academics Monitoring sync with Day Planner?",
            keywords: ["academics planner sync", "how study syncs with planner", "sync button", "day planner sync"],
            answer: function(liveData) {
                return `### 🔄 Two-Way Academics & Planner Synchronization

Academics Monitoring and Day Planner are linked by a unified data bus:
1. **From Planner to Timer**: Clicking **Launch Session** on any academic task in Day Planner opens the Academics timer pre-set to that task's name and duration.
2. **From Timer to Planner**: Completing a timer session automatically updates the task's progress bar in Day Planner.
3. If all scheduled tasks for that subject are finished, the task receives a green completion checkmark, contributing toward your **+50 bonus**!`;
            }
        },
        {
            id: "adjust_session_duration",
            category: "Academics",
            title: "How do I adjust session duration (add +5m, +10m)?",
            keywords: ["adjust session duration", "add 5m", "add 10m to timer", "extend study session", "increase timer time"],
            answer: function(liveData) {
                return `### ➕ Extending an Active Focus Session

If you are in deep flow and want to keep going when the timer nears zero:
- Tap the **+5m** or **+10m** pill buttons directly below the circular timer ring.
- The session duration expands seamlessly without resetting your streak or interrupting your focus audio.
- The timeline bar dynamically expands your study block to reflect the bonus minutes!`;
            }
        },
        {
            id: "total_study_hours_today",
            category: "Academics",
            title: "Where can I see my live total study hours today?",
            keywords: ["total study hours", "where to see study time", "hours studied today", "daily study total"],
            answer: function(liveData) {
                return `### 📊 Viewing Your Live Study Hours

You can check your total academic hours in 3 places:
1. **Academics Monitoring Screen**: The top hero card shows **Total Focus Logged** (e.g. \`3.5h\`) and total sessions completed today.
2. **Home Dashboard**: The top 24-hour timeline bar displays all your academic slots in vivid cyan/blue.
3. **Producto AI**: Tap **"📊 Summarise My Day"** to get a full itemized breakdown of exact academic hours and earned points!`;
            }
        },
        {
            id: "active_recall_strategies",
            category: "Academics",
            title: "How do I implement Active Recall while running the timer?",
            keywords: ["active recall", "how to do active recall", "active recall study method", "testing yourself"],
            answer: function(liveData) {
                return `### 🧠 Implementing Active Recall During Focus Blocks

Active recall is clinically proven to be **300% more effective** than passive rereading:
1. **The Blurting Method**: Read a sub-topic for 15 minutes. Close the book and spend 5 minutes writing down everything you remember from pure memory on a blank sheet of paper.
2. **Question-Based Notes**: Instead of writing summaries, write questions (e.g., *"Why does the Krebs cycle produce NADH?"*). Test yourself every 20 minutes.
3. **Flashcards**: Use digital or paper flashcards to force neural retrieval pathways to fire.`;
            }
        },
        {
            id: "spaced_repetition_integration",
            category: "Academics",
            title: "How should I structure Spaced Repetition intervals?",
            keywords: ["spaced repetition", "forgetting curve", "ebbinghaus", "spaced repetition intervals", "review schedule"],
            answer: function(liveData) {
                return `### 📅 The Ebbinghaus Spaced Repetition Cadence

To permanently defeat the **Forgetting Curve**, review concepts at expanding biological intervals:
- **Interval 1**: 24 Hours after first learning (Overcomes 70% of immediate memory loss).
- **Interval 2**: Day 3 (Re-anchors synaptic pathways).
- **Interval 3**: Day 7 (Consolidates to permanent storage).
- **Interval 4**: Day 30 (Locks in mastery for exams).
- Use Day Planner's recurring tags to schedule 20-minute review sessions at these intervals!`;
            }
        },
        {
            id: "feynman_technique_workflow",
            category: "Academics",
            title: "How do I use the Feynman Technique during focus blocks?",
            keywords: ["feynman technique", "richard feynman", "explain to a child", "feynman study method"],
            answer: function(liveData) {
                return `### 👨‍🏫 The 4-Step Feynman Technique

Named after Nobel laureate Richard Feynman:
1. **Choose a Concept**: Identify a difficult formula, theorem, or mechanism.
2. **Teach It to a 10-Year-Old**: Explain it out loud or write it on paper using simple words and zero technical jargon.
3. **Identify Gaps**: When you hesitate or use jargon to hide confusion, stop! Return to your textbook to clarify that exact link.
4. **Simplify & Create Analogies**: Formulate a vivid metaphor (e.g., explaining electrical resistance as a narrow hallway).`;
            }
        },
        {
            id: "exam_cramming_vs_consistency",
            category: "Academics",
            title: "Why does steady 3-hour study beat 12-hour last-minute cramming?",
            keywords: ["cramming vs consistency", "why cramming fails", "last minute cramming", "consistent study beats cramming"],
            answer: function(liveData) {
                return `### ⚖️ Consistency vs. All-Night Cramming

- **12-Hour Cramming**: Triggers extreme cortisol spikes. Working memory can only hold information in temporary synaptic buffering. 72 hours after the exam, **over 85% of the information vanishes from your brain**.
- **Steady 3 Hours Daily**: Allows slow-wave sleep to consolidate each concept every night. Dendritic spines grow and strengthen, turning knowledge into permanent cognitive muscle. You experience zero exam panic.`;
            }
        },
        {
            id: "session_pause_limits",
            category: "Academics",
            title: "How long can I pause a study session before it cancels?",
            keywords: ["pause study timer", "pause limit", "how long can i pause", "timer pause timeout"],
            answer: function(liveData) {
                return `### ⏸️ Timer Pause Grace Limits

- You can pause your timer for short emergencies or a glass of water.
- **Grace Window**: If a session remains paused for **longer than 15 minutes**, the app automatically finalizes the completed focus minutes to prevent timeline corruption and logs a break gap.
- You can restart a new session with one tap whenever you are ready!`;
            }
        },
        {
            id: "sound_notification_alerts",
            category: "Academics",
            title: "How do I customize focus timer chimes and distraction alarms?",
            keywords: ["timer sounds", "alarm sounds", "customize chime", "sound settings academics"],
            answer: function(liveData) {
                return `### 🔔 Audio Alerts & Chime Settings

In the **Academics Monitoring** top header:
- Click the **🔊 Audio Icon** to toggle between **Gentle Bell**, **Digital Ping**, or **Mute**.
- The Distraction Alarm volume can be adjusted or set to vibrate-only mode in the Android app via \`NativeBridge.vibrate()\`.`;
            }
        },
        {
            id: "subject_tagging",
            category: "Academics",
            title: "How do I categorize sessions by subject (Math, Physics, Coding)?",
            keywords: ["subject tagging", "categorize study by subject", "add subject tag", "math physics coding"],
            answer: function(liveData) {
                return `### 🏷️ Subject Tagging & Multi-Color Coding

- Before starting a timer session, tap the **Subject Pill** to select:
  - 📐 **Mathematics** (Electric Blue)
  - 🔬 **Physics / Science** (Neon Cyan)
  - 💻 **Computer Science / Coding** (Emerald Green)
  - 📚 **Literature / Humanities** (Purple)
- Your 24-hour timeline bar displays these distinct colors, giving you an immediate visual overview of your subject balance today!`;
            }
        },
        {
            id: "deep_work_chamber",
            category: "Academics",
            title: "How do I set up a distraction-free digital and physical study chamber?",
            keywords: ["deep work setup", "study room setup", "distraction free environment", "desk setup for focus"],
            answer: function(liveData) {
                return `### 🏛️ The Deep Work Study Chamber Protocol

1. **Physical Isolation**: Keep your smartphone in another room or out of arm's reach (reduces cognitive friction by 70%).
2. **Clean Field of View**: Clear your desk of everything except your notebook, pen, and a 1-liter bottle of water.
3. **Full-Screen Browser**: Press **F11** to enter full-screen mode on Productometer to eliminate desktop taskbar icons.
4. **Lighting**: Ensure bright, cool light (5000K) directly illuminating your workspace to stimulate vigilance.`;
            }
        },
        {
            id: "session_cancellation",
            category: "Academics",
            title: "What happens to my score if I cancel a session midway?",
            keywords: ["cancel session score", "what happens if i cancel timer", "discard study session", "cancel timer"],
            answer: function(liveData) {
                return `### 🛑 Session Cancellation & Score Preservation

- If you cancel a session before completing at least **10 minutes**, the session is treated as an abandoned trial and awards 0 points.
- If you cancel after **10+ minutes**, the app asks: *"Save completed focus time?"*
- If you tap **Save**, all elapsed focus minutes are preserved and added to your score at $1.67\\text{ pts/minute}$!`;
            }
        },
        {
            id: "multiple_subjects_per_day",
            category: "Academics",
            title: "Is it better to study one subject all day or rotate 2-3 subjects?",
            keywords: ["rotate subjects", "one subject all day", "interleaving", "multiple subjects study"],
            answer: function(liveData) {
                return `### 🔀 Interleaving vs. Blocked Practice

Cognitive science strongly recommends **Interleaving (rotating 2 to 3 distinct subjects)**:
- Studying 8 hours of one subject leads to **semantic satiation** (brain becomes numb to the concepts).
- Rotating between an analytical subject (Calculus) in the morning and a conceptual subject (Biology/History) in the late afternoon activates different neural networks, keeping cognitive stamina high all day.`;
            }
        },
        {
            id: "pomodoro_custom_intervals",
            category: "Academics",
            title: "When should I use 50/10 vs 25/5 vs 90/20 Pomodoro intervals?",
            keywords: ["50/10 vs 25/5", "pomodoro intervals", "90/20 interval", "best pomodoro length"],
            answer: function(liveData) {
                return `### ⏱️ Selecting the Optimal Focus Interval

- **25 / 5 (Classic Pomodoro)**: Best for high-friction tasks, heavy memorization, flashcards, or when feeling sluggish and building momentum.
- **50 / 10 (Deep Work Standard)**: The gold standard for problem sets, coding, essay writing, and analytical reading.
- **90 / 20 (Ultradian Cycle)**: For advanced students executing full-length mock exams or creative architectural projects.`;
            }
        },
        {
            id: "study_streak_preservation",
            category: "Academics",
            title: "How are study streaks counted across consecutive days?",
            keywords: ["study streak", "consecutive study days", "how streak works", "streak preservation"],
            answer: function(liveData) {
                return `### 🔥 Study Streak Mechanics

- Logging at least **45 minutes of focus** or **+150 points** in a calendar day counts as an active streak day.
- Your streak counter increments each midnight.
- **Streak Freeze**: Life happens! If an emergency prevents study, the app allows a 1-day grace period if you score $+300$ points on the immediate rebound day!`;
            }
        },
        {
            id: "late_night_study_penalty",
            category: "Academics",
            title: "Does studying past midnight affect the timeline or health score?",
            keywords: ["studying past midnight", "late night study", "night owl studying", "midnight timeline"],
            answer: function(liveData) {
                return `### 🌙 Studying Past Midnight & Circadian Health

- The app's timeline rolls over at **12:00 AM (Midnight)**.
- Any focus logged between 12:00 AM and 4:00 AM is credited to the new day's early morning slots (slots 0 to 8).
- **Health Warning**: While the app awards academic points, Producto will issue a gentle warning if late-night study compromises your 8-hour sleep baseline!`;
            }
        },
        {
            id: "audio_focus_ambience",
            category: "Academics",
            title: "Should I use brown noise, binaural beats, or lofi during sessions?",
            keywords: ["brown noise", "binaural beats", "lofi for studying", "music while studying", "study audio"],
            answer: function(liveData) {
                return `### 🎧 The Science of Focus Audio

- **Brown Noise / Pink Noise**: Excellent for masking disruptive background chatter and lowering cortisol.
- **40Hz Binaural Beats**: Stimulates gamma-wave oscillations, proven to enhance focus and working memory speed.
- **Lofi Beats**: Good for light reading, provided there are **zero human vocal lyrics** (lyrics hijack the phonological loop of working memory).`;
            }
        },
        {
            id: "session_notes_logging",
            category: "Academics",
            title: "How do I log session notes and key takeaways?",
            keywords: ["session notes", "log takeaways", "study notes in app", "how to write session notes"],
            answer: function(liveData) {
                return `### 📝 Logging Session Takeaways

- When completing an Academics session, an optional **Session Debrief Dialog** appears.
- Enter 1 or 2 bullet points of what you mastered (e.g. *"Solved 8 integration by parts problems"*).
- These notes appear in your Day Planner history and feed into Producto's daily synthesis report!`;
            }
        },
        {
            id: "timeline_block_sync",
            category: "Academics",
            title: "How does a completed academic session fill the 24-hour timeline bar?",
            keywords: ["timeline fill", "how study fills timeline", "24 hour timeline bar", "timeline blocks"],
            answer: function(liveData) {
                return `### 🌈 Visual 24-Hour Timeline Bar Mechanics

The 24-hour bar at the top of your dashboard represents your day broken down into **48 half-hour slots**:
- When you study from 9:00 AM to 10:30 AM (3 slots: slots 18, 19, 20), the slots illuminate in your chosen academic theme color.
- Empty slots show dark gaps, allowing you to instantly spot your productive focus zones vs idle gaps at a single glance.`;
            }
        },
        {
            id: "recovering_lost_session",
            category: "Academics",
            title: "What should I do if my laptop went to sleep during a session?",
            keywords: ["laptop sleep during study", "recovering lost session", "timer paused when computer slept", "crash session recovery"],
            answer: function(liveData) {
                return `### 🛡️ Crash & Sleep Session Recovery

- Productometer records heartbeats to browser \`localStorage\` every 10 seconds.
- If your device sleeps or the browser closes unexpectedly, open the app again:
- The app detects the interrupted session and offers: *"Recover X minutes of study?"*
- Tap **Recover** to restore your elapsed points and fill your timeline slots accurately!`;
            }
        },
        {
            id: "schedule_sessions_planner",
            category: "Day Planner",
            title: "How do I schedule sessions in Day Planner?",
            keywords: ["how to schedule", "how do i schedule", "how to add task in planner", "guide to day planner", "day planner instructions"],
            answer: function(liveData) {
                return `### 📅 How to Schedule Tasks in Day Planner

1. Navigate to **Features > Day Planner** or tap the **Planner** card on Home.
2. Enter your task title (e.g., *"Calculus Problem Set 3"*).
3. Select a category: **Academics**, **Skills**, **Health**, or **Other**.
4. Use the **Drum Time Picker** to set your start time and end time (snaps to 30-minute intervals).
5. Tap **Add Task**. The scheduled block immediately appears on your daily timeline and task list!`;
            }
        },
        {
            id: "edit_delete_task",
            category: "Day Planner",
            title: "How do I edit or delete a scheduled task in Day Planner?",
            keywords: ["edit task planner", "delete task", "remove task", "change task time", "reschedule task"],
            answer: function(liveData) {
                return `### ✏️ Editing & Deleting Tasks

- **Edit a Task**: Tap on any task card in Day Planner. You can adjust the task title, category, or start/end times, then tap **Save Changes**.
- **Delete a Task**: Swipe the task card left or tap the **Trash Can icon** on the card.
- Deleting an uncompleted task removes its reservation from the 24-hour timeline bar immediately.`;
            }
        },
        {
            id: "complete_task_checkmarks",
            category: "Day Planner",
            title: "How do interactive completion checkmarks award the +50 bonus?",
            keywords: ["task checkmarks", "complete task checkmark", "how to check off task", "finish task bonus", "checkbox planner"],
            answer: function(liveData) {
                return `### ✅ Interactive Task Completion & Bonus Unlocking

- Every task card in Day Planner features an interactive **circular checkmark button**.
- Tapping the circle toggles the task to **Completed**:
  - The card displays a satisfying emerald glow and strikethrough styling.
  - The live completion ratio (e.g. \`3/4 tasks\`) increments immediately.
  - When **100% of your tasks are completed**, the **+50 Task Bonus** is instantly awarded and credited into your Net Daily Score!`;
            }
        },
        {
            id: "category_presets_planner",
            category: "Day Planner",
            title: "What are the category presets in Day Planner?",
            keywords: ["category presets", "planner categories", "academics skills health", "task types planner"],
            answer: function(liveData) {
                return `### 🎨 Category Presets & Visual Theme Mapping

Day Planner provides 4 standardized category presets:
1. **Academics (Cyan/Blue)**: Deep study, lectures, exam prep, coursework ($+100/hr$).
2. **Skills (Emerald Green)**: Coding projects, writing, languages, digital arts ($+50/hr$).
3. **Health (Coral/Red)**: Workouts, runs, stretching, gym training ($150 - 30n$).
4. **Other (Purple)**: Chores, meetings, administrative errands ($+50/hr$).`;
            }
        },
        {
            id: "custom_tasks_planner",
            category: "Day Planner",
            title: "How do custom tasks and custom tags work in Day Planner?",
            keywords: ["custom tasks", "custom tags planner", "create custom task", "personal task tags"],
            answer: function(liveData) {
                return `### 🏷️ Custom Task Creation & Personal Tags

- When adding a task, you can type any custom name (e.g., *"Physics Lab Report"*, *"Piano Practice"*).
- Add custom priority tags: **#High**, **#Exam**, **#Urgent**, or **#Routine**.
- Custom tasks automatically adopt the visual color theme of their parent category, keeping your schedule clean and organized.`;
            }
        },
        {
            id: "drum_time_picker",
            category: "Day Planner",
            title: "How does the drum wheel time picker work in Day Planner?",
            keywords: ["drum time picker", "wheel time picker", "time picker planner", "how time picker works", "drum picker"],
            answer: function(liveData) {
                return `### 🛞 The Drum Wheel Time Picker

The drum time picker is an ergonomic, tactile interface designed for rapid time-blocking:
- Swipe or scroll the hour and minute wheels up/down.
- Minutes snap cleanly to **:00** and **:30** intervals, aligning perfectly with the app's **48 atomic timeline slots**.
- Tap **Done** to lock in your scheduled time block.`;
            }
        },
        {
            id: "planner_timeline_sync",
            category: "Day Planner",
            title: "How does Day Planner synchronize with the 24-hour timeline bar?",
            keywords: ["planner timeline sync", "how tasks appear on timeline", "timeline sync planner", "24 hour sync"],
            answer: function(liveData) {
                return `### 🔄 Seamless Timeline Bar Synchronization

- Any task scheduled in Day Planner reserves the corresponding half-hour slots on the top timeline bar.
- For example, scheduling a session from **2:00 PM to 4:00 PM** reserves slots 28, 29, 30, and 31.
- If you mark the task completed or log a session in Academics during that window, the slots illuminate in full neon brilliance!`;
            }
        },
        {
            id: "recurring_daily_tasks",
            category: "Day Planner",
            title: "Can I schedule recurring tasks every day?",
            keywords: ["recurring tasks", "daily recurring tasks", "repeat task every day", "recurring planner"],
            answer: function(liveData) {
                return `### 🔁 Recurring Tasks & Daily Habit Templates

- When creating or editing a task, toggle the **Repeat Daily** switch.
- The task will automatically appear on your schedule every morning at midnight, saving you from having to type recurring routines (like *"Morning Workout"* or *"Evening Review"*) repeatedly!`;
            }
        },
        {
            id: "task_rollover_behavior",
            category: "Day Planner",
            title: "What happens to uncompleted tasks at midnight?",
            keywords: ["task rollover", "uncompleted tasks midnight", "what happens to tasks tomorrow", "task carryover"],
            answer: function(liveData) {
                return `### 🌙 Midnight Task Rollover Protocol

At 12:00 AM (Midnight):
- Completed tasks are archived into your **Weekly Performance History**.
- Any uncompleted task presents a morning dialog: *"Carry over uncompleted tasks to today?"*
- You can either **Rollover** the task to today's schedule or **Dismiss** it to start with a fresh slate.`;
            }
        },
        {
            id: "task_prioritization_matrix",
            category: "Day Planner",
            title: "How should I use High, Medium, and Low priority tags?",
            keywords: ["task prioritization", "priority tags", "high priority task", "priority matrix planner"],
            answer: function(liveData) {
                return `### 🚦 Priority Tags: Focus Where It Counts

- **🔴 High Priority**: Tasks directly tied to upcoming exam deadlines or critical milestones. Schedule these in your peak morning energy window.
- **🟡 Medium Priority**: Secondary assignments, problem sets, or revision.
- **🟢 Low Priority**: Administrative emails, organizing notes, or quick errands. Complete these during your low-energy afternoon dip.`;
            }
        },
        {
            id: "eisenhower_matrix_planning",
            category: "Day Planner",
            title: "How do I apply the Eisenhower Matrix in Day Planner?",
            keywords: ["eisenhower matrix", "urgent vs important", "eisenhower planner", "task matrix"],
            answer: function(liveData) {
                return `### 🏛️ The Eisenhower Matrix in Action

1. **Urgent & Important (Do First)**: Exam prep due tomorrow, core problem sets. Tag as **High Priority** and schedule for 8:00 AM.
2. **Not Urgent but Important (Schedule)**: Gym workout, long-term skill acquisition, deep reading. Block out dedicated time before distractions take over.
3. **Urgent but Not Important (Delegate/Batch)**: Group project admin, quick texts. Batch into one 25-minute afternoon block.
4. **Not Urgent & Not Important (Eliminate)**: Mindless doom-scrolling. Block with **Focus Shield**.`;
            }
        },
        {
            id: "time_blocking_vs_todo_lists",
            category: "Day Planner",
            title: "Why do time-blocking schedules beat traditional open-ended to-do lists?",
            keywords: ["time blocking vs todo list", "why time blocking works", "cal newport time blocking", "schedule vs todo"],
            answer: function(liveData) {
                return `### ⏰ Time-Blocking vs. Open-Ended To-Do Lists

- **To-Do Lists**: Generate anxiety because they present a giant list of tasks with zero indication of *when* or *how long* they will take. Users inevitably pick the easiest tasks and procrastinate on hard work.
- **Time-Blocking**: Assigns every task a specific starting time and duration on the 24-hour timeline. This forces realistic planning, eliminates decision fatigue, and builds fierce focus.`;
            }
        },
        {
            id: "buffer_time_planning",
            category: "Day Planner",
            title: "Why should you schedule 15-30 minute buffer gaps between tasks?",
            keywords: ["buffer time", "schedule buffer", "gaps between tasks", "why buffer time matters"],
            answer: function(liveData) {
                return `### 🛡️ The Necessity of Buffer Time

- Never schedule back-to-back 3-hour blocks with 0 minutes between them.
- Life has friction: bathroom trips, phone calls, lunch prep, and unexpected interruptions.
- Leaving a **15 to 30-minute buffer gap** between major blocks prevents your entire schedule from collapsing when a single task runs slightly over time.`;
            }
        },
        {
            id: "over_planning_danger",
            category: "Day Planner",
            title: "What is the danger of over-planning every single minute?",
            keywords: ["over planning danger", "planning too much", "schedule too tight", "planning fallacy"],
            answer: function(liveData) {
                return `### ⚠️ The Over-Planning Trap & Cognitive Rigidity

- Scheduling every single 10-minute block from 6:00 AM to 11:00 PM creates **cognitive fragility**.
- The moment you fall 15 minutes behind schedule, psychological guilt kicks in, often leading to total abandonment of the entire day.
- **Golden Rule**: Schedule only **4 to 6 hours of core deep work** each day. Leave the rest flexible!`;
            }
        },
        {
            id: "task_batching_strategy",
            category: "Day Planner",
            title: "How does task batching increase daily efficiency?",
            keywords: ["task batching", "batch similar tasks", "batching strategy", "how to batch tasks"],
            answer: function(liveData) {
                return `### 📦 Task Batching: Grouping Cognitive Load

- Group similar shallow tasks into a single focused block instead of scattering them throughout your day:
  - Batch all emails, DMs, and Discord replies into a single **4:00 PM – 4:30 PM block**.
  - Batch laundry, room tidying, and desk organization into one **6:00 PM block**.
- This protects your morning and early afternoon for uninterrupted deep analytical thinking.`;
            }
        },
        {
            id: "morning_kickstart_routine",
            category: "Day Planner",
            title: "How do I plan my day in the first 10 minutes of waking?",
            keywords: ["morning kickstart", "plan morning", "10 minute morning plan", "how to start day"],
            answer: function(liveData) {
                return `### 🌅 The 10-Minute Morning Kickstart Routine

1. **Hydrate First**: Drink 500ml of water to rehydrate brain tissue.
2. **Open Day Planner**: Review your 3 Most Important Tasks (MITs) for today.
3. **Set Start Times**: Assign your hardest task to your peak morning window (e.g. 9:00 AM – 11:00 AM).
4. **Lock & Execute**: Put your phone away and launch session 1 in Academics Monitoring!`;
            }
        },
        {
            id: "evening_shutdown_ritual",
            category: "Day Planner",
            title: "How does an evening shutdown ritual prepare you for tomorrow?",
            keywords: ["evening shutdown", "shutdown ritual", "review day before sleep", "night planning"],
            answer: function(liveData) {
                return `### 🌙 The Evening Shutdown Ritual (Cal Newport)

- Spend 5 minutes at the end of your day:
  1. Open Producto and tap **"📊 Summarise My Day"** to review your net score and achievements.
  2. Check off all finished tasks in Day Planner to claim your **+50 bonus**.
  3. Schedule tomorrow's first 2 blocks so you wake up with complete clarity!`;
            }
        },
        {
            id: "frictionless_task_naming",
            category: "Day Planner",
            title: "How should I name tasks to eliminate starting friction?",
            keywords: ["task naming", "how to write tasks", "actionable task titles", "frictionless tasks"],
            answer: function(liveData) {
                return `### ✍️ Action-Oriented Task Naming

Vague task names trigger procrastination. Always write concrete, verb-first actions:
- ❌ Vague: *"Physics"* (Brain feels overwhelmed: Where do I start?).
- ✅ Actionable: *"Solve Physics Problems 14–22 in Chapter 4"*.
- ❌ Vague: *"Essay"*
- ✅ Actionable: *"Write 300-word introduction for History essay"*.`;
            }
        },
        {
            id: "three_mit_rule",
            category: "Day Planner",
            title: "What is the 3 Most Important Tasks (MIT) rule?",
            keywords: ["3 mit rule", "most important tasks", "rule of 3 tasks", "three daily goals"],
            answer: function(liveData) {
                return `### 🎯 The Rule of 3 (MITs)

Ask yourself every morning: *"If I could only accomplish 3 things today before going to sleep, which 3 would make today a massive win?"*
- Tag those 3 tasks as **High Priority** in Day Planner.
- If you finish those 3 MITs, your day is an indisputable success, regardless of minor chores that didn't get done!`;
            }
        },
        {
            id: "handling_schedule_interruptions",
            category: "Day Planner",
            title: "What should I do when an unexpected event disrupts my schedule?",
            keywords: ["schedule disrupted", "interrupted schedule", "unexpected emergency", "how to reschedule"],
            answer: function(liveData) {
                return `### 🛡️ The Schedule Pivot Protocol

When an unexpected emergency or interruption ruins your planned afternoon:
1. **Don't Panic**: A ruined schedule is not a ruined day.
2. **Open Day Planner**: Tap and drag uncompleted tasks to tomorrow or delete non-essential ones.
3. **Execute One 30-Minute Recovery Block**: Finishing even one 30-minute block restores your feeling of agency and control!`;
            }
        },
        {
            id: "task_duration_estimation",
            category: "Day Planner",
            title: "How do I overcome the Planning Fallacy and estimate task times accurately?",
            keywords: ["planning fallacy", "estimate task duration", "how long task will take", "accurate time estimate"],
            answer: function(liveData) {
                return `### ⏱️ Overcoming the Planning Fallacy (Kahneman & Tversky)

Humans are chronically optimistic, underestimating task durations by up to 40%:
- **The 1.3x Rule**: Whatever time you think a task will take, multiply it by **1.3**.
- If you think an assignment will take 60 minutes, schedule a **90-minute block** in Day Planner.
- If you finish early, you get an earned dopamine break!`;
            }
        },
        {
            id: "frog_first_strategy",
            category: "Day Planner",
            title: "What is the 'Eat the Frog' strategy in daily planning?",
            keywords: ["eat the frog", "mark twain frog", "hardest task first", "morning hard task"],
            answer: function(liveData) {
                return `### 🐸 Eat the Frog First (Brian Tracy)

*"If it's your job to eat a frog, it's best to do it first thing in the morning."*
- Your "frog" is your hardest, most cognitively demanding task that you are most tempted to avoid.
- By scheduling and executing your frog during your first focus block (e.g. 9:00 AM), the rest of your day feels light, energizing, and stress-free!`;
            }
        },
        {
            id: "color_coding_benefits",
            category: "Day Planner",
            title: "How does color coding categories clarify your mental schedule?",
            keywords: ["color coding planner", "benefits of color coding", "visual colors schedule", "theme colors planner"],
            answer: function(liveData) {
                return `### 🎨 The Cognitive Power of Visual Color Coding

- Your brain processes visual colors **60,000 times faster** than written text.
- Seeing Cyan (Academics), Emerald (Skills), and Coral (Health) laid out on the timeline bar allows you to assess your balance in 100 milliseconds without reading a single word!`;
            }
        },
        {
            id: "planner_sync_button",
            category: "Day Planner",
            title: "When should I use the manual 'Sync Planner & Academics' button?",
            keywords: ["sync planner button", "manual sync button", "sync academics and planner", "when to use sync button"],
            answer: function(liveData) {
                return `### 🔄 The Manual Sync Button

Use the **⚡ Sync Planner & Academics** button in Day Planner if:
- You studied using "Study Anytime" mode outside your scheduled hours and want the task checked off automatically.
- You completed focus blocks on mobile and want the timeline bar immediately refreshed without reloading the page.`;
            }
        },
        {
            id: "missed_task_psychology",
            category: "Day Planner",
            title: "How do I handle the guilt of missed tasks without giving up on the day?",
            keywords: ["missed tasks guilt", "feeling bad about schedule", "what the hell effect", "dont give up day"],
            answer: function(liveData) {
                return `### 🛡️ Defeating the 'What-The-Hell' Effect

- When people miss 1 task on their schedule, they often experience the psychological **"What-The-Hell Effect"**: *"I missed 2:00 PM study, so the day is ruined, I might as well scroll for 5 hours."*
- **Reframe**: A basketball team doesn't forfeit the game because they missed one shot in the 2nd quarter!
- Forgive the delay, open Day Planner, and focus on winning the **very next 30-minute block**.`;
            }
        },
        {
            id: "screen_management_overview",
            category: "Screen Management",
            title: "How does Screen Management track productive vs non-productive apps?",
            keywords: ["screen management overview", "track productive apps", "productive vs non productive apps", "screen time tracking"],
            answer: function(liveData) {
                return `### 📱 Screen Management: Productive vs. Non-Productive Classification

Screen Management categorizes applications into two distinct operational buckets:
1. **Productive Apps (No Penalty)**: Educational apps, IDEs, code editors, document readers, flashcard tools (Anki), note-taking apps (Obsidian, Notion).
2. **Non-Productive Apps (Escalating Penalty)**: Social media (Instagram, TikTok, Twitter/X), short-form video players (YouTube Shorts, Reels), streaming entertainment, and casual games.
- Time spent in productive apps does **not** penalize your score, while non-productive screen usage triggers the **$-(50 + 50n)$ penalty curve**.`;
            }
        },
        {
            id: "daily_screen_target_limit",
            category: "Screen Management",
            title: "How do I set and enforce a daily screen time target limit?",
            keywords: ["daily screen target", "set screen limit", "screen time target limit", "max screen time"],
            answer: function(liveData) {
                return `### 🎯 Setting Your Daily Screen Budget

1. In **Features > Screen Management**, tap **Set Target Limit**.
2. Select your daily non-productive ceiling (Recommended: **45 to 60 minutes maximum**).
3. When your usage crosses 80% of this budget, the dashboard turns amber and displays a **Screen Quota Warning**.
4. Crossing 100% triggers high penalty multipliers to protect your score!`;
            }
        },
        {
            id: "bedtime_mode_wind_down",
            category: "Screen Management",
            title: "What is Bedtime Mode & Wind Down?",
            keywords: ["bedtime mode", "wind down", "night screen mode", "sleep screen blocker", "bedtime wind down"],
            answer: function(liveData) {
                return `### 🌙 Bedtime Mode & Digital Wind-Down

- **Bedtime Mode** activates automatically during your designated sleep hours (e.g. 10:30 PM to 6:30 AM).
- **Features**:
  - Automatically grayscales the screen to eliminate dopamine-triggering colors.
  - Blocks opening addictive feeds and non-essential notification popups.
  - Helps your pineal gland release natural **melatonin** for deep, uninterrupted slow-wave sleep.`;
            }
        },
        {
            id: "shorts_reels_blocker_shield",
            category: "Screen Management",
            title: "What is the Shorts & Reels Blocker (Focus Shield)?",
            keywords: ["shorts reels blocker", "focus shield", "block youtube shorts", "block instagram reels", "reels blocker"],
            answer: function(liveData) {
                return `### 🛡️ Focus Shield: The Anti-Dopamine Armor

**Focus Shield** is our dedicated accessibility-powered blocker engineered specifically to defeat algorithmic infinite-scroll:
- It actively detects when you open **YouTube Shorts**, **Instagram Reels**, or **TikTok**.
- The instant a short-form vertical video UI is detected, Focus Shield intercepts the screen, closes the feed, and displays an encouraging reminder: *"Reclaim Your Focus! Back to your goals."*
- It breaks the autopilot trance before you lose hours of your life!`;
            }
        },
        {
            id: "accessibility_restricted_settings",
            category: "Screen Management",
            title: "Why does Android 13+ mark Accessibility as 'Restricted setting'?",
            keywords: ["restricted setting android", "accessibility blocked", "restricted setting fix", "android 13 restricted", "why restricted setting"],
            answer: function(liveData) {
                return `### 🔒 Why Android 13+ Shows 'Restricted Setting'

Starting in Android 13, Google introduced a security safeguard:
- Any app installed from outside the Google Play Store (such as sideloaded APKs or developer builds) has its Accessibility and Notification Listener permissions labeled as **'Restricted setting'** by default.
- This is a standard Android security dialog to prevent malicious apps from silently reading screens.
- Since Productometer is your personal productivity tool, you can unlock this permission safely in 4 quick taps!`;
            }
        },
        {
            id: "unlock_restricted_settings_guide",
            category: "Screen Management",
            title: "How do I unlock 'Restricted settings' step-by-step on Android?",
            keywords: ["unlock restricted settings", "how to allow restricted settings", "enable accessibility android 13", "fix restricted setting"],
            answer: function(liveData) {
                return `### 🔓 4-Step Guide to Unlock Restricted Settings on Android

1. Open your phone's **Settings > Apps > Productometer** (or tap the **'Open App Settings'** button inside the Focus Shield card).
2. Tap the **three vertical dots (⋮)** in the top right corner of the screen.
3. Tap **'Allow restricted settings'**. (Your phone will prompt for your fingerprint or PIN).
4. Now return to **Settings > Accessibility > Productometer Focus Shield** and toggle it **ON**! Focus Shield is now fully activated.`;
            }
        },
        {
            id: "usage_access_permission_android",
            category: "Screen Management",
            title: "How do I enable Android Usage Access for digital wellbeing?",
            keywords: ["usage access permission", "android usage stats", "enable usage access", "digital wellbeing permission"],
            answer: function(liveData) {
                return `### 📊 Enabling Android Usage Stats Access

To track your screen hours automatically:
1. Go to phone **Settings > Security & Privacy > Special App Access > Usage Access**.
2. Find **Productometer** in the list and toggle **Permit usage access** to ON.
3. This allows the app's native bridge to calculate your exact minutes spent in each application completely on-device without any data leaving your phone!`;
            }
        },
        {
            id: "reclassify_apps",
            category: "Screen Management",
            title: "Can I reclassify an app from Entertainment to Productivity?",
            keywords: ["reclassify app", "change app category", "mark app productive", "app classification screen"],
            answer: function(liveData) {
                return `### 🏷️ Custom App Reclassification

- If you use YouTube exclusively for watching MIT lectures or use Discord for a study group:
  1. Go to **Screen Management > App Classification List**.
  2. Find the app and tap **Change Category**.
  3. Select **Productive (Exempt from Penalty)**.
- Usage in that app will now be exempt from screen penalties!`;
            }
        },
        {
            id: "non_productive_screen_penalty",
            category: "Screen Management",
            title: "What is the mathematical breakdown of the screen penalty curve?",
            keywords: ["screen penalty breakdown", "math screen penalty", "how much screen penalty", "screen deduction"],
            answer: function(liveData) {
                return `### 📉 Detailed Screen Penalty Curve Breakdown

Calculated dynamically in half-hour increments:
- **30 Mins**: $-25\\text{ pts}$ (Minimal impact, easily covered by study).
- **60 Mins**: $-100\\text{ pts}$ (Equals 1 hour of deep academics).
- **90 Mins**: $-175\\text{ pts}$ (Cumulative).
- **120 Mins**: $-250\\text{ pts}$ (Severe penalty; score likely drops to Deficit).
- **180 Mins (3h)**: $-450\\text{ pts}$ (Crushes weekly average).
Keep daily distraction under 45 minutes to protect your score!`;
            }
        },
        {
            id: "app_pinning_lock",
            category: "Screen Management",
            title: "How does App Pinning help maintain strict study focus?",
            keywords: ["app pinning", "pin app android", "lock app screen", "screen pin focus"],
            answer: function(liveData) {
                return `### 📌 Android App Pinning Protocol

- Android includes a built-in feature called **App Pinning**:
- When you start a study session in Productometer or open an educational PDF, open the App Switcher, tap the app icon, and tap **Pin**.
- The phone is locked exclusively to that screen. You cannot exit to social media or view notification banners without unlocking the phone with your PIN!`;
            }
        },
        {
            id: "digital_detox_protocol",
            category: "Screen Management",
            title: "What is the 24-Hour Weekend Digital Detox Protocol?",
            keywords: ["digital detox", "weekend detox", "24 hour digital detox", "phone detox protocol"],
            answer: function(liveData) {
                return `### 🌿 The 24-Hour Digital Fast (Dopamine Reset)

- Pick one weekend day (e.g. Sunday from 8:00 AM to Monday 8:00 AM).
- Turn your smartphone off and place it inside a drawer.
- Spend the day reading physical books, cooking, walking in nature, working out, or journaling.
- **The Result**: Clears sensory overload, dramatically reduces anxiety, and restores sharp mental focus for Monday morning.`;
            }
        },
        {
            id: "phantom_vibration_syndrome",
            category: "Screen Management",
            title: "Why do I feel phantom phone vibrations and how do I fix it?",
            keywords: ["phantom vibrations", "phantom phone buzz", "feeling phone vibrate when not", "smartphone addiction buzz"],
            answer: function(liveData) {
                return `### 📳 Phantom Vibration Syndrome Neuroscience

- Feeling your phone vibrate in your pocket when it didn't is caused by **neurological hyper-vigilance**:
- Your sensory cortex has been conditioned to anticipate dopamine alerts, misinterpreting muscle twitches or clothing friction as incoming notifications.
- **The Cure**: Keep your phone in your backpack or another room during study hours for 7 days. The phantom vibrations will disappear.`;
            }
        },
        {
            id: "grayscale_mode_benefits",
            category: "Screen Management",
            title: "Why does turning your phone screen to Grayscale kill phone addiction?",
            keywords: ["grayscale mode", "black and white screen", "monochrome phone", "grayscale benefits"],
            answer: function(liveData) {
                return `### ⚪ Why Grayscale Mode Destroys App Addiction

- App icons and video thumbnails use hyper-saturated neon reds, yellows, and purples specifically designed by behavioral psychologists to trigger the primate brain's foraging instincts.
- Turning your phone display to **Grayscale (Monochrome)** strips away the visual dopamine bait.
- Instagram, TikTok, and games suddenly look unappealing, reducing screen time by an average of **38% in clinical trials**!`;
            }
        },
        {
            id: "notification_batching",
            category: "Screen Management",
            title: "Why is notification batching superior to real-time alerts?",
            keywords: ["notification batching", "turn off notifications", "batch alerts", "disable notifications study"],
            answer: function(liveData) {
                return `### 🔕 The Power of Notification Batching

- The human brain was never built to receive 150 unpredictable dings and buzzes per day.
- Every alert triggers a cortisol spike and forces an involuntary shift in attention.
- **The Solution**: Turn off all banners, badges, and sounds for non-essential apps. Check your notifications manually **twice per day (12:30 PM and 5:30 PM)** in structured 15-minute windows.`;
            }
        },
        {
            id: "friction_defense_strategy",
            category: "Screen Management",
            title: "What is the 20-Second Friction Defense against phone scrolling?",
            keywords: ["friction defense", "20 second rule", "stop phone scrolling", "physical friction phone"],
            answer: function(liveData) {
                return `### 🧱 The 20-Second Friction Defense (Shawn Achor)

- Humans naturally choose the path of least physical effort:
- If your phone is sitting next to your keyboard, opening it takes **0.5 seconds** (zero friction).
- If you place your phone in another room or inside a drawer with a physical lock, getting it takes **20 seconds**.
- Those 20 seconds give your prefrontal cortex time to interrupt the unconscious craving and return to work!`;
            }
        },
        {
            id: "youtube_productive_use",
            category: "Screen Management",
            title: "How do I watch educational YouTube tutorials without distraction?",
            keywords: ["youtube productive use", "watch tutorials without getting distracted", "block youtube recommendations"],
            answer: function(liveData) {
                return `### 📺 Productive YouTube Protocol

1. **Use Search Directly**: Search for the exact concept you need (e.g. *"Fourier transform explained"*).
2. **Never Open the Home Feed**: The homepage algorithm is designed to derail your focus.
3. **Turn Off Autoplay**: Prevents sliding into unrelated recommended videos.
4. **Use Distraction-Free Extensions**: Install browser extensions like *Unhook* to hide the comments section and recommended video sidebar.`;
            }
        },
        {
            id: "social_media_algorithm_trap",
            category: "Screen Management",
            title: "How do infinite-scroll algorithms hijack human reward pathways?",
            keywords: ["infinite scroll algorithm", "slot machine dopamine", "variable reward schedule", "why scrolling addictive"],
            answer: function(liveData) {
                return `### 🎰 The Variable Reward Schedule (The Slot Machine Trap)

- Infinite scroll operates on the exact same psychological principle as a **Las Vegas slot machine** (**Variable Ratio Reinforcement**):
- When you pull down to refresh, 9 clips might be boring, but the 10th clip is hilarious.
- Because your brain cannot predict *when* the dopamine hit will arrive, it releases maximum dopamine during the **anticipation** of the next swipe, keeping you scrolling for hours!`;
            }
        },
        {
            id: "screen_time_budgeting",
            category: "Screen Management",
            title: "How do I budget a strict 45-minute daily entertainment window?",
            keywords: ["screen time budgeting", "budget 45 mins screen", "screen quota", "manage screen time"],
            answer: function(liveData) {
                return `### ⏱️ The 45-Minute Daily Entertainment Budget

- Treat your screen time like cash in a bank account:
  - You have **45 minutes of non-productive credit** per day.
  - Spend 15 minutes during your afternoon break and 30 minutes in the evening after your study goals are achieved.
- Once the 45-minute budget is exhausted, close all entertainment apps to protect your Net Score from escalating penalties!`;
            }
        },
        {
            id: "one_tap_app_info_button",
            category: "Screen Management",
            title: "How does the NativeBridge App Info button navigate to Android settings?",
            keywords: ["one tap app info button", "native bridge settings", "open app info button", "navigate to settings android"],
            answer: function(liveData) {
                return `### ⚙️ The One-Tap App Info Shortcut

- In the Android app, opening deep system settings manually can be confusing.
- Tapping the **'Open App Settings'** button in Focus Shield calls:
  \`NativeBridge.openAppDetailsSettings()\`
- This immediately opens Android's system App Info page for Productometer, allowing you to toggle permissions with zero searching!`;
            }
        },
        {
            id: "battery_optimization_whitelist",
            category: "Screen Management",
            title: "How do I whitelist Productometer from Android battery killing?",
            keywords: ["battery optimization whitelist", "prevent app closing background", "battery saver whitelist", "dont kill my app"],
            answer: function(liveData) {
                return `### 🔋 Whitelisting from Android Battery Optimizers

Aggressive Android OEM battery savers (Samsung, Xiaomi, OnePlus) may close background timers:
1. Go to **Settings > Apps > Productometer > Battery**.
2. Select **'Unrestricted'** (or **'Don't Optimize'**).
3. Enable **'Allow background activity'**.
4. This guarantees your timers and Focus Shield continue running smoothly!`;
            }
        },
        {
            id: "background_service_persistence",
            category: "Screen Management",
            title: "How does Focus Shield remain active in the background?",
            keywords: ["background service persistence", "how focus shield works background", "accessibility background service"],
            answer: function(liveData) {
                return `### 🛡️ Persistent Background Protection

- Focus Shield utilizes a lightweight Android **AccessibilityService**.
- Unlike standard apps, Android grants Accessibility Services high priority in memory, ensuring that Focus Shield is not killed when you switch between applications or turn the screen off.`;
            }
        },
        {
            id: "emergency_phone_calls",
            category: "Screen Management",
            title: "Does Focus Shield block incoming emergency phone calls or messages?",
            keywords: ["does focus shield block calls", "emergency calls focus shield", "phone calls blocked", "safety focus shield"],
            answer: function(liveData) {
                return `### 📞 Safety First: Emergency Calls & Core Utilities

**No, Focus Shield never blocks incoming calls, SMS messages, or alarms.**
- It is engineered specifically to target algorithmic short-form entertainment feeds (Reels, Shorts, TikTok).
- Critical system utilities like your Phone dialer, Maps, Calculator, and Clock operate normally at all times!`;
            }
        },
        {
            id: "distraction_tracker_accuracy",
            category: "Screen Management",
            title: "How accurate is the distraction screen tracker?",
            keywords: ["distraction tracker accuracy", "how accurate screen tracking", "screen usage measurement"],
            answer: function(liveData) {
                return `### ⏱️ High-Precision Usage Stats API

- On Android, Productometer reads data directly from the system **UsageStatsManager**, measuring application foreground time down to the exact second.
- On the web portal, the app tracks tab active time using browser \`visibilitychange\` events, ensuring 100% factual accuracy without guessing!`;
            }
        },
        {
            id: "screen_penalty_mitigation",
            category: "Screen Management",
            title: "Can you offset screen penalties by studying extra hours?",
            keywords: ["offset screen penalty", "erase screen penalty with study", "cancel out phone penalty"],
            answer: function(liveData) {
                return `### ⚖️ Offsetting Penalties Through Deep Work

**Yes!**
- 1 hour of deep academics awards $+100$ points, which can help offset an hour of casual distraction.
- However, because screen penalties escalate to $-150$ and $-200$ for hours 2 and 3, **studying extra is not an excuse to binge-scroll**. Preventing distraction is always 3x easier than digging yourself out of a deficit!`;
            }
        },
        {
            id: "night_shift_blue_light",
            category: "Screen Management",
            title: "Why does blue light suppress melatonin production by up to 80%?",
            keywords: ["night shift blue light", "blue light melatonin", "why blue light bad", "screen light sleep"],
            answer: function(liveData) {
                return `### 💡 Blue Light & Melatonin Suppression

- Digital screens emit high-energy visible **blue-wavelength light (~450–480 nm)**, identical to midday solar light.
- When this light enters your eyes after sunset, melanopsin-containing retinal cells signal your pineal gland that it is midday, suppressing **melatonin release by up to 80%**.
- Use Bedtime Mode or enable night light color warmth at least 90 minutes before bed!`;
            }
        },
        {
            id: "log_workouts_hiit_running",
            category: "Health & Diet",
            title: "How do I log Workout, Running, and HIIT sessions?",
            keywords: ["log workout", "how to log running", "log hiit", "record exercise", "add workout session"],
            answer: function(liveData) {
                return `### 🏋️ Logging Fitness Sessions in Health Tracker

1. Navigate to **Features > Health Tracker**.
2. Select your discipline: **Gym / Strength**, **Outdoor Running**, or **HIIT Intervals**.
3. Set your target duration (e.g. 45m or 60m).
4. Tap **Start Workout**. The interactive timer animates your heart-rate training zone.
5. On completion, tap **Save Workout**. Your session fills the timeline and credits points via the **$150 - 30n$ formula**!`;
            }
        },
        {
            id: "gym_exercise_animations",
            category: "Health & Diet",
            title: "How do gym exercises and animated demonstrations work?",
            keywords: ["gym exercise animations", "exercise demonstrations", "animated workout guide", "workout animations"],
            answer: function(liveData) {
                return `### 🎥 Interactive Exercise Visualizer

- The Health module contains a rich library of exercise demonstration animations covering:
  - **Chest & Push**: Bench Press, Push-ups, Incline Dumbbell Press.
  - **Back & Pull**: Pull-ups, Barbell Rows, Lat Pulldowns.
  - **Legs**: Squats, Romanian Deadlifts, Bulgarian Split Squats.
  - **Core**: Planks, Hanging Leg Raises.
- Each animation highlights target muscle engagement and correct anatomical joint angles to prevent injury!`;
            }
        },
        {
            id: "running_pace_distance_tracking",
            category: "Health & Diet",
            title: "How is running pace and distance tracked?",
            keywords: ["running pace", "track running distance", "pace min per km", "cardio tracker"],
            answer: function(liveData) {
                return `### 🏃 Cardio Pace & Distance Telemetry

- In **Running Mode**, the app computes:
  - **Pace (min/km)**: Real-time velocity measurement.
  - **Total Distance (km)**: Cumulative mileage.
  - **Estimated Aerobic Calorie Burn**: Based on body weight, duration, and cardiac pacing.
- This feeds directly into your **Macro Bio-Reactor** to dynamically expand your daily caloric expenditure!`;
            }
        },
        {
            id: "hiit_interval_timer",
            category: "Health & Diet",
            title: "How does the HIIT interval timer work?",
            keywords: ["hiit interval timer", "hiit timer", "tabata timer", "work rest intervals", "interval training"],
            answer: function(liveData) {
                return `### ⏱️ HIIT Interval Engine (Tabata / EMOM)

The HIIT timer cycles between high-intensity exertion and tactical recovery:
- **Work Interval**: 30 to 45 seconds of explosive output (Burpees, Kettlebell swings, Sprinting).
- **Rest Interval**: 15 to 20 seconds of deep nasal breathing.
- Features distinct audio beeps for work/rest transitions so you don't have to look at your phone!`;
            }
        },
        {
            id: "gamified_diet_calculator",
            category: "Health & Diet",
            title: "How does the Gamified Diet Calculator and Macro Bio-Reactor work?",
            keywords: ["gamified diet calculator", "macro bio reactor", "calorie calculator", "track macros", "how diet calculator works"],
            answer: function(liveData) {
                return `### 🥗 The Macro Bio-Reactor Engine

The Diet Calculator transforms nutrition into a clear biological fuel gauge:
1. **Bio-Metrics Setup**: Enter your age, gender, weight (kg), height (cm), and activity tier.
2. **Dynamic Target**: Computes your exact daily calorie and macronutrient targets.
3. **Food Photo Logging**: Tap food cards (e.g., Oatmeal, Chicken Breast, Eggs, Rice, Paneer) to instantly log calories, protein, carbs, and fats.
4. **Live Gauge**: Displays **Calories Consumed vs. Calorie Budget** in real time!`;
            }
        },
        {
            id: "bmr_tdee_calculation",
            category: "Health & Diet",
            title: "How are maintenance calories (BMR / TDEE) calculated?",
            keywords: ["bmr calculation", "tdee calculation", "how are maintenance calories calculated", "mifflin st jeor formula"],
            answer: function(liveData) {
                return `### 🧮 BMR & TDEE Mathematical Derivation

The engine utilizes the clinically validated **Mifflin-St Jeor Equation**:

$$\\text{BMR} = 10 \\times \\text{weight (kg)} + 6.25 \\times \\text{height (cm)} - 5 \\times \\text{age (yrs)} + s$$
*(where $s = +5$ for males, and $-161$ for females)*

**Total Daily Energy Expenditure (TDEE)**:
$$\\text{TDEE} = \\text{BMR} \\times \\text{Physical Activity Factor (1.2 to 1.725)}$$
Your daily food calorie goal is calibrated directly against your TDEE!`;
            }
        },
        {
            id: "calorie_goals_surplus_deficit",
            category: "Health & Diet",
            title: "What is the difference between Weight Loss, Maintenance, and Muscle Gain targets?",
            keywords: ["calorie deficit", "calorie surplus", "maintenance calories", "weight loss vs muscle gain", "cutting vs bulking"],
            answer: function(liveData) {
                return `### ⚖️ Calorie Target Calibration

- **Weight Loss (Cutting)**: **TDEE - 500 kcal** (Safe, steady fat loss of ~0.5kg per week with zero muscle catabolism).
- **Maintenance**: **TDEE ± 0 kcal** (Preserves body composition, supports peak mental focus and athletic output).
- **Muscle Gain (Lean Bulking)**: **TDEE + 300 kcal** (Provides extra amino acids and glycogen for lean muscular hypertrophy with minimal fat accumulation).`;
            }
        },
        {
            id: "food_photo_cards",
            category: "Health & Diet",
            title: "How do food photo cards add to my daily calorie count?",
            keywords: ["food photo cards", "food cards calorie", "quick food logging", "log food photo"],
            answer: function(liveData) {
                return `### 🍎 One-Tap Food Card Logging

- Instead of manually typing grams into complicated nutrition databases:
- Tap on visual food cards: **Eggs (140 kcal, 12g P)**, **Oatmeal Bowl (300 kcal, 10g P)**, **Chicken Rice (450 kcal, 35g P)**, **Paneer Tikka (320 kcal, 18g P)**.
- Each tap increments your daily consumption meter and macro rings instantly!`;
            }
        },
        {
            id: "calories_consumed_vs_goal",
            category: "Health & Diet",
            title: "Where can I see my live calories consumed vs calorie goal?",
            keywords: ["calories consumed vs goal", "where to see calories", "calorie meter", "calorie budget gauge"],
            answer: function(liveData) {
                return `### 📊 The Calories Gauge on Home & Health

- On the **Home Dashboard**, the **Health Card** shows:
  - **Calories Consumed**: \`1,450 kcal\` (illuminated in emerald).
  - **Remaining Budget**: \`/ 2,260 kcal (810 kcal left)\`.
- In **Health Tracker**, you can view the full circular macro breakdown: **Protein, Carbohydrates, and Fats**!`;
            }
        },
        {
            id: "active_workout_diet_blueprint",
            category: "Health & Diet",
            title: "What diet should I eat for active workouts and gym training?",
            keywords: ["diet for active workout", "which diet for workout", "gym diet blueprint", "active workout nutrition", "bodybuilding diet"],
answer: function(liveData) {
                const p = liveData.userProfile || { weight: 70, height: 175, minProtein: 112, maxProtein: 154, targetKcal: 2200, waterLiters: "2.8", goal: "maintain", isSet: false };
                const w = p.weight;
                const minP = p.minProtein;
                const maxP = p.maxProtein;
                const kcal = p.targetKcal;
                const water = p.waterLiters;
                const carbGrams = Math.round(kcal * 0.45 / 4);
                const fatGrams = Math.round(kcal * 0.25 / 9);
                const goalLabel = p.goal === 'loss' ? 'Fat Loss (Cutting)' : (p.goal === 'gain' ? 'Muscle Gain (Hypertrophy)' : 'Maintenance');

                return `### 🏋️ Active Workout Nutrition Blueprint\n\n` +
                       (p.isSet ? `> 🎯 **Calibrated for Your Personal Profile**: **${w} kg** · **${p.height} cm** · Goal: **${goalLabel}**\n\n` : `> 💡 *Calibrated using your current baseline (**${w} kg**). Tell me **"my weight is X kg"** to instantly personalize this!*\n\n`) +
                       `1. **Your Daily Protein Target**: **${minP}g to ${maxP}g / day** (1.6 to 2.2g per kg for your ${w}kg frame).\n` +
                       `   • *Why*: Rebuilds micro-tears in muscle tissue and accelerates recovery between sessions.\n` +
                       `   • *Sample Daily Plan to Hit ~${maxP}g Protein for You*:\n` +
                       `     - **Breakfast**: 3 whole eggs + 1 bowl oats with milk (**~26g protein**)\n` +
                       `     - **Lunch**: 150g grilled chicken breast or 150g low-fat paneer with rice (**~38g protein**)\n` +
                       `     - **Post-Workout**: 1 scoop whey protein or 200g Greek yogurt (**~25g protein**)\n` +
                       `     - **Dinner**: 100g soya chunks or tofu curry with whole wheat roti (**~42g protein**)\n` +
                       `     - **Daily Total**: **~${Math.round(26+38+25+42)}g protein** (Perfect for your ${w}kg target!)\n\n` +
                       `2. **Your Daily Calorie Target**: **${kcal} kcal / day** (BMR: ${p.bmr} kcal, TDEE: ${p.tdee} kcal).\n` +
                       `   • *Complex Carbs (~${carbGrams}g)*: Oats, brown rice, sweet potatoes to replenish muscular glycogen.\n` +
                       `   • *Healthy Fats (~${fatGrams}g)*: Whole eggs, almonds, extra virgin olive oil for hormonal balance.\n\n` +
                       `3. **Your Daily Hydration**: **${water} Liters / day** based on your body mass.`;
            }
        },
        {
            id: "pre_post_workout_nutrition",
            category: "Health & Diet",
            title: "What should I eat before and after my workout (Pre & Post Timing)?",
            keywords: ["pre workout meal", "post workout meal", "what to eat before workout", "what to eat after workout", "workout timing meal"],
answer: function(liveData) {
                const p = liveData.userProfile || { weight: 70, isSet: false };
                const w = p.weight;
                const preCarb = Math.round(w * 0.6);
                const postCarb = Math.round(w * 0.8);
                const postPro = Math.round(w * 0.4);

                return `### ⏱️ Pre & Post-Workout Nutrition Timing (Tailored for ${w} kg)\n\n` +
                       `1. **Pre-Workout Fuel (60–90 mins before training)**:\n` +
                       `   • **Target**: ~${preCarb}g fast-digesting carbs + 15–20g light protein.\n` +
                       `   • *Ideal Options*: Oatmeal bowl with sliced banana & milk, or 2 slices whole-wheat toast with peanut butter.\n` +
                       `   • *Goal*: Saturates blood glucose and muscular glycogen for peak strength and lifting volume.\n\n` +
                       `2. **Intra-Workout Hydration**:\n` +
                       `   • Drink 500–700ml water with a pinch of Himalayan salt to replace electrolytes.\n\n` +
                       `3. **Post-Workout Recovery (Within 45–60 mins)**:\n` +
                       `   • **Target**: ~${postPro}g high-quality protein + ~${postCarb}g carbohydrates.\n` +
                       `   • *Ideal Options*: 1 scoop whey protein with an apple/banana, or grilled chicken breast/paneer with steamed rice.\n` +
                       `   • *Goal*: Halts muscular catabolism and initiates immediate protein synthesis!`;
            }
        },
        {
            id: "daily_protein_targets_sources",
            category: "Health & Diet",
            title: "How much protein do I need daily and what are the best sources?",
            keywords: ["protein target", "how much protein daily", "best protein sources", "protein intake per kg", "high protein foods"],
answer: function(liveData) {
                const p = liveData.userProfile || { weight: 70, minProtein: 112, maxProtein: 154, isSet: false };
                const w = p.weight;
                const minP = p.minProtein;
                const maxP = p.maxProtein;

                return `### 🥩 Your Daily Protein Target & High-Yield Sources\n\n` +
                       (p.isSet ? `> 🎯 **Personalized for your ${w} kg body weight**: **${minP}g to ${maxP}g / day** (1.6 – 2.2g/kg)\n\n` : `> 💡 *Based on ${w} kg baseline. (Tell me "my weight is X kg" to adjust!)*\n\n`) +
                       `• **Why 1.6 to 2.2g/kg?** Studies show maximum muscle protein synthesis plateaus at 1.6g/kg for maintenance and 2.2g/kg for intense resistance training.\n\n` +
                       `**Top High-Yield Protein Foods to Reach ${maxP}g**:\n` +
                       `• 🍗 **Chicken Breast**: 31g protein per 100g cooked\n` +
                       `• 🥩 **Soya Chunks**: 52g protein per 100g dry (The ultimate vegetarian protein!)\n` +
                       `• 🧀 **Low-Fat Paneer**: 18g protein per 100g\n` +
                       `• 🥚 **Whole Eggs**: 6g protein per large egg (Egg whites: 3.6g)\n` +
                       `• 🥛 **Whey Protein Isolate**: 24–27g protein per scoop\n` +
                       `• 🥣 **Greek Yogurt**: 10g protein per 100g\n` +
                       `• 🍲 **Lentils / Dal + Rice**: 15g protein per cooked bowl`;
            }
        },
        {
            id: "vegetarian_vegan_protein",
            category: "Health & Diet",
            title: "What are the best high-protein sources for vegetarians?",
            keywords: ["vegetarian protein", "vegan protein sources", "veg diet for gym", "paneer soya protein", "high protein vegetarian"],
            answer: function(liveData) {
                return `### 🌿 High-Yield Vegetarian Protein Blueprint

Achieving 120g+ protein on a vegetarian diet:
1. **Soya Chunks**: The undisputed vegetarian protein king ($52\\text{g protein per 100g}$). 50g soya chunks = 26g pure protein.
2. **Low-Fat Paneer**: 150g provides ~27g protein.
3. **Greek Yogurt / Curd**: 200g provides ~16-20g protein.
4. **Lentils + Rice Combination**: Pairing dal with rice creates a **complete amino acid profile** with all essential BCAAs.
5. **Plant / Whey Protein**: 1 daily scoop easily adds 25g clean protein.`;
            }
        },
        {
            id: "creatine_monohydrate_facts",
            category: "Health & Diet",
            title: "What is Creatine Monohydrate and does it improve cognition?",
            keywords: ["creatine monohydrate", "how creatine works", "creatine cognitive benefits", "creatine study", "creatine gym"],
            answer: function(liveData) {
                return `### 🧬 The Science of Creatine Monohydrate

Creatine is the most scientifically researched sports supplement in the world:
- **In Muscle**: Donates a phosphate group to regenerate ATP rapidly, increasing strength, power output, and anaerobic capacity by **10–15%**.
- **In the Brain**: Your brain consumes 20% of your body's energy. Clinical trials show 5g of creatine daily significantly **improves working memory, reasoning speed, and mental stamina under sleep deprivation**!
- Dose: 3 to 5 grams daily with water. No loading phase required.`;
            }
        },
        {
            id: "hydration_performance_link",
            category: "Health & Diet",
            title: "Why does a 2% drop in hydration crush cognitive performance?",
            keywords: ["hydration performance", "water intake study", "dehydration brain fog", "how much water to drink"],
answer: function(liveData) {
                const p = liveData.userProfile || { weight: 70, waterLiters: "2.8", isSet: false };
                const w = p.weight;
                const water = p.waterLiters;

                return `### 💧 Hydration & Cognitive Performance (Personalized: ${water}L/day)\n\n` +
                       `• **Your Personal Daily Water Target**: **${water} Liters / day** (Calculated as ~${Math.round(w * 40)}ml for your ${w}kg body weight).\n\n` +
                       `🧠 **The 2% Dehydration Penalty**:\n` +
                       `• The human brain is 73% water. A mere 2% drop in cellular hydration shrinks brain volume away from the cranium, causing:\n` +
                       `  - 15% reduction in working memory processing speed\n` +
                       `  - 25% increase in subjective effort required to solve problems\n` +
                       `  - Mild headaches and afternoon sluggishness misidentified as hunger.\n\n` +
                       `💡 *Keep a 1-liter bottle at your desk and sip 250ml after every 45-minute study block!*`;
            }
        },
        {
            id: "electrolyte_balance",
            category: "Health & Diet",
            title: "Why are Sodium, Potassium, and Magnesium vital for studying?",
            keywords: ["electrolytes", "sodium potassium magnesium", "electrolytes for focus", "electrolyte balance"],
            answer: function(liveData) {
                return `### ⚡ Electrolytes: The Brain's Electrical Wiring

Neurons fire via the **Sodium-Potassium ATPase pump**:
- Drinking excessive plain water without electrolytes can dilute blood sodium (hyponatremia), causing lethargy and brain fog.
- **Sodium**: Essential for action potentials and neural transmission.
- **Potassium**: Regulates cellular fluid balance (bananas, potatoes, spinach).
- **Magnesium**: Calms the nervous system and regulates NMDA brain receptors.`;
            }
        },
        {
            id: "complex_vs_simple_carbs",
            category: "Health & Diet",
            title: "Complex vs. Simple Carbs: Which is best for mental focus?",
            keywords: ["complex carbs vs simple", "carbs for focus", "oats vs sugar", "glycemic index study"],
            answer: function(liveData) {
                return `### 🌾 Carbohydrates & Blood Glucose Stability

- **Simple Sugars (Candy, Soda, Pastries)**: Cause a rapid spike in blood glucose followed by an acute **insulin crash**, producing severe brain fog and lethargy within 60 minutes.
- **Complex Carbs (Oats, Sweet Potatoes, Quinoa, Brown Rice)**: Digest slowly, providing a smooth, steady trickle of glucose to the brain for **4 to 5 hours of continuous focus**.`;
            }
        },
        {
            id: "healthy_fats_hormones",
            category: "Health & Diet",
            title: "Why are healthy fats vital for hormones and the brain?",
            keywords: ["healthy fats", "dietary fats testosterone", "omega 3 brain", "nuts olive oil health"],
            answer: function(liveData) {
                return `### 🥑 Healthy Fats: The Myelin Sheath & Hormones

- Low-fat diets severely impair testosterone, estrogen, and cortisol regulation.
- Your brain's nerve fibers are insulated by a protective fatty coating called the **myelin sheath**.
- Consume healthy fats daily: **Almonds, walnuts, chia seeds, whole eggs, and extra virgin olive oil** to support neurotransmitter health and hormone synthesis.`;
            }
        },
        {
            id: "fasted_cardio_pros_cons",
            category: "Health & Diet",
            title: "Is Fasted Cardio better for fat loss than fueled cardio?",
            keywords: ["fasted cardio", "fasted cardio fat loss", "running on empty stomach", "fasted vs fed cardio"],
            answer: function(liveData) {
                return `### 🏃 Fasted Cardio vs. Fueled Cardio

- **The Myth**: Exercising on an empty stomach burns more net body fat.
- **The Reality**: While you may oxidize slightly more fatty acids during the run, 24-hour total fat loss is identical.
- If doing fasted cardio makes you feel lightheaded, eat a small banana or piece of toast 30 minutes before. Total daily calorie deficit is what dictates fat loss!`;
            }
        },
        {
            id: "active_recovery_days",
            category: "Health & Diet",
            title: "What should you do on Active Recovery Days?",
            keywords: ["active recovery days", "rest day workout", "what to do on rest days", "recovery walk"],
            answer: function(liveData) {
                return `### 🚶 The Active Recovery Protocol

On non-lifting days, don't sit motionless on the couch all day:
- **30-to-45 Minute Brisk Walk**: Promotes lymphatic drainage and accelerates muscle recovery without central nervous system stress.
- **Mobility & Foam Rolling**: Releases tight hip flexors and thoracic spine tension from sitting at a desk.
- **Light Swimming or Yoga**: Restores joint mobility and keeps daily calorie expenditure steady.`;
            }
        },
        {
            id: "exercise_points_health_formula",
            category: "Health & Diet",
            title: "Why does 1 hour of intense exercise yield +120 points on the formula?",
            keywords: ["120 points exercise", "why 120 points workout", "health score points", "exercise points yield"],
            answer: function(liveData) {
                return `### 🏅 The +120 Points High-Yield Reward

Under the $150 - 30(1) = +120$ formula:
- 1 hour of physical training awards the **highest single-hour point return in the entire application** ($+120\\text{ pts}$ vs $+100\\text{ for Academics}$).
- Physical exercise releases **BDNF (Brain-Derived Neurotrophic Factor)**, effectively fertilizing your brain's synapses and doubling your study efficiency for the rest of the day!`;
            }
        },
        {
            id: "overtraining_syndrome",
            category: "Health & Diet",
            title: "What are the warning signs of Central Nervous System Overtraining?",
            keywords: ["overtraining syndrome", "cns fatigue", "signs of overtraining", "working out too much"],
            answer: function(liveData) {
                return `### ⚠️ Central Nervous System (CNS) Overtraining

Working out 7 days a week with heavy weights without rest leads to **Overtraining Syndrome**:
- **Symptoms**: Persistent insomnia, elevated resting heart rate upon waking, sudden drop in strength, chronic irritability, and brain fog during study.
- **The Cure**: Take 2 complete rest days, increase protein and sleep, and watch your scores and energy rebound!`;
            }
        },
        {
            id: "micronutrients_for_focus",
            category: "Health & Diet",
            title: "Which micronutrients are most important for focus and cognitive speed?",
            keywords: ["micronutrients for focus", "vitamins for studying", "vitamin d3 b12 brain", "zinc omega 3"],
            answer: function(liveData) {
                return `### 💊 Key Micronutrients for Academic Brainpower

1. **Vitamin D3**: Regulates over 1,000 biological genes and dopamine synthesis. Deficiency causes chronic lethargy.
2. **Vitamin B12**: Essential for red blood cell formation and myelin sheath insulation.
3. **Omega-3 Fatty Acids (EPA & DHA)**: Enhances cell membrane fluidity in brain neurons.
4. **Zinc & Iron**: Crucial for oxygen transport to the brain and neurotransmitter production.`;
            }
        },
        {
            id: "workout_timing_study_synergy",
            category: "Health & Diet",
            title: "Why does exercising before studying boost memory retention?",
            keywords: ["exercise before studying", "workout study synergy", "bdnf exercise study", "best time to workout"],
            answer: function(liveData) {
                return `### ⚡ The Exercise-Study Synergy: The BDNF Surge

Research by Dr. John Ratey at Harvard Medical School proves that 30–45 minutes of aerobic or resistance exercise triggers a massive surge of **Brain-Derived Neurotrophic Factor (BDNF)**:
- BDNF acts like "Miracle-Gro" for brain synapses, facilitating long-term potentiation.
- Scheduling a study session **within 60 to 90 minutes after an afternoon workout** results in **up to 20% faster concept memorization**!`;
            }
        },
        {
            id: "healthy_snacking_options",
            category: "Health & Diet",
            title: "What are the best clean snacks to eat during study sessions?",
            keywords: ["healthy study snacks", "clean snacks", "what to eat while studying", "brain food snacks"],
            answer: function(liveData) {
                return `### 🥜 Clean Brain-Fuel Study Snacks

Avoid potato chips and cookies that spike insulin. Instead, choose:
- **Handful of Raw Almonds & Walnuts**: Healthy fats + vitamin E.
- **Greek Yogurt with Blueberries**: High protein + polyphenols that cross the blood-brain barrier.
- **Dark Chocolate (85%+ Cacao)**: Contains flavonoids and theobromine for smooth, non-jittery alertness.
- **Apple Slices with Peanut Butter**: Slow-burning fiber and sustained energy.`;
            }
        },
        {
            id: "sleep_monitoring_module_guide",
            category: "Sleep & Recovery",
            title: "How does the Sleep & Bedtime Monitoring feature work?",
            keywords: [
                "sleep monitoring guide", "how sleep monitoring works", "configure bedtime",
                "sleep target hours", "bedtime start end", "sleep tracker", "sleep module",
                "circadian sleep guardian", "sleep schedule"
            ],
            answer: function(liveData) {
                const bStart = liveData.bedtimeStart || '23:00';
                const bEnd = liveData.bedtimeEnd || '07:00';
                const targetH = liveData.targetSleepHours || 8.0;
                const alarmOn = liveData.smartAlarmEnabled !== false;

                return `### 🌙 Circadian Sleep Guardian & Bedtime Architecture

The **Sleep & Bedtime Monitoring** module harmonizes your sleep architecture with your circadian rhythm to ensure deep, regenerative slow-wave recovery:

1. **Flexible Target Duration (5-6 Cycles)**:
   - Your current target is set to **${targetH} hours** (Science recommends **7.5h to 9.0h**).
   - Tap the **+** / **-** buttons or preset chips (7h, 7.5h, 8h, 8.5h, 9h) to calibrate based on your workload.

2. **Bedtime & Wake-Up Schedule**:
   - Current window: **${bStart}** (Bedtime) → **${bEnd}** (Wake-up).
   - The live countdown banner alerts you when bedtime is approaching so you can wind down.

3. **Smart Ecosystem Integration**:
   - Brain Activation Smart Alarm: **${alarmOn ? 'Active 🔔' : 'Disabled 🔕'}**.
   - Syncs automatically with your Day Planner timeline so late-night tasks don't collide with restorative sleep!`;
            }
        },
        {
            id: "smart_wakeup_alarm_routine",
            category: "Sleep & Recovery",
            title: "How does the Brain Activation Smart Alarm & 50-Step Routine work?",
            keywords: [
                "smart wakeup alarm", "50 step wakeup", "smart alarm routine",
                "skip upcoming alarm", "how to turn off alarm", "sleep alarm",
                "alarm skip today", "alarm skip tomorrow", "step counter alarm"
            ],
            answer: function(liveData) {
                const alarmOn = liveData.smartAlarmEnabled !== false;
                const isSkipped = !!liveData.isAlarmSkippedToday;

                return `### ⏰ Brain Activation Smart Alarm & 50-Step Wakeup Routine

Tired of snoozing alarms and falling back into brain fog? The **Brain Activation Smart Alarm** forces full neural awakening:

1. **The 50-Step Disarm Rule**:
   - Unlike standard alarms with a simple swipe button, this smart alarm activates your motor cortex: you must **physically walk 50 steps** (counted live via native pedometer sensors) to disarm it!
   - By step 30, heart rate accelerates and blood flow clears adenosine from your prefrontal cortex.

2. **Intelligent Alarm Skip (Today vs Tomorrow)**:
   - Need to sleep in for a scheduled recovery day? Tap **Skip Upcoming Alarm**.
   - If pressed before your bedtime, it skips tonight's wake-up.
   - If pressed after bedtime/midnight, it skips the upcoming morning alarm.
   - You can resume it anytime with the **Resume Alarm** button.

3. **Current Live Status**:
   - Alarm state: **${alarmOn ? (isSkipped ? 'Skipped for upcoming cycle ⏭️' : 'Active & Armed 🔔') : 'Disabled 🔕'}**
   - Wake-up target: **${liveData.bedtimeEnd || '07:00'}**`;
            }
        },
        {
            id: "bedtime_distraction_cap_guard",
            category: "Sleep & Recovery",
            title: "What is the 15-Minute Night Distraction Cap & Bedtime Wind-Down?",
            keywords: [
                "night distraction cap", "15 minute bedtime screen limit", "bedtime emergency pass",
                "night grayscale mode", "bedtime distraction", "bedtime mode", "distraction cap"
            ],
            answer: function(liveData) {
                return `### 🛡️ 15-Minute Night Distraction Cap & Wind-Down Protocol

Blue light and late-night scrolling suppress melatonin by up to **85%**. The Bedtime Guardian enforces strict boundaries:

1. **15-Minute Screen Budget**:
   - Once your scheduled bedtime arrives, a strict **15-minute distraction allowance** begins.
   - A real-time progress bar shows your remaining night usage.

2. **Anti-Dopamine Grayscale Shield**:
   - When your limit expires, the display turns grayscale and non-essential entertainment apps are blocked until morning wake-up.

3. **Emergency Pass**:
   - Need urgent access for a call, navigation, or critical message? Tap **Use Emergency Pass** for a temporary 10-minute pass without ruining your score.`;
            }
        },
        {
            id: "sleep_cycle_architecture",
            category: "Sleep & Recovery",
            title: "How do 90-minute sleep cycles alternate between NREM and REM?",
            keywords: ["sleep cycle architecture", "90 minute sleep cycle", "rem vs nrem sleep", "stages of sleep", "sleep science"],
            answer: function(liveData) {
                return `### 🛌 The 90-Minute Sleep Cycle Architecture

Human sleep is structured in repeating **90-to-110 minute ultradian cycles**:
1. **Stage 1 & 2 (Light NREM)**: Heart rate slows, body temperature drops. Motor memory and coordination are refined.
2. **Stage 3 (Slow-Wave Deep Sleep)**: Delta brainwaves dominate. Human Growth Hormone (HGH) is released, tissues repair, and the **glymphatic system washes toxins from the brain**.
3. **Stage 4 (REM Sleep)**: High brain activity, rapid eye movement. Creative problem solving, emotional processing, and abstract concept synthesis occur.
- Waking up in the middle of Deep Sleep leaves you groggy; waking up at the completion of a 90-minute cycle leaves you feeling energized!`;
            }
        },
        {
            id: "target_sleep_duration",
            category: "Sleep & Recovery",
            title: "Why is 7.5 to 9 hours (5-6 cycles) essential for students?",
            keywords: ["target sleep duration", "how much sleep", "7.5 hours sleep", "why 8 hours sleep", "student sleep needs"],
            answer: function(liveData) {
                return `### ⏳ The 5-Cycle Sleep Target (7.5 to 9 Hours)

- $5 \\times 90\\text{ minutes} = \\mathbf{7.5\\text{ hours of sleep}}$.
- $6 \\times 90\\text{ minutes} = \\mathbf{9.0\\text{ hours of sleep}}$.
- Sleep deprivation is cumulative: Sleeping 6 hours for 10 consecutive days degrades your working memory, reaction time, and emotional stability to the exact same level as **staying awake for 24 hours straight** (without you even realizing how impaired you are).`;
            }
        },
        {
            id: "caffeine_curfew_rule",
            category: "Sleep & Recovery",
            title: "Why does coffee after 2 PM ruin Slow-Wave Deep Sleep?",
            keywords: ["caffeine curfew", "coffee after 2pm", "why caffeine ruins sleep", "caffeine half life sleep", "deep sleep ruined"],
            answer: function(liveData) {
                return `### ☕ The Hidden Threat of Afternoon Caffeine

- Even if you are someone who says *"I can drink espresso at 9 PM and fall asleep immediately"*, brain scans reveal that caffeine **destroys the quality of your sleep**:
- It reduces **Stage 3 Slow-Wave Deep Sleep by up to 30%**.
- You wake up feeling unrefreshed, reach for more coffee the next morning, and become trapped in a chronic cycle of chemical stimulation and unrefreshing sleep. Stop all caffeine by **2:00 PM**.`;
            }
        },
        {
            id: "room_temperature_sleep",
            category: "Sleep & Recovery",
            title: "Why should your bedroom be cool (65-68\u00b0F / 18-20\u00b0C) for deep sleep?",
            keywords: ["room temperature sleep", "cold room sleep", "best temperature to sleep", "sleep environment temperature"],
            answer: function(liveData) {
                return `### ❄️ Thermoregulation & Sleep Onset

- To initiate sleep, your body's core internal temperature must **drop by 2 to 3 degrees Fahrenheit (1 to 1.5°C)**.
- A hot room traps body heat, preventing your brain from entering slow-wave deep sleep and causing frequent micro-awakenings.
- Keep your bedroom cool (**18°C – 20°C / 65°F – 68°F**), use breathable blankets, and take a warm shower before bed (which forces blood to the skin surface, rapidly cooling your core).`;
            }
        },
        {
            id: "morning_cortisol_spike",
            category: "Sleep & Recovery",
            title: "How do you leverage the healthy morning cortisol surge?",
            keywords: ["morning cortisol spike", "cortisol awakening response", "morning energy", "cortisol spike light"],
            answer: function(liveData) {
                return `### 📈 The Cortisol Awakening Response (CAR)

- Cortisol is not inherently bad; your body needs a healthy morning pulse to wake up, elevate heart rate, and clear mental grogginess.
- Getting **10 minutes of outdoor morning light** magnifies this healthy CAR spike, setting your biological clock for high daytime alertness and effortless nighttime tiredness.`;
            }
        },
        {
            id: "evening_light_suppression",
            category: "Sleep & Recovery",
            title: "How does dimming overhead lights 2 hours before bed aid sleep?",
            keywords: ["dim overhead lights", "evening light", "melatonin release light", "lamps before bed"],
            answer: function(liveData) {
                return `### 🕯️ Evening Lighting & Melatonin Release

- Overhead ceiling lights simulate the midday sun directly above you, signaling your brain to stay awake.
- **Protocol**: 2 hours before bed, turn off all bright overhead lights. Switch to low-intensity table lamps, warm red-spectrum lighting, or candlelight.
- This permits your pineal gland to release **melatonin**, inducing natural sleepiness within 45 minutes.`;
            }
        },
        {
            id: "nsdr_deep_rest_guide",
            category: "Sleep & Recovery",
            title: "How do you perform a 10-minute Non-Sleep Deep Rest (NSDR) session?",
            keywords: ["how to do nsdr", "nsdr guide", "nsdr steps", "yoga nidra guide", "deep rest protocol"],
            answer: function(liveData) {
                return `### 🧘 10-Minute NSDR Step-by-Step Guide

1. Lie down on a comfortable surface or recline in an armchair. Close your eyes.
2. Inhale through your nose for 4 seconds, exhale slowly through your mouth for 8 seconds. Repeat 3 times.
3. Mentally scan your body from your toes up to your scalp, releasing muscle tension in each area.
4. Imagine your body becoming heavy and grounded, resting in zero-gravity stillness.
5. After 10 minutes, open your eyes. You will feel instantly alert, clear-headed, and calm!`;
            }
        },
        {
            id: "box_breathing_technique",
            category: "Sleep & Recovery",
            title: "How does 4-4-4-4 Navy SEAL Box Breathing calm panic?",
            keywords: ["box breathing", "navy seal breathing", "4 4 4 4 breathing", "calm panic breathing", "anxiety breathing"],
            answer: function(liveData) {
                return `### 📦 The 4-4-4-4 Box Breathing Technique

Used by Navy SEALs before high-stress operations:
1. **Inhale** slowly through your nose for **4 seconds**.
2. **Hold** your breath with full lungs for **4 seconds**.
3. **Exhale** smoothly through your mouth for **4 seconds**.
4. **Hold** empty for **4 seconds**.
- Repeat for 4 cycles (2 minutes).
- **The Science**: Stimulates the vagus nerve, immediately lowers blood pressure, and stops acute panic or exam anxiety.`;
            }
        },
        {
            id: "physiological_sigh_guide",
            category: "Sleep & Recovery",
            title: "How does the Physiological Sigh reset acute stress in 30 seconds?",
            keywords: ["physiological sigh guide", "fastest way to calm down", "double inhale exhale", "acute stress reset"],
            answer: function(liveData) {
                return `### 🫁 The Physiological Sigh (The Neurobiology of Calming)

When stressed, the tiny air sacs in your lungs (alveoli) collapse, causing carbon dioxide to build up in your bloodstream:
1. Inhale deeply through your nose.
2. At the top of the inhale, take a second sharp 'sip' of air through your nose to pop open the collapsed alveoli.
3. Exhale all the air out through your mouth with a long, slow sigh.
- Just **2 or 3 physiological sighs** instantly resets your heart rate and restores emotional equilibrium.`;
            }
        },
        {
            id: "burnout_warning_indicators",
            category: "Sleep & Recovery",
            title: "What are the early warning signs of cognitive burnout?",
            keywords: ["burnout warning signs", "how to tell if burnt out", "cognitive burnout", "study burnout signs"],
            answer: function(liveData) {
                return `### ⚠️ Early Warning Signs of Academic Burnout

1. **Emotional Blunting / Cynicism**: Tasks you used to find exciting feel like a pointless, heavy burden.
2. **Chronic Brain Fog**: Difficulty recalling simple formulas you knew well yesterday.
3. **Sleep Disruption**: Feeling exhausted all day, but when your head hits the pillow at night, your brain is racing (tired and wired).
4. **Increased Irritability**: Snapping at family or friends over minor things.
- If you notice these, take an immediate **24-hour cognitive off-day** to recharge before your system crashes completely.`;
            }
        },
        {
            id: "exam_anxiety_management",
            category: "Sleep & Recovery",
            title: "How do you reframe exam anxiety as peak readiness?",
            keywords: ["exam anxiety", "nervous before test", "how to beat test anxiety", "reframe nervousness"],
            answer: function(liveData) {
                return `### 🧠 Cognitive Reappraisal: From Fear to Readiness

- Physiological markers of anxiety (racing heart, sweaty palms, butterflies) are **identical** to the physiological markers of excitement!
- Research by Dr. Alison Wood Brooks at Harvard shows that telling yourself *"I am excited and ready"* instead of *"I am terrified"* redirects the adrenaline surge into heightened mental focus and faster problem solving.`;
            }
        },
        {
            id: "bedtime_worry_journal",
            category: "Sleep & Recovery",
            title: "How does the 'Brain Dump' bedtime worry journal prevent insomnia?",
            keywords: ["worry journal", "brain dump before bed", "cant sleep racing thoughts", "bedtime journal"],
            answer: function(liveData) {
                return `### 📓 The 5-Minute Bedtime Brain Dump

- When you lie awake at night, it is usually because your working memory is desperately trying not to forget tomorrow's uncompleted tasks.
- Keep a paper notepad next to your bed:
  - Spend 3 minutes writing down every single worry, task, or email you need to address tomorrow.
- Once written on paper, your brain's **Zeigarnik tension relaxes**, allowing you to drift into deep sleep within minutes.`;
            }
        },
        {
            id: "magnesium_glycinate_sleep",
            category: "Sleep & Recovery",
            title: "How does Magnesium Glycinate support deep sleep and muscle recovery?",
            keywords: ["magnesium glycinate", "magnesium for sleep", "best supplement for sleep", "magnesium recovery"],
            answer: function(liveData) {
                return `### 💊 Magnesium Glycinate for Neural Relaxation

- Magnesium is a co-factor in over 300 enzymatic reactions in the human body:
- **Glycinate Form**: Crosses the blood-brain barrier effectively and binds to **GABA receptors** (the brain's primary calming neurotransmitter).
- Relaxes muscular tension, eliminates nighttime leg twitches, and significantly improves slow-wave deep sleep quality.`;
            }
        },
        {
            id: "circadian_sleep_regularity",
            category: "Sleep & Recovery",
            title: "Why does sleeping and waking at the exact same time matter so much?",
            keywords: ["sleep regularity", "same bedtime every night", "circadian regularity", "sleep schedule consistency"],
            answer: function(liveData) {
                return `### ⏰ The Law of Sleep Regularity (Dr. Matthew Walker)

- Going to bed at 11:00 PM and waking at 7:00 AM every single day (even on weekends) is **more important than total sleep duration**:
- Your circadian rhythm anticipates your bedtime, releasing melatonin in advance.
- If you shift your schedule by 3 hours on weekends ("Social Jetlag"), your internal organs become desynchronized, causing severe Monday morning brain fog.`;
            }
        },
        {
            id: "alcohol_sleep_myth",
            category: "Sleep & Recovery",
            title: "Why does alcohol ruin REM sleep and memory consolidation?",
            keywords: ["alcohol sleep myth", "alcohol ruins sleep", "drinking alcohol study", "alcohol rem sleep"],
            answer: function(liveData) {
                return `### 🍺 The Alcohol Sedation Myth

- Alcohol is a sedative; it does **not** induce natural sleep. It merely anesthetizes your neocortex.
- **The Damage**: Alcohol fragments sleep and almost completely wipes out **REM sleep** (the stage where memory consolidation and emotional recalibration take place).
- Even 1 or 2 drinks in the evening can impair memory retention of material you studied earlier that day!`;
            }
        },
        {
            id: "blue_blocker_glasses",
            category: "Sleep & Recovery",
            title: "Do blue-light blocking glasses actually help with screen fatigue?",
            keywords: ["blue blocker glasses", "do blue light glasses work", "screen glasses", "blue light sleep glasses"],
            answer: function(liveData) {
                return `### 👓 Blue-Light Blocking Glasses: The Evidence

- Amber/orange-tinted glasses that block 99% of blue and green wavelengths (400–500nm) are clinically proven to preserve evening melatonin levels when using screens at night.
- However, during the daytime, you **want** bright blue light to stay alert! Only wear blue-blockers in the final 2 hours before bed.`;
            }
        },
        {
            id: "cold_shower_alertness",
            category: "Sleep & Recovery",
            title: "How does a 60-second cold shower spike dopamine and alertness?",
            keywords: ["cold shower", "cold plunge dopamine", "60 second cold shower", "morning cold shower"],
            answer: function(liveData) {
                return `### 🚿 Cold Water Exposure Neuroscience

A 60-second cold shower triggers a remarkable neurochemical response:
- Causes a **250% increase in baseline dopamine** that stays elevated for up to 3 to 4 hours without any crash!
- Increases blood norepinephrine by over 500%, instantly eliminating morning grogginess and sharpening mental vigilance.`;
            }
        },
        {
            id: "mental_resilience_adversity",
            category: "Sleep & Recovery",
            title: "How do Stoic and psychological frameworks build academic resilience?",
            keywords: ["mental resilience", "stoicism for students", "dichotomy of control", "academic resilience"],
            answer: function(liveData) {
                return `### 🏛️ The Stoic Dichotomy of Control (Epictetus)

Separate your life into two distinct buckets:
1. **Things You Cannot Control**: Exam difficulty, other people's grades, teacher personalities, past mistakes. (Worrying about these is pure wasted energy).
2. **Things You 100% Control**: Starting your timer today, your diet, how much you sleep, and putting your phone away.
- Focus 100% of your energy on what you control, and peace of mind naturally follows.`;
            }
        },
        {
            id: "chronic_stress_memory_damage",
            category: "Sleep & Recovery",
            title: "How does chronic elevated cortisol damage brain cells in the hippocampus?",
            keywords: ["chronic stress brain", "cortisol damages hippocampus", "stress memory loss", "stress brain fog"],
            answer: function(liveData) {
                return `### 🧠 Chronic Stress & Hippocampal Atrophy

- Acute stress (a 45-minute focus challenge) is good; **chronic stress is toxic to brain tissue**.
- Prolonged high cortisol levels cause dendritic atrophy and neuron death in the **Hippocampus** (the seat of learning and spatial memory), while simultaneously enlarging the **Amygdala** (fear center).
- Prioritizing daily physical workouts and 8 hours of sleep acts as direct neuro-protection against stress damage.`;
            }
        },
        {
            id: "recovering_from_all_nighter",
            category: "Sleep & Recovery",
            title: "What is the emergency protocol to recover from an unavoidable all-nighter?",
            keywords: ["all nighter recovery", "how to recover from all nighter", "pulled all nighter", "stayed up all night study"],
            answer: function(liveData) {
                return `### 🚑 Emergency All-Nighter Recovery Protocol

If an emergency forced an all-nighter:
1. **Do NOT sleep all day**: Sleeping from 8 AM to 4 PM destroys your circadian clock for the next week.
2. **Take a 90-minute nap** around 1:00 PM (one full sleep cycle).
3. **Hydrate aggressively** and eat light, protein-rich meals. Avoid heavy refined carbs.
4. **Go to sleep early tonight** at 9:30 PM to catch up on lost slow-wave deep sleep!`;
            }
        },
        {
            id: "sleep_debt_myth",
            category: "Sleep & Recovery",
            title: "Can you 'catch up' on lost sleep over the weekend?",
            keywords: ["sleep debt", "can you catch up on sleep", "sleep debt myth", "weekend sleep debt"],
            answer: function(liveData) {
                return `### 📉 The Sleep Debt Bankruptcy Myth

- Sleep is not like a financial bank account: you cannot accumulate a 10-hour debt during the week and pay it back by sleeping 12 hours on Sunday.
- Research shows that while weekend binge-sleeping can restore physical energy, it **does not reverse the metabolic damage or cognitive memory deficits** incurred during the week. Consistency is everything.`;
            }
        },
        {
            id: "light_therapy_winter",
            category: "Sleep & Recovery",
            title: "How do you manage seasonal sluggishness and low winter sunlight?",
            keywords: ["seasonal sluggishness", "winter depression study", "sad light therapy", "10000 lux light"],
            answer: function(liveData) {
                return `### 💡 Managing Winter Lethargy (Light Therapy)

- In winter, short daylight hours can delay morning cortisol pulses and induce sluggishness:
- Use a **10,000 Lux Light Therapy Lamp** placed on your study desk 30cm away for 20 minutes each morning.
- Supplement with **Vitamin D3 (2,000–4,000 IU daily)** to keep dopamine and mood steady throughout the winter months.`;
            }
        },
        {
            id: "midday_fatigue_mitigation",
            category: "Sleep & Recovery",
            title: "How do you overcome the post-lunch slump without energy drinks?",
            keywords: ["beat post lunch slump", "midday fatigue fix", "tired after lunch", "post meal tiredness"],
            answer: function(liveData) {
                return `### ⚡ The 3-Step Slump Destroyer

When fatigue hits around 1:30 PM:
1. **Step Outside**: 10 minutes of direct outdoor natural light.
2. **Wash Face with Cold Water**: Stimulates the mammalian dive reflex.
3. **Drink 500ml Cold Water with a Pinch of Salt**: Rehydrates your blood volume and restores action potential firing without relying on sugar!`;
            }
        },
        {
            id: "micro_breaks_eye_strain",
            category: "Sleep & Recovery",
            title: "How does the 20-20-20 rule eliminate digital eye fatigue?",
            keywords: ["20 20 20 rule", "eye strain", "computer eye fatigue", "eye exercises study"],
            answer: function(liveData) {
                return `### 👁️ The 20-20-20 Ocular Reset Rule

- Looking at a glowing screen 50cm away keeps the ciliary muscles in your eyes locked in constant contraction.
- **The Rule**: Every **20 minutes**, look at an object at least **20 feet (6 meters) away** for at least **20 seconds**.
- This completely relaxes the ciliary lens, eliminates ocular tension, and prevents dry eyes and headaches.`;
            }
        },
        {
            id: "rest_without_guilt",
            category: "Sleep & Recovery",
            title: "Why is biological rest not laziness, but an essential performance prerequisite?",
            keywords: ["rest without guilt", "guilt when resting", "resting is not lazy", "importance of rest"],
            answer: function(liveData) {
                return `### 🌿 Rest is a Biological Weapon, Not a Weakness

- Elite athletes do not grow muscle in the gym; they tear muscle in the gym, and **grow muscle while resting**.
- In the exact same way, you do not consolidate knowledge while reading; you encode knowledge while resting and sleeping!
- Taking scheduled, guilt-free biological rest is what gives you the fierce intensity to dominate your deep work blocks.`;
            }
        },
        {
            id: "atomic_habits_identity",
            category: "Philosophy & Habits",
            title: "How do identity-based habits create permanent behavioral change?",
            keywords: ["identity based habits", "atomic habits", "james clear identity", "how to change habits permanently"],
            answer: function(liveData) {
                return `### 🧬 Identity-Based Habits (James Clear)

Most people try to change their results (*"I want to score +500 points"*). This fails because the underlying identity remains unchanged:
- **The Shift**: Shift from outcome-based to **identity-based habits**:
  - Instead of saying *"I have to study for 4 hours"*, tell yourself: *"I am the kind of person who never misses a scheduled focus block."*
- Every time you sit down and start the Academics timer, you cast a **vote for your new identity**. After 30 votes, self-doubt disappears!`;
            }
        },
        {
            id: "two_minute_rule_habits",
            category: "Philosophy & Habits",
            title: "How does the 2-Minute Rule make starting any habit frictionless?",
            keywords: ["2 minute rule", "two minute rule habits", "make habits easy", "how to start habit"],
            answer: function(liveData) {
                return `### ⏱️ The 2-Minute Habit Rule

When you start a new habit, it should take **less than 2 minutes to do**:
- *"Study physics for 3 hours"* becomes *"Open notebook and read 1 equation."*
- *"Go for a 5km run"* becomes *"Tie running shoes and step outside the front door."*
- **The Philosophy**: You must **standardize before you can optimize**. A habit must be established before it can be improved. Once you start, momentum takes over!`;
            }
        },
        {
            id: "temptation_bundling_strategy",
            category: "Philosophy & Habits",
            title: "What is Temptation Bundling and how does it make hard work fun?",
            keywords: ["temptation bundling", "pair habit with reward", "make study fun", "bundling strategy"],
            answer: function(liveData) {
                return `### 🎁 Temptation Bundling: The Pleasure-Discipline Bridge

Pioneered by behavioral economist Katy Milkman:
- Pair an action you **need** to do with an action you **want** to do:
  - Only listen to your favorite synthwave/gaming soundtrack while running focus blocks in Academics.
  - Only drink your favorite iced matcha latte while solving hard problem sets.
- Your brain links the pleasure of the reward with the execution of the discipline!`;
            }
        },
        {
            id: "implementation_intentions",
            category: "Philosophy & Habits",
            title: "How do Implementation Intentions ('When X, then Y') lock in consistency?",
            keywords: ["implementation intentions", "when x then y", "habit triggers", "peter gollwitzer"],
            answer: function(liveData) {
                return `### 🎯 Implementation Intentions: Pre-Deciding Your Actions

Vague intentions fail: *"I will study more tomorrow."*
- **Implementation Intention Formula**:
  $$\\text{I will [BEHAVIOR] at [TIME] in [LOCATION]}$$
  *(e.g., "I will solve 10 calculus problems at 9:00 AM at my bedroom desk.")*
- Pre-loading the exact cue and action in your mind removes decision-making friction when tomorrow arrives, increasing follow-through by over **200%**!`;
            }
        },
        {
            id: "never_miss_twice_rule",
            category: "Philosophy & Habits",
            title: "What is the 'Never Miss Twice' rule and why is it vital?",
            keywords: ["never miss twice", "missed a day habit", "break streak habit", "never miss twice rule"],
            answer: function(liveData) {
                return `### 🛡️ The Golden Rule: Never Miss Twice

- Missing one day is an accident (illness, travel, family emergencies happen to everyone).
- **Missing twice is the start of a new, negative habit**:
- If you have an unproductive Monday, treat Tuesday as an emergency priority. Do whatever it takes to log at least a 30-minute block on Tuesday. Rebounding immediately preserves your identity and trajectory!`;
            }
        },
        {
            id: "perfectionism_paralysis",
            category: "Philosophy & Habits",
            title: "How do you defeat Perfectionism Paralysis and the all-or-nothing trap?",
            keywords: ["perfectionism paralysis", "all or nothing trap", "overcoming perfectionism", "good enough beats perfect"],
            answer: function(liveData) {
                return `### 🧱 Defeating Perfectionism Paralysis

Perfectionism is not high standards; it is **fear of failure dressed in a suit**:
- *"If I can't study for 4 hours, doing 20 minutes is pointless."* (The All-or-Nothing Trap).
- **The Reality**: Doing a 25-minute focus session on a terrible day is worth **10x more** than doing 4 hours on a perfect day—because it trains your brain that you show up regardless of circumstances.
- **Motto**: *A messy 30 minutes always destroys a perfect zero!*`;
            }
        },
        {
            id: "bad_day_rebound_protocol",
            category: "Philosophy & Habits",
            title: "What is the exact 3-step protocol to salvage a bad day?",
            keywords: ["bad day rebound protocol", "salvage bad day", "how to fix bad day", "rebound protocol"],
            answer: function(liveData) {
                return `### 🔄 The 3-Step Bad Day Rebound Protocol

If it is 4:00 PM and you have procrastinated all day:
1. **Declare a Hard Psychological Reset**: Wash your face with cold water, change your shirt, and do 10 pushups. The morning is dead; the evening starts now!
2. **Execute a Single 30-Minute Sprint**: Open Academics and complete one clean 30-minute block.
3. **Log a Clean Win**: Check off one task. Ending the day with $+50$ points turns a complete collapse into an honorable recovery.`;
            }
        },
        {
            id: "energy_vs_time_management",
            category: "Philosophy & Habits",
            title: "Why does Managing Energy matter more than Managing Time?",
            keywords: ["energy vs time management", "manage energy not time", "jim loehr energy", "cognitive energy"],
            answer: function(liveData) {
                return `### ⚡ Energy Management > Time Management

- You have 24 hours in a day, but your high-octane cognitive energy is strictly limited to **4 to 5 peak hours**.
- Spending 4 hours at your desk while exhausted achieves less than 60 minutes of high-energy, razor-sharp focus.
- Protect your sleep, nutrition, and sunlight so that your focus hours operate at 100% capacity!`;
            }
        },
        {
            id: "frictionless_workspace_design",
            category: "Philosophy & Habits",
            title: "How do you design a frictionless, distraction-free study desk?",
            keywords: ["frictionless workspace", "study desk setup", "environment design habits", "clean desk focus"],
            answer: function(liveData) {
                return `### 🏛️ Environmental Architecture: Design Over Willpower

Willpower is an unreliable muscle; **environment design is destiny**:
1. **Zero Clutter**: If an object does not serve your current session, remove it from your field of view.
2. **Dedicated Purpose**: Use your desk exclusively for study. Never eat meals, watch movies, or play games at your study desk.
3. **Immediate Starting State**: Before going to sleep, leave your textbook open to the exact page and your notebook pen uncapped. Tomorrow morning, you can start in 2 seconds!`;
            }
        },
        {
            id: "shallow_vs_deep_work",
            category: "Philosophy & Habits",
            title: "Deep Work vs. Shallow Work: What is the core difference?",
            keywords: ["deep work vs shallow work", "cal newport deep work", "shallow tasks", "what is deep work"],
            answer: function(liveData) {
                return `### 💎 Deep Work vs. Shallow Work (Cal Newport)

- **Deep Work**: Professional/academic activities performed in a state of distraction-free concentration that push your cognitive capabilities to their limit. Deep work creates new value, builds rare skills, and is hard to replicate.
- **Shallow Work**: Non-cognitively demanding, logistical, administrative tasks (checking emails, formatting slides, quick messages).
- 2 hours of Deep Work will advance your academic standing far more than 8 hours of busy shallow work!`;
            }
        },
        {
            id: "batching_shallow_tasks",
            category: "Philosophy & Habits",
            title: "How do you batch shallow tasks into a single protective block?",
            keywords: ["batching shallow tasks", "shallow work block", "how to handle emails messages", "admin block"],
            answer: function(liveData) {
                return `### 📦 The 4:00 PM Shallow Work Block

- Never interleave administrative chores throughout your morning deep work blocks.
- Create a dedicated task in Day Planner titled: *"Administrative & Message Batch"*.
- In that single 30-to-45 minute block, knock out all pending texts, Discord messages, emails, and file submissions in rapid succession!`;
            }
        },
        {
            id: "weekly_review_cadence",
            category: "Philosophy & Habits",
            title: "How do I conduct an effective 15-minute Sunday Weekly Review?",
            keywords: ["weekly review cadence", "sunday review", "how to do weekly review", "review week productivity"],
            answer: function(liveData) {
                return `### 📊 The 15-Minute Sunday Calibration Review

Every Sunday evening, open Productometer's **Weekly Comparison Analytics**:
1. **Inspect Net Points**: What was your weekly total? Which day was your peak?
2. **Analyze Friction Points**: Did you experience Break Bleed on Wednesday? What caused it?
3. **Set Tomorrow's First Move**: Schedule Monday's 9:00 AM anchor block.
- Doing this weekly keeps you in the top 1% of strategic performers.`;
            }
        },
        {
            id: "progress_tracking_psychology",
            category: "Philosophy & Habits",
            title: "Why does visual progress tracking release motivating dopamine?",
            keywords: ["progress tracking psychology", "visual progress tracking", "why charts motivate", "seinfeld don't break the chain"],
            answer: function(liveData) {
                return `### 📈 The Psychology of Visual Progress Tracking

- The human brain craves visual evidence of competence.
- When you see your **Daily Productivity Curve** rise or watch your **7-day colored bars** expand, your brain's ventral striatum releases natural, clean dopamine.
- This creates the famous **"Don't Break the Chain" effect (Jerry Seinfeld)**: maintaining your streak becomes so enjoyable that quitting feels unthinkable!`;
            }
        },
        {
            id: "overcoming_imposter_syndrome",
            category: "Philosophy & Habits",
            title: "How do you overcome Imposter Syndrome when tackling hard subjects?",
            keywords: ["imposter syndrome", "feeling dumb studying", "hard subject struggle", "overcoming self doubt"],
            answer: function(liveData) {
                return `### 🧠 Navigating Cognitive Frustration (Neuroplasticity)

- When you are struggling with a difficult calculus problem or coding bug and feel like an imposter:
- **Understand the Biological Mechanism**: That feeling of intense mental strain is the physical release of **norepinephrine and acetylcholine**!
- It is the biological signal that your brain is actively rewiring its synaptic connections to grow. The confusion is not a sign of failure—**it is the feeling of learning happening in real time!**`;
            }
        },
        {
            id: "saying_no_boundary_setting",
            category: "Philosophy & Habits",
            title: "How do you set boundaries and say 'No' to non-urgent demands?",
            keywords: ["saying no", "boundary setting", "protecting study time", "how to decline invitations"],
            answer: function(liveData) {
                return `### 🛡️ Ruthless Focus: The Art of Saying No (Steve Jobs)

*"People think focus means saying yes to the thing you've got to focus on. But that's not what it means at all. It means saying no to the hundred other good ideas that there are."*
- When someone asks you to hang out or take on an errand during your scheduled study block:
- *"I have an important commitment between 2 PM and 4 PM. Let's catch up at 5:00 PM!"*
- Treat your study appointments with the exact same gravity as a doctor's appointment.`;
            }
        },
        {
            id: "decision_fatigue_reduction",
            category: "Philosophy & Habits",
            title: "How do you eliminate trivial daily decisions to preserve mental energy?",
            keywords: ["decision fatigue reduction", "eliminate trivial choices", "steve jobs clothes", "preserve mental energy"],
            answer: function(liveData) {
                return `### 👔 Preserving Executive Function for High-Stakes Work

- Every decision you make (what to wear, what to eat, which song to pick) consumes glucose in your prefrontal cortex.
- Great thinkers (Einstein, Steve Jobs, Obama) simplified their wardrobes and breakfasts to eliminate trivial decisions.
- **Rule**: Decide what you will wear, eat for breakfast, and study first the night before in Day Planner!`;
            }
        },
        {
            id: "gamification_psychology",
            category: "Philosophy & Habits",
            title: "How does gamification tap into intrinsic human motivation?",
            keywords: ["gamification psychology", "why points work", "gaming productivity", "gamified habits"],
            answer: function(liveData) {
                return `### 🎮 The Gamification of Daily Life

Productometer transforms the abstract struggle of self-discipline into a clear, engaging video game:
- **Net Score**: Your daily XP.
- **Tiers (Ascended, Elite, Solid)**: Leveling up your biological character.
- **Focus Shield**: Defensive armor against distraction bosses.
- By providing immediate, visual feedback, it makes hard discipline feel as intrinsically satisfying as leveling up an RPG character!`;
            }
        },
        {
            id: "delayed_gratification_training",
            category: "Philosophy & Habits",
            title: "How do you train the brain for Delayed Gratification?",
            keywords: ["delayed gratification", "marshmallow test", "resisting instant gratification", "willpower training"],
            answer: function(liveData) {
                return `### 🍬 Training the Delayed Gratification Muscle

- The famous Stanford **Marshmallow Test** proved that delayed gratification is the #1 predictor of long-term academic and financial success.
- **The Practice**: Whenever you feel the urge to check your phone or eat a sweet snack, tell yourself:
  *"I will wait 10 minutes."*
- Delaying gratification by just 10 minutes strengthens the inhibitory control pathways between your prefrontal cortex and your reward centers.`;
            }
        },
        {
            id: "rebuilding_broken_streak",
            category: "Philosophy & Habits",
            title: "How do you mentally rebound when a long streak is broken?",
            keywords: ["broken streak", "lost my streak", "streak ruined rebound", "mental recovery broken streak"],
            answer: function(liveData) {
                return `### 🔄 Rebounding from a Broken Streak

- Losing a 40-day streak can feel crushing. But remember:
- **The streak number is not the asset; the neural pathways you built over those 40 days ARE the asset!**
- You did not lose the knowledge, the muscle, or the discipline you developed.
- Start Streak #2 immediately tomorrow. A person with ten 30-day streaks is just as successful as someone with one 300-day streak!`;
            }
        },
        {
            id: "mindset_growth_vs_fixed",
            category: "Philosophy & Habits",
            title: "How do you apply Carol Dweck's Growth Mindset to hard technical subjects?",
            keywords: ["growth mindset", "carol dweck", "fixed mindset vs growth", "learning hard subjects"],
            answer: function(liveData) {
                return `### 🌱 Fixed vs. Growth Mindset in Academics

- **Fixed Mindset**: *"I'm just not a math person / coding person."* (Treats intelligence as an unchangeable genetic lottery).
- **Growth Mindset**: *"I don't understand this problem **yet**."*
- Neuroplasticity proves that the human brain is like a muscle: whenever you struggle and correct mistakes, dendritic connections physically multiply. You can master any subject with deliberate practice!`;
            }
        },
        {
            id: "pomodoro_interruption_shield",
            category: "Philosophy & Habits",
            title: "What should you do when someone interrupts you mid-Pomodoro?",
            keywords: ["interrupted during study", "handle interruptions", "pomodoro interruption shield", "someone talks to me studying"],
            answer: function(liveData) {
                return `### 🛡️ The 3-Step Interruption Shield

When a roommate or family member interrupts you mid-session:
1. **Inform**: *"I'm currently in the middle of a 20-minute timed study block."*
2. **Negotiate**: *"Can I come find you in 12 minutes as soon as my timer rings?"*
3. **Call Back**: When your chime rings, go find them immediately. This trains everyone around you to respect your focus blocks while maintaining warm relationships!`;
            }
        },
        {
            id: "daily_standup_with_yourself",
            category: "Philosophy & Habits",
            title: "What is the 3-Question Daily Standup with yourself?",
            keywords: ["daily standup", "daily self review", "three questions review", "daily reflection"],
            answer: function(liveData) {
                return `### 🧘 The 3-Minute Personal Daily Standup

Ask yourself every evening when reviewing Producto's synthesis:
1. **What worked well today?** (Celebrate your victories).
2. **Where did friction or distraction slip in?** (Observe without shame).
3. **What is my #1 calibration for tomorrow morning?** (Adjust your strategy).
- Rapid, continuous self-calibration is the hallmark of elite performers.`;
            }
        },
        {
            id: "digital_minimalism_setup",
            category: "Philosophy & Habits",
            title: "How do you declutter your smartphone to eliminate micro-distractions?",
            keywords: ["digital minimalism", "phone declutter", "clean phone home screen", "remove distractions phone"],
            answer: function(liveData) {
                return `### 📱 The Digital Minimalist Smartphone Setup

1. **Blank Home Screen**: Move all social and entertainment apps off your main screen into app drawers or folders.
2. **Zero Red Badges**: Turn off notification badges.
3. **Only Core Utilities on Dock**: Keep only Phone, Maps, Productometer, and Notes on your bottom bar.
- Turning your phone into a purposeful tool rather than a dopamine casino saves you 2+ hours every day!`;
            }
        },
        {
            id: "long_term_consistency_secret",
            category: "Philosophy & Habits",
            title: "Why does 2 hours every day beat 10 hours once a week?",
            keywords: ["consistency secret", "2 hours every day beats 10", "compound interest habits", "steady consistency"],
            answer: function(liveData) {
                return `### 📈 The Compound Interest of Daily Consistency

- Studying 10 hours on Saturday = **10 hours with massive fatigue and single-night sleep consolidation**.
- Studying 2 hours daily for 5 days = **10 hours with 5 separate nights of slow-wave sleep consolidation**!
- You retain **300% more information** with zero burnout. Consistency compounds like financial interest: small daily investments yield astronomical long-term mastery.`;
            }
        },
        {
            id: "sustainable_high_performance",
            category: "Philosophy & Habits",
            title: "How do you balance fierce ambition with physical longevity and peace?",
            keywords: ["sustainable high performance", "ambition and peace", "longevity productivity", "healthy high performance"],
            answer: function(liveData) {
                return `### 🌟 Sustainable High Performance

True productivity is not working until you collapse:
- It is the art of **high-intensity focus alternating with deep, rejuvenating biological rest**.
- You master your academics, you train your physical body, you eat clean fuel, you get 8 hours of restorative sleep, and you make time for laughter and loved ones.
- That is the vision of Productometer: **Sustainable, elite human mastery!**`;
            }
        }
    ];

    // --- 5. NATURAL LANGUAGE INTENT MATCHER & SEARCH ENGINE ---
    const STOP_WORDS = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'about', 'like', 'from', 'as', 'into', 'and', 'or', 'but', 'how', 'what', 'why',
        'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'tell', 'show', 'give',
        'me', 'my', 'you', 'your', 'i', 'we', 'it', 'its', 'this', 'that', 'these', 'those', 'do',
        'does', 'did', 'take', 'need', 'want', 'please', 'explain', 'know', 'much', 'many', 'good'
    ]);

    const TOPIC_CLUSTERS = [
        {
            name: "sleep_bedtime_guardian",
            triggers: [
                "sleep", "bedtime", "alarm", "wake up", "wakeup", "wake-up",
                "smart alarm", "circadian", "distraction cap", "50 step", "50-step",
                "rem", "wind down", "skip alarm", "sleep schedule", "sleep monitor"
            ],
            boostIds: [
                "sleep_monitoring_module_guide",
                "smart_wakeup_alarm_routine",
                "bedtime_distraction_cap_guard",
                "target_sleep_duration",
                "sleep_cycle_architecture",
                "bedtime_mode_wind_down"
            ]
        },
        {
            name: "diet_workout",
            triggers: ["diet", "food", "nutrition", "workout diet", "active workout", "meal", "eating", "eat", "protein", "calories", "weight", "weigh", "bulk", "cut", "hydration"],
            boostIds: ["active_workout_diet_blueprint", "pre_post_workout_nutrition", "daily_protein_targets_sources", "vegetarian_vegan_protein", "gamified_diet_calculator"]
        },
        {
            name: "scoring_formula",
            triggers: ["score", "formula", "points", "math", "calculate", "150-30n", "rating", "tiers", "negative"],
            boostIds: ["score_calculation_overview", "health_formula_150_30n", "screen_penalty_formula", "score_rating_tiers", "negative_score_causes"]
        },
        {
            name: "breaks_rest",
            triggers: ["break", "rest", "overwork", "fatigue", "nap", "tired", "afternoon", "slump", "dopamine", "90 minute"],
            boostIds: ["why_humans_need_breaks", "overwork_alert_science", "break_bleed_danger", "earned_dopamine_spikes", "afternoon_slump_biology"]
        },
        {
            name: "focus_shield_android",
            triggers: ["focus shield", "blocker", "shorts", "reels", "restricted", "accessibility", "android 13", "permission"],
            boostIds: ["shorts_reels_blocker_shield", "accessibility_restricted_settings", "unlock_restricted_settings_guide", "usage_access_permission_android"]
        },
        {
            name: "academics_timer",
            triggers: ["timer", "pomodoro", "study session", "whitelist", "alarm", "active recall", "spaced repetition"],
            boostIds: ["pomodoro_timer_mechanics", "distraction_alarm_triggers", "whitelist_websites", "active_recall_strategies", "spaced_repetition_integration"]
        },
        {
            name: "day_planner_tasks",
            triggers: ["planner", "schedule", "tasks", "bonus", "drum picker", "timeline", "eisenhower"],
            boostIds: ["schedule_sessions_planner", "edit_delete_task", "complete_task_checkmarks", "day_planner_bonus_50", "eisenhower_matrix_planning"]
        },
        {
            name: "sleep_circadian",
            triggers: ["sleep", "circadian", "chronotype", "chronotypes", "peak energy", "caffeine", "melatonin", "nsdr", "cortisol", "insomnia", "worry"],
            boostIds: ["sleep_cycle_architecture", "target_sleep_duration", "caffeine_curfew_rule", "morning_cortisol_spike", "nsdr_deep_rest_guide"]
        },
        {
            name: "data_export_backup",
            triggers: ["export", "backup", "transfer", "download data", "save data", "export data", "backup data", "sync data"],
            boostIds: ["export_backup_data"]
        },
        {
            name: "habits_mindset",
            triggers: ["atomic habits", "habit", "motivation", "procrastination", "identity", "discipline", "never miss twice"],
            boostIds: ["atomic_habits_identity", "two_minute_rule_habits", "never_miss_twice_rule", "perfectionism_paralysis", "bad_day_rebound_protocol"]
        }
    ];

    function normalizeText(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // --- 6. CONVERSATIONAL API KEY HANDLER ---
    function checkAndHandleApiKeyInput(rawQuery) {
        const m = rawQuery.match(/(AIzaSy[A-Za-z0-9_\-]+)/);
        if (m) {
            const key = m[1];
            if (typeof window !== 'undefined') {
                window.PRODUCTO_GEMINI_KEY = key;
                localStorage.setItem('chronocoach_gemini_key', key);
            }
            return `### ⚡ Gemini Agent Connected & Activated! 🟢

` +
                   `Your Google Gemini API Key has been saved directly to your local device.

` +
                   `• **Agent Status**: 🟢 **Online · Direct Connection**
` +
                   `• **Model**: Google Gemini 1.5 Flash (1,500 queries/day free)
` +
                   `• **Personal Context**: Calibrated with your live score & body stats

` +
                   `*Ask me any open-ended or out-of-the-box question now, and I will connect directly to Gemini with zero delay!*`;
        }
        return null;
    }

    // --- 6. DUAL CLOUD AI DISPATCHER (GEMINI API + CLOUDFLARE) ---
    function getCloudflareUrl() {
        const defaultWorkerUrl = 'https://producto-ai.harshitgupta8088.workers.dev';
        if (typeof window !== 'undefined') {
            return window.PRODUCTO_CF_URL || localStorage.getItem('chronocoach_cf_url') || defaultWorkerUrl;
        }
        return defaultWorkerUrl;
    }

    function getGeminiApiKey() {
        if (typeof window !== 'undefined') {
            return window.PRODUCTO_GEMINI_KEY || localStorage.getItem('chronocoach_gemini_key') || '';
        }
        return '';
    }

    function setCloudConfig(cfUrl, geminiKey) {
        if (typeof window !== 'undefined') {
            if (cfUrl !== undefined) {
                window.PRODUCTO_CF_URL = cfUrl;
                localStorage.setItem('chronocoach_cf_url', cfUrl);
            }
            if (geminiKey !== undefined) {
                window.PRODUCTO_GEMINI_KEY = geminiKey;
                localStorage.setItem('chronocoach_gemini_key', geminiKey);
            }
        }
    }

    async function dispatchCloudAI(userQuery, liveData, history) {
        const cfUrl = getCloudflareUrl().trim() || 'https://producto-ai.harshitgupta8088.workers.dev';
        const p = liveData.userProfile;
        history = history || getConversationMemory();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 14000);

            const response = await fetch(cfUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userQuery,
                    history: history.slice(-10),
                    context: {
                        netScore: liveData.netScore,
                        nAcad: liveData.nAcad,
                        nScreen: liveData.nScreen,
                        completedTasksCount: liveData.completedTasksCount,
                        totalTasksCount: liveData.totalTasksCount,
                        longestBreakMins: liveData.longestBreakMins,
                        weight: p.weight,
                        height: p.height,
                        goal: p.goal
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Worker returned HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data && data.response) {
                return `### ⚡ Producto Neural AI *(Cloudflare Workers AI)*

${data.response}

---
*⚡ 100% Free Edge AI · Powered by Meta Llama · Zero API Keys*`;
            } else {
                throw new Error(data.error || "Invalid response format from worker");
            }
        } catch (err) {
            console.warn("[Producto] Cloud AI call failed:", err);
            return `### ⚠️ Cloud Connection Notice

Could not reach Cloudflare AI agent (${err.message}). Please check your internet connection or verify your worker in **Settings ⚙️**!`;
        }
    }

    // --- 7. UNIFIED MATCHER & INTELLIGENT ROUTER ---
    // =========================================================================
    // 🥗 1. HYBRID FOOD & NUTRITION ACTION ENGINE (OFFLINE 0 MS + CLOUD AI)
    // =========================================================================
    const WORD_TO_NUMBER_MAP = {
        "half a": 0.5,
        "half": 0.5,
        "a": 1,
        "an": 1,
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "seven": 7,
        "eight": 8,
        "nine": 9,
        "ten": 10,
        "couple": 2,
        "few": 3
    };

    function parseWordQuantity(rawStr) {
        if (!rawStr) return 1.0;
        const clean = rawStr.trim().toLowerCase();
        if (WORD_TO_NUMBER_MAP.hasOwnProperty(clean)) {
            return WORD_TO_NUMBER_MAP[clean];
        }
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 1.0 : parsed;
    }

    const OFFLINE_FOOD_DATABASE = {
        "egg": { cal: 75, p: 6.5, c: 0.5, f: 5, unit: "egg", isVeg: false },
        "eggs": { cal: 75, p: 6.5, c: 0.5, f: 5, unit: "egg", isVeg: false },
        "boiled egg": { cal: 75, p: 6.5, c: 0.5, f: 5, unit: "egg", isVeg: false },
        "boiled eggs": { cal: 75, p: 6.5, c: 0.5, f: 5, unit: "egg", isVeg: false },
        "omelette": { cal: 155, p: 12, c: 1, f: 11, unit: "serving", isVeg: false },
        "banana": { cal: 105, p: 1.3, c: 27, f: 0.3, unit: "banana", isVeg: true },
        "bananas": { cal: 105, p: 1.3, c: 27, f: 0.3, unit: "banana", isVeg: true },
        "apple": { cal: 95, p: 0.5, c: 25, f: 0.3, unit: "apple", isVeg: true },
        "apples": { cal: 95, p: 0.5, c: 25, f: 0.3, unit: "apple", isVeg: true },
        "chicken breast": { cal: 165, p: 31, c: 0, f: 3.6, unit: "100g", isVeg: false },
        "chicken": { cal: 165, p: 31, c: 0, f: 3.6, unit: "100g", isVeg: false },
        "rice": { cal: 130, p: 2.7, c: 28, f: 0.3, unit: "bowl", isVeg: true },
        "white rice": { cal: 130, p: 2.7, c: 28, f: 0.3, unit: "bowl", isVeg: true },
        "brown rice": { cal: 115, p: 2.5, c: 24, f: 0.8, unit: "bowl", isVeg: true },
        "roti": { cal: 110, p: 3.2, c: 20, f: 1.5, unit: "roti", isVeg: true },
        "rotis": { cal: 110, p: 3.2, c: 20, f: 1.5, unit: "roti", isVeg: true },
        "chapati": { cal: 110, p: 3.2, c: 20, f: 1.5, unit: "roti", isVeg: true },
        "chapatis": { cal: 110, p: 3.2, c: 20, f: 1.5, unit: "roti", isVeg: true },
        "phulka": { cal: 85, p: 2.5, c: 16, f: 1.0, unit: "phulka", isVeg: true },
        "phulkas": { cal: 85, p: 2.5, c: 16, f: 1.0, unit: "phulka", isVeg: true },
        "paratha": { cal: 220, p: 4.5, c: 30, f: 9.0, unit: "paratha", isVeg: true },
        "parathas": { cal: 220, p: 4.5, c: 30, f: 9.0, unit: "paratha", isVeg: true },
        "naan": { cal: 260, p: 8.0, c: 45, f: 5.0, unit: "naan", isVeg: true },
        "dal": { cal: 140, p: 8.5, c: 20, f: 2.5, unit: "bowl", isVeg: true },
        "lentils": { cal: 140, p: 8.5, c: 20, f: 2.5, unit: "bowl", isVeg: true },
        "paneer": { cal: 265, p: 18, c: 4, f: 20, unit: "100g", isVeg: true },
        "paneer bhurji": { cal: 280, p: 19, c: 6, f: 20, unit: "bowl", isVeg: true },
        "sabzi": { cal: 120, p: 3.0, c: 14, f: 6.0, unit: "bowl", isVeg: true },
        "sabji": { cal: 120, p: 3.0, c: 14, f: 6.0, unit: "bowl", isVeg: true },
        "khichdi": { cal: 180, p: 6.0, c: 32, f: 3.5, unit: "bowl", isVeg: true },
        "biryani": { cal: 320, p: 14, c: 38, f: 12, unit: "bowl", isVeg: false },
        "pulao": { cal: 190, p: 4.0, c: 34, f: 4.0, unit: "bowl", isVeg: true },
        "idli": { cal: 65, p: 2.0, c: 12, f: 0.2, unit: "idli", isVeg: true },
        "idlis": { cal: 65, p: 2.0, c: 12, f: 0.2, unit: "idli", isVeg: true },
        "dosa": { cal: 135, p: 3.5, c: 22, f: 3.7, unit: "dosa", isVeg: true },
        "poha": { cal: 180, p: 3.5, c: 32, f: 4.5, unit: "bowl", isVeg: true },
        "upma": { cal: 190, p: 4.0, c: 30, f: 5.5, unit: "bowl", isVeg: true },
        "biscuit": { cal: 65, p: 1.0, c: 9.0, f: 2.8, unit: "biscuit", isVeg: true },
        "biscuits": { cal: 65, p: 1.0, c: 9.0, f: 2.8, unit: "biscuit", isVeg: true },
        "cookie": { cal: 75, p: 1.0, c: 10.0, f: 3.5, unit: "cookie", isVeg: true },
        "cookies": { cal: 75, p: 1.0, c: 10.0, f: 3.5, unit: "cookie", isVeg: true },
        "samosa": { cal: 150, p: 2.5, c: 16.0, f: 8.5, unit: "samosa", isVeg: true },
        "samosas": { cal: 150, p: 2.5, c: 16.0, f: 8.5, unit: "samosa", isVeg: true },
        "sandwich": { cal: 240, p: 7.0, c: 28.0, f: 11.0, unit: "sandwich", isVeg: true },
        "maggi": { cal: 310, p: 7.0, c: 46.0, f: 11.0, unit: "bowl", isVeg: true },
        "noodles": { cal: 220, p: 5.0, c: 40.0, f: 4.0, unit: "bowl", isVeg: true },
        "kheer": { cal: 180, p: 4.0, c: 30.0, f: 5.0, unit: "bowl", isVeg: true },
        "gulab jamun": { cal: 150, p: 2.0, c: 24.0, f: 6.0, unit: "piece", isVeg: true },
        "gulab jamuns": { cal: 150, p: 2.0, c: 24.0, f: 6.0, unit: "piece", isVeg: true },
        "milk": { cal: 125, p: 8, c: 12, f: 5, unit: "glass", isVeg: true },
        "oats": { cal: 150, p: 5, c: 27, f: 2.5, unit: "bowl", isVeg: true },
        "oatmeal": { cal: 150, p: 5, c: 27, f: 2.5, unit: "bowl", isVeg: true },
        "bread": { cal: 80, p: 3, c: 15, f: 1, unit: "slice", isVeg: true },
        "toast": { cal: 80, p: 3, c: 15, f: 1, unit: "slice", isVeg: true },
        "whey": { cal: 130, p: 25, c: 3, f: 1.5, unit: "scoop", isVeg: true },
        "protein shake": { cal: 160, p: 26, c: 5, f: 2, unit: "shake", isVeg: true },
        "peanut butter": { cal: 95, p: 4, c: 3, f: 8, unit: "tbsp", isVeg: true },
        "salad": { cal: 50, p: 1.5, c: 8, f: 1, unit: "bowl", isVeg: true },
        "coffee": { cal: 5, p: 0.2, c: 0.5, f: 0, unit: "cup", isVeg: true },
        "black coffee": { cal: 5, p: 0.2, c: 0.5, f: 0, unit: "cup", isVeg: true },
        "tea": { cal: 50, p: 1.5, c: 8, f: 1.5, unit: "cup", isVeg: true },
        "chai": { cal: 60, p: 2, c: 9, f: 2, unit: "cup", isVeg: true },
        "fish": { cal: 140, p: 22, c: 0, f: 5, unit: "100g", isVeg: false },
        "potato": { cal: 130, p: 3, c: 30, f: 0.2, unit: "potato", isVeg: true },
        "potatoes": { cal: 130, p: 3, c: 30, f: 0.2, unit: "potato", isVeg: true },
        "curd": { cal: 100, p: 6, c: 9, f: 4, unit: "bowl", isVeg: true },
        "yogurt": { cal: 100, p: 6, c: 9, f: 4, unit: "bowl", isVeg: true },
        "dahi": { cal: 100, p: 6, c: 9, f: 4, unit: "bowl", isVeg: true },
        "nuts": { cal: 160, p: 6, c: 6, f: 14, unit: "handful", isVeg: true },
        "almonds": { cal: 160, p: 6, c: 6, f: 14, unit: "handful", isVeg: true },
        "pizza": { cal: 285, p: 12, c: 36, f: 10, unit: "slice", isVeg: true },
        "burger": { cal: 350, p: 16, c: 33, f: 15, unit: "burger", isVeg: false }
    };

    async function estimateAndLogCustomFoodWithCloudAI(rawQuery) {
        const isOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
        if (!isOnline) {
            return `### 🌐 Internet Required for AI Food Estimation\n\n` +
                   `This custom food is not in our offline database. Please connect to the internet to let our **Cloud AI Agent (Meta Llama 3.3)** estimate its macros automatically, or log directly offline:\n\n` +
                   `*💡 Example: "log 140 calories and 4g protein"*`;
        }

        const cfUrl = getCloudflareUrl().trim() || 'https://producto-ai.harshitgupta8088.workers.dev';
        const systemPrompt = `You are a strict nutritional database parser. The user wants to log food: '${rawQuery}'. ` +
                             `Extract the food name and quantity, and estimate the nutritional macros. ` +
                             `Respond with ONLY a single valid JSON object, no explanation, no markdown ticks: ` +
                             `{"food": "<Clean Food Name>", "qty": <number>, "unit": "<unit>", "calories": <number>, "protein": <number>, "carbs": <number>, "fat": <number>, "isVeg": <boolean>}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(cfUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: systemPrompt,
                    history: []
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Cloud server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            let nutrition = null;

            if (data && data.response) {
                if (typeof data.response === 'object' && data.response !== null) {
                    nutrition = data.response;
                } else if (typeof data.response === 'string') {
                    const m = data.response.match(/\{[^{}]*\}/);
                    if (m) {
                        try { nutrition = JSON.parse(m[0]); } catch (e) {}
                    }
                }
            }

            if (!nutrition || typeof nutrition.calories !== 'number') {
                throw new Error("Could not parse nutrition data from AI response");
            }

            const foodName = nutrition.food || "Custom Food";
            const qty = (typeof nutrition.qty === 'number' && nutrition.qty > 0) ? nutrition.qty : 1;
            const calories = Math.round(nutrition.calories);
            const protein = Math.round((nutrition.protein || 0) * 10) / 10;
            const carbs = Math.round(nutrition.carbs || 0);
            const fat = Math.round((nutrition.fat || 0) * 10) / 10;
            const isVeg = nutrition.isVeg !== false;

            // Commit to localStorage
            let existingLog = [];
            try {
                const raw = localStorage.getItem('productometer_daily_diet_log');
                if (raw) existingLog = JSON.parse(raw);
            } catch (e) {}

            const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            existingLog.push({
                id: 'diet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: foodName,
                qty: qty,
                unit: nutrition.unit || 'servings',
                calories: calories,
                protein: protein,
                carbs: carbs,
                fat: fat,
                isVeg: isVeg,
                timestamp: nowTimeStr,
                source: 'cloud_ai'
            });

            try {
                localStorage.setItem('productometer_daily_diet_log', JSON.stringify(existingLog));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('storage'));
                }
            } catch (e) {}

            return `### 🥗 Custom Food Logged via Cloud AI!\n\n` +
                   `• **${qty > 1 ? qty + 'x ' : ''}${foodName}**: +${calories} kcal · ${protein}g protein · ${carbs}g carbs · ${fat}g fat *(AI Nutritional Estimate)*\n\n` +
                   `---\n` +
                   `🔥 **Total Added**: **+${calories} kcal** · 🥩 **+${protein}g Protein** · 🍚 **+${carbs}g Carbs** · 🧈 **+${fat}g Fat**\n` +
                   `*📊 Synced to your Health Tracker daily calories & macros in real-time!*`;
        } catch (err) {
            console.warn("[Producto] Cloud AI food estimation failed:", err);
            return `### ⚠️ Cloud Nutrition Notice\n\n` +
                   `Could not estimate nutrition for this item right now (${err.message}).\n\n` +
                   `💡 *You can log directly offline anytime: "log 140 calories and 4g protein"!*`;
        }
    }

    function parseAndExecuteDietAction(rawQuery) {
        const q = rawQuery.toLowerCase();

        // Check if user has diet logging intent (handles phrases like "adding two rotis two my diet", "add 2 biscuits to diet", etc.)
        const hasFoodAction = /\b(?:ate|eat|eating|had|have|having|drank|drink|drinking|log|logging|logged|add|adding|added|consume|consumed|consuming|track|record)\b/i.test(q);
        const hasDietTarget = /\b(?:to|two|too|in|into)\s+(?:my\s+)?diet\b|\b(?:in|into|to|two)\s+(?:health\s+tracker|food\s+log|diet\s+tracker|tracker)\b/i.test(q);
        const hasMealTime = /\bfor\s+(?:breakfast|lunch|dinner|snack|supper|brunch|dessert)\b/i.test(q);
        const hasMacroWords = /\b(?:calories?|cals?|kcal|protein|carbs?|fats?)\b/i.test(q);
        const foodKeys = Object.keys(OFFLINE_FOOD_DATABASE).sort((a, b) => b.length - a.length);
        const mentionsAnyFood = foodKeys.some(f => new RegExp('\\b' + f + '\\b', 'i').test(q));
        const hasQtyWord = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|couple|few|half|\d+)\b/i.test(q);

        const isDietIntent = hasDietTarget || hasMealTime || hasMacroWords || (hasFoodAction && mentionsAnyFood) || (mentionsAnyFood && hasQtyWord) || (hasFoodAction && hasDietTarget);
        if (!isDietIntent) return null;

        // Skip pure informational questions unless an explicit food action was given
        const isInfoQuestion = /^(?:what|how\s+many|how\s+much|why|can\s+i|should\s+i|is\s+there)\b/i.test(q) && !hasDietTarget && !hasFoodAction;
        if (isInfoQuestion) return null;
        if (q.includes("what should i eat") || q.includes("which diet") || q.includes("how much protein do i need") || q.includes("how many calories left")) {
            return null;
        }

        // Direct numeric calories/protein entry: e.g. "log 450 calories and 35g protein"
        const mCal = q.match(/(\d{2,4})\s*(?:cal|cals|calories|kcal)/i);
        const mPro = q.match(/(\d{1,3})\s*(?:g|gm|grams)?\s*(?:pro|protein)/i);

        let itemsToAdd = [];

        if (mCal) {
            const cal = parseInt(mCal[1], 10);
            const pro = mPro ? parseInt(mPro[1], 10) : Math.round(cal * 0.05);
            itemsToAdd.push({
                name: "Custom Logged Meal",
                qty: 1,
                calories: cal,
                protein: pro,
                carbs: Math.round(cal * 0.1),
                fat: Math.round(cal * 0.03),
                isVeg: true
            });
        } else {
            // Food dictionary lookup with support for number words ('two', 'one', 'three', etc.)
            const numWords = 'half\\s+a|half|one|two|three|four|five|six|seven|eight|nine|ten|couple|few|a|an|\\d+(?:\\.\\d+)?';
            const units = 'g|gm|grams|pcs|pieces|bowls?|cups?|scoops?|slices?|servings?|plates?|glasses?';
            const matchedRanges = [];

            for (const f of foodKeys) {
                const pat = new RegExp('(?:(?:(' + numWords + ')\\s*(?:' + units + ')?\\s*(?:of\\s+)?)|(?:a\\s+))?\\b' + f + '\\b', 'gi');
                let match;
                while ((match = pat.exec(q)) !== null) {
                    const start = match.index;
                    const end = pat.lastIndex;
                    if (matchedRanges.some(r => (start >= r[0] && start < r[1]) || (end > r[0] && end <= r[1]))) {
                        continue;
                    }
                    matchedRanges.push([start, end]);
                    let rawQty = parseWordQuantity(match[1]);
                    const info = OFFLINE_FOOD_DATABASE[f];

                    // If unit is 100g and user entered >= 10, scale by 100 (e.g. 200g chicken = 2.0 portions)
                    if (info.unit === "100g" && rawQty >= 10) {
                        rawQty = rawQty / 100.0;
                    }

                    const calcCal = Math.round(info.cal * rawQty);
                    const calcPro = Math.round(info.p * rawQty * 10) / 10;
                    const calcCarb = Math.round(info.c * rawQty);
                    const calcFat = Math.round(info.f * rawQty * 10) / 10;

                    let displayName = f.charAt(0).toUpperCase() + f.slice(1);
                    if (rawQty > 1 && !displayName.endsWith('s')) {
                        displayName += 's';
                    }

                    itemsToAdd.push({
                        name: displayName,
                        qty: rawQty,
                        calories: calcCal,
                        protein: calcPro,
                        carbs: calcCarb,
                        fat: calcFat,
                        isVeg: info.isVeg
                    });
                }
            }
        }

        // If no offline food matched, but user explicitly asked to log food, consult Cloud AI!
        if (itemsToAdd.length === 0) {
            const isExplicitDietCommand = hasDietTarget || hasFoodAction || hasMealTime;
            if (isExplicitDietCommand) {
                return estimateAndLogCustomFoodWithCloudAI(rawQuery);
            }
            return null;
        }

        // Execute save to localStorage
        let existingLog = [];
        try {
            const raw = localStorage.getItem('productometer_daily_diet_log');
            if (raw) existingLog = JSON.parse(raw);
        } catch (e) {}

        const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        itemsToAdd.forEach(item => {
            existingLog.push({
                id: 'diet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: item.name,
                qty: item.qty,
                unit: 'servings',
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
                isVeg: item.isVeg,
                timestamp: nowTimeStr
            });
        });

        try {
            localStorage.setItem('productometer_daily_diet_log', JSON.stringify(existingLog));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        } catch (e) {}

        const totCal = itemsToAdd.reduce((sum, i) => sum + i.calories, 0);
        const totPro = Math.round(itemsToAdd.reduce((sum, i) => sum + i.protein, 0) * 10) / 10;
        const totCarb = Math.round(itemsToAdd.reduce((sum, i) => sum + i.carbs, 0));

        let breakdownList = itemsToAdd.map(i => `• **${i.qty > 1 ? i.qty + 'x ' : ''}${i.name}**: +${i.calories} kcal · ${i.protein}g protein · ${i.carbs}g carbs`).join('\n');

        return `### 🥗 Food Logged to Health Tracker!\n\n` +
               `${breakdownList}\n\n` +
               `---\n` +
               `🔥 **Total Added**: **+${totCal} kcal** · 🥩 **+${totPro}g Protein** · 🍚 **+${totCarb}g Carbs**\n` +
               `*📊 Your Health Tracker daily calories & macros are now updated in real-time!*`;
    }

    // =========================================================================
    // 📅 2. OFFLINE DAY PLANNER SCHEDULER & RESCHEDULER
    // =========================================================================
    // --- CONVERSATIONAL MEMORY & CONTEXT (LAST 5 PROMPTS) ---
    const CHAT_MEMORY_KEY = 'producto_coach_memory_v1';

    function getConversationMemory() {
        try {
            if (typeof localStorage === 'undefined') return [];
            const raw = localStorage.getItem(CHAT_MEMORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveConversationMemory(memory) {
        try {
            if (typeof localStorage === 'undefined') return;
            const trimmed = memory.slice(-10);
            localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(trimmed));
        } catch (e) {}
    }

    function recordUserPromptInMemory(userQuery) {
        try {
            if (typeof localStorage === 'undefined') return;
            let mem = getConversationMemory();
            mem.push({ role: 'user', content: userQuery, timestamp: Date.now() });
            saveConversationMemory(mem);
        } catch (e) {}
    }

    function recordBotReplyInMemory(botReply) {
        try {
            if (typeof localStorage === 'undefined' || !botReply || typeof botReply !== 'string') return;
            let mem = getConversationMemory();
            if (mem.length > 0 && mem[mem.length - 1].role === 'user') {
                mem.push({ role: 'assistant', content: botReply, timestamp: Date.now() });
                saveConversationMemory(mem);
            }
        } catch (e) {}
    }

    function analyzeRecentMemory(history) {
        history = history || getConversationMemory();
        const userTurns = history.filter(m => m.role === 'user').slice(-5);

        let lastSubject = null;
        let lastCategory = null;
        let lastTaskTitle = null;

        // 1. Scan user turns from newest to oldest
        for (let i = userTurns.length - 1; i >= 0; i--) {
            const text = userTurns[i].content;

            // Detect subject
            const mSubj = text.match(/\b(chemistry|physics|math|mathematics|calculus|algebra|biology|history|geography|english|literature|economics|computer\s+science|coding|programming|python|javascript|dsa|organic\s+chem)\b/i);
            if (mSubj && !lastSubject) {
                lastSubject = mSubj[1].toUpperCase();
                lastCategory = 'academics';
            }

            // Detect fitness / health
            const mFit = text.match(/\b(gym|workout|running|run|cardio|pushups|yoga|swimming|cycling|chest\s+day|leg\s+day|exercise|fitness)\b/i);
            if (mFit && !lastSubject) {
                lastSubject = mFit[1].toUpperCase();
                lastCategory = 'health';
            }

            // Category detection
            if (/academic|study|revision|homework|assignment|class/i.test(text) && !lastCategory) {
                lastCategory = 'academics';
            } else if (/health|fitness|gym|workout|exercise/i.test(text) && !lastCategory) {
                lastCategory = 'health';
            } else if (/skill|design|guitar|language/i.test(text) && !lastCategory) {
                lastCategory = 'skills';
            }
        }

        // 2. Scan assistant replies in memory to check if a task was recently scheduled/rescheduled
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'assistant') {
                const c = history[i].content || '';
                const mTitle = c.match(/\*\*Title\*\*:\s*`([^`]+)`/i) || c.match(/\*\*Task\*\*:\s*\*\*([^\*]+)\*\*/i);
                if (mTitle) {
                    lastTaskTitle = mTitle[1].trim();
                    break;
                }
            }
        }

        // 3. Fallback to latest planner task in localStorage today
        let latestPlannerTask = null;
        try {
            const todayKey = getTodayDateKey();
            const raw = localStorage.getItem('productometer_planner_tasks_' + todayKey) || localStorage.getItem('productometer_chrono_planner_list');
            if (raw) {
                const tasks = JSON.parse(raw);
                if (tasks.length > 0) {
                    latestPlannerTask = tasks[tasks.length - 1];
                    if (!lastTaskTitle) {
                        lastTaskTitle = latestPlannerTask.title;
                    }
                }
            }
        } catch (e) {}

        let wasLastPromptScheduling = false;
        if (userTurns.length >= 2) {
            const prevPrompt = userTurns[userTurns.length - 2].content;
            wasLastPromptScheduling = /(?:schedule|reschedule|add|plan|book|move|shift|task|session)/i.test(prevPrompt);
        } else if (userTurns.length === 1) {
            wasLastPromptScheduling = /(?:schedule|reschedule|add|plan|book|move|shift|task|session)/i.test(userTurns[0].content);
        }

        return {
            lastSubject: lastSubject,
            lastCategory: lastCategory,
            lastTaskTitle: lastTaskTitle,
            latestPlannerTask: latestPlannerTask,
            recentUserPrompts: userTurns.map(m => m.content),
            wasLastPromptScheduling: wasLastPromptScheduling
        };
    }

    // --- TIME & DURATION PARSING UTILITIES ---
    function parseDurationInMinutes(text) {
        if (!text) return null;
        const t = text.toLowerCase();
        if (t.includes("half an hour") || t.includes("half hour")) return 30;
        if (t.includes("one and a half hour") || t.includes("1.5 hour") || t.includes("1.5 hr") || t.includes("1.5h")) return 90;
        if (t.includes("an hour") || t.includes("1 hour") || t.includes("1 hr") || t.includes("1h")) return 60;
        const m = t.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
        if (m) {
            const val = parseFloat(m[1]);
            const unit = m[2].toLowerCase();
            if (unit.startsWith('h')) {
                return Math.round(val * 60);
            } else {
                return Math.round(val);
            }
        }
        return null;
    }

    function parseTimeToMinutes(str) {
        if (!str) return null;
        str = str.trim().toLowerCase();

        // Natural phrases: "half past 6", "quarter past 4", "quarter to 5"
        const mHalf = str.match(/half\s+past\s+(\d{1,2})\s*(am|pm)?/i);
        if (mHalf) {
            let h = parseInt(mHalf[1], 10);
            const ampm = mHalf[2];
            if (ampm === 'pm' && h < 12) h += 12;
            else if (ampm === 'am' && h === 12) h = 0;
            else if (!ampm && h <= 6) h += 12;
            return h * 60 + 30;
        }
        const mQtrPast = str.match(/quarter\s+past\s+(\d{1,2})\s*(am|pm)?/i);
        if (mQtrPast) {
            let h = parseInt(mQtrPast[1], 10);
            const ampm = mQtrPast[2];
            if (ampm === 'pm' && h < 12) h += 12;
            else if (ampm === 'am' && h === 12) h = 0;
            else if (!ampm && h <= 6) h += 12;
            return h * 60 + 15;
        }
        const mQtrTo = str.match(/quarter\s+to\s+(\d{1,2})\s*(am|pm)?/i);
        if (mQtrTo) {
            let h = parseInt(mQtrTo[1], 10) - 1;
            const ampm = mQtrTo[2];
            if (ampm === 'pm' && h < 12) h += 12;
            else if (ampm === 'am' && h === 12) h = 0;
            else if (!ampm && h <= 6) h += 12;
            return h * 60 + 45;
        }

        // 4-digit military time e.g. "1830", "1600", "0900"
        const mMilitary = str.match(/^(\d{2})(\d{2})$/);
        if (mMilitary) {
            const h = parseInt(mMilitary[1], 10);
            const mins = parseInt(mMilitary[2], 10);
            if (h >= 0 && h < 24 && mins >= 0 && mins < 60) {
                return h * 60 + mins;
            }
        }

        // Standard time: "18:30", "18 30", "18.30", "6 30 pm", "6:30 pm", "18", "6 pm"
        const m = str.match(/(\d{1,2})(?:[:.\s]+(\d{2}))?\s*(am|pm)?/i);
        if (!m) return null;

        let h = parseInt(m[1], 10);
        const mins = m[2] ? parseInt(m[2], 10) : 0;
        const ampm = m[3] ? m[3].toLowerCase() : null;

        if (ampm === 'pm' && h < 12) {
            h += 12;
        } else if (ampm === 'am' && h === 12) {
            h = 0;
        } else if (!ampm) {
            if (h >= 1 && h <= 6) {
                h += 12;
            }
        }

        if (h >= 0 && h < 24 && mins >= 0 && mins < 60) {
            return h * 60 + mins;
        }
        return null;
    }

    function formatMinutesToTime(totalMins) {
        let h = Math.floor(totalMins / 60) % 24;
        let m = totalMins % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        let displayH = h % 12;
        if (displayH === 0) displayH = 12;
        const militaryH = String(h).padStart(2, '0');
        const militaryM = String(m).padStart(2, '0');
        return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm} (${militaryH}:${militaryM})`;
    }

    function getTodayDateKey() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function parseAndExecuteScheduleAction(rawQuery, memoryContext) {
        const q = rawQuery.trim();
        memoryContext = memoryContext || analyzeRecentMemory();

        const isScheduleIntent = /(?:\bschedule\b|\badd\b|\bcreate\b|\bplan\b|\bbook\b|\bset\b)/i.test(q) &&
            (/(?:from\s+[0-9]|at\s+[0-9]|for\s+[0-9]+\s*(?:min|hour|h|hr))/i.test(q) || /(?:task|session|workout|gym|study|class|meeting|revision|deep\s+work)/i.test(q));
        if (!isScheduleIntent) return null;

        if (/how\s+(?:do|to|can)\s+(?:i\s+)?schedule/i.test(q)) return null;

        // 1. Explicit Category Extraction ("under skills section", "in health category", etc.)
        let explicitCategory = null;
        let explicitColor = null;
        const mCat = q.match(/(?:under|in|into|category(?:\s+is)?|section(?:\s+is)?)\s+(academics?|skills?|health|fitness|other)\b/i);
        if (mCat) {
            const rc = mCat[1].toLowerCase();
            if (rc.startsWith('skill')) { explicitCategory = 'skills'; explicitColor = '#ffb300'; }
            else if (rc.startsWith('health') || rc.startsWith('fit')) { explicitCategory = 'health'; explicitColor = '#00e676'; }
            else if (rc.startsWith('acad')) { explicitCategory = 'academics'; explicitColor = '#00e5ff'; }
            else if (rc.startsWith('other')) { explicitCategory = 'other'; explicitColor = '#d500f9'; }
        }

        // 2. Explicit Comment / Note Extraction (with comment "Python", comment: "Python", etc.)
        let explicitComment = null;
        const mComment = q.match(/(?:with\s+comment|comment|with\s+note|note|named|titled|title)\s+["']?([^"']+)["']?(?:\s+(?:under|in|at|from|$))/i) ||
                         q.match(/["']([^"']+)["']/);
        if (mComment) {
            explicitComment = mComment[1].trim();
        }

        let taskTitle = "";
        let startMin = null;
        let durationMin = 60;

        const TIME_REGEX = '(?:[0-9]{4}|[0-9]{1,2}(?:[:.\\s][0-9]{2})?\\s*(?:am|pm)?)';

        // Pattern A: [intent] [task] from [start] to [end]
        const mFromTo = q.match(new RegExp('(?:schedule|add|create|plan|book|set)(?:\\s+(?:a\\s+|an\\s+|my\\s+|task\\s+|session\\s+))?\\s*(.*?)\\s+from\\s+(' + TIME_REGEX + ')\\s+to\\s+(' + TIME_REGEX + ')', 'i'));
        if (mFromTo) {
            taskTitle = mFromTo[1].replace(/^(?:a\s+|an\s+|my\s+|task\s+|session\s+)/i, '').trim();
            startMin = parseTimeToMinutes(mFromTo[2]);
            const endMin = parseTimeToMinutes(mFromTo[3]);
            if (startMin !== null && endMin !== null) {
                durationMin = endMin > startMin ? (endMin - startMin) : 60;
            }
        } else {
            // Pattern B: [intent] [task] at [start] (for [X] mins/hours)?
            const mAt = q.match(new RegExp('(?:schedule|add|create|plan|book|set)(?:\\s+(?:a\\s+|an\\s+|my\\s+|task\\s+|session\\s+))?\\s*(.*?)\\s+at\\s+(' + TIME_REGEX + ')(?:.*?(?:and\\s+)?(?:for\\s+duration\\s+|for\\s+|duration\\s+)?(\\d+(?:\\.\\d+)?\\s*(?:hours?|hrs?|h|minutes?|mins?|m)?))?', 'i'));
            if (mAt) {
                taskTitle = mAt[1].replace(/^(?:a\s+|an\s+|my\s+|task\s+|session\s+)/i, '').trim();
                startMin = parseTimeToMinutes(mAt[2]);
                if (mAt[3]) {
                    const parsedDur = parseDurationInMinutes(mAt[3]);
                    if (parsedDur) durationMin = parsedDur;
                }
            }
        }

        if (startMin === null) return null;

        // Clean taskTitle using conversational memory and comment
        let cleanTitle = taskTitle.replace(/^(?:a\s+|an\s+|my\s+|the\s+)/i, '').trim();

        let category = explicitCategory || 'academics';
        let color = explicitColor || '#00e5ff';

        const isGenericTitle = !cleanTitle ||
            cleanTitle.toLowerCase() === 'task' ||
            cleanTitle.toLowerCase() === 'session' ||
            cleanTitle.toLowerCase() === 'a session' ||
            cleanTitle.toLowerCase() === 'a task' ||
            cleanTitle.toLowerCase() === 'it' ||
            cleanTitle.toLowerCase() === 'an academics task' ||
            cleanTitle.toLowerCase() === 'academics task' ||
            cleanTitle.toLowerCase() === 'academic task' ||
            cleanTitle.toLowerCase() === 'study task' ||
            cleanTitle.toLowerCase() === 'study session';

        if (explicitComment) {
            cleanTitle = explicitComment;
        } else if (isGenericTitle) {
            if (explicitCategory === 'skills') {
                cleanTitle = "SKILLS PRACTICE";
            } else if (explicitCategory === 'health') {
                cleanTitle = "HEALTH WORKOUT";
            } else if (explicitCategory === 'other') {
                cleanTitle = "PRODUCTIVITY SESSION";
            } else if (memoryContext && memoryContext.lastSubject) {
                cleanTitle = `${memoryContext.lastSubject} REVISION`;
                category = memoryContext.lastCategory || 'academics';
            } else if (cleanTitle.toLowerCase().includes('academic')) {
                cleanTitle = "ACADEMICS STUDY SESSION";
                category = 'academics';
            } else if (cleanTitle.toLowerCase().includes('study')) {
                cleanTitle = "DEEP STUDY SESSION";
                category = 'academics';
            } else {
                cleanTitle = "FOCUS SESSION";
            }
        } else if (!explicitCategory) {
            const tLower = cleanTitle.toLowerCase();
            if (/(?:gym|workout|run|running|cardio|walk|exercise|yoga|stretch|fitness)/i.test(tLower)) {
                category = 'health';
                color = '#00e676';
            } else if (/(?:read|reading|book|skill|code|coding|design|practice|guitar|music|language|python|javascript)/i.test(tLower)) {
                category = 'skills';
                color = '#ffb300';
            } else if (/(?:break|lunch|dinner|nap|meditate|relax)/i.test(tLower)) {
                category = 'other';
                color = '#d500f9';
            }
        }

        if (category === 'health') color = '#00e676';
        else if (category === 'skills') color = '#ffb300';
        else if (category === 'other') color = '#d500f9';
        else color = '#00e5ff';

        const formattedTime = `${formatMinutesToTime(startMin)} - ${formatMinutesToTime(startMin + durationMin)}`;
        const todayKey = getTodayDateKey();
        const storageKey = 'productometer_planner_tasks_' + todayKey;

        let tasks = [];
        try {
            const raw = localStorage.getItem(storageKey) || localStorage.getItem('productometer_chrono_planner_list');
            if (raw) tasks = JSON.parse(raw);
        } catch (e) {}

        const newTask = {
            id: 'task_' + Date.now(),
            title: cleanTitle.toUpperCase(),
            category: category,
            startMin: startMin,
            durationMin: durationMin,
            durationMinutes: durationMin,
            timeDisplayStr: formattedTime,
            time: formattedTime,
            color: color,
            comment: explicitComment || undefined,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        tasks.sort((a, b) => (a.startMin || 0) - (b.startMin || 0));

        try {
            localStorage.setItem(storageKey, JSON.stringify(tasks));
            localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(tasks));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        } catch (e) {
            console.error("[Producto Coach] Error saving task:", e);
        }

        let reply = `### 🗓️ Task Scheduled Successfully!\n\n` +
                    `• **Title**: \`${newTask.title}\`\n` +
                    `• **Category**: ${category.toUpperCase()} (${color})\n` +
                    `• **Time Window**: \`${formattedTime}\`\n` +
                    `• **Duration**: **${durationMin} minutes** (${(durationMin / 60).toFixed(1).replace('.0', '')} hr)\n`;
        if (explicitComment) {
            reply += `• **Comment**: "${explicitComment}"\n`;
        }
        reply += `\n✅ Synced to your **Day Planner** and 24h timeline. Tap the circle on your timeline to mark it complete for **+50 bonus score**!`;
        return reply;
    }

    function parseAndExecuteRescheduleAction(rawQuery, memoryContext) {
        const q = rawQuery.trim();
        memoryContext = memoryContext || analyzeRecentMemory();

        const isExplicitResched = /(?:\breschedule\b|\bmove\s+task\b|\bmove\b|\bshift\b|\bpush\b|\bpostpone\b|\bchange\s+duration\b|\bmake\s+it\b|\bextend\b|\bchange\s+time\b|\bchange\s+to\b)/i.test(q);
        
        // Follow-up prompt detection: if previous turn in memory was a schedule or reschedule,
        // and current prompt is just duration or just time:
        const isFollowupDuration = memoryContext.wasLastPromptScheduling && /^(?:and\s+)?(?:for\s+)?\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)$/i.test(q);
        const isFollowupTime = memoryContext.wasLastPromptScheduling && /^(?:and\s+)?(?:to\s+|at\s+)?[0-9]{1,2}(?:[:.\s][0-9]{2})?\s*(?:am|pm)?$/i.test(q);

        if (!isExplicitResched && !isFollowupDuration && !isFollowupTime) return null;

        const TIME_REGEX = '(?:[0-9]{4}|[0-9]{1,2}(?:[:.\\s][0-9]{2})?\\s*(?:am|pm)?)';

        let targetTitle = "";
        let newStartMin = null;
        let newDurationMin = null;

        if (isFollowupDuration) {
            newDurationMin = parseDurationInMinutes(q);
        } else if (isFollowupTime) {
            newStartMin = parseTimeToMinutes(q);
        } else {
            // Pattern 1: reschedule [task/it]? to [time] (and)? (for [duration])?
            const mReschedTo = q.match(new RegExp('(?:reschedule|move|shift|push|postpone|change\\s+to)(?:\\s+(?:my\\s+|task\\s+|session\\s+))?\\s*(.*?)\\s+to\\s+(' + TIME_REGEX + ')(?:.*?(?:and\\s+)?(?:for\\s+duration\\s+|for\\s+|duration\\s+)?(\\d+(?:\\.\\d+)?\\s*(?:hours?|hrs?|h|minutes?|mins?|m)?))?', 'i'));
            
            // Pattern 2: reschedule [task/it]? (and)? for [duration] (without 'to [time]')
            const mReschedForOnly = q.match(new RegExp('(?:reschedule|change\\s+duration|make\\s+it|extend|shorten|set\\s+duration)(?:\\s+(?:my\\s+|task\\s+|session\\s+))?\\s*(.*?)\\s+(?:and\\s+)?(?:for\\s+duration\\s+|for\\s+|to\\s+duration\\s+|to\\s+)?(\\d+(?:\\.\\d+)?\\s*(?:hours?|hrs?|h|minutes?|mins?|m))\\b', 'i'));

            if (mReschedTo) {
                targetTitle = (mReschedTo[1] || '').trim().toLowerCase();
                newStartMin = parseTimeToMinutes(mReschedTo[2]);
                if (mReschedTo[3]) {
                    newDurationMin = parseDurationInMinutes(mReschedTo[3]);
                }
            } else if (mReschedForOnly) {
                targetTitle = (mReschedForOnly[1] || '').trim().toLowerCase();
                newDurationMin = parseDurationInMinutes(mReschedForOnly[2]);
            } else {
                const mMove = q.match(new RegExp('(?:move|shift|push)\\s+(.*?)\\s+to\\s+(' + TIME_REGEX + ')', 'i'));
                if (mMove) {
                    targetTitle = (mMove[1] || '').trim().toLowerCase();
                    newStartMin = parseTimeToMinutes(mMove[2]);
                } else {
                    return null;
                }
            }
        }

        if (newStartMin === null && newDurationMin === null) return null;

        const todayKey = getTodayDateKey();
        const storageKey = 'productometer_planner_tasks_' + todayKey;

        let tasks = [];
        try {
            const raw = localStorage.getItem(storageKey) || localStorage.getItem('productometer_chrono_planner_list');
            if (raw) tasks = JSON.parse(raw);
        } catch (e) {}

        if (tasks.length === 0) {
            return `### ⚠️ No Tasks Found Today\n\nCould not find any scheduled sessions for today to reschedule. Say *\"Schedule a session at 18:00\" to create one!`;
        }

        // Clean targetTitle
        targetTitle = targetTitle.replace(/^(?:a\s+|an\s+|my\s+|the\s+)/i, '').trim();

        // Resolve Target Task using Memory Context:
        let foundTask = null;
        const isGenericOrPronoun = !targetTitle || 
            targetTitle === 'it' || 
            targetTitle === 'task' || 
            targetTitle === 'session' || 
            targetTitle === 'that' ||
            targetTitle === 'to' || 
            targetTitle.includes('academic') || 
            targetTitle.includes('study');

        if (isGenericOrPronoun) {
            // If user mentioned academic, prioritize academic tasks
            if (targetTitle.includes('academic') || targetTitle.includes('study')) {
                foundTask = tasks.slice().reverse().find(t => (t.category === 'academics') || (t.title && (t.title.toLowerCase().includes('academic') || t.title.toLowerCase().includes('study'))));
            }
            // If memory has lastTaskTitle, check if it exists in tasks
            if (!foundTask && memoryContext && memoryContext.lastTaskTitle) {
                foundTask = tasks.slice().reverse().find(t => (t.title || '').toLowerCase() === memoryContext.lastTaskTitle.toLowerCase());
            }
            // Fallback: pick the latest task in planner
            if (!foundTask) {
                foundTask = tasks[tasks.length - 1];
            }
        } else {
            // Search by exact/partial title
            for (const t of tasks) {
                const tTitle = (t.title || '').toLowerCase();
                if (tTitle.includes(targetTitle) || targetTitle.includes(tTitle)) {
                    foundTask = t;
                    break;
                }
            }
            // Check memory for lastSubject
            if (!foundTask && memoryContext && memoryContext.lastSubject) {
                const subj = memoryContext.lastSubject.toLowerCase();
                foundTask = tasks.slice().reverse().find(t => (t.title || '').toLowerCase().includes(subj));
            }
            // Fallback: pick the latest task
            if (!foundTask) {
                foundTask = tasks[tasks.length - 1];
            }
        }

        if (!foundTask) {
            return `### ⚠️ Task Not Found\n\nCould not find a task on today's schedule.\n\n💡 **Your current tasks today:**\n` +
                   tasks.map(t => `• ${t.title} (\`${t.timeDisplayStr || t.time}\`)`).join('\n');
        }

        // Apply new start time (or keep existing)
        if (newStartMin !== null) {
            foundTask.startMin = newStartMin;
        }

        // Apply new duration (or keep existing)
        const finalDuration = (newDurationMin !== null) ? newDurationMin : (foundTask.durationMin || foundTask.durationMinutes || 60);
        foundTask.durationMin = finalDuration;
        foundTask.durationMinutes = finalDuration;

        const finalStart = foundTask.startMin || 0;
        const newFormattedTime = `${formatMinutesToTime(finalStart)} - ${formatMinutesToTime(finalStart + finalDuration)}`;
        foundTask.timeDisplayStr = newFormattedTime;
        foundTask.time = newFormattedTime;

        tasks.sort((a, b) => (a.startMin || 0) - (b.startMin || 0));

        try {
            localStorage.setItem(storageKey, JSON.stringify(tasks));
            localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(tasks));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        } catch (e) {
            console.error("[Producto Coach] Error saving rescheduled task:", e);
        }

        return `### 🔄 Task Rescheduled!\n\n` +
               `• **Task**: **${foundTask.title}**\n` +
               `• **New Time Window**: \`${newFormattedTime}\`\n` +
               `• **Duration**: **${finalDuration} minutes** (${(finalDuration / 60).toFixed(1).replace('.0', '')} hr)\n` +
               `• **Category**: ${(foundTask.category || 'ACADEMICS').toUpperCase()}\n\n` +
               `✅ Successfully synchronized to your 24-hour timeline and Day Planner!`;
    }

    function parseAndExecuteCategoryChangeAction(rawQuery, memoryContext) {
        const q = rawQuery.trim();
        memoryContext = memoryContext || analyzeRecentMemory();

        // Check if query is asking to change or set category:
        // e.g. "schedule it under skills", "move it under skills", "change category to skills", "put it under skills", "make it skills", "under skills section"
        const isCategoryChangeIntent = /(?:(?:schedule|reschedule|move|put|shift|change|set|categorize|make)(?:\s+(?:it|that|task|session|my\s+task))?\s*(?:under|in|into|to|as)?\s+(?:the\s+)?(academics?|skills?|health|fitness|other)(?:\s+(?:category|section))?|(?:change|set)\s+(?:the\s+)?category\s+(?:of\s+it\s+)?(?:to|as|under)\s+(academics?|skills?|health|fitness|other)|^(?:under|in)\s+(academics?|skills?|health|fitness|other)(?:\s+(?:category|section))?$)/i;

        const m = q.match(isCategoryChangeIntent);
        if (!m) return null;

        const rawCat = (m[1] || m[2] || m[3] || '').toLowerCase();
        let newCategory = 'skills';
        let newColor = '#ffb300';

        if (rawCat.startsWith('skill')) {
            newCategory = 'skills';
            newColor = '#ffb300';
        } else if (rawCat.startsWith('health') || rawCat.startsWith('fit')) {
            newCategory = 'health';
            newColor = '#00e676';
        } else if (rawCat.startsWith('acad')) {
            newCategory = 'academics';
            newColor = '#00e5ff';
        } else if (rawCat.startsWith('other')) {
            newCategory = 'other';
            newColor = '#d500f9';
        }

        const todayKey = getTodayDateKey();
        const storageKey = 'productometer_planner_tasks_' + todayKey;

        let tasks = [];
        try {
            const raw = localStorage.getItem(storageKey) || localStorage.getItem('productometer_chrono_planner_list');
            if (raw) tasks = JSON.parse(raw);
        } catch (e) {}

        if (tasks.length === 0) {
            return `### ⚠️ No Tasks Found Today\n\nCould not find any scheduled sessions for today to recategorize. Say *\"Schedule a session at 8 PM under ${newCategory}\"* to create one!`;
        }

        // Target the most recently added or discussed task
        let targetTask = tasks[tasks.length - 1];
        if (memoryContext && memoryContext.lastTaskTitle) {
            const matching = tasks.slice().reverse().find(t => (t.title || '').toLowerCase() === memoryContext.lastTaskTitle.toLowerCase());
            if (matching) targetTask = matching;
        }

        targetTask.category = newCategory;
        targetTask.color = newColor;

        try {
            localStorage.setItem(storageKey, JSON.stringify(tasks));
            localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(tasks));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        } catch (e) {
            console.error("[Producto Coach] Error saving recategorized task:", e);
        }

        return `### 🗂️ Task Category Updated!\n\n` +
               `• **Task**: **${targetTask.title}**\n` +
               `• **New Category**: **${newCategory.toUpperCase()}** (${newColor})\n` +
               `• **Time Window**: \`${targetTask.timeDisplayStr || targetTask.time}\`\n` +
               `• **Duration**: **${targetTask.durationMin || 60} minutes**\n\n` +
               `✅ Successfully moved under the **${newCategory.toUpperCase()}** section on your Day Planner and timeline!`;
    }

    function findBestMatch(userQuery, mode, customHistory) {
        mode = mode || (typeof localStorage !== 'undefined' ? (localStorage.getItem('producto_coach_query_mode') || 'auto') : 'auto');
        recordUserPromptInMemory(userQuery);
        const liveData = extractLiveMetrics();
        const memoryContext = analyzeRecentMemory(customHistory);

        // 0. Check Category Change Action (e.g. "schedule it under skills", "move under skills")
        const catChangeReply = parseAndExecuteCategoryChangeAction(userQuery, memoryContext);
        if (catChangeReply) {
            recordBotReplyInMemory(catChangeReply);
            return catChangeReply;
        }

        // 1. Check Diet Logging Action (0 ms Offline Local or Cloud AI Custom Food)
        const dietActionReply = parseAndExecuteDietAction(userQuery);
        if (dietActionReply) {
            if (dietActionReply && typeof dietActionReply.then === 'function') {
                dietActionReply.then(r => recordBotReplyInMemory(r)).catch(() => {});
                return dietActionReply;
            }
            recordBotReplyInMemory(dietActionReply);
            return dietActionReply;
        }

        // 2. Check Task Rescheduling Action (0 ms, 100% Offline)
        const rescheduleReply = parseAndExecuteRescheduleAction(userQuery, memoryContext);
        if (rescheduleReply) {
            recordBotReplyInMemory(rescheduleReply);
            return rescheduleReply;
        }

        // 3. Check Task Scheduling Action (0 ms, 100% Offline)
        const scheduleReply = parseAndExecuteScheduleAction(userQuery, memoryContext);
        if (scheduleReply) {
            recordBotReplyInMemory(scheduleReply);
            return scheduleReply;
        }

        // 4. Check Conversational Biometrics Update ("my weight is 68 kg")
        const bioUpdateReply = checkAndHandleBiometricUpdate(userQuery);
        if (bioUpdateReply) {
            return bioUpdateReply;
        }

        // Force Cloud AI if explicitly in 'other' mode
        if (mode === 'other') {
            const isOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
            if (!isOnline) {
                return `### 🌐 Internet Required for Cloud AI Agent\n\n` +
                       `You are in **"Other queries"** mode, which connects directly to our **Cloud AI Agent (Meta Llama)**.\n\n` +
                       `⚠️ Please check your internet connection, or use offline commands like *"Schedule study at 4 PM"* or *"Log 2 eggs"*!`;
            }
            const p = dispatchCloudAI(userQuery, liveData, customHistory);
            p.then(r => recordBotReplyInMemory(r)).catch(() => {});
            return p;
        }

        const queryNorm = normalizeText(userQuery);

        // 5. Health Tab Biometrics Retrieval Intent
        const isBiometricQuery = 
            queryNorm.includes("biometric") ||
            queryNorm.includes("biometrics") ||
            queryNorm.includes("retrive") ||
            queryNorm.includes("retrieve") ||
            (queryNorm.includes("health") && (queryNorm.includes("tab") || queryNorm.includes("data") || queryNorm.includes("stat") || queryNorm.includes("profile") || queryNorm.includes("sync") || queryNorm.includes("metric"))) ||
            (queryNorm.includes("what") && (queryNorm.includes("weight") || queryNorm.includes("height") || queryNorm.includes("bmi"))) ||
            (queryNorm.includes("my") && (queryNorm.includes("weight") || queryNorm.includes("height") || queryNorm.includes("bmi") || queryNorm.includes("body stats") || queryNorm.includes("health stats") || queryNorm.includes("health profile")));

        if (isBiometricQuery && !queryNorm.includes("diet") && !queryNorm.includes("food") && !queryNorm.includes("eat") && !queryNorm.includes("formula") && !queryNorm.includes("protein") && !queryNorm.includes("calorie")) {
            return generateBiometricsReport();
        }

        // 6. Direct triggers for Daily Analysis / Summary / Debrief
        if (
            queryNorm.includes("analyze") ||
            queryNorm.includes("summary") ||
            queryNorm.includes("summarise") ||
            queryNorm.includes("summarize") ||
            queryNorm.includes("recap") ||
            queryNorm.includes("debrief") ||
            queryNorm.includes("how was my day") ||
            queryNorm.includes("how did i do") ||
            queryNorm.includes("how did i perform") ||
            queryNorm.includes("where did i decline") ||
            queryNorm.includes("where did i slip") ||
            queryNorm.includes("review today") ||
            queryNorm.includes("review my day") ||
            queryNorm.includes("daily report") ||
            queryNorm.includes("daily review") ||
            (queryNorm.includes("my day") && (queryNorm.includes("how") || queryNorm.includes("tell") || queryNorm.includes("score")))
        ) {
            return generateDailyDebrief();
        }

        // 7. Match against 200 Knowledge Base Curriculum Items
        const rawWords = queryNorm.split(' ');
        const meaningfulWords = rawWords.filter(w => !STOP_WORDS.has(w) && w.length > 1);

        const boostedIds = new Set();
        TOPIC_CLUSTERS.forEach(cluster => {
            let matched = false;
            cluster.triggers.forEach(trig => {
                if (queryNorm === trig || queryNorm.includes(trig) || rawWords.includes(trig)) {
                    matched = true;
                }
            });
            if (matched) {
                cluster.boostIds.forEach(id => boostedIds.add(id));
            }
        });

        let bestItem = null;
        let highestScore = 0;

        KNOWLEDGE_BASE.forEach(item => {
            let score = 0;
            item.keywords.forEach(kw => {
                const kwNorm = normalizeText(kw);
                if (queryNorm === kwNorm) {
                    score += 70;
                } else if (queryNorm.includes(kwNorm)) {
                    score += 40;
                } else {
                    const kwTokens = kwNorm.split(' ');
                    meaningfulWords.forEach(w => {
                        if (kwTokens.includes(w)) score += 14;
                    });
                }
            });

            const titleNorm = normalizeText(item.title);
            const titleTokens = titleNorm.split(' ');
            meaningfulWords.forEach(w => {
                if (titleTokens.includes(w)) score += 12;
            });

            if (boostedIds.has(item.id)) {
                score += 30;
            }

            if (score > highestScore) {
                highestScore = score;
                bestItem = item;
            }
        });

        // High-Certainty Local Match (Confidence >= 35)
        if (bestItem && highestScore >= 35) {
            return bestItem.answer(liveData);
        }

        // Strict Local Mode Check
        if (mode === 'app') {
            const cleanQuery = userQuery.replace(/["'\`]/g, '');
            return `### 📱 App Assistant Mode\n\n` +
                   `I am currently set to **"Ask about app"** mode. I answer all questions regarding **Productometer controls, functions, and formulas**:\n` +
                   `• **Score Math**: Health ($150 - 30n$), Academics ($100n$), Other ($50n$), Screen penalty\n` +
                   `• **Day Planner**: Upcoming sessions, slider-free checklists, time blocks\n` +
                   `• **Academics**: Real-time timer countdowns & distraction penalties\n` +
                   `• **Health & Diet**: Caloric targets & protein formulas for your ${liveData.userProfile.weight} kg weight\n\n` +
                   `💡 **Want our Cloud AI Agent (Meta Llama) to answer this general question?**\n` +
                   `<button type="button" class="coach-chip" style="margin-top: 8px; border-color: #00e5ff; color: #00e5ff; padding: 6px 12px; font-weight: 600;" onclick="if(window.ProductoUI){window.ProductoUI.setMode('other');window.ProductoUI.ask('${cleanQuery}');}">⚡ Ask Cloud Agent Now</button>`;
        }

        // =====================================================================
        // 8. AUTO CLOUD DISPATCH (Smart Auto-Classifier)
        // Question is open-ended, creative, general, or complex: auto-call Cloud AI!
        // =====================================================================
        const isOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
        if (!isOnline) {
            return `### 🌐 Internet Required for Open-Ended Query\n\n` +
                   `This is a custom question that requires our **Cloud AI Agent (Meta Llama)** to provide an accurate, nuanced answer.\n\n` +
                   `⚠️ Please turn on your Wi-Fi or mobile data, or ask about your app score, schedule, or diet which run 100% offline!`;
        }

        return dispatchCloudAI(userQuery, liveData);
    }

    // Public API
    return {
        extractLiveMetrics,
        retrieveHealthBiometrics,
        generateBiometricsReport,
        generateDailyDebrief,
        findBestMatch,
        getCloudflareUrl,
        getGeminiApiKey,
        setCloudConfig,
        dispatchCloudAI,
        checkAndHandleBiometricUpdate,
        getAllTopics: () => KNOWLEDGE_BASE.map(k => ({ id: k.id, category: k.category, title: k.title })),
        getKnowledgeBase: () => KNOWLEDGE_BASE
    };

})();

// Explicit Global Scope Attachment
if (typeof window !== 'undefined') {
    window.ProductoBrain = ProductoBrain;
    window.ChronoBrain = ProductoBrain;
}
if (typeof globalThis !== 'undefined') {
    globalThis.ProductoBrain = ProductoBrain;
    globalThis.ChronoBrain = ProductoBrain;
}
