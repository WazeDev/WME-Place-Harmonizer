export const SCRIPT_NAME: string = 'WME Place Harmonizer';
export const SCRIPT_VERSION: string = '2025.05.19.000';
export const IS_BETA_VERSION: boolean = /Beta/i.test(SCRIPT_NAME);
export const BETA_VERSION_STR: string = IS_BETA_VERSION ? 'Beta' : '';

export const DEFAULT_HOURS_TEXT: string = 'Paste hours here';
export const MAX_CACHE_SIZE: number = 25000;
export const BAD_URL: string = 'badURL';
export const BAD_PHONE: string = 'badPhone';

export const SEVERITY = {
    GREEN: 0,
    BLUE: 1,
    YELLOW: 2,
    RED: 3,
    PINK: 5,
    ORANGE: 6
} as const;

export type SeverityValue = typeof SEVERITY[keyof typeof SEVERITY];

export interface UserData {
    ref: any | null; // Will be properly typed when SDK is integrated
    rank: number | null;
    name: string | null;
    isBetaUser: boolean;
    isDevUser: boolean;
}

export const USER: UserData = {
    ref: null,
    rank: null,
    name: null,
    isBetaUser: false,
    isDevUser: false
};

export const URLS: Record<string, string> = {
    forum: 'https://www.waze.com/discuss/t/178574',
    usaPnh: 'https://docs.google.com/spreadsheets/d/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/edit#gid=0',
    placesWiki: 'https://wazeopedia.waze.com/wiki/USA/Places',
    restAreaWiki: 'https://wazeopedia.waze.com/wiki/USA/Rest_areas#Adding_a_Place',
    uspsWiki: 'https://wazeopedia.waze.com/wiki/USA/Places/Post_office'
};

export const PNH_DATA: Record<string, any> = {
    USA: null,
    CAN: null
};

export const CAT: Record<string, string> = {
    AIRPORT: 'AIRPORT',
    ATM: 'ATM',
    BANK_FINANCIAL: 'BANK_FINANCIAL',
    BAR: 'BAR',
    BRIDGE: 'BRIDGE',
    CAMPING_TRAILER_PARK: 'CAMPING_TRAILER_PARK',
    CANAL: 'CANAL',
    CAR_RENTAL: 'CAR_RENTAL',
    CHARGING_STATION: 'CHARGING_STATION',
    CEMETERY: 'CEMETERY',
    COLLEGE_UNIVERSITY: 'COLLEGE_UNIVERSITY',
    CONSTRUCTION_SITE: 'CONSTRUCTION_SITE',
    CONVENIENCE_STORE: 'CONVENIENCE_STORE',
    CONVENTIONS_EVENT_CENTER: 'CONVENTIONS_EVENT_CENTER',
    COTTAGE_CABIN: 'COTTAGE_CABIN',
    CULTURE_AND_ENTERTAINEMENT: 'CULTURE_AND_ENTERTAINEMENT',
    DAM: 'DAM',
    DESSERT: 'DESSERT',
    DOCTOR_CLINIC: 'DOCTOR_CLINIC',
    FARM: 'FARM',
    FERRY_PIER: 'FERRY_PIER',
    FIRE_DEPARTMENT: 'FIRE_DEPARTMENT',
    FOOD_AND_DRINK: 'FOOD_AND_DRINK',
    FOREST_GROVE: 'FOREST_GROVE',
    GAS_STATION: 'GAS_STATION',
    GOLF_COURSE: 'GOLF_COURSE',
    GYM_FITNESS: 'GYM_FITNESS',
    HOSPITAL_MEDICAL_CARE: 'HOSPITAL_MEDICAL_CARE',
    HOSPITAL_URGENT_CARE: 'HOSPITAL_URGENT_CARE',
    HOTEL: 'HOTEL',
    ISLAND: 'ISLAND',
    JUNCTION_INTERCHANGE: 'JUNCTION_INTERCHANGE',
    LODGING: 'LODGING',
    MOVIE_THEATER: 'MOVIE_THEATER',
    NATURAL_FEATURES: 'NATURAL_FEATURES',
    OFFICES: 'OFFICES',
    OTHER: 'OTHER',
    PARK: 'PARK',
    PARKING_LOT: 'PARKING_LOT',
    PERSONAL_CARE: 'PERSONAL_CARE',
    PET_STORE_VETERINARIAN_SERVICES: 'PET_STORE_VETERINARIAN_SERVICES',
    PHARMACY: 'PHARMACY',
    PLAYGROUND: 'PLAYGROUND',
    POLICE_STATION: 'POLICE_STATION',
    POST_OFFICE: 'POST_OFFICE',
    RELIGIOUS_CENTER: 'RELIGIOUS_CENTER',
    RESIDENCE_HOME: 'RESIDENCE_HOME',
    REST_AREAS: 'REST_AREAS',
    RESTAURANT: 'RESTAURANT',
    RIVER_STREAM: 'RIVER_STREAM',
    SCENIC_LOOKOUT_VIEWPOINT: 'SCENIC_LOOKOUT_VIEWPOINT',
    SCHOOL: 'SCHOOL',
    SEA_LAKE_POOL: 'SEA_LAKE_POOL',
    SEAPORT_MARINA_HARBOR: 'SEAPORT_MARINA_HARBOR',
    SHOPPING_AND_SERVICES: 'SHOPPING_AND_SERVICES',
    SHOPPING_CENTER: 'SHOPPING_CENTER',
    SPORTS_COURT: 'SPORTS_COURT',
    STADIUM_ARENA: 'STADIUM_ARENA',
    SUBWAY_STATION: 'SUBWAY_STATION',
    SUPERMARKET_GROCERY: 'SUPERMARKET_GROCERY',
    SWAMP_MARSH: 'SWAMP_MARSH',
    TRANSPORTATION: 'TRANSPORTATION',
    TUNNEL: 'TUNNEL'
};

