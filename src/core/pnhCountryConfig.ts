export const DEFAULT_NEW_CHAIN_ENTRY_IDS = ['entry.925969794', 'entry.1970139752', 'entry.1749047694'];
export const DEFAULT_APPROVE_CHAIN_ENTRY_IDS = ['entry.925969794', 'entry.50214576', 'entry.1749047694'];

export class PnhRegion {
    readonly code: string;
    readonly formId: string;
    readonly newChainRequestEntryIds: string[];
    readonly approveChainRequestEntryIds: string[];

    constructor(
        code: string,
        formId: string,
        newChainRequestEntryIds?: string[] | null,
        approveChainRequestEntryIds?: string[] | null
    ) {
        this.code = code;
        this.formId = formId;
        this.newChainRequestEntryIds = newChainRequestEntryIds ?? DEFAULT_NEW_CHAIN_ENTRY_IDS;
        this.approveChainRequestEntryIds = approveChainRequestEntryIds ?? DEFAULT_APPROVE_CHAIN_ENTRY_IDS;
    }

    private buildFormUrl(entryIds: string[], entryValues: string[]): string {
        const entryValuesUrl = entryValues.map((value, idx) => `${entryIds[idx]}=${value}`).join('&');
        return `https://docs.google.com/forms/d/${this.formId}/viewform?${entryValuesUrl}`;
    }

    getNewChainFormUrl(entryValues: string[]): string {
        return this.buildFormUrl(this.newChainRequestEntryIds, entryValues);
    }

    getApproveChainFormUrl(entryValues: string[]): string {
        return this.buildFormUrl(this.approveChainRequestEntryIds, entryValues);
    }
}

export interface PnhCountryConfig {
    code: string;
    name: string;
    aliases: string[];
    abbrs: string[];
    sheetRanges: string[];
    regions: Record<string, PnhRegion>;
}

const PNH_COUNTRIES: PnhCountryConfig[] = [
    {
        code: 'USA',
        name: 'USA',
        aliases: [
            'United States',
            'American Samoa',
            'Guam',
            'Northern Mariana Islands',
            'Puerto Rico',
            'Virgin Islands (U.S.)'
        ],
        abbrs: ['US', 'USA'],
        sheetRanges: ['USA!A1:Z'],
        regions: {
            NWR: new PnhRegion('NWR', '1hv5hXBlGr1pTMmo4n3frUx1DovUODbZodfDBwwTc7HE'),
            SWR: new PnhRegion('SWR', '1Qf2N4fSkNzhVuXJwPBJMQBmW0suNuy8W9itCo1qgJL4'),
            HI: new PnhRegion('HI', '1K7Dohm8eamIKry3KwMTVnpMdJLaMIyDGMt7Bw6iqH_A', null, [
                'entry.1497446659',
                'entry.50214576',
                'entry.1749047694'
            ]),
            PLN: new PnhRegion('PLN', '1ycXtAppoR5eEydFBwnghhu1hkHq26uabjUu8yAlIQuI'),
            SCR: new PnhRegion('SCR', '1KZzLdlX0HLxED5Bv0wFB-rWccxUp2Mclih5QJIQFKSQ'),
            GLR: new PnhRegion('GLR', '19btj-Qt2-_TCRlcS49fl6AeUT95Wnmu7Um53qzjj9BA'),
            SAT: new PnhRegion(
                'SAT',
                '1bxgK_20Jix2ahbmUvY1qcY0-RmzUBT6KbE5kjDEObF8',
                ['entry.2063110249', 'entry.2018912633', 'entry.1924826395'],
                ['entry.2063110249', 'entry.123778794', 'entry.1924826395']
            ),
            SER: new PnhRegion(
                'SER',
                '1jYBcxT3jycrkttK5BxhvPXR240KUHnoFMtkZAXzPg34',
                ['entry.822075961', 'entry.1422079728', 'entry.1891389966'],
                ['entry.822075961', 'entry.607048307', 'entry.1891389966']
            ),
            ATR: new PnhRegion('ATR', '1v7JhffTfr62aPSOp8qZHA_5ARkBPldWWJwDeDzEioR0'),
            NER: new PnhRegion('NER', '1UgFAMdSQuJAySHR0D86frvphp81l7qhEdJXZpyBZU6c'),
            NOR: new PnhRegion('NOR', '1iYq2rd9HRd-RBsKqmbHDIEBGuyWBSyrIHC6QLESfm4c'),
            MAR: new PnhRegion('MAR', '1PhL1iaugbRMc3W-yGdqESoooeOz-TJIbjdLBRScJYOk')
        }
    },
    {
        code: 'CAN',
        name: 'Canada',
        aliases: ['Canada'],
        abbrs: ['CA', 'CAN'],
        sheetRanges: ['CAN!A1:Z', 'Canada!A1:Z'],
        regions: {
            CA_EN: new PnhRegion(
                'CA_EN',
                '13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws',
                ['entry_839085807', 'entry_1067461077', 'entry_318793106', 'entry_1149649663'],
                ['entry_839085807', 'entry_1125435193', 'entry_318793106', 'entry_1149649663']
            ),
            QC: new PnhRegion(
                'QC',
                '13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws',
                ['entry_839085807', 'entry_1067461077', 'entry_318793106', 'entry_1149649663'],
                ['entry_839085807', 'entry_1125435193', 'entry_318793106', 'entry_1149649663']
            )
        }
    }
];

function normalizeCode(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.toUpperCase() : null;
}

export function listSupportedCountryCodes(): string[] {
    return PNH_COUNTRIES.map(country => country.code);
}

export function getPnhCountryConfigByCode(code: string | null | undefined): PnhCountryConfig | null {
    const normalized = normalizeCode(code);
    if (!normalized) return null;
    return PNH_COUNTRIES.find(country => normalizeCode(country.code) === normalized) ?? null;
}

export function resolvePnhCountryCodeFromWme(
    countryName?: string | null,
    countryAbbr?: string | null
): string | null {
    const normalizedName = countryName?.trim();
    const normalizedAbbr = normalizeCode(countryAbbr);

    const match = PNH_COUNTRIES.find(country => {
        if (normalizedName && country.aliases.includes(normalizedName)) return true;
        if (normalizedAbbr && country.abbrs.some(abbr => normalizeCode(abbr) === normalizedAbbr)) return true;
        return false;
    });

    if (match) return match.code;
    if (normalizedAbbr) return normalizedAbbr;
    return normalizedName ? normalizedName.toUpperCase() : null;
}
