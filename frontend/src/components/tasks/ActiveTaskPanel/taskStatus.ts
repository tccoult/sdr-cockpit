import { Task } from "../../../types/sdr";

export function getTaskStatusLabel(task?: Task | null): string {
  if (!task) {
    return "N/A";
  }

  switch (task.status) {
    case "live":
      return "Live";
    case "transmitting":
      return "Transmitting";
    case "paused":
      return "Paused";
    case "stopped":
      return "Stopped";
    default:
      return "Unknown";
  }
}
