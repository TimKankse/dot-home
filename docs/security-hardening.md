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
Portainer, Twitch, Netdata, and the Radarr/Sonarr calendar sources.
Private or authenticated RSS feeds use the same stored-integration path.

- Read operations require `view` permission.
- Container, queue, and request-management operations require `edit` permission.
- Verify the integration type before decrypting its configuration.
- Replace Jellyseerr's arbitrary `path` proxy with explicit handlers for each supported operation.
- Replace Portainer's arbitrary `action` with a server-side allowlist.
- Key qBittorrent session caching by integration ID, invalidate it when the
  configured origin changes, and keep the cache bounded.
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

### Phase 4: dedicated URL endpoints (partially implemented)

- Public RSS and iCal URLs use the DNS-pinned `public-internet` outbound policy,
  ten-URL request limits, and request timeouts. Response-size limits and
  content-type validation remain to be added.
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

- Enforce widget roles on API routes; client-side visibility is not an authorization boundary.
- Ownership always outranks permission overrides so an owner cannot be blocked from their own object. (implemented)
- Permission reads and changes require object ownership or administrator authority. Shared editors cannot administer access. (implemented)
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
