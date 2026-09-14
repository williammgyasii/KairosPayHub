import type { ServiceRecordingUploadJob } from '@/features/media/lib/service-recording-upload-queue'

const JOBS_STORAGE_KEY = 'kairospayhub:service-recording-upload-jobs'
const DB_NAME = 'kairospayhub-service-recording-uploads'
const DB_VERSION = 1
const FILE_STORE = 'files'

type PersistedUploadJob = ServiceRecordingUploadJob

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function indexedDbAvailable() {
  return typeof indexedDB !== 'undefined'
}

export function loadPersistedUploadJobs(): PersistedUploadJob[] {
  if (!storageAvailable()) return []

  try {
    const raw = sessionStorage.getItem(JOBS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersistedUploadJob[]
    if (!Array.isArray(parsed)) return []

    return parsed.map((job) =>
      job.status === 'uploading'
        ? { ...job, status: 'queued' as const }
        : job,
    )
  } catch {
    return []
  }
}

export function persistUploadJobs(jobs: PersistedUploadJob[]) {
  if (!storageAvailable()) return
  try {
    if (jobs.length === 0) {
      sessionStorage.removeItem(JOBS_STORAGE_KEY)
      return
    }
    sessionStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs))
  } catch {
    // Quota or private mode — uploads still work for this session.
  }
}

function openUploadDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Could not open upload storage'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FILE_STORE)) {
        request.result.createObjectStore(FILE_STORE)
      }
    }
  })
}

export async function saveUploadFile(jobId: string, file: File): Promise<void> {
  if (!indexedDbAvailable()) return
  const db = await openUploadDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readwrite')
    tx.objectStore(FILE_STORE).put(file, jobId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not save upload file'))
  })
  db.close()
}

export async function loadUploadFile(jobId: string): Promise<File | null> {
  if (!indexedDbAvailable()) return null
  const db = await openUploadDb()
  const file = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readonly')
    const request = tx.objectStore(FILE_STORE).get(jobId)
    request.onsuccess = () => resolve((request.result as File | undefined) ?? null)
    request.onerror = () => reject(request.error ?? new Error('Could not load upload file'))
  })
  db.close()
  return file
}

export async function removeUploadFile(jobId: string): Promise<void> {
  if (!indexedDbAvailable()) return
  const db = await openUploadDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readwrite')
    tx.objectStore(FILE_STORE).delete(jobId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not remove upload file'))
  })
  db.close()
}
