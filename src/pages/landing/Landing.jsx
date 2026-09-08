import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RiRobot2Line, RiWhatsappLine, RiUserSearchLine, RiMoneyDollarCircleLine,
  RiCalendarCheckLine, RiLineChartLine, RiStore2Line, RiBriefcase4Line,
  RiShoppingCart2Line, RiGovernmentLine, RiTwitterXLine, RiLinkedinBoxLine,
  RiInstagramLine, RiFacebookBoxLine, RiMenuLine, RiCloseLine, RiCheckLine,
  RiStarFill, RiArrowRightLine, RiPlayCircleLine, RiSparklingLine, RiShieldCheckLine,
  RiArrowDownSLine,
} from 'react-icons/ri';
import './Landing.css';

/* ── Content ──────────────────────────────────────────────────────────────── */
const STATS = [
  { value: '500+ Businesses', sub: 'already on BizlyAI' },
  { value: '99.9% Uptime', sub: 'guaranteed reliability' },
  { value: '9 AI Agents', sub: 'specialized for business' },
  { value: '< 2 seconds', sub: 'average AI response time' },
];

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

const FAQS = [
  { q: 'Do I need technical knowledge to use BizlyAI?', a: 'No. BizlyAI is designed for business owners, not developers. If you can use WhatsApp, you can use BizlyAI. Setup takes less than 30 minutes.' },
  { q: 'How does the AI know about my business?', a: 'You upload your business documents — price lists, policies, product info, FAQs — and BizlyAI reads them. After that, the AI answers questions exactly like your best staff would.' },
  { q: 'Can I use it on my phone?', a: 'Yes. BizlyAI works on any device — phone, tablet, or computer. No app download needed.' },
  { q: 'What happens to my data?', a: 'Your data is stored securely and is completely private. Other businesses on BizlyAI cannot see your data. We use bank-grade encryption.' },
  { q: 'Does the WhatsApp bot work with my existing WhatsApp number?', a: 'Yes. You connect your existing WhatsApp Business number — no new number needed. Your customers keep chatting on the same number they already know.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. Cancel anytime from your billing settings. Your data is available for 30 days after cancellation.' },
  { q: 'Do you offer support?', a: 'Yes. All plans include email support. Professional and Business plans include priority support. You can also reach us directly on WhatsApp.' },
  { q: 'Is pricing in Naira?', a: 'Yes. All prices are in Nigerian Naira (₦). We accept cards and bank transfer via Paystack. No international card needed.' },
];

const NAV_LINKS = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'FAQ', id: 'faq' },
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

