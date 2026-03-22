import {
    TITLECASE_SETTINGS,
    BAD_URL,
    CAT,
    BAD_PHONE,
    IS_BETA_VERSION,
    USER
} from './constants.js';
import { getSdk } from './wmeSdk';
import type { Venue } from 'wme-sdk-typings';

declare const W: any;
declare const OpenLayers: any;
declare const _: any;
declare const $: any;

export function log(...args: any[]): void {
    console.log(`WMEPH${IS_BETA_VERSION ? '-β' : ''}:`, ...args);
}

export function logDev(...args: any[]): void {
    if (USER.isDevUser) {
        console.debug(`WMEPH${IS_BETA_VERSION ? '-β' : ''} (dev):`, ...args);
    }
}

export function isNullOrWhitespace(str: string | null | undefined): boolean {
    return !str?.trim().length;
}

// TODO: Delete OLD_getSelectedVenue()
export function OLD_getSelectedVenue(): any {
    const sdk = getSdk();
    const selection = sdk.Editing.getSelection();
    
    if (selection && selection.objectType === 'venue' && selection.ids.length === 1) {
        // Return the legacy W object for now so we don't break the rest of the script that relies on venue.attributes
        return W.model.venues.getObjectById(selection.ids[0]);
    }
    return null;
}

export function getSelectedVenue(): Venue | null {
    const sdk = getSdk();
    const selection = sdk.Editing.getSelection();
    
    if (selection && selection.objectType === 'venue' && selection.ids.length === 1) {
        return sdk.DataModel.Venues.getById({ venueId: selection.ids[0] as string });
    }
    return null;
}

export function formatOpeningHour(hourEntry: any): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours = `${hourEntry.fromHour}-${hourEntry.toHour}`;
    return hourEntry.days.map((day: number) => `${dayNames[day]} ${hours}`).join(', ');
}

export function getOpeningHours(venue: any): string[] {
    const hours = venue?.attributes?.openingHours || venue?.openingHours;
    return hours && hours.map(formatOpeningHour);
}

export function isHoursAllDay(hoursObject: any): boolean {
    if (typeof hoursObject.isAllDay === 'function') return hoursObject.isAllDay();
    return /^0?0:00$/.test(hoursObject.fromHour) && (hoursObject.toHour === '00:00' || hoursObject.toHour === '23:59');
}

export function is247Hours(openingHours: any[]): boolean {
    if (!openingHours || openingHours.length !== 1) return false;
    const oh = openingHours[0];
    if (oh.days.length !== 7) return false;
    return isHoursAllDay(oh);
}

export function isAlwaysOpen(venue: any): boolean {
    const hours = venue?.attributes?.openingHours || venue?.openingHours || [];
    return is247Hours(hours);
}

export function venueHasOverlappingHours(openingHours: any[]): boolean {
    if (openingHours.length < 2) return false;
    for (let day2Ch = 0; day2Ch < 7; day2Ch++) {
        const daysObj: number[][] = [];
        for (let hourSet = 0; hourSet < openingHours.length; hourSet++) {
            if (openingHours[hourSet].days.includes(day2Ch)) {
                const fromHourTemp = openingHours[hourSet].fromHour.replace(/:/g, '');
                let toHourTemp = openingHours[hourSet].toHour.replace(/:/g, '');
                if (Number(toHourTemp) <= Number(fromHourTemp)) toHourTemp = (parseInt(toHourTemp, 10) + 2400).toString();
                daysObj.push([Number(fromHourTemp), Number(toHourTemp)]);
            }
        }
        if (daysObj.length > 1) {
            for (let hourSetCheck2 = 1; hourSetCheck2 < daysObj.length; hourSetCheck2++) {
                for (let hourSetCheck1 = 0; hourSetCheck1 < hourSetCheck2; hourSetCheck1++) {
                    if (daysObj[hourSetCheck2][0] > daysObj[hourSetCheck1][0] && daysObj[hourSetCheck2][0] < daysObj[hourSetCheck1][1]) return true;
                    if (daysObj[hourSetCheck2][1] > daysObj[hourSetCheck1][0] && daysObj[hourSetCheck2][1] < daysObj[hourSetCheck1][1]) return true;
                }
            }
        }
    }
    return false;
}

export function clickGeneralTab(): void {
    const containerSelector = '#edit-panel > div > div.venue-feature-editor > div > div.venue-edit-section > wz-tabs';
    const shadowSelector = 'div > div > div > div > div:nth-child(1)';
    const tab = document.querySelector(containerSelector)?.shadowRoot?.querySelector(shadowSelector) as HTMLElement | undefined;
    tab?.click();
}

export function uniq<T>(arrayIn: T[]): T[] {
    return [...new Set(arrayIn)];
}

