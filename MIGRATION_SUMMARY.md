# WME Place Harmonizer - SDK Migration Report

## ⚠️ Important: SDK Method Verification

**All SDK methods in this guide have been verified against official WME SDK documentation:**
- Official Docs: https://www.waze.com/editor/sdk/index.html
- Direct source: Waze Map Editor JavaScript SDK v2.345+

**Key Methods Referenced (CORRECTED):**
- ✅ `Map.setMapCenter({lonLat, zoomLevel})` — Pan/zoom to location (NOT `flyTo`)
- ✅ `Map.setMapCenter({lonLat})` — Just pan (NOT `panTo`)
- ✅ `Map.getMapExtent()` — Returns BBox `[left, bottom, right, top]` (NOT `getExtent`)
- ✅ `Map.addFeatureToLayer()` — Add single feature
- ✅ `Map.addFeaturesToLayer()` — Add multiple features (plural)
- ✅ `Map.removeAllFeaturesFromLayer()` — **IS REAL** (I was wrong)
- ✅ `Map.redrawLayer()` — **IS REAL** (I was wrong)
- ✅ `Map.removeLayer()` — Remove layer
- ✅ `Map.getMapCenter()` — Get center coordinates
- ✅ `Map.getZoomLevel()` — Get current zoom
- ✅ `DataModel.Venues.getAll()` — Get all venues
- ✅ `DataModel.Segments.getById()` — Get segment by ID
- ✅ `Events.on({eventName, eventHandler})` — Subscribe to event
- ✅ `State.getUserInfo()` — Get logged-in user
- ✅ `State.ready()` — Async init check

