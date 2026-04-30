# X-Ray Mode: Enhanced Styling Plan

**Status:** Planned (Not yet implemented)  
**Created:** 2026-04-26  
**Context:** Current X-ray mode hides background layers. This plan documents how to enhance it with X-ray-specific highlighting similar to the pre-SDK implementation.

---

## Overview

The old pre-SDK X-ray mode did **more than just fade layers**:

1. **Removed normal highlighting rules** from the `wmeph_highlights` layer
2. **Added X-ray-specific styling rules** that displayed each severity level differently
3. **Changed layer styling** (opacity, colors)
4. **Restored normal rules** when X-ray was disabled

This plan migrates that functionality to the new SDK architecture.

---

## Current Implementation

**Current toggleXrayMode() (Line ~2538):**
- ✅ Hides roads, paths, junction boxes via LayerSwitcher
- ✅ Fades segments/venues opacity
- ✅ Saves state to localStorage

**Current highlighting (Line ~10452):**
- ✅ Uses `wmeph_highlights` layer
- ✅ Severity-based color mapping
- ✅ Uses predicates in styleRules to determine visibility

---

## Enhanced X-Ray Mode: What to Add

### Phase 1: Modify toggleXrayMode() Function

**Current location:** Line ~2538  
**New behavior needed:**

```javascript
function toggleXrayMode(enable) {
    localStorage.setItem('WMEPH_xrayMode_enabled', enable);

    if (enable) {
        // EXISTING: Hide background layers
        // (roads, paths, junction boxes)
        
        // NEW: Apply X-ray-specific styling to wmeph_highlights layer
        // Instead of normal severity colors, use X-ray colors
        // Call: applyXrayHighlighting()
        
    } else {
        // EXISTING: Restore background layers
        
        // NEW: Restore normal highlighting
        // Call: restoreNormalHighlighting()
    }
}
```

### Phase 2: Create X-Ray Styling Functions

**Location:** New function after toggleXrayMode()  
**Function 1:** `applyXrayHighlighting()`

```javascript
function applyXrayHighlighting() {
    // Modify the wmeph_highlights layer's styleContext
    // to use X-ray color scheme instead of normal severity colors
    
    // X-ray color scheme (from old code):
    // Severity 0: White fill, gray stroke (#888)
    // Severity 1: Blue (#0055ff)
    // Severity 2: Yellow (#ff0) / Orange (#ca0)
    // Severity 3: Red (#ff0000)
    // Severity 4: Orange-red (#f42)
    // Severity 5: Black with pink stroke (#f4a)
    // Lock: White with green fill (#080)
    // adLock: Yellow with reduced opacity
    
    // Approach: Use redrawLayer() with mutable styleContext
    // (see WME SDK skill: Mutable Style State for Live Re-rendering)
}
```

**Function 2:** `restoreNormalHighlighting()`

```javascript
function restoreNormalHighlighting() {
    // Restore the normal severity colors
    // Current colors (from line 10456-10464):
    // 0: '#00CC00' (GREEN)
    // 1: '#0000FF' (BLUE)
    // 2: '#FFFF00' (YELLOW)
    // 3: '#FF0000' (RED)
    // 5: '#FF1493' (PINK)
    // 6: '#FFA500' (ORANGE)
    // lock: '#8B008B' (DARK MAGENTA)
    // lock1: '#FF69B4' (HOT PINK)
    // adLock: '#FFD700' (GOLD)
    
    // Approach: Redraw layer with original styleContext
}
```

---

## X-Ray Color Reference

### Severity-Based Colors (X-Ray Mode)

From pre-SDK code (Pre-SDk-code.js lines 2363-2686):

