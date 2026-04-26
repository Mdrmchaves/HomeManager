# HomeManager — Project Context Document

> Este documento é a fonte única de verdade para assistentes AI e novos developers no HomeManager.
> Cobre arquitectura, modelo de dados, endpoints, componentes frontend, design system e workflow de desenvolvimento.
> **Fonte de verdade: o código. Se este documento divergir do código, o código tem razão.**

---

## 1. Visão Geral do Projecto

HomeManager é uma aplicação de gestão doméstica. Permite que membros de uma casa partilhada rastreiem o seu inventário físico ("Pertences" — bens duráveis como móveis e electrónicos) e consumíveis da despensa ("Despensa" — alimentos e suprimentos), com resumos no dashboard e módulos futuros para tarefas e orçamento.

**Público-alvo**: Famílias e casas partilhadas de 1–N pessoas.

**Estado actual** (2026-04-25):
- Auth (Supabase), criação/adesão a household, e o inventário Pertences estão funcionais end-to-end.
- Página de login tem toggle de visibilidade da password ("olhinho").
- Location full CRUD (criar, editar, apagar) está ligado end-to-end incluindo modais no separador Pertences.
- Category CRUD é funcional no backend; categorias são atribuíveis a itens via item-form mas os chips de filtro de categoria no listing estão ocultos (`class="hidden"`).
- Listing de Pertences mostra quantidade inline (×N quando quantidade > 1) e tem chips de filtro por destino (Todos / Indefinido / Manter / Vender / Doar / Descartar).
- Separador Despensa tem backend funcional (PantryController) mas o frontend mostra placeholder "Em breve".
- Dashboard distingue `householdsLoading` (skeleton inicial até saber se tem household) de `dataLoading` (skeleton dos widgets enquanto carrega). Summary widget usa dados reais (valor total + contagem de itens em falta via PantryService); Timeline widget é 100% mock.
- Pertences resolve/restore workflow existe apenas no backend.
- Tasks é stub (rota existe, sem UI real).
- **Módulo Finance implementado end-to-end** (2026-04-25): schema `finance` na DB, migration `20260424185206_AddFinanceModule` aplicada ao Supabase. Backend com CRUD completo de contas, transações, templates recorrentes, orçamento, câmbio e dashboard calculado. Frontend Angular com 6 tabs (Painel, Transações, Recorrentes, Contas, Orçamento, Câmbio) + modal de import (transações e contas/cartões). Transações: conta obrigatória, edição inline. Ver §5 (schema finance), §6 (endpoints /api/finance), §8 (componentes).
- **⚠️ BUG INTRODUZIDO** pelo commit `ca10465` (feat: add pagination): o backend `GET /api/inventory/items` passou a retornar `ApiResponse<PagedResponse<ItemResponse>>` mas o frontend `InventoryService.getItems()` ainda tipifica a resposta como `ApiResponse<InventoryItem[]>`. O `r.data` em runtime é um `PagedResponse` e não um array — `.filter()` vai falhar. **O frontend Web está desactualizado e quebrado para este endpoint.**

**Nota importante — Clientes Frontend:**
- **Cliente primário**: HomeManager.Mobile (repositório separado) — React Native, consome esta API.
- **Cliente secundário/legado**: HomeManager.Web (Angular 21, neste repositório) — estava a ser desenvolvido em paralelo mas ficou desactualizado após o commit `ca10465`. Qualquer mudança na API deve priorizar a compatibilidade com o Mobile.

---

## 2. Stack Tecnológico

### Backend

| Camada | Escolha |
|--------|---------|
| Runtime | .NET 10 / ASP.NET Core Web API |
| ORM | Entity Framework Core 9 (via Npgsql **9.0.4** — ver §4) |
| Base de dados | PostgreSQL via Supabase (3 schemas: `shared`, `inventory`, `finance`) |
| Auth | Supabase JWT validado por .NET via OpenID Connect JWKS |
| Validação | FluentValidation 12 (auto-validação via middleware) |
| Logging | Serilog — console + rolling file (`logs/homemanager-YYYYMMDD.log`) |
| Docs | Swashbuckle / Swagger UI (só em dev) |
| Cache | `IMemoryCache` (in-process) — usado por `UserSyncMiddleware` |

### Packages NuGet

| Package | Versão | Notas |
|---------|--------|-------|
| `Npgsql.EntityFrameworkCore.PostgreSQL` | **9.0.4** | **Pinned** — v10 tem bug com batch commands |
| `Microsoft.EntityFrameworkCore.Design` | 9.0.4 | Design-time migrations |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 10.0.3 | JWT Bearer auth |
| `Microsoft.IdentityModel.Protocols.OpenIdConnect` | 8.16.0 | Fetch config OIDC Supabase |
| `FluentValidation` | 12.1.1 | Validação de requests |
| `FluentValidation.AspNetCore` | 11.3.1 | Auto-validação via middleware |
| `Serilog.AspNetCore` | 10.0.0 | Logging estruturado |
| `Serilog.Sinks.Console` | 6.1.1 | Sink console |
| `Serilog.Sinks.File` | 7.0.0 | Rolling file sink |
| `Serilog.Enrichers.Environment` | 3.0.1 | Enrich com env |
| `Serilog.Enrichers.Thread` | 4.0.0 | Enrich com thread |
| `OneOf` | 3.0.271 | Discriminated unions |
| `supabase-csharp` | 0.16.2 | Reservado, não usado activamente |
| `Swashbuckle.AspNetCore` | 7.2.0 | Swagger/OpenAPI |

### Frontend Web (legado — desactualizado)

| Camada | Escolha |
|--------|---------|
| Framework | Angular **21** (standalone components, `@if`/`@for`) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) |
| Auth/Storage | `@supabase/supabase-js` v2.95.3 |
| HTTP | Angular `HttpClient` + functional interceptors |
| Routing | Angular Router (lazy-loaded, feature-based) |
| Build | `@angular/build:application` (esbuild) |
| Deploy | **Vercel** (`vercel.json` — SPA rewrite rule) |
| Testes | Vitest + jsdom (instalados, sem testes escritos actualmente) |
| Formatter | Prettier (`printWidth: 100, singleQuote: true`) |

### Dependências npm principais

| Package | Versão |
|---------|--------|
| `@angular/core` | ^21.1.0 |
| `@angular/router` | ^21.1.0 |
| `@angular/forms` | ^21.1.0 |
| `@angular/animations` | 21.1.4 |
| `@angular/material` | ~21.1.4 (instalado, **não usado** — Tailwind puro) |
| `@angular/cdk` | ~21.1.4 |
| `@supabase/supabase-js` | ^2.95.3 |
| `rxjs` | ~7.8.0 |
| `tailwindcss` | ^4.2.1 |
| `@tailwindcss/postcss` | ^4.2.1 |
| `typescript` | ~5.9.2 |
| `vitest` | ^4.0.8 |
| `jsdom` | ^27.1.0 |
| `zone.js` | ^0.16.0 |

---

## 3. Estrutura do Repositório

