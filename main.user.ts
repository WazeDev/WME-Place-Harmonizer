import { getSdk } from './src/sdk/bootstrap';
import { SCRIPT_ID, SCRIPT_NAME, IS_BETA_VERSION } from './src/core/config';
import i18n, { setLanguage } from './locales/i18n';
import { logDebug, logError, logInfo } from './src/core/logger';
import { handleSdkError } from './src/utils/errorHandler';
import { analyzeVenue } from './src/services/harmonizer';
import { applyAllChanges } from './src/services/venueUpdater';
import { renderReport, renderStatus } from './src/ui/resultPane';
import { addVenueMarker, clearVenueMarkers } from './src/services/mapHighlighter';
import { initHighlightingLayer } from './src/services/venueHighlighter';
import { initDuplicateLayer, onDuplicateLayerToggle } from './src/services/duplicateLayerRenderer';
import { lookupPnhData, initPnhCache } from './src/services/pnhFetcher';
import { initShortcuts } from './src/services/shortcutsManager';
import { buildSettingsPanel } from './src/ui/settingsPanel';
import { loadBrandExceptionsFromPnh } from './src/services/titleCaseFormatter';
import { initFilterHighlightingLayer } from './src/services/filterHighlighter';
import {
    injectEditPanel,
    removeEditPanel,
    updateBanner,
    createBannerRow,
    injectStyles
} from './src/ui/editPanelInjector';

// Wait for WME SDK to be initialized, then run our script
unsafeWindow.SDK_INITIALIZED.then(initScript);

