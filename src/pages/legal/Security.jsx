import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RiArrowLeftLine, RiLockLine, RiShieldCheckLine, RiFileList3Line, RiCloudLine,
  RiBankCardLine, RiEyeOffLine, RiAlarmWarningLine, RiMailLine,
} from 'react-icons/ri';
import './Legal.css';

const LegalMark = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient id="secMark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#secMark)" />
    <path d="M11 8h7.5a4.5 4.5 0 0 1 1.2 8.8A4.8 4.8 0 0 1 18.2 26H11V8Zm4 3.4v4.2h3.1a2.1 2.1 0 0 0 0-4.2H15Zm0 7.2v4.4h3.1a2.2 2.2 0 0 0 0-4.4H15Z" fill="#fff" />
  </svg>
);

const MEASURES = [
  {
    icon: RiLockLine,
    title: '256-bit Encryption',
    text: 'All traffic to and from BizlyAI travels over HTTPS/TLS. Passwords are never stored in plain text — they\'re hashed with bcrypt before they touch our database.',
  },
  {
    icon: RiShieldCheckLine,
    title: 'Two-Factor Authentication',
    text: 'Every account can turn on TOTP-based 2FA (Google Authenticator, Authy, etc.) with one-time backup codes, free on every plan.',
  },
  {
    icon: RiAlarmWarningLine,
    title: 'Account & Network Protection',
    text: 'Accounts lock automatically after 5 failed sign-in attempts, and a network that fails 10 sign-ins in an hour is blocked for 24 hours. Changing your password immediately signs you out on every other device.',
  },
  {
    icon: RiFileList3Line,
    title: 'Full Audit Log',
    text: 'Every meaningful action in your workspace — logins, edits, deletions, permission changes — is recorded with who, what and when, visible to company owners at any time.',
  },
  {
    icon: RiCloudLine,
    title: 'Enterprise Hosting',
    text: 'BizlyAI runs on reputable cloud infrastructure with automated backups, isolated tenant data, and hardened HTTP security headers (CSP, HSTS, frame protection) on every response.',
  },
  {
    icon: RiBankCardLine,
    title: 'PCI DSS Payments',
    text: 'Card and bank payments are processed by Paystack, a PCI DSS Level 1 certified payment provider. BizlyAI never sees or stores your full card number.',
  },
  {
    icon: RiEyeOffLine,
    title: 'Input Sanitization',
    text: 'Every request is sanitized against NoSQL injection and cross-site scripting before it reaches our database, with strict rate limits across all endpoints.',
  },
];

export default function Security() {
  useEffect(() => {
    document.title = 'Security · BizlyAI';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <header className="legal-nav">
        <div className="legal-nav-inner">
          <Link to="/" className="legal-logo"><LegalMark /> Bizly<b>AI</b></Link>
          <Link to="/" className="legal-back"><RiArrowLeftLine /> <span>Back to home</span></Link>
        </div>
      </header>

      <main className="legal-container">
        <h1 className="legal-title">Security at BizlyAI</h1>
        <p className="legal-meta">Built with enterprise security standards</p>

        <p className="legal-intro">
          Your business data — leads, invoices, customer records, documents — deserves the same
          protection a bank gives your money. Here is exactly what BizlyAI does to keep it safe, in
          plain English, with no jargon.
        </p>

        {MEASURES.map((m) => {
          const Icon = m.icon;
          return (
            <section className="legal-section" key={m.title}>
              <h2><Icon style={{ verticalAlign: '-3px', marginRight: 8, color: '#6366f1' }} />{m.title}</h2>
              <p>{m.text}</p>
            </section>
          );
        })}

        <section className="legal-section">
          <h2>Responsible Disclosure</h2>
          <p>
            If you are a security researcher or enterprise client and believe you've found a
            vulnerability in BizlyAI, please report it privately before any public disclosure — we
            take every report seriously and will respond promptly.
          </p>
          <p>
            <RiMailLine style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Security concerns: <a href="mailto:security@bislyai.com">security@bislyai.com</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>Related</h2>
          <p>
            See our <Link to="/privacy">Privacy Policy</Link> for how we collect, use and protect
            personal data, and our <Link to="/terms">Terms of Service</Link> for the rules governing
            the platform.
          </p>
        </section>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span>© {new Date().getFullYear()} BizlyAI by EngrHenryTech. All rights reserved.</span>
          <nav className="legal-footer-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/">Home</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
