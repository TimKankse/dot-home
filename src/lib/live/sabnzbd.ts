import type { QueueData } from '@/services/sabnzbd';

export function sanitizeSabnzbdQueue(queue: QueueData): QueueData {
  if (!queue || !Array.isArray(queue.slots)) throw new Error('Invalid queue response');
  // Raw SAB queue rows can include archive passwords and other unused fields.
  return {
    status: queue.status, speed: queue.speed, timeleft: queue.timeleft, paused: queue.paused,
    slots: queue.slots.map(({ filename, percentage, mbleft, mb, status, timeleft, index }) => ({
      filename, percentage, mbleft, mb, status, timeleft, index,
    })),
  };
}
