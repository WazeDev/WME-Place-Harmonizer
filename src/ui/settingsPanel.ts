import {
    getWhitelistStats,
    mergeWhitelist,
    pullWhitelist,
    removeWhitelistByState,
    saveSettings,
    shareWhitelist,
    type UserSettings
} from '../services/storageService';
import { getStoredModerators } from '../services/pnhFetcher';
import { URLS } from '../core/config';
import i18n from '../../locales/i18n';
import type { WmeSDK } from 'wme-sdk-typings';
import { onHighlightingSettingChange, onHighlightingToggle } from '../services/venueHighlighter';
import {
    DEFAULT_FILTER_SERVICE_TYPE,
    FILTER_SERVICE_TYPES,
    onFilterHighlightToggle,
    onFilterServiceTypeChange
} from '../services/filterHighlighter';
import { getShortcutLetter, updateShortcutLetter } from '../services/shortcutsManager';

/**
 * Build and return the settings panel HTML element.
 * Wires all checkboxes to localStorage persistence.
 */
export function buildSettingsPanel(
    sdk: WmeSDK,
    onRefreshData: () => void,
    onShortcutActivate: () => void
): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'font-family:inherit; font-size:13px';

    const navTabs = document.createElement('ul');
    navTabs.className = 'nav nav-tabs';
    navTabs.style.cssText = 'margin-bottom:12px';

    const tabs = [
        { id: 'harmonize', label: i18n.t('tabs.harmonize') },
        { id: 'highlighter', label: i18n.t('tabs.highlight') },
        { id: 'whitelist', label: i18n.t('tabs.whitelist') },
        { id: 'moderators', label: i18n.t('tabs.moderators') }
    ];

    tabs.forEach((tab, idx) => {
        const li = document.createElement('li');
        li.className = idx === 0 ? 'active' : '';
        const link = document.createElement('a');
        link.href = `#${tab.id}-pane`;
        link.setAttribute('data-toggle', 'tab');
        link.textContent = tab.label;
        li.appendChild(link);
        navTabs.appendChild(li);
    });

    container.appendChild(navTabs);

    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content sub-tab-content';

    const harmonizerPane = createHarmonizeTab(sdk, onRefreshData, onShortcutActivate);
    harmonizerPane.id = 'harmonize-pane';
    harmonizerPane.className = 'tab-pane active show p0 d-flex flex-column';
    tabContent.appendChild(harmonizerPane);

    const highlighterPane = createHighlighterTab(sdk);
    highlighterPane.id = 'highlighter-pane';
    highlighterPane.className = 'tab-pane';
    tabContent.appendChild(highlighterPane);

    const whitelistPane = createWhitelistTab();
    whitelistPane.id = 'whitelist-pane';
    whitelistPane.className = 'tab-pane';
    tabContent.appendChild(whitelistPane);

    const moderatorsPane = createModeratorsTab();
    moderatorsPane.id = 'moderators-pane';
    moderatorsPane.className = 'tab-pane';
    tabContent.appendChild(moderatorsPane);

    container.appendChild(tabContent);
    wireTabs(navTabs, tabContent);

    return container;
}

function wireTabs(navTabs: HTMLUListElement, tabContent: HTMLDivElement): void {
    navTabs.addEventListener('click', event => {
        const target = event.target as HTMLElement | null;
        const link = target?.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;

        event.preventDefault();
        const paneId = href.slice(1);

        navTabs.querySelectorAll('li').forEach(li => {
            li.classList.toggle('active', li.contains(link));
        });
        tabContent.querySelectorAll<HTMLElement>('.tab-pane').forEach(pane => {
            const isActive = pane.id === paneId;
            pane.classList.toggle('active', isActive);
            pane.classList.toggle('show', isActive);
        });
    });
}

