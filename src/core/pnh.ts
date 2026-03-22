import { CAT, PNH_DATA, SCRIPT_NAME } from './constants';
import {
    log, logDev, isNullOrWhitespace, normalizeURL, uniq
} from './utils';

declare const WazeWrap: any;
declare const $: any;

export let _wmephDevList: string[] = [];
export let _wmephBetaList: string[] = [];

const dec = (s: string): string => atob(atob(s));

export class Region {
    static #defaultNewChainRequestEntryIds: string[] = ['entry.925969794', 'entry.1970139752', 'entry.1749047694'];
    static #defaultApproveChainRequestEntryIds: string[] = ['entry.925969794', 'entry.50214576', 'entry.1749047694'];
    regionCode: string;
    #formId: string;
    #newChainRequestEntryIds: string[];
    #approveChainRequestEntryIds: string[];

    constructor(regionCode: string, formId: string, newChainRequestEntryIds?: string[] | null, approveChainRequestEntryIds?: string[] | null) {
        this.regionCode = regionCode;
        this.#formId = formId;
        this.#newChainRequestEntryIds = newChainRequestEntryIds ?? Region.#defaultNewChainRequestEntryIds;
        this.#approveChainRequestEntryIds = approveChainRequestEntryIds ?? Region.#defaultApproveChainRequestEntryIds;
    }

    #getFormUrl(entryIds: string[], entryValues: string[]): string {
        const entryValuesUrl = entryValues.map((value, idx) => `${entryIds[idx]}=${value}`).join('&');
        return `https://docs.google.com/forms/d/${this.#formId}/viewform?${entryValuesUrl}`;
    }

    getNewChainFormUrl(entryValues: string[]): string {
        return this.#getFormUrl(this.#newChainRequestEntryIds, entryValues);
    }

    getApproveChainFormUrl(entryValues: string[]): string {
        return this.#getFormUrl(this.#approveChainRequestEntryIds, entryValues);
    }
}

export class PnhCategoryInfos {
    #categoriesById: Record<string, any> = {};
    #categoriesByName: Record<string, any> = {};

    add(categoryInfo: any): void {
        this.#categoriesById[categoryInfo.id] = categoryInfo;
        this.#categoriesByName[categoryInfo.name.toUpperCase()] = categoryInfo;
    }

    getById(id: string): any {
        return this.#categoriesById[id];
    }

    getByName(name: string): any {
        return this.#categoriesByName[name.toUpperCase()];
    }

    toArray(): any[] {
        return Object.values(this.#categoriesById);
    }
}

export class PnhEntry {
    order?: string;
    name: string = '';
    aliases: string[] = [];
    primaryCategory?: string;
    altCategories: string[] = [];
    description?: string;
    url?: string;
    notes?: string;
    displaynote?: string;
    sfurl?: string;
    sfurllocal?: string;
    regions: string[] = [];
    disabled: boolean = false;
    forceCategoryMatching?: symbol;
    flagsToAdd: Record<string, boolean> = {};
    flagsToRemove: Record<string, boolean> = {};
    servicesToAdd: string[] = [];
    servicesToRemove: string[] = [];
    forceBrand?: string;
    localUrlCheckRegEx?: RegExp;
    localizationRegEx?: RegExp;
    recommendedPhone?: string;
    keepName: boolean = false;
    optionalAlias?: string;
    chainIsClosed: boolean = false;
    brandParentLevel: number = -1;
    strMatchAny: boolean = false;
    spaceMatchList: string[] = [];
    pharmhours: boolean = false;
    notABank: boolean = false;
    optionCat2: boolean = false;
    optionName2: boolean = false;
    altName2Desc: boolean = false;
    subFuel: boolean = false;
    regexNameMatch?: RegExp;
    lockAt?: number;
    noUpdateAlias: boolean = false;
    betaEnable: boolean = false;
    searchnameword: string[] = [];
    searchNameList: string[] = [];
    hasSpecialCases: boolean = false;
    invalid: boolean = false;

    constructor(columnHeaders: string[], rowString: string, country: Country) {
        const parseResult = this.#parseSpreadsheetRow(columnHeaders, rowString, country);
        if (!this.invalid && (!this.disabled || this.betaEnable)) {
            this.#buildSearchNameList(parseResult);
        }
    }

    static #tighten(str: string): string {
        return str.toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');
    }

