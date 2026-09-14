export type ServiceRecordingStatus = 'Draft' | 'Processing' | 'Ready' | 'Failed'

export type ServiceRecordingCategory = {
  id: string
  name: string
  sortOrder: number
  recordingCount: number
}

export type ServiceRecordingCategorySummary = {
  id: string
  name: string
}

export type ServiceRecordingSeries = {
  id: string
  name: string
  description?: string | null
  sortOrder: number
  recordingCount: number
}

export type ServiceRecordingSeriesSummary = {
  id: string
  name: string
}

export type ServiceRecordingAccess = {
  canManage: boolean
  canPublish: boolean
  canUnpublish: boolean
  canDelete: boolean
  canWatchPlayback: boolean
  canViewInList: boolean
  canViewDetail: boolean
}

export type ServiceRecordingListItem = {
  id: string
  title: string
  description?: string | null
  serviceDate?: string | null
  status: ServiceRecordingStatus
  publishedAt?: string | null
  durationSeconds?: number | null
  thumbnailUrl?: string | null
  category?: ServiceRecordingCategorySummary | null
  series?: ServiceRecordingSeriesSummary | null
  playCount: number
  createdAt: string
}

export type ServiceRecordingListPage = {
  recordings: ServiceRecordingListItem[]
  total: number
  page: number
  pageSize: number
}

export type ServiceRecordingListQuery = {
  q?: string
  categoryId?: string | null
  seriesId?: string | null
  page?: number
  pageSize?: number
}

export type UpdateServiceRecordingInput = {
  recordingId: string
  title: string
  description?: string | null
  serviceDate?: string | null
  categoryId?: string | null
  seriesId?: string | null
}

export type ServiceRecordingDetail = ServiceRecordingListItem & {
  storageBytes?: number | null
  updatedAt: string
  access: ServiceRecordingAccess
}

export type CreateServiceRecordingInput = {
  title: string
  description?: string | null
  serviceDate?: string | null
  categoryId?: string | null
  seriesId?: string | null
}

export type CreateServiceRecordingResult = {
  id: string
  title: string
  status: ServiceRecordingStatus
  bunnyVideoGuid: string
  uploadUrl: string
  uploadAccessKey: string
}

export type ServiceRecordingPlayback = {
  embedUrl: string
  expiresAtUnix: number
}

export async function uploadServiceRecordingVideo(
  uploadUrl: string,
  uploadAccessKey: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('AccessKey', uploadAccessKey)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`Upload failed (${xhr.status})`))
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(file)
  })
}
