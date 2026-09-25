# Equipment Map: 2D Building and Floor Plans

## Summary

InventorySmart will gain a third equipment-directory view named **Map** alongside the existing tile and table views. The map lets a company maintain several buildings, add floors, draw an approximate 2D layout, and place equipment on that layout. It is an operational navigation tool, not a CAD system: plans are schematic, use no imported background, and do not require real-world scale.

Administrators can edit plans. Other users who can view equipment can inspect the map, search it, open equipment previews, and navigate to equipment details, but cannot change layouts.

## Goals

- Make equipment location understandable at a glance.
- Support multiple buildings and multiple floors per building.
- Let administrators build approximate plans using both rectangular rooms and individual wall segments.
- Let administrators drag unplaced equipment onto a plan and move it between rooms, floors, and buildings.
- Display current equipment status with the same terminology and colours used elsewhere in the application.
- Work with the existing rooms, equipment, company isolation, permissions, and visual themes.
- Keep map viewing useful on desktop, tablet, and mobile devices.

## Non-goals

- CAD-accurate dimensions, measurement, or engineering drawings.
- 3D visualisation.
- Importing PDF, image, DWG, or other floor-plan files.
- Automatic routing, evacuation planning, or indoor navigation.
- Editing the full plan on a small phone screen in the first release.
- Real-time telemetry ingestion; the map only visualises the equipment status already stored by InventorySmart.

## User Experience

### Entry point

The equipment directory header receives a third view button with a map icon. The three choices are Tile, Table, and Map. The selected view may be remembered per user in the browser, following the existing view-selection behaviour.

### View mode

The map page contains:

- building and floor selectors;
- zoom in, zoom out, fit-to-screen, and centre controls;
- search by equipment name or inventory number;
- an optional compact legend for statuses;
- the 2D plan;
- an **Edit** action visible only to administrators.

Equipment markers show a concise name or icon and a status colour:

- green: working;
- grey: reserve;
- red: broken or unavailable;
- yellow: maintenance or attention required;
- neutral fallback: any unknown future status.

Hover or keyboard focus shows the equipment name, inventory number, room, and status. Selecting a marker opens the existing-style equipment preview with its photo, location, status, and a link to the complete equipment page.

### Edit mode

Desktop and tablet edit mode adds:

- a left toolbar with Select, Room, Wall, Label, and Delete tools;
- a right panel with search and equipment not yet placed on any map;
- a snap-to-grid canvas;
- undo for changes made since the current edit session began;
- visible save state: Saving, Saved, or Save failed.

A rectangular room can be created, moved, and resized. When creating it, the administrator selects an existing room from the directory or creates one inline. Its displayed name comes from the linked room record, preventing a second competing room directory.

A wall is a line segment with draggable endpoints. Multiple wall segments can describe an irregular area. Labels are optional free-standing annotations and do not create rooms.

Equipment is dragged from the unplaced panel onto a floor. Existing markers can be moved on the same plan or transferred to another floor/building. Placing a marker inside a linked room updates `equipment.room_id` to that room. Moving it outside all rooms keeps its map placement but clears the room association only after explicit confirmation. A piece of equipment has at most one map placement within its company.

Deleting a floor or building requires confirmation. Its equipment is not deleted; placements are removed and the affected equipment returns to the unplaced list. Existing room records are preserved unless the administrator separately deletes them in the room directory.

### Mobile behaviour

Phones support viewing, building/floor selection, search, pan/zoom, marker selection, and navigation to equipment details. Full drawing and layout editing are disabled on small screens in the first release. Tablets may edit when the available viewport meets the editor's minimum width.

## Data Model

All new records are company-scoped and use UUID primary keys, timestamps, and foreign keys consistent with the existing PostgreSQL schema.

### `map_buildings`

- `id`
- `company_id`
- `name`
- `sort_order`
- `created_at`, `updated_at`

Building names must be non-empty and unique within a company, compared case-insensitively.

### `map_floors`

- `id`
- `company_id`
- `building_id`
- `name`
- `sort_order`
- `canvas_width`, `canvas_height` in logical map units
- `version` for optimistic concurrency control
- `created_at`, `updated_at`

Floor names must be non-empty and unique within a building. Logical dimensions provide a stable SVG coordinate space independent of screen size.

### `map_elements`

- `id`
- `company_id`
- `floor_id`
- `type`: `room`, `wall`, or `label`
- `room_id`, required for `room` and null for other types
- `geometry` as validated JSONB
- `style` as validated JSONB with a small allow-list of supported properties
- `label`, used by free-standing labels
- `z_index`
- `created_at`, `updated_at`

Geometry formats are versioned application objects:

- room: `{ x, y, width, height }`;
- wall: `{ x1, y1, x2, y2 }`;
- label: `{ x, y }`.

Coordinates and sizes are finite numbers constrained to the floor's logical bounds. Room records cannot overlap other room records completely; partial overlap is rejected to avoid ambiguous equipment-to-room resolution. Wall intersections are allowed.

### `equipment_map_placements`

- `equipment_id` as primary key and foreign key;
- `company_id`;
- `floor_id`;
- `x`, `y` in logical map units;
- optional `rotation`, default `0`;
- `created_at`, `updated_at`.

The primary key enforces one placement per equipment item. Server-side validation ensures the equipment and floor belong to the same company.

## API Design

New authenticated endpoints are grouped under `/api/equipment-map`:

