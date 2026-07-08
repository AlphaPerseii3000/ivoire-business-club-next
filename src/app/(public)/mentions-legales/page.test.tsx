import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MentionsLegalesPage, { metadata } from './page';

describe('MentionsLegalesPage', () => {
  it('has correct SEO metadata', () => {
    expect(metadata.title).toBe('Mentions Légales — Ivoire Business Club');
    expect(metadata.description).toContain('KS Investment SA');
    expect(metadata.alternates?.canonical).toBe('/mentions-legales');
  });

  it('renders the back to home links and obligatory elements', () => {
    render(<MentionsLegalesPage />);
    
    // Check back buttons
    const backLinks = screen.getAllByText("Retour à l’accueil");
    expect(backLinks.length).toBeGreaterThanOrEqual(1);

    // Check Editor
    expect(screen.getAllByText('KS Investment SA').length).toBeGreaterThanOrEqual(1);
    
    // Check Host
    expect(screen.getByText('Infomaniak Network SA')).toBeInTheDocument();
    expect(screen.getByText('Cloud VPS')).toBeInTheDocument();
  });
});
