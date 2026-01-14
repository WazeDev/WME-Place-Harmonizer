/*
 * Derived from HoursParser.js by MapOMatic (originally by bmtg), licensed under GPL-3.0.
 * This TypeScript port preserves the GPL-3.0 obligations; retain this notice in copies or modifications.
 */


export type HoursParserResult = {
    days: number[];
    fromHour: string;
    toHour: string;
};

const DAYS_OF_THE_WEEK: Record<string, string[]> = {
    SS: ['saturdays', 'saturday', 'satur', 'sat', 'sa'],
    UU: ['sundays', 'sunday', 'sun', 'su'],
    MM: ['mondays', 'monday', 'mondy', 'mon', 'mo'],
    TT: ['tuesdays', 'tuesday', 'tues', 'tue', 'tu'],
    WW: ['wednesdays', 'wednesday', 'weds', 'wed', 'we'],
    RR: ['thursdays', 'thursday', 'thurs', 'thur', 'thu', 'th'],
    FF: ['fridays', 'friday', 'fri', 'fr']
};
const MONTHS_OF_THE_YEAR: Record<string, string[]> = {
    JAN: ['january', 'jan'],
    FEB: ['february', 'febr', 'feb'],
    MAR: ['march', 'mar'],
    APR: ['april', 'apr'],
    MAY: ['may', 'may'],
    JUN: ['june', 'jun'],
    JUL: ['july', 'jul'],
    AUG: ['august', 'aug'],
    SEP: ['september', 'sept', 'sep'],
    OCT: ['october', 'oct'],
    NOV: ['november', 'nov'],
    DEC: ['december', 'dec']
};
const DAY_CODE_VECTOR = ['MM', 'TT', 'WW', 'RR', 'FF', 'SS', 'UU', 'MM', 'TT', 'WW', 'RR', 'FF', 'SS', 'UU', 'MM', 'TT', 'WW', 'RR', 'FF'];
const THRU_WORDS = ['through', 'thru', 'to', 'until', 'till', 'til', '-', '~'];

