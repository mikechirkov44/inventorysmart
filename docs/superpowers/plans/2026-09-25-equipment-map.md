# Equipment Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a company-scoped, administrator-editable 2D building map to the equipment directory.

**Architecture:** PostgreSQL stores buildings, floors, SVG elements, and one placement per equipment item. Express exposes company-scoped read endpoints and administrator-only mutations. React renders a responsive SVG canvas with a compact editor and reuses the existing equipment and room records.

**Tech Stack:** PostgreSQL, Express/CommonJS, React 19, SVG, Axios, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-25-equipment-map-design.md`

## Global Constraints

- Plans are approximate 2D diagrams without imported backgrounds or real-world scale.
- Multiple buildings and floors are supported.
- Only administrators may mutate map data; equipment viewers may read it.
- All records and queries are company-scoped.
- Equipment remains intact when map structures are deleted.
- Existing light, dark, and hybrid themes must remain supported.

## Review Focus

- Cross-company identifiers must be rejected instead of exposing or changing foreign data.
- Malformed or out-of-bounds SVG geometry must return 400 without partial saves.
- One equipment item must never be placed on two floors.
- A stale layout version must return 409 instead of overwriting newer data.
- Deleting a building/floor must remove placements but not equipment.

---

### Task 1: Schema and validation

**Files:**
- Modify: `server/db.js`
- Create: `server/utils/equipmentMapValidation.js`
- Create: `server/tests/equipmentMapValidation.test.js`

**Interfaces:**
- Produces: `validateLayoutPayload(payload, bounds)` returning normalised elements/placements or throwing a validation error.

- [ ] Write Node tests for supported geometry, invalid types, non-finite/out-of-bounds coordinates, duplicate equipment placements, and payload limits.
- [ ] Run the test and confirm it fails because the validation module is absent.
- [ ] Implement strict validation and add idempotent company-scoped map tables/indexes to the startup migration.
- [ ] Run the validation tests and confirm they pass.

### Task 2: Company-scoped model and API

**Files:**
- Create: `server/models/equipmentMap.js`
- Create: `server/routes/equipmentMap.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `validateLayoutPayload` from Task 1.
- Produces: `/api/equipment-map/buildings`, building/floor mutation endpoints, `/floors/:id`, `/floors/:id/layout`, and `/unplaced-equipment`.

- [ ] Add route-contract tests for administrator enforcement, version conflicts, and malformed payload handling.
- [ ] Run tests and confirm the missing route/model failures.
- [ ] Implement building/floor CRUD, floor reads, transactional versioned layout saves, room synchronisation, and unplaced equipment search.
- [ ] Register the protected route and run server tests.

### Task 3: Map view and API client

**Files:**
- Modify: `client/src/services/api.js`
- Modify: `client/src/pages/EquipmentPage.jsx`
- Create: `client/src/pages/EquipmentMap.jsx`
- Create: `client/src/components/equipment-map/EquipmentMapPreview.jsx`

**Interfaces:**
- Consumes: Task 2 HTTP endpoints and existing AuthContext permissions.
- Produces: third Map view, building/floor navigation, responsive SVG, equipment search/preview, and status legend.

- [ ] Add pure client tests for status presentation and map coordinate helpers.
- [ ] Run tests and confirm helpers are absent.
- [ ] Add the API wrapper, Map toggle, read-only map states, marker preview, pan/zoom controls, and responsive SVG rendering.
- [ ] Run client tests and production build.

### Task 4: Administrator editor

**Files:**
- Create: `client/src/components/equipment-map/MapToolbar.jsx`
- Create: `client/src/components/equipment-map/UnplacedEquipmentPanel.jsx`
- Create: `client/src/components/equipment-map/mapEditor.js`
- Modify: `client/src/pages/EquipmentMap.jsx`

**Interfaces:**
- Consumes: layout save API, rooms API, and Task 3 canvas.
- Produces: room/wall/label creation, selection, dragging, resizing, equipment placement, undo, and save states.

- [ ] Add reducer tests for adding, moving, resizing, deleting, placing equipment, and undo.
- [ ] Run tests and confirm the editor reducer is absent.
- [ ] Implement building/floor management, tools, pointer interactions, unplaced equipment drag/drop, debounced versioned saves, and conflict/error recovery.
- [ ] Run reducer tests and production build.

### Task 5: Styling, accessibility, and release verification

**Files:**
- Modify: `client/src/App.css`

**Interfaces:**
- Consumes: Tasks 3-4 CSS class contract.
- Produces: theme-aware desktop/tablet/mobile presentation and accessible focus/empty/error states.

- [ ] Add theme-aware styles using existing CSS variables and a mobile read-only layout.
- [ ] Run server tests, lint, client production build, and inspect the full diff for secrets or unrelated changes.
- [ ] Commit the implementation and push the requested branch to GitHub.
