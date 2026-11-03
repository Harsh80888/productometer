/**
 * PRODUCTOMETER STUDENT PRESENTATION ENGINE (13 SLIDES)
 * Features:
 * 1. 13-Slide Keynote Deck with Smooth Sliding/Scaling Transitions
 * 2. Keyboard Arrow & Spacebar Navigation
 * 3. Dynamic Progress Capsule & Slide Counter
 * 4. Touch Gestures (Mobile Swipe Left/Right)
 * 5. Quick-Jump Slide Navigator Drawer
 * 6. Autoplay Presentation Mode
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

    let autoplayTimer = null;
    let isAutoplayActive = false;

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
    // 3. KEYBOARD SHORTCUTS
    // ========================================================
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

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
        }, 8500); // 8.5 seconds per slide
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

    // Initialize View
    initNavigationElements();
    goToSlide(0);

});
