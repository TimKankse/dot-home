import type { ApiUser } from './api-security';

// NextAuth creates a fresh session object for each getServerSession call. Pass
// its completed database validation to the route without persisting identity
// across requests, exposing a trusted header, or caching revocation decisions.
const validated = new WeakMap<object, ApiUser>();

export function recordValidatedSession(session: object, user: ApiUser) {
  validated.set(session, user);
}

export function takeValidatedSessionUser(session: object): ApiUser | undefined {
  const user = validated.get(session);
  validated.delete(session);
  return user;
}