```
HomeManager/
├── CLAUDE.md                          ← Este ficheiro
├── ENDPOINT_GAP_ANALYSIS.md           ← Roadmap de endpoints (Março 2026, parcialmente desactualizado)
├── BACKEND_ANALYSIS.md                ← Análise do backend (gerada, parcialmente desactualizada)
├── GEMINI/
│   └── GEMINI.md                      ← Notas de design iniciais (desactualizadas)
├── src/
│   ├── HomeManager.sln
│   ├── HomeManager.API/               ← .NET 10 backend
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs      ← FICHEIRO VAZIO (reservado)
│   │   │   ├── FinanceController.cs
│   │   │   ├── HealthController.cs
│   │   │   ├── HouseholdController.cs
│   │   │   ├── InventoryController.cs
│   │   │   ├── LocationController.cs
│   │   │   ├── CategoryController.cs
│   │   │   ├── PantryController.cs
│   │   │   └── UsersController.cs
│   │   ├── Data/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   ├── ApplicationDbContextFactory.cs
│   │   │   └── Migrations/
│   │   │       ├── 20260310102006_InitialBaseline.*
│   │   │       ├── 20260310105941_AddLocationEntity.*
│   │   │       ├── 20260310120809_AddCategoryAndItemRelationships.*
│   │   │       ├── 20260310121300_AddPantryItemEntity.*
│   │   │       ├── 20260311210909_AddQuantityToInventoryItems.*
│   │   │       ├── 20260317181000_RemoveLegacyLocationField.*
│   │   │       └── 20260320120000_AddItemStatusAndResolvedAt.*
│   │   ├── Extensions/
│   │   │   └── ServiceCollectionExtensions.cs  ← Todos os registos DI
│   │   ├── Middleware/
│   │   │   ├── ErrorHandlingMiddleware.cs
│   │   │   ├── SupabaseAuthMiddleware.cs        ← FICHEIRO VAZIO (reservado)
│   │   │   └── UserSyncMiddleware.cs
│   │   ├── Models/
│   │   │   ├── ApiResponse.cs
│   │   │   ├── ValidationErrorResponse.cs
│   │   │   ├── DTOs/
│   │   │   │   ├── LocationResponse.cs
│   │   │   │   ├── CategoryResponse.cs
│   │   │   │   ├── PantryItemResponse.cs
│   │   │   │   ├── ItemResponse.cs
│   │   │   │   ├── PagedResponse.cs
│   │   │   │   ├── LocationCountResponse.cs
│   │   │   │   ├── DestinationCountResponse.cs
│   │   │   │   ├── UserResponse.cs
│   │   │   │   └── Requests/
│   │   │   │       ├── CreateItemRequest.cs / UpdateItemRequest.cs
│   │   │   │       ├── ResolveItemRequest.cs
│   │   │   │       ├── CreateLocationRequest.cs / UpdateLocationRequest.cs
│   │   │   │       ├── CreateCategoryRequest.cs / UpdateCategoryRequest.cs
│   │   │   │       ├── CreatePantryItemRequest.cs / UpdatePantryItemRequest.cs
│   │   │   │       ├── ImportAccountsRequest.cs
│   │   │   │       ├── CreateHouseholdRequest.cs
│   │   │   │       └── UpdateUserRequest.cs
│   │   │   ├── Finance/
│   │   │   │   ├── FinanceAccount.cs
│   │   │   │   ├── FinanceTransaction.cs
│   │   │   │   ├── FinanceTemplate.cs
│   │   │   │   ├── FinanceBudget.cs
│   │   │   │   └── FinanceRates.cs
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
│   │   │   ├── Finance/    IFinanceService.cs + FinanceService.cs
│   │   │   ├── Household/  IHouseholdService.cs + HouseholdService.cs
│   │   │   ├── Inventory/  IInventoryService.cs + InventoryService.cs
│   │   │   ├── Location/   ILocationService.cs + LocationService.cs
│   │   │   ├── Category/   ICategoryService.cs + CategoryService.cs
│   │   │   └── Pantry/     IPantryService.cs + PantryService.cs
│   │   ├── Validators/
│   │   │   ├── CreateItemRequestValidator.cs
│   │   │   ├── UpdateItemRequestValidator.cs
│   │   │   ├── CreateTransactionRequestValidator.cs
│   │   │   ├── UpdateTransactionRequestValidator.cs
│   │   │   ├── CreateAccountRequestValidator.cs
│   │   │   ├── CreateTemplateRequestValidator.cs
│   │   │   ├── CreateHouseholdRequestValidator.cs
│   │   │   ├── CreateCategoryRequestValidator.cs / UpdateCategoryRequestValidator.cs
│   │   │   ├── CreateLocationRequestValidator.cs / UpdateLocationRequestValidator.cs
│   │   │   ├── CreatePantryItemRequestValidator.cs / UpdatePantryItemRequestValidator.cs
│   │   │   └── UpdateUserRequestValidator.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   ├── appsettings.Production.json
│   │   ├── HomeManager.API.csproj
│   │   └── Dockerfile
│   │
│   └── HomeManager.Web/               ← Angular 21 frontend (LEGADO — ver §1)
│       ├── package.json
│       ├── angular.json
│       ├── postcss.config.json        ← Tailwind v4 (DEVE ser JSON, não .js)
│       ├── vercel.json
│       ├── tsconfig.app.json
│       ├── scripts/
│       │   └── inject-env.js          ← Injecção de env vars no prebuild
│       └── src/
│           ├── styles.css             ← @import "tailwindcss" + @source
│           ├── main.ts
│           ├── index.html
│           ├── environments/
│           │   ├── environment.ts
│           │   ├── environment.development.ts
│           │   └── environment.template.ts
│           └── app/
│               ├── app.config.ts
│               ├── app.routes.ts
│               ├── app.ts
│               ├── core/
│               │   ├── guards/auth.guard.ts
│               │   ├── interceptors/auth.interceptor.ts
│               │   ├── models/
│               │   │   ├── api-response.model.ts
│               │   │   ├── household.model.ts
│               │   │   ├── user.model.ts
│               │   │   ├── inventory-item.model.ts  ← ⚠️ desactualizado (sem status/resolvedAt)
│               │   │   ├── location.model.ts
│               │   │   ├── category.model.ts
│               │   │   ├── pantry-item.model.ts
│               │   │   └── destination.enum.ts
│               │   ├── services/
│               │   │   ├── supabase.service.ts
│               │   │   ├── household.service.ts
│               │   │   ├── inventory.service.ts    ← ⚠️ desactualizado (sem paginação)
│               │   │   ├── location.service.ts
│               │   │   ├── category.service.ts
│               │   │   └── pantry.service.ts
│               │   └── mock/
│               │       ├── dashboard.mock.ts
│               │       └── inventory.mock.ts
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
│               │   │       ├── despensa-tab/
│               │   │       └── item-form/          ← create/edit/delete + upload Supabase Storage
│               │   ├── finance/
│               │   │   ├── finance.ts + finance.html
│               │   │   └── components/
│               │   │       ├── dashboard-tab/      ← painel com métricas, CC, categorias, histórico
│               │   │       ├── transactions-tab/   ← CRUD transações + conta obrigatória + edição inline
│               │   │       ├── templates-tab/      ← templates recorrentes
│               │   │       ├── accounts-tab/       ← contas e cartões de crédito
│               │   │       ├── budget-tab/         ← orçamento mensal por categoria
│               │   │       ├── rates-tab/          ← taxas de câmbio
│               │   │       └── import-modal/       ← import JSON (transações e contas/cartões)
│               │   └── tasks/tasks.ts   ← stub
│               └── shared/
│                   ├── layouts/app-shell/
│                   ├── components/
│                   │   ├── navbar/
│                   │   ├── fab/
│                   │   ├── pill-tabs/
│                   │   ├── search-input/
│                   │   ├── skeleton-block/         ← skeleton de loading
│                   │   └── status-dot/
│                   └── pipes/safe-html.pipe.ts
```

---

## 4. Decisões de Arquitectura

### Fluxo de Auth

```
Cliente → Supabase Auth (signIn) → JWT (access_token)
        → Interceptor adiciona "Authorization: Bearer {token}" a requests /api/
        → .NET JwtBearer valida o token via endpoint OIDC Supabase:
            {SUPABASE_URL}/auth/v1/.well-known/openid-configuration
        → UserSyncMiddleware executa em cada request autenticado:
            cria/actualiza a linha do user em shared.users
        → Controllers lêem userId da claim "sub"
```

**Parâmetros de validação JWT** (em `ServiceCollectionExtensions.cs`):
- `ValidateIssuerSigningKey = true`
- `ValidateIssuer = true`, `ValidIssuer = "{supabaseUrl}/auth/v1"`
- `ValidateAudience = true`, `ValidAudience = "authenticated"` ← audience **ESTÁ ACTIVO**, ao contrário do que versões anteriores deste doc diziam
- `ValidateLifetime = true`
- `ClockSkew = TimeSpan.Zero`
- `RequireHttpsMetadata = true`

### Base de Dados

- **Três schemas**: `shared` (users, households), `inventory` (items, locations, categories, lists, pantry_items) e `finance` (accounts, transactions, templates, budget, rates).
- EF Core code-first com `[Table("name", Schema = "schema")]` explícito.
- Ligação via PgBouncer pooler da Supabase em **session mode** (`pooler.supabase.com:5432`).
- `CommandTimeout` configurado para **60 segundos** no DbContext.
- **Secrets**: connection string em `dotnet user-secrets` (dev) ou variável `DATABASE_URL` (prod). Nunca committed.

### Pin do Npgsql 9.0.4

Npgsql 10.0.0 lança `ObjectDisposedException: ManualResetEventSlim` em `SaveChangesAsync()` com batch commands. Pinned em 9.0.4. **Não actualizar** até o bug upstream ser corrigido.

### Isolamento do UserSyncMiddleware

`UserSyncMiddleware.InvokeAsync` recebe `IServiceScopeFactory` e `IMemoryCache` como parâmetros.

**Cache**: Antes de chamar o `UserSyncService`, verifica se existe a chave `"user-synced:{userId}"` em `IMemoryCache`. Se existir, o sync é saltado. Se não existir, cria um scope DI próprio, executa o sync, e guarda a chave em cache por **5 minutos** (`AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)`).

**Porquê scope próprio**: Partilhar o `DbContext` (e a conexão Npgsql) do middleware com o `DbContext` scoped dos controllers causava `ObjectDisposedException`. A criação de um scope isolado resolve este conflito.

### JSON Cycle Handling

`AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles)` em `Program.cs` — necessário pelas propriedades de navegação bidireccional (`Household ↔ HouseholdUser`).

### Padrões Backend

- **`ApiResponse<T>`**: Todos os endpoints de serviço retornam este wrapper: `{ success, message, data, timestamp }`. Controllers mapeiam sucesso/falha para HTTP status codes adequados.
- **`ServiceCollectionExtensions`**: Todos os registos DI, DB config, auth config, CORS config e Swagger config estão em métodos de extensão chamados a partir de `Program.cs`.
- **FluentValidation**: Todos os request validators são auto-descobertos via `AddValidatorsFromAssemblyContaining<Program>()`. Auto-validação activa, retorna 400 com erros agrupados por campo em caso de falha.
- **Autorização por scope**: Cada query à DB inclui `.Where(h => h.HouseholdUsers.Any(hu => hu.UserId == userId))` — row-level access control enforced na camada de aplicação, não na DB.
- **Naming convention — Hungarian notation**: O padrão do projecto para campos privados de instância é o prefixo `m_` (ex: `m_householdService`). Desvios deste padrão (uso de `_` em vez de `m_`) estão anotados como ⚠️ por resolver nas secções relevantes.

### UsersController — Acesso Directo ao DbContext

`UsersController` usa `ApplicationDbContext` directamente em vez de passar por uma camada de serviço, ao contrário dos outros controllers. Esta é uma excepção intencional para operações simples de perfil de utilizador.

### Pipeline de Middleware

```
Serilog Request Logging
→ ErrorHandlingMiddleware   (excepção global → JSON error response)
→ CORS                      (política AllowAngular)
→ UseAuthentication         (validação JWT)
→ UserSyncMiddleware        (upsert user em shared.users, com cache 5 min)
→ UseAuthorization
→ MapControllers
```

**A ordem importa.** `UserSyncMiddleware` deve vir após `UseAuthentication` (precisa do user autenticado) e antes de `UseAuthorization` (os controllers precisam do user sincronizado).

