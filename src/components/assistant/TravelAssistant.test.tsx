import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TravelAssistant } from './TravelAssistant';
import { useTripStore } from '../../stores/tripStore';
import { db } from '../../services/db';

describe('TravelAssistant component (T-007)', () => {
  beforeEach(async () => {
    await db.trips.clear();
    await db.activities.clear();
    await db.checklists.clear();
    useTripStore.setState({
      trips: [],
      activeTripId: null,
      isLoading: false,
      error: null,
      statusFilter: 'all',
      searchQuery: '',
    });
  });

  it('shows helpful defaults/questions when there is no context', () => {
    render(<TravelAssistant />);
    expect(screen.getByText(/AI Travel Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/No destination\/dates provided yet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/destination and travel dates|local, on-device/i).length).toBeGreaterThan(0);
  });

  it('uses provided trip context and suggests relevant options for destination/dates', async () => {
    render(
      <TravelAssistant
        tripContext={{ destination: 'Kyoto', startDate: '2026-12-10', endDate: '2026-12-12', travelType: 'leisure' }}
      />,
    );

    expect(screen.getByText(/Context:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Kyoto/).length).toBeGreaterThan(0);

    const input = screen.getByLabelText(/Ask for trip help/i);
    fireEvent.change(input, { target: { value: 'Suggest trip ideas and itinerary' } });
    fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));

    expect(await screen.findByText(/local mock travel suggestions for Kyoto/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Kyoto/).length).toBeGreaterThan(1);
  });

  it('shows local guidance categories for weather/transport questions', async () => {
    render(<TravelAssistant tripContext={{ destination: 'Rome' }} />);

    fireEvent.click(screen.getByRole('button', { name: /Weather guidance/i }));
    expect(await screen.findByText(/Weather check for Rome/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Transport tips/i }));
    expect(await screen.findByText(/Getting around Rome/i)).toBeInTheDocument();
  });

  it('shows helpful prompt when empty message is submitted', async () => {
    render(<TravelAssistant />);
    fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));
    expect(await screen.findByText(/You can also ask:/i)).toBeInTheDocument();
  });
});