async function initScript() {
    try {
        const sdk = getSdk(SCRIPT_ID, SCRIPT_NAME);
        const wmeLocale = (unsafeWindow as any)?.I18n?.locale;
        const sdkLocale = sdk?.Settings?.getLocale?.().localeCode
            ?? wmeLocale
            ?? (typeof navigator !== 'undefined' ? navigator.language : null);
        setLanguage(sdkLocale);
        logInfo(`SDK v${sdk.getSDKVersion()} on WME ${sdk.getWMEVersion()} initialized`);

        // Global error handler
        window.addEventListener('error', (event) => {
            if (event.filename?.includes('WME-Place-Harmonizer')) {
                handleSdkError(
                    {
                        operation: 'globalError',
                        details: {
                            message: event.message,
                            filename: event.filename,
                            lineno: event.lineno,
                            colno: event.colno,
                        },
                    },
                    event.error ?? new Error(event.message)
                );
            }
        });

        // Store SDK globally for access from UI components
        (window as any).wmephSDK = sdk;

        // Initialize PNH cache and seed title-case brand exceptions
        await initPnhCache();
        loadBrandExceptionsFromPnh();

        const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
        const versionSuffix = IS_BETA_VERSION ? '-β' : '';
        tabLabel.innerHTML = `<span title="WME Place Harmonizer">WMEPH${versionSuffix}</span>`;

        // Inject custom styles
        injectStyles();

        let currentVenueId: string | number | null = null;
        let currentReport: any = null;
        let contentDiv: HTMLDivElement;
        const OVERLAY_LAYER = 'wmeph_overlay';

        function updateStatus(message: string, status: 'idle' | 'loading' | 'success' | 'error' = 'idle') {
            contentDiv.innerHTML = '';
            contentDiv.appendChild(renderStatus(message, status));
        }

        async function onShortcutActivated(): Promise<void> {
            if (!currentVenueId) {
                const message = i18n.t('messages.noSelection');
                alert(message);
                updateStatus(message, 'error');
                return;
            }

            updateStatus(i18n.t('messages.analyzing'), 'loading');

            const report = await analyzeVenue(sdk, currentVenueId);
            currentReport = report;

            if (report.issues.some(issue => issue.field === 'venue')) {
                updateStatus(i18n.t('messages.notFound'), 'error');
                updateBanner(null);
                return;
            }

            // Check PNH for suggestions
            const pnhResult = lookupPnhData(report.venueName, report.countryCode);
            if (pnhResult.found && pnhResult.data) {
                logDebug('PNH data found', { venueName: report.venueName, source: pnhResult.source });
            }

            // Add marker to map
            addVenueMarker(sdk, OVERLAY_LAYER, report);

            // Build banner content for edit panel
            const bannerContent = document.createElement('div');

            // Map issue severity to banner colors (low/medium/high -> blue/yellow/red)
            const severityToColor = (severity: 'low' | 'medium' | 'high'): 'red' | 'yellow' | 'blue' => {
                switch (severity) {
                    case 'high': return 'red';
                    case 'medium': return 'yellow';
                    case 'low': return 'blue';
                }
            };

            // Add issues as banner rows
            report.issues.forEach(issue => {
                bannerContent.appendChild(createBannerRow(issue.message, severityToColor(issue.severity)));
            });

            // Add changes as banner rows
            report.changes.forEach(change => {
                bannerContent.appendChild(createBannerRow(
                    `${change.field}: ${change.reason}`,
                    'gray'
                ));
            });

            // Determine overall severity for banner background
            const overallSeverity = report.issues.some(i => i.severity === 'high') ? 'red' :
                report.issues.some(i => i.severity === 'medium') ? 'yellow' :
                    report.changes.length > 0 ? 'blue' : 'green';

            updateBanner(bannerContent, overallSeverity);

            // Render report in sidebar with apply callback
            contentDiv.innerHTML = '';
            const reportElement = renderReport(report, async () => {
                if (report.changes.length > 0) {
                    const result = await applyAllChanges(sdk, report);
                    if (result.success) {
                        updateStatus(i18n.t('messages.applied') + ` (${result.appliedCount})`, 'success');
                        updateBanner(null); // Clear banner after applying
                    } else {
                        updateStatus(i18n.t('messages.error', { message: result.errors.join('; ') }), 'error');
                    }
                }
            }, sdk);

            contentDiv.appendChild(reportElement);
        }

        const settingsPanel = buildSettingsPanel(sdk, async () => {
            updateStatus(i18n.t('messages.refreshingPnh'), 'loading');
            try {
                await initPnhCache({ force: true });
                loadBrandExceptionsFromPnh();
                updateStatus(i18n.t('messages.ready'), 'idle');
            } catch (error) {
                updateStatus(i18n.t('messages.error', { message: String(error) }), 'error');
            }
        }, onShortcutActivated);
        contentDiv = settingsPanel.querySelector('#wmeph-results') as HTMLDivElement;
        tabPane.appendChild(settingsPanel);

        initDuplicateLayer(sdk);
        const duplicateLayerCheckbox = settingsPanel.querySelector('#ShowDuplicates') as HTMLInputElement | null;
        if (duplicateLayerCheckbox) {
            duplicateLayerCheckbox.addEventListener('change', () => {
                onDuplicateLayerToggle(sdk, duplicateLayerCheckbox.checked);
            });
        }

        updateStatus(i18n.t('messages.ready'), 'idle');

        await initHighlightingLayer(sdk);
        initFilterHighlightingLayer(sdk);

        // Map overlay layer + checkbox
        sdk.Map.addLayer({
            layerName: OVERLAY_LAYER,
            styleRules: [
                {
                    predicate: (props: any) => props.completeness === 'green',
                    style: { strokeColor: '#27ae60', strokeWidth: 6, fillColor: '#27ae60', fillOpacity: 0.15 }
                },
                {
                    predicate: (props: any) => props.completeness === 'blue',
                    style: { strokeColor: '#3498db', strokeWidth: 6, fillColor: '#3498db', fillOpacity: 0.15 }
                },
                {
                    predicate: (props: any) => props.completeness === 'red',
                    style: { strokeColor: '#e74c3c', strokeWidth: 6, fillColor: '#e74c3c', fillOpacity: 0.15 }
                },
                { style: { strokeColor: '#95a5a6', strokeWidth: 4 } }
            ],
            zIndexing: false
        });

        const CHECKBOX_NAME = i18n.t('tabs.harmonize');
        sdk.LayerSwitcher.addLayerCheckbox({ name: CHECKBOX_NAME, isChecked: true });
        sdk.Events.on({
            eventName: 'wme-layer-checkbox-toggled',
            eventHandler: ({ name, checked }) => {
                if (name === CHECKBOX_NAME) {
                    sdk.Map.setLayerVisibility({ layerName: OVERLAY_LAYER, visibility: checked });
                }
            }
        });

        // Selection tracking
        sdk.Events.on({
            eventName: 'wme-selection-changed',
            eventHandler: () => {
                const sel = sdk.Editing.getSelection();
                if (!sel || sel.objectType !== 'venue') {
                    currentVenueId = null;
                    clearVenueMarkers(sdk, OVERLAY_LAYER); // Clear markers when deselecting
                    removeEditPanel(); // Remove edit panel when deselecting
                    updateStatus(i18n.t('messages.ready'), 'idle');
                    return;
                }
                // Clear old markers before analyzing new venue
                clearVenueMarkers(sdk, OVERLAY_LAYER);
                currentVenueId = sel.ids[0];
                logDebug('Venue selected', { venueId: currentVenueId });

                // Inject edit panel with Run button
                // Small delay to ensure WME's edit panel is rendered
                setTimeout(() => {
                    if (currentVenueId) {
                        injectEditPanel({
                            sdk,
                            venueId: currentVenueId,
                            onRunClick: onShortcutActivated
                        });
                    }
                }, 100);
            }
        });

        initShortcuts(sdk, onShortcutActivated, i18n.t('shortcuts.description'));

        logDebug('Initialization complete: sidebar, overlay, shortcuts, PNH cache, map highlighter wired');
    } catch (error) {
        logError('Initialization failed', error);
    }
}
