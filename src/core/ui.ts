import {
    WME_SERVICES_ARRAY, SEVERITY, URLS, SCRIPT_NAME, SCRIPT_VERSION,
    BETA_VERSION_STR
} from './constants';
import {
    logDev, OLD_getSelectedVenue, getSelectedVenue, isAlwaysOpen
} from './utils';
import {
    harmonizePlaceGo, addUpdateAction, UPDATED_FIELDS, reportError
} from './actions';
import { _venueWhitelist, saveWhitelistToLS } from './storage';
import {
    _googlePlaces, drawGooglePlacePoint, destroyGooglePlacePoint, _resultsCache, _layer
} from './map';
import { FlagBase } from './flags';
import { getSdk } from './wmeSdk';

declare const $: any;
declare const WazeWrap: any;
declare const W: any;
declare const require: any;

export const WL_BUTTON_TEXT = 'WL';

export let _buttonBanner2: Record<string, any> = {};
export let _servicesBanner: Record<string, any> = {};
export let _dupeBanner: Record<string, any> = {};
export let _textEntryValues: any[] | null = null;

export function setButtonBanner2(banner: any) { _buttonBanner2 = banner; }
export function setServicesBanner(banner: any) { _servicesBanner = banner; }
export function setDupeBanner(banner: any) { _dupeBanner = banner; }
export function setTextEntryValues(vals: any) { _textEntryValues = vals; }

export function getServicesChecks(venue: any) {
    const servArrayCheck: boolean[] = [];
    const services = venue.attributes?.services || venue.services || [];
    for (let wsix = 0; wsix < WME_SERVICES_ARRAY.length; wsix++) {
        if (services.includes(WME_SERVICES_ARRAY[wsix])) {
            servArrayCheck[wsix] = true;
        } else {
            servArrayCheck[wsix] = false;
        }
    }
    return servArrayCheck;
}

export function updateServicesChecks(): void {
    const venue = getSelectedVenue();
    if (venue) {
        if (!_servicesBanner) return;
        const servArrayCheck = getServicesChecks(venue);
        let wsix = 0;
        Object.keys(_servicesBanner).forEach(keys => {
            if (_servicesBanner.hasOwnProperty(keys)) {
                _servicesBanner[keys].checked = servArrayCheck[wsix];
                _servicesBanner[keys].active = _servicesBanner[keys].active || servArrayCheck[wsix];
                wsix++;
            }
        });
        if (isAlwaysOpen(venue)) {
            _servicesBanner.add247.checked = true;
        }
        _servicesBanner.add247.active = true;
    }
}

export function setServiceChecked(servBtn: any, checked: boolean | undefined, pendingUpdates: any) {
    const servID = WME_SERVICES_ARRAY[servBtn.servIDIndex];
    const checkboxChecked = $(`wz-checkbox[value="${servID}"]`).prop('checked');
    const venue = getSelectedVenue();
    if (!venue) return;

    if (checkboxChecked !== checked) {
        UPDATED_FIELDS[`services_${servID}`].updated = true;
    }
    const toggle = typeof checked === 'undefined';
    let noAdd = false;
    checked = (toggle) ? !servBtn.checked : checked;
    if (checkboxChecked === servBtn.checked && checkboxChecked !== checked) {
        servBtn.checked = checked;
        let services;
        if (pendingUpdates) {
            if (pendingUpdates.sdkUpdates && pendingUpdates.sdkUpdates.services) {
                services = pendingUpdates.sdkUpdates.services;
            } else if (pendingUpdates.legacyActions) {
                for (let i = 0; i < pendingUpdates.legacyActions.length; i++) {
                    const existingAction = pendingUpdates.legacyActions[i];
                    if (existingAction.newAttributes && existingAction.newAttributes.services) {
                        ({ services } = existingAction.newAttributes);
                    }
                }
            }
        }
        if (!services) {
            services = venue.services.slice();
        } else {
            noAdd = services.includes(servID);
        }
        if (checked) {
            services.push(servID);
        } else {
            const index = services.indexOf(servID);
            if (index > -1) {
                services.splice(index, 1);
            }
        }
        if (!noAdd) {
            addUpdateAction(venue, { services }, pendingUpdates);
        }
    }
    updateServicesChecks();
    if (!toggle) servBtn.active = checked;
}

