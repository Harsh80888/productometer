/* --- GLOBAL STATE FOR ACADEMICS SESSIONS --- */
let sessionActive = false;
let sessionPausedForDistraction = false;
let currentSessionInterval = null;
let timeRemaining = 25 * 60; // 25 minutes in seconds
let notifiedAvailableTasks = new Set();
let currentActiveTaskTitle = "";

/* --- AUDIO ELEMENTS & BACKGROUND CONTEXT --- */
const startAlarm = document.getElementById('startAlarm');
const distractionAlarm = document.getElementById('distractionAlarm');
const breakAlarm = document.getElementById('breakAlarm');

[startAlarm, distractionAlarm, breakAlarm].forEach(audio => {
    if (audio) {
        audio.load();
        audio.volume = 1.0;
        audio.setAttribute('preload', 'auto');
    }
});

// Unlock audio context on first user click anywhere on the page
document.addEventListener('click', () => {
    [startAlarm, distractionAlarm, breakAlarm].forEach(audio => {
        if (audio) {
            audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
        }
    });
}, { once: true });

/* --- CUSTOM MODAL UTILITY --- */
function showCustomModal(title, message, type = 'info', confirmCallback = null, confirmBtnText = 'OK') {
    const overlay = document.getElementById('customModalOverlay');
    const box = document.getElementById('customModalBox');
    const titleEl = document.getElementById('customModalTitle');
    const msgEl = document.getElementById('customModalMessage');
    const iconEl = document.getElementById('customModalIcon');
    const confirmBtn = document.getElementById('customModalConfirmBtn');
    const cancelBtn = document.getElementById('customModalCancelBtn');

    if (!overlay) {
        alert(message);
        if (confirmCallback) confirmCallback(true);
        return;
    }

    titleEl.innerText = title;
    msgEl.innerText = message;
    if (confirmBtn) confirmBtn.innerText = confirmBtnText;

    if (type === 'distraction') {
        box.style.border = '1px solid #ff3d71';
        box.style.boxShadow = '0 0 35px rgba(255, 61, 113, 0.3)';
        iconEl.innerText = '🚨';
        confirmBtn.style.backgroundColor = '#ff3d71';
        confirmBtn.style.color = '#fff';
    } else if (type === 'break' || type === 'confirm') {
        box.style.border = '1px solid #ffb300';
        box.style.boxShadow = '0 0 35px rgba(255, 179, 0, 0.3)';
        iconEl.innerText = type === 'break' ? '☕' : '⚠️';
        confirmBtn.style.backgroundColor = '#ffb300';
        confirmBtn.style.color = '#000';
    } else {
        box.style.border = '1px solid #00e676';
        box.style.boxShadow = '0 0 35px rgba(0, 230, 118, 0.25)';
        iconEl.innerText = '🎯';
        confirmBtn.style.backgroundColor = '#00e676';
        confirmBtn.style.color = '#000';
    }

    if (confirmCallback) {
        cancelBtn.style.display = 'inline-block';
    } else {
        cancelBtn.style.display = 'none';
    }

    overlay.style.display = 'flex';

    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    document.getElementById('customModalConfirmBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        if (confirmCallback) confirmCallback(true);
    });

    document.getElementById('customModalCancelBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        if (confirmCallback) confirmCallback(false);
    });
}

/* --- FEATURES HUB NAVIGATION --- */
const hubLink = document.getElementById('featuresHubLink');
if (hubLink) {
    hubLink.addEventListener('click', function(e) {
        if (sessionActive) {
            e.preventDefault();
            showCustomModal(
                "Active Session Running", 
                "You have an active study session! Are you sure you want to leave?", 
                "confirm", 
                (confirmed) => {
                    if (confirmed) window.location.href = '../index.html';
                }
            );
        } else {
            window.location.href = '../index.html';
        }
    });
}

