import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TripPlanner } from './TripPlanner';
import { useTripStore } from '../../stores/tripStore';
import { db } from '../../services/db';

describe('TripPlanner Component Integration', () => {
  beforeEach(async () => {
    await db.trips.clear();
    await db.activities.clear();

    useTripStore.setState({
      trips: [],
      activeTripId: null,
      isLoading: false,
      error: null,
      statusFilter: 'all',
      searchQuery: '',
    });
  });

  it('renders empty state when there are no trips', async () => {
    render(<TripPlanner />);

    expect(await screen.findByTestId('empty-trips-state')).toBeInTheDocument();
    expect(screen.getByText('No trips planned yet')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-create-btn')).toBeInTheDocument();
  });

  it('validates required fields and prevents submission when destination is empty', async () => {
    render(<TripPlanner />);

    // Click to open create form
    fireEvent.click(await screen.findByTestId('create-trip-btn'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Plan a New Trip')).toBeInTheDocument();

    // Fill title, start date, end date, but omit destination
    fireEvent.change(screen.getByLabelText(/Trip Title/i), {
      target: { value: 'Incomplete Trip' },
    });
    fireEvent.change(screen.getByLabelText(/Start Date/i), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText(/End Date/i), {
      target: { value: '2026-08-10' },
    });

    // Attempt to submit
    fireEvent.click(screen.getByRole('button', { name: /Create Trip/i }));

    // Expect destination validation error
    expect(await screen.findByText('Destination is required')).toBeInTheDocument();

    // Store should remain empty
    expect(useTripStore.getState().trips).toHaveLength(0);
  });

  it('validates that end date cannot be earlier than start date', async () => {
    render(<TripPlanner />);

    fireEvent.click(await screen.findByTestId('create-trip-btn'));

    fireEvent.change(screen.getByLabelText(/Trip Title/i), {
      target: { value: 'Backwards Trip' },
    });
    fireEvent.change(screen.getByLabelText(/Destination/i), {
      target: { value: 'Tokyo' },
    });
    fireEvent.change(screen.getByLabelText(/Start Date/i), {
      target: { value: '2026-08-10' },
    });
    fireEvent.change(screen.getByLabelText(/End Date/i), {
      target: { value: '2026-08-01' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Trip/i }));

    expect(
      await screen.findByText('End date must be on or after start date')
    ).toBeInTheDocument();
  });

  it('successfully creates a new trip and views its details', async () => {
    render(<TripPlanner />);

    fireEvent.click(await screen.findByTestId('create-trip-btn'));

    fireEvent.change(screen.getByLabelText(/Trip Title/i), {
      target: { value: 'Swiss Alps Hiking' },
    });
    fireEvent.change(screen.getByLabelText(/Destination/i), {
      target: { value: 'Interlaken, Switzerland' },
    });
    fireEvent.change(screen.getByLabelText(/Start Date/i), {
      target: { value: '2026-07-01' },
    });
    fireEvent.change(screen.getByLabelText(/End Date/i), {
      target: { value: '2026-07-07' },
    });
    fireEvent.change(screen.getByLabelText(/Travel Style/i), {
      target: { value: 'adventure' },
    });
    fireEvent.change(screen.getByLabelText(/Total Budget/i), {
      target: { value: '2000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Trip/i }));

    // Wait for trip to be created in store
    await waitFor(() => {
      expect(useTripStore.getState().trips).toHaveLength(1);
    });

    // Should transition to TripDetail view
    expect(await screen.findByText('Swiss Alps Hiking')).toBeInTheDocument();
    expect(screen.getByText('Interlaken, Switzerland')).toBeInTheDocument();
    expect(screen.getByText(/Day-by-Day Itinerary/i)).toBeInTheDocument();

    const trip = useTripStore.getState().trips[0];
    expect(trip.title).toBe('Swiss Alps Hiking');
    expect(trip.totalBudget).toBe(2000);
  });

  it('allows scheduling an activity and toggling its completion', async () => {
    // Pre-populate with a trip
    const trip = await useTripStore.getState().addTrip({
      title: 'Rome Weekend',
      destination: 'Rome, Italy',
      startDate: '2026-09-01',
      endDate: '2026-09-03',
      travelType: 'leisure',
    });
    useTripStore.getState().setActiveTrip(trip.id);

    render(<TripPlanner />);

    expect(await screen.findByText('Rome Weekend')).toBeInTheDocument();

    // Click Add Activity
    fireEvent.click(screen.getByTestId('add-activity-btn'));
    expect(await screen.findByText('Schedule Activity')).toBeInTheDocument();

    // Fill in activity form
    fireEvent.change(screen.getByLabelText(/Activity Title/i), {
      target: { value: 'Colosseum Guided Tour' },
    });
    fireEvent.change(screen.getByLabelText(/Time/i), {
      target: { value: '09:30' },
    });
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: 'Piazza del Colosseo' },
    });

    fireEvent.click(screen.getByTestId('submit-activity-btn'));

    // Verify activity appears in Day 1 itinerary
    expect(await screen.findByText('Colosseum Guided Tour')).toBeInTheDocument();
    expect(screen.getByText('09:30')).toBeInTheDocument();
    expect(screen.getByText('Piazza del Colosseo')).toBeInTheDocument();

    // Toggle completion
    const activityId = useTripStore.getState().trips[0].activities[0].id;
    const toggleBtn = screen.getByTestId(`toggle-activity-${activityId}`);
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(useTripStore.getState().trips[0].activities[0].completed).toBe(true);
    });

    // Toggle back
    fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(useTripStore.getState().trips[0].activities[0].completed).toBe(false);
    });
  });

  it('allows editing an existing trip', async () => {
    const trip = await useTripStore.getState().addTrip({
      title: 'Original Title',
      destination: 'Madrid, Spain',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      travelType: 'solo',
    });
    useTripStore.getState().setActiveTrip(trip.id);

    render(<TripPlanner />);

    expect(await screen.findByText('Original Title')).toBeInTheDocument();

    // Click Edit button
    fireEvent.click(screen.getByTestId('edit-trip-btn'));
    expect(await screen.findByText('Edit Trip')).toBeInTheDocument();

    // Modify Title
    const titleInput = screen.getByLabelText(/Trip Title/i);
    fireEvent.change(titleInput, { target: { value: 'Madrid Discovery Tour' } });

    // Submit changes
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    // Verify updated title is rendered
    expect(await screen.findByText('Madrid Discovery Tour')).toBeInTheDocument();
    expect(useTripStore.getState().trips[0].title).toBe('Madrid Discovery Tour');
  });

  it('allows deleting a trip', async () => {
    const trip = await useTripStore.getState().addTrip({
      title: 'Trip To Delete',
      destination: 'Paris, France',
      startDate: '2026-11-01',
      endDate: '2026-11-04',
      travelType: 'leisure',
    });
    useTripStore.getState().setActiveTrip(trip.id);

    render(<TripPlanner />);

    expect(await screen.findByText('Trip To Delete')).toBeInTheDocument();

    // Click Delete button on detail view
    fireEvent.click(screen.getByTestId('delete-trip-btn'));

    // Confirmation dialog appears
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-delete-trip-btn'));

    // Back to empty state or list without trip
    await waitFor(() => {
      expect(useTripStore.getState().trips).toHaveLength(0);
    });
    expect(await screen.findByTestId('empty-trips-state')).toBeInTheDocument();
  });
});
