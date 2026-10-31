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

let plannerListData = [];
try {
    const saved = localStorage.getItem('productometer_chrono_planner_list');
    if (saved) plannerListData = JSON.parse(saved);
} catch (e) {
    plannerListData = [];
}

// --- 🌙 AUTOMATIC MIDNIGHT RESET HANDLER ---
function checkAndResetPlannerForNewDay() {
    const lastActiveDateKey = 'productometer_last_active_date';
    const currentDateStr = new Date().toDateString();
    const lastSavedDate = localStorage.getItem(lastActiveDateKey);

    if (lastSavedDate && lastSavedDate !== currentDateStr) {
        plannerListData = [];
        localStorage.removeItem('productometer_chrono_planner_list');
        synchronizeLegacyTimelineArray();
        renderChronologicalMasterTimelineGrid();
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

// --- INITIALIZATION ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    rebuildCategoryPresetButtons();
    renderChronologicalMasterTimelineGrid();
    setupCategoryTabs();
    setupDialogBackdropDismiss();
    ensureDrumsInitialized();
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
                    description: optionalDesc || plannerListData[taskIndex].description || `Objective mapped for your daily ${currentSelectedCategoryType} routine timeline.`
                };
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
                description: optionalDesc || `Objective mapped for your daily ${currentSelectedCategoryType} routine timeline.`
            };
            plannerListData.push(newPlannerItem);
        }
        if (window.NativeBridge && window.NativeBridge.isAvailable()) {
            const now = new Date();
            const schedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), taskStartH, taskStartM, 0);
            if (schedDate.getTime() > Date.now()) {
                window.NativeBridge.scheduleAlarm(newPlannerItem.id, newPlannerItem.title, newPlannerItem.timeDisplayStr, schedDate.getTime());
            }
            window.NativeBridge.vibrate(40);
        }

        plannerListData.sort((a, b) => a.startMin - b.startMin);
        localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(plannerListData));

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
        card.setAttribute('data-task-id', task.id);
        if (selectedTaskIdForEdit === task.id) card.classList.add('selected-for-edit');
        card.style.borderColor = (task.color || '#00e5ff') + '55';
        card.style.boxShadow = `0 0 25px ${(task.color || '#00e5ff')}15, inset 0 0 15px ${(task.color || '#00e5ff')}10`;

        card.innerHTML = `
            <div class="card-time-badge" style="color: ${task.color || '#00e5ff'}; border-color: ${(task.color || '#00e5ff')}33;">${task.timeDisplayStr}</div>
            <div class="card-info-stack">
                <div class="card-main-title">${task.title}</div>
                <div class="card-sub-description">${task.description} (${(task.durationMin / 60).toFixed(1)}h)</div>
            </div>
            <button type="button" class="delete-chrono-item-btn" title="Delete Task">&times;</button>
        `;

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
                window.NativeBridge.cancelAlarm(task.id);
                window.NativeBridge.vibrate(25);
            }
            localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(plannerListData));
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

        ensureDrumsInitialized();
        safeShowModal(taskBuilderDialog);
        syncAllDrumWheels(false);
    });
}
