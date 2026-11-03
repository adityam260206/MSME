import React, { useState, useEffect } from 'react';
import { Landmark, CheckCircle, XCircle, HelpCircle, ExternalLink, RefreshCw, Filter, ChevronDown, ChevronUp, ShieldAlert, Award } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api from '../../api/client';

export default function SchemeEligibilityTab() {
  const [schemes, setSchemes] = useState([]);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [expandedScheme, setExpandedScheme] = useState(null);

  // Enterprise inputs for evaluation
  const [profile, setProfile] = useState({
    enterprise_type: 'MICRO',
    industry_sector: 'MANUFACTURING',
    owner_category: 'GENERAL',
    is_woman_owned: false,
    has_udyam_registration: true,
    collateral_available: false,
    location_type: 'URBAN',
    required_funding_amount: 1500000,
  });

  const loadSchemes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/schemes');
      if (res.data.success) {
        setSchemes(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load schemes', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunEvaluation = async (e) => {
    if (e) e.preventDefault();
    setIsEvaluating(true);
    try {
      const res = await api.post('/schemes/evaluate', {
        ...profile,
        required_funding_amount: parseFloat(profile.required_funding_amount || 0),
      });
      if (res.data.success) {
        setEvaluationResults(res.data.data);
      }
    } catch (err) {
      console.error('Evaluation failed', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    loadSchemes();
    handleRunEvaluation();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'POTENTIALLY_ELIGIBLE':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            <CheckCircle size={13} /> POTENTIALLY ELIGIBLE
          </span>
        );
      case 'INSUFFICIENT_INFO':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', color: '#D97706' }}>
            <HelpCircle size={13} /> INSUFFICIENT INFO
          </span>
        );
      case 'INELIGIBLE':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <XCircle size={13} /> INELIGIBLE
          </span>
        );
    }
  };

  const evaluatedList = evaluationResults?.schemes || schemes.map(s => ({
    scheme_code: s.code,
    scheme_name: s.name,
    category: s.category,
    ministry_or_agency: s.ministry_or_agency,
    key_benefits: s.key_benefits,
    eligibility_status: 'UNKNOWN',
    explanation: s.description,
    criteria_checklist: [],
    official_portal_url: s.official_portal_url,
    last_verified_date: s.last_verified_date
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Enterprise Parameter Form */}
      <Card padding="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Enterprise Parameters for Scheme Screening</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Evaluate eligibility against official Indian Government & Banking MSME assistance schemes
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleRunEvaluation} disabled={isEvaluating}>
            <RefreshCw size={13} style={{ marginRight: '6px' }} />
            {isEvaluating ? 'Evaluating...' : 'Screen Schemes'}
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Enterprise Classification
            </label>
            <select
              value={profile.enterprise_type}
              onChange={(e) => setProfile({ ...profile, enterprise_type: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '12px' }}
            >
              <option value="MICRO">Micro Enterprise (&lt; ₹5 Cr turnover)</option>
              <option value="SMALL">Small Enterprise (₹5 - 50 Cr)</option>
              <option value="MEDIUM">Medium Enterprise (₹50 - 250 Cr)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Industry Sector
            </label>
            <select
              value={profile.industry_sector}
              onChange={(e) => setProfile({ ...profile, industry_sector: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '12px' }}
            >
              <option value="MANUFACTURING">Manufacturing</option>
              <option value="SERVICES">Services</option>
              <option value="RETAIL_TRADE">Retail / Wholesale Trade</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Promoter Social Category
            </label>
            <select
              value={profile.owner_category}
              onChange={(e) => setProfile({ ...profile, owner_category: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '12px' }}
            >
              <option value="GENERAL">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="MINORITY">Minority / Special Category</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Desired Funding / Loan (₹)
            </label>
            <input
              type="number"
              step="50000"
              value={profile.required_funding_amount}
              onChange={(e) => setProfile({ ...profile, required_funding_amount: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={profile.has_udyam_registration}
                onChange={(e) => setProfile({ ...profile, has_udyam_registration: e.target.checked })}
              />
              <span>Has Valid Udyam Registration</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={profile.is_woman_owned}
                onChange={(e) => setProfile({ ...profile, is_woman_owned: e.target.checked })}
              />
              <span>Woman-led Enterprise (≥51%)</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Evaluation Summary KPIs */}
      {evaluationResults && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
          <Card padding="sm" style={{ borderLeft: '4px solid #10B981' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Potentially Eligible</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
              {evaluationResults.summary?.eligible_count || 0}
            </div>
          </Card>
          <Card padding="sm" style={{ borderLeft: '4px solid #D97706' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Insufficient Info</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706' }}>
              {evaluationResults.summary?.insufficient_info_count || 0}
            </div>
          </Card>
          <Card padding="sm" style={{ borderLeft: '4px solid #EF4444' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ineligible</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444' }}>
              {evaluationResults.summary?.ineligible_count || 0}
            </div>
          </Card>
          <Card padding="sm">
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Evaluated</div>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>
              {evaluationResults.summary?.total_schemes || 0}
            </div>
          </Card>
        </div>
      )}

      {/* Scheme Cards Catalog */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading schemes catalog...</div>
        ) : evaluatedList.map((scheme) => {
          const isExpanded = expandedScheme === scheme.scheme_code;
          return (
            <Card key={scheme.scheme_code} padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface-hover)', fontFamily: 'monospace' }}>
                      {scheme.scheme_code}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>• {scheme.ministry_or_agency}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '6px 0 4px 0' }}>{scheme.scheme_name}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <strong>Key Benefit:</strong> {scheme.key_benefits}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    {scheme.explanation}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {getStatusBadge(scheme.eligibility_status)}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {scheme.official_portal_url && (
                      <a
                        href={scheme.official_portal_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Official Portal <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      onClick={() => setExpandedScheme(isExpanded ? null : scheme.scheme_code)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                    >
                      {isExpanded ? 'Hide Criteria' : 'View Criteria'}
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Criteria Checklist Drawer */}
              {isExpanded && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-root)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                    Eligibility Criteria Evaluation Breakdown:
                  </div>
                  {scheme.criteria_checklist?.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Detailed criteria checklist unavailable.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {scheme.criteria_checklist.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '11px',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            background: c.is_satisfied ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {c.is_satisfied ? (
                              <CheckCircle size={14} color="#10B981" />
                            ) : (
                              <XCircle size={14} color="#EF4444" />
                            )}
                            <span style={{ fontWeight: 600 }}>{c.criterion_name}</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                            Req: {c.required_value} | Obs: {String(c.observed_value ?? 'N/A')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Last verified with official agency guidelines: {scheme.last_verified_date || '2025-01-15'}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Advisory notice */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        <ShieldAlert size={16} color="#D97706" style={{ flexShrink: 0 }} />
        <span>
          <strong>Advisory Note:</strong> MSME360 evaluates potential program fit based on enterprise profile inputs and public guidelines. It does not automatically submit loan applications or guarantee approval. Final sanctions are subject to lending bank appraisal and statutory agency verification.
        </span>
      </div>
    </div>
  );
}
