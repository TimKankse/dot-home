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
- Jellyfin live sessions use a server-side WebSocket with HTTP fallback. The browser receives a same-origin event stream; API keys never enter browser WebSockets or image URLs.
- Remove the endpoint that returns environment-level Jellyfin credentials.
- Inline Jellyfin credentials are no longer accepted by server routes.

### Phase 2: migrate typed integration routes (implemented for dashboard widgets)

The same resolver is now used by Jellyseerr, SABnzbd, qBittorrent,
Portainer, Twitch, Netdata, and the Radarr/Sonarr calendar sources.
Private or authenticated RSS feeds use the same stored-integration path.

- Read operations require `view` permission.
- Container, queue, and request-management operations require `edit` permission.
- Verify the integration type before decrypting its configuration.
- Replace Jellyseerr's arbitrary `path` proxy with explicit handlers for each supported operation.
- Replace Portainer's arbitrary `action` with a server-side allowlist.
- Key qBittorrent session caching by integration ID and complete configuration, and keep the cache bounded.
- Remove all raw credential headers and request bodies after legacy configs are migrated.

### Phase 3: migrate and redact configuration (implemented)

The idempotent migration:

1. Backs up the database.
2. Scans dashboard layouts and personal widget configurations for known inline credentials.
3. Creates owner-scoped Integration records and replaces credentials with an
   `integrationId` (or typed Radarr/Sonarr IDs for a composite calendar).
4. Removes sensitive fields from widget JSON while preserving presentation settings.
   Private or credential-bearing RSS URLs are promoted to encrypted RSS
   integrations while ordinary public feed URLs remain inline.
5. Encrypts any sensitive personal configuration that cannot yet be normalized.
6. Reports every migrated and skipped widget and can be safely rerun.

It runs automatically during server startup. Saves with legacy connection settings
run migration only for the saved dashboard and its owner's integrations; ordinary
layout saves skip the scan. It only creates a backup when changes are needed. Use
`npm run security:migrate-integrations` for a manual report-only run.
After reviewing its output, use
`npm run security:migrate-integrations -- --apply`. Apply mode creates a
consistent timestamped SQLite backup before opening the migration transaction.

After migration:

- `/api/config` returns only redacted widget data and integration metadata.
- Integration create/update responses use the same redacted serializer as integration GET.
- The editor no longer copies integration configuration into widget configuration.
- Inline-credential bridges and manual widget connection fields are removed.

### Phase 4: dedicated URL endpoints (partially implemented)

- Public RSS and iCal URLs use the DNS-pinned `public-internet` outbound policy,
  ten-URL request limits, timeouts, 64 KiB request-body limits, and 2 MiB
  decoded response limits. Feed requests are limited to 30 per user per minute,
  two concurrent requests per user, and 16 concurrent requests per process.
  Content-type validation remains a possible additional restriction.
- Private or authenticated RSS feeds must be stored as RSS integrations. Their
  encrypted URLs remain server-side and use the `trusted-integration` policy
  with cross-origin redirects disabled.
- The arbitrary shortcut health-check endpoint and its private-URL polling UI
  have been removed.
- Netdata accepts only an authorized Integration ID and enforces minimum/maximum polling intervals, stream lifetimes, and connection limits. (implemented)
- Image proxying accepts only an authorized integration and constrained resource identifiers.

Every outbound request and redirect resolves once, validates the complete
address set, and connects only to that vetted set while preserving the original
HTTP Host and TLS server name.

### Phase 5: authorization and operational controls

- Enforce stored widget-role policies (or centralized defaults) on integration creation and every integration resolver, in addition to object permissions; ownership does not bypass role restrictions. Client-side visibility is not an authorization boundary. (implemented)
- Ownership always outranks permission overrides so an owner cannot be blocked from their own object. (implemented)
- Permission reads and changes require object ownership or administrator authority. Shared editors cannot administer access. (implemented)
- Feed and live-stream routes enforce rate/concurrency or connection limits. Login attempts are limited per normalized account (10 per 15 minutes), globally (100 per minute), and to four concurrent password checks. Limits are process-local. (implemented)
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
5. Add response-size and concurrency limits to retained outbound routes.

## Definition of done

- Browser network traces and `/api/config` contain no reusable service credentials.
- A viewer cannot use or enumerate a private integration belonging to another user.
- State-changing routes reject view-only users and unknown actions.
- Generic fetch endpoints cannot reach loopback, link-local, private, or metadata addresses.
- No mixed-content WebSocket is opened by the application.
- Security tests cover ownership, sharing, type confusion, redirects, private IPs, and legacy migration.

## Runtime files and authentication secret rotation

Runtime secrets, SQLite databases (including journals and backups), and `config/`
are excluded from Docker build contexts. The runtime image copies only the Prisma
schema, never the entire local `prisma/` directory. Do not publish images built
with an earlier Dockerfile from a checkout containing runtime data; rebuild them
with these exclusions.

The Docker entrypoint respects an explicit `NEXTAUTH_SECRET`. Otherwise it creates
and reuses `config/.nextauth_secret`. It sets a `077` umask, restricts `config/` to
`0700`, and repairs existing secret/database/backup permissions to `0600`.
On Linux, provision a bind-mounted directory for the container's UID/GID
`1001:1001` before starting it; avoid world-writable directories.

