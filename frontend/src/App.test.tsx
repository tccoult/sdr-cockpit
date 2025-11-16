import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './components/app/ThemeProvider'
import { QueryProvider } from './providers/QueryProvider'

const renderApp = () =>
  render(
    <BrowserRouter>
      <QueryProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  )

describe('App', () => {
  it('renders without crashing', () => {
    expect(() => renderApp()).not.toThrow()
  })
})