export class HoursParser {
    static parse(inputHours: string, locale?: string): HoursParserResult[] {
        let input = inputHours.toLowerCase().trim();
        if (input.length === 0 || input === ',') return [];
        if (/24\s*[\\/*x]\s*7/g.test(input)) {
            input = 'mon-sun 00:00-00:00';
        } else {
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            input = input.replace(/\btoday\b/g, today.toLocaleDateString(locale, { weekday: 'short' }).toLowerCase())
                .replace(/\btomorrow\b/g, tomorrow.toLocaleDateString(locale, { weekday: 'short' }).toLowerCase())
                .replace(/[\u2013|\u2014]/g, '-')
                .replace(/[^a-z0-9\:\-\. ~]/g, ' ')
                .replace(/\:{2,}/g, ':')
                .replace(/closed|not open/g, '99:99-99:99')
                .replace(/by appointment( only)?/g, '99:99-99:99')
                .replace(/weekdays/g, 'mon-fri').replace(/weekends/g, 'sat-sun')
                .replace(/(12(:00)?\W*)?noon/g, '12:00').replace(/(12(:00)?\W*)?mid(night|nite)/g, '00:00')
                .replace(/every\s*day|daily|(7|seven) days a week/g, 'mon-sun')
                .replace(/(open\s*)?(24|twenty\W*four)\W*h(ou)?rs?|all day/g, '00:00-00:00')
                .replace(/(\D:)([^ ])/g, '$1 $2');
            THRU_WORDS.forEach(word => {
                input = input.replace(new RegExp(word, 'g'), '-');
            });
        }
        input = input.replace(/\-{2,}/g, '-');
        let killWords = 'paste|here|business|day of the week|days of the week|operation|times|time|walk-ins|walk ins|welcome|dinner|lunch|brunch|breakfast|regular|weekday|weekend|opening|open|now|from|hours|hour|our|are|and|&'.split('|');
        for (const dayList of Object.values(DAYS_OF_THE_WEEK)) killWords.push(...dayList);
        for (const monthList of Object.values(MONTHS_OF_THE_YEAR)) killWords.push(...monthList);
        for (const word of killWords) {
            input = input.replace(new RegExp('\\b' + word + '\\b', 'g'), '');
        }
        for (const [dayKey, tempDayList] of Object.entries(DAYS_OF_THE_WEEK)) {
            for (const day of tempDayList) {
                input = input.replace(new RegExp(day + '(?!a-z)', 'g'), dayKey);
            }
        }
        for (const [monthKey, tempMonthList] of Object.entries(MONTHS_OF_THE_YEAR)) {
            for (const month of tempMonthList) {
                input = input.replace(new RegExp(month + '\\.? ?\\d{1,2}\\,? ?201\\d{1}', 'g'), ' ');
                input = input.replace(new RegExp(month + '\\.? ?\\d{1,2}', 'g'), ' ');
            }
        }
        input = input.replace(/(\d{1,2})\.(\d{2})/g, '$1:$2');
        input = input.replace(/\./g, '');
        input = input.replace(/(\D+)\:(\D+)/g, '$1 $2').replace(/^ *\:/g, ' ').replace(/\: *$/g, ' ');
        input = input.replace(/ *pm/g, 'PP').replace(/ *am/g, 'AA');
        input = input.replace(/ *p\.m\./g, 'PP').replace(/ *a\.m\./g, 'AA');
        input = input.replace(/ *p\.m/g, 'PP').replace(/ *a\.m/g, 'AA');
        input = input.replace(/ *p/g, 'PP').replace(/ *a/g, 'AA');
        input = input.replace(/\- {1,}/g, '-').replace(/ {1,}\-/g, '-');
        input = input.replace(/^(00:00-00:00)$/g, 'MM-UU$1');
        if (input.match(/[bcdeghijklnoqvxyz]/g) !== null) return [];
        input = input.replace(/m/g, 'MM').replace(/t/g, 'TT').replace(/w/g, 'WW').replace(/r/g, 'RR');
        input = input.replace(/f/g, 'FF').replace(/s/g, 'SS').replace(/u/g, 'UU');
        input = input.replace(/ {2,}/g, ' ');
        input = input.replace(/ {1,}AA/g, 'AA');
        input = input.replace(/ {1,}PP/g, 'PP');
        for (let i = 0; i < 5; i++) {
            input = input.replace(/([^0-9\:])(\d{1})([^0-9\:])/g, '$10$2:00$3');
            input = input.replace(/^(\d{1})([^0-9\:])/g, '0$1:00$2');
            input = input.replace(/([^0-9\:])(\d{1})$/g, '$10$2:00');
            input = input.replace(/([^0-9\:])(\d{2})([^0-9\:])/g, '$1$2:00$3');
            input = input.replace(/^(\d{2})([^0-9\:])/g, '$1:00$2');
            input = input.replace(/([^0-9\:])(\d{2})$/g, '$1$2:00');
            input = input.replace(/(\D)(\d{1})(\d{2}\D)/g, '$10$2:$3');
            input = input.replace(/^(\d{1})(\d{2}\D)/g, '0$1:$2');
            input = input.replace(/(\D)(\d{1})(\d{2})$/g, '$10$2:$3');
            input = input.replace(/(\D\d{2})(\d{2}\D)/g, '$1:$2');
            input = input.replace(/^(\d{2})(\d{2}\D)/g, '$1:$2');
            input = input.replace(/(\D\d{2})(\d{2})$/g, '$1:$2');
            input = input.replace(/(\D)(\d{1}\:)/g, '$10$2');
            input = input.replace(/^(\d{1}\:)/g, '0$1');
        }
        input = input.replace(/12(\:\d{2}AA)/g, '00$1');
        while (input.match(/\d{2}\:\d{2}PP/) !== null) {
            const m = input.match(/(\d{2})\:\d{2}PP/);
            if (!m) break;
            const tfHourTemp = (parseInt(m[1]) % 12 + 12).toString().padStart(2, '0');
            input = input.replace(/\d{2}(\:\d{2})PP/, tfHourTemp + '$1');
        }
        input = input.replace(/AA/g, '');
        input = input.replace(/[^A-Z0-9\:-]/g, ' ').replace(/ {2,}/g, ' ');
        input = input.replace(/^ +/g, '').replace(/ {1,}$/g, '');
        input = input.replace(/(\D+)\:/g, '$1 ');
        input = input.replace(/([A-Z \-]{2,}) *(\d{2}\:\d{2} *\-{1} *\d{2}\:\d{2}) *(\d{2}\:\d{2} *\-{1} *\d{2}\:\d{2})/g, '$1$2$1$3');
        input = input.replace(/(\d{2}\:\d{2}) *(\d{2}\:\d{2})/g, '$1-$2');
        input = input.replace(/ */g, '');
        input = input.replace(/([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5$6$7');
        input = input.replace(/([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5$6');
        input = input.replace(/([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5');
        input = input.replace(/([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4');
        input = input.replace(/([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3');
        while (input.match(/[A-Z]{2}\-[A-Z]{2}/) !== null) {
            const tfDaysTemp = input.match(/([A-Z]{2})\-([A-Z]{2})/);
            if (!tfDaysTemp) break;
            const startDayIX = DAY_CODE_VECTOR.indexOf(tfDaysTemp[1]);
            let newDayCodeVec = [tfDaysTemp[1]];
            for (let dcvix = startDayIX + 1; dcvix < startDayIX + 7; dcvix++) {
                newDayCodeVec.push(DAY_CODE_VECTOR[dcvix]);
                if (tfDaysTemp[2] === DAY_CODE_VECTOR[dcvix]) break;
            }
            input = input.replace(/[A-Z]{2}\-[A-Z]{2}/, newDayCodeVec.join(''));
        }
        input = input.replace(/([A-Z])\-?\:?([0-9])/g, '$1|$2');
        input = input.replace(/([0-9])\-?\:?([A-Z])/g, '$1|$2');
        input = input.replace(/(\d{2}\:\d{2})\:00/g, '$1');
        const parts = input.split('|');
        const daysVec: string[] = [], hoursVec: string[] = [];
        for (const part of parts) {
            if (part[0]?.match(/[A-Z]/)) daysVec.push(part);
            else if (part[0]?.match(/[0-9]/)) hoursVec.push(part);
            else return [];
        }
        if (daysVec.length !== hoursVec.length) return [];
        // Combine days with the same hours
        const newDaysVec: string[] = [], newHoursVec: string[] = [];
        for (let i = 0; i < daysVec.length; i++) {
            if (hoursVec[i] !== '99:99-99:99') {
                const hrsIX = newHoursVec.indexOf(hoursVec[i]);
                if (hrsIX > -1) newDaysVec[hrsIX] = newDaysVec[hrsIX] + daysVec[i];
                else {
                    newDaysVec.push(daysVec[i]);
                    newHoursVec.push(hoursVec[i]);
                }
            }
        }
        const results: HoursParserResult[] = [];
        for (let i = 0; i < newDaysVec.length; i++) {
            const toFromSplit = newHoursVec[i].match(/(\d{2}\:\d{2})\-(\d{2}\:\d{2})/);
            if (!toFromSplit) continue;
            const days: number[] = [];
            if (newDaysVec[i].indexOf('MM') > -1) days.push(1);
            if (newDaysVec[i].indexOf('TT') > -1) days.push(2);
            if (newDaysVec[i].indexOf('WW') > -1) days.push(3);
            if (newDaysVec[i].indexOf('RR') > -1) days.push(4);
            if (newDaysVec[i].indexOf('FF') > -1) days.push(5);
            if (newDaysVec[i].indexOf('SS') > -1) days.push(6);
            if (newDaysVec[i].indexOf('UU') > -1) days.push(0);
            results.push({ days: days.sort(), fromHour: toFromSplit[1], toHour: toFromSplit[2] });
        }
        return results;
    }
}
