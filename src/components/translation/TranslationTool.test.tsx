import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranslationTool } from './TranslationTool';

describe('TranslationTool component (T-008)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders core translation sections and inputs', () => {
    render(<TranslationTool />);
    expect(screen.getByText(/Translation & Language Assistance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Source text \(English\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Translate text/i })).toBeInTheDocument();
    expect(screen.getByText(/Voice translation \(local fallback-safe\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Camera\/sign translation \(mock local\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Common local phrases & offline packs/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency phrase generator \(local mock\)/i)).toBeInTheDocument();
  });

  it('translates text locally and shows output', () => {
    render(<TranslationTool />);
    const input = screen.getByLabelText(/Source text \(English\)/i);
    fireEvent.change(input, { target: { value: 'Help!' } });
    fireEvent.click(screen.getByRole('button', { name: /Translate text/i }));

    expect(screen.getByLabelText(/Translated output/i)).toHaveTextContent('¡Ayuda!');
    expect(screen.getByText(/Local mock translation \(phrase-pack\)/i)).toBeInTheDocument();
  });

  it('translates a bundled sample image label to captioned text', () => {
    render(<TranslationTool />);
    const input = screen.getByLabelText(/Bundled sample sign\/image label/i);
    fireEvent.change(input, { target: { value: 'Exit sign' } });
    fireEvent.click(screen.getByRole('button', { name: /Translate image \(mock\)/i }));

    expect(screen.getByText(/Captioned text:/i)).toBeInTheDocument();
    expect(screen.getByText(/SALIDA/)).toBeInTheDocument();
  });

  it('generates an emergency phrase', () => {
    render(<TranslationTool />);
    fireEvent.click(screen.getByRole('button', { name: /Generate emergency phrase/i }));
    expect(screen.getByText(/I need urgent help/)).toBeInTheDocument();
  });

  it('persists offline pack selection locally in UI state', () => {
    render(<TranslationTool />);
    const saveButtons = screen.getAllByRole('button', { name: /^Save pack$/i });
    fireEvent.click(saveButtons[0]);
    expect(screen.getByRole('button', { name: /^Saved$/i })).toBeInTheDocument();
    expect(localStorage.getItem('traveller.translation.local.v1')).toContain('pack-es');
  });
});