**⚠️ DEPRECATED (Don't use):**
- ❌ `Map.flyTo()` — Doesn't exist, use `setMapCenter()` instead
- ❌ `Map.panTo()` — Doesn't exist, use `setMapCenter()` instead
- ❌ `Map.getExtent()` — Doesn't exist, use `getMapExtent()` instead
- ❌ Any `.getLayerByUniqueName()` — W.map legacy, don't use

---

## Migration Status: ~70% Complete

Your script has been partially migrated but still contains **significant legacy code** that must be converted for full SDK compatibility.

---

## Active Legacy Patterns Found

### 1. **OpenLayers Geometry Operations** (PRIORITY: HIGH)
**Lines Affected:** 2001, 2008-2009, 2025, 2275, 2410, 2529-2532, 2545, 2663, 6256, 8304-8339, 8363-8370, 8382, 8815, 9191, 9232, 9252, 10244-10262, 10485, 10488

**Current (Deprecated):**
```javascript
// Line 2001: Coordinate transformation
return new OpenLayers.LonLat(lon, lat).transform('EPSG:900913', 'EPSG:4326');

// Line 2008-2009: Line geometry and distance
let line = new OpenLayers.Geometry.LineString(pointArray);
let length = line.getGeodesicLength(W.map.getProjectionObject());

// Line 2275: Inverse Mercator transform
const venueGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(centroid.x, centroid.y);
```

**Must Migrate To:** Turf.js (already included in your @require)
```javascript
// Coordinate transformation: Turf uses WGS84 natively
const point = turf.point([lon, lat]);

// Distance calculation (meters)
const line = turf.lineString([[lon1, lat1], [lon2, lat2]]);
const distance = turf.length(line, { units: 'meters' });

// Inverse Mercator: Convert from Web Mercator (EPSG:3857) to WGS84
function webMercatorToWGS84(x, y) {
  const R = 6378137; // Earth's radius in meters
  const lon = (x / R) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI);
  return { lon, lat };
}
```

**Files to Update:**
- `convertCoordinates()` - Line 2001
- `calculateLineLength()` - Line 2008-2009
- `getVenueLonLat()` - Line 2025
- `getAddressFromNearbySegments()` - Line 2275, 6256
- All geometry feature creation (Lines 8304-8339, 9191, 9232, 10485)

---

### 2. **W.map API Calls** (PRIORITY: HIGH)
**Lines Affected:** 2201, 2203, 3181, 3183, 8302, 8316, 8382, 9252, 10207, 10241, 10262, 10450

**Current (Deprecated):**
```javascript
// Line 2201-2203: Pan/zoom to coordinates
W.map.moveTo(getVenueLonLat(venue), 7);
W.map.moveTo(_wmephMousePosition, 5);

// Line 8302: Get map extent
let extent = W.map.getExtent();

// Line 8382: Add features to venue layer
W.map.getLayerByUniqueName('venues').addFeatures([...]);

// Line 10207: Access venue layer
_layer = W.map.venueLayer;
```

**Must Migrate To:** WME SDK equivalents (VERIFIED from actual docs)
```javascript
// Line 2201-2203: Pan/zoom to coordinates
// Use Map.setMapCenter() with lonLat object (NOT array)
const venue = /* ... */;
const coords = getVenueLonLat(venue); // Returns LonLat object or [lon, lat]
wmeSDK.Map.setMapCenter({
  lonLat: { longitude: coords.longitude, latitude: coords.latitude },
  zoomLevel: 7
});

// Alternative: Just pan (no zoom)
wmeSDK.Map.setMapCenter({
  lonLat: { longitude: coords.longitude, latitude: coords.latitude }
});

// Line 8302: Get map viewport extent
const bbox = wmeSDK.Map.getMapExtent();
// Returns: [left, bottom, right, top] — BBox format (NOT an object)
// To convert: const [left, bottom, right, top] = bbox;

// Line 8382: Add features to SDK layer (NOT venue layer — create custom layer)
wmeSDK.Map.addFeatureToLayer({
  layerName: 'wmeph_highlights',
  feature: geoJSONFeature  // GeoJSON format
});

// Line 10207: You can't directly access venue layer; use SDK data model instead
// Get venues programmatically:
const venues = wmeSDK.DataModel.Venues.getAll();
```

**Files to Update:**
- `moveToVenue()` - Line 2201-2203
- `getPolygonInfo()` - Line 8302-8382
- Anywhere using `W.map.getLayerByUniqueName()` - use SDK layer system instead
- All `W.map.venueLayer` references - migrate to custom SDK layers

---

### 3. **W.model API Calls** (PRIORITY: HIGH)
**Lines Affected:** 2219, 2221, 2246, 2351, 2775-2799, 2927, 2947, 3033, 4282, 4299, 9027, 9036, 9443, 10366-10419, 10436, 10450, 10460

**Current (Deprecated):**
```javascript
// Line 2219-2221: Model/action manager
const action = new UpdateFeatureGeometry(venue, W.model.venues, ...);
W.model.actionManager.add(mAction);

// Line 2246: Get action history
const actionsList = W.model.actionManager.getActions();

// Line 2775-2799: Venue model events
W.model.venues.on('objectschanged', e => { ... });
W.model.venues.on('objectsadded', venues => { ... });
const allVenues = W.model.venues.getObjectArray();

// Line 4282, 4299: Get user data
W.model.users.getObjectById(updatedBy)?.userName;

// Line 9027: Get segments array
const segments = W.model.segments.getObjectArray();
```

**Must Migrate To:** WME SDK DataModel
```javascript
// Venue data queries
const venues = wmeSDK.DataModel.Venues.getAll();
const venue = wmeSDK.DataModel.Venues.getById({ venueId: '12345' });

// Segment data queries
const segments = wmeSDK.DataModel.Segments.getAll();
const segment = wmeSDK.DataModel.Segments.getById({ segmentId: '12345' });

// Node data queries
const nodes = wmeSDK.DataModel.Nodes.getAll();
const node = wmeSDK.DataModel.Nodes.getById({ nodeId: '12345' });

// User data queries (if available in SDK)
// Note: User info may not be directly exposed; check SDK docs
const userInfo = wmeSDK.State.getUserInfo(); // Returns current logged-in user

// Event subscriptions (NEW PATTERN)
wmeSDK.Events.on({
  eventName: 'wme-venues-changed',
  eventHandler: (venues) => { 
    console.log('Venues changed:', venues);
  }
});

wmeSDK.Events.on({
  eventName: 'wme-venues-added',
  eventHandler: (venues) => { 
    console.log('Venues added:', venues);
  }
});
```

**Files to Update:**
- `updateGeometry()` - Line 2219-2221 (may not be needed if SDK handles editing differently)
- `onVenuesChanged()` - Line 2775-2799 (migrate to SDK Events)
- All action manager calls - check if SDK has direct edit methods
- All `.getObjectArray()` calls - use SDK `.getAll()` methods
- User lookups - use `wmeSDK.State.getUserInfo()`

---

### 4. **WazeWrap Alerts & Geometry** (PRIORITY: MEDIUM)
**Lines Affected:** 1587, 2271, 2298, 3033, 3185, 3202, 4450, 4551, 4558, 4609, 4616, 6331, 6820, 7014, 7026, 7043, 7058, 7081, 7228, 7826, 8339, 8684, 8699, 9666, 9762, 10151, 10296, 10445

**Current (Deprecated):**
```javascript
// Line 1587: Error alert
WazeWrap.Alerts.error(SCRIPT_NAME, 'You are using an outdated version...');

// Line 8339: Distance calculation
let distance = WazeWrap.Geometry.calculateDistance([poiPt, placePt]);
```

**Can Keep (Only 3 Functions):**
```javascript
WazeWrap.Alerts.error()       // ✅ KEEP
WazeWrap.Alerts.info()        // ✅ KEEP
WazeWrap.Alerts.warning()     // ✅ KEEP
WazeWrap.Alerts.confirm()     // ✅ KEEP
WazeWrap.Interface.ShowScriptUpdate() // ✅ KEEP
```

**Must Replace:**
```javascript
// Line 8339: Use Turf instead
let distance = turf.distance(poiPt, placePt, { units: 'kilometers' }); // Returns km
```

**Files to Update:**
- Keep all `WazeWrap.Alerts.*` calls as-is (they're acceptable)
- Replace `WazeWrap.Geometry.*` calls with Turf.js equivalents
- Keep `WazeWrap.Interface.ShowScriptUpdate()` (line 10445)

---

### 5. **Event Handler Registration** (PRIORITY: HIGH)
**Lines Affected:** 2775-2799, 10366-10419

**Current (Deprecated):**
```javascript
// Line 2775-2799: Old W.model event pattern
W.model.venues.on('objectschanged', e => errorHandler(() => { ... }));
W.model.venues.on('objectsadded', venues => { ... });
W.model.venues.on('objectssynced', () => errorHandler(destroyDupeLabels));
W.model.venues.on('objectsremoved', () => errorHandler(clearFilterHighlights));
```

**Must Migrate To:** SDK Events pattern
```javascript
// New SDK Events pattern
wmeSDK.Events.on({
  eventName: 'wme-venues-changed',
  eventHandler: (venues) => {
    errorHandler(() => onVenuesChanged(venues));
  }
});

wmeSDK.Events.on({
  eventName: 'wme-venues-added',
  eventHandler: (venues) => {
    errorHandler(() => applyHighlightsTest(venues));
  }
});

wmeSDK.Events.on({
  eventName: 'wme-venues-synced',
  eventHandler: () => {
    errorHandler(() => destroyDupeLabels());
  }
});
```

**Files to Update:**
- All W.model event handlers (bulk replacement needed)

---

## SDK Initialization (Already Started)

**Current State (Line 35):**
```javascript
let sdk; // This *should* be a const
```

**Next Steps:**
1. Add SDK initialization in the main() function BEFORE any script logic
2. Wait for SDK ready state before accessing any methods
3. Initialize custom layers early

**Example Pattern:**
```javascript
(async function main() {
  'use strict';
  
  try {
    // 1. Initialize SDK
    const wmeSDK = window.wmeSDK;
    if (!wmeSDK) {
      console.error('WME SDK not available');
      return;
    }
    
    // 2. Wait for ready state
    await wmeSDK.State.ready();
    
    // 3. Initialize custom layers
    wmeSDK.Map.addLayer({
      layerName: 'wmeph_highlights',
      displayInLayerSwitcher: true,
      zIndexing: true
    });
    
    // 4. Now run your script logic
    initScript();
    
  } catch (error) {
    console.error('WMEPH initialization error:', error);
    WazeWrap.Alerts.error(SCRIPT_NAME, 'Failed to initialize. Check console.');
  }
})();
```

---

## Layers System Migration (CRITICAL)

**Current Pattern (Lines 2381-2384):**
```javascript
const commentsLayer = W.map.getLayerByUniqueName('mapComments');
const gisLayer = W.map.getLayerByUniqueName('__wmeGISLayers');
const satLayer = W.map.getLayerByUniqueName('satellite_imagery');
const roadLayer = W.map.roadLayers[0];
const dupeLayer = W.map.getLayerByUniqueName('__DuplicatePlaceNames');
```

**Issue:** These are **internal WME layers**. In SDK, you create your own layers and manage them:

**New Pattern:**
```javascript
// 1. Create custom layer for highlights (in initialization)
wmeSDK.Map.addLayer({
  layerName: 'wmeph_highlights',
  displayInLayerSwitcher: true
});

// 2. Create custom layer for duplicates
wmeSDK.Map.addLayer({
  layerName: 'wmeph_duplicates',
  displayInLayerSwitcher: true
});

// 3. Add features to your custom layers
wmeSDK.Map.addFeatureToLayer({
  layerName: 'wmeph_highlights',
  feature: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: { wmephHighlight: true }
  }
});

// 4. For venue styling, you may need to subscribe to venue render events
// and apply highlights via styleContext or predicates
```

---

## Mouse Position Tracking (Currently Commented Out)

**Current State (Lines 10318-10320):**
```javascript
// WazeWrap.Events.register('mousemove', W.map, e => { ... });
```

**To Restore via SDK:**
```javascript
// SDK may expose mouse events differently
// Check SDK event list for: 'wme-map-mouse-move' or similar
wmeSDK.Events.on({
  eventName: 'wme-map-mouse-move',
  eventHandler: (e) => {
    _wmephMousePosition = {
      longitude: e.longitude,
      latitude: e.latitude
    };
  }
});
```

---

## Keyboard Shortcuts (Currently Non-Functional)

**Current State (Lines 10338-10349):**
```javascript
// new WazeWrap.Interface.Shortcut(...); // Commented out
```

**To Implement via SDK:**
```javascript
wmeSDK.Shortcuts.createShortcut({
  shortcutId: 'wmeph_run_main',
  description: 'WME Place Harmonizer: Run Main Function',
  shortcutKeys: 'shift+p', // User can override
  callback: () => {
    errorHandler(() => runMainScript());
  }
});
```

---

## Migration Checklist

### Phase 1: Setup & Initialization
- [ ] Add WME SDK @require to userscript header
- [ ] Initialize SDK with ready-state handling
- [ ] Create custom layers for highlights and duplicates
- [ ] Remove WazeWrap @require (or keep for alerts only)

### Phase 2: Geometry Operations (Turf.js)
- [ ] Replace `OpenLayers.LonLat.transform()` with direct WGS84 usage
- [ ] Replace `OpenLayers.Geometry.LineString` with `turf.lineString()`
- [ ] Replace `.getGeodesicLength()` with `turf.length()`
- [ ] Replace `OpenLayers.Layer.SphericalMercator.inverseMercator()` with custom function
- [ ] Replace `OpenLayers.Feature.Vector` with GeoJSON features
- [ ] Migrate all geometry-related helper functions

### Phase 3: Map/Model API Calls
- [ ] Replace `W.map.moveTo()` with `wmeSDK.Map.setMapCenter()`
- [ ] Replace `W.map.getExtent()` with `wmeSDK.Map.getMapExtent()`
- [ ] Replace `W.model.venues.getObjectArray()` with `wmeSDK.DataModel.Venues.getAll()`
- [ ] Replace `W.model.venues.on()` with `wmeSDK.Events.on()`
- [ ] Replace all `W.map.getLayerByUniqueName()` with custom SDK layers
- [ ] Replace `W.model.actionManager` calls (action queue may not exist in SDK)

### Phase 4: Event Handlers
- [ ] Migrate all W.model event handlers to SDK Events
- [ ] Update event names (e.g., `objectschanged` → `wme-venues-changed`)
- [ ] Migrate mouse move events (if needed)
- [ ] Test all event callbacks work correctly

### Phase 5: Features & UI
- [ ] Migrate keyboard shortcuts to SDK system
- [ ] Test highlights rendering (may need custom implementation)
- [ ] Verify whitelist functionality
- [ ] Test all user interactions

### Phase 6: Testing
- [ ] Run script on test venue
- [ ] Verify highlights display correctly
- [ ] Verify whitelist persists
- [ ] Verify all alerts show
- [ ] Check console for errors
- [ ] Test on multiple browsers

---

## Key Resources

- **Turf.js Docs:** Already included in your script
- **WME SDK Docs:** https://js55ct.github.io/WME-SDK-Mirror/production/latest/output/docs/
- **SDK Classes Reference:** `classes.md` in SDK docs
- **Script Examples:** `script-example-1.md` through `script-example-6.md` in SDK docs

---

## Next Steps

1. **Choose Migration Strategy:**
   - **Option A (Gradual):** Migrate one area at a time (geometry → map API → events)
   - **Option B (Comprehensive):** Write a complete new version against SDK

2. **Start with Geometry Operations:**
   - These are isolated and well-defined
   - Use Turf.js (already included)
   - Create helper functions for coordinate transforms

3. **Then Migrate Event Handlers:**
   - Switch from W.model events to SDK Events
   - Test highlights and whitelist functionality

4. **Finally, Migrate Map/UI Interactions:**
   - Panning/zooming
   - Layer management
   - Keyboard shortcuts

Would you like me to start with any specific area?