### Padrões Frontend Web

- **Standalone components** em todo o lado — sem `NgModule`.
- **Lazy routing**: cada feature component carregado via `import('./features/...')`.
- **Sem Angular Material** na UI — Tailwind CSS puro. (`@angular/material` instalado mas não usado.)
- **`[class.foo]` bindings** funcionam sem importar `NgClass`. Só `[ngClass]="object"` precisa de NgClass.
- **Tailwind v4 crítico**: config DEVE ser `postcss.config.json` (não `.js`/`.mjs`). O builder `@angular/build:application` (esbuild) só lê configs JSON do PostCSS.
- **Mock data** isolado em `core/mock/` — facilmente substituível por chamadas reais ao serviço.
- **`combineLatest` com `catchError` individuais**: envolver cada observable com `.pipe(catchError(() => of([])))`. Impede que uma única request falhada bloqueie o `combineLatest` indefinidamente.
- **`AppShellComponent` usa `toSignal()`** para `households` e `selectedHousehold`: `getMyHouseholds()` é chamado como field initializer (não em `ngOnInit`), garantindo que `selectedHousehold$` é populado em qualquer rota, incluindo navegação directa e page refreshes.
- **Angular Signals**: todos os novos componentes usam `signal()` para estado local, `computed()` para valores derivados, e `toSignal()` para converter HTTP Observables em Signals. `ChangeDetectorRef` e `markForCheck()` não são usados. Para forçar reload, usar `BehaviorSubject` como trigger combinado com `toSignal()`.

---

## 5. Modelo de Dados

### Schema: `shared`

#### `shared.users`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | Coincide com Supabase auth user ID |
| `email` | varchar(255) | Obrigatório |
| `name` | varchar(255) | Obrigatório |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `shared.households`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | varchar(255) | Obrigatório |
| `invite_code` | varchar(50) | Obrigatório, 8 chars alfanuméricos maiúsculos gerados aleatoriamente com `Random()` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `shared.household_users`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `user_id` | UUID | PK composta |
| `household_id` | UUID | PK composta |
| `role` | varchar(50) | `'owner'` ou `'member'` |
| `joined_at` | timestamptz | |

### Schema: `inventory`

#### `inventory.locations`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` CASCADE |
| `name` | varchar(100) | Obrigatório |
| `icon` | varchar(50) | Opcional, emoji ou chave de ícone |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `inventory.categories`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` |
| `name` | varchar(100) | Obrigatório |
| `type` | varchar(50) | `'pertences'` ou `'despensa'` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `inventory.items` — Pertences (bens duráveis)
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` |
| `name` | varchar(255) | Obrigatório |
| `description` | text | |
| `value` | decimal | Valor monetário |
| `photo_url` | text | Path do Supabase Storage |
| `location_id` | UUID FK | → `inventory.locations.id` ON DELETE SET NULL |
| `category_id` | UUID FK | → `inventory.categories.id` ON DELETE SET NULL |
| `quantity` | integer | Nullable |
| `destination` | varchar(50) | `Undecided\|Keep\|Sell\|Donate\|Trash` |
| `status` | varchar(20) NOT NULL | `'active'` (default) ou `'resolved'` |
| `resolved_at` | timestamptz NULL | Preenchido quando resolvido |
| `owner_id` | UUID FK | → `shared.users.id` (nullable) |
| `tags` | jsonb | Array stringificado (ex: `'["tag1","tag2"]'`) |
| `list_id` | UUID FK | → `inventory.lists.id` ON DELETE SET NULL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Nota sobre `destination` (PT-BR)**: os valores armazenados são em inglês (`Keep`, `Sell`, `Donate`, `Trash`, `Undecided`), mas os labels na UI são: Keep → Manter, Sell → Vender, Donate → Doar, Trash → Descartar, null/Undecided → Indefinido.

#### `inventory.lists`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | |
| `name` | varchar(255) | |
| `type` | varchar(50) | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `inventory.pantry_items` — Despensa (consumíveis)
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` |
| `location_id` | UUID FK | → `inventory.locations.id` ON DELETE SET NULL |
| `category_id` | UUID FK | → `inventory.categories.id` ON DELETE SET NULL |
| `name` | varchar(200) | Obrigatório |
| `notes` | varchar(500) | |
| `quantity` | decimal | Obrigatório |
| `unit` | varchar(20) | `"kg"`, `"L"`, `"un"`, etc. |
| `min_quantity` | decimal | Limiar de alerta; null = sem alerta |
| `expiration_date` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Campo computado — `status`**: `"low"` se `quantity <= min_quantity`, senão `"ok"`. Calculado em `PantryService.ToResponse()`, não persistido na DB.

**Nota sobre `PantryItem` no DbContext**: a entidade usa `.WithMany()` sem colecção inversa em `Location` e `Category` — decisão intencional para manter essas entidades sem dependência do domínio pantry.

### Schema: `finance`

#### `finance.accounts`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` CASCADE |
| `owner_id` | UUID FK | → `shared.users.id` (nullable) |
| `name` | varchar(100) | Obrigatório |
| `currency` | varchar(10) | `BRL`, `EUR`, `USD`, `PYG` |
| `type` | varchar(20) | `'account'` ou `'cc'` (cartão de crédito) |
| `close_day` | integer | Só CC: dia de fecho da fatura (1-31) |
| `due_day` | integer | Só CC: dia de vencimento (1-31) |
| `limit` | decimal | Só CC: limite de crédito |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `finance.transactions`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` CASCADE |
| `account_id` | UUID FK | → `finance.accounts.id` SET NULL (nullable) |
| `description` | varchar(200) | Obrigatório |
| `amount` | decimal | Obrigatório, > 0 |
| `currency` | varchar(10) | `BRL`, `EUR`, `USD`, `PYG` |
| `type` | varchar(20) | `'income'` ou `'expense'` |
| `category` | varchar(10) | Só expense: `lf\|cf\|co\|mt\|pr\|es` |
| `date` | date | Data da transação (YYYY-MM-DD) |
| `ref_month` | varchar(7) | Mês de referência (YYYY-MM) — calculado via `CalcRefMonth` para CC |
| `created_at` | timestamptz | |

**`CalcRefMonth`**: Para conta CC com `closeDay` definido — se `date.Day > closeDay` → `ref_month = mês seguinte`; caso contrário → `ref_month = mês da data`. Para contas normais → `ref_month = mês da data`.

#### `finance.templates`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK | → `shared.households.id` CASCADE |
| `account_id` | UUID FK | → `finance.accounts.id` SET NULL (nullable) |
| `description` | varchar(200) | Obrigatório |
| `amount` | decimal | Obrigatório |
| `currency` | varchar(10) | |
| `type` | varchar(20) | `'income'` ou `'expense'` |
| `category` | varchar(10) | Opcional |
| `day_of_month` | integer | Dia do mês para a data da transação gerada (1-28) |
| `created_at` | timestamptz | |

#### `finance.budget` — singleton por household
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK UNIQUE | → `shared.households.id` CASCADE |
| `income` | decimal | Rendimento esperado |
| `income_currency` | varchar(10) | Moeda do rendimento |
| `goals` | jsonb | `{ "lf": 10, "cf": 40, "co": 15, "mt": 5, "pr": 10, "es": 20 }` (% por categoria) |
| `updated_at` | timestamptz | |

#### `finance.rates` — singleton por household
| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK UNIQUE | → `shared.households.id` CASCADE |
| `brl` | decimal | Taxa BRL (sempre 1.0 — base) |
| `eur` | decimal | Taxa EUR→BRL (ex: 6.0) |
| `usd` | decimal | Taxa USD→BRL (ex: 5.5) |
| `pyg` | decimal | Taxa PYG→BRL (ex: 0.0007) |
| `updated_at` | timestamptz | |

**Fallback de rates**: Se não houver rates configuradas para o household, o dashboard usa `{ BRL:1, EUR:6.0, USD:5.5, PYG:0.0007 }`.

---

## 6. Endpoints da API

Todos os endpoints requerem `Authorization: Bearer {supabase_jwt}` excepto `/api/health`.

### Envelope de resposta (maioria dos endpoints)

```json
{ "success": true, "message": "...", "data": {...}, "timestamp": "..." }
```

### Shapes de erro

```json
// Validation error (400) — FluentValidation
{ "message": "Validation failed", "errors": { "field": ["msg1"] }, "timestamp": "..." }

// Erros gerais
{ "statusCode": 404, "message": "Resource not found", "details": "...", "timestamp": "..." }
```

---

### `GET /api/health`
Sem auth. Retorna `{ status: "healthy", timestamp, service }`.

---

### Users — `/api/users` [Authorize]

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/users/me` | Perfil do user actual | `ApiResponse<UserResponse>` |
| `PUT` | `/api/users/me` | Actualiza nome do user | `ApiResponse<UserResponse>` |

**UpdateUserRequest**: `{ name: string }` (obrigatório, max 255 chars)

**UserResponse**: `{ id, email, name, createdAt, updatedAt }`

**Nota de implementação**: `UsersController` acede ao `DbContext` directamente (sem camada de serviço).

---

