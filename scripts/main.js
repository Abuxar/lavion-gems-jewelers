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

      const orderRes = await fetch(`${API_URL}/orders`);
      if (orderRes.ok) {
        const data = await orderRes.json();
        if (data.orders) {
          localStorage.setItem('lavion_orders_v1', JSON.stringify(data.orders));
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
      // Only index.html carries the admin markup; send other pages there.
      window.location.href = 'index.html?admin=true';
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
    });
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

  function showCustomConfirm(title, message, onConfirm) {
    if (confirmTitle) confirmTitle.textContent = title || 'Confirm Action';
    if (confirmMsg) confirmMsg.textContent = message || 'Are you sure you want to proceed?';
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

    const imageVal = product ? product.img : 'images/gems.png';
    activeUploadedImageBase64 = imageVal;
    const preview = document.getElementById('form-product-img-preview');
    if (preview) preview.src = imageVal;

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

  let activeUploadedImageBase64 = null;

  document.getElementById('form-product-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        activeUploadedImageBase64 = event.target.result;
        const preview = document.getElementById('form-product-img-preview');
        if (preview) preview.src = activeUploadedImageBase64;
      };
      reader.readAsDataURL(file);
    }
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
      const finalImg = activeUploadedImageBase64 || 'images/hero_campaign.png';

      let products = getProducts();
      let record;
      let synced;

      if (id) {
        record = { id: String(id), name, category, price, stock, badge, img: finalImg, desc };
        products = products.map(p => String(p.id) === String(id) ? record : p);
        saveProducts(products);
        synced = await persistProduct('PUT', record);
        showToast(
          synced.ok ? `Product "${name}" updated.` : `"${name}" not saved: ${synced.reason}`,
          synced.ok ? 'success' : 'error'
        );
      } else {
        record = { id: String(Date.now()), name, category, price, stock, badge, img: finalImg, desc };
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
          <a href="cart.html" class="cart-prompt-btn primary" id="cart-prompt-open-btn">
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
    if (window.location.pathname.includes('cart.html') || window.location.pathname.includes('/cart')) {
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

  // Quick View Modal
  window.openQuickView = function (productId) {
    const products = window.getProducts();
    const product = products.find(p => p.id === String(productId));
    if (!product) return;

    let modal = document.getElementById('quickview-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'quickview-modal';
      modal.className = 'admin-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="admin-modal-dialog quickview-dialog">
        <div style="border-radius: 6px; overflow: hidden; border: 1px solid rgba(200,169,110,0.3);">
          <img src="${product.img}" alt="${product.name}" style="width: 100%; height: 320px; object-fit: cover;" />
        </div>
        <div>
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--color-gold); display: block; margin-bottom: 6px;">${product.category}</span>
          <h3 style="font-family: var(--font-serif); font-size: 28px; color: #fff; margin-bottom: 8px;">${product.name}</h3>
          <p style="font-family: var(--font-serif); font-size: 15px; font-style: italic; color: rgba(255,255,255,0.7); margin-bottom: 16px;">${product.desc || ''}</p>
          <div style="margin-bottom: 16px;">
            <div style="font-size: 18px; font-weight: 700; color: var(--color-gold-light); text-transform: uppercase; letter-spacing: 0.5px;">Daily Rate Inquire</div>
            <div style="font-size: 12px; font-style: italic; color: rgba(255,255,255,0.65); font-family: var(--font-serif);">✦ Price calculated on day of confirmation based on live gold market rates.</div>
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 16px;">Stock: <strong>${product.stock > 0 ? product.stock + ' units available' : 'Out of Stock'}</strong></div>
          <button type="button" class="admin-action-btn edit" id="qv-size-guide-btn" style="margin-bottom: 20px; width: 100%; justify-content: center; font-weight: 600;">
            📏 View Jewellery & Ring Size Guide
          </button>
          <div style="display: flex; gap: 12px;">
            <button class="admin-primary-btn" id="qv-add-btn" ${product.stock <= 0 ? 'disabled' : ''} style="flex: 1; justify-content: center;">
              Add to Shopping Bag
            </button>
            <button class="btn-wishlist-toggle ${window.isInWishlist(product.id) ? 'in-wishlist' : ''}" id="qv-wish-btn" style="padding: 10px 14px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
            <button class="admin-action-btn" id="qv-close-btn" style="padding: 10px 18px;">Close</button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('qv-close-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    document.getElementById('qv-add-btn')?.addEventListener('click', () => {
      window.addToCart(product.id, 1);
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    document.getElementById('qv-wish-btn')?.addEventListener('click', () => {
      window.toggleWishlist(product.id);
      const btn = document.getElementById('qv-wish-btn');
      if (btn) {
        if (window.isInWishlist(product.id)) btn.classList.add('in-wishlist');
        else btn.classList.remove('in-wishlist');
      }
    });

    document.getElementById('qv-size-guide-btn')?.addEventListener('click', () => {
      window.openSizeGuide();
    });
  };

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
          <div class="product-card-img" onclick="window.openQuickView('${p.id}')">
            <img src="${p.img}" alt="${p.name}" loading="lazy" />
            ${p.badge ? `<span class="product-card-badge">${p.badge}</span>` : ''}
          </div>
          <div class="product-card-body">
            <div class="product-card-name" style="color:#fff;">${p.name}</div>
            <div class="product-card-desc" style="color:rgba(255,255,255,0.6);">${p.desc || ''}</div>
            <div class="product-card-price" style="color:var(--color-gold-light); font-size:12px; letter-spacing:0.5px;">📞 Price on Request</div>
            <div class="product-card-actions">
              <button class="btn-add-cart" onclick="window.addToCart('${p.id}', 1)">+ Add to Bag</button>
              <button class="btn-quick-view" onclick="window.openQuickView('${p.id}')" title="Quick View">👁</button>
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

      document.getElementById('tracker-lookup-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('tracker-query').value.trim().toLowerCase();
        const orders = window.getOrders();
        const found = orders.find(o => o.id.toLowerCase() === query || o.phone.includes(query));
        renderOrderProgress(found, query);
      });
    }

    function renderOrderProgress(order, query) {
      const area = document.getElementById('tracker-results-area');
      if (!area) return;

      if (!order) {
        area.innerHTML = `
          <div style="background:rgba(231,76,60,0.15); border:1px solid #e74c3c; padding:16px; border-radius:6px; color:#e74c3c; font-size:13px; text-align:center; margin-top:16px;">
            ⚠️ No order record found for "<strong>${query}</strong>". Please verify your Order Reference ID or contact customer support on WhatsApp +92 324 1769500.
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
            <span>Customer: <strong>${order.customer}</strong></span>
            <span style="color:var(--color-gold-light);">Ref: <strong>${order.id}</strong></span>
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
            • <strong>Ordered Items:</strong> ${order.items}<br>
            • <strong>Destination:</strong> ${order.city}<br>
            • <strong>Order Total:</strong> PKR ${order.total.toLocaleString()}<br>
            • <strong>Current Status:</strong> <span style="color:var(--color-gold-light); font-weight:700;">${order.status}</span>
          </div>
        </div>
      `;
    }

    document.querySelectorAll('.open-order-tracker, #open-order-tracker').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.getElementById('mobile-menu')?.classList.remove('active');
        openTracker(e);
      });
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

  // Kept for callers such as cart.html that expect a synchronous read.
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
    if (!Auth.apiReachable) {
      return `<p class="auth-notice">
        Social sign-in is unavailable because the account API is not responding.
        Open the site through the Node server (<code>npm start</code>), not a static file server.
      </p>`;
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
      if (data.code === 'EMAIL_UNVERIFIED') return renderVerifyNoticeView(email);
      if (data.code === 'PROVIDER_ONLY') {
        return showFormError(form, data.message || 'Use your connected provider to sign in.');
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

      if (ok) return renderVerifyNoticeView(payload.email);
      showFormError(form, data.message || 'Could not create the account.');
    });
  }

  function renderVerifyNoticeView(email) {
    openModalShell(`
      ${authHeaderHtml('Check your inbox', `We sent a confirmation link to ${email}.`)}
      <p class="auth-body-text">
        Open the link to activate your account. It expires in 24 hours.
        Remember to check your spam folder.
      </p>
      <button type="button" class="btn-outline auth-submit" id="auth-resend">Resend the link</button>
      <p class="auth-foot">
        <button type="button" class="auth-link-btn" id="auth-back-signin">Back to sign in</button>
      </p>
    `);

    document.getElementById('auth-back-signin').addEventListener('click', renderSignInView);
    document.getElementById('auth-resend').addEventListener('click', async (e) => {
      e.target.disabled = true;
      e.target.textContent = 'Sending…';
      const { data } = await api('/api/auth/resend-verification', { method: 'POST', body: { email } });
      showToast(data.message || 'If that address needs confirming, a link is on its way.', 'info');
      e.target.textContent = 'Link sent';
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
    const providerTags = (u.providers || []).map(p =>
      `<span class="auth-tag">${escapeHtml(p)}</span>`).join('');

    openModalShell(`
      ${authHeaderHtml(u.name, u.email)}
      <div class="auth-profile-meta">
        ${u.emailVerified
          ? '<span class="auth-tag verified">Email verified</span>'
          : '<span class="auth-tag warn">Email not verified</span>'}
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
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          const remote = (data.orders || []).find(matches);
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
            🧾 Sales Invoice #${String(order.id).replace('ORD-', 'INV-')}
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
              <div style="font-size:14px; font-weight:700; color:#333;"># ${String(order.id).replace('ORD-', 'INV-')}</div>
              <div style="font-size:11px; color:#777;">Date: ${dateStr}</div>
            </div>
          </div>

          <!-- Customer & Order Meta Grid -->
          <div class="invoice-details-grid">
            <div>
              <strong style="color:var(--color-gold-dark); text-transform:uppercase; font-size:10px; letter-spacing:1px; display:block; margin-bottom:4px;">Billed To (Customer):</strong>
              <div style="font-weight:700; font-size:15px; color:#111;">${order.customer}</div>
              <div>Phone: <strong>${order.phone}</strong></div>
              <div>City: <strong>${order.city}</strong></div>
              <div>Address: ${order.address || 'Pakistan Delivery'}</div>
            </div>
            <div>
              <strong style="color:var(--color-gold-dark); text-transform:uppercase; font-size:10px; letter-spacing:1px; display:block; margin-bottom:4px;">Order Details & Gold Rate:</strong>
              <div>Order Reference: <strong>${order.id}</strong></div>
              <div>Payment Mode: <strong>${order.payment || 'Cash on Delivery'}</strong></div>
              <div>Delivery Status: <strong style="color:#27ae60;">${order.status}</strong></div>
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
                  <strong>${order.items}</strong><br>
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
        stage.style.cssText =
          `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;background:#ffffff;z-index:-1;`;
        stage.appendChild(clone);
        document.body.appendChild(stage);

        const worker = window.html2pdf().set({
          margin: [0.35, 0.3, 0.35, 0.3],
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            // Makes media queries inside the clone evaluate at page width
            // rather than the real (possibly 360px) viewport.
            windowWidth: PAGE_W,
            width: PAGE_W,
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

  /* ---- Mobile Menu Drawer Handler ---- */
  function initMobileMenu() {
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
    const isHome = currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath === '';
    const isCatalog = currentPath.includes('collections.html');
    const isBespoke = currentPath.includes('customized-jewellery.html');
    const isWishlist = currentPath.includes('wishlist.html');
    const isCart = currentPath.includes('cart.html');

    const cartCount = window.getCart ? window.getCart().reduce((sum, item) => sum + item.qty, 0) : 0;
    const wishlistCount = window.getWishlist ? window.getWishlist().length : 0;

    dock.innerHTML = `
      <a href="index.html" class="mobile-dock-item ${isHome ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </span>
        <span>Home</span>
      </a>
      <a href="collections.html" class="mobile-dock-item ${isCatalog ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
        </span>
        <span>Catalog</span>
      </a>
      <a href="customized-jewellery.html" class="mobile-dock-item ${isBespoke ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
        </span>
        <span>Bespoke</span>
      </a>
      <a href="wishlist.html" class="mobile-dock-item ${isWishlist ? 'active' : ''}">
        <span class="mobile-dock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
        </span>
        <span>Wishlist</span>
        ${wishlistCount > 0 ? `<span class="mobile-dock-badge">${wishlistCount}</span>` : ''}
      </a>
      <a href="cart.html" class="mobile-dock-item ${isCart ? 'active' : ''}">
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
  initAdminGoldRateControls();
  initCustomerAuthControls();
  initMobileMenu();
  window.renderMobileAppDock();
})();

// ===================== PRODUCT DEEP-LINK HANDLER =====================
// Reads ?product=ID from the URL and auto-opens the Quick View modal
// Example: rings.html?product=2 will open the Quick View for product ID 2
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