/* --- 1. DYNAMIC RESOURCE ADDITION & SECURE NAVIGATION --- */
const forceAddBtn = document.getElementById('forceAddBtn');
if (forceAddBtn) {
    forceAddBtn.addEventListener('click', function () {
        const nameInput = document.getElementById('siteName');
        const urlInput = document.getElementById('siteUrl');
        const listContainer = document.querySelector('.resources-vertical-list');
        const dialogBox = document.getElementById('customSiteDialog');

        const name = nameInput.value.trim();
        let url = urlInput.value.trim();

        if (!name || !url) {
            showCustomModal("Missing Information", "Please enter both name and URL.", "info");
            return;
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

        let domain = '';
        try { domain = new URL(url).hostname; } catch (e) { domain = ''; }
        const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '';

        const newCard = document.createElement('div');
        newCard.className = 'resource-card-item';
        newCard.onclick = function() { openApprovedResource(url); };

        newCard.innerHTML = `
            <div class="resource-card-header">
                ${faviconUrl ? `<img src="${faviconUrl}" class="resource-favicon" alt="icon">` : '<div class="resource-favicon-placeholder"></div>'}
                <span class="resource-card-title">${name}</span>
                <button class="remove-resource-btn" title="Remove Resource">&times;</button>
            </div>
        `;

        newCard.querySelector('.remove-resource-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            newCard.remove();
        });

        listContainer.appendChild(newCard);
        nameInput.value = ''; urlInput.value = ''; if(dialogBox) dialogBox.close();
    });
}

function openApprovedResource(url) {
    sessionStorage.setItem('isApprovedNavigation', 'true');
    window.open(url, '_blank');
    setTimeout(() => { sessionStorage.removeItem('isApprovedNavigation'); }, 2000);
}

/* --- 2. WEEKLY TASKS MANAGEMENT SYSTEM --- */
const STORAGE_KEY_WEEKLY = 'productometer_weekly_tasks_list';

function loadAndRenderWeeklyTasks() {
    let weeklyTasks = [];
    try {
        const rawData = localStorage.getItem(STORAGE_KEY_WEEKLY);
        if (rawData) weeklyTasks = JSON.parse(rawData);
    } catch (err) {
        console.log("Error parsing weekly tasks:", err);
    }

    const weeklyContainer = document.getElementById('weeklyTasksContainer');
    if (!weeklyContainer) return;

    weeklyContainer.innerHTML = '';

    if (weeklyTasks.length === 0) {
        weeklyContainer.innerHTML = `<div style="color: #64748b; padding: 10px; font-size: 0.88rem;">No weekly tasks added yet.</div>`;
        return;
    }

    weeklyTasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-row-item';

        taskCard.innerHTML = `
            <div>
                <div class="task-title">${task.title}</div>
                <div class="task-meta">Category: ${task.category || 'Academics'}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="task-badge">${task.targetDay || 'This Week'}</span>
                <button class="delete-weekly-task-btn" data-id="${task.id}" style="background: transparent; border: none; color: #ff3d71; cursor: pointer; font-size: 1.1em;" title="Delete Task">&times;</button>
            </div>
        `;

        weeklyContainer.appendChild(taskCard);
    });

    document.querySelectorAll('.delete-weekly-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-id');
            weeklyTasks = weeklyTasks.filter(t => t.id !== targetId);
            localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify(weeklyTasks));
            loadAndRenderWeeklyTasks();
        });
    });
}

const saveWeeklyTaskBtn = document.getElementById('saveWeeklyTaskBtn');
if (saveWeeklyTaskBtn) {
    saveWeeklyTaskBtn.addEventListener('click', () => {
        const titleInput = document.getElementById('weeklyTaskTitle');
        const targetDayInput = document.getElementById('weeklyTaskTargetDay');
        const dialogBox = document.getElementById('weeklyTaskDialog');

        const title = titleInput.value.trim();
        const targetDay = targetDayInput.value.trim() || 'Due Soon';

        if (!title) {
            showCustomModal("Missing Title", "Please provide a title for the weekly task.", "info");
            return;
        }

        let weeklyTasks = [];
        try {
            const rawData = localStorage.getItem(STORAGE_KEY_WEEKLY);
            if (rawData) weeklyTasks = JSON.parse(rawData);
        } catch (err) {
            console.log("Error loading weekly tasks:", err);
        }

        const newTask = {
            id: 'weekly_' + Date.now(),
            title: title.toUpperCase(),
            targetDay: targetDay,
            category: 'Academics'
        };

        weeklyTasks.push(newTask);
        localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify(weeklyTasks));
        
        titleInput.value = '';
        targetDayInput.value = '';
        if (dialogBox) dialogBox.close();
        loadAndRenderWeeklyTasks();
    });
}

loadAndRenderWeeklyTasks();


function markPlannerTaskCompleted(taskTitle) {
    if (!taskTitle) return;
    try {
        const raw = localStorage.getItem('productometer_chrono_planner_list');
        if (raw) {
            let list = JSON.parse(raw);
            let matched = false;
            list.forEach(item => {
                if (item && item.title && (
                    item.title.toUpperCase() === taskTitle.toUpperCase() ||
                    item.title.toUpperCase().includes(taskTitle.toUpperCase()) ||
                    taskTitle.toUpperCase().includes(item.title.toUpperCase())
                )) {
                    item.completed = true;
                    matched = true;
                }
            });
            if (matched) {
                localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(list));
                // Dispatch storage event so other open pages update live
                try {
                    window.dispatchEvent(new Event('storage'));
                } catch (e) {}
            }
        }
    } catch (e) {
        console.error("Error syncing completed task to Day Planner:", e);
    }
}

