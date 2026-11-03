/**
 * PRODUCTOMETER WEB PRESENTATION ENGINE
 * Features:
 * 1. 12-Slide Sequential Deck Navigation with Smooth Transitions
 * 2. Keyboard Shortcuts (Arrows, Space, PageUp/Down, 'F' Fullscreen)
 * 3. Dynamic Progress Fill & Slide Counter Ribbon HUD
 * 4. Touch Gestures (Mobile Swipe Left/Right)
 * 5. Quick-Jump Slide Navigator Drawer
 * 6. Autoplay Presentation Mode
 */

document.addEventListener('DOMContentLoaded', () => {

    const slides = Array.from(document.querySelectorAll('.slide-frame'));
    const totalSlides = slides.length;
    let currentSlideIndex = 0;

    // HUD Elements
    const ribbonTopic = document.getElementById('ribbonTopic');
    const slideProgressFill = document.getElementById('slideProgressFill');
    const currentSlideNum = document.getElementById('currentSlideNum');
    const totalSlidesNum = document.getElementById('totalSlidesNum');
    const slideDotsContainer = document.getElementById('slideDotsContainer');
    const btnPrevSlide = document.getElementById('btnPrevSlide');
    const btnNextSlide = document.getElementById('btnNextSlide');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const fullscreenIcon = document.getElementById('fullscreenIcon');
    const btnToggleDrawer = document.getElementById('btnToggleDrawer');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');
    const slidesDrawer = document.getElementById('slidesDrawer');
    const drawerGrid = document.getElementById('drawerGrid');
    const btnAutoplay = document.getElementById('btnAutoplay');
    const autoplayIcon = document.getElementById('autoplayIcon');
    const autoplayText = document.getElementById('autoplayText');

    let autoplayTimer = null;
    let isAutoplayActive = false;

    if (totalSlidesNum) totalSlidesNum.textContent = String(totalSlides).padStart(2, '0');

    // ========================================================
    // 1. GENERATE BOTTOM DOTS & DRAWER TILES
    // ========================================================
    function initNavigationElements() {
        if (slideDotsContainer) {
            slideDotsContainer.innerHTML = '';
            slides.forEach((slide, idx) => {
                const dot = document.createElement('div');
                dot.className = `slide-dot ${idx === 0 ? 'active' : ''}`;
                dot.title = `Slide ${idx + 1}: ${slide.dataset.title || ''}`;
                dot.addEventListener('click', () => goToSlide(idx));
                slideDotsContainer.appendChild(dot);
            });
        }

        if (drawerGrid) {
            drawerGrid.innerHTML = '';
            slides.forEach((slide, idx) => {
                const tile = document.createElement('div');
                tile.className = `drawer-tile ${idx === 0 ? 'active' : ''}`;
                tile.innerHTML = `
                    <span class="dt-num">SLIDE ${String(idx + 1).padStart(2, '0')}</span>
                    <span class="dt-title">${slide.dataset.title || 'Slide ' + (idx + 1)}</span>
                `;
                tile.addEventListener('click', () => {
                    goToSlide(idx);
                    closeDrawer();
                });
                drawerGrid.appendChild(tile);
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

        // Update Ribbon Title & Numbers
        const title = activeSlide.dataset.title || `Slide ${currentSlideIndex + 1}`;
        if (ribbonTopic) ribbonTopic.textContent = title;
        if (currentSlideNum) currentSlideNum.textContent = String(currentSlideIndex + 1).padStart(2, '0');

        // Update Progress Bar
        const pct = ((currentSlideIndex + 1) / totalSlides) * 100;
        if (slideProgressFill) slideProgressFill.style.width = `${pct}%`;

        // Update Bottom Dots
        if (slideDotsContainer) {
            const dots = slideDotsContainer.querySelectorAll('.slide-dot');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === currentSlideIndex);
            });
        }

        // Update Drawer Tiles
        if (drawerGrid) {
            const tiles = drawerGrid.querySelectorAll('.drawer-tile');
            tiles.forEach((tile, idx) => {
                tile.classList.toggle('active', idx === currentSlideIndex);
            });
        }

        // Auto-scroll active slide back to top
        activeSlide.scrollTop = 0;
    }

    function nextSlide() {
        if (currentSlideIndex < totalSlides - 1) {
            goToSlide(currentSlideIndex + 1);
        } else if (isAutoplayActive) {
            goToSlide(0); // loop in autoplay
        }
    }

    function prevSlide() {
        if (currentSlideIndex > 0) {
            goToSlide(currentSlideIndex - 1);
        }
    }

    // Nav Button Clicks
    if (btnNextSlide) btnNextSlide.addEventListener('click', () => { stopAutoplay(); nextSlide(); });
    if (btnPrevSlide) btnPrevSlide.addEventListener('click', () => { stopAutoplay(); prevSlide(); });

    // ========================================================
    // 3. KEYBOARD SHORTCUTS
    // ========================================================
    document.addEventListener('keydown', (e) => {
        // Ignore typing inside inputs
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
                if (slidesDrawer && slidesDrawer.classList.contains('open')) {
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

        // Ensure horizontal swipe dominates vertical scroll
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
            stopAutoplay();
            if (diffX < 0) {
                nextSlide(); // Swiped left -> next
            } else {
                prevSlide(); // Swiped right -> prev
            }
        }
    }, { passive: true });

    // ========================================================
    // 5. SLIDE NAVIGATOR DRAWER (GRID OVERVIEW)
    // ========================================================
    function openDrawer() {
        if (slidesDrawer) slidesDrawer.classList.add('open');
    }

    function closeDrawer() {
        if (slidesDrawer) slidesDrawer.classList.remove('open');
    }

    if (btnToggleDrawer) {
        btnToggleDrawer.addEventListener('click', () => {
            if (slidesDrawer && slidesDrawer.classList.contains('open')) {
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
            if (fullscreenIcon) fullscreenIcon.className = 'fa-solid fa-compress';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                if (fullscreenIcon) fullscreenIcon.className = 'fa-solid fa-expand';
            }
        }
    }

    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', toggleFullscreen);
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && fullscreenIcon) {
            fullscreenIcon.className = 'fa-solid fa-expand';
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
        if (autoplayIcon) autoplayIcon.className = 'fa-solid fa-pause';
        if (autoplayText) autoplayText.textContent = 'Pause';
        if (btnAutoplay) btnAutoplay.classList.add('active');

        autoplayTimer = setInterval(() => {
            nextSlide();
        }, 8000); // Advance every 8 seconds
    }

    function stopAutoplay() {
        if (!isAutoplayActive) return;
        isAutoplayActive = false;
        if (autoplayTimer) clearInterval(autoplayTimer);
        if (autoplayIcon) autoplayIcon.className = 'fa-solid fa-play';
        if (autoplayText) autoplayText.textContent = 'Auto';
        if (btnAutoplay) btnAutoplay.classList.remove('active');
    }

    if (btnAutoplay) {
        btnAutoplay.addEventListener('click', toggleAutoplay);
    }

    // Initialize View
    initNavigationElements();
    goToSlide(0);

});
