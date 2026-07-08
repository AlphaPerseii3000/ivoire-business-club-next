import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PolitiqueConfidentialitePage, { metadata } from './page';

describe('PolitiqueConfidentialitePage', () => {
  it('has correct SEO metadata', () => {
    expect(metadata.title).toBe('Politique de Confidentialité — IBC');
    expect(metadata.description).toContain('APDP');
    expect(metadata.description).toContain('RGPD');
    expect(metadata.alternates?.canonical).toBe('/politique-confidentialite');
  });

  it('renders the core clauses and compliance terms', () => {
    render(<PolitiqueConfidentialitePage />);
    
    // Check back buttons
    const backLinks = screen.getAllByText("Retour à l’accueil");
    expect(backLinks.length).toBeGreaterThanOrEqual(1);

    // Check data list
    expect(screen.getByText(/Données de profil :$/i)).toBeInTheDocument();
    expect(screen.getByText(/Données de transaction :$/i)).toBeInTheDocument();

    // Check CENTIF-CI and 5 years retention
    expect(screen.getByText(/CENTIF-CI/)).toBeInTheDocument();
    expect(screen.getByText(/cinq \(5\) ans/i)).toBeInTheDocument();

    // Check APDP and GDPR
    expect(screen.getByText(/APDP/)).toBeInTheDocument();
    expect(screen.getByText(/RGPD/i)).toBeInTheDocument();
  });
});
