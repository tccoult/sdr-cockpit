import { ChangeEvent, KeyboardEvent, useRef, useState } from 'react'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { CreateRxTaskParams, CreateTxTaskParams } from '../../types/sdr'

type TaskMode = 'select' | 'rx' | 'tx'

interface TaskWizardProps {
  isOpen: boolean
  onClose: () => void
  onCreateRxTask: (params: CreateRxTaskParams) => void
  onCreateTxTask: (params: CreateTxTaskParams) => void
}

const labelClass =
  'mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const selectClass =
  'h-11 w-full rounded-md border border-border/60 bg-card px-3 text-sm text-foreground transition focus:border-cockpit-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/40'
const checkboxClass =
  'h-4 w-4 rounded-sm border border-border/60 bg-card text-cockpit-accent accent-cockpit-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/40'

export function TaskWizard({
  isOpen,
  onClose,
  onCreateRxTask,
  onCreateTxTask,
}: TaskWizardProps) {
  const [mode, setMode] = useState<TaskMode>('select')

  // RX form state
  const [rxName, setRxName] = useState('')
  const [rxFrequency, setRxFrequency] = useState('915.0')
  const [rxFreqUnit, setRxFreqUnit] = useState<'Hz' | 'kHz' | 'MHz' | 'GHz'>(
    'MHz'
  )
  const [rxSampleRate, setRxSampleRate] = useState('2.4')
  const [rxBandwidth, setRxBandwidth] = useState('2.0')
  const [rxFftSize, setRxFftSize] = useState('2048')

  // TX form state
  const [txName, setTxName] = useState('')
  const [txFile, setTxFile] = useState<File | null>(null)
  const [txFrequency, setTxFrequency] = useState('')
  const [txUseOriginalFreq, setTxUseOriginalFreq] = useState(true)
  const [txLoop, setTxLoop] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!isOpen) return null

  const resetState = () => {
    setMode('select')
    setRxName('')
    setRxFrequency('915.0')
    setRxFreqUnit('MHz')
    setRxSampleRate('2.4')
    setRxBandwidth('2.0')
    setRxFftSize('2048')
    setTxName('')
    setTxFile(null)
    setTxFrequency('')
    setTxUseOriginalFreq(true)
    setTxLoop(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleCreateRx = () => {
    const freqMultiplier = {
      Hz: 1,
      kHz: 1e3,
      MHz: 1e6,
      GHz: 1e9,
    }[rxFreqUnit]

    onCreateRxTask({
      name: rxName || 'Untitled RX Task',
      frequency: parseFloat(rxFrequency) * freqMultiplier,
      sampleRate: parseFloat(rxSampleRate) * 1e6, // MSPS
      bandwidth: parseFloat(rxBandwidth) * 1e6, // MHz
      fftSize: parseInt(rxFftSize),
    })
    handleClose()
  }

  const handleCreateTx = () => {
    if (!txFile) return

    onCreateTxTask({
      name: txName || txFile.name,
      file: txFile,
      frequency: txUseOriginalFreq ? undefined : parseFloat(txFrequency) * 1e6,
      loop: txLoop,
    })
    handleClose()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setTxFile(file)
      if (!txName) {
        setTxName(file.name.replace('.sigmf', ''))
      }
    }
  }

  const handleFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleFilePickerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleFilePicker()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-sm border border-border/70 bg-card/95 p-6 text-foreground shadow-2xl shadow-black/40 backdrop-blur supports-[backdrop-filter]:bg-card/80"
        onClick={(event) => event.stopPropagation()}
      >
        {mode === 'select' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">Create New Task</h2>

            <div className="grid gap-4">
              <button
                type="button"
                onClick={() => setMode('rx')}
                className="rounded-sm border border-border/70 bg-muted/50 p-5 text-left transition hover:border-cockpit-accent/40 hover:bg-cockpit-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/40"
              >
                <div className="text-xl font-semibold text-foreground">📡 Receive Signal</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Monitor and analyze RF signals in real time.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('tx')}
                className="rounded-sm border border-border/70 bg-muted/50 p-5 text-left transition hover:border-cockpit-accent/40 hover:bg-cockpit-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/40"
              >
                <div className="text-xl font-semibold text-foreground">📤 Transmit File</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Playback an existing SigMF recording over the air.
                </p>
              </button>
            </div>

            <Button variant="subtle" fullWidth onClick={handleClose}>
              Cancel
            </Button>
          </div>
        )}

        {mode === 'rx' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">Create Receive Task</h2>

            <div className="space-y-5">
              <div>
                <label htmlFor="rx-name" className={labelClass}>
                  Task Name
                </label>
                <Input
                  id="rx-name"
                  type="text"
                  value={rxName}
                  onChange={(event) => setRxName(event.target.value)}
                  placeholder="ISM Band Monitor"
                  fullWidth
                />
              </div>

              <div>
                <label htmlFor="rx-frequency" className={labelClass}>
                  Frequency
                </label>
                <div className="flex gap-3">
                  <Input
                    id="rx-frequency"
                    type="number"
                    value={rxFrequency}
                    onChange={(event) => setRxFrequency(event.target.value)}
                    step="0.001"
                    fullWidth
                  />
                  <select
                    value={rxFreqUnit}
                    onChange={(event) =>
                      setRxFreqUnit(event.target.value as typeof rxFreqUnit)
                    }
                    className={selectClass}
                  >
                    <option value="Hz">Hz</option>
                    <option value="kHz">kHz</option>
                    <option value="MHz">MHz</option>
                    <option value="GHz">GHz</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="rx-sample-rate" className={labelClass}>
                    Sample Rate (MSPS)
                  </label>
                  <Input
                    id="rx-sample-rate"
                    type="number"
                    value={rxSampleRate}
                    onChange={(event) => setRxSampleRate(event.target.value)}
                    step="0.1"
                    fullWidth
                  />
                </div>

                <div>
                  <label htmlFor="rx-bandwidth" className={labelClass}>
                    Bandwidth (MHz)
                  </label>
                  <Input
                    id="rx-bandwidth"
                    type="number"
                    value={rxBandwidth}
                    onChange={(event) => setRxBandwidth(event.target.value)}
                    step="0.1"
                    fullWidth
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rx-fft-size" className={labelClass}>
                  FFT Size
                </label>
                <select
                  id="rx-fft-size"
                  value={rxFftSize}
                  onChange={(event) => setRxFftSize(event.target.value)}
                  className={selectClass}
                >
                  <option value="1024">1024</option>
                  <option value="2048">2048</option>
                  <option value="4096">4096</option>
                  <option value="8192">8192</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="subtle" onClick={() => setMode('select')}>
                  Back
                </Button>
                <Button variant="primary" onClick={handleCreateRx}>
                  Create Task
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === 'tx' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">Transmit SigMF File</h2>

            <div className="space-y-5">
              <div>
                <label htmlFor="tx-name" className={labelClass}>
                  Task Name
                </label>
                <Input
                  id="tx-name"
                  type="text"
                  value={txName}
                  onChange={(event) => setTxName(event.target.value)}
                  placeholder="TX Playback"
                  fullWidth
                />
              </div>

              <div>
                <label className={labelClass}>SigMF File</label>
                <div
                  tabIndex={0}
                  role="button"
                  className="rounded-sm border-2 border-dashed border-border/60 bg-muted/40 p-6 text-center text-muted-foreground transition hover:border-cockpit-accent/50 hover:bg-cockpit-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/40"
                  onClick={handleFilePicker}
                  onKeyDown={handleFilePickerKeyDown}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sigmf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {txFile ? (
                    <div>
                      <p className="text-lg font-semibold text-foreground">✓ {txFile.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(txFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        Drop file or click to browse
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">SigMF files only</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={txUseOriginalFreq}
                    onChange={(event) => setTxUseOriginalFreq(event.target.checked)}
                    className={checkboxClass}
                  />
                  Use original frequency metadata
                </label>

                {!txUseOriginalFreq && (
                  <div>
                    <label htmlFor="tx-frequency" className={labelClass}>
                      Override Frequency (MHz)
                    </label>
                    <Input
                      id="tx-frequency"
                      type="number"
                      value={txFrequency}
                      onChange={(event) => setTxFrequency(event.target.value)}
                      step="0.001"
                      placeholder="433.920"
                      fullWidth
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={txLoop}
                  onChange={(event) => setTxLoop(event.target.checked)}
                  className={checkboxClass}
                />
                Loop playback
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="subtle" onClick={() => setMode('select')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateTx}
                  disabled={!txFile}
                >
                  Start TX
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
