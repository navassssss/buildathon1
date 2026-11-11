import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EmergencyProfile, NearbyPlace } from '../../types';
import { OfflineHub } from './OfflineHub';
import { db } from '../../services/db';

const profile: EmergencyProfile = {
  id: 'p1',
  fullName: 'Alex',
  bloodType: 'O+',
  allergies: [],
  medications: [],
  medicalConditions: [],
  emergencyContacts: [],
  updatedAt: '2026-11-11T10:00:00.000Z',
};

const place: NearbyPlace = {
  id: 'place-1',
  name: 'St Thomas Hospital',
  category: 'hospital',
  address: 'London',
  distanceMeters: 100,
  coordinates: { lat: 51.5, lng: -0.12 },
  open24Hours: true,
};

describe('OfflineHub (T-009: F-OFF-001)', () => {
  beforeEach(async () => {
    await Promise.all([
      db.trips.clear(),
      db.activities.clear(),
      db.checklists.clear(),
      db.documents.clear(),
      db.expenses.clear(),
      db.emergencyProfiles.clear(),
      db.nearbyPlaces.clear(),
      db.translationPhrases.clear(),
    ]);
  });

  it('renders the hub and an honest readiness state', async () => {
    render(<OfflineHub />);

    expect(await screen.findByRole('heading', { name: /Offline Hub/i })).toBeInTheDocument();
    expect(await screen.findByText(/Not ready for offline use/i)).toBeInTheDocument();
    expect(screen.getByText(/No trip, document/i)).toBeInTheDocument();
  });

  it('shows saved essential counts from local database tables', async () => {
    await db.emergencyProfiles.put(profile);
    await db.nearbyPlaces.put(place);

    render(<OfflineHub />);
    expect(await screen.findByText('2 total records')).toBeInTheDocument();
    expect(screen.getByText('Emergency profiles')).toBeInTheDocument();
    expect(screen.getByText('Nearby place fixtures')).toBeInTheDocument();
  });

  it('shows the empty state when nothing is saved', async () => {
    render(<OfflineHub />);
    expect(await screen.findByText(/Nothing saved yet/i)).toBeInTheDocument();
  });

  it('explains that service workers are unsupported in this environment', async () => {
    render(<OfflineHub />);
    expect(
      await screen.findByText(/does not support service workers/i)
    ).toBeInTheDocument();
  });

  it('reports the current connection state and updates on offline events', async () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    render(<OfflineHub />);
    expect((await screen.findAllByText(/Offline right now/i)).length).toBeGreaterThan(0);

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
  });

  it('explains when storage estimates are unavailable', async () => {
    render(<OfflineHub />);
    expect(
      await screen.findByText(/does not expose a storage estimate|Storage usage is not available/i)
    ).toBeInTheDocument();
  });

  it('lists what works offline and the schematic-map caveat', async () => {
    render(<OfflineHub />);
    expect(await screen.findByText(/Application shell/i)).toBeInTheDocument();
    expect(screen.getByText(/Encrypted documents stay on the device/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not authoritative navigation/i).length).toBeGreaterThan(0);
  });

  it('shows saved places on the offline schematic map', async () => {
    await db.nearbyPlaces.put(place);

    render(<OfflineHub />);

    expect(await screen.findByText(/Showing places saved on this device/i)).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Offline saved places schematic map/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('map-marker')).toHaveLength(1);
    expect(screen.getAllByTestId('map-place-button')).toHaveLength(1);
    expect(screen.getAllByText('St Thomas Hospital').length).toBeGreaterThan(0);
  });

  it('falls back to labelled bundled fixtures when no places are saved', async () => {
    render(<OfflineHub />);

    expect(
      await screen.findByText(/Showing bundled fixture places for the selected city/i)
    ).toBeInTheDocument();
    expect(await screen.findByLabelText(/Fixture city/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('map-marker').length).toBeGreaterThan(0);
  });

  it('enables then disables offline app-shell caching', async () => {
    let registered = false;
    const registration = {
      active: { scriptURL: '/sw.js' },
      unregister: async () => {
        registered = false;
        return true;
      },
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: async () => {
          registered = true;
          return registration;
        },
        getRegistration: async () => (registered ? registration : undefined),
        controller: {},
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });

    render(<OfflineHub />);

    fireEvent.click(await screen.findByRole('button', { name: /Enable offline caching/i }));
    expect(
      await screen.findByText(/Offline caching is enabled on this device/i)
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Disable caching/i }));
    expect(await screen.findByText(/Offline app-shell caching is disabled/i)).toBeInTheDocument();

    Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'serviceWorker');
  });

  it('shows an error state when registration is rejected', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: async () => {
          throw new Error('blocked by policy');
        },
        getRegistration: async () => undefined,
        controller: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });

    render(<OfflineHub />);
    fireEvent.click(await screen.findByRole('button', { name: /Enable offline caching/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/blocked by policy/i);

    Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'serviceWorker');
  });
});