    static #stripNonAlphaKeepCommas(str: string): string {
        return str.toUpperCase().replace(/[^A-Z0-9,]/g, '');
    }

    #parseSpreadsheetRow(columnHeaders: string[], rowString: string, country: Country): any {
        const result: any = {
            searchnamebase: null,
            searchnamemid: null,
            searchnameend: null,
            skipAltNameMatch: null,
            warningMessages: []
        };

        try {
            const columnValues = rowString.split('|');

            const disableIndex = columnHeaders.indexOf(Pnh.SSHeader.disable as string);
            const disabled = columnValues[disableIndex]?.trim();
            if (disabled === '1') {
                this.disabled = true;
                return result;
            }

            columnHeaders.forEach((header, i) => {
                try {
                    if (Pnh.COLUMNS_TO_IGNORE.includes(header)) return;

                    if (!this.invalid) {
                        let value: string | undefined = columnValues[i]?.trim();
                        if (!value) {
                            value = undefined;
                        } else if (header === Pnh.SSHeader.aliases) {
                            if (value.startsWith('(')) {
                                value = undefined;
                            } else {
                                value = value.replace(/,[^A-za-z0-9]*/g, ',');
                            }
                        }

                        switch (header) {
                            case Pnh.SSHeader.order:
                            case Pnh.SSHeader.description:
                            case Pnh.SSHeader.notes:
                            case Pnh.SSHeader.displaynote:
                            case Pnh.SSHeader.sfurl:
                            case Pnh.SSHeader.sfurllocal:
                                header = header.substring(3);
                                (this as any)[header] = value;
                                break;
                            case Pnh.SSHeader.url:
                                if (value) this.url = normalizeURL(value) as string;
                                break;
                            case Pnh.SSHeader.searchnamebase:
                                result.searchnamebase = value;
                                break;
                            case Pnh.SSHeader.searchnamemid:
                                result.searchnamemid = value;
                                break;
                            case Pnh.SSHeader.searchnameend:
                                result.searchnameend = value;
                                break;
                            case Pnh.SSHeader.searchnameword:
                                this.searchnameword = value?.toUpperCase().replace(/, /g, ',').split(',') || [];
                                break;
                            case Pnh.SSHeader.name:
                                if (value?.toUpperCase() !== 'PLEASE REUSE') {
                                    this.name = value || '';
                                } else {
                                    this.invalid = true;
                                }
                                break;
                            case Pnh.SSHeader.aliases:
                                this.aliases = value?.split(',').map((v: string) => v.trim()) || [];
                                break;
                            case Pnh.SSHeader.category1:
                                if (value) {
                                    this.primaryCategory = country.categoryInfos.getByName(value)?.id;
                                    if (typeof this.primaryCategory === 'undefined') {
                                        result.warningMessages.push(`Unrecognized primary category value: ${value}`);
                                    }
                                } else {
                                    result.warningMessages.push('No primary category assigned. PNH entry will be ignored!');
                                    this.invalid = true;
                                }
                                break;
                            case Pnh.SSHeader.category2:
                                this.altCategories = value?.split(',').map((v: string) => v.trim()).map(catName => {
                                    const cat = country.categoryInfos.getByName(catName)?.id;
                                    if (!cat) {
                                        result.warningMessages.push(`Unrecognized alternate category: ${catName}`);
                                    }
                                    return cat;
                                }).filter(cat => typeof cat === 'string') || [];
                                break;
                            case Pnh.SSHeader.region:
                                if (value) {
                                    this.regions = value.toUpperCase().split(',').map((v: string) => v.trim());
                                } else {
                                    this.invalid = true;
                                    result.warningMessages.push('No regions specified. PNH entry will be ignored!');
                                }
                                break;
                            case Pnh.SSHeader.disable:
                                if (value === 'altName') {
                                    result.skipAltNameMatch = true;
                                } else if (value) {
                                    result.warningMessages.push(`Unrecognized value in ${Pnh.SSHeader.disable} column: ${value}`);
                                }
                                return;
                            case Pnh.SSHeader.forcecat:
                                if (!value || value === '0') {
                                    this.forceCategoryMatching = Pnh.ForceCategoryMatchingType.NONE;
                                } else if (value === '1') {
                                    this.forceCategoryMatching = Pnh.ForceCategoryMatchingType.PRIMARY;
                                } else if (value === '2') {
                                    this.forceCategoryMatching = Pnh.ForceCategoryMatchingType.ANY;
                                } else {
                                    result.warningMessages.push(`Unrecognized value in ${Pnh.SSHeader.forcecat} column: ${value}`);
                                }
                                break;
                            case Pnh.SSHeader.speccase:
                                if (value) {
                                    this.hasSpecialCases = true;
                                    const specialCases = value.split(',').map((v: string) => v.trim());
                                    /* eslint-disable no-cond-assign */
                                    specialCases.forEach((specialCase: string) => {
                                        let match;
                                        if (match = specialCase.match(/^buttOn_(.*)/i)) {
                                            const scFlag = match[1];
                                            switch (scFlag) {
                                                case 'addCat2': break;
                                                case 'addPharm':
                                                case 'addSuper':
                                                case 'appendAMPM':
                                                case 'addATM':
                                                case 'addConvStore':
                                                    this.flagsToAdd[scFlag] = true;
                                                    break;
                                                default:
                                                    result.warningMessages.push(`Unrecognized ph_specCase value: ${specialCase}`);
                                            }
                                        } else if (match = specialCase.match(/^buttOff_(.+)/i)) {
                                            const scFlag = match[1];
                                            switch (scFlag) {
                                                case 'addConvStore':
                                                    this.flagsToRemove[scFlag] = true;
                                                    break;
                                                default:
                                                    result.warningMessages.push(`Unrecognized ph_specCase value: ${specialCase}`);
                                            }
                                        } else if (match = specialCase.match(/^psOn_(.+)/i)) {
                                            this.servicesToAdd.push(match[1]);
                                        } else if (match = specialCase.match(/^psOff_(.+)/i)) {
                                            this.servicesToRemove.push(match[1]);
                                        } else if (match = specialCase.match(/forceBrand<>([^,<]+)/i)) {
                                            this.forceBrand = match[1];
                                        } else if (match = specialCase.match(/^localURL_(.+)/i)) {
                                            this.localUrlCheckRegEx = new RegExp(match[1], 'i');
                                        } else if (match = specialCase.match(/^checkLocalization<>(.+)/i)) {
                                            this.localizationRegEx = new RegExp(match[1], 'g');
                                        } else if (match = specialCase.match(/phone<>(.*?)<>/)) {
                                            this.recommendedPhone = match[1];
                                        } else if (/keepName/g.test(specialCase)) {
                                            this.keepName = true;
                                        } else if (match = specialCase.match(/^optionAltName<>(.+)/i)) {
                                            this.optionalAlias = match[1];
                                        } else if (/^closed$/i.test(specialCase)) {
                                            this.chainIsClosed = true;
                                        } else if (match = specialCase.match(/^brandParent(\d+)/)) {
                                            try {
                                                this.brandParentLevel = parseInt(match[1], 10);
                                            } catch {
                                                result.warningMessages.push(`Invalid forceBrand value: ${specialCase}`);
                                            }
                                        } else if (/^strMatchAny$/i.test(specialCase)) {
                                            this.strMatchAny = true;
                                        } else if (/^pharmhours$/i.test(specialCase)) {
                                            this.pharmhours = true;
                                        } else if (/^notABank$/i.test(specialCase)) {
                                            this.notABank = true;
                                        } else if (/^optionCat2$/i.test(specialCase)) {
                                            this.optionCat2 = true;
                                        } else if (/^optionName2$/i.test(specialCase)) {
                                            this.optionName2 = true;
                                        } else if (/^altName2Desc$/i.test(specialCase)) {
                                            this.altName2Desc = true;
                                        } else if (/^subFuel$/i.test(specialCase)) {
                                            this.subFuel = true;
                                        } else if (match = specialCase.match(/^regexNameMatch<>(.+)<>/i)) {
                                            this.regexNameMatch = new RegExp(match[1].replace(/\\/, '\\').replace(/<or>/g, '|'), 'i');
                                        } else if (match = specialCase.match(/^lockAt(\d)$/i)) {
                                            try {
                                                this.lockAt = parseInt(match[1], 10);
                                                if (this.lockAt < 1 || this.lockAt > 6) {
                                                    throw new Error();
                                                }
                                            } catch {
                                                result.warningMessages.push(`Invalid ph_speccase lockAt value (must be between 1 and 6): ${specialCase}`);
                                            }
                                        } else if (/^noUpdateAlias$/i.test(specialCase)) {
                                            this.noUpdateAlias = true;
                                        } else if (/^betaEnable$/i.test(specialCase)) {
                                            this.betaEnable = true;
                                        } else {
                                            result.warningMessages.push(`Unrecognized ph_speccase value: ${specialCase}`);
                                        }
                                    });
                                    /* eslint-enable no-cond-assign */
                                }
                                break;
                            case '':
                                break;
                            default:
                        }
                    }
                } catch (ex) {
                    result.warningMessages.push(`An unexpected error occurred while processing column: ${header}. PNH entry will be ignored.`);
                }
            });

            if (this.strMatchAny || this.primaryCategory === CAT.HOTEL) {
                this.spaceMatchList = [this.name.toUpperCase().replace(/ AND /g, ' ').replace(/^THE /g, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/ {2,}/g, ' ')];
                if (this.searchnameword) {
                    this.spaceMatchList.push(...this.searchnameword);
                }
            }
        } catch (ex: any) {
            result.warningMessages.push(`An unexpected error occurred while parsing. PNH entry will be ignored! :\n${ex.toString()}`);
            this.disabled = true;
        }

        if (result.warningMessages.length) {
            console.warn(`WMEPH ${country.countryName}:`, `PNH Order # ${this.order} parsing issues:\n- ${result.warningMessages.join('\n- ')}`);
        }
        return result;
    }

    #buildSearchNameList(parseResult: any): void {
        let newNameList = [PnhEntry.#tighten(this.name)];

        if (!parseResult.skipAltNameMatch) {
            newNameList = newNameList.concat(this.aliases.map(alias => PnhEntry.#tighten(alias)));
        }

        if (!isNullOrWhitespace(parseResult.searchnamebase)) {
            newNameList = newNameList.concat(PnhEntry.#stripNonAlphaKeepCommas(parseResult.searchnamebase).split(','));

            if (!isNullOrWhitespace(parseResult.searchnamemid)) {
                let pnhSearchNameMid = PnhEntry.#stripNonAlphaKeepCommas(parseResult.searchnamemid).split(',');
                if (pnhSearchNameMid.length > 1) {
                    pnhSearchNameMid = pnhSearchNameMid
                        .concat([pnhSearchNameMid[0] + pnhSearchNameMid[1], pnhSearchNameMid[1] + pnhSearchNameMid[0]]);
                }
                const midLen = pnhSearchNameMid.length;
                for (let extix = 1, len = newNameList.length; extix < len; extix++) {
                    for (let midix = 0; midix < midLen; midix++) {
                        newNameList.push(newNameList[extix] + pnhSearchNameMid[midix]);
                    }
                }
            }

            if (!isNullOrWhitespace(parseResult.searchnameend)) {
                const pnhSearchNameEnd = PnhEntry.#stripNonAlphaKeepCommas(parseResult.searchnameend).split(',');
                const endLen = pnhSearchNameEnd.length;
                for (let extix = 1, len = newNameList.length; extix < len; extix++) {
                    for (let endix = 0; endix < endLen; endix++) {
                        newNameList.push(newNameList[extix] + pnhSearchNameEnd[endix]);
                    }
                }
            }
        }

        newNameList = newNameList.filter(name => name.length > 1);

        const categoryInfo = this.primaryCategory;
        const appendWords = [];
        if (categoryInfo) {
            if (categoryInfo === CAT.HOTEL) {
                appendWords.push('HOTEL');
            } else if (categoryInfo === CAT.BANK_FINANCIAL && !this.notABank) {
                appendWords.push('BANK', 'ATM');
            } else if (categoryInfo === CAT.SUPERMARKET_GROCERY) {
                appendWords.push('SUPERMARKET');
            } else if (categoryInfo === CAT.GYM_FITNESS) {
                appendWords.push('GYM');
            } else if (categoryInfo === CAT.GAS_STATION) {
                appendWords.push('GAS', 'GASOLINE', 'FUEL', 'STATION', 'GASSTATION');
            } else if (categoryInfo === CAT.CAR_RENTAL) {
                appendWords.push('RENTAL', 'RENTACAR', 'CARRENTAL', 'RENTALCAR');
            }
            appendWords.forEach(word => { newNameList = newNameList.concat(newNameList.map(name => name + word)); });
        }

        Pnh.WORD_VARIATIONS?.forEach(variationsList => Pnh.addSpellingVariants(newNameList, variationsList));

        this.searchNameList = uniq(newNameList);
    }

    getMatchInfo(name: string, state2L: string, region3L: string, country: string, categories: string[], venue: any, venueNameSpace: string): any {
        const matchInfo = {
            isMatch: false,
            allowMultiMatch: true,
            matchOutOfRegion: false
        };
        let nameMatch = false;

        if (this.regexNameMatch) {
            nameMatch = this.regexNameMatch.test(venue.attributes.name);
        } else if (this.strMatchAny || this.primaryCategory === CAT.HOTEL) {
            matchInfo.allowMultiMatch = true;
            for (let nmix = 0; nmix < this.spaceMatchList.length; nmix++) {
                if (venueNameSpace.includes(` ${this.spaceMatchList[nmix]} `)) {
                    nameMatch = true;
                    break;
                }
            }
        } else {
            const { searchNameList } = this;
            const venueNameNoNum = name.replace(/[^A-Z]/g, '');
            if (searchNameList.includes(name) || searchNameList.includes(venueNameNoNum)) {
                nameMatch = true;
            }
        }

        if (nameMatch) {
            logDev(`Matched PNH Order No.: ${this.order}`);
            const PNHPriCat = this.primaryCategory;
            let PNHForceCat = this.forceCategoryMatching;

            if (categories[0] === CAT.GAS_STATION || PNHPriCat === CAT.GAS_STATION) {
                PNHForceCat = Pnh.ForceCategoryMatchingType.PRIMARY;
            }

            matchInfo.isMatch = (PNHForceCat === Pnh.ForceCategoryMatchingType.PRIMARY && categories.indexOf(PNHPriCat as string) === 0)
                || (PNHForceCat === Pnh.ForceCategoryMatchingType.ANY && categories.includes(PNHPriCat as string))
                || (PNHForceCat === Pnh.ForceCategoryMatchingType.NONE);
        }

        if (!(this.regions.includes(state2L) || this.regions.includes(region3L)
            || this.regions.includes(country)
            || $('#WMEPH-RegionOverride').prop('checked'))) {
            matchInfo.matchOutOfRegion = true;
        }

        return matchInfo;
    }
}

export class Country {
    countryCode: string;
    countryName: string;
    categoryInfos: PnhCategoryInfos;
    pnh: PnhEntry[];
    closedChains: PnhEntry[];
    regions: Record<string, Region>;

    constructor(code: string, name: string, allSpreadsheetData: any[][], categoryColumnIndex: number, pnhColumnIndex: number, regions: Record<string, Region>) {
        this.countryCode = code;
        this.countryName = name;
        this.categoryInfos = new PnhCategoryInfos();
        Pnh.processCategories(Pnh.processImportedDataColumn(allSpreadsheetData, categoryColumnIndex), this.categoryInfos);
        this.pnh = Pnh.processPnhSSRows(allSpreadsheetData, pnhColumnIndex, this);
        this.closedChains = this.pnh.filter(entry => entry.chainIsClosed);
        this.regions = regions;
    }
}

export class Pnh {
    static #SPREADSHEET_ID = '1pBz4l4cNapyGyzfMJKqA4ePEFLkmz2RryAt1UV39B4g';
    static #SPREADSHEET_RANGE = '2019.01.20.001!A2:L';
    static #SPREADSHEET_MODERATORS_RANGE = 'Moderators!A1:F';
    static #API_KEY = 'YTJWNVBVRkplbUZUZVVObU1YVXpSRVZ3ZW5OaFRFSk1SbTR4VGxKblRURjJlRTFYY3pOQ2NXZElPQT09';
    static COLUMNS_TO_IGNORE = ['temp_field', 'ph_services', 'ph_national', 'logo', ''];
    static WORD_VARIATIONS: string[][] | null = null;
    static MODERATORS: Record<string, string[]> = {};
    static HOSPITAL_PART_MATCH: string[];
    static HOSPITAL_FULL_MATCH: string[];
    static ANIMAL_PART_MATCH: string[];
    static ANIMAL_FULL_MATCH: string[];
    static SCHOOL_PART_MATCH: string[];
    static SCHOOL_FULL_MATCH: string[];

    static ForceCategoryMatchingType = Object.freeze({
        NONE: Symbol('none'),
        PRIMARY: Symbol('primary'),
        ANY: Symbol('any')
    });

    static SSHeader = Object.freeze({
        order: 'ph_order',
        name: 'ph_name',
        aliases: 'ph_aliases',
        category1: 'ph_category1',
        category2: 'ph_category2',
        description: 'ph_description',
        url: 'ph_url',
        notes: 'ph_notes',
        region: 'ph_region',
        disable: 'ph_disable',
        forcecat: 'ph_forcecat',
        displaynote: 'ph_displaynote',
        speccase: 'ph_speccase',
        searchnamebase: 'ph_searchnamebase',
        searchnamemid: 'ph_searchnamemid',
        searchnameend: 'ph_searchnameend',
        searchnameword: 'ph_searchnameword',
        sfurl: 'ph_sfurl',
        sfurllocal: 'ph_sfurllocal',
        toValueArray: function(this: any) { return Object.values(this).filter(v => typeof v === 'string'); }
    });

    static findMatch(name: string, state2L: string, region3L: string, country: string, categories: string[], venue: any, closedChainsOnly?: boolean): any[] {
        if (country !== PNH_DATA.USA.countryCode && country !== PNH_DATA.CAN.countryCode) {
            return ['NoMatch'];
        }
        if (categories.includes(CAT.PARKING_LOT) || (typeof venue.isParkingLot === 'function' && venue.isParkingLot())) {
            return ['NoMatch'];
        }
        const pnhData = closedChainsOnly ? PNH_DATA[country].closedChains : PNH_DATA[country].pnh;
        const matchPNHRegionData: any[] = [];
        const pnhOrderNum: any[] = [];
        const pnhNameTemp: any[] = [];
        let matchOutOfRegion = false;
        let matchInRegion = false;

        name = name.toUpperCase().replace(/ AND /g, ' ').replace(/^THE /g, '');
        const venueNameSpace = ` ${name.replace(/[^A-Z0-9 ]/g, ' ').replace(/ {2,}/g, ' ')} `;
        name = name.replace(/[^A-Z0-9]/g, '');

        for (let pnhIdx = 0; pnhIdx < pnhData.length; pnhIdx++) {
            const pnhEntry = pnhData[pnhIdx];
            const matchInfo = pnhEntry.getMatchInfo(name, state2L, region3L, country, categories, venue, venueNameSpace);
            if (matchInfo.isMatch) {
                if (matchInfo.matchOutOfRegion) {
                    matchOutOfRegion = true;
                    pnhNameTemp.push(pnhEntry.name);
                    pnhOrderNum.push(pnhEntry.order);
                } else {
                    matchInRegion = true;
                    matchPNHRegionData.push(pnhEntry);
                }
            }
        }

        if (matchInRegion) return matchPNHRegionData;
        if (matchOutOfRegion) return ['ApprovalNeeded', pnhNameTemp, pnhOrderNum];
        if (matchPNHRegionData.length) return [matchOutOfRegion];
        return ['NoMatch'];
    }

    static #validatePnhSSColumnHeaders(headers: string[]): boolean {
        let valid = true;
        const expectedHeaders = (Pnh.SSHeader as any).toValueArray();
        headers.forEach(header => {
            if (header.length && header !== 'temp_field' && !expectedHeaders.includes(header) && !Pnh.COLUMNS_TO_IGNORE.includes(header)) {
                console.warn(`WMEPH: Unexpected column header found in PNH spreadsheet: ${header}`);
            }
        });
        expectedHeaders.forEach((header: string) => {
            if (!headers.includes(header)) {
                console.error(`WMEPH: Column header missing from PNH spreadsheet data: ${header}`);
                valid = false;
            }
        });
        return valid;
    }

    static processPnhSSRows(allData: any[][], columnIndex: number, country: Country): PnhEntry[] {
        const rows = this.processImportedDataColumn(allData, columnIndex);
        const columnHeaders = rows.splice(0, 1)[0].split('|').map((h: string) => h.trim());
        if (!columnHeaders[0].length) columnHeaders[0] = Pnh.SSHeader.order;
        if (!Pnh.#validatePnhSSColumnHeaders(columnHeaders)) {
            throw new Error('WMEPH: WMEPH exiting due to missing spreadsheet column headers.');
        }
        return rows.map((row: string) => new PnhEntry(columnHeaders, row, country)).filter((entry: PnhEntry) => !entry.disabled && !entry.invalid);
    }

    static processImportedDataColumn(allData: any[][], columnIndex: number): string[] {
        return allData.filter((row: any[]) => row.length >= columnIndex + 1).map((row: any[]) => row[columnIndex]);
    }

    static #getSpreadsheetUrl(id: string, range: string, key: string): string {
        return `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?${dec(key)}`;
    }

    static async downloadAllData(): Promise<void> {
        await this.downloadPnhData();
        await this.#downloadPnhModerators();
    }

    static downloadPnhData(): Promise<void> {
        log('PNH data download started...');
        return new Promise((resolve, reject) => {
            const url = this.#getSpreadsheetUrl(this.#SPREADSHEET_ID, this.#SPREADSHEET_RANGE, this.#API_KEY);

            $.getJSON(url).done((res: any) => {
                const { values } = res;
                if (values[0][0].toLowerCase() === 'obsolete') {
                    WazeWrap.Alerts.error(SCRIPT_NAME, 'You are using an outdated version of WMEPH that doesn\'t work anymore. Update or disable the script.');
                    return;
                }

                Pnh.WORD_VARIATIONS = Pnh.processImportedDataColumn(values, 11).slice(1).map((row: string) => row.toUpperCase().replace(/[^A-z0-9,]/g, '').split(','));

                PNH_DATA.USA = new Country('USA', 'USA', values, 3, 0, {
                    NWR: new Region('NWR', '1hv5hXBlGr1pTMmo4n3frUx1DovUODbZodfDBwwTc7HE'),
                    SWR: new Region('SWR', '1Qf2N4fSkNzhVuXJwPBJMQBmW0suNuy8W9itCo1qgJL4'),
                    HI: new Region('HI', '1K7Dohm8eamIKry3KwMTVnpMdJLaMIyDGMt7Bw6iqH_A', null, ['entry.1497446659', 'entry.50214576', 'entry.1749047694']),
                    PLN: new Region('PLN', '1ycXtAppoR5eEydFBwnghhu1hkHq26uabjUu8yAlIQuI'),
                    SCR: new Region('SCR', '1KZzLdlX0HLxED5Bv0wFB-rWccxUp2Mclih5QJIQFKSQ'),
                    GLR: new Region('GLR', '19btj-Qt2-_TCRlcS49fl6AeUT95Wnmu7Um53qzjj9BA'),
                    SAT: new Region('SAT', '1bxgK_20Jix2ahbmUvY1qcY0-RmzUBT6KbE5kjDEObF8', ['entry.2063110249', 'entry.2018912633', 'entry.1924826395'], ['entry.2063110249', 'entry.123778794', 'entry.1924826395']),
                    SER: new Region('SER', '1jYBcxT3jycrkttK5BxhvPXR240KUHnoFMtkZAXzPg34', ['entry.822075961', 'entry.1422079728', 'entry.1891389966'], ['entry.822075961', 'entry.607048307', 'entry.1891389966']),
                    ATR: new Region('ATR', '1v7JhffTfr62aPSOp8qZHA_5ARkBPldWWJwDeDzEioR0'),
                    NER: new Region('NER', '1UgFAMdSQuJAySHR0D86frvphp81l7qhEdJXZpyBZU6c'),
                    NOR: new Region('NOR', '1iYq2rd9HRd-RBsKqmbHDIEBGuyWBSyrIHC6QLESfm4c'),
                    MAR: new Region('MAR', '1PhL1iaugbRMc3W-yGdqESoooeOz-TJIbjdLBRScJYOk')
                });
                PNH_DATA.CAN = new Country('CAN', 'Canada', values, 3, 2, {
                    CA_EN: new Region('CA_EN', '13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws', ['entry_839085807', 'entry_1067461077', 'entry_318793106', 'entry_1149649663'], ['entry_839085807', 'entry_1125435193', 'entry_318793106', 'entry_1149649663']),
                    QC: new Region('QC', '13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws', ['entry_839085807', 'entry_1067461077', 'entry_318793106', 'entry_1149649663'], ['entry_839085807', 'entry_1125435193', 'entry_318793106', 'entry_1149649663'])
                });
                PNH_DATA.states = Pnh.processImportedDataColumn(values, 1);

                const WMEPHuserList = Pnh.processImportedDataColumn(values, 4)[1].split('|');
                const betaix = WMEPHuserList.indexOf('BETAUSERS');
                _wmephDevList = [];
                _wmephBetaList = [];
                for (let ulix = 1; ulix < betaix; ulix++) _wmephDevList.push(WMEPHuserList[ulix].toLowerCase().trim());
                for (let ulix = betaix + 1; ulix < WMEPHuserList.length; ulix++) _wmephBetaList.push(WMEPHuserList[ulix].toLowerCase().trim());

                const processTermsCell = (termsValues: any[][], colIdx: number) => Pnh.processImportedDataColumn(termsValues, colIdx)[1].toLowerCase().split('|').map((value: string) => value.trim());
                this.HOSPITAL_PART_MATCH = processTermsCell(values, 5);
                this.HOSPITAL_FULL_MATCH = processTermsCell(values, 6);
                this.ANIMAL_PART_MATCH = processTermsCell(values, 7);
                this.ANIMAL_FULL_MATCH = processTermsCell(values, 8);
                this.SCHOOL_PART_MATCH = processTermsCell(values, 9);
                this.SCHOOL_FULL_MATCH = processTermsCell(values, 10);

                log('PNH data download completed');
                resolve();
            }).fail((res: any) => {
                const message = res.responseJSON && res.responseJSON.error ? res.responseJSON.error : 'See response error message above.';
                console.error('WMEPH failed to load spreadsheet:', message);
                reject();
            });
        });
    }

    static #downloadPnhModerators(): Promise<void> {
        log('PNH moderators download started...');
        return new Promise(resolve => {
            const url = Pnh.#getSpreadsheetUrl(Pnh.#SPREADSHEET_ID, Pnh.#SPREADSHEET_MODERATORS_RANGE, Pnh.#API_KEY);

            $.getJSON(url).done((res: any) => {
                const { values } = res;
                try {
                    values.forEach((regionArray: string[]) => {
                        const region = regionArray[0];
                        const mods = regionArray.slice(3);
                        Pnh.MODERATORS[region] = mods;
                    });
                } catch (ex) {
                    Pnh.MODERATORS['?'] = ['Error downloading moderators!'];
                }
                delete Pnh.MODERATORS.TX;
                log('PNH moderators download completed');
                resolve();
            }).fail((res: any) => {
                const message = res.responseJSON && res.responseJSON.error ? res.responseJSON.error : 'See response error message above.';
                console.error('WMEPH failed to load moderator list:', message);
                Pnh.MODERATORS['?'] = ['Error downloading moderators!'];
                resolve();
            });
        });
    }

    static processCategories(categoryDataRows: string[], categoryInfos: PnhCategoryInfos): void {
        let headers: string[];
        let pnhServiceKeys: string[];
        let wmeServiceIds: string[];
        const splitValues = (value: string) => (value.trim() ? value.split(',').map((v: string) => v.trim()) : []);
        categoryDataRows.forEach((rowStr: string, iRow: number) => {
            const row = rowStr.split('|');
            if (iRow === 0) {
                headers = row;
            } else if (iRow === 1) {
                pnhServiceKeys = row;
            } else if (iRow === 2) {
                wmeServiceIds = row;
            } else {
                const categoryInfo: any = { services: [] };
                row.forEach((value: string, iCol: number) => {
                    const headerValue = headers[iCol].trim();
                    value = value.trim();
                    switch (headerValue) {
                        case 'pc_wmecat': categoryInfo.id = value; break;
                        case 'pc_transcat': categoryInfo.name = value; break;
                        case 'pc_catparent': categoryInfo.parent = value; break;
                        case 'pc_point': categoryInfo.point = value; break;
                        case 'pc_area': categoryInfo.area = value; break;
                        case 'pc_regpoint': categoryInfo.regPoint = splitValues(value); break;
                        case 'pc_regarea': categoryInfo.regArea = splitValues(value); break;
                        case 'pc_lock1': categoryInfo.lock1 = splitValues(value); break;
                        case 'pc_lock2': categoryInfo.lock2 = splitValues(value); break;
                        case 'pc_lock3': categoryInfo.lock3 = splitValues(value); break;
                        case 'pc_lock4': categoryInfo.lock4 = splitValues(value); break;
                        case 'pc_lock5': categoryInfo.lock5 = splitValues(value); break;
                        case 'pc_rare': categoryInfo.rare = splitValues(value); break;
                        case 'pc_parent': categoryInfo.disallowedParent = splitValues(value); break;
                        case 'pc_message': categoryInfo.message = value; break;
                        case 'ps_valet': case 'ps_drivethru': case 'ps_wifi': case 'ps_restrooms':
                        case 'ps_cc': case 'ps_reservations': case 'ps_outside': case 'ps_ac':
                        case 'ps_parking': case 'ps_deliveries': case 'ps_takeaway': case 'ps_wheelchair':
                            if (value) categoryInfo.services.push({ wmeId: wmeServiceIds[iCol], pnhKey: pnhServiceKeys[iCol] });
                            break;
                        case '': break;
                        default: throw new Error(`WMEPH: Unexpected category data from PNH sheet: ${headerValue}`);
                    }
                });
                categoryInfos.add(categoryInfo);
            }
        });
    }

    static addSpellingVariants(nameList: string[], spellingVariantList: string[]): void {
        for (let spellingOneIdx = 0; spellingOneIdx < spellingVariantList.length; spellingOneIdx++) {
            const spellingOne = spellingVariantList[spellingOneIdx];
            const namesToCheck = nameList.filter(name => name.includes(spellingOne));
            for (let spellingTwoIdx = 0; spellingTwoIdx < spellingVariantList.length; spellingTwoIdx++) {
                if (spellingTwoIdx !== spellingOneIdx) {
                    const spellingTwo = spellingVariantList[spellingTwoIdx];
                    namesToCheck.forEach(name => {
                        const newName = name.replace(spellingOne, spellingTwo);
                        if (!nameList.includes(newName)) nameList.push(newName);
                    });
                }
            }
        }
    }
}