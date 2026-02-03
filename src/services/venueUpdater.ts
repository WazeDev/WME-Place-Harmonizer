import type { WmeSDK } from 'wme-sdk-typings';
import type { OpeningHour } from 'wme-sdk-typings';
import { logInfo, logError, logDebug } from '../core/logger';
import type { HarmonizationChange } from '../core/types';
import { parseAndFormatHours } from './hoursAdapter';
import { addToWhitelist } from './storageService';
import type { WhitelistEntry } from '../core/types';
import { withErrorBoundary } from '../utils/errorHandler';
import i18n from '../../locales/i18n';

export interface UpdateResult {
    success: boolean;
    message: string;
}

/**
 * Apply a single harmonization change to a venue via SDK.
 */
export async function applyChange(
    sdk: WmeSDK,
    venueId: string | number,
    change: HarmonizationChange
): Promise<UpdateResult> {
    try {
        const venueIdStr = String(venueId);
        const updates: Record<string, any> = {
            venueId: venueIdStr
        };

        // Map field name to SDK parameter
        switch (change.field) {
            case 'name':
                updates.name = change.newValue;
                break;
            case 'brand':
                updates.brand = change.newValue;
                break;
            case 'aliases':
                updates.aliases = Array.isArray(change.newValue) ? change.newValue : [];
                break;
            case 'categories':
                updates.categories = Array.isArray(change.newValue) ? change.newValue : [];
                break;
            case 'services':
                updates.services = Array.isArray(change.newValue) ? change.newValue : [];
                break;
            case 'description':
                updates.description = change.newValue ?? '';
                break;
            case 'phone':
                updates.phone = change.newValue;
                break;
            case 'url':
                updates.url = change.newValue;
                break;
            case 'lockRank': {
                const lockRank = Number(change.newValue);
                if (!Number.isFinite(lockRank)) {
                    return { success: false, message: i18n.t('update.invalidLockRankValue') };
                }
                updates.lockRank = lockRank;
                break;
            }
            case 'openingHours':
                // Parse textual hours if needed, or use pre-formatted array
                if (typeof change.newValue === 'string') {
                    const parsed = parseAndFormatHours(change.newValue);
                    if (parsed) {
                        updates.openingHours = parsed;
                    } else {
                        return { success: false, message: i18n.t('update.failedParseHours') };
                    }
                } else {
                    // Assume newValue is already a stringified JSON array or formatted
                    try {
                        updates.openingHours = JSON.parse(String(change.newValue || '[]')) as OpeningHour[];
                    } catch {
                        return { success: false, message: i18n.t('update.invalidHoursFormat') };
                    }
                }
                break;
            case 'navigationPoints':
                await withErrorBoundary(
                    {
                        operation: 'replaceNavigationPoints',
                        venueId: venueIdStr,
                        details: { count: Array.isArray(change.newValue) ? change.newValue.length : 0 },
                    },
                    () => sdk.DataModel.Venues.replaceNavigationPoints({
                        venueId: venueIdStr,
                        navigationPoints: Array.isArray(change.newValue) ? change.newValue : []
                    })
                );
                logInfo(`Applied navigation points to venue ${venueIdStr}`);
                return { success: true, message: i18n.t('update.updatedNavigationPoints') };
            default:
                return { success: false, message: i18n.t('update.unknownField', { field: change.field }) };
        }

        await withErrorBoundary(
            {
                operation: 'updateVenue',
                venueId: venueIdStr,
                details: { field: change.field, newValue: change.newValue },
            },
            () => sdk.DataModel.Venues.updateVenue(updates as Parameters<typeof sdk.DataModel.Venues.updateVenue>[0])
        );
        logInfo(`Applied change to venue ${venueId}: ${change.field} → ${change.newValue}`);
        return { success: true, message: i18n.t('update.updatedField', { field: change.field }) };
    } catch (error) {
        logError(`Failed to apply change to venue ${venueId}`, error);
        return {
            success: false,
            message: i18n.t('update.errorUpdatingField', {
                field: change.field,
                message: error instanceof Error ? error.message : i18n.t('errors.unknown')
            })
        };
    }
}