- `GET /buildings` returns buildings and their floors.
- `POST /buildings`, `PATCH /buildings/:id`, `DELETE /buildings/:id` manage buildings.
- `POST /buildings/:buildingId/floors`, `PATCH /floors/:id`, `DELETE /floors/:id` manage floors.
- `GET /floors/:id` returns the floor, elements, placements, linked equipment summaries, and current version.
- `PUT /floors/:id/layout` atomically saves elements and placements using the expected floor version.
- `GET /unplaced-equipment` returns searchable equipment without a placement.

Read endpoints require equipment view access. Mutation endpoints require administrator-level equipment management access and are checked on the server. Every query includes the authenticated company identifier; client-supplied company identifiers are ignored.

The atomic layout request contains only supported fields. The server validates UUID ownership, geometry, status-independent equipment placement, and payload limits. It updates linked `equipment.room_id` values in the same database transaction.

## Client Architecture

The map feature is split into focused units:

- `EquipmentMapView`: page-level loading, selectors, permissions, and mode switching;
- `MapToolbar`: editor tools and history actions;
- `BuildingFloorSelector`: building/floor navigation and administrator management actions;
- `FloorCanvas`: responsive SVG viewBox, pan, zoom, selection, and pointer/keyboard input;
- `RoomShape`, `WallShape`, `MapLabel`, and `EquipmentMarker`: isolated SVG renderers;
- `UnplacedEquipmentPanel`: search and drag source;
- `EquipmentMapPreview`: accessible marker preview;
- `useFloorEditor`: draft state, commands, undo, snapping, dirty tracking, and save orchestration;
- `equipmentMapApi`: API calls and response normalisation.

SVG is selected over Canvas because the expected plans contain a manageable number of interactive objects, while SVG provides responsive scaling, native focus targets, inspectable elements, and simpler accessibility. No general-purpose CAD dependency is required.

The editor uses command-based local updates. Pointer movement changes the in-memory draft; persistence is debounced so every pixel movement does not create a request. A manual retry is available after save failure.

## Concurrency, Recovery, and Error Handling

- Each saved floor layout increments `map_floors.version`.
- A save with an old expected version returns HTTP 409 and does not overwrite newer data.
- On conflict, the client preserves its draft and offers Refresh or Keep draft and review; it never silently replaces another administrator's work.
- The latest unsaved draft is stored locally per user and floor. It is removed after a successful save and offered for recovery after reload.
- Network failure leaves the draft editable and clearly marked unsaved.
- Empty-state screens cover companies with no buildings, buildings with no floors, blank floors, and no unplaced equipment.
- Foreign-key conflicts and invalid geometry return field-level or object-level messages suitable for display in the editor.

## Permissions and Audit

- Administrators can create, rename, reorder, and delete buildings/floors; edit layouts; and place equipment.
- Users with equipment view access can inspect the map but cannot mutate it.
- Users without equipment access cannot access map routes or data.
- Server permissions are authoritative; hiding controls is only a user-interface aid.
- Building, floor, layout, and placement mutations are recorded in the existing application history/audit mechanism with actor, company, target, action, and timestamp.

## Visual Design and Accessibility

- The feature uses the application's existing tokens for backgrounds, borders, text, shadows, status badges, focus rings, and primary colour.
- Light, dark, and hybrid themes are supported without hard-coded light panels.
- Controls have labels/tooltips and visible keyboard focus.
- Building and floor selectors, map tools, and equipment markers are keyboard reachable.
- Status is communicated by text/icon as well as colour.
- Reduced-motion preferences disable nonessential transitions.

## Testing Strategy

### Server

- Company isolation for all reads and writes.
- Administrator-only mutations and permitted read-only access.
- Building/floor name and ownership validation.
- Geometry bounds and payload validation.
- Single-placement constraint and cross-floor transfers.
- Room linkage updates in the same transaction as layout saves.
- Version conflict behaviour.
- Delete semantics returning equipment to the unplaced list.
- Audit records for mutations.

### Client

- Switching among tile, table, and map views.
- Empty, loading, error, and populated states.
- Building/floor navigation.
- Drawing and editing rooms and walls with grid snapping.
- Dragging unplaced equipment and moving an existing marker.
- Search, status legend, preview, and equipment navigation.
- Autosave, failed-save recovery, undo, and conflict handling.
- Administrator, view-only, and no-access behaviour.
- Responsive viewing and disabled phone editing.
- Light, dark, and hybrid theme rendering.

### Manual acceptance scenarios

1. An administrator creates two buildings with multiple floors and draws both rectangular rooms and independent walls.
2. Equipment is dragged from Unplaced onto a room and its room association updates.
3. The same equipment is transferred to another building and does not remain on its previous floor.
4. A view-only manager can explore and open equipment but cannot edit the plan.
5. A regular user without equipment permission cannot load map data.
6. Removing a floor preserves equipment and returns it to Unplaced.
7. Two simultaneous administrator sessions cannot silently overwrite each other.
8. Plans remain readable in all three themes and on desktop, tablet, and phone viewports.

## Delivery Sequence

1. Database migration, models, permissions, audit integration, and API validation.
2. Read-only Map view with building/floor navigation, markers, search, and preview.
3. Administrator structure management for buildings and floors.
4. SVG editor for rooms, walls, labels, and equipment placement.
5. Autosave, undo, draft recovery, optimistic concurrency, responsive behaviour, and theme/accessibility polish.
6. Automated tests, end-to-end acceptance checks, and production migration verification.

## Acceptance Criteria

The feature is complete when an administrator can build schematic plans for multiple buildings and floors, use both room rectangles and independent walls, place existing equipment by drag and drop, and see changes persist safely. All authorised viewers can locate and inspect equipment with current status, while non-administrators cannot alter layouts. Existing equipment-room data remains consistent, company data stays isolated, plans work in all supported themes, and equipment is never deleted as a side effect of removing map structures.
