# Endpoint Gap Analysis

_Generated after the frontend rewrite (March 2026)._

---

## 1. Existing Endpoints Used

| Method | Route | Description | Frontend Consumer |
|--------|-------|-------------|-------------------|
| `GET` | `/api/household` | Get all households for the authenticated user | `HouseholdService.getMyHouseholds()` — AppShell (household selector), Dashboard |
| `GET` | `/api/household/{id}` | Get a specific household by ID | `HouseholdService.getHousehold(id)` — reserved for future detail views |
| `POST` | `/api/household` | Create a new household | `HouseholdService.createHousehold(request)` — `HouseholdSetupComponent` |
| `POST` | `/api/household/join/{inviteCode}` | Join an existing household via invite code | `HouseholdService.joinHousehold(inviteCode)` — `HouseholdSetupComponent` |
| `GET` | `/api/inventory/items?householdId={guid}` | Get all items for a household | `InventoryService.getItems(householdId)` — `PertencesTabComponent`, Dashboard (total value) |
| `GET` | `/api/inventory/items/{id}` | Get a specific item | `InventoryService.getItem(id)` — reserved for item detail/edit |
| `POST` | `/api/inventory/items` | Create a new inventory item | `InventoryService.createItem(request)` — (item form removed in rewrite, to be rebuilt) |
| `PUT` | `/api/inventory/items/{id}` | Update an inventory item | `InventoryService.updateItem(id, request)` — (edit flow to be built) |
| `DELETE` | `/api/inventory/items/{id}` | Delete an inventory item | `InventoryService.deleteItem(id)` — (to be wired to UI) |
| `GET` | `/api/health` | Health check | Not used by frontend, for infra monitoring |

**Authentication** is handled entirely by Supabase. The `.NET` API validates the Supabase JWT via OpenID Connect. The frontend's `authInterceptor` attaches `Authorization: Bearer {token}` to all `/api/` requests automatically.

---

## 2. New Endpoints Needed

### 2.1 Inventory Categories

**`GET /api/inventory/categories`**
**Priority: Required** — Pertences tab groups items by category. Currently the frontend assigns categories using the first item `tag` as a fallback, which is fragile.

```typescript
// Response
interface InventoryCategory {
  id: string;
  householdId: string;
  name: string;
  type: 'pertences' | 'despensa';
  createdAt: string;
}

// Query param
// ?householdId={guid}&type=pertences|despensa
```

**`POST /api/inventory/categories`**
**Priority: Required**

```typescript
interface CreateCategoryRequest {
  householdId: string;
  name: string;
  type: 'pertences' | 'despensa';
}
```

**`DELETE /api/inventory/categories/{id}`**
**Priority: Nice-to-have** — Category-level 3-dot menu in Inventory UI.

---

### 2.2 Inventory Item — Category Assignment

Currently `InventoryItem` has a `listId` (FK to `inventory.lists`) and `tags` (JSONB). For proper categorisation, the item needs a `categoryId` field, or the `ListId` / `tags` approach needs to be consistently documented as the category mechanism.

**`PUT /api/inventory/items/{id}`** — already exists, but the request should include a `categoryId` field once categories are implemented:

```typescript
interface UpdateItemRequest {
  // ... existing fields ...
  categoryId?: string; // NEW — links item to a category
}
```

**Priority: Required** (alongside category endpoints above).

---

### 2.3 Despensa (Pantry) Items

The Despensa tab currently uses **100% mock data**. It needs its own data model, separate from `InventoryItem` (which maps to "Pertences"). Alternatively, `InventoryItem` can be extended with pantry-specific fields.

**Option A (recommended): Extend InventoryItem with a `moduleType` field**

```typescript
// Add to InventoryItem / CreateItemRequest / UpdateItemRequest
moduleType: 'pertences' | 'despensa';
quantity?: number;
unit?: string;         // "kg", "L", "un", etc.
minQuantity?: number;  // threshold below which status = "low"
```

**`GET /api/inventory/items?householdId={guid}&moduleType=despensa`**
**Priority: Required** for Despensa to use real data.

---

### 2.4 Dashboard — Timeline / Upcoming Actions

The Timeline widget is currently **100% mock data**.

**`GET /api/dashboard/timeline`**
**Priority: Nice-to-have** (feature works with mock data for now)

```typescript
// Query
// ?householdId={guid}

// Response
interface TimelineEvent {
  id: string;
  date: string;          // ISO 8601
  title: string;
  sourceModule: 'pertences' | 'despensa' | 'tasks' | 'budget';
  type: 'restock' | 'warranty' | 'task' | 'payment';
}
```

This endpoint would aggregate:
- Items below `minQuantity` → restock events
- Items with warranty expiry dates → warranty events
- Future: tasks and budget events once those modules are built

---

### 2.5 Dashboard — Summary Stats

The "Em Falta" (low stock count) in the Dashboard summary widget is **mock data**.

**`GET /api/dashboard/summary`**
**Priority: Nice-to-have** (works with mock for now)

```typescript
// Query: ?householdId={guid}

// Response
interface DashboardSummary {
  totalPatrimonioValue: number;    // sum of all InventoryItem.value where moduleType = 'pertences'
  lowStockItemCount: number;       // count of despensa items where quantity <= minQuantity
}
```

---

### 2.6 User Profile

Currently the frontend reads the user's `name` directly from the Supabase JWT `user_metadata.name`. There is no endpoint to update the user profile.

**`PUT /api/users/me`**
**Priority: Nice-to-have**

```typescript
interface UpdateUserRequest {
  name?: string;
}

// Response: ApiResponse<User>
```

---

### 2.7 Household Members

No endpoint currently exposes the household member list in a usable way. The `GET /api/household/{id}` returns `householdUsers[]` but it's not surfaced in the UI.

**`GET /api/household/{id}/members`**
**Priority: Nice-to-have**

```typescript
// Response
interface HouseholdMember {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: string;
}
```

---

## 3. Naming Note: "Bens Duráveis" → "Pertences"

The inventory module was previously called **"Bens Duráveis"** in early versions. The frontend now uses the term **"Pertences"** consistently throughout (page labels, tab names, mock data categories, component names).

The following backend files/concepts still reference the old naming or use generic names that should be reviewed for consistency:

| Location | Current Name | Suggested Rename |
|----------|-------------|-----------------|
| `inventory.items` table | `InventoryItem` (generic) | Consider `PertencesItem` or add `moduleType` field to distinguish from Despensa items |
| `inventory.lists` table | `ItemList` with `Type` field | `Type` enum values likely need `'pertences'` and `'despensa'` added |
| `InventoryController` | Route prefix `/api/inventory` | ✅ Fine as-is — "inventory" is the module, "pertences"/"despensa" are sub-types |
| `CreateItemRequest.Destination` | `["Undecided","Take","Sell","Donate","Trash"]` | These are Pertences-only concepts; irrelevant for Despensa items — consider separating DTOs once `moduleType` is added |
| Tags storage | JSONB string `tags` | Used as category assignment in Pertences tab. Should be replaced by a proper `categoryId` FK once categories endpoint is built (see §2.1) |

---

_This analysis was produced after the frontend rewrite. All mock data in `src/HomeManager.Web/src/app/core/mock/` is clearly isolated and trivially replaceable with real API calls once the corresponding endpoints are implemented._