/**
 * Apply all changes from harmonization report to a venue and save.
 * Uses SDK updateVenue() to persist changes.
 * @param sdk - WME SDK instance
 * @param report - Result from analyzeVenue()
 * @returns Object with success status, applied count, and error messages
 */
export async function applyAllChanges(
    sdk: WmeSDK,
    report: { venueId: string | number; changes: HarmonizationChange[] }
): Promise<{ success: boolean; appliedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let appliedCount = 0;

    try {
        if (!report.changes || report.changes.length === 0) {
            return { success: true, appliedCount: 0, errors: [] };
        }

        const venueIdStr = String(report.venueId);

        const lockRankChange = report.changes.find(change => change.field === 'lockRank');
        if (lockRankChange) {
            const lockRank = Number(lockRankChange.newValue);
            if (Number.isFinite(lockRank)) {
                await withErrorBoundary(
                    {
                        operation: 'updateVenue.lockRank',
                        venueId: venueIdStr,
                        details: { lockRank },
                    },
                    () => sdk.DataModel.Venues.updateVenue({
                        venueId: venueIdStr,
                        lockRank
                    } as Parameters<typeof sdk.DataModel.Venues.updateVenue>[0])
                );
            } else {
                const errMsg = i18n.t('update.invalidLockRankForVenue', { venueId: report.venueId });
                logError(errMsg);
                errors.push(errMsg);
            }
        }

        // Handle address changes separately (street and city)
        const addressChanges = report.changes.filter(c => ['street', 'city'].includes(c.field));
        if (addressChanges.length > 0) {
            await applyAddressChanges(sdk, report.venueId, addressChanges);
        }

        const navigationChange = report.changes.find(c => c.field === 'navigationPoints');
        if (navigationChange) {
            await withErrorBoundary(
                {
                    operation: 'replaceNavigationPoints',
                    venueId: venueIdStr,
                    details: { count: Array.isArray(navigationChange.newValue) ? navigationChange.newValue.length : 0 },
                },
                () => sdk.DataModel.Venues.replaceNavigationPoints({
                    venueId: venueIdStr,
                    navigationPoints: Array.isArray(navigationChange.newValue) ? navigationChange.newValue : []
                })
            );
        }

        // Build a single update payload from all changes
        const updates: Record<string, any> = {
            venueId: venueIdStr
        };

        for (const change of report.changes) {
            if (change.field === 'lockRank' || ['street', 'city', 'navigationPoints'].includes(change.field)) {
                continue; // Skip lockRank and address changes, handled separately
            }
            switch (change.field) {
                case 'name':
                    updates.name = change.newValue;
                    break;
                case 'brand':
                    updates.brand = change.newValue;
                    break;
                case 'aliases':
                    updates.aliases = Array.isArray(change.newValue) ? change.newValue : [];
                    break;
                case 'categories':
                    updates.categories = Array.isArray(change.newValue) ? change.newValue : [];
                    break;
                case 'services':
                    updates.services = Array.isArray(change.newValue) ? change.newValue : [];
                    break;
                case 'description':
                    updates.description = change.newValue ?? '';
                    break;
                case 'phone':
                    updates.phone = change.newValue;
                    break;
                case 'url':
                    updates.url = change.newValue;
                    break;
                case 'openingHours':
                    // Parse textual hours if needed, or use pre-formatted array
                    if (typeof change.newValue === 'string') {
                        const parsed = parseAndFormatHours(change.newValue);
                        if (parsed) {
                            updates.openingHours = parsed;
                        }
                    } else {
                        // Assume newValue is already a stringified JSON array or formatted
                        try {
                        updates.openingHours = JSON.parse(String(change.newValue || '[]')) as OpeningHour[];
                    } catch {
                        const errMsg = i18n.t('update.failedParseHoursForVenue', { venueId: report.venueId });
                        logError(errMsg);
                        errors.push(errMsg);
                    }
                }
                break;
            }
        }

        if (Object.keys(updates).length > 1) {
            // Apply all non-lock updates in one call
            await withErrorBoundary(
                {
                    operation: 'updateVenue.bulk',
                    venueId: venueIdStr,
                    details: { fields: Object.keys(updates).filter(k => k !== 'venueId') },
                },
                () => sdk.DataModel.Venues.updateVenue(updates as Parameters<typeof sdk.DataModel.Venues.updateVenue>[0])
            );
            logInfo(`Applied updates to venue ${report.venueId}`, updates);
        }

        appliedCount = report.changes.length;
        logInfo(`Applied ${appliedCount} changes to venue ${report.venueId}`);

        // Trigger save
        if (sdk.Editing.getUnsavedChangesCount() > 0) {
            await withErrorBoundary(
                {
                    operation: 'save',
                    venueId: venueIdStr,
                    fatal: true,
                },
                () => sdk.Editing.save()
            );
            logInfo(`Saved changes for venue ${report.venueId}`);
            // After successful save, auto-add venue to whitelist if it has any changes
            const whitelistEntry: WhitelistEntry = {
                venueId: venueIdStr,
                allowMissingPhone: report.changes.some(c => c.field === 'phone'),
                allowMissingUrl: report.changes.some(c => c.field === 'url'),
                allowMissingAddress: report.changes.some(c => ['street', 'city', 'houseNumber'].includes(c.field)),
                allowMissingHours: report.changes.some(c => c.field === 'openingHours')
            };
            addToWhitelist(whitelistEntry);
        }

        return { success: errors.length === 0, appliedCount, errors };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(i18n.t('errors.generic', { message: msg }));
        logError(`Failed to apply changes to venue ${report.venueId}`, error);
        return {
            success: false,
            appliedCount,
            errors
        };
    }
}
/**
 * Helper: Get city ID by city name.
 * Returns undefined if city not found.
 */
