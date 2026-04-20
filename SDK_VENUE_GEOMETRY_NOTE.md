# Important Discovery: SDK Venue Geometry

## Key Finding

The **SDK DataModel Venue objects already have `.geometry` as GeoJSON**, NOT OpenLayers format!

```typescript
// SDK Venue interface
interface Venue {
  geometry: Point | Polygon;  // ← Already GeoJSON, already WGS84!
  // ... other properties
}
```

## Impact on Migration

### Before Migration (W.model venues)
```javascript
// Old W.model style (OpenLayers format)
const centroid = venue.getOLGeometry().getCentroid();
const lonLat = { x: centroid.x, y: centroid.y };
```

### After Migration (SDK DataModel venues)
```javascript
// New SDK style (GeoJSON format, WGS84)
if (venue.geometry.type === 'Point') {
  const lonLat = {
    longitude: venue.geometry.coordinates[0],
    latitude: venue.geometry.coordinates[1]
  };
} else {
  const centroid = turf.centroid(venue.geometry);
  const lonLat = {
    longitude: centroid.geometry.coordinates[0],
    latitude: centroid.geometry.coordinates[1]
  };
}
```

## Remaining getOLGeometry() Calls

Currently there are **11 remaining `getOLGeometry()` calls** in the script:
- Line 3858: `venue.getOLGeometry()`
- Line 6250: `venue.getOLGeometry()` (removed)
- Line 8333: Selected object geometry
- Line 8676: `venue.getOLGeometry()`
- Line 8986: `selectedVenue.getOLGeometry()`
- Line 9064: `testVenue.getOLGeometry()`
- Line 9323-9324: Node geometry (different object)
- Line 9368: `venue.getOLGeometry()`
- Line 9375: Geometry distance (complex)
- Line 10500: `v.getOLGeometry()`

**These will disappear when:**
1. **Phase 3 (Events)**: Migrate from `W.model.venues` to `sdk.DataModel.Venues`
2. **Phase 4 (Layers)**: Migrate layer management

Once venues come from SDK DataModel, they'll have `.geometry` directly and `getOLGeometry()` won't exist.

## Notes

- **No custom conversion helper needed** — SDK venues are already WGS84
- **Turf.centroid() usage** — For polygons, use `turf.centroid(venue.geometry)` to get center
- **All coordinates are [lon, lat]** — GeoJSON standard, WGS84 format
- **This simplifies Phase 1 significantly** — Most geometry work is already done by the SDK!
