import type { WmeSDK } from 'wme-sdk-typings';
import { logInfo, logDebug } from '../core/logger';
import { getWhitelist } from './storageService';
import { withErrorBoundary } from '../utils/errorHandler';
import type { HarmonizationResult, HarmonizationChange, HarmonizationIssue } from '../core/types';
import { parseAndFormatHours } from './hoursAdapter';
import { findNearbyVenues } from './duplicateFinder';
import i18n from '../../locales/i18n';
import { resolvePnhCountryCodeFromWme } from '../core/pnhCountryConfig';
import { applyCategoryRules } from './categoryRules';
import { suggestLockRankChange } from './lockingPolicy';
import { inferAddressFromSegments } from './addressInference';
import { applyTitleCase, needsTitleCase } from './titleCaseFormatter';
import { validateAndFormatPhone, isPhoneInvalid } from './phoneValidator';
import { harmonizeWithPnh } from './pnhMatcher';

export interface HarmonizationReport {
    venueId: string | number;
    venueName: string;
    countryCode?: string | null;
    changes: HarmonizationChange[];
    issues: HarmonizationIssue[];
    completeness: 'red' | 'blue' | 'green';
}

// Title case handled by titleCaseFormatter with brand/abbreviation exceptions

// Phone validation handled by phoneValidator service

function sanitizeUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    const withoutProto = value.replace(/^https?:\/\//i, '').trim();
    return withoutProto.length > 0 ? withoutProto : null;
}

function assessCompleteness(venue: any, address: any): 'red' | 'blue' | 'green' {
    const hasName = !!venue.name?.trim();
    const hasAddress = !!(address?.street && address?.houseNumber);
    const hasPhone = !!venue.phone?.trim();
    const hasUrl = !!venue.url?.trim();
    const hasHours = (venue.openingHours?.length ?? 0) > 0;

    // Red: missing name or address
    if (!hasName || !hasAddress) return 'red';
    // Green: all present
    if (hasName && hasAddress && hasPhone && hasUrl && hasHours) return 'green';
    // Blue: intermediate
    return 'blue';
}

