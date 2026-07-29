class ImageSlider {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
      
    if (!this.container) return;

    this.options = {
      autoplay: false,
      autoplayInterval: 3000,
      showArrows: true,
      showDots: true,
      transitionSpeed: 600,
      ...options
    };

    this.track = this.container.querySelector('.slider-track');
    if (!this.track) return;

    this.originalSlides = Array.from(this.track.querySelectorAll('.slider-slide'));
    this.originalCount = this.originalSlides.length;

    if (this.originalCount === 0) return;

    this.currentIndex = 0;
    this.physicalIndex = 1;
    this.isTransitioning = false;
    this.autoplayTimer = null;
    this.isDragging = false;
    this.startX = 0;
    this.hasClones = false;
    
    this.userInteracted = false;
    
    this.handleTransitionEnd = this.onTransitionEnd.bind(this);
    this.handlePrevClick = () => { this.userInteracted = true; this.stopAutoplay(); this.prev(); };
    this.handleNextClick = () => { this.userInteracted = true; this.stopAutoplay(); this.next(); };
    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
    this.handleMouseEnter = this.onMouseEnter.bind(this);
    this.handleMouseLeave = this.onMouseLeave.bind(this);
    this.handleResize = this.onResize.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);

    this.container.setAttribute('tabindex', '0');
    this.init();
  }

  init() {
    if (this.originalCount <= 1) {
      this.track.style.transform = 'translateX(0%)';
      return;
    }

    this.createClones();

    this.setTrackTransition(false);
    this.updateTrackPosition();
    this.track.offsetHeight;
    this.setTrackTransition(true);

    if (this.options.showArrows) this.renderArrows();
    if (this.options.showDots) this.renderDots();

    this.attachEventListeners();

    if (this.options.autoplay) {
      this.startAutoplay();
    }
  }

  createClones() {
    if (this.hasClones) return;

    this.firstClone = this.originalSlides[0].cloneNode(true);
    this.lastClone = this.originalSlides[this.originalCount - 1].cloneNode(true);

    this.firstClone.classList.add('slider-slide-clone');
    this.lastClone.classList.add('slider-slide-clone');

    this.track.appendChild(this.firstClone);
    this.track.insertBefore(this.lastClone, this.track.firstElementChild);

    this.hasClones = true;
  }

  setTrackTransition(enabled) {
    if (enabled) {
      this.track.style.transition = `transform ${this.options.transitionSpeed}ms cubic-bezier(0.25, 1, 0.5, 1)`;
    } else {
      this.track.style.transition = 'none';
    }
  }

  updateTrackPosition() {
    const offsetPercentage = -this.physicalIndex * 100;
    this.track.style.transform = `translateX(${offsetPercentage}%)`;
  }

  renderArrows() {
    if (this.container.querySelector('.slider-arrow')) return;

    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'slider-arrow slider-arrow-prev';
    this.prevBtn.setAttribute('aria-label', 'Previous slide');
    this.prevBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M15 19l-7-7 7-7"/>
      </svg>
    `;

    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'slider-arrow slider-arrow-next';
    this.nextBtn.setAttribute('aria-label', 'Next slide');
    this.nextBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M9 5l7 7-7 7"/>
      </svg>
    `;

    this.container.appendChild(this.prevBtn);
    this.container.appendChild(this.nextBtn);

    this.prevBtn.addEventListener('click', this.handlePrevClick);
    this.nextBtn.addEventListener('click', this.handleNextClick);
  }

  renderDots() {
    const existingDots = this.container.querySelector('.slider-dots');
    if (existingDots) existingDots.remove();

    this.dotsContainer = document.createElement('div');
    this.dotsContainer.className = 'slider-dots';

    for (let i = 0; i < this.originalCount; i++) {
      const dot = document.createElement('button');
      dot.className = `slider-dot${i === this.currentIndex ? ' active' : ''}`;
      dot.setAttribute('data-index', i.toString());
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      this.dotsContainer.appendChild(dot);
    }

    this.container.appendChild(this.dotsContainer);

    this.dotsContainer.addEventListener('click', (e) => {
      const targetDot = e.target.closest('.slider-dot');
      if (!targetDot || this.isTransitioning) return;
      
      this.userInteracted = true;
      this.stopAutoplay();
      const targetIndex = parseInt(targetDot.getAttribute('data-index'), 10);
      this.goTo(targetIndex);
    });
  }

  updateDots() {
    if (!this.dotsContainer) return;
    const dots = Array.from(this.dotsContainer.querySelectorAll('.slider-dot'));
    dots.forEach((dot, index) => {
      if (index === this.currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  attachEventListeners() {
    this.track.addEventListener('transitionend', this.handleTransitionEnd);

    this.container.addEventListener('pointerdown', this.handlePointerDown);
    this.container.addEventListener('pointermove', this.handlePointerMove);
    this.container.addEventListener('pointerup', this.handlePointerUp);
    this.container.addEventListener('pointercancel', this.handlePointerUp);

    this.container.addEventListener('mouseenter', this.handleMouseEnter);
    this.container.addEventListener('mouseleave', this.handleMouseLeave);
    this.container.addEventListener('keydown', this.handleKeyDown);

    window.addEventListener('resize', this.handleResize);
  }

  next() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.currentIndex = (this.currentIndex + 1) % this.originalCount;
    this.physicalIndex++;

    this.setTrackTransition(true);
    this.updateTrackPosition();
    this.updateDots();

    if (this.options.autoplay && !this.userInteracted) {
      this.startAutoplay();
    }
  }

  prev() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.currentIndex = (this.currentIndex - 1 + this.originalCount) % this.originalCount;
    this.physicalIndex--;

    this.setTrackTransition(true);
    this.updateTrackPosition();
    this.updateDots();

    if (this.options.autoplay && !this.userInteracted) {
      this.startAutoplay();
    }
  }

  goTo(targetIndex) {
    if (targetIndex < 0 || targetIndex >= this.originalCount || targetIndex === this.currentIndex) return;

    this.isTransitioning = true;
    this.currentIndex = targetIndex;
    this.physicalIndex = targetIndex + 1;

    this.setTrackTransition(true);
    this.updateTrackPosition();
    this.updateDots();

    if (this.options.autoplay && !this.userInteracted) {
      this.startAutoplay();
    }
  }

  onTransitionEnd() {
    this.isTransitioning = false;

    if (this.physicalIndex === this.originalCount + 1) {
      this.setTrackTransition(false);
      this.physicalIndex = 1;
      this.updateTrackPosition();
      this.track.offsetHeight;
      this.setTrackTransition(true);
    } else if (this.physicalIndex === 0) {
      this.setTrackTransition(false);
      this.physicalIndex = this.originalCount;
      this.updateTrackPosition();
      this.track.offsetHeight;
      this.setTrackTransition(true);
    }
  }

  onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.isTransitioning) return;
    
    if (e.target.closest('.slider-arrow') || e.target.closest('.slider-dots')) return;

    this.userInteracted = true;
    this.isDragging = true;
    this.startX = e.clientX;
    this.container.classList.add('dragging');
    this.container.setPointerCapture(e.pointerId);

    this.setTrackTransition(false);

    if (this.autoplayTimer) {
      this.stopAutoplay();
    }
  }

  onPointerMove(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.startX;
    const containerWidth = this.container.offsetWidth;
    const baseTranslate = -this.physicalIndex * containerWidth;
    const currentTranslate = baseTranslate + deltaX;

    this.track.style.transform = `translateX(${currentTranslate}px)`;
  }

  onPointerUp(e) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.container.classList.remove('dragging');
    
    try {
      this.container.releasePointerCapture(e.pointerId);
    } catch (err) {}

    this.setTrackTransition(true);

    const deltaX = e.clientX - this.startX;
    const containerWidth = this.container.offsetWidth;
    const percentMoved = deltaX / containerWidth;

    if (percentMoved < -0.15) {
      this.next();
    } else if (percentMoved > 0.15) {
      this.prev();
    } else {
      this.updateTrackPosition();
    }

    if (this.options.autoplay && !this.userInteracted) {
      this.startAutoplay();
    }
  }

  startAutoplay() {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      this.next();
    }, this.options.autoplayInterval);
  }

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  onMouseEnter() {
    if (this.options.autoplay) {
      this.stopAutoplay();
    }
  }

  onMouseLeave() {
    if (this.options.autoplay && !this.isDragging) {
      this.startAutoplay();
    }
  }

  onResize() {
    this.setTrackTransition(false);
    this.updateTrackPosition();
    this.track.offsetHeight;
    this.setTrackTransition(true);
  }

  onKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.userInteracted = true;
      this.stopAutoplay();
      this.prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.userInteracted = true;
      this.stopAutoplay();
      this.next();
    }
  }

  destroy() {
    this.stopAutoplay();

    this.track.removeEventListener('transitionend', this.handleTransitionEnd);
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    this.container.removeEventListener('pointerup', this.handlePointerUp);
    this.container.removeEventListener('pointercancel', this.handlePointerUp);
    this.container.removeEventListener('mouseenter', this.handleMouseEnter);
    this.container.removeEventListener('mouseleave', this.handleMouseLeave);
    this.container.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);

    if (this.prevBtn) {
      this.prevBtn.removeEventListener('click', this.handlePrevClick);
      this.prevBtn.remove();
    }
    if (this.nextBtn) {
      this.nextBtn.removeEventListener('click', this.handleNextClick);
      this.nextBtn.remove();
    }
    if (this.dotsContainer) {
      this.dotsContainer.remove();
    }

    if (this.hasClones) {
      const clones = this.track.querySelectorAll('.slider-slide-clone');
      clones.forEach(clone => clone.remove());
      this.hasClones = false;
    }

    this.track.style.transition = '';
    this.track.style.transform = '';
    this.container.classList.remove('dragging');
  }
}
