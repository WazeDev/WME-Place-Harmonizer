import type { WmeSDK } from 'wme-sdk-typings';

let sdkInstance: WmeSDK | null = null;

export function setSdk(sdk: WmeSDK): void {
    sdkInstance = sdk;
}

export function getSdk(): WmeSDK {
    if (!sdkInstance) {
        throw new Error('WME SDK was requested before it was initialized!');
    }
    return sdkInstance;
}