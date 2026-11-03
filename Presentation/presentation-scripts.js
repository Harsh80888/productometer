/**
 * PRODUCTOMETER STUDENT PRESENTATION ENGINE (13 SLIDES)
 * Features:
 * 1. 13-Slide Keynote Deck with Smooth Sliding/Scaling Transitions
 * 2. In-Place Text Editing with LocalStorage Persistence
 * 3. In-Place Image Management (Change/Upload, Remove, and Restore Pictures)
 * 4. Keyboard Arrow & Spacebar Navigation (Safe from text inputs & contenteditable)
 * 5. Dynamic Progress Capsule, Slide Counter & Dot Rail
 * 6. Slide Navigator Quick-Jump Drawer
 * 7. Autoplay Presentation Mode
 * 8. Fullscreen Presentation Mode
 * 9. Reset Deck to Original Defaults
 */

document.addEventListener('DOMContentLoaded', () => {

    const slides = Array.from(document.querySelectorAll('.slide'));
    const totalSlides = slides.length;
    let currentSlideIndex = 0;

    // Header & HUD Elements
    const slideNavTitle = document.getElementById('slideNavTitle');
    const progressBarInner = document.getElementById('progressBarInner');
    const currentNum = document.getElementById('currentNum');
    const totalNum = document.getElementById('totalNum');
    const slideDotsRail = document.getElementById('slideDotsRail');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnToggleFull = document.getElementById('btnToggleFull');
    const fullIcon = document.getElementById('fullIcon');
    const btnOpenGrid = document.getElementById('btnOpenGrid');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');
    const deckDrawer = document.getElementById('deckDrawer');
    const drawerTilesGrid = document.getElementById('drawerTilesGrid');
    const btnAutoPlay = document.getElementById('btnAutoPlay');
    const autoIcon = document.getElementById('autoIcon');
    const autoLabel = document.getElementById('autoLabel');

    // Editing Controls
    const btnToggleEdit = document.getElementById('btnToggleEdit');
    const editBtnLabel = document.getElementById('editBtnLabel');
    const btnResetDeck = document.getElementById('btnResetDeck');
    const deckEditBanner = document.getElementById('deckEditBanner');
    const btnCloseEditBanner = document.getElementById('btnCloseEditBanner');
    const deckImageFileInput = document.getElementById('deckImageFileInput');

    // Storage Keys
    const STORAGE_KEY_TEXT = 'productometer_ppt_text_v1';
    const STORAGE_KEY_IMAGES = 'productometer_ppt_images_v1';

    let isEditingMode = true; // Enabled by default so users can edit immediately
    let autoplayTimer = null;
    let isAutoplayActive = false;
    let currentUploadTarget = null; // Holds { img, container, imgId, btnReset }

    if (totalNum) totalNum.textContent = String(totalSlides).padStart(2, '0');

    // ========================================================
    // 1. GENERATE BOTTOM DOTS & DRAWER TILES
    // ========================================================
    function initNavigationElements() {
        if (slideDotsRail) {
            slideDotsRail.innerHTML = '';
            slides.forEach((slide, idx) => {
                const dot = document.createElement('div');
                dot.className = `rail-dot ${idx === 0 ? 'active' : ''}`;
                dot.title = `Slide ${idx + 1}: ${slide.dataset.title || ''}`;
                dot.addEventListener('click', () => {
                    stopAutoplay();
                    goToSlide(idx);
                });
                slideDotsRail.appendChild(dot);
            });
        }

        if (drawerTilesGrid) {
            drawerTilesGrid.innerHTML = '';
            slides.forEach((slide, idx) => {
                const tile = document.createElement('div');
                tile.className = `drawer-tile-card ${idx === 0 ? 'active' : ''}`;
                tile.innerHTML = `
                    <span class="dt-number">SLIDE ${String(idx + 1).padStart(2, '0')}</span>
                    <span class="dt-name">${slide.dataset.title || 'Slide ' + (idx + 1)}</span>
                `;
                tile.addEventListener('click', () => {
                    stopAutoplay();
                    goToSlide(idx);
                    closeDrawer();
                });
                drawerTilesGrid.appendChild(tile);
            });
        }
    }

    // ========================================================
    // 2. SLIDE SWITCHING CORE
    // ========================================================
    function goToSlide(targetIndex) {
        if (targetIndex < 0 || targetIndex >= totalSlides) return;

        slides.forEach((slide, idx) => {
            slide.classList.remove('active', 'prev-slide');
            if (idx < targetIndex) {
                slide.classList.add('prev-slide');
            }
        });

        currentSlideIndex = targetIndex;
        const activeSlide = slides[currentSlideIndex];
        activeSlide.classList.add('active');

        // Update Header Title & Numbers
        const title = activeSlide.dataset.title || `Slide ${currentSlideIndex + 1}`;
        if (slideNavTitle) slideNavTitle.textContent = title;
        if (currentNum) currentNum.textContent = String(currentSlideIndex + 1).padStart(2, '0');

        // Update Progress Capsule
        const pct = ((currentSlideIndex + 1) / totalSlides) * 100;
        if (progressBarInner) progressBarInner.style.width = `${pct}%`;

        // Update Bottom Rail Dots
        if (slideDotsRail) {
            const dots = slideDotsRail.querySelectorAll('.rail-dot');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === currentSlideIndex);
            });
        }

        // Update Drawer Tiles
        if (drawerTilesGrid) {
            const tiles = drawerTilesGrid.querySelectorAll('.drawer-tile-card');
            tiles.forEach((tile, idx) => {
                tile.classList.toggle('active', idx === currentSlideIndex);
            });
        }

        // Auto-scroll active slide to top
        activeSlide.scrollTop = 0;
    }

    function nextSlide() {
        if (currentSlideIndex < totalSlides - 1) {
            goToSlide(currentSlideIndex + 1);
        } else if (isAutoplayActive) {
            goToSlide(0); // loop
        }
    }

    function prevSlide() {
        if (currentSlideIndex > 0) {
            goToSlide(currentSlideIndex - 1);
        }
    }

    if (btnNext) btnNext.addEventListener('click', () => { stopAutoplay(); nextSlide(); });
    if (btnPrev) btnPrev.addEventListener('click', () => { stopAutoplay(); prevSlide(); });

    // ========================================================
    // 3. KEYBOARD SHORTCUTS (SAFE FOR TYPING)
    // ========================================================
    document.addEventListener('keydown', (e) => {
        // If typing in input, textarea, or contenteditable, don't trigger slide switching
        if (document.activeElement.isContentEditable || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            if (e.key === 'Escape') {
                document.activeElement.blur();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case 'PageDown':
            case ' ':
                e.preventDefault();
                stopAutoplay();
                nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                stopAutoplay();
                prevSlide();
                break;
            case 'f':
            case 'F':
                toggleFullscreen();
                break;
            case 'Escape':
                if (deckDrawer && deckDrawer.classList.contains('open')) {
                    closeDrawer();
                }
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides - 1);
                break;
        }
    });

    // ========================================================
    // 4. TOUCH / SWIPE GESTURES FOR MOBILE
    // ========================================================
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (document.activeElement.isContentEditable) return;
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
            stopAutoplay();
            if (diffX < 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }, { passive: true });

    // ========================================================
    // 5. SLIDE NAVIGATOR DRAWER
    // ========================================================
    function openDrawer() {
        if (deckDrawer) deckDrawer.classList.add('open');
    }

    function closeDrawer() {
        if (deckDrawer) deckDrawer.classList.remove('open');
    }

    if (btnOpenGrid) {
        btnOpenGrid.addEventListener('click', () => {
            if (deckDrawer && deckDrawer.classList.contains('open')) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });
    }

    if (btnCloseDrawer) {
        btnCloseDrawer.addEventListener('click', closeDrawer);
    }

    // ========================================================
    // 6. FULLSCREEN CONTROLLER
    // ========================================================
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            if (fullIcon) fullIcon.className = 'fa-solid fa-compress';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                if (fullIcon) fullIcon.className = 'fa-solid fa-expand';
            }
        }
    }

    if (btnToggleFull) {
        btnToggleFull.addEventListener('click', toggleFullscreen);
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && fullIcon) {
            fullIcon.className = 'fa-solid fa-expand';
        }
    });

    // ========================================================
    // 7. AUTOPLAY PRESENTATION MODE
    // ========================================================
    function toggleAutoplay() {
        if (isAutoplayActive) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    }

    function startAutoplay() {
        isAutoplayActive = true;
        if (autoIcon) autoIcon.className = 'fa-solid fa-pause';
        if (autoLabel) autoLabel.textContent = 'Pause';
        if (btnAutoPlay) btnAutoPlay.classList.add('active');

        autoplayTimer = setInterval(() => {
            nextSlide();
        }, 8500);
    }

    function stopAutoplay() {
        if (!isAutoplayActive) return;
        isAutoplayActive = false;
        if (autoplayTimer) clearInterval(autoplayTimer);
        if (autoIcon) autoIcon.className = 'fa-solid fa-play';
        if (autoLabel) autoLabel.textContent = 'Autoplay';
        if (btnAutoPlay) btnAutoPlay.classList.remove('active');
    }

    if (btnAutoPlay) {
        btnAutoPlay.addEventListener('click', toggleAutoplay);
    }

    // ========================================================
    // 8. IN-PLACE TEXT EDITING & PERSISTENCE ENGINE
    // ========================================================
    const textElements = [];
    const editableSelectors = [
        'h1', 'h2', 'h3', 'h4', 'p', 'li', 'blockquote',
        '.friendly-badge', '.friendly-mini-badge',
        '.note-quote', '.value-chip', '.tile-tag', '.photo-overlay-tag span',
        '.score-chip-label', '.big-score-digits', '.score-pill-tag', '.score-subtext',
        '.rule-badge', '.handwritten-signoff', '.stat-big-num', '.stat-caption',
        '.ssc-val', '.ssc-label', '.gif-item span', '.step-badge', '.feature-capsule span'
    ].join(', ');

    slides.forEach((slide, sIdx) => {
        const rawMatches = Array.from(slide.querySelectorAll(editableSelectors));

        // Filter out elements whose parent or ancestor is already an editable block
        // (prevents nested contenteditable elements and duplicate inner saving)
        const cleanMatches = rawMatches.filter(el => {
            if (el.tagName === 'I') return false;
            if (!el.textContent.trim()) return false;

            let parent = el.parentElement;
            while (parent && parent !== slide) {
                if (rawMatches.includes(parent)) {
                    return false;
                }
                parent = parent.parentElement;
            }
            return true;
        });

        cleanMatches.forEach((el, tIdx) => {
            const uid = `s${sIdx}_t${tIdx}`;
            el.dataset.deckTextUid = uid;
            textElements.push(el);
        });
    });

    // Debounced text autosave
    let textSaveTimeout = null;
    function debouncedSaveText() {
        clearTimeout(textSaveTimeout);
        textSaveTimeout = setTimeout(saveTextEdits, 280);
    }

    function saveTextEdits() {
        try {
            const textData = {};
            textElements.forEach(el => {
                const uid = el.dataset.deckTextUid;
                if (uid) {
                    textData[uid] = el.innerHTML;
                }
            });
            localStorage.setItem(STORAGE_KEY_TEXT, JSON.stringify(textData));
            updateResetDeckButtonVisibility();
        } catch (e) {
            console.error('Failed to save presentation text edits', e);
        }
    }

    function restoreTextEdits() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_TEXT);
            if (!raw) return;
            const textData = JSON.parse(raw);
            let hasCustom = false;

            textElements.forEach(el => {
                const uid = el.dataset.deckTextUid;
                if (uid && textData[uid] !== undefined) {
                    el.innerHTML = textData[uid];
                    hasCustom = true;
                }
            });

            if (hasCustom) {
                updateResetDeckButtonVisibility();
            }
        } catch (e) {
            console.error('Failed to restore presentation text edits', e);
        }
    }

    textElements.forEach(el => {
        el.addEventListener('input', () => {
            debouncedSaveText();
        });
    });

    // ========================================================
    // 9. IMAGE EDITING ENGINE (CHANGE, REMOVE, RESTORE)
    // ========================================================
    function initImageEditing() {
        const images = Array.from(document.querySelectorAll('.slide img'));
        let hasCustomImages = false;

        let savedImages = {};
        try {
            const raw = localStorage.getItem(STORAGE_KEY_IMAGES);
            if (raw) savedImages = JSON.parse(raw);
        } catch (e) {
            console.error('Failed to read saved images', e);
        }

        images.forEach((img, idx) => {
            const container = img.closest(
                '.mosaic-tile, .planner-photo-card, .acad-photo-wrapper, .hero-health-box, .gif-item, .screen-photo-card, .sleep-photo-card'
            ) || img.parentElement;

            container.classList.add('deck-img-container');

            const imgId = img.dataset.deckImgId || `img_auto_${idx}`;
            img.dataset.deckImgId = imgId;

            if (!img.dataset.defaultSrc) {
                img.dataset.defaultSrc = img.getAttribute('src');
            }

            // Restore saved state
            const savedVal = savedImages[imgId];
            if (savedVal) {
                hasCustomImages = true;
                if (savedVal === '__REMOVED__') {
                    container.classList.add('is-img-removed');
                } else {
                    img.src = savedVal;
                }
            }

            // Add action overlay toolbar
            if (!container.querySelector('.img-edit-bar')) {
                const bar = document.createElement('div');
                bar.className = 'img-edit-bar';
                bar.innerHTML = `
                    <button type="button" class="img-tool-btn btn-change-photo" title="Change picture (upload from device)">
                        <i class="fa-solid fa-camera"></i>
                        <span>Change</span>
                    </button>
                    <button type="button" class="img-tool-btn btn-remove-photo" title="Remove picture">
                        <i class="fa-solid fa-trash-can"></i>
                        <span>Remove</span>
                    </button>
                    <button type="button" class="img-tool-btn btn-reset-photo" title="Restore original picture" style="${savedVal ? 'display:inline-flex;' : 'display:none;'}">
                        <i class="fa-solid fa-arrow-rotate-left"></i>
                        <span>Reset</span>
                    </button>
                `;
                container.appendChild(bar);

                const btnChange = bar.querySelector('.btn-change-photo');
                const btnRemove = bar.querySelector('.btn-remove-photo');
                const btnReset = bar.querySelector('.btn-reset-photo');

                btnChange.addEventListener('click', (e) => {
                    e.stopPropagation();
                    triggerImageUpload(img, container, imgId, btnReset);
                });

                btnRemove.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removePicture(img, container, imgId, btnReset);
                });

                btnReset.addEventListener('click', (e) => {
                    e.stopPropagation();
                    resetPicture(img, container, imgId, btnReset);
                });
            }

            // Add removed placeholder card
            if (!container.querySelector('.img-placeholder-card')) {
                const ph = document.createElement('div');
                ph.className = 'img-placeholder-card';
                ph.innerHTML = `
                    <div class="ph-center-box">
                        <i class="fa-regular fa-image ph-icon"></i>
                        <span class="ph-text">Picture Removed</span>
                        <div class="placeholder-actions">
                            <button type="button" class="btn-ph-action ph-change-btn">
                                <i class="fa-solid fa-upload"></i> Upload Picture
                            </button>
                            <button type="button" class="btn-ph-action ph-restore-btn">
                                <i class="fa-solid fa-arrow-rotate-left"></i> Restore Original
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(ph);

                const phChange = ph.querySelector('.ph-change-btn');
                const phRestore = ph.querySelector('.ph-restore-btn');
                const btnReset = container.querySelector('.btn-reset-photo');

                phChange.addEventListener('click', (e) => {
                    e.stopPropagation();
                    triggerImageUpload(img, container, imgId, btnReset);
                });

                phRestore.addEventListener('click', (e) => {
                    e.stopPropagation();
                    resetPicture(img, container, imgId, btnReset);
                });
            }
        });

        if (hasCustomImages) {
            updateResetDeckButtonVisibility();
        }
    }

    function triggerImageUpload(img, container, imgId, btnReset) {
        currentUploadTarget = { img, container, imgId, btnReset };
        if (deckImageFileInput) {
            deckImageFileInput.value = '';
            deckImageFileInput.click();
        }
    }

    if (deckImageFileInput) {
        deckImageFileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file || !currentUploadTarget) return;

            const { img, container, imgId, btnReset } = currentUploadTarget;
            const reader = new FileReader();

            reader.onload = (ev) => {
                const rawUrl = ev.target.result;

                // For animated GIFs or SVGs, preserve original bytes
                if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
                    applyNewImage(rawUrl, img, container, imgId, btnReset);
                } else {
                    // Downscale large camera photos using Canvas to prevent localStorage quota overflow
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        const maxDim = 1280;
                        let w = tempImg.width;
                        let h = tempImg.height;

                        if (w > maxDim || h > maxDim) {
                            if (w > h) {
                                h = Math.round((h * maxDim) / w);
                                w = maxDim;
                            } else {
                                w = Math.round((w * maxDim) / h);
                                h = maxDim;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(tempImg, 0, 0, w, h);

                        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                        const optimizedUrl = canvas.toDataURL(mime, 0.88);
                        applyNewImage(optimizedUrl, img, container, imgId, btnReset);
                    };
                    tempImg.src = rawUrl;
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function applyNewImage(dataUrl, img, container, imgId, btnReset) {
        img.src = dataUrl;
        container.classList.remove('is-img-removed');
        if (btnReset) btnReset.style.display = 'inline-flex';

        saveImageToStorage(imgId, dataUrl);
        updateResetDeckButtonVisibility();
    }

    function removePicture(img, container, imgId, btnReset) {
        container.classList.add('is-img-removed');
        if (btnReset) btnReset.style.display = 'inline-flex';

        saveImageToStorage(imgId, '__REMOVED__');
        updateResetDeckButtonVisibility();
    }

    function resetPicture(img, container, imgId, btnReset) {
        const orig = img.dataset.defaultSrc;
        if (orig) {
            img.src = orig;
        }
        container.classList.remove('is-img-removed');
        if (btnReset) btnReset.style.display = 'none';

        removeImageFromStorage(imgId);
        updateResetDeckButtonVisibility();
    }

    function saveImageToStorage(imgId, val) {
        try {
            let saved = {};
            const raw = localStorage.getItem(STORAGE_KEY_IMAGES);
            if (raw) saved = JSON.parse(raw);
            saved[imgId] = val;
            localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(saved));
        } catch (err) {
            console.error('Storage quota or error saving image', err);
            alert('Image updated! (Note: Local browser storage limit reached; image remains displayed for this session).');
        }
    }

    function removeImageFromStorage(imgId) {
        try {
            let saved = {};
            const raw = localStorage.getItem(STORAGE_KEY_IMAGES);
            if (raw) saved = JSON.parse(raw);
            delete saved[imgId];
            if (Object.keys(saved).length === 0) {
                localStorage.removeItem(STORAGE_KEY_IMAGES);
            } else {
                localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(saved));
            }
        } catch (err) {
            console.error('Error removing image from storage', err);
        }
    }

    // ========================================================
    // 10. EDIT MODE TOGGLE & RESET CONTROLLER
    // ========================================================
    function setEditingMode(active) {
        isEditingMode = active;
        document.body.classList.toggle('editable-active', active);

        textElements.forEach(el => {
            el.contentEditable = active ? 'true' : 'false';
        });

        if (btnToggleEdit) {
            if (active) {
                btnToggleEdit.classList.add('active');
                btnToggleEdit.classList.remove('mode-off');
                btnToggleEdit.innerHTML = `<i class="fa-solid fa-pen-to-square text-cyan"></i> <span>Editing: ON</span>`;
                if (deckEditBanner) deckEditBanner.classList.remove('hidden');
            } else {
                btnToggleEdit.classList.remove('active');
                btnToggleEdit.classList.add('mode-off');
                btnToggleEdit.innerHTML = `<i class="fa-solid fa-eye"></i> <span>Present</span>`;
                if (deckEditBanner) deckEditBanner.classList.add('hidden');
            }
        }
    }

    if (btnToggleEdit) {
        btnToggleEdit.addEventListener('click', () => {
            setEditingMode(!isEditingMode);
        });
    }

    if (btnCloseEditBanner) {
        btnCloseEditBanner.addEventListener('click', () => {
            if (deckEditBanner) deckEditBanner.classList.add('hidden');
        });
    }

    function updateResetDeckButtonVisibility() {
        const hasText = !!localStorage.getItem(STORAGE_KEY_TEXT);
        const hasImages = !!localStorage.getItem(STORAGE_KEY_IMAGES);
        if (btnResetDeck) {
            btnResetDeck.style.display = (hasText || hasImages) ? 'inline-flex' : 'none';
        }
    }

    if (btnResetDeck) {
        btnResetDeck.addEventListener('click', () => {
            const confirmReset = confirm(
                "Reset Presentation to Default?\n\nThis will clear all custom edited text and restore all original pictures."
            );
            if (confirmReset) {
                localStorage.removeItem(STORAGE_KEY_TEXT);
                localStorage.removeItem(STORAGE_KEY_IMAGES);
                window.location.reload();
            }
        });
    }

    // ========================================================
    // INITIALIZATION
    // ========================================================
    initNavigationElements();
    restoreTextEdits();
    initImageEditing();
    setEditingMode(true); // Default to editing mode so it's immediately active
    updateResetDeckButtonVisibility();
    goToSlide(0);

});
