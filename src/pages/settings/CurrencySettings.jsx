import { useState, useEffect, useCallback } from 'react';
import { companyService, currencyService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { RiMoneyDollarCircleLine, RiRefreshLine } from 'react-icons/ri';
import './CurrencySettings.css';

const CURRENCY_OPTIONS = [
  { code: 'NGN', label: 'Nigerian Naira' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GHS', label: 'Ghana Cedi' },
  { code: 'KES', label: 'Kenyan Shilling' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'UGX', label: 'Uganda Shilling' },
  { code: 'TZS', label: 'Tanzania Shilling' },
  { code: 'XOF', label: 'West African CFA' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
];
const SYMBOLS = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: '₵', KES: 'KSh',
  ZAR: 'R', UGX: 'USh', TZS: 'TSh', XOF: 'CFA', CAD: 'CA$', AUD: 'A$',
};

export default function CurrencySettings() {
  const { updateCompany } = useAuth();
  const [defaultCurrency, setDefaultCurrency] = useState('NGN');
  const [supported, setSupported] = useState(['NGN']);
  const [rates, setRates] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRates = useCallback(async () => {
    const { data } = await currencyService.getRates();
    setRates(data.data.rates);
    setLastUpdated(data.data.lastUpdated);
    setSource(data.data.source);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: companyRes }] = await Promise.all([companyService.get(), loadRates()]);
        const c = companyRes.data;
        setDefaultCurrency(c.defaultCurrency || 'NGN');
        setSupported(c.supportedCurrencies?.length ? c.supportedCurrencies : ['NGN']);
      } catch {
        toast.error('Could not load currency settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRates]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadRates();
      toast.success('Rates refreshed');
    } catch {
      toast.error('Could not refresh rates');
    } finally {
      setRefreshing(false);
    }
  }

  function toggleSupported(code) {
    setSupported((s) => {
      if (s.includes(code)) return s.filter((c) => c !== code);
      return [...s, code];
    });
  }

  async function save() {
    if (!supported.includes(defaultCurrency)) {
      toast.error('The default currency must also be in your supported currencies list.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await companyService.update({ defaultCurrency, supportedCurrencies: supported });
      updateCompany?.({ defaultCurrency: data.data.defaultCurrency, supportedCurrencies: data.data.supportedCurrencies });
      toast.success('Currency settings saved. New invoices will use this by default.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="currency-settings">
        <div className="page-header"><h1>Currency</h1></div>
        <div className="skeleton" style={{ height: 360, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="currency-settings fade-in">
      <div className="page-header">
        <h1><RiMoneyDollarCircleLine style={{ verticalAlign: '-3px' }} /> Currency</h1>
        <p>Choose what currency your invoices and orders default to, and which ones you accept.</p>
      </div>

      <div className="card card-pad">
        <h3>Default Currency</h3>
        <p className="cs-hint">All new invoices will use this currency unless you pick a different one at creation time.</p>
        <select className="form-input form-select cs-default-select" value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>{c.code} ({SYMBOLS[c.code]}) — {c.label}</option>
          ))}
        </select>

        <h3 style={{ marginTop: 24 }}>Supported Currencies</h3>
        <p className="cs-hint">Currencies you're willing to bill customers in. Untick a currency to hide it from the invoice currency picker.</p>
        <div className="cs-currency-grid">
          {CURRENCY_OPTIONS.map((c) => (
            <label key={c.code} className={`cs-currency-chip ${supported.includes(c.code) ? 'active' : ''}`}>
              <input type="checkbox" checked={supported.includes(c.code)} onChange={() => toggleSupported(c.code)} />
              <span>{c.code}</span>
            </label>
          ))}
        </div>

        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 20 }}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div className="card card-pad" style={{ marginTop: 20 }}>
        <div className="cs-rates-header">
          <div>
            <h3>Live Exchange Rates</h3>
            <p className="cs-hint">
              {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleString()}` : '—'}
              {source === 'fallback' && ' · using cached fallback rates (live rate source unreachable)'}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={refresh} disabled={refreshing}>
            <RiRefreshLine className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>

        <div className="cs-rates-table-wrap">
          <table className="cs-rates-table">
            <thead><tr><th>Currency</th><th>1 unit = ₦</th><th>₦1 =</th></tr></thead>
            <tbody>
              {CURRENCY_OPTIONS.filter((c) => c.code !== 'NGN').map((c) => {
                const rate = rates?.[c.code];
                const ngnPerUnit = rate ? 1 / rate : null;
                return (
                  <tr key={c.code}>
                    <td>{c.code} <span className="cs-hint">{SYMBOLS[c.code]}</span></td>
                    <td>{ngnPerUnit ? `₦${ngnPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</td>
                    <td>{rate ? `${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${c.code}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
