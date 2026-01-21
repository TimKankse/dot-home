# Authentication System

The application uses session-based authentication with middleware protection.

## Overview

```mermaid
flowchart TD
    REQ[Request] --> MW[Middleware]
    MW --> |has session| ROUTE[Route Handler]
    MW --> |no session| LOGIN[/login]
    ROUTE --> |check perms| AUTH[Auth Check]
    AUTH --> PAGE[Page/API]
```

---

## Session Management

Sessions are stored server-side with JWT tokens for validation.

### Protected Routes
The middleware (`src/middleware.ts`) protects:
- All routes except `/login`, `/register`, `/api/auth/*`
- Static assets are excluded

### Public Routes
- `/login` - User login
- `/register` - User registration  
- `/api/auth/*` - Auth API endpoints

---

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access, manage users and settings |
| `member` | Create/edit own dashboards |
| `viewer` | View shared dashboards only |

---

## Access Control

### Dashboard Access
Each dashboard has an `accessLevel`:

| Level | View | Edit |
|-------|------|------|
| `PUBLIC` | Everyone | Everyone |
| `VIEWABLE` | Everyone | Owner only |
| `PRIVATE` | Owner only | Owner only |

### Object Permissions
Override base access per-user via `ObjectPermission`:

| Permission | Effect |
|------------|--------|
| `BLOCKED` | Deny all access |
| `VIEW` | Allow viewing |
| `EDIT` | Allow full access |

---

## API Authentication

API routes check authentication via:

```typescript
// In API route
const session = await getServerSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## Middleware Flow

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  
  if (!session && !isPublicRoute(request.pathname)) {
    return NextResponse.redirect('/login');
  }
  
  return NextResponse.next();
}
```

---

## Security Features

- Password hashing with bcrypt
- HTTP-only session cookies
- CSRF protection on forms
- API keys encrypted in database
- Integration credentials never exposed to client
