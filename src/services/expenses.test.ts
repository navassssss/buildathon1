import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  addExpense,
  computeGroupShares,
  convertCurrency,
  deleteExpense,
  getExchangeRate,
  listExpenses,
  summarizeBudget,
} from './expenses';

describe('expenses service (T-006)', () => {
  beforeEach(async () => {
    await db.expenses.clear();
  });

  it('converts currency using deterministic bundled mock FX rates', () => {
    const usdToEur = convertCurrency(100, 'USD', 'EUR');
    expect(usdToEur.convertedAmount).toBe(92);
    expect(usdToEur.exchangeRate).toBeGreaterThan(0);

    const jpyToUsd = convertCurrency(15120, 'JPY', 'USD');
    expect(jpyToUsd.convertedAmount).toBe(100);

    expect(getExchangeRate('EUR', 'EUR')).toBe(1);
  });

  it('logs and lists expenses locally in Dexie', async () => {
    const created = await addExpense({
      tripId: 'trip-1',
      amount: 50,
      currency: 'USD',
      baseCurrency: 'EUR',
      category: 'food',
      date: '2026-11-10',
      description: 'Lunch',
      paymentMethod: 'card',
    });

    expect(created.id).toBeDefined();
    expect(created.convertedAmount).toBe(46);

    const expenses = await listExpenses('trip-1');
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe('Lunch');

    await deleteExpense(created.id);
    expect(await listExpenses('trip-1')).toHaveLength(0);
  });

  it('summarizes budget and categories in base currency', async () => {
    await addExpense({ amount: 20, currency: 'USD', baseCurrency: 'USD', category: 'food', date: '2026-11-10', description: 'Breakfast', paymentMethod: 'cash' });
    await addExpense({ amount: 30, currency: 'USD', baseCurrency: 'USD', category: 'transport', date: '2026-11-10', description: 'Taxi', paymentMethod: 'card' });
    await addExpense({ amount: 50, currency: 'USD', baseCurrency: 'USD', category: 'lodging', date: '2026-11-11', description: 'Hotel', paymentMethod: 'card' });

    const expenses = await listExpenses();
    const summary = summarizeBudget(expenses, 200, 'USD');
    expect(summary.totalSpent).toBe(100);
    expect(summary.remaining).toBe(100);
    expect(summary.percentUsed).toBe(50);
    expect(summary.byCategory.food).toBe(20);
    expect(summary.byCategory.transport).toBe(30);
    expect(summary.byDay['2026-11-10']).toBe(50);
  });

  it('computes shared group expense balances deterministically', async () => {
    const e1 = await addExpense({
      amount: 90,
      currency: 'USD',
      baseCurrency: 'USD',
      category: 'food',
      date: '2026-11-10',
      description: 'Dinner',
      paymentMethod: 'card',
      paidBy: 'Alice',
      splitWith: ['Alice', 'Bob', 'Cara'],
    });
    const e2 = await addExpense({
      amount: 30,
      currency: 'USD',
      baseCurrency: 'USD',
      category: 'transport',
      date: '2026-11-10',
      description: 'Taxi',
      paymentMethod: 'cash',
      paidBy: 'Bob',
      splitWith: ['Alice', 'Bob', 'Cara'],
    });

    const shares = computeGroupShares([e1, e2], 'USD');
    const alice = shares.find((s) => s.participant === 'Alice');
    const bob = shares.find((s) => s.participant === 'Bob');
    const cara = shares.find((s) => s.participant === 'Cara');

    expect(alice?.paid).toBe(90);
    expect(alice?.share).toBe(40);
    expect(alice?.balance).toBe(50);
    expect(bob?.balance).toBe(-10);
    expect(cara?.balance).toBe(-40);
  });

  it('rejects invalid/unsupported conversions and invalid expense inputs', async () => {
    expect(() => convertCurrency(-1, 'USD', 'EUR')).toThrow(/non-negative/i);
    expect(() => getExchangeRate('USD', 'XXX')).toThrow(/Unsupported currency/i);

    await expect(
      addExpense({
        amount: 0,
        currency: 'USD',
        baseCurrency: 'USD',
        category: 'food',
        date: '2026-11-10',
        description: 'Invalid',
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(/greater than 0/i);

    await expect(
      addExpense({
        amount: 10,
        currency: 'USD',
        baseCurrency: 'USD',
        category: 'food',
        date: '2026-11-10',
        description: '   ',
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(/Description is required/i);
  });

  it('handles empty budget and over-budget summary states', () => {
    const summary = summarizeBudget([], 0, 'USD');
    expect(summary.totalSpent).toBe(0);
    expect(summary.remaining).toBe(0);
    expect(summary.percentUsed).toBe(0);

    const over = summarizeBudget(
      [
        {
          id: '1',
          amount: 120,
          currency: 'USD',
          convertedAmount: 120,
          baseCurrency: 'USD',
          exchangeRate: 1,
          category: 'lodging',
          date: '2026-11-11',
          description: 'Hotel',
          paymentMethod: 'card',
          createdAt: new Date().toISOString(),
        },
      ],
      100,
      'USD',
    );
    expect(over.totalSpent).toBe(120);
    expect(over.remaining).toBe(-20);
    expect(over.percentUsed).toBe(120);
  });
});
