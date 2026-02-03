// ==UserScript==
// @name        WME Place Harmonizer (DEV)
// @namespace   WazeUSA
// @version     DEV
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license      AGPL
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      sheets.googleapis.com

// @require		file://wsl.localhost/Debian/home/mael/opensource/WME-Place-Harmonizer/.out/main.user.js
// ==/UserScript==

// NOTE: @grant unsafeWindow is required because we use GM_xmlhttpRequest.
// When any @grant other than "none" is used, Tampermonkey runs the script
// in a sandbox where `window` is isolated from the page. We need unsafeWindow
// to access WME's SDK_INITIALIZED promise and getWmeSdk() function.

// DEV SETUP:
// 1. Enable "Local file access" in Tampermonkey's extension settings (browser level, not TM):
//    https://www.tampermonkey.net/faq.php?locale=en#Q204
// 2. Adjust the @require path above to point to your local .out/main.user.js
// 3. Copy this entire header (up to ==/UserScript==) into Tampermonkey's editor
// 4. Keep header.js and header-dev.js in sync, except for the @require field