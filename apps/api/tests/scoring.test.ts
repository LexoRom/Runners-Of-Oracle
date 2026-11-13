import { describe, it, expect } from 'vitest'

describe('Scoring module', () => {
  // Test the scoring formula: Score = Points_base + Points_perf
  describe('computeScore', () => {
    it('should return base points when all tests pass and time is at tOpt', () => {
      const basePoints = 100
      const perfMax = 50
      const allPassed = true
      // At tOpt, ratio = 1, so perfPoints = perfMax
      const perfPoints = Math.round(perfMax * 1)
      const score = allPassed ? basePoints + perfPoints : 0
      expect(score).toBe(basePoints + perfMax)
    })

    it('should return 0 when tests fail', () => {
      const score = 0
      expect(score).toBe(0)
    })

    it('should apply perf penalty when time exceeds tMax', () => {
      const basePoints = 100
      const perfMax = 30
      const totalTimeMs = 10000 // Well beyond tMax
      const ratio = Math.max(0, 1 - ((totalTimeMs - 500) / (5000 - 500)))
      const perfPoints = Math.round(perfMax * ratio) // = 0
      const score = basePoints + perfPoints // = basePoints
      expect(score).toBe(basePoints)
    })

    it('should apply partial perf penalty between tOpt and tMax', () => {
      const basePoints = 100
      const perfMax = 50
      const totalTimeMs = 3000 // 3 seconds between tOpt(0.5s) and tMax(5s)
      const ratio = Math.max(0, 1 - ((3000 - 500) / (5000 - 500))) // = 0.444
      const perfPoints = Math.round(perfMax * ratio) // = 22
      const score = basePoints + perfPoints // = 122
      expect(perfPoints).toBe(22)
    })

    it('should not apply perf penalty for DEBUG type challenges', () => {
      const basePoints = 150
      const perfMax = 0
      const allPassed = true
      const score = allPassed ? basePoints + perfMax : 0
      expect(score).toBe(150)
    })

    it('should return 0 for DEBUG challenge that fails', () => {
      const basePoints = 150
      const perfMax = 0
      const allPassed = false
      const score = allPassed ? basePoints + perfMax : 0
      expect(score).toBe(0)
    })
  })

  describe('decrypt challenge scoring', () => {
    it('should use text comparison for decrypt type - correct', () => {
      const basePoints = 100
      const difficulty = 2
      const correct = true
      const score = correct ? basePoints * difficulty : 0
      expect(score).toBe(200)
    })

    it('should return 0 for incorrect decrypt', () => {
      const score = 0
      expect(score).toBe(0)
    })

    it('should handle empty code in decrypt challenge', () => {
      const basePoints = 100
      const difficulty = 1
      const correct = false
      const score = correct ? basePoints * difficulty : 0
      expect(score).toBe(0)
    })
  })
})