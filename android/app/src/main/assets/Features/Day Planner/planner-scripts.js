// ========================================================
// PRODUCTOMETER CHRONO PLANNER & TASK BUILDER ENGINE
// ========================================================

// --- GLOBAL STATE VARIABLES ---
let currentSelectedCategoryType = 'academics';
let currentStagedTaskTitle = '';
let activeStartHour = '09';
let activeStartMinute = '00';
let activeDurationHour = '01';
let activeDurationMinute = '00';
let selectedTaskIdForEdit = null;

// --- 📅 DATE-AWARE PLANNER STORAGE ENGINE ---
function getTodayDateKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const todayKey = getTodayDateKey();
let currentSelectedDateKey = todayKey;
let calViewMonth = new Date().getMonth();
let calViewYear = new Date().getFullYear();

function getTasksStorageKey(dateKey) {
    return 'productometer_planner_tasks_' + dateKey;
}

function loadPlannerTasksForDate(dateKey) {
    try {
        const raw = localStorage.getItem(getTasksStorageKey(dateKey));
        if (raw) return JSON.parse(raw);
    } catch (e) {}

    // Fallback for today: check legacy productometer_chrono_planner_list
    if (dateKey === todayKey) {
        try {
            const leg = localStorage.getItem('productometer_chrono_planner_list');
            if (leg) return JSON.parse(leg);
        } catch (e) {}
    }
    return [];
}

function savePlannerTasksForDate(dateKey, tasks) {
    try {
        localStorage.setItem(getTasksStorageKey(dateKey), JSON.stringify(tasks));
        if (dateKey === todayKey) {
            localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(tasks));
        }
        window.dispatchEvent(new Event('storage'));
    } catch (e) {
        console.error("Failed to save tasks for date:", e);
    }
}

function syncUpcomingPlannerAlarms() {
    try {
        if (!window.NativeBridge || !window.NativeBridge.isAvailable()) return;
        const scheduleFn = window.NativeBridge.scheduleAlarm || window.NativeBridge.scheduleTaskAlarm;
        if (!scheduleFn) return;

        const dateParts = currentSelectedDateKey.split('-').map(Number);
        const nowMs = Date.now();

        (plannerListData || []).forEach(task => {
            if (task && task.reminder !== false && !task.completed) {
                const schedH = Math.floor(task.startMin / 60);
                const schedM = task.startMin % 60;
                const schedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], schedH, schedM, 0);
                if (schedDate.getTime() > nowMs) {
                    scheduleFn.call(window.NativeBridge, task.id, task.title, task.timeDisplayStr || `${schedH}:${schedM < 10 ? '0' : ''}${schedM}`, schedDate.getTime());
                }
            }
        });
    } catch (e) {
        console.warn("[DayPlanner] Error syncing upcoming alarms:", e);
    }
}

let plannerListData = loadPlannerTasksForDate(currentSelectedDateKey);
syncUpcomingPlannerAlarms();

// --- 🌙 AUTOMATIC MIDNIGHT CHECK HANDLER ---
function checkAndResetPlannerForNewDay() {
    const lastActiveDateKey = 'productometer_last_active_date';
    const currentDateStr = new Date().toDateString();
    const lastSavedDate = localStorage.getItem(lastActiveDateKey);

    if (lastSavedDate && lastSavedDate !== currentDateStr) {
        // Date rolled over: if viewing today, refresh
        if (currentSelectedDateKey === lastSavedDate) {
            currentSelectedDateKey = getTodayDateKey();
            plannerListData = loadPlannerTasksForDate(currentSelectedDateKey);
            synchronizeLegacyTimelineArray();
            renderChronologicalMasterTimelineGrid();
        }
    }
    localStorage.setItem(lastActiveDateKey, currentDateStr);
}
checkAndResetPlannerForNewDay();

// Persistent Custom Tasks Storage Setup
let permanentCustomTasks = {
    academics: [],
    skills: [],
    health: [],
    other: []
};
try {
    const savedPerm = localStorage.getItem('productometer_permanent_custom_tasks');
    if (savedPerm) permanentCustomTasks = { ...permanentCustomTasks, ...JSON.parse(savedPerm) };
} catch (e) {}

const baseColors = {
    academics: '#00e5ff',
    skills: '#ffb300',
    health: '#00e676',
    other: '#d500f9'
};

const extendedPalette = ['#ff5252', '#7c4dff', '#00bcd4', '#ff4081', '#69f0ae', '#e040fb', '#18ffff'];

// --- DOM ELEMENT REFERENCES ---
const openTaskDialogBtn = document.getElementById('openTaskDialogBtn');
const openEditTaskDialogBtn = document.getElementById('openEditTaskDialogBtn');
const taskBuilderDialog = document.getElementById('taskBuilderDialog');
const taskDescriptionInput = document.getElementById('taskDescriptionInput');
const addToPlannerBtn = document.getElementById('addToPlannerBtn');
const addToPlannerBtnText = document.getElementById('addToPlannerBtnText');
const taskBuilderDeckTitle = document.getElementById('taskBuilderDeckTitle');
const taskErrorNotice = document.getElementById('taskErrorNotice');
const taskErrorMessage = document.getElementById('taskErrorMessage');
const plannerTaskBucket = document.getElementById('plannerTaskBucket');
const masterNeonFillTrack = document.getElementById('masterNeonFillTrack');

const wheelStartHours = document.getElementById('wheelStartHours');
const wheelStartMinutes = document.getElementById('wheelStartMinutes');
const wheelDurationHours = document.getElementById('wheelDurationHours');
const wheelDurationMinutes = document.getElementById('wheelDurationMinutes');

const customTaskModal = document.getElementById('customTaskModal');
const customTaskTitleInput = document.getElementById('customTaskTitleInput');
const savePermanentCheckbox = document.getElementById('savePermanentCheckbox');
const taskConfirmBtn = document.getElementById('taskConfirmBtn');
const taskCancelBtn = document.getElementById('taskCancelBtn');

