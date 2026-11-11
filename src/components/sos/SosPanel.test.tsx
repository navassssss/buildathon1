import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EmergencyProfile } from '../../types';
import { SosPanel } from './SosPanel';
import { db } from '../../services/db';
import { getCurrentLocation } from '../../services/location';
import { clearSosLog } from '../../services/sos';

vi.mock('../../services/location', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/location')>();
  return { ...actual, getCurrentLocation: vi.fn() };
});

const mockedGetCurrentLocation = vi.mocked(getCurrentLocation);

function makeProfile(): EmergencyProfile {
  return {
    id: 'profile-ui',
    fullName: 'Alex Traveller',
    bloodType: 'O+',
    allergies: ['penicillin'],
    medications: [],
    medicalConditions: [],
    emergencyContacts: [
      {
        id: 'contact-ui',
        name: 'Sam Traveller',
        relationship: 'sister',
        phoneNumber: '+44 7700 900123',
        email: 'sam@example.com',
        notifyOnSOS: true,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

describe('SosPanel (T-005: F-SOS-001)', () => {
  beforeEach(async () => {
    await db.emergencyProfiles.clear();
    sessionStorage.clear();
    clearSosLog();
    mockedGetCurrentLocation.mockReset();
  });

  it('renders the safety disclaimer and bundled emergency numbers', () => {
    render(<SosPanel />);

    expect(screen.getByRole('heading', { name: /SOS & Location Sharing/i })).toBeInTheDocument();
    expect(screen.getByText(/not an emergency service/i)).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    const telLinks = links.map((link) => link.getAttribute('href')).filter(Boolean);
    expect(telLinks).toContain('tel:100');
    expect(telLinks).toContain('tel:102');
    expect(telLinks).toContain('tel:101');
    expect(telLinks).toContain('tel:112');
  });

  it('switches the emergency numbers when a different country is selected', () => {
    render(<SosPanel />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'GB' } });

    const telLinks = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter(Boolean);
    expect(telLinks).toContain('tel:999');
    expect(telLinks).not.toContain('tel:100');
  });

  it('prepares an SOS message with location and contact drafts', async () => {
    await db.emergencyProfiles.put(makeProfile());
    mockedGetCurrentLocation.mockResolvedValue({
      latitude: 51.5074,
      longitude: -0.1278,
      accuracy: 20,
      timestamp: Date.now(),
    });

    render(<SosPanel />);

    // Wait for the stored profile to load via the Medical Profile tab.
    fireEvent.click(screen.getByRole('tab', { name: 'Medical Profile' }));
    expect(await screen.findByText('Sam Traveller')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Emergency SOS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger emergency SOS' }));

    expect(await screen.findByText(/Emergency message prepared/i)).toBeInTheDocument();
    expect(screen.getAllByText(/51\.50740, -0\.12780/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Draft only/)).toBeInTheDocument();

    const callLink = screen.getByRole('link', { name: /Call \+44 7700 900123/ });
    expect(callLink).toHaveAttribute('href', 'tel:+447700900123');

    const emailLink = screen.getByRole('link', { name: /Email draft/ });
    expect(emailLink.getAttribute('href')).toContain('mailto:sam@example.com');

    // Stop sharing clears the active result.
    fireEvent.click(screen.getByRole('button', { name: /Stop sharing/ }));
    expect(screen.queryByText(/Emergency message prepared/i)).not.toBeInTheDocument();
  });

  it('still prepares a message when location permission is denied', async () => {
    mockedGetCurrentLocation.mockRejectedValue({
      code: 'PERMISSION_DENIED',
      message: 'User denied geolocation',
    });

    render(<SosPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Trigger emergency SOS' }));

    expect(await screen.findByText(/Emergency message prepared/i)).toBeInTheDocument();
    const notices = await screen.findAllByText(/will not include coordinates/i);
    expect(notices.length).toBeGreaterThan(0);
    expect(screen.getByText(/No contacts are set to be notified/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sharing location/i)).not.toBeInTheDocument();
  });

  it('saves a medical profile and trusted contact locally', async () => {
    mockedGetCurrentLocation.mockReset();
    render(<SosPanel />);

    fireEvent.click(screen.getByRole('tab', { name: 'Medical Profile' }));

    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Jordan Traveller' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. O+'), { target: { value: 'A-' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. penicillin, peanuts'), {
      target: { value: 'latex, peanuts' },
    });
    fireEvent.change(screen.getByPlaceholderText('Contact name'), {
      target: { value: 'Casey' },
    });
    fireEvent.change(screen.getByPlaceholderText('+44 7700 900123'), {
      target: { value: '+44 7700 900456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add contact/i }));

    expect(screen.getByText('Casey')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save profile/i }));

    await waitFor(async () => {
      const stored = await db.emergencyProfiles.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].fullName).toBe('Jordan Traveller');
      expect(stored[0].bloodType).toBe('A-');
      expect(stored[0].allergies).toEqual(['latex', 'peanuts']);
      expect(stored[0].emergencyContacts[0].name).toBe('Casey');
    });

    expect(await screen.findByText(/Saved on this device/i)).toBeInTheDocument();
  });

  it('lists nearby emergency services and schematic route hints', async () => {
    mockedGetCurrentLocation.mockResolvedValue({
      latitude: 51.5007,
      longitude: -0.1246,
      accuracy: 10,
      timestamp: Date.now(),
    });

    render(<SosPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Nearby Help' }));
    fireEvent.click(screen.getByRole('button', { name: /Find nearby help/i }));

    expect((await screen.findAllByText('St Thomas Hospital')).length).toBeGreaterThan(0);
    expect(screen.getByText(/not turn-by-turn navigation/i)).toBeInTheDocument();
  });

  it('explains the error when nearby help cannot get a location fix', async () => {
    mockedGetCurrentLocation.mockRejectedValue({
      code: 'PERMISSION_DENIED',
      message: 'denied',
    });

    render(<SosPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Nearby Help' }));
    fireEvent.click(screen.getByRole('button', { name: /Find nearby help/i }));

    expect(await screen.findByText(/Location permission denied/i)).toBeInTheDocument();
  });

  it('creates a local-only lost person report', async () => {
    render(<SosPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Lost & Found' }));
    fireEvent.click(screen.getByRole('button', { name: 'Missing person' }));

    fireEvent.change(screen.getByLabelText(/Person name/i), {
      target: { value: 'Jamie' },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Blue jacket, last seen near the market' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create report/i }));

    expect(await screen.findByText(/Missing person: Jamie/i)).toBeInTheDocument();
    expect(screen.getByText(/Prepared on-device/i)).toBeInTheDocument();
  });
});
