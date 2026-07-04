import { describe, it, expect } from 'vitest';
import { fitWithin } from './resize';

describe('fitWithin', () => {
	it('leaves small images untouched', () => {
		expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
	});
	it('scales a landscape image by its long edge', () => {
		expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
	});
	it('scales a portrait image by its long edge', () => {
		expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
	});
	it('scales a square image to the cap', () => {
		expect(fitWithin(2000, 2000, 1280)).toEqual({ width: 1280, height: 1280 });
	});
	it('keeps a dimension at exactly the cap', () => {
		expect(fitWithin(1280, 720, 1280)).toEqual({ width: 1280, height: 720 });
	});
	it('never rounds a thin edge below 1px', () => {
		const r = fitWithin(5000, 4, 1280);
		expect(r.width).toBe(1280);
		expect(r.height).toBe(1);
	});
	it('handles degenerate zero input', () => {
		expect(fitWithin(0, 0, 1280)).toEqual({ width: 0, height: 0 });
	});
});
