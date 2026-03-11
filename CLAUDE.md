# HomeManager — Project Context Document

> This document is the single source of truth for AI assistants and new developers onboarding to HomeManager. It covers architecture, data model, all endpoints, frontend components, design system, and development workflow.

---

## 1. Project Overview

HomeManager is a Portuguese-language household management web app. It lets members of a shared household track their physical inventory ("Pertences" — durable goods like furniture and electronics) and pantry consumables ("Despensa" — food and supplies), with dashboard summaries and future modules for tasks and budget.

**Target audience**: Households of 1–N people sharing a living space.

**Current state** (March 2026):
- Auth (Supabase), household creation/joining, and the Pertences inventory are fully functional end-to-end.
- Location and Category CRUD endpoints are implemented on the backend and wired to the frontend.
- The Despensa tab has a working backend (PantryController) but the frontend still renders mock data.
- Dashboard distingue `householdsLoading` (skeleton inicial até saber se tem household) de `dataLoading` (skeleton dos widgets enquanto carrega valores). Elimina o flash do HouseholdSetupComponent durante o carregamento inicial. Summary widget usa dados reais parciais (valor total do inventário); Timeline widget é 100% mock.
- Tasks and Budget pages are placeholder stubs (routes exist, no real UI).

---

## 2. Tech Stack

### Backend

| Layer | Choice |
|-------|--------|
| Runtime | .NET 10 / ASP.NET Core Web API |
| ORM | Entity Framework Core 9 (via Npgsql **9.0.4** — see §4) |
| Database | PostgreSQL via Supabase (2 schemas: `shared`, `inventory`) |
| Auth | Supabase JWT validated by .NET via OpenID Connect JWKS |
| Validation | FluentValidation 12 (auto-validation via middleware) |
| Logging | Serilog — console + rolling file (`logs/homemanager-YYYYMMDD.log`) |
| Docs | Swashbuckle / Swagger UI (dev only) |

### NuGet Packages

| Package | Version | Notes |
|---------|---------|-------|
| `Npgsql.EntityFrameworkCore.PostgreSQL` | **9.0.4** | Pinned — v10 has batch command bug |
| `Microsoft.EntityFrameworkCore.Design` | 9.0.4 | Design-time migrations |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 10.0.3 | JWT Bearer auth |
| `Microsoft.IdentityModel.Protocols.OpenIdConnect` | 8.16.0 | OIDC config fetch |
| `FluentValidation` | 12.1.1 | Request validation |
| `FluentValidation.AspNetCore` | 11.3.1 | Auto-validation integration |
| `Serilog.AspNetCore` | 10.0.0 | Structured logging |
| `Serilog.Sinks.Console` | 6.1.1 | Console sink |
| `Serilog.Sinks.File` | 7.0.0 | Rolling file sink |
| `Serilog.Enrichers.Environment` | 3.0.1 | Env enrichment |
| `Serilog.Enrichers.Thread` | 4.0.0 | Thread enrichment |
| `OneOf` | 3.0.271 | Discriminated unions |
| `supabase-csharp` | 0.16.2 | Supabase C# client (reserved, not actively used) |
| `Swashbuckle.AspNetCore` | 7.2.0 | Swagger/OpenAPI |

### Frontend

