/* --- GLOBAL STATE FOR ACADEMICS SESSIONS --- */
let sessionActive = false;
let sessionPausedForDistraction = false;
let sessionPausedManual = false;
let sessionOnBreak = false;
let breakSecondsRemaining = 0;
let currentSessionInterval = null;
let timeRemaining = 25 * 60; // 25 minutes in seconds
let notifiedAvailableTasks = new Set();
let currentActiveTaskTitle = "";
let currentActiveTaskId = null;

/* --- AUDIO ELEMENTS & BACKGROUND CONTEXT --- */
const startAlarm = document.getElementById('startAlarm');
const distractionAlarm = document.getElementById('distractionAlarm');
const breakAlarm = document.getElementById('breakAlarm');

[distractionAlarm, breakAlarm].forEach(audio => {
    if (audio) {
        audio.load();
        audio.volume = 1.0;
        audio.setAttribute('preload', 'auto');
    }
});

// Unlock audio context on first user click anywhere on the page
document.addEventListener('click', () => {
    [distractionAlarm, breakAlarm].forEach(audio => {
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
    newConfirm.innerText = confirmBtnText;
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    const handleConfirm = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        overlay.style.display = 'none';
        if (confirmCallback) confirmCallback(true);
    };

    const handleCancel = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        overlay.style.display = 'none';
        if (confirmCallback) confirmCallback(false);
    };

    newConfirm.addEventListener('click', handleConfirm);
    newCancel.addEventListener('click', handleCancel);
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


let currentActiveTaskId = null;

function markPlannerTaskCompleted(taskTitle, taskId = null) {
    if (!taskTitle && !taskId) return;
    try {
        const raw = localStorage.getItem('productometer_chrono_planner_list');
        if (raw) {
            let list = JSON.parse(raw);
            let matched = false;
            list.forEach(item => {
                if (!item) return;
                const matchById = taskId && item.id === taskId;
                const matchByTitle = item.title && taskTitle && (
                    item.title.toUpperCase() === taskTitle.toUpperCase() ||
                    item.title.toUpperCase().includes(taskTitle.toUpperCase()) ||
                    taskTitle.toUpperCase().includes(item.title.toUpperCase())
                );
                if (matchById || matchByTitle) {
                    item.completed = true;
                    matched = true;
                }
            });
            if (matched) {
                localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(list));
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

        const timeStr = task.timeDisplayStr || task.time || '';
        if (typeof timeStr === 'string' && timeStr.trim().length > 0) {
            const tm = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?/);
            if (tm) {
                startH = parseInt(tm[1], 10);
                startM = parseInt(tm[2], 10);
                const ampm = (tm[3] || '').toUpperCase();
                if (ampm === 'PM' && startH < 12) startH += 12;
                if (ampm === 'AM' && startH === 12) startH = 0;
                timeFound = true;
            }
        }
        if (!timeFound && task.startMin !== undefined && task.startMin !== null) {
            startH = Math.floor(task.startMin / 60);
            startM = task.startMin % 60;
            timeFound = true;
        }

        let duration = task.durationMinutes || task.duration || 60;
        const taskStartMins = startH * 60 + startM;
        const windowOpenMins = taskStartMins - 10; 
        const windowCloseMins = taskStartMins + Math.floor(duration / 2); 

        const isAvailable = currentTotalMins >= windowOpenMins && currentTotalMins <= windowCloseMins;
        const taskObj = { id: task.id, title: taskTitle, startH, startM, duration, isAvailable, completed: !!task.completed };

        if (isAvailable) availableTasks.push(taskObj);
        else lockedTasks.push(taskObj);
    });

    const todayStr = new Date().toDateString();
    let dismissedMap = {};
    try {
        const stored = sessionStorage.getItem('productometer_dismissed_unlocked_popups');
        if (stored) dismissedMap = JSON.parse(stored);
    } catch (e) {}

    let readyTaskToPrompt = null;
    availableTasks.forEach(t => {
        const key = `${todayStr}_${t.title}_${t.startH}_${t.startM}`;
        if (!t.completed && !dismissedMap[key] && !notifiedAvailableTasks.has(key)) {
            notifiedAvailableTasks.add(key);
            dismissedMap[key] = true;
            try { sessionStorage.setItem('productometer_dismissed_unlocked_popups', JSON.stringify(dismissedMap)); } catch (e) {}
            if (!readyTaskToPrompt) readyTaskToPrompt = t;
        }
    });

    if (readyTaskToPrompt && !sessionActive) {
        if (window.NativeBridge && window.NativeBridge.vibrate) {
            window.NativeBridge.vibrate(250);
        }
        
        const readyTitle = readyTaskToPrompt.title || 'Study Session';
        const readyDur = readyTaskToPrompt.duration || 60;
        const readyId = readyTaskToPrompt.id;
        
        showIndependentStartBox(readyTitle, readyDur, readyId);

        showCustomModal(
            "⏰ SESSION UNLOCKED!", 
            `Your scheduled task "${readyTitle}" (${readyDur}m) is ready to begin! Tap "I am ready" to start your focus session.`, 
            "info",
            (confirmed) => {
                if (confirmed) {
                    if (window.NativeBridge && window.NativeBridge.stopAlarm) {
                        window.NativeBridge.stopAlarm();
                    }
                    beginActivePomodoroCountdown(readyTitle, readyDur, readyId);
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

        const firstPending = allSortedTasks.find(t => !t.completed);
        if (firstPending) {
            showIndependentStartBox(firstPending.title, firstPending.duration, firstPending.id);
        } else {
            clearIndependentStartBox();
        }

        allSortedTasks.forEach(t => {
            const taskDiv = document.createElement('div');
            const safeTitleClass = 'task-row-' + t.title.replace(/[^a-zA-Z0-9]/g, '-');
            taskDiv.className = `task-row-item ${safeTitleClass}`;
            taskDiv.style.cursor = 'pointer';
            taskDiv.style.transition = 'all 0.2s ease';
            taskDiv.style.marginBottom = '8px';

            const fHour = t.startH.toString().padStart(2, '0');
            const fMin = t.startM.toString().padStart(2, '0');

            let badgeHtml = '';
            if (t.completed) {
                badgeHtml = '<span style="color: #00e676; font-weight: bold; font-size: 0.85em;"><i class="fa-solid fa-circle-check"></i> Done</span>';
            } else {
                badgeHtml = `<button type="button" class="btn-row-start" data-task-id="${t.id}" style="background: #00e676; color: #000; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 0.78rem; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-play"></i> Start Session</button>`;
            }
            
            taskDiv.innerHTML = `
                <div style="flex: 1;">
                    <div class="task-title" style="${t.completed ? 'text-decoration: line-through; opacity: 0.7;' : 'color: #fff; font-weight: 700;'}">${t.title}</div>
                    <div class="task-meta" style="color: #94a3b8; font-size: 0.8rem; margin-top: 2px;"><i class="fa-regular fa-clock"></i> Scheduled: ${fHour}:${fMin} (${t.duration}m)</div>
                </div>
                <div class="task-status-badge">
                    ${badgeHtml}
                </div>
            `;

            taskDiv.addEventListener('click', (e) => {
                if (!sessionActive && !t.completed) {
                    beginActivePomodoroCountdown(t.title, t.duration, t.id);
                }
            });

            container.appendChild(taskDiv);
        });
    }
}

// Auto sync when returning from Day Planner or switching apps
window.addEventListener('storage', (e) => {
    if (e.key === 'productometer_chrono_planner_list') {
        renderAcademicTasks();
    }
});
window.addEventListener('focus', () => {
    renderAcademicTasks();
});

setInterval(renderAcademicTasks, 15000);
renderAcademicTasks();

// Auto-start session if requested from Home screen link (?autoStart=true)
try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoStart') === 'true' && !sessionActive) {
        let rawList = localStorage.getItem('productometer_chrono_planner_list');
        if (rawList) {
            let list = JSON.parse(rawList);
            let target = list.find(t => !t.completed);
            if (target) {
                setTimeout(() => {
                    beginActivePomodoroCountdown(target.title || target.name, target.durationMinutes || target.durationMin || 60, target.id);
                }, 200);
            }
        }
    }
} catch (e) {}

/* --- 4. INDEPENDENT SEPARATE BOX FOR STARTING SESSION --- */
function showIndependentStartBox(title, customDuration = null, taskId = null) {
    const boxContainer = document.getElementById('activeSessionBoxContainer');
    if (!boxContainer || sessionActive) return;

    boxContainer.innerHTML = `
        <div class="glow-card" style="border: 1.5px solid #00e676; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <div>
                <div class="soft-heading" style="color: #00e676; margin-bottom: 4px;">Session Ready to Begin</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">${title}</div>
                ${customDuration ? `<div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;"><i class="fa-regular fa-clock"></i> Scheduled Duration: ${customDuration}m</div>` : ''}
            </div>
            <button id="independentStartActionBtn" class="btn-cyan-solid" style="background: #00e676; color: #030305; font-weight: 800; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-play"></i> Start Session
            </button>
        </div>
    `;

    const startBtn = document.getElementById('independentStartActionBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            [distractionAlarm, breakAlarm].forEach(a => {
                if (a) { a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); }
            });
            beginActivePomodoroCountdown(title, customDuration, taskId);
        });
    }
}

function clearIndependentStartBox() {
    const boxContainer = document.getElementById('activeSessionBoxContainer');
    if (boxContainer && !sessionActive) boxContainer.innerHTML = "";
}

window.adjustSessionDuration = function(mins) {
    if (!sessionActive) return;
    timeRemaining = mins * 60;
    const clockNode = document.getElementById('liveCountdownClock');
    if (clockNode) {
        let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        let s = (timeRemaining % 60).toString().padStart(2, '0');
        clockNode.innerText = `${m}:${s}`;
    }
    if (window.NativeBridge && window.NativeBridge.startFocusSession) {
        window.NativeBridge.startFocusSession(currentActiveTaskTitle, timeRemaining);
    }
    if (window.NativeBridge && window.NativeBridge.vibrate) {
        window.NativeBridge.vibrate(40);
    }
};

window.toggleSessionPauseResume = function() {
    if (!sessionActive) return;
    sessionPausedManual = !sessionPausedManual;
    const btn = document.getElementById('btnSessionPauseResume');
    const headerStatus = document.getElementById('activeSessionHeaderStatus');
    const clockNode = document.getElementById('liveCountdownClock');

    if (sessionPausedManual) {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
        if (headerStatus) {
            headerStatus.innerText = '⏸️ Session Paused';
            headerStatus.style.color = '#ffd600';
        }
        if (clockNode) clockNode.style.opacity = '0.6';
    } else {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        if (headerStatus) {
            headerStatus.innerText = 'Active Session In Progress';
            headerStatus.style.color = '#ffb300';
        }
        if (clockNode) clockNode.style.opacity = '1';
    }
    syncSessionStateToStorage();
};

window.triggerSessionBreak = function(breakMins = 5) {
    if (!sessionActive) return;
    sessionOnBreak = true;
    breakSecondsRemaining = breakMins * 60;
    const headerStatus = document.getElementById('activeSessionHeaderStatus');
    const clockNode = document.getElementById('liveCountdownClock');
    if (headerStatus) {
        headerStatus.innerText = `☕ Taking a ${breakMins}m Break`;
        headerStatus.style.color = '#00e5ff';
    }
    if (clockNode) {
        clockNode.style.color = '#00e5ff';
        clockNode.style.textShadow = '0 0 20px rgba(0, 229, 255, 0.4)';
    }
    syncSessionStateToStorage();
};

window.endSessionEarlyPrompt = function() {
    if (!sessionActive) return;
    showCustomModal(
        "Complete Session Early?", 
        `Would you like to finish "${currentActiveTaskTitle}" and mark it completed in Day Planner?`, 
        "confirm",
        (confirmed) => {
            if (confirmed) {
                completeActiveSession(true);
            }
        },
        "Yes, Complete"
    );
};

function syncSessionStateToStorage() {
    try {
        if (sessionActive) {
            localStorage.setItem('productometer_active_session_state', JSON.stringify({
                active: true,
                title: currentActiveTaskTitle,
                taskId: currentActiveTaskId,
                timeRemaining: timeRemaining,
                isPaused: sessionPausedManual || sessionPausedForDistraction,
                isOnBreak: sessionOnBreak,
                timestamp: Date.now()
            }));
        } else {
            localStorage.removeItem('productometer_active_session_state');
        }
    } catch (e) {}
}

function completeActiveSession(manualCompletion = false) {
    if (currentSessionInterval) clearInterval(currentSessionInterval);
    sessionActive = false;
    sessionPausedManual = false;
    sessionOnBreak = false;
    syncSessionStateToStorage();

    if (window.NativeBridge && window.NativeBridge.isAvailable()) {
        try {
            window.NativeBridge.stopFocusSession();
            window.NativeBridge.vibrate(500);
        } catch (e) {}
    }

    if (breakAlarm && !manualCompletion) {
        breakAlarm.play().catch(e => console.log("Break Audio notice:", e));
    }

    showCustomModal(
        "Session Completed!", 
        `Great focus! You completed your study session for "${currentActiveTaskTitle}". Marked as completed in your Day Planner!`, 
        "break"
    );

    markPlannerTaskCompleted(currentActiveTaskTitle, currentActiveTaskId);

    const boxContainer = document.getElementById('activeSessionBoxContainer');
    if (boxContainer) boxContainer.innerHTML = "";
    renderAcademicTasks();
}

function beginActivePomodoroCountdown(title, customDurationMinutes = null, taskId = null) {
    currentActiveTaskId = taskId;
    sessionActive = true;
    sessionPausedForDistraction = false;
    sessionPausedManual = false;
    sessionOnBreak = false;
    currentActiveTaskTitle = title;
    
    let targetMins = 25;
    if (customDurationMinutes && customDurationMinutes > 0) {
        targetMins = customDurationMinutes;
    } else {
        try {
            const raw = localStorage.getItem('productometer_chrono_planner_list');
            if (raw) {
                const list = JSON.parse(raw);
                const found = list.find(t => (t.id === taskId || t.title === title || t.name === title));
                if (found) {
                    const d = parseFloat(found.durationMinutes || found.durationMin || found.duration);
                    if (d > 0) targetMins = d;
                }
            }
        } catch (e) {}
    }

    timeRemaining = Math.round(targetMins * 60);
    syncSessionStateToStorage();

    if (window.NativeBridge && window.NativeBridge.isAvailable()) {
        try {
            if (window.NativeBridge.stopAlarm) window.NativeBridge.stopAlarm();
            if (window.NativeBridge.startFocusSession) window.NativeBridge.startFocusSession(title, timeRemaining);
            if (window.NativeBridge.vibrate) window.NativeBridge.vibrate(60);
        } catch (e) {
            console.warn("NativeBridge error:", e);
        }
    }

    const initialM = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const initialS = (timeRemaining % 60).toString().padStart(2, '0');

    const boxContainer = document.getElementById('activeSessionBoxContainer');
    if (boxContainer) {
        boxContainer.innerHTML = `
            <div class="glow-card" style="border: 1.5px solid #ffb300; margin-bottom: 24px; text-align: center;">
                <div class="soft-heading" id="activeSessionHeaderStatus" style="color: #ffb300; margin-bottom: 4px;">Active Session In Progress</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 8px;">${title}</div>
                <div id="liveCountdownClock" class="study-timer-display" style="color: #ffb300; text-shadow: 0 0 20px rgba(255, 179, 0, 0.4); margin-bottom: 14px;">${initialM}:${initialS}</div>
                
                <!-- Primary Session Controls: Pause / Break / Complete -->
                <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;">
                    <button type="button" id="btnSessionPauseResume" onclick="toggleSessionPauseResume()" style="background: rgba(255, 214, 0, 0.15); border: 1px solid #ffd600; color: #ffd600; padding: 7px 16px; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-pause"></i> Pause
                    </button>
                    <button type="button" id="btnSessionTakeBreak" onclick="triggerSessionBreak(5)" style="background: rgba(0, 229, 255, 0.15); border: 1px solid #00e5ff; color: #00e5ff; padding: 7px 16px; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-mug-hot"></i> Take a Break (5m)
                    </button>
                    <button type="button" id="btnSessionEndEarly" onclick="endSessionEarlyPrompt()" style="background: rgba(0, 230, 118, 0.15); border: 1px solid #00e676; color: #00e676; padding: 7px 16px; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-circle-check"></i> Complete
                    </button>
                </div>

                <!-- Duration Adjustment Chips -->
                <div style="display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; opacity: 0.85;">
                    <button type="button" onclick="adjustSessionDuration(25)" style="background: rgba(255,179,0,0.12); border: 1px solid rgba(255,179,0,0.3); color: #ffb300; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">25m</button>
                    <button type="button" onclick="adjustSessionDuration(45)" style="background: rgba(255,179,0,0.12); border: 1px solid rgba(255,179,0,0.3); color: #ffb300; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">45m</button>
                    <button type="button" onclick="adjustSessionDuration(60)" style="background: rgba(255,179,0,0.12); border: 1px solid rgba(255,179,0,0.3); color: #ffb300; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">60m</button>
                    <button type="button" onclick="adjustSessionDuration(90)" style="background: rgba(255,179,0,0.12); border: 1px solid rgba(255,179,0,0.3); color: #ffb300; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">90m</button>
                </div>
            </div>
        `;
    }

    const clockNode = document.getElementById('liveCountdownClock');

    if (currentSessionInterval) clearInterval(currentSessionInterval);

    currentSessionInterval = setInterval(() => {
        if (sessionPausedForDistraction || sessionPausedManual) {
            syncSessionStateToStorage();
            return; 
        }

        if (sessionOnBreak) {
            breakSecondsRemaining--;
            let bm = Math.floor(breakSecondsRemaining / 60).toString().padStart(2, '0');
            let bs = (breakSecondsRemaining % 60).toString().padStart(2, '0');
            if (clockNode) { clockNode.innerText = `${bm}:${bs}`; }
            if (breakSecondsRemaining <= 0) {
                sessionOnBreak = false;
                if (breakAlarm) breakAlarm.play().catch(() => {});
                showCustomModal("☕ Break Finished!", "Hope you are refreshed! Resuming focus session now.", "info");
                const headerStatus = document.getElementById('activeSessionHeaderStatus');
                if (headerStatus) {
                    headerStatus.innerText = 'Active Session In Progress';
                    headerStatus.style.color = '#ffb300';
                }
                if (clockNode) {
                    clockNode.style.color = '#ffb300';
                    clockNode.style.textShadow = '0 0 20px rgba(255, 179, 0, 0.4)';
                }
            }
            syncSessionStateToStorage();
            return;
        }

        timeRemaining--;
        let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        let s = (timeRemaining % 60).toString().padStart(2, '0');
        
        if (clockNode) { clockNode.innerText = `${m}:${s}`; }
        syncSessionStateToStorage();

        if (timeRemaining <= 0) {
            completeActiveSession(false);
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
    
    let saved = parseInt(localStorage.getItem('productometer_daily_study_seconds'), 10) || 0;
    
    // Also include completed study task hours from Day Planner
    let completedPlannerSecs = 0;
    try {
        const raw = localStorage.getItem('productometer_chrono_planner_list');
        if (raw) {
            const list = JSON.parse(raw);
            list.forEach(t => {
                if (t && t.completed) {
                    const cat = (t.category || '').toLowerCase();
                    if (cat === 'academics' || cat === 'study' || cat === 'skills') {
                        const dur = parseFloat(t.durationMin || t.durationMinutes || t.duration) || 25;
                        completedPlannerSecs += Math.round(dur * 60);
                    }
                }
            });
        }
    } catch (e) {}

    return Math.max(saved, completedPlannerSecs);
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
    totalSeconds = getPersistentDailySeconds();
    const timerDisplay = document.getElementById('studyTimerDisplay');
    if (timerDisplay) { timerDisplay.innerText = formatStudyTime(totalSeconds); }
}
updateStudyTimeDisplay();

// Real-time second-by-second study timer accumulation during active sessions
setInterval(() => {
    if (sessionActive && !sessionPausedForDistraction) { 
        totalSeconds++;
        localStorage.setItem('productometer_daily_study_seconds', totalSeconds.toString());
        updateStudyTimeDisplay();
    }
}, 1000);

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

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        renderAcademicTasks();
        updateStudyTimeDisplay();
    }
});