export const EV_PAYMENT_METHOD: Record<string, string> = {
    APP: 'APP',
    CREDIT: 'CREDIT',
    DEBIT: 'DEBIT',
    MEMBERSHIP_CARD: 'MEMBERSHIP_CARD',
    ONLENE_PAYMENT: 'ONLINE_PAYMENT',
    PLUG_IN_AUTO_CHARGER: 'PLUG_IN_AUTO_CHARGE',
    OTHER: 'OTHER'
};

export const COMMON_EV_PAYMENT_METHODS: Record<string, string[]> = {
    'Blink Charging': [
        EV_PAYMENT_METHOD.APP,
        EV_PAYMENT_METHOD.MEMBERSHIP_CARD,
        EV_PAYMENT_METHOD.PLUG_IN_AUTO_CHARGER,
        EV_PAYMENT_METHOD.OTHER
    ],
    ChargePoint: [
        EV_PAYMENT_METHOD.APP,
        EV_PAYMENT_METHOD.CREDIT,
        EV_PAYMENT_METHOD.DEBIT,
        EV_PAYMENT_METHOD.MEMBERSHIP_CARD
    ],
    'Electrify America': [
        EV_PAYMENT_METHOD.APP,
        EV_PAYMENT_METHOD.CREDIT,
        EV_PAYMENT_METHOD.DEBIT,
        EV_PAYMENT_METHOD.MEMBERSHIP_CARD,
        EV_PAYMENT_METHOD.PLUG_IN_AUTO_CHARGER
    ],
    EVgo: [
        EV_PAYMENT_METHOD.APP,
        EV_PAYMENT_METHOD.CREDIT,
        EV_PAYMENT_METHOD.DEBIT,
        EV_PAYMENT_METHOD.MEMBERSHIP_CARD,
        EV_PAYMENT_METHOD.PLUG_IN_AUTO_CHARGER
    ],
    SemaConnect: [
        EV_PAYMENT_METHOD.APP,
        EV_PAYMENT_METHOD.MEMBERSHIP_CARD,
        EV_PAYMENT_METHOD.OTHER
    ],
    Tesla: [
        EV_PAYMENT_METHOD.PLUG_IN_AUTO_CHARGER
    ]
};

export const WME_SERVICES_ARRAY: string[] = ['VALLET_SERVICE', 'DRIVETHROUGH', 'WI_FI', 'RESTROOMS', 'CREDIT_CARDS', 'RESERVATIONS', 'OUTSIDE_SEATING',
    'AIR_CONDITIONING', 'PARKING_FOR_CUSTOMERS', 'DELIVERIES', 'TAKE_AWAY', 'CURBSIDE_PICKUP', 'WHEELCHAIR_ACCESSIBLE', 'DISABILITY_PARKING'];

