/* portfolio js — slim, no libraries
 * - theme toggle (desktop + mobile overlay)
 * - mobile hamburger nav overlay (<=768px)
 * - reveal on scroll
 * - parallax [data-parallax]
 * - tunis local clock
 * - project filters (work/design pages)
 * - archive year+type filters
 * - copy email
 * - tweets likes
 * - contact form (email + WhatsApp)
 * - project detail page hydration
 */

(() => {
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ---------------- theme ----------------
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  if (stored) root.setAttribute('data-theme', stored);

  const toggleDesktop = $('[data-theme-toggle]');
  const toggleMobile = $('[data-theme-toggle-mobile]');

  const applyTheme = (next) => {
    if (next === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    localStorage.setItem('theme', next);
  };

  const toggle = () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'paper' : 'dark';
    applyTheme(next);
  };

  if (toggleDesktop) toggleDesktop.addEventListener('click', toggle);
  if (toggleMobile) toggleMobile.addEventListener('click', toggle);

  // ---------------- mobile hamburger nav ----------------
  const mq = window.matchMedia('(max-width: 768px)');
  let menuOpen = false;
  let overlay = null;
  let hamburger = null;

  const buildMobileNav = () => {
    const rail = $('.rail');
    if (!rail) return;

    // hide desktop nav links and socials
    const nav = rail.querySelector('.rail__nav');
    const socials = rail.querySelector('.rail__socials');
    if (nav) nav.style.display = 'none';
    if (socials) socials.style.display = 'none';

    // remove any existing hamburger/overlay
    if (hamburger) hamburger.remove();
    if (overlay) overlay.remove();

    // hamburger button
    hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    // right-hand group with the theme toggle: brand left, actions right —
    // a centered menu button reads as a logo, not a control.
    rail.querySelector('.rail__foot').appendChild(hamburger);

    // overlay
    overlay = document.createElement('div');
    overlay.className = 'mobile-nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const linksHtml = Array.from(rail.querySelectorAll('.rail__link'))
      .map(l => l.outerHTML).join('');
    const socialsHtml = Array.from(rail.querySelectorAll('.rail__socials a'))
      .map(a => a.outerHTML).join('');
    const themeSvg = rail.querySelector('.theme-toggle')?.innerHTML || '';

    overlay.innerHTML = `
      <nav aria-label="Mobile navigation">
        <ul class="rail__list">${linksHtml}</ul>
      </nav>
      <div class="rail__foot">
        <div class="rail__socials">${socialsHtml}</div>
        <button class="theme-toggle" data-theme-toggle-mobile aria-label="Toggle theme">${themeSvg}</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // wire overlay nav links to close on click
    overlay.querySelectorAll('.rail__link').forEach(l => {
      l.addEventListener('click', closeMenu);
    });

    // wire mobile theme toggle
    const mt = overlay.querySelector('[data-theme-toggle-mobile]');
    if (mt) mt.addEventListener('click', toggle);

    // hamburger toggle
    hamburger.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());

    // overlay background click = close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMenu();
    });

    // escape key
    const onKey = (e) => { if (e.key === 'Escape' && menuOpen) closeMenu(); };
    document.addEventListener('keydown', onKey);
  };

  const openMenu = () => {
    menuOpen = true;
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Close menu');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    menuOpen = false;
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open menu');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (mq.matches) buildMobileNav();
  mq.addEventListener('change', (e) => {
    if (e.matches) {
      if (menuOpen) closeMenu();
      buildMobileNav();
    } else {
      if (menuOpen) closeMenu();
      const nav = $('.rail')?.querySelector('.rail__nav');
      const socials = $('.rail')?.querySelector('.rail__socials');
      if (nav) nav.style.display = '';
      if (socials) socials.style.display = '';
      if (hamburger) hamburger.remove();
      if (overlay) overlay.remove();
      hamburger = null;
      overlay = null;
    }
  });

  // ---------------- motion preference ----------------
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = reduceMotionQuery.matches;
  const onMotionPrefChange = (e) => {
    reduceMotion = e.matches;
    if (reduceMotion) {
      document.querySelectorAll('[data-parallax]').forEach(n => { n.style.transform = ''; });
    }
  };
  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', onMotionPrefChange);
  }

  // ---------------- reveal on scroll ----------------
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length && !reduceMotion) {
    revealEls.forEach((el, i) => {
      if (!el.style.getPropertyValue('--delay')) {
        el.style.setProperty('--delay', `${(i % 6) * 70}ms`);
      }
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  // ---------------- parallax ----------------
  const parallaxEls = $$('[data-parallax]');
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (center - vh / 2) / vh;
        const strength = parseFloat(el.dataset.parallax) || 20;
        el.style.transform = `translate3d(0, ${offset * -strength}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  // ---------------- tunis clock ----------------
  const clock = $('[data-clock]');
  if (clock) {
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit'
      }) + ' GMT+1';
    };
    tick();
    setInterval(tick, 30 * 1000);
  }

  // ---------------- project filters ----------------
  const filters = $$('[data-filter]');
  const projects = $$('[data-project]').filter(el => !el.hasAttribute('data-arc-item'));
  if (filters.length && projects.length) {
    const sections = $$('.gallery, .showcase').map(list => ({
      list, section: list.closest('section')
    }));
    const syncSections = () => {
      sections.forEach(({ list, section }) => {
        const anyVisible = $$('[data-project]', list).some(el => !el.hidden);
        if (section) section.hidden = !anyVisible;
      });
    };
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;
        filters.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        projects.forEach(p => {
          const match = cat === 'all' || (p.dataset.category || '').includes(cat);
          p.hidden = !match;
        });
        syncSections();
      });
    });
  }

  // ---------------- engineering work filters ----------------
  const engineeringFilters = $$('[data-engineering-filter]');
  const engineeringItems = $$('[data-engineering-item]');
  const engineeringStatus = $('[data-engineering-status]');
  if (engineeringFilters.length && engineeringItems.length) {
    const updateEngineeringWork = (category) => {
      let visible = 0;
      engineeringItems.forEach((item) => {
        const matches = category === 'all' || (item.dataset.category || '').split(/\s+/).includes(category);
        item.hidden = !matches;
        if (matches) visible += 1;
      });
      engineeringFilters.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.engineeringFilter === category));
      });
      if (engineeringStatus) engineeringStatus.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}`;
    };
    engineeringFilters.forEach((button) => {
      button.addEventListener('click', () => updateEngineeringWork(button.dataset.engineeringFilter));
    });
    updateEngineeringWork('all');
  }

  // ---------------- design portfolio filters ----------------
  const designPortfolio = $('[data-design-portfolio]');
  if (designPortfolio) {
    const grid = $('[data-design-grid]', designPortfolio);
    const cards = $$('[data-design-item]', grid);
    const categoryButtons = $$('[data-design-category]', designPortfolio);
    const industrySelect = $('[data-design-industry]', designPortfolio);
    const sortSelect = $('[data-design-sort]', designPortfolio);
    const status = $('[data-design-status]', designPortfolio);
    const empty = $('[data-design-empty]', designPortfolio);
    cards.forEach((card, index) => { card.dataset.position = String(index); });
    let category = 'all';

    const updateDesignPortfolio = () => {
      const industry = industrySelect?.value || 'all';
      let visible = 0;
      cards.forEach(card => {
        const categories = (card.dataset.category || '').split(/\s+/);
        const matches = (category === 'all' || categories.includes(category)) &&
          (industry === 'all' || card.dataset.industry === industry);
        card.hidden = !matches;
        if (matches) visible++;
      });
      const sort = sortSelect?.value || 'featured';
      const ordered = [...cards].sort((a, b) => {
        if (sort === 'featured') return Number(a.dataset.position) - Number(b.dataset.position);
        const yearDiff = Number(a.dataset.year || 0) - Number(b.dataset.year || 0);
        return sort === 'newest' ? -yearDiff : yearDiff;
      });
      ordered.forEach(card => grid.appendChild(card));
      if (status) status.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}`;
      if (empty) empty.hidden = visible !== 0;
    };

    categoryButtons.forEach(button => button.addEventListener('click', () => {
      category = button.dataset.designCategory;
      categoryButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      updateDesignPortfolio();
    }));
    industrySelect?.addEventListener('change', updateDesignPortfolio);
    sortSelect?.addEventListener('change', updateDesignPortfolio);
    updateDesignPortfolio();
  }

  // ---------------- archive filters ----------------
  const arcControls = $('[data-arc-controls]');
  if (arcControls) {
    const yearBtns = $$('[data-arc-year]', arcControls);
    const typeBtns = $$('[data-arc-type]', arcControls);
    const groups   = $$('[data-arc-group]');
    const items    = $$('[data-arc-item]');
    const statusEl = $('[data-arc-status]');
    const emptyEl  = $('[data-arc-empty]');
    let activeYear = 'all', activeType = 'all';

    const typeTokens = (el) => (el.dataset.type || '').split(/\s+/).filter(Boolean);
    const matches = (el) =>
      (activeYear === 'all' || el.dataset.year === activeYear) &&
      (activeType === 'all' || typeTokens(el).includes(activeType));

    const pressGroup = (btns, active, attr) => {
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === active)));
    };

    const apply = () => {
      let shown = 0;
      items.forEach(el => {
        el.hidden = !matches(el);
        if (!el.hidden) shown++;
      });
      groups.forEach(g => {
        const live = $$('[data-arc-item]', g).filter(el => !el.hidden).length;
        g.hidden = live === 0;
        const countEl = $('[data-arc-count]', g);
        if (countEl) countEl.textContent = live === 1 ? '1 project' : live + ' projects';
      });
      if (emptyEl) emptyEl.hidden = shown !== 0;
      if (statusEl) statusEl.textContent = shown === 0 ? 'No matches'
        : (shown === 1 ? '1 project' : shown + ' projects');

      typeBtns.forEach(b => {
        const t = b.dataset.arcType;
        if (t === 'all') return;
        b.disabled = !items.some(el =>
          typeTokens(el).includes(t) &&
          (activeYear === 'all' || el.dataset.year === activeYear)
        );
      });
      yearBtns.forEach(b => {
        const y = b.dataset.arcYear;
        if (y === 'all') return;
        b.disabled = !items.some(el =>
          el.dataset.year === y &&
          (activeType === 'all' || typeTokens(el).includes(activeType))
        );
      });
    };

    yearBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activeYear = btn.dataset.arcYear;
        pressGroup(yearBtns, activeYear, 'arcYear');
        apply();
      });
    });
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activeType = btn.dataset.arcType;
        pressGroup(typeBtns, activeType, 'arcType');
        apply();
      });
    });
    apply();
  }

  // ---------------- copy mail ----------------
  const copyBtn = $('[data-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.copy);
        const before = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = before; copyBtn.classList.remove('copied'); }, 1600);
      } catch (_) {
        window.location.href = 'mailto:' + copyBtn.dataset.copy;
      }
    });
  }

  // ---------------- tweets likes ----------------
  const tweetsRoot = $('[data-tweets-root]');
  if (tweetsRoot) {
    $$('[data-tweet-id]', tweetsRoot).forEach(card => {
      const id = card.dataset.tweetId;
      const btn = $('[data-like-btn]', card);
      const countEl = $('[data-like-count]', card);
      if (!id || !btn || !countEl) return;
      const base = parseInt(countEl.dataset.base || countEl.textContent || '0', 10) || 0;
      const key = `tweet-like:${id}`;
      let liked = localStorage.getItem(key) === '1';
      const render = () => {
        btn.classList.toggle('is-liked', liked);
        btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
        btn.textContent = liked ? 'Liked' : 'Like';
        countEl.textContent = String(base + (liked ? 1 : 0));
      };
      btn.addEventListener('click', () => {
        liked = !liked;
        if (liked) localStorage.setItem(key, '1'); else localStorage.removeItem(key);
        render();
      });
      render();
    });
  }

  // ---------------- contact form ----------------
  const contactForm = $('[data-contact-form]');
  if (contactForm) {
    const WA_NUMBER = '21653019984';
    const EMAIL = 'contact.achrefbenyaagoub@gmail.com';
    const statusEl = $('[data-form-status]');
    const setStatus = (msg, kind) => {
      if (!statusEl) return;
      statusEl.hidden = false;
      statusEl.textContent = msg;
      statusEl.classList.remove('is-ok', 'is-err');
      if (kind) statusEl.classList.add(kind === 'ok' ? 'is-ok' : 'is-err');
    };
    const readFields = () => {
      const d = new FormData(contactForm);
      return {
        name:    (d.get('name')          || '').toString().trim(),
        email:   (d.get('email')         || '').toString().trim(),
        topic:   (d.get('subject_topic') || '').toString().trim() || 'Hello Achref',
        message: (d.get('message')       || '').toString().trim(),
      };
    };

    const waBtn = contactForm.querySelector('[data-send="whatsapp"]');
    if (waBtn) {
      waBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!contactForm.reportValidity()) return;
        const f = readFields();
        const text = `Hi Achref — ${f.name} here.\n` +
          (f.email ? `Email: ${f.email}\n` : '') +
          `Subject: ${f.topic}\n\n${f.message}`;
        window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        setStatus('Opening WhatsApp — just hit send in the chat.', 'ok');
      });
    }

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = readFields();
      const body = `Hi Achref,\n\n${f.message}\n\n— ${f.name}\n${f.email}`;
      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(f.topic)}&body=${encodeURIComponent(body)}`;
      setStatus('Your email app should open with the message ready to send.', 'ok');
    });
  }

  // ---------------- project detail hydration ----------------
  const PROJECTS = {
    nesty: { title: "Nesty", tagline: "A Tunisian rental platform with a seeker app, an agency workspace, and an admin console.", category: "Product Platform · PropTech", year: "2026", role: "Product Designer & Full-stack Engineer ? Personal project", stack: ["Flutter", "Next.js", "Supabase", "Postgres", "Row-level security"], description: ["Nesty is my personal product project and the startup I’m building toward: a rental platform for Tunisia shaped around three connected products — a mobile app for people searching for a home, a workspace for hosts and agencies, and an admin console for the platform team.", "For seekers, listings include verification and a trust score. Hosts can create immersive 3D tours from the photos they already take on their phones, so people can explore a home before arranging a visit.", "The agency workspace brings listings, the reservation pipeline, a shared calendar, incidents, and support into one place. The admin console gives the Nesty team tools for agency onboarding, listing moderation, roles, and the support queue.", "The products use Flutter, Next.js, Supabase, and Postgres over a shared schema. Row-level security handles access across the different user roles."], external: { label: "Live site", href: "https://nesty-tn.vercel.app/" }, cover: "./assets/images/nesty.png", browser: true, surfaces: [{ src: "./assets/images/nesty_mobile.png", kind: "plain", title: "Seeker mobile app", caption: "Find a home, review listing trust details, and explore photo-based 3D tours." }, { src: "./assets/images/nesty_agency.png", kind: "browser", title: "Agency workspace", caption: "Listings, reservations, calendar, incidents, and support for hosts and agencies." }, { src: "./assets/images/nesty_admin.png", kind: "browser", title: "Admin console", caption: "Agency onboarding, listing moderation, user roles, and support operations." }], gallery: [] },
    voyagi: { title: "Voyagi", tagline: "A white-label booking platform for travel agencies — agency back-office, seller app, and super-admin console.", category: "B2B SaaS · Travel tech", year: "2026", role: "Product Designer & Full-stack Engineer", stack: ["Next.js","React","TypeScript","Flutter","Tailwind CSS","Postgres","Multi-tenant","RBAC"], description: ["Voyagi is a multi-tenant SaaS product, not a marketing page. Every travel agency that signs up gets its own isolated workspace — its catalogue, its branding, its sellers, its commission rules — while the whole thing runs on one codebase. The promise that shapes the architecture: clients book under the agency's own name, not the platform's.","Agency back-office. This is the core product. Agencies build and price their catalogue — excursions, hotels, transfers, packages — with availability rules, seasonal pricing, and capacity limits. From there they run the business: a booking engine that turns the catalogue into sellable inventory, a reservations pipeline from enquiry through confirmation to payment status, customer records, invoices and vouchers, and a dashboard covering revenue, occupancy, and top-selling products. Team seats let an owner add staff with scoped permissions, so a counter agent sees bookings but not margins.","Commission engine & seller app. The differentiator is how agencies pay the people who sell for them. Voyagi tracks commissions per collaborator with configurable rates by product, seller, or tier, then reconciles what is owed each period. Sellers and partner resellers work from a mobile app: browse the live catalogue, quote a client on the spot, create a booking, and watch their own commission accrue in real time — which is what turns a scattered network of freelance sellers into a measurable distribution channel.","Super-admin console. Above the tenants sits the platform console I built for operating the business — agency onboarding and provisioning, subscription and plan management, feature flags per tenant, global product and category taxonomy, support impersonation for debugging a specific agency's workspace, and cross-tenant analytics. Multi-tenancy is enforced at the data layer with row-level isolation, so one agency can never read another's catalogue, customers, or margins.","I also designed and built the go-to-market site that sells it — a demo-request funnel aimed at agency owners, where the commission model, per-role workspaces, client proof, and FAQ each answer a specific objection in the buying process. Shipped in French for the target market."], external: { label: "Live site", href: "https://voyagi-landing.vercel.app/" }, cover: "./assets/images/voyagi.png", browser: true, surfaces: [{ src: "./assets/images/voyagi_admin.png", kind: "browser", title: "Agency back-office", caption: "Per-tenant workspace — catalogue, reservations, revenue dashboards, and commissions reconciled per collaborator each period." },{ src: "./assets/images/voyagi_mobile.png", kind: "plain", title: "Mobile seller app", caption: "Sellers browse the live catalogue, quote a client on the spot, and watch their own commission accrue in real time." }], gallery: [] },
    "marwen-travel": { title: "Marwen Travel", tagline: "A live booking site for private airport transfers and excursions across Türkiye.", category: "Web Development · Client work", year: "2026", role: "Designer & Front-end Developer", stack: ["Next.js","React","Tailwind CSS","Booking UX","i18n","SEO"], description: ["Marwen Travel is a production travel service running on its own domain out of Istanbul — private airport transfers, chauffeur-driven trips, curated excursions, and hotels across Türkiye. Real customers, real bookings.","The product problem was trust at the moment of arrival: a traveller landing in an unfamiliar country needs to know the price is fixed and someone will actually be waiting. The site answers that above the fold with a fixed-price promise, a 4.9 traveller rating, and a WhatsApp button beside every booking CTA — because this audience converts in chat, not in forms.","The centrepiece is a multi-mode booking widget — transfer, hourly hire, or excursion — with pickup and drop-off search, date and time, passenger count, and a round-trip option that surfaces its own discount. Built responsive and multilingual for an inbound audience that arrives in several languages, with live chat for the questions a form can't catch."], external: { label: "Live site", href: "https://marwentravel.com" }, cover: "./assets/images/marwentravel.png", browser: true, gallery: [] },
    nurone: { title: "Nurone · Redesign", tagline: "A redesign for an AI-augmented engineering studio, delivered as an assessment.", category: "Web design · Redesign", year: "2026", role: "Product Designer & Front-end Engineer", stack: ["Next.js","React","TypeScript","Tailwind CSS","3D / WebGL","Figma"], description: ["A full redesign for Nurone — an AI-augmented team of engineers, architects, and growth hackers that turns ideas and broken MVPs into products that scale. Delivered as a technical assessment, taken from audit through to a shipped, responsive front-end.","The positioning was the hard part. Nurone is deliberately selective — \"we don't work with everyone, we work where we believe we can win\" — so the site had to read as a high-end partner rather than an agency competing on volume. I built the page around that: a two-part headline that hands ambition to the client and system-building to Nurone, a \"Request Access\" CTA instead of a generic contact form, and a numbered narrative — The System, Labs, Case Studies, Process, FAQ — that walks a founder from scepticism to enquiry.","Visually it commits to a dark, high-contrast treatment with a sculpted 3D monogram as the anchor, held together by a strict type scale and consistent spacing so the restraint reads as confidence. Designed in Figma and implemented in Next.js in the same week."], external: { label: "Live site", href: "https://nurone-assesment.vercel.app/" }, cover: "./assets/images/nurone.png", browser: true, gallery: [] },
    deal: { title: "Deal", tagline: "A Gen Z marketplace to buy, sell, and swap fashion.", category: "Mobile Application · Gen Z fashion", year: "2025", role: "Product Designer & Flutter Developer", stack: ["Flutter","Dart","Supabase","Firebase Firestore","BaaS","SaaS"], description: ["Deal is a Gen Z mobile app built for small fashion brands and individuals who want to sell, buy, and swap clothes inside one vibrant community — think a marketplace, a thrift store, and a closet-trading circle, all in one feed.","The product blends a traditional marketplace with a peer-to-peer swap experience. Micro-businesses list their inventory, while everyday users trade pieces directly with each other. Listings are short-form and visual-first, so browsing feels closer to a social app than a store.","On the backend, Deal leans on a modern BaaS / SaaS stack: Supabase handles auth, Postgres, and storage, while Firebase Firestore powers real-time chat between buyers and sellers and live updates on offers. The Flutter client keeps the experience the same on iOS and Android."], external: { label: "GitHub", href: "https://github.com/Achref200" }, cover: "./assets/images/deal.png", gallery: ["./assets/images/deal.png","./assets/images/deal.png"] },
    postuly: { title: "Postuly Tn", tagline: "The Tunisian career hub for students and first-job seekers.", category: "Career platform · Tunisia", year: "2025", role: "Product Designer & Mobile Developer", stack: ["Flutter","Dart","Supabase","REST APIs"], description: ["Postuly Tn is a one-stop career platform built for Tunisian students and recent graduates — a single place to search for PFE topics, reference books, internships, first jobs, and open application calls.","Today, that information is scattered across LinkedIn posts, Facebook groups, and university notice boards. Postuly centralises those listings and matches them to the user's field of study, graduation year, and the kind of opportunity they're hunting for.","The experience also covers the full application loop: candidates apply in a few taps from a structured profile, recruiters review consistent applications, and graduates get notified the moment something relevant goes live."], external: { label: "LinkedIn", href: "https://www.linkedin.com/company/postulytn/?viewAsMember=true" }, cover: "./assets/images/postuly1.jpeg", gallery: ["./assets/images/postuly1.jpeg","./assets/images/postuly2.jpeg"] },
    "dubai-offshore": { title: "Dubai Offshore", tagline: "A corporate web presence for an offshore consultancy.", category: "Web Development", year: "2024", role: "Designer & Front-end Developer", stack: ["Next.js","React","Tailwind CSS","Vercel"], description: ["A modern corporate site for an offshore consultancy based in Dubai — built to feel premium, trustworthy, and fast on every device.","The site walks visitors through services, company structure, and contact in a single fluid scroll, with subtle motion and a strict typographic system that keeps it elegant rather than salesy."], external: { label: "Live site", href: "https://dubaii-offshore.vercel.app/" }, cover: "./assets/images/dubai_project.png", gallery: [] },
    digivolution: { title: "Digivolution Agency", tagline: "A bold marketing site for a digital agency.", category: "Web Development", year: "2024", role: "UI/UX Designer & Developer", stack: ["Angular","TypeScript","HTML","CSS","GSAP"], description: ["A full marketing site for Digivolution, a digital agency focused on branding and growth. The design balances strong typography with motion to communicate energy without becoming noisy.","Built from the ground up — wireframes in Figma, then shipped as a responsive, hand-coded front-end."], external: { label: "Behance", href: "https://www.behance.net/gallery/210961279/Digivolution-Website" }, cover: "./assets/images/digivolutio_project.png", gallery: [] },
    "planet-food": { title: "Planet Food", tagline: "A food delivery concept with a clean, friendly UI.", category: "Web Development", year: "2023", role: "Designer & Developer", stack: ["Angular","TypeScript","HTML","CSS"], description: ["A front-end project exploring how a food delivery experience can feel warmer and less transactional — generous typography, soft colour blocks, and a focus on the food itself."], external: { label: "Code", href: "https://github.com/Achref200/project_web_dev" }, cover: "./assets/images/planetfood_project.png", gallery: ["./assets/images/food.png"] },
    "travel-website": { title: "Travel Website", tagline: "A travel discovery site built around big imagery.", category: "Web Development", year: "2023", role: "Designer & Front-end Developer", stack: ["Angular","TypeScript","HTML","CSS"], description: ["A travel discovery site that puts destinations front and centre with edge-to-edge imagery and a quiet, editorial typography system."], external: { label: "Behance", href: "https://www.behance.net/gallery/197091877/Travel-Website" }, cover: "./assets/images/travel_project.png", gallery: [] },
    "i-filter": { title: "I Filter", tagline: "A water-filtration app designed in French, built on one repeating card component.", category: "Mobile UI/UX Design", year: "2024", role: "Product Designer", stack: ["Figma","Auto-layout","Component variants","Prototyping","Localised UI"], description: ["I Filter is a mobile product designed end to end in French for a Tunisian audience — which is a design constraint, not a translation step. French labels run roughly 20% longer than their English equivalents, so every component was built with auto-layout and tested at the longest string rather than the prettiest one.","The most interesting problem was the legal content. Privacy policy and terms are where most apps dump a wall of text and lose the user; here it is split into a three-step progress pattern with an explicit Next affordance, so consent becomes a short guided flow instead of an endless scroll with a checkbox at the bottom.","The UI system is intentionally soft — rounded fields with subtle inner shadow, a single blue accent, and spot illustration used to carry warmth so the copy does not have to. The profile screen is assembled entirely from one settings-row variant repeated with different icons, which is what keeps the file small enough to hand off cleanly."], external: { label: "Behance", href: "https://www.behance.net/gallery/210962863/I-FIlter-Mobile-App" }, cover: "./assets/images/design-5.png", gallery: [] },
    feelart: { title: "FeelArt", tagline: "A discovery app for artistic careers — branching onboarding for two very different users.", category: "Mobile UI/UX Design", year: "2023", role: "Product Designer", stack: ["Figma","Adobe XD","Onboarding UX","Maps UI","Brand direction"], description: ["FeelArt helps people build an artistic career — find clubs, venues, and events, and connect with the people running them. The tagline \"create your artistic career\" is the promise the interface has to keep, which meant treating it as a career tool wearing a culture app's clothes.","The defining UX decision is the fork at the very start. FeelArt serves two opposite users — someone presiding over a club and someone who owns a venue — so onboarding asks directly instead of guessing, then routes each into a different home. Getting that question wrong would have meant one audience navigating an app built for the other.","Discovery runs on two complementary modes: a visual feed for browsing by feeling, and a map for browsing by proximity, with venue cards surfacing inline on the map so a decision never costs a full screen transition.","The violet identity and rounded, generous cards were chosen to keep the app feeling closer to a cultural space than a directory — the imagery supplies the colour, and the UI stays deliberately quiet around it."], external: { label: "Behance", href: "https://www.behance.net/gallery/169225771/FeelArt-Ui-Mobile-Design" }, cover: "./assets/images/feelart.png", gallery: [] },
    "barbershop-flows": { title: "Barbershop · Flows", tagline: "Two apps, one system — the client booking flow and the barber dashboard, mapped end to end.", category: "Mobile UI/UX Design", year: "2023", role: "Product Designer (UX)", stack: ["Figma","User flows","Wireframing","Prototyping","Design system"], description: ["A booking platform for barbershops, designed as two connected products: the app a client books with, and the dashboard a barber runs their day from. Same data, opposite intentions — so the UX had to be drawn as one system rather than two apps that happen to share a database.","I mapped the flows before drawing a single polished screen: onboarding and account creation, password recovery branching into SMS or email, slot selection, confirmation, and in-app chat. The unhappy paths got the same attention as the happy ones — the time-slot grid marks unavailable slots explicitly rather than hiding them, because a client who can see what is taken understands the shop is busy instead of assuming the app is broken.","Confirmation is deliberately a full review step — date, time, and chosen style shown together with Reset and Apply — since a mis-booked appointment costs a barber a paid slot. The chat exists for exactly the case a form cannot handle: the client who needs to cancel late and would otherwise just not show up.","Visually the system is one violet accent over white, with a single card component and one button style carried across both apps, so the barber-side dashboard feels like the same product as the client app without ever being confused for it."], external: { label: "Behance", href: "https://www.behance.net/gallery/182840181/BarberShop-(-User-Barber-)-Flows-UI-UX-Design" }, cover: "./assets/images/design-1.png", gallery: [] },
    neurosleep: { title: "NeuroSleep", tagline: "A sleep-analysis app that shows clinical data without making you feel audited.", category: "Mobile UI/UX Design", year: "2024", role: "Product Designer", stack: ["Figma","Design system","Dark UI","Data visualisation","Prototyping"], description: ["NeuroSleep tracks sleep quality through body movement and night voice recording, then reports it back as hypnograms, radar charts, and trend lines. The design problem was tone: the same data can read as a health insight or as a verdict, and a user opening this app at 7am is not in the mood to be judged.","The whole interface is built on a near-black surface with a single violet accent. That was a deliberate constraint — colour is spent only where it carries meaning, so the charts read instantly and the chrome around them recedes. It also solves the real-world case: this app gets opened in a dark bedroom, and a bright UI would be hostile.","The system underneath is small on purpose. One card component covers stats, settings rows, and voice records; one chart treatment covers the hypnogram, the movement radar, and values-over-time. Building the design system before the screens is what kept forty-plus states consistent — onboarding, quick stats, reports, subscription, and settings all inherit the same spacing scale and type ramp.","The conversational onboarding was the other key decision: rather than a form, the app asks a few short questions and builds the profile from the answers, which sets a supportive tone from the very first screen."], external: { label: "Behance", href: "https://www.behance.net/achrefbenyaa" }, cover: "./assets/images/Thumbnail.png", gallery: [] },
    recloth: { title: "Recloth", tagline: "A second-hand clothing app with a sustainable angle.", category: "Mobile UI/UX Design", year: "2023", role: "Product Designer", stack: ["Figma"], description: ["Recloth is a mobile-first concept for buying and reselling second-hand clothes, framed around a sustainability story rather than pure thrift."], external: { label: "Behance", href: "https://www.behance.net/achrefbenyaa" }, cover: "./assets/images/design-3.png", gallery: [] },
    serfice: { title: "Serfice", tagline: "Brand identity and interface designed in the same file — a marketplace for digital services.", category: "Branding + Mobile UI/UX", year: "2023", role: "Brand & Product Designer", stack: ["Figma","Logo design","Brand identity","Iconography","UI system"], description: ["Serfice connects clients with providers across digital services — design, video, cyber security, cloud, networking, and data. I did the identity and the product together, which is the point of the case: the brand was never handed over as a logo file and then reinterpreted by someone else.","The mark is built from the wordmark itself — a negative-space cut through the \"I\" that reads as a service tick — and the tagline \"we serve differently\" sets the tone the interface then has to keep. The green system carries from the splash straight into the category grid and the favourites list without a single off-palette value.","The category grid was the core UX decision. Nine service types is too many for a carousel and too few for search-first, so it opens as a scannable icon grid where every tile is its own component variant: one icon slot, one label, one caption. Adding a tenth category costs nothing.","Serfice is two-sided, so onboarding forks early with a plain question — \"are you a user?\" or \"are you a partner?\" — routing two audiences into the correct experience before either has to guess which half of the app belongs to them."], external: { label: "Behance", href: "https://www.behance.net/achrefbenyaa" }, cover: "./assets/images/serfice.png", gallery: [] },
    "mobile-portfolio": { title: "Mobile Portfolio", tagline: "A pocket-sized version of my portfolio.", category: "Mobile UI/UX Design", year: "2024", role: "Designer", stack: ["Figma"], description: ["A mobile-first portfolio concept exploring how a personal site can feel native on a phone — gestures, transitions, and a content density tuned for the small screen."], external: { label: "Behance", href: "https://www.behance.net/achrefbenyaa" }, cover: "./assets/images/mobile-portfolio.png", gallery: ["./assets/images/mobile-2.png","./assets/images/mobile-5.png","./assets/images/mobile-6.png"] },
    serenov: { title: "Serenov · E-commerce", tagline: "A renovation-services storefront designed desktop and mobile in parallel, not sequentially.", category: "Web design · Responsive", year: "2023", role: "Web & Product Designer", stack: ["Figma","Responsive design","Design system","E-commerce UX"], description: ["Serenov sells interior and exterior renovation work online — quotes, service pages, and a cart, in French. Selling a service is not selling a product: there is no box to photograph, so the entire design leans on before/after imagery and explicit, unglamorous facts.","Every service card commits to the two things a customer actually decides on: estimated duration and price, stated plainly rather than hidden behind a \"request a quote\" wall. That single decision shaped the layout — the imagery sells the outcome, the specs remove the risk, and the CTA pair (Validate / Contact us) covers both the ready buyer and the hesitant one.","Desktop and mobile were designed side by side in the same file rather than one being squeezed down afterwards. The service card is a single component that re-flows: horizontal with the image left on desktop, stacked with the same type ramp on mobile. Because it re-flows instead of being redrawn, the mobile cart and the desktop catalogue never drifted apart."], external: { label: "Behance", href: "https://www.behance.net/gallery/176718625/Serenov-Responsive-web-design" }, cover: "./assets/images/design-2.png", gallery: [] },
    "recloth-web": { title: "Recloth · Web", tagline: "The desktop counterpart to the Recloth app.", category: "Web design", year: "2023", role: "Web Designer", stack: ["Figma"], description: ["A web edition of the Recloth concept — keeping the sustainability message front and centre while taking full advantage of the larger canvas for storytelling."], external: { label: "Behance", href: "https://www.behance.net/achrefbenyaa" }, cover: "./assets/images/Recloth Web 1.png", gallery: [] },
    "planet-food-web": { title: "Planet Food · Web", tagline: "The desktop version of Planet Food.", category: "Web design", year: "2023", role: "Web Designer", stack: ["Figma"], description: ["The web-design counterpart to Planet Food — the same warm, friendly tone scaled up for desktop with a clear menu, checkout, and account flow."], external: { label: "Behance", href: "https://www.behance.net/achrefbenyaa" }, cover: "./assets/images/design-4.png", gallery: [] },
    "travel-web": { title: "Travel · Web", tagline: "A desktop travel discovery experience.", category: "Web design", year: "2023", role: "Web Designer", stack: ["Figma"], description: ["The desktop-first take on the travel concept — wider imagery, deeper destination pages, and a planning flow that feels like flipping through a printed guide."], external: { label: "Behance", href: "https://www.behance.net/achrefbenyaa" }, cover: "./assets/images/travel.png", gallery: [] },
    exsys: { title: "Exsys", tagline: "An enterprise mobile companion app.", category: "Mobile Application", year: "2023", role: "Flutter Developer", stack: ["Flutter","Dart","MVVM","Provider"], description: ["Exsys is a mobile companion to an enterprise ERP — built with Flutter on top of an MVVM + Provider architecture, with a strong focus on edge cases and offline behaviour."], external: { label: "Behance", href: "https://www.behance.net/achrefbenyaa" }, cover: "./assets/images/Exsys.png", gallery: [] },
    "ai-assistant": { title: "AI Assistant", tagline: "A mobile AI assistant experiment.", category: "Mobile Application", year: "2024", role: "Flutter Developer", stack: ["Flutter","Dart","AI APIs"], description: ["An AI assistant mobile app, exploring how generative AI fits into a chat-first mobile interface — with streamed responses and a quiet, focused UI."], external: { label: "GitHub", href: "https://github.com/Achref200" }, cover: "./assets/images/Screenshot_2.png", gallery: [] },
    talent619: { title: "Talent619", tagline: "A talent-management mobile app.", category: "Mobile Application", year: "2024", role: "Flutter Developer", stack: ["Flutter","Dart"], description: ["Talent619 is a mobile platform for managing and showcasing talent — profiles, opportunities, and bookings, packaged into a clean Flutter app."], external: { label: "GitHub", href: "https://github.com/Achref200" }, cover: "./assets/images/mobile-6.png", gallery: [] },
    wassly: { title: "Wassly", tagline: "One mobile journey for car rental, licensed drivers, and intercity louage in Tunisia.", category: "Product Design · Mobility", year: "2026 / In progress", role: "Product Designer", stack: ["Flutter", "Dart", "Arabic / French / English", "Design system"], description: ["Wassly brings three everyday travel services together: rent a car, book a licensed driver, or reserve an intercity louage seat. The goal is to make the options bookable in advance with clear terms and one price.", "Language comes first in onboarding, so Arabic-speaking users do not have to navigate French screens to reach the language switch. Before booking, the design makes insurance, mileage, fuel, and deposit terms visible.", "The trust story is part of the interface. Licensing, traceable trips, and clear pricing answer concerns travelers already have about informal transport services.", "This is an in-progress product design case study. It focuses on the product direction and mobile experience."], external: { label: "Request a walkthrough", href: "./contact.html?project=wassly" }, cover: "./assets/images/wassly-03.png", surfaces: [{ src: "./assets/images/wassly-01.png", kind: "plain", title: "Product direction", caption: "Three Tunisian transport services, one app, one price, one booking." }, { src: "./assets/images/wassly-02.png", kind: "plain", title: "The problem", caption: "Separate calls and shifting prices make the trip hard to plan." }, { src: "./assets/images/wassly-03.png", kind: "plain", title: "Language-first onboarding", caption: "Arabic, French, and English are offered at the start of the journey." }, { src: "./assets/images/wassly-05.png", kind: "plain", title: "Trust and choice", caption: "Licensed operators, traceable trips, and the three service options appear in the flow." }], gallery: [] },
    apply: { title: "Apply", tagline: "A local-first workspace for researching roles, tailoring applications, and preparing follow-up.", category: "Product Platform · Personal tool", year: "2026", role: "Product design & engineering", stack: ["TypeScript", "Local-first data", "Gmail integration", "Optional AI analysis"], description: ["Apply turns a job application into a clear sequence: analyze a role, tailor a CV, compose outreach, then review messages before sending.", "Its matcher compares a job description against a profile across explainable dimensions such as skills, seniority, language, and location. It can generate an ATS-friendly CV with a stable, single-column layout while adapting the content to the role.", "Outreach templates use reusable variables that can be filled from an analyzed job. A review queue keeps each draft editable before sending through the user's own Gmail account.", "The app keeps its data local in readable files. Gmail authorization stays on the user's machine; enhanced AI analysis is optional."], external: { label: "Request a walkthrough", href: "./contact.html?project=apply" }, cover: "./assets/images/apply-design-light.png", browser: true, surfaces: [{ src: "./assets/images/apply-design-light.png", kind: "browser", title: "Design system", caption: "A warm, accessible component library with clear states for review, provenance, and delivery." }, { src: "./assets/images/apply-shortcuts-light.png", kind: "browser", title: "Keyboard shortcuts", caption: "A keyboard-first interaction model for moving through application tasks." }, { src: "./assets/images/apply-palette-light.png", kind: "browser", title: "Command palette", caption: "Fast access to common actions without interrupting the current workflow." }], gallery: [] },
    "boa-cosmetic": { title: "BOA Cosmetic", tagline: "A premium beauty storefront that brings products, rituals, and salon bookings into one experience.", category: "E-commerce UX · Product design concept", year: "2026", role: "Product Designer", stack: ["Responsive storefront", "Mobile checkout", "Booking flow", "Admin dashboard"], description: ["The concept connects BOA's cosmetic products with care routines and bookable salon services. Visitors can browse the shop, explore products, build a ritual, and reserve a service from the same storefront.", "The internal screens extend the experience to the BOA team: product and content management, incoming orders, bookings, service setup, and a daily operations dashboard.", "The repo contains a full set of desktop, mobile, and admin screen captures. It labels product imagery and business figures as demo content, so this case study presents the interface concept rather than a live commercial deployment."], external: { label: "Request a walkthrough", href: "./contact.html?project=boa-cosmetic" }, cover: "./assets/images/boa-cosmetic-home.png", browser: true, surfaces: [{ src: "./assets/images/boa-cosmetic-home.png", kind: "browser", title: "Storefront direction", caption: "A refined shop experience connecting products, rituals, and appointment booking." }, { src: "./assets/images/boa-cosmetic-services.png", kind: "browser", title: "Service management", caption: "Salon services, durations, locations, capacity, and publication state are managed in one admin view." }], gallery: [] },
    atastoon: { title: "Atastoon", tagline: "A playful mobile companion for an Isitcom Club robot.", category: "Mobile UI/UX · Product concept", year: "2023", role: "UI/UX Designer & Flutter Developer", stack: ["Flutter", "Dart", "Mobile product design"], description: ["Atastoon explores the interface for a robot companion: welcome and sign-in, a device-centered home, robot discovery, settings, and control options.", "The visual direction pairs a friendly character with a confident blue palette. The screens keep the robot itself at the center, while settings such as power, Bluetooth, and language are presented as familiar mobile controls.", "The repository describes this as a UI/UX and Flutter project. The portfolio image is the project's interface board; the source repository contains the editable design file."], external: { label: "GitHub project", href: "https://github.com/Achref200/Atastoon" }, cover: "./assets/images/atastoon.png", browser: true, gallery: [] },
    "nuit-webdesign": { title: "Nuit WebDesign", tagline: "A French-language service website concept, designed around clear paths to useful information.", category: "Web UI/UX · Concept", year: "2023", role: "UI/UX Designer", stack: ["Figma", "Information architecture", "Responsive web design"], description: ["This concept organizes a service website into a welcoming home page, an about section, FAQs, services, and a clear account of what makes the offer distinctive.", "The brief focuses on helping visitors quickly understand the service, find answers, and move through the site without friction. The visual direction calls for fluid motion and interactive cards while keeping the content in French for its intended audience.", "The project repository includes the design board, a video walkthrough, and a Figma file."], external: { label: "Open Figma file", href: "https://www.figma.com/file/EzM9yDkhZxEc9QKagxX0bm/UI-challenge?type=design&node-id=0%3A1&mode=design" }, cover: "./assets/images/nuit-webdesign.png", browser: true, gallery: [] },
    "vehicules-rdv": { title: "VehiculesRDV", tagline: "A Spring Boot microservices platform for managing automotive appointments.", category: "Backend Engineering · Microservices", year: "2025", role: "Backend Developer", stack: ["Java 17", "Spring Boot 3", "Spring Security · JWT", "MySQL", "OpenFeign", "Apache Kafka"], description: ["VehiculesRDV separates authentication, vehicle management, appointments, and notifications into four Spring Boot services. Each service has its own MySQL database.", "The appointment service calls the vehicle service synchronously through OpenFeign. It publishes appointment-created and appointment-canceled events to Kafka, which the notification service consumes asynchronously.", "The project also documents role-based access for clients and admins and exposes OpenAPI/Swagger documentation for each service. The architecture image is a portfolio redraw of the repository's documented design."], external: { label: "GitHub repository", href: "https://github.com/Achref200/VehiculesRDV" }, cover: "./assets/images/vehiculesrdv-architecture.svg", browser: true, gallery: [] },
    wortwerk: { title: "Wortwerk", tagline: "A Flutter app for learning German through short, guided sessions.", category: "Mobile Application ? Language learning", year: "2026 ? In progress", role: "Personal project ? Product & app development", stack: ["Flutter", "Dart", "Firebase Authentication", "Cloud Firestore", "Cloud Functions", "Bloc/Cubit"], description: ["Wortwerk is my personal project: a mobile app designed to help people learn German in small, steady steps.", "The current build includes onboarding with a self-assessed level or placement quiz, a playable A1 greetings lesson, flashcard review, and server-backed learning progress. Later lessons and levels are still in development.", "The app is built with Flutter and Firebase, with Bloc/Cubit for application state. Its portfolio cover is a typographic placeholder; app screenshots will be added when supplied."], external: { label: "GitHub repository", href: "https://github.com/Achref200/Wortwerk" }, cover: "./assets/images/wortwerk-cover.svg", gallery: [] },
    "adp-mobile": { title: "ADP Mobile", tagline: "A mobile app connecting people, initiatives, and the Djerba community.", category: "Mobile Application · Community", year: "Completed", role: "Freelance app project", stack: ["Flutter", "Dart"], description: ["Completed freelance mobile app work for Association Djerba Project. The app brings people, local initiatives, and the Djerba community together in one mobile experience."], external: { label: "GitHub", href: "https://github.com/Achref200/adp_mobile" }, cover: "./assets/images/achref-adp.jpg", gallery: [] }
  };

  const FALLBACK_LINKS = { github: "https://github.com/Achref200", behance: "https://www.behance.net/achrefbenyaa" };
  const pickFallbackLink = (p) => {
    const cat = (p.category || "").toLowerCase();
    return cat.includes("design") ? { label: "Behance", href: FALLBACK_LINKS.behance } : { label: "GitHub", href: FALLBACK_LINKS.github };
  };

  const projectRoot = $('[data-project-root]');
  if (projectRoot) {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const data = id && PROJECTS[id];
    const setText = (sel, value) => { const el = $(sel, projectRoot); if (el) el.textContent = value; };

    if (!data) {
      setText('[data-project-title]', 'Project not found');
      setText('[data-project-category]', '404');
      setText('[data-project-tagline]', "That project doesn't exist (yet). Head back to all work.");
      setText('[data-project-year]', '—');
      setText('[data-project-role]', '—');
      setText('[data-project-stack]', '—');
      setText('[data-project-links]', '—');
      document.title = 'Project not found — Achref Ben Yaagoub';
      return;
    }

    document.title = `${data.title} — Achref Ben Yaagoub`;
    setText('[data-project-title]', data.title);
    setText('[data-project-category]', data.category);
    setText('[data-project-tagline]', data.tagline || '');
    setText('[data-project-year]', data.year || '—');
    setText('[data-project-role]', data.role || '—');
    setText('[data-project-stack]', (data.stack || []).join(' · ') || '—');

    const linksEl = $('[data-project-links]', projectRoot);
    if (linksEl) {
      const link = (data.external && data.external.href) ? data.external : pickFallbackLink(data);
      linksEl.innerHTML = '';
      const a = document.createElement('a');
      a.href = link.href; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = `${link.label} ↗`;
      linksEl.appendChild(a);
    }

    const coverSection = $('[data-project-cover-section]', projectRoot);
    const coverImg = $('[data-project-cover]', projectRoot);
    if (data.cover && coverImg && coverSection) {
      coverImg.src = data.cover;
      coverImg.alt = `${data.title} — cover`;
      const frame = coverImg.closest('.project-cover');
      if (frame) frame.classList.toggle('project-cover--browser', !!data.browser);
      coverSection.hidden = false;
    }

    // surfaces
    const surfacesSection = $('[data-project-surfaces-section]', projectRoot);
    if (data.surfaces && data.surfaces.length && surfacesSection) {
      surfacesSection.hidden = false;
      const list = $('[data-surfaces-list]', surfacesSection) || surfacesSection;
      // remove any existing surface nodes
      list.querySelectorAll('[data-surface]').forEach(n => n.remove());
      data.surfaces.forEach((s, i) => {
        const div = document.createElement('div');
        div.className = `surface__shot ${s.kind === 'browser' ? 'surface__shot--browser' : ''}`;
        div.setAttribute('data-surface', '');
        const img = document.createElement('img');
        img.src = s.src; img.alt = `${data.title} — ${s.title}`; img.loading = i === 0 ? 'eager' : 'lazy';
        div.appendChild(img);
        const cap = document.createElement('div');
        cap.className = 'surface__cap';
        cap.innerHTML = `<div class="surface__title">${s.title}</div><div class="surface__text">${s.caption}</div>`;
        div.appendChild(cap);
        list.appendChild(div);
      });
    } else if (surfacesSection) {
      surfacesSection.hidden = true;
    }
  }
})();
