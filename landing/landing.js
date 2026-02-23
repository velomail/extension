/**
 * VeloMail Landing Page — JS
 * Handles: scroll-reveal, active nav, FAQ accordion,
 *          billing toggle, sticky mobile CTA
 */

// ─── Scroll-reveal ───────────────────────────────────────────
const revealEls = document.querySelectorAll(
  '.feature-card, .step, .pricing-card, .faq-item, .testimonial-card'
);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'iosSlideUp 0.5s cubic-bezier(0.4,0.0,0.2,1) both';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.animationDelay = `${i * 0.06}s`;
    observer.observe(el);
  });
}

// ─── Active nav link on scroll ───────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.toggle(
          'active',
          link.getAttribute('href') === `#${entry.target.id}`
        );
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => navObserver.observe(s));

// ─── FAQ accordion ───────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-a');
    const isOpen = btn.getAttribute('aria-expanded') === 'true';

    // Close all others
    document.querySelectorAll('.faq-q').forEach(other => {
      if (other !== btn) {
        other.setAttribute('aria-expanded', 'false');
        const otherA = other.closest('.faq-item').querySelector('.faq-a');
        otherA.classList.remove('open');
      }
    });

    // Toggle current
    btn.setAttribute('aria-expanded', String(!isOpen));
    answer.classList.toggle('open', !isOpen);
  });
});

// ─── Billing toggle ──────────────────────────────────────────
const billingToggle = document.getElementById('billingToggle');
const proPrice      = document.getElementById('proPrice');
const proDesc       = document.getElementById('proDesc');
const toggleMonthly = document.getElementById('toggleMonthly');
const toggleAnnual  = document.getElementById('toggleAnnual');

const MONTHLY_PRICE = '$9';
const ANNUAL_PRICE  = '$7';
const MONTHLY_DESC  = 'For sales reps and teams who send every day.';
const ANNUAL_DESC   = 'Billed annually ($84/yr). Cancel anytime.';

if (billingToggle && proPrice) {
  billingToggle.addEventListener('click', () => {
    const isAnnual = billingToggle.classList.toggle('active');
    billingToggle.setAttribute('aria-pressed', String(isAnnual));

    proPrice.textContent = isAnnual ? ANNUAL_PRICE : MONTHLY_PRICE;
    if (proDesc) proDesc.textContent = isAnnual ? ANNUAL_DESC : MONTHLY_DESC;

    if (toggleMonthly) toggleMonthly.style.color = isAnnual ? '' : 'var(--black)';
    if (toggleAnnual)  toggleAnnual.style.color  = isAnnual ? 'var(--black)' : '';
  });
}

// ─── Proof-stat counter animation ────────────────────────────
const countEls = document.querySelectorAll('.count-up');

if ('IntersectionObserver' in window && countEls.length) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);

      const el      = entry.target;
      const target  = parseInt(el.dataset.target, 10);
      const suffix  = el.dataset.suffix || '';
      const duration = 1200;
      const start    = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });

  countEls.forEach(el => counterObserver.observe(el));
}

// ─── Sticky mobile CTA ───────────────────────────────────────
const stickyBtn = document.getElementById('mobileStickyBtn');
const heroSection = document.querySelector('.hero');

if (stickyBtn && heroSection && window.matchMedia('(max-width: 640px)').matches) {
  stickyBtn.removeAttribute('aria-hidden');

  const stickyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // Show sticky bar once hero is out of view
      stickyBtn.classList.toggle('visible', !entry.isIntersecting);
    });
  }, { threshold: 0 });

  stickyObserver.observe(heroSection);
}
