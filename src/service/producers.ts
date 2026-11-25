import type { WinsRepository } from '../db/repository';

export interface ProducerSummary {
  producer: string;
  wins: number;
  years: number[];
}

export interface ProducerFilters {
  name?: string;
  year?: number;
  wins?: number;
  onlyWinners?: boolean;
  sort?: 'wins_desc';
}

export function listProducers(repository: WinsRepository, filters: ProducerFilters): ProducerSummary[] {
  const yearsByProducer = new Map<string, Set<number>>();
  for (const { producer, year } of repository.allWins()) {
    const years = yearsByProducer.get(producer) ?? new Set<number>();
    years.add(year);
    yearsByProducer.set(producer, years);
  }

  const summaries: ProducerSummary[] = repository.allProducers().map((producer) => {
    const years = [...(yearsByProducer.get(producer) ?? [])].sort((a, b) => a - b);
    return { producer, wins: years.length, years };
  });

  const filtered = summaries.filter(
    ({ producer, wins, years }) =>
      (filters.name === undefined || producer.toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.year === undefined || years.includes(filters.year)) &&
      (filters.wins === undefined || wins === filters.wins) &&
      (!filters.onlyWinners || wins > 0),
  );

  return filtered.sort((a, b) =>
    filters.sort === 'wins_desc'
      ? b.wins - a.wins || a.producer.localeCompare(b.producer)
      : a.producer.localeCompare(b.producer),
  );
}
