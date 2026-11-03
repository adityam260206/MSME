import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/client';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import './DashboardPage.css';

/* ── Formatting ─────────────────────────────────────────────────
 * Money two decimals with Indian grouping; compact figures on an axis;
 * dates as "21 Oct" beside a row and "Saturday 31 October" in a title. */

const money = (value) =>
  '₹' + Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const compact = (value) => {
  const n = Number(value || 0);
  const trim = (s) => s.replace(/\.0$/, '');
  if (n >= 10000000) return `₹${trim((n / 10000000).toFixed(1))}Cr`;
  if (n >= 100000) return `₹${trim((n / 100000).toFixed(1))}L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${Math.round(n)}`;
};

const plainMoney = (value) => '₹' + Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const dayLabel = (iso) => {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getDate()} ${date.toLocaleString('en-GB', { month: 'short' })}`;
};

const longDate = (iso) => {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};

const clock = (date) =>
  date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Round the tick step so the axis reads 0 / 10k / 20k / 30k, never 0 / 13k / 25k. */
function niceStep(max, count = 4) {
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const scaled = raw / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * Daily takings as one line. One series, four gridlines, no y-axis line, no
 * fill, no markers — except today, which takes the one chart hue, and the
 * biggest day, which is labelled with its cause and amount.
 */
function TakingsChart({ points, height = 175 }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width);
      if (next > 120) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const W = width;
  const H = height;
  const pad = { top: 26, right: 14, bottom: 24, left: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const values = points.map((point) => Number(point.revenue || 0));
  const step = niceStep(Math.max(...values, 0));
  const ceiling = step * 4;
  const x = (index) => pad.left + (points.length <= 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const y = (value) => pad.top + plotH - (value / ceiling) * plotH;

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(values[index]).toFixed(1)}`).join(' ');

  const peakIndex = values.reduce((best, value, index) => (value > values[best] ? index : best), 0);
  const peakValue = values[peakIndex] || 0;
  const lastIndex = points.length - 1;

  const ticks = [0, 1, 2, 3, 4].map((n) => n * step);
  const xLabelCount = W < 430 ? 2 : 3;
  const labelEvery = Math.max(1, Math.floor(points.length / xLabelCount));
  const xLabelIndexes = points
    .map((_, index) => index)
    .filter((index) => index % labelEvery === 0 || index === lastIndex);

  const summary =
    peakValue > 0
      ? `Daily takings, last ${points.length} days. Highest ${money(peakValue)} on ${dayLabel(points[peakIndex].date)}; today ${money(values[lastIndex])}.`
      : `Daily takings, last ${points.length} days. No bills taken in this period.`;

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        className="takings-chart"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={summary}
      >
      {ticks.map((tick) => (
        <line
          key={tick}
          x1={pad.left}
          x2={W - pad.right}
          y1={y(tick)}
          y2={y(tick)}
          stroke="var(--grid)"
          strokeWidth="1"
        />
      ))}

      <line
        x1={pad.left}
        x2={W - pad.right}
        y1={y(0)}
        y2={y(0)}
        stroke="var(--border)"
        strokeWidth="1"
      />

      {ticks.map((tick) => (
        <text key={`label-${tick}`} x={pad.left - 8} y={y(tick) + 3.5} textAnchor="end" className="chart-tick">
          {compact(tick)}
        </text>
      ))}

      <path d={path} fill="none" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {peakValue > 0 && peakIndex !== lastIndex && (
        <g>
          <line
            x1={x(peakIndex)}
            x2={x(peakIndex)}
            y1={y(peakValue) - 6}
            y2={pad.top + 10}
            stroke="var(--control)"
            strokeWidth="1"
          />
          <text x={x(peakIndex)} y={pad.top - 2} textAnchor="middle" className="chart-note">
            {dayLabel(points[peakIndex].date)} · {plainMoney(peakValue)}
          </text>
        </g>
      )}

      {/* Today: the one hue on the screen's main data element. */}
      <circle cx={x(lastIndex)} cy={y(values[lastIndex])} r="3.5" fill="var(--accent)" />

      {xLabelIndexes.map((index) => (
        <text
          key={`x-${index}`}
          x={Math.min(Math.max(x(index), pad.left + 10), W - pad.right - 10)}
          y={H - 6}
          textAnchor={index === 0 ? 'start' : index === lastIndex ? 'end' : 'middle'}
          className="chart-tick"
        >
          {dayLabel(points[index].date)}
        </text>
      ))}
      </svg>
    </div>
  );
}