### Household — `/api/household` [Authorize]

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/household` | Todos os households do user | `ApiResponse<List<Household>>` |
| `GET` | `/api/household/{id}` | Household único (inclui `householdUsers[]`) | `ApiResponse<Household>` |
| `POST` | `/api/household` | Criar household (role `owner`) | 201 + `ApiResponse<Household>` |
| `POST` | `/api/household/join/{inviteCode}` | Aderir a household (role `member`) | `ApiResponse<Household>` |

**CreateHouseholdRequest**: `{ name: string }` (min 2, max 255 chars)

**Nota**: `HouseholdController.GetMyHouseholds()` chama `m_householdService.GetMyHouseholds(Guid.Empty, GetUserId())` — o primeiro parâmetro `Guid.Empty` é um artefacto da assinatura do serviço; o serviço ignora-o.

**⚠️ Naming por resolver**: `HouseholdController` usa `m_householdService` (Hungarian ✅) mas `_context` (underscore ⚠️). `HouseholdService` usa `_logger` e `_context` (underscore ⚠️ — deveria ser `m_logger`, `m_context`).

---

### Inventory (Pertences) — `/api/inventory` [Authorize]

Todos os GET/POST retornam `ApiResponse<T>`. PUT retorna 204. DELETE retorna 204.

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/inventory/items` | Itens paginados | `ApiResponse<PagedResponse<ItemResponse>>` |
| `GET` | `/api/inventory/items/search` | Pesquisa por nome | `ApiResponse<PagedResponse<ItemResponse>>` |
| `GET` | `/api/inventory/items/counts/by-location` | Contadores por localização | `ApiResponse<List<LocationCountResponse>>` |
| `GET` | `/api/inventory/items/counts/by-destination` | Contadores por destino | `ApiResponse<List<DestinationCountResponse>>` |
| `GET` | `/api/inventory/items/{id}` | Item único | `ApiResponse<ItemResponse>` |
| `POST` | `/api/inventory/items` | Criar item | 201 + `ApiResponse<ItemResponse>` |
| `PUT` | `/api/inventory/items/{id}` | Actualizar item | 204 No Content |
| `DELETE` | `/api/inventory/items/{id}` | Apagar item | 204 No Content |
| `POST` | `/api/inventory/items/{id}/resolve` | Marcar resolvido | `ApiResponse<ItemResponse>` |
| `POST` | `/api/inventory/items/{id}/restore` | Restaurar para activo | `ApiResponse<ItemResponse>` |

**Query params — `GET /api/inventory/items`:**
- `householdId?` (Guid)
- `locationId?` (string — Guid normal ou `"null"` para itens sem localização)
- `destination?` (string — valor normal ou `"null"` para itens sem destino)
- `category?` (string — nome da categoria)
- `status?` (string — `"active"` default | `"resolved"`)
- `page?` (int — default 1)
- `pageSize?` (int — default 30, máximo 50)

Ordenação: sempre `OrderByDescending(CreatedAt)`.

**Query params — `GET /api/inventory/items/search`:**
- `householdId?` (Guid)
- `q` (string — mínimo 2 caracteres — retorna 400 via `ErrorResponse` se inválido)
- `page?` (int — default 1)
- `pageSize?` (int — default 30, máximo 50)

Pesquisa com `EF.Functions.ILike` no campo `Name`. Apenas `status = "active"`. Ordenação: `OrderByDescending(CreatedAt)`.

**Query params — `GET /api/inventory/items/counts/by-location`:**
- `householdId` (Guid — obrigatório)

Apenas `status = "active"`. Ordenado: itens com localização por count descendente; "Sem localização" (`locationId: null`) sempre por último.

**Query params — `GET /api/inventory/items/counts/by-destination`:**
- `householdId` (Guid — obrigatório)

Apenas `status = "active"`. Ordenação: `keep → sell → donate → discard → null`. Nota: a chave de ordenação usa lowercase (`"discard"`) mas os valores armazenados são title-case (`"Trash"`); a comparação usa `StringComparer.OrdinalIgnoreCase`.

**`PagedResponse<T>`:**
```json
{ "items": [], "total": 412, "page": 1, "pageSize": 30, "hasMore": true }
```

**`LocationCountResponse`:**
```json
{ "locationId": "uuid|null", "locationName": "Guarda-roupa", "icon": "👗", "count": 121 }
```

**`DestinationCountResponse`:**
```json
{ "destination": "sell|null", "count": 34 }
```

**`ResolveItemRequest`**: `{ destination: string }` — define `status = "resolved"`, `resolved_at = now`, `destination = <value>`.

**Restore** (sem body): define `status = "active"`, `resolved_at = null`.