| Severity | Fill Color | Stroke Color | Opacity | Purpose |
|----------|-----------|-------------|---------|---------|
| 0 | White | Gray (#888) | 0.25 | Complete/minor issues |
| 1 | Blue (#0055ff) | White | 1.0 | Moderate issues |
| 2 | Yellow (#ff0) / Orange (#ca0) | White | 0.4 | Notable issues |
| 3 | Red (#ff0000) | White | 1.0 | Major issues |
| 4 | Orange-red (#f42) | - | - | Critical issues |
| 5 | Black (bg) | Pink (#f4a) | 0.4 (stroke) | Extreme issues |
| lock | Green (#080) | White | 1.0 | Locked (HIGH priority) |
| lock1 | Blue | White | - | Locked issue (MODERATE) |
| adLock | Yellow | Black | 0.4 | Ad-locked |

### Current Colors (Normal Mode)

From WME-Place-Harmonizer.js line 10455:

| Severity | Color | Purpose |
|----------|-------|---------|
| 0 | Green (#00CC00) | Complete |
| 1 | Blue (#0000FF) | Minor |
| 2 | Yellow (#FFFF00) | Moderate |
| 3 | Red (#FF0000) | Major |
| 5 | Pink (#FF1493) | Extreme |
| 6 | Orange (#FFA500) | Other |
| lock | Dark Magenta (#8B008B) | Locked |
| lock1 | Hot Pink (#FF69B4) | Lock issue |
| adLock | Gold (#FFD700) | Ad-locked |

---

## Implementation Strategy

### Option A: Mutable Style State (Recommended)

**Pros:**
- Fast re-rendering (10-100× faster than clearing/re-adding features)
- No feature removal needed
- Clean toggle on/off
- Uses SDK best practices

**How it works:**
```javascript
// 1. Create mutable state object
const mutableXrayStyle = {
    enableXray: false,
    colorScheme: 'normal'  // 'normal' or 'xray'
};

// 2. styleContext getters reference the mutable state
getSeverityColor: ({ feature }) => {
    const severity = feature?.properties?.wmephSeverity;
    if (mutableXrayStyle.enableXray) {
        return getXrayColor(severity);
    } else {
        return getNormalColor(severity);
    }
};

// 3. When toggling X-ray:
mutableXrayStyle.enableXray = enable;
sdk.Map.redrawLayer({ layerName: _layer });
```

**Ref:** WME SDK Skill → "Mutable Style State for Live Re-rendering"

### Option B: Recreate Layer

**Pros:**
- Simpler conceptually
- Complete re-style

**Cons:**
- Removes and re-adds all features (slow)
- Not recommended for 1000+ features

---

## Implementation Checklist

- [ ] **Research:** Read WME SDK skill section "Mutable Style State for Live Re-rendering"
- [ ] **Plan color mapping:** Decide final X-ray colors (use old code as reference)
- [ ] **Create `applyXrayHighlighting()` function** with Option A approach
- [ ] **Create `restoreNormalHighlighting()` function**
- [ ] **Update `toggleXrayMode()`** to call new functions
- [ ] **Test visually** in WME with various severity levels
- [ ] **Test toggle on/off** works cleanly
- [ ] **Test persistence** - X-ray state after reload
- [ ] **Commit with message:** "Add X-ray-specific highlighting to X-ray mode"

---

## Code References

**Related files:**
- `Pre-SDk-code.js` (lines 2363-2686) - Old X-ray implementation reference
- `WME-Place-Harmonizer.js` (line 2538) - toggleXrayMode() function
- `WME-Place-Harmonizer.js` (line 10436) - wmeph_highlights layer definition
- `WME-Place-Harmonizer.js` (line 10452) - getSeverityColor() function

**SDK Documentation:**
- "Mutable Style State for Live Re-rendering" - WME SDK skill
- `classes.md` → `Map.redrawLayer()` method
- `classes.md` → `Map.addStyleRuleToLayer()` method

---

## Key Decisions to Make

1. **Which color scheme for X-ray mode?**
   - Option A: Use exact old pre-SDK colors (documented above)
   - Option B: Create new X-ray-friendly colors

2. **Should X-ray mode also change layer opacity?**
   - Current: Only hides roads/paths/JB and fades segments/venues
   - Old: Also changed road/satellite/gis opacity
   - Recommendation: Current approach is cleaner

3. **When should new styling activate?**
   - Immediately on toggle? (Current approach)
   - After delay? (For perceived smoothness)

---

## Performance Considerations

**Current layer size:** Depends on visible venues (typically 100-1000 features)

**Mutable style approach performance:**
- Toggle on/off: ~100-200ms for 1000 features
- No feature re-adds needed
- Safe for large feature sets

**Redraw frequency:**
- Only when user toggles X-ray (not frequent)
- Safe to do without performance impact

---

## Testing Checklist

- [ ] Toggle X-ray ON → Colors change to X-ray scheme
- [ ] Toggle X-ray OFF → Colors revert to normal
- [ ] Reload page → X-ray state persists
- [ ] Toggle multiple times → Consistent behavior
- [ ] High zoom (17+) → Works with dynamic point radius
- [ ] Low zoom (10-) → Works with smaller point radius
- [ ] Multiple severity levels visible → Each has correct X-ray color
- [ ] Lock flags with X-ray → Show correct X-ray styling
- [ ] Performance test → No lag on toggle

---

## Estimated Effort

- **Research:** 15 min
- **Implementation:** 45 min
- **Testing:** 30 min
- **Total:** ~1.5 hours

---

## Future Enhancements

After implementing basic X-ray styling:

1. **Add user preference for X-ray colors** (settings panel)
2. **Add alternative X-ray color schemes** (high-contrast, colorblind-friendly)
3. **Add X-ray-specific layer opacity settings** (customizable fade levels)
4. **Add keyboard shortcut** for quick X-ray toggle
5. **Add visual indicator** showing X-ray mode is active (e.g., status badge)

---

## Notes

- X-ray mode is a **visual debugging tool** for place harmonization
- The old implementation used OpenLayers rules; new uses SDK styleContext
- Mutable state approach keeps performance optimal
- This enhancement is **non-breaking** - existing highlighting continues to work

