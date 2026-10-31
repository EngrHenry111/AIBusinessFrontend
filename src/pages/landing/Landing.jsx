import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiRobot2Line, RiWhatsappLine, RiUserSearchLine, RiMoneyDollarCircleLine,
  RiCalendarCheckLine, RiLineChartLine, RiStore2Line, RiBriefcase4Line,
  RiShoppingCart2Line, RiGovernmentLine, RiTwitterXLine, RiLinkedinBoxLine,
  RiInstagramLine, RiFacebookBoxLine, RiMenuLine, RiCloseLine, RiCheckLine,
  RiStarFill, RiArrowRightLine, RiPlayCircleLine, RiSparklingLine, RiShieldCheckLine,
  RiArrowDownSLine, RiMailLine, RiLockLine, RiFileList3Line, RiCloudLine, RiBankCardLine,
  RiGlobalLine, RiTimeLine, RiFileCopyLine, RiGroupLine, RiGiftLine, RiRepeatLine,
  RiAwardLine, RiTruckLine, RiTeamLine, RiVipCrownLine,
} from 'react-icons/ri';
import useSeo from '../../hooks/useSeo';
import { rememberReferralCode } from '../../constants/referral';
import BrandMark from '../../components/brand/BrandMark';
import './Landing.css';

const SUPPORT_EMAIL = 'support@bislyai.com';

// mailto: only works when the browser/OS has a mail client registered as a
// handler — plenty of setups (Chrome with no default Mail app, ChromeOS,
// most work machines) have none, so the link silently does nothing. Copying
// the address is the one fallback that always works everywhere.
function copyEmail() {
  const done = () => toast.success(`Copied ${SUPPORT_EMAIL} to your clipboard`);
  const fail = () => toast.error(`Could not copy — email us at ${SUPPORT_EMAIL}`);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(SUPPORT_EMAIL).then(done, fail);
    return;
  }
  // Fallback for browsers without the async Clipboard API.
  try {
    const el = document.createElement('textarea');
    el.value = SUPPORT_EMAIL;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    done();
  } catch {
    fail();
  }
}

/* ── Content ──────────────────────────────────────────────────────────────── */
const STATS = [
  { value: '500+ Businesses', sub: 'already on BizlyAI' },
  { value: '99.9% Uptime', sub: 'guaranteed reliability' },
  { value: '9 AI Agents', sub: 'specialized for business' },
  { value: '< 2 seconds', sub: 'average AI response time' },
];

const SECURITY_BADGES = [
  { icon: RiLockLine, label: '256-bit Encryption' },
  { icon: RiShieldCheckLine, label: '2FA Available' },
  { icon: RiFileList3Line, label: 'Full Audit Log' },
  { icon: RiCloudLine, label: 'Enterprise Hosting' },
  { icon: RiBankCardLine, label: 'PCI DSS Payments' },
];

const FEATURES = [
  { icon: RiRobot2Line, emoji: '🤖', title: 'AI Knowledge Base for Nigerian Businesses', text: 'Upload your documents. Ask anything. AI answers instantly in seconds.' },
  { icon: RiWhatsappLine, emoji: '💬', title: 'WhatsApp AI Bot — Handle Customer Chats Automatically', text: 'A WhatsApp business bot for Nigeria that replies to customers 24/7. Human takeover in one click.' },
  { icon: RiUserSearchLine, emoji: '📊', title: 'Leads & CRM Software for Nigerian SMEs', text: 'Track leads, score them with AI and send AI-drafted follow-ups from one CRM.' },
  { icon: RiMoneyDollarCircleLine, emoji: '💰', title: 'Invoice & Payment Software — Accept Paystack Payments', text: 'Create invoices, accept Paystack payments and send AI payment reminders automatically.' },
  { icon: RiStore2Line, emoji: '📦', title: 'Inventory Management — Track Your Stock in Real Time', text: 'Inventory management software for Nigeria: live stock levels, low-stock alerts and product catalogue.' },
  { icon: RiLineChartLine, emoji: '📈', title: 'Business Reports & AI Insights', text: 'One-click profit & loss, expense tracking and AI recommendations for your business.' },
];

