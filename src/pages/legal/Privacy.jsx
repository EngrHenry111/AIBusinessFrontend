import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';
import './Legal.css';

const LegalMark = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient id="lgMark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#lgMark)" />
    <path d="M11 8h7.5a4.5 4.5 0 0 1 1.2 8.8A4.8 4.8 0 0 1 18.2 26H11V8Zm4 3.4v4.2h3.1a2.1 2.1 0 0 0 0-4.2H15Zm0 7.2v4.4h3.1a2.2 2.2 0 0 0 0-4.4H15Z" fill="#fff" />
  </svg>
);

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy · BizlyAI';
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
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-meta">Effective date: January 1, 2026</p>

        <p className="legal-intro">
          This Privacy Policy explains how <strong>BizlyAI by EngrHenryTech</strong> (“BizlyAI”, “we”,
          “us”) collects, uses and protects information when you use bislyai.com and the BizlyAI
          platform (the “Service”). By using the Service you agree to the practices described here.
        </p>

        <section className="legal-section">
          <h2>1. Data Collection</h2>
          <p>We collect the following categories of information:</p>
          <ul>
            <li><strong>Account information</strong> — your name, email address, password (stored hashed), company name and role, provided when you register or are invited to a workspace.</li>
            <li><strong>Business content</strong> — documents, knowledge-base files, leads, invoices, orders, appointments, messages and other data you or your team add to your workspace.</li>
            <li><strong>WhatsApp data</strong> — if you connect a WhatsApp number, the phone numbers, names and message contents of conversations handled through the Service.</li>
            <li><strong>Usage and device data</strong> — log data such as IP address, browser type, pages viewed, and actions taken, used to operate and secure the Service.</li>
            <li><strong>Payment data</strong> — billing details are processed by our payment provider (Paystack). We store only the transaction reference, plan and amount, never full card numbers.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. How We Use Data</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain and improve the Service, including answering questions from your uploaded documents and running AI agents on your behalf.</li>
            <li>Authenticate users, protect accounts and prevent fraud or abuse.</li>
            <li>Process subscriptions, payments and renewals, and send related notices.</li>
            <li>Send transactional email (password resets, team invites, confirmations, reminders) and, where permitted, product updates.</li>
            <li>Generate analytics and reports for your own workspace.</li>
          </ul>
          <p>
            We do <strong>not</strong> sell your data, and we do not use your business content to train
            third-party AI models.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Data Security</h2>
          <p>
            Your data is stored on managed infrastructure (MongoDB Atlas and reputable cloud hosts) and
            is encrypted in transit using TLS and at rest by our providers. Passwords are hashed with
            bcrypt and never stored in plain text. Access to production systems is restricted to
            authorised personnel.
          </p>
          <p>
            Each workspace is logically isolated: other businesses using BizlyAI cannot access your
            documents, conversations or records. No method of transmission or storage is 100% secure,
            but we work to protect your information and will notify you of a breach affecting your data
            as required by law.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Cookies</h2>
          <p>
            We use a small number of cookies and similar browser storage strictly to keep you signed in,
            remember interface preferences (such as light or dark mode), and keep the Service secure. We
            do not use advertising or cross-site tracking cookies. You can clear or block cookies in your
            browser settings, though this may log you out or limit functionality.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Third-Party Services</h2>
          <p>We rely on a limited set of processors to run the Service:</p>
          <ul>
            <li><strong>MongoDB Atlas</strong> — database hosting.</li>
            <li><strong>Groq</strong> — large-language-model processing for AI features.</li>
            <li><strong>Paystack</strong> — payment processing.</li>
            <li><strong>Resend</strong> — transactional email delivery.</li>
            <li><strong>Cloudinary</strong> — file and image storage.</li>
            <li><strong>WhatsApp</strong> — message delivery for connected numbers.</li>
          </ul>
          <p>
            Each provider only receives the data needed to perform its function and is bound by its own
            terms and privacy commitments.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Your Rights</h2>
          <p>You may, at any time:</p>
          <ul>
            <li>Access and update your account information from your settings.</li>
            <li>Export or request a copy of your workspace data.</li>
            <li>Delete documents, records or your entire workspace. After account cancellation, data is retained for 30 days and then permanently deleted, unless a longer period is required by law.</li>
            <li>Object to or withdraw consent for non-essential communications.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us using the details below. We will respond within a
            reasonable timeframe.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Contact</h2>
          <p>
            Questions about this Privacy Policy or your data can be sent to{' '}
            <a href="mailto:henryengrakpan@gmail.com">henryengrakpan@gmail.com</a>.
          </p>
          <p>
            We may update this policy from time to time. Material changes will be announced on this page
            with a revised effective date.
          </p>
        </section>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span>© 2026 BizlyAI by EngrHenryTech. All rights reserved.</span>
          <nav className="legal-footer-links">
            <Link to="/terms">Terms of Service</Link>
            <Link to="/">Home</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