// --- 🔔 TASK REMINDER TOGGLE BADGE ENGINE ---
let activeReminderSetting = true;
const taskReminderToggleBtn = document.getElementById('taskReminderToggleBtn');
const taskReminderIcon = document.getElementById('taskReminderIcon');
const taskReminderStateLabel = document.getElementById('taskReminderStateLabel');

function updateReminderBadgeUI() {
    if (!taskReminderToggleBtn || !taskReminderStateLabel) return;
    if (activeReminderSetting) {
        taskReminderToggleBtn.className = 'reminder-toggle-badge is-on';
        if (taskReminderIcon) taskReminderIcon.className = 'fa-solid fa-bell';
        taskReminderStateLabel.textContent = 'Reminder ON';
    } else {
        taskReminderToggleBtn.className = 'reminder-toggle-badge is-off';
        if (taskReminderIcon) taskReminderIcon.className = 'fa-solid fa-bell-slash';
        taskReminderStateLabel.textContent = 'Reminder OFF';
    }
}

if (taskReminderToggleBtn) {
    taskReminderToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activeReminderSetting = !activeReminderSetting;
        updateReminderBadgeUI();
        if (window.NativeBridge && window.NativeBridge.vibrate) {
            window.NativeBridge.vibrate(30);
        }
    });
}

// --- INITIALIZATION ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    rebuildCategoryPresetButtons();
    renderChronologicalMasterTimelineGrid();
    setupCategoryTabs();
    setupDialogBackdropDismiss();
    ensureDrumsInitialized();
    updateReminderBadgeUI();
});

// Safe helper to open modal without throwing InvalidStateError
function safeShowModal(dlg) {
    if (!dlg) return;
    if (dlg.open) return;
    try {
        if (typeof dlg.showModal === 'function') {
            dlg.showModal();
        } else {
            dlg.setAttribute('open', '');
        }
    } catch (err) {
        console.warn('safeShowModal fallback:', err);
        dlg.setAttribute('open', '');
    }
}

// --- 🗂️ DIALOG OPEN/CLOSE HANDLERS ---
if (openTaskDialogBtn && taskBuilderDialog) {
    openTaskDialogBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openTaskBuilderForAdd();
    });
}

function openTaskBuilderForAdd() {
    selectedTaskIdForEdit = null;
    currentStagedTaskTitle = '';
    if (taskDescriptionInput) taskDescriptionInput.value = '';
    if (taskErrorNotice) taskErrorNotice.style.display = 'none';

    if (taskBuilderDeckTitle) taskBuilderDeckTitle.textContent = "Configure Target Objective Parameters";
    if (addToPlannerBtnText) addToPlannerBtnText.textContent = "Add To Planner Track";

    activeReminderSetting = true;
    updateReminderBadgeUI();

    // Set defaults: 09:00 AM, 1 Hour Duration
    activeStartHour = '09';
    activeStartMinute = '00';
    activeDurationHour = '01';
    activeDurationMinute = '00';

    // Clear active preset buttons
    document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));

    // Ensure wheels exist (instantly builds once, never lags or thrashes DOM on re-open)
    ensureDrumsInitialized();

    // Instant modal display
    safeShowModal(taskBuilderDialog);

    // Snap drum wheel values immediately
    syncAllDrumWheels(false);
}

// Click outside dialog to dismiss (safe against sub-pixel scaling and inner element taps)
function setupDialogBackdropDismiss() {
    [taskBuilderDialog, customTaskModal].forEach(dlg => {
        if (!dlg) return;
        dlg.addEventListener('click', (e) => {
            // Only dismiss if the click target is directly the dialog backdrop
            if (e.target === dlg) {
                const rect = dlg.getBoundingClientRect();
                const isInDialog = (
                    rect.top <= e.clientY && e.clientY <= rect.bottom &&
                    rect.left <= e.clientX && e.clientX <= rect.right
                );
                if (!isInDialog) {
                    if (typeof dlg.close === 'function') dlg.close();
                    else dlg.removeAttribute('open');
                }
            }
        });
    });

    if (taskBuilderDialog) {
        taskBuilderDialog.addEventListener('close', () => {
            selectedTaskIdForEdit = null;
            if (taskErrorNotice) taskErrorNotice.style.display = 'none';
        });
    }
}

// --- 🗂️ CATEGORY TABS SWITCHING LOGIC ---
function setupCategoryTabs() {
    const tabButtons = document.querySelectorAll('.type-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetType = btn.dataset.type;
            currentSelectedCategoryType = targetType;
            currentStagedTaskTitle = '';

            // Hide all sub-button rows, show selected
            document.querySelectorAll('.sub-buttons-row').forEach(row => {
                row.style.display = 'none';
            });
            const targetRow = document.getElementById(`options-${targetType}`);
            if (targetRow) targetRow.style.display = 'flex';

            // Update container glow class
            const startContainer = document.getElementById('startDrumContainer');
            if (startContainer) {
                startContainer.className = `skeuo-3d-drum-container ${targetType}-glow-aura`;
            }
        });
    });
}

// --- 🌀 DRUM WHEELS ENGINE WITH CLICK & SCROLL SUPPORT ---
let drumsInitialized = false;

function ensureDrumsInitialized() {
    if (drumsInitialized) return;
    buildDrumTrack(wheelStartHours, 24, 1, 'sh', activeStartHour);
    buildDrumTrack(wheelStartMinutes, 60, 5, 'sm', activeStartMinute);
    buildDrumTrack(wheelDurationHours, 24, 1, 'dh', activeDurationHour);
    buildDrumTrack(wheelDurationMinutes, 60, 5, 'dm', activeDurationMinute);
    drumsInitialized = true;
}

function initializeTouchDrumsMatrix() {
    drumsInitialized = false;
    ensureDrumsInitialized();
}

