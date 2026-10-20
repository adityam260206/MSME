const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const Category = require('../models/Category.model');
const Budget = require('../models/Budget.model');
const Account = require('../models/Account.model');

/**
 * Get top-level metrics for a specific month (YYYY-MM).
 * Returns: { totalIncome, totalExpense, balance, savingsRate }
 */
async function getMonthlySummary(userId, period) {
  const [year, month] = period.split('-');
  const startDate = new Date(year, parseInt(month) - 1, 1);
  const endDate = new Date(year, parseInt(month), 0, 23, 59, 59, 999);

  const stats = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  let totalIncome = 0;
  let totalExpense = 0;

  stats.forEach(stat => {
    if (stat._id === 'income') totalIncome = stat.total;
    if (stat._id === 'expense') totalExpense = stat.total;
  });

  const periodBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((periodBalance / totalIncome) * 100).toFixed(1) : 0;

  // Real total balance is sum of all accounts
  const accounts = await Account.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$currentBalance' } } }
  ]);
  const totalBalance = accounts.length > 0 ? accounts[0].total : 0;

  return {
    period,
    totalIncome,
    totalExpense,
    periodBalance, // Just for this month
    balance: totalBalance, // True global balance
    savingsRate: parseFloat(savingsRate)
  };
}

/**
 * Get spending breakdown by category for a pie chart.
 */
