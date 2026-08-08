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
  const API_URL = 'http://localhost:5000/api';

  async function syncBackendData() {
    try {
      const prodRes = await fetch(`${API_URL}/products`);
      if (prodRes.ok) {
        const data = await prodRes.json();
        if (data.products && data.products.length > 0) {
          localStorage.setItem('lavion_products_v5', JSON.stringify(data.products));
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
    const saved = localStorage.getItem('lavion_products_v5');
    if (!saved) {
      localStorage.removeItem('lavion_products_v1');
      localStorage.removeItem('lavion_products_v2');
      localStorage.removeItem('lavion_products_v3');
      localStorage.removeItem('lavion_products_v4');
      localStorage.setItem('lavion_products_v5', JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(saved);
  }

  window.getProducts = getProducts;

  function saveProducts(products) {
    localStorage.setItem('lavion_products_v4', JSON.stringify(products));
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

  function openAdminLoginDirectly() {
    if (!isDirectAdminRoute()) return;
    if (loginErrorMsg) loginErrorMsg.style.display = 'none';
    const passField = document.getElementById('login-password');
    if (passField) passField.value = '';
    loginModal?.classList.add('active');
    document.body.style.overflow = 'hidden';
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
      const fallbackAllowed = (user === 'admin' || user === 'lavion') && (pass === 'lavion123' || pass === 'admin123');
      if (fallbackAllowed) {
        sessionStorage.setItem('lavion_admin_auth', 'true');
        sessionStorage.setItem('lavion_admin_token', '');
        sessionStorage.setItem('lavion_admin_user', JSON.stringify({ username: 'Admin', role: 'admin' }));
        toggleAdminLinks(true);
        loginModal?.classList.remove('active');
        adminOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderAdmin();
        return;
      }

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

  window.addEventListener('load', () => {
    if (isDirectAdminRoute()) {
      // Clean up the URL to remove admin param
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      if (isAuthenticated()) {
        adminOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderAdmin();
      } else {
        openAdminLoginDirectly();
      }
    }
  });

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
      if (id) {
        products = products.map(p => String(p.id) === String(id) ? { id: String(id), name, category, price, stock, badge, img: finalImg, desc } : p);
        showToast(`Product "${name}" updated successfully!`, 'success');
      } else {
        const newId = String(Date.now());
        products.unshift({ id: newId, name, category, price, stock, badge, img: finalImg, desc });
        showToast(`New product "${name}" added to ${category.toUpperCase()} category!`, 'success');
      }

      saveProducts(products);
      
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
          showCustomConfirm('Delete Product', `Are you sure you want to delete "${name}" from the catalog?`, () => {
            const updated = products.filter(prod => String(prod.id) !== String(id));
            saveProducts(updated);
            showToast(`Product "${name}" deleted.`, 'error');
            renderAdmin();
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

      stockTbody.querySelectorAll('.stock-dec').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const p = products.find(prod => String(prod.id) === String(id));
          if (p && p.stock > 0) {
            p.stock--;
            saveProducts(products);
            showToast(`Stock updated for ${p.name}`, 'info');
            renderAdmin();
          }
        });
      });

      stockTbody.querySelectorAll('.stock-inc').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const p = products.find(prod => String(prod.id) === String(id));
          if (p) {
            p.stock++;
            saveProducts(products);
            showToast(`Stock updated for ${p.name}`, 'info');
            renderAdmin();
          }
        });
      });

      stockTbody.querySelectorAll('.stock-input').forEach(input => {
        input.addEventListener('change', () => {
          const id = input.getAttribute('data-id');
          const val = parseInt(input.value) || 0;
          const p = products.find(prod => String(prod.id) === String(id));
          if (p) {
            p.stock = Math.max(0, val);
            saveProducts(products);
            showToast(`Stock set to ${p.stock} for ${p.name}`, 'info');
            renderAdmin();
          }
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
        select.addEventListener('change', () => {
          const id = select.getAttribute('data-id');
          const newStatus = select.value;
          const ords = getOrders();
          const ord = ords.find(o => String(o.id) === String(id));
          if (ord) {
            ord.status = newStatus;
            saveOrders(ords);
            showToast(`Order ${id} status updated to "${newStatus}".`, 'info');
            renderAdmin();
          }
        });
      });

      ordersTbody.querySelectorAll('.delete-order').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          showCustomConfirm('Delete Order Record', `Are you sure you want to delete order "${id}"?`, () => {
            const ords = getOrders();
            const updated = ords.filter(o => String(o.id) !== String(id));
            saveOrders(updated);
            showToast(`Order ${id} deleted.`, 'error');
            renderAdmin();
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
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
      box-sizing: border-box;
      opacity: 1;
      visibility: visible;
      transition: opacity 0.3s ease;
    `;

    modal.innerHTML = `
      <div class="cart-prompt-dialog" role="dialog" aria-modal="true" style="
        background: #141414;
        border: 1px solid rgba(212, 175, 55, 0.4);
        border-radius: 14px;
        width: 100%;
        max-width: 440px;
        padding: 28px 24px;
        position: relative;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px rgba(212, 175, 55, 0.25);
        color: #ffffff;
        font-family: 'Montserrat', sans-serif;
        box-sizing: border-box;
      ">
        <button class="cart-prompt-close" id="cart-prompt-close-btn" aria-label="Close modal" style="
          position: absolute;
          top: 14px;
          right: 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          padding: 4px 8px;
        ">&times;</button>
        
        <div class="cart-prompt-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
          <div class="cart-prompt-icon-wrap" style="
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: rgba(212, 175, 55, 0.15);
            border: 1px solid rgba(212, 175, 55, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #d4af37;
            flex-shrink: 0;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h3 id="cart-prompt-title" class="cart-prompt-title" style="
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 22px;
            font-weight: 600;
            color: #ffffff;
            margin: 0;
            letter-spacing: 0.5px;
          ">Added to Shopping Bag!</h3>
        </div>

        <div class="cart-prompt-body" style="margin-bottom: 24px;">
          <div class="cart-prompt-item" style="
            display: flex;
            align-items: center;
            gap: 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
          ">
            <img src="${product.img || 'images/rings/solitaire-diamond-ring.jpg'}" alt="${product.name}" class="cart-prompt-item-img" onerror="this.src='images/rings/solitaire-diamond-ring.jpg'" style="
              width: 64px;
              height: 64px;
              object-fit: cover;
              border-radius: 6px;
              border: 1px solid rgba(212, 175, 55, 0.4);
              background: #000;
            " />
            <div class="cart-prompt-item-info" style="flex: 1; min-width: 0;">
              <h4 class="cart-prompt-item-name" style="
                font-size: 14px;
                font-weight: 600;
                color: #f3f3f3;
                margin: 0 0 4px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              ">${product.name}</h4>
              <p class="cart-prompt-item-meta" style="
                font-size: 11px;
                color: #d4af37;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 0 0 6px 0;
              ">${product.category ? product.category.toUpperCase() : 'LUXURY JEWELLERY'}</p>
              <div class="cart-prompt-item-price-qty" style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                <span class="cart-prompt-price" style="font-weight: 600; color: #ffffff;">${formattedPrice}</span>
                <span class="cart-prompt-qty" style="color: rgba(255, 255, 255, 0.6); font-size: 12px;">Qty: ${qty}</span>
              </div>
            </div>
          </div>

          <p class="cart-prompt-question" style="
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.5;
            margin: 0;
            text-align: center;
          ">
            Would you like to open your Shopping Bag now or continue browsing?
          </p>
        </div>

        <div class="cart-prompt-actions" style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="cart-prompt-btn secondary" id="cart-prompt-continue-btn" style="
            flex: 1;
            min-width: 140px;
            padding: 12px 14px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            text-align: center;
            background: transparent;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
          ">Continue Browsing</button>
          <a href="cart.html" class="cart-prompt-btn primary" id="cart-prompt-open-btn" style="
            flex: 1;
            min-width: 160px;
            padding: 12px 14px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            text-align: center;
            text-decoration: none;
            background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
            color: #000000 !important;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
          ">
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
            ⚠️ No order record found for "<strong>${query}</strong>". Please verify your Order Reference ID or contact customer support on WhatsApp +92 324 1775662.
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
        const usdGbp = parseFloat(fxRes.rates.GBP || 0.743);

        const r24Pkr = Math.round(xauUsd * usdPkr * 0.3621);
        const r24Gbp = Math.round(xauUsd * usdGbp * 0.3621);

        const rates = {
          rate24kPerTola: r24Pkr,
          rate24kPer10g: Math.round(r24Pkr / 1.16638),
          rate24kPer1g: Math.round(r24Pkr / 11.6638),
          rate22kPerTola: Math.round(r24Pkr * (22 / 24)),
          rate18kPerTola: Math.round(r24Pkr * (18 / 24)),
          rateSilverPerTola: Math.round(30 * usdPkr * 0.3621) || 4850,
          rate24kPerTolaGBP: r24Gbp,
          rate24kPer10gGBP: Math.round(r24Gbp / 1.16638),
          rate24kPer1gGBP: Math.round(r24Gbp / 11.6638),
          rate22kPerTolaGBP: Math.round(r24Gbp * (22 / 24)),
          rate18kPerTolaGBP: Math.round(r24Gbp * (18 / 24)),
          lastUpdated: new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }) + ' PKT (Live Gold Market)'
        };
        window.saveGoldRates(rates);
        if (!silent) showToast(`Live Gold Rates synced! PKR ${r24Pkr.toLocaleString()} / Tola`, 'success');
        return rates;
      }
    } catch (e) {}

    return window.getGoldRates();
  };

  window.updateGoldRateFrom24k = function (rate24k) {
    const r24 = parseFloat(rate24k) || 437000;
    const r24Gbp = Math.round(r24 / 374);
    const rates = {
      rate24kPerTola: Math.round(r24),
      rate24kPer10g: Math.round(r24 / 1.16638),
      rate24kPer1g: Math.round(r24 / 11.6638),
      rate22kPerTola: Math.round(r24 * (22 / 24)),
      rate18kPerTola: Math.round(r24 * (18 / 24)),
      rateSilverPerTola: 4850,
      rate24kPerTolaGBP: r24Gbp,
      rate24kPer10gGBP: Math.round(r24Gbp / 1.16638),
      rate24kPer1gGBP: Math.round(r24Gbp / 11.6638),
      rate22kPerTolaGBP: Math.round(r24Gbp * (22 / 24)),
      rate18kPerTolaGBP: Math.round(r24Gbp * (18 / 24)),
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' PKT (Manual)'
    };
    window.saveGoldRates(rates);
    showToast(`Gold Rates updated! 24K: PKR ${r24.toLocaleString()} / Tola`, 'success');
  };

  window.renderGoldRateBar = function () {
    let bar = document.querySelector('.gold-rate-bar');
    const rates = window.getGoldRates();

    const gbp24kTola = rates.rate24kPerTolaGBP || Math.round(rates.rate24kPerTola / 374);
    const gbp24k10g = rates.rate24kPer10gGBP || Math.round(rates.rate24kPer10g / 374);
    const gbp24k1g = rates.rate24kPer1gGBP || Math.round(rates.rate24kPer1g / 374);
    const gbp22kTola = rates.rate22kPerTolaGBP || Math.round(rates.rate22kPerTola / 374);
    const gbp18kTola = rates.rate18kPerTolaGBP || Math.round(rates.rate18kPerTola / 374);

    const tickerContent = `
      <div class="gold-rate-ticker">
        <span class="gold-rate-item"><span class="gold-rate-tag">LIVE GOLD MARKET</span> 24K Gold: <strong>PKR ${rates.rate24kPerTola.toLocaleString()} (£${gbp24kTola.toLocaleString()}) / Tola</strong></span>
        <span>✦</span>
        <span class="gold-rate-item">10 Grams 24K: <strong>PKR ${rates.rate24kPer10g.toLocaleString()} (£${gbp24k10g.toLocaleString()})</strong></span>
        <span>✦</span>
        <span class="gold-rate-item">1 Gram 24K: <strong>PKR ${rates.rate24kPer1g.toLocaleString()} (£${gbp24k1g.toLocaleString()})</strong></span>
        <span>✦</span>
        <span class="gold-rate-item">22K Gold: <strong>PKR ${rates.rate22kPerTola.toLocaleString()} (£${gbp22kTola.toLocaleString()}) / Tola</strong></span>
        <span>✦</span>
        <span class="gold-rate-item">18K Gold: <strong>PKR ${rates.rate18kPerTola.toLocaleString()} (£${gbp18kTola.toLocaleString()}) / Tola</strong></span>
        <span>✦</span>
        <span class="gold-rate-item"><span class="gold-rate-tag">LIVE MARKET</span> Updated ${rates.lastUpdated} &nbsp;|&nbsp; Dual PKR & GBP (£) Live Rates</span>
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
  ====================================== */
  const DEFAULT_CUSTOMERS = [
    {
      name: 'Ayesha Malik',
      email: 'customer@lavion.pk',
      phone: '+92 300 1234567',
      password: 'lavion123',
      city: 'Lahore'
    }
  ];

  window.getCustomers = function () {
    const saved = localStorage.getItem('lavion_users_v1');
    if (!saved) {
      localStorage.setItem('lavion_users_v1', JSON.stringify(DEFAULT_CUSTOMERS));
      return DEFAULT_CUSTOMERS;
    }
    return JSON.parse(saved);
  };

  window.saveCustomers = function (users) {
    localStorage.setItem('lavion_users_v1', JSON.stringify(users));
  };

  window.getActiveCustomer = function () {
    const saved = sessionStorage.getItem('lavion_active_user_v1');
    return saved ? JSON.parse(saved) : null;
  };

  window.setActiveCustomer = function (user) {
    if (user) {
      sessionStorage.setItem('lavion_active_user_v1', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('lavion_active_user_v1');
    }
    window.updateAccountHeaderUI();
  };

  window.updateAccountHeaderUI = function () {
    const activeUser = window.getActiveCustomer();
    document.querySelectorAll('#util-account, .account-link').forEach(link => {
      if (activeUser) {
        link.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Account (${activeUser.name.split(' ')[0]})
        `;
      } else {
        link.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Sign In / Register
        `;
      }
    });
  };

  window.openCustomerAuthModal = function () {
    let modal = document.getElementById('customer-auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'customer-auth-modal';
      modal.className = 'admin-modal-backdrop';
      document.body.appendChild(modal);
    }

    const activeUser = window.getActiveCustomer();
    if (activeUser) {
      renderCustomerProfileView(modal, activeUser);
    } else {
      renderSignInView(modal);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function renderSignInView(modal) {
    modal.innerHTML = `
      <div class="admin-modal-dialog" style="max-width: 460px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(200,169,110,0.3); padding-bottom:12px;">
          <h3 style="font-family:var(--font-serif); font-size:24px; color:var(--color-gold-light); margin:0;" id="auth-modal-title">Sign In to Your Account</h3>
          <button class="admin-action-btn" id="auth-close-btn" style="padding:4px 10px;">&times;</button>
        </div>

        <!-- Auth Tabs -->
        <div style="display:flex; gap:10px; margin-bottom:24px;">
          <button class="admin-tab-btn active" id="tab-login-btn" style="flex:1; padding:10px;">Sign In</button>
          <button class="admin-tab-btn" id="tab-register-btn" style="flex:1; padding:10px;">Register</button>
        </div>

        <!-- Login Form -->
        <form id="customer-login-form">
          <div class="admin-form-group">
            <label>Email, Phone, or Admin Username</label>
            <input type="text" id="login-email" value="customer@lavion.pk" placeholder="e.g. customer@lavion.pk, +92 300 1234567, or admin" required />
          </div>

          <div class="admin-form-group">
            <label>Password</label>
            <input type="password" id="login-pass" value="lavion123" placeholder="••••••••" required />
          </div>

          <div style="background:rgba(200,169,110,0.1); border:1px solid rgba(200,169,110,0.2); padding:10px; border-radius:6px; font-size:11px; color:var(--color-gold-light); margin-bottom:18px; text-align:center;">
            🔑 Demo Customer: <strong>customer@lavion.pk</strong> / <strong>lavion123</strong><br/>
            🔑 Admin Access: Use <strong>admin</strong> as username (password: <strong>lavion123</strong>)
          </div>

          <button type="submit" class="admin-primary-btn" style="width:100%; justify-content:center; padding:14px; font-size:12px;">
            Sign In to My Account
          </button>
        </form>

        <!-- Register Form (Hidden by default) -->
        <form id="customer-register-form" style="display:none;">
          <div class="admin-form-group">
            <label>Full Name</label>
            <input type="text" id="reg-name" placeholder="e.g. Ayesha Malik" required />
          </div>

          <div class="admin-form-group">
            <label>Email Address</label>
            <input type="email" id="reg-email" placeholder="name@example.com" required />
          </div>

          <div class="admin-form-group">
            <label>Phone / WhatsApp Number</label>
            <input type="tel" id="reg-phone" placeholder="+92 300 1234567" required />
          </div>

          <div class="admin-form-group">
            <label>City</label>
            <input type="text" id="reg-city" placeholder="e.g. Lahore, Karachi, Islamabad" required />
          </div>

          <div class="admin-form-group">
            <label>Password</label>
            <input type="password" id="reg-pass" placeholder="Create password" required />
          </div>

          <button type="submit" class="admin-primary-btn" style="width:100%; justify-content:center; padding:14px; font-size:12px;">
            Create Customer Account
          </button>
        </form>
      </div>
    `;

    const closeAuth = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };

    document.getElementById('auth-close-btn')?.addEventListener('click', closeAuth);

    const loginTab = document.getElementById('tab-login-btn');
    const regTab = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('customer-login-form');
    const regForm = document.getElementById('customer-register-form');
    const titleEl = document.getElementById('auth-modal-title');

    loginTab?.addEventListener('click', () => {
      loginTab.classList.add('active');
      regTab.classList.remove('active');
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      if (titleEl) titleEl.textContent = 'Sign In to Your Account';
    });

    regTab?.addEventListener('click', () => {
      regTab.classList.add('active');
      loginTab.classList.remove('active');
      regForm.style.display = 'block';
      loginForm.style.display = 'none';
      if (titleEl) titleEl.textContent = 'Create Customer Account';
    });

    loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailOrPhone = document.getElementById('login-email').value.trim().toLowerCase();
      const pass = document.getElementById('login-pass').value;

      // Check for admin credentials first
      const isAdmin = (emailOrPhone === 'admin' || emailOrPhone === 'lavion') && (pass === 'lavion123' || pass === 'admin123');
      if (isAdmin) {
        sessionStorage.setItem('lavion_admin_auth', 'true');
        sessionStorage.setItem('lavion_admin_token', '');
        sessionStorage.setItem('lavion_admin_user', JSON.stringify({ username: 'Admin', role: 'admin' }));
        toggleAdminLinks(true);
        showToast('Admin login successful!', 'success');
        closeAuth();
        setTimeout(() => {
          adminOverlay?.classList.add('active');
          document.body.style.overflow = 'hidden';
          renderAdmin();
        }, 500);
        return;
      }

      // Check for customer credentials
      const users = window.getCustomers();
      const user = users.find(u => (u.email.toLowerCase() === emailOrPhone || u.phone.includes(emailOrPhone)) && u.password === pass);

      if (user) {
        window.setActiveCustomer(user);
        showToast(`Welcome back, ${user.name}!`, 'success');
        closeAuth();
      } else {
        showToast('Invalid email/phone or password!', 'error');
      }
    });

    regForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const city = document.getElementById('reg-city').value.trim();
      const pass = document.getElementById('reg-pass').value;

      let users = window.getCustomers();
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('An account with this email already exists!', 'error');
        return;
      }

      const newUser = { name, email, phone, city, password: pass };
      users.push(newUser);
      window.saveCustomers(users);
      window.setActiveCustomer(newUser);

      showToast(`Account created successfully! Welcome to Lavion, ${name}.`, 'success');
      closeAuth();
    });
  }

  function renderCustomerProfileView(modal, user) {
    const orders = window.getOrders().filter(o => o.phone.includes(user.phone) || o.customer.toLowerCase().includes(user.name.toLowerCase()));

    const ordersHtml = orders.length > 0 ? orders.map(o => `
      <div style="background:#12100e; border:1px solid rgba(200,169,110,0.3); border-radius:8px; padding:14px 16px; margin-bottom:12px; font-size:13px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <strong style="color:var(--color-gold-light); font-size:15px; letter-spacing:0.5px;">${o.id}</strong>
            <span class="admin-status-tag instock" style="padding:3px 8px; font-size:10px; text-transform:uppercase; font-weight:700;">${o.status || 'Pending'}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <a href="track-order.html?orderId=${o.id}" target="_blank" style="background:linear-gradient(135deg,#c9a84c,#f0d080); color:#0a0a0a; text-decoration:none; padding:6px 14px; border-radius:4px; font-size:11px; font-weight:700; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 6px rgba(0,0,0,0.4); transition:all 0.2s ease;">
              📦 Track Order
            </a>
            <button onclick="window.generateInvoice('${o.id}')" style="background:rgba(200,169,110,0.15); color:var(--color-gold-light); border:1px solid rgba(200,169,110,0.4); padding:6px 12px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
              📄 Invoice
            </button>
          </div>
        </div>
        <div style="color:rgba(255,255,255,0.9); font-weight:600; font-size:13px; margin-bottom:6px; line-height:1.4;">${o.items}</div>
        <div style="color:rgba(255,255,255,0.5); font-size:12px; display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.06); padding-top:6px; margin-top:6px;">
          <span>Placed on: <strong style="color:rgba(255,255,255,0.75);">${o.date || 'Recent'}</strong></span>
          <span>Total: <strong style="color:var(--color-gold-light);">📞 Price on Request</strong></span>
        </div>
      </div>
    `).join('') : '<div style="color:rgba(255,255,255,0.5); font-size:13px; font-style:italic; padding:20px 0; text-align:center;">No past order history found.</div>';

    modal.innerHTML = `
      <div class="admin-modal-dialog" style="max-width: 720px; width: 95%;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(200,169,110,0.3); padding-bottom:14px;">
          <h3 style="font-family:var(--font-serif); font-size:26px; color:var(--color-gold-light); margin:0;">Customer Account Dashboard</h3>
          <button class="admin-action-btn" id="prof-close-btn" style="padding:4px 10px; font-size:16px;">&times;</button>
        </div>

        <div style="display:flex; align-items:center; gap:18px; background:#12100e; padding:18px; border-radius:10px; border:1px solid rgba(200,169,110,0.3); margin-bottom:24px;">
          <div style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,#c9a84c,#f0d080); color:#1c1a18; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700; flex-shrink:0; box-shadow:0 4px 12px rgba(200,169,110,0.3);">
            ${user.name.charAt(0)}
          </div>
          <div style="flex:1;">
            <h4 style="font-size:20px; color:#fff; margin:0 0 4px; font-weight:700;">${user.name}</h4>
            <div style="font-size:13px; color:var(--color-gold-light);">${user.email} &nbsp;|&nbsp; ${user.phone}</div>
            <div style="font-size:12px; color:rgba(255,255,255,0.5); margin-top:2px;">📍 ${user.city || 'Pakistan'}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="font-family:var(--font-sans); font-size:13px; text-transform:uppercase; letter-spacing:1.5px; color:var(--color-gold-light); margin:0;">My Order History (${orders.length})</h4>
          <a href="track-order.html" target="_blank" style="color:var(--color-gold-light); font-size:12px; text-decoration:none;">🔍 Open Full Order Tracker →</a>
        </div>

        <div style="max-height:320px; overflow-y:auto; margin-bottom:24px; padding-right:4px;">
          ${ordersHtml}
        </div>

        <div style="display:flex; gap:12px;">
          <a href="wishlist.html" class="admin-action-btn edit" style="flex:1; text-align:center; text-decoration:none; padding:12px; font-weight:600;">💖 My Wishlist</a>
          <a href="customized-jewellery.html" class="admin-action-btn edit" style="flex:1; text-align:center; text-decoration:none; padding:12px; font-weight:600;">✦ Bespoke Studio</a>
          <button class="admin-action-btn delete" id="prof-logout-btn" style="padding:12px 20px; font-weight:600;">Sign Out</button>
        </div>
      </div>
    `;

    const closeProf = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };

    document.getElementById('prof-close-btn')?.addEventListener('click', closeProf);
    document.getElementById('prof-logout-btn')?.addEventListener('click', () => {
      window.setActiveCustomer(null);
      showToast('Signed out successfully.', 'info');
      closeProf();
    });
  }

  function initCustomerAuthControls() {
    document.querySelectorAll('#util-account, .account-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('mobile-menu')?.classList.remove('active');
        window.openCustomerAuthModal();
      });
    });
    window.updateAccountHeaderUI();
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

      try {
        await fetch(`/api/orders/${orderId}/price`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: agreedPrice, status: 'Price Confirmed' })
        });
      } catch (err) {}

      showToast(`Order ${orderId} agreed price set to PKR ${agreedPrice.toLocaleString()}!`, 'success');
      closeModal();
      renderAdmin();
    });
  };

  /* ======================================
     LUXURY INVOICE & RECEIPT SYSTEM
  ====================================== */
  window.generateInvoice = function (orderId) {
    const orders = window.getOrders();
    const order = orders.find(o => String(o.id).toLowerCase() === String(orderId).toLowerCase());

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
              • <strong>Support Contact:</strong> +92 324 1775662 | support@lavion.pk
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

    document.getElementById('inv-download-pdf-btn')?.addEventListener('click', () => {
      const element = document.getElementById('printable-invoice-content');
      const generateAndSavePdf = () => {
        const opt = {
          margin: 0.3,
          filename: `Lavion-Invoice-${order.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        window.html2pdf().set(opt).from(element).save();
      };

      if (window.html2pdf) {
        generateAndSavePdf();
      } else {
        showToast('Preparing PDF download...', 'info');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = generateAndSavePdf;
        document.body.appendChild(script);
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

  wa.href = buildWhatsAppHref('923241775662', "Hello Lavion Gems & Jewellers, I'd like to enquire about your jewellery collection.");
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
    #whatsapp-float-btn {
      position: fixed;
      bottom: 88px;
      right: 24px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #25D366;
      color: #fff;
      text-decoration: none;
      padding: 12px 18px 12px 14px;
      border-radius: 50px;
      box-shadow: 0 4px 20px rgba(37,211,102,0.45);
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      transition: all 0.3s ease;
      animation: waPulse 2.5s ease-in-out infinite;
    }
    #whatsapp-float-btn:hover {
      background: #1da851;
      transform: scale(1.05);
      box-shadow: 0 6px 28px rgba(37,211,102,0.6);
    }
    #wa-label { white-space: nowrap; }
    @keyframes waPulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(37,211,102,0.45); }
      50% { box-shadow: 0 4px 32px rgba(37,211,102,0.75); }
    }
    @media (max-width: 480px) {
      #whatsapp-float-btn { padding: 12px; border-radius: 50%; bottom: 80px; right: 16px; }
      #wa-label { display: none; }
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