**`CreateItemRequest`** (record C#):
```
HouseholdId, Name, Description?, Value?, PhotoUrl?,
Destination?, OwnerId?, Tags? (JSONB string), ListId?,
LocationId?, CategoryId?, Quantity? (integer)
```
Nota: sem campo `Location` (string legado — removido na migration `RemoveLegacyLocationField`).

**`ItemResponse`**: `{ id, householdId, name, description?, value?, photoUrl?, locationId?, locationName?, categoryId?, categoryName?, quantity?, destination?, ownerId?, status, resolvedAt?, createdAt, updatedAt }`
Nota: `tags` e `listId` **não** são expostos no DTO de resposta.

---

### Locations — `/api` [Authorize]

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/households/{householdId}/locations` | Todas as locations de um household | `ApiResponse<List<LocationResponse>>` |
| `POST` | `/api/households/{householdId}/locations` | Criar location | 201 + `ApiResponse<LocationResponse>` |
| `PUT` | `/api/locations/{id}` | Actualizar location | `ApiResponse<LocationResponse>` |
| `DELETE` | `/api/locations/{id}` | Apagar location (itens → `location_id = null`) | `ApiResponse<bool>` |

**CreateLocationRequest**: `{ name: string, icon?: string }`
**UpdateLocationRequest**: `{ name?: string, icon?: string }`
**LocationResponse**: `{ id, householdId, name, icon?, createdAt }`

---

### Categories — `/api` [Authorize]

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/households/{householdId}/categories` | Todas as categories (filtro `?type=pertences\|despensa`) | `ApiResponse<List<CategoryResponse>>` |
| `POST` | `/api/households/{householdId}/categories` | Criar category | 201 + `ApiResponse<CategoryResponse>` |
| `PUT` | `/api/categories/{id}` | Actualizar category | `ApiResponse<CategoryResponse>` |
| `DELETE` | `/api/categories/{id}` | Apagar category | `ApiResponse<bool>` |

**CreateCategoryRequest**: `{ name: string, type: string }`
**UpdateCategoryRequest**: `{ name?: string }`
**CategoryResponse**: `{ id, householdId, name, type, createdAt }`

---

### Pantry (Despensa) — `/api/pantry` [Authorize]

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/pantry/items` | Itens da despensa (householdId obrigatório) | `ApiResponse<List<PantryItemResponse>>` |
| `GET` | `/api/pantry/items/{id}` | Item único | `ApiResponse<PantryItemResponse>` |
| `POST` | `/api/pantry/items` | Criar item | 201 + `ApiResponse<PantryItemResponse>` |
| `PUT` | `/api/pantry/items/{id}` | Actualizar item | `ApiResponse<PantryItemResponse>` (200 com body) |
| `DELETE` | `/api/pantry/items/{id}` | Apagar item | `ApiResponse<bool>` (200 com body) |

Nota: PUT e DELETE do Pantry retornam **200 com body** (ao contrário do Inventory que retorna 204).

**Query params** (GET list): `householdId` (obrigatório), `locationId?`, `category?`, `status?` (`"low"` ou `"ok"`)

O filtro por `status` é aplicado **após** a query à DB (campo computado — não é coluna).

**`PantryItemResponse`**: `{ id, householdId, name, quantity, unit?, minQuantity?, expirationDate?, locationId?, locationName?, categoryId?, categoryName?, notes?, status ("ok"|"low"), createdAt, updatedAt }`

---

### Finance — `/api/finance` [Authorize]

#### Contas — `/api/finance/accounts`

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/finance/accounts` | Listar contas (`?householdId`) | `ApiResponse<List<FinanceAccountResponse>>` |
| `POST` | `/api/finance/accounts` | Criar conta | 201 + `ApiResponse<FinanceAccountResponse>` |
| `PUT` | `/api/finance/accounts/{id}` | Actualizar conta | `ApiResponse<FinanceAccountResponse>` |
| `DELETE` | `/api/finance/accounts/{id}` | Apagar conta | `ApiResponse<bool>` |
| `POST` | `/api/finance/accounts/import` | Import JSON de contas/cartões | `ApiResponse<ImportResult>` |

**`FinanceAccountResponse`**: `{ id, householdId, ownerId?, name, currency, type, closeDay?, dueDay?, limit?, createdAt }`

**`ImportResult`**: `{ imported: int, skipped: int }`

#### Transações — `/api/finance/transactions`

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/finance/transactions` | Listar (paginado) | `ApiResponse<PagedResponse<FinanceTransactionResponse>>` |
| `GET` | `/api/finance/transactions/{id}` | Transação única | `ApiResponse<FinanceTransactionResponse>` |
| `POST` | `/api/finance/transactions` | Criar transação | 201 + `ApiResponse<FinanceTransactionResponse>` |
| `PUT` | `/api/finance/transactions/{id}` | Actualizar transação | `ApiResponse<FinanceTransactionResponse>` |
| `DELETE` | `/api/finance/transactions/{id}` | Apagar transação | `ApiResponse<bool>` |
| `POST` | `/api/finance/transactions/import` | Import JSON de transações | `ApiResponse<ImportResult>` |

**Query params** (GET list): `householdId` (obrigatório), `month?` (YYYY-MM), `accountId?`, `type?` (`income`|`expense`), `category?`, `page?` (default 1), `pageSize?` (default 50, máximo 100)

**`FinanceTransactionResponse`**: `{ id, householdId, accountId?, accountName?, description, amount, currency, type, category?, date, refMonth, createdAt }`

**`CreateTransactionRequest`**: `{ householdId, accountId?, description, amount, currency, date, type, category?, refMonth? }`

**`UpdateTransactionRequest`**: `{ accountId?, description, amount, currency, date, type, category?, refMonth? }`

**Nota**: Se `accountId` for fornecido e a conta for CC, `refMonth` é calculado automaticamente via `CalcRefMonth`. Se `refMonth` for enviado explicitamente, esse valor tem precedência.

#### Templates Recorrentes — `/api/finance/templates`

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/finance/templates` | Listar templates (`?householdId`) | `ApiResponse<List<FinanceTemplateResponse>>` |
| `POST` | `/api/finance/templates` | Criar template | 201 + `ApiResponse<FinanceTemplateResponse>` |
| `DELETE` | `/api/finance/templates/{id}` | Apagar template | `ApiResponse<bool>` |
| `POST` | `/api/finance/templates/apply` | Aplicar templates ao mês | `ApiResponse<ApplyResult>` |

**`ApplyResult`**: `{ applied: int, skipped: int }` — skipped quando já existe transação com mesma descrição+refMonth

**`FinanceTemplateResponse`**: `{ id, householdId, accountId?, description, amount, currency, type, category?, dayOfMonth, createdAt }`

#### Orçamento — `/api/finance/budget`

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/finance/budget` | Orçamento do household (`?householdId`) | `ApiResponse<FinanceBudgetResponse>` |
| `PUT` | `/api/finance/budget` | Criar/actualizar orçamento (upsert) | `ApiResponse<FinanceBudgetResponse>` |

**`FinanceBudgetResponse`**: `{ id, householdId, income, incomeCurrency, goals: { lf, cf, co, mt, pr, es }, updatedAt }`

#### Câmbio — `/api/finance/rates`

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/finance/rates` | Taxas do household (`?householdId`) | `ApiResponse<FinanceRatesResponse>` |
| `PUT` | `/api/finance/rates` | Criar/actualizar taxas (upsert) | `ApiResponse<FinanceRatesResponse>` |

**`FinanceRatesResponse`**: `{ id, householdId, brl, eur, usd, pyg, updatedAt }`

#### Dashboard — `/api/finance/dashboard`

| Método | Rota | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/finance/dashboard` | Dashboard calculado (`?householdId&month=YYYY-MM`) | `ApiResponse<FinanceDashboardResponse>` |

**`FinanceDashboardResponse`**:
```json
{
  "month": "2026-04",
  "baseCurrency": "BRL",
  "totalIncome": 10000.00,
  "totalExpenses": 7500.00,
  "balance": 2500.00,
  "byCategory": [
    { "category": "cf", "label": "Custo Fixo", "total": 3200, "budget": 4000, "usedPct": 80 }
  ],
  "invoices": [
    { "accountId": "...", "accountName": "Nubank", "total": 1500, "limit": 5000, "usedPct": 30, "isOverLimit": false }
  ],
  "history": [
    { "month": "2026-03", "income": 9800, "expenses": 7200 }
  ]
}
```

**Lógica de cálculo**: Ver `pensamentos/reports/finance-module-analysis.md` para explicação detalhada de `CalcRefMonth`, `ToBase()`, `EffectiveIncome`, `ByCategory`, Invoices e History.

---

## 7. Validators FluentValidation

Todos os validators são auto-descobertos via `AddValidatorsFromAssemblyContaining<Program>()`.

| Validator | Regras principais |
|-----------|------------------|
| `CreateItemRequestValidator` | `HouseholdId` NotEmpty; `Name` NotEmpty max 255; `Description` max 1000 (se presente); `Value` >= 0 (se presente); `Destination` deve ser `Undecided\|Keep\|Sell\|Donate\|Trash` (se presente) |
| `UpdateItemRequestValidator` | Mesmas regras opcionais do Create |
| `CreateHouseholdRequestValidator` | `Name` NotEmpty, min 2, max 255 |
| `CreateLocationRequestValidator` | `Name` NotEmpty max 100; `Icon` max 50 |
| `UpdateLocationRequestValidator` | `Name` max 100 (se presente); `Icon` max 50 (se presente) |
| `CreateCategoryRequestValidator` | `Name` NotEmpty max 100; `Type` obrigatório, deve ser `"pertences"` ou `"despensa"` |
| `UpdateCategoryRequestValidator` | `Name` max 100 (se presente) |
| `CreatePantryItemRequestValidator` | `HouseholdId` NotEmpty; `Name` NotEmpty max 200; `Quantity` >= 0; `Unit` max 20; `MinQuantity` >= 0; `Notes` max 500 |
| `UpdatePantryItemRequestValidator` | Mesmas regras opcionais |
| `UpdateUserRequestValidator` | `Name` NotEmpty max 255 |
| `CreateTransactionRequestValidator` | `HouseholdId` NotEmpty; `Description` NotEmpty max 200; `Amount` > 0; `Currency` em lista; `Date` NotEmpty; `Type` `income\|expense`; `Category` válido se expense |
| `UpdateTransactionRequestValidator` | Mesmas regras opcionais sem `HouseholdId` |
| `CreateAccountRequestValidator` | `HouseholdId` NotEmpty; `Name` NotEmpty max 100; `Currency` em lista; `Type` `account\|cc`; `CloseDay` 1–31 (se presente); `DueDay` 1–31 (se presente); `Limit` >= 0 (se presente) |
| `CreateTemplateRequestValidator` | `HouseholdId` NotEmpty; `Description` NotEmpty max 200; `Amount` > 0; `Currency` em lista; `Type` `income\|expense`; `DayOfMonth` 1–28 |

---

## 8. Frontend Web — Páginas e Componentes

> ⚠️ O frontend Web é **legado** e actualmente **quebrado** para o endpoint `GET /api/inventory/items` (ver §1). Documentado aqui para referência histórica e para facilitar eventual actualização.

### Rotas

```
/           → redirect /dashboard
/login      → LoginComponent (sem auth guard)
/dashboard  → DashboardComponent   (AppShell)
/inventory  → InventoryComponent   (AppShell)
/finance    → FinanceComponent      (AppShell)
/tasks      → TasksComponent       (AppShell — stub)
**          → redirect /dashboard
```

### Serviços (Frontend)

| Serviço | Métodos chave | Estado |
|---------|--------------|--------|
| `SupabaseService` | `signIn/Up/Out`, `getSession`, `getAccessToken`, `uploadItemPhoto`, `createSignedUrls`, `deleteItemPhoto` | ✅ Actualizado |
| `HouseholdService` | `getMyHouseholds()`, `createHousehold()`, `joinHousehold()`, `selectHousehold()`, `getSelectedHousehold()`; `selectedHousehold$` BehaviorSubject | ✅ Actualizado |
| `InventoryService` | `getItems()`, `getItem()`, `createItem()`, `updateItem()`, `deleteItem()` | ⚠️ **Desactualizado** — não suporta paginação, sem `resolveItem()`/`restoreItem()` |
| `LocationService` | `getLocations()`, `addLocation()`, `updateLocation()`, `deleteLocation()` | ✅ Actualizado |
| `CategoryService` | `getCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()` | ✅ Actualizado |
| `PantryService` | `getItems()`, `getItem()`, `createItem()`, `updateItem()`, `deleteItem()` | ✅ Actualizado |
| `FinanceService` | `getAccounts()`, `createAccount()`, `updateAccount()`, `deleteAccount()`, `importAccounts()`, `getTransactions()`, `createTransaction()`, `updateTransaction()`, `deleteTransaction()`, `importTransactions()`, `getTemplates()`, `createTemplate()`, `deleteTemplate()`, `applyTemplates()`, `getBudget()`, `upsertBudget()`, `getRates()`, `upsertRates()`, `getDashboard()` | ✅ Implementado |

### Modelos Finance (Frontend)

- `finance-account.model.ts` — `FinanceAccount`, `CreateAccountRequest`, `UpdateAccountRequest`, `ImportAccountItem`
- `finance-transaction.model.ts` — `FinanceTransaction`, `CreateTransactionRequest`, `UpdateTransactionRequest`, `FinanceTemplate`, `CreateTemplateRequest`, `PagedResponse<T>`, `ImportResult`, `ApplyResult`, `TransactionCategory`
- `finance-budget.model.ts` — `FinanceBudget`, `UpsertBudgetRequest`, `FinanceRates`, `UpsertRatesRequest`, `FinanceDashboard`, `CATEGORY_LABELS`, `CATEGORY_COLORS`, `FinanceCategory`, `SUPPORTED_CURRENCIES`

### `FinanceComponent`

6 tabs usando `PillTabsComponent`: **Painel**, **Transações**, **Recorrentes**, **Contas**, **Orçamento**, **Câmbio**. Botão "Importar" abre `ImportModalComponent`. Selector de mês (input `type="month"`). Propagação de `householdId` e `month` a todos os tabs via `@Input`.

### `ImportModalComponent`

Modal de import JSON com toggle de modo (`'transactions'` | `'accounts'`). Parse e validação client-side antes de submeter. Chama `importTransactions()` ou `importAccounts()` conforme o modo. Em modo transactions, mostra painel com IDs das contas disponíveis.

### Modelo `InventoryItem` (Frontend) — Gaps Conhecidos

O model `inventory-item.model.ts` está desactualizado face ao `ItemResponse` do backend:
- ❌ Falta `status: string` (active/resolved)
- ❌ Falta `resolvedAt?: Date`
- ❌ Tem `location?: string` (campo legado removido do backend)
- ❌ `CreateItemRequest` tem `location?: string` (campo legado)

### `ItemFormComponent`

Componente de criação/edição/eliminação de itens. Funcionalidades:
- Formulário reactivo (`ReactiveFormsModule`)
- Upload de foto para Supabase Storage via `uploadItemPhoto()` (path: `items/{tempId}-{timestamp}.{ext}`)
- Preview de foto existente via `createSignedUrls()`
- Delete de item inclui limpeza best-effort da foto no Storage via `deleteItemPhoto()`
- Confirmação modal antes de apagar

### `destination.enum.ts` (Frontend)

```typescript
enum Destination { Keep = 'Keep', Sell = 'Sell', Donate = 'Donate', Trash = 'Trash' }

DESTINATION_LABELS = { Keep: 'Manter', Sell: 'Vender', Donate: 'Doar', Trash: 'Descartar' }

DESTINATION_FILTER_OPTIONS = [
  { value: 'Todos', label: 'Todos' },
  { value: 'Indefinido', label: 'Indefinido' },  // apanha null e 'Undecided'
  { value: 'Keep', label: 'Manter' },
  { value: 'Sell', label: 'Vender' },
  { value: 'Donate', label: 'Doar' },
  { value: 'Trash', label: 'Descartar' },
]
```

---

## 9. Design System (Web)

### Paleta de Cores

| Papel | Classes Tailwind |
|-------|-----------------|
| Primary / activo | `emerald-600`, `emerald-700` (hover) |
| Background | `stone-50`, `stone-100` |
| Surface / card | `white`, `stone-100` |
| Borda | `stone-200` |
| Texto primário | `stone-800`, `stone-900` |
| Texto secundário | `stone-500`, `stone-600` |
| Aviso / low stock | `amber-*` |
| Status ok | `green-*` |
| Status low | `red-*` |
| Destino Keep | `emerald-600` |
| Destino Sell | `blue-600` |
| Destino Donate | `violet-600` |
| Destino Trash | `red-600` |

### Config Tailwind v4

`postcss.config.json` (DEVE ser JSON — Angular esbuild ignora `.js`/`.mjs`):
```json
{ "plugins": { "@tailwindcss/postcss": {} } }
```

`styles.css`:
```css
@import "tailwindcss";
@source "./app/**/*.html";
@source "./app/**/*.ts";   /* Necessário para classes geradas em métodos .ts */
```

### Linguagem

- **Texto UI**: Português (PT-BR)
- **Código**: Inglês (variáveis, funções, comentários, commit messages)

---

## 10. Setup de Desenvolvimento

### Pré-requisitos
- .NET 10 SDK
- Node.js 22+ / npm 11
- PostgreSQL via Supabase (ou instância local)

### Backend

```bash
cd src/HomeManager.API

# Configurar secrets (dev — nunca committed)
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Port=5432;..."
dotnet user-secrets set "Supabase:Url" "https://your-project.supabase.co"

# Correr (escuta em http://localhost:8080)
dotnet run --project src/HomeManager.API

# Swagger UI disponível em:
# http://localhost:8080/swagger (só em development)
```

### Frontend Web

```bash
cd src/HomeManager.Web
npm install
npm start        # http://localhost:4200
npm run build    # Output: dist/home-manager.web/browser/
```

### Migrações da Base de Dados

```bash
cd src/HomeManager.API

dotnet ef database update          # Aplicar migrações pendentes
dotnet ef migrations add NomeMig   # Criar nova migração
dotnet ef migrations script        # Gerar SQL script
```

A `ApplicationDbContextFactory` lê a connection string de: `DATABASE_URL` env var → `appsettings.Development.json` → `dotnet user-secrets`.

### Deployment

**Frontend Web**: Vercel. Push para `main` dispara deploy automático. `vercel.json` redireciona todas as rotas para `index.html` (SPA). Env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_URL`) configuradas no dashboard Vercel e injectadas por `scripts/inject-env.js` no `prebuild`.