export function sortWithIndex(toSort: any[]): any[] & { sortIndices: number[] } {
    for (let i = 0; i < toSort.length; i++) toSort[i] = [toSort[i], i];
    toSort.sort((left, right) => (left[0] < right[0] ? -1 : 1));
    const sortIndices: number[] = [];
    for (let j = 0; j < toSort.length; j++) {
        const [val, index] = toSort[j];
        sortIndices.push(index);
        toSort[j] = val;
    }
    (toSort as any).sortIndices = sortIndices;
    return toSort as any[] & { sortIndices: number[] };
}

export function replaceLetters(number: string | any): string {
    const conversionMap: any = _({
        2: /A|B|C/,
        3: /D|E|F/,
        4: /G|H|I/,
        5: /J|K|L/,
        6: /M|N|O/,
        7: /P|Q|R|S/,
        8: /T|U|V/,
        9: /W|X|Y|Z/
    });
    const numStr = typeof number === 'string' ? number.toUpperCase() : '';
    return numStr.replace(/[A-Z]/g, (letter: string) => conversionMap.findKey((re: RegExp) => re.test(letter)));
}

export function phoneFormat(format: string, ...rest: any[]): string {
    return format.replace(/{(\d+)}/g, (name, number) => (typeof rest[Number(number)] !== 'undefined' ? rest[Number(number)] : null) as unknown as string);
}

export function normalizePhone(s: string | null | undefined, outputFormat: string): string | null | undefined {
    if (isNullOrWhitespace(s)) return s;
    let str = s as string;
    str = str.replace(/(\d{3}.*[0-9A-Z]{4})\W+(?:extension|ext|xt|x).*/i, '$1');
    let s1 = str.replace(/\D/g, '');
    let m = s1.match(/^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/);
    if (!m) {
        str = str.toUpperCase();
        s1 = str.replace(/[^0-9A-Z]/g, '').replace(/^\D*(\d)/, '$1').replace(/^1?([2-9][0-9]{2}[0-9A-Z]{7,10})/g, '$1');
        s1 = replaceLetters(s1);
        m = s1.match(/^([2-9]\d{2})([2-9]\d{2})(\d{4})(?:.{0,3})$/);
        if (!m) return BAD_PHONE;
    }
    return phoneFormat(outputFormat, m[1], m[2], m[3]);
}

