import type { WmeSDK } from 'wme-sdk-typings';

const READY_EVENT = 'wme-ready';

/**
 * Get the SDK instance. Call this ONLY after SDK_INITIALIZED has resolved.
 */
export function getSdk(scriptId: string, scriptName: string): WmeSDK {
    if (!unsafeWindow.getWmeSdk) {
        throw new Error('SDK not available');
    }
    return unsafeWindow.getWmeSdk({ scriptId, scriptName });
}

/**
 * Wait for WME to be fully ready (data loaded, user logged in).
 */
export async function waitForWmeReady(sdk: WmeSDK): Promise<void> {
    await sdk.Events.once({ eventName: READY_EVENT });
}
