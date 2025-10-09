import '@testing-library/jest-dom';
import './viteMock';

// Mock canvas functions with proper typing
// We return a partial CanvasRenderingContext2D and cast it for tests
HTMLCanvasElement.prototype.getContext = (() => {
  const ctx = {
    clearRect: jest.fn(),
    fillStyle: '' as any,
    strokeStyle: '' as any,
    lineWidth: 0,
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    // Add commonly used APIs to avoid undefined errors during tests
    get canvas() { return document.createElement('canvas'); },
  } as Partial<CanvasRenderingContext2D>;

  return ctx as unknown as CanvasRenderingContext2D;
}) as any;