function syncAllDrumWheels(smooth = false) {
    setDrumWheelValue(wheelStartHours, 'sh', activeStartHour, smooth);
    setDrumWheelValue(wheelStartMinutes, 'sm', activeStartMinute, smooth);
    setDrumWheelValue(wheelDurationHours, 'dh', activeDurationHour, smooth);
    setDrumWheelValue(wheelDurationMinutes, 'dm', activeDurationMinute, smooth);
}

function buildDrumTrack(wheelContainer, totalSlots, step, type, initialVal) {
    if (!wheelContainer) return;
    const track = wheelContainer.querySelector('.wheel-scroll-track-drum');
    if (!track) return;
    track.innerHTML = "";

    const itemHeight = 38;

    // Build the tick items
    for (let v = 0; v < totalSlots; v += step) {
        const padStr = v.toString().padStart(2, '0');
        const tick = document.createElement('div');
        tick.classList.add('wheel-tick-node');
        tick.dataset.val = padStr;
        tick.textContent = padStr;
        if (padStr === initialVal) {
            tick.classList.add('selected-time');
        }

        // Direct Click selection on any number
        tick.addEventListener('click', (e) => {
            e.stopPropagation();
            selectDrumValue(wheelContainer, type, padStr, true);
        });

        track.appendChild(tick);
    }

    // Scroll listener with debounce to snap to closest tick
    let scrollDebounce = null;
    let isProgrammaticScroll = false;

    wheelContainer._isProgrammaticScroll = () => isProgrammaticScroll;
    wheelContainer._setProgrammaticScroll = (v) => { isProgrammaticScroll = v; };

    wheelContainer.onscroll = () => {
        if (isProgrammaticScroll) return;

        clearTimeout(scrollDebounce);
        scrollDebounce = setTimeout(() => {
            const containerCenter = wheelContainer.scrollTop + (wheelContainer.clientHeight / 2);
            const nodes = track.querySelectorAll('.wheel-tick-node');
            let closestNode = null;
            let minDistance = Infinity;

            nodes.forEach(node => {
                const nodeCenter = node.offsetTop + (node.clientHeight / 2);
                const dist = Math.abs(containerCenter - nodeCenter);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestNode = node;
                }
            });

            if (closestNode) {
                const val = closestNode.dataset.val;
                nodes.forEach(n => n.classList.remove('selected-time'));
                closestNode.classList.add('selected-time');

                updateActiveValue(type, val);

                // Smoothly snap to center
                isProgrammaticScroll = true;
                wheelContainer.scrollTo({
                    top: closestNode.offsetTop - itemHeight,
                    behavior: 'smooth'
                });
                setTimeout(() => { isProgrammaticScroll = false; }, 150);
            }
        }, 60);
    };

    // Wheel event handler for mouse wheel
    wheelContainer.onwheel = (e) => {
        e.preventDefault();
        const dir = e.deltaY > 0 ? 1 : -1;
        wheelContainer.scrollBy({ top: dir * itemHeight, behavior: 'smooth' });
    };
}

function updateActiveValue(type, val) {
    if (type === 'sh') activeStartHour = val;
    else if (type === 'sm') activeStartMinute = val;
    else if (type === 'dh') activeDurationHour = val;
    else if (type === 'dm') activeDurationMinute = val;
}

function selectDrumValue(wheelContainer, type, targetValStr, smooth = false) {
    if (!wheelContainer) return;
    const track = wheelContainer.querySelector('.wheel-scroll-track-drum');
    if (!track) return;

    const nodes = track.querySelectorAll('.wheel-tick-node');
    let targetNode = null;

    nodes.forEach(n => {
        if (n.dataset.val === targetValStr || n.textContent.trim() === targetValStr) {
            targetNode = n;
        }
    });

    if (targetNode) {
        nodes.forEach(n => n.classList.remove('selected-time'));
        targetNode.classList.add('selected-time');
        if (type) updateActiveValue(type, targetValStr);

        if (wheelContainer._setProgrammaticScroll) wheelContainer._setProgrammaticScroll(true);
        wheelContainer.scrollTo({
            top: targetNode.offsetTop - 38,
            behavior: smooth ? 'smooth' : 'auto'
        });
        setTimeout(() => {
            if (wheelContainer._setProgrammaticScroll) wheelContainer._setProgrammaticScroll(false);
        }, 100);
    }
}

function setDrumWheelValue(wheelContainer, type, targetValueStr, smooth = false) {
    // Supports both (wheelContainer, targetStr) and (wheelContainer, type, targetStr, smooth)
    if (typeof targetValueStr === 'undefined') {
        selectDrumValue(wheelContainer, null, type, false);
    } else {
        selectDrumValue(wheelContainer, type, targetValueStr, smooth);
    }
}

// --- 🛠️ PERMANENT CUSTOM TASKS & PRESET RENDERING ---
function rebuildCategoryPresetButtons() {
    ['academics', 'skills', 'health', 'other'].forEach(categoryType => {
        const container = document.getElementById(`options-${categoryType}`);
        if (!container) return;

        const existingCustomButtons = container.querySelectorAll('.dynamic-custom-preset-btn');
        existingCustomButtons.forEach(btn => btn.remove());

        const customTaskTriggerBtn = container.querySelector('.custom-task-btn');

        if (permanentCustomTasks[categoryType]) {
            permanentCustomTasks[categoryType].forEach(taskName => {
                const presetBtn = document.createElement('button');
                presetBtn.type = 'button';
                presetBtn.className = 'dynamic-custom-preset-btn';
                presetBtn.dataset.task = taskName;
                presetBtn.innerHTML = `
                    <span>${taskName}</span>
                    <span class="delete-preset-x" title="Delete Category Option" data-category="${categoryType}" data-task="${taskName}">&times;</span>
                `;

                presetBtn.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-preset-x')) {
                        e.stopPropagation();
                        deletePermanentCategoryTask(categoryType, taskName);
                        return;
                    }
                    e.preventDefault();
                    document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
                    presetBtn.classList.add('active-preset-highlight');
                    currentStagedTaskTitle = taskName;
                });

                if (customTaskTriggerBtn) {
                    container.insertBefore(presetBtn, customTaskTriggerBtn);
                } else {
                    container.appendChild(presetBtn);
                }
            });
        }
    });
}

