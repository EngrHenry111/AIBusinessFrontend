import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchService } from '../../services';
import {
  RiSearchLine, RiUserLine, RiMoneyDollarCircleLine,
  RiShoppingBagLine, RiCalendarLine, RiFileTextLine,
  RiVideoLine, RiLoader4Line, RiArrowRightLine
} from 'react-icons/ri';
import './Search.css';

const TYPE_ICONS = {
  lead: RiUserLine, invoice: RiMoneyDollarCircleLine, order: RiShoppingBagLine,
  appointment: RiCalendarLine, document: RiFileTextLine, meeting: RiVideoLine,
};
const TYPE_COLORS = {
  lead: '#3b82f6', invoice: '#f59e0b', order: '#10b981',
  appointment: '#8b5cf6', document: '#6366f1', meeting: '#06b6d4',
};

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(params.get('q') || '');

  useEffect(() => {
    const q = params.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, [params.get('q')]);

  async function doSearch(q) {
    if (!q?.trim() || q.trim().length < 2) return;
    setLoading(true);
    try {
      const { data } = await searchService.search(q);
      setResults(data.data);
    } catch {} finally { setLoading(false); }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="search-page fade-in">
      <div className="page-header">
        <h1>Search</h1>
        <p>Search across all your business data</p>
      </div>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrap">
          <RiSearchLine className="search-icon" />
          <input
            className="search-input-big"
            placeholder="Search leads, invoices, orders, appointments..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>

      {loading ? (
        <div className="search-loading"><RiLoader4Line className="spin" /> Searching...</div>
      ) : results.length === 0 && params.get('q') ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiSearchLine /></div>
          <h3>No results for "{params.get('q')}"</h3>
          <p>Try different keywords or check your spelling</p>
        </div>
      ) : (
        <div className="search-results">
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type] || RiSearchLine;
            const color = TYPE_COLORS[type] || '#6366f1';
            return (
              <div key={type} className="result-group card">
                <div className="result-group-header">
                  <div className="result-type-icon" style={{ background: `${color}18`, color }}>
                    <Icon />
                  </div>
                  <span>{type.charAt(0).toUpperCase() + type.slice(1)}s</span>
                  <span className="result-count">{items.length}</span>
                </div>
                {items.map(item => (
                  <button key={item.id} className="result-item" onClick={() => navigate(item.url)}>
                    <div className="result-item-info">
                      <span className="result-title">{item.title}</span>
                      {item.subtitle && <span className="result-sub">{item.subtitle}</span>}
                    </div>
                    {item.status && (
                      <span className={`badge badge-${item.status === 'paid' || item.status === 'won' || item.status === 'delivered' ? 'success' : item.status === 'overdue' || item.status === 'lost' || item.status === 'cancelled' ? 'danger' : 'neutral'}`}>
                        {item.status}
                      </span>
                    )}
                    <RiArrowRightLine style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
