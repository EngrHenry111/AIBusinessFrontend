import { useState, useEffect } from 'react';
import { reportService } from '../../services';
import {
  RiFileChartLine, RiRobot2Line, RiLoader4Line, RiDownloadLine,
  RiArrowUpLine, RiArrowDownLine, RiCheckLine, RiAlertLine,
  RiLightbulbLine, RiBarChartLine, RiFileCopyLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Reports.css';

const PERIODS = [
  { id:'week', label:'Last 7 days' },
  { id:'month', label:'Last 30 days' },
  { id:'quarter', label:'Last 90 days' },
  { id:'year', label:'Last year' },
];

export default function Reports() {
  const [reportTypes, setReportTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('sales');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    reportService.getTypes().then(({ data }) => setReportTypes(data.data)).catch(() => {});
  }, []);

  async function handleGenerate() {
    setLoading(true); setReport(null);
    try {
      const { data } = await reportService.generate({ type: selectedType, period: selectedPeriod });
      setReport(data.data);
      toast.success('Report generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report');
    } finally { setLoading(false); }
  }

  function copyReport() {
    if (!report) return;
    const text = [
      report.title,
      `Period: ${selectedPeriod}`,
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      '',
      'EXECUTIVE SUMMARY',
      report.executiveSummary,
      '',
      'KEY METRICS',
      ...(report.keyMetrics?.map(m => `${m.label}: ${m.value} (${m.trend})`)||[]),
      '',
      'INSIGHTS',
      ...(report.insights?.map(i => `• ${i}`)||[]),
      '',
      'RECOMMENDATIONS',
      ...(report.recommendations?.map(r => `[${r.priority?.toUpperCase()}] ${r.action} — ${r.impact}`)||[]),
      '',
      'CONCLUSION',
      report.conclusion,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Report copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  const trendColor = (trend) => trend==='up' ? 'var(--color-success)' : trend==='down' ? 'var(--color-danger)' : 'var(--text-muted)';
  const TrendIcon = ({ trend }) => trend==='up' ? <RiArrowUpLine /> : trend==='down' ? <RiArrowDownLine /> : null;

  return (
    <div className="reports-page fade-in">
      <div className="page-header">
        <h1>Reports</h1>
        <p>AI-generated business intelligence reports from your data</p>
      </div>

      {/* Generator panel */}
      <div className="report-generator card card-pad">
        <h3 style={{marginBottom:16}}>Generate Report</h3>

        <div className="report-type-grid">
          {reportTypes.map(rt => (
            <button key={rt.id}
              className={`report-type-card ${selectedType===rt.id?'active':''}`}
              onClick={() => setSelectedType(rt.id)}>
              <RiFileChartLine className="rt-icon" />
              <span className="rt-name">{rt.name}</span>
              <span className="rt-desc">{rt.description}</span>
              {selectedType===rt.id && <RiCheckLine className="rt-check" />}
            </button>
          ))}
        </div>

        <div className="report-period">
          <label className="form-label">Time Period</label>
          <div className="period-pills">
            {PERIODS.map(p => (
              <button key={p.id}
                className={`period-pill ${selectedPeriod===p.id?'active':''}`}
                onClick={() => setSelectedPeriod(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className={`btn btn-primary generate-btn ${loading?'btn-loading':''}`}
          onClick={handleGenerate} disabled={loading}>
          {!loading && <><RiRobot2Line /> Generate AI Report</>}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="report-loading card card-pad">
          <RiLoader4Line className="spin" />
          <div>
            <p>AI is analyzing your business data...</p>
            <span>This may take 10-20 seconds</span>
          </div>
        </div>
      )}

      {/* Report output */}
      {report && !loading && (
        <div className="report-output">
          {/* Report header */}
          <div className="report-header card">
            <div className="report-header-inner">
              <div>
                <h2>{report.title}</h2>
                <div className="report-meta">
                  <span>Period: <strong>{PERIODS.find(p=>p.id===selectedPeriod)?.label}</strong></span>
                  <span>Generated: <strong>{new Date(report.generatedAt).toLocaleString()}</strong></span>
                  <span>Type: <strong>{reportTypes.find(r=>r.id===selectedType)?.name}</strong></span>
                </div>
              </div>
              <div className="report-actions">
                <button className="btn btn-secondary" onClick={copyReport}>
                  {copied ? <><RiCheckLine /> Copied</> : <><RiFileCopyLine /> Copy Report</>}
                </button>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          {report.executiveSummary && (
            <div className="card card-pad report-section">
              <h3>Executive Summary</h3>
              <p className="exec-summary">{report.executiveSummary}</p>
            </div>
          )}

          {/* Key Metrics */}
          {report.keyMetrics?.length > 0 && (
            <div className="card card-pad report-section">
              <h3>Key Metrics</h3>
              <div className="metrics-grid">
                {report.keyMetrics.map((metric, i) => (
                  <div key={i} className="metric-card">
                    <div className="metric-label">{metric.label}</div>
                    <div className="metric-value">{metric.value}</div>
                    <div className="metric-trend" style={{color: trendColor(metric.trend)}}>
                      <TrendIcon trend={metric.trend} />
                      <span>{metric.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights + Problems side by side */}
          <div className="report-two-col">
            {report.insights?.length > 0 && (
              <div className="card card-pad report-section">
                <h3><RiBarChartLine /> Insights</h3>
                <ul className="insight-list">
                  {report.insights.map((item, i) => (
                    <li key={i}>
                      <RiLightbulbLine className="insight-icon" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.problems?.length > 0 && (
              <div className="card card-pad report-section">
                <h3><RiAlertLine /> Problems Identified</h3>
                <ul className="problem-list">
                  {report.problems.map((item, i) => (
                    <li key={i}>
                      <RiAlertLine className="problem-icon" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div className="card card-pad report-section">
              <h3>Recommendations</h3>
              <div className="recommendations">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className={`rec-card priority-${rec.priority}`}>
                    <div className="rec-top">
                      <span className={`badge badge-${rec.priority==='high'?'danger':rec.priority==='low'?'neutral':'warning'}`}>
                        {rec.priority}
                      </span>
                      <span className="rec-action">{rec.action}</span>
                    </div>
                    {rec.impact && <p className="rec-impact">Impact: {rec.impact}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conclusion */}
          {report.conclusion && (
            <div className="card card-pad report-section">
              <h3>Conclusion</h3>
              <p className="exec-summary">{report.conclusion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
