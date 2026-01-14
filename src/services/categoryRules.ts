import type { WmeSDK, Venue, VenueCategoryId } from 'wme-sdk-typings';
import { lookupPnhData } from './pnhFetcher';
import type { HarmonizationChange, HarmonizationIssue } from '../core/types';
import i18n from '../../locales/i18n';

// Helper to check category (handles type mismatches gracefully)
function hasCategory(categories: VenueCategoryId[], categoryId: string): boolean {
    return categories.some(c => c === categoryId);
}

export interface CategoryRuleResult {
    changes: HarmonizationChange[];
    issues: HarmonizationIssue[];
}

/**
 * Apply category-specific rules to a venue.
 */
export function applyCategoryRules(
    sdk: WmeSDK,
    venue: Venue,
    countryCode?: string | null
): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];
    const categories = venue.categories;

    if (hasCategory(categories, 'PARKING_LOT')) {
        const plaResult = checkParkingLotRules();
        changes.push(...plaResult.changes);
        issues.push(...plaResult.issues);
    }

    if (hasCategory(categories, 'GAS_STATION')) {
        const gasResult = checkGasStationRules(venue, countryCode);
        changes.push(...gasResult.changes);
        issues.push(...gasResult.issues);
    }

    if (hasCategory(categories, 'RESTAURANT')) {
        const restResult = checkRestaurantRules(venue);
        changes.push(...restResult.changes);
        issues.push(...restResult.issues);
    }

    if (hasCategory(categories, 'HOTEL') || hasCategory(categories, 'BED_AND_BREAKFAST')) {
        const hotelResult = checkHotelRules(venue);
        changes.push(...hotelResult.changes);
        issues.push(...hotelResult.issues);
    }

    if (hasCategory(categories, 'CHARGING_STATION')) {
        const chargingResult = checkChargingStationRules(sdk, venue);
        changes.push(...chargingResult.changes);
        issues.push(...chargingResult.issues);
    }

    if (hasCategory(categories, 'BANK_FINANCIAL')) {
        const bankResult = checkBankRules(venue);
        changes.push(...bankResult.changes);
        issues.push(...bankResult.issues);
    }

    // Post Office / USPS
    if (hasCategory(categories, 'POST_OFFICE')) {
        const postResult = checkPostOfficeRules(venue);
        changes.push(...postResult.changes);
        issues.push(...postResult.issues);
    }

    // Stadium / Arena
    if (hasCategory(categories, 'STADIUM_ARENA') || hasCategory(categories, 'SPORTS_ARENA')) {
        const stadiumResult = checkStadiumRules(venue);
        changes.push(...stadiumResult.changes);
        issues.push(...stadiumResult.issues);
    }

    // Hospital / Medical Center
    if (hasCategory(categories, 'HOSPITAL_MEDICAL_CARE') || hasCategory(categories, 'HOSPITAL')) {
        const hospitalResult = checkHospitalRules(venue);
        changes.push(...hospitalResult.changes);
        issues.push(...hospitalResult.issues);
    }

    // Warehouse clubs (Costco, BJ's, Sam's Club)
    const warehouseClubs = ['costco', "bj's", 'sams club', "sam's club"];
    const venueNameLower = (venue.name ?? '').toLowerCase();
    if (warehouseClubs.some(club => venueNameLower.includes(club))) {
        const warehouseResult = checkWarehouseClubRules(venue);
        changes.push(...warehouseResult.changes);
        issues.push(...warehouseResult.issues);
    }

    return { changes, issues };
}

/**
 * Parking Lot: check exit-while-closed setting.
 */
function checkParkingLotRules(): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    const showExitPrompt = localStorage.getItem('ShowPLAExitWhileClosed') === '1';
    if (showExitPrompt) {
        issues.push({
            field: 'exitWhileClosed',
            severity: 'low',
            message: i18n.t('categoryRules.parkingLot.exitWhileClosed')
        });
    }

    return { changes, issues };
}

/**
 * Gas Station: validate brand against PNH data.
 */
function checkGasStationRules(venue: Venue, countryCode?: string | null): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    const brand = (venue.brand ?? '').trim();
    const venueName = (venue.name ?? '').trim();

    if (!brand) {
        issues.push({
            field: 'brand',
            severity: 'medium',
            message: i18n.t('categoryRules.gasStation.missingBrand')
        });
        return { changes, issues };
    }

    let pnhResult = lookupPnhData(brand, countryCode);
    if (!pnhResult.found && venueName) {
        pnhResult = lookupPnhData(venueName, countryCode);
    }

    if (!pnhResult.found) {
        issues.push({
            field: 'brand',
            severity: 'medium',
            message: i18n.t('categoryRules.gasStation.unknownBrand', { brand })
        });
        return { changes, issues };
    }

    const pnhBrand = (pnhResult.data?.brand ?? pnhResult.data?.name ?? '').trim();
    if (pnhBrand && pnhBrand !== brand) {
        changes.push({
            field: 'brand',
            oldValue: brand,
            newValue: pnhBrand,
            reason: i18n.t('categoryRules.gasStation.pnhDataCorrection')
        });
    }

    return { changes, issues };
}

/**
 * Restaurant: require opening hours unless 24/7.
 */
