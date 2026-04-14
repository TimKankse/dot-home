import { describe, expect, it } from 'vitest';

import type { JellyfinSession } from './types';
import { formatEpisodeTitle, mergeSessionsPreservingOrder } from './utils';

const createSession = (id: string, positionTicks = 0): JellyfinSession => ({
  Id: id,
  UserName: `user-${id}`,
  DeviceName: `device-${id}`,
  Client: 'Web',
  NowPlayingItem: {
    Id: `item-${id}`,
    Name: `Item ${id}`,
    Type: 'Movie',
  },
  PlayState: {
    PositionTicks: positionTicks,
  },
});

describe('mergeSessionsPreservingOrder', () => {
  it('keeps the existing order when refresh payloads arrive in a different order', () => {
    const previousSessions = [createSession('a', 10), createSession('b', 20)];
    const incomingSessions = [createSession('b', 200), createSession('a', 100)];

    const mergedSessions = mergeSessionsPreservingOrder(previousSessions, incomingSessions);

    expect(mergedSessions.map((session) => session.Id)).toEqual(['a', 'b']);
    expect(mergedSessions.map((session) => session.PlayState?.PositionTicks)).toEqual([100, 200]);
  });

  it('moves later sessions up only after an earlier session disappears', () => {
    const previousSessions = [createSession('a', 10), createSession('b', 20)];
    const incomingSessions = [createSession('b', 200)];

    const mergedSessions = mergeSessionsPreservingOrder(previousSessions, incomingSessions);

    expect(mergedSessions.map((session) => session.Id)).toEqual(['b']);
  });

  it('appends brand new sessions to the end of the existing order', () => {
    const previousSessions = [createSession('a', 10)];
    const incomingSessions = [createSession('b', 200), createSession('a', 100)];

    const mergedSessions = mergeSessionsPreservingOrder(previousSessions, incomingSessions);

    expect(mergedSessions.map((session) => session.Id)).toEqual(['a', 'b']);
  });
});

describe('formatEpisodeTitle', () => {
  it('formats episode titles with season and episode numbers', () => {
    expect(
      formatEpisodeTitle({
        Id: 'episode-1',
        Name: 'Pilot',
        Type: 'Episode',
        ParentIndexNumber: 1,
        IndexNumber: 5,
      }),
    ).toBe('S01:E05 | Pilot');
  });

  it('falls back to the title when numbering is unavailable', () => {
    expect(
      formatEpisodeTitle({
        Id: 'episode-2',
        Name: 'Pilot',
        Type: 'Episode',
      }),
    ).toBe('Pilot');
  });

  it('does not prepend numbering for non-episode items', () => {
    expect(
      formatEpisodeTitle({
        Id: 'movie-1',
        Name: 'Arrival',
        Type: 'Movie',
        ParentIndexNumber: 1,
        IndexNumber: 1,
      }),
    ).toBe('Arrival');
  });
});
