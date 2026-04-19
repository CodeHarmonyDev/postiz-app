import { useCallback, useRef, useState } from 'react'
import clsx from 'clsx'
import { useMediaUpload } from './use-media'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
]

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

type UploadQueueItem = {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error' | 'duplicate'
  error?: string
}

export function MediaUpload({
  onUploadComplete,
}: {
  onUploadComplete?: () => void
}) {
  const { upload, isUploading, error, clearError } = useMediaUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [queue, setQueue] = useState<UploadQueueItem[]>([])

  const processFiles = useCallback(
    async (files: File[]) => {
      setValidationError(null)
      clearError()

      const validFiles: File[] = []

      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setValidationError(`Unsupported file type: ${file.type} (${file.name})`)
          return
        }

        if (file.size > MAX_SIZE) {
          setValidationError(`File exceeds 50 MB size limit: ${file.name}`)
          return
        }

        validFiles.push(file)
      }

      if (validFiles.length === 0) return

      const items: UploadQueueItem[] = validFiles.map((file) => ({
        file,
        status: 'pending' as const,
      }))
      setQueue(items)

      let completedCount = 0

      for (let i = 0; i < items.length; i++) {
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'uploading' } : item,
          ),
        )

        const result = await upload(items[i].file)

        if (result) {
          completedCount++
          setQueue((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'done' } : item,
            ),
          )
        } else {
          setQueue((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'error', error: 'Upload failed' } : item,
            ),
          )
        }
      }

      if (completedCount > 0) {
        onUploadComplete?.()
      }

      // Clear queue after a short delay so user can see results
      setTimeout(() => setQueue([]), 2000)
    },
    [upload, clearError, onUploadComplete],
  )

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files

    if (files && files.length > 0) {
      void processFiles(Array.from(files))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    const files = event.dataTransfer.files

    if (files.length > 0) {
      void processFiles(Array.from(files))
    }
  }

  const displayError = validationError || error
  const hasActiveUploads = queue.some((item) => item.status === 'uploading' || item.status === 'pending')

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          'cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition',
          isDragging
            ? 'border-sky-400 bg-sky-400/5'
            : 'border-slate-700 bg-slate-950/30 hover:border-slate-500',
          (isUploading || hasActiveUploads) && 'pointer-events-none opacity-60',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
          multiple
        />

        {isUploading || hasActiveUploads ? (
          <div className="space-y-2">
            <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-orange-400" />
            </div>
            <p className="text-sm text-slate-300">
              Uploading{queue.length > 1 ? ` (${queue.filter((q) => q.status === 'done').length}/${queue.length})` : '...'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-slate-500">
              Images, videos, and PDFs up to 50 MB. Multiple files supported.
            </p>
          </div>
        )}
      </div>

      {/* Upload queue progress */}
      {queue.length > 1 && (
        <div className="space-y-1.5">
          {queue.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs"
            >
              <span
                className={clsx(
                  'h-1.5 w-1.5 rounded-full',
                  item.status === 'done' && 'bg-emerald-400',
                  item.status === 'uploading' && 'animate-pulse bg-sky-400',
                  item.status === 'pending' && 'bg-slate-600',
                  item.status === 'error' && 'bg-rose-400',
                )}
              />
              <span className="truncate text-slate-300">{item.file.name}</span>
              {item.status === 'error' && (
                <span className="ml-auto text-rose-400">{item.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {displayError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
          {displayError}
        </div>
      ) : null}
    </div>
  )
}