function getCityIdByName(sdk: WmeSDK, cityName: string): number | undefined {
    try {
        const cities = sdk.DataModel.Cities.getAll();
        const city = cities.find((c) => c.name === cityName);
        return city?.id;
    } catch (error) {
        logDebug(`Error looking up city by name "${cityName}":`, error);
        return undefined;
    }
}

/**
 * Helper: Apply address changes (street and/or city) to a venue.
 * Creates missing streets if needed, then updates venue address.
 */
export async function applyAddressChanges(
    sdk: WmeSDK,
    venueId: string | number,
    changes: HarmonizationChange[]
): Promise<void> {
    try {
        const venueIdStr = String(venueId);
        const streetChange = changes.find((change) => change.field === 'street');
        const cityChange = changes.find((change) => change.field === 'city');

        if (!streetChange && !cityChange) {
            return; // No address changes to apply
        }

        let streetId: number | undefined;
        let cityId: number | undefined;

        // Process city first (needed for street lookup)
        if (cityChange) {
            const cityName = cityChange.newValue as string;
            cityId = getCityIdByName(sdk, cityName);
            if (!cityId) {
                logDebug(`City "${cityName}" not found in data model, address update may be incomplete`);
            }
        }

        // Process street
        if (streetChange) {
            const streetName = streetChange.newValue as string;
            const existingStreet = sdk.DataModel.Streets.getStreet({
                streetName,
                cityId
            });

            if (existingStreet) {
                streetId = existingStreet.id;
                logDebug(`Found existing street ${streetId}: ${streetName}`);
            } else {
                try {
                    // Create new street if doesn't exist
                    const newStreet = sdk.DataModel.Streets.addStreet({
                        streetName,
                        cityId
                    });
                    streetId = newStreet.id;
                    logInfo(`Created new street ${streetId}: ${streetName}`);
                } catch (error) {
                    logError(`Failed to create street "${streetName}"`, error);
                    // Continue without street update
                }
            }
        }

        // Update venue address with street and/or city
        if (streetId || cityId) {
            const updateArgs: Record<string, any> = {
                venueId: venueIdStr
            };
            if (streetId) {
                updateArgs.streetId = streetId;
            }
            if (cityId) {
                updateArgs.cityId = cityId;
            }

            await withErrorBoundary(
                {
                    operation: 'updateAddress',
                    venueId: venueIdStr,
                    details: updateArgs,
                },
                () => sdk.DataModel.Venues.updateAddress(
                    updateArgs as Parameters<typeof sdk.DataModel.Venues.updateAddress>[0]
                )
            );
            logInfo(`Updated address for venue ${venueId}`, updateArgs);
        }
    } catch (error) {
        logError(`Failed to apply address changes to venue ${venueId}`, error);
    }
}
