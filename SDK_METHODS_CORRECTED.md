# WME SDK - ACTUAL Method Signatures (From Real Docs)

## ✅ VERIFIED from C:\repos\WME-SDK-Mirror\production\latest\output\docs\classes.md

### Map Methods - PAN/ZOOM

| Method | Signature | What I Said | ACTUAL |
|--------|-----------|-----------|---------|
| Pan/Zoom to location | `setMapCenter()` | ❌ `Map.flyTo()` | ✅ **`Map.setMapCenter({ lonLat: LonLat, zoomLevel?: ZoomLevel })`** |
| Just pan (no zoom) | `setMapCenter()` only | ❌ `Map.panTo()` | ✅ **`Map.setMapCenter({ lonLat: LonLat })`** |
| Get extent/bbox | `getMapExtent()` | ✅ Correct name | ✅ **`Map.getMapExtent() : BBox`** — Returns `[left, bottom, right, top]` |
| Get center | `getMapCenter()` | ✅ Correct name | ✅ **`Map.getMapCenter() : LonLat`** |
| Get zoom | `getZoomLevel()` | ✅ Correct name | ✅ **`Map.getZoomLevel() : ZoomLevel`** |
| Set zoom | `setZoomLevel()` | ❌ Not suggested | ✅ **`Map.setZoomLevel({ zoomLevel: ZoomLevel })`** |
| Zoom to bounds | `zoomToExtent()` | ❌ Not suggested | ✅ **`Map.zoomToExtent({ bbox: BBox })`** |

### Map Methods - LAYER MANAGEMENT

| Method | Real Signature | Status |
|--------|---|---|
| Add layer | `addLayer({ layerName, styleContext?, styleRules?, zIndexing? })` | ✅ Real |
| Add single feature | `addFeatureToLayer({ feature, layerName })` | ✅ Real (singular) |
| Add multiple features | `addFeaturesToLayer({ features: [], layerName })` | ✅ Real (plural) |
| Remove layer | `removeLayer({ layerName })` | ✅ Real |
| Remove all features | `removeAllFeaturesFromLayer({ layerName })` | ✅ **Real!** (I was wrong) |
| Remove single feature | `removeFeatureFromLayer({ featureId, layerName })` | ✅ Real |
| Remove multiple features | `removeFeaturesFromLayer({ featureIds: [], layerName })` | ✅ Real |
| Redraw layer | `redrawLayer({ layerName })` | ✅ **Real!** (I was unsure) |
| Draw point | `drawPoint({ snapTo?: "segment" })` | ✅ Real (returns Promise) |
| Draw line | `drawLine()` | ✅ Real (returns Promise) |
| Draw polygon | `drawPolygon()` | ✅ Real (returns Promise) |
| Center on geometry | `centerMapOnGeometry({ geometry: Point \| Polygon \| LineString })` | ✅ Real |

---

## ✅ DataModel Methods

### DataModel.Venues

```typescript
// Get all venues
getAll() : Venue[]

// Get by ID
getById({ venueId: string }) : null | Venue

// Add venue
addVenue({ category: VenueCategoryId, geometry: Point | Polygon }) : number

// Delete venue
deleteVenue({ venueId: string }) : void

// Update venue
updateVenue({ venueId: string, ...updates }) : void

// Get venue categories
getVenueMainCategories() : VenueMainCategory[]
getVenueSubCategories() : VenueSubCategory[]

// Get venue address
getAddress({ venueId: string }) : null | VenueAddress

// Charging station stuff
ChargingStation.getNetwork({ venueId })
ChargingStation.getCostType({ venueId })
ChargingStation.getPaymentMethods({ venueId })

// Parking lot stuff
ParkingLot.getParkingType({ venueId })
```

### DataModel.Segments

```typescript
// Get all segments
getAll() : Segment[]

// Get by ID
getById({ segmentId: number }) : null | Segment

// Add segment
addSegment({ geometry: LineString, roadType: RoadTypeId }) : number

// Delete segment
deleteSegment({ segmentIds: number[] }) : void

// Update segment
updateSegment({ segmentIds: number[], ...updates }) : void

// Merge segments
mergeSegments({ segmentIds: [number, number] }) : number

// Split segment
splitSegment({ segmentId: number, geometry: Point }) : [number, number]

// Create roundabout
createRoundabout({ center: LonLat, rx: number, ry: number }) : number[]

// Add intersection
addIntersection({ segmentIds: [number, number] }) : { sourceSplits, targetSplits }

// Get reversed segments
getReversedSegments() : number[]
```

### DataModel.Nodes

```typescript
// Get all nodes
getAll() : Node[]

// Get by ID
getById({ nodeId: number }) : null | Node

// Move node
moveNode({ nodeId: number, geometry: Point }) : void

// Get virtual nodes
getVirtualNodes({ segmentId: number }) : number[]

// Can edit turns
canEditTurns({ nodeId: number }) : boolean

// Get turns from node
getTurnsFrom({ nodeId: number }) : Turn[]
```

### DataModel.Countries/States/Cities

```typescript
// Countries
Countries.getAll() : Country[]
Countries.getById({ countryId: number }) : null | Country
Countries.getTopCountry() : null | Country

// States
States.getAll() : State[]
States.getById({ stateId: number }) : null | State
States.getTopState() : null | State

// Cities
Cities.getAll() : City[]
Cities.getById({ cityId: number }) : null | City
Cities.getCity({ cityName, countryId?, stateId? }) : null | City
Cities.getTopCity() : null | City
Cities.addCity({ cityName, countryId?, stateId? }) : City
```