const COMMERCE_FEATURES = [
  { icon: RiStore2Line, emoji: '🛍️', title: 'Your Own Online Store', text: 'A branded storefront with Paystack checkout, pay-on-delivery, coupons and flash sales — live in minutes.' },
  { icon: RiTruckLine, emoji: '📦', title: 'Real Delivery Tracking', text: 'Real tracking numbers via GIG Logistics, Kwik Delivery or Sendbox — or track manually, no API required.' },
  { icon: RiGroupLine, emoji: '🔥', title: 'Group Buying Deals', text: '"Get 5 friends to order together and everyone saves" — automatic group discounts with live progress and instant payouts.' },
  { icon: RiRepeatLine, emoji: '🔁', title: 'Subscriptions & Recurring Orders', text: 'Weekly food boxes, monthly beauty boxes — automatic recurring billing and delivery, on autopilot.' },
  { icon: RiGiftLine, emoji: '🎁', title: 'Digital Gift Cards', text: 'Sell gift cards customers can redeem at checkout — a new revenue channel with zero extra inventory.' },
  { icon: RiAwardLine, emoji: '⭐', title: 'Loyalty & Rewards', text: 'Points, tiers and automatic discounts that turn one-time buyers into repeat customers.' },
  { icon: RiGovernmentLine, emoji: '🏛️', title: 'e-Procurement for Enterprise & Government', text: 'Vendor management, requisitions, multi-level approvals and budgets — built for larger organizations.' },
  { icon: RiTeamLine, emoji: '👥', title: 'Team & Departments', text: 'Invite your team, tag them by department — Finance, Sales, Auditors — and control exactly who can do what.' },
];

const STEPS = [
  { n: 1, title: 'Create Your Workspace', text: 'Register and set up your company in minutes — no card required.' },
  { n: 2, title: 'Upload Your Documents', text: 'Add your business knowledge so the AI can answer like your best staff.' },
  { n: 3, title: 'Let AI Run Your Business', text: 'AI answers questions, sends reminders and manages leads while you focus on growth.' },
];

const PLANS = [
  {
    name: 'Starter', price: '4,900', popular: false,
    features: ['5 team members', '500 documents', '2,000 AI questions / month', 'WhatsApp AI bot', 'AI chat widget (your store only)', 'Leads, invoices & appointments', 'Email support'],
  },
  {
    name: 'Professional', price: '14,900', popular: true,
    features: ['25 team members', '2,000 documents', '10,000 AI questions / month', 'Everything in Starter', 'Embed AI chat widget on 1 external website', 'AI reports & analytics', 'Priority support'],
  },
  {
    name: 'Business', price: '34,900', popular: false,
    features: ['100 team members', '10,000 documents', '50,000 AI questions / month', 'Everything in Professional', 'Embed AI chat widget on unlimited websites', 'All 9 AI agents', 'Dedicated onboarding'],
  },
];

const ENTERPRISE_PLAN = {
  name: 'Enterprise',
  features: [
    'Unlimited team members & documents', 'Unlimited AI questions', 'e-Procurement module',
    'White-label options', 'Dedicated account manager', 'SLA guarantee (99.9% uptime)',
    'Government compliance package', 'Custom integrations & API access',
  ],
};

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
  { q: 'Can I sell online and track deliveries?', a: 'Yes. Every plan includes a branded online store with Paystack checkout, pay-on-delivery, coupons, gift cards, subscriptions and group-buy deals. For delivery, connect GIG Logistics, Kwik Delivery or Sendbox for real tracking numbers, or track manually with no API required — your customers can follow their order on a public tracking page either way.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. Cancel anytime from your billing settings. Your data is available for 30 days after cancellation.' },
  { q: 'Do you offer support?', a: 'Yes. All plans include email support. Professional and Business plans include priority support. You can also reach us directly on WhatsApp.' },
  { q: 'Is pricing in Naira?', a: 'Yes. All prices are in Nigerian Naira (₦). We accept cards and bank transfer via Paystack. No international card needed.' },
];

const NAV_LINKS = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'FAQ', id: 'faq' },
  { label: 'Contact', id: 'contact' },
];