| Layer | Choice |
|-------|--------|
| Framework | Angular **21** (standalone components, `@if`/`@for` control flow) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss` plugin) |
| Auth/Storage | `@supabase/supabase-js` v2.95.3 |
| HTTP | Angular `HttpClient` + functional interceptors |
| Routing | Angular Router (lazy-loaded, feature-based) |
| Build | `@angular/build:application` (esbuild) |
| Deploy | **Vercel** (`vercel.json` — SPA rewrite rule, all routes → `index.html`) |
| Tests | Vitest + jsdom |

### Frontend npm Dependencies

| Package | Version |
|---------|---------|
| `@angular/core` | ^21.1.0 |
| `@angular/router` | ^21.1.0 |
| `@angular/forms` | ^21.1.0 |
| `@angular/animations` | 21.1.4 |
| `@angular/material` | ~21.1.4 (installed, **not used** — pure Tailwind) |
| `@angular/cdk` | ~21.1.4 |
| `@supabase/supabase-js` | ^2.95.3 |
| `rxjs` | ~7.8.0 |
| `tailwindcss` | ^4.2.1 |
| `@tailwindcss/postcss` | ^4.2.1 |
| `typescript` | ~5.9.2 |
| `vitest` | ^4.0.8 |

---

## 3. Repository Structure

```
HomeManager/
├── CLAUDE.md                          ← This file
├── ENDPOINT_GAP_ANALYSIS.md           ← Endpoint roadmap (March 2026)
├── GEMINI/
│   └── GEMINI.md                      ← Early design notes (outdated)
├── src/
│   ├── HomeManager.sln
│   ├── HomeManager.API/               ← .NET 10 backend
│   │   ├── Controllers/
│   │   │   ├── HealthController.cs
│   │   │   ├── HouseholdController.cs
│   │   │   ├── InventoryController.cs
│   │   │   ├── LocationController.cs
│   │   │   ├── CategoryController.cs
│   │   │   └── PantryController.cs
│   │   ├── Data/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   ├── ApplicationDbContextFactory.cs
│   │   │   └── Migrations/
│   │   │       ├── 20260310102006_InitialBaseline.*
│   │   │       ├── 20260310105941_AddLocationEntity.*
│   │   │       ├── 20260310120809_AddCategoryAndItemRelationships.*
│   │   │       └── 20260310121300_AddPantryItemEntity.*
│   │   ├── Extensions/
│   │   │   └── ServiceCollectionExtensions.cs  ← All DI registrations
│   │   ├── Middleware/
│   │   │   ├── ErrorHandlingMiddleware.cs
│   │   │   ├── SupabaseAuthMiddleware.cs
│   │   │   └── UserSyncMiddleware.cs
│   │   ├── Models/
│   │   │   ├── ApiResponse.cs
│   │   │   ├── ValidationErrorResponse.cs
│   │   │   ├── DTOs/
│   │   │   │   ├── LocationResponse.cs
│   │   │   │   ├── CategoryResponse.cs
│   │   │   │   ├── PantryItemResponse.cs
│   │   │   │   ├── ItemResponse.cs
│   │   │   │   └── Requests/
│   │   │   │       ├── CreateItemRequest.cs / UpdateItemRequest.cs
│   │   │   │       ├── CreateLocationRequest.cs / UpdateLocationRequest.cs
│   │   │   │       ├── CreateCategoryRequest.cs / UpdateCategoryRequest.cs
│   │   │   │       ├── CreatePantryItemRequest.cs / UpdatePantryItemRequest.cs
│   │   │   │       └── CreateHouseholdRequest.cs
│   │   │   ├── Inventory/
│   │   │   │   ├── InventoryItem.cs
│   │   │   │   ├── ItemList.cs
│   │   │   │   ├── Location.cs
│   │   │   │   ├── Category.cs
│   │   │   │   └── PantryItem.cs
│   │   │   └── Shared/
│   │   │       ├── User.cs
│   │   │       ├── Household.cs
│   │   │       └── HouseholdUser.cs
│   │   ├── Services/
│   │   │   ├── IUserSyncService.cs / UserSyncService.cs
│   │   │   ├── IHouseholdService.cs / HouseholdService.cs (inferred location)
│   │   │   ├── Location/  ILocationService.cs + LocationService.cs
│   │   │   ├── Category/  ICategoryService.cs + CategoryService.cs
│   │   │   └── Pantry/    IPantryService.cs + PantryService.cs
│   │   ├── Validators/
│   │   │   ├── CreateCategoryRequestValidator.cs / UpdateCategoryRequestValidator.cs
│   │   │   ├── CreateLocationRequestValidator.cs / UpdateLocationRequestValidator.cs
│   │   │   └── CreatePantryItemRequestValidator.cs / UpdatePantryItemRequestValidator.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   ├── appsettings.Production.json
│   │   ├── HomeManager.API.csproj
│   │   └── Dockerfile
│   │
│   └── HomeManager.Web/               ← Angular 21 frontend
│       ├── package.json
│       ├── angular.json
│       ├── postcss.config.json        ← Tailwind v4 (MUST be JSON, not .js)
│       ├── vercel.json
│       ├── tsconfig.app.json
│       ├── scripts/
│       │   └── inject-env.js          ← Pre-build env var injection
│       └── src/
│           ├── styles.css             ← @import "tailwindcss" + @source
│           ├── main.ts
│           ├── index.html
│           ├── environments/
│           │   ├── environment.ts          ← Production (placeholders)
│           │   ├── environment.development.ts
│           │   └── environment.template.ts
│           └── app/
│               ├── app.config.ts      ← providers, interceptors
│               ├── app.routes.ts      ← route definitions
│               ├── app.ts
│               ├── core/
│               │   ├── guards/auth.guard.ts
│               │   ├── interceptors/auth.interceptor.ts
│               │   ├── models/
│               │   │   ├── api-response.model.ts
│               │   │   ├── household.model.ts
│               │   │   ├── user.model.ts
│               │   │   ├── inventory-item.model.ts
│               │   │   ├── location.model.ts
│               │   │   ├── category.model.ts
│               │   │   └── pantry-item.model.ts
│               │   ├── services/
│               │   │   ├── supabase.service.ts
│               │   │   ├── household.service.ts
│               │   │   ├── inventory.service.ts
│               │   │   ├── location.service.ts
│               │   │   ├── category.service.ts
│               │   │   └── pantry.service.ts
│               │   └── mock/
│               │       ├── dashboard.mock.ts    ← Timeline mock events
│               │       └── inventory.mock.ts    ← Locations + item mocks
│               ├── features/
│               │   ├── login/          login.ts + login.html
│               │   ├── dashboard/
│               │   │   ├── dashboard.ts + dashboard.html
│               │   │   ├── household-setup/
│               │   │   └── widgets/
│               │   │       ├── summary-widget/
│               │   │       └── timeline-widget/
│               │   ├── inventory/
│               │   │   ├── inventory.ts
│               │   │   └── components/
│               │   │       ├── pertences-tab/
│               │   │       └── despensa-tab/
│               │   ├── tasks/tasks.ts  ← placeholder
│               │   └── budget/budget.ts ← placeholder
│               └── shared/
│                   ├── layouts/app-shell/
│                   ├── components/
│                   │   ├── navbar/
│                   │   ├── fab/
│                   │   ├── pill-tabs/
│                   │   ├── search-input/
│                   │   └── status-dot/
│                   └── pipes/safe-html.pipe.ts
```

---

## 4. Architecture Decisions

### Auth Flow

```
Browser → Supabase Auth (signIn) → JWT (access_token)
       → Angular AuthInterceptor adds "Authorization: Bearer {token}" to /api/ requests
       → .NET JwtBearer validates token via Supabase OIDC endpoint
           ({SUPABASE_URL}/auth/v1/.well-known/openid-configuration)
       → UserSyncMiddleware runs on every authenticated request:
           creates/updates the user row in shared.users
       → Controllers read userId from "sub" claim
