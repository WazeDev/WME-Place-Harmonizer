import type { WmeSDK } from 'wme-sdk-typings';
import i18n from '../../locales/i18n';
import { logDebug } from '../core/logger';
import type { HarmonizationReport } from '../services/harmonizer';
import type { HarmonizationChange } from '../core/types';
import { searchVenueOnWeb, openVenueUrl } from '../services/webSearch';

/**
 * Display error message to user in the results pane.
 */
export function showError(message: string): void {
    const container = document.getElementById('wmeph-results');
    if (!container) {
        return;
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.style.marginTop = '10px';

    const strong = document.createElement('strong');
    strong.textContent = `${i18n.t('errors.label')} `;
    errorDiv.appendChild(strong);

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    errorDiv.appendChild(messageSpan);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'close';
    closeBtn.onclick = () => errorDiv.remove();
    const closeIcon = document.createElement('span');
    closeIcon.innerHTML = '&times;';
    closeBtn.appendChild(closeIcon);
    errorDiv.appendChild(closeBtn);

    container.insertBefore(errorDiv, container.firstChild);
}

/**
 * Render harmonization report as HTML in the sidebar pane.
 */
export function renderReport(
    report: HarmonizationReport,
    onApply: () => void,
    sdk?: WmeSDK
): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'padding:8px;font-family:monospace;font-size:12px;line-height:1.5';

    // Header with completeness indicator
    const colorMap: Record<string, string> = {
        red: '#e74c3c',
        blue: '#3498db',
        green: '#27ae60'
    };
    const color = colorMap[report.completeness];

    const header = document.createElement('div');
    header.style.cssText = `margin-bottom:8px;padding:6px;background:${color}33;border-left:3px solid ${color}`;
    header.innerHTML = `<strong>${report.venueName}</strong> (${report.completeness.toUpperCase()})`;
    container.appendChild(header);

    // Action buttons (Web Search and Open URL)
    const hideServicesButtons = localStorage.getItem('HideServicesButtons') === '1';
    if (!hideServicesButtons && sdk) {
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap';

        const webSearchBtn = createWzButton({
            label: i18n.t('buttons.webSearch'),
            color: 'secondary',
            size: 'sm',
            onClick: () => searchVenueOnWeb(sdk, report.venueId),
        });
        webSearchBtn.setAttribute('title', i18n.t('webSearch.tooltip'));
        buttonRow.appendChild(webSearchBtn);

        // Open URL button (if venue has URL)
        const venue = sdk.DataModel.Venues.getById({ venueId: String(report.venueId) });
        if (venue && venue.url) {
            const urlBtn = createWzButton({
                label: i18n.t('webSearch.openUrl'),
                color: 'secondary',
                size: 'sm',
                onClick: () => openVenueUrl(venue.url),
            });
            urlBtn.setAttribute('title', i18n.t('webSearch.urlTooltip'));
            buttonRow.appendChild(urlBtn);
        }

        container.appendChild(buttonRow);
    }

    // Changes section
    if (report.changes.length > 0) {
        const changesDiv = document.createElement('div');
        changesDiv.style.cssText = 'margin-bottom:8px;padding:6px;background:#f5f5f5;border-radius:3px';

        const changesTitle = document.createElement('strong');
        changesTitle.textContent = i18n.t('report.changes');
        changesDiv.appendChild(changesTitle);

        const list = document.createElement('ul');
        list.style.cssText = 'margin:4px 0;padding-left:18px';

        const formatValue = (value: any) => {
            if (Array.isArray(value)) return value.join(', ');
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        };

        report.changes.forEach((change: HarmonizationChange) => {
            const li = document.createElement('li');
            li.innerHTML = `<code>${change.field}</code>: ${change.reason}<br/><small>${formatValue(change.oldValue)} → ${formatValue(change.newValue)}</small>`;
            list.appendChild(li);
        });

        changesDiv.appendChild(list);

        // Apply button
        const applyBtn = createWzButton({
            label: i18n.t('buttons.apply'),
            color: 'primary',
            size: 'sm',
            onClick: () => {
                onApply();
                setButtonDisabled(applyBtn, true);
                applyBtn.textContent = i18n.t('report.applied');
            }
        });
        applyBtn.style.marginTop = '4px';

        changesDiv.appendChild(applyBtn);
        container.appendChild(changesDiv);
    }

    // Issues section
    if (report.issues.length > 0) {
        const issuesDiv = document.createElement('div');
        issuesDiv.style.cssText = 'padding:6px;background:#fff3cd;border-radius:3px';

        const issuesTitle = document.createElement('strong');
        issuesTitle.textContent = i18n.t('report.issues');
        issuesDiv.appendChild(issuesTitle);

        const list = document.createElement('ul');
        list.style.cssText = 'margin:4px 0;padding-left:18px';

        report.issues.forEach(issue => {
            const li = document.createElement('li');
            li.textContent = issue.message;
            list.appendChild(li);
        });

        issuesDiv.appendChild(list);
        container.appendChild(issuesDiv);
    }

    logDebug('Rendered harmonization report', report);
    return container;
}

/**
 * Render a simple loading/idle state in the sidebar pane.
 */
export function renderStatus(message: string, status: 'idle' | 'loading' | 'success' | 'error'): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'padding:8px;font-family:inherit';

    const statusMap = {
        idle: '#95a5a6',
        loading: '#f39c12',
        success: '#27ae60',
        error: '#e74c3c'
    };

    container.style.color = statusMap[status];
    container.style.fontWeight = status === 'idle' ? 'normal' : 'bold';
    container.textContent = message;

    return container;
}

type WzButtonElement = HTMLElement & { disabled?: boolean };

function createWzButton(options: {
    label: string;
    color?: string;
    size?: string;
    onClick: () => void | Promise<void>;
}): WzButtonElement {
    const btn = document.createElement('wz-button') as WzButtonElement;
    btn.setAttribute('color', options.color ?? 'secondary');
    btn.setAttribute('size', options.size ?? 'sm');
    btn.setAttribute('type', 'button');
    btn.textContent = options.label;

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
