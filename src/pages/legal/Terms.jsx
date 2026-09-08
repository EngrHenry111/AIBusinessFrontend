import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';
import './Legal.css';

const LegalMark = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient id="lgMarkT" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#lgMarkT)" />
    <path d="M11 8h7.5a4.5 4.5 0 0 1 1.2 8.8A4.8 4.8 0 0 1 18.2 26H11V8Zm4 3.4v4.2h3.1a2.1 2.1 0 0 0 0-4.2H15Zm0 7.2v4.4h3.1a2.2 2.2 0 0 0 0-4.4H15Z" fill="#fff" />
  </svg>
);

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms of Service · BizlyAI';
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
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">Effective date: January 1, 2026</p>

        <p className="legal-intro">
          These Terms of Service (“Terms”) govern your access to and use of bislyai.com and the BizlyAI
          platform (the “Service”), operated by <strong>BizlyAI by EngrHenryTech</strong> (“BizlyAI”,
          “we”, “us”). Please read them carefully.
        </p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account, accessing or using the Service, you agree to be bound by these Terms
            and by our <Link to="/privacy">Privacy Policy</Link>. If you are using the Service on behalf
            of a company, you represent that you have authority to bind that company, and “you” refers to
            that company. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. The Services</h2>
          <p>
            BizlyAI provides AI-assisted business operations tools, including a knowledge base and AI
            assistant, WhatsApp automation, CRM and lead management, invoicing, appointments, orders,
            reporting and related features. We may add, change or remove features over time. AI-generated
            output may contain errors; you are responsible for reviewing it before relying on or acting
            on it.
          </p>
          <p>
            We aim to keep the Service available but do not guarantee uninterrupted operation. Scheduled
            maintenance and factors outside our control (including third-party outages) may cause
            downtime.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. User Accounts</h2>
          <ul>
            <li>You must provide accurate information and keep it up to date.</li>
            <li>You are responsible for safeguarding your password and for all activity under your account and your workspace.</li>
            <li>Workspace owners are responsible for the team members they invite and the permissions they grant.</li>
            <li>You must be at least 18 years old, or the age of majority in your jurisdiction, to use the Service.</li>
            <li>Notify us promptly at the contact address below if you suspect unauthorised access.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Payment &amp; Billing</h2>
          <p>
            Paid plans are billed in Nigerian Naira (₦) through our payment provider, Paystack, on a
            monthly or annual basis depending on the plan you choose. By subscribing you authorise us to
            charge the applicable fees, including any taxes, to your selected payment method.
          </p>
          <p>
            Fees are stated on our pricing page and may change with prior notice; changes take effect at
            your next renewal. Except where required by law, payments are non-refundable. Failed or
            reversed payments may result in suspension of paid features.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Subscription &amp; Cancellation</h2>
          <p>
            Subscriptions renew automatically at the end of each billing period unless cancelled. You may
            cancel at any time from your billing settings; your plan remains active until the end of the
            period already paid for, after which the workspace reverts to limited access.
          </p>
          <p>
            After cancellation, your workspace data is retained for 30 days so you can export it or
            reactivate, and is then permanently deleted. We may suspend or terminate accounts that breach
            these Terms, that are inactive for an extended period, or where required by law.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Prohibited Uses</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful, fraudulent, deceptive or harmful purpose.</li>
            <li>Send spam, unsolicited messages, or content that is illegal, defamatory, or infringes others' rights, including via the WhatsApp integration.</li>
            <li>Upload malware, or attempt to gain unauthorised access to the Service, other workspaces, or our infrastructure.</li>
            <li>Reverse engineer, resell, or build a competing product from the Service.</li>
            <li>Overload or interfere with the Service, or circumvent usage limits, rate limits or security controls.</li>
            <li>Use the Service to violate the terms or policies of any third-party platform we integrate with.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Intellectual Property</h2>
          <p>
            The Service, including its software, design, and branding, is owned by BizlyAI by
            EngrHenryTech and protected by intellectual-property laws. We grant you a limited,
            non-exclusive, non-transferable right to use the Service during your subscription.
          </p>
          <p>
            You retain all rights to the content and data you upload (“Your Content”). You grant us a
            limited licence to host, process and display Your Content solely to operate and provide the
            Service to you. Any feedback you send us may be used without restriction or obligation.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Limitation of Liability</h2>
          <p>
            The Service is provided “as is” and “as available”, without warranties of any kind, whether
            express or implied, to the fullest extent permitted by law.
          </p>
          <p>
            To the maximum extent permitted by law, BizlyAI and EngrHenryTech will not be liable for any
            indirect, incidental, special, consequential or punitive damages, or for lost profits,
            revenue, data or goodwill, arising out of or relating to your use of the Service. Our total
            liability for any claim relating to the Service will not exceed the amount you paid us for the
            Service in the three (3) months before the event giving rise to the claim.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to
            its conflict-of-laws rules. You agree to the exclusive jurisdiction of the courts located in
            Nigeria for any dispute arising out of or relating to these Terms or the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>
            Questions about these Terms can be sent to{' '}
            <a href="mailto:henryengrakpan@gmail.com">henryengrakpan@gmail.com</a>.
          </p>
          <p>
            We may revise these Terms from time to time. Material changes will be posted on this page with
            an updated effective date, and your continued use of the Service after changes take effect
            constitutes acceptance.
          </p>
        </section>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span>© {new Date().getFullYear()} BizlyAI by EngrHenryTech. All rights reserved.</span>
          <nav className="legal-footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/">Home</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