/* --- 3. ADVANCED CROSS-PAGE TASK EXTRACTOR & GLOBAL ALARM SYNC --- */
function renderAcademicTasks() {
    let dayPlannerTasks = [];
    try {
        const rawData = localStorage.getItem('productometer_chrono_planner_list');
        if (rawData) dayPlannerTasks = JSON.parse(rawData);
    } catch (err) { console.log("Error parsing storage:", err); }

    const academicPlannerTasks = dayPlannerTasks.filter(task => {
        if (!task) return false;
        const cat = (task.category || '').toLowerCase();
        if (cat === 'academics' || cat === 'skills' || cat === 'study' || cat === 'academic' || cat === 'school' || cat === 'work' || cat === 'other' || cat === 'general') return true;
        if (cat !== 'health' && cat !== 'fitness' && cat !== 'workout' && cat !== 'running' && cat !== 'hiit') return true;
        const t = (task.title || '').toLowerCase();
        return t.includes('study') || t.includes('math') || t.includes('physic') ||
               t.includes('chem') || t.includes('bio') || t.includes('read') ||
               t.includes('code') || t.includes('exam') || t.includes('test') ||
               t.includes('practice') || t.includes('revision') || t.includes('lecture') ||
               t.includes('learn') || t.includes('class') || t.includes('homework') ||
               t.includes('dsa') || t.includes('chapter');
    });

    const now = new Date();
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();

    let availableTasks = [];
    let lockedTasks = [];

    academicPlannerTasks.forEach(task => {
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

        const isAvailable = currentTotalMins >= windowOpenMins && currentTotalMins <= windowCloseMins;
        const taskObj = { title: taskTitle, startH, startM, duration, isAvailable, completed: !!task.completed };

        if (isAvailable) availableTasks.push(taskObj);
        else lockedTasks.push(taskObj);
    });

    let shouldRingStartAlarm = false;
    availableTasks.forEach(t => {
        if (!notifiedAvailableTasks.has(t.title)) {
            notifiedAvailableTasks.add(t.title);
            shouldRingStartAlarm = true;
            if (!sessionActive) {
                showIndependentStartBox(t.title);
            }
        }
    });

    if (shouldRingStartAlarm && startAlarm && !sessionActive) {
        startAlarm.currentTime = 0;
        startAlarm.play().catch(e => {
            setTimeout(() => { startAlarm.play().catch(err => console.log("Retry failed:", err)); }, 1000);
        });
        
        const readyTaskTitle = availableTasks[0]?.title || 'Study Session';
        showCustomModal(
            "⏰ SESSION UNLOCKED!", 
            `Your scheduled task "${readyTaskTitle}" is ready to begin! Tap "I am ready" to start your 25-minute Pomodoro focus session.`, 
            "info",
            (confirmed) => {
                if (confirmed) {
                    if (startAlarm) { startAlarm.pause(); startAlarm.currentTime = 0; }
                    if (window.NativeBridge && window.NativeBridge.stopAlarm) {
                        window.NativeBridge.stopAlarm();
                    }
                    beginActivePomodoroCountdown(readyTaskTitle);
                }
            },
            "✅ I am ready"
        );
    }

    const container = document.getElementById('academicTasksBucket');
    if (!container) return;

    if (!sessionActive) {
        container.innerHTML = '';
        const allSortedTasks = [...availableTasks, ...lockedTasks];

        if (allSortedTasks.length === 0) {
            container.innerHTML = `<div style="color: #64748b; padding: 10px; font-size: 0.88rem;">No academic tasks synced from Day Planner.</div>`;
            clearIndependentStartBox();
            return;
        }

        if (availableTasks.length > 0) {
            showIndependentStartBox(availableTasks[0].title);
        } else {
            clearIndependentStartBox();
        }

        allSortedTasks.forEach(t => {
            const taskDiv = document.createElement('div');
            const safeTitleClass = 'task-row-' + t.title.replace(/[^a-zA-Z0-9]/g, '-');
            taskDiv.className = `task-row-item ${safeTitleClass} ${t.isAvailable ? '' : 'task-locked'}`;
            taskDiv.style.cursor = 'pointer';
            taskDiv.style.transition = 'all 0.2s ease';

            const fHour = t.startH.toString().padStart(2, '0');
            const fMin = t.startM.toString().padStart(2, '0');

            let badgeHtml = '';
            if (t.completed) {
                badgeHtml = '<span style="color: #00e676; font-weight: bold; font-size: 0.85em;"><i class="fa-solid fa-circle-check"></i> Done</span>';
            } else if (t.isAvailable) {
                badgeHtml = '<button type="button" class="btn-row-start" style="background: #00e676; color: #000; border: none; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 0.78rem; cursor: pointer;">Start</button>';
            } else {
                badgeHtml = '<button type="button" class="btn-row-start" style="background: rgba(0, 229, 255, 0.12); color: #00e5ff; border: 1px solid rgba(0, 229, 255, 0.3); padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">Start Early</button>';
            }
            
            taskDiv.innerHTML = `
                <div style="flex: 1;">
                    <div class="task-title" style="${t.completed ? 'text-decoration: line-through; opacity: 0.7;' : (t.isAvailable ? 'color: #00e676;' : '')}">${t.title}</div>
                    <div class="task-meta">Scheduled: ${fHour}:${fMin} (${t.duration}m)</div>
                </div>
                <div class="task-status-badge">
                    ${badgeHtml}
                </div>
            `;

            taskDiv.addEventListener('click', () => {
                if (!sessionActive) {
                    beginActivePomodoroCountdown(t.title);
                }
            });

            container.appendChild(taskDiv);
        });
    }
}

