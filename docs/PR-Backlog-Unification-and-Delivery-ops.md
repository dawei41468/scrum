# PR: Backlog Unification, Epic UX, Rank, Swimlanes, and Delivery Ops

**Type:** Feature / UX coherence  
**Scope:** Frontend-first; minimal backend changes  
**Targets:** Backlog, Epics, Board, Planning Poker, Audits, Reports

---

## 1) Summary

Unify “Backlog” and “Stories” into a single **Product Backlog** with item **Type** filters (Story/Bug/Task/Spike). Make **Epics** first‑class but creatable from Backlog. Enable **drag-to-rank** using existing rank API. Add **Board swimlanes (by Epic/Assignee)**. Surface **Audits** in an item drawer. Add lightweight **delivery fields** (due date, customer, quantity, unit) and a **Releases** report (client-aggregated). Finish the **Planning Poker** loop (open from story row, write estimate on reveal). Add a basic **Notifications** dropdown.

---

## 2) Objectives & Non-goals

**Objectives**
- One Backlog for all work types with clear filters.
- Reduce confusion between “Backlog” vs “Stories” pages.
- Faster planning via inline Epic create & progress.
- Visual order via drag-to-rank invoking existing API.
- Better execution visibility (swimlanes, audits, delivery fields, releases).
- Tight Planning Poker integration with stories.

**Non-goals**
- Full server-side aggregation endpoints (phase 2).
- Slack/Email notifications (later).

---

## 3) User-facing Changes

- **Navigation**
  - Replace “Stories” route with **Stories** saved filter (Backlog pre-filtered by `type=story`).
- **Backlog**
  - Add **Type** field (Story/Bug/Task/Spike) + filter pills.
  - Inline **“Link to Epic”** with autocomplete and **“+ New Epic”** modal.
  - Show **Epic progress chip** (`Done pts / Total pts` client-computed initially).
  - Enable **drag to rank**; multi-select actions (Move Top/Bottom, Rank after…).
  - Row badges: `Type · Points · Epic · Sprint · Due`.
  - Item drawer tabs: **Details | Subtasks | Comments | Activity (Audits)**.
- **Board**
  - Add **Swimlane selector**: Epic / Assignee (default: None).
- **Planning Poker**
  - “**Plan**” action on story row opens/creates session; after **Reveal**, write **estimate** to story and broadcast via WS.
- **Delivery Ops**
  - Optional fields: `target_date`, `customer`, `ship_to`, `quantity`, `unit` (frontend-first).
  - **Releases** report (group items by `release` string; totals & status).
- **Notifications**
  - Bell icon with dropdown: Assigned to me, Mentioned, Blocked > 24h, Due in 48h.

---

## 4) Data Model / API Impact (Minimal)

- **No breaking changes required.** Start by composing existing `/stories`, `/tasks`, `/subtasks` in the UI.
- Add `type` (enum string) client-side; persist via existing item update endpoints (if present); otherwise introduce `type` field server-side in a later patch.
- Add optional fields (`target_date`, `customer`, `ship_to`, `quantity`, `unit`, `release`) to item payloads in a later backend patch; UI gated behind feature flag.
- Use existing `PATCH /{id}/rank` to persist ranks.
- Use existing audit endpoints in the **Activity** tab.
- Use Planning Poker REST/WS to set estimates on reveal.

---

## 5) UI/Code Changes (Proposed)

### 5.1 Routes
- Remove `/stories` page component from nav; add **Saved Filter** link to `/backlog?type=story`.

### 5.2 Backlog List
- Columns: **Title • Type • Epic • Points • Assignee • Sprint • Due • Rank**
- Add filter bar (Type, Epic, Sprint, Assignee, Label, Due, Status).
- Add **DnD** (react-beautiful-dnd / @dnd-kit) calling rank API:
  ```ts
  await api.items.patchRank(itemId, { afterId });
  ```

### 5.3 Backlog Item Drawer
- Tabs: Details | Subtasks | Comments | **Activity**
- Activity tab calls audits:
  ```ts
  const data = await api.audits.list({ entity: "item", id: itemId });
  ```

### 5.4 Epic UX
- “Link to Epic” autocomplete; **+ New Epic** opens inline modal -> POST /epics
- Epic chip shows progress (client-aggregated points from linked items).

