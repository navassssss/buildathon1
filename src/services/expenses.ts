import { db } from './db';
import type { Expense } from '../types';
import { fxRates, fxFixtureMeta } from '../fixtures/expenses/fxRates';

export type ExpenseCategory = Expense['category'];
export type PaymentMethod = Expense['paymentMethod'];

export interface ExpenseInput {
  tripId?: string;
  amount: number;
  currency: string;
  baseCurrency: string;
  category: ExpenseCategory;
  date: string;
  description: string;
  paymentMethod: PaymentMethod;
  paidBy?: string;
  splitWith?: string[];
}

export interface ConversionResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number; // 1 fromCurrency = exchangeRate toCurrency
  convertedAmount: number;
  source: string;
  asOf: string;
}

export interface BudgetSummary {
  baseCurrency: string;
  budget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  byCategory: Record<ExpenseCategory, number>;
  byDay: Record<string, number>;
}

export interface GroupShare {
  participant: string;
  paid: number;
  share: number;
  balance: number; // positive => should receive, negative => owes
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase();
}

export function getSupportedCurrencies() {
  return fxRates.map((r) => ({ ...r }));
}

export function getFxFixtureInfo() {
  return { ...fxFixtureMeta };
}

export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  const fromInfo = fxRates.find((r) => r.code === from);
  const toInfo = fxRates.find((r) => r.code === to);
  if (!fromInfo || !toInfo) {
    throw new Error(`Unsupported currency: ${!fromInfo ? from : to}`);
  }
  // from -> USD -> to
  const amountInUsd = 1 / fromInfo.rateFromUsd;
  const rate = amountInUsd * toInfo.rateFromUsd;
  return roundMoney(rate * 1000000) / 1000000; // keep precision for intermediate
}

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): ConversionResult {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Amount must be a non-negative number');
  }
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  const exchangeRate = getExchangeRate(from, to);
  const convertedAmount = roundMoney(amount * exchangeRate);
  return {
    amount: roundMoney(amount),
    fromCurrency: from,
    toCurrency: to,
    exchangeRate: roundMoney(exchangeRate * 1000000) / 1000000,
    convertedAmount,
    source: fxFixtureMeta.source,
    asOf: fxFixtureMeta.asOf,
  };
}

export async function listExpenses(tripId?: string): Promise<Expense[]> {
  if (tripId) {
    return db.expenses.where('tripId').equals(tripId).reverse().sortBy('date');
  }
  return db.expenses.reverse().sortBy('date');
}

export async function addExpense(input: ExpenseInput): Promise<Expense> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than 0');
  if (!input.description?.trim()) throw new Error('Description is required');
  if (!input.date) throw new Error('Date is required');

  const currency = normalizeCurrency(input.currency);
  const baseCurrency = normalizeCurrency(input.baseCurrency);
  const conversion = convertCurrency(amount, currency, baseCurrency);

  const expense: Expense = {
    id: makeId(),
    tripId: input.tripId,
    amount: roundMoney(amount),
    currency,
    convertedAmount: conversion.convertedAmount,
    baseCurrency,
    exchangeRate: conversion.exchangeRate,
    category: input.category,
    date: input.date,
    description: input.description.trim(),
    paymentMethod: input.paymentMethod,
    paidBy: input.paidBy?.trim() || undefined,
    splitWith: (input.splitWith || []).map((s) => s.trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };

  await db.expenses.add(expense);
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}

export function summarizeBudget(expenses: Expense[], budget = 0, baseCurrency = 'USD'): BudgetSummary {
  const byCategory: Record<ExpenseCategory, number> = {
    food: 0,
    transport: 0,
    lodging: 0,
    entertainment: 0,
    shopping: 0,
    emergency: 0,
    other: 0,
  };
  const byDay: Record<string, number> = {};
  let totalSpent = 0;

  for (const exp of expenses) {
    // normalize to requested base currency for summary consistency
    let amountInBase = exp.convertedAmount;
    if (normalizeCurrency(exp.baseCurrency) !== normalizeCurrency(baseCurrency)) {
      amountInBase = convertCurrency(exp.amount, exp.currency, baseCurrency).convertedAmount;
    } else if (normalizeCurrency(baseCurrency) !== normalizeCurrency(exp.baseCurrency)) {
      amountInBase = convertCurrency(exp.amount, exp.currency, baseCurrency).convertedAmount;
    }
    // if already in same base, keep convertedAmount
    if (normalizeCurrency(exp.baseCurrency) === normalizeCurrency(baseCurrency)) {
      amountInBase = exp.convertedAmount;
    } else {
      amountInBase = convertCurrency(exp.amount, exp.currency, baseCurrency).convertedAmount;
    }

    const rounded = roundMoney(amountInBase);
    totalSpent = roundMoney(totalSpent + rounded);
    byCategory[exp.category] = roundMoney((byCategory[exp.category] || 0) + rounded);
    const day = exp.date;
    byDay[day] = roundMoney((byDay[day] || 0) + rounded);
  }

  const safeBudget = Math.max(0, Number(budget) || 0);
  const remaining = roundMoney(safeBudget - totalSpent);
  const percentUsed = safeBudget > 0 ? roundMoney((totalSpent / safeBudget) * 100) : 0;

  return {
    baseCurrency: normalizeCurrency(baseCurrency),
    budget: roundMoney(safeBudget),
    totalSpent,
    remaining,
    percentUsed,
    byCategory,
    byDay,
  };
}

export function computeGroupShares(expenses: Expense[], baseCurrency = 'USD'): GroupShare[] {
  const paidMap = new Map<string, number>();
  const shareMap = new Map<string, number>();
  const participantsSet = new Set<string>();

  for (const exp of expenses) {
    const amount = normalizeCurrency(exp.baseCurrency) === normalizeCurrency(baseCurrency)
      ? exp.convertedAmount
      : convertCurrency(exp.amount, exp.currency, baseCurrency).convertedAmount;
    const payer = (exp.paidBy || 'You').trim() || 'You';
    const splitWith = (exp.splitWith && exp.splitWith.length > 0 ? exp.splitWith : [payer]).map((p) => p.trim()).filter(Boolean);
    const uniqueParticipants = Array.from(new Set(splitWith.length ? splitWith : [payer]));

    paidMap.set(payer, roundMoney((paidMap.get(payer) || 0) + amount));
    participantsSet.add(payer);
    uniqueParticipants.forEach((p) => participantsSet.add(p));

    const perPerson = amount / uniqueParticipants.length;
    for (const p of uniqueParticipants) {
      shareMap.set(p, roundMoney((shareMap.get(p) || 0) + perPerson));
    }
  }

  const participants = Array.from(participantsSet).sort();
  return participants.map((participant) => {
    const paid = roundMoney(paidMap.get(participant) || 0);
    const share = roundMoney(shareMap.get(participant) || 0);
    return {
      participant,
      paid,
      share,
      balance: roundMoney(paid - share),
    };
  });
}