setInterval(renderAcademicTasks, 15000);
renderAcademicTasks();

/* --- 4. INDEPENDENT SEPARATE BOX FOR STARTING SESSION --- */
function showIndependentStartBox(title) {
    const boxContainer = document.getElementById('activeSessionBoxContainer');
    if (!boxContainer || sessionActive) return;

    boxContainer.innerHTML = `
        <div class="glow-card" style="border: 1.5px solid #00e676; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <div>
                <div class="soft-heading" style="color: #00e676; margin-bottom: 4px;">Session Unlocked & Ready</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #fff;">${title}</div>
            </div>
            <button id="independentStartActionBtn" class="btn-cyan-solid" style="background: #00e676; color: #030305;">
                Start Session
            </button>
        </div>
    `;

    const startBtn = document.getElementById('independentStartActionBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            [startAlarm, distractionAlarm, breakAlarm].forEach(a => {
                if (a) { a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); }
            });
            beginActivePomodoroCountdown(title);
        });
    }
}

function clearIndependentStartBox() {
    const boxContainer = document.getElementById('activeSessionBoxContainer');
    if (boxContainer && !sessionActive) boxContainer.innerHTML = "";
}

function beginActivePomodoroCountdown(title) {
    sessionActive = true;
    sessionPausedForDistraction = false;
    currentActiveTaskTitle = title;
    timeRemaining = 25 * 60; 

    if (startAlarm) {
        startAlarm.pause();
        startAlarm.currentTime = 0;
    }

    if (window.NativeBridge && window.NativeBridge.isAvailable()) {
        try {
            if (window.NativeBridge.stopAlarm) window.NativeBridge.stopAlarm();
            if (window.NativeBridge.startFocusSession) window.NativeBridge.startFocusSession(title, timeRemaining);
            if (window.NativeBridge.vibrate) window.NativeBridge.vibrate(60);
        } catch (e) {
            console.warn("NativeBridge error:", e);
        }
    }

    const boxContainer = document.getElementById('activeSessionBoxContainer');
    if (boxContainer) {
        boxContainer.innerHTML = `
            <div class="glow-card" style="border: 1.5px solid #ffb300; margin-bottom: 24px; text-align: center;">
                <div class="soft-heading" id="activeSessionHeaderStatus" style="color: #ffb300; margin-bottom: 4px;">Active Session In Progress</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 12px;">${title}</div>
                <div id="liveCountdownClock" class="study-timer-display" style="color: #ffb300; text-shadow: 0 0 20px rgba(255, 179, 0, 0.4);">25:00</div>
            </div>
        `;
    }

    const clockNode = document.getElementById('liveCountdownClock');

    currentSessionInterval = setInterval(() => {
        if (sessionPausedForDistraction) return; 

        timeRemaining--;
        let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        let s = (timeRemaining % 60).toString().padStart(2, '0');
        
        if (clockNode) { clockNode.innerText = `${m}:${s}`; }

        if (timeRemaining <= 0) {
            clearInterval(currentSessionInterval);
            sessionActive = false;
            if (window.NativeBridge && window.NativeBridge.isAvailable()) {
                window.NativeBridge.stopFocusSession();
                window.NativeBridge.vibrate(500);
            }
            
            if (breakAlarm) { breakAlarm.play().catch(e => console.log("Break Audio Blocked:", e)); }
            
            showCustomModal(
                "Session Completed!", 
                `Great focus! You completed 25 minutes of ${currentActiveTaskTitle}.\n\nPlease take a 5-minute break. Marked as completed in your Day Planner!`, 
                "break"
            );

            // Synchronize with Day Planner
            markPlannerTaskCompleted(currentActiveTaskTitle);

            clearIndependentStartBox();
            renderAcademicTasks(); 
        }
    }, 1000);
}