export const COLLEGE_ABBREVIATIONS: string[] = ['USF', 'USFSP', 'UF', 'UCF', 'UA', 'UGA', 'FSU', 'UM', 'SCP', 'FAU', 'FIU'];

export const NO_NUM_SKIP: string[] = ['BANK', 'ATM', 'HOTEL', 'MOTEL', 'STORE', 'MARKET', 'SUPERMARKET', 'GYM', 'GAS', 'GASOLINE',
    'GASSTATION', 'CAFE', 'OFFICE', 'OFFICES', 'CARRENTAL', 'RENTALCAR', 'RENTAL', 'SALON', 'BAR',
    'BUILDING', 'LOT', ...COLLEGE_ABBREVIATIONS];

export const TITLECASE_SETTINGS: { ignoreWords: string[]; capWords: string[]; specWords: string[] } = {
    ignoreWords: 'an|and|as|at|by|for|from|hhgregg|in|into|of|on|or|the|to|with'.split('|'),
    capWords: '3M|AAA|AMC|AOL|AT&T|ATM|BBC|BLT|BMV|BMW|BP|CBS|CCS|CGI|CISCO|CJ|CNG|CNN|CVS|DHL|DKNY|DMV|DSW|EMS|ER|ESPN|FCU|FCUK|FDNY|GNC|H&M|HP|HSBC|IBM|IHOP|IKEA|IRS|JBL|JCPenney|KFC|LLC|MBNA|MCA|MCI|NBC|NYPD|PDQ|PNC|TCBY|TNT|TV|UPS|USA|USPS|VW|XYZ|ZZZ'.split('|'),
    specWords: 'd\'Bronx|iFix|ExtraMile|ChargePoint|EVgo|SemaConnect'.split('|')
};

export const PRIMARY_CATS_TO_IGNORE_MISSING_PHONE_URL: string[] = [CAT.ISLAND, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.JUNCTION_INTERCHANGE, CAT.SCENIC_LOOKOUT_VIEWPOINT];
export const PRIMARY_CATS_TO_FLAG_GREEN_MISSING_PHONE_URL: string[] = [CAT.BRIDGE, CAT.FOREST_GROVE, CAT.DAM, CAT.TUNNEL, CAT.CEMETERY];
export const ANY_CATS_TO_FLAG_GREEN_MISSING_PHONE_URL: string[] = [CAT.REST_AREAS];
export const REGIONS_THAT_WANT_PLA_PHONE_URL: string[] = ['SER'];
export const CHAIN_APPROVAL_PRIMARY_CATS_TO_IGNORE: string[] = [CAT.POST_OFFICE, CAT.BRIDGE, CAT.FOREST_GROVE, CAT.DAM, CAT.TUNNEL, CAT.CEMETERY, CAT.ISLAND, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.JUNCTION_INTERCHANGE, CAT.SCENIC_LOOKOUT_VIEWPOINT];
export const CATS_THAT_DONT_NEED_NAMES: string[] = [CAT.SEA_LAKE_POOL];
export const FEEDS_TO_SKIP: RegExp[] = [/^google$/i, /^yext\d?/i, /^wazeads$/i, /^parkme$/i, /^navads(na)?$/i];
export const CATS_TO_IGNORE_CUSTOMER_PARKING_HIGHLIGHT: string[] = [CAT.BRIDGE, CAT.CANAL, CAT.CHARGING_STATION, CAT.CONSTRUCTION_SITE, CAT.ISLAND, CAT.JUNCTION_INTERCHANGE, CAT.NATURAL_FEATURES, CAT.PARKING_LOT, CAT.RESIDENCE_HOME, CAT.RIVER_STREAM, CAT.SEA_LAKE_POOL, CAT.SWAMP_MARSH, CAT.TUNNEL];
export const SEARCH_RESULTS_WINDOW_NAME: string = '"WMEPH Search Results"';
export const _searchResultsWindowSpecs: string = `"resizable=yes, top=${Math.round(window.screen.height * 0.1)}, left=${Math.round(window.screen.width * 0.3)}, width=${Math.round(window.screen.width * 0.7)}, height=${Math.round(window.screen.height * 0.8)}"`;
export const SETTING_IDS: Record<string, string> = { sfUrlWarning: 'SFURLWarning', gLinkWarning: 'GLinkWarning' };