function deletePermanentCategoryTask(category, taskName) {
    if (!confirm(`Are you sure you want to delete the permanent preset "${taskName}"?`)) return;
    permanentCustomTasks[category] = (permanentCustomTasks[category] || []).filter(t => t !== taskName);
    localStorage.setItem('productometer_permanent_custom_tasks', JSON.stringify(permanentCustomTasks));
    rebuildCategoryPresetButtons();
}

// --- 🎯 INTERCEPT PRESET TAPS ---
document.addEventListener('click', (e) => {
    const targetBtn = e.target.closest('.sub-buttons-row button');
    if (!targetBtn) return;

    if (e.target.classList.contains('delete-preset-x')) return;

    const label = targetBtn.dataset.task || targetBtn.textContent.trim();

    if (targetBtn.classList.contains('custom-task-btn') || label.toLowerCase().includes('custom')) {
        // Open Custom Task Modal
        if (customTaskModal && customTaskTitleInput) {
            customTaskTitleInput.value = "";
            if (savePermanentCheckbox) savePermanentCheckbox.checked = false;

            if (typeof customTaskModal.showModal === 'function') {
                customTaskModal.showModal();
            } else {
                customTaskModal.setAttribute('open', '');
            }
            customTaskTitleInput.focus();
        }
    } else if (!targetBtn.classList.contains('dynamic-custom-preset-btn')) {
        // Standard built-in static preset button clicks
        document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
        targetBtn.classList.add('active-preset-highlight');
        currentStagedTaskTitle = label;
    }
});

// --- 💾 CONFIRM CUSTOM TASK CREATION ---
if (taskConfirmBtn && customTaskTitleInput) {
    taskConfirmBtn.addEventListener('click', () => {
        const label = customTaskTitleInput.value.trim();
        if (!label) {
            customTaskTitleInput.focus();
            return;
        }

        currentStagedTaskTitle = label;

        // Save permanently if checkbox is checked
        if (savePermanentCheckbox && savePermanentCheckbox.checked) {
            if (!permanentCustomTasks[currentSelectedCategoryType]) {
                permanentCustomTasks[currentSelectedCategoryType] = [];
            }
            if (!permanentCustomTasks[currentSelectedCategoryType].includes(label)) {
                permanentCustomTasks[currentSelectedCategoryType].push(label);
                localStorage.setItem('productometer_permanent_custom_tasks', JSON.stringify(permanentCustomTasks));
                rebuildCategoryPresetButtons();
            }
        }

        if (customTaskModal) {
            if (typeof customTaskModal.close === 'function') customTaskModal.close();
            else customTaskModal.removeAttribute('open');
        }

        document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
        const customBtn = document.querySelector(`#options-${currentSelectedCategoryType} .custom-task-btn`);
        if (customBtn) customBtn.classList.add('active-preset-highlight');
    });
}

if (taskCancelBtn) {
    taskCancelBtn.addEventListener('click', () => {
        if (customTaskModal) {
            if (typeof customTaskModal.close === 'function') customTaskModal.close();
            else customTaskModal.removeAttribute('open');
        }
    });
}

