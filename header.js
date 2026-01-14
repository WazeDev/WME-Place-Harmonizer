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
// ==/UserScript==

// NOTE: @grant unsafeWindow is required because we use GM_xmlhttpRequest.
// When any @grant other than "none" is used, Tampermonkey runs the script
// in a sandbox where `window` is isolated from the page. We need unsafeWindow
// to access WME's SDK_INITIALIZED promise and getWmeSdk() function.
