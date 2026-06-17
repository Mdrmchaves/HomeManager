# HomeManager — Contexto do Projecto

> **Fonte de verdade: o código.** Se este documento divergir do código, o código tem razão.

> **Navegação**: Existe a skill `/find` com o mapa completo do projecto (onde cada domínio vive, padrões de grep, pontos de entrada por feature). Invocar `/find` antes de qualquer pesquisa no código, ao planear uma implementação, ou sempre que precisar de localizar ficheiros sem exploração desnecessária.

---

## Visão Geral

Aplicação de gestão doméstica. Módulos: **Pertences** (bens duráveis), **Despensa** (consumíveis), **Finance** (contas, transações, orçamento, câmbio), **Tasks** (CRUD + complete/reopen), Dashboard.

**Clientes:**
- **Primário**: HomeManager.Mobile (repo separado, React Native) — prioridade máxima de compatibilidade
- **Secundário/legado**: HomeManager.Web (Angular 21, neste repo) — desactualizado desde commit `ca10465`

---

## Stack

| Camada | Escolha |
|--------|---------|
| Backend | .NET 10, ASP.NET Core, EF Core 9, Npgsql **9.0.4** (pinned), FluentValidation 12, Serilog |
| Database | PostgreSQL via Supabase — schemas: `shared`, `inventory`, `finance`, `tasks` |
| Auth | Supabase JWT validado pelo .NET via OIDC JWKS |
| Frontend Web | Angular 21 standalone, Tailwind CSS v4, `@supabase/supabase-js` v2.95.3 |

---

## Estado Actual (2026-06-17)

**Funcional end-to-end**: Auth, Households, Pertences CRUD + resolve/restore (só backend), Locations CRUD, Finance completo (contas, transações, templates, orçamento, câmbio, dashboard calculado), Tasks CRUD + complete/reopen.

**Bugs/Gaps activos:**

| ID | Descrição | Impacto |
|----|-----------|---------|
| BUG-01 ⚠️ | `GET /api/inventory/items` retorna `PagedResponse<ItemResponse>` mas `InventoryService` (Web) espera `ItemResponse[]` — frontend Web quebrado | Alto |
| GAP-03 | UI da Despensa mostra "Em breve" — backend 100% funcional | Alto |
| BUG-02 | `InventoryItem` model (Web) sem `status` e `resolvedAt` | Médio |

---

## Restrições Críticas

| Restrição | Razão |
|-----------|-------|
| **Nunca actualizar Npgsql para v10+** | v10 tem bug com batch commands — `ObjectDisposedException` em `SaveChangesAsync()` |
| **Não partilhar DbContext entre UserSyncMiddleware e controllers** | Causa `ObjectDisposedException`. Middleware cria scope próprio via `IServiceScopeFactory` |
| **Não alterar ordem do middleware pipeline** | UserSync depende de auth já executado; controllers dependem de UserSync |
| **Não remover `ReferenceHandler.IgnoreCycles`** | `Household ↔ HouseholdUser` são bidirecccionais — remove causa loop de serialização |
| **Não fazer queries sem filtro de HouseholdUser** | Row-level security enforced na aplicação, não na DB |
| **`postcss.config.json` deve ser JSON** (nunca `.js`/`.mjs`) | esbuild do Angular ignora silenciosamente configs não-JSON |
| **Não usar Angular Material na UI** | Stack é Tailwind puro — Material está instalado mas não usado |
| **Não usar `ChangeDetectorRef`/`markForCheck()`** | Arquitectura é 100% Angular Signals |
| **Mudanças breaking na API requerem coordenação com Mobile** | Mobile é o cliente primário |
| **Migrações são irreversíveis em produção** | Confirmar com utilizador antes de criar qualquer migração |

---

## Decisões Não Óbvias

