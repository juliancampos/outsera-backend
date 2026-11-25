import type { Win } from './db';

export interface ProducerInterval {
  producer: string;
  interval: number;
  previousWin: number;
  followingWin: number;
}

export interface Intervals {
  min: ProducerInterval[];
  max: ProducerInterval[];
}

export function getProducerIntervals(wins: Win[]): Intervals {
  const yearsByProducer = new Map<string, Set<number>>();

  for (const { producer, year } of wins) {
    const years = yearsByProducer.get(producer) ?? new Set<number>();
    years.add(year);
    yearsByProducer.set(producer, years);
  }

  const intervals: ProducerInterval[] = [];
  for (const [producer, years] of yearsByProducer) {
    if (years.size < 2) continue;

    const sorted = [...years].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      const previousWin = sorted[i - 1];
      const followingWin = sorted[i];
      intervals.push({ producer, interval: followingWin - previousWin, previousWin, followingWin });
    }
  }

  if (intervals.length === 0) {
    return { min: [], max: [] };
  }

  const values = intervals.map((item) => item.interval);
  const shortest = Math.min(...values);
  const longest = Math.max(...values);
  return {
    min: intervals.filter((item) => item.interval === shortest),
    max: intervals.filter((item) => item.interval === longest),
  };
}
