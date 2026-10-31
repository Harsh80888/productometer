document.addEventListener('DOMContentLoaded', () => {
    // UI HUD Metric Selector Elements
    const hudNetScore = document.getElementById('hudNetScore');
    const hudTrackedHours = document.getElementById('hudTrackedHours');
    const homeTasksBucket = document.getElementById('homeTasksBucket');

    function loadAndSyncChronoSharedDatabase() {
        // 1. Extract raw schedule array from your explicit shared key memory lane block [1.38]
        const savedPlannerList = localStorage.getItem('productometer_chrono_planner_list');
        let plannerListData = savedPlannerList ? JSON.parse(savedPlannerList) : [];

        // 2. Extract standard timeline slots data array to calculate hours logs
        const savedTimeline = localStorage.getItem('productometer_timeline');
        const timelineData = savedTimeline ? JSON.parse(savedTimeline) : Array(48).fill(null);

        // A. LOOP HOURS CALCULATION
        let totalActiveSlots = 0;
        timelineData.forEach(item => { if (item && item !== 'eraser') totalActiveSlots++; });
        if (hudTrackedHours) hudTrackedHours.textContent = `${(totalActiveSlots * 0.5).toFixed(1)}h`;

        // B. LOOP PERFORMANCE SCORE CALCULATION
        // Earn +50 points for every completed task checked off on the list
        let activeScoreSumValue = 0;
        plannerListData.forEach(task => {
            if (task.completed) activeScoreSumValue += 50;
        });
        if (hudNetScore) hudNetScore.textContent = activeScoreSumValue >= 0 ? `+${activeScoreSumValue}` : activeScoreSumValue;

        // C. RENDER REFLECTED TASK CARDS ROWS LIST
        if (!homeTasksBucket) return;
        homeTasksBucket.innerHTML = "";

        if (plannerListData.length === 0) {
            homeTasksBucket.innerHTML = `<p class="home-empty-tasks-placeholder">Your Day Planner has no scheduled items today. Click 'Edit' at the corner to block out your time chronologically!</p>`;
            return;
        }

        plannerListData.forEach(task => {
            const cardRow = document.createElement('div');
            cardRow.classList.add('home-chrono-row-card');
            cardRow.style.borderColor = task.color + '33';
            if (task.completed) cardRow.classList.add('task-completed-state');

            // Form dynamic background glow traces matching item categories tint variables
            cardRow.style.boxShadow = `inset 0 0 10px ${task.color}05, 0 4px 12px rgba(0,0,0,0.4)`;

            cardRow.innerHTML = `
                <label class="home-task-checkbox-wrapper">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} class="home-native-task-checkbox">
                    <span class="home-checkbox-indicator"></span>
                </label>
                <div class="home-task-card-info-stack">
                    <div class="home-task-main-title">${task.title}</div>
                    <div class="home-task-time-badge" style="color: ${task.color}; border-color: ${task.color}22;">⏰ Starts at ${task.timeDisplayStr}</div>
                </div>
            `;

            // 🎯 INTERCEPT INPUT CHANGES: Checking a box here updates data array live globally
            const checkbox = cardRow.querySelector('.home-native-task-checkbox');
            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;
                
                // Commit changes straight into shared array database cache
                localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(plannerListData));
                
                // Live toggle strikeout opacities state sets
                if (task.completed) cardRow.classList.add('task-completed-state');
                else cardRow.classList.remove('task-completed-state');

                // Recalculate and update score counters live without reloading
                let updatedScore = 0;
                plannerListData.forEach(t => { if (t.completed) updatedScore += 50; });
                if (hudNetScore) hudNetScore.textContent = `+${updatedScore}`;
            });

            homeTasksBucket.appendChild(cardRow);
        });
    }

    // Trigger calculation loader on layout bootstrap initialization pass
    loadAndSyncChronoSharedDatabase();
});
