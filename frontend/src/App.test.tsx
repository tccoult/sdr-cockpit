import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders SDR Cockpit heading', () => {
    render(<App />)
    const heading = screen.getByText(/SDR Cockpit/i)
    expect(heading).toBeInTheDocument()
  })

  it('renders the counter button with initial count', () => {
    render(<App />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('count is 0')
  })

  it('increments counter when button is clicked', () => {
    render(<App />)
    const button = screen.getByRole('button')

    fireEvent.click(button)
    expect(button).toHaveTextContent('count is 1')

    fireEvent.click(button)
    expect(button).toHaveTextContent('count is 2')
  })

  it('displays success message', () => {
    render(<App />)
    const message = screen.getByText(/Frontend is running successfully!/i)
    expect(message).toBeInTheDocument()
  })
})
