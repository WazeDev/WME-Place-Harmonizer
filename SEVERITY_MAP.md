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

#### **Identification Issues** (Name, Phone, Address, URL, External Providers)

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

**Address Validation:**

- House Number Missing → **RED** (Flag.HnMissing) — Venue has street & city but no house number. Severity varies:
  - **RED** for most categories (requires editing)
  - **GREEN** for Puerto Rico or scenic lookouts (no HN expected)
  - **BLUE** for parking lots with low lock rank (pending lock verification)
  - **GREEN** if whitelisted (user confirmed acceptable)
- House Number Too Many Digits → **YELLOW** (Flag.HnTooManyDigits) — HN contains more than 6 digits
- House Number Out of Range → **YELLOW** (Flag.HNRange) — HN anomalous compared to nearby venues on same street
- Street Missing → **RED** (Flag.StreetMissing) — Venue has city but no street name
  - Exception: **BLUE** for scenic lookouts (SCENIC_LOOKOUT_VIEWPOINT category)
- City Missing → **RED** (Flag.CityMissing) — Venue has no city (inferred from nearby segments if possible)
  - Exception: **BLUE** for residential places in highlight-only mode (checking without harmonizing)
- Full Address Inference Failed → **RED** (Flag.FullAddressInference) — Cannot determine state/country (blocks harmonization)

**Data Source:** Address comes from `sdk.DataModel.Venues.getAddress()` (VenueAddress object). If missing, inferred from nearby segments via `sdk.DataModel.Segments.getAddress()`.

**External Provider IDs (Google Places Links):**

- No Google Link (externalProviderIds empty) → **YELLOW** (Flag.ExtProviderMissing) — Default state
  - **RED if:** No link AND venue is locked AND not edited for 26+ weeks (6 months) AND not currently modified → `makeRed()` triggered
  - Only shown to R2+ editors (experienced users)
  - Exempt categories: Bridges, Tunnels, Junctions/Interchanges, Natural Features, Islands, Water Bodies (Sea/Lake/Pool, Rivers/Streams, Canals), Swamps/Marshes, and Parking Lots (if disabled)

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

---

## Address Data Sources & Properties

### VenueAddress Interface (SDK)

The WME SDK provides address information via `sdk.DataModel.Venues.getAddress({ venueId })`:

```javascript
interface VenueAddress extends BaseAddress {
  houseNumber: null | string;          // House/Building number
  street: null | Street;                // Street object with isEmpty property
  city: null | City;                    // City object with isEmpty property
  state: null | State;                  // State object
  country: null | Country;              // Country object
  isEmpty: boolean;                     // True if all address fields are empty
}
```

### Address Property Validation

