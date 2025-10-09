import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { DebrisIndicator } from '../DebrisIndicator';
import { Location } from '../../../../../shared/src/types';
import { useGameStore } from '../../../stores/gameStore';

// Mock canvas operations
const mockGetContext = jest.fn();
HTMLCanvasElement.prototype.getContext = mockGetContext;

// Mock socket to avoid import.meta.env in nested imports
jest.mock('../../../services/socket', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn()
  }
}));

// Mock game store
jest.mock('../../../stores/gameStore', () => ({
  useGameStore: jest.fn()
}));
const mockUseGameStore = useGameStore as unknown as jest.MockedFunction<typeof useGameStore>;

describe('DebrisIndicator', () => {
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

  beforeEach(() => {
    // Reset mocks
    mockGetContext.mockReset();
    mockGetContext.mockReturnValue({
      clearRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn()
    });

    mockUseGameStore.mockReturnValue({ currentEmpire: { _id: 'empire1' } });
  });

  it('renders debris field visualization', () => {
    const { container } = render(<DebrisIndicator location={defaultLocation} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('shows tooltip on hover with correct information', () => {
    render(<DebrisIndicator location={defaultLocation} />);
    
    // Hover over the container
    const container = screen.getByTitle('Debris field').parentElement!;
    fireEvent.mouseEnter(container);

    // Check tooltip content
    expect(screen.getByText('Debris Field')).toBeInTheDocument();
    const amountText = screen.getByText((content) => content.includes('Amount:'));
    expect(amountText).toHaveTextContent('1.0K');
    
    const rateText = screen.getByText((content) => content.includes('/sec'));
    expect(rateText).toHaveTextContent('5/sec');
  });

  it('shows recycler information when recyclers are present', () => {
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

    render(<DebrisIndicator location={locationWithRecyclers} />);
    
    // Hover over the container
    const container = screen.getByTitle('Debris field').parentElement!;
    fireEvent.mouseEnter(container);

    // Check recycler information
    const recyclerCountText = screen.getByText((content) => content.includes('Active Recyclers'));
    expect(recyclerCountText).toHaveTextContent('2');
    
  });

  it('handles different sizes correctly', () => {
    const { rerender, container } = render(
      <DebrisIndicator location={defaultLocation} size="small" />
    );
    
    let canvas = container.querySelector('canvas');
    expect(canvas?.width).toBe(32);
    expect(canvas?.height).toBe(32);

    rerender(<DebrisIndicator location={defaultLocation} size="large" />);
    canvas = container.querySelector('canvas');
    expect(canvas?.width).toBe(64);
    expect(canvas?.height).toBe(64);
  });

  it('updates visualization based on debris amount', () => {
    const { rerender } = render(<DebrisIndicator location={defaultLocation} />);
    
    let drawCalls = mockGetContext.mock.results[0].value.arc.mock.calls.length;
    
    // Update with more debris
    const locationWithMoreDebris: Location = {
      ...defaultLocation,
      debris: {
        ...defaultLocation.debris!,
        amount: 5000
      }
    };

    rerender(<DebrisIndicator location={locationWithMoreDebris} />);
    
    // Should have more particles
    const newDrawCalls = mockGetContext.mock.results[0].value.arc.mock.calls.length;
    expect(newDrawCalls).toBeGreaterThan(drawCalls);
  });

  it('cleans up animation on unmount', () => {
    const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<DebrisIndicator location={defaultLocation} />);
    
    unmount();
    
    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    cancelAnimationFrameSpy.mockRestore();
  });
});