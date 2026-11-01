/* --- GLOBAL PRODUCTOMETER BACKGROUND ACADEMICS MONITOR --- */
(function() {
    let globalNotifiedTasks = new Set();

    // Create hidden audio and modal overlay elements if they don't exist on this page
    function injectGlobalUIElements() {
        if (!document.getElementById('customModalOverlay')) {
            const modalHTML = `
            <div id="customModalOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(5px); z-index: 9999; justify-content: center; align-items: center;">
                <div id="customModalBox" style="background: #131b2e; border: 1px solid #00e676; padding: 30px; border-radius: 16px; width: 90%; max-width: 450px; box-shadow: 0 0 35px rgba(0, 230, 118, 0.25); text-align: center; font-family: inherit;">
                    <div id="customModalIcon" style="font-size: 2.5em; margin-bottom: 15px;">🎯</div>
                    <div id="customModalTitle" style="font-size: 1.3em; font-weight: 800; color: #fff; margin-bottom: 10px; letter-spacing: 0.5px;">Alert Title</div>
                    <div id="customModalMessage" style="font-size: 0.95em; color: #94a3b8; margin-bottom: 25px; line-height: 1.5;">Alert message goes here.</div>
                    <div id="customModalButtons" style="display: flex; gap: 12px; justify-content: center;">
                        <button id="customModalConfirmBtn" style="background-color: #00e676; color: #000; border: none; padding: 10px 24px; font-weight: bold; border-radius: 8px; cursor: pointer; transition: all 0.2s;">Start Session Now</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            document.getElementById('customModalConfirmBtn').addEventListener('click', () => {
                document.getElementById('customModalOverlay').style.display = 'none';
                const isSubdir = window.location.pathname.includes('/Features/') || window.location.pathname.includes('/Me/');
                const targetUrl = isSubdir ? '../Features/Academics_Monitoring/index.html?autoStart=true' : './Features/Academics_Monitoring/index.html?autoStart=true';
                window.location.href = targetUrl;
            });
        }

        if (!document.getElementById('globalStartAlarm')) {
            const audioHTML = `<audio id="globalStartAlarm" preload="auto" src="../assets/start-alarm.mp3"></audio>`;
            document.body.insertAdjacentHTML('beforeend', audioHTML);
        }
    }

    function showGlobalModal(title, message) {
        const overlay = document.getElementById('customModalOverlay');
        if (overlay) {
            document.getElementById('customModalTitle').innerText = title;
            document.getElementById('customModalMessage').innerText = message;
            overlay.style.display = 'flex';
        }
    }

    // Unlock audio context on first click
    document.addEventListener('click', () => {
        const audio = document.getElementById('globalStartAlarm');
        if (audio) {
            audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
        }
    }, { once: true });

    function checkGlobalAcademicTasks() {
        let dayPlannerTasks = [];
        try {
            const rawData = localStorage.getItem('productometer_chrono_planner_list');
            if (rawData) dayPlannerTasks = JSON.parse(rawData);
        } catch (err) { console.log("Global storage parse error:", err); }

        const now = new Date();
        const currentTotalMins = now.getHours() * 60 + now.getMinutes();

        let availableTasks = [];

        dayPlannerTasks.forEach(task => {
            const taskTitle = task.title || task.name || "Scheduled Session";
            let startH = 9, startM = 0;
            let timeFound = false;

            for (const key in task) {
                const val = task[key];
                if (typeof val === 'string' && /^\d{1,2}:\d{2}$/.test(val)) {
                    const parts = val.split(':');
                    startH = parseInt(parts[0], 10);
                    startM = parseInt(parts[1], 10);
                    timeFound = true; break;
                }
            }
            if (!timeFound) {
                if (task.timeDisplayStr) {
                    const p = task.timeDisplayStr.split(':');
                    startH = parseInt(p[0], 10); startM = parseInt(p[1], 10);
                } else if (task.startMin) {
                    startH = Math.floor(task.startMin / 60); startM = task.startMin % 60;
                }
            }

            let duration = task.durationMinutes || task.duration || 60;
            const taskStartMins = startH * 60 + startM;
            const windowOpenMins = taskStartMins - 10; 
            const windowCloseMins = taskStartMins + Math.floor(duration / 2); 

            if (currentTotalMins >= windowOpenMins && currentTotalMins <= windowCloseMins) {
                availableTasks.push(taskTitle);
            }
        });

        let shouldRing = false;
        availableTasks.forEach(title => {
            if (!globalNotifiedTasks.has(title)) {
                globalNotifiedTasks.add(title);
                shouldRing = true;
            }
        });

        if (shouldRing) {
            const alarm = document.getElementById('globalStartAlarm');
            if (alarm) {
                alarm.currentTime = 0;
                alarm.play().catch(e => console.log("Global audio blocked:", e));
            }
            showGlobalModal(
                "SESSION UNLOCKED!", 
                `Your scheduled task "${availableTasks[0] || 'Study Session'}" is now ready to begin! Check your Academics hub.`
            );
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        injectGlobalUIElements();
        setInterval(checkGlobalAcademicTasks, 15000); // Checks every 15s across all pages
    });
})();