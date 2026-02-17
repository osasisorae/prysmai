# Contributing to Prysm AI

Thank you for your interest in contributing to Prysm AI. This document outlines the development workflow and conventions.

---

## Development Setup

1. Clone the repository and install dependencies:

```bash
git clone git@github.com:osasisorae/prysmai.git
cd prysmai
pnpm install
```

2. Set up your database and environment variables (see README.md).

3. Push the schema to your database:

```bash
pnpm db:push
```

4. Start the development server:

```bash
pnpm dev
```

---

## Development Workflow

### Database Changes

1. Edit the schema in `drizzle/schema.ts`
2. Run `pnpm db:push` to generate and apply migrations
3. Add or update helper functions in `server/db.ts`
4. Export new types from the schema file

### Backend Changes

1. Add database helpers in `server/db.ts` (return raw Drizzle rows)
2. Add or extend tRPC procedures in `server/routers.ts`
3. For new Express routes (like the proxy), create a new file in `server/` and register it in `server/_core/index.ts`
4. Write tests in `server/*.test.ts`

### Frontend Changes

1. Create page components in `client/src/pages/`
2. Use shadcn/ui components from `client/src/components/ui/`
3. Register routes in `client/src/App.tsx`
4. Use `trpc.*.useQuery/useMutation` for all data fetching

### Testing

Run the full test suite before submitting changes:

```bash
pnpm test
```

All new features should include corresponding test coverage.

---

## Code Conventions

- **TypeScript** — All code is TypeScript. Use strict types; avoid `any` where possible.
- **Database** — All queries go through `server/db.ts` helper functions. Never query the database directly from routers.
- **API** — Use tRPC procedures for dashboard operations. Use Express routes only for non-tRPC endpoints (proxy, webhooks).
- **Frontend** — Use Tailwind CSS utilities. Prefer shadcn/ui components over custom implementations.
- **Testing** — Use Vitest. Test files live alongside the code they test in `server/*.test.ts`.

---

## File Ownership

| Directory | Owner | Notes |
|-----------|-------|-------|
| `server/_core/` | Framework | Do not edit unless extending infrastructure |
| `drizzle/schema.ts` | Schema | Single source of truth for database types |
| `server/db.ts` | Data layer | All database queries live here |
| `server/routers.ts` | API layer | tRPC procedure definitions |
| `server/proxy.ts` | Proxy | The core proxy gateway |
| `client/src/pages/` | UI | Page-level components |
| `client/src/components/` | UI | Reusable components |