export function getNameParts(name: string | null | undefined): { base: string; suffix: string } {
    if (!name) return { base: '', suffix: '' };
    const splits = name.match(/(.*?)(\s+[-(–].*)*$/);
    return { base: splits?.[1] || name, suffix: splits?.[2] || '' };
}

export function matchSets(array1: any[], array2: any[]): boolean {
    if (array1.length !== array2.length) return false;
    for (let i = 0; i < array1.length; i++) {
        if (!array2.includes(array1[i])) return false;
    }
    return true;
}

export function containsAll(source: any[], target: any): boolean {
    if (typeof target === 'undefined' || target === null) return false;
    const targetArr = typeof target === 'string' ? [target] : target;
    for (let ixx = 0; ixx < targetArr.length; ixx++) {
        if (!source.includes(targetArr[ixx])) return false;
    }
    return true;
}

export function containsAny(source: any, target: any): boolean {
    const sourceArr = typeof source === 'string' ? [source] : source;
    const targetArr = typeof target === 'string' ? [target] : target;
    return sourceArr.some((item: any) => targetArr.includes(item));
}

export function insertAtIndex(sourceArray: any[], toInsert: any, atIndex: number): any[] {
    const sourceCopy = sourceArray.slice();
    const insertArr = Array.isArray(toInsert) ? toInsert : [toInsert];
    sourceCopy.splice(atIndex, 0, ...insertArr);
    return uniq(sourceCopy);
}

export function arraysAreEqual(array1: any[], array2: any[]): boolean {
    return array1.length === array2.length && array1.every((item, index) => item === array2[index]);
}

export function removeUnnecessaryAliases(venueName: string, aliases: string[]): string[] | null {
    const newAliases: string[] = [];
    let aliasesRemoved = false;
    let vName = venueName.replace(/['=\\/]/i, '');
    vName = vName.toUpperCase().replace(/'/g, '').replace(/(-|\/ | \/| {2,})/g, ' ');
    for (let naix = 0; naix < aliases.length; naix++) {
        if (!vName.startsWith(aliases[naix].toUpperCase().replace(/'/g, '').replace(/(-|\/ | \/| {2,})/g, ' '))) {
            newAliases.push(aliases[naix]);
        } else {
            aliasesRemoved = true;
        }
    }
    return aliasesRemoved ? newAliases : null;
}

export function titleCase(str: string | null | undefined): string | null | undefined {
    if (!str) return str;
    let processedStr = str.trim();
    const parensParts = processedStr.match(/\(.*?\)/g);
    if (parensParts) {
        for (let i = 0; i < parensParts.length; i++) {
            processedStr = processedStr.replace(parensParts[i], `%${i}%`);
        }
    }

    const macIndexes: number[] = [];
    const macRegex = /\bMac[A-Z]/g;
    let macMatch;
    while ((macMatch = macRegex.exec(processedStr)) !== null) {
        macIndexes.push(macMatch.index);
    }

    const allCaps = (processedStr === processedStr.toUpperCase());
    processedStr = processedStr.replace(/([A-Za-z\u00C0-\u017F][^\s-/]*) */g, txt => {
        if (/^[a-z][A-Z0-9][a-z]/.test(txt)) return txt;
        if (/^([dDlL]e|[lL]a)[A-Z][a-zA-Z\u00C0-\u017F]{2,}/.test(txt)) {
            return txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase() + txt.charAt(2) + txt.substr(3).toLowerCase();
        }
        return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    })
        .replace(/\b[oOlLdD]'[A-Za-z']{3,}/g, txt => (((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase()
            + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase()))
        .replace(/\b[mM][cC][A-Za-z']{3,}/g, txt => (((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase()
            + txt.charAt(1).toLowerCase() + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase()))
        .replace(/&\w+/g, txt => (((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0) + txt.charAt(1).toUpperCase() + txt.substr(2)))
        .replace(/[^ ]+/g, txt => (TITLECASE_SETTINGS.ignoreWords.includes(txt.toLowerCase()) ? txt.toLowerCase() : txt))
        .replace(/[^ ]+/g, txt => (TITLECASE_SETTINGS.capWords.includes(txt.toUpperCase()) ? txt.toUpperCase() : txt))
        .replace(/[^ ]+/g, txt => TITLECASE_SETTINGS.specWords.find(specWord => specWord.toUpperCase() === txt.toUpperCase()) || txt)
        .replace(/\b(\d*1)st\b/gi, '$1st').replace(/\b(\d*2)nd\b/gi, '$1nd')
        .replace(/\b(\d*3)rd\b/gi, '$1rd').replace(/\b(\d+)th\b/gi, '$1th');

    if (!/^[a-z][A-Z0-9][a-z]/.test(processedStr)) processedStr = processedStr.charAt(0).toUpperCase() + processedStr.substr(1);
    if (parensParts) {
        for (let i = 0, len = parensParts.length; i < len; i++) processedStr = processedStr.replace(`%${i}%`, parensParts[i]);
    }
    macIndexes.forEach(idx => { processedStr = processedStr.substr(0, idx + 3) + processedStr.substr(idx + 3, 1).toUpperCase() + processedStr.substr(idx + 4); });
    return processedStr;
}

export function normalizeURL(url: string | null | undefined, makeLowerCase: boolean = true): string | null | undefined {
    if (!url?.trim().length) return url;
    let u = url.replace(/ \(.*/g, '').replace(/ /g, '');
    let m = u.match(/^http:\/\/(.*)$/i);
    if (m) [, u] = m;
    if (makeLowerCase) {
        u = u.replace(/[^/]+/i, txt => ((txt === txt.toLowerCase()) ? txt : txt.toLowerCase()));
    } else {
        u = u.replace(/www\./i, 'www.').replace(/\.com/i, '.com');
    }
    m = u.match(/^(.*)\/pages\/welcome.aspx$/i);
    if (m) [, u] = m;
    m = u.match(/^(.*)\/pages\/default.aspx$/i);
    if (m) [, u] = m;
    m = u.match(/^(.*)\/$/i);
    if (m) [, u] = m;
    if (!u || u.trim().length === 0 || !/(^https?:\/\/)?\w+\.\w+/.test(u)) u = BAD_URL;
    return u;
}

export function isEmergencyRoom(venue: any): boolean {
    const name = venue.attributes?.name ?? venue.name ?? '';
    return /(?:emergency\s+(?:room|department|dept))|\b(?:er|ed)\b/i.test(name);
}

export function isRestArea(venue: any): boolean {
    const categories = venue.attributes?.categories ?? venue.categories ?? [];
    const name = venue.attributes?.name ?? venue.name ?? '';
    return categories.includes(CAT.REST_AREAS) && /rest\s*area/i.test(name);
}

export function getOLMapExtent(): any {
    let extent = W.map.getExtent();
    if (Array.isArray(extent)) {
        extent = new OpenLayers.Bounds(extent);
        extent.transform('EPSG:4326', 'EPSG:3857');
    }
    return extent;
}

export function getCurrentPL(): string {
    let pl = '';
    let elem = $('.WazeControlPermalink .permalink');
    if (elem.length && elem.attr('href')?.length) {
        pl = $('.WazeControlPermalink .permalink').attr('href') as string;
    } else {
        elem = $('.WazeControlPermalink');
        if (elem.length && elem.children('.fa-link').length) {
            pl = (elem.children('.fa-link')[0] as HTMLAnchorElement).href;
        }
    }
    return pl;
}