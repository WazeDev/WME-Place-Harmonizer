# WMEPH Severity Mapping

This document explains how WMEPH determines and displays place severity levels for both highlighting and banner display.

---

## Severity Levels (Enum)

```javascript
const SEVERITY = {
  GREEN: 0, // Complete / No issues
  BLUE: 1, // Minor issues
  YELLOW: 2, // Moderate issues
  RED: 3, // Major issues
  PINK: 5, // Extreme issues
  ORANGE: 6, // Other issues
};

// Special lock-related severities
('lock'); // Locked place with no issues
('lock1'); // Locked place with minor issues
('adLock'); // Ad-locked place
```

---

## Severity Colors

All severity levels map to hex colors used for both map layer visualization and banner display:

```javascript
const SEVERITY_COLORS = {
  [SEVERITY.GREEN]: '#00CC00', // complete
  [SEVERITY.BLUE]: '#0000FF', // minor issues
  [SEVERITY.YELLOW]: '#FFFF00', // moderate issues
  [SEVERITY.RED]: '#FF0000', // major issues
  [SEVERITY.PINK]: '#FF1493', // extreme issues
  [SEVERITY.ORANGE]: '#FFA500', // other issues
  lock: '#8B008B', // locked
  lock1: '#FF69B4', // lock issue
  adLock: '#FFD700', // ad-locked
};
```

---

## How Severity is Calculated

### 1. **Flag-Based Severity**

Each flag (validation check) has its own severity level. The overall severity is determined by taking the **maximum severity of all active flags**.

```javascript
// Algorithm: Total severity = highest severity among all flags
totalSeverity = Math.max(flag1.severity, flag2.severity, flag3.severity, ...)
```

### 2. **What Gets Checked? (Flag Categories)**

#### **Identification Issues** (Name, Phone, Address, URL)

**Phone Validation:**

- Phone Missing (no phone number) → **BLUE** (Flag.PhoneMissing)
- Phone Invalid (malformed format) → **YELLOW** (Flag.PhoneInvalid)
- Bad Area Code (invalid for region) → **YELLOW** (Flag.BadAreaCode)
- Recommended Phone Available → **BLUE** (Flag.AddRecommendedPhone)

**URL Validation:**