**Backend**: Dockerfile presente. Porta lida de `PORT` env var (default 8080). Secrets via variáveis de ambiente.

### Variáveis de Ambiente (Backend)

| Variável | Propósito |
|----------|-----------|
| `DATABASE_URL` | Connection string Postgres completa |
| `SUPABASE_URL` | URL do projecto Supabase (sem trailing slash) |
| `PORT` | Porta HTTP (default: `8080`) |
| `AllowedOrigins` | Origens CORS separadas por ponto-e-vírgula (default: `http://localhost:4200`) |

### Variáveis de Ambiente (Frontend Web — Vercel)

| Variável | Propósito |
|----------|-----------|
| `SUPABASE_URL` | URL do projecto Supabase |
| `SUPABASE_ANON_KEY` | Chave anon/pública Supabase |
| `API_URL` | URL base do backend |

---

## 11. Estado Actual e Gaps Conhecidos

### Totalmente funcional end-to-end
- Autenticação (Supabase signup/signin, fluxo JWT); login com toggle de visibilidade da password
- Household criar, juntar, listar
- Pertences: CRUD completo com agrupamento por localização, display de quantidade (×N), chips de filtro por destino, atribuição de categoria via item-form
- Pertences: resolve/restore workflow (`POST .../resolve`, `POST .../restore`) — **backend funcional**
- Locations: CRUD completo end-to-end incluindo modais de edição e eliminação
- Categories: CRUD completo no backend; atribuíveis a itens via item-form
- PantryController: CRUD completo no backend
- Dashboard: carregamento de dois níveis (householdsLoading + dataLoading); summary widget mostra valor total real + contagem de low-stock real
- Users: `GET /api/users/me` e `PUT /api/users/me`
- **Finance** (2026-04-25): CRUD completo de contas, transações (com conta obrigatória + edição inline), templates recorrentes, orçamento e câmbio. Dashboard calculado com histórico 6 meses, faturas CC e progresso por categoria. Import JSON de transações e contas/cartões.

### A usar mock data
- Timeline widget do Dashboard

### Bugs e gaps conhecidos

| ID | Descrição | Impacto | Prioridade |
|----|-----------|---------|------------|
| BUG-01 | Frontend `InventoryService.getItems()` não suporta `PagedResponse` — UI quebrada para listagem de Pertences | Alto | Alta |
| BUG-02 | Frontend `InventoryItem` model sem `status` e `resolvedAt` | Médio (resolve/restore UI impossível) | Média |
| GAP-01 | `InventoryService` (frontend) sem `resolveItem()` / `restoreItem()` | Nenhum UI para workflow de resolução | Média |
| GAP-02 | Chips de filtro de categoria no listing Pertences estão ocultos (`class="hidden"`) | Feature invisível | Baixa |
| GAP-03 | UI da Despensa pendente ("Em breve" activo; backend funcional) | Módulo inteiro bloqueado | Alta |
| GAP-04 | `GET /api/dashboard/summary` e `GET /api/dashboard/timeline` não implementados | Dashboard usa mock para timeline | Baixa |
| GAP-05 | `GET /api/household/{id}/members` não implementado | Lista de membros não exposta | Baixa |
| GAP-06 | `tags` armazenado como string JSONB (array stringificado) — não é sistema FK | Pesquisa/filtragem por tag frágil | Baixa |
| GAP-07 | `InviteCode` gerado com `Random()` (não criptográfico) | Segurança teórica — baixo risco prático | Baixa |
| GAP-08 | `categoryId` removido do Mobile intencionalmente; API ainda expõe `categoryId` em `ItemResponse`, `CreateItemRequest`, `UpdateItemRequest` e `CategoryController` | Contrato da API desalinhado com o cliente primário | Média |
| DEBT-01 | `HouseholdService._logger`, `_context` usam underscore em vez de `m_` | Inconsistência com padrão Hungarian | Baixa |
| DEBT-02 | Maioria dos services usa `_` em vez de `m_` | Inconsistência com padrão Hungarian | Baixa |
| DEBT-03 | `HouseholdController.GetMyHouseholds()` passa `Guid.Empty` como primeiro arg — parâmetro morto | Code smell | Baixa |

---

## 12. Convenções de Nomenclatura

| Conceito | Termo correcto | Evitar |
|----------|---------------|--------|
| Módulo de bens duráveis | **Pertences** | "Bens Duráveis" (nome antigo) |
| Módulo de consumíveis | **Despensa** | "Pantry" (inglês) na UI |
| Agrupamento físico | **Location** (Localização) | "Room", "Place" |
| Filtro secundário | **Category** (Categoria) | "Tag" (tags é um campo diferente) |

- Todo o **texto UI**: Português (PT-BR)
- Todo o **código**: Inglês (class names, métodos, variáveis, comentários)
- **Naming convention C# — Hungarian notation**: campos privados de instância devem usar prefixo `m_` (ex: `m_householdService`, `m_context`). Desvios são marcados como ⚠️ por resolver.
- `inventory.items` → "Pertences" na UI; `inventory.pantry_items` → "Despensa"
- Categories têm campo `type`: `"pertences"` ou `"despensa"` — string lowercase, não enum
- Rota `/api/inventory` é o nome do módulo; sub-tipos são `pertences`/`despensa`
- Valores de `destination` armazenados: `Keep`, `Sell`, `Donate`, `Trash`, `Undecided` (title-case)
- Labels PT-BR: Keep→Manter, Sell→Vender, Donate→Doar, Trash→Descartar, null/Undecided→Indefinido

---

## 13. Restrições — Nunca Faça sem Aprovação Explícita

### Dependências — não actualizar/adicionar sem justificação

| Restrição | Razão |
|-----------|-------|
| **Não actualizar `Npgsql` para v10+** | v10 tem bug com batch commands que causa `ObjectDisposedException`. Apenas actualizar após confirmação do fix upstream |
| **Não adicionar `NgModule` ao frontend Web** | Arquitectura é 100% standalone components. `NgModule` seria uma regressão arquitectural |
| **Não usar `Angular Material` na UI** | Stack de UI é Tailwind puro. `@angular/material` está instalado mas não usado — não introduzir componentes Material |
| **Não mudar `postcss.config.json` para `.js`/`.mjs`** | O builder `@angular/build:application` (esbuild) só lê configs PostCSS em JSON. `.js`/`.mjs` são silenciosamente ignorados |
| **Não usar `@tailwindcss/vite` ou config v3** | Tailwind v4 usa `@tailwindcss/postcss`. A API de configuração v3 (`tailwind.config.js`) não é compatível |