// api.whatsapp.com works reliably across every device/browser — wa.me can
// bounce through an app-store/download interstitial on some setups instead
// of opening the chat directly.
const WHATSAPP_PHONE = '2349028361165';
const waLink = (text) => `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(text)}`;
const WHATSAPP_URL = waLink("Hi, I'm interested in BizlyAI");
const DEMO_URL = waLink("Hi, I'd like to book a demo of BizlyAI");
// No target="_blank" on this one — see the render site below for why.
const EMAIL_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('BizlyAI Enquiry')}`;

const CONTACT_CARDS = [
  {
    icon: RiWhatsappLine,
    title: 'Chat with us on WhatsApp',
    text: 'Message our team and get a reply, usually within minutes.',
    cta: 'Open WhatsApp',
    href: WHATSAPP_URL,
  },
  {
    icon: RiMailLine,
    title: 'Send us an email',
    text: 'Prefer email? Reach us any time and we’ll get back to you.',
    cta: 'Send Email',
    href: EMAIL_URL,
  },
  {
    icon: RiPlayCircleLine,
    title: 'See it in action',
    text: 'Book a live walkthrough and see how BizlyAI fits your business.',
    cta: 'Book a Demo',
    href: DEMO_URL,
  },
];

/* ── Brand mark ───────────────────────────────────────────────────────────── */
function Logo({ light = false }) {
  return (
    <span className={`lp-logo ${light ? 'light' : ''}`}>
      <BrandMark size={34} />
      <span>Bizly<b>AI</b></span>
    </span>
  );
}

/* ── Hero chat card ───────────────────────────────────────────────────────── */
function HeroChat() {
  return (
    <div className="lp-chat" role="img" aria-label="BizlyAI AI Assistant answering a question about top products">
      <div className="lp-chat-head">
        <BrandMark size={38} />
        <div>
          <strong>AI Assistant</strong>
          <span><i /> online</span>
        </div>
      </div>
      <div className="lp-chat-body" aria-hidden="true">
        <div className="lp-msg in"><div className="lp-bubble">What are our top products?</div></div>
        <div className="lp-msg out">
          <div className="lp-bubble">
            Your top 3 sellers this month:
            <strong>Shea Butter Kit · Vitamin C Serum</strong>
            <strong>African Black Soap</strong>
          </div>
        </div>
        <div className="lp-msg out">
          <div className="lp-bubble">
            62% of total sales
            <span className="lp-msg-link"><RiFileList3Line /> price-list-2026.pdf <RiArrowRightLine /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useSeo({ path: '/' }); // canonical + og:url only — title is managed below

  // bislyai.com/?ref=CODE — keep the referral code for when they sign up.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) rememberReferralCode(ref);
  }, []);

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

  // Schema.org SoftwareApplication for rich results. The Organization/WebSite
  // brand entity lives in index.html so non-JS crawlers see it too.
  useEffect(() => {
    const graph = [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'BizlyAI',
        alternateName: ['Bizly AI', 'Bizly', 'BislyAI'],
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        url: 'https://bislyai.com',
        description: 'AI-powered business management platform for Nigerian businesses, with a built-in online store, delivery tracking, and e-procurement for enterprise.',
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: '4900',
          highPrice: '34900',
          priceCurrency: 'NGN',
          offerCount: '3',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '47',
        },
        publisher: { '@id': 'https://bislyai.com/#organization' },
        author: { '@type': 'Organization', name: 'EngrHenryTech', url: 'https://bislyai.com' },
      },
    ];
    const nodes = graph.map((data) => {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.dataset.seo = 'bizlyai';
      el.text = JSON.stringify(data);
      document.head.appendChild(el);
      return el;
    });
    return () => nodes.forEach((n) => n.remove());
  }, []);

  // SPA section-aware <title> for crawlers that execute JS
  useEffect(() => {
    const original = document.title;
    const DEFAULT_TITLE = 'BizlyAI (Bizly AI) — AI Business Management Software for Nigeria';
    const SECTION_TITLES = {
      features: 'BizlyAI Features — 15+ Business Modules',
      pricing: 'BizlyAI Pricing — From ₦4,900/month',
    };
    document.title = DEFAULT_TITLE;
    const targets = ['features', 'pricing']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    let io;
    if (targets.length && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        document.title = visible ? (SECTION_TITLES[visible.target.id] || DEFAULT_TITLE) : DEFAULT_TITLE;
      }, { threshold: [0.25, 0.5] });
      targets.forEach((t) => io.observe(t));
    }
    return () => { if (io) io.disconnect(); document.title = original; };
  }, []);

  return (
    <div className="landing">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className={`lp-nav ${scrolled || menuOpen ? 'scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <button className="lp-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo light />
          </button>

          <nav className="lp-nav-links">
            {NAV_LINKS.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)}>{l.label}</button>
            ))}
            <Link to="/market">Marketplace</Link>
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
            <Link to="/market" onClick={() => setMenuOpen(false)}>Marketplace</Link>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" className="lp-btn lp-btn-primary" onClick={() => setMenuOpen(false)}>Get Started Free</Link>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-grid" aria-hidden="true" />
        <div className="lp-hero-glow" aria-hidden="true" />
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-copy" data-reveal>
            <span className="lp-pill"><RiSparklingLine /> The AI operating system for your business</span>
            <h1>Run Your Entire Business <em>With AI</em></h1>
            <p>
              BizlyAI replaces 6 business tools with one AI-powered platform. Manage leads,
              invoices, appointments and orders, run your own online store, and track real
              deliveries — all in one place.
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
            <HeroChat />
            <div className="lp-float lp-float-paid" aria-hidden="true">
              <span className="lp-float-icon"><RiCheckLine /></span>
              <div><small>Revenue · +18%</small><strong>₦2.4M</strong></div>
            </div>
            <div className="lp-float lp-float-lead" aria-hidden="true">
              <span className="lp-float-icon"><RiUserSearchLine /></span>
              <div><small>Active Leads · +6</small><strong>47</strong></div>
            </div>
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

          {/* ── Security badges ─────────────────────────────────── */}
          <Link to="/security" className="lp-security-badges" data-reveal aria-label="Learn about BizlyAI security">
            {SECURITY_BADGES.map((b) => {
              const Icon = b.icon;
              return (
                <span key={b.label} className="lp-security-badge">
                  <Icon /> {b.label}
                </span>
              );
            })}
          </Link>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <span className="lp-eyebrow">Features</span>
            <h2>Everything Your Business Needs</h2>
            <p>One login. One bill. Every tool your team reaches for, powered by AI.</p>
          </div>
          <div className="lp-grid lp-grid-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="lp-card lp-feature" data-reveal style={{ '--d': `${(i % 3) * 60}ms` }}>
                  <span className="lp-feature-icon"><Icon /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Commerce & Team ────────────────────────────────────── */}
      <section id="commerce" className="lp-section lp-section-alt">
        <div className="lp-container lp-split">
          <div className="lp-split-head" data-reveal>
            <span className="lp-eyebrow">Commerce</span>
            <h2>Sell Online, Get Paid, Get Delivered</h2>
            <p>A built-in store, real delivery tracking and the team tools to run it all — no extra plugins.</p>
          </div>
          <div className="lp-points">
            {COMMERCE_FEATURES.map((f, i) => (
              <article key={f.title} className="lp-point" data-reveal style={{ '--d': `${(i % 4) * 60}ms` }}>
                <RiCheckLine />
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how" className="lp-section">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <span className="lp-eyebrow">How it works</span>
            <h2>Get Started in 3 Steps</h2>
            <p>Most teams are live the same day they sign up.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-step" data-reveal>
                <span className="lp-step-num">{String(s.n).padStart(2, '0')}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <h2>Simple, Transparent Pricing</h2>
            <p>Save 20% with annual billing. Cancel anytime.</p>
          </div>
          <div className="lp-grid lp-grid-4 lp-pricing">
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

            <article className="lp-card lp-plan enterprise" data-reveal>
              <span className="lp-plan-tag enterprise-tag"><RiVipCrownLine /> Enterprise</span>
              <h3>Enterprise</h3>
              <div className="lp-plan-price"><span className="lp-plan-custom">Custom Pricing</span></div>
              <p className="lp-plan-note">For large organizations and government agencies.</p>
              <ul>
                {ENTERPRISE_PLAN.features.map((f) => (
                  <li key={f}><RiCheckLine /> {f}</li>
                ))}
              </ul>
              <a href={waLink("I'm interested in BizlyAI Enterprise plan")} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-lg lp-btn-enterprise">
                Contact Sales
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* ── Use cases ──────────────────────────────────────────── */}
      <section className="lp-section">
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
      <section id="testimonials" className="lp-section lp-section-alt">
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

      {/* ── SEO intro band ─────────────────────────────────────── */}
      <section className="lp-section lp-seo" aria-label="About BizlyAI">
        <div className="lp-container lp-seo-inner" data-reveal>
          <h2>Business Management Software Built for Nigeria &amp; Africa</h2>
          <p>
            <strong>BizlyAI</strong> is an AI business platform for Nigerian businesses that brings your
            whole operation into one place. Instead of paying for separate CRM software, invoice
            software, inventory management software and expense tracking software, small businesses in
            Lagos, Abuja, Port Harcourt and across Africa run everything on BizlyAI — from customer
            records and Paystack invoices to stock levels, expenses and profit &amp; loss reports.
          </p>
          <p>
            Our AI assistant for business answers customer questions from your own documents, a
            WhatsApp business bot handles chats around the clock, and AI-drafted follow-ups keep your
            leads warm. BizlyAI is designed for how African SMEs actually work: naira pricing,
            mobile-first, offline-tolerant and quick to set up — start free, no card required.
          </p>
          <ul className="lp-seo-tags">
            <li>CRM software Nigeria</li>
            <li>Invoice software Nigeria</li>
            <li>Inventory management software Nigeria</li>
            <li>Expense tracking software Nigeria</li>
            <li>WhatsApp business bot Nigeria</li>
            <li>Small business software Africa</li>
          </ul>
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

      {/* ── Contact ────────────────────────────────────────────── */}
      <section id="contact" className="lp-section">
        <div className="lp-container">
          <div className="lp-head" data-reveal>
            <h2>Get In Touch</h2>
            <p>Have questions? We’re here to help.</p>
          </div>
          <div className="lp-grid lp-grid-3">
            {CONTACT_CARDS.map((c, i) => {
              const Icon = c.icon;
              return (
                <article key={c.title} className="lp-card lp-feature lp-contact-card" data-reveal style={{ '--d': `${(i % 3) * 60}ms` }}>
                  <span className="lp-feature-icon"><Icon /></span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  <a
                    href={c.href}
                    className="lp-btn lp-btn-primary"
                    // mailto: is not a page to open in a new tab — giving it
                    // target="_blank" makes several browsers (and most
                    // in-app webviews) open a blank tab and never hand off
                    // to the mail client, which is exactly the "link does
                    // nothing" bug this fixes. Real external links (http/
                    // https, e.g. WhatsApp) still open in a new tab.
                    {...(c.href.startsWith('mailto:')
                      ? {}
                      : { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    {c.cta} <RiArrowRightLine />
                  </a>
                  {c.href.startsWith('mailto:') && (
                    <button type="button" className="lp-contact-copy" onClick={copyEmail}>
                      <RiFileCopyLine /> No mail app? Copy address instead
                    </button>
                  )}
                </article>
              );
            })}
          </div>

          <div className="lp-contact-info" data-reveal>
            <div>
              <RiMailLine /> Email: <a href={EMAIL_URL}>{SUPPORT_EMAIL}</a>
              <button type="button" className="lp-copy-icon" onClick={copyEmail} aria-label="Copy email address" title="Copy email address">
                <RiFileCopyLine />
              </button>
            </div>
            <div><RiWhatsappLine /> WhatsApp: <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">+234 902 836 1165</a></div>
            <div><RiGlobalLine /> Website: <a href="https://bislyai.com" target="_blank" rel="noopener noreferrer">bislyai.com</a></div>
            <div><RiTimeLine /> Hours: Monday – Friday, 8am – 6pm WAT</div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-hero-grid" aria-hidden="true" />
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
              <a href="https://twitter.com" aria-label="Twitter / X" target="_blank" rel="noopener noreferrer"><RiTwitterXLine /></a>
              <a href="https://linkedin.com" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><RiLinkedinBoxLine /></a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><RiInstagramLine /></a>
              <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><RiFacebookBoxLine /></a>
            </div>
          </div>

          <nav className="lp-footer-links">
            <button onClick={() => scrollTo('features')}>Features</button>
            <button onClick={() => scrollTo('pricing')}>Pricing</button>
            <button onClick={() => scrollTo('testimonials')}>About</button>
            <button onClick={() => scrollTo('contact')}>Contact</button>
            <Link to="/market">Browse Marketplace</Link>
            <Link to="/security">Security</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </div>
        <div className="lp-container lp-footer-bottom">
          © {new Date().getFullYear()} BizlyAI by ENGRHENRY TECH | RC: 9823522 | TIN: 33945414
        </div>
      </footer>

      {/* ── Floating WhatsApp button ───────────────────────────── */}
      <a
        className="lp-wa-fab"
        href={waLink("Hi, I found BizlyAI and I'm interested")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
      >
        <RiWhatsappLine />
        <span className="lp-wa-tip">Chat with us on WhatsApp</span>
      </a>
    </div>
  );
}
