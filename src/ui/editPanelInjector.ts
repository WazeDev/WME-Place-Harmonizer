/**
 * Edit Panel Injector
 * Injects the WMEPH control panel into WME's edit panel when a venue is selected.
 * This mimics the legacy behavior of adding Run/Search buttons directly in the edit panel.
 */

import type { WmeSDK, VenueCategoryId } from 'wme-sdk-typings';
import { IS_BETA_VERSION } from '../core/config';
import { searchVenueOnWeb, openPlugShare, openVenueUrl } from '../services/webSearch';
import { logDebug } from '../core/logger';
import i18n from '../../locales/i18n';

const PANEL_ID = 'wmeph-panel';
const BANNER_ID = 'WMEPH_banner';

export interface EditPanelOptions {
    sdk: WmeSDK;
    venueId: string | number;
    onRunClick: () => void;
}

/**
 * Inject or update the WMEPH panel in WME's edit panel.
 */
export function injectEditPanel(options: EditPanelOptions): void {
    const { sdk, venueId, onRunClick } = options;

    const editPanelContents = document.querySelector('#edit-panel .place .content, #edit-panel > .contents');
    if (!editPanelContents) {
        logDebug('Edit panel contents not found, skipping injection');
        return;
    }

    // Remove existing panel if any
    removeEditPanel();

    const venue = sdk.DataModel.Venues.getById({ venueId: String(venueId) });
    if (!venue) {
        logDebug('Venue not found for injection', { venueId });
        return;
    }

    // Create panel structure
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = 'margin-bottom: 8px;';

    // Banner container (for results)
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    panel.appendChild(banner);

    // Insert at the beginning of the edit panel
    editPanelContents.insertBefore(panel, editPanelContents.firstChild);

    const categories = venue.categories ?? [];
    const isResidential = categories.some(cat =>
        cat === 'RESIDENCE' as VenueCategoryId ||
        cat === 'RESIDENCE_HOME' as VenueCategoryId
    );
    const isChargingStation = categories.some(cat =>
        cat === 'CHARGING_STATION' as VenueCategoryId ||
        cat === 'EV_CHARGING_STATION' as VenueCategoryId
    );

    insertInlineButtons({ sdk, venueId, onRunClick, isResidential, venueUrl: venue.url ?? '', isChargingStation });

    logDebug('Edit panel injected', { venueId });
}

/**
 * Remove the WMEPH panel from the edit panel.
 */
export function removeEditPanel(): void {
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
        panel.remove();
        logDebug('Edit panel removed');
    }
}

/**
 * Update the banner content with harmonization results.
 */
export function updateBanner(content: HTMLElement | null, severity: 'green' | 'blue' | 'yellow' | 'orange' | 'red' = 'green'): void {
    const banner = document.getElementById(BANNER_ID);
    if (!banner) {
        logDebug('Banner element not found');
        return;
    }

    banner.innerHTML = '';

    const colorMap: Record<string, string> = {
        green: 'rgb(36, 172, 36)',
        blue: 'rgb(50, 50, 230)',
        yellow: 'rgb(217, 173, 42)',
        orange: 'rgb(255, 127, 0)',
        red: 'rgb(211, 48, 48)'
    };

    banner.style.backgroundColor = colorMap[severity];
    banner.style.padding = content ? '8px' : '0';
    banner.style.marginTop = content ? '8px' : '0';
    banner.style.borderRadius = '3px';

    if (content) {
        banner.appendChild(content);
    }
}

/**
 * Create a banner row element.
 */
export function createBannerRow(
    message: string,
    severity: 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'gray' = 'gray',
    options?: {
        buttonText?: string;
        buttonAction?: () => void;
        wlAction?: () => void;
    }
): HTMLElement {
    const row = document.createElement('div');
    row.className = `banner-row ${severity}`;
    row.style.cssText = 'padding: 4px 8px; margin: 2px 0; border-radius: 2px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;';

    const colorMap: Record<string, string> = {
        green: '#d4edda',
        blue: '#cce5ff',
        yellow: '#fff3cd',
        orange: '#ffe5cc',
        red: '#f8d7da',
        gray: '#e9ecef'
    };
    row.style.backgroundColor = colorMap[severity];

    const messageSpan = document.createElement('span');
    messageSpan.innerHTML = `&bull; ${message}`;
    messageSpan.style.marginRight = '4px';
    row.appendChild(messageSpan);

    if (options?.buttonText && options?.buttonAction) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-default btn-xs';
        btn.textContent = options.buttonText;
        btn.onclick = options.buttonAction;
        row.appendChild(btn);
    }

    if (options?.wlAction) {
        const wlBtn = document.createElement('button');
        wlBtn.className = 'btn btn-success btn-xs';
        wlBtn.textContent = i18n.t('banner.whitelistLabel');
        wlBtn.title = i18n.t('banner.addToWhitelist');
        wlBtn.onclick = options.wlAction;
        row.appendChild(wlBtn);
    }

    return row;
}

/**
 * Inject CSS styles for the edit panel.
 */