function PlanRow({ label, actual, target, unit = 'money', percent, footnote }) {
  const ratio = Number(target) > 0 ? Math.min(1, Number(actual) / Number(target)) : 0;
  const met = Number(actual) >= Number(target) && Number(target) > 0;

  return (
    <div className="plan-row">
      <div className="plan-row-head">
        <span className="plan-row-label">{label}</span>
        <span className="plan-row-figures">
          <span className="plan-actual">
            {unit === 'money' ? money(actual) : `${actual} bills`}
          </span>
          <span className="plan-target">
            {' '}of {unit === 'money' ? money(target) : `${target} bills`}
          </span>
        </span>
      </div>
      <div className="plan-track" aria-hidden="true">
        <span className={`plan-fill${met ? ' is-met' : ''}`} style={{ width: `${Math.max(ratio * 100, Number(actual) > 0 ? 2 : 0)}%` }} />
      </div>
      <div className="plan-row-foot">
        <span className="meta">{percent}% of the month's plan</span>
        <span className={met ? 'plan-over' : 'meta'}>{footnote}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { role } = useContext(AuthContext);
  const userRole = role ? String(role).toUpperCase() : 'STAFF';
  const canSeeMoney = userRole !== 'STAFF';
  const canManagePlan = ['ADMIN', 'OWNER'].includes(userRole);
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [range, setRange] = useState(30);
  const [goals, setGoals] = useState(null);
  const [needs, setNeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [planRevenue, setPlanRevenue] = useState('');
  const [planBills, setPlanBills] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summaryRes = await api.get('/dashboard/summary');
      if (summaryRes.data.success) setSummary(summaryRes.data.data);

      if (canSeeMoney) {
        const trendsRes = await api.get('/analytics/sales');
        if (trendsRes.data.success) setTrends(trendsRes.data.data.trends || []);
      }

      try {
        const goalsRes = await api.get('/dashboard/goals');
        if (goalsRes.data.success) {
          setGoals(goalsRes.data.data);
          setPlanRevenue(String(Math.round(Number(goalsRes.data.data.target_revenue || 0))));
          setPlanBills(String(goalsRes.data.data.target_sales_volume || 0));
        }
      } catch {
        // No plan set for this month yet.
      }

      {
        const tasks = [];
        const alerts = [];

        try {
          const actionRes = await api.get('/analytics/action-center');
          if (actionRes.data.success) {
            (actionRes.data.data.actions || []).forEach((action) => {
              tasks.push({
                id: action.id,
                title: action.title,
                body: action.description,
                cta: action.action_label,
                to: action.navigation_path,
                severity: action.severity,
              });
            });
          }
        } catch {
          // Action centre is optional for this screen.
        }

        try {
          const anomalyRes = await api.get('/analytics/anomalies');
          if (anomalyRes.data.success) {
            (anomalyRes.data.data.anomalies || []).forEach((anomaly) => {
              // An anomaly about an item an action already covers would say the
              // same thing twice. The action carries the way out, so it stays.
              const entity = String(anomaly.affected_entity || '').split(' (')[0];
              const alreadyCovered = tasks.some(
                (task) => entity && (task.title.includes(entity) || task.body.includes(entity)),
              );
              if (alreadyCovered) return;

              alerts.push({
                id: anomaly.id,
                title: anomaly.category === 'SALES' ? 'No bills this week' : anomaly.condition,
                body:
                  anomaly.category === 'SALES'
                    ? `${anomaly.observed_value}. The week before: ${anomaly.baseline_value}.`
                    : `${anomaly.affected_entity}: ${anomaly.observed_value}`,
                cta: anomaly.navigation_path === '/sales' ? 'Open the counter' : 'Look at it',
                to: anomaly.navigation_path || '/dashboard',
                severity: anomaly.severity,
              });
            });
          }
        } catch {
          // Analytics is optional for this screen.
        }

        setNeeds([...alerts, ...tasks]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'The screen could not reach the server.');
    } finally {
      setIsLoading(false);
      setUpdatedAt(new Date());
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const shownTrends = useMemo(() => {
    if (!trends.length) return [];
    return range === 7 ? trends.slice(-7) : trends.slice(-30);
  }, [trends, range]);

  const savePlan = async (event) => {
    event.preventDefault();
    setIsSavingPlan(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      await api.post('/dashboard/goals', {
        target_month: month,
        target_revenue: Number(planRevenue),
        target_sales_volume: Number(planBills),
        notes: 'Set from Today',
      });
      const goalsRes = await api.get('/dashboard/goals');
      if (goalsRes.data.success) setGoals(goalsRes.data.data);
      setIsPlanOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'The plan could not be saved.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const today = summary?.today_revenue ?? 0;
  const todayCount = shownTrends.length ? Number(shownTrends[shownTrends.length - 1].sales_count || 0) : 0;

  if (isLoading && !summary) {
    return (
      <div className="today">
        <div className="title-row">
          <div className="skeleton-bar" style={{ width: 120, height: 26 }} />
        </div>
        <div className="band band-lead">
          <div className="panel skeleton-panel" style={{ height: 320 }} />
          <div className="panel skeleton-panel" style={{ height: 320 }} />
        </div>
        <div className="band band-three">
          <div className="panel skeleton-panel" style={{ height: 220 }} />
          <div className="panel skeleton-panel" style={{ height: 220 }} />
          <div className="panel skeleton-panel" style={{ height: 220 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="today">
      <header className="title-row">
        <div className="title-main">
          <h1 className="page-title">Today</h1>
          <p className="page-sub">
            {longDate(new Date().toISOString().slice(0, 10))}
            {canSeeMoney && todayCount > 0
              ? ` — ${todayCount} ${todayCount === 1 ? 'bill' : 'bills'} rung up so far.`
              : canSeeMoney
                ? ' — nothing billed yet today.'
                : ' — the counter is ready for the first bill.'}
          </p>
        </div>
        <div className="title-actions">
          {updatedAt && (
            <span className="freshness">
              Updated {clock(updatedAt)}
              <button className="icon-quiet" onClick={load} aria-label="Refresh today's figures" title="Refresh">
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            </span>
          )}
          <Button
            variant="secondary"
            onClick={() => window.dispatchEvent(new Event('msme360:copilot'))}
          >
            Ask the copilot
          </Button>
          <Button variant="primary" onClick={() => navigate('/sales')}>
            Open the counter
          </Button>
        </div>
      </header>

      {error && (
        <div className="notice" role="status">
          <span>{error}</span>
          <button className="link-action" onClick={load}>Try again</button>
        </div>
      )}

      <section className="band band-lead">
        <article className="panel day-panel">
          <div className="panel-head">
            <h2 className="section-title">The day</h2>
            {canSeeMoney && (
              <div className="range-switch" role="group" aria-label="Period">
                <button
                  className={`range-btn${range === 7 ? ' is-current' : ''}`}
                  onClick={() => setRange(7)}
                  aria-pressed={range === 7}
                >
                  7 days
                </button>
                <button
                  className={`range-btn${range === 30 ? ' is-current' : ''}`}
                  onClick={() => setRange(30)}
                  aria-pressed={range === 30}
                >
                  30 days
                </button>
              </div>
            )}
          </div>

          <div className="day-figure">
            {canSeeMoney ? (
              <>
                <span className="day-value num">{money(today)}</span>
                <span className="day-caption">
                  {todayCount > 0
                    ? `${todayCount} ${todayCount === 1 ? 'bill' : 'bills'} at the counter today`
                    : 'Nothing billed yet today'}
                </span>
              </>
            ) : (
              <>
                <span className="day-value day-value-text">Ready to bill</span>
                <span className="day-caption">The counter is open for the first bill of the day</span>
              </>
            )}
          </div>

          {canSeeMoney && shownTrends.length > 0 ? (
            <TakingsChart points={shownTrends} />
          ) : (
            <p className="panel-note">
              {canSeeMoney
                ? 'No takings recorded in this period.'
                : 'Sales figures are not part of your role. The counter is ready when you are.'}
            </p>
          )}

          {canSeeMoney && (
            <dl className="day-strip">
              <div className="day-cell">
                <dt>Bills today</dt>
                <dd className="num">{todayCount}</dd>
              </div>
              <div className="day-cell">
                <dt>Average bill</dt>
                <dd className="num">{todayCount > 0 ? money(Number(today) / todayCount) : '—'}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="panel needs-panel">
          <div className="panel-head">
            <h2 className="section-title">Needs you</h2>
            <span className="count-tag">{needs.length}</span>
          </div>

          {needs.length === 0 ? (
            <p className="panel-note">
              Nothing needs a decision right now. Stock, bills and the week's takings are on their usual line.
            </p>
          ) : (
            <ul className="needs-list">
              {needs.slice(0, 4).map((item) => (
                <li className="need-row" key={item.id}>
                  <div className="need-body">
                    <p className="need-title">{item.title}</p>
                    <p className="need-text">{item.body}</p>
                    <button className="link-action need-cta" onClick={() => navigate(item.to)}>
                      {item.cta}
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button className="panel-link" onClick={() => navigate('/inventory')}>
            <span>
              {summary?.total_products || 0} items in stock · {summary?.out_of_stock_count || 0} out of stock ·{' '}
              {summary?.low_stock_count || 0} at the reorder point
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </article>
      </section>

      <section className={`band ${canSeeMoney ? 'band-month' : 'band-two'}`}>
        {canSeeMoney && (
          <article className="panel">
            <div className="panel-head">
              <h2 className="section-title">October</h2>
              {canManagePlan && (
                <button className="link-action" onClick={() => setIsPlanOpen(true)}>
                  {goals ? 'Change the plan' : 'Set a plan'}
                </button>
              )}
            </div>

            <dl className="money-grid">
              <div className="money-cell">
                <dt>Revenue</dt>
                <dd className="num">{money(summary?.monthly_revenue)}</dd>
              </div>
              <div className="money-cell">
                <dt>Expenses</dt>
                <dd className="num">{money(summary?.monthly_expenses)}</dd>
              </div>
              <div className="money-cell">
                <dt>Gross profit</dt>
                <dd className="num">{money(summary?.gross_profit)}</dd>
              </div>
              <div className="money-cell">
                <dt>Margin</dt>
                <dd className="num">{Number(summary?.gross_profit_margin || 0).toFixed(1)}%</dd>
              </div>
            </dl>

            <div className="plan-block">
              <div className="plan-block-head">
                <span>Against the month's plan</span>
                <span className="meta">{summary?.monthly_sales_volume || 0} bills so far</span>
              </div>

              {goals ? (
                <div className="plan-list">
                  <PlanRow
                    label="Revenue"
                    actual={goals.actual_revenue}
                    target={goals.target_revenue}
                    percent={Number(goals.revenue_achievement_rate || 0).toFixed(0)}
                    footnote={
                      Number(goals.remaining_revenue_deficit) > 0
                        ? `${money(goals.remaining_revenue_deficit)} to go`
                        : `${money(Number(goals.actual_revenue) - Number(goals.target_revenue))} over plan`
                    }
                  />
                  <PlanRow
                    label="Bills"
                    actual={goals.actual_sales_volume}
                    target={goals.target_sales_volume}
                    unit="count"
                    percent={Number(goals.volume_achievement_rate || 0).toFixed(0)}
                    footnote={
                      Number(goals.target_sales_volume) - Number(goals.actual_sales_volume) > 0
                        ? `${Number(goals.target_sales_volume) - Number(goals.actual_sales_volume)} bills short`
                        : 'Plan met'
                    }
                  />
                </div>
              ) : (
                <p className="panel-note">
                  No plan for this month yet. A revenue and bill target makes next month's screen readable.
                </p>
              )}
            </div>
          </article>
        )}

        <article className="panel">
          <div className="panel-head">
            <h2 className="section-title">Top sellers</h2>
            <span className="meta">Last 30 days</span>
          </div>

          {summary?.top_products?.length ? (
            <table className="sell-table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" className="num">Sold</th>
                  <th scope="col" className="num">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {summary.top_products.slice(0, 5).map((product) => (
                  <tr key={product.product_id || product.sku}>
                    <td className="sell-name" title={product.product_name}>
                      {product.product_name}
                      <span className="sell-stock">{product.stock_quantity} in stock</span>
                    </td>
                    <td className="num">{product.units_sold}</td>
                    <td className="num">{money(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="panel-note">No item has sold in the last 30 days.</p>
          )}

          <button className="panel-link" onClick={() => navigate('/inventory')}>
            <span>See the catalogue</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </article>

        {!canSeeMoney && (
          <article className="panel">
            <div className="panel-head">
              <h2 className="section-title">Stock</h2>
              <button className="link-action" onClick={() => navigate('/inventory')}>
                See stock
              </button>
            </div>
            <dl className="money-grid three">
              <div className="money-cell">
                <dt>Items in the catalogue</dt>
                <dd className="num">{summary?.total_products || 0}</dd>
              </div>
              <div className="money-cell">
                <dt>At its reorder point</dt>
                <dd className="num">{summary?.low_stock_count || 0}</dd>
              </div>
              <div className="money-cell">
                <dt>Out of stock</dt>
                <dd className="num">{summary?.out_of_stock_count || 0}</dd>
              </div>
            </dl>
            <p className="panel-note tight">
              Counts come from the catalogue's stock levels. Open Stock to reorder or adjust an item.
            </p>
          </article>
        )}
      </section>

      <Modal
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        title="This month's plan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPlanOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="plan-form" isLoading={isSavingPlan}>
              Save the plan
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={savePlan} className="plan-form">
          <Input
            label="Revenue target for the month (₹)"
            type="number"
            min="0"
            step="500"
            value={planRevenue}
            onChange={(event) => setPlanRevenue(event.target.value)}
            required
          />
          <Input
            label="Bills to take"
            type="number"
            min="0"
            step="1"
            value={planBills}
            onChange={(event) => setPlanBills(event.target.value)}
            required
          />
          <p className="meta">
            The plan is compared against the month's billed total, not against what the shop hoped for.
          </p>
        </form>
      </Modal>
    </div>
  );
}
