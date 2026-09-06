import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RiRobot2Line, RiWhatsappLine, RiUserSearchLine, RiMoneyDollarCircleLine,
  RiCalendarCheckLine, RiLineChartLine, RiStore2Line, RiBriefcase4Line,
  RiShoppingCart2Line, RiGovernmentLine, RiTwitterXLine, RiLinkedinBoxLine,
  RiInstagramLine, RiFacebookBoxLine, RiMenuLine, RiCloseLine, RiCheckLine,
  RiStarFill, RiArrowRightLine, RiPlayCircleLine, RiSparklingLine, RiShieldCheckLine,
} from 'react-icons/ri';
import './Landing.css';

/* ── Content ──────────────────────────────────────────────────────────────── */
const STATS = ['9 AI Agents', '15+ Business Modules', 'Built for Africa', 'No coding needed'];

const FEATURES = [
  { icon: RiRobot2Line, emoji: '🤖', title: 'AI Knowledge Base', text: 'Upload your documents. Ask anything. AI answers instantly.' },
  { icon: RiWhatsappLine, emoji: '💬', title: 'WhatsApp AI Bot', text: 'AI handles customer WhatsApp messages 24/7. Human takeover in one click.' },
  { icon: RiUserSearchLine, emoji: '📊', title: 'Leads & CRM', text: 'Track leads, score them with AI, send AI-drafted follow-ups.' },
  { icon: RiMoneyDollarCircleLine, emoji: '💰', title: 'Invoices & Payments', text: 'Create invoices, track payments, send AI payment reminders.' },
  { icon: RiCalendarCheckLine, emoji: '📅', title: 'Appointments', text: 'Book appointments, send AI confirmation emails automatically.' },
  { icon: RiLineChartLine, emoji: '📈', title: 'AI Reports', text: 'One-click business reports with AI insights and recommendations.' },
];

const STEPS = [
  { n: 1, title: 'Create Your Workspace', text: 'Register and set up your company in minutes — no card required.' },
  { n: 2, title: 'Upload Your Documents', text: 'Add your business knowledge so the AI can answer like your best staff.' },
  { n: 3, title: 'Let AI Run Your Business', text: 'AI answers questions, sends reminders and manages leads while you focus on growth.' },
];

const PLANS = [
  {
    name: 'Starter', price: '4,900', popular: false,
    features: ['5 team members', '500 documents', '2,000 AI questions / month', 'WhatsApp AI bot', 'Leads, invoices & appointments', 'Email support'],
  },
  {
    name: 'Professional', price: '14,900', popular: true,
    features: ['25 team members', '2,000 documents', '10,000 AI questions / month', 'Everything in Starter', 'AI reports & analytics', 'Priority support'],
  },
  {
    name: 'Business', price: '34,900', popular: false,
    features: ['100 team members', '10,000 documents', '50,000 AI questions / month', 'Everything in Professional', 'All 9 AI agents', 'Dedicated onboarding'],
  },
];

const USE_CASES = [
  { icon: RiStore2Line, title: 'Small Businesses', text: 'Handle customer chats, invoices and bookings without hiring a bigger team.' },
  { icon: RiBriefcase4Line, title: 'Consultants', text: 'Turn your reports and playbooks into an AI assistant that never sleeps.' },
  { icon: RiShoppingCart2Line, title: 'E-commerce', text: 'Track orders, answer product questions and chase payments automatically.' },
  { icon: RiGovernmentLine, title: 'Government Agencies', text: 'Give citizens instant answers from official documents, 24 hours a day.' },
];

const TESTIMONIALS = [
  { name: 'Chidinma Okafor', company: 'Founder, Bloom Skincare Lagos', quote: 'BizlyAI answers our customers on WhatsApp before we even wake up. Our response time went from hours to seconds.' },
  { name: 'Emeka Nwosu', company: 'MD, Nwosu & Partners Consulting', quote: 'I replaced four subscriptions with BizlyAI. It drafts my follow-ups and payment reminders — it pays for itself.' },
  { name: 'Aisha Bello', company: 'Operations Lead, KanoMart', quote: 'Onboarding took an afternoon. Now the whole team tracks orders and invoices in one place.' },
];

const NAV_LINKS = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'Customers', id: 'testimonials' },
];

/* ── Brand mark ───────────────────────────────────────────────────────────── */
function Logo({ light = false }) {
  return (
    <span className={`lp-logo ${light ? 'light' : ''}`}>
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <defs>
          <linearGradient id="lpLogoG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#lpLogoG)" />
        <path d="M11 8h7.5a4.5 4.5 0 0 1 1.2 8.8A4.8 4.8 0 0 1 18.2 26H11V8Zm4 3.4v4.2h3.1a2.1 2.1 0 0 0 0-4.2H15Zm0 7.2v4.4h3.1a2.2 2.2 0 0 0 0-4.4H15Z" fill="#fff" />
      </svg>
      <span>Bizly<b>AI</b></span>
    </span>
  );
}

