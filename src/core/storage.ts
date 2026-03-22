import { insertAtIndex } from './utils';
import { SCRIPT_NAME } from './constants';

declare const LZString: any;
declare const WazeWrap: any;

export const WL_LOCAL_STORE_NAME = 'WMEPH-venueWhitelistNew';
export const WL_LOCAL_STORE_NAME_COMPRESSED = 'WMEPH-venueWhitelistCompressed';

export let _venueWhitelist: Record<string, any> = {};

export function setVenueWhitelist(wl: Record<string, any>): void {
    _venueWhitelist = wl;
}

export function saveWhitelistToLS(compress: boolean): void {
    let wlString = JSON.stringify(_venueWhitelist);
    if (compress) {
        if (wlString.length < 4800000) { // Also save to regular storage as a back up
            localStorage.setItem(WL_LOCAL_STORE_NAME, wlString);
        }
        wlString = LZString.compressToUTF16(wlString);
        localStorage.setItem(WL_LOCAL_STORE_NAME_COMPRESSED, wlString);
    } else {
        localStorage.setItem(WL_LOCAL_STORE_NAME, wlString);
    }
}

export function loadWhitelistFromLS(decompress: boolean): void {
    let wlString: string | null = null;
    if (decompress) {
        const compressedString = localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED);
        if (compressedString) {
            wlString = LZString.decompressFromUTF16(compressedString);
        }
    } else {
        wlString = localStorage.getItem(WL_LOCAL_STORE_NAME);
    }
    _venueWhitelist = wlString ? JSON.parse(wlString) : {};
}

export function backupWhitelistToLS(compress: boolean): void {
    let wlString = JSON.stringify(_venueWhitelist);
    if (compress) {
        wlString = LZString.compressToUTF16(wlString);
        localStorage.setItem(WL_LOCAL_STORE_NAME_COMPRESSED + Math.floor(Date.now() / 1000), wlString);
    } else {
        localStorage.setItem(WL_LOCAL_STORE_NAME + Math.floor(Date.now() / 1000), wlString);
    }
}

export function wmephWhitelistCounter(): void {
    let count = parseInt(localStorage.getItem('WMEPH_WLAddCount') || '0', 10);
    count += 1;
    localStorage.setItem('WMEPH_WLAddCount', count.toString());
    if (count > 50) {
        WazeWrap.Alerts.warning(SCRIPT_NAME, 'Don\'t forget to periodically back up your Whitelist data using the Pull option in the WMEPH settings tab.');
        localStorage.setItem('WMEPH_WLAddCount', '2');
    }
}

export function validateWLS(jsonString: string | null): Record<string, any> | false {
    if (!jsonString) return false;
    try {
        const objTry = JSON.parse(jsonString);
        if (objTry && typeof objTry === 'object' && objTry !== null) return objTry;
    } catch (e) {
        // do nothing
    }
    return false;
}

export function mergeWL(wl1: Record<string, any>, wl2: Record<string, any>): Record<string, any> {
    Object.keys(wl2).forEach(venueKey => {
        if (wl1.hasOwnProperty(venueKey)) {
            Object.keys(wl2[venueKey]).forEach(wlKey => {
                if (wl2[venueKey][wlKey]?.active) {
                    if (wl1[venueKey][wlKey]?.active && wl1[venueKey][wlKey].hasOwnProperty('WLKeyArray')) {
                        wl1[venueKey][wlKey].WLKeyArray = insertAtIndex(wl1[venueKey][wlKey].WLKeyArray, wl2[venueKey][wlKey].WLKeyArray, 100);
                    } else wl1[venueKey][wlKey] = wl2[venueKey][wlKey];
                }
            });
        } else wl1[venueKey] = wl2[venueKey];
    });
    return wl1;
}