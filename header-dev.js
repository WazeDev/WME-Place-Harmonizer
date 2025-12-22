// ==UserScript==
// @name        WME Place Harmonizer (DEV)
// @namespace   WazeUSA
// @version     DEV
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @require     https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require     https://greasyfork.org/scripts/37486-wme-utils-hoursparser/code/WME%20Utils%20-%20HoursParser.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @license     GNU GPL v3
// @grant       GM_addStyle

// @require       file:///C:/Users/[USERNAME]/Documents/MyDir/.out/main.user.js
// ==/UserScript==

// make sure that inside Tampermonkey's extension settings (on the browser, not from TM) and allow "Local file access", as shown here: https://www.tampermonkey.net/faq.php?locale=en#Q204
// make sure that the snippts inside header.js and header-dev.js are the same, except for the one @require field
// adjust the require field to the location of the .out/main.user.js file inside this directory
// copy the above snippet (up to ==/Userscript==) inside Tampermonkey's editor and save it