function createHarmonizeTab(sdk: WmeSDK, onRefreshData: () => void, onShortcutActivate: () => void): HTMLElement {
    const div = document.createElement('div');

    // Run WMEPH button in sidebar
    const runBtn = createWzButton({
        label: i18n.t('buttons.runWmeph'),
        color: 'primary',
        size: 'sm',
        fullWidth: true,
        onClick: () => {
            setButtonDisabled(runBtn, true);
            Promise.resolve(onShortcutActivate()).finally(() => {
                setButtonDisabled(runBtn, false);
            });
        }
    });
    runBtn.style.marginBottom = '8px';
    div.appendChild(runBtn);

    const refreshBtn = createWzButton({
        label: i18n.t('buttons.refreshData'),
        color: 'secondary',
        size: 'sm',
        fullWidth: true,
        onClick: () => {
            setButtonDisabled(refreshBtn, true);
            Promise.resolve(onRefreshData()).finally(() => {
                setButtonDisabled(refreshBtn, false);
            });
        }
    });
    refreshBtn.style.marginBottom = '12px';
    div.appendChild(refreshBtn);

    const settings = [
        { id: 'WebSearchNewTab', label: i18n.t('settings.webSearchNewTab') },
        { id: 'DisablePhoneValidation', label: i18n.t('settings.disablePhoneValidation') },
        { id: 'DisableTitleCase', label: i18n.t('settings.disableTitleCase') },
        { id: 'DisableDFZoom', label: i18n.t('settings.disableDfZoom') },
        { id: 'ShowDuplicates', label: i18n.t('settings.showDuplicates') },
        { id: 'EnableIAZoom', label: i18n.t('settings.enableIaZoom') },
        { id: 'EnableAddressInference', label: i18n.t('settings.enableAddressInference') },
        { id: 'HidePlacesWiki', label: i18n.t('settings.hidePlacesWiki') },
        { id: 'HideReportError', label: i18n.t('settings.hideReportError') },
        { id: 'HideServicesButtons', label: i18n.t('settings.hideServicesButtons') },
        { id: 'HidePURWebSearch', label: i18n.t('settings.hidePurWebSearch') },
        { id: 'ExcludePLADupes', label: i18n.t('settings.excludePlaDupes') },
        { id: 'ShowPLAExitWhileClosed', label: i18n.t('settings.showPlaExitWhileClosed') },
        // Legacy settings restored
        { id: 'WMEPH-AddAddresses', label: i18n.t('settings.addAddresses') },
        { id: 'WMEPH-EnableCloneMode', label: i18n.t('settings.enableCloneMode') },
        { id: 'WMEPH-AutoLockRPPs', label: i18n.t('settings.autoLockRpps') },
        { id: 'WMEPH-RegionOverride', label: i18n.t('settings.disableRegionOverride') }
    ];

    settings.forEach(setting => {
        const label = createCheckboxLabel(setting.id, setting.label);
        div.appendChild(label);
    });

    div.appendChild(document.createElement('hr'));

    const kbDiv = document.createElement('div');
    kbDiv.style.marginBottom = '8px';

    const kbTitle = document.createElement('strong');
    kbTitle.textContent = i18n.t('keyboard.title');
    kbDiv.appendChild(kbTitle);

    const kbLabel = document.createElement('p');
    kbLabel.style.cssText = 'font-size:12px;margin:4px 0';
    kbLabel.textContent = `${i18n.t('keyboard.shortcutLabel')} `;
    const kbInput = document.createElement('input');
    kbInput.type = 'text';
    kbInput.id = 'WMEPH-KeyboardShortcut';
    kbInput.maxLength = 1;
    kbInput.style.cssText = 'width:30px;padding:4px;text-transform:uppercase';
    kbInput.title = i18n.t('keyboard.inputTitle');
    kbLabel.appendChild(kbInput);
    kbDiv.appendChild(kbLabel);

    const kbCurrent = document.createElement('div');
    kbCurrent.id = 'WMEPH-KBCurrent';
    kbCurrent.style.cssText = 'font-size:12px;color:#666';
    kbDiv.appendChild(kbCurrent);

    const kbFormat = document.createElement('p');
    kbFormat.style.cssText = 'font-size:11px;margin-top:4px;color:#999';
    kbFormat.textContent = i18n.t('keyboard.format');
    kbDiv.appendChild(kbFormat);

    div.appendChild(kbDiv);

    if (kbInput && kbCurrent) {
        const storedShortcut = getShortcutLetter();
        kbInput.value = storedShortcut;
        kbCurrent.textContent = i18n.t('keyboard.current', { shortcut: storedShortcut });

        kbInput.onchange = () => {
            const updated = updateShortcutLetter(sdk, kbInput.value, onShortcutActivate, i18n.t('shortcuts.description'));
            const displayLetter = updated ?? getShortcutLetter();
            kbInput.value = displayLetter;
            kbCurrent.textContent = i18n.t('keyboard.current', { shortcut: displayLetter });
        };
    }

    const linksDiv = document.createElement('div');
    linksDiv.style.cssText = 'margin-top:12px;font-size:13px';
    const wikiLink = document.createElement('div');
    wikiLink.innerHTML = `<a href="${URLS.placesWiki}" target="_blank" rel="noopener noreferrer">${i18n.t('links.placesWiki')}</a>`;
    const forumLink = document.createElement('div');
    forumLink.innerHTML = `<a href="${URLS.forum}" target="_blank" rel="noopener noreferrer">${i18n.t('links.forum')}</a>`;
    linksDiv.appendChild(wikiLink);
    linksDiv.appendChild(forumLink);
    div.appendChild(linksDiv);

    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'wmeph-results';
    resultsDiv.style.cssText = 'margin-top:12px';
    div.appendChild(resultsDiv);

    return div;
}

