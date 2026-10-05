import toast from 'react-hot-toast';
import { RiBankLine, RiFileCopyLine } from 'react-icons/ri';

// "Pay by bank transfer" panel showing a student's own account number —
// used on the parent portal and the pay page.
export default function BankAccountBox({ account, studentName }) {
  if (!account?.accountNumber) return null;
  const copy = () => {
    try { navigator.clipboard.writeText(account.accountNumber); toast.success('Account number copied'); } catch { /* ignore */ }
  };
  return (
    <div className="sc-bank-box">
      <RiBankLine className="sc-bank-icon" aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cell-sub" style={{ marginTop: 0 }}>Pay by bank transfer{studentName ? ` for ${studentName}` : ''}</div>
        <div className="sc-bank-number">{account.accountNumber}</div>
        <div className="cell-sub">{account.bankName}{account.accountName ? ` · ${account.accountName}` : ''}</div>
        <div className="cell-sub">This account belongs to your child only — any amount you transfer is credited to their fees automatically, usually within minutes.</div>
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={copy}><RiFileCopyLine /> Copy</button>
    </div>
  );
}
