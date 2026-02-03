export interface ErrorContext {
    operation: string;
    details?: Record<string, unknown>;
    venueId?: string;
    fatal?: boolean;
}

export class SdkError extends Error {
    constructor(
        public context: ErrorContext,
        public originalError: Error
    ) {
        super(`SDK Error in ${context.operation}: ${originalError.message}`);
        this.name = 'SdkError';
    }
}

export function handleSdkError(context: ErrorContext, error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const sdkError = new SdkError(context, err);

    // Log to console
    console.error('[WME Place Harmonizer] SDK Error:', {
        operation: context.operation,
        details: context.details,
        venueId: context.venueId,
        error: err.message,
        stack: err.stack,
    });

    // Show user message if fatal
    if (context.fatal) {
        alert(i18n.t('errors.operationFailed', { operation: context.operation }));
    }
}

export async function withErrorBoundary<T>(
    context: ErrorContext,
    fn: () => T | Promise<T>
): Promise<T | null> {
    try {
        return await fn();
    } catch (error) {
        handleSdkError(context, error);
        return null;
    }
}
import i18n from '../../locales/i18n';