function createHighlighterTab(sdk: WmeSDK): HTMLElement {
    const div = document.createElement('div');

    const title = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = i18n.t('highlighter.title');
    title.appendChild(strong);
    div.appendChild(title);

    const settings = [
        { id: 'ColorHighlighting', label: i18n.t('highlighter.colorHighlighting'), isToggle: true },
        { id: 'DisableHoursHL', label: i18n.t('highlighter.disableHours') },
        { id: 'DisableRankHL', label: i18n.t('highlighter.disableRank') },
        { id: 'DisableWLHL', label: i18n.t('highlighter.disableWhitelist') },
        { id: 'PLATypeFill', label: i18n.t('highlighter.plaTypeFill') },
        { id: 'ShowFilterHighlight', label: i18n.t('filterHighlight.checkbox') }
    ];

    settings.forEach(setting => {
        const label = createCheckboxLabelWithCallback(setting.id, setting.label, sdk, setting.isToggle ?? false);
        div.appendChild(label);
    });

    const filterDiv = document.createElement('div');
    filterDiv.style.cssText = 'margin:12px 0;padding:8px;border:1px solid #ccc;background:#f9f9f9';

    const filterTitle = document.createElement('div');
    filterTitle.style.cssText = 'margin-bottom:6px;font-weight:bold';
    filterTitle.textContent = i18n.t('filterHighlight.title');
    filterDiv.appendChild(filterTitle);

    const serviceSelect = document.createElement('select');
    serviceSelect.id = 'WMEPH-FilterServiceType';
    serviceSelect.style.cssText = 'width:100%;padding:4px';

    const savedServiceType = localStorage.getItem('FilterServiceType') ?? DEFAULT_FILTER_SERVICE_TYPE;

    FILTER_SERVICE_TYPES.forEach(serviceType => {
        const option = document.createElement('option');
        option.value = serviceType;
        option.textContent = i18n.t(`filterHighlight.services.${serviceType}`);
        serviceSelect.appendChild(option);
    });

    serviceSelect.value = FILTER_SERVICE_TYPES.includes(savedServiceType as typeof FILTER_SERVICE_TYPES[number])
        ? savedServiceType
        : DEFAULT_FILTER_SERVICE_TYPE;

    serviceSelect.addEventListener('change', () => {
        onFilterServiceTypeChange(sdk, serviceSelect.value);
    });

    filterDiv.appendChild(serviceSelect);
    div.appendChild(filterDiv);

    return div;
}

