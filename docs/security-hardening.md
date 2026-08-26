# Integration and outbound-request security plan

## Security boundaries

The integration layer should enforce these invariants:

1. Browser code receives integration identifiers and non-sensitive display configuration, never reusable credentials.
2. Every integration lookup is bound to the authenticated user, the integration's access policy, the expected integration type, and the operation (`view` or `edit`).
3. Only URLs loaded from authorized Integration records are trusted to reach private networks. User-supplied URLs use the public-internet policy or an explicit admin-managed allowlist.
4. State-changing upstream calls require edit permission and an allowlisted action. Read routes never accept arbitrary upstream paths.
5. Redirects are validated and credentials are not forwarded across origins.

The intended request flow is:

`browser -> same-origin typed route -> authenticated integration resolver -> outbound policy -> upstream service`

## Phased migration

### Phase 1: shared foundation and Jellyfin (implemented)

- Use `requireApiUser` for route-level authentication instead of relying only on the global proxy.
- Use `resolveAuthorizedIntegration` for ownership, sharing, type, and operation checks.
- Use `fetchOutbound` for protocol, timeout, redirect, and network-policy enforcement.
- Poll Jellyfin through the same-origin sessions route. Do not establish a browser WebSocket or put an API key in an image URL.
- Remove the endpoint that returns environment-level Jellyfin credentials.
- Inline Jellyfin credentials are no longer accepted by server routes.

### Phase 2: migrate typed integration routes (implemented for dashboard widgets)

The same resolver is now used by Jellyseerr, SABnzbd, qBittorrent,
Portainer, Twitch, and Netdata. Radarr and Sonarr remain part of the calendar
hardening phase.

- Read operations require `view` permission.
- Container, queue, and request-management operations require `edit` permission.
- Verify the integration type before decrypting its configuration.
- Replace Jellyseerr's arbitrary `path` proxy with explicit handlers for each supported operation.
- Replace Portainer's arbitrary `action` with a server-side allowlist.
- Key qBittorrent session caching by integration ID and user, not URL.
- Remove all raw credential headers and request bodies after legacy configs are migrated.

### Phase 3: migrate and redact configuration (implemented)

The idempotent migration:

1. Backs up the database.
2. Scans dashboard layouts and personal widget configurations for known inline credentials.
3. Creates owner-scoped Integration records and replaces credentials with an `integrationId`.
4. Removes sensitive fields from widget JSON while preserving presentation settings.
5. Encrypts any sensitive personal configuration that cannot yet be normalized.
6. Reports every migrated and skipped widget and can be safely rerun.

It runs automatically during server startup and after a legacy dashboard is
saved. It only creates a backup when changes are needed. Use
`npm run security:migrate-integrations` for a manual report-only run.
After reviewing its output, use
`npm run security:migrate-integrations -- --apply`. Apply mode creates a
consistent timestamped SQLite backup before opening the migration transaction.

After migration:

- `/api/config` returns only redacted widget data and integration metadata.
- Integration create/update responses use the same redacted serializer as integration GET.
- The editor no longer copies integration configuration into widget configuration.
- Inline-credential bridges and manual widget connection fields are removed.

### Phase 4: generic URL endpoints

- RSS and public iCal URLs use the `public-internet` outbound policy, response-size limits, content-type validation, and bounded parsing.
- Private shortcut health checks are represented by owner-scoped server records or an admin-managed allowlist instead of arbitrary query parameters.
- Netdata accepts only an authorized Integration ID and enforces minimum/maximum polling intervals, stream lifetimes, and connection limits. (implemented)
- Image proxying accepts only an authorized integration and constrained resource identifiers.

DNS checks must be repeated after every redirect. Where stronger DNS-rebinding protection is required, connect to the validated address while preserving the original HTTP Host and TLS server name.

### Phase 5: authorization and operational controls

- Enforce widget roles on API routes; client-side visibility is not an authorization boundary.
- Ensure ownership always outranks permission overrides so an owner cannot be blocked from their own object.
- Restrict permission management to owners or administrators unless collaborative permission administration is explicitly intended.
- Add rate limits and concurrency limits to expensive proxy and streaming routes.
- Record structured security events without URLs containing credentials.
- Require a stable `CONFIG_ENCRYPTION_SECRET` in production instead of generating one at runtime.

## Deployment sequence

1. Deploy the integration route changes. Startup creates a consistent database
   snapshot and migrates compatible legacy widget configurations before serving
   dashboard data.
2. Review the startup report or run the manual report command. Re-enter any
   credential that cannot be decrypted with the configured encryption key.
3. Rotate credentials that may have appeared in browser state, URLs, shared layouts, or logs.
4. Deploy the redacted client configuration and remove legacy credential support.
5. Migrate the remaining routes one service at a time with route-level tests.

## Definition of done

- Browser network traces and `/api/config` contain no reusable service credentials.
- A viewer cannot use or enumerate a private integration belonging to another user.
- State-changing routes reject view-only users and unknown actions.
- Generic fetch endpoints cannot reach loopback, link-local, private, or metadata addresses.
- No mixed-content WebSocket is opened by the application.
- Security tests cover ownership, sharing, type confusion, redirects, private IPs, and legacy migration.
