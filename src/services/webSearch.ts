import type { WmeSDK } from 'wme-sdk-typings';
import { logDebug, logWarn } from '../core/logger';
import i18n from '../../locales/i18n';

/**
 * Open Google search for a venue in a new window or tab.
 */
export function searchVenueOnWeb(sdk: WmeSDK, venueId: string | number): void {
    const venue = sdk.DataModel.Venues.getById({ venueId: String(venueId) });
    if (!venue) {
        logWarn('[WMEPH] Venue not found for web search:', venueId);
        return;
    }

    const venueName = venue.name || '';
    const venueAddress = sdk.DataModel.Venues.getAddress({ venueId: String(venueId) });

    const cityName = venueAddress.city?.name || '';
    const stateName = venueAddress.state?.name || '';

    // Build search query: "venue name" + "city, state"
    const searchQuery = `${venueName} ${cityName}, ${stateName}`.trim();

    if (!searchQuery) {
        alert(i18n.t('webSearch.cannotSearch'));
        return;
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;

    // Check user setting: new tab vs new window
    const openInNewTab = localStorage.getItem('WebSearchNewTab') === '1';

    if (openInNewTab) {
        window.open(searchUrl, '_blank');
    } else {
        // Open in new window with specific dimensions
        window.open(searchUrl, 'WMEPHWebSearch', 'width=1000,height=800,scrollbars=yes');
    }

    logDebug('Opened web search for venue', { venueId, searchQuery });
}

/**
 * Open URL in a new window or tab.
 */
export function openVenueUrl(url: string): void {
    if (!url) {
        alert(i18n.t('webSearch.noUrl'));
        return;
    }

    // Ensure URL has protocol
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = `https://${url}`;
    }

    const openInNewTab = localStorage.getItem('WebSearchNewTab') === '1';

    if (openInNewTab) {
        window.open(fullUrl, '_blank');
    } else {
        window.open(fullUrl, 'WMEPHVenueUrl', 'width=1000,height=800,scrollbars=yes');
    }

    logDebug('Opened venue URL', { url });
}

/**
 * Open PlugShare search for a charging station venue.
 */
export function openPlugShare(sdk: WmeSDK, venueId: string | number): void {
    const venue = sdk.DataModel.Venues.getById({ venueId: String(venueId) });
    if (!venue) {
        logWarn('[WMEPH] Venue not found for PlugShare search:', venueId);
        return;
    }

    const venueName = venue.name || '';
    const venueAddress = sdk.DataModel.Venues.getAddress({ venueId: String(venueId) });
    const cityName = venueAddress.city?.name || '';
    const stateName = venueAddress.state?.name || '';

    const searchQuery = `${venueName} ${cityName} ${stateName}`.trim();
    const encodedQuery = encodeURIComponent(searchQuery);
    const plugShareUrl = `https://www.plugshare.com/?q=${encodedQuery}`;

    const openInNewTab = localStorage.getItem('WebSearchNewTab') === '1';

    if (openInNewTab) {
        window.open(plugShareUrl, '_blank');
    } else {
        window.open(plugShareUrl, 'WMEPHPlugShare', 'width=1000,height=800,scrollbars=yes');
    }

    logDebug('Opened PlugShare search for venue', { venueId, searchQuery });
}