---

## ✅ Events Methods

```typescript
// Subscribe to event
Events.on({ 
  eventName: string,
  eventHandler: (data?) => void 
}) : void

// Subscribe once (returns Promise)
Events.once({ 
  eventName: string 
}) : Promise<any>

// Unsubscribe
Events.off({ 
  eventName: string,
  eventHandler: (data?) => void 
}) : void
```

### Real Event Names
- `wme-ready` — SDK initialized and ready
- `wme-map-move` — Map being panned
- `wme-map-move-end` — Map pan finished
- `wme-map-zoom-changed` — Zoom changed
- `wme-map-mouse-move` — Mouse moving on map
- `wme-map-mouse-down` — Mouse clicked on map
- `wme-map-mouse-up` — Mouse released on map
- `wme-map-mouse-out` — Mouse left map
- `wme-data-model-objects-added` — Objects added to data model
- `wme-data-model-objects-changed` — Objects changed
- `wme-data-model-objects-removed` — Objects removed
- `wme-data-model-objects-saved` — Objects saved to server
- `wme-layer-visibility-changed` — Layer visibility toggled
- `wme-layer-feature-clicked` — Feature in layer clicked
- `wme-layer-feature-mouse-enter` — Mouse entered feature
- `wme-layer-feature-mouse-leave` — Mouse left feature

---

## ✅ State Methods

```typescript
// Get logged-in user info
State.getUserInfo() : null | UserInfo

// Check if ready (returns Promise)
State.ready() : Promise<void>
```

---

## ✅ Shortcuts Methods

```typescript
// Create shortcut
Shortcuts.createShortcut({
  shortcutId: string,
  description: string,
  shortcutKeys?: string,  // e.g., "shift+a"
  callback: () => void
}) : void

// Delete shortcut
Shortcuts.deleteShortcut({ shortcutId: string }) : void

// Get all shortcuts
Shortcuts.getAllShortcuts() : Shortcut[]

// Check if registered
Shortcuts.isShortcutRegistered({ shortcutId: string }) : boolean

// Check if keys in use
Shortcuts.areShortcutKeysInUse({ shortcutKeys: string }) : boolean
```

---

## ✅ Settings Methods

```typescript
// Get user settings
Settings.getUserSettings() : UserSettings

// Set user settings
Settings.setUserSettings(settings: Partial<UserSettings>) : void

// Get locale
Settings.getLocale() : string
```

---

## ✅ Editing Methods

```typescript
// Get current selection
Editing.getSelection() : null | Selection

// Set selection
Editing.setSelection({
  segmentIds?: number[],
  venueIds?: string[],
  nodeIds?: number[]
}) : void

// Save edits
Editing.save() : Promise<void>
```

---

## ✅ Sidebar Methods

```typescript
// Register script tab
Sidebar.registerScriptTab({
  tabName: string,
  tabLabel: string,
  htmlString?: string
}) : Promise<{ tabLabel: HTMLElement, tabPane: HTMLElement }>
```

---

## 🚨 CORRECTIONS TO MY PREVIOUS MIGRATION GUIDE

### WRONG: `flyTo()` doesn't exist
```javascript
// ❌ WHAT I SAID (WRONG)
wmeSDK.Map.flyTo({
  center: [lon, lat],
  zoom: 7
});

// ✅ WHAT TO REALLY USE
wmeSDK.Map.setMapCenter({
  lonLat: { longitude: lon, latitude: lat },
  zoomLevel: 7
});
```

### WRONG: `panTo()` doesn't exist
```javascript
// ❌ WHAT I SAID (WRONG)
wmeSDK.Map.panTo([lon, lat]);

// ✅ WHAT TO REALLY USE
wmeSDK.Map.setMapCenter({
  lonLat: { longitude: lon, latitude: lat }
});
```

### WRONG: `getMapExtent()` returns different format
```javascript
// ✅ CORRECT (I was right about name, wrong about format)
const extent = wmeSDK.Map.getMapExtent();
// Returns BBox: [left, bottom, right, top]
// NOT { north, south, east, west }

// To convert to n/s/e/w:
const [left, bottom, right, top] = extent;
const bounds = { west: left, south: bottom, east: right, north: top };
```

### RIGHT: These actually exist (I was wrong to doubt them)
- ✅ `removeAllFeaturesFromLayer()` — **IS REAL**
- ✅ `redrawLayer()` — **IS REAL**
- ✅ `addFeatureToLayer()` — **IS REAL** (use singular for one, plural for multiple)

---

## LonLat Format (IMPORTANT!)

The SDK uses **object notation**, NOT arrays:

```javascript
// ❌ WRONG
setMapCenter({ lonLat: [lon, lat] })

// ✅ CORRECT
setMapCenter({ 
  lonLat: { 
    longitude: lon,  // NOT lat
    latitude: lat    // NOT lon
  }
})
```

---

## Updated Coordinate References

- **Feature geometry** uses GeoJSON: `[longitude, latitude]` arrays
- **Map methods** use LonLat objects: `{ longitude, latitude }`
- **BBox from getMapExtent()**: `[left, bottom, right, top]` array

---

## Next Steps

1. **Update your migration guide** with these real method names
2. **Replace all `flyTo()` calls** with `setMapCenter()`
3. **Replace all `panTo()` calls** with `setMapCenter()`
4. **Test coordinate formats** — LonLat vs arrays are different!
5. **Verify data model calls** against this corrected list
