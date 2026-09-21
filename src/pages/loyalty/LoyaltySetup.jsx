import { useState } from 'react';
import { loyaltyService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { RiArrowRightLine, RiArrowLeftLine, RiRocketLine, RiCheckLine } from 'react-icons/ri';

const STEPS = ['Name', 'Earning Rate', 'Redemption Value', 'Launch'];

export default function LoyaltySetup({ onComplete }) {
  const { company } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(company?.name ? `${company.name} Rewards` : 'Rewards Program');
  const [pointsPerNaira, setPointsPerNaira] = useState(1);
  const [nairaPerPoint, setNairaPerPoint] = useState(0.5);
  const [minimumRedemption, setMinimumRedemption] = useState(100);
  const [launching, setLaunching] = useState(false);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function launch() {
    setLaunching(true);
    try {
      const { data } = await loyaltyService.setupProgram({
        enabled: true, name, pointsPerNaira: Number(pointsPerNaira),
        nairaPerPoint: Number(nairaPerPoint), minimumRedemption: Number(minimumRedemption),
      });
      toast.success('Loyalty program launched!');
      onComplete(data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not launch program');
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="card card-pad loyalty-setup">
      <div className="setup-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`setup-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span>{i < step ? <RiCheckLine /> : i + 1}</span>
            <label>{s}</label>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="setup-panel">
          <h2>Name your program</h2>
          <p className="loyalty-hint">This is the name customers will see, e.g. "Bloom Rewards".</p>
          <input className="setup-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Bloom Rewards" />
        </div>
      )}

      {step === 1 && (
        <div className="setup-panel">
          <h2>Set your earning rate</h2>
          <p className="loyalty-hint">How many points does a customer earn per ₦1 spent?</p>
          <input className="setup-input" type="number" min={0.1} step={0.1} value={pointsPerNaira} onChange={(e) => setPointsPerNaira(e.target.value)} />
          <p className="setup-example">Example: spending ₦1,000 earns <strong>{Math.floor(1000 * (Number(pointsPerNaira) || 0))} points</strong></p>
        </div>
      )}

      {step === 2 && (
        <div className="setup-panel">
          <h2>Set your redemption value</h2>
          <p className="loyalty-hint">How much is one point worth when redeemed, and what's the minimum a customer needs to redeem?</p>
          <label className="setup-label">₦ value per point</label>
          <input className="setup-input" type="number" min={0.01} step={0.01} value={nairaPerPoint} onChange={(e) => setNairaPerPoint(e.target.value)} />
          <label className="setup-label" style={{ marginTop: 14 }}>Minimum points to redeem</label>
          <input className="setup-input" type="number" min={1} value={minimumRedemption} onChange={(e) => setMinimumRedemption(e.target.value)} />
          <p className="setup-example">Example: {minimumRedemption} points = <strong>₦{(Number(minimumRedemption) * Number(nairaPerPoint)).toLocaleString()}</strong> off</p>
        </div>
      )}

      {step === 3 && (
        <div className="setup-panel">
          <h2>Review &amp; launch</h2>
          <div className="setup-review">
            <div><span>Program name</span><strong>{name}</strong></div>
            <div><span>Earning rate</span><strong>{pointsPerNaira} point(s) per ₦1</strong></div>
            <div><span>Redemption value</span><strong>₦{nairaPerPoint} per point</strong></div>
            <div><span>Minimum redemption</span><strong>{minimumRedemption} points</strong></div>
            <div><span>Default tiers</span><strong>Bronze, Silver, Gold, Platinum</strong></div>
          </div>
          <p className="loyalty-hint">You can fine-tune tiers and bonuses anytime from the Settings tab.</p>
        </div>
      )}

      <div className="setup-nav">
        {step > 0 && <button className="btn btn-secondary" onClick={back}><RiArrowLeftLine /> Back</button>}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 && (
          <button className="btn btn-primary" onClick={next} disabled={step === 0 && !name.trim()}>
            Next <RiArrowRightLine />
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button className="btn btn-primary" onClick={launch} disabled={launching}>
            <RiRocketLine /> {launching ? 'Launching…' : 'Enable & Launch'}
          </button>
        )}
      </div>
    </div>
  );
}
