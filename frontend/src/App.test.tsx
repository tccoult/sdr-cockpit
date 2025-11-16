import { render } from '@testing-library/react'
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
  it('renders without crashing', () => {
    expect(() => renderApp()).not.toThrow()
  })
})
