/* portfolio js
 * keep it small. no libraries.
 * - custom cursor (dot + ring with easing)
 * - reveal on scroll
 * - parallax for [data-parallax]
 * - tunis local clock
 * - theme toggle
 * - project filters (work page)
 * - copy email (contact page)
 */

(() => {
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ---------------- theme ----------------
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  if (stored) root.setAttribute('data-theme', stored);

  const toggle = $('[data-theme-toggle]');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'paper' : 'dark';
      if (next === 'dark') root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
      localStorage.setItem('theme', next);
    });
  }

  // ---------------- cursor ----------------
  // only spin this up on devices with a real pointer
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (fine) {
    const dot  = document.createElement('div');
    const ring = document.createElement('div');
    dot.className  = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    // ring lags behind for a softer feel
    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();

    // grow on interactive elements
    const hoverables = 'a, button, [data-cursor], .project a, .f-card, .filter, input, textarea';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverables)) ring.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverables)) ring.classList.remove('is-hover');
    });

    // hide when leaving window
    document.addEventListener('mouseleave', () => {
      dot.style.opacity  = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    });
  }

  // ---------------- reveal on scroll ----------------
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    // stagger children that share a parent
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

  // ---------------- parallax on scroll ----------------
  const parallaxEls = $$('[data-parallax]');
  if (parallaxEls.length) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // distance from viewport center, normalized
        const center = rect.top + rect.height / 2;
        const offset = (center - vh / 2) / vh;
        const strength = parseFloat(el.dataset.parallax) || 20;
        el.style.transform = `translate3d(0, ${offset * -strength}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  // ---------------- tunis local clock ----------------
  const clock = $('[data-clock]');
  if (clock) {
    const tick = () => {
      // explicit timezone — i'm in sousse
      const now = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Africa/Tunis',
        hour: '2-digit',
        minute: '2-digit',
      });
      clock.textContent = now + ' GMT+1';
    };
    tick();
    setInterval(tick, 30 * 1000);
  }

  // ---------------- project filters (work page) ----------------
  const filters = $$('[data-filter]');
  const projects = $$('[data-project]');
  if (filters.length && projects.length) {
    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;
        filters.forEach((b) => b.setAttribute('aria-pressed', b === btn));
        projects.forEach((p) => {
          const match = cat === 'all' || p.dataset.category.includes(cat);
          p.hidden = !match;
        });
      });
    });
  }

  // ---------------- copy mail ----------------
  const copyBtn = $('[data-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const value = copyBtn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        const before = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = before;
          copyBtn.classList.remove('copied');
        }, 1600);
      } catch (_) {
        // fallback — just select the email text
        window.location.href = 'mailto:' + value;
      }
    });
  }

  // ---------------- tweets likes (no account required) ----------------
  const tweetsRoot = $('[data-tweets-root]');
  if (tweetsRoot) {
    const cards = $$('[data-tweet-id]', tweetsRoot);
    cards.forEach((card) => {
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
        if (liked) localStorage.setItem(key, '1');
        else localStorage.removeItem(key);
        render();
      });

      render();
    });
  }

  // ---------------- contact form (Web3Forms + WhatsApp fallback) ----------------
  // "Send to inbox" => POST to Web3Forms, message lands in your Gmail.
  // "Send via WhatsApp" => opens wa.me chat pre-filled.
  // Web3Forms is free, no signup, just paste your access key in the hidden
  // input (data-w3f-key) on the form. Get a key at https://web3forms.com/
  const contactForm = $('[data-contact-form]');
  if (contactForm) {
    const WHATSAPP_NUMBER = '21653019984';
    const EMAIL_ADDRESS   = 'contact.achrefbenyaagoub@gmail.com';
    const statusEl        = $('[data-form-status]');

    const setStatus = (msg, kind) => {
      if (!statusEl) return;
      statusEl.hidden = false;
      statusEl.textContent = msg;
      statusEl.classList.remove('is-ok', 'is-err');
      if (kind) statusEl.classList.add(kind === 'ok' ? 'is-ok' : 'is-err');
    };

    const readFields = () => {
      const data = new FormData(contactForm);
      return {
        name:    (data.get('name')          || '').toString().trim(),
        email:   (data.get('email')         || '').toString().trim(),
        topic:   (data.get('subject_topic') || '').toString().trim() || 'Hello Achref',
        message: (data.get('message')       || '').toString().trim(),
        key:     (data.get('access_key')    || '').toString().trim()
      };
    };

    // WhatsApp button — no email, just opens chat
    const waBtn = contactForm.querySelector('[data-send="whatsapp"]');
    if (waBtn) {
      waBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!contactForm.reportValidity()) return;
        const f = readFields();
        const text =
          `Hi Achref — ${f.name} here.\n` +
          (f.email ? `Email: ${f.email}\n` : '') +
          `Subject: ${f.topic}\n\n${f.message}`;
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener');
        setStatus('Opening WhatsApp — just hit send in the chat.', 'ok');
      });
    }

    // Email button — actually delivers to inbox via Web3Forms
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = readFields();

      // If the access key hasn't been set yet, fall back to opening mailto so
      // the form still works in the meantime instead of silently failing.
      if (!f.key || f.key === 'REPLACE_WITH_YOUR_WEB3FORMS_KEY') {
        const body = `Hi Achref,\n\n${f.message}\n\n— ${f.name}\n${f.email}`;
        const mailto =
          `mailto:${EMAIL_ADDRESS}` +
          `?subject=${encodeURIComponent(f.topic)}` +
          `&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        setStatus(
          'Web3Forms key not set yet — opened your mail app instead. ' +
          'Add an access key in contact.html to send straight to the inbox.',
          'err'
        );
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending…';
      }
      setStatus('Sending your message…', 'ok');

      try {
        const payload = new FormData(contactForm);
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: payload
        });
        const out = await res.json().catch(() => ({}));
        if (res.ok && out.success !== false) {
          contactForm.reset();
          setStatus('Thanks — your message just landed in my inbox. I usually reply within a day.', 'ok');
        } else {
          throw new Error(out.message || 'Send failed');
        }
      } catch (err) {
        setStatus(
          'Couldn\'t send right now. You can WhatsApp me at +216 53 019 984 or email contact.achrefbenyaagoub@gmail.com.',
          'err'
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalLabel;
        }
      }
    });
  }

  // ---------------- project detail page ----------------
  const PROJECTS = {
    'deal': {
      title: 'Deal',
      tagline: 'A Gen Z marketplace to buy, sell, and swap fashion.',
      category: 'Mobile Application · Gen Z fashion',
      year: '2025',
      role: 'Product Designer & Flutter Developer',
      stack: ['Flutter', 'Dart', 'Supabase', 'Firebase Firestore', 'BaaS', 'SaaS'],
      description: [
        'Deal is a Gen Z mobile app built for small fashion brands and individuals who want to sell, buy, and swap clothes inside one vibrant community — think a marketplace, a thrift store, and a closet-trading circle, all in one feed.',
        'The product blends a traditional marketplace with a peer-to-peer swap experience. Micro-businesses list their inventory, while everyday users trade pieces directly with each other. Listings are short-form and visual-first, so browsing feels closer to a social app than a store.',
        'On the backend, Deal leans on a modern BaaS / SaaS stack: Supabase handles auth, Postgres, and storage, while Firebase Firestore powers real-time chat between buyers and sellers and live updates on offers. The Flutter client keeps the experience the same on iOS and Android.'
      ],
      external: { label: 'GitHub', href: 'https://github.com/Achref200' },
      cover: './assets/images/deal.png',
      gallery: ['./assets/images/deal.png', './assets/images/deal.png']
    },

    'postuly': {
      title: 'Postuly Tn',
      tagline: 'The Tunisian career hub for students and first-job seekers.',
      category: 'Career platform · Tunisia',
      year: '2025',
      role: 'Product Designer & Mobile Developer',
      stack: ['Flutter', 'Dart', 'Supabase', 'REST APIs'],
      description: [
        'Postuly Tn is a one-stop career platform built for Tunisian students and recent graduates — a single place to search for PFE topics, reference books, internships, first jobs, and open application calls.',
        'Today, that information is scattered across LinkedIn posts, Facebook groups, and university notice boards. Postuly centralises those listings and matches them to the user\'s field of study, graduation year, and the kind of opportunity they\'re hunting for.',
        'The experience also covers the full application loop: candidates apply in a few taps from a structured profile, recruiters review consistent applications, and graduates get notified the moment something relevant goes live.'
      ],
      external: { label: 'LinkedIn', href: 'https://www.linkedin.com/company/postulytn/?viewAsMember=true' },
      cover: './assets/images/postuly1.jpeg',
      gallery: ['./assets/images/postuly1.jpeg', './assets/images/postuly2.jpeg']
    },

    'dubai-offshore': {
      title: 'Dubai Offshore',
      tagline: 'A corporate web presence for an offshore consultancy.',
      category: 'Web Development',
      year: '2024',
      role: 'Designer & Front-end Developer',
      stack: ['Next.js', 'React', 'Tailwind CSS', 'Vercel'],
      description: [
        'A modern corporate site for an offshore consultancy based in Dubai — built to feel premium, trustworthy, and fast on every device.',
        'The site walks visitors through services, company structure, and contact in a single fluid scroll, with subtle motion and a strict typographic system that keeps it elegant rather than salesy.'
      ],
      external: { label: 'Live site', href: 'https://dubaii-offshore.vercel.app/' },
      cover: './assets/images/dubai_project.png',
      gallery: []
    },

    'digivolution': {
      title: 'Digivolution Agency',
      tagline: 'A bold marketing site for a digital agency.',
      category: 'Web Development',
      year: '2024',
      role: 'UI/UX Designer & Developer',
      stack: ['Angular', 'TypeScript', 'HTML', 'CSS', 'GSAP'],
      description: [
        'A full marketing site for Digivolution, a digital agency focused on branding and growth. The design balances strong typography with motion to communicate energy without becoming noisy.',
        'Built from the ground up — wireframes in Figma, then shipped as a responsive, hand-coded front-end.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/gallery/210961279/Digivolution-Website' },
      cover: './assets/images/digivolutio_project.png',
      gallery: []
    },

    'planet-food': {
      title: 'Planet Food',
      tagline: 'A food delivery concept with a clean, friendly UI.',
      category: 'Web Development',
      year: '2023',
      role: 'Designer & Developer',
      stack: ['Angular', 'TypeScript', 'HTML', 'CSS'],
      description: [
        'A front-end project exploring how a food delivery experience can feel warmer and less transactional — generous typography, soft colour blocks, and a focus on the food itself.'
      ],
      external: { label: 'Code', href: 'https://github.com/Achref200/project_web_dev' },
      cover: './assets/images/planetfood_project.png',
      gallery: ['./assets/images/food.png']
    },

    'travel-website': {
      title: 'Travel Website',
      tagline: 'A travel discovery site built around big imagery.',
      category: 'Web Development',
      year: '2023',
      role: 'Designer & Front-end Developer',
      stack: ['Angular', 'TypeScript', 'HTML', 'CSS'],
      description: [
        'A travel discovery site that puts destinations front and centre with edge-to-edge imagery and a quiet, editorial typography system.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/gallery/197091877/Travel-Website' },
      cover: './assets/images/travel_project.png',
      gallery: []
    },

    'i-filter': {
      title: 'I Filter',
      tagline: 'A mobile app for visual content filtering.',
      category: 'Mobile UI/UX Design',
      year: '2024',
      role: 'Product Designer',
      stack: ['Figma', 'Auto Layout', 'Prototyping'],
      description: [
        'I Filter is a mobile app concept exploring how users can browse, filter, and curate visual content with as little friction as possible. The design system stays minimal so the imagery does the talking.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/gallery/210962863/I-FIlter-Mobile-App' },
      cover: './assets/images/design-5.png',
      gallery: []
    },

    'feelart': {
      title: 'FeelArt',
      tagline: 'A mobile experience for discovering art.',
      category: 'Mobile UI/UX Design',
      year: '2023',
      role: 'Product Designer',
      stack: ['Figma', 'Adobe XD'],
      description: [
        'FeelArt is a mobile app design for art lovers — browse pieces, follow artists, and curate personal collections inside a calm, gallery-like interface.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/gallery/169225771/FeelArt-Ui-Mobile-Design' },
      cover: './assets/images/feelart.png',
      gallery: []
    },

    'barbershop-flows': {
      title: 'Barbershop · Flows',
      tagline: 'Dual-app flows for users and barbers.',
      category: 'Mobile UI/UX Design',
      year: '2023',
      role: 'Product Designer',
      stack: ['Figma', 'User Flows'],
      description: [
        'A complete UX exploration of a barbershop booking platform — covering both the client-facing app and the barber-side dashboard, with full flows and edge-case handling.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/gallery/182840181/BarberShop-(-User-Barber-)-Flows-UI-UX-Design' },
      cover: null,
      gallery: []
    },

    'neurosleep': {
      title: 'NeuroSleep',
      tagline: 'A sleep-tracking app for a calmer mind.',
      category: 'Mobile UI/UX Design',
      year: '2024',
      role: 'Product Designer',
      stack: ['Figma'],
      description: [
        'NeuroSleep is a mobile concept for tracking sleep quality, building healthier rituals, and visualising progress without overwhelming the user with metrics.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/achrefbenyaa' },
      cover: './assets/images/Thumbnail.png',
      gallery: []
    },

    'recloth': {
      title: 'Recloth',
      tagline: 'A second-hand clothing app with a sustainable angle.',
      category: 'Mobile UI/UX Design',
      year: '2023',
      role: 'Product Designer',
      stack: ['Figma'],
      description: [
        'Recloth is a mobile-first concept for buying and reselling second-hand clothes, framed around a sustainability story rather than pure thrift.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/achrefbenyaa' },
      cover: './assets/images/design-3.png',
      gallery: []
    },

    'serfice': {
      title: 'Serfice',
      tagline: 'A services marketplace for everyday needs.',
      category: 'Mobile UI/UX Design',
      year: '2023',
      role: 'Product Designer',
      stack: ['Figma'],
      description: [
        'Serfice is a mobile design for a local services marketplace — connecting users to plumbers, electricians, cleaners, and more through a fast, trust-led interface.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/achrefbenyaa' },
      cover: './assets/images/serfice.png',
      gallery: []
    },

    'mobile-portfolio': {
      title: 'Mobile Portfolio',
      tagline: 'A pocket-sized version of my portfolio.',
      category: 'Mobile UI/UX Design',
      year: '2024',
      role: 'Designer',
      stack: ['Figma'],
      description: [
        'A mobile-first portfolio concept exploring how a personal site can feel native on a phone — gestures, transitions, and a content density tuned for the small screen.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/achrefbenyaa' },
      cover: './assets/images/mobile-portfolio.png',
      gallery: ['./assets/images/mobile-2.png', './assets/images/mobile-5.png', './assets/images/mobile-6.png']
    },

    'serenov': {
      title: 'Serenov · E-commerce',
      tagline: 'A responsive e-commerce experience.',
      category: 'Web design',
      year: '2023',
      role: 'Web Designer',
      stack: ['Figma'],
      description: [
        'Serenov is a responsive e-commerce design with a soft, editorial visual language — product-led, trust-led, and built to work across breakpoints without losing personality.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/gallery/176718625/Serenov-Responsive-web-design' },
      cover: './assets/images/design-2.png',
      gallery: ['./assets/images/design-2.png', './assets/images/design-3.png']
    },

    'recloth-web': {
      title: 'Recloth · Web',
      tagline: 'The desktop counterpart to the Recloth app.',
      category: 'Web design',
      year: '2023',
      role: 'Web Designer',
      stack: ['Figma'],
      description: [
        'A web edition of the Recloth concept — keeping the sustainability message front and centre while taking full advantage of the larger canvas for storytelling.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/achrefbenyaa' },
      cover: './assets/images/Recloth Web 1.png',
      gallery: []
    },

    'planet-food-web': {
      title: 'Planet Food · Web',
      tagline: 'The desktop version of Planet Food.',
      category: 'Web design',
      year: '2023',
      role: 'Web Designer',
      stack: ['Figma'],
      description: [
        'The web-design counterpart to Planet Food — the same warm, friendly tone scaled up for desktop with a clear menu, checkout, and account flow.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/achrefbenyaa' },
      cover: './assets/images/design-4.png',
      gallery: []
    },

    'travel-web': {
      title: 'Travel · Web',
      tagline: 'A desktop travel discovery experience.',
      category: 'Web design',
      year: '2023',
      role: 'Web Designer',
      stack: ['Figma'],
      description: [
        'The desktop-first take on the travel concept — wider imagery, deeper destination pages, and a planning flow that feels like flipping through a printed guide.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/achrefbenyaa' },
      cover: './assets/images/travel.png',
      gallery: []
    },

    'exsys': {
      title: 'Exsys',
      tagline: 'An enterprise mobile companion app.',
      category: 'Mobile Application',
      year: '2023',
      role: 'Flutter Developer',
      stack: ['Flutter', 'Dart', 'MVVM', 'Provider'],
      description: [
        'Exsys is a mobile companion to an enterprise ERP — built with Flutter on top of an MVVM + Provider architecture, with a strong focus on edge cases and offline behaviour.'
      ],
      external: { label: 'Behance', href: 'https://www.behance.net/achrefbenyaa' },
      cover: './assets/images/Exsys.png',
      gallery: []
    },

  
    'ai-assistant': {
      title: 'AI Assistant',
      tagline: 'A mobile AI assistant experiment.',
      category: 'Mobile Application',
      year: '2024',
      role: 'Flutter Developer',
      stack: ['Flutter', 'Dart', 'AI APIs'],
      description: [
        'An AI assistant mobile app, exploring how generative AI fits into a chat-first mobile interface — with streamed responses and a quiet, focused UI.'
      ],
      external: { label: 'GitHub', href: 'https://github.com/Achref200' },
      cover: './assets/images/Screenshot_2.png',
      gallery: []
    },

    'talent619': {
      title: 'Talent619',
      tagline: 'A talent-management mobile app.',
      category: 'Mobile Application',
      year: '2024',
      role: 'Flutter Developer',
      stack: ['Flutter', 'Dart'],
      description: [
        'Talent619 is a mobile platform for managing and showcasing talent — profiles, opportunities, and bookings, packaged into a clean Flutter app.'
      ],
      external: { label: 'GitHub', href: 'https://github.com/Achref200' },
      cover: './assets/images/mobile-6.png',
      gallery: []
    }
  };

  const FALLBACK_LINKS = {
    github: 'https://github.com/Achref200',
    behance: 'https://www.behance.net/achrefbenyaa'
  };

  const pickFallbackLink = (project) => {
    const cat = (project.category || '').toLowerCase();
    if (cat.includes('design')) {
      return { label: 'Behance', href: FALLBACK_LINKS.behance };
    }
    return { label: 'GitHub', href: FALLBACK_LINKS.github };
  };

  const projectRoot = $('[data-project-root]');
  if (projectRoot) {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const data = id && PROJECTS[id];

    const setText = (sel, value) => {
      const el = $(sel, projectRoot);
      if (el) el.textContent = value;
    };

    if (!data) {
      setText('[data-project-title]', 'Project not found');
      setText('[data-project-category]', '404');
      setText('[data-project-tagline]', "That project doesn't exist (yet). Head back to all work.");
      setText('[data-project-year]', '—');
      setText('[data-project-role]', '—');
      setText('[data-project-stack]', '—');
      setText('[data-project-links]', '—');
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
      const link = (data.external && data.external.href)
        ? data.external
        : pickFallbackLink(data);
      linksEl.innerHTML = '';
      const a = document.createElement('a');
      a.href = link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = `${link.label} ↗`;
      linksEl.appendChild(a);
    }

    // cover
    const coverSection = $('[data-project-cover-section]', projectRoot);
    const coverImg = $('[data-project-cover]', projectRoot);
    if (data.cover && coverImg && coverSection) {
      coverImg.src = data.cover;
      coverImg.alt = `${data.title} — cover`;
      coverSection.hidden = false;
    }

    // description
    const descEl = $('[data-project-description]', projectRoot);
    if (descEl && data.description && data.description.length) {
      descEl.innerHTML = '';
      data.description.forEach((p) => {
        const node = document.createElement('p');
        node.textContent = p;
        descEl.appendChild(node);
      });
    }
  }
})();
