import { addMinutes } from 'date-fns';

export function computeCutoff(startsAt: Date): Date {
  return addMinutes(startsAt, -15);
}
