// ==UserScript==
// @name        WME Place Harmonizer
// @namespace   WazeUSA
// @version     2025.12.22.000
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license      AGPL
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      sheets.googleapis.com
// @connect      greasyfork.org
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require      https://greasyfork.org/scripts/37486-wme-utils-hoursparser/code/WME%20Utils%20-%20HoursParser.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @require      https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js
// ==/UserScript==

// NOTE: @grant unsafeWindow is required because we use GM_xmlhttpRequest.
// When any @grant other than "none" is used, Tampermonkey runs the script
// in a sandbox where `window` is isolated from the page. We need unsafeWindow
// to set global variables like unsafeWindow.wmephRunning to prevent multiple
// instances of the script from running at the same time.
