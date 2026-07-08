import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CgvPage, { metadata } from './page';

describe('CgvPage', () => {
  it('has correct SEO metadata', () => {
    expect(metadata.title).toBe('Conditions Générales de Vente (CGV) — IBC');
    expect(metadata.description).toContain('abonnements');
    expect(metadata.alternates?.canonical).toBe('/cgv');
  });

  it('renders the core CGV terms', () => {
    render(<CgvPage />);
    
    // Check back buttons
    const backLinks = screen.getAllByText("Retour à l’accueil");
    expect(backLinks.length).toBeGreaterThanOrEqual(1);

    // Check tiers and prices
    expect(screen.getByText(/Affranchis/)).toBeInTheDocument();
    expect(screen.getByText(/Grands Frères/)).toBeInTheDocument();
    expect(screen.getByText(/Boss/)).toBeInTheDocument();
    expect(screen.getAllByText(/\b29 €/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\b59 €/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\b129 €/).length).toBeGreaterThanOrEqual(1);

    // Check payment method
    expect(screen.getByText(/Virement bancaire :$/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile Money :$/i)).toBeInTheDocument();

    // Check validation timeline (48h)
    expect(screen.getByText(/48 heures ouvrées/i)).toBeInTheDocument();

    // Check cancellation
    expect(screen.getByText(/Aucun remboursement partiel/i)).toBeInTheDocument();
  });
});
