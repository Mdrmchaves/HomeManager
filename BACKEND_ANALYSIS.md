# HomeManager — Análise do Backend .NET

> Mapa completo do projeto `src/HomeManager.API` — controllers, services, models, infraestrutura e migrations.

---

## Índice

1. [Estrutura de ficheiros](#1-estrutura-de-ficheiros)
2. [Controllers](#2-controllers)
3. [Services](#3-services)
4. [Models & DTOs](#4-models--dtos)
5. [Infraestrutura](#5-infraestrutura)
6. [Validators](#6-validators)
7. [Migrations](#7-migrations)
8. [Ficheiro de projeto (.csproj)](#8-ficheiro-de-projeto-csproj)

---

## 1. Estrutura de Ficheiros

```
src/HomeManager.API/
├── Controllers/
│   ├── HealthController.cs
│   ├── HouseholdController.cs
│   ├── InventoryController.cs
│   ├── LocationController.cs
│   ├── CategoryController.cs
│   └── PantryController.cs
├── Data/
│   ├── ApplicationDbContext.cs
│   ├── ApplicationDbContextFactory.cs
│   └── Migrations/
│       ├── 20260310102006_InitialBaseline.cs
│       ├── 20260310105941_AddLocationEntity.cs
│       ├── 20260310120809_AddCategoryAndItemRelationships.cs
│       ├── 20260310121300_AddPantryItemEntity.cs
│       └── 20260311210909_AddQuantityToInventoryItems.cs
├── Extensions/
│   └── ServiceCollectionExtensions.cs
├── Middleware/
│   ├── ErrorHandlingMiddleware.cs
│   ├── SupabaseAuthMiddleware.cs   ← vazio
│   └── UserSyncMiddleware.cs
├── Models/
│   ├── ApiResponse.cs
│   ├── ValidationErrorResponse.cs
│   ├── DTOs/
│   │   ├── LocationResponse.cs
│   │   ├── CategoryResponse.cs
│   │   ├── PantryItemResponse.cs
│   │   ├── ItemResponse.cs         ← vazio
│   │   └── Requests/
│   │       ├── CreateItemRequest.cs / UpdateItemRequest.cs
│   │       ├── CreateLocationRequest.cs / UpdateLocationRequest.cs
│   │       ├── CreateCategoryRequest.cs / UpdateCategoryRequest.cs
│   │       ├── CreatePantryItemRequest.cs / UpdatePantryItemRequest.cs
│   │       └── CreateHouseholdRequest.cs
│   ├── Inventory/
│   │   ├── InventoryItem.cs
│   │   ├── ItemList.cs
│   │   ├── Location.cs
│   │   ├── Category.cs
│   │   └── PantryItem.cs
│   └── Shared/
│       ├── User.cs
│       ├── Household.cs
│       └── HouseholdUser.cs
├── Services/
│   ├── IUserSyncService.cs / UserSyncService.cs
│   ├── Household/  IHouseholdService.cs + HouseholdService.cs
│   ├── Location/   ILocationService.cs + LocationService.cs
│   ├── Category/   ICategoryService.cs + CategoryService.cs
│   ├── Pantry/     IPantryService.cs + PantryService.cs
│   └── Supabase/   SupabaseService.cs  ← vazio
├── Validators/
│   ├── CreateCategoryRequestValidator.cs / UpdateCategoryRequestValidator.cs
│   ├── CreateLocationRequestValidator.cs / UpdateLocationRequestValidator.cs
│   └── CreatePantryItemRequestValidator.cs / UpdatePantryItemRequestValidator.cs
├── Program.cs
├── appsettings.json / appsettings.Development.json / appsettings.Production.json
├── HomeManager.API.csproj
└── Dockerfile
```

---

## 2. Controllers

### HealthController

- **Rota**: `GET /api/health`
- **Auth**: Não requer
- **Resposta**: `{ status: "healthy", timestamp, service }`
- Tem rotas de debug para teste de erros (dev only)

---

### HouseholdController

- **Rota base**: `/api/household` — `[Authorize]`
- **Serviço**: `IHouseholdService`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/household` | Lista todos os households do utilizador |
| `GET` | `/api/household/{id}` | Retorna um household (inclui `householdUsers[]`) |
| `POST` | `/api/household` | Cria household; atribui role `owner` |
| `POST` | `/api/household/join/{inviteCode}` | Junta-se a household; atribui role `member` |

**Request**: `CreateHouseholdRequest { name: string }`

**Response shape**:
```json
{
  "id": "uuid",
  "name": "Casa",
  "inviteCode": "ABC12345",
  "createdAt": "...",
  "updatedAt": "...",
  "householdUsers": [...]
}
```

---

### InventoryController

- **Rota base**: `/api/inventory` — `[Authorize]`
- **Nota**: Retorna arrays raw de `InventoryItem` (sem envelope `ApiResponse<T>`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/inventory/items` | Lista itens dos households do utilizador |
| `GET` | `/api/inventory/items/{id}` | Retorna um item |
| `POST` | `/api/inventory/items` | Cria item |
| `PUT` | `/api/inventory/items/{id}` | Atualiza item (204 No Content) |
| `DELETE` | `/api/inventory/items/{id}` | Elimina item (204 No Content) |

**Query params** (GET list): `householdId?`, `locationId?`, `category?` (nome string)

**CreateItemRequest**:
```
householdId, name, description?, value?, photoUrl?,
location? (legado), destination?, ownerId?, tags? (JSONB string),
listId?, locationId?, categoryId?, quantity? (integer)
```

---

### LocationController

- **Rota base**: `/api` — `[Authorize]`
- **Serviço**: `ILocationService`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/households/{householdId}/locations` | Lista locations do household |
| `POST` | `/api/households/{householdId}/locations` | Cria location |
| `PUT` | `/api/locations/{id}` | Atualiza location |
| `DELETE` | `/api/locations/{id}` | Elimina location (items → `location_id = null`) |

**CreateLocationRequest**: `{ name: string, icon?: string }`
**UpdateLocationRequest**: `{ name?: string, icon?: string }`
**LocationResponse**: `{ id, householdId, name, icon?, createdAt }`

---

### CategoryController

- **Rota base**: `/api` — `[Authorize]`
- **Serviço**: `ICategoryService`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/households/{householdId}/categories` | Lista categories (filtro `?type=pertences\|despensa`) |
| `POST` | `/api/households/{householdId}/categories` | Cria category |
| `PUT` | `/api/categories/{id}` | Atualiza category |
| `DELETE` | `/api/categories/{id}` | Elimina category |

**CreateCategoryRequest**: `{ name: string, type: string }`
**UpdateCategoryRequest**: `{ name?: string }`
**CategoryResponse**: `{ id, householdId, name, type, createdAt }`

---

### PantryController

- **Rota base**: `/api/pantry` — `[Authorize]`
- **Serviço**: `IPantryService`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/pantry/items` | Lista itens Despensa (`householdId` obrigatório) |
| `GET` | `/api/pantry/items/{id}` | Retorna um item |
| `POST` | `/api/pantry/items` | Cria item |
| `PUT` | `/api/pantry/items/{id}` | Atualiza item |
| `DELETE` | `/api/pantry/items/{id}` | Elimina item |

**Query params** (GET list): `householdId` (obrigatório), `locationId?`, `category?`, `status?` (`"low"` ou `"ok"`)

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

## 3. Services

### UserSyncService

**Interface**: `IUserSyncService`
**Método**: `EnsureUserExistsAsync(userId, email, name?)`

- Cria ou retorna o utilizador na tabela `shared.users`
- Se `name` não fornecido, usa o prefixo do email como fallback

---

### HouseholdService

**Interface**: `IHouseholdService`
**Métodos**: `GetMyHouseholds`, `GetHouseholdAsync`, `CreateHouseholdAsync`, `JoinHouseholdAsync`

- Gera invite codes de 8 caracteres alfanuméricos aleatórios
- Role `owner` para criador, `member` para quem se junta

---

### LocationService

**Interface**: `ILocationService`
**Métodos**: `GetLocationsAsync`, `CreateLocationAsync`, `UpdateLocationAsync`, `DeleteLocationAsync`

- Valida acesso ao household antes de qualquer operação
- Retorna `LocationResponse` DTOs

---

### CategoryService

**Interface**: `ICategoryService`
**Métodos**: `GetCategoriesAsync` (com filtro de type opcional), `CreateCategoryAsync`, `UpdateCategoryAsync`, `DeleteCategoryAsync`

- Valida que `type` é `"pertences"` ou `"despensa"`

---

### PantryService

**Interface**: `IPantryService`
**Métodos**: `GetItemsAsync` (filtros avançados), `GetItemAsync`, `CreateItemAsync`, `UpdateItemAsync`, `DeleteItemAsync`

- Computa `status` em `ToResponse()`: `"low"` se `quantity <= minQuantity`, senão `"ok"`
- Recarrega navegação após insert/update

---

## 4. Models & DTOs

### Schema `shared`

#### `User`
```csharp
[Table("users", Schema = "shared")]
Guid Id          // PK — coincide com Supabase auth user ID
string Email     // Required
string Name      // Required
DateTime CreatedAt, UpdatedAt
```

#### `Household`
```csharp
[Table("households", Schema = "shared")]
Guid Id
string Name          // Required
string InviteCode    // Required, 8 chars
DateTime CreatedAt, UpdatedAt
ICollection<HouseholdUser> HouseholdUsers
ICollection<InventoryItem> Items
ICollection<Location> Locations
ICollection<Category> Categories
```

#### `HouseholdUser`
```csharp
[Table("household_users", Schema = "shared")]
Guid UserId          // PK composta
Guid HouseholdId     // PK composta
string Role          // "owner" | "member"
DateTime JoinedAt
```

---

### Schema `inventory`

#### `InventoryItem`
```csharp
[Table("items", Schema = "inventory")]
Guid Id
Guid HouseholdId
string Name, Description?
decimal? Value
string? PhotoUrl
string? Location        // DEPRECATED — campo legado free-text
Guid? LocationId        // FK → inventory.locations (ON DELETE SET NULL)
Guid? CategoryId        // FK → inventory.categories (ON DELETE SET NULL)
int? Quantity
string? Destination     // "Undecided"|"Take"|"Sell"|"Donate"|"Trash"
Guid? OwnerId           // FK → shared.users
string? Tags            // JSONB — stringified JSON array
Guid? ListId            // FK → inventory.lists
DateTime CreatedAt, UpdatedAt
```

#### `Location`
```csharp
[Table("locations", Schema = "inventory")]
Guid Id
Guid HouseholdId
string Name     // max 100 (ex: "Cozinha", "Sala")
string? Icon    // emoji ou chave de ícone
DateTime CreatedAt, UpdatedAt
```

#### `Category`
```csharp
[Table("categories", Schema = "inventory")]
Guid Id
Guid HouseholdId
string Name     // max 100
string Type     // "pertences" | "despensa"
DateTime CreatedAt, UpdatedAt
```

#### `PantryItem`
```csharp
[Table("pantry_items", Schema = "inventory")]
Guid Id
Guid HouseholdId
Guid? LocationId        // FK → inventory.locations (ON DELETE SET NULL)
Guid? CategoryId        // FK → inventory.categories (ON DELETE SET NULL)
string Name             // max 200
string? Notes           // max 500
decimal Quantity        // Required
string? Unit            // "kg", "L", "un", etc.
decimal? MinQuantity    // limiar para alerta de stock baixo
DateTime? ExpirationDate
DateTime CreatedAt, UpdatedAt
// status ("ok"|"low") — campo computado, não persistido
```

#### `ItemList`
```csharp
[Table("lists", Schema = "inventory")]
Guid Id
Guid HouseholdId
string Name, Type
DateTime CreatedAt, UpdatedAt
```

---

### Envelopes de Resposta

#### `ApiResponse<T>`
```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-03-17T..."
}
```
Métodos estáticos: `ApiResponse<T>.Success(data, message)` e `ApiResponse<T>.Failure(message)`.

#### `ValidationErrorResponse`
```json
{
  "message": "Validation failed",
  "errors": { "fieldName": ["error msg 1", "error msg 2"] },
  "timestamp": "..."
}
```

---

### DTOs de Request

| DTO | Campos |
|-----|--------|
| `CreateLocationRequest` | `Name` (req), `Icon?` |
| `UpdateLocationRequest` | `Name?`, `Icon?` |
| `CreateCategoryRequest` | `Name` (req), `Type` (req) |
| `UpdateCategoryRequest` | `Name?` |
| `CreateItemRequest` | `HouseholdId`, `Name`, `Description?`, `Value?`, `PhotoUrl?`, `Location?` (legado), `Destination?`, `OwnerId?`, `Tags?`, `ListId?`, `LocationId?`, `CategoryId?`, `Quantity?` |
| `UpdateItemRequest` | Todos os campos de `Create` opcionais |
| `CreatePantryItemRequest` | `HouseholdId`, `Name`, `Quantity`, `Unit?`, `MinQuantity?`, `ExpirationDate?`, `LocationId?`, `CategoryId?`, `Notes?` |
| `UpdatePantryItemRequest` | Todos os campos de `Create` opcionais |
| `CreateHouseholdRequest` | `Name` |

---

## 5. Infraestrutura

### `ApplicationDbContext`

EF Core DbContext com dois schemas. Configura:
- Relacionamentos e FKs:
  - `Location` / `Category` deletados → `location_id` / `category_id` em items = `NULL` (`SetNull`)
  - `Household` deletado → cascade para `HouseholdUser`, `Item`, `Location`, `Category`, `PantryItem`
- Índices em `household_id` nas tabelas de inventory

---

### `ApplicationDbContextFactory`

Design-time factory para EF migrations. Lê connection string de:
1. Variável de ambiente `DATABASE_URL`
2. `appsettings.Development.json`
3. `dotnet user-secrets`

---

### `ServiceCollectionExtensions`

Todos os registos DI organizados em métodos de extensão:

| Método | O que regista |
|--------|--------------|
| `AddApplicationServices` | `IUserSyncService`, `IHouseholdService`, `ILocationService`, `ICategoryService`, `IPantryService` |
| `AddDatabaseConfiguration` | `ApplicationDbContext` com Npgsql **9.0.4** (pinned) |
| `AddAuthenticationConfiguration` | JWT Bearer via OIDC Supabase; valida issuer + signature + lifetime; audience **desativado** |
| `AddCorsConfiguration` | Permite origens Angular da config (`AllowedOrigins`) |
| `AddValidationConfiguration` | FluentValidation auto-discovery + auto-validation (retorna 400 com erros agrupados) |
| `AddSwaggerConfiguration` | Swagger UI com suporte a Bearer token |

---

### `Program.cs` — Pipeline de Middleware

```
Serilog Request Logging
→ ErrorHandlingMiddleware     (exceções globais → JSON)
→ CORS                        (política AllowAngular)
→ UseAuthentication           (validação JWT)
→ UserSyncMiddleware          (upsert shared.users)
→ UseAuthorization
→ MapControllers
```

Serilog configurado com:
- Console sink
- Ficheiro rolling: `logs/homemanager-YYYYMMDD.log`
- Nível: `Information`; Microsoft logs filtrados para `Warning`

Porta: variável `PORT` (default: `8080`).

---

### `UserSyncMiddleware`

Executa em cada request autenticado:
1. Extrai claims `sub` (userId), `email`, `name` do JWT
2. Cria um **scope DI próprio** (via `IServiceScopeFactory`) — isola o `DbContext` do middleware do `DbContext` scoped do controller
3. Chama `IUserSyncService.EnsureUserExistsAsync` — cria/atualiza o user em `shared.users`
4. Não bloqueia o request em caso de falha de sync (loga o erro e continua)

> **Porquê scope próprio**: partilhar o `DbContext` (e a conexão Npgsql) com o middleware causava `ObjectDisposedException` — raiz do bug original.

---

### `ErrorHandlingMiddleware`

Captura exceções globais e converte para respostas JSON:

| Exceção | HTTP Status |
|---------|-------------|
| `ValidationException` (FluentValidation) | 400 com `errors` agrupados por campo |
| `KeyNotFoundException` | 404 |
| `UnauthorizedAccessException` | 401 |
| Outras | 500 |

---

## 6. Validators

### `CreateLocationRequestValidator`
- `Name`: obrigatório, max 100 caracteres
- `Icon`: max 50 caracteres (se fornecido)

### `UpdateLocationRequestValidator`
- `Name`: max 100 caracteres (se fornecido)
- `Icon`: max 50 caracteres (se fornecido)

### `CreateCategoryRequestValidator`
- `Name`: obrigatório, max 100 caracteres
- `Type`: obrigatório, deve ser `"pertences"` ou `"despensa"`

### `UpdateCategoryRequestValidator`
- `Name`: max 100 caracteres (se fornecido)

### `CreatePantryItemRequestValidator`
- `HouseholdId`: obrigatório
- `Name`: obrigatório, max 200 caracteres
- `Quantity`: >= 0
- `Unit`: max 20 caracteres (se fornecido)
- `MinQuantity`: >= 0 (se fornecido)
- `Notes`: max 500 caracteres (se fornecido)

### `UpdatePantryItemRequestValidator`
- `Name`: max 200 caracteres (se fornecido)
- `Quantity`: >= 0 (se fornecido)
- `Unit`: max 20 caracteres (se fornecido)
- `MinQuantity`: >= 0 (se fornecido)
- `Notes`: max 500 caracteres (se fornecido)

---

## 7. Migrations

| Migration | O que faz |
|-----------|-----------|
| `20260310102006_InitialBaseline` | `Up()` vazio — tabelas base (`shared.users`, `shared.households`, `shared.household_users`, `inventory.items`, `inventory.lists`) criadas diretamente via SQL Supabase |
| `20260310105941_AddLocationEntity` | Cria `inventory.locations` (id, household_id FK, name, icon, timestamps); índice em `household_id` |
| `20260310120809_AddCategoryAndItemRelationships` | Cria `inventory.categories`; adiciona `category_id` e `location_id` a `inventory.items`; FKs com `SetNull`; índices |
| `20260310121300_AddPantryItemEntity` | Cria `inventory.pantry_items` com todos os campos; FKs para locations/categories (`SetNull`), household (`Cascade`) |
| `20260311210909_AddQuantityToInventoryItems` | Adiciona coluna `quantity` (int, nullable) a `inventory.items` |

---

## 8. Ficheiro de Projeto (.csproj)

**Target**: `.NET 10`, `Nullable` habilitado

### NuGet Packages

| Package | Versão | Nota |
|---------|--------|------|
| `Npgsql.EntityFrameworkCore.PostgreSQL` | **9.0.4** | Pinned — v10 tem bug em `SaveChangesAsync` com batch commands |
| `Microsoft.EntityFrameworkCore.Design` | 9.0.4 | Design-time migrations |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 10.0.3 | JWT Bearer auth |
| `Microsoft.IdentityModel.Protocols.OpenIdConnect` | 8.16.0 | Fetch OIDC config Supabase |
| `FluentValidation` | 12.1.1 | Validação de requests |
| `FluentValidation.AspNetCore` | 11.3.1 | Auto-validação via middleware |
| `Serilog.AspNetCore` | 10.0.0 | Logging estruturado |
| `Serilog.Sinks.Console` | 6.1.1 | Output console |
| `Serilog.Sinks.File` | 7.0.0 | Rolling file sink |
| `Serilog.Enrichers.Environment` | 3.0.1 | Enrich com env vars |
| `Serilog.Enrichers.Thread` | 4.0.0 | Enrich com thread info |
| `OneOf` | 3.0.271 | Discriminated unions |
| `supabase-csharp` | 0.16.2 | Cliente Supabase C# (reservado, não usado ativamente) |
| `Swashbuckle.AspNetCore` | 7.2.0 | Swagger / OpenAPI |

---

*Gerado em 2026-03-17 — baseado no estado atual do repositório `main`.*