/* ── Hero dashboard mockup (inline SVG) ───────────────────────────────────── */
function DashboardMockup() {
  return (
    <svg className="lp-mockup" viewBox="0 0 640 420" role="img" aria-label="BizlyAI dashboard preview">
      <defs>
        <linearGradient id="lpm-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="lpm-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <filter id="lpm-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" floodColor="#312e81" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#lpm-shadow)">
        <rect x="16" y="16" width="608" height="388" rx="16" fill="#ffffff" />
        {/* window chrome */}
        <rect x="16" y="16" width="608" height="34" rx="16" fill="#f1f5f9" />
        <rect x="16" y="34" width="608" height="16" fill="#f1f5f9" />
        <circle cx="38" cy="33" r="4" fill="#f87171" />
        <circle cx="54" cy="33" r="4" fill="#fbbf24" />
        <circle cx="70" cy="33" r="4" fill="#34d399" />

        {/* sidebar */}
        <rect x="16" y="50" width="132" height="354" fill="#0f172a" />
        <rect x="32" y="70" width="90" height="10" rx="5" fill="#6366f1" />
        {[110, 134, 158, 182, 206].map((y, i) => (
          <rect key={y} x="32" y={y} width={i === 1 ? 96 : 78} height="8" rx="4" fill={i === 1 ? '#a5b4fc' : '#334155'} />
        ))}

        {/* stat cards */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${168 + i * 150}, 70)`}>
            <rect width="132" height="66" rx="10" fill="#f8fafc" stroke="#e2e8f0" />
            <rect x="14" y="14" width="52" height="7" rx="3.5" fill="#cbd5e1" />
            <rect x="14" y="30" width="72" height="14" rx="4" fill="#1e293b" />
            <rect x="14" y="50" width="40" height="6" rx="3" fill="#86efac" />
          </g>
        ))}

        {/* bar chart card */}
        <g transform="translate(168, 154)">
          <rect width="282" height="230" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
          <rect x="18" y="18" width="120" height="9" rx="4.5" fill="#94a3b8" />
          {[70, 130, 40, 160, 95, 185, 120].map((h, i) => (
            <rect key={i} x={22 + i * 37} y={200 - h} width="22" height={h} rx="5" fill="url(#lpm-bar)" />
          ))}
        </g>

        {/* AI insight card */}
        <g transform="translate(466, 154)">
          <rect width="142" height="230" rx="12" fill="#eef2ff" stroke="#c7d2fe" />
          <circle cx="28" cy="34" r="12" fill="#6366f1" />
          <path d="M23 34l4 4 7-8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="18" y="58" width="106" height="7" rx="3.5" fill="#a5b4fc" />
          <rect x="18" y="74" width="86" height="7" rx="3.5" fill="#c7d2fe" />
          <polyline points="18,150 40,120 62,134 84,96 106,110 124,74" fill="none" stroke="url(#lpm-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="18" y="176" width="106" height="30" rx="8" fill="#6366f1" />
          <rect x="34" y="188" width="74" height="7" rx="3.5" fill="#c7d2fe" />
        </g>
      </g>
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Reveal-on-scroll (progressive enhancement — content is visible without JS)
  useEffect(() => {
    const root = document.querySelector('.landing');
    if (!root) return;
    root.classList.add('reveal-ready');
    const items = root.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <button className="lp-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo />
          </button>

          <nav className="lp-nav-links">
            {NAV_LINKS.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)}>{l.label}</button>
            ))}
          </nav>

          <div className="lp-nav-cta">
            <Link to="/login" className="lp-btn lp-btn-ghost">Login</Link>
            <Link to="/register" className="lp-btn lp-btn-primary">Get Started Free</Link>
          </div>

          <button className="lp-nav-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <RiCloseLine /> : <RiMenuLine />}
          </button>
        </div>

        {menuOpen && (
          <div className="lp-nav-mobile">
            {NAV_LINKS.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)}>{l.label}</button>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" className="lp-btn lp-btn-primary" onClick={() => setMenuOpen(false)}>Get Started Free</Link>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-glow" aria-hidden="true" />
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-copy" data-reveal>
            <span className="lp-pill"><RiSparklingLine /> The AI operating system for your business</span>
            <h1>Run Your Entire Business With AI</h1>
            <p>
              BizlyAI replaces 6 business tools with one AI-powered platform. Manage leads,
              invoices, appointments, orders and more — all in one place.
            </p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">
                Start Free Trial <RiArrowRightLine />
              </Link>
              <button className="lp-btn lp-btn-glass lp-btn-lg" onClick={() => scrollTo('features')}>
                <RiPlayCircleLine /> Watch Demo
              </button>
            </div>
            <p className="lp-hero-note"><RiShieldCheckLine /> No credit card required · 14-day free trial</p>
          </div>

          <div className="lp-hero-visual" data-reveal>
            <DashboardMockup />
          </div>
        </div>

        {/* ── Stats bar ────────────────────────────────────────── */}
        <div className="lp-container">
          <div className="lp-stats" data-reveal>
            {STATS.map((s) => <div key={s} className="lp-stat">{s}</div>)}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <h2>Everything Your Business Needs</h2>
            <p>One login. One bill. Every tool your team reaches for, powered by AI.</p>
          </div>
          <div className="lp-grid lp-grid-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="lp-card lp-feature" data-reveal style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                  <span className="lp-feature-icon"><Icon /></span>
                  <h3>{f.emoji} {f.title}</h3>
                  <p>{f.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <h2>Get Started in 3 Steps</h2>
            <p>Most teams are live the same day they sign up.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-step" data-reveal>
                <span className="lp-step-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="lp-section">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <h2>Simple, Transparent Pricing</h2>
            <p>Save 20% with annual billing. Cancel anytime.</p>
          </div>
          <div className="lp-grid lp-grid-3 lp-pricing">
            {PLANS.map((p) => (
              <article key={p.name} className={`lp-card lp-plan ${p.popular ? 'popular' : ''}`} data-reveal>
                {p.popular && <span className="lp-plan-tag">Most Popular</span>}
                <h3>{p.name}</h3>
                <div className="lp-plan-price">
                  <span className="lp-plan-currency">₦</span>{p.price}
                  <span className="lp-plan-per">/mo</span>
                </div>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}><RiCheckLine /> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className={`lp-btn lp-btn-lg ${p.popular ? 'lp-btn-primary' : 'lp-btn-outline'}`}>
                  Get Started
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ──────────────────────────────────────────── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <h2>Built for Nigerian &amp; African Businesses</h2>
            <p>Priced in Naira. Tuned for how business really works here.</p>
          </div>
          <div className="lp-grid lp-grid-4">
            {USE_CASES.map((u) => {
              const Icon = u.icon;
              return (
                <article key={u.title} className="lp-card lp-usecase" data-reveal>
                  <span className="lp-usecase-icon"><Icon /></span>
                  <h3>{u.title}</h3>
                  <p>{u.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────── */}
      <section id="testimonials" className="lp-section">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <h2>Loved by growing teams</h2>
            <p>Real operators running leaner with BizlyAI.</p>
          </div>
          <div className="lp-grid lp-grid-3">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="lp-card lp-quote" data-reveal>
                <div className="lp-stars">
                  {Array.from({ length: 5 }).map((_, i) => <RiStarFill key={i} />)}
                </div>
                <p className="lp-quote-text">“{t.quote}”</p>
                <div className="lp-quote-author">
                  <span className="lp-avatar">{t.name[0]}</span>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.company}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-container lp-cta-inner" data-reveal>
          <h2>Ready to Transform Your Business?</h2>
          <p>Join hundreds of businesses already using BizlyAI.</p>
          <Link to="/register" className="lp-btn lp-btn-lg lp-btn-onbrand">
            Start Free Trial <RiArrowRightLine />
          </Link>
          <span className="lp-cta-note">No credit card required. 14-day free trial.</span>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <Logo light />
            <p>The AI operating system for growing African businesses.</p>
            <div className="lp-socials">
              <a href="https://twitter.com" aria-label="Twitter / X" target="_blank" rel="noreferrer"><RiTwitterXLine /></a>
              <a href="https://linkedin.com" aria-label="LinkedIn" target="_blank" rel="noreferrer"><RiLinkedinBoxLine /></a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer"><RiInstagramLine /></a>
              <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer"><RiFacebookBoxLine /></a>
            </div>
          </div>

          <nav className="lp-footer-links">
            <button onClick={() => scrollTo('features')}>Features</button>
            <button onClick={() => scrollTo('pricing')}>Pricing</button>
            <button onClick={() => scrollTo('testimonials')}>About</button>
            <a href="mailto:henryengrakpan@gmail.com">Contact</a>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </nav>
        </div>
        <div className="lp-container lp-footer-bottom">
          © 2026 BizlyAI by EngrHenryTech. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
