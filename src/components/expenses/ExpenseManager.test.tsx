import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseManager } from './ExpenseManager';
import { db } from '../../services/db';

describe('ExpenseManager component (T-006)', () => {
  beforeEach(async () => {
    await db.expenses.clear();
  });

  it('renders converter, form, budget and tracker sections', async () => {
    render(<ExpenseManager />);
    expect(screen.getByText(/Currency & Expense Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/Multi-currency converter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/i, { selector: '#conv-amount' })).toBeInTheDocument();
    expect(screen.getByText(/Log expense/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget monitoring & summary/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/No expenses logged yet/i)).toBeInTheDocument());
  });

  it('shows converted amount in target currency', () => {
    render(<ExpenseManager />);
    expect(screen.getByText('92 EUR')).toBeInTheDocument();
    expect(screen.getByText(/Rate: 1 USD = 0.92 EUR/)).toBeInTheDocument();
  });

  it('logs an expense and displays it in the tracker', async () => {
    render(<ExpenseManager />);

    fireEvent.change(screen.getByLabelText('Amount', { selector: '#exp-amount' }), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Museum ticket' } });
    fireEvent.click(screen.getByRole('button', { name: /Add expense/i }));

    expect(await screen.findByText(/Museum ticket/)).toBeInTheDocument();
    expect(screen.getByText(/25 USD → 25 USD/)).toBeInTheDocument();
  });

  it('shows empty and over-budget states', async () => {
    render(<ExpenseManager />);
    expect(await screen.findByText(/No expenses logged yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No group splits yet/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Budget \(USD\)/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Amount', { selector: '#exp-amount' }), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Over budget item' } });
    fireEvent.click(screen.getByRole('button', { name: /Add expense/i }));

    expect(await screen.findByText(/Over budget item/)).toBeInTheDocument();
    expect(screen.getByText(/-15 USD/)).toBeInTheDocument();
  });
});