```

Key validation settings: validates issuer + signature + lifetime; audience validation is **disabled** (Supabase doesn't set `aud` consistently).

### Database

- **Two schemas**: `shared` (users, households) and `inventory` (items, locations, categories, lists, pantry_items).
- EF Core code-first with explicit `[Table("name", Schema = "schema")]` attributes.
- Connection goes through Supabase PgBouncer pooler in **session mode** (`pooler.supabase.com:5432`).
- **Secrets**: connection string is in `dotnet user-secrets` (dev) or `DATABASE_URL` env var (prod). Never committed.

### Npgsql 9.0.4 Pin

Npgsql 10.0.0 throws `ObjectDisposedException: ManualResetEventSlim` on `SaveChangesAsync()` with batch commands. Pinned to 9.0.4. Do not upgrade until the upstream bug is fixed.

### UserSyncMiddleware Isolation

`UserSyncMiddleware.InvokeAsync` takes `IServiceScopeFactory` as a parameter (not `IUserSyncService` directly). It creates its own DI scope so the sync `DbContext`/Npgsql connection is completely isolated from the request-scoped `DbContext` used by controllers. This prevents connection conflicts that were the root cause of the original `ObjectDisposedException`.

### JSON Cycle Handling

`AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles)` is set in `Program.cs` because bidirectional navigation properties (`Household ↔ HouseholdUser`) would otherwise cause infinite serialization loops.

### Backend Patterns

- **`ApiResponse<T>`**: All service-level endpoints return this wrapper: `{ success, message, data, timestamp }`. Controllers map service success/failure to appropriate HTTP status codes.
- **`ServiceCollectionExtensions`**: All DI registrations, DB config, auth config, CORS config, and Swagger config are in extension methods called from `Program.cs`.
- **FluentValidation**: All request validators are auto-discovered via assembly scan (`AddValidatorsFromAssemblyContaining<Program>()`). Auto-validation is enabled, returning 400 with grouped field errors on failure.
- **Authorization scope**: Every DB query includes `.Where(h => h.HouseholdUsers.Any(hu => hu.UserId == userId))` — row-level access control enforced at application layer, not DB.

### Frontend Patterns

- **Standalone components** everywhere — no `NgModule`.
- **Lazy routing**: every feature component is loaded via `import('./features/...')`.
- **No Angular Material** in UI — Tailwind CSS only. (`@angular/material` is installed but unused.)
- **`[class.foo]` bindings** work without `NgClass` import. Only `[ngClass]="object"` needs it.
- **Tailwind v4 critical**: config must be `postcss.config.json` (not `.js`/`.mjs`). The `@angular/build:application` esbuild builder only reads JSON PostCSS configs. Built-in Tailwind support is v3 API — must use `@tailwindcss/postcss`.
- **Mock data** is isolated in `core/mock/` — trivially swappable with real service calls.
- **`combineLatest` with individual `catchError`**: when loading multiple resources in parallel via `combineLatest`, wrap each observable with `.pipe(catchError(() => of([])))`. This prevents a single failing request from blocking `combineLatest` from emitting and leaving the UI stuck in a loading state indefinitely.
- **`AppShellComponent` uses `toSignal()` for `households` and `selectedHousehold`**: `getMyHouseholds()` is called eagerly as a class field initializer (not in `ngOnInit`), which ensures `selectedHousehold$` is populated on any entry route, including direct navigation to `/inventory` and page refreshes. `toSignal()` handles unsubscription automatically — no memory leak, no `AsyncPipe`, no `OnInit`/`OnDestroy`.
- **`ChangeDetectionStrategy.OnPush` on all components**: every component uses OnPush. Any state mutation inside an async callback (`async/await`, `FileReader.onload`, native Promises, `setTimeout`) is outside Zone.js and will not trigger re-render automatically — always call `ChangeDetectorRef.markForCheck()` immediately after mutating visible state in those contexts.

### Middleware Pipeline Order

```
Serilog Request Logging
→ ErrorHandlingMiddleware (global exception → JSON error response)
→ CORS (AllowAngular policy)
→ UseAuthentication (JWT validation)
→ UserSyncMiddleware (upsert user into shared.users)
→ UseAuthorization
→ MapControllers
```

---

## 5. Data Model

### Schema: `shared`

#### `shared.users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Matches Supabase auth user ID |
| `email` | varchar(255) | Required |
| `name` | varchar(255) | Required |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `shared.households`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | varchar(255) | Required |
| `invite_code` | varchar(50) | Required, used for joining |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `shared.household_users`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID | PK (composite with household_id) |
| `household_id` | UUID | PK (composite with user_id) |
| `role` | varchar(50) | `'owner'` or `'member'` |
| `joined_at` | timestamptz | |