// --- 🚨 MASTER ADD/EDIT LINK SAVE TRANSACTION WITH COLLISION BUFFER CHECK ---
if (addToPlannerBtn) {
    addToPlannerBtn.addEventListener('click', () => {
        let finalTitle = currentStagedTaskTitle.trim();
        if (!finalTitle) {
            const desc = taskDescriptionInput ? taskDescriptionInput.value.trim() : '';
            if (desc) {
                finalTitle = desc;
            } else {
                finalTitle = currentSelectedCategoryType === 'other' ? "ROUTINE TASK" : `${currentSelectedCategoryType.toUpperCase()} ACTIVITY`;
            }
        }

        const startMin = (parseInt(activeStartHour, 10) * 60) + parseInt(activeStartMinute, 10);
        const durationMin = (parseInt(activeDurationHour, 10) * 60) + parseInt(activeDurationMinute, 10);

        if (durationMin <= 0) {
            showError("Duration length cannot be zero minutes! Please set at least 5 minutes.");
            return;
        }
        if (startMin + durationMin > 1440) {
            showError("Scheduled block overflows past midnight daily bounds! Please reduce duration or adjust start time.");
            return;
        }

        const newEndMin = startMin + durationMin;

        // 🛡️ BIDIRECTIONAL 5-MINUTE BUFFER COLLISION CHECK
        const conflictingTask = plannerListData.find(task => {
            if (selectedTaskIdForEdit && task.id === selectedTaskIdForEdit) return false;

            const existingStart = task.startMin;
            const existingEnd = task.startMin + task.durationMin;

            return (existingStart < newEndMin + 5) && (existingEnd > startMin - 5);
        });

        if (conflictingTask) {
            const conflictStart = conflictingTask.startMin;
            const conflictEnd = conflictingTask.startMin + conflictingTask.durationMin;

            if (startMin >= conflictStart) {
                const minAllowedStart = conflictEnd + 5;
                const minAllowedHours = Math.floor(minAllowedStart / 60).toString().padStart(2, '0');
                const minAllowedMins = (minAllowedStart % 60).toString().padStart(2, '0');
                showError(`Tasks need a 5-minute gap! Conflicts with "${conflictingTask.title}". Earliest start time is ${minAllowedHours}:${minAllowedMins}.`);
            } else {
                const maxAllowedDurationMins = (conflictStart - 5) - startMin;
                const maxHours = Math.floor(maxAllowedDurationMins / 60);
                const maxMins = maxAllowedDurationMins % 60;
                showError(`Collision with upcoming task "${conflictingTask.title}"! Maximum possible duration is ${maxHours}h ${maxMins}m.`);
            }
            return;
        } else {
            if (taskErrorNotice) taskErrorNotice.style.display = 'none';
        }

        let assignedThemeColor = baseColors[currentSelectedCategoryType] || '#78909c';
        if (currentSelectedCategoryType === 'other') {
            const count = plannerListData.filter(t => t.category === 'other' && t.id !== selectedTaskIdForEdit).length;
            assignedThemeColor = extendedPalette[count % extendedPalette.length];
        }

        const optionalDesc = taskDescriptionInput ? taskDescriptionInput.value.trim() : "";
        const formattedTime = `${activeStartHour.toString().padStart(2, '0')}:${activeStartMinute.toString().padStart(2, '0')}`;

        let savedTaskObj = null;

        if (selectedTaskIdForEdit) {
            // 🔄 EDIT MODE: Update existing task object
            const taskIndex = plannerListData.findIndex(t => t.id === selectedTaskIdForEdit);
            if (taskIndex !== -1) {
                plannerListData[taskIndex] = {
                    ...plannerListData[taskIndex],
                    title: finalTitle.toUpperCase(),
                    category: currentSelectedCategoryType,
                    color: assignedThemeColor,
                    startMin: startMin,
                    durationMin: durationMin,
                    timeDisplayStr: formattedTime,
                    time: formattedTime,
                    durationMinutes: durationMin,
                    reminder: activeReminderSetting,
                    description: optionalDesc || plannerListData[taskIndex].description || `Objective mapped for your daily ${currentSelectedCategoryType} routine timeline.`
                };
                savedTaskObj = plannerListData[taskIndex];
            }
            selectedTaskIdForEdit = null;
        } else {
            // ➕ CREATE MODE: Push new task object
            const newPlannerItem = {
                id: 'chrono_' + Date.now(),
                title: finalTitle.toUpperCase(),
                category: currentSelectedCategoryType,
                color: assignedThemeColor,
                startMin: startMin,
                durationMin: durationMin,
                timeDisplayStr: formattedTime,
                time: formattedTime,
                durationMinutes: durationMin,
                completed: false,
                reminder: activeReminderSetting,
                description: optionalDesc || `Objective mapped for your daily ${currentSelectedCategoryType} routine timeline.`
            };
            plannerListData.push(newPlannerItem);
            savedTaskObj = newPlannerItem;
        }

        // 🔔 Safe Native Alarm Integration honoring Reminder setting
        try {
            if (window.NativeBridge && window.NativeBridge.isAvailable() && savedTaskObj) {
                if (savedTaskObj.reminder) {
                    const startH = parseInt(activeStartHour, 10) || 0;
                    const startM = parseInt(activeStartMinute, 10) || 0;
                    const dateParts = currentSelectedDateKey.split('-').map(Number);
                    const schedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], startH, startM, 0);
                    if (schedDate.getTime() > Date.now()) {
                        const scheduleFn = window.NativeBridge.scheduleAlarm || window.NativeBridge.scheduleTaskAlarm;
                        if (scheduleFn) {
                            scheduleFn.call(window.NativeBridge, savedTaskObj.id, savedTaskObj.title, savedTaskObj.timeDisplayStr, schedDate.getTime());
                        }
                    }
                } else {
                    const cancelFn = window.NativeBridge.cancelAlarm || window.NativeBridge.cancelTaskAlarm;
                    if (cancelFn) {
                        cancelFn.call(window.NativeBridge, savedTaskObj.id);
                    }
                }
                if (window.NativeBridge.vibrate) window.NativeBridge.vibrate(40);
            }
        } catch (alarmErr) {
            console.warn("[DayPlanner] Alarm notice:", alarmErr);
        }

        plannerListData.sort((a, b) => a.startMin - b.startMin);
        savePlannerTasksForDate(currentSelectedDateKey, plannerListData);
        try { window.dispatchEvent(new Event('storage')); } catch (e) {}

        synchronizeLegacyTimelineArray();
        renderChronologicalMasterTimelineGrid();

        currentStagedTaskTitle = "";
        if (taskDescriptionInput) taskDescriptionInput.value = "";
        document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));

        resetEditButtonState();

        if (taskBuilderDialog) {
            if (typeof taskBuilderDialog.close === 'function') taskBuilderDialog.close();
            else taskBuilderDialog.removeAttribute('open');
        }
    });
}

function showError(msg) {
    if (taskErrorNotice && taskErrorMessage) {
        taskErrorMessage.textContent = msg;
        taskErrorNotice.style.display = 'flex';
        taskErrorNotice.classList.remove('hidden');
    } else {
        alert(msg);
    }
}

function resetEditButtonState() {
    selectedTaskIdForEdit = null;
    if (openEditTaskDialogBtn) {
        openEditTaskDialogBtn.style.opacity = '0.5';
        openEditTaskDialogBtn.style.pointerEvents = 'none';
        openEditTaskDialogBtn.setAttribute('disabled', 'true');
    }
}

