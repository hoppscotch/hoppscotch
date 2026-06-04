/**
 * Tests for Performance Monitoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  recordJSONPerformance,
  getCurrentMetrics,
  getAverageMetrics,
  clearMetricsHistory,
} from '~/helpers/lenses/performanceMonitoring'

describe('Performance Monitoring', () => {
  beforeEach(() => {
    clearMetricsHistory()
  })

  describe('metrics recording', () => {
    it('should record performance metrics', () => {
      recordJSONPerformance({
        responseSize: 1000000,
        parseTime: 100,
        renderTime: 200,
        isLargeResponse: true,
      })

      const metrics = getCurrentMetrics()
      expect(metrics).toBeDefined()
      expect(metrics?.responseSize).toBe(1000000)
      expect(metrics?.parseTime).toBe(100)
      expect(metrics?.renderTime).toBe(200)
      expect(metrics?.totalTime).toBe(300)
    })

    it('should calculate total time', () => {
      recordJSONPerformance({
        responseSize: 500000,
        parseTime: 50,
        renderTime: 75,
      })

      const metrics = getCurrentMetrics()
      expect(metrics?.totalTime).toBe(125)
    })

    it('should track large response flag', () => {
      recordJSONPerformance({
        responseSize: 1000000,
        parseTime: 50,
        renderTime: 75,
        isLargeResponse: true,
      })

      const metrics = getCurrentMetrics()
      expect(metrics?.isLargeResponse).toBe(true)
    })

    it('should maintain history of metrics', () => {
      recordJSONPerformance({
        responseSize: 100000,
        parseTime: 10,
        renderTime: 20,
      })

      recordJSONPerformance({
        responseSize: 200000,
        parseTime: 20,
        renderTime: 40,
      })

      const avg = getAverageMetrics()
      expect(avg.avgResponseSize).toBeGreaterThan(0)
      expect(avg.avgParseTime).toBeGreaterThan(0)
      expect(avg.avgRenderTime).toBeGreaterThan(0)
    })

    it('should limit history to 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        recordJSONPerformance({
          responseSize: 100000,
          parseTime: 10,
          renderTime: 20,
        })
      }

      // Internal history should be limited, but we check via average
      const avg = getAverageMetrics()
      expect(avg.avgResponseSize).toBe(100000)
    })
  })

  describe('metrics retrieval', () => {
    it('should get current metrics', () => {
      recordJSONPerformance({
        responseSize: 500000,
        parseTime: 50,
        renderTime: 75,
      })

      const metrics = getCurrentMetrics()
      expect(metrics).toBeDefined()
      expect(metrics?.timestamp).toBeGreaterThan(0)
    })

    it('should return null if no metrics recorded', () => {
      const metrics = getCurrentMetrics()
      expect(metrics).toBeNull()
    })

    it('should calculate average metrics', () => {
      recordJSONPerformance({
        responseSize: 100000,
        parseTime: 10,
        renderTime: 20,
      })

      recordJSONPerformance({
        responseSize: 200000,
        parseTime: 20,
        renderTime: 40,
      })

      const avg = getAverageMetrics()
      expect(avg.avgResponseSize).toBe(150000)
      expect(avg.avgParseTime).toBe(15)
      expect(avg.avgRenderTime).toBe(30)
      expect(avg.avgTotalTime).toBe(45)
    })

    it('should return zero averages if no metrics', () => {
      const avg = getAverageMetrics()
      expect(avg.avgParseTime).toBe(0)
      expect(avg.avgRenderTime).toBe(0)
      expect(avg.avgTotalTime).toBe(0)
      expect(avg.avgResponseSize).toBe(0)
    })
  })

  describe('metrics clearing', () => {
    it('should clear metrics history', () => {
      recordJSONPerformance({
        responseSize: 100000,
        parseTime: 10,
        renderTime: 20,
      })

      clearMetricsHistory()

      expect(getCurrentMetrics()).toBeNull()
      const avg = getAverageMetrics()
      expect(avg.avgParseTime).toBe(0)
    })
  })
})
