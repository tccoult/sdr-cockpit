import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders SDR Cockpit heading', () => {
    render(<App />)
    const heading = screen.getByText(/SDR Cockpit/i)
    expect(heading).toBeInTheDocument()
  })

  it('renders Spectrum Analyzer subheading', () => {
    render(<App />)
    const subheading = screen.getByText(/Software Defined Radio Spectrum Analyzer/i)
    expect(subheading).toBeInTheDocument()
  })

  it('renders FPS counter', () => {
    render(<App />)
    const fpsCounter = screen.getByText(/FPS/i)
    expect(fpsCounter).toBeInTheDocument()
  })

  it('renders Pause button initially', () => {
    render(<App />)
    const pauseButton = screen.getByRole('button', { name: /Pause/i })
    expect(pauseButton).toBeInTheDocument()
  })

  it('toggles between Pause and Resume when button is clicked', () => {
    render(<App />)

    // Initially shows Pause
    const pauseButton = screen.getByRole('button', { name: /Pause/i })
    expect(pauseButton).toBeInTheDocument()

    // Click to pause
    fireEvent.click(pauseButton)

    // Now shows Resume
    const resumeButton = screen.getByRole('button', { name: /Resume/i })
    expect(resumeButton).toBeInTheDocument()

    // Click to resume
    fireEvent.click(resumeButton)

    // Back to Pause
    const pauseButtonAgain = screen.getByRole('button', { name: /Pause/i })
    expect(pauseButtonAgain).toBeInTheDocument()
  })

  it('renders Spectrum Analyzer display header', () => {
    render(<App />)
    const spectrumAnalyzerHeader = screen.getByRole('heading', { name: /Spectrum Analyzer/i })
    expect(spectrumAnalyzerHeader).toBeInTheDocument()
  })

  it('renders controls instructions', () => {
    render(<App />)
    const instructions = screen.getByText(/Mouse wheel to zoom/i)
    expect(instructions).toBeInTheDocument()
  })
})