// --- 📊 RENDER TIMELINE & SYNC ---
function renderChronologicalMasterTimelineGrid() {
    if (!plannerTaskBucket || !masterNeonFillTrack) return;
    plannerTaskBucket.innerHTML = "";
    masterNeonFillTrack.innerHTML = "";

    if (plannerListData.length === 0) {
        plannerTaskBucket.innerHTML = `<p class="todo-empty-placeholder">Your Day Planner track is empty. Click 'Add Tasks' to block out your routine!</p>`;
        return;
    }

    plannerListData.forEach(task => {
        const card = document.createElement('div');
        card.classList.add('chrono-task-card');
        if (task.completed) card.classList.add('task-done');
        card.setAttribute('data-task-id', task.id);
        if (selectedTaskIdForEdit === task.id) card.classList.add('selected-for-edit');
        card.style.borderColor = task.completed ? '#00e676' : ((task.color || '#00e5ff') + '55');
        card.style.boxShadow = task.completed
            ? '0 0 25px rgba(0, 230, 118, 0.25), inset 0 0 15px rgba(0, 230, 118, 0.15)'
            : `0 0 25px ${(task.color || '#00e5ff')}15, inset 0 0 15px ${(task.color || '#00e5ff')}10`;

        const isDone = !!task.completed;
        const isReminderOn = task.reminder !== false;
        card.innerHTML = `
            <button type="button" class="chrono-task-complete-btn ${isDone ? 'is-completed' : ''}" title="${isDone ? 'Mark Incomplete' : 'Mark Completed (+50 pts)'}">
                <i class="${isDone ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
            </button>
            <div class="card-time-badge" style="color: ${task.color || '#00e5ff'}; border-color: ${(task.color || '#00e5ff')}33;">${task.timeDisplayStr}</div>
            <div class="card-info-stack">
                <div class="card-main-title ${isDone ? 'completed-title' : ''}">
                    ${task.title}
                    ${isDone ? '<span class="task-done-badge"><i class="fa-solid fa-check"></i> +50 pts Done</span>' : ''}
                </div>
                <div class="card-sub-description">${task.description} (${(task.durationMin / 60).toFixed(1)}h)</div>
            </div>
            <button type="button" class="card-reminder-pill ${isReminderOn ? 'reminder-active' : 'reminder-muted'}" title="${isReminderOn ? 'Alarm Reminder: ON (Tap to Mute)' : 'Alarm Reminder: OFF (Tap to Enable)'}">
                <i class="${isReminderOn ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash'}"></i>
            </button>
            <button type="button" class="delete-chrono-item-btn" title="Delete Task">&times;</button>
        `;

        // Interactive Reminder Toggle directly on Card
        const reminderBtn = card.querySelector('.card-reminder-pill');
        if (reminderBtn) {
            reminderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                task.reminder = (task.reminder === false) ? true : false;

                if (window.NativeBridge && window.NativeBridge.isAvailable()) {
                    if (task.reminder) {
                        const schedH = Math.floor(task.startMin / 60);
                        const schedM = task.startMin % 60;
                        const dateParts = currentSelectedDateKey.split('-').map(Number);
                        const schedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], schedH, schedM, 0);
                        if (schedDate.getTime() > Date.now()) {
                            const scheduleFn = window.NativeBridge.scheduleAlarm || window.NativeBridge.scheduleTaskAlarm;
                            if (scheduleFn) {
                                scheduleFn.call(window.NativeBridge, task.id, task.title, task.timeDisplayStr, schedDate.getTime());
                            }
                        }
                    } else {
                        const cancelFn = window.NativeBridge.cancelAlarm || window.NativeBridge.cancelTaskAlarm;
                        if (cancelFn) {
                            cancelFn.call(window.NativeBridge, task.id);
                        }
                    }
                    if (window.NativeBridge.vibrate) window.NativeBridge.vibrate(30);
                }

                savePlannerTasksForDate(currentSelectedDateKey, plannerListData);
                try { window.dispatchEvent(new Event('storage')); } catch (err) {}
                renderChronologicalMasterTimelineGrid();
            });
        }

        // Interactive Completion Toggle
        const completeBtn = card.querySelector('.chrono-task-complete-btn');
        if (completeBtn) {
            completeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                task.completed = !task.completed;
                savePlannerTasksForDate(currentSelectedDateKey, plannerListData);
                try { window.dispatchEvent(new Event('storage')); } catch (err) {}

                // Play tactile completion chime
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(task.completed ? 880 : 440, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.3);
                } catch (audioErr) {}

                if (window.NativeBridge && window.NativeBridge.vibrate) {
                    window.NativeBridge.vibrate(40);
                }

                synchronizeLegacyTimelineArray();
                renderChronologicalMasterTimelineGrid();
            });
        }

        // Desktop Double Click
        card.addEventListener('dblclick', () => {
            selectTaskForEditing(task);
            if (openEditTaskDialogBtn) openEditTaskDialogBtn.click();
        });

        // Touch Long Press (Mobile - 600ms hold)
        let pressTimer = null;
        card.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                selectTaskForEditing(task);
                if (openEditTaskDialogBtn) openEditTaskDialogBtn.click();
            }, 600);
        });
        card.addEventListener('touchend', () => clearTimeout(pressTimer));
        card.addEventListener('touchmove', () => clearTimeout(pressTimer));

        // Single click selects card for editing
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-chrono-item-btn')) return;
            selectTaskForEditing(task);
        });

        card.querySelector('.delete-chrono-item-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedTaskIdForEdit === task.id) resetEditButtonState();
            plannerListData = plannerListData.filter(t => t.id !== task.id);
            if (window.NativeBridge && window.NativeBridge.isAvailable()) {
                const cancelFn = window.NativeBridge.cancelAlarm || window.NativeBridge.cancelTaskAlarm;
                if (cancelFn) {
                    cancelFn.call(window.NativeBridge, task.id);
                }
                if (window.NativeBridge.vibrate) window.NativeBridge.vibrate(25);
            }
            savePlannerTasksForDate(currentSelectedDateKey, plannerListData);
            try { window.dispatchEvent(new Event('storage')); } catch (e) {}
            synchronizeLegacyTimelineArray();
            renderChronologicalMasterTimelineGrid();
        });

        plannerTaskBucket.appendChild(card);

        // Progress segment
        const left = (task.startMin / 1440) * 100;
        const width = (task.durationMin / 1440) * 100;
        const segment = document.createElement('div');
        segment.classList.add('chrono-color-segment');
        segment.style.left = `${left}%`;
        segment.style.width = `${width}%`;
        segment.style.backgroundColor = task.color || '#00e5ff';
        segment.style.boxShadow = `0 0 15px ${task.color || '#00e5ff'}, inset 0 0 6px rgba(0,0,0,0.3)`;
        masterNeonFillTrack.appendChild(segment);
    });
}