export async function analyzeVenue(sdk: WmeSDK, venueId: string | number): Promise<HarmonizationReport> {
    const venueIdStr = String(venueId);
    const venue = await withErrorBoundary(
        {
            operation: 'getVenueById',
            venueId: venueIdStr,
        },
        () => sdk.DataModel.Venues.getById({ venueId: venueIdStr })
    );
    if (!venue) {
        return {
            venueId,
            venueName: i18n.t('labels.unknown'),
            changes: [],
            issues: [
                {
                    field: 'venue',
                    severity: 'high',
                    message: i18n.t('messages.notFound')
                }
            ],
            completeness: 'red'
        };
    }

    const changes: HarmonizationChange[] = [];
    const issues: HarmonizationIssue[] = [];
    const address = await withErrorBoundary(
        {
            operation: 'getVenueAddress',
            venueId: venueIdStr,
        },
        () => sdk.DataModel.Venues.getAddress({ venueId: venueIdStr })
    );
    const whitelistEntry = getWhitelist().find(e => e.venueId === venueIdStr);
    const countryCode = resolvePnhCountryCodeFromWme(address?.country?.name, address?.country?.abbr);

    const pnhResult = harmonizeWithPnh(sdk, venue as any, address, countryCode);
    changes.push(...pnhResult.changes);
    issues.push(...pnhResult.issues);

    const hasPnhNameChange = pnhResult.changes.some(change => change.field === 'name');
    const hasPnhUrlChange = pnhResult.changes.some(change => change.field === 'url');
    const effectiveCategories = pnhResult.nextCategories ?? venue.categories ?? [];
    const effectiveServices = pnhResult.nextServices ?? venue.services ?? [];

    // Name formatting
    const trimmedName = venue.name?.trim() ?? '';
    if (!trimmedName) {
        issues.push({
            field: 'name',
            severity: 'high',
            message: i18n.t('validation.nameEmpty')
        });
    } else if (!hasPnhNameChange) {
        const disableTitleCase = localStorage.getItem('DisableTitleCase') === '1';
        if (!disableTitleCase && needsTitleCase(trimmedName)) {
            changes.push({
                field: 'name',
                oldValue: trimmedName,
                newValue: applyTitleCase(trimmedName),
                reason: i18n.t('validation.nameTitleCase')
            });
        }
    }

    // Phone validation & formatting (respect DisablePhoneValidation setting)
    const disablePhoneValidation = localStorage.getItem('DisablePhoneValidation') === '1';
    if (!disablePhoneValidation) {
        if (venue.phone) {
            const phoneValidation = isPhoneInvalid(venue.phone);
            if (phoneValidation.isInvalid) {
                issues.push({
                    field: 'phone',
                    severity: 'medium',
                    message: i18n.t('phone.invalid', { error: phoneValidation.error ?? '' })
                });
            } else {
                const phoneResult = validateAndFormatPhone(venue.phone);
                if (phoneResult.isValid && phoneResult.formatted && phoneResult.formatted !== venue.phone) {
                    changes.push({
                        field: 'phone',
                        oldValue: venue.phone,
                        newValue: phoneResult.formatted,
                        reason: i18n.t('phone.formatting')
                    });
                }
            }
        } else if (!whitelistEntry?.allowMissingPhone) {
            issues.push({
                field: 'phone',
                severity: 'medium',
                message: i18n.t('validation.phoneMissing')
            });
        }
    }

    // URL sanitization
    if (!hasPnhUrlChange && venue.url) {
        const sanitized = sanitizeUrl(venue.url);
        if (sanitized && sanitized !== venue.url) {
            changes.push({
                field: 'url',
                oldValue: venue.url,
                newValue: sanitized,
                reason: i18n.t('validation.urlRemovePrefix')
            });
        }
    } else if (!venue.url && !hasPnhUrlChange && !whitelistEntry?.allowMissingUrl) {
        issues.push({
            field: 'url',
            severity: 'low',
            message: i18n.t('validation.urlMissing')
        });
    }

    // Hours parsing (TODO: integrate with PNH data to fetch textual hours)
    // Currently this is a placeholder; in the future, we'll fetch hours from external sources
    // and parse them using parseAndFormatHours() to detect changes.
    if (!venue.openingHours || venue.openingHours.length === 0) {
        if (!whitelistEntry?.allowMissingHours) {
            issues.push({
                field: 'openingHours',
                severity: 'medium',
                message: i18n.t('validation.hoursMissing')
            });
        }
    }

    // Address validation
    const skipAddressIssues = !!whitelistEntry?.allowMissingAddress;
    if (!skipAddressIssues) {
        if (!address?.street) {
            issues.push({
                field: 'street',
                severity: 'high',
                message: i18n.t('validation.streetMissing')
            });
        }
        if (!address?.houseNumber) {
            issues.push({
                field: 'houseNumber',
                severity: 'high',
                message: i18n.t('validation.houseNumberMissing')
            });
        }
    }

    // Infer missing address from nearby segments
    const addressChanges = inferAddressFromSegments(sdk, venue);
    changes.push(...addressChanges);

    const categoryResult = applyCategoryRules(
        sdk,
        { ...venue, categories: effectiveCategories, services: effectiveServices } as any,
        countryCode
    );
    changes.push(...categoryResult.changes);
    issues.push(...categoryResult.issues);

    const lockChange = suggestLockRankChange(sdk, venue, countryCode);
    if (lockChange) {
        changes.push(lockChange);
    }

    const completeness = assessCompleteness(venue, address);
    logDebug(`Analyzed venue ${venueId}: ${changes.length} changes, ${issues.length} issues`, {
        changes,
        issues
    });

    return {
        venueId,
        venueName: venue.name || i18n.t('labels.unknown'),
        countryCode,
        changes,
        issues,
        completeness
    };
}

export async function runHarmonizer(sdk: WmeSDK): Promise<HarmonizationResult> {
    const sel = sdk.Editing.getSelection();
    if (!sel) {
        return { applied: false, messages: [i18n.t('validation.noSelection')] };
    }

    if (sel.objectType !== 'venue') {
        return { applied: false, messages: [i18n.t('validation.notAPlace')] };
    }

    const venueId = sel.ids[0];
    const report = await analyzeVenue(sdk, venueId);

    // Duplicate detection (800m radius) when geometry is a Point
    const venue = sdk.DataModel.Venues.getById({ venueId: String(venueId) });
    let dupeMsg: string[] = [];
    if (venue?.geometry?.type === 'Point') {
        const duplicates = findNearbyVenues(sdk, String(venueId), venue.geometry);
        if (duplicates.length > 0) {
            dupeMsg = [i18n.t('validation.duplicatesFound', { count: duplicates.length })];
        }
    }
    const messages = [
        `${report.venueName} (${report.completeness.toUpperCase()})`,
        ...report.changes.map(c => `• ${c.field}: ${c.reason}`),
        ...report.issues.map(i => `⚠ ${i.message}`),
        ...dupeMsg
    ];

    logInfo('Harmonizer analysis complete', report);
    return { applied: false, messages };
}
