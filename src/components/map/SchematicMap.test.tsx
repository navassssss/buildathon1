import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  SchematicMap,
  bearingToCompassLabel,
  formatSchematicDistance,
  getSchematicDirection,
  type MapPlace,
} from './SchematicMap';

const places: MapPlace[] = [
  {
    id: 'a',
    name: 'St Thomas Hospital',
    category: 'hospital',
    coordinates: { lat: 51.4988, lng: -0.1187 },
  },
  {
    id: 'b',
    name: 'London Eye',
    category: 'attraction',
    coordinates: { lat: 51.5033, lng: -0.1196 },
  },
  {
    id: 'c',
    name: 'Waterloo Pharmacy',
    category: 'pharmacy',
    coordinates: { lat: 51.501, lng: -0.114 },
  },
];

describe('SchematicMap', () => {
  it('renders one marker per place and a matching list entry', () => {
    render(<SchematicMap places={places} />);

    expect(screen.getAllByTestId('map-marker')).toHaveLength(places.length);
    expect(screen.getAllByTestId('map-place-button')).toHaveLength(places.length);
    expect(screen.getByRole('img', { name: /3 places plotted/i })).toBeInTheDocument();
  });

  it('shows an honest empty state without drawing a map', () => {
    render(<SchematicMap places={[]} emptyMessage="Nothing to plot here." />);

    expect(screen.getByRole('status')).toHaveTextContent('Nothing to plot here.');
    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/no external map service/i)).toBeInTheDocument();
  });

  it('selects a place from the list and exposes accessible marker labels', () => {
    render(<SchematicMap places={places} />);

    expect(screen.getByRole('img', { name: /Attraction: London Eye/i })).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /London Eye/i });
    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText(/Attraction: London Eye/i).length).toBeGreaterThan(0);
  });

  it('plots a centre crosshair only when a centre is supplied', () => {
    const { rerender } = render(<SchematicMap places={places} />);
    expect(screen.queryByLabelText(/Your selected location/i)).not.toBeInTheDocument();

    rerender(<SchematicMap places={places} center={{ lat: 51.5, lng: -0.12 }} />);
    expect(screen.getByLabelText(/Your selected location/i)).toBeInTheDocument();
  });

  it('shows schematic straight-line bearing/distance to a selected place when centre is available', () => {
    render(<SchematicMap places={places} center={{ lat: 51.5, lng: -0.12 }} />);

    expect(screen.getByText(/Schematic direction \(local, straight line\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a place to see straight-line bearing and distance/i)).toBeInTheDocument();
    expect(screen.queryByTestId('schematic-direction-line')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /London Eye/i }));

    const label = screen.getByTestId('schematic-direction-label');
    expect(label).toHaveTextContent(/To London Eye:/i);
    expect(label).toHaveTextContent(/straight line \(schematic, not turn-by-turn\)/i);
    expect(label).toHaveTextContent(/No roads or turn-by-turn routing/i);
    expect(screen.getByLabelText(/Schematic straight-line direction/i)).toBeInTheDocument();
    expect(screen.getByTestId('schematic-direction-line')).toBeInTheDocument();
  });
});

describe('schematic direction helpers', () => {
  it('computes local straight-line distance and bearing labels from coordinates', () => {
    const dir = getSchematicDirection({ lat: 51.5, lng: -0.12 }, { lat: 51.5033, lng: -0.1196 });
    expect(dir.distanceMeters).toBeGreaterThan(0);
    expect(dir.distanceLabel).toMatch(/\d+\s?(m|km)/);
    expect(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']).toContain(dir.bearingLabel);
    expect(dir.label).toMatch(/straight line \(schematic, not turn-by-turn\)/i);
  });

  it('formats distances and compass bearings deterministically', () => {
    expect(formatSchematicDistance(850)).toBe('850 m');
    expect(formatSchematicDistance(1500)).toBe('1.5 km');
    expect(bearingToCompassLabel(0)).toBe('N');
    expect(bearingToCompassLabel(90)).toBe('E');
    expect(bearingToCompassLabel(225)).toBe('SW');
  });
});
