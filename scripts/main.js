// Lavion Gems & Jewellers — Main JS
// Handles: hero slider, carousel, scroll reveal, sticky nav, back-to-top, mobile menu

(function () {
  'use strict';

  window.formatPrice = function (amountInPKR) {
    return `PKR ${Number(amountInPKR || 0).toLocaleString()}`;
  };

  /* ---- Hero Slider ---- */
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  let current = 0;
  let autoTimer;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), 6000);
  }
  function resetAuto() { clearInterval(autoTimer); startAuto(); }

  if (slides.length) {
    document.querySelector('.hero-arrow.next')?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    document.querySelector('.hero-arrow.prev')?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAuto(); }));
    startAuto();
  }

  /* ---- Product Carousel ---- */
  document.querySelectorAll('.carousel-wrapper').forEach(wrapper => {
    const track = wrapper.querySelector('.carousel-track');
    const cards = track.querySelectorAll('.product-card');
    const prevBtn = wrapper.querySelector('.prev-btn');
    const nextBtn = wrapper.querySelector('.next-btn');
    if (!track || !cards.length) return;

    let pos = 0;
    const getVisible = () => {
      if (window.innerWidth < 600) return 1;
      if (window.innerWidth < 1100) return 2;
      return 4;
    };
    const getMax = () => Math.max(0, cards.length - getVisible());

    const update = () => {
      const cardWidth = cards[0].getBoundingClientRect().width + 24;
      track.style.transform = `translateX(-${pos * cardWidth}px)`;
      if (prevBtn) prevBtn.style.opacity = pos === 0 ? '0.3' : '1';
      if (nextBtn) nextBtn.style.opacity = pos >= getMax() ? '0.3' : '1';
    };

    prevBtn?.addEventListener('click', () => { if (pos > 0) { pos--; update(); } });
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        pos = Math.min(pos, getMax());
        update();
      }, 100);
    });
    update();
  });

  /* ---- Scroll Reveal ---- */
  const reveals = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => revealObserver.observe(el));

  /* ---- Counter Animation ---- */
  const counters = document.querySelectorAll('.pillar-number[data-target]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-target'));
      const suffix = el.getAttribute('data-suffix') || '';
      let start = 0;
      const duration = 2000;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObserver.observe(c));

  /* ---- Sticky Nav ---- */
  const nav = document.querySelector('.main-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) nav?.classList.add('scrolled');
    else nav?.classList.remove('scrolled');

    const btn = document.querySelector('.back-to-top');
    if (window.scrollY > 400) btn?.classList.add('visible');
    else btn?.classList.remove('visible');
  }, { passive: true });

  /* ---- Back to Top ---- */
  document.querySelector('.back-to-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- Mobile Menu ---- */
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeBtn = document.querySelector('.mobile-menu-close');

  hamburger?.addEventListener('click', () => {
    mobileMenu?.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  closeBtn?.addEventListener('click', () => {
    mobileMenu?.classList.remove('open');
    document.body.style.overflow = '';
  });
  mobileMenu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* ---- Newsletter ---- */
  document.querySelector('.newsletter-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input  = e.target.querySelector('input[type="email"]');
    const btn    = e.target.querySelector('button[type="submit"]');
    const email  = input?.value.trim();
    if (!email) return;

    const origBtnText = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        // Remembered so the popup does not ask someone to subscribe three
        // seconds after they have just subscribed here. Permanent, and in the
        // same key the popup reads. Guarded because storage throws outright in
        // private browsing.
        try {
          localStorage.setItem('lavion.newsletter',
            JSON.stringify({ state: 'subscribed', at: Date.now() }));
        } catch (e) { /* the popup will simply ask again */ }
        if (input) { input.value = ''; input.placeholder = '✓ Thank you for subscribing!'; }
        setTimeout(() => { if (input) input.placeholder = 'Your email address'; }, 4000);
      } else {
        if (input) { input.placeholder = data.message || 'Something went wrong, try again.'; }
      }
    } catch {
      if (input) { input.placeholder = 'Network error, please try again.'; }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = origBtnText; }
      setTimeout(() => { if (input) input.placeholder = 'Your email address'; }, 4000);
    }
  });

  /* ======================================
     PER-PRODUCT CURRENCY CONVERSION SYSTEM
  ====================================== */  /* ======================================
     PER-PRODUCT CURRENCY CONVERSION SYSTEM
  ====================================== */
  const PRODUCT_RATES = {
    PKR: { code: 'PKR', symbol: 'Rs', rate: 1.0, prefix: 'PKR ' },
    USD: { code: 'USD', symbol: '$', rate: 0.0036, prefix: '$ ' },
    GBP: { code: 'GBP', symbol: '£', rate: 0.0028, prefix: '£ ' },
    EUR: { code: 'EUR', symbol: '€', rate: 0.0033, prefix: '€ ' },
    AED: { code: 'AED', symbol: 'AED', rate: 0.0132, prefix: 'AED ' },
    SAR: { code: 'SAR', symbol: 'SAR', rate: 0.0135, prefix: 'SAR ' },
    CAD: { code: 'CAD', symbol: 'CA$', rate: 0.0049, prefix: 'CA$ ' }
  };

  window.formatProductPrice = function (priceInPKR, currencyCode = 'PKR') {
    const curr = PRODUCT_RATES[currencyCode] || PRODUCT_RATES.PKR;
    const converted = Math.round(priceInPKR * curr.rate);
    return `${curr.prefix}${converted.toLocaleString()}`;
  };

  window.renderCurrencySelector = function (productId, currentCurrency = 'PKR') {
    return '';
  };

  window.handleProductCurrencyChange = function (selectEl) {
    const productId = selectEl.getAttribute('data-id');
    const newCurrency = selectEl.value;
    const products = window.getProducts();
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;

    const card = selectEl.closest('.product-card, .mobile-cart-card, .quickview-dialog, tr');
    if (card) {
      const priceDisplay = card.querySelector('.product-card-price, .mobile-cart-price, .cart-price-display');
      if (priceDisplay) {
        priceDisplay.innerHTML = window.formatProductPrice(product.price, newCurrency);
        priceDisplay.style.color = 'var(--color-gold-light)';
      }
    }
  };

  window.formatPrice = function (amountInPKR) {
    return window.formatProductPrice(amountInPKR, 'PKR');
  };

  /* ======================================
     ADMIN PANEL CONTROLLER
  ====================================== */
  const DEFAULT_PRODUCTS = [
    { id: '1', name: 'Emerald Royale Ring', category: 'rings', price: 285000, stock: 8, badge: 'New', img: 'images/featured_rings.png', desc: '22k Gold & Colombian Emerald Ring' },
    { id: '2', name: 'Diamond Halo Necklace', category: 'necklaces', price: 620000, stock: 4, badge: 'Bestseller', img: 'images/hero_necklace.png', desc: '18k White Gold & 2.2ct Diamond Necklace' },
    { id: '3', name: 'Celestial Drops Earrings', category: 'earrings', price: 195000, stock: 12, badge: '', img: 'images/featured_earrings.png', desc: '18k Gold Diamond Pavé Drop Earrings' },
    { id: '4', name: 'Eternity Bangle', category: 'bracelets', price: 430000, stock: 3, badge: 'Limited', img: 'images/featured_bracelets.png', desc: '22k Gold Diamond-Set Bangle' },
    { id: '5', name: 'Royal Parure Set', category: 'asian', price: 1250000, stock: 2, badge: 'Heritage', img: 'images/hero_campaign.png', desc: '22k Gold Full Set — Necklace, Earrings & Ring' },
    { id: '6', name: 'Ruby Solitaire Ring', category: 'rings', price: 360000, stock: 6, badge: '', img: 'images/featured_rings.png', desc: '22k Gold & Burmese Ruby Ring' },
    { id: '7', name: 'Certified Ceylon Sapphire', category: 'gems', price: 450000, stock: 5, badge: 'Certified', img: 'images/gems.png', desc: 'Precious unmounted royal blue sapphire' },
    { id: '8', name: 'GIA Solitaire Diamond Ring', category: 'diamonds', price: 890000, stock: 2, badge: 'New', img: 'images/diamonds.png', desc: 'Platinum & GIA Certified VVS Diamond Ring' },
    { id: '9', name: 'Kundan Polki Choker Set', category: 'asian', price: 780000, stock: 4, badge: 'Heritage', img: 'images/asian_jewellery.png', desc: 'Heritage 22k Gold Kundan & Polki Choker' },
    { id: '10', name: 'Art Deco Diamond Cuff', category: 'western', price: 560000, stock: 3, badge: 'Limited', img: 'images/western_jewellery.png', desc: 'Minimalist Platinum & Diamond Art Deco Cuff' },
    { id: '11', name: 'Bespoke Calligraphy Gold Pendant', category: 'customized', price: 185000, stock: 10, badge: 'Custom', img: 'images/hero_campaign.png', desc: 'Handcrafted 22k Gold Custom Arabic/Urdu Name Calligraphy' },
    { id: '12', name: 'Custom Emerald Bridal Choker', category: 'customized', price: 1450000, stock: 5, badge: 'Bespoke', img: 'images/asian_jewellery.png', desc: 'Custom Designed 22k Gold & Colombian Emerald Parure' },
    { id: '13', name: 'Custom Engagement Solitaire', category: 'customized', price: 950000, stock: 8, badge: 'Bespoke', img: 'images/featured_rings.png', desc: 'Tailor-Made Platinum & GIA Diamond Engagement Ring' }
  ];

  const DEFAULT_ORDERS = [
    { id: 'ORD-8821', customer: 'Ayesha Malik', phone: '+92 300 1234567', city: 'Lahore', items: 'Emerald Royale Ring (x1)', total: 285000, status: 'Pending', date: '2026-07-27' },
    { id: 'ORD-8822', customer: 'Hamza Khan', phone: '+92 321 9876543', city: 'Karachi', items: 'Diamond Halo Necklace (x1)', total: 620000, status: 'Processing', date: '2026-07-27' },
    { id: 'ORD-8823', customer: 'Zainab Ahmed', phone: '+92 333 4567890', city: 'Islamabad', items: 'Eternity Bangle (x1), Celestial Drops (x1)', total: 625000, status: 'Shipped', date: '2026-07-26' },
    { id: 'ORD-8824', customer: 'Tariq Siddiqui', phone: '+92 301 5554433', city: 'Rawalpindi', items: 'Royal Parure Set (x1)', total: 1250000, status: 'Delivered', date: '2026-07-25' }
  ];

  /* ======================================
     NODE.JS BACKEND INTEGRATION CLIENT
  ====================================== */
  // Same-origin everywhere it actually runs: scripts/dev-server.js serves the
  // site and the API on one port, and Vercel rewrites /api to the serverless
  // function. A hardcoded host here pointed every visitor's browser at their
  // own machine in production. Only a separate static server (Live Server and
  // friends, on some other port) needs to be told where the API lives.
  const API_URL = (
    location.protocol === 'file:' ||
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port !== '5000')
  ) ? 'http://localhost:5000/api' : '/api';

  const PRODUCTS_KEY = 'lavion_products_v5';

  /**
   * Admin requests carry the token minted by /api/auth/admin-login. Without it
   * the catalog write endpoints answer 403, so an admin edit would never leave
   * the browser.
   */
  function adminFetch(path, options = {}) {
    const token = sessionStorage.getItem('lavion_admin_token');
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  }

  /**
   * Persist one catalog change to the server.
   *
   * localStorage alone is not enough: syncBackendData() overwrites the products
   * key from /api/products on every page load, so a change kept only in the
   * browser is erased by the next navigation. Returns false when the server
   * refused, so the caller can say so rather than imply the change stuck.
   */
  async function persistProduct(method, product) {
    const path = method === 'POST' ? '/products' : `/products/${product.id}`;
    try {
      const res = await adminFetch(path, {
        method,
        body: method === 'DELETE' ? undefined : JSON.stringify(product)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Product sync rejected:', res.status, data.message || '');
        // Carry the server's own words back. "The server refused the change"
        // gave the admin nothing to act on; the reason is usually specific and
        // fixable — a read-only store, an expired session, a missing field.
        return { ok: false, reason: data.message || `Server returned ${res.status}.` };
      }
      // POST mints its own id server-side; adopt it or the next sync would
      // show the same piece twice, once under each id.
      return { ok: true, product: data.product };
    } catch (e) {
      console.error('Product sync failed:', e.message);
      return { ok: false, reason: 'Could not reach the server.' };
    }
  }

  /** Stock drives storefront availability, so the catalog has to repaint too. */
  function renderProductsEverywhere() {
    if (typeof window.renderProducts === 'function') window.renderProducts();
  }

  async function persistOrder(method, id, body) {
    try {
      const res = await adminFetch(`/orders/${id}${method === 'DELETE' ? '' : '/status'}`, {
        method,
        body: method === 'DELETE' ? undefined : JSON.stringify(body)
      });
      if (res.ok) return { ok: true };
      const data = await res.json().catch(() => ({}));
      return { ok: false, reason: data.message || `Server returned ${res.status}.` };
    } catch (e) {
      console.error('Order sync failed:', e.message);
      return { ok: false, reason: 'Could not reach the server.' };
    }
  }

  async function syncBackendData() {
    try {
      const prodRes = await fetch(`${API_URL}/products`);
      if (prodRes.ok) {
        const data = await prodRes.json();
        if (data.products && data.products.length > 0) {
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data.products));
        }
      }

      const goldRes = await fetch(`${API_URL}/gold-rates`);
      if (goldRes.ok) {
        const data = await goldRes.json();
        if (data.goldRates) {
          localStorage.setItem('lavion_gold_rates_v1', JSON.stringify(data.goldRates));
          if (typeof window.renderGoldRateBar === 'function') window.renderGoldRateBar();
        }
      }

      /**
       * Orders are only fetched for a signed-in admin, and only with the token.
       *
       * This used to run for everyone, unauthenticated, on every page load —
       * so every visitor's browser ended up holding the shop's whole customer
       * list: names, phone numbers, email addresses and home addresses. A
       * shopper has no use for other people's orders, and the admin table is
       * the only thing that reads this key.
       */
      if (!sessionStorage.getItem('lavion_admin_token')) {
        // Anyone who visited before this fix still has the leaked list sitting
        // in their browser. Stopping the copying is only half the job; the
        // copies already made have to go too.
        localStorage.removeItem('lavion_orders_v1');
      } else {
        const orderRes = await adminFetch('/orders');
        if (orderRes.ok) {
          const data = await orderRes.json();
          if (data.orders) {
            localStorage.setItem('lavion_orders_v1', JSON.stringify(data.orders));
          }
        }
      }
    } catch (e) {
      console.log('Backend sync offline - operating in client mode.');
    }
  }

  syncBackendData();

  function getProducts() {
    const saved = localStorage.getItem(PRODUCTS_KEY);
    if (!saved) {
      ['v1', 'v2', 'v3', 'v4'].forEach(v => localStorage.removeItem(`lavion_products_${v}`));
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(saved);
  }

  window.getProducts = getProducts;

  /**
   * This wrote to lavion_products_v4 while getProducts read v5, so every admin
   * write — stock +/-, the quantity field, add, edit, delete — landed in a key
   * nothing reads and the re-render showed the untouched original. That is why
   * the stock controls appeared inert. The key now has one definition.
   */
  function saveProducts(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    renderAdmin();
  }

  window.saveProducts = saveProducts;

  function getOrders() {
    const saved = localStorage.getItem('lavion_orders_v1');
    if (!saved) {
      localStorage.setItem('lavion_orders_v1', JSON.stringify(DEFAULT_ORDERS));
      return DEFAULT_ORDERS;
    }
    return JSON.parse(saved);
  }

  function saveOrders(orders) {
    localStorage.setItem('lavion_orders_v1', JSON.stringify(orders));
    renderAdmin();
  }

  // Admin Overlay & Authentication Elements
  const adminOverlay = document.getElementById('admin-overlay');
  const openAdminBtn = document.getElementById('open-admin-panel');
  const closeAdminBtn = document.getElementById('admin-close-btn');
  const loginModal = document.getElementById('admin-login-modal');
  const loginForm = document.getElementById('admin-login-form');
  const loginCancelBtn = document.getElementById('login-cancel-btn');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const logoutBtn = document.getElementById('admin-logout-btn');

  function isAuthenticated() {
    return sessionStorage.getItem('lavion_admin_auth') === 'true';
  }

  function toggleAdminLinks(visible) {
    document.querySelectorAll('#open-admin-panel, .open-admin-panel').forEach((btn) => {
      btn.style.display = visible ? '' : 'none';
      btn.setAttribute('aria-hidden', String(!visible));
    });
  }

  function isDirectAdminRoute() {
    const path = window.location.pathname.toLowerCase();
    const isAdminPath = path === '/admin' || path === '/admin-panel' || path.endsWith('/admin') || path.endsWith('/admin-panel');
    const hasAdminParam = new URLSearchParams(window.location.search).get('admin') === 'true';
    return isAdminPath || hasAdminParam;
  }

  /**
   * Opens the admin login modal.
   *
   * Deliberately does NOT re-check isDirectAdminRoute(): the caller has
   * already established that, and by the time this runs the ?admin=true
   * parameter has been stripped from the URL, so re-checking always failed
   * and the modal never appeared.
   */
  function openAdminLoginDirectly() {
    if (!loginModal) {
      // Only / carries the admin markup; send other pages there.
      window.location.href = '/?admin=true';
      return;
    }
    if (loginErrorMsg) loginErrorMsg.style.display = 'none';
    const passField = document.getElementById('login-password');
    if (passField) passField.value = '';
    loginModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('login-username')?.focus();
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    if (!user || !pass) {
      if (loginErrorMsg) loginErrorMsg.style.display = 'block';
      return;
    }

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem('lavion_admin_auth', 'true');
        sessionStorage.setItem('lavion_admin_token', data.token || '');
        sessionStorage.setItem('lavion_admin_user', JSON.stringify(data.user || {}));
        toggleAdminLinks(true);
        loginModal?.classList.remove('active');
        adminOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderAdmin();
        return;
      }

      if (loginErrorMsg) {
        loginErrorMsg.textContent = data.message || 'Invalid admin credentials.';
        loginErrorMsg.style.display = 'block';
      }
    } catch (error) {
      // No client-side fallback. Granting admin access when the API is merely
      // unreachable let anyone in by blocking the request in devtools.
      console.error('Admin login failed:', error);
      if (loginErrorMsg) {
        loginErrorMsg.textContent = 'Unable to reach admin service. Please try again.';
        loginErrorMsg.style.display = 'block';
      }
    }
  }

  const triggerOpenAdmin = (e) => {
    e?.preventDefault();
    document.getElementById('mobile-menu')?.classList.remove('active');
    if (isAuthenticated()) {
      adminOverlay?.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderAdmin();
    } else {
      if (loginErrorMsg) {
        loginErrorMsg.textContent = 'Invalid admin credentials.';
        loginErrorMsg.style.display = 'none';
      }
      const passField = document.getElementById('login-password');
      if (passField) passField.value = '';
      loginModal?.classList.add('active');
    }
  };

  document.querySelectorAll('#open-admin-panel, .open-admin-panel').forEach(btn => {
    btn.addEventListener('click', triggerOpenAdmin);
  });

  loginCancelBtn?.addEventListener('click', () => {
    loginModal?.classList.remove('active');
  });

  loginForm?.addEventListener('submit', handleAdminLogin);

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem('lavion_admin_auth');
    sessionStorage.removeItem('lavion_admin_token');
    sessionStorage.removeItem('lavion_admin_user');
    toggleAdminLinks(false);
    adminOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  });

  closeAdminBtn?.addEventListener('click', () => {
    adminOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  });

  toggleAdminLinks(isAuthenticated());

  function handleDirectAdminRoute() {
    if (!isDirectAdminRoute()) return;

    const needsRedirect = !loginModal && !adminOverlay;

    if (isAuthenticated() && adminOverlay) {
      adminOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderAdmin();
    } else {
      openAdminLoginDirectly();
    }

    // Strip ?admin=true only AFTER acting on it. Cleaning it first left
    // isDirectAdminRoute() false for everything downstream.
    if (!needsRedirect && window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // main.js runs at the end of <body>, but guard against the case where the
  // load event has already fired (bfcache restore, cached reload).
  if (document.readyState === 'complete') {
    handleDirectAdminRoute();
  } else {
    window.addEventListener('load', handleDirectAdminRoute);
  }

  // Tab switching
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.add('active');
      // The subscriber list is fetched on demand rather than at login, so
      // opening the panel does not pay for a query nobody asked for.
      if (targetId === 'admin-newsletter') loadSubscribers();
    });
  });

  /* ======================================
     NEWSLETTER SUBSCRIBERS & PROMOTIONS
  ====================================== */
  let subscriberCache = [];

  function renderSubscribers() {
    const tbody = document.getElementById('admin-subs-tbody');
    if (!tbody) return;
    const term = (document.getElementById('admin-search-subs')?.value || '').trim().toLowerCase();
    const rows = term ? subscriberCache.filter(s => s.email.includes(term)) : subscriberCache;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:28px; color:rgba(255,255,255,0.5);">
        ${subscriberCache.length ? 'No subscribers match that search.' : 'Nobody has subscribed yet.'}</td></tr>`;
      return;
    }

    const when = v => v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    tbody.innerHTML = rows.map(s => `
      <tr>
        <td>${s.email}</td>
        <td><span class="admin-status-tag ${s.status === 'active' ? 'instock' : ''}"
             style="${s.status === 'active'
               ? 'background:#1e4620;color:#2ecc71;border:1px solid #2ecc71;'
               : 'background:#3a1a1a;color:#e74c3c;border:1px solid #e74c3c;'} padding:3px 9px; font-size:11px;">
             ${s.status === 'active' ? 'Active' : 'Unsubscribed'}</span></td>
        <td>${s.source || 'homepage'}</td>
        <td>${when(s.subscribedAt)}</td>
        <td>${when(s.lastCampaignAt)}</td>
      </tr>`).join('');
  }

  async function loadSubscribers() {
    const tbody = document.getElementById('admin-subs-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:28px; color:rgba(255,255,255,0.5);">Loading…</td></tr>`;
    try {
      const res = await adminFetch('/subscribe/list');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load subscribers.');

      subscriberCache = data.subscribers || [];
      document.getElementById('stat-subs-active').textContent = data.active || 0;
      document.getElementById('stat-subs-unsub').textContent = data.unsubscribed || 0;
      document.getElementById('stat-subs-total').textContent = data.total || 0;
      renderSubscribers();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:28px; color:#e74c3c;">${err.message}</td></tr>`;
    }
  }

  document.getElementById('admin-search-subs')?.addEventListener('input', renderSubscribers);
  document.getElementById('promo-refresh-btn')?.addEventListener('click', loadSubscribers);

  /** Read the compose form, refusing anything the server would reject anyway. */
  function readCampaignForm() {
    const subject = document.getElementById('promo-subject')?.value.trim() || '';
    const body = document.getElementById('promo-body')?.value.trim() || '';
    if (!subject) { showToast('A subject line is required.', 'error'); return null; }
    if (!body) { showToast('The message body cannot be empty.', 'error'); return null; }
    return {
      subject,
      heading: document.getElementById('promo-heading')?.value.trim() || subject,
      body,
      ctaLabel: document.getElementById('promo-cta-label')?.value.trim() || '',
      ctaUrl: document.getElementById('promo-cta-url')?.value.trim() || ''
    };
  }

  async function postCampaign(payload, btn, busyLabel) {
    const original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = busyLabel; }
    try {
      const res = await adminFetch('/subscribe/campaign', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      showToast(data.message || (data.success ? 'Sent.' : 'Send failed.'), data.success ? 'success' : 'error');
      if (data.success && !payload.test) loadSubscribers();
    } catch (err) {
      showToast(`Could not reach the server: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  }

  document.getElementById('promo-test-btn')?.addEventListener('click', () => {
    const campaign = readCampaignForm();
    if (!campaign) return;
    postCampaign({ ...campaign, test: true }, document.getElementById('promo-test-btn'), 'Sending…');
  });

  document.getElementById('promo-send-btn')?.addEventListener('click', () => {
    const campaign = readCampaignForm();
    if (!campaign) return;
    const active = Number(document.getElementById('stat-subs-active')?.textContent || 0);
    if (!active) { showToast('There are no active subscribers to send to.', 'error'); return; }

    // A bulk send cannot be undone, so it goes through the same confirm dialog
    // that guards deletions rather than firing straight off a single click.
    showCustomConfirm(
      'Send to all subscribers?',
      `This will email ${active} active subscriber${active === 1 ? '' : 's'} immediately. This cannot be undone.`,
      () => postCampaign(campaign, document.getElementById('promo-send-btn'), 'Sending…'),
      'Send Now'
    );
  });

  document.getElementById('quick-add-btn')?.addEventListener('click', () => openProductModal());
  document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal());
  document.getElementById('quick-orders-btn')?.addEventListener('click', () => {
    document.querySelector('.admin-tab-btn[data-tab="admin-orders"]')?.click();
  });

  // Custom Confirmation Dialog & Toast System
  const confirmModal = document.getElementById('admin-confirm-modal');
  const confirmTitle = document.getElementById('confirm-modal-title');
  const confirmMsg = document.getElementById('confirm-modal-msg');
  const confirmOkBtn = document.getElementById('confirm-ok-btn');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  let pendingConfirmAction = null;

  /**
   * `confirmLabel` exists because this dialog is no longer only used for
   * deletions — a bulk newsletter send is just as irreversible. It defaults to
   * the old wording so existing callers are unaffected.
   */
  function showCustomConfirm(title, message, onConfirm, confirmLabel) {
    if (confirmTitle) confirmTitle.textContent = title || 'Confirm Action';
    if (confirmMsg) confirmMsg.textContent = message || 'Are you sure you want to proceed?';
    if (confirmOkBtn) confirmOkBtn.textContent = confirmLabel || 'Confirm Delete';
    pendingConfirmAction = onConfirm;
    confirmModal?.classList.add('active');
  }

  confirmOkBtn?.addEventListener('click', () => {
    if (typeof pendingConfirmAction === 'function') {
      pendingConfirmAction();
    }
    pendingConfirmAction = null;
    confirmModal?.classList.remove('active');
  });

  confirmCancelBtn?.addEventListener('click', () => {
    pendingConfirmAction = null;
    confirmModal?.classList.remove('active');
  });

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <div>${message}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // Modal Product Form
  const productModal = document.getElementById('admin-product-modal');
  const productForm = document.getElementById('admin-product-form');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalTitle = document.getElementById('modal-product-title');
  const addProductBtn = document.getElementById('add-product-btn');
  const quickAddBtn = document.getElementById('quick-add-btn');

  /* ======================================
     PRODUCT IMAGES
     One ordered list, not a main picture and a list of others. The first is
     the main one — that is what "reorder" has to mean for it to be worth
     having — and it is split back into img + images only when the form is
     submitted, so nothing downstream has to change.
  ====================================== */

  /** More than this and the page is scrolling through a photo album. */
  const MAX_PRODUCT_IMAGES = 8;

  /**
   * Uploads are stored as data URIs inside the product record, which is how
   * this admin has always handled the single image. That is fine for a few
   * modest pictures and ruinous for eight straight off a phone: a 4 MB JPEG
   * becomes 5.5 MB of base64, eight of them exceed Mongo's 16 MB document
   * limit outright, and every catalogue read afterwards carries the weight.
   *
   * So every upload is re-encoded before it is stored — longest edge capped,
   * re-compressed as JPEG. A 4000×3000 phone photograph comes out around
   * 250 KB, which is a sensible size for a product page anyway.
   */
  const IMAGE_MAX_EDGE = 1600;
  const IMAGE_QUALITY = 0.82;

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error(`${file.name} is not an image this browser can read.`));
        img.onload = () => {
          const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          // A PNG with transparency would otherwise come out with black behind
          // it once it is re-encoded as JPEG.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /** The working list for the product form. First entry is the main picture. */
  let productImages = [];

  const isDataUri = s => /^data:/i.test(String(s || ''));

  /** A stored piece into the one ordered list the form edits. */
  function loadProductImages(product) {
    const main = product && product.img ? [product.img] : [];
    const rest = product && Array.isArray(product.images) ? product.images : [];
    productImages = [...main, ...rest].filter(Boolean).slice(0, MAX_PRODUCT_IMAGES);
    renderProductImages();
  }

  function renderProductImages() {
    const grid = document.getElementById('form-product-images-grid');
    const note = document.getElementById('form-product-images-note');
    if (!grid) return;

    if (!productImages.length) {
      grid.innerHTML = `<p style="grid-column:1/-1; font-size:12px; color:rgba(255,255,255,0.45); margin:0;">
        No pictures yet. Add one or more below — the first is the one shown on cards and in search results.
      </p>`;
    } else {
      grid.innerHTML = productImages.map((src, i) => `
        <figure style="margin:0; border:1px solid ${i === 0 ? 'var(--color-gold)' : 'rgba(255,255,255,0.15)'}; border-radius:6px; overflow:hidden; background:#12100e;">
          <div style="position:relative; aspect-ratio:1; background:#0b0a09;">
            <img src="${escapeHtml(src)}" alt="" style="width:100%; height:100%; object-fit:cover;" />
            ${i === 0 ? '<span style="position:absolute; top:6px; left:6px; background:var(--color-gold); color:#0b0a09; font-size:9px; font-weight:700; letter-spacing:1.2px; padding:3px 7px; border-radius:3px;">MAIN</span>' : ''}
          </div>
          <figcaption style="display:flex; gap:4px; padding:6px; justify-content:center;">
            <button type="button" class="pi-move" data-i="${i}" data-dir="-1" title="Move earlier"
              ${i === 0 ? 'disabled' : ''} style="flex:1; padding:5px; cursor:pointer; background:none; border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:4px; ${i === 0 ? 'opacity:.3; cursor:default;' : ''}">&larr;</button>
            <button type="button" class="pi-remove" data-i="${i}" title="Remove"
              style="flex:1; padding:5px; cursor:pointer; background:none; border:1px solid rgba(231,76,60,0.5); color:#e74c3c; border-radius:4px;">&times;</button>
            <button type="button" class="pi-move" data-i="${i}" data-dir="1" title="Move later"
              ${i === productImages.length - 1 ? 'disabled' : ''} style="flex:1; padding:5px; cursor:pointer; background:none; border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:4px; ${i === productImages.length - 1 ? 'opacity:.3; cursor:default;' : ''}">&rarr;</button>
          </figcaption>
        </figure>`).join('');
    }

    if (note) {
      const stored = productImages.filter(isDataUri).length;
      const bytes = productImages.filter(isDataUri).reduce((n, s) => n + s.length * 0.75, 0);
      note.textContent = productImages.length
        ? `${productImages.length} of ${MAX_PRODUCT_IMAGES}. The first is the main picture.` +
          (stored ? ` ${stored} uploaded, about ${Math.round(bytes / 1024)} KB stored with the piece.` : '')
        : '';
    }

    grid.querySelectorAll('.pi-move').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-i'));
        const to = i + Number(btn.getAttribute('data-dir'));
        if (to < 0 || to >= productImages.length) return;
        const [moved] = productImages.splice(i, 1);
        productImages.splice(to, 0, moved);
        renderProductImages();
      });
    });

    grid.querySelectorAll('.pi-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        productImages.splice(Number(btn.getAttribute('data-i')), 1);
        renderProductImages();
      });
    });
  }

  async function addProductImageFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;

    const room = MAX_PRODUCT_IMAGES - productImages.length;
    if (room <= 0) {
      showToast(`A piece can carry ${MAX_PRODUCT_IMAGES} pictures. Remove one first.`, 'error');
      return;
    }
    if (files.length > room) {
      showToast(`Only ${room} more will fit — the rest were skipped.`, 'info');
    }

    for (const file of files.slice(0, room)) {
      if (!/^image\//.test(file.type)) {
        showToast(`${file.name} is not an image.`, 'error');
        continue;
      }
      try {
        productImages.push(await compressImage(file));
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
    renderProductImages();
  }

  /* ======================================
     COLLECTIONS
     The eight the site ships with are hardcoded here, because they are
     hardcoded everywhere else too — one .html page each, their own copy, their
     own indexed URLs. Anything the shop invents is stored and fetched.
  ====================================== */

  const BUILT_IN_CATEGORIES = [
    { slug: 'rings', name: 'Rings' },
    { slug: 'necklaces', name: 'Necklaces' },
    { slug: 'earrings', name: 'Earrings' },
    { slug: 'bracelets', name: 'Bracelets' },
    { slug: 'asian', name: 'Asian Jewellery' },
    { slug: 'western', name: 'Western Jewellery' },
    { slug: 'gems', name: 'Precious Gems' },
    { slug: 'diamonds', name: 'Diamonds' },
    { slug: 'customized', name: 'Customized' }
  ];

  let customCategories = [];

  window.loadCategories = async function () {
    try {
      const res = await fetch(`${API_URL}/categories`);
      if (!res.ok) return customCategories;
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        customCategories = data.categories;
        // The manager is only on screen for an admin, and repainting it when
        // the list lands is what keeps it from showing an empty table for as
        // long as the fetch takes.
        renderCollectionsManager();
      }
    } catch (e) {
      // The eight built-ins still work without the network; a shop-made
      // collection simply will not be offered until it can be read.
    }
    return customCategories;
  };

  /** Built-ins first, in their long-standing order, then whatever was added. */
  function allCategories() {
    return [...BUILT_IN_CATEGORIES, ...customCategories.map(c => ({ slug: c.slug, name: c.name }))];
  }

  window.categoryLabel = function (slug) {
    const found = allCategories().find(c => c.slug === String(slug || '').toLowerCase());
    if (found) return found.name;
    const s = String(slug || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') : '';
  };

  /**
   * The home collection and the extra ones.
   *
   * They are separate controls because they are separate ideas: the home
   * collection decides the piece's breadcrumb and which page is canonical,
   * while the extras only decide which listings it also turns up in. Merging
   * them into one multi-select would have left the primary ambiguous.
   */
  function renderCategoryControls(product) {
    /**
     * The list may still be in flight.
     *
     * loadCategories() is kicked off at boot, but the form can be opened
     * before that fetch has come back — and then it offers only the eight
     * built-ins, with the shop's own collections silently missing. Painting
     * again when they land costs nothing and closes the gap; the ticks made in
     * the meantime are carried over rather than reset.
     */
    if (!customCategories.length) {
      window.loadCategories().then(list => {
        if (list && list.length && document.getElementById('form-product-category')) {
          paintCategoryControls(product, new Set(readExtraCategories()));
        }
      });
    }
    paintCategoryControls(product);
  }

  function paintCategoryControls(product, keep) {
    const select = document.getElementById('form-product-category');
    const extras = document.getElementById('form-product-extra-categories');
    const home = String((product && product.category) || 'rings').toLowerCase();
    const also = keep || new Set(
      (product && Array.isArray(product.categories) ? product.categories : [])
        .map(c => String(c).toLowerCase())
    );

    if (select) {
      select.innerHTML = allCategories()
        .map(c => `<option value="${escapeHtml(c.slug)}"${c.slug === home ? ' selected' : ''}>${escapeHtml(c.name)}</option>`)
        .join('');
      // A piece filed under something since deleted keeps its value rather
      // than being silently re-filed under whatever happens to be first.
      if (!allCategories().some(c => c.slug === home)) {
        select.insertAdjacentHTML('afterbegin',
          `<option value="${escapeHtml(home)}" selected>${escapeHtml(window.categoryLabel(home))} (no longer listed)</option>`);
      }
      select.onchange = () => renderExtraCategoryChoices();
    }

    if (extras) renderExtraCategoryChoices(also);
  }

  /** Checkboxes for every collection except the one chosen as home. */
  function renderExtraCategoryChoices(preset) {
    const box = document.getElementById('form-product-extra-categories');
    if (!box) return;

    const chosen = preset || new Set(readExtraCategories());
    const home = (document.getElementById('form-product-category') || {}).value;

    const options = allCategories().filter(c => c.slug !== home);
    box.innerHTML = options.length
      ? options.map(c => `
          <label style="display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid rgba(200,169,110,0.3); border-radius:6px; font-size:12px; color:rgba(255,255,255,0.8); cursor:pointer;">
            <input type="checkbox" class="extra-category" value="${escapeHtml(c.slug)}"${chosen.has(c.slug) ? ' checked' : ''} />
            ${escapeHtml(c.name)}
          </label>`).join('')
      : '<p style="font-size:12px; color:rgba(255,255,255,0.4); margin:0;">No other collections yet.</p>';
  }

  function readExtraCategories() {
    return [...document.querySelectorAll('.extra-category:checked')].map(el => el.value);
  }

  /** Create a collection from inside the product form, without leaving it. */
  async function createCategoryFromForm() {
    const input = document.getElementById('form-new-category');
    const name = (input?.value || '').trim();
    if (!name) {
      showToast('Give the collection a name first.', 'error');
      return;
    }

    const btn = document.getElementById('form-new-category-btn');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    try {
      const res = await adminFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || `Could not create it (${res.status}).`);

      await window.loadCategories();
      // Kept as it was, with the new collection ticked — creating one from
      // inside the form almost always means this piece belongs in it.
      const chosen = new Set(readExtraCategories());
      chosen.add(data.category.slug);
      renderExtraCategoryChoices(chosen);
      input.value = '';
      showToast(data.message || `Collection "${name}" created.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'form-new-category-btn') {
      e.preventDefault();
      createCategoryFromForm();
    }
  });

  /**
   * The specification fields, shared by the form that fills them and the form
   * that reads them back. Listed once so the two cannot drift.
   */
  const PRODUCT_SPEC_FIELDS = ['metal', 'purity', 'stone', 'stoneQuality', 'certificate', 'dimensions', 'details', 'care', 'grossWeightG', 'stoneCarats', 'stoneCount', 'madeToOrderDays', 'sizes'];

  /** A stored piece into the form. Lists arrive as arrays; inputs hold text. */
  function fillSpecFields(product) {
    PRODUCT_SPEC_FIELDS.forEach(key => {
      const el = document.getElementById(`form-product-${key}`);
      if (!el) return;
      const value = product ? product[key] : '';
      el.value = Array.isArray(value)
        ? value.join(', ')
        : (value === null || value === undefined ? '' : String(value));
    });
  }

  /**
   * The form back out.
   *
   * Every field is sent even when empty, because empty is how an admin clears
   * one. The server reads an absent key as "not part of this edit", which is
   * what lets the stock controls post { stock } alone without wiping the piece.
   */
  function readSpecFields() {
    const out = {};
    PRODUCT_SPEC_FIELDS.forEach(key => {
      const el = document.getElementById(`form-product-${key}`);
      if (el) out[key] = el.value.trim();
    });
    return out;
  }

  function openProductModal(product = null) {
    const modal = document.getElementById('admin-product-modal');
    if (!modal) return;

    const titleEl = document.getElementById('modal-product-title');
    if (titleEl) titleEl.textContent = product ? 'Edit Product Item' : 'Add New Product Item';

    if (document.getElementById('form-product-id')) document.getElementById('form-product-id').value = product ? product.id : '';
    if (document.getElementById('form-product-name')) document.getElementById('form-product-name').value = product ? product.name : '';
    if (document.getElementById('form-product-category')) document.getElementById('form-product-category').value = product ? product.category : 'rings';
    if (document.getElementById('form-product-price')) document.getElementById('form-product-price').value = product ? product.price : '';
    if (document.getElementById('form-product-stock')) document.getElementById('form-product-stock').value = product ? product.stock : 10;
    if (document.getElementById('form-product-badge')) document.getElementById('form-product-badge').value = product ? product.badge : '';
    if (document.getElementById('form-product-desc')) document.getElementById('form-product-desc').value = product ? product.desc || '' : '';
    fillSpecFields(product);

    loadProductImages(product);
    renderCategoryControls(product);

    modal.classList.add('active');
    modal.style.zIndex = '25000';
    document.body.style.overflow = 'hidden';
  }

  window.openProductModal = openProductModal;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#add-product-btn, #quick-add-btn, .admin-add-product-trigger');
    if (trigger) {
      e.preventDefault();
      openProductModal();
    }
  });

  document.getElementById('form-product-file')?.addEventListener('change', async (e) => {
    await addProductImageFiles(e.target.files);
    // Cleared, so picking the same file twice running still fires a change.
    e.target.value = '';
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.id === 'modal-cancel-btn' || e.target.closest('#modal-cancel-btn')) {
      const modal = document.getElementById('admin-product-modal');
      modal?.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.body.addEventListener('submit', async (e) => {
    if (e.target.id === 'admin-product-form') {
      e.preventDefault();
      const id = document.getElementById('form-product-id')?.value;
      const name = document.getElementById('form-product-name')?.value.trim();
      const category = document.getElementById('form-product-category')?.value;
      const price = parseFloat(document.getElementById('form-product-price')?.value) || 0;
      const stock = parseInt(document.getElementById('form-product-stock')?.value) || 0;
      const badge = document.getElementById('form-product-badge')?.value || '';
      const desc = document.getElementById('form-product-desc')?.value.trim() || '';
      // The first picture is the main one; the rest ride along in order.
      const finalImg = productImages[0] || 'images/hero_campaign.png';
      const extraImages = productImages.slice(1);
      const extraCategories = readExtraCategories();

      let products = getProducts();
      let record;
      let synced;

      if (id) {
        record = { id: String(id), name, category, categories: extraCategories, price, stock, badge, img: finalImg, images: extraImages, desc, ...readSpecFields() };
        products = products.map(p => String(p.id) === String(id) ? record : p);
        saveProducts(products);
        synced = await persistProduct('PUT', record);
        showToast(
          synced.ok ? `Product "${name}" updated.` : `"${name}" not saved: ${synced.reason}`,
          synced.ok ? 'success' : 'error'
        );
      } else {
        record = { id: String(Date.now()), name, category, categories: extraCategories, price, stock, badge, img: finalImg, images: extraImages, desc, ...readSpecFields() };
        products.unshift(record);
        saveProducts(products);
        synced = await persistProduct('POST', record);
        if (synced.ok && synced.product?.id) {
          record.id = String(synced.product.id);
          saveProducts(products);
        }
        showToast(
          synced.ok ? `"${name}" added to ${category.toUpperCase()}.` : `"${name}" not saved: ${synced.reason}`,
          synced.ok ? 'success' : 'error'
        );
      }

      
      const modal = document.getElementById('admin-product-modal');
      modal?.classList.remove('active');
      document.body.style.overflow = '';

      // Immediately refresh live admin portal tables & store catalog
      renderAdmin();
      if (typeof window.renderProducts === 'function') window.renderProducts();
    }
  });

  // Render Function
  function renderAdmin() {
    renderCollectionsManager();
    /**
     * Only the pages carrying the admin panel have these nodes. saveOrders and
     * saveProducts call this unconditionally, so on any other page the first
     * lookup returned null and the whole save threw — which is what stopped the
     * bespoke studio from ever showing its confirmation: the request had been
     * stored, then the receipt died on the line after it.
     */
    if (!document.getElementById('stat-total-products')) return;

    const products = getProducts();
    const orders = getOrders();

    // Stats
    document.getElementById('stat-total-products').textContent = products.length;
    const lowStockCount = products.filter(p => p.stock < 5).length;
    document.getElementById('stat-low-stock').textContent = lowStockCount;
    document.getElementById('stat-active-orders').textContent = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
    const totalRev = orders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('stat-revenue').textContent = `PKR ${totalRev.toLocaleString()}`;

    // Catalog Table
    const catFilter = document.getElementById('admin-filter-category')?.value || 'all';
    const searchVal = document.getElementById('admin-search-catalog')?.value.toLowerCase() || '';

    const filteredProducts = products.filter(p => {
      const matchesCat = catFilter === 'all' || p.category === catFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchVal);
      return matchesCat && matchesSearch;
    });

    const catalogTbody = document.getElementById('admin-catalog-tbody');
    if (catalogTbody) {
      catalogTbody.innerHTML = filteredProducts.map(p => `
        <tr>
          <td><img src="${p.img}" class="admin-thumb" alt="${p.name}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--color-gold);" /></td>
          <td><strong>${p.name}</strong><br><span style="font-size:11px;color:rgba(255,255,255,0.5);">${p.desc || ''}</span></td>
          <td><span style="text-transform:uppercase;font-size:11px;color:var(--color-gold-light);font-weight:700;">${p.category}</span></td>
          <td>PKR ${p.price.toLocaleString()}</td>
          <td>${p.stock} units</td>
          <td>${p.badge ? `<span class="admin-status-tag" style="background:rgba(200,169,110,0.2);color:var(--color-gold-light);">${p.badge}</span>` : '—'}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="admin-action-btn edit" data-id="${p.id}">Edit</button>
              <button class="admin-action-btn delete" data-id="${p.id}">Delete</button>
            </div>
          </td>
        </tr>
      `).join('') || `<tr><td colspan="7" style="text-align:center;padding:24px;color:rgba(255,255,255,0.5);">No items match this category filter.</td></tr>`;

      catalogTbody.querySelectorAll('.admin-action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const p = products.find(prod => String(prod.id) === String(id));
          if (p) openProductModal(p);
        });
      });

      catalogTbody.querySelectorAll('.admin-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const p = products.find(prod => String(prod.id) === String(id));
          const name = p ? p.name : 'this product';
          showCustomConfirm('Delete Product', `Are you sure you want to delete "${name}" from the catalog?`, async () => {
            const updated = products.filter(prod => String(prod.id) !== String(id));
            saveProducts(updated);
            renderProductsEverywhere();
            const synced = await persistProduct('DELETE', { id });
            showToast(
              synced.ok ? `"${name}" deleted.` : `"${name}" not deleted: ${synced.reason}`,
              'error'
            );
          });
        });
      });
    }

    // Stock Table
    const stockFilter = document.getElementById('admin-filter-stock')?.value || 'all';
    const filteredStock = products.filter(p => {
      if (stockFilter === 'low') return p.stock > 0 && p.stock < 5;
      if (stockFilter === 'out') return p.stock === 0;
      if (stockFilter === 'in') return p.stock >= 5;
      return true;
    });

    const stockTbody = document.getElementById('admin-stock-tbody');
    if (stockTbody) {
      stockTbody.innerHTML = filteredStock.map(p => {
        let tagClass = 'instock';
        let tagText = 'In Stock';
        if (p.stock === 0) { tagClass = 'outstock'; tagText = 'Out of Stock'; }
        else if (p.stock < 5) { tagClass = 'lowstock'; tagText = 'Low Stock Alert'; }

        return `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td><span style="text-transform:uppercase;font-size:11px;">${p.category}</span></td>
            <td><strong style="font-size:16px;">${p.stock}</strong> units</td>
            <td><span class="admin-status-tag ${tagClass}">${tagText}</span></td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <button class="admin-action-btn stock-dec" data-id="${p.id}" style="padding:4px 10px;">-</button>
                <input type="number" class="stock-input" data-id="${p.id}" value="${p.stock}" style="width:60px;text-align:center;background:#12100e;border:1px solid rgba(200,169,110,0.3);color:#fff;padding:4px;border-radius:4px;" />
                <button class="admin-action-btn stock-inc" data-id="${p.id}" style="padding:4px 10px;">+</button>
              </div>
            </td>
          </tr>
        `;
      }).join('') || `<tr><td colspan="5" style="text-align:center;padding:24px;color:rgba(255,255,255,0.5);">No stock records found</td></tr>`;

      /** One path for all three controls, so they cannot drift apart again. */
      const applyStock = async (id, next) => {
        const p = products.find(prod => String(prod.id) === String(id));
        if (!p) return;

        const stock = Math.max(0, Number.isFinite(next) ? next : 0);
        if (stock === p.stock) return;

        p.stock = stock;
        saveProducts(products);          // repaints immediately
        renderProductsEverywhere();

        const synced = await persistProduct('PUT', p);
        showToast(
          synced.ok
            ? `${p.name} stock set to ${stock}.`
            : `Not saved: ${synced.reason}`,
          synced.ok ? 'success' : 'error'
        );
      };

      stockTbody.querySelectorAll('.stock-dec').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = products.find(prod => String(prod.id) === String(btn.getAttribute('data-id')));
          if (p && p.stock > 0) applyStock(p.id, p.stock - 1);
        });
      });

      stockTbody.querySelectorAll('.stock-inc').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = products.find(prod => String(prod.id) === String(btn.getAttribute('data-id')));
          if (p) applyStock(p.id, p.stock + 1);
        });
      });

      stockTbody.querySelectorAll('.stock-input').forEach(input => {
        input.addEventListener('change', () => {
          applyStock(input.getAttribute('data-id'), parseInt(input.value, 10));
        });
      });
    }

    // Orders Table with Printable Invoice Button
    const orderStatusFilter = document.getElementById('admin-filter-order-status')?.value || 'all';
    const filteredOrders = orders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter);

    const ordersTbody = document.getElementById('admin-orders-tbody');
    if (ordersTbody) {
      ordersTbody.innerHTML = filteredOrders.map(o => `
        <tr>
          <td><strong>${o.id}</strong><br><span style="font-size:11px;color:rgba(255,255,255,0.5);">${o.date}</span></td>
          <td><strong>${o.customer}</strong></td>
          <td>${o.phone}</td>
          <td>${o.city}</td>
          <td><span style="font-size:12px;color:var(--color-gold-light);">${o.items}</span></td>
          <td>${o.priceConfirmed && o.total > 0 ? `<strong style="color:#2ecc71; font-size:13px;">PKR ${o.total.toLocaleString()}</strong><br><span style="font-size:10px; color:#2ecc71;">✓ Confirmed</span>` : `<span style="color:#e67e22; font-weight:700; font-size:12px;">Quotation Pending ⏳</span>`}</td>
          <td>
            <select class="order-status-select" data-id="${o.id}" style="background:#12100e;color:#fff;border:1px solid rgba(200,169,110,0.3);padding:4px 8px;border-radius:4px;font-size:12px;">
              <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Price Confirmed" ${o.status === 'Price Confirmed' ? 'selected' : ''}>Price Confirmed</option>
              <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="admin-action-btn set-order-price" data-id="${o.id}" style="padding:4px 8px; font-size:11px; background:linear-gradient(135deg,#c9a84c,#f0d080); color:#0a0a0a; font-weight:700;">💰 Set Price</button>
              <button class="admin-action-btn view-invoice" data-id="${o.id}" style="padding:4px 8px; font-size:11px; background:rgba(200,169,110,0.2); color:var(--color-gold-light); font-weight:700;">📄 Invoice</button>
              <button class="admin-action-btn delete-order" data-id="${o.id}">Remove</button>
            </div>
          </td>
        </tr>
      `).join('') || `<tr><td colspan="8" style="text-align:center;padding:24px;color:rgba(255,255,255,0.5);">No orders found</td></tr>`;

      ordersTbody.querySelectorAll('.set-order-price').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          window.openSetOrderPriceModal(id);
        });
      });

      ordersTbody.querySelectorAll('.view-invoice').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          window.generateInvoice(id);
        });
      });

      ordersTbody.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', async () => {
          const id = select.getAttribute('data-id');
          const newStatus = select.value;
          const ords = getOrders();
          const ord = ords.find(o => String(o.id) === String(id));
          if (!ord) return;

          ord.status = newStatus;
          saveOrders(ords);
          const synced = await persistOrder('PUT', id, { status: newStatus });
          showToast(
            synced.ok
              ? `Order ${id} is now "${newStatus}".`
              : `Order ${id} not saved: ${synced.reason}`,
            synced.ok ? 'info' : 'error'
          );
        });
      });

      ordersTbody.querySelectorAll('.delete-order').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          showCustomConfirm('Delete Order Record', `Are you sure you want to delete order "${id}"?`, async () => {
            const ords = getOrders();
            saveOrders(ords.filter(o => String(o.id) !== String(id)));
            const synced = await persistOrder('DELETE', id);
            showToast(
              synced.ok ? `Order ${id} deleted.` : `Order ${id} not deleted: ${synced.reason}`,
              'error'
            );
          });
        });
      });
    }
  }

  // Filter Listeners
  document.getElementById('admin-search-catalog')?.addEventListener('input', renderAdmin);
  document.getElementById('admin-filter-category')?.addEventListener('change', renderAdmin);
  document.getElementById('admin-filter-stock')?.addEventListener('change', renderAdmin);
  document.getElementById('admin-filter-order-status')?.addEventListener('change', renderAdmin);

  /* ======================================
     GLOBAL CART MANAGEMENT SYSTEM
  ====================================== */
  window.getProducts = getProducts;
  window.saveProducts = saveProducts;
  window.getOrders = getOrders;
  window.saveOrders = saveOrders;
  window.showToast = showToast;

  window.getCart = function () {
    const saved = localStorage.getItem('lavion_cart_v1');
    return saved ? JSON.parse(saved) : [];
  };

  window.saveCart = function (cart) {
    localStorage.setItem('lavion_cart_v1', JSON.stringify(cart));
    window.updateCartBadge();
  };

  window.updateCartBadge = function () {
    const cart = window.getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.icon-badge').forEach(badge => {
      badge.textContent = totalCount;
    });
    if (typeof window.renderMobileAppDock === 'function') window.renderMobileAppDock();
  };

  function showCartPromptModal(product, qty) {
    const existing = document.getElementById('cart-prompt-modal');
    if (existing) existing.remove();

    const totalCartCount = window.getCart().reduce((sum, item) => sum + item.qty, 0);
    const formattedPrice = (typeof product.price === 'number') 
      ? `PKR ${product.price.toLocaleString()}` 
      : (product.price || 'Price on Request');

    const modal = document.createElement('div');
    modal.id = 'cart-prompt-modal';
    modal.className = 'cart-prompt-backdrop active';
    /* Every rule below used to be repeated inline here. Inline styles beat the
       stylesheet, so the modal stayed onyx no matter what main.css said — and
       any restyling had to be made twice. The classes carry it all now. */

    modal.innerHTML = `
      <div class="cart-prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-prompt-title">
        <button class="cart-prompt-close" id="cart-prompt-close-btn" aria-label="Close">&times;</button>

        <div class="cart-prompt-header">
          <div class="cart-prompt-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h3 id="cart-prompt-title" class="cart-prompt-title">Added to Shopping Bag</h3>
        </div>

        <div class="cart-prompt-body">
          <div class="cart-prompt-item">
            <img src="${product.img || 'images/rings/solitaire-diamond-ring.jpg'}" alt="${product.name}" class="cart-prompt-item-img" onerror="this.src='images/rings/solitaire-diamond-ring.jpg'" />
            <div class="cart-prompt-item-info">
              <h4 class="cart-prompt-item-name">${product.name}</h4>
              <p class="cart-prompt-item-meta">${product.category ? product.category.toUpperCase() : 'LUXURY JEWELLERY'}</p>
              <div class="cart-prompt-item-price-qty">
                <span class="cart-prompt-price">${formattedPrice}</span>
                <span class="cart-prompt-qty">Qty: ${qty}</span>
              </div>
            </div>
          </div>

          <p class="cart-prompt-question">
            Would you like to open your Shopping Bag now or continue browsing?
          </p>
        </div>

        <div class="cart-prompt-actions">
          <button class="cart-prompt-btn secondary" id="cart-prompt-continue-btn">Continue Browsing</button>
          <a href="cart" class="cart-prompt-btn primary" id="cart-prompt-open-btn">
            Open Shopping Bag (${totalCartCount})
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 250);
    };

    document.getElementById('cart-prompt-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('cart-prompt-continue-btn')?.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }

  window.addToCart = function (productId, qty = 1) {
    const products = window.getProducts();
    const product = products.find(p => p.id === String(productId));
    if (!product) {
      showToast('Product not found!', 'error');
      return;
    }

    if (product.stock <= 0) {
      showToast(`Sorry, "${product.name}" is currently out of stock.`, 'error');
      return;
    }

    let cart = window.getCart();
    const existingIndex = cart.findIndex(item => item.id === String(productId));

    if (existingIndex > -1) {
      const newQty = cart[existingIndex].qty + qty;
      if (newQty > product.stock) {
        showToast(`Only ${product.stock} units available in stock.`, 'error');
        return;
      }
      cart[existingIndex].qty = newQty;
    } else {
      if (qty > product.stock) {
        showToast(`Only ${product.stock} units available in stock.`, 'error');
        return;
      }
      cart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        img: product.img,
        desc: product.desc,
        qty: qty
      });
    }

    window.saveCart(cart);
    if (window.location.pathname.includes('cart') || window.location.pathname.includes('/cart')) {
      showToast(`Added "${product.name}" to your Shopping Bag!`, 'success');
      if (typeof window.renderCart === 'function') window.renderCart();
    } else {
      showCartPromptModal(product, qty);
    }
  };

  window.removeFromCart = function (productId) {
    let cart = window.getCart();
    const item = cart.find(i => i.id === String(productId));
    cart = cart.filter(i => i.id !== String(productId));
    window.saveCart(cart);
    if (item) {
      showToast(`Removed "${item.name}" from your bag.`, 'info');
    }
  };

  window.updateCartQty = function (productId, qty) {
    let cart = window.getCart();
    const itemIndex = cart.findIndex(i => i.id === String(productId));
    if (itemIndex > -1) {
      if (qty <= 0) {
        window.removeFromCart(productId);
      } else {
        const products = window.getProducts();
        const product = products.find(p => p.id === String(productId));
        if (product && qty > product.stock) {
          showToast(`Only ${product.stock} units available in stock.`, 'error');
          return;
        }
        cart[itemIndex].qty = qty;
        window.saveCart(cart);
      }
    }
  };

  window.clearCart = function () {
    localStorage.removeItem('lavion_cart_v1');
    window.updateCartBadge();
    showToast('Shopping Bag cleared.', 'info');
  };

  /* ======================================
     PRODUCT PAGES
     A piece is a page, not a modal. The quick view showed a name, a line of
     description and a stock count — which was very nearly everything the
     catalogue held, so there was little to open. Now that a piece carries a
     specification there is somewhere to put it, and more to the point there is
     an address to link to, share and index.
  ====================================== */

  /**
   * A stored image path, from a page that is not at the root.
   *
   * Images are stored the way the old pages referenced them — "images/x.png",
   * no leading slash, because those pages sat at the site root. A product page
   * lives at /product/<handle>, where that resolves to /product/images/x.png
   * and every photograph 404s. A data: URI is already the image rather than a
   * location, and prefixing a slash would break it outright.
   */
  function productImage(src) {
    const path = String(src || '').trim() || 'images/hero_campaign.png';
    if (/^(https?:\/\/|data:|\/)/i.test(path)) return path;
    return `/${path}`;
  }

  /** Matches src/lib/handles.ts, so links made here survive the cutover. */
  window.productHandle = function (product) {
    const slug = String(product.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug ? `${slug}-${product.id}` : String(product.id);
  };

  window.productUrl = function (product) {
    return `/product/${window.productHandle(product)}`;
  };

  /** The id is whatever follows the last hyphen; the words before it decorate. */
  function idFromHandle(handle) {
    const at = String(handle).lastIndexOf('-');
    return at === -1 ? String(handle) : String(handle).slice(at + 1);
  }

  /**
   * Opening a piece.
   *
   * Kept under the old name so every existing call site — the grids, the
   * wishlist page, the ?product= deep link — goes to the page without each
   * having to be found and rewritten. The modal it used to build is gone.
   */
  window.openQuickView = function (productId) {
    const product = (window.getProducts() || []).find(p => String(p.id) === String(productId));
    if (!product) return;
    window.location.href = window.productUrl(product);
  };

  /* ---- rendering one ---- */

  const specRow = (label, value) =>
    value === null || value === undefined || value === ''
      ? ''
      : `<tr>
           <th style="text-align:left; padding:10px 16px 10px 0; font-weight:400; color:var(--color-text-muted); white-space:nowrap; vertical-align:top;">${escapeHtml(label)}</th>
           <td style="padding:10px 0; color:var(--color-text);">${escapeHtml(String(value))}</td>
         </tr>`;



  /* ======================================
     COLLECTIONS MANAGER
     Creating one from inside the product form is convenient and not enough:
     there was nowhere to see what exists, rename one, give it a description,
     or remove it. This is that place.
  ====================================== */

  function renderCollectionsManager() {
    const box = document.getElementById('admin-collections');
    if (!box) return;

    const rows = customCategories.length
      ? customCategories.map(c => {
          const count = (window.getProducts() || [])
            .filter(p => window.productInCategory(p, c.slug)).length;
          return `
            <tr data-slug="${escapeHtml(c.slug)}">
              <td style="padding:10px 12px;">
                <input type="text" class="coll-name" value="${escapeHtml(c.name)}"
                  style="width:100%; padding:7px 9px; background:#12100e; border:1px solid rgba(200,169,110,0.3); color:#fff; border-radius:5px;" />
              </td>
              <td style="padding:10px 12px;">
                <input type="text" class="coll-desc" value="${escapeHtml(c.description || '')}" placeholder="Optional description"
                  style="width:100%; padding:7px 9px; background:#12100e; border:1px solid rgba(200,169,110,0.3); color:#fff; border-radius:5px;" />
              </td>
              <td style="padding:10px 12px; white-space:nowrap;">
                <a href="/collection/${escapeHtml(c.slug)}" target="_blank" rel="noopener"
                   style="color:var(--color-gold-light); font-size:12px;">/collection/${escapeHtml(c.slug)}</a>
              </td>
              <td style="padding:10px 12px; text-align:center; color:rgba(255,255,255,0.75);">${count}</td>
              <td style="padding:10px 12px; white-space:nowrap; text-align:right;">
                <button type="button" class="admin-action-btn coll-save" style="padding:6px 12px; font-size:11px;">Save</button>
                <button type="button" class="admin-action-btn delete coll-delete" style="padding:6px 12px; font-size:11px;">Remove</button>
              </td>
            </tr>`;
        }).join('')
      : `<tr><td colspan="5" style="padding:24px; text-align:center; color:rgba(255,255,255,0.45); font-size:13px;">
           No collections of your own yet. The eight the site ships with are always there.
         </td></tr>`;

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
        <div>
          <h3 style="font-family:var(--font-serif); font-size:20px; color:var(--color-gold-light);">Your collections</h3>
          <p style="font-size:12px; color:rgba(255,255,255,0.5); margin-top:4px; max-width:62ch; line-height:1.6;">
            Beyond the eight the site ships with. Each gets a page at /collection/&lt;name&gt;.
            Put pieces in one from the piece&rsquo;s own form, under &ldquo;Also appears in&rdquo;.
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <input type="text" id="admin-new-collection" placeholder="New collection, e.g. Bridal"
            style="padding:9px 12px; background:#12100e; border:1px solid rgba(200,169,110,0.3); color:#fff; border-radius:6px; min-width:220px;" />
          <button type="button" class="admin-primary-btn" id="admin-new-collection-btn" style="padding:9px 16px; font-size:11px; white-space:nowrap;">Create</button>
        </div>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table" style="width:100%;">
          <thead>
            <tr>
              <th style="text-align:left;">Name</th>
              <th style="text-align:left;">Description</th>
              <th style="text-align:left;">Address</th>
              <th style="text-align:center;">Pieces</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    box.querySelectorAll('.coll-save').forEach(btn => {
      btn.addEventListener('click', () => saveCollectionRow(btn.closest('tr')));
    });
    box.querySelectorAll('.coll-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteCollectionRow(btn.closest('tr')));
    });
  }

  async function saveCollectionRow(row) {
    const slug = row.getAttribute('data-slug');
    const name = row.querySelector('.coll-name').value.trim();
    const description = row.querySelector('.coll-desc').value.trim();
    if (!name) {
      showToast('A collection needs a name.', 'error');
      return;
    }
    try {
      const res = await adminFetch(`/categories/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || `Save failed (${res.status}).`);
      await window.loadCategories();
      renderCollectionsManager();
      showToast(`"${name}" saved.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /**
   * Removing one is confirmed, and refused outright while pieces are still in
   * it unless the admin says so a second time. Those pieces would otherwise
   * disappear from every listing while still being in the catalogue.
   */
  async function deleteCollectionRow(row) {
    const slug = row.getAttribute('data-slug');
    const name = row.querySelector('.coll-name').value.trim() || slug;

    try {
      let res = await adminFetch(`/categories/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      let data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.inUse) {
        const ok = window.confirm(
          `${data.inUse} piece${data.inUse === 1 ? ' is' : 's are'} still filed under "${name}".\n\n` +
          'They will stay in the catalogue but will no longer appear in this collection. Remove it anyway?'
        );
        if (!ok) return;
        res = await adminFetch(`/categories/${encodeURIComponent(slug)}?force=1`, { method: 'DELETE' });
        data = await res.json().catch(() => ({}));
      } else if (res.ok) {
        // Empty, so nothing to lose — but still an irreversible action.
        if (!window.confirm(`Remove the collection "${name}"?`)) {
          await window.loadCategories();
          renderCollectionsManager();
          return;
        }
      }

      if (!res.ok || !data.success) throw new Error(data.message || `Could not remove it (${res.status}).`);
      await window.loadCategories();
      renderCollectionsManager();
      showToast(`"${name}" removed.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function createCollectionFromManager() {
    const input = document.getElementById('admin-new-collection');
    const name = (input?.value || '').trim();
    if (!name) {
      showToast('Give the collection a name first.', 'error');
      return;
    }
    const btn = document.getElementById('admin-new-collection-btn');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      const res = await adminFetch('/categories', { method: 'POST', body: JSON.stringify({ name }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || `Could not create it (${res.status}).`);
      input.value = '';
      await window.loadCategories();
      renderCollectionsManager();
      showToast(data.message || `Collection "${name}" created.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'admin-new-collection-btn') {
      e.preventDefault();
      createCollectionFromManager();
    }
  });

  /* ======================================
     COLLECTION PAGES
     For collections the shop invented. The eight built-in ones keep their own
     files and their own indexed URLs.
  ====================================== */

  /** True when a piece belongs to a collection, as home or as an extra. */
  window.productInCategory = function (product, slug) {
    const want = String(slug || '').toLowerCase();
    if (!want) return false;
    if (String(product.category || '').toLowerCase() === want) return true;
    return Array.isArray(product.categories) &&
      product.categories.some(c => String(c).toLowerCase() === want);
  };

  function renderCollectionPage() {
    const host = document.getElementById('collection-page');
    if (!host) return;

    const fromPath = (location.pathname.match(/\/collection\/([^/]+)\/?$/) || [])[1];
    const slug = decodeURIComponent(
      fromPath || new URLSearchParams(location.search).get('c') || ''
    ).toLowerCase();

    if (!slug) {
      host.innerHTML = collectionMissingHtml();
      return;
    }

    Promise.all([
      fetch(`${API_URL}/categories`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_URL}/products?category=${encodeURIComponent(slug)}`)
        .then(r => (r.ok ? r.json() : null)).catch(() => null)
    ]).then(([catData, prodData]) => {
      const category = catData && catData.success
        ? (catData.categories || []).find(c => c.slug === slug)
        : null;
      const products = prodData && prodData.success ? (prodData.products || []) : [];

      // A collection nobody created and nothing is filed under does not exist.
      // One that has pieces but no record is still worth showing — a built-in
      // slug reached through this URL, say — under a tidied-up name.
      if (!category && !products.length) {
        host.innerHTML = collectionMissingHtml();
        return;
      }

      paintCollection(host, category, slug, products);
    });
  }

  function collectionMissingHtml() {
    return `
      <div style="text-align:center; padding:60px 0;">
        <h1 style="font-family:var(--font-serif); font-size:34px; color:var(--color-dark); margin-bottom:10px;">Collection not found</h1>
        <p style="font-family:var(--font-sans); font-size:14px; color:var(--color-text-muted); margin-bottom:28px;">
          This collection may have been renamed or withdrawn.
        </p>
        <a href="/collections" class="btn-gold" style="padding:12px 26px; font-size:11px;">Browse the collections</a>
      </div>`;
  }

  function paintCollection(host, category, slug, products) {
    const name = (category && category.name) || window.categoryLabel(slug);
    const description = (category && category.description) || '';

    host.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb" style="margin-bottom:24px;">
        <a href="/">Home</a>
        <span>/</span>
        <a href="/collections">Collections</a>
        <span>/</span>
        <span>${escapeHtml(name)}</span>
      </nav>

      <header style="margin-bottom:32px;">
        <h1 style="font-family:var(--font-serif); font-size:40px; font-weight:300; color:var(--color-dark);">${escapeHtml(name)}</h1>
        ${description ? `<p style="font-family:var(--font-sans); font-size:14px; line-height:1.8; color:var(--color-text-muted); margin-top:10px; max-width:60ch;">${escapeHtml(description)}</p>` : ''}
        <p style="font-family:var(--font-sans); font-size:12px; letter-spacing:1.6px; text-transform:uppercase; color:var(--color-text-light); margin-top:14px;">
          ${products.length} ${products.length === 1 ? 'piece' : 'pieces'}
        </p>
      </header>

      ${products.length ? `
        <div class="products-grid">
          ${products.map(p => `
            <div class="product-card">
              <a href="${escapeHtml(window.productUrl(p))}" class="product-card-img" style="display:block;">
                <img src="${escapeHtml(productImage(p.img))}" alt="${escapeHtml(p.name)}" loading="lazy" />
                ${p.badge ? `<span class="product-card-badge">${escapeHtml(p.badge)}</span>` : ''}
              </a>
              <div class="product-card-body">
                <div class="product-card-name"><a href="${escapeHtml(window.productUrl(p))}" style="color:inherit;">${escapeHtml(p.name)}</a></div>
                <div class="product-card-desc">${escapeHtml(p.desc || '')}</div>
                <div class="product-card-price">
                  <span class="price-daily-tag">Daily Rate Inquire</span>
                </div>
                <div class="product-card-actions">
                  <button class="btn-add-cart" onclick="window.addToCart('${escapeHtml(p.id)}', 1)"><span>+</span> Add to Bag</button>
                  <a class="btn-quick-view" href="${escapeHtml(window.productUrl(p))}" title="View this piece">👁</a>
                </div>
              </div>
            </div>`).join('')}
        </div>`
      : `<p style="font-family:var(--font-sans); font-size:14px; color:var(--color-text-muted);">
           Nothing is filed under this collection yet.
         </p>`}
    `;

    document.title = `${name} — Lavion Gems & Jewellers`;
    setMeta('description', description || `${name} at Lavion Gems & Jewellers.`);
    setCanonical(`${location.origin}/collection/${slug}`);
    // Something is on the page now, so the shell's noindex can go.
    document.getElementById('shell-robots')?.remove();
  }

  function renderProductPage() {
    const host = document.getElementById('product-page');
    if (!host) return;

    const params = new URLSearchParams(location.search);
    // The path is the real address; ?h= exists so the page can be opened
    // directly as /product.html?h=… where no rewrite is configured.
    const fromPath = (location.pathname.match(/\/product\/([^/]+)\/?$/) || [])[1];
    const handle = decodeURIComponent(fromPath || params.get('h') || '');
    const id = idFromHandle(handle);

    if (!id) {
      host.innerHTML = notFoundHtml();
      return;
    }

    fetch(`${API_URL}/products/${encodeURIComponent(id)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const product = data && data.success && data.product;
        if (!product) {
          host.innerHTML = notFoundHtml();
          return;
        }
        paintProduct(host, product, handle);
      })
      .catch(() => { host.innerHTML = notFoundHtml('We could not reach the catalogue just now.'); });
  }

  function notFoundHtml(reason) {
    return `
      <div style="text-align:center; padding:60px 0;">
        <h1 style="font-family:var(--font-serif); font-size:34px; color:var(--color-dark); margin-bottom:10px;">Piece not found</h1>
        <p style="font-family:var(--font-sans); font-size:14px; color:var(--color-text-muted); margin-bottom:28px;">
          ${escapeHtml(reason || 'This piece may have been sold or withdrawn from the collection.')}
        </p>
        <a href="/collections" class="btn-gold" style="padding:12px 26px; font-size:11px;">Browse the collections</a>
      </div>`;
  }

  function paintProduct(host, p, requestedHandle) {
    const canonical = window.productHandle(p);

    /**
     * Only one address per piece. The id is what resolves, so /anything-7 would
     * serve the same ring under as many URLs as anyone cared to invent. The
     * canonical spelling replaces whatever was asked for, without adding a
     * history entry — the back button should leave the page, not bounce.
     */
    if (requestedHandle && requestedHandle !== canonical && location.pathname.startsWith('/product/')) {
      history.replaceState(null, '', `/product/${canonical}${location.search}`);
    }

    const cat = String(p.category || '');
    const catLabel = cat ? cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ') : '';
    const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    const sizes = Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : [];
    const inStock = Number(p.stock) > 0;

    const gallery = images.length
      ? `<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:10px;">
           ${images.map(src => `
             <button type="button" class="product-thumb" data-src="${escapeHtml(productImage(src))}"
               style="padding:0; border:1px solid var(--color-border); background:none; cursor:pointer; aspect-ratio:1; overflow:hidden;">
               <img src="${escapeHtml(productImage(src))}" alt="" loading="lazy" style="width:100%; height:100%; object-fit:cover;" />
             </button>`).join('')}
         </div>`
      : '';

    const spec = [
      specRow('Reference', p.id),
      specRow('Collection', catLabel),
      specRow('Metal', p.metal),
      specRow('Hallmark', p.purity),
      specRow('Weight', p.grossWeightG ? `${p.grossWeightG} g` : ''),
      specRow('Stone', p.stone),
      specRow('Carat weight', p.stoneCarats ? `${p.stoneCarats} ct total` : ''),
      specRow('Stones set', p.stoneCount ? String(p.stoneCount) : ''),
      specRow('Quality', p.stoneQuality),
      specRow('Certificate', p.certificate),
      specRow('Dimensions', p.dimensions),
      specRow('Availability', inStock ? 'In stock' : 'Made to order'),
      specRow('Ready in', p.madeToOrderDays ? `${p.madeToOrderDays} working days` : '')
    ].join('');

    // Blank lines are paragraph breaks — the admin field is a textarea, and a
    // jeweller writing two paragraphs should get two.
    const paragraphs = String(p.details || '')
      .split(/\n\s*\n/).map(t => t.trim()).filter(Boolean);

    const prose = (paragraphs.length || p.care)
      ? `<div style="margin-top:56px; padding-top:40px; border-top:1px solid var(--color-border); display:grid; gap:40px; grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
           ${paragraphs.length ? `
             <section>
               <h2 style="font-family:var(--font-serif); font-size:26px; font-weight:400; color:var(--color-dark);">About this piece</h2>
               ${paragraphs.map(t => `<p style="font-family:var(--font-sans); font-size:14px; line-height:1.85; color:var(--color-text-muted); margin-top:14px;">${escapeHtml(t)}</p>`).join('')}
             </section>` : ''}
           ${p.care ? `
             <section>
               <h2 style="font-family:var(--font-serif); font-size:26px; font-weight:400; color:var(--color-dark);">Care</h2>
               <p style="font-family:var(--font-sans); font-size:14px; line-height:1.85; color:var(--color-text-muted); margin-top:14px;">${escapeHtml(p.care)}</p>
             </section>` : ''}
         </div>`
      : '';

    host.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb" style="margin-bottom:28px;">
        <a href="/">Home</a>
        ${cat ? `<span>/</span><a href="/${escapeHtml(cat)}">${escapeHtml(catLabel)}</a>` : ''}
        <span>/</span>
        <span>${escapeHtml(p.name)}</span>
      </nav>

      <div style="display:grid; gap:48px; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); align-items:start;">
        <div>
          <div style="position:relative; aspect-ratio:1; overflow:hidden; border:1px solid var(--color-border); background:var(--color-bg-soft);">
            <img id="product-hero-img" src="${escapeHtml(productImage(p.img))}" alt="${escapeHtml(p.name)}"
                 style="width:100%; height:100%; object-fit:cover;" />
            ${p.badge ? `<span class="product-card-badge" style="position:absolute; top:16px; left:16px;">${escapeHtml(p.badge)}</span>` : ''}
          </div>
          ${gallery}
        </div>

        <div>
          ${catLabel ? `<div style="font-family:var(--font-sans); font-size:11px; letter-spacing:2.4px; text-transform:uppercase; color:var(--color-gold-dark);">${escapeHtml(catLabel)}</div>` : ''}
          <h1 style="font-family:var(--font-serif); font-size:40px; font-weight:300; line-height:1.15; color:var(--color-dark); margin-top:10px;">${escapeHtml(p.name)}</h1>
          ${p.desc ? `<p style="font-family:var(--font-serif); font-size:17px; font-style:italic; color:var(--color-text-muted); margin-top:12px;">${escapeHtml(p.desc)}</p>` : ''}

          <div style="margin-top:28px; padding:20px 0; border-top:1px solid var(--color-border); border-bottom:1px solid var(--color-border);">
            <div style="font-family:var(--font-sans); font-size:13px; font-weight:700; letter-spacing:2.6px; text-transform:uppercase; color:var(--color-gold-dark);">Daily rate — enquire</div>
            <p style="font-family:var(--font-serif); font-size:13px; font-style:italic; color:var(--color-text-muted); margin-top:8px;">
              ✦ Priced on the day of confirmation against the live gold market rate.
            </p>
          </div>

          <p style="font-family:var(--font-sans); font-size:13px; color:${inStock ? 'var(--color-text)' : '#b45309'}; margin-top:16px;">
            ${inStock ? `In stock — <strong>${Number(p.stock)}</strong> available` : 'Made to order'}
          </p>

          ${sizes.length ? `
            <div style="margin-top:22px;">
              <div style="font-family:var(--font-sans); font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--color-text-muted);">Sizes made</div>
              <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
                ${sizes.map(s => `<span style="border:1px solid var(--color-border); padding:6px 14px; font-family:var(--font-sans); font-size:13px;">${escapeHtml(s)}</span>`).join('')}
              </div>
              <p style="font-family:var(--font-sans); font-size:12px; color:var(--color-text-light); margin-top:8px;">Other sizes are made to order — ask when you enquire.</p>
            </div>` : ''}

          <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:28px;">
            <button class="btn-gold" id="product-add-btn" style="padding:14px 30px; font-size:11px;">Add to Shopping Bag</button>
            <button class="btn-outline" id="product-wish-btn" style="padding:14px 24px; font-size:11px;">Save</button>
            <a class="btn-outline" id="product-enquire-btn" target="_blank" rel="noopener noreferrer"
               style="padding:14px 24px; font-size:11px;">Enquire on WhatsApp</a>
          </div>

          <table style="width:100%; margin-top:32px; border-collapse:collapse; font-family:var(--font-sans); font-size:13.5px; border-top:1px solid var(--color-border);">
            <tbody>${spec}</tbody>
          </table>
        </div>
      </div>

      ${prose}
      <div id="product-related" style="margin-top:56px;"></div>
    `;

    document.title = `${p.name} — Lavion Gems & Jewellers`;
    setMeta('description', p.desc || `${p.name} from Lavion Gems & Jewellers.`);
    setCanonical(`${location.origin}/product/${canonical}`);
    // The shell ships noindex because a crawler that does not run JS would
    // otherwise index an empty page. There is something here now.
    document.getElementById('shell-robots')?.remove();
    injectProductJsonLd(p, canonical);

    host.querySelectorAll('.product-thumb').forEach(btn => {
      btn.addEventListener('click', () => {
        const hero = document.getElementById('product-hero-img');
        if (hero) hero.src = btn.getAttribute('data-src');
      });
    });

    document.getElementById('product-add-btn')?.addEventListener('click', () => {
      window.addToCart(p.id, 1);
    });

    const wishBtn = document.getElementById('product-wish-btn');
    const paintWish = () => {
      const saved = (window.getWishlist() || []).map(String).includes(String(p.id));
      wishBtn.textContent = saved ? 'Saved ✓' : 'Save';
    };
    wishBtn?.addEventListener('click', () => {
      window.toggleWishlist(p.id);
      paintWish();
    });
    paintWish();

    const enquiry = `Hello Lavion, I would like to enquire about "${p.name}" (ref ${p.id}).`;
    document.getElementById('product-enquire-btn')
      ?.setAttribute('href', `https://wa.me/923241769500?text=${encodeURIComponent(enquiry)}`);

    renderRelated(p);
  }

  /** More from the same collection, so the page is not a dead end. */
  function renderRelated(p) {
    const box = document.getElementById('product-related');
    if (!box) return;
    const others = (window.getProducts() || [])
      .filter(x => String(x.id) !== String(p.id) && x.category === p.category)
      .slice(0, 4);
    if (!others.length) return;

    box.innerHTML = `
      <h2 style="font-family:var(--font-serif); font-size:26px; font-weight:400; color:var(--color-dark); margin-bottom:20px;">More from this collection</h2>
      <div class="products-grid">
        ${others.map(x => `
          <div class="product-card">
            <a href="${escapeHtml(window.productUrl(x))}" class="product-card-img" style="display:block;">
              <img src="${escapeHtml(productImage(x.img))}" alt="${escapeHtml(x.name)}" loading="lazy" />
            </a>
            <div class="product-card-body">
              <div class="product-card-name"><a href="${escapeHtml(window.productUrl(x))}" style="color:inherit;">${escapeHtml(x.name)}</a></div>
              <div class="product-card-desc">${escapeHtml(x.desc || '')}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setCanonical(href) {
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  /**
   * Product structured data.
   *
   * No price and no availability offer: the shop quotes against the day's gold
   * rate rather than listing, so publishing a price here would be publishing
   * one the page itself does not show.
   */
  function injectProductJsonLd(p, handle) {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.desc || undefined,
      sku: String(p.id),
      image: p.img ? [new URL(productImage(p.img), location.origin).href] : undefined,
      url: `${location.origin}/product/${handle}`,
      brand: { '@type': 'Brand', name: 'Lavion Gems & Jewellers' },
      material: p.metal || undefined,
      weight: p.grossWeightG ? { '@type': 'QuantitativeValue', value: p.grossWeightG, unitCode: 'GRM' } : undefined
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
  }

  /* ======================================
     WISHLIST MANAGEMENT SYSTEM
  ====================================== */
  window.getWishlist = function () {
    const saved = localStorage.getItem('lavion_wishlist_v1');
    return saved ? JSON.parse(saved) : [];
  };

  window.saveWishlist = function (wishlist) {
    localStorage.setItem('lavion_wishlist_v1', JSON.stringify(wishlist));
    window.updateWishlistBadge();
  };

  window.updateWishlistBadge = function () {
    const wishlist = window.getWishlist();
    const count = wishlist.length;
    document.querySelectorAll('.wishlist-badge').forEach(badge => {
      badge.textContent = count;
    });
  };

  window.isInWishlist = function (productId) {
    const wishlist = window.getWishlist();
    return wishlist.some(id => String(id) === String(productId));
  };

  window.toggleWishlist = function (productId) {
    let wishlist = window.getWishlist();
    const products = window.getProducts();
    const product = products.find(p => p.id === String(productId));
    const name = product ? product.name : 'Item';

    const index = wishlist.findIndex(id => String(id) === String(productId));
    if (index > -1) {
      wishlist.splice(index, 1);
      window.saveWishlist(wishlist);
      showToast(`Removed "${name}" from your Wishlist.`, 'info');
    } else {
      wishlist.push(String(productId));
      window.saveWishlist(wishlist);
      showToast(`Saved "${name}" to your Wishlist!`, 'success');
    }

    document.querySelectorAll(`.btn-wishlist-toggle[data-id="${productId}"]`).forEach(btn => {
      if (window.isInWishlist(productId)) {
        btn.classList.add('in-wishlist');
      } else {
        btn.classList.remove('in-wishlist');
      }
    });
  };

  window.removeFromWishlist = function (productId) {
    let wishlist = window.getWishlist();
    const products = window.getProducts();
    const product = products.find(p => p.id === String(productId));
    wishlist = wishlist.filter(id => String(id) !== String(productId));
    window.saveWishlist(wishlist);
    if (product) {
      showToast(`Removed "${product.name}" from your Wishlist.`, 'info');
    }
  };

  window.clearWishlist = function () {
    localStorage.removeItem('lavion_wishlist_v1');
    window.updateWishlistBadge();
    showToast('Wishlist cleared.', 'info');
  };

  /* ======================================
     FEATURE 1: SIZE GUIDE MODAL
  ====================================== */
  window.openSizeGuide = function () {
    let modal = document.getElementById('size-guide-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'size-guide-modal';
      modal.className = 'admin-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="admin-modal-dialog size-guide-dialog">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(200,169,110,0.3); padding-bottom:12px;">
          <h3 style="font-family:var(--font-serif); font-size:24px; color:var(--color-gold-light); margin:0;">📏 Jewellery Size Guide</h3>
          <button class="admin-action-btn" id="sg-close-btn" style="padding:4px 10px;">&times;</button>
        </div>

        <p style="font-size:13px; color:rgba(255,255,255,0.7); margin-bottom:16px;">
          Find your exact ring size or chain length before placing your order.
        </p>

        <h4 style="font-family:var(--font-sans); font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--color-gold-light); margin-bottom:8px;">1. Ring Size Conversion Table</h4>
        <table class="size-guide-table">
          <thead>
            <tr>
              <th>Pakistan / US Size</th>
              <th>UK / European Size</th>
              <th>Inside Diameter (mm)</th>
              <th>Circumference (mm)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Size 5</strong></td><td>J ½</td><td>15.7 mm</td><td>49.3 mm</td></tr>
            <tr><td><strong>Size 6</strong></td><td>L ½</td><td>16.5 mm</td><td>51.9 mm</td></tr>
            <tr><td><strong>Size 7 (Standard)</strong></td><td>N ½</td><td>17.3 mm</td><td>54.4 mm</td></tr>
            <tr><td><strong>Size 8</strong></td><td>P ½</td><td>18.2 mm</td><td>57.0 mm</td></tr>
            <tr><td><strong>Size 9</strong></td><td>R ½</td><td>19.0 mm</td><td>59.5 mm</td></tr>
            <tr><td><strong>Size 10</strong></td><td>T ½</td><td>19.8 mm</td><td>62.1 mm</td></tr>
          </tbody>
        </table>

        <h4 style="font-family:var(--font-sans); font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--color-gold-light); margin:20px 0 8px;">2. Necklace & Chain Length Guide</h4>
        <div style="background:#12100e; padding:16px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); font-size:12px; line-height:1.6; color:rgba(255,255,255,0.8);">
          • <strong>14" - 16" (Choker)</strong>: Sits tightly around the base of the neck.<br>
          • <strong>18" (Princess)</strong>: Sits gracefully on the collarbone (Most Popular).<br>
          • <strong>20" (Matinee)</strong>: Hangs between collarbone and bust line.<br>
          • <strong>24" (Opera)</strong>: Sits below the bust, ideal for bridal pendants.
        </div>

        <div style="text-align:right; margin-top:24px;">
          <button class="admin-primary-btn" id="sg-done-btn" style="margin-left:auto;">Got It</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const closeSG = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };
    document.getElementById('sg-close-btn')?.addEventListener('click', closeSG);
    document.getElementById('sg-done-btn')?.addEventListener('click', closeSG);
  };

  /* ======================================
     FEATURE 2: LIVE INSTANT SEARCH OVERLAY
  ====================================== */
  function initLiveSearch() {
    let overlay = document.getElementById('search-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'search-modal';
      overlay.className = 'search-modal-backdrop';
      overlay.innerHTML = `
        <div class="search-input-wrap">
          <input type="text" id="live-search-input" class="search-input-large" placeholder="Search gold rings, diamond necklaces, emeralds..." autofocus />
          <button class="search-close-btn" id="search-close-btn">&times;</button>
        </div>
        <div id="search-results-container" class="search-results-grid"></div>
      `;
      document.body.appendChild(overlay);
    }

    const searchInput = document.getElementById('live-search-input');
    const container = document.getElementById('search-results-container');
    const closeBtn = document.getElementById('search-close-btn');

    function renderSearchResults(query) {
      const q = query.toLowerCase().trim();
      if (!q) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.5); font-family: var(--font-serif); font-size: 18px; padding: 40px;">
            Start typing to search our luxury jewellery & certified gemstone catalog...
          </div>
        `;
        return;
      }

      const products = window.getProducts();
      const matches = products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.desc && p.desc.toLowerCase().includes(q)));

      if (matches.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.5); font-family: var(--font-serif); font-size: 18px; padding: 40px;">
            No pieces found matching "<strong>${query}</strong>". Try searching for "Ring", "Emerald", or "Diamond".
          </div>
        `;
        return;
      }

      container.innerHTML = matches.map(p => `
        <div class="product-card" style="background: #1c1a17; border-color: rgba(200,169,110,0.3);">
          <a href="${window.productUrl(p)}" class="product-card-img" style="display:block;">
            <img src="${p.img}" alt="${p.name}" loading="lazy" />
            ${p.badge ? `<span class="product-card-badge">${p.badge}</span>` : ''}
          </a>
          <div class="product-card-body">
            <div class="product-card-name" style="color:#fff;"><a href="${window.productUrl(p)}" style="color:inherit;">${p.name}</a></div>
            <div class="product-card-desc" style="color:rgba(255,255,255,0.6);">${p.desc || ''}</div>
            <div class="product-card-price" style="color:var(--color-gold-light); font-size:12px; letter-spacing:0.5px;">📞 Price on Request</div>
            <div class="product-card-actions">
              <button class="btn-add-cart" onclick="window.addToCart('${p.id}', 1)">+ Add to Bag</button>
              <a class="btn-quick-view" href="${window.productUrl(p)}" title="View this piece" aria-label="View ${p.name}">👁</a>
            </div>
          </div>
        </div>
      `).join('');
    }

    searchInput?.addEventListener('input', (e) => renderSearchResults(e.target.value));

    const openSearch = (e) => {
      if (e) e.preventDefault();
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchInput?.focus(), 100);
      renderSearchResults('');
    };

    const closeSearch = () => {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    closeBtn?.addEventListener('click', closeSearch);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeSearch();
    });
  }



  /* ======================================
     FEATURE 5: SUBMIT CUSTOMER REVIEW MODAL
  ====================================== */
  window.openSubmitReviewModal = function () {
    let modal = document.getElementById('review-submit-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'review-submit-modal';
      modal.className = 'admin-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="admin-modal-dialog" style="max-width:500px; background:#181614;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(200,169,110,0.3); padding-bottom:10px;">
          <h3 style="font-family:var(--font-serif); font-size:22px; color:var(--color-gold-light); margin:0;">
            ✍️ Submit Verified Client Review
          </h3>
          <button class="search-close-btn" id="rev-close-btn" style="color:#fff; font-size:24px; background:none; border:none; cursor:pointer;">&times;</button>
        </div>

        <form id="submit-review-form">
          <div style="margin-bottom:12px;">
            <label style="font-size:10px; text-transform:uppercase; color:rgba(255,255,255,0.7); display:block; margin-bottom:4px;">Your Name</label>
            <input type="text" id="rev-name" placeholder="e.g. Mrs. Ayesha Malik" style="width:100%; padding:8px; background:#12100e; border:1px solid rgba(200,169,110,0.3); color:#fff; border-radius:6px;" required />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
            <div>
              <label style="font-size:10px; text-transform:uppercase; color:rgba(255,255,255,0.7); display:block; margin-bottom:4px;">City / Country</label>
              <input type="text" id="rev-city" placeholder="e.g. Lahore / London" style="width:100%; padding:8px; background:#12100e; border:1px solid rgba(200,169,110,0.3); color:#fff; border-radius:6px;" required />
            </div>
            <div>
              <label style="font-size:10px; text-transform:uppercase; color:rgba(255,255,255,0.7); display:block; margin-bottom:4px;">Rating</label>
              <select id="rev-stars" style="width:100%; padding:8px; background:#12100e; border:1px solid rgba(200,169,110,0.3); color:#fff; border-radius:6px;">
                <option value="5">★★★★★ (5 Stars)</option>
                <option value="4">★★★★☆ (4 Stars)</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <label style="font-size:10px; text-transform:uppercase; color:rgba(255,255,255,0.7); display:block; margin-bottom:4px;">Your Review Testimonial</label>
            <textarea id="rev-text" rows="3" placeholder="Tell us about your experience with your custom gold piece or diamond purchase..." style="width:100%; padding:8px; background:#12100e; border:1px solid rgba(200,169,110,0.3); color:#fff; border-radius:6px;" required></textarea>
          </div>

          <button type="submit" class="admin-primary-btn" style="width:100%; justify-content:center; padding:12px;">
            Submit Testimonial
          </button>
        </form>
      </div>
    `;

    modal.classList.add('active');
    modal.style.zIndex = '25000';
    document.body.style.overflow = 'hidden';

    document.getElementById('rev-close-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    document.getElementById('submit-review-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('rev-name').value;
      const city = document.getElementById('rev-city').value;
      const stars = document.getElementById('rev-stars').value;
      const text = document.getElementById('rev-text').value;

      const grid = document.getElementById('reviews-grid');
      if (grid) {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.style.cssText = 'background: #ffffff; border: 1px solid var(--color-border); padding: 24px; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);';
        card.innerHTML = `
          <div style="color: #f1c40f; font-size: 16px; margin-bottom: 8px;">${'★'.repeat(stars)}</div>
          <p style="font-family: var(--font-serif); font-size: 15px; font-style: italic; color: #333; line-height: 1.6; margin-bottom: 16px;">
            "${text}"
          </p>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-dark); color: var(--color-gold-light); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">${name.charAt(0)}</div>
            <div>
              <div style="font-weight: 700; font-size: 13px; color: var(--color-dark);">${name}</div>
              <div style="font-size: 11px; color: #2ecc71; font-weight: 600;">✓ Verified Buyer — ${city}</div>
            </div>
          </div>
        `;
        grid.prepend(card);
      }

      modal.classList.remove('active');
      document.body.style.overflow = '';
      showToast('Thank you! Your verified testimonial has been published.', 'success');
    });
  };

  /* ======================================
     FEATURE 3: ORDER TRACKER CONTROLLER
  ====================================== */
  function initOrderTracker() {
    let overlay = document.getElementById('track-order-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'track-order-modal';
      overlay.className = 'admin-modal-backdrop';
      document.body.appendChild(overlay);
    }

    const openTracker = (e) => {
      if (e) e.preventDefault();
      renderTrackerForm();
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    function renderTrackerForm() {
      overlay.innerHTML = `
        <div class="order-tracker-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(200,169,110,0.3); padding-bottom:12px;">
            <h3 style="font-family:var(--font-serif); font-size:24px; color:var(--color-gold-light); margin:0;">📦 Track Your Order</h3>
            <button class="admin-action-btn" id="tr-close-btn" style="padding:4px 10px;">&times;</button>
          </div>

          <p style="font-size:13px; color:rgba(255,255,255,0.7); margin-bottom:20px;">
            Enter your Order Reference Number (e.g., <strong>ORD-8821</strong> or <strong>CUST-94821</strong>) or registered phone number to view live order progress.
          </p>

          <form id="tracker-lookup-form" style="margin-bottom:20px;">
            <div style="display:flex; gap:10px;">
              <input type="text" id="tracker-query" placeholder="Enter Reference ID or Phone..." style="flex:1; padding:12px; background:#12100e; border:1px solid var(--color-gold); color:#fff; border-radius:6px; font-size:13px;" required />
              <button type="submit" class="admin-primary-btn">Track</button>
            </div>
          </form>

          <div id="tracker-results-area"></div>
        </div>
      `;

      document.getElementById('tr-close-btn')?.addEventListener('click', () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });

      document.getElementById('tracker-lookup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const raw = document.getElementById('tracker-query').value.trim();
        if (!raw) return;

        const area = document.getElementById('tracker-results-area');
        if (area) {
          area.innerHTML =
            '<p style="margin-top:16px;font-size:13px;color:rgba(255,255,255,0.6);text-align:center;">Looking up your order…</p>';
        }

        /**
         * Ask the server first. This used to search localStorage alone, which
         * only ever holds orders placed in this browser — so a customer opening
         * the tracker on their phone after ordering on a laptop, or after
         * clearing their history, was told no such order existed. The local
         * copy stays as a fallback for offline and for the file-store setup.
         */
        let found = null;
        try {
          const res = await fetch(`${API_URL}/orders/track/${encodeURIComponent(raw)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.order) found = data.order;
          }
        } catch (err) {
          console.warn('Order lookup unavailable, falling back to this device:', err.message);
        }

        if (!found && window.getOrders) {
          const q = raw.toLowerCase();
          found = window.getOrders().find(o =>
            String(o.id).toLowerCase() === q || String(o.phone || '').includes(q));
        }

        renderOrderProgress(found, raw);
      });
    }

    function renderOrderProgress(order, query) {
      const area = document.getElementById('tracker-results-area');
      if (!area) return;

      if (!order) {
        area.innerHTML = `
          <div style="background:rgba(231,76,60,0.15); border:1px solid #e74c3c; padding:16px; border-radius:6px; color:#e74c3c; font-size:13px; text-align:center; margin-top:16px;">
            ⚠️ No order record found for "<strong>${escapeHtml(query)}</strong>". Please verify your Order Reference ID or contact customer support on WhatsApp +92 324 1769500.
          </div>
        `;
        return;
      }

      let stepNum = 1;
      if (order.status === 'Processing') stepNum = 2;
      else if (order.status === 'Shipped') stepNum = 3;
      else if (order.status === 'Delivered') stepNum = 4;

      const progressWidth = stepNum === 1 ? '0%' : stepNum === 2 ? '33%' : stepNum === 3 ? '66%' : '100%';

      area.innerHTML = `
        <div style="background:#12100e; border:1px solid rgba(200,169,110,0.3); border-radius:8px; padding:20px; margin-top:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:13px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
            <span>Customer: <strong>${escapeHtml(order.customer)}</strong></span>
            <span style="color:var(--color-gold-light);">Ref: <strong>${escapeHtml(order.id)}</strong></span>
          </div>

          <!-- Timeline UI -->
          <div class="timeline-wrap">
            <div class="timeline-progress" style="width: ${progressWidth};"></div>

            <div class="timeline-step ${stepNum >= 1 ? 'completed' : ''}">
              <div class="timeline-icon">✓</div>
              <div class="timeline-label">Placed</div>
            </div>
            <div class="timeline-step ${stepNum >= 2 ? (stepNum === 2 ? 'active' : 'completed') : ''}">
              <div class="timeline-icon">⚙</div>
              <div class="timeline-label">Crafting</div>
            </div>
            <div class="timeline-step ${stepNum >= 3 ? (stepNum === 3 ? 'active' : 'completed') : ''}">
              <div class="timeline-icon">🚚</div>
              <div class="timeline-label">Shipped</div>
            </div>
            <div class="timeline-step ${stepNum >= 4 ? 'completed' : ''}">
              <div class="timeline-icon">🎁</div>
              <div class="timeline-label">Delivered</div>
            </div>
          </div>

          <div style="font-size:12px; color:rgba(255,255,255,0.8); margin-top:16px; line-height:1.6;">
            • <strong>Ordered Items:</strong> ${escapeHtml(order.items)}<br>
            • <strong>Destination:</strong> ${escapeHtml(order.city)}<br>
            • <strong>Order Total:</strong> ${
              // A bespoke commission is stored with a total of 0 until it has
              // been quoted; printing "PKR 0" would read as free.
              Number(order.total) > 0
                ? 'PKR ' + Number(order.total).toLocaleString()
                : 'Awaiting quotation'
            }<br>
            • <strong>Current Status:</strong> <span style="color:var(--color-gold-light); font-weight:700;">${escapeHtml(order.status)}</span>
          </div>
        </div>
      `;
    }

    /**
     * Delegated, because the triggers are not all in the document when this
     * runs: the drawer is injected on pages that lack one, and topped up on
     * pages that have their own. Binding each node once at startup missed
     * every link created afterwards.
     *
     * Each trigger is a real link to track-order, so the page still works
     * with scripting off; the modal simply takes over when it can.
     */
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.open-order-tracker, #open-order-tracker');
      if (!trigger) return;
      document.getElementById('mobile-menu')?.classList.remove('active');
      document.body.style.overflow = '';
      openTracker(e);
    });
  }

  /* ======================================
     LIVE DYNAMIC GOLD RATE MARKET ENGINE
  ====================================== */
  const DEFAULT_GOLD_RATES = {
    rate24kPerTola: 437000,
    rate24kPer10g: 374663,
    rate24kPer1g: 37466,
    rate22kPerTola: 400583,
    rate18kPerTola: 327750,
    rateSilverPerTola: 4850,
    lastUpdated: 'Gujranwala Sarafa Live'
  };

  window.getGoldRates = function () {
    const saved = localStorage.getItem('lavion_gold_rates_v1');
    if (!saved) {
      localStorage.setItem('lavion_gold_rates_v1', JSON.stringify(DEFAULT_GOLD_RATES));
      return DEFAULT_GOLD_RATES;
    }
    return JSON.parse(saved);
  };

  window.saveGoldRates = function (rates) {
    localStorage.setItem('lavion_gold_rates_v1', JSON.stringify(rates));
    window.renderGoldRateBar();
    if (typeof renderAdmin === 'function') renderAdmin();
  };

  // Direct client-side live fetch fallback
  window.fetchLiveGoldRates = async function (silent = true) {
    try {
      const res = await fetch('/api/gold-rates');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.goldRates) {
          window.saveGoldRates(data.goldRates);
          if (!silent) showToast(`Live Gold Market rates synced! PKR ${data.goldRates.rate24kPerTola.toLocaleString()} / Tola`, 'success');
          return data.goldRates;
        }
      }
    } catch (e) {
      console.warn('Backend gold API unavailable, using direct live fallback...');
    }

    try {
      const [goldRes, fxRes] = await Promise.all([
        fetch('https://api.gold-api.com/price/XAU').then(r => r.json()).catch(() => null),
        fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json()).catch(() => null)
      ]);

      if (goldRes?.price && fxRes?.rates?.PKR) {
        const xauUsd = parseFloat(goldRes.price);
        const usdPkr = parseFloat(fxRes.rates.PKR);
        const usdGbp = parseFloat(fxRes.rates.GBP || 0.7422);

        // A tola is 11.6638038 g and a troy ounce 31.1034768 g, so a tola is
        // exactly 0.375 troy oz. The old 0.3621 understated every price by 3.44%.
        const GRAMS_PER_TOLA = 11.6638038;
        const TOLA_PER_TROY_OZ = GRAMS_PER_TOLA / 31.1034768;

        const tolaPkr = xauUsd * usdPkr * TOLA_PER_TROY_OZ;
        const tolaGbp = xauUsd * usdGbp * TOLA_PER_TROY_OZ;
        const r24Pkr = Math.round(tolaPkr);
        const r24Gbp = Math.round(tolaGbp);

        const rates = {
          rate24kPerTola: r24Pkr,
          rate24kPer10g: Math.round((tolaPkr / GRAMS_PER_TOLA) * 10),
          rate24kPer1g: Math.round(tolaPkr / GRAMS_PER_TOLA),
          rate22kPerTola: Math.round(tolaPkr * (22 / 24)),
          rate21kPerTola: Math.round(tolaPkr * (21 / 24)),
          rate18kPerTola: Math.round(tolaPkr * (18 / 24)),
          // Silver needs its own feed; a hardcoded $30/oz guess was worse than
          // showing nothing, so the ticker omits silver when it is unknown.
          rateSilverPerTola: null,
          rate24kPerTolaGBP: r24Gbp,
          rate24kPer10gGBP: Math.round((tolaGbp / GRAMS_PER_TOLA) * 10),
          rate24kPer1gGBP: Math.round(tolaGbp / GRAMS_PER_TOLA),
          rate22kPerTolaGBP: Math.round(tolaGbp * (22 / 24)),
          rate18kPerTolaGBP: Math.round(tolaGbp * (18 / 24)),
          xauUsd: Math.round(xauUsd * 100) / 100,
          usdPkr: Math.round(usdPkr * 100) / 100,
          usdGbp: Math.round(usdGbp * 10000) / 10000,
          lastUpdated: new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }) + ' PKT (Live Market)'
        };
        window.saveGoldRates(rates);
        if (!silent) showToast(`Live gold rates synced — PKR ${r24Pkr.toLocaleString()} / tola`, 'success');
        return rates;
      }
    } catch (e) {}

    return window.getGoldRates();
  };

  window.updateGoldRateFrom24k = function (rate24k) {
    const r24 = parseFloat(rate24k);
    if (!Number.isFinite(r24) || r24 <= 0) {
      showToast('Enter a valid 24K rate per tola.', 'error');
      return;
    }

    const GRAMS_PER_TOLA = 11.6638038;
    const prev = window.getGoldRates() || {};
    // Convert through the last known FX pair rather than a hardcoded divisor.
    const gbpPerPkr = (prev.usdGbp && prev.usdPkr) ? (prev.usdGbp / prev.usdPkr) : (0.7422 / 277.76);
    const gbp24 = r24 * gbpPerPkr;

    const rates = {
      rate24kPerTola: Math.round(r24),
      rate24kPer10g: Math.round((r24 / GRAMS_PER_TOLA) * 10),
      rate24kPer1g: Math.round(r24 / GRAMS_PER_TOLA),
      rate22kPerTola: Math.round(r24 * (22 / 24)),
      rate21kPerTola: Math.round(r24 * (21 / 24)),
      rate18kPerTola: Math.round(r24 * (18 / 24)),
      rateSilverPerTola: prev.rateSilverPerTola ?? null,
      rate24kPerTolaGBP: Math.round(gbp24),
      rate24kPer10gGBP: Math.round((gbp24 / GRAMS_PER_TOLA) * 10),
      rate24kPer1gGBP: Math.round(gbp24 / GRAMS_PER_TOLA),
      rate22kPerTolaGBP: Math.round(gbp24 * (22 / 24)),
      rate18kPerTolaGBP: Math.round(gbp24 * (18 / 24)),
      usdPkr: prev.usdPkr ?? null,
      usdGbp: prev.usdGbp ?? null,
      lastUpdated: new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }) + ' PKT (Manual)'
    };
    window.saveGoldRates(rates);
    showToast(`Gold rates updated — 24K PKR ${Math.round(r24).toLocaleString()} / tola`, 'success');
  };

  /**
   * The diamond guide for the ticker.
   *
   * Deliberately not called a rate. The bullion figures beside it come from a
   * public spot feed; this cannot, because there is no free one — a diamond is
   * not fungible and the trade prices off the Rapaport list, which is a paid
   * licence. The per-carat dollar figures are the shop's own.
   *
   * What genuinely moves is the conversion: the card is held in USD and the
   * customer pays in rupees or pounds, so these follow the dollar every time
   * the FX feed refreshes. The server does that arithmetic — the same call the
   * admin panel reads — so the figure a visitor sees and the figure the shop
   * quotes against cannot drift apart.
   */
  let diamondGuide = null;

  window.fetchDiamondGuide = async function () {
    try {
      const res = await fetch(`${API_URL}/gold-rates/rate-card`);
      if (!res.ok) return;
      const data = await res.json();
      const market = data && data.stoneMarket;
      if (!market || !market.diamond) return;

      const pick = (rows, edge) => (rows || []).find(b => b.to === edge);
      const line = (band, label) =>
        band && band.local && band.local.PKR > 0
          ? { label, pkr: band.local.PKR, gbp: band.local.GBP }
          : null;

      const lines = [
        line(pick(market.diamond.natural, 1), 'Diamond 1 ct'),
        line(pick(market.diamond.natural, 2), 'Diamond 2 ct'),
        line(pick(market.diamond.labGrown, 1), 'Lab-grown 1 ct')
      ].filter(Boolean);

      if (!lines.length) return;
      diamondGuide = lines;
      window.renderGoldRateBar();
    } catch (e) {
      // No guide beats a wrong one — the bullion half of the ticker is
      // unaffected and still renders.
    }
  };

  window.renderGoldRateBar = function () {
    let bar = document.querySelector('.gold-rate-bar');
    const rates = window.getGoldRates();

    // Convert through the live FX pair when present. Falling back to a fixed
    // divisor produced a GBP figure that silently drifted from reality.
    const gbpPerPkr = (rates.usdGbp && rates.usdPkr) ? (rates.usdGbp / rates.usdPkr) : null;
    const gbp = (pkrValue, stored) => {
      if (Number.isFinite(stored)) return stored;
      if (gbpPerPkr && Number.isFinite(pkrValue)) return Math.round(pkrValue * gbpPerPkr);
      return null;
    };
    const pair = (pkrValue, stored) => {
      if (!Number.isFinite(pkrValue)) return '—';
      const g = gbp(pkrValue, stored);
      return `PKR ${pkrValue.toLocaleString()}${g !== null ? ` (£${g.toLocaleString()})` : ''}`;
    };

    const silver = Number.isFinite(rates.rateSilverPerTola)
      ? `<span>✦</span><span class="gold-rate-item">Silver: <strong>PKR ${rates.rateSilverPerTola.toLocaleString()} / Tola</strong></span>`
      : '';

    // Its own tag, and it does not say "live". Carrying the guide under the
    // LIVE GOLD MARKET tag would tell a customer that a judgement figure is
    // today's market.
    const diamonds = diamondGuide
      ? `<span>✦</span><span class="gold-rate-item"><span class="gold-rate-tag" style="background:rgba(196,222,238,0.15); color:var(--diamond-200,#e2eef5); border:1px solid rgba(196,222,238,0.45);" title="Indicative per-carat guide, not a market rate. Diamonds are priced individually — a firm quote needs the stone.">DIAMOND GUIDE</span> ` +
        diamondGuide.map(d =>
          `${d.label}: <strong>PKR ${d.pkr.toLocaleString()}${d.gbp ? ` (£${d.gbp.toLocaleString()})` : ''} / ct</strong>`
        ).join(' <span>✦</span> ') +
        `</span>`
      : '';

    const tickerContent = `
      <div class="gold-rate-ticker">
        <span class="gold-rate-item"><span class="gold-rate-tag">LIVE GOLD MARKET</span> 24K Gold: <strong>${pair(rates.rate24kPerTola, rates.rate24kPerTolaGBP)} / Tola</strong></span>
        <span>✦</span>
        <span class="gold-rate-item">10 Grams 24K: <strong>${pair(rates.rate24kPer10g, rates.rate24kPer10gGBP)}</strong></span>
        <span>✦</span>
        <span class="gold-rate-item">1 Gram 24K: <strong>${pair(rates.rate24kPer1g, rates.rate24kPer1gGBP)}</strong></span>
        <span>✦</span>
        <span class="gold-rate-item">22K Gold: <strong>${pair(rates.rate22kPerTola, rates.rate22kPerTolaGBP)} / Tola</strong></span>
        <span>✦</span>
        <span class="gold-rate-item">18K Gold: <strong>${pair(rates.rate18kPerTola, rates.rate18kPerTolaGBP)} / Tola</strong></span>
        ${silver}
        ${diamonds}
        <span>✦</span>
        <span class="gold-rate-item"><span class="gold-rate-tag">UPDATED</span> ${rates.lastUpdated}</span>
      </div>
    `;

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'gold-rate-bar';
      const announceBar = document.querySelector('.announcement-bar');
      if (announceBar && announceBar.parentNode) {
        announceBar.parentNode.insertBefore(bar, announceBar.nextSibling);
      } else {
        const headerUtility = document.querySelector('.header-utility');
        if (headerUtility && headerUtility.parentNode) {
          headerUtility.parentNode.insertBefore(bar, headerUtility);
        } else {
          document.body.insertBefore(bar, document.body.firstChild);
        }
      }
    }
    bar.innerHTML = tickerContent;
  };

  // Auto-fetch live market rate on load & auto-refresh every 5 minutes safely
  if (window.goldRateTimer) clearInterval(window.goldRateTimer);
  setTimeout(() => window.fetchLiveGoldRates(true), 1000);
  window.goldRateTimer = setInterval(() => window.fetchLiveGoldRates(true), 5 * 60 * 1000);

  async function initAdminGoldRateControls() {
    const input24k = document.getElementById('admin-gold-24k-input');
    const btnSave = document.getElementById('admin-update-gold-rate-btn');
    const btnSync = document.getElementById('admin-sync-gold-btn');

    // Immediately fetch live market rates
    const rates = await window.fetchLiveGoldRates(true);

    if (input24k && rates?.rate24kPerTola) {
      input24k.value = rates.rate24kPerTola;
    }

    const updateAdminLabels = () => {
      const val = parseFloat(input24k?.value) || rates?.rate24kPerTola || 463800;
      const g10 = Math.round(val / 1.16638);
      const g1 = Math.round(val / 11.6638);
      const k22 = Math.round(val * (22 / 24));

      const el10g = document.getElementById('admin-rate-10g');
      const el1g = document.getElementById('admin-rate-1g');
      const el22k = document.getElementById('admin-rate-22k');

      if (el10g) el10g.textContent = `Rs. ${g10.toLocaleString()}`;
      if (el1g) el1g.textContent = `Rs. ${g1.toLocaleString()}`;
      if (el22k) el22k.textContent = `Rs. ${k22.toLocaleString()} / Tola`;
    };

    input24k?.addEventListener('input', updateAdminLabels);
    btnSave?.addEventListener('click', () => {
      window.updateGoldRateFrom24k(input24k.value);
    });
    btnSync?.addEventListener('click', async () => {
      showToast('Fetching latest live market gold rate...', 'info');
      const newRates = await window.fetchLiveGoldRates(false);
      if (newRates && input24k) input24k.value = newRates.rate24kPerTola;
      updateAdminLabels();
    });

    updateAdminLabels();
    initRateCardControls();
  }

  /* ======================================
     BESPOKE RATE CARD
     The estimator's metal side is a live feed and needs no admin. Its stone
     and labour side is the shop's own judgement, and is edited here.
     ====================================== */

  let rateCardState = null;
  let rateCardRates = null;

  // Which input maps to which place in the card. Kept as data so reading the
  // form and writing it back cannot drift apart.
  const RATE_CARD_FIELDS = [
    ['rc-melee', c => c.meleeUsdPerCarat, (c, v) => { c.meleeUsdPerCarat = v; }],
    ['rc-labgrown', c => c.labGrownFactor, (c, v) => { c.labGrownFactor = v; }],
    ['rc-setting', c => c.settingUsdPerCarat, (c, v) => { c.settingUsdPerCarat = v; }],
    ['rc-spread', c => c.spreadPercent, (c, v) => { c.spreadPercent = v; }],
    ['rc-emerald', c => c.gemUsdPerCarat['Colombian Emerald'], (c, v) => { c.gemUsdPerCarat['Colombian Emerald'] = v; }],
    ['rc-ruby', c => c.gemUsdPerCarat['Burmese Ruby'], (c, v) => { c.gemUsdPerCarat['Burmese Ruby'] = v; }],
    ['rc-sapphire', c => c.gemUsdPerCarat['Ceylon Royal Blue Sapphire'], (c, v) => { c.gemUsdPerCarat['Ceylon Royal Blue Sapphire'] = v; }]
  ];

  ['PK', 'UK', 'EU'].forEach(r => {
    ['perGram', 'percent', 'minimum'].forEach(k =>
      RATE_CARD_FIELDS.push([`rc-mk-${r}-${k}`, c => c.making[r][k], (c, v) => { c.making[r][k] = v; }]));
    RATE_CARD_FIELDS.push([`rc-duty-${r}`, c => c.dutyTaxPercent[r], (c, v) => { c.dutyTaxPercent[r] = v; }]);
  });

  /** The 1.00 ct tier is the one figure an admin actually watches. */
  const oneCaratTier = card => (card.diamondTiersUsd || []).find(t => t.upTo === 1);


  /* ---- The live half: today's conversion of the dollar figures ---- */

  const STONE_CURRENCIES = ['PKR', 'GBP', 'EUR'];

  const stoneMoney = (n, code) =>
    n === null || n === undefined || !isFinite(n)
      ? '—'
      : `${code} ${Math.round(n).toLocaleString('en-US')}`;

  const stoneUsd = n => `$${Math.round(n).toLocaleString('en-US')}`;

  function stoneCell(label, value, note) {
    return `
      <div style="background:#1c1a17; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:10px 14px;">
        <div style="font-size:10px; letter-spacing:1.4px; text-transform:uppercase; color:rgba(255,255,255,0.45);">${escapeHtml(label)}</div>
        <div style="font-size:15px; font-weight:600; color:#fff; margin-top:3px;">${escapeHtml(value)}</div>
        ${note ? `<div style="font-size:11px; color:rgba(255,255,255,0.35); margin-top:2px;">${escapeHtml(note)}</div>` : ''}
      </div>`;
  }

  function stoneTable(caption, note, rows) {
    if (!rows.length) return '';
    const head = ['', 'USD'].concat(STONE_CURRENCIES);
    return `
      <div style="margin-bottom:20px;">
        <p style="font-size:11px; letter-spacing:1.6px; text-transform:uppercase; color:var(--color-gold-light); margin-bottom:4px;">${escapeHtml(caption)}</p>
        ${note ? `<p style="font-size:11.5px; color:rgba(255,255,255,0.45); margin-bottom:8px; line-height:1.6;">${escapeHtml(note)}</p>` : ''}
        <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.1); border-radius:6px;">
          <table style="width:100%; min-width:520px; border-collapse:collapse; font-size:12.5px;">
            <thead>
              <tr style="background:#1c1a17;">
                ${head.map(h => `<th style="text-align:left; padding:9px 12px; font-size:10px; letter-spacing:1.2px; text-transform:uppercase; color:rgba(255,255,255,0.45); font-weight:600;">${escapeHtml(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr style="border-top:1px solid rgba(255,255,255,0.06);">
                  <td style="padding:9px 12px; color:rgba(255,255,255,0.85);">${escapeHtml(r.label)}</td>
                  <td style="padding:9px 12px; color:rgba(255,255,255,0.5);">${escapeHtml(stoneUsd(r.usd))}</td>
                  ${STONE_CURRENCIES.map(c => `<td style="padding:9px 12px; color:var(--color-gold-light); font-weight:600;">${escapeHtml(stoneMoney(r.local[c], c))}</td>`).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  /**
   * Paint the converted view.
   *
   * Every figure here is computed by the server from the same card the form
   * below edits. Converting again in the browser would give the same number
   * two places to be derived and one of them to be wrong.
   */
  function renderStoneMarket(market) {
    const fxBox = document.getElementById('stone-market-fx');
    const reviewBox = document.getElementById('stone-market-review');
    const tablesBox = document.getElementById('stone-market-tables');
    if (!fxBox || !reviewBox || !tablesBox) return;

    if (!market) {
      fxBox.innerHTML = '';
      reviewBox.innerHTML = '';
      tablesBox.innerHTML =
        '<p style="font-size:12.5px; color:#e74c3c;">The live rate feed is unreachable, so today&rsquo;s converted prices cannot be shown. The dollar figures below are unaffected.</p>';
      return;
    }

    const fx = market.fx || {};
    const num = n => (isFinite(n) && n !== null ? Number(n).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—');

    fxBox.innerHTML = [
      stoneCell('USD → PKR', num(fx.usdPkr),
        fx.pkrPremiumPercent ? `incl. ${fx.pkrPremiumPercent}% Sarafa premium` : 'at parity'),
      stoneCell('USD → GBP', num(fx.usdGbp)),
      stoneCell('USD → EUR', num(fx.usdEur)),
      stoneCell('Rates as of', fx.asOf || 'unknown')
    ].join('');

    const review = market.review || {};
    if (review.stale) {
      reviewBox.innerHTML = `
        <div role="alert" style="border:1px solid rgba(231,76,60,0.45); background:rgba(231,76,60,0.07); border-radius:6px; padding:12px 14px; font-size:12.5px; color:#f5b7b1; line-height:1.6;">
          Dollar figures last reviewed <strong>${escapeHtml(review.revisedOn || 'never')}</strong>${
            review.daysSince !== null && review.daysSince !== undefined ? ` — ${review.daysSince} days ago` : ''
          }. That is past the ${review.staleAfterDays}-day review point. Diamond prices drift and lab-grown has fallen every year, so these are worth checking against a current price list.
        </div>`;
    } else {
      reviewBox.innerHTML = `
        <div style="border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:12px 14px; font-size:12.5px; color:rgba(255,255,255,0.6); line-height:1.6;">
          Dollar figures last reviewed <strong style="color:var(--color-gold-light);">${escapeHtml(review.revisedOn || '—')}</strong>${
            review.daysSince !== null && review.daysSince !== undefined ? ` — ${review.daysSince} days ago` : ''
          }. Next review due after ${review.staleAfterDays} days.
        </div>`;
    }

    const d = market.diamond || {};
    const extras = []
      .concat(d.melee ? [{ label: 'Melee (pavé) diamond / ct', usd: d.melee.usd, local: d.melee.local }] : [])
      .concat(d.setting ? [{ label: 'Stone setting / ct', usd: d.setting.usd, local: d.setting.local }] : [])
      .concat((market.gems || []).map(g => ({ label: `${g.name} / ct`, usd: g.usd, local: g.local })));

    const labFactor = d.labGrownFactor;

    tablesBox.innerHTML = [
      stoneTable(
        'Natural diamond, per carat',
        'Priced by the stone’s own weight — a 2 ct stone is worth far more than two 1 ct stones. G–H / VS baseline.',
        d.natural || []
      ),
      stoneTable(
        'Lab-grown diamond, per carat',
        labFactor ? `Priced at ${Math.round(labFactor * 100)}% of natural. Worth reviewing more often than anything else on the card.` : '',
        d.labGrown || []
      ),
      stoneTable('Melee, setting and coloured stones', 'Coloured stones are flat per carat: origin and treatment move their value more than weight does.', extras)
    ].join('');
  }

  async function initRateCardControls() {
    const saveBtn = document.getElementById('ratecard-save-btn');
    if (!saveBtn) return;

    try {
      const res = await fetch(`${API_URL}/gold-rates/rate-card`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'unavailable');
      rateCardState = data.card;
      rateCardRates = data.rates;
      renderStoneMarket(data.stoneMarket);
    } catch (e) {
      document.getElementById('ratecard-preview').textContent =
        'The live metal feed is unreachable, so the rate card cannot be loaded or saved right now.';
      renderStoneMarket(null);
      saveBtn.disabled = true;
      return;
    }

    const revised = document.getElementById('ratecard-revised');
    if (revised) revised.textContent = rateCardState.revisedOn || '—';

    RATE_CARD_FIELDS.forEach(([id, read]) => {
      const el = document.getElementById(id);
      if (el) { el.value = read(rateCardState); el.addEventListener('input', renderRateCardPreview); }
    });
    const oneCt = document.getElementById('rc-diamond-1ct');
    if (oneCt) {
      oneCt.value = (oneCaratTier(rateCardState) || {}).perCarat || '';
      oneCt.addEventListener('input', renderRateCardPreview);
    }

    saveBtn.addEventListener('click', saveRateCard);

    // Re-pull the converted view on demand. The dollar figures do not change,
    // but the dollar itself does, so this is the button for "what is that
    // stone worth in rupees right now".
    document.getElementById('stone-market-refresh')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Refreshing…';
      try {
        const r = await fetch(`${API_URL}/gold-rates/rate-card`);
        const d = await r.json();
        if (!r.ok || !d.success) throw new Error(d.message || 'unavailable');
        renderStoneMarket(d.stoneMarket);
      } catch (err) {
        renderStoneMarket(null);
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });

    renderRateCardPreview();
  }

  /** The card as the form currently reads, without saving it. */
  function readRateCardForm() {
    const card = JSON.parse(JSON.stringify(rateCardState));
    RATE_CARD_FIELDS.forEach(([id, , write]) => {
      const el = document.getElementById(id);
      if (el && el.value !== '') write(card, Number(el.value));
    });

    // The whole diamond tier table is scaled by whatever the 1 ct figure is
    // moved to, so the curve keeps its shape instead of developing a step at
    // exactly one carat.
    const oneCt = Number(document.getElementById('rc-diamond-1ct')?.value);
    const current = oneCaratTier(rateCardState);
    if (oneCt > 0 && current && current.perCarat > 0) {
      const scale = oneCt / current.perCarat;
      card.diamondTiersUsd = rateCardState.diamondTiersUsd.map(t => ({
        upTo: t.upTo,
        perCarat: Math.round(t.perCarat * scale)
      }));
    }
    return card;
  }

  /**
   * Two worked examples, priced by the same arithmetic the studio page uses.
   * A rate card is abstract; "this moves a 1 ct solitaire to £5,100" is not.
   */
  function renderRateCardPreview() {
    const box = document.getElementById('ratecard-preview');
    if (!box || !rateCardState || !rateCardRates) return;
    const card = readRateCardForm();

    const rows = [
      ['1 tola 22k plain band, Pakistan',
        { region: 'PK', metal: '22k Yellow Gold', grams: 11.664, itemType: 'Custom Ring', gem: 'No Gemstone (Solid Metal)' }],
      ['1.00 ct solitaire, 4 g 18ct white gold, UK',
        { region: 'UK', metal: '18ct White Gold (750)', grams: 4, itemType: 'Custom Ring', gem: 'GIA Certified Diamond', centre: 1, total: 1, quality: 'G–H / VS (Fine)' }]
    ];

    box.innerHTML = rows.map(([label, spec]) => {
      const e = estimateWithCard(spec, card);
      return `<div style="display:flex;justify-content:space-between;gap:16px;">
        <span>${label}</span>
        <strong style="color:var(--color-gold-light);white-space:nowrap;">${e || 'not priceable'}</strong>
      </div>`;
    }).join('');
  }

  /**
   * A trimmed copy of the studio's estimator, enough for the worked examples.
   * The authority is server/utils/pricing.js; this exists so an admin can see
   * the effect of a change before saving it.
   */
  function estimateWithCard(spec, card) {
    const r = rateCardRates;
    const fx = spec.region === 'PK' ? r.usdPkr * (1 + (r.premiumPercent || 0) / 100)
      : spec.region === 'UK' ? r.usdGbp : r.usdEur;
    if (!fx || !r.xauUsd) return null;

    const fineness = spec.metal.includes('750') ? 0.75 : 22 / 24;
    const metalUsd = spec.grams * fineness * (r.xauUsd / 31.1034768);

    let stonesUsd = 0;
    if (spec.centre) {
      const tier = card.diamondTiersUsd.find(t => spec.centre <= (t.upTo === null ? Infinity : t.upTo))
        || card.diamondTiersUsd[card.diamondTiersUsd.length - 1];
      const grade = card.gradeFactors[spec.quality] ?? 1;
      stonesUsd += spec.centre * tier.perCarat * grade + spec.centre * card.settingUsdPerCarat;
    }

    const rule = card.making[spec.region];
    const making = Math.max((rule.perGram / fx) * spec.grams,
      metalUsd * rule.percent / 100, (rule.minimum || 0) / fx) * (card.itemFactors[spec.itemType] || 1);

    const before = metalUsd + stonesUsd + making;
    const mid = (before * (1 + (card.dutyTaxPercent[spec.region] || 0) / 100)) * fx;
    const s = card.spreadPercent / 100;
    const cur = { PK: 'PKR', UK: 'GBP', EU: 'EUR' }[spec.region];
    const step = cur === 'PKR' ? 1000 : 10;
    const round = n => Math.round(n / step) * step;
    // Currency on both ends, the way the studio page writes it, so an admin
    // comparing the two is reading the same format in both places.
    return `${cur} ${round(mid * (1 - s)).toLocaleString()} – ${cur} ${round(mid * (1 + s)).toLocaleString()}`;
  }

  async function saveRateCard() {
    const btn = document.getElementById('ratecard-save-btn');
    const card = readRateCardForm();

    // Send only the parts this panel owns. Posting the whole merged card back
    // would freeze every default it does not expose, so a later change to
    // those defaults would never reach a shop that had once pressed Save.
    const patch = {
      diamondTiersUsd: card.diamondTiersUsd,
      meleeUsdPerCarat: card.meleeUsdPerCarat,
      labGrownFactor: card.labGrownFactor,
      settingUsdPerCarat: card.settingUsdPerCarat,
      spreadPercent: card.spreadPercent,
      gemUsdPerCarat: card.gemUsdPerCarat,
      making: card.making,
      dutyTaxPercent: card.dutyTaxPercent
      // revisedOn is stamped by the server on the shop's own clock; sending
      // the browser's would date a 3am save in Lahore to the day before.
    };

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Saving…';
    try {
      const res = await adminFetch('/gold-rates/rate-card', {
        method: 'PATCH',
        body: JSON.stringify({ card: patch })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || `Save failed (${res.status}).`);
      rateCardState = data.card;
      const revised = document.getElementById('ratecard-revised');
      if (revised) revised.textContent = rateCardState.revisedOn || '—';
      // Comes back with the save, so the converted tables and the review date
      // move at the same moment the figures do.
      if (data.stoneMarket) renderStoneMarket(data.stoneMarket);
      showToast('Rate card saved — the studio is quoting on these figures now.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  /* ======================================
     CUSTOMER AUTHENTICATION & ACCOUNT SYSTEM
     Server-backed. The access token lives in memory only; the refresh token is
     an httpOnly cookie the page can never read. Nothing sensitive is stored in
     localStorage, which the previous implementation used for plaintext
     passwords.
  ====================================== */
  const Auth = {
    accessToken: null,
    user: null,
    providers: [],
    // null until the providers probe answers. It was left undefined, which is
    // falsy, so opening the sign-in modal before the probe returned announced
    // that the account service was down — on a cold start that window is
    // seconds long and the claim was simply untrue.
    apiReachable: null,
    ready: false
  };
  window.Auth = Auth;

  function authHeaders(extra) {
    const h = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    if (Auth.accessToken) h.Authorization = 'Bearer ' + Auth.accessToken;
    return h;
  }

  async function api(path, options) {
    const opts = Object.assign({ credentials: 'same-origin' }, options || {});
    opts.headers = authHeaders(opts.headers);
    if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);

    let res = await fetch(path, opts);

    // One transparent retry: the access token is short-lived by design, so an
    // expiry mid-session is expected rather than exceptional.
    if (res.status === 401 && Auth.accessToken) {
      const body = await res.clone().json().catch(() => ({}));
      if (body.code === 'TOKEN_EXPIRED' || body.code === 'TOKEN_STALE') {
        const refreshed = await tryRefresh();
        if (refreshed) {
          opts.headers = authHeaders(options && options.headers);
          res = await fetch(path, opts);
        } else {
          applySession(null, null);
        }
      }
    }

    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  async function tryRefresh() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.accessToken) {
        applySession(data.accessToken, data.user);
        return true;
      }
    } catch (e) { /* offline or API unavailable */ }
    return false;
  }

  function applySession(token, user) {
    Auth.accessToken = token || null;
    Auth.user = user || null;
    window.updateAccountHeaderUI();
  }

  // Kept for callers such as cart that expect a synchronous read.
  window.getActiveCustomer = function () {
    return Auth.user;
  };

  window.isSignedIn = function () {
    return !!Auth.user;
  };

  window.authFetch = api;

  window.signOut = async function () {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (e) { /* clear locally regardless */ }
    applySession(null, null);
  };

  window.updateAccountHeaderUI = function () {
    const user = Auth.user;
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>`;
    document.querySelectorAll('#util-account, .account-link').forEach(link => {
      link.innerHTML = user
        ? `${icon} Account (${escapeHtml(String(user.name || '').split(' ')[0])})`
        : `${icon} Sign In / Register`;
    });
    // The dock's own entry reads Sign In / Account from the same state, and on
    // a phone it is the only one of these on screen.
    if (typeof window.renderMobileAppDock === 'function') window.renderMobileAppDock();
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /* ---------- Provider buttons ---------- */

  const PROVIDER_META = {
    google: {
      label: 'Continue with Google',
      svg: `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z"/></svg>`
    },
    apple: {
      label: 'Continue with Apple',
      svg: `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M16.36 12.78c.02 2.63 2.3 3.5 2.33 3.51-.02.06-.36 1.25-1.2 2.47-.72 1.06-1.47 2.11-2.66 2.13-1.16.02-1.54-.69-2.87-.69-1.33 0-1.75.67-2.85.71-1.14.04-2.01-1.14-2.74-2.2-1.49-2.16-2.63-6.1-1.1-8.76a4.25 4.25 0 0 1 3.6-2.19c1.12-.02 2.18.75 2.87.75.68 0 1.97-.93 3.32-.79.57.02 2.17.23 3.2 1.73-.08.05-1.91 1.12-1.9 3.33M14.2 4.6c.61-.74 1.02-1.77.91-2.8-.88.04-1.94.59-2.57 1.32-.56.66-1.05 1.71-.92 2.72.98.08 1.98-.5 2.58-1.24"/></svg>`
    },
    facebook: {
      label: 'Continue with Facebook',
      // Two paths: the blue disc, then the glyph knocked out in white.
      svg: `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.96.93-1.96 1.89v2.23h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/><path fill="#ffffff" d="M16.67 15.56l.53-3.49h-3.33V9.84c0-.96.47-1.89 1.96-1.89h1.52V5c-.001 0-1.38-.24-2.69-.24-2.74 0-4.53 1.66-4.53 4.67v2.64H7.08v3.49h3.05V24a12.1 12.1 0 0 0 3.74 0v-8.44h2.8z"/></svg>`
    }
  };

  async function loadProviders() {
    try {
      const res = await fetch('/api/auth/providers', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('providers endpoint returned ' + res.status);
      const data = await res.json();
      Auth.providers = (data && data.providers) || [];
      Auth.apiReachable = true;
    } catch (e) {
      // An unreachable API is a different situation from a deployment that
      // deliberately runs email-only, and the two must not look identical.
      Auth.providers = [];
      Auth.apiReachable = false;
      console.warn('[auth] Could not load sign-in providers:', e.message);
    }
  }

  function providerButtonsHtml() {
    // Still probing: say nothing rather than accuse the service of being down.
    if (Auth.apiReachable === null) return '';

    if (Auth.apiReachable === false) {
      // The "run npm start" advice only makes sense to someone working on the
      // site locally; on a real domain it reads as gibberish to a customer.
      const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ||
        location.protocol === 'file:';
      return `<p class="auth-notice">${local
        ? 'Social sign-in is unavailable because the account API is not responding. ' +
          'Open the site through the Node server (<code>npm start</code>), not a static file server.'
        : 'Social sign-in is not available at the moment. You can still sign in with your ' +
          'email address and password below.'}</p>`;
    }
    if (!Auth.providers.length) return '';

    const buttons = Auth.providers.map(p => {
      const meta = PROVIDER_META[p];
      if (!meta) return '';
      return `<button type="button" class="auth-provider-btn" data-provider="${p}">
        ${meta.svg}<span>${meta.label}</span>
      </button>`;
    }).join('');
    return `<div class="auth-providers">${buttons}</div>
            <div class="auth-divider"><span>or use your email</span></div>`;
  }

  function wireProviderButtons(root) {
    root.querySelectorAll('.auth-provider-btn').forEach(btn => {
      btn.addEventListener('click', () => startProviderSignIn(btn.dataset.provider));
    });
  }

  function startProviderSignIn(provider) {
    const returnTo = location.pathname + location.search;
    const url = `/api/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
    const w = 520, h = 640;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(url, 'lavion-auth', `width=${w},height=${h},left=${left},top=${top}`);

    // Popup blocked — fall back to a full-page redirect.
    if (!popup || popup.closed) { window.location.href = url; return; }
  }

  window.addEventListener('message', async (event) => {
    // Only trust messages from our own origin.
    if (event.origin !== window.location.origin) return;
    const msg = event.data;
    if (!msg || msg.type !== 'lavion-auth') return;

    if (msg.ok) {
      const done = await tryRefresh();
      if (done) {
        showToast(`Welcome, ${Auth.user ? Auth.user.name.split(' ')[0] : 'back'}.`, 'success');
        closeAuthModal();
      } else {
        showToast('Signed in, but the session could not be loaded. Please refresh.', 'error');
      }
    } else {
      showToast(msg.message || 'Sign-in failed.', 'error');
    }
  });

  /* ---------- Modal ---------- */

  function getAuthModal() {
    let modal = document.getElementById('customer-auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'customer-auth-modal';
      modal.className = 'admin-modal-backdrop';
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAuthModal();
      });
    }
    return modal;
  }

  function closeAuthModal() {
    const modal = document.getElementById('customer-auth-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  window.closeAuthModal = closeAuthModal;

  function openModalShell(innerHtml) {
    const modal = getAuthModal();
    modal.innerHTML = `<div class="admin-modal-dialog auth-dialog">${innerHtml}</div>`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modal.querySelectorAll('[data-auth-close]').forEach(b => b.addEventListener('click', closeAuthModal));
    return modal;
  }

  function authHeaderHtml(title, subtitle) {
    return `
      <button class="auth-close" data-auth-close aria-label="Close">&times;</button>
      <div class="auth-head">
        <span class="auth-mark">&#10022;</span>
        <h2 class="auth-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="auth-sub">${escapeHtml(subtitle)}</p>` : ''}
      </div>`;
  }

  function setBusy(form, busy, label) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.textContent = label || 'Please wait…';
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
    }
  }

  function showFormError(form, message) {
    let box = form.querySelector('.auth-error');
    if (!box) {
      box = document.createElement('p');
      box.className = 'auth-error';
      form.prepend(box);
    }
    box.textContent = message;
    box.style.display = message ? 'block' : 'none';
  }

  window.openCustomerAuthModal = function () {
    if (Auth.user) return renderProfileView();
    renderSignInView();
  };

  function renderSignInView() {
    const modal = openModalShell(`
      ${authHeaderHtml('Sign In', 'Access your orders, wishlist and bespoke requests.')}
      ${providerButtonsHtml()}
      <form id="auth-signin-form" class="auth-form" novalidate>
        <label class="auth-label" for="auth-email">Email address</label>
        <input class="auth-input" type="email" id="auth-email" autocomplete="email" required />

        <div class="auth-label-row">
          <label class="auth-label" for="auth-pass">Password</label>
          <button type="button" class="auth-link-btn" id="auth-forgot">Forgot?</button>
        </div>
        <input class="auth-input" type="password" id="auth-pass" autocomplete="current-password" required />

        <button type="submit" class="btn-gold auth-submit">Sign In</button>
      </form>
      <p class="auth-foot">New to Lavion?
        <button type="button" class="auth-link-btn" id="auth-to-register">Create an account</button>
      </p>
    `);

    wireProviderButtons(modal);
    document.getElementById('auth-to-register').addEventListener('click', renderRegisterView);
    document.getElementById('auth-forgot').addEventListener('click', renderForgotView);

    const form = document.getElementById('auth-signin-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showFormError(form, '');
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-pass').value;
      if (!email || !password) return showFormError(form, 'Enter your email and password.');

      setBusy(form, true, 'Signing in…');
      const { ok, data } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      setBusy(form, false);

      if (ok && data.accessToken) {
        applySession(data.accessToken, data.user);
        showToast(data.message || 'Signed in.', 'success');
        closeAuthModal();
        return;
      }
      if (data.code === 'PROVIDER_ONLY') {
        return showFormError(form, data.message || 'Use your connected provider to sign in.');
      }
      // The password was right, but the address was never confirmed. The
      // server has already sent a fresh code, so go straight to the code
      // screen rather than making them ask for one.
      if (data.code === 'EMAIL_UNVERIFIED') {
        return renderVerifyView(data.email || email, data.message);
      }
      showFormError(form, data.message || 'Sign in failed.');
    });
  }

  function renderRegisterView() {
    const modal = openModalShell(`
      ${authHeaderHtml('Create Account', 'Join the Lavion inner circle.')}
      ${providerButtonsHtml()}
      <form id="auth-register-form" class="auth-form" novalidate>
        <label class="auth-label" for="reg-name">Full name</label>
        <input class="auth-input" type="text" id="reg-name" autocomplete="name" required />

        <label class="auth-label" for="reg-email">Email address</label>
        <input class="auth-input" type="email" id="reg-email" autocomplete="email" required />

        <div class="auth-row">
          <div>
            <label class="auth-label" for="reg-phone">Phone (optional)</label>
            <input class="auth-input" type="tel" id="reg-phone" autocomplete="tel" />
          </div>
          <div>
            <label class="auth-label" for="reg-city">City</label>
            <input class="auth-input" type="text" id="reg-city" value="Lahore" />
          </div>
        </div>

        <label class="auth-label" for="reg-pass">Password</label>
        <input class="auth-input" type="password" id="reg-pass" autocomplete="new-password" required />
        <p class="auth-hint">At least 10 characters. Use something you do not reuse elsewhere.</p>

        <button type="submit" class="btn-gold auth-submit">Create Account</button>
      </form>
      <p class="auth-foot">Already have an account?
        <button type="button" class="auth-link-btn" id="auth-to-signin">Sign in</button>
      </p>
    `);

    wireProviderButtons(modal);
    document.getElementById('auth-to-signin').addEventListener('click', renderSignInView);

    const form = document.getElementById('auth-register-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showFormError(form, '');
      const payload = {
        name: document.getElementById('reg-name').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        phone: document.getElementById('reg-phone').value.trim(),
        city: document.getElementById('reg-city').value.trim(),
        password: document.getElementById('reg-pass').value
      };
      if (!payload.name || !payload.email || !payload.password) {
        return showFormError(form, 'Name, email and password are required.');
      }

      setBusy(form, true, 'Creating…');
      const { ok, data } = await api('/api/auth/register', { method: 'POST', body: payload });
      setBusy(form, false);

      // The normal path: the account exists but is not usable until the code
      // sent to that inbox comes back.
      if (ok && data.needsVerification) {
        renderVerifyView(data.email || payload.email);
        return;
      }
      // Only reached when the code could not be delivered, in which case the
      // server opens the account rather than stranding the customer.
      if (ok && data.accessToken) {
        applySession(data.accessToken, data.user);
        showToast(data.message || 'Account created.', 'success');
        closeAuthModal();
        return;
      }
      showFormError(form, data.message || 'Could not create the account.');
    });
  }

  /**
   * The confirmation code screen.
   *
   * One field rather than six boxes: a single input pastes cleanly, works with
   * the browser's one-time-code autofill, and cannot lose a digit to a stray
   * focus jump between boxes. The spacing is done in CSS, so it still reads as
   * six characters.
   */
  function renderVerifyView(email, note) {
    openModalShell(`
      ${authHeaderHtml('Confirm your email', `We sent a six-digit code to ${email}.`)}
      ${note ? `<p class="auth-body-text">${escapeHtml(note)}</p>` : ''}
      <form id="auth-verify-form" class="auth-form" novalidate>
        <label class="auth-label" for="otp-code">Confirmation code</label>
        <input class="auth-input auth-otp" type="text" id="otp-code" inputmode="numeric"
               autocomplete="one-time-code" maxlength="6" placeholder="000000"
               aria-describedby="otp-hint" required />
        <p class="auth-hint" id="otp-hint">The code expires in 10 minutes. Check your spam folder if it has not arrived.</p>
        <button type="submit" class="btn-gold auth-submit">Confirm &amp; Sign In</button>
      </form>
      <p class="auth-foot">Nothing arrived?
        <button type="button" class="auth-link-btn" id="otp-resend">Send a new code</button>
      </p>
      <p class="auth-foot">Already have an account?
        <button type="button" class="auth-link-btn" id="otp-to-signin">Sign in instead</button>
      </p>
    `);

    const form = document.getElementById('auth-verify-form');
    const input = document.getElementById('otp-code');
    const resendBtn = document.getElementById('otp-resend');

    document.getElementById('otp-to-signin').addEventListener('click', renderSignInView);
    input.focus();

    let submitting = false;

    async function submitCode() {
      const code = input.value.replace(/\D/g, '');
      if (code.length !== 6) return showFormError(form, 'Enter the six-digit code from your email.');
      if (submitting) return;

      submitting = true;
      showFormError(form, '');
      setBusy(form, true, 'Confirming…');
      const { ok, data } = await api('/api/auth/verify-otp', {
        method: 'POST',
        body: { email, code }
      });
      setBusy(form, false);
      submitting = false;

      if (ok && data.accessToken) {
        applySession(data.accessToken, data.user);
        showToast(data.message || 'Email confirmed.', 'success');
        closeAuthModal();
        return;
      }

      showFormError(form, data.message || 'That code could not be confirmed.');
      // A rejected code is never worth resubmitting, so clear it rather than
      // leaving digits behind for them to edit around.
      input.value = '';
      input.focus();
    }

    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '').slice(0, 6);
      if (digits !== input.value) input.value = digits;
      // Submit on the sixth digit — with a fixed-length code, asking for a
      // button press afterwards is a step that tells us nothing new.
      if (digits.length === 6) submitCode();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitCode();
    });

    // Captured before anything mutates it, so the countdown has something
    // truthful to restore.
    const resendLabel = resendBtn.textContent;

    resendBtn.addEventListener('click', async () => {
      // Say what is happening straight away. Disabling alone leaves a dead
      // button for the length of the round trip, which reads as a broken one.
      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending…';

      const { ok, data } = await api('/api/auth/resend-otp', { method: 'POST', body: { email } });
      showToast(data.message || (ok ? 'A new code is on its way.' : 'Could not send a new code.'),
        ok ? 'success' : 'error');

      // Match the server's cooldown so the button does not invite a request it
      // already knows will be refused. `retryAfter` is authoritative when the
      // server sends one back.
      let left = (!ok && data.retryAfter) ? data.retryAfter : 60;
      const tick = () => {
        resendBtn.textContent = left > 0 ? `${resendLabel} (${left}s)` : resendLabel;
        if (left <= 0) {
          resendBtn.disabled = false;
          clearInterval(timer);
        }
        left--;
      };
      tick();
      const timer = setInterval(tick, 1000);
    });
  }

  function renderForgotView() {
    openModalShell(`
      ${authHeaderHtml('Reset your password', 'We will email you a secure link.')}
      <form id="auth-forgot-form" class="auth-form" novalidate>
        <label class="auth-label" for="forgot-email">Email address</label>
        <input class="auth-input" type="email" id="forgot-email" autocomplete="email" required />
        <button type="submit" class="btn-gold auth-submit">Send Reset Link</button>
      </form>
      <p class="auth-foot">
        <button type="button" class="auth-link-btn" id="auth-back-signin2">Back to sign in</button>
      </p>
    `);

    document.getElementById('auth-back-signin2').addEventListener('click', renderSignInView);

    const form = document.getElementById('auth-forgot-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      if (!email) return showFormError(form, 'Enter your email address.');

      setBusy(form, true, 'Sending…');
      const { data } = await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setBusy(form, false);

      openModalShell(`
        ${authHeaderHtml('Check your inbox', data.message || 'If an account exists, a reset link is on its way.')}
        <p class="auth-body-text">The link expires in 30 minutes and can be used once.</p>
        <button type="button" class="btn-gold auth-submit" data-auth-close>Close</button>
      `);
      document.querySelectorAll('[data-auth-close]').forEach(b =>
        b.addEventListener('click', closeAuthModal));
    });
  }

  function renderProfileView() {
    const u = Auth.user;
    // No verified / not-verified badge: an unconfirmed account cannot hold a
    // session at all now, so everyone who reaches this view is verified and
    // the badge would only ever state the obvious.
    const providerTags = (u.providers || []).map(p =>
      `<span class="auth-tag">${escapeHtml(p)}</span>`).join('');

    openModalShell(`
      ${authHeaderHtml(u.name, u.email)}
      <div class="auth-profile-meta">
        ${providerTags}
      </div>

      <form id="auth-profile-form" class="auth-form" novalidate>
        <div class="auth-row">
          <div>
            <label class="auth-label" for="pf-phone">Phone</label>
            <input class="auth-input" type="tel" id="pf-phone" value="${escapeHtml(u.phone)}" />
          </div>
          <div>
            <label class="auth-label" for="pf-city">City</label>
            <input class="auth-input" type="text" id="pf-city" value="${escapeHtml(u.city)}" />
          </div>
        </div>
        <button type="submit" class="btn-outline auth-submit">Save Details</button>
      </form>

      <div class="auth-actions">
        <button type="button" class="auth-link-btn" id="pf-change-pass">
          ${u.hasPassword ? 'Change password' : 'Add a password'}
        </button>
        <button type="button" class="auth-link-btn" id="pf-logout-all">Sign out everywhere</button>
      </div>

      <button type="button" class="btn-gold auth-submit" id="pf-logout">Sign Out</button>
    `);

    const form = document.getElementById('auth-profile-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(form, true, 'Saving…');
      const { ok, data } = await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          phone: document.getElementById('pf-phone').value.trim(),
          city: document.getElementById('pf-city').value.trim()
        }
      });
      setBusy(form, false);
      if (ok) {
        Auth.user = data.user;
        showToast('Profile updated.', 'success');
      } else {
        showFormError(form, data.message || 'Could not save.');
      }
    });

    document.getElementById('pf-change-pass').addEventListener('click', renderChangePasswordView);

    document.getElementById('pf-logout').addEventListener('click', async () => {
      await window.signOut();
      showToast('Signed out.', 'info');
      closeAuthModal();
    });

    document.getElementById('pf-logout-all').addEventListener('click', async () => {
      await api('/api/auth/logout-all', { method: 'POST' });
      applySession(null, null);
      showToast('Signed out on all devices.', 'info');
      closeAuthModal();
    });
  }

  function renderChangePasswordView() {
    const needsCurrent = Auth.user && Auth.user.hasPassword;
    openModalShell(`
      ${authHeaderHtml(needsCurrent ? 'Change password' : 'Add a password',
        needsCurrent ? 'Other devices will be signed out.' : 'You will still be able to use your connected providers.')}
      <form id="auth-changepass-form" class="auth-form" novalidate>
        ${needsCurrent ? `
        <label class="auth-label" for="cp-current">Current password</label>
        <input class="auth-input" type="password" id="cp-current" autocomplete="current-password" required />` : ''}

        <label class="auth-label" for="cp-new">New password</label>
        <input class="auth-input" type="password" id="cp-new" autocomplete="new-password" required />
        <p class="auth-hint">At least 10 characters.</p>

        <button type="submit" class="btn-gold auth-submit">Update Password</button>
      </form>
      <p class="auth-foot">
        <button type="button" class="auth-link-btn" id="cp-back">Back to account</button>
      </p>
    `);

    document.getElementById('cp-back').addEventListener('click', renderProfileView);

    const form = document.getElementById('auth-changepass-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showFormError(form, '');
      const body = { newPassword: document.getElementById('cp-new').value };
      if (needsCurrent) body.currentPassword = document.getElementById('cp-current').value;

      setBusy(form, true, 'Updating…');
      const { ok, data } = await api('/api/auth/change-password', { method: 'POST', body });
      setBusy(form, false);

      if (ok) {
        applySession(data.accessToken, data.user);
        showToast('Password updated.', 'success');
        renderProfileView();
      } else {
        showFormError(form, data.message || 'Could not update the password.');
      }
    });
  }

  let authControlsReady = false;
  async function initCustomerAuthControls() {
    // This bootstrap is invoked both on DOMContentLoaded and immediately, so
    // guard against binding the handlers and refreshing the session twice.
    if (authControlsReady) return;
    authControlsReady = true;

    // Delegated, because the dock's account entry is re-rendered whenever the
    // bag or wishlist count changes. Binding to the nodes that happened to
    // exist at start-up left every later copy inert.
    document.addEventListener('click', (e) => {
      // .account-open is deliberately not .account-link: updateAccountHeaderUI
      // rewrites the innerHTML of every .account-link, which would flatten the
      // dock entry's icon-over-label structure into a bare line of text.
      if (!e.target.closest('#util-account, .account-link, .account-open')) return;
      e.preventDefault();
      document.getElementById('mobile-menu')?.classList.remove('active');
      window.openCustomerAuthModal();
    });

    // Restore any existing session from the refresh cookie, then learn which
    // providers this deployment actually has credentials for.
    await Promise.all([tryRefresh(), loadProviders()]);
    Auth.ready = true;
    window.updateAccountHeaderUI();

    // Deep links: ?signin=1 opens the modal straight away.
    const params = new URLSearchParams(location.search);
    if (params.get('signin') === '1' && !Auth.user) window.openCustomerAuthModal();
  }

  /* ======================================
     LUXURY ADMIN SET AGREED PRICE MODAL
  ====================================== */
  window.openSetOrderPriceModal = function (orderId) {
    const ords = window.getOrders();
    const ord = ords.find(o => String(o.id).toLowerCase() === String(orderId).toLowerCase());
    if (!ord) return;

    let modal = document.getElementById('set-price-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'set-price-modal';
      modal.className = 'admin-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="admin-modal-dialog" style="max-width:520px; background:#181614; border:1px solid var(--color-gold); border-radius:12px; padding:24px; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(200,169,110,0.3); padding-bottom:12px;">
          <h3 style="font-family:var(--font-serif); font-size:22px; color:var(--color-gold-light); margin:0; display:flex; align-items:center; gap:8px;">
            💰 Set Agreed Quotation Price
          </h3>
          <button id="set-price-close" class="admin-action-btn" style="padding:4px 10px; font-size:16px;">&times;</button>
        </div>

        <div style="background:#12100e; border:1px solid rgba(200,169,110,0.2); border-radius:8px; padding:14px; margin-bottom:20px; font-size:13px; color:rgba(255,255,255,0.85);">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Order Ref:</span> <strong style="color:var(--color-gold-light);">${ord.id}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Customer Name:</span> <strong style="color:#fff;">${ord.customer} (${ord.phone})</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Items Ordered:</span> <span style="color:rgba(255,255,255,0.7);">${ord.items}</span>
          </div>
        </div>

        <form id="set-price-form">
          <div class="admin-form-group" style="margin-bottom:16px;">
            <label style="color:var(--color-gold-light); font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:6px;">
              Agreed Final Price (PKR) <span style="color:#e74c3c">*</span>
            </label>
            <input type="number" id="agreed-price-input" value="${ord.total || ''}" placeholder="e.g. 450000" min="0" step="any" style="width:100%; padding:12px; background:#12100e; border:1px solid var(--color-gold); color:#fff; font-size:16px; font-weight:700; border-radius:6px; box-sizing:border-box;" required autofocus />
            <div id="price-formatted-preview" style="font-size:12px; color:var(--color-gold-light); margin-top:6px; font-style:italic;">
              ${ord.total ? 'Formatted: PKR ' + Number(ord.total).toLocaleString() : 'Formatted: PKR 0'}
            </div>
          </div>

          <p style="font-size:11px; color:rgba(255,255,255,0.5); line-height:1.4; margin-bottom:20px;">
            ✦ Once saved, the order status updates to <strong>Price Confirmed ✓</strong> and customer invoices/receipts will display this agreed price.
          </p>

          <div style="display:flex; gap:10px;">
            <button type="submit" class="admin-primary-btn" style="flex:1; justify-content:center; padding:12px; background:linear-gradient(135deg,#c9a84c,#f0d080); color:#0a0a0a; font-size:13px; font-weight:700; border:none; border-radius:6px; cursor:pointer;">
              🔒 Save & Lock Agreed Price
            </button>
            <button type="button" id="set-price-cancel" class="admin-action-btn delete" style="padding:12px 18px; font-size:13px;">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('active');
    modal.style.zIndex = '25000';
    document.body.style.overflow = 'hidden';

    const priceInput = document.getElementById('agreed-price-input');
    const preview = document.getElementById('price-formatted-preview');

    priceInput?.addEventListener('input', () => {
      const val = parseFloat(priceInput.value);
      preview.textContent = isNaN(val) || val <= 0 ? 'Formatted: PKR 0' : `Formatted: PKR ${val.toLocaleString()}`;
    });

    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };

    document.getElementById('set-price-close')?.addEventListener('click', closeModal);
    document.getElementById('set-price-cancel')?.addEventListener('click', closeModal);

    document.getElementById('set-price-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const agreedPrice = parseFloat(priceInput.value);
      if (isNaN(agreedPrice) || agreedPrice <= 0) {
        showToast('Please enter a valid price.', 'error');
        return;
      }

      const allOrds = window.getOrders();
      const target = allOrds.find(o => String(o.id).toLowerCase() === String(orderId).toLowerCase());
      if (target) {
        target.total = agreedPrice;
        target.priceConfirmed = true;
        target.status = 'Price Confirmed';
        saveOrders(allOrds);
      }

      // This swallowed every error and reported success regardless, so a
      // rejected write still told the admin the price was agreed.
      let synced = false;
      let reason = '';
      try {
        const res = await adminFetch(`/orders/${orderId}/price`, {
          method: 'PUT',
          body: JSON.stringify({ price: agreedPrice, status: 'Price Confirmed' })
        });
        synced = res.ok;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          reason = data.message || `Server returned ${res.status}.`;
          console.error('Set price rejected:', res.status, reason);
        }
      } catch (err) {
        reason = 'Could not reach the server.';
        console.error('Set price failed:', err.message);
      }

      showToast(
        synced
          ? `Order ${orderId} agreed price set to PKR ${agreedPrice.toLocaleString()}.`
          : `Price not saved: ${reason}`,
        synced ? 'success' : 'error'
      );
      closeModal();
      renderAdmin();
    });
  };

  /* ======================================
     LUXURY INVOICE & RECEIPT SYSTEM
  ====================================== */
  window.generateInvoice = async function (orderId) {
    const matches = (o) => String(o.id).toLowerCase() === String(orderId).toLowerCase();

    let order = window.getOrders().find(matches);

    // The local store is only refreshed on page load, so an order placed a
    // moment ago will not be there yet. Ask the API before giving up.
    if (!order) {
      try {
        // Ask for the one order by its number rather than downloading the book
        // and searching it. /track answers with a single order to someone who
        // already knows its id, which is exactly what this needs — and it is
        // the reason listing every order could be closed off entirely.
        //
        // It answers with the tracking view only, so the billing block below
        // falls back where a field is missing. That is the intended trade: the
        // full record reaches the invoice from this device's own checkout, and
        // a stranger who guesses an order number gets a delivery status.
        const res = await fetch(`/api/orders/track/${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          const remote = data.order && matches(data.order) ? data.order : null;
          if (remote) {
            order = remote;
            const cached = window.getOrders();
            if (!cached.some(matches)) window.saveOrders([remote, ...cached]);
          }
        }
      } catch (e) {
        console.warn('Invoice lookup could not reach the orders API:', e.message);
      }
    }

    if (!order) {
      showToast('Order record not found for invoice generation.', 'error');
      return;
    }

    let modal = document.getElementById('invoice-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'invoice-modal';
      modal.className = 'admin-modal-backdrop';
      document.body.appendChild(modal);
    }

    const rates = window.getGoldRates();
    const dateStr = order.date || new Date().toISOString().split('T')[0];

    modal.innerHTML = `
      <div class="admin-modal-dialog invoice-card" style="max-width:780px; padding:0; overflow:hidden; border-radius:12px;">
        <!-- Sticky Non-Print Control Header Bar -->
        <div class="invoice-no-print" style="position:sticky; top:0; z-index:100; background:#1c1a18; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--color-gold); box-shadow:0 4px 12px rgba(0,0,0,0.5);">
          <span style="color:var(--color-gold-light); font-size:13px; font-weight:700; display:flex; align-items:center; gap:6px;">
            🧾 Sales Invoice #${escapeHtml(String(order.id).replace('ORD-', 'INV-'))}
          </span>
          <div style="display:flex; gap:10px; align-items:center;">
            <button class="admin-primary-btn" id="inv-download-pdf-btn" style="padding:8px 16px; font-size:12px; font-weight:700; background:var(--color-gold); color:#1c1a18; border:none; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:6px;">
              ⬇️ Download PDF Invoice
            </button>
            <button class="admin-action-btn" id="inv-close-btn" style="padding:8px 14px; font-size:12px; font-weight:700; background:#e74c3c; color:#fff; border:none; border-radius:4px; cursor:pointer;">
              ❌ Cancel / Close
            </button>
          </div>
        </div>

        <!-- Printable Content Container -->
        <div style="padding:40px; background:#fff; color:#1c1a18;" id="printable-invoice-content">
          <!-- Invoice Header -->
          <div class="invoice-header">
            <div>
              <div class="invoice-brand-title">LAVION <span>GEMS</span> & JEWELLERS</div>
              <div style="font-size:11px; color:#666; font-style:italic;">Pakistan's Premier Luxury Jewellery House & Certified Bullion</div>
              <div class="invoice-badge">Official Hallmark Certificate & Tax Invoice</div>
            </div>
            <div style="text-align:right;">
              <h2 style="font-family:var(--font-serif); font-size:24px; color:var(--color-gold-dark); margin:0;">INVOICE</h2>
              <div style="font-size:14px; font-weight:700; color:#333;"># ${escapeHtml(String(order.id).replace('ORD-', 'INV-'))}</div>
              <div style="font-size:11px; color:#777;">Date: ${dateStr}</div>
            </div>
          </div>

          <!-- Customer & Order Meta Grid -->
          <div class="invoice-details-grid">
            <div>
              <strong style="color:var(--color-gold-dark); text-transform:uppercase; font-size:10px; letter-spacing:1px; display:block; margin-bottom:4px;">Billed To (Customer):</strong>
              <div style="font-weight:700; font-size:15px; color:#111;">${escapeHtml(order.customer)}</div>
              ${order.phone ? `<div>Phone: <strong>${escapeHtml(order.phone)}</strong></div>` : ''}
              <div>City: <strong>${escapeHtml(order.city)}</strong></div>
              ${order.address ? `<div>Address: ${escapeHtml(order.address)}</div>` : ''}
            </div>
            <div>
              <strong style="color:var(--color-gold-dark); text-transform:uppercase; font-size:10px; letter-spacing:1px; display:block; margin-bottom:4px;">Order Details & Gold Rate:</strong>
              <div>Order Reference: <strong>${escapeHtml(order.id)}</strong></div>
              ${order.payment ? `<div>Payment Mode: <strong>${escapeHtml(order.payment)}</strong></div>` : ''}
              <div>Delivery Status: <strong style="color:#27ae60;">${escapeHtml(order.status)}</strong></div>
              <div>24K Gold Rate at Confirmation: <strong>PKR ${rates.rate24kPerTola.toLocaleString()} / Tola</strong></div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width:50%;">Description / Piece Details</th>
                <th>Purity</th>
                <th>Qty</th>
                <th style="text-align:right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${escapeHtml(order.items)}</strong><br>
                  <span style="font-size:11px; color:#666; font-style:italic;">Certified Hallmark Gold & Insured Courier Dispatch</span>
                </td>
                <td>22K Gold / Gem</td>
                <td>1</td>
                <td style="text-align:right; font-weight:700;">${order.priceConfirmed && order.total > 0 ? 'PKR ' + Number(order.total).toLocaleString() : 'Price on Request (Quotation Pending)'}</td>
              </tr>
            </tbody>
          </table>

          <!-- Financial Summary -->
          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:20px; padding-top:16px; border-top:2px solid #eee;">
            <div style="font-size:11px; color:#666; max-width:340px; line-height:1.5;">
              • <strong>Guaranteed Quality:</strong> All gold pieces are stamped with 22K/916 or 18K/750 hallmark quality.<br>
              • <strong>Quotation Agreement:</strong> ${order.priceConfirmed ? 'Agreed quotation price confirmed by Admin & Customer.' : 'Final quotation price is agreed between customer & admin upon live market verification.'}<br>
              • <strong>Support Contact:</strong> +92 324 1769500 | support@lavion.pk
            </div>
            <div style="text-align:right; min-width:240px;">
              <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                <span>Subtotal:</span>
                <strong>${order.priceConfirmed && order.total > 0 ? 'PKR ' + Number(order.total).toLocaleString() : 'Quotation Pending'}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                <span>Express Shipping:</span>
                <strong style="color:#27ae60;">FREE Insured</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:700; color:var(--color-gold-dark); border-top:2px solid var(--color-gold); padding-top:8px; margin-top:8px;">
                <span>Total Amount:</span>
                <span>${order.priceConfirmed && order.total > 0 ? 'PKR ' + Number(order.total).toLocaleString() : 'Price on Request'}</span>
              </div>
            </div>
          </div>

          <!-- Official Stamp & Sign -->
          <div class="invoice-footer">
            <div>
              <div style="font-family:var(--font-serif); font-size:14px; font-weight:700; color:#1c1a18;">Lavion Gems & Jewellers Ltd.</div>
              <div>282 Y Block, Phase 3, DHA, Lahore, Pakistan</div>
            </div>
            <div style="text-align:center;">
              <div style="border-bottom:1px solid #999; width:160px; margin-bottom:4px; font-family:var(--font-serif); font-style:italic; font-size:14px; color:var(--color-gold-dark);">Authorized Signature</div>
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#888;">Certified Master Craftsman</div>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('inv-close-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    const pdfBtn = document.getElementById('inv-download-pdf-btn');
    pdfBtn?.addEventListener('click', async () => {
      const element = document.getElementById('printable-invoice-content');
      if (!element) {
        showToast('Invoice content is not ready yet.', 'error');
        return;
      }

      const label = pdfBtn.innerHTML;
      const restore = () => { pdfBtn.disabled = false; pdfBtn.innerHTML = label; };
      pdfBtn.disabled = true;
      pdfBtn.innerHTML = 'Preparing PDF…';

      const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onerror = () => reject(new Error('Failed to load ' + src));
        script.onload = () => resolve();
        document.body.appendChild(script);
      });

      /**
       * Local copy first. Relying on a CDN meant Brave Shields, an offline
       * machine or a filtered network silently killed the download.
       */
      const loadLibrary = async () => {
        if (window.html2pdf) return;
        try {
          await loadScript('scripts/vendor/html2pdf.bundle.min.js');
        } catch (e) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
        }
        if (!window.html2pdf) throw new Error('PDF library did not initialise.');
      };

      // A4 at 96dpi. The invoice is rendered off-screen at this fixed width so
      // the PDF is identical on a phone and a desktop — capturing the live
      // element would bake the narrow mobile layout into the file.
      const PAGE_W = 794;
      let stage = null;

      try {
        await loadLibrary();

        const clone = element.cloneNode(true);
        clone.style.width = PAGE_W + 'px';
        clone.style.maxWidth = 'none';
        clone.style.margin = '0';

        stage = document.createElement('div');
        stage.className = 'pdf-export';
        stage.setAttribute('aria-hidden', 'true');
        /**
         * Absolute, not fixed.
         *
         * html2canvas locates an element by adding the page's scroll offset to
         * its viewport rectangle. A fixed element's rectangle does not move
         * when the page scrolls, so that sum overshoots by exactly the scroll
         * distance and the capture window lands past the end of the document —
         * scroll down, then export, and the page came out blank. An absolutely
         * positioned stage sits at a real document coordinate, so the sum is
         * right however far down the reader has scrolled.
         */
        stage.style.cssText =
          `position:absolute;left:-10000px;top:0;width:${PAGE_W}px;background:#ffffff;z-index:-1;`;
        stage.appendChild(clone);
        document.body.appendChild(stage);

        const worker = window.html2pdf().set({
          margin: [0.35, 0.3, 0.35, 0.3],
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            /**
             * width, and nothing else about geometry.
             *
             * windowWidth: 794 used to be set here so the clone's media queries
             * would resolve at page width. It also tells html2canvas the window
             * is 794px while the page is really laid out at, say, 1366 — and
             * the element is then positioned against a window that does not
             * exist. Once the viewport was wider than a page the capture landed
             * elsewhere and the invoice came out as a sliver of its own middle.
             * A phone never showed it, being narrower than 794 to begin with.
             * The .pdf-export rules in the stylesheet pin the export layout, so
             * the media queries do not need forcing.
             */
            width: PAGE_W,
            // The stage sits at document y=0, so tell html2canvas to measure
            // from an unscrolled page. Without this, exporting after scrolling
            // down aimed the capture below the stage and produced a blank page.
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait', compress: true },
          pagebreak: { mode: ['css', 'legacy'] }
        }).from(clone);

        // Produce a blob and download it explicitly. .save() can hand the file
        // to an in-browser viewer; an anchor with `download` does not.
        const blob = await worker.outputPdf('blob');
        const filename = `Lavion-Invoice-${order.id}.pdf`;

        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, filename);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();

          // Tearing the anchor down synchronously aborts the transfer — the
          // browser reports downloadWillBegin and then cancels at 0 bytes.
          // Keep both the node and the object URL alive until it has started.
          setTimeout(() => a.remove(), 4000);
          setTimeout(() => URL.revokeObjectURL(url), 120000);
        }

        showToast('Invoice downloaded.', 'success');
      } catch (err) {
        console.error('Invoice PDF failed:', err);
        showToast('Could not build the PDF. Opening print instead — choose "Save as PDF".', 'error');
        window.print();
      } finally {
        if (stage && stage.parentNode) stage.parentNode.removeChild(stage);
        restore();
      }
    });
  };

  /**
   * Build the drawer and its trigger wherever a page lacks them.
   *
   * Only four pages carried the markup. rings and its siblings rendered a
   * hamburger with no drawer behind it — a button that visibly did nothing —
   * and collections had neither, so below 900px, where the top bar is
   * hidden, those pages had no navigation and no route to signing in at all.
   * Rendering it here means every page gets the same menu, the same way the
   * bottom dock is already handled.
   */
  const MENU_LINKS = [
    ['high-jewellery', '✦ High Jewellery'],
    ['collections', '❖ Full Jewellery Catalog'],
    ['customized-jewellery', '◇ Bespoke Jewellery Studio'],
    ['gems', '✦ Precious Gems Showcase'],
    ['diamonds', '❖ Certified Diamonds'],
    ['asian-jewellery', '👑 Asian Heritage Jewellery'],
    ['western-jewellery', '◇ Western Haute Jewellery'],
    ['rings', '✦ Rings Collection'],
    ['necklaces', '❖ Fine Necklaces'],
    ['earrings', '◇ Luxury Earrings'],
    ['bracelets', '✦ Handcrafted Bracelets']
  ];

  function ensureMobileMenu() {
    // A trigger with nothing behind it is worse than no trigger.
    let hamburger = document.getElementById('nav-hamburger');
    if (!hamburger) {
      // track-order was built with a different header, so accept either.
      const navInner = document.querySelector('.nav-inner, .primary-container');
      if (navInner) {
        hamburger = document.createElement('button');
        hamburger.className = 'nav-hamburger';
        hamburger.id = 'nav-hamburger';
        hamburger.setAttribute('aria-label', 'Open menu');
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        navInner.insertBefore(hamburger, navInner.firstChild);
      }
    }

    const existing = document.getElementById('mobile-menu');
    if (existing) {
      // Pages that ship their own drawer predate the account entries, so top
      // them up rather than leaving those pages without a way to sign in.
      const links = existing.querySelector('.mobile-menu-links') || existing;
      if (!links.querySelector('.account-link')) {
        links.insertAdjacentHTML('beforeend',
          '<a href="#" class="account-link" style="color:var(--color-gold-light); font-weight:700;">✦ Sign In / My Account</a>');
      }
      if (!links.querySelector('.account-open')) {
        links.insertAdjacentHTML('beforeend',
          '<a href="#" class="account-open" style="color:var(--color-gold-light); font-weight:700;">✦ Create an Account</a>');
      }
      // The utility bar carrying Track Order is hidden below 1024px, so on a
      // phone the drawer is the only place the option can live. Hand-written
      // drawers were missing it, which left the cart — where someone lands
      // straight after ordering — with no way to reach tracking at all.
      if (!links.querySelector('a[href*="track-order"]')) {
        links.insertAdjacentHTML('beforeend',
          '<a href="track-order" class="open-order-tracker">📦 Track My Order</a>');
      }
      return;
    }

    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.id = 'mobile-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Mobile navigation');
    menu.innerHTML = `
      <div class="mobile-menu-header">
        <span style="font-family:var(--font-serif);font-size:18px;letter-spacing:3px;text-transform:uppercase;">Lavion <span style="color:var(--color-gold-dark)">Gems</span> &amp; Jewellers</span>
        <button class="mobile-menu-close" id="mobile-menu-close" aria-label="Close menu">&times;</button>
      </div>
      <nav class="mobile-menu-links">
        ${MENU_LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
        <div style="border-top:1px solid rgba(200,169,110,0.3); margin:10px 0; padding-top:10px;"></div>
        <a href="#" class="account-link" style="color:var(--color-gold-light); font-weight:700;">✦ Sign In / My Account</a>
        <a href="#" class="account-open" style="color:var(--color-gold-light); font-weight:700;">✦ Create an Account</a>
        <a href="track-order" class="open-order-tracker">📦 Track My Order</a>
      </nav>
    `;
    document.body.appendChild(menu);
  }

  /* ---- Mobile Menu Drawer Handler ---- */
  function initMobileMenu() {
    ensureMobileMenu();

    const hamburgerBtn = document.getElementById('nav-hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuClose = document.getElementById('mobile-menu-close');

    if (!hamburgerBtn || !mobileMenu) return;

    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    const closeMenu = () => {
      mobileMenu.classList.remove('active');
      document.body.style.overflow = '';
    };

    mobileMenuClose?.addEventListener('click', closeMenu);

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (e) => {
      if (mobileMenu.classList.contains('active') && !mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        closeMenu();
      }
    });
  }

  /* ---- Auto-Inject Native Mobile App Dock ---- */
  window.renderMobileAppDock = function () {
    let dock = document.querySelector('.mobile-app-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.className = 'mobile-app-dock';
      document.body.appendChild(dock);
    }

    const currentPath = window.location.pathname.toLowerCase();
    const isHome = currentPath.endsWith('/') || currentPath.endsWith('/') || currentPath === '';
    const isCatalog = currentPath.includes('collections');
    const isBespoke = currentPath.includes('customized-jewellery');
    const isWishlist = currentPath.includes('wishlist');
    const isCart = currentPath.includes('cart');

    const cartCount = window.getCart ? window.getCart().reduce((sum, item) => sum + item.qty, 0) : 0;
    const wishlistCount = window.getWishlist ? window.getWishlist().length : 0;

    dock.innerHTML = `
      <a href="/" class="mobile-dock-item ${isHome ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </span>
        <span>Home</span>
      </a>
      <a href="collections" class="mobile-dock-item ${isCatalog ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
        </span>
        <span>Catalog</span>
      </a>
      <a href="customized-jewellery" class="mobile-dock-item ${isBespoke ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
        </span>
        <span>Bespoke</span>
      </a>
      <a href="wishlist" class="mobile-dock-item ${isWishlist ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
        </span>
        <span>Wishlist</span>
        ${wishlistCount > 0 ? `<span class="mobile-dock-badge">${wishlistCount}</span>` : ''}
      </a>
      <a href="cart" class="mobile-dock-item ${isCart ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
        </span>
        <span>Bag</span>
        ${cartCount > 0 ? `<span class="mobile-dock-badge">${cartCount}</span>` : ''}
      </a>
      <a href="#" class="mobile-dock-item account-open" aria-label="Sign in or view your account">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
        </span>
        <span>${window.Auth && window.Auth.user ? 'Account' : 'Sign In'}</span>
      </a>
    `;
  };

  // Initial cart & wishlist badge update on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.updateCartBadge();
    window.updateWishlistBadge();
    initLiveSearch();
    initOrderTracker();
    window.renderGoldRateBar();
    window.fetchDiamondGuide();
    window.loadCategories();
    renderProductPage();
    renderCollectionPage();
    initAdminGoldRateControls();
    initCustomerAuthControls();
    initMobileMenu();
    window.renderMobileAppDock();
  });
  window.updateCartBadge();
  window.updateWishlistBadge();
  initLiveSearch();
  initOrderTracker();
  window.renderGoldRateBar();
  window.fetchDiamondGuide();
  window.loadCategories();
  renderProductPage();
  renderCollectionPage();
  initAdminGoldRateControls();
  initCustomerAuthControls();
  initMobileMenu();
  window.renderMobileAppDock();
})();

