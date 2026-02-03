import type { OpeningHour } from 'wme-sdk-typings';
import { HoursParser, type HoursParserResult } from '../core/hoursParser';
import { logDebug } from '../core/logger';

/**
 * Parse textual opening hours and convert to SDK OpeningHour format.
 *
 * @param textualHours - Raw textual input (e.g., "Mon-Fri 9:00-17:00, Sat 10:00-14:00")
 * @returns Array of OpeningHour objects, or null if parsing fails
 */
export function parseAndFormatHours(textualHours: string): OpeningHour[] | null {
    try {
        const parsed = HoursParser.parse(textualHours);
        if (parsed.length === 0) {
            return null;
        }

        // Convert HoursParserResult[] to OpeningHour[] (structure is identical)
        return parsed.map((result: HoursParserResult) => ({
            days: result.days,
            fromHour: result.fromHour,
            toHour: result.toHour
        }));
    } catch (e) {
        logDebug('Hours parsing failed', { input: textualHours, error: e });
        return null;
    }
}