function checkRestaurantRules(venue: Venue): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    const hasHours = (venue.openingHours?.length ?? 0) > 0;
    if (!hasHours) {
        issues.push({
            field: 'openingHours',
            severity: 'high',
            message: i18n.t('categoryRules.restaurant.missingHours')
        });
    }

    return { changes, issues };
}

/**
 * Hotel/Lodging: require hours, phone, URL.
 */
function checkHotelRules(venue: Venue): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    const hasHours = (venue.openingHours?.length ?? 0) > 0;
    const hasPhone = Boolean(venue.phone?.trim());
    const hasUrl = Boolean(venue.url?.trim());

    if (!hasHours) {
        issues.push({
            field: 'openingHours',
            severity: 'high',
            message: i18n.t('categoryRules.hotel.missingHours')
        });
    }

    if (!hasPhone) {
        issues.push({
            field: 'phone',
            severity: 'medium',
            message: i18n.t('categoryRules.hotel.missingPhone')
        });
    }

    if (!hasUrl) {
        issues.push({
            field: 'url',
            severity: 'low',
            message: i18n.t('categoryRules.hotel.missingUrl')
        });
    }

    return { changes, issues };
}

/**
 * Charging Station: require network and payment methods.
 */
function checkChargingStationRules(sdk: WmeSDK, venue: Venue): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: venue.id });
    const paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: venue.id });

    if (!network) {
        issues.push({
            field: 'network',
            severity: 'high',
            message: i18n.t('categoryRules.chargingStation.missingNetwork')
        });
    }

    if (!paymentMethods || paymentMethods.length === 0) {
        issues.push({
            field: 'paymentMethods',
            severity: 'medium',
            message: i18n.t('categoryRules.chargingStation.missingPaymentMethods')
        });
    }

    return { changes, issues };
}

/**
 * Bank: require opening hours (not 24/7).
 */
function checkBankRules(venue: Venue): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    const hasHours = (venue.openingHours?.length ?? 0) > 0;
    if (!hasHours) {
        issues.push({
            field: 'openingHours',
            severity: 'high',
            message: i18n.t('categoryRules.bank.missingHours')
        });
    }

    return { changes, issues };
}

/**
 * Post Office: USPS-specific checks.
 */
function checkPostOfficeRules(venue: Venue): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    const name = (venue.name ?? '').toLowerCase();
    const isUSPS = name.includes('usps') || name.includes('united states post');

    if (isUSPS) {
        // USPS locations should have specific formatting
        // Note: SDK venue type may not expose description, but still check via any cast
        const venueAny = venue as any;
        const hasDescription = Boolean(venueAny.description?.trim());
        if (!hasDescription) {
            issues.push({
                field: 'description',
                severity: 'low',
                message: i18n.t('categoryRules.postOffice.zipPrompt')
            });
        }

        // Check for proper aliases
        const aliases = venue.aliases ?? [];
        const hasUSPSAlias = aliases.some(a => a.toLowerCase().includes('post office'));
        if (!hasUSPSAlias && !name.includes('post office')) {
            issues.push({
                field: 'aliases',
                severity: 'low',
                message: i18n.t('categoryRules.postOffice.alias')
            });
        }
    }

    return { changes, issues };
}

/**
 * Stadium/Arena: special attention required.
 */
function checkStadiumRules(venue: Venue): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    // Stadiums often need careful handling
    issues.push({
        field: 'stadium',
        severity: 'low',
        message: i18n.t('categoryRules.stadium.verifyLayout')
    });

    const hasUrl = Boolean(venue.url?.trim());
    if (!hasUrl) {
        issues.push({
            field: 'url',
            severity: 'medium',
            message: i18n.t('categoryRules.stadium.urlMissing')
        });
    }

    return { changes, issues };
}

/**
 * Hospital: special attention required.
 */
function checkHospitalRules(venue: Venue): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    // Hospitals need careful handling
    issues.push({
        field: 'hospital',
        severity: 'low',
        message: i18n.t('categoryRules.hospital.verifyEntrance')
    });

    const hasPhone = Boolean(venue.phone?.trim());
    if (!hasPhone) {
        issues.push({
            field: 'phone',
            severity: 'high',
            message: i18n.t('categoryRules.hospital.phoneRequired')
        });
    }

    return { changes, issues };
}

/**
 * Warehouse Club: Costco, BJ's, Sam's Club specific rules.
 */
function checkWarehouseClubRules(venue: Venue): CategoryRuleResult {
    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];

    const name = (venue.name ?? '').toLowerCase();

    // These often have gas stations that should be separate
    if (name.includes('gas') || name.includes('fuel')) {
        issues.push({
            field: 'category',
            severity: 'low',
            message: i18n.t('categoryRules.warehouseClub.gasStationSeparate')
        });
    }

    // Check for pharmacy
    if (name.includes('pharmacy')) {
        issues.push({
            field: 'category',
            severity: 'low',
            message: i18n.t('categoryRules.warehouseClub.pharmacySeparate')
        });
    }

    // Warehouse clubs should have hours
    const hasHours = (venue.openingHours?.length ?? 0) > 0;
    if (!hasHours) {
        issues.push({
            field: 'openingHours',
            severity: 'medium',
            message: i18n.t('categoryRules.warehouseClub.missingHours')
        });
    }

    return { changes, issues };
}
