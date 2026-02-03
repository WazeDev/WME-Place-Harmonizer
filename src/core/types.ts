export interface PnhChainEntry {
    id: string;
    name: string;
    categories: string[];
    description?: string | null;
    url?: string | null;
    brand?: string | null;
    aliases?: string[];
    services?: string[];
    nameRegex?: string | null;
    countryCode?: string | null;
    regionCode?: string | null;
    regionCodes?: string[];
    scope?: 'local' | 'regional' | 'national';
}

export interface PnhServiceMapping {
    pnhKey: string;
    wmeId: string;
}

export interface PnhCategoryInfo {
    id: string;
    name: string;
    services: PnhServiceMapping[];
}

export interface PnhStateMetadata {
    stateCode: string;
    stateName: string;
    region: string;
    defaultLockLevel?: number;
    googleFormId?: string;
    areaCodes?: string[];
}

export type PnhStateMeta = PnhStateMetadata;

export interface HarmonizationResult {
    applied: boolean;
    messages: string[];
}

export interface HarmonizationChange {
    field: string;
    oldValue: any;
    newValue: any;
    reason: string;
}

export interface HarmonizationIssue {
    field: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
}

export interface WhitelistEntry {
    venueId: string;
    venueName?: string;
    allowMissingPhone?: boolean;
    allowMissingUrl?: boolean;
    allowMissingAddress?: boolean;
    allowMissingHours?: boolean;
    dupeWhitelist?: string[];
    country?: string;
    state?: string;
    addedDate?: number;
    reason?: string;
}

export interface UserContext {
    name: string;
    rank: number;
    isBeta: boolean;
    isDev: boolean;
}
