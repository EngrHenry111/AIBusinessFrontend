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
        <p className="legal-meta">Effective date: January 1, 2026 · Last updated: October 27, 2026</p>

        <p className="legal-intro">
          These Terms of Service (“Terms”) govern your access to and use of bislyai.com and the BizlyAI
          platform (the “Service”), operated by <strong>BizlyAI by EngrHenryTech</strong> (“BizlyAI”,
          “we”, “us”). Please read them carefully. The sections on billing (5 to 7), the referral
          programme (8), online store payments (9) and data about other people (10) contain important
          information about money and legal responsibility.
        </p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account, accessing or using the Service, you agree to be bound by these Terms
            and by our <Link to="/privacy">Privacy Policy</Link>. If you are using the Service on behalf
            of a company, school, hospital or other organisation, you represent that you have authority
            to bind it, and “you” refers to that organisation. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. The Services</h2>
          <p>
            BizlyAI provides AI-assisted business management tools, including a knowledge base and AI
            assistant, WhatsApp automation, CRM and leads, invoicing, orders, products and an online
            store, payroll, appointments, contracts, procurement, multi-branch (Group Operations),
            school management, hospital management, reporting and related features. We may add, change
            or remove features over time.
          </p>
          <p>
            AI-generated output (answers, drafts, summaries, contracts, insights) can be wrong or
            incomplete. You are responsible for reviewing it before relying on or acting on it. The
            Service does not give medical, legal, tax, accounting or financial advice; see section 11.
          </p>
          <p>
            We aim to keep the Service available but do not guarantee uninterrupted operation. Scheduled
            maintenance and factors outside our control, including outages at third parties such as
            Paystack, WhatsApp, banks, hosting and network providers, may cause downtime.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. User Accounts</h2>
          <ul>
            <li>You must provide accurate information and keep it up to date.</li>
            <li>You are responsible for safeguarding your password and for all activity under your account and your workspace.</li>
            <li>The workspace owner is responsible for the team members they invite and the roles and permissions they grant, and is the only person who can manage billing and the referral balance.</li>
            <li>You must be at least 18 years old, or the age of majority in your jurisdiction, to create an account.</li>
            <li>Notify us promptly at the contact address below if you suspect unauthorised access.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Free Trial</h2>
          <p>
            New workspaces start on a free trial with usage limits (for example on team members,
            documents and AI questions). No payment details are needed for the trial. We may change the
            trial’s limits or length, or end the free trial, by giving notice in the Service or by email.
            Moving to a paid plan is your choice; nothing is charged unless you subscribe.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Plans, Payment &amp; Billing</h2>
          <p>
            Paid plans are priced in Nigerian Naira (₦) on our pricing and billing pages and are paid
            through our payment provider, Paystack, monthly or annually. Enterprise is priced by the
            number of active branches in your workspace, as shown on your billing page. Prices include or
            exclude taxes as stated at checkout.
          </p>
          <p>You can pay in one of two ways:</p>
          <ul>
            <li>
              <strong>Card (automatic renewal).</strong> By subscribing with a card you authorise us,
              through Paystack, to charge that card the plan price at the start of every billing period
              until you cancel. If a renewal charge fails your account is marked past due and paid
              features may be limited until payment succeeds.
            </li>
            <li>
              <strong>Bank transfer or USSD (pay each period).</strong> Nothing is charged
              automatically. You pay for each month or year yourself from the billing page. We send
              reminders 7 days and 1 day before your paid period ends. If you do not pay, the plan ends
              on its end date.
            </li>
          </ul>
          <p>
            Paying again for the same plan before your period ends adds the new period on top of the
            days you have left. If you move from card to bank transfer, we stop the card subscription so
            you are not charged twice. Your access is confirmed only once Paystack confirms the payment.
          </p>
          <p>
            We may change prices by giving at least 30 days’ notice in the Service or by email. A new
            price applies from your next renewal or payment after the notice period, never to a period
            you have already paid for.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Cancelling, Resuming &amp; When a Plan Ends</h2>
          <ul>
            <li>
              <strong>Cancelling.</strong> You may cancel at any time from Billing. Card renewal stops
              (or, for bank-transfer payers, the reminders stop) and you keep full access until the end
              of the period you have already paid for.
            </li>
            <li>
              <strong>Resuming.</strong> Until that period ends you can resume from Billing without any
              new charge; card renewal or reminders start again on the usual date.
            </li>
            <li>
              <strong>Grace period.</strong> When a paid period ends without renewal, you have 7 days
              of continued access with a warning. After that the workspace is locked: you can still sign
              in, reach Billing, Referrals and Settings, and renew, but other features are unavailable.
            </li>
            <li>
              <strong>Your data.</strong> Locking a workspace does not delete it. Your data is kept so
              that you can renew and continue where you stopped, or export it. You can ask us to delete
              your workspace at any time. We may delete a workspace that has been locked and unused for
              12 months, after emailing the owner at least 30 days beforehand.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Refunds</h2>
          <p>
            Payments are non-refundable, including for unused days after you cancel, except where
            required by law or where you were charged in error (for example a duplicate charge, or a
            charge after a cancellation we had confirmed). To request a refund for a charge made in
            error, contact us within 30 days of the charge. Approved refunds are paid back through
            Paystack to the original payment method. Refunded or reversed payments do not earn referral
            rewards (section 8).
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Referral Programme</h2>
          <p>
            Workspace owners can earn rewards by referring other businesses to BizlyAI. By sharing your
            referral link or code you agree to these rules.
          </p>
          <ul>
            <li>
              <strong>Who counts as your referral.</strong> A business is linked to you only if it signs
              up with your link or code, or adds your code within 30 days of signing up and before its
              first payment. A business can have only one referrer, and the link cannot be changed once
              made.
            </li>
            <li>
              <strong>What you earn.</strong> You earn 5% of each successful subscription payment a
              referred business makes to BizlyAI (monthly, annual, card or transfer), for as long as it
              keeps paying. Nothing is earned during its free trial, and nothing is earned on payments it
              makes from its own referral balance, on store sales, or on other money that does not pay
              for a BizlyAI subscription.
            </li>
            <li>
              <strong>Hold period.</strong> Each reward is held for 14 days after the payment before it
              becomes available, in case the payment is refunded or reversed.
            </li>
            <li>
              <strong>Using your balance.</strong> You can use any available balance to pay for a month
              of your own plan, or withdraw it to a Nigerian bank account once it reaches ₦5,000. The
              account must belong to you or your business; we confirm the account name with the bank. We
              review withdrawals before paying them and aim to pay approved withdrawals within 3 working
              days. We may ask for proof of identity or of the business before paying.
            </li>
            <li>
              <strong>Reversals.</strong> If a referred payment is refunded, reversed or charged back,
              or a reward was earned in breach of these rules, we reverse that reward. If it was already
              withdrawn or used, the amount is deducted from your future rewards.
            </li>
            <li>
              <strong>Not allowed.</strong> Referring yourself or businesses you own or control;
              creating fake or duplicate accounts; sharing your code through spam or unsolicited
              messages; making false or misleading claims about BizlyAI; pretending to be BizlyAI or
              offering “official” discounts we have not authorised; and bidding on “BizlyAI” or similar
              terms in paid search ads. We may refuse or reverse rewards, withhold a withdrawal while we
              investigate, and remove you from the programme or close your account for any breach.
              Rewards withheld for a breach are forfeited.
            </li>
            <li>
              <strong>Tax.</strong> Rewards are income to you. You are responsible for any tax due on them.
            </li>
            <li>
              <strong>Relationship.</strong> Taking part does not make you our employee, agent or
              partner, and you may not make promises or sign agreements on our behalf.
            </li>
            <li>
              <strong>Changes.</strong> We may change the reward rate or rules, or end the programme,
              with at least 30 days’ notice. Rewards already earned before a change remain yours under
              the rules that applied when they were earned. A balance has no cash value except through a
              withdrawal under these rules, and does not earn interest.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>9. Your Online Store &amp; Payments From Your Customers</h2>
          <ul>
            <li>
              Payments your customers make through BizlyAI payment pages (online store orders, store
              subscriptions, gift cards, group buys and online school-fee payments) are processed by
              Paystack and settled to the bank account you set up, under Paystack’s terms and settlement
              schedule.
            </li>
            <li>
              BizlyAI charges a platform commission on each of those payments, currently 3%, deducted
              automatically at settlement. Paystack’s transaction fees are also deducted from your share.
              We will give at least 30 days’ notice before changing the commission rate.
            </li>
            <li>
              You are the seller. You are responsible for your products and services, their prices,
              descriptions and legality, delivery, customer service, returns and refunds, and for
              complying with consumer-protection, tax and other laws that apply to your business.
            </li>
            <li>
              Disputes, chargebacks and refunds for your customers’ payments are between you, your
              customer and Paystack. We may pause your store or payment links if we see fraud, a high
              rate of disputes or a breach of these Terms.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>10. Your Data &amp; Data About Other People</h2>
          <p>
            You may store personal information about other people in the Service, such as your
            customers, staff, students and parents, or patients. For that information you are the data
            controller and we process it on your behalf, only to provide the Service, as described in our{' '}
            <Link to="/privacy">Privacy Policy</Link>. You agree to:
          </p>
          <ul>
            <li>comply with the Nigeria Data Protection Act 2023 and any other data-protection law that applies to you;</li>
            <li>have a lawful basis, and where required consent, for collecting the information and for any messages you send through the Service (WhatsApp, SMS, email);</li>
            <li>take particular care with sensitive information such as health records and information about children, and give access to it only to staff who need it, using the roles provided;</li>
            <li>keep records accurate, and respond to requests from the people concerned to see, correct or delete their information.</li>
          </ul>
          <p>
            You are responsible for the accuracy of the records you keep in the Service, including
            medical, academic, financial and payroll records. We back up the Service regularly, but you
            should export and keep your own copies of records you are legally required to retain.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Professional &amp; Regulated Use</h2>
          <ul>
            <li>
              <strong>Hospital and clinical tools</strong> help organise patient records, visits,
              prescriptions, lab results, pharmacy stock and billing. They do not diagnose, recommend
              treatment or replace the judgement of qualified, licensed professionals, who remain fully
              responsible for clinical decisions.
            </li>
            <li>
              <strong>School tools</strong> help manage students, results, fees and registration
              numbers. The school remains responsible for results, records and fees it issues.
            </li>
            <li>
              <strong>Payroll, tax, invoices and reports</strong> are calculated from the information
              you enter and the settings you choose. Check them before you pay staff, file returns or
              send documents. They are not tax or accounting advice.
            </li>
            <li>
              <strong>Contracts and documents</strong> generated with AI are drafts, not legal advice.
              Have important agreements reviewed by a lawyer.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>12. Prohibited Uses</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful, fraudulent, deceptive or harmful purpose.</li>
            <li>Send spam, unsolicited messages, or content that is illegal, defamatory, or infringes others' rights, including via the WhatsApp, SMS or email features.</li>
            <li>Sell illegal, counterfeit or prohibited goods or services through your store.</li>
            <li>Upload malware, or attempt to gain unauthorised access to the Service, other workspaces, or our infrastructure.</li>
            <li>Reverse engineer, resell, or build a competing product from the Service.</li>
            <li>Overload or interfere with the Service, or circumvent usage limits, rate limits or security controls.</li>
            <li>Abuse the free trial or referral programme, for example with multiple or fake accounts.</li>
            <li>Use the Service to violate the terms or policies of any third-party platform we integrate with.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>13. Suspension &amp; Termination</h2>
          <p>
            You may stop using the Service and ask us to delete your workspace at any time. We may
            suspend or close an account, pause a store or withhold referral rewards if you breach these
            Terms, if we reasonably suspect fraud or a security risk, if required by law or by our
            payment provider, or if a workspace has been locked and unused as described in section 6.
            Where practical we will tell you first and give you a chance to fix the problem. Sections that
            by their nature should survive (including 7, 8 for rewards already earned, 10, 14 and 15)
            continue after your account ends.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. Intellectual Property</h2>
          <p>
            The Service, including its software, design, and branding, is owned by BizlyAI by
            EngrHenryTech and protected by intellectual-property laws. We grant you a limited,
            non-exclusive, non-transferable right to use the Service while your account is active.
          </p>
          <p>
            You retain all rights to the content and data you upload (“Your Content”). You grant us a
            limited licence to host, process and display Your Content solely to operate and provide the
            Service to you. Any feedback you send us may be used without restriction or obligation.
          </p>
        </section>

        <section className="legal-section">
          <h2>15. Limitation of Liability &amp; Indemnity</h2>
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
          <p>
            You agree to compensate us for claims, losses and costs brought by third parties (including
            your customers, patients, students, staff and regulators) that arise from Your Content, your
            products or services, the messages you send, or your breach of these Terms or of the law.
          </p>
        </section>

        <section className="legal-section">
          <h2>16. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to
            its conflict-of-laws rules. You agree to the exclusive jurisdiction of the courts located in
            Nigeria for any dispute arising out of or relating to these Terms or the Service. Before
            going to court, please contact us so we can try to resolve the issue.
          </p>
        </section>

        <section className="legal-section">
          <h2>17. Changes &amp; Contact</h2>
          <p>
            We may revise these Terms from time to time. Material changes will be posted on this page
            with an updated date and, for changes to prices, commission or the referral programme, also
            notified by email or in the Service at least 30 days before they take effect. Your continued
            use of the Service after changes take effect means you accept them.
          </p>
          <p>
            Questions about these Terms can be sent to{' '}
            <a href="mailto:legal@bislyai.com">legal@bislyai.com</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>18. Company Information</h2>
          <ul>
            <li><strong>Company:</strong> ENGRHENRY TECH</li>
            <li><strong>RC Number:</strong> 9823522</li>
            <li><strong>TIN:</strong> 33945414</li>
            <li><strong>Address:</strong> 29 Pack Road, Itu, Akwa Ibom State, Nigeria</li>
            <li><strong>Email:</strong> <a href="mailto:legal@bislyai.com">legal@bislyai.com</a></li>
            <li><strong>Website:</strong> <a href="https://bislyai.com" target="_blank" rel="noopener noreferrer">bislyai.com</a></li>
          </ul>
        </section>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span>© {new Date().getFullYear()} BizlyAI by ENGRHENRY TECH | RC: 9823522 | TIN: 33945414</span>
          <nav className="legal-footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/">Home</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
