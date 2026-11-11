import React, { useEffect, useMemo, useState } from 'react';
import type { Expense } from '../../types';
import { fxFixtureMeta } from '../../fixtures/expenses/fxRates';
import {
  addExpense,
  computeGroupShares,
  convertCurrency,
  deleteExpense,
  getFxFixtureInfo,
  getSupportedCurrencies,
  listExpenses,
  summarizeBudget,
} from '../../services/expenses';

const categories: Expense['category'][] = ['food', 'transport', 'lodging', 'entertainment', 'shopping', 'emergency', 'other'];
const paymentMethods: Expense['paymentMethod'][] = ['cash', 'card', 'mobile_pay'];

export const ExpenseManager: React.FC<{ tripId?: string }> = ({ tripId }) => {
  const currencies = useMemo(() => getSupportedCurrencies(), []);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Converter
  const [convAmount, setConvAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');

  // Form
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [category, setCategory] = useState<Expense['category']>('food');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Expense['paymentMethod']>('card');
  const [paidBy, setPaidBy] = useState('');
  const [splitWith, setSplitWith] = useState('');
  const [budget, setBudget] = useState('0');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setExpenses(await listExpenses(tripId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const conversion = useMemo(() => {
    try {
      return convertCurrency(Number(convAmount || 0), fromCurrency, toCurrency);
    } catch {
      return null;
    }
  }, [convAmount, fromCurrency, toCurrency]);

  const summary = useMemo(() => summarizeBudget(expenses, Number(budget || 0), baseCurrency), [expenses, budget, baseCurrency]);
  const shares = useMemo(() => computeGroupShares(expenses, baseCurrency), [expenses, baseCurrency]);
  const fxInfo = getFxFixtureInfo();

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await addExpense({
        tripId,
        amount: Number(amount),
        currency,
        baseCurrency,
        category,
        date,
        description,
        paymentMethod,
        paidBy,
        splitWith: splitWith.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setAmount('');
      setDescription('');
      setPaidBy('');
      setSplitWith('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    }
  };

  return (
    <div className="space-y-6" aria-label="Currency and Expense Manager">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Currency & Expense Manager</h1>
        <p className="text-sm text-slate-400 mt-1">
          Multi-currency conversion, daily expense tracking, group splits, and budget monitoring using bundled local mock FX rates only. No payment providers or cloud sync.
        </p>
      </div>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4" aria-labelledby="converter-heading">
        <h2 id="converter-heading" className="text-lg font-semibold text-white">Multi-currency converter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="conv-amount" className="block text-xs font-semibold text-slate-300 mb-1">Amount</label>
            <input id="conv-amount" type="number" min="0" step="0.01" value={convAmount} onChange={(e) => setConvAmount(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label htmlFor="conv-from" className="block text-xs font-semibold text-slate-300 mb-1">From</label>
            <select id="conv-from" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white">
              {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="conv-to" className="block text-xs font-semibold text-slate-300 mb-1">To</label>
            <select id="conv-to" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white">
              {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100" aria-live="polite">
            {conversion ? (
              <><div className="font-semibold">{conversion.convertedAmount} {conversion.toCurrency}</div><div className="text-xs text-slate-400">Rate: 1 {conversion.fromCurrency} = {conversion.exchangeRate} {conversion.toCurrency}</div></>
            ) : 'Enter a valid amount/currency'}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Exchange info: <span className="text-slate-300">{fxInfo.source}</span> (as of {fxInfo.asOf}). {fxFixtureMeta.note}
        </div>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4" aria-labelledby="log-heading">
        <h2 id="log-heading" className="text-lg font-semibold text-white">Log expense</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="exp-amount" className="block text-xs font-semibold text-slate-300 mb-1">Amount</label>
            <input id="exp-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label htmlFor="exp-currency" className="block text-xs font-semibold text-slate-300 mb-1">Currency</label>
            <select id="exp-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white">
              {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="exp-base" className="block text-xs font-semibold text-slate-300 mb-1">Base currency</label>
            <select id="exp-base" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white">
              {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="exp-category" className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
            <select id="exp-category" value={category} onChange={(e) => setCategory(e.target.value as Expense['category'])} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white capitalize">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="exp-date" className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
            <input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label htmlFor="exp-method" className="block text-xs font-semibold text-slate-300 mb-1">Payment</label>
            <select id="exp-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as Expense['paymentMethod'])} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white">
              {paymentMethods.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="exp-desc" className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" placeholder="e.g. Dinner, taxi, museum tickets" />
          </div>
          <div>
            <label htmlFor="exp-paidby" className="block text-xs font-semibold text-slate-300 mb-1">Paid by (group)</label>
            <input id="exp-paidby" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" placeholder="Name" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="exp-split" className="block text-xs font-semibold text-slate-300 mb-1">Split with (comma-separated)</label>
            <input id="exp-split" value={splitWith} onChange={(e) => setSplitWith(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" placeholder="e.g. Alice, Bob, Cara" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium">Add expense</button>
          </div>
        </form>
        {error && <div role="alert" className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm">{error}</div>}
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4" aria-labelledby="budget-heading">
        <h2 id="budget-heading" className="text-lg font-semibold text-white">Budget monitoring & summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="budget-input" className="block text-xs font-semibold text-slate-300 mb-1">Budget ({baseCurrency})</label>
            <input id="budget-input" type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white" />
          </div>
          <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100">
            <div>Total spent: <span className="font-semibold">{summary.totalSpent} {summary.baseCurrency}</span></div>
            <div>Remaining: <span className={summary.remaining < 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>{summary.remaining} {summary.baseCurrency}</span></div>
          </div>
          <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100">
            <div>Used: <span className="font-semibold">{summary.percentUsed}%</span></div>
            <div className="mt-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-sky-500" style={{ width: `${Math.min(100, Math.max(0, summary.percentUsed))}%` }} /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {categories.map((c) => (
            <div key={c} className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-slate-300 capitalize">
              {c}: <span className="text-white font-medium">{summary.byCategory[c]} {summary.baseCurrency}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4" aria-labelledby="expenses-heading">
        <h2 id="expenses-heading" className="text-lg font-semibold text-white">Daily expense tracker</h2>
        {loading ? (
          <div role="status" className="text-sm text-slate-400">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-sm">No expenses logged yet. Add your first expense above.</div>
        ) : (
          <ul className="space-y-2">
            {expenses.map((exp) => (
              <li key={exp.id} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium">{exp.description} <span className="text-slate-400 font-normal">({exp.category})</span></div>
                  <div className="text-xs text-slate-400 mt-0.5">{exp.date} • {exp.amount} {exp.currency} → {exp.convertedAmount} {exp.baseCurrency} • {exp.paymentMethod.replace('_', ' ')}</div>
                  {(exp.paidBy || (exp.splitWith && exp.splitWith.length > 0)) && (
                    <div className="text-xs text-slate-500 mt-0.5">Paid by {exp.paidBy || 'You'}{exp.splitWith?.length ? ` • Split: ${exp.splitWith.join(', ')}` : ''}</div>
                  )}
                </div>
                <button type="button" onClick={() => void onDelete(exp.id)} className="text-xs px-2 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:text-rose-300">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-3" aria-labelledby="group-heading">
        <h2 id="group-heading" className="text-lg font-semibold text-white">Shared group expenses</h2>
        {shares.length === 0 ? (
          <div className="text-sm text-slate-400">No group splits yet. Add paid-by/split-with details when logging expenses.</div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shares.map((s) => (
              <li key={s.participant} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                <div className="font-medium text-white">{s.participant}</div>
                <div className="text-xs text-slate-400">Paid {s.paid} {baseCurrency} • Share {s.share} {baseCurrency}</div>
                <div className={`text-xs font-medium mt-0.5 ${s.balance > 0 ? 'text-emerald-400' : s.balance < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {s.balance > 0 ? `Should receive ${s.balance}` : s.balance < 0 ? `Owes ${Math.abs(s.balance)}` : 'Settled'} {baseCurrency}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ExpenseManager;
