import { validateServiceRecordingFile } from '@/features/media/lib/service-recording-upload-policy'

describe('service-recording-upload-policy', () => {
  it('accepts mp4 within size limit', () => {
    const file = new File(['x'], 'service.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: 1024 })
    expect(validateServiceRecordingFile(file)).toBeNull()
  })

  it('rejects unsupported types', () => {
    const file = new File(['x'], 'notes.pdf', { type: 'application/pdf' })
    expect(validateServiceRecordingFile(file)).toMatch(/MP4/)
  })
})
