import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { ThemeProvider } from './components/app/ThemeProvider'

const renderApp = () =>
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )

describe('App', () => {
  it('renders SDR Cockpit heading', () => {
    renderApp()
    const heading = screen.getByText(/SDR Cockpit/i)
    expect(heading).toBeInTheDocument()
  })

  it('renders FPS counter', () => {
    renderApp()
    const fpsCounter = screen.getByText(/FPS/i)
    expect(fpsCounter).toBeInTheDocument()
  })

  it('shows task discovery state initially', () => {
    renderApp()
    const discoveringText = screen.getByText(/Discovering tasks/i)
    expect(discoveringText).toBeInTheDocument()
  })

  it('shows task sidebar', () => {
    renderApp()
    const tasksHeading = screen.getByRole('heading', { name: /Tasks/i })
    expect(tasksHeading).toBeInTheDocument()
  })

  it('shows create task button in sidebar', () => {
    renderApp()
    const createButton = screen.getByTitle(/Create new task/i)
    expect(createButton).toBeInTheDocument()
  })

  it('shows filter tabs (All, RX, TX)', () => {
    renderApp()
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^rx$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^tx$/i })).toBeInTheDocument()
  })

  it('loads demo tasks after discovery', async () => {
    renderApp()

    // Wait for tasks to load (demo tasks appear after 1.5s)
    const taskCards = await screen.findAllByText(/ISM Band Monitor/i, {}, { timeout: 2000 })
    expect(taskCards.length).toBeGreaterThan(0)
  })
})