function synchronizeLegacyTimelineArray() {
    const legacyTimelineArray = Array(48).fill(null);
    plannerListData.forEach(task => {
        const startSlotIndex = Math.floor(task.startMin / 30);
        const slotCountSpan = Math.round(task.durationMin / 30);
        for (let s = 0; s < slotCountSpan; s++) {
            if (startSlotIndex + s < 48) legacyTimelineArray[startSlotIndex + s] = task.category;
        }
    });
    localStorage.setItem('productometer_timeline', JSON.stringify(legacyTimelineArray));
}

// --- ✏️ TASK EDITING & SELECTION STATE MANAGEMENT ---
function convertMinutesToHourMinute(totalMins) {
    const hrs = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const mins = (totalMins % 60).toString().padStart(2, '0');
    return { hours: hrs, minutes: mins };
}

function selectTaskForEditing(task) {
    selectedTaskIdForEdit = task.id;

    document.querySelectorAll('.chrono-task-card').forEach(c => c.classList.remove('selected-for-edit'));
    const targetCard = document.querySelector(`[data-task-id="${task.id}"]`);
    if (targetCard) targetCard.classList.add('selected-for-edit');

    if (openEditTaskDialogBtn) {
        openEditTaskDialogBtn.style.opacity = '1';
        openEditTaskDialogBtn.style.pointerEvents = 'auto';
        openEditTaskDialogBtn.removeAttribute('disabled');
    }
}

// Global click outside cards deselects edit target
document.addEventListener('click', (e) => {
    if (!e.target.closest('.chrono-task-card') &&
        !e.target.closest('#openEditTaskDialogBtn') &&
        !e.target.closest('#taskBuilderDialog')) {
        document.querySelectorAll('.chrono-task-card').forEach(c => c.classList.remove('selected-for-edit'));
        resetEditButtonState();
    }
});

// --- ✏️ OPEN EDIT DIALOG PRE-FILLED WITH COMPLETE TASK DATA ---
let isOpeningEditDialog = false;

if (openEditTaskDialogBtn) {
    openEditTaskDialogBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedTaskIdForEdit) return;
        const taskToEdit = plannerListData.find(t => t.id === selectedTaskIdForEdit);
        if (!taskToEdit) return;

        if (taskBuilderDeckTitle) taskBuilderDeckTitle.textContent = "Edit Scheduled Activity";
        if (addToPlannerBtnText) addToPlannerBtnText.textContent = "Save Changes";
        if (taskErrorNotice) taskErrorNotice.style.display = 'none';

        currentSelectedCategoryType = taskToEdit.category || 'academics';
        document.querySelectorAll('.type-tab-btn').forEach(b => {
            if (b.dataset.type === currentSelectedCategoryType) b.classList.add('active');
            else b.classList.remove('active');
        });

        document.querySelectorAll('.sub-buttons-row').forEach(row => { row.style.display = 'none'; });
        const activeRow = document.getElementById(`options-${currentSelectedCategoryType}`);
        if (activeRow) activeRow.style.display = 'flex';

        currentStagedTaskTitle = taskToEdit.title;
        if (taskDescriptionInput) taskDescriptionInput.value = taskToEdit.description || "";

        document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
        const matchingBtn = document.querySelector(`.sub-buttons-row button[data-task="${taskToEdit.title}"]`);
        if (matchingBtn) {
            matchingBtn.classList.add('active-preset-highlight');
        } else {
            const customBtn = document.querySelector(`#options-${currentSelectedCategoryType} .custom-task-btn`);
            if (customBtn) customBtn.classList.add('active-preset-highlight');
        }

        const startTimeObj = convertMinutesToHourMinute(taskToEdit.startMin);
        const durationTimeObj = convertMinutesToHourMinute(taskToEdit.durationMin);

        activeStartHour = startTimeObj.hours;
        activeStartMinute = startTimeObj.minutes;
        activeDurationHour = durationTimeObj.hours;
        activeDurationMinute = durationTimeObj.minutes;

        activeReminderSetting = taskToEdit.reminder !== false;
        updateReminderBadgeUI();

        ensureDrumsInitialized();
        safeShowModal(taskBuilderDialog);
        syncAllDrumWheels(false);
    });
}


// ========================================================
// 📅 CALENDAR & FUTURE ROUTINE PLANNING CONTROLLER
// ========================================================

function formatFullDateDisplay(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
}

