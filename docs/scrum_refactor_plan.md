# Scrum App Refactor Plan — Unify Backlog Item Types (Story/Task/Bug/Spike) and Keep Epics + Sub-tasks

**Owner:** Product/Engineering  
**Target Release Window:** 1–2 sprints  
**Backend:** FastAPI + Motor (MongoDB)  
**Frontend:** React (Router + Axios)  
**Auth:** JWT  
**Scope:** Replace separate Story/Task top-level entities with a unified **Backlog Item (PBI)** model typed as `story | task | bug | spike`; keep **Epics** and **Sub-tasks**.

---

## 1) Goals & Non-Goals

### Goals
- Represent **Story, Task, Bug, Spike** as peer **PBI types** under a unified collection (`backlog_items`).
- Preserve **Epic** as a container (parent) of PBIs.
- Preserve **Sub-task** as the implementation breakdown of a single parent PBI.
- Minimize migration risk: maintain backward compatibility routes temporarily with deprecation headers.
- Add **Spike** semantics (timebox, question, exit criteria).

### Non-Goals
- Overhauling auth/RBAC (keep as-is).
- Changing Planning Poker behavior except mapping to new PBI ids for Stories.

---

## 2) Current State (from repo docs)

- Tech: React frontend, FastAPI backend, MongoDB via Motor; JWT auth (RBAC) documented in README.  
- Frontend pages include Backlog, Sprint, and a **Stories** page with a **Planning Poker** entry point per story.  
- Dedicated REST resources: `/epics`, `/stories`, `/tasks`, `/subtasks`, `/audits`; and Planning Poker endpoints under `/planning/*` with a WS.  
- Hierarchy currently modeled explicitly as **Epic → Story → Task → Subtask**.

**Implication:** Stories & Tasks are first-class, separate collections/routes today; Subtasks attach to Tasks; Planning Poker is bound to Stories.

---

## 3) Proposed Target Model

### 3.1 Conceptual Hierarchy
**Epic → (Backlog Item: Story | Task | Bug | Spike) → Sub-task**

### 3.2 Mongo Collections (new/updated)
- **`epics`**
  - fields: `_id`, `key`, `title`, `description`, `status`, `labels`, `owner`, `rank`, `created_at`, `updated_at`
- **`backlog_items`** (NEW — unified PBI)
  - fields: `_id`, `key`, `type` **enum**: `story | task | bug | spike`
  - common fields: `title`, `description`, `status`, `labels[]`, `priority`, `story_points?`, `assignee?`, `rank (float)`, `epic_id?`, `acceptance_criteria?`, `attachments?`, `created_at`, `updated_at`
  - **Bug** extras: `environment?`, `affected_version?`, `steps_to_reproduce?`, `expected?`, `actual?`
  - **Spike** extras: `question`, `approach?`, `timebox_hours` (**required**), `exit_criteria?`, `deliverable?`
- **`subtasks`**
  - fields: `_id`, `parent_item_id` (FK → `backlog_items._id`), `title`, `status`, `assignee?`, `remaining_hours?`, `created_at`, `updated_at`
- **`sprints`**, **`sprint_items`** (unchanged if already present; otherwise create `sprint_items { sprint_id, backlog_item_id }`)

### 3.3 Indexes
- `backlog_items`: `{ epic_id: 1, rank: 1 }`, `{ type: 1, status: 1 }`, `{ assignee: 1, status: 1 }`, `{ created_at: -1 }`
- `subtasks`: `{ parent_item_id: 1 }`
- Optional text index: `title + description` for backlog search

---

## 4) API Refactor

### 4.1 New Routes
- `GET /items` — list PBIs; filters: `type`, `epic_id`, `status`, `assignee`, `q`
- `POST /items` — create PBI with `type` ∈ {story, task, bug, spike}
- `GET /items/{id}` — read PBI
- `PUT /items/{id}` — full update
- `PATCH /items/{id}` — partial update (status/assignee/labels/points/rank)
- `DELETE /items/{id}` — delete
- `POST /items/{id}/rank` — set floating rank
- `GET /items/{id}/subtasks` / `POST /items/{id}/subtasks` — manage sub-tasks

**Epics stay:** `GET/POST /epics`, etc.  
**Audits stay:** continue to log changes for `items` and `subtasks`.

### 4.2 Compatibility Layer (Temp, 1–2 sprints)
- **Stories**
  - Map `GET /stories` → `GET /items?type=story`
  - Map `POST /stories` → `POST /items` with `type=story`
  - Map `/stories/{id}` → `/items/{id}`