### Schema: `inventory`

#### `inventory.locations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` |
| `name` | varchar(100) | Required (e.g. "Cozinha", "Sala") |
| `icon` | varchar(50) | Optional emoji or icon key |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `inventory.categories`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` |
| `name` | varchar(100) | Required |
| `type` | varchar(50) | `'pertences'` or `'despensa'` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `inventory.items` — Pertences (durable goods)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` |
| `name` | varchar(255) | Required |
| `description` | text | |
| `value` | decimal | Monetary value |
| `photo_url` | text | Supabase Storage path |
| `location` | varchar(255) | **Deprecated** — legacy free-text; use `location_id` |
| `location_id` | UUID FK | → `inventory.locations.id` ON DELETE SET NULL |
| `category_id` | UUID FK | → `inventory.categories.id` ON DELETE SET NULL |
| `quantity` | integer | Nullable — number of units (e.g. 6 for a set of 6 knives) |
| `destination` | varchar(50) | `Undecided\|Take\|Sell\|Donate\|Trash` (Pertences-only) |
| `owner_id` | UUID FK | → `shared.users.id` (nullable) |
| `tags` | jsonb | Stored as stringified JSON array |
| `list_id` | UUID FK | → `inventory.lists.id` ON DELETE SET NULL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `inventory.lists`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | |
| `name` | varchar(255) | |
| `type` | varchar(50) | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `inventory.pantry_items` — Despensa (consumables)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` |
| `location_id` | UUID FK | → `inventory.locations.id` ON DELETE SET NULL |
| `category_id` | UUID FK | → `inventory.categories.id` ON DELETE SET NULL |
| `name` | varchar(200) | Required |
| `notes` | varchar(500) | |
| `quantity` | decimal | Required |
| `unit` | varchar(20) | `"kg"`, `"L"`, `"un"`, etc. |
| `min_quantity` | decimal | Alert threshold; null = no alert |
| `expiration_date` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Computed field** — `status`: `"low"` if `quantity <= min_quantity`, otherwise `"ok"`. Calculated in `PantryService`, not stored.

---

## 6. API Endpoints

All endpoints require `Authorization: Bearer {supabase_jwt}` except `/api/health`.

### Response envelope (most endpoints)

```json
{ "success": true, "message": "Success", "data": {...}, "timestamp": "..." }
```

`InventoryController` returns raw entity arrays (no envelope) — legacy behavior.

### Error shapes

```json
// Validation error (400)
{ "message": "Validation failed", "errors": { "field": ["msg1"] }, "timestamp": "..." }

