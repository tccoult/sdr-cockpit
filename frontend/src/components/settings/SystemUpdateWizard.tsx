import { useState, useRef, useEffect } from 'react'
import { X, Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '../common/Button'
import { UpdateStatus, UpdateState } from '../../types/diagnostics'

export interface SystemUpdateWizardProps {
  isOpen: boolean
  onClose: () => void
}

type WizardStep = 'upload' | 'validate' | 'confirm' | 'install' | 'complete'

/**
 * Multi-step wizard for system updates.
 * Handles file upload, validation, installation, and reboot.
 */
export function SystemUpdateWizard({ isOpen, onClose }: SystemUpdateWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: UpdateStatus.IDLE,
    progress: 0,
    message: '',
  })
  const [rebootCountdown, setRebootCountdown] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Prevent ESC from closing during reboot confirmation (step === 'complete' but rebootCountdown === null)
  const shouldPreventEscClose = step === 'complete' && rebootCountdown === null

  useEffect(() => {
    if (!isOpen || !shouldPreventEscClose) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleEscape, true) // Use capture phase
    return () => document.removeEventListener('keydown', handleEscape, true)
  }, [isOpen, shouldPreventEscClose])

  if (!isOpen) return null

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Mock validation
      setTimeout(() => {
        setStep('validate')
        setUpdateState({
          status: UpdateStatus.VALIDATING,
          progress: 50,
          message: 'Validating update package...',
        })
        setTimeout(() => {
          setUpdateState({
            status: UpdateStatus.IDLE,
            progress: 100,
            message: 'Validation successful',
          })
          setStep('confirm')
        }, 1500)
      }, 500)
    }
  }

  const handleStartUpdate = () => {
    setStep('install')
    setUpdateState({
      status: UpdateStatus.INSTALLING,
      progress: 0,
      message: 'Installing update...',
    })

    // Mock installation progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setUpdateState({
        status: UpdateStatus.INSTALLING,
        progress,
        message: progress < 100 ? 'Installing update...' : 'Update complete',
      })

      if (progress >= 100) {
        clearInterval(interval)
        setUpdateState({
          status: UpdateStatus.COMPLETE,
          progress: 100,
          message: 'Update installed successfully',
        })
        setStep('complete')
      }
    }, 500)
  }

  const handleReboot = () => {
    let countdown = 10
    setRebootCountdown(countdown)
    const interval = setInterval(() => {
      countdown--
      setRebootCountdown(countdown)
      if (countdown <= 0) {
        clearInterval(interval)
        // Mock reboot (in reality this would trigger backend reboot)
        setUpdateState({
          status: UpdateStatus.COMPLETE,
          progress: 100,
          message: 'System rebooting...',
        })
        // Close dialog after reboot completes
        setTimeout(() => {
          handleCancel()
        }, 1000)
      }
    }, 1000)
  }

  const handleCancel = () => {
    setStep('upload')
    setSelectedFile(null)
    setUpdateState({
      status: UpdateStatus.IDLE,
      progress: 0,
      message: '',
    })
    setRebootCountdown(null)
    onClose()
  }

  // Prevent close during active update or reboot
  const isUpdateInProgress = step === 'install' || rebootCountdown !== null
  const handleBackdropClick = () => {
    if (!isUpdateInProgress) {
      handleCancel()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-sm border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            System Update
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isUpdateInProgress}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'upload' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-150">
              <UploadStep
                onFileSelect={() => fileInputRef.current?.click()}
                fileInputRef={fileInputRef}
                onFileChange={handleFileSelect}
              />
            </div>
          )}

          {step === 'validate' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-150">
              <ValidateStep
                fileName={selectedFile?.name || ''}
                fileSize={selectedFile?.size || 0}
                progress={updateState.progress}
                message={updateState.message}
              />
            </div>
          )}

          {step === 'confirm' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-150">
              <ConfirmStep
                fileName={selectedFile?.name || ''}
                fileSize={selectedFile?.size || 0}
                onConfirm={handleStartUpdate}
                onCancel={handleCancel}
              />
            </div>
          )}

          {step === 'install' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-150">
              <InstallStep
                progress={updateState.progress}
                message={updateState.message}
              />
            </div>
          )}

          {step === 'complete' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-150">
              <CompleteStep
                onReboot={handleReboot}
                onClose={handleCancel}
                rebootCountdown={rebootCountdown}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Step Components

interface UploadStepProps {
  onFileSelect: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

function UploadStep({ onFileSelect, fileInputRef, onFileChange }: UploadStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Upload a system update package to install new software or firmware.
      </p>

      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-slate-300 bg-slate-50 p-12 transition hover:border-slate-400 hover:bg-slate-100 dark:border-white/20 dark:bg-slate-800/50 dark:hover:border-white/30 dark:hover:bg-slate-800"
        onClick={onFileSelect}
      >
        <Upload size={48} className="text-slate-400 dark:text-slate-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Click to upload update file
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            .rpm, .tar.gz, or .zip files
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".rpm,.tar.gz,.zip"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  )
}

interface ValidateStepProps {
  fileName: string
  fileSize: number
  progress: number
  message: string
}

function ValidateStep({ fileName, fileSize, progress, message }: ValidateStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-sm border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/50">
        <Upload size={32} className="text-slate-500" />
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{fileName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {(fileSize / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700 dark:text-slate-300">{message}</span>
          <span className="font-semibold text-slate-900 dark:text-white">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-status-success transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface ConfirmStepProps {
  fileName: string
  fileSize: number
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmStep({ fileName, fileSize, onConfirm, onCancel }: ConfirmStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-sm border border-status-success bg-emerald-50 p-4 dark:border-status-success/30 dark:bg-status-success/20">
        <CheckCircle2 size={24} className="text-status-success dark:text-status-success" />
        <div className="flex-1">
          <p className="text-sm font-medium text-status-success dark:text-status-success">
            Update package validated
          </p>
          <p className="text-xs text-status-success dark:text-status-success">
            Ready to install
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-sm border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/50">
        <InfoRow label="File" value={fileName} />
        <InfoRow label="Size" value={`${(fileSize / 1024 / 1024).toFixed(2)} MB`} />
        <InfoRow label="Version" value="1.2.0" />
      </div>

      <div className="rounded-sm border border-status-warning bg-amber-50 p-3 dark:border-status-warning/30 dark:bg-status-warning/20">
        <div className="flex gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 text-status-warning dark:text-status-warning" />
          <p className="text-xs text-status-warning dark:text-status-warning">
            The system will be unavailable during the update process. Ensure all tasks are stopped.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onCancel} variant="secondary" className="flex-1">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="primary" className="flex-1">
          Install Update
        </Button>
      </div>
    </div>
  )
}

interface InstallStepProps {
  progress: number
  message: string
}

function InstallStep({ progress, message }: InstallStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center py-6">
        <Loader2 size={64} className="animate-spin text-status-success" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700 dark:text-slate-300">{message}</span>
          <span className="font-semibold text-slate-900 dark:text-white">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-status-success transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Do not close this window or power off the device
      </p>
    </div>
  )
}

interface CompleteStepProps {
  onReboot: () => void
  onClose: () => void
  rebootCountdown: number | null
}

function CompleteStep({ onReboot, onClose, rebootCountdown }: CompleteStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 py-6">
        <CheckCircle2 size={64} className="text-status-success" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Update Complete
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            The system update has been installed successfully
          </p>
        </div>
      </div>

      {rebootCountdown !== null ? (
        <div className="space-y-3">
          <div className="rounded-sm border border-status-warning bg-amber-50 p-4 text-center dark:border-status-warning/30 dark:bg-status-warning/20">
            <p className="text-sm font-medium text-status-warning dark:text-status-warning">
              System rebooting in {rebootCountdown} seconds...
            </p>
          </div>
          {/* Progress bar showing countdown */}
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-status-warning transition-all duration-1000 ease-linear dark:bg-status-warning"
                style={{ width: `${(rebootCountdown / 10) * 100}%` }}
              />
            </div>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Rebooting system...
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-sm border border-status-warning bg-amber-50 p-3 dark:border-status-warning/30 dark:bg-status-warning/20">
            <div className="flex gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 text-status-warning dark:text-status-warning" />
              <p className="text-xs text-status-warning dark:text-status-warning">
                A system reboot is required to complete the update.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Reboot Later
            </Button>
            <Button onClick={onReboot} variant="primary" className="flex-1">
              Reboot Now
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
  )
}