- **`ValidAudience = "authenticated"`** — activo. Supabase emite JWTs com este audience exacto.
- **UserSyncMiddleware** usa `IMemoryCache` (TTL 5 min) — evita upsert à DB em cada request.
- **`CalcRefMonth` (Finance)**: CC com `closeDay` definido — se `date.Day > closeDay` → `refMonth = mês seguinte`; senão → `refMonth = mês da data`. Conta normal → `refMonth = mês da data`.
- **`locationId = "null"` (string)** — para filtrar itens sem localização, passar a string literal `"null"`, não null/omitir.
- **Pantry DELETE retorna 200 com body** — ao contrário do Inventory DELETE que retorna 204 sem body.
- **`tags`** armazenado como JSONB string (array stringificado `'["a","b"]'`) — não é sistema de FK.
- **Hungarian notation**: campos privados de instância usam prefixo `m_` (ex: `m_householdService`). Services antigos usam `_` — é tech debt, não corrigir em passant.
- **`HouseholdService.GetMyHouseholds(Guid.Empty, userId)`** — primeiro argumento é morto, o serviço ignora-o.
- **`Models.Tasks.Task` vs `System.Threading.Tasks.Task`** — clash de nomes. Resolvido com `using TaskEntity = HomeManager.API.Models.Tasks.Task;` em `ApplicationDbContext`, `TaskService`, e qualquer ficheiro que importe ambos.
- **Tasks ordering**: overdue (due_date < now) → futuros (due_date >= now) → sem prazo (null). Implementado com `OrderBy(CASE)` + `ThenBy(due_date)` + `ThenByDescending(created_at)`.

---

## Nomenclatura

- **Texto UI**: Português (PT-BR). **Código**: Inglês.
- `inventory.items` → "Pertences"; `inventory.pantry_items` → "Despensa"
- `destination` valores na DB: `Keep`, `Sell`, `Donate`, `Trash`, `Undecided` (title-case)
- Labels UI: Keep→Manter, Sell→Vender, Donate→Doar, Trash→Descartar, null/Undecided→Indefinido
- Finance categories: `lf`, `cf`, `co`, `mt`, `pr`, `es`
- Account types: `account` | `cc`; Transaction types: `income` | `expense`
- Novos campos privados C#: prefixo `m_`

---

## Dev Setup

```bash
# Backend (http://localhost:8080 | Swagger: /swagger)
cd src/HomeManager.API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Port=5432;..."
dotnet user-secrets set "Supabase:Url" "https://your-project.supabase.co"
dotnet run

# Frontend Web (http://localhost:4200)
cd src/HomeManager.Web
npm install && npm start
```

**Env vars produção (backend)**: `DATABASE_URL`, `SUPABASE_URL`, `PORT`
**Env vars produção (frontend/Vercel)**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_URL`

---

## Schema `tasks`

### `tasks.tasks`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| household_id | UUID FK | → shared.households.id ON DELETE CASCADE |
| title | varchar(255) | Required |
| description | text | Nullable |
| assignee_id | UUID FK | → shared.users.id ON DELETE SET NULL |
| due_date | timestamptz | Nullable |
| status | varchar(20) | `'active'` (default) \| `'completed'` |
| completed_at | timestamptz | Set ao completar |
| completed_by | UUID FK | → shared.users.id ON DELETE SET NULL |
| created_by | UUID FK | → shared.users.id ON DELETE CASCADE |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Tasks — /api/tasks [Authorize]

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/tasks | Lista paginada (`?householdId`, `?status`, `?page`, `?pageSize`) — `ApiResponse<PagedResponse<TaskResponse>>` |
| GET | /api/tasks/{id} | Task única — `ApiResponse<TaskResponse>` |
| POST | /api/tasks | Criar — 201 + `ApiResponse<TaskResponse>` |
| PUT | /api/tasks/{id} | Atualizar — `ApiResponse<TaskResponse>` |
| DELETE | /api/tasks/{id} | Apagar — 204 No Content |
| POST | /api/tasks/{id}/complete | Completar — `ApiResponse<TaskResponse>` |
| POST | /api/tasks/{id}/reopen | Reabrir — `ApiResponse<TaskResponse>` |

---

## Ficheiros Sensíveis

| Ficheiro | Porquê |
|---------|--------|
| `Data/Migrations/` | Irreversíveis em produção |
| `Extensions/ServiceCollectionExtensions.cs` | Todo o pipeline de DI |
| `Program.cs` | Ordem do middleware |
| `Web/src/environments/environment.ts` | Placeholders injectados pelo Vercel |