function updateDateRibbonUI() {
    const headlineEl = document.getElementById('plannerDisplayDateText');
    const sublineEl = document.getElementById('plannerDisplayFullDate');
    const builderTargetDateEl = document.getElementById('taskBuilderTargetDate');
    const builderDateInput = document.getElementById('taskBuilderDateInput');

    const [y, m, d] = currentSelectedDateKey.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

    let headline = 'Today';
    if (diffDays === 0) headline = 'Today';
    else if (diffDays === 1) headline = 'Tomorrow';
    else if (diffDays === -1) headline = 'Yesterday';
    else if (diffDays > 1 && diffDays < 7) {
        headline = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
        headline = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    if (headlineEl) headlineEl.textContent = headline;
    if (sublineEl) sublineEl.textContent = formatFullDateDisplay(currentSelectedDateKey);
    if (builderTargetDateEl) builderTargetDateEl.textContent = `${headline} (${currentSelectedDateKey})`;
    if (builderDateInput) builderDateInput.value = currentSelectedDateKey;

    // Highlight matching chip
    document.querySelectorAll('.date-chip[data-offset]').forEach(chip => {
        const offset = parseInt(chip.dataset.offset, 10);
        if (offset === diffDays) chip.classList.add('active');
        else chip.classList.remove('active');
    });
}

function selectPlannerDate(dateKey) {
    resetEditButtonState();
    currentSelectedDateKey = dateKey;
    plannerListData = loadPlannerTasksForDate(currentSelectedDateKey);
    syncUpcomingPlannerAlarms();
    synchronizeLegacyTimelineArray();
    renderChronologicalMasterTimelineGrid();
    updateDateRibbonUI();

    if (window.NativeBridge && window.NativeBridge.vibrate) {
        window.NativeBridge.vibrate(25);
    }
}

function offsetPlannerDate(days) {
    const [y, m, d] = currentSelectedDateKey.split('-').map(Number);
    const target = new Date(y, m - 1, d + days);
    const ny = target.getFullYear();
    const nm = String(target.getMonth() + 1).padStart(2, '0');
    const nd = String(target.getDate()).padStart(2, '0');
    selectPlannerDate(`${ny}-${nm}-${nd}`);
}

function renderCalendarMonthGrid() {
    const monthTitle = document.getElementById('calMonthTitleText');
    const grid = document.getElementById('calDaysGrid');
    if (!monthTitle || !grid) return;

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    monthTitle.textContent = `${monthNames[calViewMonth]} ${calViewYear}`;
    grid.innerHTML = "";

    const firstDayIndex = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calViewYear, calViewMonth, 0).getDate();

    // Days from prev month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dNum = daysInPrevMonth - i;
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell other-month';
        cell.textContent = dNum;
        grid.appendChild(cell);
    }

    // Days in current month
    const todayStr = getTodayDateKey();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        const dayKey = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cell.className = 'cal-day-cell';
        cell.textContent = d;

        if (dayKey === todayStr) cell.classList.add('today');
        if (dayKey === currentSelectedDateKey) cell.classList.add('selected');

        // Check if date has tasks scheduled
        const tasksForDay = loadPlannerTasksForDate(dayKey);
        if (tasksForDay && tasksForDay.length > 0) {
            const dot = document.createElement('span');
            dot.className = 'cal-day-dot';
            cell.appendChild(dot);
        }

        cell.addEventListener('click', () => {
            selectPlannerDate(dayKey);
            const calModal = document.getElementById('plannerCalendarModal');
            if (calModal) {
                if (typeof calModal.close === 'function') calModal.close();
                else calModal.removeAttribute('open');
            }
        });

        grid.appendChild(cell);
    }
}

function setupCalendarControls() {
    const btnPrevDay = document.getElementById('btnPrevDay');
    const btnNextDay = document.getElementById('btnNextDay');
    const btnOpenModal = document.getElementById('btnOpenCalendarModal');
    const btnQuickOpenCal = document.getElementById('btnQuickOpenCal');
    const calModal = document.getElementById('plannerCalendarModal');
    const btnCloseCal = document.getElementById('btnCloseCalModal');
    const btnCalPrevMonth = document.getElementById('btnCalPrevMonth');
    const btnCalNextMonth = document.getElementById('btnCalNextMonth');
    const btnCalToday = document.getElementById('btnCalJumpToday');
    const builderDateInput = document.getElementById('taskBuilderDateInput');

    if (btnPrevDay) btnPrevDay.addEventListener('click', () => offsetPlannerDate(-1));
    if (btnNextDay) btnNextDay.addEventListener('click', () => offsetPlannerDate(1));

    const openCalHandler = () => {
        const [y, m] = currentSelectedDateKey.split('-').map(Number);
        calViewYear = y;
        calViewMonth = m - 1;
        renderCalendarMonthGrid();
        if (calModal) {
            if (typeof calModal.showModal === 'function') calModal.showModal();
            else calModal.setAttribute('open', 'true');
        }
    };

    if (btnOpenModal) btnOpenModal.addEventListener('click', openCalHandler);
    if (btnQuickOpenCal) btnQuickOpenCal.addEventListener('click', openCalHandler);

    if (btnCloseCal && calModal) {
        btnCloseCal.addEventListener('click', () => {
            if (typeof calModal.close === 'function') calModal.close();
            else calModal.removeAttribute('open');
        });
    }

    if (btnCalPrevMonth) {
        btnCalPrevMonth.addEventListener('click', () => {
            calViewMonth--;
            if (calViewMonth < 0) {
                calViewMonth = 11;
                calViewYear--;
            }
            renderCalendarMonthGrid();
        });
    }

    if (btnCalNextMonth) {
        btnCalNextMonth.addEventListener('click', () => {
            calViewMonth++;
            if (calViewMonth > 11) {
                calViewMonth = 0;
                calViewYear++;
            }
            renderCalendarMonthGrid();
        });
    }

    if (btnCalToday) {
        btnCalToday.addEventListener('click', () => {
            selectPlannerDate(getTodayDateKey());
            if (calModal) {
                if (typeof calModal.close === 'function') calModal.close();
                else calModal.removeAttribute('open');
            }
        });
    }

    // Quick date offset chips
    document.querySelectorAll('.date-chip[data-offset]').forEach(chip => {
        chip.addEventListener('click', () => {
            const offset = parseInt(chip.dataset.offset, 10);
            const today = new Date();
            const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
            const ny = target.getFullYear();
            const nm = String(target.getMonth() + 1).padStart(2, '0');
            const nd = String(target.getDate()).padStart(2, '0');
            selectPlannerDate(`${ny}-${nm}-${nd}`);
        });
    });

    // Builder date change input
    if (builderDateInput) {
        builderDateInput.addEventListener('change', (e) => {
            if (e.target.value) {
                selectPlannerDate(e.target.value);
            }
        });
    }

    updateDateRibbonUI();
}

// Initialize calendar controls
setupCalendarControls();