// ===================== PRODUCT DEEP-LINK HANDLER =====================
// Reads ?product=ID from the URL and auto-opens the Quick View modal
// Example: rings?product=2 will open the Quick View for product ID 2
(function handleProductDeepLink() {
  function tryOpen() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    if (!productId) return;
    if (typeof window.openQuickView === 'function') {
      window.openQuickView(productId);
    } else {
      // wait for main.js to fully init
      setTimeout(() => {
        if (typeof window.openQuickView === 'function') window.openQuickView(productId);
      }, 800);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryOpen, 400));
  } else {
    setTimeout(tryOpen, 400);
  }
})();

// ===================== FLOATING WHATSAPP BUTTON =====================
(function injectWhatsAppButton() {
  const wa = document.createElement('a');
  wa.id = 'whatsapp-float-btn';
  function buildWhatsAppHref(number, text) {
    const encoded = encodeURIComponent(text || '');
    return `https://wa.me/${number}?text=${encoded}`;
  }

  wa.href = buildWhatsAppHref('923241769500', "Hello Lavion Gems & Jewellers, I'd like to enquire about your jewellery collection.");
  wa.target = '_blank';
  wa.rel = 'noopener noreferrer';
  wa.title = 'Chat with us on WhatsApp';
  wa.setAttribute('aria-label', 'Chat with us on WhatsApp');
  wa.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:28px;height:28px;">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
    <span id="wa-label">Chat with us</span>
  `;

  const style = document.createElement('style');
  style.textContent = `
    /* Onyx capsule with a gold hairline, so the floating action belongs to the
       same system as the nav and footer instead of shouting in brand green.
       The WhatsApp glyph keeps its own colour — that is the recognisable part. */
    #whatsapp-float-btn {
      position: fixed;
      bottom: 88px;
      right: 24px;
      /* Clears the mobile dock (999) but sits under every overlay (1100+).
         At 9999 it floated on top of open cart and admin modals. */
      z-index: 1050;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 22px 12px 16px;
      background: linear-gradient(140deg, #16130f 0%, #0b0a09 100%);
      color: #efdcb2;
      text-decoration: none;
      border: 1px solid rgba(201, 169, 97, 0.42);
      border-radius: 999px;
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(249,239,214,0.10);
      isolation: isolate;
      overflow: hidden;
      transition:
        transform .45s cubic-bezier(.22,1,.36,1),
        box-shadow .45s cubic-bezier(.22,1,.36,1),
        border-color .45s cubic-bezier(.22,1,.36,1),
        color .45s cubic-bezier(.22,1,.36,1);
      animation: waRise .7s cubic-bezier(.22,1,.36,1) both;
    }

    /* Gold foil wash that fades in under the label on hover */
    #whatsapp-float-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -2;
      background: linear-gradient(135deg,#b08d4a 0%,#dcc188 30%,#f9efd6 50%,#dcc188 70%,#b08d4a 100%);
      opacity: 0;
      transition: opacity .45s cubic-bezier(.22,1,.36,1);
    }

    /* Specular sweep, matching the site's buttons and product cards */
    #whatsapp-float-btn::after {
      content: '';
      position: absolute;
      top: 0;
      left: -140%;
      width: 55%;
      height: 100%;
      z-index: -1;
      background: linear-gradient(100deg, transparent, rgba(255,252,240,.55), transparent);
      transition: left .85s cubic-bezier(.22,1,.36,1);
    }

    #whatsapp-float-btn:hover,
    #whatsapp-float-btn:focus-visible {
      color: #14110c;
      border-color: transparent;
      transform: translateY(-3px);
      box-shadow: 0 16px 44px rgba(201,169,97,.42);
      animation: none;
    }
    #whatsapp-float-btn:hover::before,
    #whatsapp-float-btn:focus-visible::before { opacity: 1; }
    #whatsapp-float-btn:hover::after,
    #whatsapp-float-btn:focus-visible::after { left: 170%; }
    #whatsapp-float-btn:active { transform: translateY(-1px) scale(.985); }

    #whatsapp-float-btn svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: #25D366;
      filter: drop-shadow(0 0 6px rgba(37,211,102,.45));
      transition: color .45s cubic-bezier(.22,1,.36,1), transform .45s cubic-bezier(.22,1,.36,1);
    }
    /* On the gold wash, green would vibrate — go ink instead */
    #whatsapp-float-btn:hover svg {
      color: #14110c;
      filter: none;
      transform: rotate(-8deg) scale(1.08);
    }

    #wa-label { white-space: nowrap; position: relative; }

    /* Slow gold breath at rest, so it reads as attentive rather than urgent */
    #whatsapp-float-btn { animation: waRise .7s cubic-bezier(.22,1,.36,1) both, waBreathe 4.5s ease-in-out 1s infinite; }

    @keyframes waRise {
      from { opacity: 0; transform: translateY(18px) scale(.94); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes waBreathe {
      0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,.5), 0 0 0 0 rgba(201,169,97,.30), inset 0 1px 0 rgba(249,239,214,.10); }
      50%      { box-shadow: 0 12px 36px rgba(0,0,0,.55), 0 0 0 10px rgba(201,169,97,0), inset 0 1px 0 rgba(249,239,214,.10); }
    }

    /* Collapse to a disc wherever the bottom dock exists (768px), not just on
       the narrowest phones — the labelled pill crowded the dock and the gold
       rate bar, and a fixed 52px keeps the back-to-top stacking predictable. */
    @media (max-width: 768px) {
      #whatsapp-float-btn {
        padding: 0;
        width: 52px;
        height: 52px;
        justify-content: center;
        border-radius: 50%;
        bottom: 78px;
        right: 16px;
      }
      #wa-label { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      #whatsapp-float-btn { animation: none; }
      #whatsapp-float-btn::after { display: none; }
    }
  `;

  document.head.appendChild(style);

  // Rewrite any existing wa.me links on the page to prefer the WhatsApp app on mobile
  try {
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
      try {
        const href = a.getAttribute('href');
        const m = href.match(/wa.me\/(\d+)(?:\?text=(.*))?/);
        if (!m) return;
        const num = m[1];
        const text = m[2] ? decodeURIComponent(m[2]) : '';
        a.setAttribute('href', buildWhatsAppHref(num, text));
      } catch (e) { /* ignore per-link errors */ }
    });
  } catch (e) { /* ignore */ }

  document.body.appendChild(wa);
})();









// ===================== NEWSLETTER POPUP =====================
/**
 * The newsletter offer, as a dialog.
 *
 * Self-contained in the same way the WhatsApp button above is: it injects its
 * own markup and its own styles, so it reaches every page from this one file
 * and no page template has to be touched.
 *
 * The rule about *when* to ask matters more than the form itself. A popup that
 * reappears on every page load is worse than no popup — it trains people to
 * close it unread. But the two answers are not the same kind of answer, so
 * they are not kept in the same place: "not now" goes to sessionStorage and
 * lasts until the tab closes, so a visitor who comes back another day is asked
 * again; "yes" goes to localStorage and lasts for good, because someone who
 * has joined the list must never be asked to join it again.
 *
 * It is a real dialog rather than a floating div: Escape closes it, focus moves
 * into it and returns to where it was, Tab cannot wander onto the page behind,
 * and the page behind cannot scroll while it is open.
 */
(function newsletterPopup() {
  /** Permanent, and only ever holds the fact of a subscription. */
  var SUBSCRIBED_KEY = 'lavion.newsletter';
  /** This visit only. Cleared by the browser when the tab closes. */
  var DISMISSED_KEY = 'lavion.newsletter.dismissed';
  /**
   * Long enough for the hero to have painted, so the offer lands over a page
   * rather than over a blank screen — and short enough to reach the many
   * visitors who are gone within a few seconds.
   */
  var DELAY_MS = 3000;

  /**
   * Pages where interrupting is the wrong thing to do. Someone in the bag is
   * partway through buying, someone on the tracking page is worried about an
   * order that has not arrived, and someone resetting a password is locked out.
   * None of them wants a mailing-list form across the middle of it. The admin
   * panel is on this list because it is staff, not a customer.
   */
  var NEVER_ON = [
    'cart', 'track-order', 'reset-password', 'verify-email', 'admin', 'admin-panel'
  ];

  /**
   * Storage can throw outright — Safari private browsing, a browser set to
   * block site data, an embedded webview. Every access is guarded, and a
   * failure means the visitor is treated as one who has not been asked rather
   * than taking the page down around it.
   */
  function hasSubscribed() {
    try {
      var raw = localStorage.getItem(SUBSCRIBED_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      return !!(parsed && parsed.state === 'subscribed');
    } catch (e) { /* unreadable — treat as never asked */ }
    return false;
  }

  function dismissedThisSession() {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch (e) { return false; }
  }

  function markSubscribed() {
    try {
      localStorage.setItem(SUBSCRIBED_KEY,
        JSON.stringify({ state: 'subscribed', at: Date.now() }));
    } catch (e) { /* if we cannot remember it, we simply ask again next time */ }
  }

  function markDismissed() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch (e) { /* same — a browser that will not store it gets asked again */ }
  }

  function mayAsk() {
    return !hasSubscribed() && !dismissedThisSession();
  }

  function offLimits() {
    var path = String(location.pathname || '').toLowerCase().replace(/\/+$/, '');
    var page = (path.split('/').pop() || '').replace(/\.html$/, '');
    return NEVER_ON.indexOf(page) !== -1;
  }

  if (offLimits() || !mayAsk()) return;

  /* ---- styles ---- */
  var style = document.createElement('style');
  style.textContent = `
    #lv-news-pop {
      position: fixed;
      inset: 0;
      z-index: 9998;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 16px;
      background: rgba(11, 10, 9, 0.72);
      -webkit-backdrop-filter: blur(2px);
      backdrop-filter: blur(2px);
    }
    @media (min-width: 640px) {
      #lv-news-pop { align-items: center; }
    }

    #lv-news-card {
      position: relative;
      width: 100%;
      max-width: 430px;
      padding: 38px 34px 30px;
      background: var(--color-onyx-soft, #141210);
      border: 1px solid rgba(201, 169, 97, 0.4);
      box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55);
      color: var(--color-bg, #fbf8f3);
      outline: none;
      animation: lvNewsIn 0.35s ease-out;
    }
    @keyframes lvNewsIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: none; }
    }
    /* A dialog that slides in is a nice touch. A dialog that slides in for
       someone who has asked the system to stop animating things is not. */
    @media (prefers-reduced-motion: reduce) {
      #lv-news-card { animation: none; }
    }

    #lv-news-close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 0;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      color: rgba(251, 248, 243, 0.45);
      transition: color 0.2s;
    }
    #lv-news-close:hover { color: var(--gold-300, #dcc188); }

    #lv-news-card .lv-news-eyebrow {
      margin: 0;
      font-family: var(--font-sans);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--gold-400, #c9a961);
    }
    #lv-news-card h2 {
      margin: 12px 0 0;
      font-family: var(--font-serif);
      font-size: 30px;
      font-weight: 400;
      line-height: 1.2;
      color: var(--color-bg, #fbf8f3);
    }
    #lv-news-card .lv-news-body {
      margin: 12px 0 0;
      font-family: var(--font-sans);
      font-size: 13.5px;
      line-height: 1.75;
      color: rgba(251, 248, 243, 0.6);
    }

    #lv-news-form { margin-top: 22px; }
    #lv-news-email {
      width: 100%;
      box-sizing: border-box;
      padding: 13px 12px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--color-bg, #fbf8f3);
      font-family: var(--font-sans);
      font-size: 13.5px;
    }
    #lv-news-email::placeholder { color: var(--color-text-light, #9c9285); }
    #lv-news-email:focus { outline: none; border-color: var(--gold-400, #c9a961); }

    #lv-news-submit {
      width: 100%;
      margin-top: 12px;
      padding: 13px 16px;
      cursor: pointer;
      background: var(--gold-400, #c9a961);
      border: 1px solid var(--gold-400, #c9a961);
      color: var(--color-dark, #0b0a09);
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      transition: all 0.2s;
    }
    #lv-news-submit:hover { background: transparent; color: var(--gold-300, #dcc188); }
    #lv-news-submit:disabled { opacity: 0.6; cursor: default; }

    #lv-news-decline {
      display: block;
      width: 100%;
      margin-top: 16px;
      padding: 4px;
      cursor: pointer;
      background: none;
      border: 0;
      font-family: var(--font-sans);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(251, 248, 243, 0.35);
      transition: color 0.2s;
    }
    #lv-news-decline:hover { color: rgba(251, 248, 243, 0.6); }

    #lv-news-answer {
      margin: 14px 0 0;
      font-family: var(--font-sans);
      font-size: 13.5px;
      line-height: 1.6;
    }
    #lv-news-answer.ok  { color: var(--gold-300, #dcc188); }
    #lv-news-answer.bad { color: #fca5a5; }

    .lv-news-sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `;

  /* ---- markup ---- */
  var overlay = document.createElement('div');
  overlay.id = 'lv-news-pop';
  overlay.innerHTML = `
    <div id="lv-news-card" role="dialog" aria-modal="true"
         aria-labelledby="lv-news-title" aria-describedby="lv-news-desc" tabindex="-1">
      <button type="button" id="lv-news-close" aria-label="Close">&times;</button>
      <p class="lv-news-eyebrow">Lavion</p>
      <h2 id="lv-news-title">New pieces, and the day&rsquo;s gold rate</h2>
      <p class="lv-news-body" id="lv-news-desc">
        Join our list for new arrivals, bridal collections and bespoke commissions.
        One email at a time, and you can leave whenever you like.
      </p>
      <form id="lv-news-form" novalidate>
        <label class="lv-news-sr" for="lv-news-email">Email address</label>
        <input id="lv-news-email" name="email" type="email" required autocomplete="email"
               placeholder="Your email address" />
        <button type="submit" id="lv-news-submit">Subscribe</button>
        <button type="button" id="lv-news-decline">No thank you</button>
      </form>
      <p id="lv-news-answer" role="status"></p>
    </div>
  `;

  var timer = null;
  var returnFocusTo = null;
  var scrollLock = '';
  var subscribed = false;

  function focusable() {
    return overlay.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;

    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open() {
    returnFocusTo = document.activeElement;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    scrollLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    document.getElementById('lv-news-card').focus();
  }

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    document.body.style.overflow = scrollLock;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (style.parentNode) style.parentNode.removeChild(style);
    // A signup has already been recorded as a subscription, which suppresses
    // the offer for good. Only an actual dismissal is recorded here.
    if (!subscribed) markDismissed();
    if (returnFocusTo && returnFocusTo.focus) returnFocusTo.focus();
  }

  // A click on the backdrop is a dismissal, the same as the close button.
  // Comparing target to currentTarget keeps a drag that began inside the card
  // and ended outside it from counting as one.
  overlay.addEventListener('mousedown', function (e) {
    if (e.target === e.currentTarget) close();
  });

  overlay.addEventListener('click', function (e) {
    if (e.target.id === 'lv-news-close' || e.target.id === 'lv-news-decline') close();
  });

  overlay.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('lv-news-email');
    var btn = document.getElementById('lv-news-submit');
    var answer = document.getElementById('lv-news-answer');
    var email = (input.value || '').trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Signing you up…';
    answer.className = '';
    answer.textContent = '';

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        // The server distinguishes "already on our list" from "thank you for
        // subscribing", and both are successes — its wording is used as given.
        answer.textContent = data.message || (data.success
          ? 'Thank you for subscribing.'
          : 'That address was not accepted.');

        if (data.success) {
          subscribed = true;
          markSubscribed();
          answer.className = 'ok';
          document.getElementById('lv-news-form').style.display = 'none';
          // Left on screen for a moment so the confirmation is actually read,
          // rather than the dialog vanishing the instant the request returns.
          setTimeout(close, 2600);
        } else {
          answer.className = 'bad';
          btn.disabled = false;
          btn.textContent = 'Subscribe';
        }
      })
      .catch(function () {
        answer.className = 'bad';
        answer.textContent = 'We could not reach the server. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Subscribe';
      });
  });

  // The timer does not start until the tab is actually being looked at, or a
  // popup opened in a background tab would spend its whole life unseen and
  // still count as having been shown.
  /**
   * Not over the admin panel.
   *
   * The path check above catches /admin, but the panel is also opened from the
   * home page — where the path is "/" — and locally /admin redirects there
   * rather than rewriting, so the path alone is not enough. Whoever is editing
   * the catalogue is not a customer to be signed up to the newsletter.
   */
  function adminIsOpen() {
    return !!document.querySelector(
      '#admin-overlay.active, #admin-login-modal.active, #admin-product-modal.active'
    );
  }

  function arm() {
    if (timer || document.visibilityState !== 'visible') return;
    timer = setTimeout(() => {
      // Checked again here rather than only when the timer was set: the panel
      // is usually opened during those three seconds, not before them.
      if (adminIsOpen()) return;
      open();
    }, DELAY_MS);
  }

  arm();
  document.addEventListener('visibilitychange', arm);
})();