Earlier revisions committed `config/.nextauth_secret`. Removing the file from
tracking does not remove it from Git history or rotate secrets on other hosts.
Any installation using that value must rotate it; treat that value as compromised.
For a deployment using the persisted file, run on the Docker host:

```sh
docker compose stop
sudo chmod 700 config
sudo sh -c 'umask 077; openssl rand -base64 32 > config/.nextauth_secret'
sudo chown 1001:1001 config/.nextauth_secret
sudo chmod 600 config/.nextauth_secret
docker compose up -d --build
```

If you supply `NEXTAUTH_SECRET` through the deployment environment or a secret
manager, replace that value instead, then recreate/restart the application. Do not
print the replacement secret into logs or commit it. Rotation invalidates existing
sessions after restart. Keep `CONFIG_ENCRYPTION_SECRET` unchanged so stored
integration credentials remain decryptable.


## Live updates and patched runtime (September 2026)

Downloads and Jellyfin use one combined SSE connection per browser tab. A shared
worker is keyed by integration ID, channel, and a digest of the full stored
configuration. Each subscriber must independently pass session, widget-role, and
object-permission checks before it can receive even a cached snapshot. Open
streams recheck access every 15 seconds, stop delivering if revalidation stalls
for 20 seconds, and reconnect after at most five minutes. Configuration changes
reset the stream so old credentials and snapshots are not reused.

The server permits eight live connections per user, 64 total live connections,
and 128 active workers per process. Queues are bounded for slow readers; upstream
WebSocket messages and outgoing snapshots are limited to 2 MiB. Workers cancel
when the last subscriber leaves. Hidden browser tabs close their live connection.
Netdata uses a separate SSE connection per integration, with matching views sharing
one server worker. Its streams use the same session/access revalidation and global
connection bounds. Netdata caches coalesce concurrent requests, expire entries,
and limit cached JSON to 128 entries / 32 MiB with 2 MiB per upstream response.

Jellyfin WebSockets use the vetted DNS addresses, preserve the original hostname
for TLS, disable redirects, and send credentials in a header. HTTP fallback keeps
sessions working when the upstream WebSocket is unavailable. Next's generic remote
image optimizer allowlist has been removed; the application only uses next/image
for its local logo. Dedicated authorized image routes remain available.

Use Node 24 (`.nvmrc`, CI, and both Docker stages). React remains on patched 19.2;
Next and NextAuth are updated. Prisma's CLI is a production dependency because the
container uses it at startup, and is installed from the same audited lockfile as
the application. Fresh SQLite files are created exclusively with private permissions
before schema synchronization, without truncating existing data. Both Alpine
stages install OpenSSL for Prisma's native engine. The scoped `@prisma/config` override selects deepmerge-ts 8.0.0
for its recursion fix; remove it once Prisma ships that dependency itself. This
avoids an unrelated Prisma major-version and database-adapter migration.

These are process-local controls for the single-process container. Multiple
application replicas need a shared broker/limiter for equivalent global bounds.
Serve SSE through an HTTP/2-capable reverse proxy with buffering disabled when
using many browser tabs; direct HTTP/1.1 browser connections have a low per-origin
connection limit. Reverse-proxy idle timeouts should exceed the 15-second heartbeat.

## Performance behavior

- Dashboard pages outside the configured page buffer and hidden browser tabs
  suspend widget effects while preserving widget state and grid geometry. In
  Settings → General → Behavior, Page Buffer defaults to enabled with one page
  on each side of the current page. A size of zero activates only the current
  page; disabling the buffer keeps all pages active. The range follows rendered
  pages, including mobile/tablet splits, and stops at the first and last page.
  Timers and subscriptions resume when a page enters the buffer. Hidden browser
  tabs pause regardless of buffer settings. This uses React's Activity boundary.
- Netdata batches widget subscriptions, requests only active scopes, and reduces
  the refresh rate when the fastest widget leaves. Matching integration/config,
  scope, process-limit and interval combinations share polling and processing.
  Different combinations still share cached upstream JSON where applicable.
- Netdata metrics/process/mount data have a 1.5-second cache lifetime, system info
  one minute, and function discovery five minutes. Lifetimes start after a request
  completes. Independent upstream endpoints load concurrently. Polling backs off
  on failures and never overlaps within a worker.
- Leaving the last subscriber cancels pending upstream requests. A subscriber
  leaving a shared request does not cancel other readers' work.
- Startup still performs the full legacy migration. Ordinary saves do no migration
  queries, and legacy saves avoid other dashboards and personal configurations.
  Migration uses a conditional update to avoid overwriting a concurrent save.
- API authorization reuses the database validation performed by NextAuth for that
  exact session object, removing one duplicate lookup. This is consumed once and
  never caches authentication or revocation decisions across requests. Proxy and
  stream revalidation remain in place.

Sharing and caches are per Node process. Actual CPU and memory use depend on the
number of distinct active integrations, response sizes, and upstream latency; the
request-sharing tests do not establish a production user-capacity limit.
