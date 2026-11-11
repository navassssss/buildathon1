import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PackingChecklist } from './PackingChecklist';
import { usePackingStore } from '../../stores/packingStore';
import { db } from '../../services/db';

describe('PackingChecklist Component Integration (T-002: F-SMPK-001)', () => {
  beforeEach(async () => {
    await db.checklists.clear();
    usePackingStore.setState({
      items: [],
      currentTripId: null,
      destination: 'Kyoto, Japan',
      weather: 'cold',
      durationDays: 4,
      travelType: 'leisure',
      filterCategory: 'all',
      isLoading: false,
      error: null,
    });
  });

  it('renders the packing checklist UI with form inputs', () => {
    render(<PackingChecklist />);

    // Verify header and description
    expect(screen.getByText('Smart Packing Checklist')).toBeInTheDocument();
    expect(screen.getByText(/Dynamic packing list adapted to destination/i)).toBeInTheDocument();

    // Verify form inputs exist
    expect(screen.getByLabelText(/Destination/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Forecast Weather/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration \(Days\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Travel Style/i)).toBeInTheDocument();

    // Verify generate button
    expect(screen.getByRole('button', { name: /Generate Smart Checklist/i })).toBeInTheDocument();

    // Verify custom item input
    expect(screen.getByPlaceholderText(/Add custom item/i)).toBeInTheDocument();
  });

  it('displays empty state when no items exist', () => {
    render(<PackingChecklist />);

    expect(screen.getByText(/No items on your packing list yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Set your destination, anticipated weather/i)).toBeInTheDocument();
  });

  it('displays items when store has checklist items', () => {
    // Pre-populate store with items
    usePackingStore.setState({
      items: [
        {
          id: 'test-1',
          title: 'Passport / Government ID',
          category: 'documents',
          isPacked: false,
          quantity: 1,
          suggestedBy: 'destination',
        },
        {
          id: 'test-2',
          title: 'Sunscreen (SPF 50+)',
          category: 'toiletries',
          isPacked: true,
          quantity: 1,
          suggestedBy: 'weather',
        },
      ],
      currentTripId: null,
      destination: 'Kyoto, Japan',
      weather: 'cold',
      durationDays: 4,
      travelType: 'leisure',
      filterCategory: 'all',
      isLoading: false,
      error: null,
    });

    render(<PackingChecklist />);

    // Verify items are displayed
    expect(screen.getByText('Passport / Government ID')).toBeInTheDocument();
    expect(screen.getByText('Sunscreen (SPF 50+)')).toBeInTheDocument();

    // Verify progress tracker shows
    expect(screen.getByText(/Packing Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2 items packed \(50%\)/i)).toBeInTheDocument();
  });
});