// General error
{ "statusCode": 404, "message": "Resource not found", "details": "...", "timestamp": "..." }
```

---

### `GET /api/health`
No auth. Returns `{ status: "healthy", timestamp, service }`.

---

### Household — `/api/household` [Authorize]

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/household` | All households for current user |
| `GET` | `/api/household/{id}` | Single household (includes `householdUsers[]`) |
| `POST` | `/api/household` | Create household, auto-assigns `owner` role |
| `POST` | `/api/household/join/{inviteCode}` | Join household, assigns `member` role |

**CreateHouseholdRequest**: `{ name: string }`

**Household response shape**:
```json
{ "id": "uuid", "name": "Casa", "inviteCode": "ABC123", "createdAt": "...", "updatedAt": "...", "householdUsers": [...] }
```

---

### Inventory (Pertences) — `/api/inventory` [Authorize]

Returns raw `InventoryItem` objects (no `ApiResponse<T>` wrapper).

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/inventory/items` | Items for current user's households |
| `GET` | `/api/inventory/items/{id}` | Single item |
| `POST` | `/api/inventory/items` | Create item |
| `PUT` | `/api/inventory/items/{id}` | Update item (204 No Content) |
| `DELETE` | `/api/inventory/items/{id}` | Delete item (204 No Content) |

**Query params** (GET list): `householdId?`, `locationId?`, `category?` (name string)

**CreateItemRequest**:
```
householdId, name, description?, value?, photoUrl?,
location? (legacy), destination?, ownerId?, tags? (JSONB string),
listId?, locationId?, categoryId?, quantity? (integer)
```

---

### Locations — `/api` [Authorize]

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/households/{householdId}/locations` | All locations for a household |
| `POST` | `/api/households/{householdId}/locations` | Create location |
| `PUT` | `/api/locations/{id}` | Update location |
| `DELETE` | `/api/locations/{id}` | Delete location (items → `location_id = null`) |

**CreateLocationRequest**: `{ name: string, icon?: string }`
**UpdateLocationRequest**: `{ name?: string, icon?: string }`
**LocationResponse**: `{ id, householdId, name, icon?, createdAt }`

