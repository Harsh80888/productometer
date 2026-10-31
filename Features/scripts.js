document.addEventListener('DOMContentLoaded', () => {
    // 1. Structural UI HUD Mapping Nodes
    const globalDiamondWallet = document.getElementById('globalDiamondWallet');

    // Load master wallet cache values from browser sandbox memory lane blocks
    let diamondCount = parseInt(localStorage.getItem('productometer_diamond_wallet'), 10) || 0;
    if (globalDiamondWallet) globalDiamondWallet.textContent = diamondCount;

    // --- 📊 RESPONSIVE LIVE METRICS EXTRACTOR CONTROLLER ---
    function syncFeatureCardLiveMetrics() {
        let timelineData = Array(48).fill(null);
        try {
            const savedTimeline = localStorage.getItem('productometer_timeline');
            if (savedTimeline) timelineData = JSON.parse(savedTimeline);
        } catch (e) {}
        
        let todoListData = [];
        try {
            const savedTodoList = localStorage.getItem('productometer_slider_free_todolist') || localStorage.getItem('productometer_chrono_planner_list');
            if (savedTodoList) todoListData = JSON.parse(savedTodoList);
        } catch (e) {}

        let totalTrackedSlots = 0;
        let screenSlots = 0;
        let academicsSlots = 0;

        timelineData.forEach(item => {
            if (item && item !== 'eraser') totalTrackedSlots++;
            if (item === 'screen') screenSlots++;
            if (item === 'academics') academicsSlots++;
        });

        if (document.getElementById('metric-planner')) {
            document.getElementById('metric-planner').textContent = `${totalTrackedSlots}/48 Slots`;
        }
        if (document.getElementById('metric-academics')) {
            document.getElementById('metric-academics').textContent = academicsSlots > 0 ? `${(academicsSlots * 0.5).toFixed(1)}h Studied` : "Ready";
        }
        if (document.getElementById('metric-screen')) {
            let hours = screenSlots * 0.5;
            try {
                const screenDataRaw = localStorage.getItem('productometer_screen_data');
                if (screenDataRaw) {
                    const sData = JSON.parse(screenDataRaw);
                    if (sData.totalScreenSecondsToday !== undefined) {
                        hours = sData.totalScreenSecondsToday / 3600;
                    }
                }
            } catch (e) {}
            document.getElementById('metric-screen').textContent = `${hours.toFixed(1)}h Screen`;
            if (hours >= 4.0) document.getElementById('metric-screen').classList.add('text-warn');
            else document.getElementById('metric-screen').classList.remove('text-warn');
        }
        if (document.getElementById('metric-tasks')) {
            const remainingOpenTasksCount = todoListData.filter(t => !t.completed).length;
            document.getElementById('metric-tasks').textContent = `${remainingOpenTasksCount} Tasks Open`;
        }
        if (document.getElementById('metric-health')) {
            document.getElementById('metric-health').textContent = "Ready";
        }
    }

    syncFeatureCardLiveMetrics();

    // --- 🚀 BULLETPROOF INWARD FEATURE NAVIGATION CONTROLLER ---
    document.querySelectorAll('.feature-launcher-card').forEach(card => {
        card.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            let folderIdentifier = card.dataset.target;
            
            if (folderIdentifier === "Day_Planner" || folderIdentifier === "Day Planner") {
                window.location.href = "./Day Planner/planner-index.html";
                return;
            }

            if (folderIdentifier === "Academics_Monitoring") {
                window.location.href = "./Academics_Monitoring/index.html";
                return;
            }

            if (folderIdentifier === "Health_Tracker") {
                window.location.href = "./Health_Tracker/index.html";
                return;
            }

            if (folderIdentifier === "Screen_Management" || folderIdentifier === "Screen Management") {
                window.location.href = "./Screen_Management/index.html";
                return;
            }

            if (folderIdentifier) {
                const titleNode = card.querySelector('h3');
                const moduleName = titleNode ? titleNode.textContent : folderIdentifier;
                alert(`The "${moduleName}" module is currently in development and will be available soon!`);
            }
        });
    });
});