/* --- 5. STRICT DISTRACTION DETECTOR --- */
let awayTimer = null;

window.addEventListener('blur', () => {
    if (!sessionActive || sessionStorage.getItem('isApprovedNavigation') === 'true') return; 

    awayTimer = setTimeout(() => {
        sessionPausedForDistraction = true; 
        
        const headerStatus = document.getElementById('activeSessionHeaderStatus');
        if (headerStatus) {
            headerStatus.innerText = '⚠️ PAUSED (Distraction Detected)';
            headerStatus.style.color = '#ff3d71';
        }

        if (distractionAlarm) {
            distractionAlarm.loop = true;
            distractionAlarm.play().catch(e => console.log("Distraction Audio Blocked:", e));
        }
        
        showCustomModal(
            "DISTRACTION DETECTED!", 
            "You have left the learning environment! Session timer paused. Return immediately.", 
            "distraction"
        );
    }, 2000);
});

window.addEventListener('focus', () => {
    if (awayTimer) { clearTimeout(awayTimer); awayTimer = null; }
    if (distractionAlarm) { distractionAlarm.pause(); distractionAlarm.currentTime = 0; }
    
    if (sessionActive && sessionPausedForDistraction) {
        sessionPausedForDistraction = false; 
        const headerStatus = document.getElementById('activeSessionHeaderStatus');
        if (headerStatus) {
            headerStatus.innerText = 'Active Session In Progress';
            headerStatus.style.color = '#ffb300';
        }
    }
});

/* --- 6. TODAY'S TOTAL STUDY TIME TRACKER --- */
function getPersistentDailySeconds() {
    const todayStr = new Date().toDateString();
    const storedDate = localStorage.getItem('productometer_study_date');
    
    if (storedDate !== todayStr) {
        localStorage.setItem('productometer_study_date', todayStr);
        localStorage.setItem('productometer_daily_study_seconds', '0');
        return 0;
    }
    
    const saved = localStorage.getItem('productometer_daily_study_seconds');
    return saved ? parseInt(saved, 10) : 0;
}

let totalSeconds = getPersistentDailySeconds();

function formatStudyTime(seconds) {
    if (seconds <= 0) return "0 minutes";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0 || hours === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    
    return parts.join(' ');
}

function updateStudyTimeDisplay() {
    const timerDisplay = document.getElementById('studyTimerDisplay');
    if (timerDisplay) { timerDisplay.innerText = formatStudyTime(totalSeconds); }
}
updateStudyTimeDisplay();

setInterval(() => {
    if (document.hasFocus() && sessionActive && !sessionPausedForDistraction) { 
        totalSeconds += 60; 
        localStorage.setItem('productometer_daily_study_seconds', totalSeconds.toString());
        updateStudyTimeDisplay();
    }
}, 60000);

/* --- 7. AUTOMATIC MIDNIGHT RESET HANDLER --- */
function checkAndResetPlannerForNewDay() {
    const lastActiveDateKey = 'productometer_last_active_date';
    const currentDateStr = new Date().toDateString(); 
    const lastSavedDate = localStorage.getItem(lastActiveDateKey);

    if (lastSavedDate && lastSavedDate !== currentDateStr) {
        // Safe reset: do NOT wipe Day Planner schedule! Reset daily study seconds only.
        localStorage.removeItem('productometer_daily_study_seconds');
    }
    localStorage.setItem(lastActiveDateKey, currentDateStr);
}

checkAndResetPlannerForNewDay();

// Reactive Sync: Auto-update when Day Planner updates in another tab or view
window.addEventListener('storage', (e) => {
    if (!e.key || e.key.includes('planner') || e.key.includes('chrono')) {
        renderAcademicTasks();
    }
});
window.addEventListener('focus', () => {
    renderAcademicTasks();
});
