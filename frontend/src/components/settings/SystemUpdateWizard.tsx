import { useState, useRef, useEffect, useMemo } from 'react'
import { X, Upload, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { Button } from '../common/Button'
import { getUpdateApi, LockStatus, UploadProgress, InstallProgress } from '../../api/update'
import { getApiMode } from '../../api/config'

export interface SystemUpdateWizardProps {
  isOpen: boolean
  onClose: () => void
}

type WizardStep = 'check-lock' | 'upload' | 'validate' | 'confirm' | 'install' | 'complete' | 'locked'

/**
 * Multi-step wizard for system updates.
 * Handles lock acquisition, file upload, validation, installation, and reboot.
 */
export function SystemUpdateWizard({ isOpen, onClose }: SystemUpdateWizardProps) {
  const [step, setStep] = useState<WizardStep>('check-lock')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [installId, setInstallId] = useState<string | null>(null)
  const [lockId, setLockId] = useState<string | null>(null)
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(null)
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rebootCountdown, setRebootCountdown] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isOnline = getApiMode() === 'online'
  const api = useMemo(() => getUpdateApi(), [])

  // Check lock status on open
  useEffect(() => {
    if (!isOpen) return

    const checkLock = async () => {
      try {
        const status = await api.getLockStatus()
        setLockStatus(status)

        if (status.isLocked) {
          setStep('locked')
        } else {
          // Acquire lock
          const lock = await api.acquireLock()
          setLockId(lock.lockId)
          setStep('upload')
        }
      } catch (err) {
        setError((err as Error).message)
        setStep('upload') // Fallback to upload in offline mode
      }
    }

    if (isOnline) {
      checkLock()
    } else {
      setStep('upload')
    }
  }, [isOpen, isOnline, api])

  // Poll upload status
  useEffect(() => {
    if (!uploadId || step !== 'validate') return

    const pollUploadStatus = async () => {
      try {
        const status: UploadProgress = await api.getUploadStatus(uploadId)

        if (status.status === "validating") {
          setUploadProgress(status.percentComplete)
        } else if (status.status === "idle" && status.validationResults) {
          // Validation complete
          if (status.validationResults.checksumValid && status.validationResults.signatureValid) {
            setStep('confirm')
          } else {
            setError('Package validation failed')
          }
          return // Stop polling
        } else if (status.status === "error") {
          setError(status.error || 'Upload failed')
          return
        }
      } catch (err) {
        setError((err as Error).message)
      }
    }

    const interval = setInterval(pollUploadStatus, 500)
    return () => clearInterval(interval)
  }, [uploadId, step, api])

  // Poll installation status
  useEffect(() => {
    if (!installId || step !== 'install') return

    const pollInstallStatus = async () => {
      try {
        const status: InstallProgress = await api.getInstallStatus(installId)
        setInstallProgress(status)

        if (status.status === "complete") {
          setStep('complete')
          return // Stop polling
        } else if (status.status === "error") {
          setError(status.error || 'Installation failed')
        }
      } catch (err) {
        setError((err as Error).message)
      }
    }

    const interval = setInterval(pollInstallStatus, 500)
    return () => clearInterval(interval)
  }, [installId, step, api])

  // Release lock on close (if we own it)
  useEffect(() => {
    return () => {
      if (lockId && isOnline) {
        api.releaseLock(lockId).catch(console.error)
      }
    }
  }, [lockId, isOnline, api])

  if (!isOpen) return null

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setError(null)
    setStep('validate')
    setUploadProgress(0)

    try {
      const id = await api.uploadPackage(selectedFile, (progress) => {
        setUploadProgress(progress)
      })
      setUploadId(id)
    } catch (err) {
      setError((err as Error).message)
      setStep('upload')
    }
  }

  const handleStartUpdate = async () => {
    if (!uploadId) return

    setError(null)
    setStep('install')

    try {
      const id = await api.startInstall(uploadId)
      setInstallId(id)
    } catch (err) {
      setError((err as Error).message)
      setStep('confirm')
    }
  }

  const handleReboot = () => {
    let countdown = 10
    setRebootCountdown(countdown)
    const interval = setInterval(() => {
      countdown--
      setRebootCountdown(countdown)
      if (countdown <= 0) {
        clearInterval(interval)
        // In production, this would trigger backend reboot
        setTimeout(() => {
          handleCancel()
        }, 1000)
      }
    }, 1000)
  }

  const handleCancel = () => {
    // Release lock if we own it
    if (lockId && isOnline) {
      api.releaseLock(lockId).catch(console.error)
    }

    setStep('check-lock')
    setSelectedFile(null)
    setUploadProgress(0)
    setUploadId(null)
    setInstallId(null)
    setLockId(null)
    setLockStatus(null)
    setInstallProgress(null)
    setError(null)
    setRebootCountdown(null)
    onClose()
  }

  const renderStep = () => {
    if (step === 'check-lock') {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Checking system lock status...</p>
        </div>
      )
    }

    if (step === 'locked') {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Lock className="h-12 w-12 text-status-warning" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">System Update In Progress</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {lockStatus?.lockedBy ? (
              <>System update is currently locked by <span className="font-mono">{lockStatus.lockedBy}</span></>
            ) : (
              'Another user is performing a system update'
            )}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Please wait until the update is complete before attempting another update.
          </p>
          <Button onClick={handleCancel} variant="secondary" className="mt-6">
            Close
          </Button>
        </div>
      )
    }

    if (step === 'upload') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">Upload Update Package</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a signed .pkg file from your computer
            </p>
          </div>

          <div className="rounded-sm border-2 border-dashed border-border/60 bg-muted/40 p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pkg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
              Choose File
            </Button>
            {selectedFile && (
              <p className="mt-3 text-xs text-foreground font-mono">{selectedFile.name}</p>
            )}
          </div>

          {error && (
            <div className="rounded-sm border border-status-error/30 bg-status-error/10 p-3">
              <p className="text-xs text-status-error">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleCancel} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile} className="flex-1">
              Upload
            </Button>
          </div>
        </div>
      )
    }

    if (step === 'validate') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">
              {uploadProgress < 100 ? 'Uploading' : 'Validating'} Package
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {uploadProgress < 100
                ? 'Transferring update package to system...'
                : 'Verifying checksum and signature...'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono text-foreground">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>

          {selectedFile && (
            <div className="rounded-sm border border-border/60 bg-card p-3">
              <p className="text-xs font-mono text-foreground">{selectedFile.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
      )
    }

    if (step === 'confirm') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-status-success" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">Ready to Install</h3>
            <p className="mt-1 text-xs text-muted-foreground">Package validated successfully</p>
          </div>

          {selectedFile && (
            <div className="rounded-sm border border-border/60 bg-card p-3">
              <p className="text-xs font-mono text-foreground">{selectedFile.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <div className="rounded-sm border border-status-warning/30 bg-status-warning/10 p-3">
            <p className="text-xs text-status-warning">
              ⚠ System will reboot after installation completes
            </p>
          </div>

          {error && (
            <div className="rounded-sm border border-status-error/30 bg-status-error/10 p-3">
              <p className="text-xs text-status-error">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleCancel} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleStartUpdate} className="flex-1">
              Install Update
            </Button>
          </div>
        </div>
      )
    }

    if (step === 'install') {
      const progress = installProgress?.percentComplete || 0
      const currentStep = installProgress?.currentStep || 'Installing'
      const timeRemaining = installProgress?.timeRemainingSeconds

      return (
        <div className="space-y-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">{currentStep}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {timeRemaining ? `Approximately ${timeRemaining}s remaining` : 'Please wait...'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono text-foreground">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="rounded-sm border border-status-warning/30 bg-status-warning/10 p-3">
            <p className="text-xs text-status-warning">
              ⚠ Do not power off the system during installation
            </p>
          </div>
        </div>
      )
    }

    if (step === 'complete') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-status-success" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">Update Complete</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {rebootCountdown !== null
                ? `System will reboot in ${rebootCountdown}s`
                : 'System reboot required to apply update'}
            </p>
          </div>

          <div className="rounded-sm border border-status-warning/30 bg-status-warning/10 p-3">
            <p className="text-xs text-status-warning">
              All active tasks will be stopped during reboot
            </p>
          </div>

          {rebootCountdown === null && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCancel} variant="secondary" className="flex-1">
                Reboot Later
              </Button>
              <Button onClick={handleReboot} className="flex-1">
                Reboot Now
              </Button>
            </div>
          )}

          {rebootCountdown !== null && (
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-sm border border-border/70 bg-card p-6 shadow-2xl">
        {step !== 'install' && step !== 'complete' && (
          <button
            onClick={handleCancel}
            className="absolute right-4 top-4 rounded-sm p-1 hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <h2 className="mb-4 text-lg font-semibold text-foreground">System Update</h2>

        {renderStep()}
      </div>
    </div>
  )
}
