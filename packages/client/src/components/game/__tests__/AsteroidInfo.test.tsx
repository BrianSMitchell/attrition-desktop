import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { AsteroidInfo } from '../AsteroidInfo';
import { Location } from '../../../../../shared/src/types';

// Mock DebrisIndicator component
jest.mock('../DebrisIndicator', () => ({
  DebrisIndicator: () => <div data-testid="debris-indicator" />
}));

describe('AsteroidInfo', () => {
  const defaultLocation: Location = {
    coord: 'A00:10:22:10',
    type: 'asteroid',
    debris: {
      amount: 1000,
      generationRate: 5,
      recyclers: []
    },
    properties: {
      fertility: 0,
      resources: {
        metal: 100,
        energy: 100,
        research: 0
      }
    },
    owner: null,
    createdAt: new Date()
  };

  it('renders asteroid information correctly', () => {
    render(<AsteroidInfo location={defaultLocation} />);
    
    // Check basic info
    expect(screen.getByText('Asteroid A00:10:22:10')).toBeInTheDocument();
    
    // Check resource values
    const metalLabel = screen.getByText('Metal:');
    expect(metalLabel).toBeInTheDocument();
    expect(metalLabel.nextElementSibling).toHaveTextContent('100');
    
    const energyLabel = screen.getByText('Energy:');
    expect(energyLabel).toBeInTheDocument();
    expect(energyLabel.nextElementSibling).toHaveTextContent('100');
  });

  it('shows debris information when debris exists', () => {
    render(<AsteroidInfo location={defaultLocation} />);
    
    expect(screen.getByText('Debris Field')).toBeInTheDocument();
    expect(screen.getByText('Current Amount:')).toBeInTheDocument();
    expect(screen.getByText('1.0K')).toBeInTheDocument();
    expect(screen.getByText('5/sec')).toBeInTheDocument();
  });

  it('shows active recyclers count', () => {
    const locationWithRecyclers: Location = {
      ...defaultLocation,
      debris: {
        ...defaultLocation.debris!,
        recyclers: [
          { empireId: 'empire1', startedAt: new Date() },
          { empireId: 'empire2', startedAt: new Date() }
        ]
      }
    };

    render(<AsteroidInfo location={locationWithRecyclers} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders recycle button when onRecycle is provided', () => {
    const onRecycle = jest.fn();
    render(<AsteroidInfo location={defaultLocation} onRecycle={onRecycle} />);
    
    const button = screen.getByText('Deploy Recycler');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(onRecycle).toHaveBeenCalled();
  });

  it('does not render recycle button when onRecycle is not provided', () => {
    render(<AsteroidInfo location={defaultLocation} />);
    expect(screen.queryByText('Deploy Recycler')).not.toBeInTheDocument();
  });

  it('includes DebrisIndicator component', () => {
    render(<AsteroidInfo location={defaultLocation} />);
    expect(screen.getByTestId('debris-indicator')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <AsteroidInfo location={defaultLocation} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('returns null for non-asteroid locations', () => {
    const nonAsteroidLocation: Location = {
      ...defaultLocation,
      type: 'planet'
    };

    const { container } = render(<AsteroidInfo location={nonAsteroidLocation} />);
    expect(container.firstChild).toBeNull();
  });
});