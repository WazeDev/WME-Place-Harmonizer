// ==UserScript==
// @name        WME Place Harmonizer Beta
// @namespace   WazeUSA
// @version     1.3.15
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license     GNU GPL v3
// ==/UserScript==


(function() {
    'use strict';
    if (confirm('WMEPH must be installed from Greasy Fork.  Do you want to install now?')) {
        window.open('https://greasyfork.org/en/scripts/28690-wme-place-harmonizer');
    } else {
        // Do nothing!
    }
})();