function createWhitelistTab(): HTMLElement {
    const div = document.createElement('div');

    const inputGroup = document.createElement('div');
    inputGroup.style.marginBottom = '12px';

    const label = document.createElement('label');
    label.style.fontWeight = 'bold';
    label.textContent = i18n.t('whitelist.label');
    inputGroup.appendChild(label);

    const wlInput = document.createElement('textarea');
    wlInput.id = 'WMEPH-WLInput';
    wlInput.style.cssText = 'width:100%;height:60px;padding:4px;font-family:monospace;font-size:11px';
    wlInput.placeholder = i18n.t('whitelist.placeholder');
    wlInput.onclick = () => wlInput.select();
    inputGroup.appendChild(wlInput);

    const topRow = document.createElement('div');
    topRow.style.margin = '8px 0';
    topRow.style.display = 'flex';
    topRow.style.flexWrap = 'wrap';
    topRow.style.gap = '6px';

    const mergeBtn = createWzButton({
        label: i18n.t('whitelist.merge'),
        color: 'primary',
        size: 'sm',
        onClick: () => handleMerge()
    });
    mergeBtn.setAttribute('title', i18n.t('whitelist.mergeTitle'));

    const pullBtn = createWzButton({
        label: i18n.t('whitelist.pull'),
        color: 'secondary',
        size: 'sm',
        onClick: () => handlePull()
    });
    pullBtn.setAttribute('title', i18n.t('whitelist.pullTitle'));

    const shareBtn = createWzButton({
        label: i18n.t('whitelist.share'),
        color: 'secondary',
        size: 'sm',
        onClick: () => handleShare()
    });
    shareBtn.setAttribute('title', i18n.t('whitelist.shareTitle'));

    topRow.appendChild(mergeBtn);
    topRow.appendChild(pullBtn);
    topRow.appendChild(shareBtn);
    inputGroup.appendChild(topRow);

    const bottomRow = document.createElement('div');
    bottomRow.style.display = 'flex';
    bottomRow.style.flexWrap = 'wrap';
    bottomRow.style.gap = '6px';

    const statsBtn = createWzButton({
        label: i18n.t('whitelist.stats'),
        color: 'secondary',
        size: 'sm',
        onClick: () => handleStats()
    });
    statsBtn.setAttribute('title', i18n.t('whitelist.statsTooltip'));

    const stateFilterBtn = createWzButton({
        label: i18n.t('whitelist.stateFilter'),
        color: 'secondary',
        size: 'sm',
        onClick: () => handleStateFilter()
    });
    stateFilterBtn.setAttribute('title', i18n.t('whitelist.stateFilterTooltip'));

    bottomRow.appendChild(statsBtn);
    bottomRow.appendChild(stateFilterBtn);
    inputGroup.appendChild(bottomRow);

    div.appendChild(inputGroup);

    const wlMsg = document.createElement('div');
    wlMsg.id = 'WMEPH-WLToolsMsg';
    wlMsg.style.cssText = 'margin-top:10px;font-size:12px;color:#666';
    div.appendChild(wlMsg);

    const setMessage = (message: string, color: string): void => {
        wlMsg.textContent = message;
        wlMsg.style.color = color;
    };

    const clearMessage = (): void => {
        wlMsg.textContent = '';
    };

    const handleMerge = (): void => {
        clearMessage();
        const result = mergeWhitelist(wlInput.value.trim());
        if (result.success) {
            setMessage(
                i18n.t('whitelist.mergeSuccess', { count: result.mergedCount, total: result.totalCount }),
                '#4CAF50'
            );
            wlInput.value = '';
        } else {
            setMessage(result.message || i18n.t('whitelist.mergeError'), '#F44336');
        }
    };

    const handlePull = (): void => {
        const wlString = pullWhitelist();
        wlInput.value = wlString;
        wlInput.select();
        setMessage(i18n.t('whitelist.pullSuccess'), '#2196F3');
    };

    const handleShare = async (): Promise<void> => {
        setMessage(i18n.t('whitelist.shareInProgress'), '#FF9800');
        const result = await shareWhitelist();
        if (result.success) {
            setMessage(i18n.t('whitelist.shareSuccess'), '#4CAF50');
        } else {
            setMessage(result.message || i18n.t('whitelist.shareError'), '#F44336');
        }
    };

    const handleStats = (): void => {
        const stats = getWhitelistStats();
        const entries = Object.entries(stats).sort(([a], [b]) => a.localeCompare(b));
        wlMsg.innerHTML = '';
        wlMsg.style.color = '#333';

        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.textContent = i18n.t('whitelist.statsTitle');
        wlMsg.appendChild(title);

        entries.forEach(([state, count]) => {
            const row = document.createElement('div');
            row.textContent = `${state}: ${count}`;
            wlMsg.appendChild(row);
        });
    };

    const handleStateFilter = (): void => {
        const stateAbbr = prompt(i18n.t('whitelist.stateFilterPrompt'));
        if (!stateAbbr || stateAbbr.trim().length !== 2) {
            setMessage(i18n.t('whitelist.stateFilterInvalid'), '#F44336');
            return;
        }

        const normalized = stateAbbr.trim().toUpperCase();
        const confirmRemove = window.confirm(i18n.t('whitelist.stateFilterConfirm', { state: normalized }));
        if (!confirmRemove) return;

        const result = removeWhitelistByState(normalized);
        if (!result.success) {
            setMessage(i18n.t('whitelist.mergeError'), '#F44336');
            return;
        }

        setMessage(i18n.t('whitelist.stateFilterSuccess', { count: result.removedCount, state: normalized }), '#4CAF50');
    };

    return div;
}