### Padrões — não quebrar

| Restrição | Razão |
|-----------|-------|
| **Não alterar a ordem do middleware pipeline** | `UserSyncMiddleware` depende do user já autenticado. Qualquer reordenação pode causar `NullReferenceException` nas claims ou falhas de autorização |
| **Não partilhar `DbContext` entre `UserSyncMiddleware` e controllers** | Causa `ObjectDisposedException` no Npgsql. O middleware DEVE criar o seu próprio scope via `IServiceScopeFactory` |
| **Não remover `ReferenceHandler.IgnoreCycles` do JSON** | Necessário para propriedades de navegação bidireccional (`Household ↔ HouseholdUser`). Remover causa loops infinitos de serialização |
| **Não fazer queries sem filtro de `HouseholdUser`** | Toda a data access deve incluir `.Where(h => h.HouseholdUsers.Any(hu => hu.UserId == userId))`. Row-level security é enforced na aplicação |
| **Não expor `tags` e `listId` no `ItemResponse`** | Decisão de design — campos internos não fazem parte do contrato público da API |
| **Não usar `ChangeDetectorRef`/`markForCheck()` no frontend** | Arquitectura é 100% Signals. `OnPush` e manual change detection são padrões incompatíveis com signals |

### Ficheiros sensíveis — não alterar sem revisão

| Ficheiro | Razão |
|---------|-------|
| `src/HomeManager.API/Data/Migrations/` | Migrações são irreversíveis em produção. Qualquer alteração requer coordenação com o Mobile |
| `src/HomeManager.API/Extensions/ServiceCollectionExtensions.cs` | Alterações ao pipeline de DI afectam toda a aplicação |
| `src/HomeManager.API/Program.cs` | Alterações à ordem do middleware podem quebrar auth/sync |
| `src/HomeManager.API/appsettings.Production.json` | Configurações de produção |
| `src/HomeManager.Web/src/environments/environment.ts` | Contém placeholders de produção injectados pelo Vercel |

### Decisões já tomadas — não reverter

| Decisão | Porquê |
|---------|--------|
| `ValidAudience = "authenticated"` | Supabase emite JWTs com `aud: "authenticated"`. Esta é a audiência correcta |
| PantryItem sem inverse collection em Location/Category | Decisão deliberada para manter `Location` e `Category` sem acoplamento ao domínio pantry |
| `IMemoryCache` em `UserSyncMiddleware` | Optimização de performance — sem cache, cada request autenticada faria um upsert à DB |

---

## 14. Relação entre Repositórios

Este backend é **partilhado** entre dois clientes:

| Cliente | Repositório | Estado |
|---------|-------------|--------|
| **HomeManager.Mobile** | `HomeManager.Mobile` (repo separado) | **Cliente primário** |
| HomeManager.Web | Este repositório (`src/HomeManager.Web`) | Legado/desactualizado |

### O que é partilhado

- **API REST** — todos os endpoints documentados no §6
- **Schema da DB** — migrations afectam ambos os clientes
- **Contratos de resposta** — `ItemResponse`, `PagedResponse`, `ApiResponse<T>`, etc.
- **Autenticação** — Supabase JWT, mesmo projecto Supabase
- **Supabase Storage** — bucket `item-photos`

### Regras de compatibilidade

| Regra | Detalhe |
|-------|---------|
| **Mudanças breaking à API requerem coordenação** | Renomear campos em `ItemResponse`, mudar tipos, remover endpoints — qualquer mudança que quebre contratos existentes deve ser coordenada com o desenvolvimento Mobile antes do deploy |
| **Migrações são irreversíveis** | Uma migração aplicada em produção afecta os dados de todos os clientes. Testar localmente antes de fazer push |
| **Adicionar campos é safe; remover não é** | Novos campos opcionais nos DTOs são geralmente backwards-compatible. Remover/renomear campos existentes quebra clientes que dependem deles |
| **`status` padrão é `"active"`** | O campo `status` em `InventoryItem` tem default `"active"`. Qualquer cliente que não envie `status` recebe itens activos |
| **Paginação é obrigatória no Mobile** | O Mobile provavelmente depende de `PagedResponse` para listagens longas. O frontend Web ainda não foi actualizado |

### Impacto de mudanças no backend sobre o Mobile

Sempre que alterar:
- **Shape de `ItemResponse`** → Verificar se o Mobile tem fields opcionais ou parsing defensivo
- **Migrations de DB** → Coordenar com o Mobile para garantir que não há dados em estado inconsistente
- **Novos endpoints** → Documentar aqui antes de implementar no Mobile
- **Mudanças no fluxo de auth** → O Mobile usa o mesmo Supabase JWT — mudanças na validação afectam ambos

---

## 15. Padrões de Teste

### Estado actual (2026-04-02)

**Zero testes escritos** no repositório. As ferramentas estão instaladas mas não usadas:

| Ferramenta | Localização | Estado |
|------------|-------------|--------|
| Vitest | `src/HomeManager.Web/devDependencies` | Instalado, sem testes |
| jsdom | `src/HomeManager.Web/devDependencies` | Instalado (ambiente de browser para Vitest) |
| `ng test` | Script em `package.json` | Configurado, sem testes |
| xUnit / NUnit / MSTest | Backend | **Não instalado** |

### Padrões de mock existentes

O frontend usa mock data isolado em `core/mock/`:
- `dashboard.mock.ts` — eventos de timeline
- `inventory.mock.ts` — `MOCK_LOCATIONS`, `MOCK_PERTENCES_ITEMS`, `MOCK_DESPENSA_ITEMS`

Estes mocks são facilmente substituíveis por chamadas reais ao serviço (padrão intencional).

### O que testar vs o que não precisa de teste

**Deve ser testado (quando os testes forem implementados):**
- Validators FluentValidation — lógica de validação com edge cases
- `PantryService.ToResponse()` — lógica de cálculo de `status` ("ok"/"low")
- `InventoryService.GetCountsByLocationAsync()` e `GetCountsByDestinationAsync()` — lógica de ordenação
- `HouseholdService.GenerateInviteCode()` — unicidade e formato
- `UserSyncMiddleware` — comportamento de cache (hit/miss)
- Guards e interceptors Angular — comportamento de autenticação

**Não precisa de teste:**
- Scaffolding/boilerplate de controllers (passthrough para services)
- Configuração de DI em `ServiceCollectionExtensions`
- Migrations de EF Core (já validadas pelo `dotnet ef database update`)
- Componentes Angular puramente de apresentação sem lógica

### Padrão recomendado para testes futuros

- **Backend**: xUnit com base de dados real (não mock do DbContext) — lição aprendida de incidentes passados onde mock/prod divergiam
- **Frontend**: Vitest + Testing Library — testar comportamento observável, não implementação

---

## 16. Backlog com Critérios de Aceite

### BUG-01 — Actualizar `InventoryService` (Web) para suportar paginação

**Contexto**: Commit `ca10465` adicionou paginação ao backend. O frontend Web ainda usa a resposta antiga.

**Critérios de aceite**:
- [ ] `InventoryService.getItems()` tipifica a resposta como `ApiResponse<PagedResponse<InventoryItem>>`
- [ ] `PertencesTabComponent` acede a `r.data.items` (array) e não a `r.data` directamente
- [ ] `DashboardComponent` calcula `totalValue` a partir do array correcto
- [ ] A UI não quebra quando existem mais de 30 itens (primeira página carrega)
- [ ] Sem regressão no display de itens existente

---

### BUG-02 + GAP-01 — Resolve/Restore workflow no frontend Web

**Contexto**: Backend tem `POST .../resolve` e `POST .../restore`. Frontend não tem os métodos no serviço nem UI.

**Critérios de aceite**:
- [ ] `InventoryItem` model (frontend) tem `status: string` e `resolvedAt?: Date`
- [ ] `InventoryService` tem `resolveItem(id, destination)` e `restoreItem(id)`
- [ ] Items com `status = "resolved"` não aparecem na listagem normal de Pertences
- [ ] Existe UI (botão/acção) para marcar um item como resolvido com escolha de destination
- [ ] Existe UI para restaurar um item resolvido para activo

---

### GAP-03 — UI da Despensa

**Contexto**: `PantryController` está 100% funcional. Frontend mostra "Em breve".

**Critérios de aceite**:
- [ ] Separador Despensa lista itens reais da API (substituindo placeholder "Em breve")
- [ ] CRUD completo: criar, editar, apagar itens da despensa
- [ ] Items com `status = "low"` mostram indicador visual (`StatusDotComponent`)
- [ ] Filtragem por localização e status (low/ok)
- [ ] Agrupamento por localização (mesmo padrão que Pertences)
- [ ] `DespensaTabComponent.ts` permanece sem alterações estruturais (apenas a template é substituída)

---

### GAP-02 — Chips de filtro de categoria no listing Pertences

**Contexto**: Chips existem na template mas estão ocultos (`class="hidden"`).

**Critérios de aceite**:
- [ ] Remover `class="hidden"` dos chips de categoria
- [ ] Filtro de categoria funciona (filtra `allItems` por `category.name`)
- [ ] Chip "Todos" limpa o filtro
- [ ] UI é consistente com o design dos chips de destino existentes

---

### GAP-05 — Endpoint de membros do household

**Contexto**: `GET /api/household/{id}` inclui `householdUsers[]` mas não é um endpoint dedicado de membros.

**Critérios de aceite**:
- [ ] `GET /api/household/{id}/members` retorna `ApiResponse<List<HouseholdMemberResponse>>`
- [ ] `HouseholdMemberResponse` inclui: `userId`, `name`, `email`, `role`, `joinedAt`
- [ ] Apenas membros do household podem ver a lista
- [ ] Endpoint documentado no CLAUDE.md