- **Tasks**
  - If tasks in old model were “implementation under a story”, we migrate them to **subtasks** (see §6).  
  - If tasks were independent PBIs, map `tasks` routes just like stories with `type=task`.
- **Subtasks**: Keep route path `/subtasks` working; internally resolve to `parent_item_id` in `items`.

Return `Deprecation` header + link to migration note for each legacy endpoint.

### 4.3 Planning Poker
- Keep endpoints under `/planning/*` but change `CreateSession.body` to accept `item_id` (must be `type=story`).  
- Backward-compat: still accept `story_id` for now; server maps it to `item_id`.

---

## 5) Frontend Changes

1. **Backlog Page**
   - Single **Create** form with **Type** select: Story/Task/Bug/Spike.
   - Show **Epic swimlanes** (group by epic), sort by rank.
   - Per-type templates:
     - Story: User story sentence + acceptance criteria
     - Task: Objective + DoD
     - Bug: Steps, expected/actual, env
     - Spike: Question, timebox (hours), exit criteria, deliverable
2. **Stories Page → Backlog Filter**
   - Replace standalone Stories page with `BacklogPage?type=story` filter view (route can persist for bookmarks).
   - “Plan” button for Planning Poker now lives in Story row actions.
3. **Item Detail Drawer**
   - Tab for **Sub-tasks** (inline add/edit).
   - Fields rendered conditionally by `type` (schema-driven UI).
4. **Sprints**
   - Only PBIs (items) are pulled into sprints; sub-tasks follow parent automatically.
   - Burndown continues to read from PBI status/story_points.

---

## 6) Data Migration Plan

> Write operations paused during migration window; read-only banner in UI.

### 6.1 Collections
- Create `backlog_items` and required indexes.
- Create/alter `subtasks` to use `parent_item_id` → `backlog_items._id` (ObjectId).

### 6.2 Data Mapping
- **Stories (old)** → insert into `backlog_items` with `type="story"`. Preserve `story_points`, `rank`, `epic_link` → `epic_id`.
- **Tasks (old):**
  - If a Task has a `story_id` and served as implementation step → **convert to Sub-task** under the mapped Story’s new `item_id`.
  - Else (independent) → insert into `backlog_items` with `type="task"`; carry over `rank`, `assignee`, etc.
- **Bugs (if any)** → map to `type="bug"`.
- **Spikes**: none previously; no backfill. (Optional: detect “research/spike” label and convert to `type="spike"` with default `timebox_hours=8`).
- **Subtasks (old)**:
  - Repoint `parent_item_id` to the new parent PBI id.
- **Planning Poker sessions**:
  - Translate `story_id` → `item_id` for sessions whose parent is a `story`.

### 6.3 Script Pseudocode (Motor)
```python
# assumes db = AsyncIOMotorDatabase
stories = db["stories"]
tasks = db["tasks"]
items = db["backlog_items"]
subs = db["subtasks"]

id_map = {}

# 1) Stories -> items
async for s in stories.find({}):
    doc = {
        "type": "story",
        "title": s["title"],
        "description": s.get("description"),
        "status": s.get("status", "todo"),
        "labels": s.get("labels", []),
        "priority": s.get("priority", "medium"),
        "story_points": s.get("story_points"),
        "assignee": s.get("assignee"),
        "rank": s.get("rank", 0.0),
        "epic_id": s.get("epic_id"),
        "created_at": s.get("created_at"),
        "updated_at": s.get("updated_at"),
    }
    res = await items.insert_one(doc)
    id_map[("story", s["_id"])] = res.inserted_id

# 2) Tasks -> items or subtasks
async for t in tasks.find({}):
    parent_story_id = t.get("story_id")
    if parent_story_id:
        parent_item_id = id_map.get(("story", parent_story_id))
        if parent_item_id:
            sub = {
                "parent_item_id": parent_item_id,
                "title": t["title"],
                "status": t.get("status", "todo"),
                "assignee": t.get("assignee"),
                "remaining_hours": t.get("remaining_hours"),
                "created_at": t.get("created_at"),
                "updated_at": t.get("updated_at"),
            }
            await subs.insert_one(sub)
            continue
    # independent task -> item
    doc = {
        "type": "task",
        "title": t["title"],
        "description": t.get("description"),
        "status": t.get("status", "todo"),
        "labels": t.get("labels", []),
        "priority": t.get("priority", "medium"),
        "assignee": t.get("assignee"),
        "rank": t.get("rank", 0.0),
        "created_at": t.get("created_at"),
        "updated_at": t.get("updated_at"),
    }
    await items.insert_one(doc)

# 3) Repoint existing subtasks (if any old parent references need remap)
# If old subtasks referenced 'task_id' or 'story_id', translate to 'parent_item_id' accordingly.
```