---

### Categories — `/api` [Authorize]

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/households/{householdId}/categories` | All categories (filterable by `?type=pertences\|despensa`) |
| `POST` | `/api/households/{householdId}/categories` | Create category |
| `PUT` | `/api/categories/{id}` | Update category |
| `DELETE` | `/api/categories/{id}` | Delete category |

**CreateCategoryRequest**: `{ name: string, type: string }`
**UpdateCategoryRequest**: `{ name?: string }`
**CategoryResponse**: `{ id, householdId, name, type, createdAt }`

---

### Pantry (Despensa) — `/api/pantry` [Authorize]

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/pantry/items` | Pantry items (householdId required) |
| `GET` | `/api/pantry/items/{id}` | Single item |
| `POST` | `/api/pantry/items` | Create item |
| `PUT` | `/api/pantry/items/{id}` | Update item |
| `DELETE` | `/api/pantry/items/{id}` | Delete item |

**Query params** (GET list): `householdId` (required), `locationId?`, `category?`, `status?` (`"low"` or `"ok"`)

**CreatePantryItemRequest**:
```
householdId, name, quantity, unit?, minQuantity?,
expirationDate?, locationId?, categoryId?, notes?
```

**PantryItemResponse**:
```
id, householdId, name, quantity, unit?, minQuantity?,
expirationDate?, locationId?, locationName?, categoryId?, categoryName?,
notes?, status ("ok"|"low"), createdAt, updatedAt
```

---

## 7. Frontend Pages & Components

### Routes

```
/           → redirect to /dashboard
/login      → LoginComponent (no auth guard)
/dashboard  → DashboardComponent   (guarded by AppShell)
/inventory  → InventoryComponent   (guarded by AppShell)
/tasks      → TasksComponent        (guarded by AppShell)
/budget     → BudgetComponent       (guarded by AppShell)
**          → redirect to /dashboard
```

AppShell wraps all protected routes as a layout parent (sidebar + bottom nav).

### Pages

#### LoginComponent (`features/login/`)
Email/password sign-in and sign-up via `SupabaseService`. Redirects to `/dashboard` on success.

#### DashboardComponent (`features/dashboard/`) — partial real data, signals
- Uses `toSignal()` throughout — no `OnInit`, no `AsyncPipe`, no memory leak
- `householdsLoading` signal: `true` until `getMyHouseholds()` emits (shows skeleton, prevents flash of `HouseholdSetupComponent`)
- `dataLoading` signal: `true` while items load after household is selected (shows widget skeletons)
- `households` / `selectedHousehold` / `itemsStream` / `lowStockStream` are all signals
- `totalValue` and `lowStockCount` are `computed()` from their respective streams
- Shows `SummaryWidget`: total Pertences value (real) + low-stock count (real, via `PantryService`)
- Shows `TimelineWidget`: upcoming events (100% mock — `dashboard.mock.ts`)
- If no household → shows `HouseholdSetupComponent`

#### InventoryComponent (`features/inventory/`)
Tab container: "Pertences" | "Despensa". Hosts the two tab components.

#### PertencesTabComponent (`features/inventory/components/pertences-tab/`) — real data
- Fetches locations (`LocationService`) + items (`InventoryService`) for selected household
- Groups items by `locationId`; items without a location appear under "Sem Local"
- Category chips for secondary filtering
- Search input (client-side filter)
- "Novo Local" modal adds a location (calls `LocationService.addLocation()`)
- FAB for new item (UI removed in rewrite; to be rebuilt)

#### DespensaTabComponent (`features/inventory/components/despensa-tab/`) — mock data, signals
- Same layout as Pertences tab (grouped by location, category chips, search)
- Status dot (ok/low) per item
- Uses `toSignal()` + `BehaviorSubject` reload trigger — no `OnInit`/`OnDestroy`, no memory leak
- `PantryService.getItems()` is wired in the data stream; UI still shows API data (currently backed by mock in service layer — connect real endpoint to replace mock)

#### HouseholdSetupComponent (`features/dashboard/household-setup/`)
Modal-based flows to create a household or join one via invite code.