- **`args.hasStreet`**: Set at line 8528 → `(args.addr?.street && !args.addr.street.isEmpty)`
- **`args.hasCity`**: Set at line 8529 → `(args.addr?.city && !args.addr.city.isEmpty)`
- **`args.currentHN`**: Set at line 8523 → `args.addr?.houseNumber` (from VenueAddress, NOT venue.houseNumber which doesn't exist)

### Address Inference Fallback

When a venue has incomplete address data, WMEPH attempts to infer missing components from nearby road segments:

1. Collect all segments near the venue via `sdk.DataModel.Segments.getAll()`
2. For each segment, get address via `sdk.DataModel.Segments.getAddress({ segmentId })`
3. Search for segments with complete address info (street name required)
4. Use first valid address found (prioritized by road type/distance)
5. Returns inferred address or null if unavailable

**Result:** If inference succeeds, `args.addr` is updated with complete address. If it fails, `FullAddressInference` flag is raised (RED severity).

---

---

## Complete Flag Reference

This section documents ALL flags evaluated by WMEPH, organized by category.

### Category Flags (40+ flags)

**Bank & ATM:**

- **BankType1** → **RED**: Name contains "ATM" but category is Offices. Clarify bank type.
- **BankBranch** → **BLUE**: Interactive flag asking if this is a bank branch office.
- **BankCorporate** → **BLUE**: Interactive flag asking if this is bank corporate offices.
- **AddATM** → **BLUE**: Interactive flag asking if there's an ATM at this location.
- **StandaloneATM** → **YELLOW**: Interactive flag asking if this is a standalone ATM (no bank branch).

**Gas Station Validation:**

- **GasMismatch** → **RED** (whitelistable): Gas brand should be included in place name. Links to wiki guidelines.
- **GasUnbranded** → **RED**: "Unbranded" should not be used for station brand. Change or delete.
- **GasMkPrim** → **RED** (actionable): Gas Station should be the primary category. Button to fix.
- **GasNoBrand** → **BLUE**: Gas station with no brand specified (when brand data should be present).
- **IsThisAPilotTravelCenter** → **Variable** (TN-specific): Tennessee "Pilot Food Mart" should be "Pilot Travel Center".

**Hotel & Accommodation:**

- **HotelMkPrim** → **RED** (actionable, whitelistable): Hotel category not first. Button to make it primary.
- **CatHotel** → **Variable**: Hotel category validation (exact severity context-dependent).

**Medical & Professional:**

- **ChangeToPetVet** → **RED** (actionable, whitelistable): Name keywords suggest Pet/Veterinarian category. Button to change.
- **NotASchool** → **RED** (whitelistable): Name keywords suggest this should NOT be School category.
- **ChangeToHospitalUrgentCare** → **Variable**: Name suggests category should be Hospital/Urgent Care.
- **ChangeToDoctorClinic** → **Variable**: Name suggests category should be Doctor/Clinic.
- **NotAHospital** → **Variable**: Name keywords suggest this should NOT be Hospital category.

**Post Office & Mail Services:**

- **CatPostOffice** → **RED**: USPS post office with missing category or incorrect format.
- **IsThisAPostOffice** → **Yellow/Blue** (interactive): Asking if place is a post office based on name keywords.
- **MissingUSPSAlt** → **YELLOW**: USPS post office missing standard alternate names.
- **MissingUSPSDescription** → **YELLOW**: USPS post office missing description field.
- **MissingUSPSZipAlt** → **YELLOW**: USPS post office missing ZIP code alternate name.
- **FormatUSPS** → **YELLOW**: USPS post office name format doesn't match spec.

**Retail & Parking:**

- **SubFuel** → **BLUE**: Fuel service at substitute location (gas station that's not primary).
- **AddSuper** → **BLUE**: Supermarket category recommendation based on name.
- **AddPharm** → **BLUE**: Pharmacy category recommendation based on name.
- **AddConvStore** → **BLUE**: Convenience store category recommendation based on name.
- **PlaCanExitWhileClosed** → **BLUE**: Parking lot exit can be used while lot is closed.
- **NoPlaStopPoint** → **RED**: Parking lot missing stop point geometry.
- **PlaStopPointUnmoved** → **YELLOW**: Parking lot stop point hasn't been moved (still at default).
- **PlaHasAccessibleParking** → **BLUE**: Parking lot has accessible parking spaces.
- **PlaSpaces** → **BLUE**: Parking lot space count validation (if applicable).
- **PlaLotElevationMissing** → **BLUE**: Parking lot missing elevation attribute (if relevant).

**Geometry & Point/Area:**

- **PointNotArea** → **Variable** (YELLOW or RED): Category should be a point place, not area. Auto-GREEN if locked or whitelisted.
- **AreaNotPoint** → **Variable** (BLUE, YELLOW, or RED): Category should be area place, not point. Auto-GREEN if locked, whitelisted, or college name detected.

**Name & Text:**

- **NameMissing** → **RED**: Place name is missing (excludes residences and special categories).
- **GasNameMissing** → **RED** (actionable): Gas station name missing. Button to use gas brand.
- **PlaNameMissing** → **BLUE** (no lock): Parking lot name missing. Requires R3+ lock request/confirmation.
- **PlaNameNonStandard** → **YELLOW** (whitelistable): Parking lot name doesn't contain standard words (Parking, Lot, Garage, etc.).
- **LocalizedName** → **Variable**: Place has localized (non-English) name that should be verified.
- **TitleCaseName** → **Variable**: Place name formatting needs title-case correction.
- **ResiTypeName** → **Variable**: Residence-type place name validation.

**Description & Content:**

- **CheckDescription** → **Variable**: Place description needs review/verification.
- **SuspectDesc** → **YELLOW** (whitelistable): Description may contain copyrighted text (Google/Yelp).

**Hours & Availability:**

- **NoHours** → **BLUE**: Place has no opening hours specified.
- **HoursOverlap** → **RED**: Overlapping hours of operation. Place might not save.
- **OldHours** → **YELLOW**: Hours haven't been updated in 3+ years.
- **AllDayHoursFixed** → **YELLOW**: 00:00-23:59 hours converted to "All Day" format.
- **Mismatch247** → **YELLOW** (whitelistable): Hours/24-7 status mismatch with expected data.
- **AppendAMPM** → **YELLOW**: Hours missing AM/PM designation (auto-corrected).

**URL & Website:**

- **UrlMissing** → **BLUE**: No URL/website specified.
- **InvalidUrl** → **YELLOW**: URL malformed or invalid format.
- **UrlMismatch** → **BLUE** (whitelistable): URL doesn't match PNH/expected data.
- **UrlAnalytics** → **YELLOW**: URL missing or has analytics tracking issues.
- **LocalURL** → **Variable**: URL is local/internal, may need validation.
- **ClearThisUrl** → **YELLOW**: Specific invalid URL flagged for auto-removal (e.g., Nissan Europe).

**Phone & Contact:**

- **PhoneMissing** → **BLUE**: No phone number specified.
- **PhoneInvalid** → **YELLOW**: Phone format is malformed.
- **BadAreaCode** → **YELLOW**: Area code invalid for region.
- **AddRecommendedPhone** → **BLUE**: Recommended phone available for this place.
- **ClearThisPhone** → **YELLOW**: Specific invalid phone flagged for auto-removal (e.g., Nissan Europe).

**Data & External Integrations:**

- **LocationFinder** → **Variable**: Store finder URL population (severity based on GPS availability).
- **ExtProviderMissing** → **YELLOW** (RED if locked 26+ weeks): No Google Places link/external provider ID.

**Category-Specific Issues:**

- **ParentCategory** → **YELLOW** (whitelistable): Parent category not typically mapped in this region.
- **UnmappedRegion** → **BLUE or YELLOW** (whitelistable): Category is rare/unmapped in this region.
- **ChainIsClosed** → **Variable**: Chain location appears to be permanently closed.

**Edit History & Maintenance:**

- **IgnEdited** → **Variable**: Place ignores recent edits (possible stale data).

**Miscellaneous:**

- **Overlapping** → **Variable**: Geometry overlaps with other places.
- **PlaceMatched** → **Variable**: Place matched to PNH entry (informational).
- **PnhCatMess** → **Variable**: Category from PNH data needs clarification.
- **SpecCaseMessage** → **Variable**: Special case handling message.
- **NewPlaceSubmit** → **Variable**: New place submission message/approval.
- **ApprovalSubmit** → **Variable**: Place approval/submission status.
- **LockRPP** → **Variable**: Request for Place Properties lock.
- **SFAliases** → **BLUE**: Service facility (EVCS) aliases need updating.
- **WazeBot** → **Variable**: Bot-detected place or modification.
- **HnDashRemoved** → **YELLOW**: House number contained dashes that were removed.

**Rest Area Specific:**

- **RestAreaName** → **RED** (whitelistable): Rest area name format out of spec. Should be "Rest Area [Name] - [Description]".
- **RestAreaNoTransportation** → **YELLOW** (actionable): Rest area shouldn't use Transportation category. Button to remove.
- **RestAreaGas** → **RED**: Gas stations at rest areas should be separate area places.
- **RestAreaScenic** → **Variable** (whitelistable, actionable): Verify if Scenic Overlook category is appropriate for rest area.
- **RestAreaSpec** → **RED** (whitelistable, actionable): Place name suggests it's a rest area but category missing.

**EV Charging Stations:**

- **EVChargingStationWarning** → **Informational** (no severity): Reminder to follow EVCS guidelines. Don't delete EVCS entries.
- **EVCSAltNameMissing** → **BLUE** (actionable): Public/restricted EVCS should have "EV Charging Station" alternate name.
- **EVCSPriceMissing** → **BLUE** (interactive, no-lock): EVCS cost type (FREE/FEE) not specified. Interactive buttons to select.
- **AddCommonEVPaymentMethods** → **BLUE**: Missing standard network payment methods for EVCS.
- **RemoveUncommonEVPaymentMethods** → **BLUE**: Has non-standard payment methods for EVCS network.

**Locking & Permissions:**

- **PlaceLocked** → **Informational**: Place is locked at indicated lock level (only in highlight mode, colored 'lock', 'lock1', or 'adLock').

---

## Files & Functions

- **Severity Calculation**: `harmonizePlace()` → `harmonizePlaceGo()`
- **Flag Evaluation**: `Flag.*` classes evaluate conditions
- **Address Retrieval**: `getVenueAddress()` (line 1486), `getSegmentAddress()` (line 1496)
- **Address Inference**: `inferAddress()` (line 10414)
- **Address Properties Setup**: Lines 8523-8529 in `harmonizePlaceGo_impl()`
- **Banner Assembly**: `assembleBanner()` (around line 8450)
- **Map Highlighting**: `sdk.Map.addLayer()` styleContext functions (around line 10880)
- **PVA Mapping**: `getPvaSeverity()` function (line 2467)
