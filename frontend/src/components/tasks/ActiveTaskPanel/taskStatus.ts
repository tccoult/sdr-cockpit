import { Task } from '../../../types/sdr'

export function getTaskStatusLabel(task?: Task | null): string {
  if (!task) {
    return 'No Task Selected'
  }

  switch (task.status) {
    case 'live':
      return 'Live'
    case 'transmitting':
      return 'Transmitting'
    case 'paused':
      return 'Paused'
    case 'stopped':
      return 'Stopped'
    default:
      return 'Unknown'
  }
}