#### TasksComponent / BudgetComponent
Empty stubs — routes exist but no real UI yet.

### Shared Components

| Component | Description |
|-----------|-------------|
| `AppShellComponent` | Layout: desktop sidebar + mobile bottom nav; household selector; user menu |
| `PillTabsComponent` | Horizontal pill tab switcher; `tabs[]`, `activeIndex`, `(tabChange)` |
| `SearchInputComponent` | Text input with clear; `[(value)]` two-way binding |
| `StatusDotComponent` | Green/red dot; `status: 'ok' \| 'low'` input |
| `FabComponent` | Floating action button |
| `NavbarComponent` | Top bar with title and action slots |
| `SafeHtmlPipe` | Sanitises and renders HTML strings |

### Services (Frontend)

| Service | Key methods | Data source |
|---------|-------------|-------------|
| `SupabaseService` | `signIn/Up/Out`, `getSession`, `getAccessToken`, `uploadItemPhoto`, `createSignedUrls` | Supabase JS |
| `HouseholdService` | `getMyHouseholds()`, `createHousehold()`, `joinHousehold()`; `selectedHousehold$` BehaviorSubject | Real API |
| `InventoryService` | `getItems()`, `createItem()`, `updateItem()`, `deleteItem()` | Real API |
| `LocationService` | `getLocations(householdId)`, `addLocation(name, householdId, icon?)` | Real API |
| `CategoryService` | `getCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()` | Real API |
| `PantryService` | `getItems(householdId, locationId?, category?, status?)`, full CRUD | Real API (not yet wired in UI) |

### Guards & Interceptors

- **`authGuard`**: async; calls `supabase.getSession()` → redirects to `/login` if null.
- **`authInterceptor`**: functional interceptor; attaches `Authorization: Bearer {token}` to all requests containing `/api/` in the URL.

### Mock Data (`core/mock/`)

- **`dashboard.mock.ts`**: Timeline event array with date, title, sourceModule, type.
- **`inventory.mock.ts`**: `MOCK_LOCATIONS` (5 rooms), `MOCK_PERTENCES_ITEMS`, `MOCK_DESPENSA_ITEMS`. All trivially replaceable by real service calls.

---

## 8. Design System Summary

### Color Palette

| Role | Tailwind classes |
|------|-----------------|
| Primary / active | `emerald-600`, `emerald-700` (hover) |
| Background | `stone-50`, `stone-100` |
| Surface / card | `white`, `stone-100` |
| Border | `stone-200` |
| Text primary | `stone-800`, `stone-900` |
| Text secondary | `stone-500`, `stone-600` |
| Warning / low stock | `amber-*` |
| Status ok | `green-*` |
| Status low | `red-*` |

### Component Patterns

- **Cards**: `bg-white rounded-2xl shadow-sm p-4`
- **Pill chips (filter)**: `rounded-full px-3 py-1 text-sm`; active = `bg-emerald-600 text-white`, inactive = `bg-stone-100 text-stone-600`
- **Status dot**: small `rounded-full w-2 h-2` in green or red
- **FAB**: fixed bottom-right, `rounded-full bg-emerald-600 text-white shadow-lg`
- **Section header**: `text-sm font-semibold text-stone-500 uppercase tracking-wide`

### Layout Rules

- Mobile-first; breakpoint `md:` for desktop sidebar.
- Bottom nav on mobile, left sidebar on desktop (AppShell handles both).
- Content max-width `max-w-2xl mx-auto` on page containers.
- Consistent `px-4` horizontal padding throughout.

### Tailwind v4 Config

`postcss.config.json` (must be JSON — Angular esbuild ignores `.js`/`.mjs`):
```json
{ "plugins": { "@tailwindcss/postcss": {} } }
```

`styles.css`:
```css
@import "tailwindcss";
@source "./app/**/*.html";
@source "./app/**/*.ts";   /* Needed for classes generated in .ts methods */
```

### Language

- **UI text**: Portuguese (PT-PT)
- **Code**: English (variables, functions, comments, commit messages)

---

## 9. Current State & Known Issues

