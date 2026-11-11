import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NearbyEssentials } from './NearbyEssentials';

vi.mock('../../services/location', () => ({
  getCurrentLocation: vi.fn().mockRejectedValue(new Error('geolocation denied in test')),
  checkLocationPermission: vi.fn().mockResolvedValue('prompt'),
  calculateDistance: (_a: { lat: number; lng: number }, _b: { lat: number; lng: number }) => 100,
  formatDistance: (meters: number) => `${meters} m`,
}));

describe('NearbyEssentials local map and attractions (T-004)', () => {
  it('loads a bundled fixture city without using device geolocation', async () => {
    render(<NearbyEssentials />);

    fireEvent.change(screen.getByLabelText(/Or explore a bundled fixture city/i), {
      target: { value: 'london' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Use fixture city/i }));

    expect(await screen.findByText('London (bundled fixture centre)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Nearby essentials schematic map/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('map-marker').length).toBeGreaterThan(0);
  });

  it('filters to tourist attractions and keeps markers consistent with the list', async () => {
    render(<NearbyEssentials />);

    fireEvent.change(screen.getByLabelText(/Or explore a bundled fixture city/i), {
      target: { value: 'london' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Use fixture city/i }));
    await screen.findByText('London (bundled fixture centre)');

    fireEvent.click(screen.getByRole('button', { name: /^Attractions$/i }));

    await waitFor(() => {
      expect(screen.getAllByText('London Eye').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByTestId('map-marker')).toHaveLength(
      screen.getAllByTestId('map-place-button').length
    );
    expect(screen.queryByText('St Thomas Hospital')).not.toBeInTheDocument();
  });
});
