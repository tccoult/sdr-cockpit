import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { ThemeProvider } from './components/app/ThemeProvider'
import { QueryProvider } from './providers/QueryProvider'

const renderApp = () =>
  render(
    <QueryProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryProvider>
  )

describe('App', () => {
  it('renders SDR Cockpit heading', async () => {
    renderApp()
    await waitFor(() => {
      const heading = screen.getByText(/SDR Cockpit/i)
      expect(heading).toBeInTheDocument()
    })
  })

  it('renders FPS counter', async () => {
    renderApp()
    await waitFor(() => {
      const fpsCounters = screen.getAllByText(/FPS/i)
      expect(fpsCounters.length).toBeGreaterThan(0)
    })
  })

  it('shows task discovery state initially', async () => {
    renderApp()
    await waitFor(() => {
      const discoveringText = screen.getByText(/Discovering tasks/i)
      expect(discoveringText).toBeInTheDocument()
    })
  })

  it('shows task sidebar', async () => {
    renderApp()
    await waitFor(() => {
      // Look for Tasks text anywhere (drawer title or panel heading)
      const tasksText = screen.getAllByText(/Tasks/i)
      expect(tasksText.length).toBeGreaterThan(0)
    })
  })

  it('shows create task button in sidebar', async () => {
    renderApp()
    await waitFor(() => {
      const createButton = screen.getByTitle(/Create new task/i)
      expect(createButton).toBeInTheDocument()
    })
  })

  it('shows filter tabs (All, RX, TX)', async () => {
    renderApp()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^rx$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^tx$/i })).toBeInTheDocument()
    })
  })

  it('loads demo tasks after discovery', async () => {
    renderApp()

    // Wait for tasks to load
    await waitFor(
      () => {
        // Look for the task count button which shows number of tasks
        const tasksButton = screen.getByTitle(/View tasks/i)
        expect(tasksButton).toBeInTheDocument()
        // Should show at least one task
        expect(tasksButton.textContent).toMatch(/\d+/)
      },
      { timeout: 3000 }
    )
  })
})