### Fully working end-to-end
- Authentication (Supabase signup/signin, JWT flow)
- Household create, join, list
- Pertences: full CRUD with location grouping and category filtering
- Locations: create, list, update, delete (with UI for create)
- Categories: full CRUD (backend only; no UI yet)
- PantryController: full CRUD backend

### Using mock data
- Despensa tab (frontend not wired to `PantryService`)
- Dashboard timeline widget
- Dashboard summary "Em Falta" (low stock count)

### Known issues / gaps (from ENDPOINT_GAP_ANALYSIS.md)
- `InventoryItem.location` (string) is deprecated; migration to `locationId` FK is partial — old rows may have only the string field.
- `tags` field is stored as raw JSONB string (stringified array) — not a proper FK-based system yet.
- `destination` field (Take/Sell/Donate etc.) is Pertences-only but is on the shared `InventoryItem` DTO.
- Dashboard summary endpoint (`GET /api/dashboard/summary`) and timeline endpoint (`GET /api/dashboard/timeline`) not yet implemented.
- `PUT /api/users/me` and `GET /api/household/{id}/members` not yet implemented.
- Category and Location UIs in Despensa tab not yet built.
- Server-side filtering by `locationId` and `category` for items is implemented but frontend still filters client-side for Pertences.
- Tasks and Budget modules are empty stubs.

---

## 10. Development Setup

### Prerequisites
- .NET 10 SDK
- Node.js 22+ / npm 11
- PostgreSQL via Supabase (or local PG instance)

### Backend

```bash
# Set user secrets (dev only — never commit secrets)
cd src/HomeManager.API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Port=5432;Database=postgres;Username=...;Password=..."
dotnet user-secrets set "Supabase:Url" "https://your-project.supabase.co"

# Run (listens on http://localhost:8080)
dotnet run --project src/HomeManager.API

# Swagger UI available at:
# http://localhost:8080/swagger (development only)
```

### Frontend

```bash
cd src/HomeManager.Web

# Install dependencies
npm install

# Development server (http://localhost:4200)
npm start

# Production build
npm run build
# Output: dist/home-manager.web/browser/
```

Environment config for development is in `src/environments/environment.development.ts`.

### Database Migrations

```bash
cd src/HomeManager.API

# Apply all pending migrations
dotnet ef database update

# Create a new migration
dotnet ef migrations add MigrationName

# Generate SQL script
dotnet ef migrations script
```

The `ApplicationDbContextFactory` reads `DATABASE_URL` env var or user-secrets for design-time migrations.

### Deployment

**Frontend**: Vercel. Every push to `main` triggers a deploy. `vercel.json` rewrites all routes to `index.html` (SPA). Environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_URL`) are set in the Vercel dashboard and injected by `scripts/inject-env.js` during `prebuild`.

**Backend**: Dockerfile present. Port read from `PORT` env var (default 8080). Secrets via environment variables (`DATABASE_URL`, `SUPABASE_URL`). CORS origins configured via `AllowedOrigins` env var (semicolon-separated).

### Environment Variables (Backend)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Full Postgres connection string |
| `SUPABASE_URL` | Supabase project URL (no trailing slash) |
| `PORT` | HTTP listen port (default: `8080`) |
| `AllowedOrigins` | Semicolon-separated CORS origins (default: `http://localhost:4200`) |

### Environment Variables (Frontend — Vercel)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `API_URL` | Backend API base URL |

---

## 11. Naming Conventions

| Concept | Correct term | Avoid |
|---------|-------------|-------|
| Durable goods module | **Pertences** | "Bens Duráveis" (old name) |
| Consumables module | **Despensa** | "Pantry" (English) in UI |
| Physical grouping | **Location** (Localização) | "Room", "Place" |
| Secondary filter | **Category** (Categoria) | "Tag" (tags are a different field) |

- All **UI text**: Portuguese (PT-PT)
- All **code**: English (class names, method names, variables, comments)
- `inventory.items` table → "Pertences" in UI; `inventory.pantry_items` → "Despensa"
- Categories have a `type` field: `"pertences"` or `"despensa"` — use lowercase string, not enum
- Route prefix `/api/inventory` is fine as the module name; sub-types are `pertences`/`despensa`