- URL Missing (no URL) → **BLUE** (Flag.UrlMissing)
- URL Invalid (malformed format) → **YELLOW** (Flag.InvalidUrl)
- URL Mismatch (doesn't match PNH data) → **BLUE** (Flag.UrlMismatch)
- URL Analytics Issue → **YELLOW** (Flag.UrlAnalytics)

**Other:**

- Missing zip code or invalid format → **BLUE/RED**
- Mismatched data patterns → **BLUE/YELLOW**

#### **Hours Issues**

- No Hours (place has no opening hours) → **BLUE** (Flag.NoHours)
- Hours Overlap (overlapping time ranges) → **RED** (Flag.HoursOverlap)
- Old Hours (not updated in 3+ years) → **YELLOW** (Flag.OldHours)
- All Day Hours Fixed (converted 00:00-23:59 to "All Day") → **YELLOW** (Flag.AllDayHoursFixed)
- Indiana Liquor Store Hours (special state rule) → _No explicit severity_ (Flag.IndianaLiquorStoreHours)

#### **Services & Amenities**

**Parking Lot Attributes:**

- Parking Lot Type Missing → **RED** (Flag.PlaLotTypeMissing) — PUBLIC/RESTRICTED/PRIVATE not set
- Parking Cost Type Missing → **BLUE** (Flag.PlaCostTypeMissing) — FREE/LOW/MODERATE/EXPENSIVE not set
- Parking Payment Type Missing → **BLUE** (Flag.PlaPaymentTypeMissing) — Paid lot without payment methods selected

**EV Charging Station Attributes:**

- EVCS Alt Name Missing → **BLUE** (Flag.EVCSAltNameMissing) — Missing "EV Charging Station" alternate name
- EVCS Price Missing → **BLUE** (Flag.EVCSPriceMissing) — FREE/FEE not specified
- Add Common EV Payment Methods → **BLUE** (Flag.AddCommonEVPaymentMethods) — Missing standard network payment types
- Remove Uncommon EV Payment Methods → **BLUE** (Flag.RemoveUncommonEVPaymentMethods) — Has non-standard payment types for network

**Other Service Issues:**

- EV Charging Station Warning → _Informational_ (Flag.EVChargingStationWarning) — Reminder to follow guidelines

#### **Category & Location Issues**

**Geometry Type Issues:**

- Point Not Area → **Variable** (Flag.PointNotArea) — Severity = `maxAreaSeverity` (YELLOW or RED)
  - RED if category should never be area
  - YELLOW if category can be either type
- Area Not Point → **Variable** (Flag.AreaNotPoint) — Severity = `maxPointSeverity` (BLUE, YELLOW, or RED)
  - RED if category should never be point
  - YELLOW if category can be either type
  - BLUE if minor geometry conflict

**Category Mapping Issues:**

- Parent Category → **YELLOW** (Flag.ParentCategory) — Parent category not typically mapped in this region/state
- Suspect Description → **YELLOW** (Flag.SuspectDesc) — Description may contain Google/Yelp copyrighted text

**Lock Status:**

- Place Locked → _Informational_ (Flag.PlaceLocked) — Place is being locked at the determined lock level (severity depends on final state)

#### **PVA (Place Verification Attribute) - What Is It?**

PVA is **NOT a WME venue attribute**. Rather, it's a **verification flag from the PNH (Place Name Harmonizer) database** that indicates whether a place **category should be a Point place or an Area place** in WME.

**Source of PVA Values:**

- Comes from `pnhCategoryInfo.point` and `pnhCategoryInfo.area` properties
- Part of the PNH data loaded from spreadsheet import for USA and Canada
- Represents guidelines for how each category is typically mapped
- Overridable based on special cases (residential areas, rest stops, post offices, etc.)

**PVA Values and What They Mean:**

| PVA Code     | Severity             | Meaning                                                                     |
| ------------ | -------------------- | --------------------------------------------------------------------------- |
| `''` (empty) | **RED**              | Category should NOT be mapped as this type (strong mismatch)                |
| `'0'`        | **RED**              | Category should NOT be mapped as this type (strong mismatch)                |
| `'1'`        | **GREEN**            | Category is appropriate as this type                                        |
| `'2'`        | **BLUE**             | Category can be this type (secondary/less common)                           |
| `'3'`        | **YELLOW**           | Category can be this type (alternate/rare case)                             |
| `'hosp'`     | **RED** or **GREEN** | Special hospital rule: RED for general hospitals, GREEN for Emergency Rooms |

**How PVA Severity Works:**

1. WMEPH gets the PVA value from PNH category info
2. `getPvaSeverity()` maps that value to a severity level
3. The severity reflects how well the place geometry (point vs. area) matches the category standard
4. **HIGH severity (RED)** = Strong mismatch, likely needs geometry correction
5. **LOW severity (GREEN/BLUE)** = Acceptable or flexible, no correction needed

**PVA vs. Actual Geometry:**

- PVA = What the category _should_ be (from guidelines)
- Actual geometry = What the place currently is in WME
- If they don't match → Flag raised (PointNotArea or AreaNotPoint)

#### **Lock-Related Special Severities**

These are **NOT normal flags**, but special severity overrides that apply during **highlight-only mode**:

- **`'lock'`** — Place is locked (lockRank increased) with NO other issues
  - Triggers when: `totalSeverity === SEVERITY.GREEN && placeLockedFlag.hlLockFlag`
  - Color: Dark Magenta (#8B008B)
- **`'lock1'`** — Place is locked with MINOR issues present
  - Triggers when: `totalSeverity === SEVERITY.BLUE && placeLockedFlag.hlLockFlag`
  - Color: Hot Pink (#FF69B4)
- **`'adLock'`** — Place is ad-locked (read-only to general editors)
  - Triggers when: `venue.adLocked === true`
  - Color: Gold (#FFD700)

**Lock Conditions:**

- Lock only happens if `args.lockOK` is true AND `totalSeverity < SEVERITY.YELLOW`
- Locks are determined to the user's permission level (can't lock above user rank)
- In highlight-only mode, the lock severity is stored as the wmephSeverity for map display

#### **Special Extreme Issues (PINK - Severity 5)**

PINK severity is assigned in two specific scenarios — both represent **critical safety/security concerns**:

##### **Scenario 1: Locked Critical Facilities (Highlight-Only Mode)**

When highlighting a place during harmonization:

```javascript
if (
  venue.lockRank === 0 && // Place is UNLOCKED
  venue.categories.includes(HOSPITAL_MEDICAL_CARE || HOSPITAL_URGENT_CARE || GAS_STATION)
) {
  totalSeverity = SEVERITY.PINK;
}
```

**Why This Matters:**

- Hospitals and urgent care facilities should ALWAYS be locked (high security)
- Gas stations should ALWAYS be locked (prevent vandalism/spam)
- An unlocked facility of this type is a **critical oversight** → PINK

##### **Scenario 2: Missing Address on Critical Facilities (Highlight-Only Mode)**

When a place has no address during FullAddressInference check in highlight mode:

```javascript
if (args.highlightOnly && (!args.addr.state || !args.addr.country) && venue.categories.includes(HOSPITAL_MEDICAL_CARE || HOSPITAL_URGENT_CARE || GAS_STATION)) {
  severity = SEVERITY.PINK;
  logDev('Unaddressed HUC/GS');
}
```

**Why This Matters:**

- Critical facilities **must have complete address data**
- Missing address means the place cannot be properly located/verified
- These facilities are highest priority for data integrity

**Special Handling:**

- If place is ad-locked: severity becomes `'adLock'` (Gold) instead
- For junction/interchange: severity becomes GREEN (lower priority)
- For other categories: severity becomes RED (normal critical issue)

**Banner Display:**

- PINK severity appears in the banner background as Hot Pink (#FF1493)
- Indicates to the user this place needs immediate attention
- Not a typical flag, but an automatic severity override

**Map Display:**

- PINK stroke color on map shows critical issues
- Visible at all zoom levels to alert mappers

---

## How the Map Highlighting Works

### Map Layer Visualization

The map layer uses **styleContext functions** to determine:

1. **Fill Color** (for parking lots)
   - Based on `parkingType` property
   - PUBLIC → Blue
   - RESTRICTED → Yellow
   - PRIVATE → Red

2. **Stroke Color** (severity indicator)
   - Based on `wmephSeverity` property
   - References `SEVERITY_COLORS` map
   - Each severity level shows appropriate color

### Map Layer Priority Rules

The layer applies styling rules in priority order:

```
1. wmephHighlight = '1'           → Magenta stroke only (highest priority)
   (Manual highlight filter)

2. wmephSeverity = 'lock'/'lock1'/'adLock'
   → Stroke only with appropriate color

3. parkingType + wmephSeverity > 0
   → Fill color (parking type) + Stroke (severity)

4. wmephSeverity > 0 (severity only)
   → Stroke only, no fill

5. parkingType (parking only, no severity)
   → Fill color only
```

---

## How the Banner Works

### Banner Color Assignment

The banner background displays a single color based on the **overall severity of the place**.

```javascript
// Algorithm:
1. Start with SEVERITY.GREEN (0)
2. Iterate all active flags
3. totalSeverity = max(totalSeverity, each flag.severity)
4. Check special lock conditions
5. Display banner background in SEVERITY_COLORS[totalSeverity]
```

### Banner Display Logic

```javascript
const bgColor = SEVERITY_COLORS[totalSeverity] || SEVERITY_COLORS[SEVERITY.GREEN];
$('#WMEPH_banner').css({ 'background-color': bgColor }).append(rowDivs);
```

### Banner Color Reference

| Color                      | Severity            | Meaning                                   |
| -------------------------- | ------------------- | ----------------------------------------- |
| **Green** (#00CC00)        | SEVERITY.GREEN (0)  | Place is complete, all checks pass        |
| **Blue** (#0000FF)         | SEVERITY.BLUE (1)   | Minor issues detected, needs attention    |
| **Yellow** (#FFFF00)       | SEVERITY.YELLOW (2) | Moderate issues, secondary data conflicts |
| **Red** (#FF0000)          | SEVERITY.RED (3)    | Major issues, missing critical data       |
| **Pink** (#FF1493)         | SEVERITY.PINK (5)   | Extreme issues, category/lock mismatch    |
| **Orange** (#FFA500)       | SEVERITY.ORANGE (6) | Other special issues                      |
| **Dark Magenta** (#8B008B) | 'lock'              | Locked place, no issues                   |
| **Hot Pink** (#FF69B4)     | 'lock1'             | Locked place with minor issues            |
| **Gold** (#FFD700)         | 'adLock'            | Ad-locked place                           |

---

## Severity Calculation Examples

### Example 1: Restaurant with Missing Phone

```
Flags evaluated:
  - Name check      → GREEN (valid)
  - Phone check     → RED (missing)
  - Hours check     → GREEN (valid)
  - Services check  → BLUE (incomplete)

Result: max(GREEN, RED, GREEN, BLUE) = RED
Banner color: #FF0000 (Red)
Map stroke: Red highlight
```

### Example 2: Gas Station, Locked, No Issues

```
Flags evaluated:
  - All checks      → GREEN

Special check:
  - lockRank = 0
  - category = GAS_STATION
  - Result: PINK (extreme issue)

Banner color: #FF1493 (Pink)
Map stroke: Pink highlight
```

### Example 3: Parking Lot - Verified but Needs Services

```
Flags evaluated:
  - Category check  → YELLOW (services incomplete)
  - PVA check       → BLUE (verified secondary)
  - Other checks    → GREEN

Result: max(YELLOW, BLUE, GREEN) = YELLOW
Banner color: #FFFF00 (Yellow)
Map fill: Yellow (parking type) + Yellow stroke (severity)
```

---

## Highlight-Only Mode (Map Highlighting)

When the user toggles "Color Highlighting" without full harmonization:

```javascript
// Severity is determined the same way as banner
// But with these additions:

1. Calculate totalSeverity from all flags
2. Check special cases:
   - Hospital/Urgent Care/Gas with lock level 0 → PINK
3. Check lock flags:
   - If locked with GREEN → 'lock'
   - If locked with BLUE → 'lock1'
4. Check ad-lock:
   - If ad-locked → 'adLock'

Result: wmephSeverity property set on venue
        Map layer renders using SEVERITY_COLORS
```

---

## Key Points

- **Single Source of Truth**: `SEVERITY_COLORS` constant used for both map and banner
- **Accumulative Logic**: Severity = highest severity among all active flags
- **Special Cases**: Lock status, ad-lock, and extreme category mismatches override normal severity
- **Map vs Banner**: Same color, different rendering (stroke on map, background in banner)
- **User Rank Limit**: Places can only be locked to user's current rank level or below

---

## Related Constants

```javascript
SEVERITY; // Severity level enum (GREEN, BLUE, YELLOW, RED, PINK, ORANGE)
SEVERITY_COLORS; // Hex color mapping for each severity level
BANNER_SEVERITY_COLORS; // (deprecated - use SEVERITY_COLORS)
MAP_SEVERITY_COLORS; // (deprecated - use SEVERITY_COLORS)
PARKING_TYPE_COLORS; // Parking lot type colors (PUBLIC, RESTRICTED, PRIVATE)
UI_COLORS; // General UI colors for buttons, text, etc.
```

---

## Files & Functions

- **Severity Calculation**: `harmonizePlace()` → `harmonizePlaceGo()`
- **Flag Evaluation**: `Flag.*` classes evaluate conditions
- **Banner Assembly**: `assembleBanner()` (around line 8450)
- **Map Highlighting**: `sdk.Map.addLayer()` styleContext functions (around line 10880)
- **PVA Mapping**: `getPvaSeverity()` function (line 2467)