function createModeratorsTab(): HTMLElement {
    const div = document.createElement('div');

    const intro = document.createElement('p');
    intro.textContent = i18n.t('moderators.intro');
    intro.style.cssText = 'font-size:12px;margin-bottom:12px';
    div.appendChild(intro);

    const mods = getStoredModerators();
    if (!mods || Object.keys(mods).length === 0) {
        const empty = document.createElement('div');
        empty.textContent = i18n.t('moderators.empty');
        empty.style.cssText = 'font-size:12px;color:#666';
        div.appendChild(empty);
        return div;
    }

    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse';

    Object.keys(mods)
        .sort()
        .forEach(region => {
            const tr = document.createElement('tr');
            const tdRegion = document.createElement('td');
            tdRegion.textContent = region;
            tdRegion.style.cssText = 'border:1px solid #bdb;padding:4px;font-weight:bold';
            const tdMods = document.createElement('td');
            tdMods.textContent = mods[region].join(', ');
            tdMods.style.cssText = 'border:1px solid #bdb;padding:4px';
            tr.appendChild(tdRegion);
            tr.appendChild(tdMods);
            table.appendChild(tr);
        });

    div.appendChild(table);
    return div;
}

/**
 * Helper: create checkbox with label and wire to localStorage.
 */
function createCheckboxLabel(settingId: string, labelText: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'wmeph-setting-checkbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = settingId;
    checkbox.checked = localStorage.getItem(settingId) === '1';
    checkbox.onchange = () => {
        const isChecked = checkbox.checked;
        localStorage.setItem(settingId, isChecked ? '1' : '0');
        saveSettings({ [settingId]: isChecked } as Partial<Record<string, boolean>> as Partial<UserSettings>);
    };

    const label = document.createElement('label');
    label.htmlFor = settingId;
    label.textContent = labelText;
    label.style.cssText = 'margin-left:6px;font-weight:normal';

    div.appendChild(checkbox);
    div.appendChild(label);
    return div;
}

/**
 * Helper: create checkbox with label and wire to localStorage + highlighting refresh.
 */
function createCheckboxLabelWithCallback(
    settingId: string,
    labelText: string,
    sdk: WmeSDK,
    isToggle: boolean
): HTMLElement {
    const span = document.createElement('span');
    span.style.cssText = 'display:block;margin:6px 0';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = settingId;
    checkbox.checked = localStorage.getItem(settingId) === '1';
    checkbox.onchange = () => {
        const isChecked = checkbox.checked;
        localStorage.setItem(settingId, isChecked ? '1' : '0');
        saveSettings({ [settingId]: isChecked } as Partial<Record<string, boolean>> as Partial<UserSettings>);

        if (settingId === 'ShowFilterHighlight') {
            onFilterHighlightToggle(sdk, isChecked);
            return;
        }

        if (isToggle && settingId === 'ColorHighlighting') {
            onHighlightingToggle(sdk, isChecked);
        } else {
            onHighlightingSettingChange(sdk);
        }
    };

    const label = document.createElement('label');
    label.htmlFor = settingId;
    label.textContent = labelText;
    label.style.cssText = 'margin-left:6px;font-weight:normal';

    span.appendChild(checkbox);
    span.appendChild(label);
    return span;
}

type WzButtonElement = HTMLElement & { disabled?: boolean };

function createWzButton(options: {
    label: string;
    color?: string;
    size?: string;
    title?: string;
    fullWidth?: boolean;
    onClick: () => void | Promise<void>;
}): WzButtonElement {
    const btn = document.createElement('wz-button') as WzButtonElement;
    btn.setAttribute('color', options.color ?? 'secondary');
    btn.setAttribute('size', options.size ?? 'sm');
    btn.setAttribute('type', 'button');
    btn.textContent = options.label;
    if (options.title) {
        btn.setAttribute('title', options.title);
    }
    if (options.fullWidth) {
        btn.style.width = '100%';
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
