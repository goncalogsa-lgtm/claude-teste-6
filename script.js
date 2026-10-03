(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  /* ---------- Hero ---------- */
  const hero = document.querySelector('.hero');
  const heroProduct = document.querySelector('[data-hero-product]');
  const ghosts = document.querySelectorAll('.hero__ghost');

  window.addEventListener('load', () => hero.classList.add('is-ready'));
  heroProduct.addEventListener('animationend', (e) => {
    if (e.animationName === 'productIn' && !reduceMotion) heroProduct.classList.add('is-floating');
  });

  function updateHero() {
    const p = clamp(window.scrollY / (hero.offsetHeight * 0.9));
    heroProduct.style.transform = `translateY(${p * 90}px) scale(${1 - p * 0.18})`;
    ghosts.forEach((g, i) => {
      const dir = i === 0 ? -1 : 1;
      g.style.transform = `translate(${dir * p * 140}px, ${p * -40}px) rotate(${dir * (6 + p * 14)}deg)`;
    });
  }

  /* ---------- Sticky local nav hairline ---------- */
  const localNav = document.querySelector('[data-local-nav]');
  function updateLocalNav() {
    localNav.classList.toggle('is-stuck', window.scrollY > 44);
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  // Stagger siblings that enter together
  revealEls.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--stagger', `${siblings.indexOf(el) * 0.09}s`);
  });
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  revealEls.forEach((el) => revealObserver.observe(el));

  /* ---------- Counters ---------- */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      counterObserver.unobserve(el);
      if (reduceMotion) { el.textContent = target; return; }
      const start = performance.now();
      const duration = 1400;
      const tick = (now) => {
        const t = clamp((now - start) / duration);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => counterObserver.observe(el));

  /* ---------- Highlights carousel ---------- */
  const carousel = document.querySelector('[data-carousel]');
  const section = carousel.closest('.highlights');
  const track = carousel.querySelector('[data-track]');
  const slides = [...carousel.querySelectorAll('[data-slide]')];
  const dotsWrap = document.querySelector('[data-dots]');
  const toggle = document.querySelector('[data-toggle]');
  const INTERVAL = 4500;
  let index = 0;
  let timer = null;
  let paused = reduceMotion;
  let inView = false;

  section.style.setProperty('--interval', `${INTERVAL}ms`);

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'playback__dot';
    dot.setAttribute('aria-label', `Show slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    const offset = slides[index].offsetLeft - slides[0].offsetLeft;
    track.style.transform = `translateX(${-offset}px)`;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
    dots.forEach((d, n) => {
      d.classList.remove('is-active');
      d.setAttribute('aria-current', n === index ? 'true' : 'false');
    });
    // Restart the progress fill on the active dot
    void dots[index].offsetWidth;
    dots[index].classList.add('is-active');
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (paused || !inView) return;
    timer = setTimeout(() => goTo(index + 1), INTERVAL);
  }

  function setPaused(value) {
    paused = value;
    section.classList.toggle('carousel-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    if (paused) clearTimeout(timer); else goTo(index);
  }

  toggle.addEventListener('click', () => setPaused(!paused));
  slides.forEach((s, i) => s.addEventListener('click', () => { if (i !== index) goTo(i); }));

  // Swipe / drag
  let startX = null;
  track.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  window.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1));
  });

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) goTo(index); else clearTimeout(timer);
  }, { threshold: 0.35 }).observe(section);

  window.addEventListener('resize', () => goTo(index));
  section.classList.toggle('carousel-paused', paused);
  goTo(0);

  /* ---------- Pinned showcase ---------- */
  const showcase = document.querySelector('[data-showcase]');
  const stepTexts = [...showcase.querySelectorAll('[data-step-text]')];
  const stepImgs = [...showcase.querySelectorAll('[data-step-img]')];
  const disc = showcase.querySelector('[data-disc]');
  const bar = showcase.querySelector('[data-progress]');
  let currentStep = -1;

  function updateShowcase() {
    const rect = showcase.getBoundingClientRect();
    const scrollable = showcase.offsetHeight - window.innerHeight;
    const p = clamp(-rect.top / scrollable);
    const steps = stepImgs.length;
    const step = Math.min(steps - 1, Math.floor(p * steps));
    const local = p * steps - step; // 0..1 inside current step

    if (step !== currentStep) {
      currentStep = step;
      [stepTexts, stepImgs].forEach((list) => list.forEach((el, i) => {
        el.classList.toggle('is-active', i === step);
        el.classList.toggle('is-past', i < step);
      }));
    }
    stepImgs[step].style.setProperty('--spin', `${(local - 0.5) * 8}deg`);
    disc.style.setProperty('--disc-scale', (0.7 + Math.sin(local * Math.PI) * 0.18).toFixed(3));
    bar.style.transform = `scaleX(${p})`;
  }

  /* ---------- Editorial parallax entrance ---------- */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  function updateParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      const enter = clamp((top - vh * 0.25) / (vh * 0.75));
      el.style.setProperty('--enter', enter.toFixed(3));
    });
  }

  /* ---------- Scroll loop ---------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateLocalNav();
      if (!reduceMotion) { updateHero(); updateParallax(); }
      updateShowcase();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Card tilt ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Add to bag ---------- */
  const bagIcon = document.querySelector('.bag');
  const bagCount = document.querySelector('[data-bag-count]');
  const toast = document.querySelector('[data-toast]');
  let count = 0;
  let toastTimer = null;

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  function bumpBag() {
    count += 1;
    bagCount.textContent = count;
    bagCount.classList.add('is-visible');
    bagCount.classList.remove('bump');
    void bagCount.offsetWidth;
    bagCount.classList.add('bump');
  }

  document.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.card');
      const img = card.querySelector('img');
      const name = card.querySelector('.card__title').textContent;

      if (reduceMotion) { bumpBag(); showToast(`${name} added to bag`); return; }

      // Fly a copy of the product into the bag icon
      const from = img.getBoundingClientRect();
      const to = bagIcon.getBoundingClientRect();
      const flyer = img.cloneNode();
      Object.assign(flyer.style, {
        position: 'fixed', left: `${from.left}px`, top: `${from.top}px`,
        width: `${from.width}px`, zIndex: 60, pointerEvents: 'none',
      });
      document.body.appendChild(flyer);
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      flyer.animate([
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(0.5) rotate(-12deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.04) rotate(-24deg)`, opacity: 0.3 },
      ], { duration: 900, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' }).onfinish = () => {
        flyer.remove();
        bumpBag();
      };
      showToast(`${name} added to bag`);
    });
  });

  /* ---------- Signup ---------- */
  const form = document.querySelector('[data-signup]');
  const msg = document.querySelector('[data-signup-msg]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.textContent = "You're on the list. We'll email you before Drop 02 goes live.";
    form.reset();
  });

  document.querySelector('[data-year]').textContent = new Date().getFullYear();
})();
