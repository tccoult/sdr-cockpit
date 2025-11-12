import { Moon, Sun } from 'lucide-react'
import { Button } from '../common/Button'
import { useTheme } from './useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      variant="icon"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'day' : 'night'} mode`}
      title={isDark ? 'Switch to day mode' : 'Switch to night mode'}
    >
      {isDark ? (
        <Sun aria-hidden className="h-4 w-4 text-status-warning" />
      ) : (
        <Moon aria-hidden className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  )
}
