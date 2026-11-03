import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, TrendingUp, RefreshCw, Info, CheckCircle2, Award } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import api from '../../api/client';

export default function CreditRiskTab() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchCreditRisk = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/finance/credit-risk/evaluate');
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message || 'Unable to compute risk score');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching credit risk analysis');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCreditRisk();
  }, []);

  const handleRecalculate = () => {
    setIsRefreshing(true);
    fetchCreditRisk();
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'A': return '#10B981'; // Green
      case 'B': return '#3B82F6'; // Blue
      case 'C': return '#F59E0B'; // Amber
      case 'D': return '#EF4444'; // Red
      default: return '#3B82F6';
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <p>Evaluating Enterprise Financial Health & Banking Risk Profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card padding="lg">
        <div style={{ textAlign: 'center', color: '#EF4444' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ margin: '0 0 4px 0' }}>Credit Risk Assessment Unavailable</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{error}</p>
          <Button variant="secondary" onClick={handleRecalculate} style={{ marginTop: '12px' }}>
            Retry Evaluation
          </Button>
        </div>
      </Card>
    );
  }

  const overall_score = Math.round(parseFloat(data.score || data.overall_score || 0));
  const grade = data.grade || 'B';
  const risk_label = data.risk_tier ? data.risk_tier.replace('_', ' ') : 'MODERATE RISK';
  const metrics = data.metrics || data.metrics_snapshot || {};
  const positive_factors = data.positive_factors || [];
  const risk_factors = data.risk_factors || [];
  const recommendations = data.recommendations || [];
  const disclaimer = data.disclaimer || 'Internal operational risk assessment.';
  const summaryText = data.summary || 'Operational financial stability analysis.';
  const methodVersion = data.method_version || 'v1.0';

  const max_recommended_credit = data.max_recommended_credit || (parseFloat(metrics.total_revenue_30d || 0) * 1.5) || 30000;
  const recommended_terms = data.recommended_terms || (grade === 'A' ? 'Net 30 Days' : grade === 'B' ? 'Net 15 Days' : 'Advance Payment');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Top Banner: Score & Credit Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Main Score Gauge */}
        <Card padding="lg" style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--bg-surface)' }}>
          <div
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              border: `6px solid ${getTierColor(grade)}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px ${getTierColor(grade)}33`,
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1 }}>{overall_score}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>/ 100</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  background: `${getTierColor(grade)}22`,
                  color: getTierColor(grade),
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.05em'
                }}
              >
                GRADE {grade} • {risk_label}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Method {methodVersion}</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Enterprise Credit Profile</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              {summaryText}
            </p>
            <div style={{ marginTop: '4px' }}>
              <Button size="sm" variant="secondary" onClick={handleRecalculate} disabled={isRefreshing}>
                <RefreshCw size={13} style={{ marginRight: '6px' }} />
                {isRefreshing ? 'Recalculating...' : 'Refresh Score'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Recommended Credit Terms */}
        <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Estimated Working Capital Capacity
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#10B981', marginTop: '6px' }}>
              ₹{Number(max_recommended_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Suggested Trade Terms: <strong>{recommended_terms}</strong>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '10px 14px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Operating Cashflow (30D):</span>
              <strong>₹{Number(metrics.net_operating_cashflow_30d || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Operating Margin:</span>
              <strong>{metrics.operating_profit_margin_pct || '0.00'}%</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Metrics Snapshot Grid */}
      <Card padding="md">
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0' }}>
          Key Financial & Operational Metrics Snapshot
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Revenue (30 Days)</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>
              ₹{Number(metrics.total_revenue_30d || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Expenses (30 Days)</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#EF4444' }}>
              ₹{Number(metrics.total_expenses_30d || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Delinquent Debtors %</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>
              {metrics.delinquent_ratio_pct || '0.00'}%
            </div>
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Completed Sales Count</div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>
              {metrics.sales_transactions_count_30d || 0}
            </div>
          </div>
        </div>
      </Card>

      {/* Contributing Drivers & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Positive Drivers */}
        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Strengths & Positive Drivers</h3>
          </div>
          {positive_factors.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No positive drivers identified.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {positive_factors.map((factor, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.08)',
                    borderLeft: '3px solid #10B981',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#10B981' }}>
                    {factor.code || factor.factor || factor.category} {factor.weight ? `(${factor.weight})` : ''}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {factor.description || factor.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Risk Factors */}
        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={16} color="#F59E0B" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Risk Indicators & Attention Areas</h3>
          </div>
          {risk_factors.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Zero critical risk flags detected.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {risk_factors.map((risk, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    borderLeft: '3px solid #EF4444',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#EF4444' }}>
                    {risk.code || risk.factor} {risk.weight ? `(${risk.weight})` : ''}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {risk.description || risk.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Actionable Recommendations */}
      {recommendations.length > 0 && (
        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <TrendingUp size={16} color="var(--color-brand)" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Recommendations for Banking Credit Readiness</h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {recommendations.map((rec, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{rec}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Statutory Disclaimer */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(59, 130, 246, 0.06)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}
      >
        <Info size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Regulatory & Banking Notice:</strong> {disclaimer}
        </div>
      </div>
    </div>
  );
}