### 6.4 Post-Migration Validation
- Random sample 20 items: verify fields, epic links, subtasks count.
- Verify Sprint boards show same PBI count as pre-migration.
- Planning Poker: create a session from an existing Story to ensure mapping works.

---

## 7) Backend Changes (FastAPI)

### 7.1 Schemas (Pydantic)
```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

ItemType = Literal["story", "task", "bug", "spike"]

class ItemBase(BaseModel):
    type: ItemType
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    labels: List[str] = []
    priority: Optional[str] = "medium"
    story_points: Optional[int] = None
    assignee: Optional[str] = None
    rank: float = 0.0
    epic_id: Optional[str] = None

class SpikeFields(BaseModel):
    question: str
    approach: Optional[str] = None
    timebox_hours: int = Field(gt=0)
    exit_criteria: Optional[str] = None
    deliverable: Optional[str] = None

class ItemCreate(ItemBase):
    spike: Optional[SpikeFields] = None

class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    labels: Optional[List[str]] = None
    priority: Optional[str] = None
    story_points: Optional[int] = None
    assignee: Optional[str] = None
    rank: Optional[float] = None
    epic_id: Optional[str] = None
    spike: Optional[SpikeFields] = None
```

### 7.2 Router (new `/items`)
- Implement `list/create/read/update/delete` with role checks mirrored from existing entities.
- Add filtering by `type`, `status`, `epic_id`, `assignee`, free-text `q`.
- Add audits the same way existing entities are audited.
- Response models: include `id`, `created_at`, `updated_at`.

### 7.3 Legacy Routers
- Update `/stories` and `/tasks` to proxy to `/items`.
- Add `Deprecation: true` header and `Sunset` date.
- Keep `/subtasks` router; ensure it uses `parent_item_id` referencing new `items` ids.

---

## 8) Frontend Changes (React)

- **API layer:** add `itemsApi` client; switch Story/Task list/detail pages to `items` endpoints.
- **Routing:** keep `/stories` route but apply `type=story` filter; add `/items/:id` detail route.
- **Form components:** schema-driven fields; conditional render for Bug/Spike fields.
- **Planning Poker:** update client to create sessions with `{ item_id }` and ensure only `type=story` rows show the "Plan" button.
- **RBAC:** unchanged; reuse existing role guards.
- **UX polish:** type badges, templates dropdown, Epic swimlanes.

---

## 9) Testing

- **Unit:** schema validation, filters, permission matrix for each route.
- **Integration:** migration script on a seeded DB; ensure planning sessions work post-migration.
- **E2E (Playwright/Cypress):** create epic → create 1 story, 1 task, 1 bug, 1 spike → add subtasks → pull into sprint → complete.
- **Performance:** `GET /items?type=story&epic_id=...` under 200ms on 1k docs.

---

## 10) Rollout Plan

1. **Branch:** `feature/unified-items`
2. **Phase 1:** implement `/items` + UI list/detail + create form; **read-only proxy** for `/stories`/`/tasks`.
3. **Phase 2:** migration (read-only window), repoint subtasks, validate.
4. **Phase 3:** enable writes to `/items`; legacy routes still proxy + deprecation headers.
5. **Phase 4 (next release):** remove legacy routes; UI routes point to filters only.
6. **Docs:** Update README + API docs; add “What is a Spike?” & “Sub-task policy.”

---

## 11) Definition of Done (DoD)

- ✅ `/items` fully functional with filters + audits
- ✅ Backlog create flow supports all four types
- ✅ Legacy routes proxy and show deprecation headers
- ✅ Migration executed and validated
- ✅ Planning Poker works against Story-type items
- ✅ README and in-app help updated
- ✅ QA sign-off + sample data export attached

---

## 12) Open Questions (decide once, be consistent)

- Spike **velocity policy**: story points vs. timebox only (recommended: timebox only + points optional disabled).
- Should Bugs be pulled into sprint with separate WIP limit?
- Keep Story page route as a filter for deep links vs. remove entirely?

---

## 13) Appendix — Example Mongo Index Creation

```python
await db["backlog_items"].create_index([("epic_id", 1), ("rank", 1)])
await db["backlog_items"].create_index([("type", 1), ("status", 1)])
await db["backlog_items"].create_index([("assignee", 1), ("status", 1)])
await db["backlog_items"].create_index([("created_at", -1)])
await db["subtasks"].create_index([("parent_item_id", 1)])
```