---

### GAP-08 — Remover `categoryId` da API

**Contexto**: `categoryId` foi removido do HomeManager.Mobile intencionalmente após testes mostrarem que o conceito de categoria não faz sentido para a app. O Mobile é o cliente primário. A API ainda expõe `categoryId` em vários contratos públicos, criando um desalinhamento com o cliente primário.

**Critérios de aceite**:
- [ ] `categoryId` e `categoryName` removidos de `ItemResponse` DTO
- [ ] `categoryId` removido de `CreateItemRequest` e `UpdateItemRequest`
- [ ] `CreateItemRequestValidator` e `UpdateItemRequestValidator` actualizados (remover regras de `categoryId`)
- [ ] `InventoryService` — remover joins/includes de `Category` nas queries de items
- [ ] Avaliar remoção de `CategoryController` e endpoints `/api/households/{id}/categories` (coordenar com o cliente Web legado antes de remover)
- [ ] Verificar que nenhum código Mobile referencia `categoryId` após a mudança
- [ ] Actualizar §6 (Endpoints) e §5 (Modelo de Dados) deste documento

**Nota**: Antes de remover `CategoryController`, confirmar se o cliente Web (`HomeManager.Web`) ainda referencia `category.service.ts`. Se sim, remover apenas `categoryId` dos DTOs de item numa primeira fase e deprecar os endpoints de categoria numa segunda fase.

---

### DEBT-01/02 — Normalizar Hungarian notation

**Contexto**: O padrão do projecto é `m_` prefix para campos privados de instância. A maioria dos services usa `_`.

**Critérios de aceite**:
- [ ] `HouseholdService`: `_logger` → `m_logger`, `_context` → `m_context`
- [ ] `InventoryService`: `_logger` → `m_logger`, `_context` → `m_context`
- [ ] `HouseholdController`: `_context` → `m_context`
- [ ] Restantes services e controllers: todos os campos privados com `_` migrados para `m_`
- [ ] Sem breaking changes na lógica de negócio

---

## 17. Contexto para Agentes AI

### Ordem de leitura recomendada para um agente novo no projecto

1. **Este ficheiro (CLAUDE.md)** — visão completa antes de ler qualquer código
2. `src/HomeManager.API/Program.cs` — pipeline de middleware
3. `src/HomeManager.API/Extensions/ServiceCollectionExtensions.cs` — toda a configuração de DI
4. `src/HomeManager.API/Data/ApplicationDbContext.cs` — mapeamentos e relacionamentos
5. Controller relevante para a task → Service correspondente → Model/DTO
6. Se frontend Web: `app.routes.ts` → serviço Angular → componente relevante

### Escopo de leitura e escrita por papel

| Papel | Ler | Escrever |
|-------|-----|---------|
| **Architect** | Todo o CLAUDE.md + migrations + ApplicationDbContext | CLAUDE.md, novos modelos, novas migrations |
| **Implementor** | CLAUDE.md §4-§6 + controller/service/model alvo | Controller, service, model, validator, DTO |
| **Reviewer** | CLAUDE.md §13 (restrições) + código em review | Comentários apenas |
| **Tester** | CLAUDE.md §15 + service/controller alvo | Ficheiros de teste, fixtures |

### Checklist pré-implementação

Antes de propor qualquer mudança:

- [ ] **Ler o controlador existente** para a rota em questão (não assumir a assinatura)
- [ ] **Verificar se existe validator** para o request DTO (se não, criar)
- [ ] **Confirmar o schema da DB** em `ApplicationDbContext.cs` — verificar FKs e DeleteBehavior
- [ ] **Verificar `ItemResponse`** — os novos campos devem ser adicionados aqui para serem expostos
- [ ] **Não quebrar contratos Mobile** — verificar se mudanças são backwards-compatible
- [ ] **Verificar a migration mais recente** (`20260424185206_AddFinanceModule`) antes de criar nova
- [ ] **Hungarian notation**: novos campos privados de instância usam `m_` prefix

### Como lidar com ambiguidades

| Situação | Acção |
|----------|-------|
| Campo existe no modelo mas não no DTO | Por design — não expor sem confirmação explícita |
| Comportamento documentado difere do código | **O código tem razão.** Actualizar o CLAUDE.md após confirmar |
| Endpoint não documentado mas existe no controller | Documentar como parte da tarefa |
| Migração nova necessária | Confirmar com o utilizador antes de criar — migrações são irreversíveis |
| Mudança que pode afectar o Mobile | Perguntar explicitamente antes de implementar |
| Dúvida sobre naming convention | Usar Hungarian notation (`m_`) — é o padrão do projecto |
| Service usa `_` em vez de `m_` | Não "corrigir" em passa — criar issue DEBT e documentar |

### Gotchas e armadilhas conhecidas

| Gotcha | Detalhe |
|--------|---------|
| **`r.data` não é um array** | Após `ca10465`, `GET /api/inventory/items` retorna `PagedResponse`. `r.data.items` é o array |
| **`locationId = "null"` (string)** | Para filtrar itens sem localização, passar a string `"null"`, não o valor null |
| **`status` default** | Itens novos têm `status = "active"`. Queries sem filtro de status devem explicitamente filtrar por `"active"` |
| **Serilog log path** | `"logs/homemanager-.log"` com `RollingInterval.Day` → ficheiros reais são `logs/homemanager-20260402.log` |
| **PostCSS config** | DEVE ser `postcss.config.json`. Ficheiros `.js` ou `.mjs` são **silenciosamente ignorados** pelo esbuild |
| **`[class.foo]` vs `[ngClass]`** | `[class.foo]="bool"` funciona sem NgClass. Só `[ngClass]="object"` precisa de importar NgClass |
| **Audience JWT** | `ValidAudience = "authenticated"` está ACTIVO. JWTs sem `aud: "authenticated"` são rejeitados |
| **Cache de sync** | `UserSyncMiddleware` não faz sync em cada request — cache de 5 min. Mudanças no user só são reflectidas após o cache expirar |
| **`HouseholdService.GetMyHouseholds(Guid.Empty, userId)`** | O primeiro argumento é morto — o serviço ignora-o |
| **Pantry DELETE retorna 200** | Ao contrário do Inventory DELETE (204), o Pantry DELETE retorna `Ok(ApiResponse<bool>)` |

---

## 18. Migrações

| Migration | O que faz |
|-----------|-----------|
| `20260310102006_InitialBaseline` | `Up()` vazio — tabelas base criadas directamente via SQL Supabase |
| `20260310105941_AddLocationEntity` | Cria `inventory.locations`; índice em `household_id` |
| `20260310120809_AddCategoryAndItemRelationships` | Cria `inventory.categories`; adiciona `category_id` e `location_id` a `inventory.items`; FKs com SetNull; índices |
| `20260310121300_AddPantryItemEntity` | Cria `inventory.pantry_items` com todos os campos |
| `20260311210909_AddQuantityToInventoryItems` | Adiciona `quantity` (int, nullable) a `inventory.items` |
| `20260317181000_RemoveLegacyLocationField` | Remove o campo `location` (string legado) de `inventory.items` |
| `20260320120000_AddItemStatusAndResolvedAt` | Adiciona `status` (varchar 20, default `'active'`) e `resolved_at` (timestamptz nullable) a `inventory.items` |
| `20260424185206_AddFinanceModule` | Cria schema `finance` com tabelas `accounts`, `transactions`, `templates`, `budget` (UNIQUE household_id), `rates` (UNIQUE household_id); índices em `household_id` e `ref_month` |

---

*Última actualização: 2026-04-25*

**Principais mudanças nesta revisão (2026-04-25):**
- Módulo Finance implementado end-to-end: §3 (ficheiros), §4 (3 schemas), §5 (schema finance), §6 (endpoints /api/finance), §7 (validators), §8 (FinanceService + componentes), §11 (estado funcional), §17 (migration ref), §18 (migration AddFinanceModule)
- Transações com conta obrigatória (frontend) e edição inline (formulário bifurca create/update)
- Import modal com toggle transactions/accounts; `POST /api/finance/accounts/import` adicionado
- Rota `/finance` adicionada; Budget stub removido (substituído pelo Finance)

**Mudanças anteriores (2026-04-02):**
- ⚠️ Corrigida documentação de audience JWT (estava incorrecta — audience **está activo**)
- Adicionado `IMemoryCache` (cache 5 min) em `UserSyncMiddleware`
- Documentado BUG-01: `InventoryService` (frontend) incompatível com `PagedResponse` do backend (commit `ca10465`)
- Adicionados ficheiros `AuthController.cs` e `SupabaseAuthMiddleware.cs` (ficheiros vazios/reservados)
- Adicionado `SkeletonBlockComponent` e `ItemFormComponent` à estrutura
- Documentados todos os validators (4 estavam em falta)
- Documentado padrão Hungarian notation como standard do projecto; desvios marcados como ⚠️ por resolver
- Labels PT-BR para destinations (Manter/Vender/Doar/Descartar) documentados
- Adicionado `destination.enum.ts` e `SupabaseService.deleteItemPhoto()`
- Clarificado que Mobile é o cliente FE primário; Web é legado/desactualizado
- Corrigido response de `DELETE /api/pantry/items/{id}` (200 com body, não 204)
- Adicionadas 6 novas secções: §13 Restrições, §14 Relação entre Repos, §15 Padrões de Teste, §16 Backlog com Critérios de Aceite, §17 Contexto para Agentes AI, §18 Migrações
- Adicionados links de componente `item-form/` na estrutura de directórios
- Documentado `CommandTimeout(60)` no DbContext
- Documentado `Prettier` config (`printWidth: 100, singleQuote: true`)
