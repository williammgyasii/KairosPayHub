import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CreateServiceRecordingResult, ServiceRecordingTusUpload } from '@/features/media/api'
import { serviceRecordingsApi } from '@/features/media/api/serviceRecordingsApi'
import {
  loadPersistedUploadJobs,
  loadUploadFile,
  persistUploadJobs,
  removeUploadFile,
  saveUploadFile,
} from '@/features/media/lib/service-recording-upload-persistence'
import {
  tusUploadFromCreateResult,
  uploadServiceRecordingWithTus,
  type ServiceRecordingUploadProgress,
} from '@/features/media/lib/service-recording-tus-upload'
import { useAppDispatch } from '@/store/hooks'

export type ServiceRecordingUploadJobStatus =
  | 'queued'
  | 'uploading'
  | 'completed'
  | 'failed'

export type ServiceRecordingUploadJob = {
  id: string
  recordingId: string
  title: string
  fileName: string
  fileSize: number
  status: ServiceRecordingUploadJobStatus
  progress: ServiceRecordingUploadProgress
  error?: string
}

type EnqueueInput = {
  created: CreateServiceRecordingResult
  file: File
}

type PendingUpload = {
  file: File
  credentials: ServiceRecordingTusUpload
}

type ServiceRecordingUploadQueueContextValue = {
  jobs: ServiceRecordingUploadJob[]
  uploadJobByRecordingId: ReadonlyMap<string, ServiceRecordingUploadJob>
  enqueueUpload: (input: EnqueueInput) => void
  retryUpload: (jobId: string) => void
  dismissJob: (jobId: string) => void
  hasActiveUploads: boolean
  hydrated: boolean
}

const ServiceRecordingUploadQueueContext =
  createContext<ServiceRecordingUploadQueueContextValue | null>(null)

function createJobId() {
  return crypto.randomUUID()
}

function initialProgress(fileSize: number): ServiceRecordingUploadProgress {
  return { bytesUploaded: 0, bytesTotal: fileSize, percent: 0 }
}

