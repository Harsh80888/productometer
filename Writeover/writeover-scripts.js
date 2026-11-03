/**
 * PRODUCTOMETER A4 PROJECT WRITEOUT — INTERACTION, PRINT & IN-PLACE TEXT EDITOR
 * Supports Single Page browsing, Continuous Booklet mode, In-Place Text Editing & A4 PDF export
 */

document.addEventListener('DOMContentLoaded', () => {

    const sheets = document.querySelectorAll('.a4-sheet');
    const totalPages = sheets.length;
    let currentPage = 1;
    let isPagedMode = true;

    // Core Navigation Elements
    const a4Container = document.getElementById('a4Container');
    const a4PageIndicator = document.getElementById('a4PageIndicator');
    const btnA4Prev = document.getElementById('btnA4Prev');
    const btnA4Next = document.getElementById('btnA4Next');
    const btnViewPaged = document.getElementById('btnViewPaged');
    const btnViewAll = document.getElementById('btnViewAll');
    const btnPrintA4 = document.getElementById('btnPrintA4');

    // In-Place Text Editing Elements
    const btnToggleEdit = document.getElementById('btnToggleEdit');
    const editBtnLabel = document.getElementById('editBtnLabel');
    const btnResetText = document.getElementById('btnResetText');
    const editModeToast = document.getElementById('editModeToast');
    const btnCloseToast = document.getElementById('btnCloseToast');

    let isEditingMode = false;
    const STORAGE_KEY = 'productometer_a4_writeout_custom_v1';

    // Default: Single Page Mode
    if (a4Container) {
        a4Container.classList.add('mode-paged');
    }

    // ========================================================
    // 1. PAGE NAVIGATION CONTROLLER
    // ========================================================
    function updatePageIndicator() {
        if (!a4PageIndicator) return;
        const currentSheet = sheets[currentPage - 1];
        if (currentSheet && currentSheet.classList.contains('cover-page')) {
            a4PageIndicator.textContent = `Cover Page • 1 of ${totalPages}`;
        } else {
            const sheetNum = currentPage - 1;
            a4PageIndicator.textContent = `Page ${currentPage} of ${totalPages} (Sheet ${sheetNum} of 8)`;
        }
    }

    function showPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        currentPage = pageNumber;

        sheets.forEach((sheet, idx) => {
            sheet.classList.toggle('active', idx + 1 === currentPage);
        });

        updatePageIndicator();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (btnA4Prev) {
        btnA4Prev.addEventListener('click', () => {
            if (currentPage > 1) showPage(currentPage - 1);
        });
    }

    if (btnA4Next) {
        btnA4Next.addEventListener('click', () => {
            if (currentPage < totalPages) showPage(currentPage + 1);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (isEditingMode && document.activeElement && document.activeElement.isContentEditable) return;
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            if (currentPage < totalPages) showPage(currentPage + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            if (currentPage > 1) showPage(currentPage - 1);
        }
    });

    // View Mode Toggle: Single Page vs Continuous Booklet
    if (btnViewPaged && btnViewAll && a4Container) {
        btnViewPaged.addEventListener('click', () => {
            isPagedMode = true;
            btnViewPaged.classList.add('active');
            btnViewAll.classList.remove('active');
            a4Container.classList.add('mode-paged');
            a4Container.classList.remove('mode-all');
            showPage(currentPage);
        });

        btnViewAll.addEventListener('click', () => {
            isPagedMode = false;
            btnViewAll.classList.add('active');
            btnViewPaged.classList.remove('active');
            a4Container.classList.remove('mode-paged');
            a4Container.classList.add('mode-all');
            if (a4PageIndicator) {
                a4PageIndicator.textContent = `All ${totalPages} Pages (Cover + 8 Sheets)`;
            }
        });
    }

    // Print to A4 PDF
    if (btnPrintA4) {
        btnPrintA4.addEventListener('click', () => {
            if (isEditingMode) {
                toggleEditMode();
            }
            window.print();
        });
    }

    // ========================================================
    // 2. IN-PLACE TEXT EDITING & PERSISTENCE ENGINE
    // ========================================================
    const editableSelectors = 'h1, h2, h3, h4, p, span, li, strong, .hero-tagline, .callout-text, .perm-body, .formula-highlight, .tier-label, .tier-score, .cover-main-title, .cover-main-subtitle, .cover-lead-summary, .cmt-value';
    const textElements = [];

    sheets.forEach((sheet) => {
        const isCover = sheet.classList.contains('cover-page');
        const sheetPrefix = isCover ? 'cover' : `s${parseInt(sheet.dataset.page || '1') - 1}`;

        const els = sheet.querySelectorAll(editableSelectors);
        els.forEach((el, elIdx) => {
            if (el.querySelector('i') && el.children.length === 1 && !el.textContent.trim()) return;
            if (el.classList.contains('sheet-page-num')) return;

            const uid = `${sheetPrefix}_el${elIdx}`;
            el.dataset.editUid = uid;
            textElements.push(el);
        });
    });

    // Restore saved custom text from localStorage
    function restoreSavedEdits() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            let hasCustom = false;

            textElements.forEach(el => {
                const uid = el.dataset.editUid;
                if (uid && data[uid] !== undefined) {
                    el.innerHTML = data[uid];
                    hasCustom = true;
                }
            });

            if (hasCustom && btnResetText) {
                btnResetText.style.display = 'inline-flex';
            }
        } catch (e) {
            console.error('Failed to restore custom text', e);
        }
    }
    restoreSavedEdits();

    // Save changes into localStorage
    function saveEdits() {
        try {
            const data = {};
            textElements.forEach(el => {
                const uid = el.dataset.editUid;
                if (uid) {
                    data[uid] = el.innerHTML;
                }
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            if (btnResetText) {
                btnResetText.style.display = 'inline-flex';
            }
        } catch (e) {
            console.error('Failed to save custom text', e);
        }
    }

    // Listen for input changes across all text elements
    textElements.forEach(el => {
        el.addEventListener('input', () => {
            saveEdits();
        });
    });

    // Toggle Edit Mode ON / OFF
    function toggleEditMode() {
        isEditingMode = !isEditingMode;
        document.body.classList.toggle('editable-active', isEditingMode);

        textElements.forEach(el => {
            if (isEditingMode) {
                el.setAttribute('contenteditable', 'true');
                el.setAttribute('spellcheck', 'true');
            } else {
                el.removeAttribute('contenteditable');
                el.removeAttribute('spellcheck');
            }
        });

        if (btnToggleEdit) {
            btnToggleEdit.classList.toggle('editing-active', isEditingMode);
            const icon = btnToggleEdit.querySelector('i');
            if (isEditingMode) {
                if (editBtnLabel) editBtnLabel.textContent = 'Finish Editing';
                if (icon) icon.className = 'fa-solid fa-check';
                if (editModeToast) editModeToast.style.display = 'flex';
            } else {
                if (editBtnLabel) editBtnLabel.textContent = 'Edit Text';
                if (icon) icon.className = 'fa-solid fa-pen-to-square';
                if (editModeToast) editModeToast.style.display = 'none';
            }
        }
    }

    if (btnToggleEdit) {
        btnToggleEdit.addEventListener('click', toggleEditMode);
    }

    if (btnCloseToast && editModeToast) {
        btnCloseToast.addEventListener('click', () => {
            editModeToast.style.display = 'none';
        });
    }

    // Reset to Original Default Content
    if (btnResetText) {
        btnResetText.addEventListener('click', () => {
            if (confirm('Reset all text back to the original project description? Any custom edits you typed will be restored.')) {
                localStorage.removeItem(STORAGE_KEY);
                window.location.reload();
            }
        });
    }

    // Start with Edit Mode ENABLED by default so user can immediately click & type anywhere!
    toggleEditMode();

});
