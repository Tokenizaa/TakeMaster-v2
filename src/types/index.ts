export * from '../domain/contracts';

export interface DatabaseState {
  shows: import('../domain/contracts').Show[];
  episodes: import('../domain/contracts').Episode[];
  guests: import('../domain/contracts').Guest[];
}
