import { useCallback, useContext } from 'react'
import { ThemeContext } from './theme-context'

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  const { theme, setTheme } = context

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [setTheme])

  return { theme, setTheme, toggleTheme }
}