export function getServicesBanner(): Record<string, any> {
    const actionFn = function(this: any, pendingUpdates: any, checked: boolean) { setServiceChecked(this, checked, pendingUpdates); };
    const actionOnFn = function(this: any, pendingUpdates: any) { this.action(pendingUpdates, true); };
    const actionOffFn = function(this: any, pendingUpdates: any) { this.action(pendingUpdates, false); };

    return {
        addValet: {
            active: false, checked: false, icon: 'serv-valet', w2hratio: 50 / 50, value: 'Valet', title: 'Valet service', servIDIndex: 0, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addDriveThru: {
            active: false, checked: false, icon: 'serv-drivethru', w2hratio: 78 / 50, value: 'DriveThru', title: 'Drive-thru', servIDIndex: 1, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addWiFi: {
            active: false, checked: false, icon: 'serv-wifi', w2hratio: 67 / 50, value: 'WiFi', title: 'Wi-Fi', servIDIndex: 2, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addRestrooms: {
            active: false, checked: false, icon: 'serv-restrooms', w2hratio: 49 / 50, value: 'Restroom', title: 'Restrooms', servIDIndex: 3, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addCreditCards: {
            active: false, checked: false, icon: 'serv-credit', w2hratio: 73 / 50, value: 'CC', title: 'Accepts credit cards', servIDIndex: 4, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addReservations: {
            active: false, checked: false, icon: 'serv-reservations', w2hratio: 55 / 50, value: 'Reserve', title: 'Reservations', servIDIndex: 5, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addOutside: {
            active: false, checked: false, icon: 'serv-outdoor', w2hratio: 73 / 50, value: 'OusideSeat', title: 'Outdoor seating', servIDIndex: 6, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addAC: {
            active: false, checked: false, icon: 'serv-ac', w2hratio: 50 / 50, value: 'AC', title: 'Air conditioning', servIDIndex: 7, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addParking: {
            active: false, checked: false, icon: 'serv-parking', w2hratio: 46 / 50, value: 'Customer parking', title: 'Parking', servIDIndex: 8, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addDeliveries: {
            active: false, checked: false, icon: 'serv-deliveries', w2hratio: 86 / 50, value: 'Delivery', title: 'Deliveries', servIDIndex: 9, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addTakeAway: {
            active: false, checked: false, icon: 'serv-takeaway', w2hratio: 34 / 50, value: 'Take-out', title: 'Take-out', servIDIndex: 10, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addCurbside: {
            active: true, checked: false, icon: 'serv-curbside', w2hratio: 50 / 50, value: 'Curbside pickup', title: 'Curbside pickup', servIDIndex: 11, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addWheelchair: {
            active: false, checked: false, icon: 'serv-wheelchair', w2hratio: 50 / 50, value: 'WhCh', title: 'Wheelchair accessible', servIDIndex: 12, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        addDisabilityParking: {
            active: false, checked: false, icon: 'serv-wheelchair', w2hratio: 50 / 50, value: 'DisabilityParking', title: 'Disability parking', servIDIndex: 13, pnhOverride: false, action: actionFn, actionOn: actionOnFn, actionOff: actionOffFn
        },
        add247: {
            active: false,
            checked: false,
            icon: 'serv-247',
            w2hratio: 73 / 50,
            value: '247',
            title: 'Hours: Open 24/7',
        action(pendingUpdates: any) {
                if (!_servicesBanner.add247.checked) {
                    const venue = getSelectedVenue();
                    _servicesBanner.add247.checked = true;
                    const OpeningHour = require('Waze/Model/Objects/OpeningHour');
                addUpdateAction(venue, { openingHours: [new OpeningHour({ days: [1, 2, 3, 4, 5, 6, 0], fromHour: '00:00', toHour: '00:00' })] }, pendingUpdates);
                }
            },
        actionOn(pendingUpdates: any) { this.action(pendingUpdates); }
        }
    };
}

export function getButtonBanner2(venue: any, placePL: string): Record<string, any> {
    return {
        placesWiki: {
            active: true,
            severity: 0,
            message: '',
            value: 'Places wiki',
            title: 'Open the places Wazeopedia (wiki) page',
            action() { window.open(URLS.placesWiki); }
        },
        restAreaWiki: {
            active: false,
            severity: 0,
            message: '',
            value: 'Rest Area wiki',
            title: 'Open the Rest Area wiki page',
            action() { window.open(URLS.restAreaWiki); }
        },
        clearWL: {
            active: false,
            severity: 0,
            message: '',
            value: 'Clear place whitelist',
            title: 'Clear all Whitelisted fields for this place',
            action() {
                WazeWrap.Alerts.confirm(
                    SCRIPT_NAME,
                    'Are you sure you want to clear all whitelisted fields for this place?',
                    () => {
                        delete _venueWhitelist[venue.attributes.id];
                        delete _resultsCache[venue.attributes.id];
                        saveWhitelistToLS(true);
                        harmonizePlaceGo(venue, 'harmonize');
                    },
                    () => { },
                    'Yes',
                    'No'
                );
            }
        },
        PlaceErrorForumPost: {
            active: true,
            severity: 0,
            message: '',
            value: 'Report script error',
            title: 'Report a script error',
            action() {
                const sdk = getSdk();
                const venueId = venue.attributes?.id || venue.id;
                const sdkVenue = sdk.DataModel.Venues.getById({ venueId: venueId as string });
                const address = sdk.DataModel.Venues.getAddress({ venueId: venueId as string });
                reportError({
                    subject: 'WMEPH Bug report: Script Error',
                    message: `Script version: ${SCRIPT_VERSION}${BETA_VERSION_STR}\nPermalink: ${
                        placePL}\nPlace name: ${sdkVenue?.name}\nCountry: ${
                        address?.country?.name}\n--------\nDescribe the error:  \n `
                });
            }
        }
    };
}

export function getGooglePlaceUuidFromElement($el: any): string {
    return $el.attr('uuid');
}

export function addGoogleLinkHoverEvent($el: any): void {
    $el.hover(() => drawGooglePlacePoint(getGooglePlaceUuidFromElement($el)), () => destroyGooglePlacePoint());
}

export async function processGoogleLinks(venue: any): Promise<void> {
    const providerIds = venue.externalProviderIds || venue.attributes?.externalProviderIDs?.map((l: any) => l.attributes.uuid) || [];
    const promises = providerIds.map((uuid: string) => _googlePlaces.getPlace(uuid).catch((err: any) => {
        console.warn(`WMEPH: Error fetching Google Place ${uuid}:`, err);
        return { placeId: uuid, requestStatus: 'ERROR' };
    }));
    const googleResults = await Promise.all(promises);
    $('#wmeph-google-link-info').remove();
    if (googleResults.length && venue.id === getSelectedVenue()?.id) {
        const $bannerDiv = $('<div>', { id: 'wmeph-google-link-info' });
        const googleLogoLetter = (letter: string, colorClass: string) => $('<span>', { class: 'google-logo' }).addClass(colorClass).text(letter);
        $bannerDiv.append(
            $('<div>', {
                class: 'banner-row gray',
                style: 'padding-top: 4px;color: #646464;padding-left: 8px;'
            }).text(' Links').prepend(
                googleLogoLetter('G', 'blue'),
                googleLogoLetter('o', 'red'),
                googleLogoLetter('o', 'orange'),
                googleLogoLetter('g', 'blue'),
                googleLogoLetter('l', 'green'),
                googleLogoLetter('e', 'red')
            ).prepend(
                $('<i>', {
                    id: 'wmeph-ext-prov-jump',
                    title: 'Jump to external providers section',
                    class: 'fa fa-level-down',
                    style: 'font-size: 15px;float: right;color: cadetblue;cursor: pointer;padding-left: 6px;'
                })
            )
        );
        providerIds.forEach((uuid: string) => {
            const result = googleResults.find((r: any) => r.placeId === uuid);
            if (result) {
                const linkStyle = 'margin-left: 5px;text-decoration: none;color: cadetblue;';
                let $nameSpan;
                const $row = $('<div>', { class: 'banner-row', style: 'border-top: 1px solid #ccc;' }).append(
                    $('<table>', { style: 'width: 100%' }).append(
                        $('<tbody>').append(
                            $('<tr>').append(
                                $('<td>').append(
                                    '&bull;',
                                    $nameSpan = $('<span>', {
                                        class: 'wmeph-google-place-name',
                                        style: 'margin-left: 3px;font-weight: normal;'
                                    }).text(`${result.name || result.placeId}`)
                                ),
                                $('<td>', { style: 'text-align: right;font-weight: 500;padding: 2px 2px 2px 0px;min-width: 65px;' }).append(
                                    result.website && !['NOT_FOUND', 'ERROR'].includes(result.requestStatus) ? [$('<a>', {
                                        style: linkStyle,
                                        href: result.website,
                                        target: '_blank',
                                        title: 'Open the place\'s website, according to Google'
                                    }).append(
                                        $('<i>', {
                                            class: 'fa fa-external-link',
                                            style: 'font-size: 16px;position: relative;top: 1px;'
                                        })
                                    ),
                                    $('<span>', {
                                        style: 'text-align: center;margin-left: 8px;margin-right: 4px;color: #c5c5c5;cursor: default;'
                                    }).text('|')] : null,
                                    !['NOT_FOUND', 'ERROR'].includes(result.requestStatus) ? $('<a>', {
                                        style: linkStyle,
                                        href: result.url,
                                        target: '_blank',
                                        title: 'Open the place in Google Maps'
                                    }).append(
                                        $('<i>', {
                                            class: 'fa fa-map-o',
                                            style: 'font-size: 16px;'
                                        })
                                    ) : null
                                )
                            )
                        )
                    )
                );

                if (result.requestStatus === 'NOT_FOUND') {
                    $nameSpan.text('Invalid Google link (Not found)');
                    $row.addClass('red');
                    $row.attr('title', 'This Google place ID was not found. Please update the link in the External Providers section.');
                } else if (result.requestStatus === 'ERROR') {
                    $nameSpan.text('Google link details unavailable');
                    $row.addClass('red');
                     $row.attr('title', 'Details unavailable. If WME was loaded with this place selected, e.g. in a permalink, deselect it and refresh the page.');
                } else if (result.business_status === 'CLOSED_PERMANENTLY') {
                    $nameSpan.append(' [CLOSED]');
                    $row.addClass('red');
                    $row.attr('title', 'Google indicates this linked place is permanently closed. Please verify.');
                } else if (result.business_status === 'CLOSED_TEMPORARILY') {
                    $nameSpan.append(' [TEMPORARILY&nbsp;CLOSED]');
                    $row.addClass('yellow');
                    $row.attr('title', 'Google indicates this linked place is TEMPORARILY closed. Please verify.');
                } else if (googleResults.filter(otherResult => otherResult.placeId === result.placeId).length > 1) {
                    $nameSpan.append(' [DUPLICATE]');
                    $row.css('background-color', '#fde5c8');
                    $row.attr('title', 'This place is linked more than once. Please remove extra links.');
                } else {
                    $row.addClass('lightgray');
                }

                $bannerDiv.append($row);
                $row.attr('uuid', uuid);
                if (result.requestStatus !== 'NOT_FOUND') {
                    addGoogleLinkHoverEvent($row);
                }
            }
        });
        $('#WMEPH_banner').append($bannerDiv);
        $('#wmeph-ext-prov-jump').click(() => {
            const extProvSelector = '#venue-edit-general > div.external-providers-control.form-group';
        const tab = document.querySelector('#edit-panel wz-tab.venue-edit-tab-general') as any;
        if (tab) tab.isActive = true;
            setTimeout(() => {
            const extProv = document.querySelector(extProvSelector);
            if (extProv) extProv.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    $(extProvSelector).addClass('highlight');
                    setTimeout(() => {
                        $(extProvSelector).removeClass('highlight');
                    }, 1500);
                }, 250);
            }, 0);
        });
    }
}

export function buttonActionOld(flagKey: string, flag: any) {
    const button = document.getElementById(`WMEPH_${flagKey}`) as HTMLInputElement;
    button.onclick = () => {
        flag.action();
        if (!flag.noBannerAssemble) harmonizePlaceGo(OLD_getSelectedVenue(), 'harmonize');
    };
}

export function buttonWhitelistOld(flagKey: string, flag: any) {
    const button = document.getElementById(`WMEPH_WL${flagKey}`) as HTMLInputElement;
    button.onclick = () => {
        if (flagKey.match(/^\d{5,}/) !== null) {
            flag.WLaction(flagKey);
        } else {
            flag.WLaction();
        }
        flag.WLactive = false;
        flag.severity = SEVERITY.GREEN;
    };
    return button;
}

export function buttonAction(flag: any) {
    const button = document.getElementById(`WMEPH_${flag.name}`) as HTMLInputElement;
    button.onclick = () => {
        flag.action();
        if (!flag.noBannerAssemble) harmonizePlaceGo(OLD_getSelectedVenue(), 'harmonize');
    };
    return button;
}

export function buttonAction2(flag: any) {
    const button = document.getElementById(`WMEPH_${flag.name}_2`) as HTMLInputElement;
    button.onclick = () => {
        flag.action2();
        if (!flag.noBannerAssemble) harmonizePlaceGo(OLD_getSelectedVenue(), 'harmonize');
    };
    return button;
}

export function buttonWhitelist(flag: any) {
    const button = document.getElementById(`WMEPH_WL${flag.name}`) as HTMLInputElement;
    button.onclick = () => {
        if (flag.name.match(/^\d{5,}/) !== null) {
            flag.WLaction(flag.name);
        } else {
            flag.WLaction();
        }
    };
    return button;
}

export function setupButtonsOld(banner: any) {
    Object.keys(banner).forEach(flagKey => {
        const flag = banner[flagKey];
        if (flag?.active && flag.action && flag.value) {
            buttonActionOld(flagKey, flag);
        }
        if (flag?.WLactive && flag.WLaction) {
            buttonWhitelistOld(flagKey, flag);
        }
    });
}

export function setupButtons(flags: any[]) {
    flags.forEach((flag: any) => {
        if (flag.action && flag.buttonText) {
            buttonAction(flag);
        }
        if (flag.action2 && flag.value2) {
            buttonAction2(flag);
        }
        if (flag.showWL && flag.WLaction) {
            buttonWhitelist(flag);
        }
    });
}

export function assembleServicesBanner(chainIsClosed: boolean) {
    if ($('#WMEPH_services').length === 0) {
        $('#WMEPH_banner').after($('<div id="WMEPH_services">').css({
            color: 'black',
            'font-size': '15px',
            'margin-left': '6px'
        }));
    } else {
        $('#WMEPH_services').empty();
    }

    const venue = getSelectedVenue();
    if (venue && !chainIsClosed && !$('#WMEPH-HideServicesButtons').prop('checked')) {
        const rowDivs: any[] = [];
        if (!venue.isResidential) {
            const $rowDiv = $('<div>');
            const servButtHeight = '27';
            const buttons: any[] = [];
            Object.keys(_servicesBanner).forEach(tempKey => {
                const rowData = _servicesBanner[tempKey];
                if (rowData.active) {
                    const $input = $('<input>', {
                        class: rowData.icon,
                        id: `WMEPH_${tempKey}`,
                        type: 'button',
                        title: rowData.title
                    }).css(
                        {
                            border: 0,
                            'background-size': 'contain',
                            height: '27px',
                            width: `${Math.ceil(parseInt(servButtHeight, 10) * rowData.w2hratio).toString()}px`
                        }
                    );
                    buttons.push($input);
                    if (!rowData.checked) {
                        $input.css({ '-webkit-filter': 'opacity(.3)', filter: 'opacity(.3)' });
                    } else {
                        $input.css({ color: 'green' });
                    }
                    $rowDiv.append($input);
                }
            });
            if ($rowDiv.length) {
                $rowDiv.prepend('<span class="control-label" title="Verify all Place services before saving">Services (select any that apply):</span><br>');
            }
            rowDivs.push($rowDiv);
        }
        $('#WMEPH_services').append(rowDivs);

        if (!venue.isResidential) {
            setupButtonsOld(_servicesBanner);
        }
    }
}

export function assembleBanner(chainIsClosed: boolean) {
    const flags = FlagBase.currentFlags.getOrderedFlags();
    const venue = getSelectedVenue();
    const legacyVenue = OLD_getSelectedVenue();
    if (!venue || !legacyVenue) return;
    logDev('Building banners');
    let dupesFound = 0;
    let $rowDiv: any;
    let rowDivs: any[] = [];
    let totalSeverity: any = SEVERITY.GREEN;

    const func = (elem: any) => ({ id: elem.getAttribute('id'), val: elem.value });
    _textEntryValues = $('#WMEPH_banner input[type="text"]').toArray().map(func).concat($('#WMEPH_banner textarea').toArray().map(func));

    $rowDiv = $('<div class="banner-row yellow">');
    Object.keys(_dupeBanner).forEach(tempKey => {
        const rowData = _dupeBanner[tempKey];
        if (rowData.active) {
            dupesFound += 1;
            const $dupeDiv = $('<div class="dupe">').appendTo($rowDiv);
            $dupeDiv.append($('<span style="margin-right:4px">').html(`&bull; ${rowData.message}`));
            if (rowData.WLactive && rowData.WLaction) {
                totalSeverity = Math.max(rowData.severity, totalSeverity);
                $dupeDiv.append($('<button>', {
                    class: 'btn btn-success btn-xs wmephwl-btn',
                    id: `WMEPH_WL${tempKey}`,
                    title: rowData.wlTooltip
                }).text(rowData.WLvalue));
            }
        }
    });
    if (dupesFound) {
        $rowDiv.prepend(`Possible duplicate${dupesFound > 1 ? 's' : ''}:`);
        rowDivs.push($rowDiv);
    }

    flags.forEach((flag: any) => {
        $rowDiv = $('<div class="banner-row">');
        let colorClass: string;
        switch (flag.severity) {
            case SEVERITY.RED: colorClass = 'red'; break;
            case SEVERITY.YELLOW: colorClass = 'yellow'; break;
            case SEVERITY.BLUE: colorClass = 'blue'; break;
            case SEVERITY.GREEN: colorClass = 'gray'; break;
            case SEVERITY.ORANGE: colorClass = 'orange'; break;
            default: throw new Error(`WMEPH: Unexpected severity value while building banner: ${flag.severity}`);
        }
        $rowDiv.addClass(colorClass);
        if (flag.divId) $rowDiv.attr('id', flag.divId);
        if (flag.message && flag.message.length) {
            $rowDiv.append($('<span>').css({ 'margin-right': '4px' }).append(`&bull; ${flag.message}`));
        }
        if (flag.buttonText) {
            $rowDiv.append($('<button>', {
                class: 'btn btn-default btn-xs wmeph-btn',
                id: `WMEPH_${flag.name}`,
                title: flag.title || ''
            }).css({ 'margin-right': '4px' }).html(flag.buttonText));
        }
        if (flag.value2) {
            $rowDiv.append($('<button>', {
                class: 'btn btn-default btn-xs wmeph-btn',
                id: `WMEPH_${flag.name}_2`,
                title: flag.title2 || ''
            }).css({ 'margin-right': '4px' }).html(flag.value2));
        }
        if (flag.showWL) {
            if (flag.WLaction) {
                totalSeverity = Math.max(flag.severity, totalSeverity);
                $rowDiv.append(
                    $('<button>', { class: 'btn btn-success btn-xs wmephwl-btn', id: `WMEPH_WL${flag.name}`, title: flag.wlTooltip })
                        .text('WL')
                );
            }
        } else {
            totalSeverity = Math.max(flag.severity, totalSeverity);
        }
        if (flag.suffixMessage) {
            $rowDiv.append($('<div>').css({ 'margin-top': '2px' }).append(flag.suffixMessage));
        }

        rowDivs.push($rowDiv);
    });

    if ($('#WMEPH-ColorHighlighting').prop('checked') && venue) {
        _resultsCache[venue.id] = { s: totalSeverity, u: Date.now() };
        if (_layer) _layer.redraw();
    }

    if ($('#WMEPH_banner').length === 0) {
        $('<div id="WMEPH_banner">').prependTo('#wmeph-panel');
    } else {
        $('#WMEPH_banner').empty();
    }
    let bgColor;
    switch (totalSeverity) {
        case SEVERITY.BLUE: bgColor = 'rgb(50, 50, 230)'; break;
        case SEVERITY.YELLOW: bgColor = 'rgb(217, 173, 42)'; break;
        case SEVERITY.RED: bgColor = 'rgb(211, 48, 48)'; break;
        case SEVERITY.ORANGE: bgColor = 'rgb(255, 127, 0)'; break;
        default: bgColor = 'rgb(36, 172, 36)'; break;
    }
    $('#WMEPH_banner').css({ 'background-color': bgColor }).append(rowDivs);

    assembleServicesBanner(chainIsClosed);

    rowDivs = [];
    Object.keys(_buttonBanner2).forEach(tempKey => {
        const banner2RowData = _buttonBanner2[tempKey];
        if (banner2RowData.active) {
            $rowDiv = $('<div>');
            $rowDiv.append(banner2RowData.message);
            if (banner2RowData.action) {
                $rowDiv.append(` <input class="btn btn-info btn-xs wmeph-btn" id="WMEPH_${tempKey}" title="${
                    banner2RowData.title}" style="" type="button" value="${banner2RowData.value}">`);
            }
            rowDivs.push($rowDiv);
            totalSeverity = Math.max(_buttonBanner2[tempKey].severity, totalSeverity);
        }
    });

    if ($('#WMEPH_tools').length === 0) {
        $('#WMEPH_services').after($('<div id="WMEPH_tools">').css({
            color: 'black',
            'font-size': '15px',
            'margin-left': '6px',
            'margin-right': 'auto'
        }));
    } else {
        $('#WMEPH_tools').empty();
    }
    $('#WMEPH_tools').append(rowDivs);

    if (dupesFound) {
        setupButtonsOld(_dupeBanner);
    }
    setupButtons(flags);
    setupButtonsOld(_buttonBanner2);

    $('.wmeph-pla-spaces-btn').click((evt: any) => {
        const selectedVenue = OLD_getSelectedVenue();
        const selectedValue = $(evt.currentTarget).attr('id').replace('wmeph_', '');
        const existingAttr = selectedVenue.attributes.categoryAttributes.PARKING_LOT;
        const newAttr: any = {};
        if (existingAttr) {
            Object.keys(existingAttr).forEach(prop => {
                let value = existingAttr[prop];
                if (Array.isArray(value)) value = [...value];
                newAttr[prop] = value;
            });
        }
        newAttr.estimatedNumberOfSpots = selectedValue;
        UPDATED_FIELDS.parkingSpots.updated = true;
        addUpdateAction(selectedVenue, { categoryAttributes: { PARKING_LOT: newAttr } }, null, true);
    });

    $('#WMEPH_WLnoHours').css({ 'vertical-align': 'top' });

    if (_textEntryValues) {
        _textEntryValues.forEach((entry: any) => $(`#${entry.id}`).val(entry.val));
    }

    flags.forEach((flag: any) => {
        flag.postProcess?.();
    });

    processGoogleLinks(venue);
}