export function injectStyles(): void {
    if (document.getElementById('wmeph-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'wmeph-styles';
    style.textContent = `
        #${PANEL_ID} {
            font-family: inherit;
            font-size: 13px;
        }
        #${BANNER_ID} {
            transition: background-color 0.2s;
        }
        #${BANNER_ID} .banner-row {
            color: #333;
        }
        #${BANNER_ID} .banner-row .btn {
            font-size: 11px;
            padding: 2px 6px;
        }
        .p0 {
            padding: 0 !important;
        }
        .sub-tab-content .tab-pane {
            width: 100% !important;
        }
        .wmeph-setting-checkbox{
            display: flex;
            align-items: flex-start;
            flex-direction: row;
            justify-content: flex-start;
        }
        .d-flex { display: flex !important; }
        .flex-column { flex-direction: column !important; }
        .flex-row { flex-direction: row !important; }
        .flex-gap-4 { gap: 4px !important; }
        .flex-wrap { flex-wrap: wrap !important; }
        .flex-row-gap-4 { row-gap: 4px !important; }
        .wmeph-inline-link { margin: 4px 0 8px; }
    `;
    document.head.appendChild(style);
}

type WzButtonElement = HTMLElement & { disabled?: boolean };

function createWzButton(options: {
    label?: string;
    labelHtml?: string;
    color?: string;
    size?: string;
    title?: string;
    onClick: () => void | Promise<void>;
}): WzButtonElement {
    const btn = document.createElement('wz-button') as WzButtonElement;
    btn.setAttribute('color', options.color ?? 'secondary');
    btn.setAttribute('size', options.size ?? 'sm');
    btn.setAttribute('type', 'button');
    if (options.labelHtml) {
        btn.innerHTML = options.labelHtml;
    } else if (options.label) {
        btn.textContent = options.label;
    }
    if (options.title) {
        btn.setAttribute('title', options.title);
    }

    let handling = false;
    const handle = () => {
        if (handling) return;
        handling = true;
        Promise.resolve(options.onClick()).finally(() => {
            handling = false;
        });
    };

    btn.addEventListener('click', () => handle());
    return btn;
}

function setButtonDisabled(btn: WzButtonElement, disabled: boolean): void {
    if (disabled) {
        btn.setAttribute('disabled', 'true');
    } else {
        btn.removeAttribute('disabled');
    }
}

function addHttpsPrefix(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

function insertInlineButtons(options: {
    sdk: WmeSDK;
    venueId: string | number;
    onRunClick: () => void | Promise<void>;
    isResidential: boolean;
    venueUrl: string;
    isChargingStation: boolean;
}): void {
    const { sdk, venueId, onRunClick, isResidential, venueUrl, isChargingStation } = options;
    const editPanelContents = document.querySelector('#edit-panel .place .content, #edit-panel > .contents');
    if (!editPanelContents) return;

    const addressSection = editPanelContents.querySelector('.address-edit, .address-edit-view');
    const anchor = (addressSection && (addressSection.closest('.form-group') as HTMLElement | null)) || addressSection;
    if (!anchor || !anchor.parentElement) {
        logDebug('Address section not found for inline buttons');
        return;
    }

    if (anchor.previousElementSibling && anchor.previousElementSibling.classList.contains('wmeph-inline-actions')) {
        return; // already injected
    }

    const container = document.createElement('div');
    container.className = 'form-group wmeph-inline-actions';
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = "d-flex flex-row flex-gap-4 flex-wrap";

    const label = document.createElement('wz-label');
    label.textContent = i18n.t('editPanel.inlineLabel');
    container.appendChild(label);
    container.appendChild(buttonsWrapper);

    const versionSuffix = IS_BETA_VERSION ? '-β' : '';
    const runBtn = createWzButton({
        labelHtml: `<i class="w-icon w-icon-checkmark"></i> ${i18n.t('buttons.runWmeph')}${versionSuffix}`,
        color: 'primary',
        size: 'sm',
        onClick: () => {
            setButtonDisabled(runBtn, true);
            Promise.resolve(onRunClick()).finally(() => setButtonDisabled(runBtn, false));
        }
    });
    runBtn.setAttribute('title', i18n.t('editPanel.runTitle', { version: versionSuffix }));
    buttonsWrapper.appendChild(runBtn);

    if (!isResidential) {
        const googleBtn = createWzButton({
            labelHtml: `<i class="w-icon w-icon-2x w-icon-google-fill"></i>`,
            color: 'secondary',
            size: 'sm',
            onClick: () => searchVenueOnWeb(sdk, venueId)
        });
        googleBtn.setAttribute('title', i18n.t('editPanel.googleTitle'));
        buttonsWrapper.appendChild(googleBtn);
    }

    if (isChargingStation) {
        const plugShareBtn = createWzButton({
            labelHtml: `<i class="w-icon w-icon-search"></i> ${i18n.t('editPanel.plugShare')}`,
            color: 'secondary',
            size: 'sm',
            onClick: () => openPlugShare(sdk, venueId)
        });
        plugShareBtn.setAttribute('title', i18n.t('editPanel.plugShareTitle'));
        buttonsWrapper.appendChild(plugShareBtn);
    }

    anchor.parentElement.insertBefore(container, anchor);

    if (venueUrl && venueUrl.trim()) {
        const linkWrapper = document.createElement('div');
        linkWrapper.className = 'wmeph-inline-link';
        const siteBtn = createWzButton({
            labelHtml: `<i class="w-icon w-icon-1x w-icon-link"></i> ${i18n.t('editPanel.websiteLink')}`,
            color: 'text',
            size: 'sm',
            onClick: () => openVenueUrl(venueUrl)
        });
        siteBtn.setAttribute('title', i18n.t('editPanel.websiteTitle'));
        linkWrapper.appendChild(siteBtn);
        anchor.parentElement.insertBefore(linkWrapper, anchor);
    }
}
