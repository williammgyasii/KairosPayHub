import { describe, expect, it } from 'vitest'
import {
  buildServiceRecordingWatermarkText,
  serviceRecordingWatermarkIdSuffix,
  serviceRecordingWatermarkPositionIndex,
  serviceRecordingWatermarkPositionStyle,
} from './service-recording-watermark-policy'

describe('service-recording-watermark-policy', () => {
  it('builds watermark with name, email, and id suffix', () => {
    expect(
      buildServiceRecordingWatermarkText({
        name: 'William Fellowship Leader',
        email: 'williammgyasii+pastor@gmail.com',
        id: 'afae1cb7-d70b-41bf-93cd-d6955d8657cb',
      }),
    ).toBe(
      'William Fellowship Leader · williammgyasii+pastor@gmail.com · #8657CB',
    )
  })

  it('uses email and id when name is missing', () => {
    expect(
      buildServiceRecordingWatermarkText({
        name: null,
        email: 'member@church.org',
        id: '00000000-0000-0000-0000-00000000abcd',
      }),
    ).toBe('member@church.org · #00ABCD')
  })

  it('falls back when viewer identity is empty', () => {
    expect(
      buildServiceRecordingWatermarkText({
        name: '',
        email: '   ',
        id: '',
      }),
    ).toBe('KairosPayHub · Authorized viewer only')
  })

  it('derives a stable six-character id suffix', () => {
    expect(serviceRecordingWatermarkIdSuffix('afae1cb7-d70b-41bf-93cd-d6955d8657cb')).toBe(
      '8657CB',
    )
    expect(serviceRecordingWatermarkIdSuffix(null)).toBeNull()
  })

  it('rotates watermark positions on a fixed cycle', () => {
    expect(serviceRecordingWatermarkPositionIndex(0)).toBe(0)
    expect(serviceRecordingWatermarkPositionIndex(7)).toBe(7)
    expect(serviceRecordingWatermarkPositionIndex(8)).toBe(0)
    expect(serviceRecordingWatermarkPositionIndex(-1)).toBe(7)
  })

  it('returns css position styles for each slot', () => {
    expect(serviceRecordingWatermarkPositionStyle(0)).toEqual({ top: '8%', left: '6%' })
    expect(serviceRecordingWatermarkPositionStyle(1)).toEqual({ top: '8%', right: '6%' })
  })
})
