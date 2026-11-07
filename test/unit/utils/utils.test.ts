import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, getStatusColor, calculateProgramScore, cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('formats timestamp to YYYY-MM-DD', () => {
      const timestamp = new Date('2024-01-15T10:30:00.000Z').getTime();
      expect(formatDate(timestamp)).toBe('2024-01-15');
    });

    it('handles different timezones', () => {
      const timestamp = new Date('2024-12-31T23:59:59.999Z').getTime();
      expect(formatDate(timestamp)).toBe('2024-12-31');
    });
  });

  describe('formatDateTime', () => {
    it('formats timestamp to YYYY-MM-DD HH:MM', () => {
      const timestamp = new Date('2024-01-15T10:30:00.000Z').getTime();
      const result = formatDateTime(timestamp);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
  });

  describe('getStatusColor', () => {
    it('returns correct color classes for each status', () => {
      expect(getStatusColor('inbox')).toContain('bg-gray-100');
      expect(getStatusColor('evaluating')).toContain('bg-blue-100');
      expect(getStatusColor('ready_to_investigate')).toContain('bg-yellow-100');
      expect(getStatusColor('active_research')).toContain('bg-green-100');
      expect(getStatusColor('paused')).toContain('bg-orange-100');
      expect(getStatusColor('archived')).toContain('bg-purple-100');
    });

    it('returns gray for unknown status', () => {
      expect(getStatusColor('unknown')).toContain('bg-gray-100');
    });
  });

  describe('calculateProgramScore', () => {
    it('calculates sum of scores with equal weights', () => {
      const scores = {
        attackSurfaceUsefulness: 5,
        scopeClarity: 4,
        rewardSuitability: 3,
        productComplexity: 2,
        researchOpportunity: 5,
        skillFit: 4,
      };

      const { total, breakdown } = calculateProgramScore(scores);

      // All weights are 1, so total = sum of all scores = 5+4+3+2+5+4 = 23
      expect(total).toBe(23);
      expect(breakdown).toHaveProperty('attackSurfaceUsefulness', 5);
      expect(breakdown).toHaveProperty('scopeClarity', 4);
    });

    it('handles missing scores as 0', () => {
      const scores = { attackSurfaceUsefulness: 5 };
      const { total } = calculateProgramScore(scores);
      expect(total).toBe(5); // Only one dimension with value 5
    });

    it('handles empty scores', () => {
      const { total } = calculateProgramScore({});
      expect(total).toBe(0);
    });
  });

  describe('cn (classnames)', () => {
    it('joins class names', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c');
    });

    it('handles conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
    });

    it('handles empty strings', () => {
      expect(cn('a', '', 'b')).toBe('a b');
    });
  });
});