export function ServiceRecordingUploadQueueProvider({
  children,
  onUploadComplete,
}: {
  children: ReactNode
  onUploadComplete?: () => void
}) {
  const dispatch = useAppDispatch()
  const [jobs, setJobs] = useState<ServiceRecordingUploadJob[]>([])
  const [hydrated, setHydrated] = useState(false)
  const jobsRef = useRef(jobs)
  const pendingRef = useRef(new Map<string, PendingUpload>())
  const processingRef = useRef(false)

  jobsRef.current = jobs

  const hasActiveUploads = jobs.some(
    (job) => job.status === 'queued' || job.status === 'uploading',
  )

  useEffect(() => {
    if (!hasActiveUploads) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasActiveUploads])

  useEffect(() => {
    if (!hydrated) return
    persistUploadJobs(jobs)
  }, [jobs, hydrated])

  const refreshCredentials = useCallback(
    async (recordingId: string) => {
      return dispatch(
        serviceRecordingsApi.endpoints.getServiceRecordingUploadCredentials.initiate(
          recordingId,
        ),
      ).unwrap()
    },
    [dispatch],
  )

  const updateJob = useCallback((jobId: string, patch: Partial<ServiceRecordingUploadJob>) => {
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
    )
  }, [])

  const runJob = useCallback(
    async (job: ServiceRecordingUploadJob) => {
      const pending = pendingRef.current.get(job.id)
      if (!pending) {
        updateJob(job.id, { status: 'failed', error: 'Upload file is no longer available.' })
        return
      }

      updateJob(job.id, {
        status: 'uploading',
        error: undefined,
      })

      try {
        await uploadServiceRecordingWithTus(
          pending.file,
          pending.credentials,
          job.recordingId,
          (progress) => updateJob(job.id, { progress }),
        )
        updateJob(job.id, {
          status: 'completed',
          progress: {
            bytesUploaded: pending.file.size,
            bytesTotal: pending.file.size,
            percent: 100,
          },
        })
        pendingRef.current.delete(job.id)
        void removeUploadFile(job.id)
        dispatch(serviceRecordingsApi.util.invalidateTags(['ServiceRecordings']))
        onUploadComplete?.()
      } catch (err) {
        updateJob(job.id, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Upload failed',
        })
      }
    },
    [dispatch, onUploadComplete, updateJob],
  )

  const processQueue = useCallback(async () => {
    if (processingRef.current || !hydrated) return
    processingRef.current = true

    try {
      while (true) {
        const nextJob = jobsRef.current.find((job) => job.status === 'queued')
        if (!nextJob) break
        await runJob(nextJob)
      }
    } finally {
      processingRef.current = false
    }
  }, [hydrated, runJob])

  useEffect(() => {
    if (jobs.some((job) => job.status === 'queued')) {
      void processQueue()
    }
  }, [jobs, processQueue])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const persisted = loadPersistedUploadJobs()
      if (persisted.length === 0) {
        if (!cancelled) setHydrated(true)
        return
      }

      const restoredJobs: ServiceRecordingUploadJob[] = []
      for (const job of persisted) {
        if (job.status === 'completed' || job.status === 'failed') {
          restoredJobs.push(job)
          continue
        }

        const file = await loadUploadFile(job.id)
        if (!file) {
          restoredJobs.push({
            ...job,
            status: 'failed',
            error: 'Upload interrupted. Retry to continue from where you left off.',
          })
          continue
        }

        try {
          const credentials = await refreshCredentials(job.recordingId)
          pendingRef.current.set(job.id, { file, credentials })
          restoredJobs.push({
            ...job,
            status: 'queued',
            error: undefined,
          })
        } catch (err) {
          restoredJobs.push({
            ...job,
            status: 'failed',
            error:
              err instanceof Error
                ? err.message
                : 'Could not restore upload credentials after reload.',
          })
        }
      }

      if (!cancelled) {
        setJobs(restoredJobs)
        setHydrated(true)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [refreshCredentials])

  const enqueueUpload = useCallback(({ created, file }: EnqueueInput) => {
    const jobId = createJobId()
    pendingRef.current.set(jobId, {
      file,
      credentials: tusUploadFromCreateResult(created),
    })
    void saveUploadFile(jobId, file)

    setJobs((current) => [
      ...current,
      {
        id: jobId,
        recordingId: created.id,
        title: created.title,
        fileName: file.name,
        fileSize: file.size,
        status: 'queued',
        progress: initialProgress(file.size),
      },
    ])
  }, [])

  const retryUpload = useCallback(
    async (jobId: string) => {
      const job = jobsRef.current.find((item) => item.id === jobId)
      const pending = pendingRef.current.get(jobId)

      if (!job) return

      try {
        const file = pending?.file ?? (await loadUploadFile(jobId))
        if (!file) {
          updateJob(jobId, {
            status: 'failed',
            error: 'Upload file is no longer available. Start a new upload from Recordings.',
          })
          return
        }

        const refreshed = await refreshCredentials(job.recordingId)
        pendingRef.current.set(jobId, { file, credentials: refreshed })
        updateJob(jobId, { status: 'queued', error: undefined })
        void processQueue()
      } catch (err) {
        updateJob(jobId, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Could not refresh upload credentials.',
        })
      }
    },
    [processQueue, refreshCredentials, updateJob],
  )

  const dismissJob = useCallback((jobId: string) => {
    pendingRef.current.delete(jobId)
    void removeUploadFile(jobId)
    setJobs((current) => current.filter((job) => job.id !== jobId))
  }, [])

  const uploadJobByRecordingId = useMemo(() => {
    const map = new Map<string, ServiceRecordingUploadJob>()
    for (const job of jobs) {
      map.set(job.recordingId, job)
    }
    return map
  }, [jobs])

  const value = useMemo(
    () => ({
      jobs,
      uploadJobByRecordingId,
      enqueueUpload,
      retryUpload,
      dismissJob,
      hasActiveUploads,
      hydrated,
    }),
    [jobs, uploadJobByRecordingId, enqueueUpload, retryUpload, dismissJob, hasActiveUploads, hydrated],
  )

  return (
    <ServiceRecordingUploadQueueContext.Provider value={value}>
      {children}
    </ServiceRecordingUploadQueueContext.Provider>
  )
}

export function useServiceRecordingUploadQueue() {
  const context = useContext(ServiceRecordingUploadQueueContext)
  if (!context) {
    throw new Error(
      'useServiceRecordingUploadQueue must be used within ServiceRecordingUploadQueueProvider',
    )
  }
  return context
}