async function getCategoryBreakdown(userId, period, accountId) {
  const [year, month] = period.split('-');
  const startDate = new Date(year, parseInt(month) - 1, 1);
  const endDate = new Date(year, parseInt(month), 0, 23, 59, 59, 999);

  const matchObj = {
    user: new mongoose.Types.ObjectId(userId),
    type: 'expense',
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (accountId) {
    matchObj.account = new mongoose.Types.ObjectId(accountId);
  }

  // Group expenses by category ID
  const breakdown = await Transaction.aggregate([
    {
      $match: matchObj
    },
    {
      $group: {
        _id: '$category',
        amount: { $sum: '$amount' }
      }
    },
    {
      $sort: { amount: -1 } // Highest spend first
    }
  ]);

  // Populate category details
  await Category.populate(breakdown, { path: '_id', select: 'name icon color' });

  // Map to a clean array format for Recharts
  return breakdown.map(item => ({
    categoryId: item._id._id,
    name: item._id.name,
    icon: item._id.icon,
    color: item._id.color,
    value: item.amount
  }));
}

/**
 * Get a 6-month historical trend of income vs expenses for a bar chart.
 */
async function getSixMonthTrend(userId) {
  const now = new Date();
  // Start from 5 months ago (so it includes the current month = 6 total)
  const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const trend = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Restructure MongoDB aggregate output into a flat array of 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearStr = d.getFullYear();
    const monthNum = d.getMonth() + 1;
    
    // Find matching income/expense in aggregate results
    const incomeObj = trend.find(t => t._id.year === yearStr && t._id.month === monthNum && t._id.type === 'income');
    const expenseObj = trend.find(t => t._id.year === yearStr && t._id.month === monthNum && t._id.type === 'expense');

    months.push({
      period: `${yearStr}-${String(monthNum).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short' }), // e.g. "Jul"
      income: incomeObj ? incomeObj.total : 0,
      expense: expenseObj ? expenseObj.total : 0
    });
  }

  return months;
}

/**
 * Calculate a Financial Health Score (0–100) with explanatory reasons.
 *
 * Scoring Breakdown (total = 100):
 *   1. Savings Rate              → max 25 pts
 *   2. Budget Adherence          → max 20 pts
 *   3. Income vs Expense Ratio   → max 20 pts
 *   4. Overspending Frequency    → max 15 pts
 *   5. Spending Consistency      → max 10 pts
 *   6. Recurring Expense Ratio   → max 10 pts
 *
 * All calculations use deterministic statistical methods — no AI/ML.
 */
async function getFinancialHealth(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── Gather data for the last 3 months ──────────────────────────────
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const monthlyTotals = await Transaction.aggregate([
    { $match: { user: uid, date: { $gte: threeMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Build a lookup: { 'YYYY-MM': { income, expense } }
  const monthMap = {};
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = { income: 0, expense: 0 };
  }

  monthlyTotals.forEach(item => {
    const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
    if (monthMap[key]) {
      if (item._id.type === 'income') monthMap[key].income = item.total;
      if (item._id.type === 'expense') monthMap[key].expense = item.total;
    }
  });

  const periods = Object.keys(monthMap).sort();
  const current = monthMap[currentPeriod] || { income: 0, expense: 0 };

  let totalScore = 0;
  const factors = [];

  // ── 1. Savings Rate (max 25 pts) ───────────────────────────────────
  const savingsRate = current.income > 0
    ? ((current.income - current.expense) / current.income) * 100
    : 0;

  let savingsScore;
  if (savingsRate >= 30) savingsScore = 25;
  else if (savingsRate >= 20) savingsScore = 20;
  else if (savingsRate >= 10) savingsScore = 15;
  else if (savingsRate >= 0) savingsScore = 8;
  else savingsScore = 0;

  totalScore += savingsScore;

  if (savingsRate >= 20) {
    factors.push({ type: 'positive', text: `Great savings rate of ${savingsRate.toFixed(1)}% this month.` });
  } else if (savingsRate >= 0) {
    factors.push({ type: 'neutral', text: `Savings rate is ${savingsRate.toFixed(1)}%. Aim for 20%+ for better financial health.` });
  } else {
    factors.push({ type: 'negative', text: `You are spending more than you earn this month (${savingsRate.toFixed(1)}% savings rate).` });
  }

  // ── 2. Budget Adherence (max 20 pts) ───────────────────────────────
  const budgets = await Budget.find({ user: userId, period: currentPeriod });

  if (budgets.length > 0) {
    const [startY, startM] = currentPeriod.split('-');
    const budgetStart = new Date(startY, parseInt(startM) - 1, 1);
    const budgetEnd = new Date(startY, parseInt(startM), 0, 23, 59, 59, 999);

    let withinCount = 0;
    for (const budget of budgets) {
      const [spentResult] = await Transaction.aggregate([
        { $match: { user: uid, category: budget.category, type: 'expense', date: { $gte: budgetStart, $lte: budgetEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const spent = spentResult ? spentResult.total : 0;
      if (spent <= budget.amount) withinCount++;
    }

    const adherenceRate = (withinCount / budgets.length) * 100;
    const adherenceScore = Math.round((adherenceRate / 100) * 20);
    totalScore += adherenceScore;

    if (adherenceRate === 100) {
      factors.push({ type: 'positive', text: `All ${budgets.length} budgets are within limits. Excellent discipline!` });
    } else if (adherenceRate >= 50) {
      factors.push({ type: 'neutral', text: `${withinCount} of ${budgets.length} budgets are within limits.` });
    } else {
      factors.push({ type: 'negative', text: `Only ${withinCount} of ${budgets.length} budgets are within limits. Review your spending.` });
    }
  } else {
    // No budgets set — give partial credit but recommend setting budgets
    totalScore += 10;
    factors.push({ type: 'neutral', text: 'No budgets set yet. Setting budgets helps control spending.' });
  }

  // ── 3. Income vs Expense Ratio (max 20 pts) ───────────────────────
  const ratio = current.income > 0 ? current.expense / current.income : (current.expense > 0 ? 2 : 0);

  let ratioScore;
  if (ratio <= 0.5) ratioScore = 20;
  else if (ratio <= 0.7) ratioScore = 16;
  else if (ratio <= 0.9) ratioScore = 12;
  else if (ratio <= 1.0) ratioScore = 6;
  else ratioScore = 0;

  totalScore += ratioScore;

  if (ratio <= 0.7) {
    factors.push({ type: 'positive', text: `Expenses are ${(ratio * 100).toFixed(0)}% of income — healthy ratio.` });
  } else if (ratio <= 1.0) {
    factors.push({ type: 'neutral', text: `Expenses are ${(ratio * 100).toFixed(0)}% of income. Try reducing to below 70%.` });
  } else if (current.income > 0) {
    factors.push({ type: 'negative', text: `Expenses exceed income by ${((ratio - 1) * 100).toFixed(0)}%.` });
  }

  // ── 4. Overspending Frequency (max 15 pts) ─────────────────────────
  // Check how many of the last 3 months had expenses > income
  let overspendCount = 0;
  periods.forEach(p => {
    if (monthMap[p].expense > monthMap[p].income && monthMap[p].income > 0) {
      overspendCount++;
    }
  });

  const activePeriods = periods.filter(p => monthMap[p].income > 0 || monthMap[p].expense > 0).length;

  let overspendScore;
  if (activePeriods === 0) overspendScore = 10;
  else if (overspendCount === 0) overspendScore = 15;
  else if (overspendCount === 1) overspendScore = 10;
  else if (overspendCount === 2) overspendScore = 5;
  else overspendScore = 0;

  totalScore += overspendScore;

  if (overspendCount === 0 && activePeriods > 0) {
    factors.push({ type: 'positive', text: 'No overspending in the last 3 months.' });
  } else if (overspendCount > 0) {
    factors.push({ type: 'negative', text: `Overspent in ${overspendCount} of the last 3 months.` });
  }

  // ── 5. Spending Consistency (max 10 pts) ───────────────────────────
  // Low variance in monthly expenses = consistent = good
  const expenseValues = periods.map(p => monthMap[p].expense).filter(e => e > 0);

  let consistencyScore = 5; // Default if insufficient data
  if (expenseValues.length >= 2) {
    const mean = expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length;
    const variance = expenseValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / expenseValues.length;
    const coeffOfVariation = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

    if (coeffOfVariation <= 15) consistencyScore = 10;
    else if (coeffOfVariation <= 30) consistencyScore = 7;
    else if (coeffOfVariation <= 50) consistencyScore = 4;
    else consistencyScore = 2;

    if (coeffOfVariation <= 20) {
      factors.push({ type: 'positive', text: 'Spending is consistent month-to-month.' });
    } else {
      factors.push({ type: 'neutral', text: `Monthly spending varies by ~${coeffOfVariation.toFixed(0)}%. More consistency helps planning.` });
    }
  } else {
    factors.push({ type: 'neutral', text: 'Need more months of data to assess spending consistency.' });
  }

  totalScore += consistencyScore;

  // ── 6. Recurring Expense Awareness (max 10 pts) ────────────────────
  // Detect pseudo-recurring: same category + similar amount appearing 2+ months
  const recurringCheck = await Transaction.aggregate([
    { $match: { user: uid, type: 'expense', date: { $gte: threeMonthsAgo } } },
    {
      $group: {
        _id: { category: '$category', amount: '$amount' },
        months: { $addToSet: { $month: '$date' } },
        count: { $sum: 1 }
      }
    },
    { $match: { 'months.1': { $exists: true } } } // appeared in 2+ distinct months
  ]);

  const totalExpenseTx = await Transaction.countDocuments({ user: uid, type: 'expense', date: { $gte: threeMonthsAgo } });
  const recurringRatio = totalExpenseTx > 0 ? recurringCheck.length / totalExpenseTx : 0;

  // Lower recurring ratio = better (more of your spending is predictable)
  let recurringScore;
  if (recurringCheck.length > 0 && recurringRatio <= 0.3) {
    recurringScore = 10;
    factors.push({ type: 'positive', text: `${recurringCheck.length} predictable recurring expense pattern(s) detected.` });
  } else if (recurringCheck.length > 0) {
    recurringScore = 6;
    factors.push({ type: 'neutral', text: `${recurringCheck.length} recurring expense pattern(s) found. Monitor these for savings opportunities.` });
  } else {
    recurringScore = 5;
    factors.push({ type: 'neutral', text: 'No recurring expense patterns detected yet.' });
  }

  totalScore += recurringScore;

  // ── Determine status ───────────────────────────────────────────────
  const score = Math.min(100, Math.max(0, Math.round(totalScore)));
  let status;
  if (score >= 80) status = 'Excellent';
  else if (score >= 60) status = 'Good';
  else if (score >= 40) status = 'Average';
  else status = 'Needs Improvement';

  // The adherenceScore was computed in section 2 above. If no budgets, it was 10.
  const finalAdherenceScore = totalScore - savingsScore - ratioScore - overspendScore - consistencyScore - recurringScore;

  return {
    score,
    status,
    factors,
    breakdown: {
      savingsRate: savingsScore,
      budgetAdherence: finalAdherenceScore,
      incomeExpenseRatio: ratioScore,
      overspendingFrequency: overspendScore,
      spendingConsistency: consistencyScore,
      recurringExpenses: recurringScore
    }
  };
}

/**
 * Generate deterministic spending insights from transaction data.
 *
 * Insight types produced:
 *   1. Category month-over-month change  ("Food spending increased by 18%")
 *   2. Budget streak detection            ("Within budget for 3 consecutive months")
 *   3. Category trend direction           ("Entertainment expenses are decreasing")
 *   4. Top spending category              ("Transport is your highest spending category")
 *   5. Weekday vs weekend analysis        ("Weekend spending is significantly higher")
 *   6. Average daily spend                ("Average daily spending this month is ₹640")
 *   7. Income trend                       ("Income grew by 12% compared to last month")
 *   8. Largest single transaction          ("Your biggest expense this month was ₹5,000")
 *
 * All calculations are purely statistical — no AI, no LLMs, no external APIs.
 */
async function getSpendingInsights(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  // Date boundaries
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const insights = [];

  // ── 1 & 3. Category comparison: current vs previous month ──────────
  const categoryByMonth = await Transaction.aggregate([
    { $match: { user: uid, type: 'expense', date: { $gte: prevMonthStart, $lte: curMonthEnd } } },
    {
      $group: {
        _id: {
          category: '$category',
          isCurrentMonth: {
            $cond: [{ $gte: ['$date', curMonthStart] }, true, false]
          }
        },
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Populate category names
  await Category.populate(categoryByMonth, { path: '_id.category', select: 'name icon' });

  // Build lookup: { categoryName: { current, previous } }
  const catCompare = {};
  categoryByMonth.forEach(item => {
    if (!item._id.category) return;
    const name = item._id.category.name;
    if (!catCompare[name]) catCompare[name] = { current: 0, previous: 0, icon: item._id.category.icon };
    if (item._id.isCurrentMonth) catCompare[name].current = item.total;
    else catCompare[name].previous = item.total;
  });

  // Generate insights per category
  Object.entries(catCompare).forEach(([name, data]) => {
    if (data.previous > 0 && data.current > 0) {
      const pctChange = ((data.current - data.previous) / data.previous) * 100;

      if (Math.abs(pctChange) >= 10) {
        const direction = pctChange > 0 ? 'increased' : 'decreased';
        insights.push({
          type: pctChange > 0 ? 'warning' : 'positive',
          icon: data.icon || '📊',
          text: `${name} spending ${direction} by ${Math.abs(pctChange).toFixed(0)}% compared to last month.`
        });
      }
    }

    // Trend direction (3-month) — if we have previous and current
    if (data.previous > 0 && data.current > 0) {
      if (data.current < data.previous * 0.85) {
        insights.push({
          type: 'positive',
          icon: '📉',
          text: `${name} expenses are trending downward.`
        });
      }
    }
  });

  // ── 4. Top spending category this month ────────────────────────────
  const topCategories = Object.entries(catCompare)
    .filter(([, d]) => d.current > 0)
    .sort((a, b) => b[1].current - a[1].current);

  if (topCategories.length > 0) {
    const [topName, topData] = topCategories[0];
    insights.push({
      type: 'info',
      icon: topData.icon || '🏆',
      text: `${topName} is your highest spending category this month.`
    });
  }

  // ── 5. Weekend vs weekday spending ─────────────────────────────────
  const dayOfWeekSpend = await Transaction.aggregate([
    { $match: { user: uid, type: 'expense', date: { $gte: curMonthStart, $lte: curMonthEnd } } },
    {
      $group: {
        _id: { $dayOfWeek: '$date' }, // 1=Sun, 7=Sat
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  let weekdayTotal = 0, weekdayDays = 0;
  let weekendTotal = 0, weekendDays = 0;

  dayOfWeekSpend.forEach(d => {
    if (d._id === 1 || d._id === 7) { // Sunday or Saturday
      weekendTotal += d.total;
      weekendDays += d.count;
    } else {
      weekdayTotal += d.total;
      weekdayDays += d.count;
    }
  });

  if (weekendDays > 0 && weekdayDays > 0) {
    const avgWeekend = weekendTotal / weekendDays;
    const avgWeekday = weekdayTotal / weekdayDays;

    if (avgWeekend > avgWeekday * 1.3) {
      const pct = ((avgWeekend - avgWeekday) / avgWeekday * 100).toFixed(0);
      insights.push({
        type: 'warning',
        icon: '📅',
        text: `Weekend spending is ${pct}% higher per transaction than weekdays.`
      });
    } else if (avgWeekday > avgWeekend * 1.3) {
      insights.push({
        type: 'info',
        icon: '📅',
        text: 'You spend more on weekdays than weekends.'
      });
    }
  }

  // ── 6. Average daily spending ──────────────────────────────────────
  const totalExpenseThisMonth = Object.values(catCompare).reduce((sum, d) => sum + d.current, 0);
  const dayOfMonth = now.getDate();

  if (totalExpenseThisMonth > 0) {
    const dailyAvg = totalExpenseThisMonth / dayOfMonth;
    insights.push({
      type: 'info',
      icon: '💰',
      text: `Average daily spending this month is ₹${dailyAvg.toFixed(0)}.`
    });
  }

  // ── 7. Income comparison ───────────────────────────────────────────
  const incomeByMonth = await Transaction.aggregate([
    { $match: { user: uid, type: 'income', date: { $gte: prevMonthStart, $lte: curMonthEnd } } },
    {
      $group: {
        _id: { $cond: [{ $gte: ['$date', curMonthStart] }, 'current', 'previous'] },
        total: { $sum: '$amount' }
      }
    }
  ]);

  const incomeMap = { current: 0, previous: 0 };
  incomeByMonth.forEach(i => { incomeMap[i._id] = i.total; });

  if (incomeMap.previous > 0 && incomeMap.current > 0) {
    const incPct = ((incomeMap.current - incomeMap.previous) / incomeMap.previous) * 100;
    if (Math.abs(incPct) >= 5) {
      insights.push({
        type: incPct > 0 ? 'positive' : 'warning',
        icon: incPct > 0 ? '📈' : '📉',
        text: `Income ${incPct > 0 ? 'grew' : 'declined'} by ${Math.abs(incPct).toFixed(0)}% compared to last month.`
      });
    }
  }

  // ── 8. Largest single expense this month ───────────────────────────
  const largestExpense = await Transaction.findOne({
    user: uid, type: 'expense',
    date: { $gte: curMonthStart, $lte: curMonthEnd }
  }).sort({ amount: -1 }).populate('category', 'name icon');

  if (largestExpense) {
    insights.push({
      type: 'info',
      icon: largestExpense.category?.icon || '💸',
      text: `Your biggest expense this month was ₹${largestExpense.amount.toLocaleString()} (${largestExpense.category?.name || 'Uncategorized'}).`
    });
  }

  // ── 9. Budget streak (consecutive months within budget) ────────────
  // Check last 3 months for budget adherence
  const budgetPeriods = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    budgetPeriods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  let consecutiveWithin = 0;
  for (const period of budgetPeriods) {
    const budgets = await Budget.find({ user: userId, period });
    if (budgets.length === 0) break;

    const [pYear, pMonth] = period.split('-');
    const pStart = new Date(pYear, parseInt(pMonth) - 1, 1);
    const pEnd = new Date(pYear, parseInt(pMonth), 0, 23, 59, 59, 999);

    let allWithin = true;
    for (const budget of budgets) {
      const [spent] = await Transaction.aggregate([
        { $match: { user: uid, category: budget.category, type: 'expense', date: { $gte: pStart, $lte: pEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      if (spent && spent.total > budget.amount) {
        allWithin = false;
        break;
      }
    }

    if (allWithin) consecutiveWithin++;
    else break;
  }

  if (consecutiveWithin >= 2) {
    insights.push({
      type: 'positive',
      icon: '🏅',
      text: `You remained within budget for ${consecutiveWithin} consecutive month${consecutiveWithin > 1 ? 's' : ''}!`
    });
  }

  // Sort: positives first, then info, then warnings
  const priority = { positive: 0, info: 1, warning: 2 };
  insights.sort((a, b) => (priority[a.type] ?? 1) - (priority[b.type] ?? 1));

  return { insights, generatedAt: now.toISOString() };
}

/**
 * Predict next month's spending based on historical data.
 * Calculates a simple average of the last 3 months of spending per category.
 */
async function getSpendingPrediction(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  
  // Use last 3 full months (not including current incomplete month)
  // E.g., if now is mid-July, we look at April, May, June
  const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Group by category and month
  const pastExpenses = await Transaction.aggregate([
    { 
      $match: { 
        user: uid, 
        type: 'expense', 
        date: { $gte: threeMonthsAgoStart, $lte: lastMonthEnd } 
      } 
    },
    {
      $group: {
        _id: {
          category: '$category',
          month: { $month: '$date' },
          year: { $year: '$date' }
        },
        monthlyTotal: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        totalSpend: { $sum: '$monthlyTotal' },
        monthsActive: { $sum: 1 } // How many of the 3 months they spent in this category
      }
    }
  ]);

  await Category.populate(pastExpenses, { path: '_id', select: 'name icon color' });

  let predictedTotal = 0;
  const breakdown = [];

  for (const exp of pastExpenses) {
    if (!exp._id) continue; // Skip orphaned categories

    // Calculate average over the 3 months (divide by 3, not just active months, 
    // unless you want a conservative prediction)
    // Statistical smoothing: totalSpend / 3 months gives the average monthly run rate
    const predictedAmount = exp.totalSpend / 3;

    if (predictedAmount > 0) {
      predictedTotal += predictedAmount;
      breakdown.push({
        categoryId: exp._id._id,
        name: exp._id.name,
        icon: exp._id.icon,
        color: exp._id.color,
        predictedAmount: Math.round(predictedAmount * 100) / 100
      });
    }
  }

  // Sort by highest predicted amount
  breakdown.sort((a, b) => b.predictedAmount - a.predictedAmount);

  // Also calculate current month's spend for comparison
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const [curMonthResult] = await Transaction.aggregate([
    { 
      $match: { 
        user: uid, 
        type: 'expense', 
        date: { $gte: curMonthStart, $lte: curMonthEnd } 
      } 
    },
    {
      $group: { _id: null, total: { $sum: '$amount' } }
    }
  ]);
  const currentMonthSpend = curMonthResult ? curMonthResult.total : 0;

  return {
    predictedTotal: Math.round(predictedTotal * 100) / 100,
    currentMonthSpend,
    breakdown
  };
}

module.exports = {
  getMonthlySummary,
  getCategoryBreakdown,
  getSixMonthTrend,
  getFinancialHealth,
  getSpendingInsights,
  getSpendingPrediction
};