/* ── Hero dashboard mockup (inline SVG — realistic app screenshot) ─────────── */
function DashboardMockup() {
  const nav = [
    { label: 'Overview', active: true },
    { label: 'AI Assistant' },
    { label: 'Knowledge' },
    { label: 'Leads' },
    { label: 'Invoices' },
  ];
  const stats = [
    { label: 'Revenue', value: '₦2.4M', tint: '#6366f1', delta: '+18%' },
    { label: 'Active Leads', value: '47', tint: '#10b981', delta: '+6' },
    { label: 'Appointments', value: '12', tint: '#f59e0b', delta: 'today' },
  ];

  return (
    <svg className="lp-mockup" viewBox="0 0 640 452" role="img" aria-label="BizlyAI dashboard preview">
      <defs>
        <linearGradient id="lpm-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <filter id="lpm-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="26" floodColor="#1e1b4b" floodOpacity="0.4" />
        </filter>
        <clipPath id="lpm-clip"><rect x="8" y="8" width="624" height="436" rx="16" /></clipPath>
      </defs>

      <g filter="url(#lpm-shadow)">
        <rect x="8" y="8" width="624" height="436" rx="16" fill="#ffffff" />
      </g>

      <g clipPath="url(#lpm-clip)" fontFamily="Inter, system-ui, sans-serif">
        {/* ── browser chrome ── */}
        <rect x="8" y="8" width="624" height="42" fill="#f1f3f8" />
        <circle cx="30" cy="29" r="4.5" fill="#f87171" />
        <circle cx="46" cy="29" r="4.5" fill="#fbbf24" />
        <circle cx="62" cy="29" r="4.5" fill="#34d399" />
        <rect x="86" y="18" width="330" height="22" rx="11" fill="#ffffff" stroke="#e2e6ef" />
        <circle cx="100" cy="29" r="3" fill="none" stroke="#10b981" strokeWidth="1.6" />
        <text x="112" y="33" fontSize="11" fill="#64748b">bislyai.com/dashboard</text>

        {/* ── sidebar ── */}
        <rect x="8" y="50" width="150" height="402" fill="#0f172a" />
        <rect x="24" y="68" width="20" height="20" rx="6" fill="url(#lpm-brand)" />
        <text x="52" y="83" fontSize="13" fontWeight="700" fill="#ffffff">BizlyAI</text>
        {nav.map((n, i) => {
          const y = 112 + i * 34;
          return (
            <g key={n.label}>
              {n.active && <rect x="14" y={y - 10} width="138" height="28" rx="8" fill="#6366f1" fillOpacity="0.22" />}
              <circle cx="30" cy={y + 4} r="3.5" fill={n.active ? '#a5b4fc' : '#475569'} />
              <text x="44" y={y + 8} fontSize="12" fontWeight={n.active ? 600 : 400} fill={n.active ? '#ffffff' : '#94a3b8'}>{n.label}</text>
            </g>
          );
        })}
        <rect x="14" y="404" width="130" height="34" rx="8" fill="#1e293b" />
        <circle cx="33" cy="421" r="9" fill="url(#lpm-brand)" />
        <text x="48" y="425" fontSize="10.5" fill="#cbd5e1">Henry · Owner</text>

        {/* ── main content ── */}
        <text x="176" y="80" fontSize="15" fontWeight="700" fill="#0f172a">Good morning, Henry</text>
        <text x="176" y="98" fontSize="11" fill="#94a3b8">Here's what's happening today</text>

        {stats.map((s, i) => {
          const x = 176 + i * 154;
          return (
            <g key={s.label}>
              <rect x={x} y="112" width="140" height="78" rx="12" fill="#ffffff" stroke="#e8e8f2" />
              <rect x={x + 14} y="126" width="22" height="22" rx="6" fill={s.tint} fillOpacity="0.16" />
              <circle cx={x + 25} cy={137} r="4" fill={s.tint} />
              <text x={x + 14} y="166" fontSize="18" fontWeight="800" fill="#0f172a">{s.value}</text>
              <text x={x + 14} y="181" fontSize="10" fill="#94a3b8">{s.label}</text>
              <text x={x + 126} y="140" fontSize="9.5" fontWeight="700" fill="#10b981" textAnchor="end">{s.delta}</text>
            </g>
          );
        })}

        {/* ── AI chat card ── */}
        <rect x="176" y="206" width="294" height="176" rx="12" fill="#faf9ff" stroke="#e9e5fb" />
        <circle cx="196" cy="228" r="9" fill="url(#lpm-brand)" />
        <path d="M191.5 228l3 3 5.5-6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="214" y="232" fontSize="11.5" fontWeight="700" fill="#0f172a">AI Assistant</text>

        {/* user bubble */}
        <rect x="250" y="248" width="204" height="30" rx="10" fill="#6366f1" />
        <text x="352" y="267" fontSize="10.5" fill="#ffffff" textAnchor="middle">What are our top products?</text>
        {/* AI bubble */}
        <rect x="192" y="288" width="262" height="82" rx="10" fill="#ffffff" stroke="#e9e5fb" />
        <text x="206" y="308" fontSize="10.5" fill="#334155">Your top 3 sellers this month:</text>
        <text x="206" y="324" fontSize="10.5" fontWeight="600" fill="#0f172a">Shea Butter Kit · Vitamin C Serum</text>
        <text x="206" y="340" fontSize="10.5" fontWeight="600" fill="#0f172a">African Black Soap</text>
        <text x="206" y="357" fontSize="9.5" fill="#94a3b8">— 62% of total sales · source: price-list-2026.pdf</text>

        {/* ── knowledge / document card ── */}
        <rect x="484" y="206" width="140" height="176" rx="12" fill="#ffffff" stroke="#e8e8f2" />
        <text x="500" y="230" fontSize="11" fontWeight="700" fill="#0f172a">Knowledge</text>
        {[
          { name: 'price-list-2026.pdf', ready: true },
          { name: 'return-policy.docx', ready: true },
          { name: 'catalog-q1.pdf', ready: false },
        ].map((d, i) => {
          const y = 244 + i * 42;
          return (
            <g key={d.name}>
              <rect x="498" y={y} width="112" height="32" rx="7" fill="#f8fafc" />
              <rect x="506" y={y + 8} width="12" height="16" rx="2" fill="#c7d2fe" />
              <text x="524" y={y + 15} fontSize="7.5" fill="#475569">{d.name.length > 15 ? d.name.slice(0, 14) + '…' : d.name}</text>
              {d.ready ? (
                <>
                  <rect x="524" y={y + 19} width="34" height="9" rx="4.5" fill="#10b981" fillOpacity="0.16" />
                  <text x="541" y={y + 26} fontSize="6.5" fontWeight="700" fill="#10b981" textAnchor="middle">READY</text>
                </>
              ) : (
                <>
                  <rect x="524" y={y + 19} width="46" height="9" rx="4.5" fill="#f59e0b" fillOpacity="0.16" />
                  <text x="547" y={y + 26} fontSize="6.5" fontWeight="700" fill="#f59e0b" textAnchor="middle">INDEXING</text>
                </>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

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
            {STATS.map((s) => (
              <div key={s.value} className="lp-stat">
                <span className="lp-stat-value">{s.value}</span>
                <span className="lp-stat-sub">{s.sub}</span>
              </div>
            ))}
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

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section id="faq" className="lp-section lp-section-alt">
        <div className="lp-container lp-faq-wrap">
          <div className="lp-head" data-reveal>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know before getting started</p>
          </div>
          <div className="lp-faq" data-reveal>
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className={`lp-faq-item ${open ? 'open' : ''}`}>
                  <button
                    className="lp-faq-q"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? -1 : i)}
                  >
                    <span>{f.q}</span>
                    <RiArrowDownSLine className="lp-faq-chev" />
                  </button>
                  <div className="lp-faq-a"><div><p>{f.a}</p></div></div>
                </div>
              );
            })}
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
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </div>
        <div className="lp-container lp-footer-bottom">
          © {new Date().getFullYear()} BizlyAI by EngrHenryTech. All rights reserved.
        </div>
      </footer>

      {/* ── Floating WhatsApp button ───────────────────────────── */}
      <a
        className="lp-wa-fab"
        href="https://wa.me/2349028361165"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with us on WhatsApp"
      >
        <RiWhatsappLine />
        <span className="lp-wa-tip">Chat with us on WhatsApp</span>
      </a>
    </div>
  );
}