### 5.5 Board Swimlanes
- Dropdown: None | **Epic** | **Assignee**
- Group cards into rows before rendering columns; no backend change needed.

### 5.6 Planning Poker Integration
- Row action: **Plan** -> creates/opens session -> navigate `/planning/:id`
- On **Reveal**, call `PUT /planning/sessions/{id}/estimate` then WS to update row points.

### 5.7 Delivery Fields & Releases
- Add optional fields in item edit form.
- **Reports → Releases** page: client-side group by `release`; show totals, status, due.

### 5.8 Notifications
- Local store + polling (or WS event bus) to show new events in bell dropdown.

---

## 6) File Diff Sketch

```
frontend/
  src/
    pages/
-     StoriesPage.tsx                       (remove)
+     BacklogPage.tsx                       (unified; add filters, DnD, epic chip, drawer tabs)
+     ReleasesPage.tsx                      (new)
    components/
+     BacklogFilters.tsx
+     EpicChip.tsx
+     EpicCreateModal.tsx
+     ItemDrawer/
+       DetailsTab.tsx
+       SubtasksTab.tsx
+       CommentsTab.tsx
+       ActivityTab.tsx                     (calls audits)
+     RankHandle.tsx
+     SwimlaneSelector.tsx
+     NotificationsBell.tsx
    api/
+     rank.ts                               (wrapper for PATCH rank)
+     audits.ts                             (list by entity/id)
      planning.ts                           (ensure setEstimate on reveal)
    state/
+     notifications.store.ts
+     filters.store.ts
```

_Backend (optional, later):_
```
backend/
  app/
    schemas.py   (+ optional fields on ItemSchema: type, target_date, customer, ship_to, quantity, unit, release)
    routers/
      items.py    (optional unified read endpoint, phase 2)
```

---

## 7) Migration & Rollout

- **Phase 1 (UI-only):** remove Stories page, add filters & DnD rank, epic modal, swimlanes, audits tab, Planning Poker hook-up.
- **Phase 2 (Data fields):** add optional delivery/release fields in backend; enable UI toggles.
- No data migration needed for phase 1; phase 2 adds nullable fields.

---

## 8) Acceptance Criteria

- Backlog lists **all item types** with **Type** filter; Stories link opens Backlog filtered to `type=story`.
- **Epic create** works inline; items can be linked/unlinked; epic chip shows progress.
- **Drag-to-rank** persists and survives refresh; multi-select rank actions work.
- **Board swimlanes** render correctly for Epic/Assignee.
- **Activity tab** displays audit history for a selected item.
- From a story row, **Planning Poker** session can be launched; **estimate updates** the story upon reveal.
- **Releases** report groups items and shows totals (client-side agg).
- **Notifications** dropdown shows new events (assignment, mention, due soon).

---

## 9) QA Plan

- Unit tests for filters, rank API calls, epic create modal.
- Integration tests for Planning Poker estimate update + WS refresh.
- Visual tests for Board swimlanes and Backlog DnD.
- Manual smoke: create epic → add items → rank → plan → board swimlanes → audits → release report.

---

## 10) Risks & Mitigations

- **DnD rank conflicts:** debounce & optimistic UI with rollback on failure.
- **Epic progress correctness:** start client-side; move to server aggregation when needed.
- **Notifications noise:** start with in-app only; add per-user preferences later.

---

## 11) Checklist

- [x] Remove Stories route; add saved filter to Backlog (`type=story`).
- [x] Implement Type field & filter pills.
- [ ] Epic autocomplete + “+ New Epic” modal.
- [ ] Epic progress chip (client-aggregated points).
- [ ] DnD rank with API integration; multi-select rank actions.
- [ ] Item drawer with Activity (audits) tab.
- [ ] Board swimlanes (Epic/Assignee).
- [ ] Planning Poker “Plan” from row; set estimate on reveal via REST/WS.
- [ ] Delivery fields (frontend) and Releases report (client-aggregated).
- [ ] Notifications bell dropdown (in-app events).

---

## 12) Notes

- Keep all changes **feature-flagged** behind `unifiedBacklog` for safe rollout.