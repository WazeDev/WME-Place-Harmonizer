/* global I18n */
/* global OpenLayers */
/* global $ */
/* global W */
/* global GM_info */
/* global require */
/* global performance */
/* global OL */
/* global _ */
/* global define */
/* global Node */

// ==UserScript==
// @name        WME Place Harmonizer (GM)
// @namespace   WazeUSA
// @version     1.2.37
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/.*$/
// @require     https://greasyfork.org/scripts/28687-jquery-ui-1-11-4-custom-min-js/code/jquery-ui-1114customminjs.js
// @resource    jqUI_CSS  https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css
// @license     GNU GPL v3

// ==/UserScript==


(function () {
 
    // BEGIN GREASEMONKEY WORKAROUND *****************************************
    // ***********************************************************************
    var css = [
        '.wmeph-btn, .wmephwl-btn {height:18px;}',
        '#WMEPH_banner { font-weight: 600;}',
        '#WMEPH_banner input[type=text], #WMEPH_banner .ui-autocomplete-input { font-size: 13px !important; height:22px !important; font-family: "Open Sans", Alef, helvetica, sans-serif !important; }',
        '#WMEPH_banner div { padding-bottom: 6px !important; }',
        '#WMEPH_tools div { padding-bottom: 3px !important; }',
        '.ui-autocomplete { max-height: 300px;overflow-y: auto;overflow-x: hidden;} '
    ].join('\n')
    $('head').append('<style type="text/css">' + css + '</style>');
    
    //JQUERYUI CSS STUFF
    var jqcss = `//*! jQuery UI - v1.11.4 - 2015-03-11
* http://jqueryui.com
* Includes: core.css, accordion.css, autocomplete.css, button.css, datepicker.css, dialog.css, draggable.css, menu.css, progressbar.css, resizable.css, selectable.css, selectmenu.css, slider.css, sortable.css, spinner.css, tabs.css, tooltip.css, theme.css
* To view and modify this theme, visit http://jqueryui.com/themeroller/?ffDefault=Verdana%2CArial%2Csans-serif&fwDefault=normal&fsDefault=1.1em&cornerRadius=4px&bgColorHeader=cccccc&bgTextureHeader=highlight_soft&bgImgOpacityHeader=75&borderColorHeader=aaaaaa&fcHeader=222222&iconColorHeader=222222&bgColorContent=ffffff&bgTextureContent=flat&bgImgOpacityContent=75&borderColorContent=aaaaaa&fcContent=222222&iconColorContent=222222&bgColorDefault=e6e6e6&bgTextureDefault=glass&bgImgOpacityDefault=75&borderColorDefault=d3d3d3&fcDefault=555555&iconColorDefault=888888&bgColorHover=dadada&bgTextureHover=glass&bgImgOpacityHover=75&borderColorHover=999999&fcHover=212121&iconColorHover=454545&bgColorActive=ffffff&bgTextureActive=glass&bgImgOpacityActive=65&borderColorActive=aaaaaa&fcActive=212121&iconColorActive=454545&bgColorHighlight=fbf9ee&bgTextureHighlight=glass&bgImgOpacityHighlight=55&borderColorHighlight=fcefa1&fcHighlight=363636&iconColorHighlight=2e83ff&bgColorError=fef1ec&bgTextureError=glass&bgImgOpacityError=95&borderColorError=cd0a0a&fcError=cd0a0a&iconColorError=cd0a0a&bgColorOverlay=aaaaaa&bgTextureOverlay=flat&bgImgOpacityOverlay=0&opacityOverlay=30&bgColorShadow=aaaaaa&bgTextureShadow=flat&bgImgOpacityShadow=0&opacityShadow=30&thicknessShadow=8px&offsetTopShadow=-8px&offsetLeftShadow=-8px&cornerRadiusShadow=8px
* Copyright 2015 jQuery Foundation and other contributors; Licensed MIT */

/* Layout helpers
----------------------------------*/
.ui-helper-hidden {
	display: none;
}
.ui-helper-hidden-accessible {
	border: 0;
	clip: rect(0 0 0 0);
	height: 1px;
	margin: -1px;
	overflow: hidden;
	padding: 0;
	position: absolute;
	width: 1px;
}
.ui-helper-reset {
	margin: 0;
	padding: 0;
	border: 0;
	outline: 0;
	line-height: 1.3;
	text-decoration: none;
	font-size: 100%;
	list-style: none;
}
.ui-helper-clearfix:before,
.ui-helper-clearfix:after {
	content: "";
	display: table;
	border-collapse: collapse;
}
.ui-helper-clearfix:after {
	clear: both;
}
.ui-helper-clearfix {
	min-height: 0; /* support: IE7 */
}
.ui-helper-zfix {
	width: 100%;
	height: 100%;
	top: 0;
	left: 0;
	position: absolute;
	opacity: 0;
	filter:Alpha(Opacity=0); /* support: IE8 */
}

.ui-front {
	z-index: 100;
}


/* Interaction Cues
----------------------------------*/
.ui-state-disabled {
	cursor: default !important;
}


/* Icons
----------------------------------*/

/* states and images */
.ui-icon {
	display: block;
	text-indent: -99999px;
	overflow: hidden;
	background-repeat: no-repeat;
}


/* Misc visuals
----------------------------------*/

/* Overlays */
.ui-widget-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}
.ui-accordion .ui-accordion-header {
	display: block;
	cursor: pointer;
	position: relative;
	margin: 2px 0 0 0;
	padding: .5em .5em .5em .7em;
	min-height: 0; /* support: IE7 */
	font-size: 100%;
}
.ui-accordion .ui-accordion-icons {
	padding-left: 2.2em;
}
.ui-accordion .ui-accordion-icons .ui-accordion-icons {
	padding-left: 2.2em;
}
.ui-accordion .ui-accordion-header .ui-accordion-header-icon {
	position: absolute;
	left: .5em;
	top: 50%;
	margin-top: -8px;
}
.ui-accordion .ui-accordion-content {
	padding: 1em 2.2em;
	border-top: 0;
	overflow: auto;
}
.ui-autocomplete {
	position: absolute;
	top: 0;
	left: 0;
	cursor: default;
}
.ui-button {
	display: inline-block;
	position: relative;
	padding: 0;
	line-height: normal;
	margin-right: .1em;
	cursor: pointer;
	vertical-align: middle;
	text-align: center;
	overflow: visible; /* removes extra width in IE */
}
.ui-button,
.ui-button:link,
.ui-button:visited,
.ui-button:hover,
.ui-button:active {
	text-decoration: none;
}
/* to make room for the icon, a width needs to be set here */
.ui-button-icon-only {
	width: 2.2em;
}
/* button elements seem to need a little more width */
button.ui-button-icon-only {
	width: 2.4em;
}
.ui-button-icons-only {
	width: 3.4em;
}
button.ui-button-icons-only {
	width: 3.7em;
}

/* button text element */
.ui-button .ui-button-text {
	display: block;
	line-height: normal;
}
.ui-button-text-only .ui-button-text {
	padding: .4em 1em;
}
.ui-button-icon-only .ui-button-text,
.ui-button-icons-only .ui-button-text {
	padding: .4em;
	text-indent: -9999999px;
}
.ui-button-text-icon-primary .ui-button-text,
.ui-button-text-icons .ui-button-text {
	padding: .4em 1em .4em 2.1em;
}
.ui-button-text-icon-secondary .ui-button-text,
.ui-button-text-icons .ui-button-text {
	padding: .4em 2.1em .4em 1em;
}
.ui-button-text-icons .ui-button-text {
	padding-left: 2.1em;
	padding-right: 2.1em;
}
/* no icon support for input elements, provide padding by default */
input.ui-button {
	padding: .4em 1em;
}

/* button icon element(s) */
.ui-button-icon-only .ui-icon,
.ui-button-text-icon-primary .ui-icon,
.ui-button-text-icon-secondary .ui-icon,
.ui-button-text-icons .ui-icon,
.ui-button-icons-only .ui-icon {
	position: absolute;
	top: 50%;
	margin-top: -8px;
}
.ui-button-icon-only .ui-icon {
	left: 50%;
	margin-left: -8px;
}
.ui-button-text-icon-primary .ui-button-icon-primary,
.ui-button-text-icons .ui-button-icon-primary,
.ui-button-icons-only .ui-button-icon-primary {
	left: .5em;
}
.ui-button-text-icon-secondary .ui-button-icon-secondary,
.ui-button-text-icons .ui-button-icon-secondary,
.ui-button-icons-only .ui-button-icon-secondary {
	right: .5em;
}

/* button sets */
.ui-buttonset {
	margin-right: 7px;
}
.ui-buttonset .ui-button {
	margin-left: 0;
	margin-right: -.3em;
}

/* workarounds */
/* reset extra padding in Firefox, see h5bp.com/l */
input.ui-button::-moz-focus-inner,
button.ui-button::-moz-focus-inner {
	border: 0;
	padding: 0;
}
.ui-datepicker {
	width: 17em;
	padding: .2em .2em 0;
	display: none;
}
.ui-datepicker .ui-datepicker-header {
	position: relative;
	padding: .2em 0;
}
.ui-datepicker .ui-datepicker-prev,
.ui-datepicker .ui-datepicker-next {
	position: absolute;
	top: 2px;
	width: 1.8em;
	height: 1.8em;
}
.ui-datepicker .ui-datepicker-prev-hover,
.ui-datepicker .ui-datepicker-next-hover {
	top: 1px;
}
.ui-datepicker .ui-datepicker-prev {
	left: 2px;
}
.ui-datepicker .ui-datepicker-next {
	right: 2px;
}
.ui-datepicker .ui-datepicker-prev-hover {
	left: 1px;
}
.ui-datepicker .ui-datepicker-next-hover {
	right: 1px;
}
.ui-datepicker .ui-datepicker-prev span,
.ui-datepicker .ui-datepicker-next span {
	display: block;
	position: absolute;
	left: 50%;
	margin-left: -8px;
	top: 50%;
	margin-top: -8px;
}
.ui-datepicker .ui-datepicker-title {
	margin: 0 2.3em;
	line-height: 1.8em;
	text-align: center;
}
.ui-datepicker .ui-datepicker-title select {
	font-size: 1em;
	margin: 1px 0;
}
.ui-datepicker select.ui-datepicker-month,
.ui-datepicker select.ui-datepicker-year {
	width: 45%;
}
.ui-datepicker table {
	width: 100%;
	font-size: .9em;
	border-collapse: collapse;
	margin: 0 0 .4em;
}
.ui-datepicker th {
	padding: .7em .3em;
	text-align: center;
	font-weight: bold;
	border: 0;
}
.ui-datepicker td {
	border: 0;
	padding: 1px;
}
.ui-datepicker td span,
.ui-datepicker td a {
	display: block;
	padding: .2em;
	text-align: right;
	text-decoration: none;
}
.ui-datepicker .ui-datepicker-buttonpane {
	background-image: none;
	margin: .7em 0 0 0;
	padding: 0 .2em;
	border-left: 0;
	border-right: 0;
	border-bottom: 0;
}
.ui-datepicker .ui-datepicker-buttonpane button {
	float: right;
	margin: .5em .2em .4em;
	cursor: pointer;
	padding: .2em .6em .3em .6em;
	width: auto;
	overflow: visible;
}
.ui-datepicker .ui-datepicker-buttonpane button.ui-datepicker-current {
	float: left;
}

/* with multiple calendars */
.ui-datepicker.ui-datepicker-multi {
	width: auto;
}
.ui-datepicker-multi .ui-datepicker-group {
	float: left;
}
.ui-datepicker-multi .ui-datepicker-group table {
	width: 95%;
	margin: 0 auto .4em;
}
.ui-datepicker-multi-2 .ui-datepicker-group {
	width: 50%;
}
.ui-datepicker-multi-3 .ui-datepicker-group {
	width: 33.3%;
}
.ui-datepicker-multi-4 .ui-datepicker-group {
	width: 25%;
}
.ui-datepicker-multi .ui-datepicker-group-last .ui-datepicker-header,
.ui-datepicker-multi .ui-datepicker-group-middle .ui-datepicker-header {
	border-left-width: 0;
}
.ui-datepicker-multi .ui-datepicker-buttonpane {
	clear: left;
}
.ui-datepicker-row-break {
	clear: both;
	width: 100%;
	font-size: 0;
}

/* RTL support */
.ui-datepicker-rtl {
	direction: rtl;
}
.ui-datepicker-rtl .ui-datepicker-prev {
	right: 2px;
	left: auto;
}
.ui-datepicker-rtl .ui-datepicker-next {
	left: 2px;
	right: auto;
}
.ui-datepicker-rtl .ui-datepicker-prev:hover {
	right: 1px;
	left: auto;
}
.ui-datepicker-rtl .ui-datepicker-next:hover {
	left: 1px;
	right: auto;
}
.ui-datepicker-rtl .ui-datepicker-buttonpane {
	clear: right;
}
.ui-datepicker-rtl .ui-datepicker-buttonpane button {
	float: left;
}
.ui-datepicker-rtl .ui-datepicker-buttonpane button.ui-datepicker-current,
.ui-datepicker-rtl .ui-datepicker-group {
	float: right;
}
.ui-datepicker-rtl .ui-datepicker-group-last .ui-datepicker-header,
.ui-datepicker-rtl .ui-datepicker-group-middle .ui-datepicker-header {
	border-right-width: 0;
	border-left-width: 1px;
}
.ui-dialog {
	overflow: hidden;
	position: absolute;
	top: 0;
	left: 0;
	padding: .2em;
	outline: 0;
}
.ui-dialog .ui-dialog-titlebar {
	padding: .4em 1em;
	position: relative;
}
.ui-dialog .ui-dialog-title {
	float: left;
	margin: .1em 0;
	white-space: nowrap;
	width: 90%;
	overflow: hidden;
	text-overflow: ellipsis;
}
.ui-dialog .ui-dialog-titlebar-close {
	position: absolute;
	right: .3em;
	top: 50%;
	width: 20px;
	margin: -10px 0 0 0;
	padding: 1px;
	height: 20px;
}
.ui-dialog .ui-dialog-content {
	position: relative;
	border: 0;
	padding: .5em 1em;
	background: none;
	overflow: auto;
}
.ui-dialog .ui-dialog-buttonpane {
	text-align: left;
	border-width: 1px 0 0 0;
	background-image: none;
	margin-top: .5em;
	padding: .3em 1em .5em .4em;
}
.ui-dialog .ui-dialog-buttonpane .ui-dialog-buttonset {
	float: right;
}
.ui-dialog .ui-dialog-buttonpane button {
	margin: .5em .4em .5em 0;
	cursor: pointer;
}
.ui-dialog .ui-resizable-se {
	width: 12px;
	height: 12px;
	right: -5px;
	bottom: -5px;
	background-position: 16px 16px;
}
.ui-draggable .ui-dialog-titlebar {
	cursor: move;
}
.ui-draggable-handle {
	-ms-touch-action: none;
	touch-action: none;
}
.ui-menu {
	list-style: none;
	padding: 0;
	margin: 0;
	display: block;
	outline: none;
}
.ui-menu .ui-menu {
	position: absolute;
}
.ui-menu .ui-menu-item {
	position: relative;
	margin: 0;
	padding: 3px 1em 3px .4em;
	cursor: pointer;
	min-height: 0; /* support: IE7 */
	/* support: IE10, see #8844 */
	list-style-image: url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
}
.ui-menu .ui-menu-divider {
	margin: 5px 0;
	height: 0;
	font-size: 0;
	line-height: 0;
	border-width: 1px 0 0 0;
}
.ui-menu .ui-state-focus,
.ui-menu .ui-state-active {
	margin: -1px;
}

/* icon support */
.ui-menu-icons {
	position: relative;
}
.ui-menu-icons .ui-menu-item {
	padding-left: 2em;
}

/* left-aligned */
.ui-menu .ui-icon {
	position: absolute;
	top: 0;
	bottom: 0;
	left: .2em;
	margin: auto 0;
}

/* right-aligned */
.ui-menu .ui-menu-icon {
	left: auto;
	right: 0;
}
.ui-progressbar {
	height: 2em;
	text-align: left;
	overflow: hidden;
}
.ui-progressbar .ui-progressbar-value {
	margin: -1px;
	height: 100%;
}
.ui-progressbar .ui-progressbar-overlay {
	background: url("data:image/gif;base64,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");
	height: 100%;
	filter: alpha(opacity=25); /* support: IE8 */
	opacity: 0.25;
}
.ui-progressbar-indeterminate .ui-progressbar-value {
	background-image: none;
}
.ui-resizable {
	position: relative;
}
.ui-resizable-handle {
	position: absolute;
	font-size: 0.1px;
	display: block;
	-ms-touch-action: none;
	touch-action: none;
}
.ui-resizable-disabled .ui-resizable-handle,
.ui-resizable-autohide .ui-resizable-handle {
	display: none;
}
.ui-resizable-n {
	cursor: n-resize;
	height: 7px;
	width: 100%;
	top: -5px;
	left: 0;
}
.ui-resizable-s {
	cursor: s-resize;
	height: 7px;
	width: 100%;
	bottom: -5px;
	left: 0;
}
.ui-resizable-e {
	cursor: e-resize;
	width: 7px;
	right: -5px;
	top: 0;
	height: 100%;
}
.ui-resizable-w {
	cursor: w-resize;
	width: 7px;
	left: -5px;
	top: 0;
	height: 100%;
}
.ui-resizable-se {
	cursor: se-resize;
	width: 12px;
	height: 12px;
	right: 1px;
	bottom: 1px;
}
.ui-resizable-sw {
	cursor: sw-resize;
	width: 9px;
	height: 9px;
	left: -5px;
	bottom: -5px;
}
.ui-resizable-nw {
	cursor: nw-resize;
	width: 9px;
	height: 9px;
	left: -5px;
	top: -5px;
}
.ui-resizable-ne {
	cursor: ne-resize;
	width: 9px;
	height: 9px;
	right: -5px;
	top: -5px;
}
.ui-selectable {
	-ms-touch-action: none;
	touch-action: none;
}
.ui-selectable-helper {
	position: absolute;
	z-index: 100;
	border: 1px dotted black;
}
.ui-selectmenu-menu {
	padding: 0;
	margin: 0;
	position: absolute;
	top: 0;
	left: 0;
	display: none;
}
.ui-selectmenu-menu .ui-menu {
	overflow: auto;
	/* Support: IE7 */
	overflow-x: hidden;
	padding-bottom: 1px;
}
.ui-selectmenu-menu .ui-menu .ui-selectmenu-optgroup {
	font-size: 1em;
	font-weight: bold;
	line-height: 1.5;
	padding: 2px 0.4em;
	margin: 0.5em 0 0 0;
	height: auto;
	border: 0;
}
.ui-selectmenu-open {
	display: block;
}
.ui-selectmenu-button {
	display: inline-block;
	overflow: hidden;
	position: relative;
	text-decoration: none;
	cursor: pointer;
}
.ui-selectmenu-button span.ui-icon {
	right: 0.5em;
	left: auto;
	margin-top: -8px;
	position: absolute;
	top: 50%;
}
.ui-selectmenu-button span.ui-selectmenu-text {
	text-align: left;
	padding: 0.4em 2.1em 0.4em 1em;
	display: block;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.ui-slider {
	position: relative;
	text-align: left;
}
.ui-slider .ui-slider-handle {
	position: absolute;
	z-index: 2;
	width: 1.2em;
	height: 1.2em;
	cursor: default;
	-ms-touch-action: none;
	touch-action: none;
}
.ui-slider .ui-slider-range {
	position: absolute;
	z-index: 1;
	font-size: .7em;
	display: block;
	border: 0;
	background-position: 0 0;
}

/* support: IE8 - See #6727 */
.ui-slider.ui-state-disabled .ui-slider-handle,
.ui-slider.ui-state-disabled .ui-slider-range {
	filter: inherit;
}

.ui-slider-horizontal {
	height: .8em;
}
.ui-slider-horizontal .ui-slider-handle {
	top: -.3em;
	margin-left: -.6em;
}
.ui-slider-horizontal .ui-slider-range {
	top: 0;
	height: 100%;
}
.ui-slider-horizontal .ui-slider-range-min {
	left: 0;
}
.ui-slider-horizontal .ui-slider-range-max {
	right: 0;
}

.ui-slider-vertical {
	width: .8em;
	height: 100px;
}
.ui-slider-vertical .ui-slider-handle {
	left: -.3em;
	margin-left: 0;
	margin-bottom: -.6em;
}
.ui-slider-vertical .ui-slider-range {
	left: 0;
	width: 100%;
}
.ui-slider-vertical .ui-slider-range-min {
	bottom: 0;
}
.ui-slider-vertical .ui-slider-range-max {
	top: 0;
}
.ui-sortable-handle {
	-ms-touch-action: none;
	touch-action: none;
}
.ui-spinner {
	position: relative;
	display: inline-block;
	overflow: hidden;
	padding: 0;
	vertical-align: middle;
}
.ui-spinner-input {
	border: none;
	background: none;
	color: inherit;
	padding: 0;
	margin: .2em 0;
	vertical-align: middle;
	margin-left: .4em;
	margin-right: 22px;
}
.ui-spinner-button {
	width: 16px;
	height: 50%;
	font-size: .5em;
	padding: 0;
	margin: 0;
	text-align: center;
	position: absolute;
	cursor: default;
	display: block;
	overflow: hidden;
	right: 0;
}
/* more specificity required here to override default borders */
.ui-spinner a.ui-spinner-button {
	border-top: none;
	border-bottom: none;
	border-right: none;
}
/* vertically center icon */
.ui-spinner .ui-icon {
	position: absolute;
	margin-top: -8px;
	top: 50%;
	left: 0;
}
.ui-spinner-up {
	top: 0;
}
.ui-spinner-down {
	bottom: 0;
}

/* TR overrides */
.ui-spinner .ui-icon-triangle-1-s {
	/* need to fix icons sprite */
	background-position: -65px -16px;
}
.ui-tabs {
	position: relative;/* position: relative prevents IE scroll bug (element with position: relative inside container with overflow: auto appear as "fixed") */
	padding: .2em;
}
.ui-tabs .ui-tabs-nav {
	margin: 0;
	padding: .2em .2em 0;
}
.ui-tabs .ui-tabs-nav li {
	list-style: none;
	float: left;
	position: relative;
	top: 0;
	margin: 1px .2em 0 0;
	border-bottom-width: 0;
	padding: 0;
	white-space: nowrap;
}
.ui-tabs .ui-tabs-nav .ui-tabs-anchor {
	float: left;
	padding: .5em 1em;
	text-decoration: none;
}
.ui-tabs .ui-tabs-nav li.ui-tabs-active {
	margin-bottom: -1px;
	padding-bottom: 1px;
}
.ui-tabs .ui-tabs-nav li.ui-tabs-active .ui-tabs-anchor,
.ui-tabs .ui-tabs-nav li.ui-state-disabled .ui-tabs-anchor,
.ui-tabs .ui-tabs-nav li.ui-tabs-loading .ui-tabs-anchor {
	cursor: text;
}
.ui-tabs-collapsible .ui-tabs-nav li.ui-tabs-active .ui-tabs-anchor {
	cursor: pointer;
}
.ui-tabs .ui-tabs-panel {
	display: block;
	border-width: 0;
	padding: 1em 1.4em;
	background: none;
}
.ui-tooltip {
	padding: 8px;
	position: absolute;
	z-index: 9999;
	max-width: 300px;
	-webkit-box-shadow: 0 0 5px #aaa;
	box-shadow: 0 0 5px #aaa;
}
body .ui-tooltip {
	border-width: 2px;
}

/* Component containers
----------------------------------*/
.ui-widget {
	font-family: Verdana,Arial,sans-serif;
	font-size: 1.1em;
}
.ui-widget .ui-widget {
	font-size: 1em;
}
.ui-widget input,
.ui-widget select,
.ui-widget textarea,
.ui-widget button {
	font-family: Verdana,Arial,sans-serif;
	font-size: 1em;
}
.ui-widget-content {
	border: 1px solid #aaaaaa;
	background: #ffffff url("images/ui-bg_flat_75_ffffff_40x100.png") 50% 50% repeat-x;
	color: #222222;
}
.ui-widget-content a {
	color: #222222;
}
.ui-widget-header {
	border: 1px solid #aaaaaa;
	background: #cccccc url("images/ui-bg_highlight-soft_75_cccccc_1x100.png") 50% 50% repeat-x;
	color: #222222;
	font-weight: bold;
}
.ui-widget-header a {
	color: #222222;
}

/* Interaction states
----------------------------------*/
.ui-state-default,
.ui-widget-content .ui-state-default,
.ui-widget-header .ui-state-default {
	border: 1px solid #d3d3d3;
	background: #e6e6e6 url("images/ui-bg_glass_75_e6e6e6_1x400.png") 50% 50% repeat-x;
	font-weight: normal;
	color: #555555;
}
.ui-state-default a,
.ui-state-default a:link,
.ui-state-default a:visited {
	color: #555555;
	text-decoration: none;
}
.ui-state-hover,
.ui-widget-content .ui-state-hover,
.ui-widget-header .ui-state-hover,
.ui-state-focus,
.ui-widget-content .ui-state-focus,
.ui-widget-header .ui-state-focus {
	border: 1px solid #999999;
	background: #dadada url("images/ui-bg_glass_75_dadada_1x400.png") 50% 50% repeat-x;
	font-weight: normal;
	color: #212121;
}
.ui-state-hover a,
.ui-state-hover a:hover,
.ui-state-hover a:link,
.ui-state-hover a:visited,
.ui-state-focus a,
.ui-state-focus a:hover,
.ui-state-focus a:link,
.ui-state-focus a:visited {
	color: #212121;
	text-decoration: none;
}
.ui-state-active,
.ui-widget-content .ui-state-active,
.ui-widget-header .ui-state-active {
	border: 1px solid #aaaaaa;
	background: #ffffff url("images/ui-bg_glass_65_ffffff_1x400.png") 50% 50% repeat-x;
	font-weight: normal;
	color: #212121;
}
.ui-state-active a,
.ui-state-active a:link,
.ui-state-active a:visited {
	color: #212121;
	text-decoration: none;
}

/* Interaction Cues
----------------------------------*/
.ui-state-highlight,
.ui-widget-content .ui-state-highlight,
.ui-widget-header .ui-state-highlight {
	border: 1px solid #fcefa1;
	background: #fbf9ee url("images/ui-bg_glass_55_fbf9ee_1x400.png") 50% 50% repeat-x;
	color: #363636;
}
.ui-state-highlight a,
.ui-widget-content .ui-state-highlight a,
.ui-widget-header .ui-state-highlight a {
	color: #363636;
}
.ui-state-error,
.ui-widget-content .ui-state-error,
.ui-widget-header .ui-state-error {
	border: 1px solid #cd0a0a;
	background: #fef1ec url("images/ui-bg_glass_95_fef1ec_1x400.png") 50% 50% repeat-x;
	color: #cd0a0a;
}
.ui-state-error a,
.ui-widget-content .ui-state-error a,
.ui-widget-header .ui-state-error a {
	color: #cd0a0a;
}
.ui-state-error-text,
.ui-widget-content .ui-state-error-text,
.ui-widget-header .ui-state-error-text {
	color: #cd0a0a;
}
.ui-priority-primary,
.ui-widget-content .ui-priority-primary,
.ui-widget-header .ui-priority-primary {
	font-weight: bold;
}
.ui-priority-secondary,
.ui-widget-content .ui-priority-secondary,
.ui-widget-header .ui-priority-secondary {
	opacity: .7;
	filter:Alpha(Opacity=70); /* support: IE8 */
	font-weight: normal;
}
.ui-state-disabled,
.ui-widget-content .ui-state-disabled,
.ui-widget-header .ui-state-disabled {
	opacity: .35;
	filter:Alpha(Opacity=35); /* support: IE8 */
	background-image: none;
}
.ui-state-disabled .ui-icon {
	filter:Alpha(Opacity=35); /* support: IE8 - See #6059 */
}

/* Icons
----------------------------------*/

/* states and images */
.ui-icon {
	width: 16px;
	height: 16px;
}
.ui-icon,
.ui-widget-content .ui-icon {
	background-image: url("images/ui-icons_222222_256x240.png");
}
.ui-widget-header .ui-icon {
	background-image: url("images/ui-icons_222222_256x240.png");
}
.ui-state-default .ui-icon {
	background-image: url("images/ui-icons_888888_256x240.png");
}
.ui-state-hover .ui-icon,
.ui-state-focus .ui-icon {
	background-image: url("images/ui-icons_454545_256x240.png");
}
.ui-state-active .ui-icon {
	background-image: url("images/ui-icons_454545_256x240.png");
}
.ui-state-highlight .ui-icon {
	background-image: url("images/ui-icons_2e83ff_256x240.png");
}
.ui-state-error .ui-icon,
.ui-state-error-text .ui-icon {
	background-image: url("images/ui-icons_cd0a0a_256x240.png");
}

/* positioning */
.ui-icon-blank { background-position: 16px 16px; }
.ui-icon-carat-1-n { background-position: 0 0; }
.ui-icon-carat-1-ne { background-position: -16px 0; }
.ui-icon-carat-1-e { background-position: -32px 0; }
.ui-icon-carat-1-se { background-position: -48px 0; }
.ui-icon-carat-1-s { background-position: -64px 0; }
.ui-icon-carat-1-sw { background-position: -80px 0; }
.ui-icon-carat-1-w { background-position: -96px 0; }
.ui-icon-carat-1-nw { background-position: -112px 0; }
.ui-icon-carat-2-n-s { background-position: -128px 0; }
.ui-icon-carat-2-e-w { background-position: -144px 0; }
.ui-icon-triangle-1-n { background-position: 0 -16px; }
.ui-icon-triangle-1-ne { background-position: -16px -16px; }
.ui-icon-triangle-1-e { background-position: -32px -16px; }
.ui-icon-triangle-1-se { background-position: -48px -16px; }
.ui-icon-triangle-1-s { background-position: -64px -16px; }
.ui-icon-triangle-1-sw { background-position: -80px -16px; }
.ui-icon-triangle-1-w { background-position: -96px -16px; }
.ui-icon-triangle-1-nw { background-position: -112px -16px; }
.ui-icon-triangle-2-n-s { background-position: -128px -16px; }
.ui-icon-triangle-2-e-w { background-position: -144px -16px; }
.ui-icon-arrow-1-n { background-position: 0 -32px; }
.ui-icon-arrow-1-ne { background-position: -16px -32px; }
.ui-icon-arrow-1-e { background-position: -32px -32px; }
.ui-icon-arrow-1-se { background-position: -48px -32px; }
.ui-icon-arrow-1-s { background-position: -64px -32px; }
.ui-icon-arrow-1-sw { background-position: -80px -32px; }
.ui-icon-arrow-1-w { background-position: -96px -32px; }
.ui-icon-arrow-1-nw { background-position: -112px -32px; }
.ui-icon-arrow-2-n-s { background-position: -128px -32px; }
.ui-icon-arrow-2-ne-sw { background-position: -144px -32px; }
.ui-icon-arrow-2-e-w { background-position: -160px -32px; }
.ui-icon-arrow-2-se-nw { background-position: -176px -32px; }
.ui-icon-arrowstop-1-n { background-position: -192px -32px; }
.ui-icon-arrowstop-1-e { background-position: -208px -32px; }
.ui-icon-arrowstop-1-s { background-position: -224px -32px; }
.ui-icon-arrowstop-1-w { background-position: -240px -32px; }
.ui-icon-arrowthick-1-n { background-position: 0 -48px; }
.ui-icon-arrowthick-1-ne { background-position: -16px -48px; }
.ui-icon-arrowthick-1-e { background-position: -32px -48px; }
.ui-icon-arrowthick-1-se { background-position: -48px -48px; }
.ui-icon-arrowthick-1-s { background-position: -64px -48px; }
.ui-icon-arrowthick-1-sw { background-position: -80px -48px; }
.ui-icon-arrowthick-1-w { background-position: -96px -48px; }
.ui-icon-arrowthick-1-nw { background-position: -112px -48px; }
.ui-icon-arrowthick-2-n-s { background-position: -128px -48px; }
.ui-icon-arrowthick-2-ne-sw { background-position: -144px -48px; }
.ui-icon-arrowthick-2-e-w { background-position: -160px -48px; }
.ui-icon-arrowthick-2-se-nw { background-position: -176px -48px; }
.ui-icon-arrowthickstop-1-n { background-position: -192px -48px; }
.ui-icon-arrowthickstop-1-e { background-position: -208px -48px; }
.ui-icon-arrowthickstop-1-s { background-position: -224px -48px; }
.ui-icon-arrowthickstop-1-w { background-position: -240px -48px; }
.ui-icon-arrowreturnthick-1-w { background-position: 0 -64px; }
.ui-icon-arrowreturnthick-1-n { background-position: -16px -64px; }
.ui-icon-arrowreturnthick-1-e { background-position: -32px -64px; }
.ui-icon-arrowreturnthick-1-s { background-position: -48px -64px; }
.ui-icon-arrowreturn-1-w { background-position: -64px -64px; }
.ui-icon-arrowreturn-1-n { background-position: -80px -64px; }
.ui-icon-arrowreturn-1-e { background-position: -96px -64px; }
.ui-icon-arrowreturn-1-s { background-position: -112px -64px; }
.ui-icon-arrowrefresh-1-w { background-position: -128px -64px; }
.ui-icon-arrowrefresh-1-n { background-position: -144px -64px; }
.ui-icon-arrowrefresh-1-e { background-position: -160px -64px; }
.ui-icon-arrowrefresh-1-s { background-position: -176px -64px; }
.ui-icon-arrow-4 { background-position: 0 -80px; }
.ui-icon-arrow-4-diag { background-position: -16px -80px; }
.ui-icon-extlink { background-position: -32px -80px; }
.ui-icon-newwin { background-position: -48px -80px; }
.ui-icon-refresh { background-position: -64px -80px; }
.ui-icon-shuffle { background-position: -80px -80px; }
.ui-icon-transfer-e-w { background-position: -96px -80px; }
.ui-icon-transferthick-e-w { background-position: -112px -80px; }
.ui-icon-folder-collapsed { background-position: 0 -96px; }
.ui-icon-folder-open { background-position: -16px -96px; }
.ui-icon-document { background-position: -32px -96px; }
.ui-icon-document-b { background-position: -48px -96px; }
.ui-icon-note { background-position: -64px -96px; }
.ui-icon-mail-closed { background-position: -80px -96px; }
.ui-icon-mail-open { background-position: -96px -96px; }
.ui-icon-suitcase { background-position: -112px -96px; }
.ui-icon-comment { background-position: -128px -96px; }
.ui-icon-person { background-position: -144px -96px; }
.ui-icon-print { background-position: -160px -96px; }
.ui-icon-trash { background-position: -176px -96px; }
.ui-icon-locked { background-position: -192px -96px; }
.ui-icon-unlocked { background-position: -208px -96px; }
.ui-icon-bookmark { background-position: -224px -96px; }
.ui-icon-tag { background-position: -240px -96px; }
.ui-icon-home { background-position: 0 -112px; }
.ui-icon-flag { background-position: -16px -112px; }
.ui-icon-calendar { background-position: -32px -112px; }
.ui-icon-cart { background-position: -48px -112px; }
.ui-icon-pencil { background-position: -64px -112px; }
.ui-icon-clock { background-position: -80px -112px; }
.ui-icon-disk { background-position: -96px -112px; }
.ui-icon-calculator { background-position: -112px -112px; }
.ui-icon-zoomin { background-position: -128px -112px; }
.ui-icon-zoomout { background-position: -144px -112px; }
.ui-icon-search { background-position: -160px -112px; }
.ui-icon-wrench { background-position: -176px -112px; }
.ui-icon-gear { background-position: -192px -112px; }
.ui-icon-heart { background-position: -208px -112px; }
.ui-icon-star { background-position: -224px -112px; }
.ui-icon-link { background-position: -240px -112px; }
.ui-icon-cancel { background-position: 0 -128px; }
.ui-icon-plus { background-position: -16px -128px; }
.ui-icon-plusthick { background-position: -32px -128px; }
.ui-icon-minus { background-position: -48px -128px; }
.ui-icon-minusthick { background-position: -64px -128px; }
.ui-icon-close { background-position: -80px -128px; }
.ui-icon-closethick { background-position: -96px -128px; }
.ui-icon-key { background-position: -112px -128px; }
.ui-icon-lightbulb { background-position: -128px -128px; }
.ui-icon-scissors { background-position: -144px -128px; }
.ui-icon-clipboard { background-position: -160px -128px; }
.ui-icon-copy { background-position: -176px -128px; }
.ui-icon-contact { background-position: -192px -128px; }
.ui-icon-image { background-position: -208px -128px; }
.ui-icon-video { background-position: -224px -128px; }
.ui-icon-script { background-position: -240px -128px; }
.ui-icon-alert { background-position: 0 -144px; }
.ui-icon-info { background-position: -16px -144px; }
.ui-icon-notice { background-position: -32px -144px; }
.ui-icon-help { background-position: -48px -144px; }
.ui-icon-check { background-position: -64px -144px; }
.ui-icon-bullet { background-position: -80px -144px; }
.ui-icon-radio-on { background-position: -96px -144px; }
.ui-icon-radio-off { background-position: -112px -144px; }
.ui-icon-pin-w { background-position: -128px -144px; }
.ui-icon-pin-s { background-position: -144px -144px; }
.ui-icon-play { background-position: 0 -160px; }
.ui-icon-pause { background-position: -16px -160px; }
.ui-icon-seek-next { background-position: -32px -160px; }
.ui-icon-seek-prev { background-position: -48px -160px; }
.ui-icon-seek-end { background-position: -64px -160px; }
.ui-icon-seek-start { background-position: -80px -160px; }
/* ui-icon-seek-first is deprecated, use ui-icon-seek-start instead */
.ui-icon-seek-first { background-position: -80px -160px; }
.ui-icon-stop { background-position: -96px -160px; }
.ui-icon-eject { background-position: -112px -160px; }
.ui-icon-volume-off { background-position: -128px -160px; }
.ui-icon-volume-on { background-position: -144px -160px; }
.ui-icon-power { background-position: 0 -176px; }
.ui-icon-signal-diag { background-position: -16px -176px; }
.ui-icon-signal { background-position: -32px -176px; }
.ui-icon-battery-0 { background-position: -48px -176px; }
.ui-icon-battery-1 { background-position: -64px -176px; }
.ui-icon-battery-2 { background-position: -80px -176px; }
.ui-icon-battery-3 { background-position: -96px -176px; }
.ui-icon-circle-plus { background-position: 0 -192px; }
.ui-icon-circle-minus { background-position: -16px -192px; }
.ui-icon-circle-close { background-position: -32px -192px; }
.ui-icon-circle-triangle-e { background-position: -48px -192px; }
.ui-icon-circle-triangle-s { background-position: -64px -192px; }
.ui-icon-circle-triangle-w { background-position: -80px -192px; }
.ui-icon-circle-triangle-n { background-position: -96px -192px; }
.ui-icon-circle-arrow-e { background-position: -112px -192px; }
.ui-icon-circle-arrow-s { background-position: -128px -192px; }
.ui-icon-circle-arrow-w { background-position: -144px -192px; }
.ui-icon-circle-arrow-n { background-position: -160px -192px; }
.ui-icon-circle-zoomin { background-position: -176px -192px; }
.ui-icon-circle-zoomout { background-position: -192px -192px; }
.ui-icon-circle-check { background-position: -208px -192px; }
.ui-icon-circlesmall-plus { background-position: 0 -208px; }
.ui-icon-circlesmall-minus { background-position: -16px -208px; }
.ui-icon-circlesmall-close { background-position: -32px -208px; }
.ui-icon-squaresmall-plus { background-position: -48px -208px; }
.ui-icon-squaresmall-minus { background-position: -64px -208px; }
.ui-icon-squaresmall-close { background-position: -80px -208px; }
.ui-icon-grip-dotted-vertical { background-position: 0 -224px; }
.ui-icon-grip-dotted-horizontal { background-position: -16px -224px; }
.ui-icon-grip-solid-vertical { background-position: -32px -224px; }
.ui-icon-grip-solid-horizontal { background-position: -48px -224px; }
.ui-icon-gripsmall-diagonal-se { background-position: -64px -224px; }
.ui-icon-grip-diagonal-se { background-position: -80px -224px; }


/* Misc visuals
----------------------------------*/

/* Corner radius */
.ui-corner-all,
.ui-corner-top,
.ui-corner-left,
.ui-corner-tl {
	border-top-left-radius: 4px;
}
.ui-corner-all,
.ui-corner-top,
.ui-corner-right,
.ui-corner-tr {
	border-top-right-radius: 4px;
}
.ui-corner-all,
.ui-corner-bottom,
.ui-corner-left,
.ui-corner-bl {
	border-bottom-left-radius: 4px;
}
.ui-corner-all,
.ui-corner-bottom,
.ui-corner-right,
.ui-corner-br {
	border-bottom-right-radius: 4px;
}

/* Overlays */
.ui-widget-overlay {
	background: #aaaaaa url("images/ui-bg_flat_0_aaaaaa_40x100.png") 50% 50% repeat-x;
	opacity: .3;
	filter: Alpha(Opacity=30); /* support: IE8 */
}
.ui-widget-shadow {
	margin: -8px 0 0 -8px;
	padding: 8px;
	background: #aaaaaa url("images/ui-bg_flat_0_aaaaaa_40x100.png") 50% 50% repeat-x;
	opacity: .3;
	filter: Alpha(Opacity=30); /* support: IE8 */
	border-radius: 8px;
}`;
    
    $('head').append('<style type="text/css">' + jqcss + '</style>');
    // JQUERYUI STUFF
    if(!jQuery.ui){(function(factory){if(typeof define==="function"&&define.amd){define(["jquery"],factory);}else{factory(jQuery);}}(function($){$.ui=$.ui||{};$.extend($.ui,{version:"1.11.4",keyCode:{BACKSPACE:8,COMMA:188,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SPACE:32,TAB:9,UP:38}});$.fn.extend({scrollParent:function(includeHidden){var position=this.css("position"),excludeStaticParent=position==="absolute",overflowRegex=includeHidden?/(auto|scroll|hidden)/:/(auto|scroll)/,scrollParent=this.parents().filter(function(){var parent=$(this);if(excludeStaticParent&&parent.css("position")==="static"){return false;}
    return overflowRegex.test(parent.css("overflow")+parent.css("overflow-y")+parent.css("overflow-x"));}).eq(0);return position==="fixed"||!scrollParent.length?$(this[0].ownerDocument||document):scrollParent;},uniqueId:(function(){var uuid=0;return function(){return this.each(function(){if(!this.id){this.id="ui-id-"+(++uuid);}});};})(),removeUniqueId:function(){return this.each(function(){if(/^ui-id-\d+$/.test(this.id)){$(this).removeAttr("id");}});}});function focusable(element,isTabIndexNotNaN){var map,mapName,img,nodeName=element.nodeName.toLowerCase();if("area"===nodeName){map=element.parentNode;mapName=map.name;if(!element.href||!mapName||map.nodeName.toLowerCase()!=="map"){return false;}
    img=$("img[usemap='#"+mapName+"']")[0];return!!img&&visible(img);}
    return(/^(input|select|textarea|button|object)$/.test(nodeName)?!element.disabled:"a"===nodeName?element.href||isTabIndexNotNaN:isTabIndexNotNaN)&&visible(element);}
    function visible(element){return $.expr.filters.visible(element)&&!$(element).parents().addBack().filter(function(){return $.css(this,"visibility")==="hidden";}).length;}
    $.extend($.expr[":"],{data:$.expr.createPseudo?$.expr.createPseudo(function(dataName){return function(elem){return!!$.data(elem,dataName);};}):function(elem,i,match){return!!$.data(elem,match[3]);},focusable:function(element){return focusable(element,!isNaN($.attr(element,"tabindex")));},tabbable:function(element){var tabIndex=$.attr(element,"tabindex"),isTabIndexNaN=isNaN(tabIndex);return(isTabIndexNaN||tabIndex>=0)&&focusable(element,!isTabIndexNaN);}});if(!$("<a>").outerWidth(1).jquery){$.each(["Width","Height"],function(i,name){var side=name==="Width"?["Left","Right"]:["Top","Bottom"],type=name.toLowerCase(),orig={innerWidth:$.fn.innerWidth,innerHeight:$.fn.innerHeight,outerWidth:$.fn.outerWidth,outerHeight:$.fn.outerHeight};function reduce(elem,size,border,margin){$.each(side,function(){size-=parseFloat($.css(elem,"padding"+this))||0;if(border){size-=parseFloat($.css(elem,"border"+this+"Width"))||0;}
    if(margin){size-=parseFloat($.css(elem,"margin"+this))||0;}});return size;}
    $.fn["inner"+name]=function(size){if(size===undefined){return orig["inner"+name].call(this);}
    return this.each(function(){$(this).css(type,reduce(this,size)+"px");});};$.fn["outer"+name]=function(size,margin){if(typeof size!=="number"){return orig["outer"+name].call(this,size);}
    return this.each(function(){$(this).css(type,reduce(this,size,true,margin)+"px");});};});}
    if(!$.fn.addBack){$.fn.addBack=function(selector){return this.add(selector==null?this.prevObject:this.prevObject.filter(selector));};}
    if($("<a>").data("a-b","a").removeData("a-b").data("a-b")){$.fn.removeData=(function(removeData){return function(key){if(arguments.length){return removeData.call(this,$.camelCase(key));}else{return removeData.call(this);}};})($.fn.removeData);}
    $.ui.ie=!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase());$.fn.extend({focus:(function(orig){return function(delay,fn){return typeof delay==="number"?this.each(function(){var elem=this;setTimeout(function(){$(elem).focus();if(fn){fn.call(elem);}},delay);}):orig.apply(this,arguments);};})($.fn.focus),disableSelection:(function(){var eventType="onselectstart"in document.createElement("div")?"selectstart":"mousedown";return function(){return this.bind(eventType+".ui-disableSelection",function(event){event.preventDefault();});};})(),enableSelection:function(){return this.unbind(".ui-disableSelection");},zIndex:function(zIndex){if(zIndex!==undefined){return this.css("zIndex",zIndex);}
    if(this.length){var elem=$(this[0]),position,value;while(elem.length&&elem[0]!==document){position=elem.css("position");if(position==="absolute"||position==="relative"||position==="fixed"){value=parseInt(elem.css("zIndex"),10);if(!isNaN(value)&&value!==0){return value;}}
    elem=elem.parent();}}
    return 0;}});$.ui.plugin={add:function(module,option,set){var i,proto=$.ui[module].prototype;for(i in set){proto.plugins[i]=proto.plugins[i]||[];proto.plugins[i].push([option,set[i]]);}},call:function(instance,name,args,allowDisconnected){var i,set=instance.plugins[name];if(!set){return;}
    if(!allowDisconnected&&(!instance.element[0].parentNode||instance.element[0].parentNode.nodeType===11)){return;}
    for(i=0;i<set.length;i++){if(instance.options[set[i][0]]){set[i][1].apply(instance.element,args);}}}};var widget_uuid=0,widget_slice=Array.prototype.slice;$.cleanData=(function(orig){return function(elems){var events,elem,i;for(i=0;(elem=elems[i])!=null;i++){try{events=$._data(elem,"events");if(events&&events.remove){$(elem).triggerHandler("remove");}}catch(e){}}
    orig(elems);};})($.cleanData);$.widget=function(name,base,prototype){var fullName,existingConstructor,constructor,basePrototype,proxiedPrototype={},namespace=name.split(".")[0];name=name.split(".")[1];fullName=namespace+"-"+name;if(!prototype){prototype=base;base=$.Widget;}
    $.expr[":"][fullName.toLowerCase()]=function(elem){return!!$.data(elem,fullName);};$[namespace]=$[namespace]||{};existingConstructor=$[namespace][name];constructor=$[namespace][name]=function(options,element){if(!this._createWidget){return new constructor(options,element);}
    if(arguments.length){this._createWidget(options,element);}};$.extend(constructor,existingConstructor,{version:prototype.version,_proto:$.extend({},prototype),_childConstructors:[]});basePrototype=new base();basePrototype.options=$.widget.extend({},basePrototype.options);$.each(prototype,function(prop,value){if(!$.isFunction(value)){proxiedPrototype[prop]=value;return;}
    proxiedPrototype[prop]=(function(){var _super=function(){return base.prototype[prop].apply(this,arguments);},_superApply=function(args){return base.prototype[prop].apply(this,args);};return function(){var __super=this._super,__superApply=this._superApply,returnValue;this._super=_super;this._superApply=_superApply;returnValue=value.apply(this,arguments);this._super=__super;this._superApply=__superApply;return returnValue;};})();});constructor.prototype=$.widget.extend(basePrototype,{widgetEventPrefix:existingConstructor?(basePrototype.widgetEventPrefix||name):name},proxiedPrototype,{constructor:constructor,namespace:namespace,widgetName:name,widgetFullName:fullName});if(existingConstructor){$.each(existingConstructor._childConstructors,function(i,child){var childPrototype=child.prototype;$.widget(childPrototype.namespace+"."+childPrototype.widgetName,constructor,child._proto);});delete existingConstructor._childConstructors;}else{base._childConstructors.push(constructor);}
    $.widget.bridge(name,constructor);return constructor;};$.widget.extend=function(target){var input=widget_slice.call(arguments,1),inputIndex=0,inputLength=input.length,key,value;for(;inputIndex<inputLength;inputIndex++){for(key in input[inputIndex]){value=input[inputIndex][key];if(input[inputIndex].hasOwnProperty(key)&&value!==undefined){if($.isPlainObject(value)){target[key]=$.isPlainObject(target[key])?$.widget.extend({},target[key],value):$.widget.extend({},value);}else{target[key]=value;}}}}
    return target;};$.widget.bridge=function(name,object){var fullName=object.prototype.widgetFullName||name;$.fn[name]=function(options){var isMethodCall=typeof options==="string",args=widget_slice.call(arguments,1),returnValue=this;if(isMethodCall){this.each(function(){var methodValue,instance=$.data(this,fullName);if(options==="instance"){returnValue=instance;return false;}
    if(!instance){return $.error("cannot call methods on "+name+" prior to initialization; "+"attempted to call method '"+options+"'");}
    if(!$.isFunction(instance[options])||options.charAt(0)==="_"){return $.error("no such method '"+options+"' for "+name+" widget instance");}
    methodValue=instance[options].apply(instance,args);if(methodValue!==instance&&methodValue!==undefined){returnValue=methodValue&&methodValue.jquery?returnValue.pushStack(methodValue.get()):methodValue;return false;}});}else{if(args.length){options=$.widget.extend.apply(null,[options].concat(args));}
    this.each(function(){var instance=$.data(this,fullName);if(instance){instance.option(options||{});if(instance._init){instance._init();}}else{$.data(this,fullName,new object(options,this));}});}
    return returnValue;};};$.Widget=function(){};$.Widget._childConstructors=[];$.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",defaultElement:"<div>",options:{disabled:false,create:null},_createWidget:function(options,element){element=$(element||this.defaultElement||this)[0];this.element=$(element);this.uuid=widget_uuid++;this.eventNamespace="."+this.widgetName+this.uuid;this.bindings=$();this.hoverable=$();this.focusable=$();if(element!==this){$.data(element,this.widgetFullName,this);this._on(true,this.element,{remove:function(event){if(event.target===element){this.destroy();}}});this.document=$(element.style?element.ownerDocument:element.document||element);this.window=$(this.document[0].defaultView||this.document[0].parentWindow);}
    this.options=$.widget.extend({},this.options,this._getCreateOptions(),options);this._create();this._trigger("create",null,this._getCreateEventData());this._init();},_getCreateOptions:$.noop,_getCreateEventData:$.noop,_create:$.noop,_init:$.noop,destroy:function(){this._destroy();this.element.unbind(this.eventNamespace).removeData(this.widgetFullName).removeData($.camelCase(this.widgetFullName));this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName+"-disabled "+"ui-state-disabled");this.bindings.unbind(this.eventNamespace);this.hoverable.removeClass("ui-state-hover");this.focusable.removeClass("ui-state-focus");},_destroy:$.noop,widget:function(){return this.element;},option:function(key,value){var options=key,parts,curOption,i;if(arguments.length===0){return $.widget.extend({},this.options);}
    if(typeof key==="string"){options={};parts=key.split(".");key=parts.shift();if(parts.length){curOption=options[key]=$.widget.extend({},this.options[key]);for(i=0;i<parts.length-1;i++){curOption[parts[i]]=curOption[parts[i]]||{};curOption=curOption[parts[i]];}
    key=parts.pop();if(arguments.length===1){return curOption[key]===undefined?null:curOption[key];}
    curOption[key]=value;}else{if(arguments.length===1){return this.options[key]===undefined?null:this.options[key];}
    options[key]=value;}}
    this._setOptions(options);return this;},_setOptions:function(options){var key;for(key in options){this._setOption(key,options[key]);}
    return this;},_setOption:function(key,value){this.options[key]=value;if(key==="disabled"){this.widget().toggleClass(this.widgetFullName+"-disabled",!!value);if(value){this.hoverable.removeClass("ui-state-hover");this.focusable.removeClass("ui-state-focus");}}
    return this;},enable:function(){return this._setOptions({disabled:false});},disable:function(){return this._setOptions({disabled:true});},_on:function(suppressDisabledCheck,element,handlers){var delegateElement,instance=this;if(typeof suppressDisabledCheck!=="boolean"){handlers=element;element=suppressDisabledCheck;suppressDisabledCheck=false;}
    if(!handlers){handlers=element;element=this.element;delegateElement=this.widget();}else{element=delegateElement=$(element);this.bindings=this.bindings.add(element);}
    $.each(handlers,function(event,handler){function handlerProxy(){if(!suppressDisabledCheck&&(instance.options.disabled===true||$(this).hasClass("ui-state-disabled"))){return;}
    return(typeof handler==="string"?instance[handler]:handler).apply(instance,arguments);}
    if(typeof handler!=="string"){handlerProxy.guid=handler.guid=handler.guid||handlerProxy.guid||$.guid++;}
    var match=event.match(/^([\w:-]*)\s*(.*)$/),eventName=match[1]+instance.eventNamespace,selector=match[2];if(selector){delegateElement.delegate(selector,eventName,handlerProxy);}else{element.bind(eventName,handlerProxy);}});},_off:function(element,eventName){eventName=(eventName||"").split(" ").join(this.eventNamespace+" ")+
    this.eventNamespace;element.unbind(eventName).undelegate(eventName);this.bindings=$(this.bindings.not(element).get());this.focusable=$(this.focusable.not(element).get());this.hoverable=$(this.hoverable.not(element).get());},_delay:function(handler,delay){function handlerProxy(){return(typeof handler==="string"?instance[handler]:handler).apply(instance,arguments);}
    var instance=this;return setTimeout(handlerProxy,delay||0);},_hoverable:function(element){this.hoverable=this.hoverable.add(element);this._on(element,{mouseenter:function(event){$(event.currentTarget).addClass("ui-state-hover");},mouseleave:function(event){$(event.currentTarget).removeClass("ui-state-hover");}});},_focusable:function(element){this.focusable=this.focusable.add(element);this._on(element,{focusin:function(event){$(event.currentTarget).addClass("ui-state-focus");},focusout:function(event){$(event.currentTarget).removeClass("ui-state-focus");}});},_trigger:function(type,event,data){var prop,orig,callback=this.options[type];data=data||{};event=$.Event(event);event.type=(type===this.widgetEventPrefix?type:this.widgetEventPrefix+type).toLowerCase();event.target=this.element[0];orig=event.originalEvent;if(orig){for(prop in orig){if(!(prop in event)){event[prop]=orig[prop];}}}
    this.element.trigger(event,data);return!($.isFunction(callback)&&callback.apply(this.element[0],[event].concat(data))===false||event.isDefaultPrevented());}};$.each({show:"fadeIn",hide:"fadeOut"},function(method,defaultEffect){$.Widget.prototype["_"+method]=function(element,options,callback){if(typeof options==="string"){options={effect:options};}
    var hasOptions,effectName=!options?method:options===true||typeof options==="number"?defaultEffect:options.effect||defaultEffect;options=options||{};if(typeof options==="number"){options={duration:options};}
    hasOptions=!$.isEmptyObject(options);options.complete=callback;if(options.delay){element.delay(options.delay);}
    if(hasOptions&&$.effects&&$.effects.effect[effectName]){element[method](options);}else if(effectName!==method&&element[effectName]){element[effectName](options.duration,options.easing,callback);}else{element.queue(function(next){$(this)[method]();if(callback){callback.call(element[0]);}
    next();});}};});var widget=$.widget;var mouseHandled=false;$(document).mouseup(function(){mouseHandled=false;});var mouse=$.widget("ui.mouse",{version:"1.11.4",options:{cancel:"input,textarea,button,select,option",distance:1,delay:0},_mouseInit:function(){var that=this;this.element.bind("mousedown."+this.widgetName,function(event){return that._mouseDown(event);}).bind("click."+this.widgetName,function(event){if(true===$.data(event.target,that.widgetName+".preventClickEvent")){$.removeData(event.target,that.widgetName+".preventClickEvent");event.stopImmediatePropagation();return false;}});this.started=false;},_mouseDestroy:function(){this.element.unbind("."+this.widgetName);if(this._mouseMoveDelegate){this.document.unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate);}},_mouseDown:function(event){if(mouseHandled){return;}
    this._mouseMoved=false;(this._mouseStarted&&this._mouseUp(event));this._mouseDownEvent=event;var that=this,btnIsLeft=(event.which===1),elIsCancel=(typeof this.options.cancel==="string"&&event.target.nodeName?$(event.target).closest(this.options.cancel).length:false);if(!btnIsLeft||elIsCancel||!this._mouseCapture(event)){return true;}
    this.mouseDelayMet=!this.options.delay;if(!this.mouseDelayMet){this._mouseDelayTimer=setTimeout(function(){that.mouseDelayMet=true;},this.options.delay);}
    if(this._mouseDistanceMet(event)&&this._mouseDelayMet(event)){this._mouseStarted=(this._mouseStart(event)!==false);if(!this._mouseStarted){event.preventDefault();return true;}}
    if(true===$.data(event.target,this.widgetName+".preventClickEvent")){$.removeData(event.target,this.widgetName+".preventClickEvent");}
    this._mouseMoveDelegate=function(event){return that._mouseMove(event);};this._mouseUpDelegate=function(event){return that._mouseUp(event);};this.document.bind("mousemove."+this.widgetName,this._mouseMoveDelegate).bind("mouseup."+this.widgetName,this._mouseUpDelegate);event.preventDefault();mouseHandled=true;return true;},_mouseMove:function(event){if(this._mouseMoved){if($.ui.ie&&(!document.documentMode||document.documentMode<9)&&!event.button){return this._mouseUp(event);}else if(!event.which){return this._mouseUp(event);}}
    if(event.which||event.button){this._mouseMoved=true;}
    if(this._mouseStarted){this._mouseDrag(event);return event.preventDefault();}
    if(this._mouseDistanceMet(event)&&this._mouseDelayMet(event)){this._mouseStarted=(this._mouseStart(this._mouseDownEvent,event)!==false);(this._mouseStarted?this._mouseDrag(event):this._mouseUp(event));}
    return!this._mouseStarted;},_mouseUp:function(event){this.document.unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate);if(this._mouseStarted){this._mouseStarted=false;if(event.target===this._mouseDownEvent.target){$.data(event.target,this.widgetName+".preventClickEvent",true);}
    this._mouseStop(event);}
    mouseHandled=false;return false;},_mouseDistanceMet:function(event){return(Math.max(Math.abs(this._mouseDownEvent.pageX-event.pageX),Math.abs(this._mouseDownEvent.pageY-event.pageY))>=this.options.distance);},_mouseDelayMet:function(){return this.mouseDelayMet;},_mouseStart:function(){},_mouseDrag:function(){},_mouseStop:function(){},_mouseCapture:function(){return true;}});(function(){$.ui=$.ui||{};var cachedScrollbarWidth,supportsOffsetFractions,max=Math.max,abs=Math.abs,round=Math.round,rhorizontal=/left|center|right/,rvertical=/top|center|bottom/,roffset=/[\+\-]\d+(\.[\d]+)?%?/,rposition=/^\w+/,rpercent=/%$/,_position=$.fn.position;function getOffsets(offsets,width,height){return[parseFloat(offsets[0])*(rpercent.test(offsets[0])?width/100:1),parseFloat(offsets[1])*(rpercent.test(offsets[1])?height/100:1)];}
    function parseCss(element,property){return parseInt($.css(element,property),10)||0;}
    function getDimensions(elem){var raw=elem[0];if(raw.nodeType===9){return{width:elem.width(),height:elem.height(),offset:{top:0,left:0}};}
    if($.isWindow(raw)){return{width:elem.width(),height:elem.height(),offset:{top:elem.scrollTop(),left:elem.scrollLeft()}};}
    if(raw.preventDefault){return{width:0,height:0,offset:{top:raw.pageY,left:raw.pageX}};}
    return{width:elem.outerWidth(),height:elem.outerHeight(),offset:elem.offset()};}
    $.position={scrollbarWidth:function(){if(cachedScrollbarWidth!==undefined){return cachedScrollbarWidth;}
    var w1,w2,div=$("<div style='display:block;position:absolute;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>"),innerDiv=div.children()[0];$("body").append(div);w1=innerDiv.offsetWidth;div.css("overflow","scroll");w2=innerDiv.offsetWidth;if(w1===w2){w2=div[0].clientWidth;}
    div.remove();return(cachedScrollbarWidth=w1-w2);},getScrollInfo:function(within){var overflowX=within.isWindow||within.isDocument?"":within.element.css("overflow-x"),overflowY=within.isWindow||within.isDocument?"":within.element.css("overflow-y"),hasOverflowX=overflowX==="scroll"||(overflowX==="auto"&&within.width<within.element[0].scrollWidth),hasOverflowY=overflowY==="scroll"||(overflowY==="auto"&&within.height<within.element[0].scrollHeight);return{width:hasOverflowY?$.position.scrollbarWidth():0,height:hasOverflowX?$.position.scrollbarWidth():0};},getWithinInfo:function(element){var withinElement=$(element||window),isWindow=$.isWindow(withinElement[0]),isDocument=!!withinElement[0]&&withinElement[0].nodeType===9;return{element:withinElement,isWindow:isWindow,isDocument:isDocument,offset:withinElement.offset()||{left:0,top:0},scrollLeft:withinElement.scrollLeft(),scrollTop:withinElement.scrollTop(),width:isWindow||isDocument?withinElement.width():withinElement.outerWidth(),height:isWindow||isDocument?withinElement.height():withinElement.outerHeight()};}};$.fn.position=function(options){if(!options||!options.of){return _position.apply(this,arguments);}
    options=$.extend({},options);var atOffset,targetWidth,targetHeight,targetOffset,basePosition,dimensions,target=$(options.of),within=$.position.getWithinInfo(options.within),scrollInfo=$.position.getScrollInfo(within),collision=(options.collision||"flip").split(" "),offsets={};dimensions=getDimensions(target);if(target[0].preventDefault){options.at="left top";}
    targetWidth=dimensions.width;targetHeight=dimensions.height;targetOffset=dimensions.offset;basePosition=$.extend({},targetOffset);$.each(["my","at"],function(){var pos=(options[this]||"").split(" "),horizontalOffset,verticalOffset;if(pos.length===1){pos=rhorizontal.test(pos[0])?pos.concat(["center"]):rvertical.test(pos[0])?["center"].concat(pos):["center","center"];}
    pos[0]=rhorizontal.test(pos[0])?pos[0]:"center";pos[1]=rvertical.test(pos[1])?pos[1]:"center";horizontalOffset=roffset.exec(pos[0]);verticalOffset=roffset.exec(pos[1]);offsets[this]=[horizontalOffset?horizontalOffset[0]:0,verticalOffset?verticalOffset[0]:0];options[this]=[rposition.exec(pos[0])[0],rposition.exec(pos[1])[0]];});if(collision.length===1){collision[1]=collision[0];}
    if(options.at[0]==="right"){basePosition.left+=targetWidth;}else if(options.at[0]==="center"){basePosition.left+=targetWidth/2;}
    if(options.at[1]==="bottom"){basePosition.top+=targetHeight;}else if(options.at[1]==="center"){basePosition.top+=targetHeight/2;}
    atOffset=getOffsets(offsets.at,targetWidth,targetHeight);basePosition.left+=atOffset[0];basePosition.top+=atOffset[1];return this.each(function(){var collisionPosition,using,elem=$(this),elemWidth=elem.outerWidth(),elemHeight=elem.outerHeight(),marginLeft=parseCss(this,"marginLeft"),marginTop=parseCss(this,"marginTop"),collisionWidth=elemWidth+marginLeft+parseCss(this,"marginRight")+scrollInfo.width,collisionHeight=elemHeight+marginTop+parseCss(this,"marginBottom")+scrollInfo.height,position=$.extend({},basePosition),myOffset=getOffsets(offsets.my,elem.outerWidth(),elem.outerHeight());if(options.my[0]==="right"){position.left-=elemWidth;}else if(options.my[0]==="center"){position.left-=elemWidth/2;}
    if(options.my[1]==="bottom"){position.top-=elemHeight;}else if(options.my[1]==="center"){position.top-=elemHeight/2;}
    position.left+=myOffset[0];position.top+=myOffset[1];if(!supportsOffsetFractions){position.left=round(position.left);position.top=round(position.top);}
    collisionPosition={marginLeft:marginLeft,marginTop:marginTop};$.each(["left","top"],function(i,dir){if($.ui.position[collision[i]]){$.ui.position[collision[i]][dir](position,{targetWidth:targetWidth,targetHeight:targetHeight,elemWidth:elemWidth,elemHeight:elemHeight,collisionPosition:collisionPosition,collisionWidth:collisionWidth,collisionHeight:collisionHeight,offset:[atOffset[0]+myOffset[0],atOffset[1]+myOffset[1]],my:options.my,at:options.at,within:within,elem:elem});}});if(options.using){using=function(props){var left=targetOffset.left-position.left,right=left+targetWidth-elemWidth,top=targetOffset.top-position.top,bottom=top+targetHeight-elemHeight,feedback={target:{element:target,left:targetOffset.left,top:targetOffset.top,width:targetWidth,height:targetHeight},element:{element:elem,left:position.left,top:position.top,width:elemWidth,height:elemHeight},horizontal:right<0?"left":left>0?"right":"center",vertical:bottom<0?"top":top>0?"bottom":"middle"};if(targetWidth<elemWidth&&abs(left+right)<targetWidth){feedback.horizontal="center";}
    if(targetHeight<elemHeight&&abs(top+bottom)<targetHeight){feedback.vertical="middle";}
    if(max(abs(left),abs(right))>max(abs(top),abs(bottom))){feedback.important="horizontal";}else{feedback.important="vertical";}
    options.using.call(this,props,feedback);};}
    elem.offset($.extend(position,{using:using}));});};$.ui.position={fit:{left:function(position,data){var within=data.within,withinOffset=within.isWindow?within.scrollLeft:within.offset.left,outerWidth=within.width,collisionPosLeft=position.left-data.collisionPosition.marginLeft,overLeft=withinOffset-collisionPosLeft,overRight=collisionPosLeft+data.collisionWidth-outerWidth-withinOffset,newOverRight;if(data.collisionWidth>outerWidth){if(overLeft>0&&overRight<=0){newOverRight=position.left+overLeft+data.collisionWidth-outerWidth-withinOffset;position.left+=overLeft-newOverRight;}else if(overRight>0&&overLeft<=0){position.left=withinOffset;}else{if(overLeft>overRight){position.left=withinOffset+outerWidth-data.collisionWidth;}else{position.left=withinOffset;}}}else if(overLeft>0){position.left+=overLeft;}else if(overRight>0){position.left-=overRight;}else{position.left=max(position.left-collisionPosLeft,position.left);}},top:function(position,data){var within=data.within,withinOffset=within.isWindow?within.scrollTop:within.offset.top,outerHeight=data.within.height,collisionPosTop=position.top-data.collisionPosition.marginTop,overTop=withinOffset-collisionPosTop,overBottom=collisionPosTop+data.collisionHeight-outerHeight-withinOffset,newOverBottom;if(data.collisionHeight>outerHeight){if(overTop>0&&overBottom<=0){newOverBottom=position.top+overTop+data.collisionHeight-outerHeight-withinOffset;position.top+=overTop-newOverBottom;}else if(overBottom>0&&overTop<=0){position.top=withinOffset;}else{if(overTop>overBottom){position.top=withinOffset+outerHeight-data.collisionHeight;}else{position.top=withinOffset;}}}else if(overTop>0){position.top+=overTop;}else if(overBottom>0){position.top-=overBottom;}else{position.top=max(position.top-collisionPosTop,position.top);}}},flip:{left:function(position,data){var within=data.within,withinOffset=within.offset.left+within.scrollLeft,outerWidth=within.width,offsetLeft=within.isWindow?within.scrollLeft:within.offset.left,collisionPosLeft=position.left-data.collisionPosition.marginLeft,overLeft=collisionPosLeft-offsetLeft,overRight=collisionPosLeft+data.collisionWidth-outerWidth-offsetLeft,myOffset=data.my[0]==="left"?-data.elemWidth:data.my[0]==="right"?data.elemWidth:0,atOffset=data.at[0]==="left"?data.targetWidth:data.at[0]==="right"?-data.targetWidth:0,offset=-2*data.offset[0],newOverRight,newOverLeft;if(overLeft<0){newOverRight=position.left+myOffset+atOffset+offset+data.collisionWidth-outerWidth-withinOffset;if(newOverRight<0||newOverRight<abs(overLeft)){position.left+=myOffset+atOffset+offset;}}else if(overRight>0){newOverLeft=position.left-data.collisionPosition.marginLeft+myOffset+atOffset+offset-offsetLeft;if(newOverLeft>0||abs(newOverLeft)<overRight){position.left+=myOffset+atOffset+offset;}}},top:function(position,data){var within=data.within,withinOffset=within.offset.top+within.scrollTop,outerHeight=within.height,offsetTop=within.isWindow?within.scrollTop:within.offset.top,collisionPosTop=position.top-data.collisionPosition.marginTop,overTop=collisionPosTop-offsetTop,overBottom=collisionPosTop+data.collisionHeight-outerHeight-offsetTop,top=data.my[1]==="top",myOffset=top?-data.elemHeight:data.my[1]==="bottom"?data.elemHeight:0,atOffset=data.at[1]==="top"?data.targetHeight:data.at[1]==="bottom"?-data.targetHeight:0,offset=-2*data.offset[1],newOverTop,newOverBottom;if(overTop<0){newOverBottom=position.top+myOffset+atOffset+offset+data.collisionHeight-outerHeight-withinOffset;if(newOverBottom<0||newOverBottom<abs(overTop)){position.top+=myOffset+atOffset+offset;}}else if(overBottom>0){newOverTop=position.top-data.collisionPosition.marginTop+myOffset+atOffset+offset-offsetTop;if(newOverTop>0||abs(newOverTop)<overBottom){position.top+=myOffset+atOffset+offset;}}}},flipfit:{left:function(){$.ui.position.flip.left.apply(this,arguments);$.ui.position.fit.left.apply(this,arguments);},top:function(){$.ui.position.flip.top.apply(this,arguments);$.ui.position.fit.top.apply(this,arguments);}}};(function(){var testElement,testElementParent,testElementStyle,offsetLeft,i,body=document.getElementsByTagName("body")[0],div=document.createElement("div");testElement=document.createElement(body?"div":"body");testElementStyle={visibility:"hidden",width:0,height:0,border:0,margin:0,background:"none"};if(body){$.extend(testElementStyle,{position:"absolute",left:"-1000px",top:"-1000px"});}
    for(i in testElementStyle){testElement.style[i]=testElementStyle[i];}
    testElement.appendChild(div);testElementParent=body||document.documentElement;testElementParent.insertBefore(testElement,testElementParent.firstChild);div.style.cssText="position: absolute; left: 10.7432222px;";offsetLeft=$(div).offset().left;supportsOffsetFractions=offsetLeft>10&&offsetLeft<11;testElement.innerHTML="";testElementParent.removeChild(testElement);})();})();var position=$.ui.position;$.widget("ui.draggable",$.ui.mouse,{version:"1.11.4",widgetEventPrefix:"drag",options:{addClasses:true,appendTo:"parent",axis:false,connectToSortable:false,containment:false,cursor:"auto",cursorAt:false,grid:false,handle:false,helper:"original",iframeFix:false,opacity:false,refreshPositions:false,revert:false,revertDuration:500,scope:"default",scroll:true,scrollSensitivity:20,scrollSpeed:20,snap:false,snapMode:"both",snapTolerance:20,stack:false,zIndex:false,drag:null,start:null,stop:null},_create:function(){if(this.options.helper==="original"){this._setPositionRelative();}
    if(this.options.addClasses){this.element.addClass("ui-draggable");}
    if(this.options.disabled){this.element.addClass("ui-draggable-disabled");}
    this._setHandleClassName();this._mouseInit();},_setOption:function(key,value){this._super(key,value);if(key==="handle"){this._removeHandleClassName();this._setHandleClassName();}},_destroy:function(){if((this.helper||this.element).is(".ui-draggable-dragging")){this.destroyOnClear=true;return;}
    this.element.removeClass("ui-draggable ui-draggable-dragging ui-draggable-disabled");this._removeHandleClassName();this._mouseDestroy();},_mouseCapture:function(event){var o=this.options;this._blurActiveElement(event);if(this.helper||o.disabled||$(event.target).closest(".ui-resizable-handle").length>0){return false;}
    this.handle=this._getHandle(event);if(!this.handle){return false;}
    this._blockFrames(o.iframeFix===true?"iframe":o.iframeFix);return true;},_blockFrames:function(selector){this.iframeBlocks=this.document.find(selector).map(function(){var iframe=$(this);return $("<div>").css("position","absolute").appendTo(iframe.parent()).outerWidth(iframe.outerWidth()).outerHeight(iframe.outerHeight()).offset(iframe.offset())[0];});},_unblockFrames:function(){if(this.iframeBlocks){this.iframeBlocks.remove();delete this.iframeBlocks;}},_blurActiveElement:function(event){var document=this.document[0];if(!this.handleElement.is(event.target)){return;}
    try{if(document.activeElement&&document.activeElement.nodeName.toLowerCase()!=="body"){$(document.activeElement).blur();}}catch(error){}},_mouseStart:function(event){var o=this.options;this.helper=this._createHelper(event);this.helper.addClass("ui-draggable-dragging");this._cacheHelperProportions();if($.ui.ddmanager){$.ui.ddmanager.current=this;}
    this._cacheMargins();this.cssPosition=this.helper.css("position");this.scrollParent=this.helper.scrollParent(true);this.offsetParent=this.helper.offsetParent();this.hasFixedAncestor=this.helper.parents().filter(function(){return $(this).css("position")==="fixed";}).length>0;this.positionAbs=this.element.offset();this._refreshOffsets(event);this.originalPosition=this.position=this._generatePosition(event,false);this.originalPageX=event.pageX;this.originalPageY=event.pageY;(o.cursorAt&&this._adjustOffsetFromHelper(o.cursorAt));this._setContainment();if(this._trigger("start",event)===false){this._clear();return false;}
    this._cacheHelperProportions();if($.ui.ddmanager&&!o.dropBehaviour){$.ui.ddmanager.prepareOffsets(this,event);}
    this._normalizeRightBottom();this._mouseDrag(event,true);if($.ui.ddmanager){$.ui.ddmanager.dragStart(this,event);}
    return true;},_refreshOffsets:function(event){this.offset={top:this.positionAbs.top-this.margins.top,left:this.positionAbs.left-this.margins.left,scroll:false,parent:this._getParentOffset(),relative:this._getRelativeOffset()};this.offset.click={left:event.pageX-this.offset.left,top:event.pageY-this.offset.top};},_mouseDrag:function(event,noPropagation){if(this.hasFixedAncestor){this.offset.parent=this._getParentOffset();}
    this.position=this._generatePosition(event,true);this.positionAbs=this._convertPositionTo("absolute");if(!noPropagation){var ui=this._uiHash();if(this._trigger("drag",event,ui)===false){this._mouseUp({});return false;}
    this.position=ui.position;}
    this.helper[0].style.left=this.position.left+"px";this.helper[0].style.top=this.position.top+"px";if($.ui.ddmanager){$.ui.ddmanager.drag(this,event);}
    return false;},_mouseStop:function(event){var that=this,dropped=false;if($.ui.ddmanager&&!this.options.dropBehaviour){dropped=$.ui.ddmanager.drop(this,event);}
    if(this.dropped){dropped=this.dropped;this.dropped=false;}
    if((this.options.revert==="invalid"&&!dropped)||(this.options.revert==="valid"&&dropped)||this.options.revert===true||($.isFunction(this.options.revert)&&this.options.revert.call(this.element,dropped))){$(this.helper).animate(this.originalPosition,parseInt(this.options.revertDuration,10),function(){if(that._trigger("stop",event)!==false){that._clear();}});}else{if(this._trigger("stop",event)!==false){this._clear();}}
    return false;},_mouseUp:function(event){this._unblockFrames();if($.ui.ddmanager){$.ui.ddmanager.dragStop(this,event);}
    if(this.handleElement.is(event.target)){this.element.focus();}
    return $.ui.mouse.prototype._mouseUp.call(this,event);},cancel:function(){if(this.helper.is(".ui-draggable-dragging")){this._mouseUp({});}else{this._clear();}
    return this;},_getHandle:function(event){return this.options.handle?!!$(event.target).closest(this.element.find(this.options.handle)).length:true;},_setHandleClassName:function(){this.handleElement=this.options.handle?this.element.find(this.options.handle):this.element;this.handleElement.addClass("ui-draggable-handle");},_removeHandleClassName:function(){this.handleElement.removeClass("ui-draggable-handle");},_createHelper:function(event){var o=this.options,helperIsFunction=$.isFunction(o.helper),helper=helperIsFunction?$(o.helper.apply(this.element[0],[event])):(o.helper==="clone"?this.element.clone().removeAttr("id"):this.element);if(!helper.parents("body").length){helper.appendTo((o.appendTo==="parent"?this.element[0].parentNode:o.appendTo));}
    if(helperIsFunction&&helper[0]===this.element[0]){this._setPositionRelative();}
    if(helper[0]!==this.element[0]&&!(/(fixed|absolute)/).test(helper.css("position"))){helper.css("position","absolute");}
    return helper;},_setPositionRelative:function(){if(!(/^(?:r|a|f)/).test(this.element.css("position"))){this.element[0].style.position="relative";}},_adjustOffsetFromHelper:function(obj){if(typeof obj==="string"){obj=obj.split(" ");}
    if($.isArray(obj)){obj={left:+obj[0],top:+obj[1]||0};}
    if("left"in obj){this.offset.click.left=obj.left+this.margins.left;}
    if("right"in obj){this.offset.click.left=this.helperProportions.width-obj.right+this.margins.left;}
    if("top"in obj){this.offset.click.top=obj.top+this.margins.top;}
    if("bottom"in obj){this.offset.click.top=this.helperProportions.height-obj.bottom+this.margins.top;}},_isRootNode:function(element){return(/(html|body)/i).test(element.tagName)||element===this.document[0];},_getParentOffset:function(){var po=this.offsetParent.offset(),document=this.document[0];if(this.cssPosition==="absolute"&&this.scrollParent[0]!==document&&$.contains(this.scrollParent[0],this.offsetParent[0])){po.left+=this.scrollParent.scrollLeft();po.top+=this.scrollParent.scrollTop();}
    if(this._isRootNode(this.offsetParent[0])){po={top:0,left:0};}
    return{top:po.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:po.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)};},_getRelativeOffset:function(){if(this.cssPosition!=="relative"){return{top:0,left:0};}
    var p=this.element.position(),scrollIsRootNode=this._isRootNode(this.scrollParent[0]);return{top:p.top-(parseInt(this.helper.css("top"),10)||0)+(!scrollIsRootNode?this.scrollParent.scrollTop():0),left:p.left-(parseInt(this.helper.css("left"),10)||0)+(!scrollIsRootNode?this.scrollParent.scrollLeft():0)};},_cacheMargins:function(){this.margins={left:(parseInt(this.element.css("marginLeft"),10)||0),top:(parseInt(this.element.css("marginTop"),10)||0),right:(parseInt(this.element.css("marginRight"),10)||0),bottom:(parseInt(this.element.css("marginBottom"),10)||0)};},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()};},_setContainment:function(){var isUserScrollable,c,ce,o=this.options,document=this.document[0];this.relativeContainer=null;if(!o.containment){this.containment=null;return;}
    if(o.containment==="window"){this.containment=[$(window).scrollLeft()-this.offset.relative.left-this.offset.parent.left,$(window).scrollTop()-this.offset.relative.top-this.offset.parent.top,$(window).scrollLeft()+$(window).width()-this.helperProportions.width-this.margins.left,$(window).scrollTop()+($(window).height()||document.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top];return;}
    if(o.containment==="document"){this.containment=[0,0,$(document).width()-this.helperProportions.width-this.margins.left,($(document).height()||document.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top];return;}
    if(o.containment.constructor===Array){this.containment=o.containment;return;}
    if(o.containment==="parent"){o.containment=this.helper[0].parentNode;}
    c=$(o.containment);ce=c[0];if(!ce){return;}
    isUserScrollable=/(scroll|auto)/.test(c.css("overflow"));this.containment=[(parseInt(c.css("borderLeftWidth"),10)||0)+(parseInt(c.css("paddingLeft"),10)||0),(parseInt(c.css("borderTopWidth"),10)||0)+(parseInt(c.css("paddingTop"),10)||0),(isUserScrollable?Math.max(ce.scrollWidth,ce.offsetWidth):ce.offsetWidth)-
    (parseInt(c.css("borderRightWidth"),10)||0)-
    (parseInt(c.css("paddingRight"),10)||0)-
    this.helperProportions.width-
    this.margins.left-
    this.margins.right,(isUserScrollable?Math.max(ce.scrollHeight,ce.offsetHeight):ce.offsetHeight)-
    (parseInt(c.css("borderBottomWidth"),10)||0)-
    (parseInt(c.css("paddingBottom"),10)||0)-
    this.helperProportions.height-
    this.margins.top-
    this.margins.bottom];this.relativeContainer=c;},_convertPositionTo:function(d,pos){if(!pos){pos=this.position;}
    var mod=d==="absolute"?1:-1,scrollIsRootNode=this._isRootNode(this.scrollParent[0]);return{top:(pos.top+
    this.offset.relative.top*mod+
    this.offset.parent.top*mod-
    ((this.cssPosition==="fixed"?-this.offset.scroll.top:(scrollIsRootNode?0:this.offset.scroll.top))*mod)),left:(pos.left+
    this.offset.relative.left*mod+
    this.offset.parent.left*mod-
    ((this.cssPosition==="fixed"?-this.offset.scroll.left:(scrollIsRootNode?0:this.offset.scroll.left))*mod))};},_generatePosition:function(event,constrainPosition){var containment,co,top,left,o=this.options,scrollIsRootNode=this._isRootNode(this.scrollParent[0]),pageX=event.pageX,pageY=event.pageY;if(!scrollIsRootNode||!this.offset.scroll){this.offset.scroll={top:this.scrollParent.scrollTop(),left:this.scrollParent.scrollLeft()};}
    if(constrainPosition){if(this.containment){if(this.relativeContainer){co=this.relativeContainer.offset();containment=[this.containment[0]+co.left,this.containment[1]+co.top,this.containment[2]+co.left,this.containment[3]+co.top];}else{containment=this.containment;}
    if(event.pageX-this.offset.click.left<containment[0]){pageX=containment[0]+this.offset.click.left;}
    if(event.pageY-this.offset.click.top<containment[1]){pageY=containment[1]+this.offset.click.top;}
    if(event.pageX-this.offset.click.left>containment[2]){pageX=containment[2]+this.offset.click.left;}
    if(event.pageY-this.offset.click.top>containment[3]){pageY=containment[3]+this.offset.click.top;}}
    if(o.grid){top=o.grid[1]?this.originalPageY+Math.round((pageY-this.originalPageY)/o.grid[1])*o.grid[1]:this.originalPageY;pageY=containment?((top-this.offset.click.top>=containment[1]||top-this.offset.click.top>containment[3])?top:((top-this.offset.click.top>=containment[1])?top-o.grid[1]:top+o.grid[1])):top;left=o.grid[0]?this.originalPageX+Math.round((pageX-this.originalPageX)/o.grid[0])*o.grid[0]:this.originalPageX;pageX=containment?((left-this.offset.click.left>=containment[0]||left-this.offset.click.left>containment[2])?left:((left-this.offset.click.left>=containment[0])?left-o.grid[0]:left+o.grid[0])):left;}
    if(o.axis==="y"){pageX=this.originalPageX;}
    if(o.axis==="x"){pageY=this.originalPageY;}}
    return{top:(pageY-
    this.offset.click.top-
    this.offset.relative.top-
    this.offset.parent.top+
    (this.cssPosition==="fixed"?-this.offset.scroll.top:(scrollIsRootNode?0:this.offset.scroll.top))),left:(pageX-
    this.offset.click.left-
    this.offset.relative.left-
    this.offset.parent.left+
    (this.cssPosition==="fixed"?-this.offset.scroll.left:(scrollIsRootNode?0:this.offset.scroll.left)))};},_clear:function(){this.helper.removeClass("ui-draggable-dragging");if(this.helper[0]!==this.element[0]&&!this.cancelHelperRemoval){this.helper.remove();}
    this.helper=null;this.cancelHelperRemoval=false;if(this.destroyOnClear){this.destroy();}},_normalizeRightBottom:function(){if(this.options.axis!=="y"&&this.helper.css("right")!=="auto"){this.helper.width(this.helper.width());this.helper.css("right","auto");}
    if(this.options.axis!=="x"&&this.helper.css("bottom")!=="auto"){this.helper.height(this.helper.height());this.helper.css("bottom","auto");}},_trigger:function(type,event,ui){ui=ui||this._uiHash();$.ui.plugin.call(this,type,[event,ui,this],true);if(/^(drag|start|stop)/.test(type)){this.positionAbs=this._convertPositionTo("absolute");ui.offset=this.positionAbs;}
    return $.Widget.prototype._trigger.call(this,type,event,ui);},plugins:{},_uiHash:function(){return{helper:this.helper,position:this.position,originalPosition:this.originalPosition,offset:this.positionAbs};}});$.ui.plugin.add("draggable","connectToSortable",{start:function(event,ui,draggable){var uiSortable=$.extend({},ui,{item:draggable.element});draggable.sortables=[];$(draggable.options.connectToSortable).each(function(){var sortable=$(this).sortable("instance");if(sortable&&!sortable.options.disabled){draggable.sortables.push(sortable);sortable.refreshPositions();sortable._trigger("activate",event,uiSortable);}});},stop:function(event,ui,draggable){var uiSortable=$.extend({},ui,{item:draggable.element});draggable.cancelHelperRemoval=false;$.each(draggable.sortables,function(){var sortable=this;if(sortable.isOver){sortable.isOver=0;draggable.cancelHelperRemoval=true;sortable.cancelHelperRemoval=false;sortable._storedCSS={position:sortable.placeholder.css("position"),top:sortable.placeholder.css("top"),left:sortable.placeholder.css("left")};sortable._mouseStop(event);sortable.options.helper=sortable.options._helper;}else{sortable.cancelHelperRemoval=true;sortable._trigger("deactivate",event,uiSortable);}});},drag:function(event,ui,draggable){$.each(draggable.sortables,function(){var innermostIntersecting=false,sortable=this;sortable.positionAbs=draggable.positionAbs;sortable.helperProportions=draggable.helperProportions;sortable.offset.click=draggable.offset.click;if(sortable._intersectsWith(sortable.containerCache)){innermostIntersecting=true;$.each(draggable.sortables,function(){this.positionAbs=draggable.positionAbs;this.helperProportions=draggable.helperProportions;this.offset.click=draggable.offset.click;if(this!==sortable&&this._intersectsWith(this.containerCache)&&$.contains(sortable.element[0],this.element[0])){innermostIntersecting=false;}
    return innermostIntersecting;});}
    if(innermostIntersecting){if(!sortable.isOver){sortable.isOver=1;draggable._parent=ui.helper.parent();sortable.currentItem=ui.helper.appendTo(sortable.element).data("ui-sortable-item",true);sortable.options._helper=sortable.options.helper;sortable.options.helper=function(){return ui.helper[0];};event.target=sortable.currentItem[0];sortable._mouseCapture(event,true);sortable._mouseStart(event,true,true);sortable.offset.click.top=draggable.offset.click.top;sortable.offset.click.left=draggable.offset.click.left;sortable.offset.parent.left-=draggable.offset.parent.left-
    sortable.offset.parent.left;sortable.offset.parent.top-=draggable.offset.parent.top-
    sortable.offset.parent.top;draggable._trigger("toSortable",event);draggable.dropped=sortable.element;$.each(draggable.sortables,function(){this.refreshPositions();});draggable.currentItem=draggable.element;sortable.fromOutside=draggable;}
    if(sortable.currentItem){sortable._mouseDrag(event);ui.position=sortable.position;}}else{if(sortable.isOver){sortable.isOver=0;sortable.cancelHelperRemoval=true;sortable.options._revert=sortable.options.revert;sortable.options.revert=false;sortable._trigger("out",event,sortable._uiHash(sortable));sortable._mouseStop(event,true);sortable.options.revert=sortable.options._revert;sortable.options.helper=sortable.options._helper;if(sortable.placeholder){sortable.placeholder.remove();}
    ui.helper.appendTo(draggable._parent);draggable._refreshOffsets(event);ui.position=draggable._generatePosition(event,true);draggable._trigger("fromSortable",event);draggable.dropped=false;$.each(draggable.sortables,function(){this.refreshPositions();});}}});}});$.ui.plugin.add("draggable","cursor",{start:function(event,ui,instance){var t=$("body"),o=instance.options;if(t.css("cursor")){o._cursor=t.css("cursor");}
    t.css("cursor",o.cursor);},stop:function(event,ui,instance){var o=instance.options;if(o._cursor){$("body").css("cursor",o._cursor);}}});$.ui.plugin.add("draggable","opacity",{start:function(event,ui,instance){var t=$(ui.helper),o=instance.options;if(t.css("opacity")){o._opacity=t.css("opacity");}
    t.css("opacity",o.opacity);},stop:function(event,ui,instance){var o=instance.options;if(o._opacity){$(ui.helper).css("opacity",o._opacity);}}});$.ui.plugin.add("draggable","scroll",{start:function(event,ui,i){if(!i.scrollParentNotHidden){i.scrollParentNotHidden=i.helper.scrollParent(false);}
    if(i.scrollParentNotHidden[0]!==i.document[0]&&i.scrollParentNotHidden[0].tagName!=="HTML"){i.overflowOffset=i.scrollParentNotHidden.offset();}},drag:function(event,ui,i){var o=i.options,scrolled=false,scrollParent=i.scrollParentNotHidden[0],document=i.document[0];if(scrollParent!==document&&scrollParent.tagName!=="HTML"){if(!o.axis||o.axis!=="x"){if((i.overflowOffset.top+scrollParent.offsetHeight)-event.pageY<o.scrollSensitivity){scrollParent.scrollTop=scrolled=scrollParent.scrollTop+o.scrollSpeed;}else if(event.pageY-i.overflowOffset.top<o.scrollSensitivity){scrollParent.scrollTop=scrolled=scrollParent.scrollTop-o.scrollSpeed;}}
    if(!o.axis||o.axis!=="y"){if((i.overflowOffset.left+scrollParent.offsetWidth)-event.pageX<o.scrollSensitivity){scrollParent.scrollLeft=scrolled=scrollParent.scrollLeft+o.scrollSpeed;}else if(event.pageX-i.overflowOffset.left<o.scrollSensitivity){scrollParent.scrollLeft=scrolled=scrollParent.scrollLeft-o.scrollSpeed;}}}else{if(!o.axis||o.axis!=="x"){if(event.pageY-$(document).scrollTop()<o.scrollSensitivity){scrolled=$(document).scrollTop($(document).scrollTop()-o.scrollSpeed);}else if($(window).height()-(event.pageY-$(document).scrollTop())<o.scrollSensitivity){scrolled=$(document).scrollTop($(document).scrollTop()+o.scrollSpeed);}}
    if(!o.axis||o.axis!=="y"){if(event.pageX-$(document).scrollLeft()<o.scrollSensitivity){scrolled=$(document).scrollLeft($(document).scrollLeft()-o.scrollSpeed);}else if($(window).width()-(event.pageX-$(document).scrollLeft())<o.scrollSensitivity){scrolled=$(document).scrollLeft($(document).scrollLeft()+o.scrollSpeed);}}}
    if(scrolled!==false&&$.ui.ddmanager&&!o.dropBehaviour){$.ui.ddmanager.prepareOffsets(i,event);}}});$.ui.plugin.add("draggable","snap",{start:function(event,ui,i){var o=i.options;i.snapElements=[];$(o.snap.constructor!==String?(o.snap.items||":data(ui-draggable)"):o.snap).each(function(){var $t=$(this),$o=$t.offset();if(this!==i.element[0]){i.snapElements.push({item:this,width:$t.outerWidth(),height:$t.outerHeight(),top:$o.top,left:$o.left});}});},drag:function(event,ui,inst){var ts,bs,ls,rs,l,r,t,b,i,first,o=inst.options,d=o.snapTolerance,x1=ui.offset.left,x2=x1+inst.helperProportions.width,y1=ui.offset.top,y2=y1+inst.helperProportions.height;for(i=inst.snapElements.length-1;i>=0;i--){l=inst.snapElements[i].left-inst.margins.left;r=l+inst.snapElements[i].width;t=inst.snapElements[i].top-inst.margins.top;b=t+inst.snapElements[i].height;if(x2<l-d||x1>r+d||y2<t-d||y1>b+d||!$.contains(inst.snapElements[i].item.ownerDocument,inst.snapElements[i].item)){if(inst.snapElements[i].snapping){(inst.options.snap.release&&inst.options.snap.release.call(inst.element,event,$.extend(inst._uiHash(),{snapItem:inst.snapElements[i].item})));}
    inst.snapElements[i].snapping=false;continue;}
    if(o.snapMode!=="inner"){ts=Math.abs(t-y2)<=d;bs=Math.abs(b-y1)<=d;ls=Math.abs(l-x2)<=d;rs=Math.abs(r-x1)<=d;if(ts){ui.position.top=inst._convertPositionTo("relative",{top:t-inst.helperProportions.height,left:0}).top;}
    if(bs){ui.position.top=inst._convertPositionTo("relative",{top:b,left:0}).top;}
    if(ls){ui.position.left=inst._convertPositionTo("relative",{top:0,left:l-inst.helperProportions.width}).left;}
    if(rs){ui.position.left=inst._convertPositionTo("relative",{top:0,left:r}).left;}}
    first=(ts||bs||ls||rs);if(o.snapMode!=="outer"){ts=Math.abs(t-y1)<=d;bs=Math.abs(b-y2)<=d;ls=Math.abs(l-x1)<=d;rs=Math.abs(r-x2)<=d;if(ts){ui.position.top=inst._convertPositionTo("relative",{top:t,left:0}).top;}
    if(bs){ui.position.top=inst._convertPositionTo("relative",{top:b-inst.helperProportions.height,left:0}).top;}
    if(ls){ui.position.left=inst._convertPositionTo("relative",{top:0,left:l}).left;}
    if(rs){ui.position.left=inst._convertPositionTo("relative",{top:0,left:r-inst.helperProportions.width}).left;}}
    if(!inst.snapElements[i].snapping&&(ts||bs||ls||rs||first)){(inst.options.snap.snap&&inst.options.snap.snap.call(inst.element,event,$.extend(inst._uiHash(),{snapItem:inst.snapElements[i].item})));}
    inst.snapElements[i].snapping=(ts||bs||ls||rs||first);}}});$.ui.plugin.add("draggable","stack",{start:function(event,ui,instance){var min,o=instance.options,group=$.makeArray($(o.stack)).sort(function(a,b){return(parseInt($(a).css("zIndex"),10)||0)-(parseInt($(b).css("zIndex"),10)||0);});if(!group.length){return;}
    min=parseInt($(group[0]).css("zIndex"),10)||0;$(group).each(function(i){$(this).css("zIndex",min+i);});this.css("zIndex",(min+group.length));}});$.ui.plugin.add("draggable","zIndex",{start:function(event,ui,instance){var t=$(ui.helper),o=instance.options;if(t.css("zIndex")){o._zIndex=t.css("zIndex");}
    t.css("zIndex",o.zIndex);},stop:function(event,ui,instance){var o=instance.options;if(o._zIndex){$(ui.helper).css("zIndex",o._zIndex);}}});var draggable=$.ui.draggable;$.widget("ui.droppable",{version:"1.11.4",widgetEventPrefix:"drop",options:{accept:"*",activeClass:false,addClasses:true,greedy:false,hoverClass:false,scope:"default",tolerance:"intersect",activate:null,deactivate:null,drop:null,out:null,over:null},_create:function(){var proportions,o=this.options,accept=o.accept;this.isover=false;this.isout=true;this.accept=$.isFunction(accept)?accept:function(d){return d.is(accept);};this.proportions=function(){if(arguments.length){proportions=arguments[0];}else{return proportions?proportions:proportions={width:this.element[0].offsetWidth,height:this.element[0].offsetHeight};}};this._addToManager(o.scope);o.addClasses&&this.element.addClass("ui-droppable");},_addToManager:function(scope){$.ui.ddmanager.droppables[scope]=$.ui.ddmanager.droppables[scope]||[];$.ui.ddmanager.droppables[scope].push(this);},_splice:function(drop){var i=0;for(;i<drop.length;i++){if(drop[i]===this){drop.splice(i,1);}}},_destroy:function(){var drop=$.ui.ddmanager.droppables[this.options.scope];this._splice(drop);this.element.removeClass("ui-droppable ui-droppable-disabled");},_setOption:function(key,value){if(key==="accept"){this.accept=$.isFunction(value)?value:function(d){return d.is(value);};}else if(key==="scope"){var drop=$.ui.ddmanager.droppables[this.options.scope];this._splice(drop);this._addToManager(value);}
    this._super(key,value);},_activate:function(event){var draggable=$.ui.ddmanager.current;if(this.options.activeClass){this.element.addClass(this.options.activeClass);}
    if(draggable){this._trigger("activate",event,this.ui(draggable));}},_deactivate:function(event){var draggable=$.ui.ddmanager.current;if(this.options.activeClass){this.element.removeClass(this.options.activeClass);}
    if(draggable){this._trigger("deactivate",event,this.ui(draggable));}},_over:function(event){var draggable=$.ui.ddmanager.current;if(!draggable||(draggable.currentItem||draggable.element)[0]===this.element[0]){return;}
    if(this.accept.call(this.element[0],(draggable.currentItem||draggable.element))){if(this.options.hoverClass){this.element.addClass(this.options.hoverClass);}
    this._trigger("over",event,this.ui(draggable));}},_out:function(event){var draggable=$.ui.ddmanager.current;if(!draggable||(draggable.currentItem||draggable.element)[0]===this.element[0]){return;}
    if(this.accept.call(this.element[0],(draggable.currentItem||draggable.element))){if(this.options.hoverClass){this.element.removeClass(this.options.hoverClass);}
    this._trigger("out",event,this.ui(draggable));}},_drop:function(event,custom){var draggable=custom||$.ui.ddmanager.current,childrenIntersection=false;if(!draggable||(draggable.currentItem||draggable.element)[0]===this.element[0]){return false;}
    this.element.find(":data(ui-droppable)").not(".ui-draggable-dragging").each(function(){var inst=$(this).droppable("instance");if(inst.options.greedy&&!inst.options.disabled&&inst.options.scope===draggable.options.scope&&inst.accept.call(inst.element[0],(draggable.currentItem||draggable.element))&&$.ui.intersect(draggable,$.extend(inst,{offset:inst.element.offset()}),inst.options.tolerance,event)){childrenIntersection=true;return false;}});if(childrenIntersection){return false;}
    if(this.accept.call(this.element[0],(draggable.currentItem||draggable.element))){if(this.options.activeClass){this.element.removeClass(this.options.activeClass);}
    if(this.options.hoverClass){this.element.removeClass(this.options.hoverClass);}
    this._trigger("drop",event,this.ui(draggable));return this.element;}
    return false;},ui:function(c){return{draggable:(c.currentItem||c.element),helper:c.helper,position:c.position,offset:c.positionAbs};}});$.ui.intersect=(function(){function isOverAxis(x,reference,size){return(x>=reference)&&(x<(reference+size));}
    return function(draggable,droppable,toleranceMode,event){if(!droppable.offset){return false;}
    var x1=(draggable.positionAbs||draggable.position.absolute).left+draggable.margins.left,y1=(draggable.positionAbs||draggable.position.absolute).top+draggable.margins.top,x2=x1+draggable.helperProportions.width,y2=y1+draggable.helperProportions.height,l=droppable.offset.left,t=droppable.offset.top,r=l+droppable.proportions().width,b=t+droppable.proportions().height;switch(toleranceMode){case"fit":return(l<=x1&&x2<=r&&t<=y1&&y2<=b);case"intersect":return(l<x1+(draggable.helperProportions.width/2)&&x2-(draggable.helperProportions.width/2)<r&&t<y1+(draggable.helperProportions.height/2)&&y2-(draggable.helperProportions.height/2)<b);case"pointer":return isOverAxis(event.pageY,t,droppable.proportions().height)&&isOverAxis(event.pageX,l,droppable.proportions().width);case"touch":return((y1>=t&&y1<=b)||(y2>=t&&y2<=b)||(y1<t&&y2>b))&&((x1>=l&&x1<=r)||(x2>=l&&x2<=r)||(x1<l&&x2>r));default:return false;}};})();$.ui.ddmanager={current:null,droppables:{"default":[]},prepareOffsets:function(t,event){var i,j,m=$.ui.ddmanager.droppables[t.options.scope]||[],type=event?event.type:null,list=(t.currentItem||t.element).find(":data(ui-droppable)").addBack();droppablesLoop:for(i=0;i<m.length;i++){if(m[i].options.disabled||(t&&!m[i].accept.call(m[i].element[0],(t.currentItem||t.element)))){continue;}
    for(j=0;j<list.length;j++){if(list[j]===m[i].element[0]){m[i].proportions().height=0;continue droppablesLoop;}}
    m[i].visible=m[i].element.css("display")!=="none";if(!m[i].visible){continue;}
    if(type==="mousedown"){m[i]._activate.call(m[i],event);}
    m[i].offset=m[i].element.offset();m[i].proportions({width:m[i].element[0].offsetWidth,height:m[i].element[0].offsetHeight});}},drop:function(draggable,event){var dropped=false;$.each(($.ui.ddmanager.droppables[draggable.options.scope]||[]).slice(),function(){if(!this.options){return;}
    if(!this.options.disabled&&this.visible&&$.ui.intersect(draggable,this,this.options.tolerance,event)){dropped=this._drop.call(this,event)||dropped;}
    if(!this.options.disabled&&this.visible&&this.accept.call(this.element[0],(draggable.currentItem||draggable.element))){this.isout=true;this.isover=false;this._deactivate.call(this,event);}});return dropped;},dragStart:function(draggable,event){draggable.element.parentsUntil("body").bind("scroll.droppable",function(){if(!draggable.options.refreshPositions){$.ui.ddmanager.prepareOffsets(draggable,event);}});},drag:function(draggable,event){if(draggable.options.refreshPositions){$.ui.ddmanager.prepareOffsets(draggable,event);}
    $.each($.ui.ddmanager.droppables[draggable.options.scope]||[],function(){if(this.options.disabled||this.greedyChild||!this.visible){return;}
    var parentInstance,scope,parent,intersects=$.ui.intersect(draggable,this,this.options.tolerance,event),c=!intersects&&this.isover?"isout":(intersects&&!this.isover?"isover":null);if(!c){return;}
    if(this.options.greedy){scope=this.options.scope;parent=this.element.parents(":data(ui-droppable)").filter(function(){return $(this).droppable("instance").options.scope===scope;});if(parent.length){parentInstance=$(parent[0]).droppable("instance");parentInstance.greedyChild=(c==="isover");}}
    if(parentInstance&&c==="isover"){parentInstance.isover=false;parentInstance.isout=true;parentInstance._out.call(parentInstance,event);}
    this[c]=true;this[c==="isout"?"isover":"isout"]=false;this[c==="isover"?"_over":"_out"].call(this,event);if(parentInstance&&c==="isout"){parentInstance.isout=false;parentInstance.isover=true;parentInstance._over.call(parentInstance,event);}});},dragStop:function(draggable,event){draggable.element.parentsUntil("body").unbind("scroll.droppable");if(!draggable.options.refreshPositions){$.ui.ddmanager.prepareOffsets(draggable,event);}}};var droppable=$.ui.droppable;$.widget("ui.resizable",$.ui.mouse,{version:"1.11.4",widgetEventPrefix:"resize",options:{alsoResize:false,animate:false,animateDuration:"slow",animateEasing:"swing",aspectRatio:false,autoHide:false,containment:false,ghost:false,grid:false,handles:"e,s,se",helper:false,maxHeight:null,maxWidth:null,minHeight:10,minWidth:10,zIndex:90,resize:null,start:null,stop:null},_num:function(value){return parseInt(value,10)||0;},_isNumber:function(value){return!isNaN(parseInt(value,10));},_hasScroll:function(el,a){if($(el).css("overflow")==="hidden"){return false;}
    var scroll=(a&&a==="left")?"scrollLeft":"scrollTop",has=false;if(el[scroll]>0){return true;}
    el[scroll]=1;has=(el[scroll]>0);el[scroll]=0;return has;},_create:function(){var n,i,handle,axis,hname,that=this,o=this.options;this.element.addClass("ui-resizable");$.extend(this,{_aspectRatio:!!(o.aspectRatio),aspectRatio:o.aspectRatio,originalElement:this.element,_proportionallyResizeElements:[],_helper:o.helper||o.ghost||o.animate?o.helper||"ui-resizable-helper":null});if(this.element[0].nodeName.match(/^(canvas|textarea|input|select|button|img)$/i)){this.element.wrap($("<div class='ui-wrapper' style='overflow: hidden;'></div>").css({position:this.element.css("position"),width:this.element.outerWidth(),height:this.element.outerHeight(),top:this.element.css("top"),left:this.element.css("left")}));this.element=this.element.parent().data("ui-resizable",this.element.resizable("instance"));this.elementIsWrapper=true;this.element.css({marginLeft:this.originalElement.css("marginLeft"),marginTop:this.originalElement.css("marginTop"),marginRight:this.originalElement.css("marginRight"),marginBottom:this.originalElement.css("marginBottom")});this.originalElement.css({marginLeft:0,marginTop:0,marginRight:0,marginBottom:0});this.originalResizeStyle=this.originalElement.css("resize");this.originalElement.css("resize","none");this._proportionallyResizeElements.push(this.originalElement.css({position:"static",zoom:1,display:"block"}));this.originalElement.css({margin:this.originalElement.css("margin")});this._proportionallyResize();}
    this.handles=o.handles||(!$(".ui-resizable-handle",this.element).length?"e,s,se":{n:".ui-resizable-n",e:".ui-resizable-e",s:".ui-resizable-s",w:".ui-resizable-w",se:".ui-resizable-se",sw:".ui-resizable-sw",ne:".ui-resizable-ne",nw:".ui-resizable-nw"});this._handles=$();if(this.handles.constructor===String){if(this.handles==="all"){this.handles="n,e,s,w,se,sw,ne,nw";}
    n=this.handles.split(",");this.handles={};for(i=0;i<n.length;i++){handle=$.trim(n[i]);hname="ui-resizable-"+handle;axis=$("<div class='ui-resizable-handle "+hname+"'></div>");axis.css({zIndex:o.zIndex});if("se"===handle){axis.addClass("ui-icon ui-icon-gripsmall-diagonal-se");}
    this.handles[handle]=".ui-resizable-"+handle;this.element.append(axis);}}
    this._renderAxis=function(target){var i,axis,padPos,padWrapper;target=target||this.element;for(i in this.handles){if(this.handles[i].constructor===String){this.handles[i]=this.element.children(this.handles[i]).first().show();}else if(this.handles[i].jquery||this.handles[i].nodeType){this.handles[i]=$(this.handles[i]);this._on(this.handles[i],{"mousedown":that._mouseDown});}
    if(this.elementIsWrapper&&this.originalElement[0].nodeName.match(/^(textarea|input|select|button)$/i)){axis=$(this.handles[i],this.element);padWrapper=/sw|ne|nw|se|n|s/.test(i)?axis.outerHeight():axis.outerWidth();padPos=["padding",/ne|nw|n/.test(i)?"Top":/se|sw|s/.test(i)?"Bottom":/^e$/.test(i)?"Right":"Left"].join("");target.css(padPos,padWrapper);this._proportionallyResize();}
    this._handles=this._handles.add(this.handles[i]);}};this._renderAxis(this.element);this._handles=this._handles.add(this.element.find(".ui-resizable-handle"));this._handles.disableSelection();this._handles.mouseover(function(){if(!that.resizing){if(this.className){axis=this.className.match(/ui-resizable-(se|sw|ne|nw|n|e|s|w)/i);}
    that.axis=axis&&axis[1]?axis[1]:"se";}});if(o.autoHide){this._handles.hide();$(this.element).addClass("ui-resizable-autohide").mouseenter(function(){if(o.disabled){return;}
    $(this).removeClass("ui-resizable-autohide");that._handles.show();}).mouseleave(function(){if(o.disabled){return;}
    if(!that.resizing){$(this).addClass("ui-resizable-autohide");that._handles.hide();}});}
    this._mouseInit();},_destroy:function(){this._mouseDestroy();var wrapper,_destroy=function(exp){$(exp).removeClass("ui-resizable ui-resizable-disabled ui-resizable-resizing").removeData("resizable").removeData("ui-resizable").unbind(".resizable").find(".ui-resizable-handle").remove();};if(this.elementIsWrapper){_destroy(this.element);wrapper=this.element;this.originalElement.css({position:wrapper.css("position"),width:wrapper.outerWidth(),height:wrapper.outerHeight(),top:wrapper.css("top"),left:wrapper.css("left")}).insertAfter(wrapper);wrapper.remove();}
    this.originalElement.css("resize",this.originalResizeStyle);_destroy(this.originalElement);return this;},_mouseCapture:function(event){var i,handle,capture=false;for(i in this.handles){handle=$(this.handles[i])[0];if(handle===event.target||$.contains(handle,event.target)){capture=true;}}
    return!this.options.disabled&&capture;},_mouseStart:function(event){var curleft,curtop,cursor,o=this.options,el=this.element;this.resizing=true;this._renderProxy();curleft=this._num(this.helper.css("left"));curtop=this._num(this.helper.css("top"));if(o.containment){curleft+=$(o.containment).scrollLeft()||0;curtop+=$(o.containment).scrollTop()||0;}
    this.offset=this.helper.offset();this.position={left:curleft,top:curtop};this.size=this._helper?{width:this.helper.width(),height:this.helper.height()}:{width:el.width(),height:el.height()};this.originalSize=this._helper?{width:el.outerWidth(),height:el.outerHeight()}:{width:el.width(),height:el.height()};this.sizeDiff={width:el.outerWidth()-el.width(),height:el.outerHeight()-el.height()};this.originalPosition={left:curleft,top:curtop};this.originalMousePosition={left:event.pageX,top:event.pageY};this.aspectRatio=(typeof o.aspectRatio==="number")?o.aspectRatio:((this.originalSize.width/this.originalSize.height)||1);cursor=$(".ui-resizable-"+this.axis).css("cursor");$("body").css("cursor",cursor==="auto"?this.axis+"-resize":cursor);el.addClass("ui-resizable-resizing");this._propagate("start",event);return true;},_mouseDrag:function(event){var data,props,smp=this.originalMousePosition,a=this.axis,dx=(event.pageX-smp.left)||0,dy=(event.pageY-smp.top)||0,trigger=this._change[a];this._updatePrevProperties();if(!trigger){return false;}
    data=trigger.apply(this,[event,dx,dy]);this._updateVirtualBoundaries(event.shiftKey);if(this._aspectRatio||event.shiftKey){data=this._updateRatio(data,event);}
    data=this._respectSize(data,event);this._updateCache(data);this._propagate("resize",event);props=this._applyChanges();if(!this._helper&&this._proportionallyResizeElements.length){this._proportionallyResize();}
    if(!$.isEmptyObject(props)){this._updatePrevProperties();this._trigger("resize",event,this.ui());this._applyChanges();}
    return false;},_mouseStop:function(event){this.resizing=false;var pr,ista,soffseth,soffsetw,s,left,top,o=this.options,that=this;if(this._helper){pr=this._proportionallyResizeElements;ista=pr.length&&(/textarea/i).test(pr[0].nodeName);soffseth=ista&&this._hasScroll(pr[0],"left")?0:that.sizeDiff.height;soffsetw=ista?0:that.sizeDiff.width;s={width:(that.helper.width()-soffsetw),height:(that.helper.height()-soffseth)};left=(parseInt(that.element.css("left"),10)+
    (that.position.left-that.originalPosition.left))||null;top=(parseInt(that.element.css("top"),10)+
    (that.position.top-that.originalPosition.top))||null;if(!o.animate){this.element.css($.extend(s,{top:top,left:left}));}
    that.helper.height(that.size.height);that.helper.width(that.size.width);if(this._helper&&!o.animate){this._proportionallyResize();}}
    $("body").css("cursor","auto");this.element.removeClass("ui-resizable-resizing");this._propagate("stop",event);if(this._helper){this.helper.remove();}
    return false;},_updatePrevProperties:function(){this.prevPosition={top:this.position.top,left:this.position.left};this.prevSize={width:this.size.width,height:this.size.height};},_applyChanges:function(){var props={};if(this.position.top!==this.prevPosition.top){props.top=this.position.top+"px";}
    if(this.position.left!==this.prevPosition.left){props.left=this.position.left+"px";}
    if(this.size.width!==this.prevSize.width){props.width=this.size.width+"px";}
    if(this.size.height!==this.prevSize.height){props.height=this.size.height+"px";}
    this.helper.css(props);return props;},_updateVirtualBoundaries:function(forceAspectRatio){var pMinWidth,pMaxWidth,pMinHeight,pMaxHeight,b,o=this.options;b={minWidth:this._isNumber(o.minWidth)?o.minWidth:0,maxWidth:this._isNumber(o.maxWidth)?o.maxWidth:Infinity,minHeight:this._isNumber(o.minHeight)?o.minHeight:0,maxHeight:this._isNumber(o.maxHeight)?o.maxHeight:Infinity};if(this._aspectRatio||forceAspectRatio){pMinWidth=b.minHeight*this.aspectRatio;pMinHeight=b.minWidth/this.aspectRatio;pMaxWidth=b.maxHeight*this.aspectRatio;pMaxHeight=b.maxWidth/this.aspectRatio;if(pMinWidth>b.minWidth){b.minWidth=pMinWidth;}
    if(pMinHeight>b.minHeight){b.minHeight=pMinHeight;}
    if(pMaxWidth<b.maxWidth){b.maxWidth=pMaxWidth;}
    if(pMaxHeight<b.maxHeight){b.maxHeight=pMaxHeight;}}
    this._vBoundaries=b;},_updateCache:function(data){this.offset=this.helper.offset();if(this._isNumber(data.left)){this.position.left=data.left;}
    if(this._isNumber(data.top)){this.position.top=data.top;}
    if(this._isNumber(data.height)){this.size.height=data.height;}
    if(this._isNumber(data.width)){this.size.width=data.width;}},_updateRatio:function(data){var cpos=this.position,csize=this.size,a=this.axis;if(this._isNumber(data.height)){data.width=(data.height*this.aspectRatio);}else if(this._isNumber(data.width)){data.height=(data.width/this.aspectRatio);}
    if(a==="sw"){data.left=cpos.left+(csize.width-data.width);data.top=null;}
    if(a==="nw"){data.top=cpos.top+(csize.height-data.height);data.left=cpos.left+(csize.width-data.width);}
    return data;},_respectSize:function(data){var o=this._vBoundaries,a=this.axis,ismaxw=this._isNumber(data.width)&&o.maxWidth&&(o.maxWidth<data.width),ismaxh=this._isNumber(data.height)&&o.maxHeight&&(o.maxHeight<data.height),isminw=this._isNumber(data.width)&&o.minWidth&&(o.minWidth>data.width),isminh=this._isNumber(data.height)&&o.minHeight&&(o.minHeight>data.height),dw=this.originalPosition.left+this.originalSize.width,dh=this.position.top+this.size.height,cw=/sw|nw|w/.test(a),ch=/nw|ne|n/.test(a);if(isminw){data.width=o.minWidth;}
    if(isminh){data.height=o.minHeight;}
    if(ismaxw){data.width=o.maxWidth;}
    if(ismaxh){data.height=o.maxHeight;}
    if(isminw&&cw){data.left=dw-o.minWidth;}
    if(ismaxw&&cw){data.left=dw-o.maxWidth;}
    if(isminh&&ch){data.top=dh-o.minHeight;}
    if(ismaxh&&ch){data.top=dh-o.maxHeight;}
    if(!data.width&&!data.height&&!data.left&&data.top){data.top=null;}else if(!data.width&&!data.height&&!data.top&&data.left){data.left=null;}
    return data;},_getPaddingPlusBorderDimensions:function(element){var i=0,widths=[],borders=[element.css("borderTopWidth"),element.css("borderRightWidth"),element.css("borderBottomWidth"),element.css("borderLeftWidth")],paddings=[element.css("paddingTop"),element.css("paddingRight"),element.css("paddingBottom"),element.css("paddingLeft")];for(;i<4;i++){widths[i]=(parseInt(borders[i],10)||0);widths[i]+=(parseInt(paddings[i],10)||0);}
    return{height:widths[0]+widths[2],width:widths[1]+widths[3]};},_proportionallyResize:function(){if(!this._proportionallyResizeElements.length){return;}
    var prel,i=0,element=this.helper||this.element;for(;i<this._proportionallyResizeElements.length;i++){prel=this._proportionallyResizeElements[i];if(!this.outerDimensions){this.outerDimensions=this._getPaddingPlusBorderDimensions(prel);}
    prel.css({height:(element.height()-this.outerDimensions.height)||0,width:(element.width()-this.outerDimensions.width)||0});}},_renderProxy:function(){var el=this.element,o=this.options;this.elementOffset=el.offset();if(this._helper){this.helper=this.helper||$("<div style='overflow:hidden;'></div>");this.helper.addClass(this._helper).css({width:this.element.outerWidth()-1,height:this.element.outerHeight()-1,position:"absolute",left:this.elementOffset.left+"px",top:this.elementOffset.top+"px",zIndex:++o.zIndex});this.helper.appendTo("body").disableSelection();}else{this.helper=this.element;}},_change:{e:function(event,dx){return{width:this.originalSize.width+dx};},w:function(event,dx){var cs=this.originalSize,sp=this.originalPosition;return{left:sp.left+dx,width:cs.width-dx};},n:function(event,dx,dy){var cs=this.originalSize,sp=this.originalPosition;return{top:sp.top+dy,height:cs.height-dy};},s:function(event,dx,dy){return{height:this.originalSize.height+dy};},se:function(event,dx,dy){return $.extend(this._change.s.apply(this,arguments),this._change.e.apply(this,[event,dx,dy]));},sw:function(event,dx,dy){return $.extend(this._change.s.apply(this,arguments),this._change.w.apply(this,[event,dx,dy]));},ne:function(event,dx,dy){return $.extend(this._change.n.apply(this,arguments),this._change.e.apply(this,[event,dx,dy]));},nw:function(event,dx,dy){return $.extend(this._change.n.apply(this,arguments),this._change.w.apply(this,[event,dx,dy]));}},_propagate:function(n,event){$.ui.plugin.call(this,n,[event,this.ui()]);(n!=="resize"&&this._trigger(n,event,this.ui()));},plugins:{},ui:function(){return{originalElement:this.originalElement,element:this.element,helper:this.helper,position:this.position,size:this.size,originalSize:this.originalSize,originalPosition:this.originalPosition};}});$.ui.plugin.add("resizable","animate",{stop:function(event){var that=$(this).resizable("instance"),o=that.options,pr=that._proportionallyResizeElements,ista=pr.length&&(/textarea/i).test(pr[0].nodeName),soffseth=ista&&that._hasScroll(pr[0],"left")?0:that.sizeDiff.height,soffsetw=ista?0:that.sizeDiff.width,style={width:(that.size.width-soffsetw),height:(that.size.height-soffseth)},left=(parseInt(that.element.css("left"),10)+
    (that.position.left-that.originalPosition.left))||null,top=(parseInt(that.element.css("top"),10)+
    (that.position.top-that.originalPosition.top))||null;that.element.animate($.extend(style,top&&left?{top:top,left:left}:{}),{duration:o.animateDuration,easing:o.animateEasing,step:function(){var data={width:parseInt(that.element.css("width"),10),height:parseInt(that.element.css("height"),10),top:parseInt(that.element.css("top"),10),left:parseInt(that.element.css("left"),10)};if(pr&&pr.length){$(pr[0]).css({width:data.width,height:data.height});}
    that._updateCache(data);that._propagate("resize",event);}});}});$.ui.plugin.add("resizable","containment",{start:function(){var element,p,co,ch,cw,width,height,that=$(this).resizable("instance"),o=that.options,el=that.element,oc=o.containment,ce=(oc instanceof $)?oc.get(0):(/parent/.test(oc))?el.parent().get(0):oc;if(!ce){return;}
    that.containerElement=$(ce);if(/document/.test(oc)||oc===document){that.containerOffset={left:0,top:0};that.containerPosition={left:0,top:0};that.parentData={element:$(document),left:0,top:0,width:$(document).width(),height:$(document).height()||document.body.parentNode.scrollHeight};}else{element=$(ce);p=[];$(["Top","Right","Left","Bottom"]).each(function(i,name){p[i]=that._num(element.css("padding"+name));});that.containerOffset=element.offset();that.containerPosition=element.position();that.containerSize={height:(element.innerHeight()-p[3]),width:(element.innerWidth()-p[1])};co=that.containerOffset;ch=that.containerSize.height;cw=that.containerSize.width;width=(that._hasScroll(ce,"left")?ce.scrollWidth:cw);height=(that._hasScroll(ce)?ce.scrollHeight:ch);that.parentData={element:ce,left:co.left,top:co.top,width:width,height:height};}},resize:function(event){var woset,hoset,isParent,isOffsetRelative,that=$(this).resizable("instance"),o=that.options,co=that.containerOffset,cp=that.position,pRatio=that._aspectRatio||event.shiftKey,cop={top:0,left:0},ce=that.containerElement,continueResize=true;if(ce[0]!==document&&(/static/).test(ce.css("position"))){cop=co;}
    if(cp.left<(that._helper?co.left:0)){that.size.width=that.size.width+
    (that._helper?(that.position.left-co.left):(that.position.left-cop.left));if(pRatio){that.size.height=that.size.width/that.aspectRatio;continueResize=false;}
    that.position.left=o.helper?co.left:0;}
    if(cp.top<(that._helper?co.top:0)){that.size.height=that.size.height+
    (that._helper?(that.position.top-co.top):that.position.top);if(pRatio){that.size.width=that.size.height*that.aspectRatio;continueResize=false;}
    that.position.top=that._helper?co.top:0;}
    isParent=that.containerElement.get(0)===that.element.parent().get(0);isOffsetRelative=/relative|absolute/.test(that.containerElement.css("position"));if(isParent&&isOffsetRelative){that.offset.left=that.parentData.left+that.position.left;that.offset.top=that.parentData.top+that.position.top;}else{that.offset.left=that.element.offset().left;that.offset.top=that.element.offset().top;}
    woset=Math.abs(that.sizeDiff.width+
    (that._helper?that.offset.left-cop.left:(that.offset.left-co.left)));hoset=Math.abs(that.sizeDiff.height+
    (that._helper?that.offset.top-cop.top:(that.offset.top-co.top)));if(woset+that.size.width>=that.parentData.width){that.size.width=that.parentData.width-woset;if(pRatio){that.size.height=that.size.width/that.aspectRatio;continueResize=false;}}
    if(hoset+that.size.height>=that.parentData.height){that.size.height=that.parentData.height-hoset;if(pRatio){that.size.width=that.size.height*that.aspectRatio;continueResize=false;}}
    if(!continueResize){that.position.left=that.prevPosition.left;that.position.top=that.prevPosition.top;that.size.width=that.prevSize.width;that.size.height=that.prevSize.height;}},stop:function(){var that=$(this).resizable("instance"),o=that.options,co=that.containerOffset,cop=that.containerPosition,ce=that.containerElement,helper=$(that.helper),ho=helper.offset(),w=helper.outerWidth()-that.sizeDiff.width,h=helper.outerHeight()-that.sizeDiff.height;if(that._helper&&!o.animate&&(/relative/).test(ce.css("position"))){$(this).css({left:ho.left-cop.left-co.left,width:w,height:h});}
    if(that._helper&&!o.animate&&(/static/).test(ce.css("position"))){$(this).css({left:ho.left-cop.left-co.left,width:w,height:h});}}});$.ui.plugin.add("resizable","alsoResize",{start:function(){var that=$(this).resizable("instance"),o=that.options;$(o.alsoResize).each(function(){var el=$(this);el.data("ui-resizable-alsoresize",{width:parseInt(el.width(),10),height:parseInt(el.height(),10),left:parseInt(el.css("left"),10),top:parseInt(el.css("top"),10)});});},resize:function(event,ui){var that=$(this).resizable("instance"),o=that.options,os=that.originalSize,op=that.originalPosition,delta={height:(that.size.height-os.height)||0,width:(that.size.width-os.width)||0,top:(that.position.top-op.top)||0,left:(that.position.left-op.left)||0};$(o.alsoResize).each(function(){var el=$(this),start=$(this).data("ui-resizable-alsoresize"),style={},css=el.parents(ui.originalElement[0]).length?["width","height"]:["width","height","top","left"];$.each(css,function(i,prop){var sum=(start[prop]||0)+(delta[prop]||0);if(sum&&sum>=0){style[prop]=sum||null;}});el.css(style);});},stop:function(){$(this).removeData("resizable-alsoresize");}});$.ui.plugin.add("resizable","ghost",{start:function(){var that=$(this).resizable("instance"),o=that.options,cs=that.size;that.ghost=that.originalElement.clone();that.ghost.css({opacity:0.25,display:"block",position:"relative",height:cs.height,width:cs.width,margin:0,left:0,top:0}).addClass("ui-resizable-ghost").addClass(typeof o.ghost==="string"?o.ghost:"");that.ghost.appendTo(that.helper);},resize:function(){var that=$(this).resizable("instance");if(that.ghost){that.ghost.css({position:"relative",height:that.size.height,width:that.size.width});}},stop:function(){var that=$(this).resizable("instance");if(that.ghost&&that.helper){that.helper.get(0).removeChild(that.ghost.get(0));}}});$.ui.plugin.add("resizable","grid",{resize:function(){var outerDimensions,that=$(this).resizable("instance"),o=that.options,cs=that.size,os=that.originalSize,op=that.originalPosition,a=that.axis,grid=typeof o.grid==="number"?[o.grid,o.grid]:o.grid,gridX=(grid[0]||1),gridY=(grid[1]||1),ox=Math.round((cs.width-os.width)/gridX)*gridX,oy=Math.round((cs.height-os.height)/gridY)*gridY,newWidth=os.width+ox,newHeight=os.height+oy,isMaxWidth=o.maxWidth&&(o.maxWidth<newWidth),isMaxHeight=o.maxHeight&&(o.maxHeight<newHeight),isMinWidth=o.minWidth&&(o.minWidth>newWidth),isMinHeight=o.minHeight&&(o.minHeight>newHeight);o.grid=grid;if(isMinWidth){newWidth+=gridX;}
    if(isMinHeight){newHeight+=gridY;}
    if(isMaxWidth){newWidth-=gridX;}
    if(isMaxHeight){newHeight-=gridY;}
    if(/^(se|s|e)$/.test(a)){that.size.width=newWidth;that.size.height=newHeight;}else if(/^(ne)$/.test(a)){that.size.width=newWidth;that.size.height=newHeight;that.position.top=op.top-oy;}else if(/^(sw)$/.test(a)){that.size.width=newWidth;that.size.height=newHeight;that.position.left=op.left-ox;}else{if(newHeight-gridY<=0||newWidth-gridX<=0){outerDimensions=that._getPaddingPlusBorderDimensions(this);}
    if(newHeight-gridY>0){that.size.height=newHeight;that.position.top=op.top-oy;}else{newHeight=gridY-outerDimensions.height;that.size.height=newHeight;that.position.top=op.top+os.height-newHeight;}
    if(newWidth-gridX>0){that.size.width=newWidth;that.position.left=op.left-ox;}else{newWidth=gridX-outerDimensions.width;that.size.width=newWidth;that.position.left=op.left+os.width-newWidth;}}}});var resizable=$.ui.resizable;var selectable=$.widget("ui.selectable",$.ui.mouse,{version:"1.11.4",options:{appendTo:"body",autoRefresh:true,distance:0,filter:"*",tolerance:"touch",selected:null,selecting:null,start:null,stop:null,unselected:null,unselecting:null},_create:function(){var selectees,that=this;this.element.addClass("ui-selectable");this.dragged=false;this.refresh=function(){selectees=$(that.options.filter,that.element[0]);selectees.addClass("ui-selectee");selectees.each(function(){var $this=$(this),pos=$this.offset();$.data(this,"selectable-item",{element:this,$element:$this,left:pos.left,top:pos.top,right:pos.left+$this.outerWidth(),bottom:pos.top+$this.outerHeight(),startselected:false,selected:$this.hasClass("ui-selected"),selecting:$this.hasClass("ui-selecting"),unselecting:$this.hasClass("ui-unselecting")});});};this.refresh();this.selectees=selectees.addClass("ui-selectee");this._mouseInit();this.helper=$("<div class='ui-selectable-helper'></div>");},_destroy:function(){this.selectees.removeClass("ui-selectee").removeData("selectable-item");this.element.removeClass("ui-selectable ui-selectable-disabled");this._mouseDestroy();},_mouseStart:function(event){var that=this,options=this.options;this.opos=[event.pageX,event.pageY];if(this.options.disabled){return;}
    this.selectees=$(options.filter,this.element[0]);this._trigger("start",event);$(options.appendTo).append(this.helper);this.helper.css({"left":event.pageX,"top":event.pageY,"width":0,"height":0});if(options.autoRefresh){this.refresh();}
    this.selectees.filter(".ui-selected").each(function(){var selectee=$.data(this,"selectable-item");selectee.startselected=true;if(!event.metaKey&&!event.ctrlKey){selectee.$element.removeClass("ui-selected");selectee.selected=false;selectee.$element.addClass("ui-unselecting");selectee.unselecting=true;that._trigger("unselecting",event,{unselecting:selectee.element});}});$(event.target).parents().addBack().each(function(){var doSelect,selectee=$.data(this,"selectable-item");if(selectee){doSelect=(!event.metaKey&&!event.ctrlKey)||!selectee.$element.hasClass("ui-selected");selectee.$element.removeClass(doSelect?"ui-unselecting":"ui-selected").addClass(doSelect?"ui-selecting":"ui-unselecting");selectee.unselecting=!doSelect;selectee.selecting=doSelect;selectee.selected=doSelect;if(doSelect){that._trigger("selecting",event,{selecting:selectee.element});}else{that._trigger("unselecting",event,{unselecting:selectee.element});}
    return false;}});},_mouseDrag:function(event){this.dragged=true;if(this.options.disabled){return;}
    var tmp,that=this,options=this.options,x1=this.opos[0],y1=this.opos[1],x2=event.pageX,y2=event.pageY;if(x1>x2){tmp=x2;x2=x1;x1=tmp;}
    if(y1>y2){tmp=y2;y2=y1;y1=tmp;}
    this.helper.css({left:x1,top:y1,width:x2-x1,height:y2-y1});this.selectees.each(function(){var selectee=$.data(this,"selectable-item"),hit=false;if(!selectee||selectee.element===that.element[0]){return;}
    if(options.tolerance==="touch"){hit=(!(selectee.left>x2||selectee.right<x1||selectee.top>y2||selectee.bottom<y1));}else if(options.tolerance==="fit"){hit=(selectee.left>x1&&selectee.right<x2&&selectee.top>y1&&selectee.bottom<y2);}
    if(hit){if(selectee.selected){selectee.$element.removeClass("ui-selected");selectee.selected=false;}
    if(selectee.unselecting){selectee.$element.removeClass("ui-unselecting");selectee.unselecting=false;}
    if(!selectee.selecting){selectee.$element.addClass("ui-selecting");selectee.selecting=true;that._trigger("selecting",event,{selecting:selectee.element});}}else{if(selectee.selecting){if((event.metaKey||event.ctrlKey)&&selectee.startselected){selectee.$element.removeClass("ui-selecting");selectee.selecting=false;selectee.$element.addClass("ui-selected");selectee.selected=true;}else{selectee.$element.removeClass("ui-selecting");selectee.selecting=false;if(selectee.startselected){selectee.$element.addClass("ui-unselecting");selectee.unselecting=true;}
    that._trigger("unselecting",event,{unselecting:selectee.element});}}
    if(selectee.selected){if(!event.metaKey&&!event.ctrlKey&&!selectee.startselected){selectee.$element.removeClass("ui-selected");selectee.selected=false;selectee.$element.addClass("ui-unselecting");selectee.unselecting=true;that._trigger("unselecting",event,{unselecting:selectee.element});}}}});return false;},_mouseStop:function(event){var that=this;this.dragged=false;$(".ui-unselecting",this.element[0]).each(function(){var selectee=$.data(this,"selectable-item");selectee.$element.removeClass("ui-unselecting");selectee.unselecting=false;selectee.startselected=false;that._trigger("unselected",event,{unselected:selectee.element});});$(".ui-selecting",this.element[0]).each(function(){var selectee=$.data(this,"selectable-item");selectee.$element.removeClass("ui-selecting").addClass("ui-selected");selectee.selecting=false;selectee.selected=true;selectee.startselected=true;that._trigger("selected",event,{selected:selectee.element});});this._trigger("stop",event);this.helper.remove();return false;}});var sortable=$.widget("ui.sortable",$.ui.mouse,{version:"1.11.4",widgetEventPrefix:"sort",ready:false,options:{appendTo:"parent",axis:false,connectWith:false,containment:false,cursor:"auto",cursorAt:false,dropOnEmpty:true,forcePlaceholderSize:false,forceHelperSize:false,grid:false,handle:false,helper:"original",items:"> *",opacity:false,placeholder:false,revert:false,scroll:true,scrollSensitivity:20,scrollSpeed:20,scope:"default",tolerance:"intersect",zIndex:1000,activate:null,beforeStop:null,change:null,deactivate:null,out:null,over:null,receive:null,remove:null,sort:null,start:null,stop:null,update:null},_isOverAxis:function(x,reference,size){return(x>=reference)&&(x<(reference+size));},_isFloating:function(item){return(/left|right/).test(item.css("float"))||(/inline|table-cell/).test(item.css("display"));},_create:function(){this.containerCache={};this.element.addClass("ui-sortable");this.refresh();this.offset=this.element.offset();this._mouseInit();this._setHandleClassName();this.ready=true;},_setOption:function(key,value){this._super(key,value);if(key==="handle"){this._setHandleClassName();}},_setHandleClassName:function(){this.element.find(".ui-sortable-handle").removeClass("ui-sortable-handle");$.each(this.items,function(){(this.instance.options.handle?this.item.find(this.instance.options.handle):this.item).addClass("ui-sortable-handle");});},_destroy:function(){this.element.removeClass("ui-sortable ui-sortable-disabled").find(".ui-sortable-handle").removeClass("ui-sortable-handle");this._mouseDestroy();for(var i=this.items.length-1;i>=0;i--){this.items[i].item.removeData(this.widgetName+"-item");}
    return this;},_mouseCapture:function(event,overrideHandle){var currentItem=null,validHandle=false,that=this;if(this.reverting){return false;}
    if(this.options.disabled||this.options.type==="static"){return false;}
    this._refreshItems(event);$(event.target).parents().each(function(){if($.data(this,that.widgetName+"-item")===that){currentItem=$(this);return false;}});if($.data(event.target,that.widgetName+"-item")===that){currentItem=$(event.target);}
    if(!currentItem){return false;}
    if(this.options.handle&&!overrideHandle){$(this.options.handle,currentItem).find("*").addBack().each(function(){if(this===event.target){validHandle=true;}});if(!validHandle){return false;}}
    this.currentItem=currentItem;this._removeCurrentsFromItems();return true;},_mouseStart:function(event,overrideHandle,noActivation){var i,body,o=this.options;this.currentContainer=this;this.refreshPositions();this.helper=this._createHelper(event);this._cacheHelperProportions();this._cacheMargins();this.scrollParent=this.helper.scrollParent();this.offset=this.currentItem.offset();this.offset={top:this.offset.top-this.margins.top,left:this.offset.left-this.margins.left};$.extend(this.offset,{click:{left:event.pageX-this.offset.left,top:event.pageY-this.offset.top},parent:this._getParentOffset(),relative:this._getRelativeOffset()});this.helper.css("position","absolute");this.cssPosition=this.helper.css("position");this.originalPosition=this._generatePosition(event);this.originalPageX=event.pageX;this.originalPageY=event.pageY;(o.cursorAt&&this._adjustOffsetFromHelper(o.cursorAt));this.domPosition={prev:this.currentItem.prev()[0],parent:this.currentItem.parent()[0]};if(this.helper[0]!==this.currentItem[0]){this.currentItem.hide();}
    this._createPlaceholder();if(o.containment){this._setContainment();}
    if(o.cursor&&o.cursor!=="auto"){body=this.document.find("body");this.storedCursor=body.css("cursor");body.css("cursor",o.cursor);this.storedStylesheet=$("<style>*{ cursor: "+o.cursor+" !important; }</style>").appendTo(body);}
    if(o.opacity){if(this.helper.css("opacity")){this._storedOpacity=this.helper.css("opacity");}
    this.helper.css("opacity",o.opacity);}
    if(o.zIndex){if(this.helper.css("zIndex")){this._storedZIndex=this.helper.css("zIndex");}
    this.helper.css("zIndex",o.zIndex);}
    if(this.scrollParent[0]!==this.document[0]&&this.scrollParent[0].tagName!=="HTML"){this.overflowOffset=this.scrollParent.offset();}
    this._trigger("start",event,this._uiHash());if(!this._preserveHelperProportions){this._cacheHelperProportions();}
    if(!noActivation){for(i=this.containers.length-1;i>=0;i--){this.containers[i]._trigger("activate",event,this._uiHash(this));}}
    if($.ui.ddmanager){$.ui.ddmanager.current=this;}
    if($.ui.ddmanager&&!o.dropBehaviour){$.ui.ddmanager.prepareOffsets(this,event);}
    this.dragging=true;this.helper.addClass("ui-sortable-helper");this._mouseDrag(event);return true;},_mouseDrag:function(event){var i,item,itemElement,intersection,o=this.options,scrolled=false;this.position=this._generatePosition(event);this.positionAbs=this._convertPositionTo("absolute");if(!this.lastPositionAbs){this.lastPositionAbs=this.positionAbs;}
    if(this.options.scroll){if(this.scrollParent[0]!==this.document[0]&&this.scrollParent[0].tagName!=="HTML"){if((this.overflowOffset.top+this.scrollParent[0].offsetHeight)-event.pageY<o.scrollSensitivity){this.scrollParent[0].scrollTop=scrolled=this.scrollParent[0].scrollTop+o.scrollSpeed;}else if(event.pageY-this.overflowOffset.top<o.scrollSensitivity){this.scrollParent[0].scrollTop=scrolled=this.scrollParent[0].scrollTop-o.scrollSpeed;}
    if((this.overflowOffset.left+this.scrollParent[0].offsetWidth)-event.pageX<o.scrollSensitivity){this.scrollParent[0].scrollLeft=scrolled=this.scrollParent[0].scrollLeft+o.scrollSpeed;}else if(event.pageX-this.overflowOffset.left<o.scrollSensitivity){this.scrollParent[0].scrollLeft=scrolled=this.scrollParent[0].scrollLeft-o.scrollSpeed;}}else{if(event.pageY-this.document.scrollTop()<o.scrollSensitivity){scrolled=this.document.scrollTop(this.document.scrollTop()-o.scrollSpeed);}else if(this.window.height()-(event.pageY-this.document.scrollTop())<o.scrollSensitivity){scrolled=this.document.scrollTop(this.document.scrollTop()+o.scrollSpeed);}
    if(event.pageX-this.document.scrollLeft()<o.scrollSensitivity){scrolled=this.document.scrollLeft(this.document.scrollLeft()-o.scrollSpeed);}else if(this.window.width()-(event.pageX-this.document.scrollLeft())<o.scrollSensitivity){scrolled=this.document.scrollLeft(this.document.scrollLeft()+o.scrollSpeed);}}
    if(scrolled!==false&&$.ui.ddmanager&&!o.dropBehaviour){$.ui.ddmanager.prepareOffsets(this,event);}}
    this.positionAbs=this._convertPositionTo("absolute");if(!this.options.axis||this.options.axis!=="y"){this.helper[0].style.left=this.position.left+"px";}
    if(!this.options.axis||this.options.axis!=="x"){this.helper[0].style.top=this.position.top+"px";}
    for(i=this.items.length-1;i>=0;i--){item=this.items[i];itemElement=item.item[0];intersection=this._intersectsWithPointer(item);if(!intersection){continue;}
    if(item.instance!==this.currentContainer){continue;}
    if(itemElement!==this.currentItem[0]&&this.placeholder[intersection===1?"next":"prev"]()[0]!==itemElement&&!$.contains(this.placeholder[0],itemElement)&&(this.options.type==="semi-dynamic"?!$.contains(this.element[0],itemElement):true)){this.direction=intersection===1?"down":"up";if(this.options.tolerance==="pointer"||this._intersectsWithSides(item)){this._rearrange(event,item);}else{break;}
    this._trigger("change",event,this._uiHash());break;}}
    this._contactContainers(event);if($.ui.ddmanager){$.ui.ddmanager.drag(this,event);}
    this._trigger("sort",event,this._uiHash());this.lastPositionAbs=this.positionAbs;return false;},_mouseStop:function(event,noPropagation){if(!event){return;}
    if($.ui.ddmanager&&!this.options.dropBehaviour){$.ui.ddmanager.drop(this,event);}
    if(this.options.revert){var that=this,cur=this.placeholder.offset(),axis=this.options.axis,animation={};if(!axis||axis==="x"){animation.left=cur.left-this.offset.parent.left-this.margins.left+(this.offsetParent[0]===this.document[0].body?0:this.offsetParent[0].scrollLeft);}
    if(!axis||axis==="y"){animation.top=cur.top-this.offset.parent.top-this.margins.top+(this.offsetParent[0]===this.document[0].body?0:this.offsetParent[0].scrollTop);}
    this.reverting=true;$(this.helper).animate(animation,parseInt(this.options.revert,10)||500,function(){that._clear(event);});}else{this._clear(event,noPropagation);}
    return false;},cancel:function(){if(this.dragging){this._mouseUp({target:null});if(this.options.helper==="original"){this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");}else{this.currentItem.show();}
    for(var i=this.containers.length-1;i>=0;i--){this.containers[i]._trigger("deactivate",null,this._uiHash(this));if(this.containers[i].containerCache.over){this.containers[i]._trigger("out",null,this._uiHash(this));this.containers[i].containerCache.over=0;}}}
    if(this.placeholder){if(this.placeholder[0].parentNode){this.placeholder[0].parentNode.removeChild(this.placeholder[0]);}
    if(this.options.helper!=="original"&&this.helper&&this.helper[0].parentNode){this.helper.remove();}
    $.extend(this,{helper:null,dragging:false,reverting:false,_noFinalSort:null});if(this.domPosition.prev){$(this.domPosition.prev).after(this.currentItem);}else{$(this.domPosition.parent).prepend(this.currentItem);}}
    return this;},serialize:function(o){var items=this._getItemsAsjQuery(o&&o.connected),str=[];o=o||{};$(items).each(function(){var res=($(o.item||this).attr(o.attribute||"id")||"").match(o.expression||(/(.+)[\-=_](.+)/));if(res){str.push((o.key||res[1]+"[]")+"="+(o.key&&o.expression?res[1]:res[2]));}});if(!str.length&&o.key){str.push(o.key+"=");}
    return str.join("&");},toArray:function(o){var items=this._getItemsAsjQuery(o&&o.connected),ret=[];o=o||{};items.each(function(){ret.push($(o.item||this).attr(o.attribute||"id")||"");});return ret;},_intersectsWith:function(item){var x1=this.positionAbs.left,x2=x1+this.helperProportions.width,y1=this.positionAbs.top,y2=y1+this.helperProportions.height,l=item.left,r=l+item.width,t=item.top,b=t+item.height,dyClick=this.offset.click.top,dxClick=this.offset.click.left,isOverElementHeight=(this.options.axis==="x")||((y1+dyClick)>t&&(y1+dyClick)<b),isOverElementWidth=(this.options.axis==="y")||((x1+dxClick)>l&&(x1+dxClick)<r),isOverElement=isOverElementHeight&&isOverElementWidth;if(this.options.tolerance==="pointer"||this.options.forcePointerForContainers||(this.options.tolerance!=="pointer"&&this.helperProportions[this.floating?"width":"height"]>item[this.floating?"width":"height"])){return isOverElement;}else{return(l<x1+(this.helperProportions.width/2)&&x2-(this.helperProportions.width/2)<r&&t<y1+(this.helperProportions.height/2)&&y2-(this.helperProportions.height/2)<b);}},_intersectsWithPointer:function(item){var isOverElementHeight=(this.options.axis==="x")||this._isOverAxis(this.positionAbs.top+this.offset.click.top,item.top,item.height),isOverElementWidth=(this.options.axis==="y")||this._isOverAxis(this.positionAbs.left+this.offset.click.left,item.left,item.width),isOverElement=isOverElementHeight&&isOverElementWidth,verticalDirection=this._getDragVerticalDirection(),horizontalDirection=this._getDragHorizontalDirection();if(!isOverElement){return false;}
    return this.floating?(((horizontalDirection&&horizontalDirection==="right")||verticalDirection==="down")?2:1):(verticalDirection&&(verticalDirection==="down"?2:1));},_intersectsWithSides:function(item){var isOverBottomHalf=this._isOverAxis(this.positionAbs.top+this.offset.click.top,item.top+(item.height/2),item.height),isOverRightHalf=this._isOverAxis(this.positionAbs.left+this.offset.click.left,item.left+(item.width/2),item.width),verticalDirection=this._getDragVerticalDirection(),horizontalDirection=this._getDragHorizontalDirection();if(this.floating&&horizontalDirection){return((horizontalDirection==="right"&&isOverRightHalf)||(horizontalDirection==="left"&&!isOverRightHalf));}else{return verticalDirection&&((verticalDirection==="down"&&isOverBottomHalf)||(verticalDirection==="up"&&!isOverBottomHalf));}},_getDragVerticalDirection:function(){var delta=this.positionAbs.top-this.lastPositionAbs.top;return delta!==0&&(delta>0?"down":"up");},_getDragHorizontalDirection:function(){var delta=this.positionAbs.left-this.lastPositionAbs.left;return delta!==0&&(delta>0?"right":"left");},refresh:function(event){this._refreshItems(event);this._setHandleClassName();this.refreshPositions();return this;},_connectWith:function(){var options=this.options;return options.connectWith.constructor===String?[options.connectWith]:options.connectWith;},_getItemsAsjQuery:function(connected){var i,j,cur,inst,items=[],queries=[],connectWith=this._connectWith();if(connectWith&&connected){for(i=connectWith.length-1;i>=0;i--){cur=$(connectWith[i],this.document[0]);for(j=cur.length-1;j>=0;j--){inst=$.data(cur[j],this.widgetFullName);if(inst&&inst!==this&&!inst.options.disabled){queries.push([$.isFunction(inst.options.items)?inst.options.items.call(inst.element):$(inst.options.items,inst.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"),inst]);}}}}
    queries.push([$.isFunction(this.options.items)?this.options.items.call(this.element,null,{options:this.options,item:this.currentItem}):$(this.options.items,this.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"),this]);function addItems(){items.push(this);}
    for(i=queries.length-1;i>=0;i--){queries[i][0].each(addItems);}
    return $(items);},_removeCurrentsFromItems:function(){var list=this.currentItem.find(":data("+this.widgetName+"-item)");this.items=$.grep(this.items,function(item){for(var j=0;j<list.length;j++){if(list[j]===item.item[0]){return false;}}
    return true;});},_refreshItems:function(event){this.items=[];this.containers=[this];var i,j,cur,inst,targetData,_queries,item,queriesLength,items=this.items,queries=[[$.isFunction(this.options.items)?this.options.items.call(this.element[0],event,{item:this.currentItem}):$(this.options.items,this.element),this]],connectWith=this._connectWith();if(connectWith&&this.ready){for(i=connectWith.length-1;i>=0;i--){cur=$(connectWith[i],this.document[0]);for(j=cur.length-1;j>=0;j--){inst=$.data(cur[j],this.widgetFullName);if(inst&&inst!==this&&!inst.options.disabled){queries.push([$.isFunction(inst.options.items)?inst.options.items.call(inst.element[0],event,{item:this.currentItem}):$(inst.options.items,inst.element),inst]);this.containers.push(inst);}}}}
    for(i=queries.length-1;i>=0;i--){targetData=queries[i][1];_queries=queries[i][0];for(j=0,queriesLength=_queries.length;j<queriesLength;j++){item=$(_queries[j]);item.data(this.widgetName+"-item",targetData);items.push({item:item,instance:targetData,width:0,height:0,left:0,top:0});}}},refreshPositions:function(fast){this.floating=this.items.length?this.options.axis==="x"||this._isFloating(this.items[0].item):false;if(this.offsetParent&&this.helper){this.offset.parent=this._getParentOffset();}
    var i,item,t,p;for(i=this.items.length-1;i>=0;i--){item=this.items[i];if(item.instance!==this.currentContainer&&this.currentContainer&&item.item[0]!==this.currentItem[0]){continue;}
    t=this.options.toleranceElement?$(this.options.toleranceElement,item.item):item.item;if(!fast){item.width=t.outerWidth();item.height=t.outerHeight();}
    p=t.offset();item.left=p.left;item.top=p.top;}
    if(this.options.custom&&this.options.custom.refreshContainers){this.options.custom.refreshContainers.call(this);}else{for(i=this.containers.length-1;i>=0;i--){p=this.containers[i].element.offset();this.containers[i].containerCache.left=p.left;this.containers[i].containerCache.top=p.top;this.containers[i].containerCache.width=this.containers[i].element.outerWidth();this.containers[i].containerCache.height=this.containers[i].element.outerHeight();}}
    return this;},_createPlaceholder:function(that){that=that||this;var className,o=that.options;if(!o.placeholder||o.placeholder.constructor===String){className=o.placeholder;o.placeholder={element:function(){var nodeName=that.currentItem[0].nodeName.toLowerCase(),element=$("<"+nodeName+">",that.document[0]).addClass(className||that.currentItem[0].className+" ui-sortable-placeholder").removeClass("ui-sortable-helper");if(nodeName==="tbody"){that._createTrPlaceholder(that.currentItem.find("tr").eq(0),$("<tr>",that.document[0]).appendTo(element));}else if(nodeName==="tr"){that._createTrPlaceholder(that.currentItem,element);}else if(nodeName==="img"){element.attr("src",that.currentItem.attr("src"));}
    if(!className){element.css("visibility","hidden");}
    return element;},update:function(container,p){if(className&&!o.forcePlaceholderSize){return;}
    if(!p.height()){p.height(that.currentItem.innerHeight()-parseInt(that.currentItem.css("paddingTop")||0,10)-parseInt(that.currentItem.css("paddingBottom")||0,10));}
    if(!p.width()){p.width(that.currentItem.innerWidth()-parseInt(that.currentItem.css("paddingLeft")||0,10)-parseInt(that.currentItem.css("paddingRight")||0,10));}}};}
    that.placeholder=$(o.placeholder.element.call(that.element,that.currentItem));that.currentItem.after(that.placeholder);o.placeholder.update(that,that.placeholder);},_createTrPlaceholder:function(sourceTr,targetTr){var that=this;sourceTr.children().each(function(){$("<td>&#160;</td>",that.document[0]).attr("colspan",$(this).attr("colspan")||1).appendTo(targetTr);});},_contactContainers:function(event){var i,j,dist,itemWithLeastDistance,posProperty,sizeProperty,cur,nearBottom,floating,axis,innermostContainer=null,innermostIndex=null;for(i=this.containers.length-1;i>=0;i--){if($.contains(this.currentItem[0],this.containers[i].element[0])){continue;}
    if(this._intersectsWith(this.containers[i].containerCache)){if(innermostContainer&&$.contains(this.containers[i].element[0],innermostContainer.element[0])){continue;}
    innermostContainer=this.containers[i];innermostIndex=i;}else{if(this.containers[i].containerCache.over){this.containers[i]._trigger("out",event,this._uiHash(this));this.containers[i].containerCache.over=0;}}}
    if(!innermostContainer){return;}
    if(this.containers.length===1){if(!this.containers[innermostIndex].containerCache.over){this.containers[innermostIndex]._trigger("over",event,this._uiHash(this));this.containers[innermostIndex].containerCache.over=1;}}else{dist=10000;itemWithLeastDistance=null;floating=innermostContainer.floating||this._isFloating(this.currentItem);posProperty=floating?"left":"top";sizeProperty=floating?"width":"height";axis=floating?"clientX":"clientY";for(j=this.items.length-1;j>=0;j--){if(!$.contains(this.containers[innermostIndex].element[0],this.items[j].item[0])){continue;}
    if(this.items[j].item[0]===this.currentItem[0]){continue;}
    cur=this.items[j].item.offset()[posProperty];nearBottom=false;if(event[axis]-cur>this.items[j][sizeProperty]/2){nearBottom=true;}
    if(Math.abs(event[axis]-cur)<dist){dist=Math.abs(event[axis]-cur);itemWithLeastDistance=this.items[j];this.direction=nearBottom?"up":"down";}}
    if(!itemWithLeastDistance&&!this.options.dropOnEmpty){return;}
    if(this.currentContainer===this.containers[innermostIndex]){if(!this.currentContainer.containerCache.over){this.containers[innermostIndex]._trigger("over",event,this._uiHash());this.currentContainer.containerCache.over=1;}
    return;}
    itemWithLeastDistance?this._rearrange(event,itemWithLeastDistance,null,true):this._rearrange(event,null,this.containers[innermostIndex].element,true);this._trigger("change",event,this._uiHash());this.containers[innermostIndex]._trigger("change",event,this._uiHash(this));this.currentContainer=this.containers[innermostIndex];this.options.placeholder.update(this.currentContainer,this.placeholder);this.containers[innermostIndex]._trigger("over",event,this._uiHash(this));this.containers[innermostIndex].containerCache.over=1;}},_createHelper:function(event){var o=this.options,helper=$.isFunction(o.helper)?$(o.helper.apply(this.element[0],[event,this.currentItem])):(o.helper==="clone"?this.currentItem.clone():this.currentItem);if(!helper.parents("body").length){$(o.appendTo!=="parent"?o.appendTo:this.currentItem[0].parentNode)[0].appendChild(helper[0]);}
    if(helper[0]===this.currentItem[0]){this._storedCSS={width:this.currentItem[0].style.width,height:this.currentItem[0].style.height,position:this.currentItem.css("position"),top:this.currentItem.css("top"),left:this.currentItem.css("left")};}
    if(!helper[0].style.width||o.forceHelperSize){helper.width(this.currentItem.width());}
    if(!helper[0].style.height||o.forceHelperSize){helper.height(this.currentItem.height());}
    return helper;},_adjustOffsetFromHelper:function(obj){if(typeof obj==="string"){obj=obj.split(" ");}
    if($.isArray(obj)){obj={left:+obj[0],top:+obj[1]||0};}
    if("left"in obj){this.offset.click.left=obj.left+this.margins.left;}
    if("right"in obj){this.offset.click.left=this.helperProportions.width-obj.right+this.margins.left;}
    if("top"in obj){this.offset.click.top=obj.top+this.margins.top;}
    if("bottom"in obj){this.offset.click.top=this.helperProportions.height-obj.bottom+this.margins.top;}},_getParentOffset:function(){this.offsetParent=this.helper.offsetParent();var po=this.offsetParent.offset();if(this.cssPosition==="absolute"&&this.scrollParent[0]!==this.document[0]&&$.contains(this.scrollParent[0],this.offsetParent[0])){po.left+=this.scrollParent.scrollLeft();po.top+=this.scrollParent.scrollTop();}
    if(this.offsetParent[0]===this.document[0].body||(this.offsetParent[0].tagName&&this.offsetParent[0].tagName.toLowerCase()==="html"&&$.ui.ie)){po={top:0,left:0};}
    return{top:po.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:po.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)};},_getRelativeOffset:function(){if(this.cssPosition==="relative"){var p=this.currentItem.position();return{top:p.top-(parseInt(this.helper.css("top"),10)||0)+this.scrollParent.scrollTop(),left:p.left-(parseInt(this.helper.css("left"),10)||0)+this.scrollParent.scrollLeft()};}else{return{top:0,left:0};}},_cacheMargins:function(){this.margins={left:(parseInt(this.currentItem.css("marginLeft"),10)||0),top:(parseInt(this.currentItem.css("marginTop"),10)||0)};},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()};},_setContainment:function(){var ce,co,over,o=this.options;if(o.containment==="parent"){o.containment=this.helper[0].parentNode;}
    if(o.containment==="document"||o.containment==="window"){this.containment=[0-this.offset.relative.left-this.offset.parent.left,0-this.offset.relative.top-this.offset.parent.top,o.containment==="document"?this.document.width():this.window.width()-this.helperProportions.width-this.margins.left,(o.containment==="document"?this.document.width():this.window.height()||this.document[0].body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top];}
    if(!(/^(document|window|parent)$/).test(o.containment)){ce=$(o.containment)[0];co=$(o.containment).offset();over=($(ce).css("overflow")!=="hidden");this.containment=[co.left+(parseInt($(ce).css("borderLeftWidth"),10)||0)+(parseInt($(ce).css("paddingLeft"),10)||0)-this.margins.left,co.top+(parseInt($(ce).css("borderTopWidth"),10)||0)+(parseInt($(ce).css("paddingTop"),10)||0)-this.margins.top,co.left+(over?Math.max(ce.scrollWidth,ce.offsetWidth):ce.offsetWidth)-(parseInt($(ce).css("borderLeftWidth"),10)||0)-(parseInt($(ce).css("paddingRight"),10)||0)-this.helperProportions.width-this.margins.left,co.top+(over?Math.max(ce.scrollHeight,ce.offsetHeight):ce.offsetHeight)-(parseInt($(ce).css("borderTopWidth"),10)||0)-(parseInt($(ce).css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top];}},_convertPositionTo:function(d,pos){if(!pos){pos=this.position;}
    var mod=d==="absolute"?1:-1,scroll=this.cssPosition==="absolute"&&!(this.scrollParent[0]!==this.document[0]&&$.contains(this.scrollParent[0],this.offsetParent[0]))?this.offsetParent:this.scrollParent,scrollIsRootNode=(/(html|body)/i).test(scroll[0].tagName);return{top:(pos.top+
    this.offset.relative.top*mod+
    this.offset.parent.top*mod-
    ((this.cssPosition==="fixed"?-this.scrollParent.scrollTop():(scrollIsRootNode?0:scroll.scrollTop()))*mod)),left:(pos.left+
    this.offset.relative.left*mod+
    this.offset.parent.left*mod-
    ((this.cssPosition==="fixed"?-this.scrollParent.scrollLeft():scrollIsRootNode?0:scroll.scrollLeft())*mod))};},_generatePosition:function(event){var top,left,o=this.options,pageX=event.pageX,pageY=event.pageY,scroll=this.cssPosition==="absolute"&&!(this.scrollParent[0]!==this.document[0]&&$.contains(this.scrollParent[0],this.offsetParent[0]))?this.offsetParent:this.scrollParent,scrollIsRootNode=(/(html|body)/i).test(scroll[0].tagName);if(this.cssPosition==="relative"&&!(this.scrollParent[0]!==this.document[0]&&this.scrollParent[0]!==this.offsetParent[0])){this.offset.relative=this._getRelativeOffset();}
    if(this.originalPosition){if(this.containment){if(event.pageX-this.offset.click.left<this.containment[0]){pageX=this.containment[0]+this.offset.click.left;}
    if(event.pageY-this.offset.click.top<this.containment[1]){pageY=this.containment[1]+this.offset.click.top;}
    if(event.pageX-this.offset.click.left>this.containment[2]){pageX=this.containment[2]+this.offset.click.left;}
    if(event.pageY-this.offset.click.top>this.containment[3]){pageY=this.containment[3]+this.offset.click.top;}}
    if(o.grid){top=this.originalPageY+Math.round((pageY-this.originalPageY)/o.grid[1])*o.grid[1];pageY=this.containment?((top-this.offset.click.top>=this.containment[1]&&top-this.offset.click.top<=this.containment[3])?top:((top-this.offset.click.top>=this.containment[1])?top-o.grid[1]:top+o.grid[1])):top;left=this.originalPageX+Math.round((pageX-this.originalPageX)/o.grid[0])*o.grid[0];pageX=this.containment?((left-this.offset.click.left>=this.containment[0]&&left-this.offset.click.left<=this.containment[2])?left:((left-this.offset.click.left>=this.containment[0])?left-o.grid[0]:left+o.grid[0])):left;}}
    return{top:(pageY-
    this.offset.click.top-
    this.offset.relative.top-
    this.offset.parent.top+
    ((this.cssPosition==="fixed"?-this.scrollParent.scrollTop():(scrollIsRootNode?0:scroll.scrollTop())))),left:(pageX-
    this.offset.click.left-
    this.offset.relative.left-
    this.offset.parent.left+
    ((this.cssPosition==="fixed"?-this.scrollParent.scrollLeft():scrollIsRootNode?0:scroll.scrollLeft())))};},_rearrange:function(event,i,a,hardRefresh){a?a[0].appendChild(this.placeholder[0]):i.item[0].parentNode.insertBefore(this.placeholder[0],(this.direction==="down"?i.item[0]:i.item[0].nextSibling));this.counter=this.counter?++this.counter:1;var counter=this.counter;this._delay(function(){if(counter===this.counter){this.refreshPositions(!hardRefresh);}});},_clear:function(event,noPropagation){this.reverting=false;var i,delayedTriggers=[];if(!this._noFinalSort&&this.currentItem.parent().length){this.placeholder.before(this.currentItem);}
    this._noFinalSort=null;if(this.helper[0]===this.currentItem[0]){for(i in this._storedCSS){if(this._storedCSS[i]==="auto"||this._storedCSS[i]==="static"){this._storedCSS[i]="";}}
    this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");}else{this.currentItem.show();}
    if(this.fromOutside&&!noPropagation){delayedTriggers.push(function(event){this._trigger("receive",event,this._uiHash(this.fromOutside));});}
    if((this.fromOutside||this.domPosition.prev!==this.currentItem.prev().not(".ui-sortable-helper")[0]||this.domPosition.parent!==this.currentItem.parent()[0])&&!noPropagation){delayedTriggers.push(function(event){this._trigger("update",event,this._uiHash());});}
    if(this!==this.currentContainer){if(!noPropagation){delayedTriggers.push(function(event){this._trigger("remove",event,this._uiHash());});delayedTriggers.push((function(c){return function(event){c._trigger("receive",event,this._uiHash(this));};}).call(this,this.currentContainer));delayedTriggers.push((function(c){return function(event){c._trigger("update",event,this._uiHash(this));};}).call(this,this.currentContainer));}}
    function delayEvent(type,instance,container){return function(event){container._trigger(type,event,instance._uiHash(instance));};}
    for(i=this.containers.length-1;i>=0;i--){if(!noPropagation){delayedTriggers.push(delayEvent("deactivate",this,this.containers[i]));}
    if(this.containers[i].containerCache.over){delayedTriggers.push(delayEvent("out",this,this.containers[i]));this.containers[i].containerCache.over=0;}}
    if(this.storedCursor){this.document.find("body").css("cursor",this.storedCursor);this.storedStylesheet.remove();}
    if(this._storedOpacity){this.helper.css("opacity",this._storedOpacity);}
    if(this._storedZIndex){this.helper.css("zIndex",this._storedZIndex==="auto"?"":this._storedZIndex);}
    this.dragging=false;if(!noPropagation){this._trigger("beforeStop",event,this._uiHash());}
    this.placeholder[0].parentNode.removeChild(this.placeholder[0]);if(!this.cancelHelperRemoval){if(this.helper[0]!==this.currentItem[0]){this.helper.remove();}
    this.helper=null;}
    if(!noPropagation){for(i=0;i<delayedTriggers.length;i++){delayedTriggers[i].call(this,event);}
    this._trigger("stop",event,this._uiHash());}
    this.fromOutside=false;return!this.cancelHelperRemoval;},_trigger:function(){if($.Widget.prototype._trigger.apply(this,arguments)===false){this.cancel();}},_uiHash:function(_inst){var inst=_inst||this;return{helper:inst.helper,placeholder:inst.placeholder||$([]),position:inst.position,originalPosition:inst.originalPosition,offset:inst.positionAbs,item:inst.currentItem,sender:_inst?_inst.element:null};}});var accordion=$.widget("ui.accordion",{version:"1.11.4",options:{active:0,animate:{},collapsible:false,event:"click",header:"> li > :first-child,> :not(li):even",heightStyle:"auto",icons:{activeHeader:"ui-icon-triangle-1-s",header:"ui-icon-triangle-1-e"},activate:null,beforeActivate:null},hideProps:{borderTopWidth:"hide",borderBottomWidth:"hide",paddingTop:"hide",paddingBottom:"hide",height:"hide"},showProps:{borderTopWidth:"show",borderBottomWidth:"show",paddingTop:"show",paddingBottom:"show",height:"show"},_create:function(){var options=this.options;this.prevShow=this.prevHide=$();this.element.addClass("ui-accordion ui-widget ui-helper-reset").attr("role","tablist");if(!options.collapsible&&(options.active===false||options.active==null)){options.active=0;}
    this._processPanels();if(options.active<0){options.active+=this.headers.length;}
    this._refresh();},_getCreateEventData:function(){return{header:this.active,panel:!this.active.length?$():this.active.next()};},_createIcons:function(){var icons=this.options.icons;if(icons){$("<span>").addClass("ui-accordion-header-icon ui-icon "+icons.header).prependTo(this.headers);this.active.children(".ui-accordion-header-icon").removeClass(icons.header).addClass(icons.activeHeader);this.headers.addClass("ui-accordion-icons");}},_destroyIcons:function(){this.headers.removeClass("ui-accordion-icons").children(".ui-accordion-header-icon").remove();},_destroy:function(){var contents;this.element.removeClass("ui-accordion ui-widget ui-helper-reset").removeAttr("role");this.headers.removeClass("ui-accordion-header ui-accordion-header-active ui-state-default "+"ui-corner-all ui-state-active ui-state-disabled ui-corner-top").removeAttr("role").removeAttr("aria-expanded").removeAttr("aria-selected").removeAttr("aria-controls").removeAttr("tabIndex").removeUniqueId();this._destroyIcons();contents=this.headers.next().removeClass("ui-helper-reset ui-widget-content ui-corner-bottom "+"ui-accordion-content ui-accordion-content-active ui-state-disabled").css("display","").removeAttr("role").removeAttr("aria-hidden").removeAttr("aria-labelledby").removeUniqueId();if(this.options.heightStyle!=="content"){contents.css("height","");}},_setOption:function(key,value){if(key==="active"){this._activate(value);return;}
    if(key==="event"){if(this.options.event){this._off(this.headers,this.options.event);}
    this._setupEvents(value);}
    this._super(key,value);if(key==="collapsible"&&!value&&this.options.active===false){this._activate(0);}
    if(key==="icons"){this._destroyIcons();if(value){this._createIcons();}}
    if(key==="disabled"){this.element.toggleClass("ui-state-disabled",!!value).attr("aria-disabled",value);this.headers.add(this.headers.next()).toggleClass("ui-state-disabled",!!value);}},_keydown:function(event){if(event.altKey||event.ctrlKey){return;}
    var keyCode=$.ui.keyCode,length=this.headers.length,currentIndex=this.headers.index(event.target),toFocus=false;switch(event.keyCode){case keyCode.RIGHT:case keyCode.DOWN:toFocus=this.headers[(currentIndex+1)%length];break;case keyCode.LEFT:case keyCode.UP:toFocus=this.headers[(currentIndex-1+length)%length];break;case keyCode.SPACE:case keyCode.ENTER:this._eventHandler(event);break;case keyCode.HOME:toFocus=this.headers[0];break;case keyCode.END:toFocus=this.headers[length-1];break;}
    if(toFocus){$(event.target).attr("tabIndex",-1);$(toFocus).attr("tabIndex",0);toFocus.focus();event.preventDefault();}},_panelKeyDown:function(event){if(event.keyCode===$.ui.keyCode.UP&&event.ctrlKey){$(event.currentTarget).prev().focus();}},refresh:function(){var options=this.options;this._processPanels();if((options.active===false&&options.collapsible===true)||!this.headers.length){options.active=false;this.active=$();}else if(options.active===false){this._activate(0);}else if(this.active.length&&!$.contains(this.element[0],this.active[0])){if(this.headers.length===this.headers.find(".ui-state-disabled").length){options.active=false;this.active=$();}else{this._activate(Math.max(0,options.active-1));}}else{options.active=this.headers.index(this.active);}
    this._destroyIcons();this._refresh();},_processPanels:function(){var prevHeaders=this.headers,prevPanels=this.panels;this.headers=this.element.find(this.options.header).addClass("ui-accordion-header ui-state-default ui-corner-all");this.panels=this.headers.next().addClass("ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom").filter(":not(.ui-accordion-content-active)").hide();if(prevPanels){this._off(prevHeaders.not(this.headers));this._off(prevPanels.not(this.panels));}},_refresh:function(){var maxHeight,options=this.options,heightStyle=options.heightStyle,parent=this.element.parent();this.active=this._findActive(options.active).addClass("ui-accordion-header-active ui-state-active ui-corner-top").removeClass("ui-corner-all");this.active.next().addClass("ui-accordion-content-active").show();this.headers.attr("role","tab").each(function(){var header=$(this),headerId=header.uniqueId().attr("id"),panel=header.next(),panelId=panel.uniqueId().attr("id");header.attr("aria-controls",panelId);panel.attr("aria-labelledby",headerId);}).next().attr("role","tabpanel");this.headers.not(this.active).attr({"aria-selected":"false","aria-expanded":"false",tabIndex:-1}).next().attr({"aria-hidden":"true"}).hide();if(!this.active.length){this.headers.eq(0).attr("tabIndex",0);}else{this.active.attr({"aria-selected":"true","aria-expanded":"true",tabIndex:0}).next().attr({"aria-hidden":"false"});}
    this._createIcons();this._setupEvents(options.event);if(heightStyle==="fill"){maxHeight=parent.height();this.element.siblings(":visible").each(function(){var elem=$(this),position=elem.css("position");if(position==="absolute"||position==="fixed"){return;}
    maxHeight-=elem.outerHeight(true);});this.headers.each(function(){maxHeight-=$(this).outerHeight(true);});this.headers.next().each(function(){$(this).height(Math.max(0,maxHeight-
    $(this).innerHeight()+$(this).height()));}).css("overflow","auto");}else if(heightStyle==="auto"){maxHeight=0;this.headers.next().each(function(){maxHeight=Math.max(maxHeight,$(this).css("height","").height());}).height(maxHeight);}},_activate:function(index){var active=this._findActive(index)[0];if(active===this.active[0]){return;}
    active=active||this.active[0];this._eventHandler({target:active,currentTarget:active,preventDefault:$.noop});},_findActive:function(selector){return typeof selector==="number"?this.headers.eq(selector):$();},_setupEvents:function(event){var events={keydown:"_keydown"};if(event){$.each(event.split(" "),function(index,eventName){events[eventName]="_eventHandler";});}
    this._off(this.headers.add(this.headers.next()));this._on(this.headers,events);this._on(this.headers.next(),{keydown:"_panelKeyDown"});this._hoverable(this.headers);this._focusable(this.headers);},_eventHandler:function(event){var options=this.options,active=this.active,clicked=$(event.currentTarget),clickedIsActive=clicked[0]===active[0],collapsing=clickedIsActive&&options.collapsible,toShow=collapsing?$():clicked.next(),toHide=active.next(),eventData={oldHeader:active,oldPanel:toHide,newHeader:collapsing?$():clicked,newPanel:toShow};event.preventDefault();if((clickedIsActive&&!options.collapsible)||(this._trigger("beforeActivate",event,eventData)===false)){return;}
    options.active=collapsing?false:this.headers.index(clicked);this.active=clickedIsActive?$():clicked;this._toggle(eventData);active.removeClass("ui-accordion-header-active ui-state-active");if(options.icons){active.children(".ui-accordion-header-icon").removeClass(options.icons.activeHeader).addClass(options.icons.header);}
    if(!clickedIsActive){clicked.removeClass("ui-corner-all").addClass("ui-accordion-header-active ui-state-active ui-corner-top");if(options.icons){clicked.children(".ui-accordion-header-icon").removeClass(options.icons.header).addClass(options.icons.activeHeader);}
    clicked.next().addClass("ui-accordion-content-active");}},_toggle:function(data){var toShow=data.newPanel,toHide=this.prevShow.length?this.prevShow:data.oldPanel;this.prevShow.add(this.prevHide).stop(true,true);this.prevShow=toShow;this.prevHide=toHide;if(this.options.animate){this._animate(toShow,toHide,data);}else{toHide.hide();toShow.show();this._toggleComplete(data);}
    toHide.attr({"aria-hidden":"true"});toHide.prev().attr({"aria-selected":"false","aria-expanded":"false"});if(toShow.length&&toHide.length){toHide.prev().attr({"tabIndex":-1,"aria-expanded":"false"});}else if(toShow.length){this.headers.filter(function(){return parseInt($(this).attr("tabIndex"),10)===0;}).attr("tabIndex",-1);}
    toShow.attr("aria-hidden","false").prev().attr({"aria-selected":"true","aria-expanded":"true",tabIndex:0});},_animate:function(toShow,toHide,data){var total,easing,duration,that=this,adjust=0,boxSizing=toShow.css("box-sizing"),down=toShow.length&&(!toHide.length||(toShow.index()<toHide.index())),animate=this.options.animate||{},options=down&&animate.down||animate,complete=function(){that._toggleComplete(data);};if(typeof options==="number"){duration=options;}
    if(typeof options==="string"){easing=options;}
    easing=easing||options.easing||animate.easing;duration=duration||options.duration||animate.duration;if(!toHide.length){return toShow.animate(this.showProps,duration,easing,complete);}
    if(!toShow.length){return toHide.animate(this.hideProps,duration,easing,complete);}
    total=toShow.show().outerHeight();toHide.animate(this.hideProps,{duration:duration,easing:easing,step:function(now,fx){fx.now=Math.round(now);}});toShow.hide().animate(this.showProps,{duration:duration,easing:easing,complete:complete,step:function(now,fx){fx.now=Math.round(now);if(fx.prop!=="height"){if(boxSizing==="content-box"){adjust+=fx.now;}}else if(that.options.heightStyle!=="content"){fx.now=Math.round(total-toHide.outerHeight()-adjust);adjust=0;}}});},_toggleComplete:function(data){var toHide=data.oldPanel;toHide.removeClass("ui-accordion-content-active").prev().removeClass("ui-corner-top").addClass("ui-corner-all");if(toHide.length){toHide.parent()[0].className=toHide.parent()[0].className;}
    this._trigger("activate",null,data);}});var menu=$.widget("ui.menu",{version:"1.11.4",defaultElement:"<ul>",delay:300,options:{icons:{submenu:"ui-icon-carat-1-e"},items:"> *",menus:"ul",position:{my:"left-1 top",at:"right top"},role:"menu",blur:null,focus:null,select:null},_create:function(){this.activeMenu=this.element;this.mouseHandled=false;this.element.uniqueId().addClass("ui-menu ui-widget ui-widget-content").toggleClass("ui-menu-icons",!!this.element.find(".ui-icon").length).attr({role:this.options.role,tabIndex:0});if(this.options.disabled){this.element.addClass("ui-state-disabled").attr("aria-disabled","true");}
    this._on({"mousedown .ui-menu-item":function(event){event.preventDefault();},"click .ui-menu-item":function(event){var target=$(event.target);if(!this.mouseHandled&&target.not(".ui-state-disabled").length){this.select(event);if(!event.isPropagationStopped()){this.mouseHandled=true;}
    if(target.has(".ui-menu").length){this.expand(event);}else if(!this.element.is(":focus")&&$(this.document[0].activeElement).closest(".ui-menu").length){this.element.trigger("focus",[true]);if(this.active&&this.active.parents(".ui-menu").length===1){clearTimeout(this.timer);}}}},"mouseenter .ui-menu-item":function(event){if(this.previousFilter){return;}
    var target=$(event.currentTarget);target.siblings(".ui-state-active").removeClass("ui-state-active");this.focus(event,target);},mouseleave:"collapseAll","mouseleave .ui-menu":"collapseAll",focus:function(event,keepActiveItem){var item=this.active||this.element.find(this.options.items).eq(0);if(!keepActiveItem){this.focus(event,item);}},blur:function(event){this._delay(function(){if(!$.contains(this.element[0],this.document[0].activeElement)){this.collapseAll(event);}});},keydown:"_keydown"});this.refresh();this._on(this.document,{click:function(event){if(this._closeOnDocumentClick(event)){this.collapseAll(event);}
    this.mouseHandled=false;}});},_destroy:function(){this.element.removeAttr("aria-activedescendant").find(".ui-menu").addBack().removeClass("ui-menu ui-widget ui-widget-content ui-menu-icons ui-front").removeAttr("role").removeAttr("tabIndex").removeAttr("aria-labelledby").removeAttr("aria-expanded").removeAttr("aria-hidden").removeAttr("aria-disabled").removeUniqueId().show();this.element.find(".ui-menu-item").removeClass("ui-menu-item").removeAttr("role").removeAttr("aria-disabled").removeUniqueId().removeClass("ui-state-hover").removeAttr("tabIndex").removeAttr("role").removeAttr("aria-haspopup").children().each(function(){var elem=$(this);if(elem.data("ui-menu-submenu-carat")){elem.remove();}});this.element.find(".ui-menu-divider").removeClass("ui-menu-divider ui-widget-content");},_keydown:function(event){var match,prev,character,skip,preventDefault=true;switch(event.keyCode){case $.ui.keyCode.PAGE_UP:this.previousPage(event);break;case $.ui.keyCode.PAGE_DOWN:this.nextPage(event);break;case $.ui.keyCode.HOME:this._move("first","first",event);break;case $.ui.keyCode.END:this._move("last","last",event);break;case $.ui.keyCode.UP:this.previous(event);break;case $.ui.keyCode.DOWN:this.next(event);break;case $.ui.keyCode.LEFT:this.collapse(event);break;case $.ui.keyCode.RIGHT:if(this.active&&!this.active.is(".ui-state-disabled")){this.expand(event);}
    break;case $.ui.keyCode.ENTER:case $.ui.keyCode.SPACE:this._activate(event);break;case $.ui.keyCode.ESCAPE:this.collapse(event);break;default:preventDefault=false;prev=this.previousFilter||"";character=String.fromCharCode(event.keyCode);skip=false;clearTimeout(this.filterTimer);if(character===prev){skip=true;}else{character=prev+character;}
    match=this._filterMenuItems(character);match=skip&&match.index(this.active.next())!==-1?this.active.nextAll(".ui-menu-item"):match;if(!match.length){character=String.fromCharCode(event.keyCode);match=this._filterMenuItems(character);}
    if(match.length){this.focus(event,match);this.previousFilter=character;this.filterTimer=this._delay(function(){delete this.previousFilter;},1000);}else{delete this.previousFilter;}}
    if(preventDefault){event.preventDefault();}},_activate:function(event){if(!this.active.is(".ui-state-disabled")){if(this.active.is("[aria-haspopup='true']")){this.expand(event);}else{this.select(event);}}},refresh:function(){var menus,items,that=this,icon=this.options.icons.submenu,submenus=this.element.find(this.options.menus);this.element.toggleClass("ui-menu-icons",!!this.element.find(".ui-icon").length);submenus.filter(":not(.ui-menu)").addClass("ui-menu ui-widget ui-widget-content ui-front").hide().attr({role:this.options.role,"aria-hidden":"true","aria-expanded":"false"}).each(function(){var menu=$(this),item=menu.parent(),submenuCarat=$("<span>").addClass("ui-menu-icon ui-icon "+icon).data("ui-menu-submenu-carat",true);item.attr("aria-haspopup","true").prepend(submenuCarat);menu.attr("aria-labelledby",item.attr("id"));});menus=submenus.add(this.element);items=menus.find(this.options.items);items.not(".ui-menu-item").each(function(){var item=$(this);if(that._isDivider(item)){item.addClass("ui-widget-content ui-menu-divider");}});items.not(".ui-menu-item, .ui-menu-divider").addClass("ui-menu-item").uniqueId().attr({tabIndex:-1,role:this._itemRole()});items.filter(".ui-state-disabled").attr("aria-disabled","true");if(this.active&&!$.contains(this.element[0],this.active[0])){this.blur();}},_itemRole:function(){return{menu:"menuitem",listbox:"option"}[this.options.role];},_setOption:function(key,value){if(key==="icons"){this.element.find(".ui-menu-icon").removeClass(this.options.icons.submenu).addClass(value.submenu);}
    if(key==="disabled"){this.element.toggleClass("ui-state-disabled",!!value).attr("aria-disabled",value);}
    this._super(key,value);},focus:function(event,item){var nested,focused;this.blur(event,event&&event.type==="focus");this._scrollIntoView(item);this.active=item.first();focused=this.active.addClass("ui-state-focus").removeClass("ui-state-active");if(this.options.role){this.element.attr("aria-activedescendant",focused.attr("id"));}
    this.active.parent().closest(".ui-menu-item").addClass("ui-state-active");if(event&&event.type==="keydown"){this._close();}else{this.timer=this._delay(function(){this._close();},this.delay);}
    nested=item.children(".ui-menu");if(nested.length&&event&&(/^mouse/.test(event.type))){this._startOpening(nested);}
    this.activeMenu=item.parent();this._trigger("focus",event,{item:item});},_scrollIntoView:function(item){var borderTop,paddingTop,offset,scroll,elementHeight,itemHeight;if(this._hasScroll()){borderTop=parseFloat($.css(this.activeMenu[0],"borderTopWidth"))||0;paddingTop=parseFloat($.css(this.activeMenu[0],"paddingTop"))||0;offset=item.offset().top-this.activeMenu.offset().top-borderTop-paddingTop;scroll=this.activeMenu.scrollTop();elementHeight=this.activeMenu.height();itemHeight=item.outerHeight();if(offset<0){this.activeMenu.scrollTop(scroll+offset);}else if(offset+itemHeight>elementHeight){this.activeMenu.scrollTop(scroll+offset-elementHeight+itemHeight);}}},blur:function(event,fromFocus){if(!fromFocus){clearTimeout(this.timer);}
    if(!this.active){return;}
    this.active.removeClass("ui-state-focus");this.active=null;this._trigger("blur",event,{item:this.active});},_startOpening:function(submenu){clearTimeout(this.timer);if(submenu.attr("aria-hidden")!=="true"){return;}
    this.timer=this._delay(function(){this._close();this._open(submenu);},this.delay);},_open:function(submenu){var position=$.extend({of:this.active},this.options.position);clearTimeout(this.timer);this.element.find(".ui-menu").not(submenu.parents(".ui-menu")).hide().attr("aria-hidden","true");submenu.show().removeAttr("aria-hidden").attr("aria-expanded","true").position(position);},collapseAll:function(event,all){clearTimeout(this.timer);this.timer=this._delay(function(){var currentMenu=all?this.element:$(event&&event.target).closest(this.element.find(".ui-menu"));if(!currentMenu.length){currentMenu=this.element;}
    this._close(currentMenu);this.blur(event);this.activeMenu=currentMenu;},this.delay);},_close:function(startMenu){if(!startMenu){startMenu=this.active?this.active.parent():this.element;}
    startMenu.find(".ui-menu").hide().attr("aria-hidden","true").attr("aria-expanded","false").end().find(".ui-state-active").not(".ui-state-focus").removeClass("ui-state-active");},_closeOnDocumentClick:function(event){return!$(event.target).closest(".ui-menu").length;},_isDivider:function(item){return!/[^\-\u2014\u2013\s]/.test(item.text());},collapse:function(event){var newItem=this.active&&this.active.parent().closest(".ui-menu-item",this.element);if(newItem&&newItem.length){this._close();this.focus(event,newItem);}},expand:function(event){var newItem=this.active&&this.active.children(".ui-menu ").find(this.options.items).first();if(newItem&&newItem.length){this._open(newItem.parent());this._delay(function(){this.focus(event,newItem);});}},next:function(event){this._move("next","first",event);},previous:function(event){this._move("prev","last",event);},isFirstItem:function(){return this.active&&!this.active.prevAll(".ui-menu-item").length;},isLastItem:function(){return this.active&&!this.active.nextAll(".ui-menu-item").length;},_move:function(direction,filter,event){var next;if(this.active){if(direction==="first"||direction==="last"){next=this.active
    [direction==="first"?"prevAll":"nextAll"](".ui-menu-item").eq(-1);}else{next=this.active
    [direction+"All"](".ui-menu-item").eq(0);}}
    if(!next||!next.length||!this.active){next=this.activeMenu.find(this.options.items)[filter]();}
    this.focus(event,next);},nextPage:function(event){var item,base,height;if(!this.active){this.next(event);return;}
    if(this.isLastItem()){return;}
    if(this._hasScroll()){base=this.active.offset().top;height=this.element.height();this.active.nextAll(".ui-menu-item").each(function(){item=$(this);return item.offset().top-base-height<0;});this.focus(event,item);}else{this.focus(event,this.activeMenu.find(this.options.items)
    [!this.active?"first":"last"]());}},previousPage:function(event){var item,base,height;if(!this.active){this.next(event);return;}
    if(this.isFirstItem()){return;}
    if(this._hasScroll()){base=this.active.offset().top;height=this.element.height();this.active.prevAll(".ui-menu-item").each(function(){item=$(this);return item.offset().top-base+height>0;});this.focus(event,item);}else{this.focus(event,this.activeMenu.find(this.options.items).first());}},_hasScroll:function(){return this.element.outerHeight()<this.element.prop("scrollHeight");},select:function(event){this.active=this.active||$(event.target).closest(".ui-menu-item");var ui={item:this.active};if(!this.active.has(".ui-menu").length){this.collapseAll(event,true);}
    this._trigger("select",event,ui);},_filterMenuItems:function(character){var escapedCharacter=character.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"),regex=new RegExp("^"+escapedCharacter,"i");return this.activeMenu.find(this.options.items).filter(".ui-menu-item").filter(function(){return regex.test($.trim($(this).text()));});}});$.widget("ui.autocomplete",{version:"1.11.4",defaultElement:"<input>",options:{appendTo:null,autoFocus:false,delay:300,minLength:1,position:{my:"left top",at:"left bottom",collision:"none"},source:null,change:null,close:null,focus:null,open:null,response:null,search:null,select:null},requestIndex:0,pending:0,_create:function(){var suppressKeyPress,suppressKeyPressRepeat,suppressInput,nodeName=this.element[0].nodeName.toLowerCase(),isTextarea=nodeName==="textarea",isInput=nodeName==="input";this.isMultiLine=isTextarea?true:isInput?false:this.element.prop("isContentEditable");this.valueMethod=this.element[isTextarea||isInput?"val":"text"];this.isNewMenu=true;this.element.addClass("ui-autocomplete-input").attr("autocomplete","off");this._on(this.element,{keydown:function(event){if(this.element.prop("readOnly")){suppressKeyPress=true;suppressInput=true;suppressKeyPressRepeat=true;return;}
    suppressKeyPress=false;suppressInput=false;suppressKeyPressRepeat=false;var keyCode=$.ui.keyCode;switch(event.keyCode){case keyCode.PAGE_UP:suppressKeyPress=true;this._move("previousPage",event);break;case keyCode.PAGE_DOWN:suppressKeyPress=true;this._move("nextPage",event);break;case keyCode.UP:suppressKeyPress=true;this._keyEvent("previous",event);break;case keyCode.DOWN:suppressKeyPress=true;this._keyEvent("next",event);break;case keyCode.ENTER:if(this.menu.active){suppressKeyPress=true;event.preventDefault();this.menu.select(event);}
    break;case keyCode.TAB:if(this.menu.active){this.menu.select(event);}
    break;case keyCode.ESCAPE:if(this.menu.element.is(":visible")){if(!this.isMultiLine){this._value(this.term);}
    this.close(event);event.preventDefault();}
    break;default:suppressKeyPressRepeat=true;this._searchTimeout(event);break;}},keypress:function(event){if(suppressKeyPress){suppressKeyPress=false;if(!this.isMultiLine||this.menu.element.is(":visible")){event.preventDefault();}
    return;}
    if(suppressKeyPressRepeat){return;}
    var keyCode=$.ui.keyCode;switch(event.keyCode){case keyCode.PAGE_UP:this._move("previousPage",event);break;case keyCode.PAGE_DOWN:this._move("nextPage",event);break;case keyCode.UP:this._keyEvent("previous",event);break;case keyCode.DOWN:this._keyEvent("next",event);break;}},input:function(event){if(suppressInput){suppressInput=false;event.preventDefault();return;}
    this._searchTimeout(event);},focus:function(){this.selectedItem=null;this.previous=this._value();},blur:function(event){if(this.cancelBlur){delete this.cancelBlur;return;}
    clearTimeout(this.searching);this.close(event);this._change(event);}});this._initSource();this.menu=$("<ul>").addClass("ui-autocomplete ui-front").appendTo(this._appendTo()).menu({role:null}).hide().menu("instance");this._on(this.menu.element,{mousedown:function(event){event.preventDefault();this.cancelBlur=true;this._delay(function(){delete this.cancelBlur;});var menuElement=this.menu.element[0];if(!$(event.target).closest(".ui-menu-item").length){this._delay(function(){var that=this;this.document.one("mousedown",function(event){if(event.target!==that.element[0]&&event.target!==menuElement&&!$.contains(menuElement,event.target)){that.close();}});});}},menufocus:function(event,ui){var label,item;if(this.isNewMenu){this.isNewMenu=false;if(event.originalEvent&&/^mouse/.test(event.originalEvent.type)){this.menu.blur();this.document.one("mousemove",function(){$(event.target).trigger(event.originalEvent);});return;}}
    item=ui.item.data("ui-autocomplete-item");if(false!==this._trigger("focus",event,{item:item})){if(event.originalEvent&&/^key/.test(event.originalEvent.type)){this._value(item.value);}}
    label=ui.item.attr("aria-label")||item.value;if(label&&$.trim(label).length){this.liveRegion.children().hide();$("<div>").text(label).appendTo(this.liveRegion);}},menuselect:function(event,ui){var item=ui.item.data("ui-autocomplete-item"),previous=this.previous;if(this.element[0]!==this.document[0].activeElement){this.element.focus();this.previous=previous;this._delay(function(){this.previous=previous;this.selectedItem=item;});}
    if(false!==this._trigger("select",event,{item:item})){this._value(item.value);}
    this.term=this._value();this.close(event);this.selectedItem=item;}});this.liveRegion=$("<span>",{role:"status","aria-live":"assertive","aria-relevant":"additions"}).addClass("ui-helper-hidden-accessible").appendTo(this.document[0].body);this._on(this.window,{beforeunload:function(){this.element.removeAttr("autocomplete");}});},_destroy:function(){clearTimeout(this.searching);this.element.removeClass("ui-autocomplete-input").removeAttr("autocomplete");this.menu.element.remove();this.liveRegion.remove();},_setOption:function(key,value){this._super(key,value);if(key==="source"){this._initSource();}
    if(key==="appendTo"){this.menu.element.appendTo(this._appendTo());}
    if(key==="disabled"&&value&&this.xhr){this.xhr.abort();}},_appendTo:function(){var element=this.options.appendTo;if(element){element=element.jquery||element.nodeType?$(element):this.document.find(element).eq(0);}
    if(!element||!element[0]){element=this.element.closest(".ui-front");}
    if(!element.length){element=this.document[0].body;}
    return element;},_initSource:function(){var array,url,that=this;if($.isArray(this.options.source)){array=this.options.source;this.source=function(request,response){response($.ui.autocomplete.filter(array,request.term));};}else if(typeof this.options.source==="string"){url=this.options.source;this.source=function(request,response){if(that.xhr){that.xhr.abort();}
    that.xhr=$.ajax({url:url,data:request,dataType:"json",success:function(data){response(data);},error:function(){response([]);}});};}else{this.source=this.options.source;}},_searchTimeout:function(event){clearTimeout(this.searching);this.searching=this._delay(function(){var equalValues=this.term===this._value(),menuVisible=this.menu.element.is(":visible"),modifierKey=event.altKey||event.ctrlKey||event.metaKey||event.shiftKey;if(!equalValues||(equalValues&&!menuVisible&&!modifierKey)){this.selectedItem=null;this.search(null,event);}},this.options.delay);},search:function(value,event){value=value!=null?value:this._value();this.term=this._value();if(value.length<this.options.minLength){return this.close(event);}
    if(this._trigger("search",event)===false){return;}
    return this._search(value);},_search:function(value){this.pending++;this.element.addClass("ui-autocomplete-loading");this.cancelSearch=false;this.source({term:value},this._response());},_response:function(){var index=++this.requestIndex;return $.proxy(function(content){if(index===this.requestIndex){this.__response(content);}
    this.pending--;if(!this.pending){this.element.removeClass("ui-autocomplete-loading");}},this);},__response:function(content){if(content){content=this._normalize(content);}
    this._trigger("response",null,{content:content});if(!this.options.disabled&&content&&content.length&&!this.cancelSearch){this._suggest(content);this._trigger("open");}else{this._close();}},close:function(event){this.cancelSearch=true;this._close(event);},_close:function(event){if(this.menu.element.is(":visible")){this.menu.element.hide();this.menu.blur();this.isNewMenu=true;this._trigger("close",event);}},_change:function(event){if(this.previous!==this._value()){this._trigger("change",event,{item:this.selectedItem});}},_normalize:function(items){if(items.length&&items[0].label&&items[0].value){return items;}
    return $.map(items,function(item){if(typeof item==="string"){return{label:item,value:item};}
    return $.extend({},item,{label:item.label||item.value,value:item.value||item.label});});},_suggest:function(items){var ul=this.menu.element.empty();this._renderMenu(ul,items);this.isNewMenu=true;this.menu.refresh();ul.show();this._resizeMenu();ul.position($.extend({of:this.element},this.options.position));if(this.options.autoFocus){this.menu.next();}},_resizeMenu:function(){var ul=this.menu.element;ul.outerWidth(Math.max(ul.width("").outerWidth()+1,this.element.outerWidth()));},_renderMenu:function(ul,items){var that=this;$.each(items,function(index,item){that._renderItemData(ul,item);});},_renderItemData:function(ul,item){return this._renderItem(ul,item).data("ui-autocomplete-item",item);},_renderItem:function(ul,item){return $("<li>").text(item.label).appendTo(ul);},_move:function(direction,event){if(!this.menu.element.is(":visible")){this.search(null,event);return;}
    if(this.menu.isFirstItem()&&/^previous/.test(direction)||this.menu.isLastItem()&&/^next/.test(direction)){if(!this.isMultiLine){this._value(this.term);}
    this.menu.blur();return;}
    this.menu[direction](event);},widget:function(){return this.menu.element;},_value:function(){return this.valueMethod.apply(this.element,arguments);},_keyEvent:function(keyEvent,event){if(!this.isMultiLine||this.menu.element.is(":visible")){this._move(keyEvent,event);event.preventDefault();}}});$.extend($.ui.autocomplete,{escapeRegex:function(value){return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&");},filter:function(array,term){var matcher=new RegExp($.ui.autocomplete.escapeRegex(term),"i");return $.grep(array,function(value){return matcher.test(value.label||value.value||value);});}});$.widget("ui.autocomplete",$.ui.autocomplete,{options:{messages:{noResults:"No search results.",results:function(amount){return amount+(amount>1?" results are":" result is")+" available, use up and down arrow keys to navigate.";}}},__response:function(content){var message;this._superApply(arguments);if(this.options.disabled||this.cancelSearch){return;}
    if(content&&content.length){message=this.options.messages.results(content.length);}else{message=this.options.messages.noResults;}
    this.liveRegion.children().hide();$("<div>").text(message).appendTo(this.liveRegion);}});var autocomplete=$.ui.autocomplete;var lastActive,baseClasses="ui-button ui-widget ui-state-default ui-corner-all",typeClasses="ui-button-icons-only ui-button-icon-only ui-button-text-icons ui-button-text-icon-primary ui-button-text-icon-secondary ui-button-text-only",formResetHandler=function(){var form=$(this);setTimeout(function(){form.find(":ui-button").button("refresh");},1);},radioGroup=function(radio){var name=radio.name,form=radio.form,radios=$([]);if(name){name=name.replace(/'/g,"\\'");if(form){radios=$(form).find("[name='"+name+"'][type=radio]");}else{radios=$("[name='"+name+"'][type=radio]",radio.ownerDocument).filter(function(){return!this.form;});}}
    return radios;};$.widget("ui.button",{version:"1.11.4",defaultElement:"<button>",options:{disabled:null,text:true,label:null,icons:{primary:null,secondary:null}},_create:function(){this.element.closest("form").unbind("reset"+this.eventNamespace).bind("reset"+this.eventNamespace,formResetHandler);if(typeof this.options.disabled!=="boolean"){this.options.disabled=!!this.element.prop("disabled");}else{this.element.prop("disabled",this.options.disabled);}
    this._determineButtonType();this.hasTitle=!!this.buttonElement.attr("title");var that=this,options=this.options,toggleButton=this.type==="checkbox"||this.type==="radio",activeClass=!toggleButton?"ui-state-active":"";if(options.label===null){options.label=(this.type==="input"?this.buttonElement.val():this.buttonElement.html());}
    this._hoverable(this.buttonElement);this.buttonElement.addClass(baseClasses).attr("role","button").bind("mouseenter"+this.eventNamespace,function(){if(options.disabled){return;}
    if(this===lastActive){$(this).addClass("ui-state-active");}}).bind("mouseleave"+this.eventNamespace,function(){if(options.disabled){return;}
    $(this).removeClass(activeClass);}).bind("click"+this.eventNamespace,function(event){if(options.disabled){event.preventDefault();event.stopImmediatePropagation();}});this._on({focus:function(){this.buttonElement.addClass("ui-state-focus");},blur:function(){this.buttonElement.removeClass("ui-state-focus");}});if(toggleButton){this.element.bind("change"+this.eventNamespace,function(){that.refresh();});}
    if(this.type==="checkbox"){this.buttonElement.bind("click"+this.eventNamespace,function(){if(options.disabled){return false;}});}else if(this.type==="radio"){this.buttonElement.bind("click"+this.eventNamespace,function(){if(options.disabled){return false;}
    $(this).addClass("ui-state-active");that.buttonElement.attr("aria-pressed","true");var radio=that.element[0];radioGroup(radio).not(radio).map(function(){return $(this).button("widget")[0];}).removeClass("ui-state-active").attr("aria-pressed","false");});}else{this.buttonElement.bind("mousedown"+this.eventNamespace,function(){if(options.disabled){return false;}
    $(this).addClass("ui-state-active");lastActive=this;that.document.one("mouseup",function(){lastActive=null;});}).bind("mouseup"+this.eventNamespace,function(){if(options.disabled){return false;}
    $(this).removeClass("ui-state-active");}).bind("keydown"+this.eventNamespace,function(event){if(options.disabled){return false;}
    if(event.keyCode===$.ui.keyCode.SPACE||event.keyCode===$.ui.keyCode.ENTER){$(this).addClass("ui-state-active");}}).bind("keyup"+this.eventNamespace+" blur"+this.eventNamespace,function(){$(this).removeClass("ui-state-active");});if(this.buttonElement.is("a")){this.buttonElement.keyup(function(event){if(event.keyCode===$.ui.keyCode.SPACE){$(this).click();}});}}
    this._setOption("disabled",options.disabled);this._resetButton();},_determineButtonType:function(){var ancestor,labelSelector,checked;if(this.element.is("[type=checkbox]")){this.type="checkbox";}else if(this.element.is("[type=radio]")){this.type="radio";}else if(this.element.is("input")){this.type="input";}else{this.type="button";}
    if(this.type==="checkbox"||this.type==="radio"){ancestor=this.element.parents().last();labelSelector="label[for='"+this.element.attr("id")+"']";this.buttonElement=ancestor.find(labelSelector);if(!this.buttonElement.length){ancestor=ancestor.length?ancestor.siblings():this.element.siblings();this.buttonElement=ancestor.filter(labelSelector);if(!this.buttonElement.length){this.buttonElement=ancestor.find(labelSelector);}}
    this.element.addClass("ui-helper-hidden-accessible");checked=this.element.is(":checked");if(checked){this.buttonElement.addClass("ui-state-active");}
    this.buttonElement.prop("aria-pressed",checked);}else{this.buttonElement=this.element;}},widget:function(){return this.buttonElement;},_destroy:function(){this.element.removeClass("ui-helper-hidden-accessible");this.buttonElement.removeClass(baseClasses+" ui-state-active "+typeClasses).removeAttr("role").removeAttr("aria-pressed").html(this.buttonElement.find(".ui-button-text").html());if(!this.hasTitle){this.buttonElement.removeAttr("title");}},_setOption:function(key,value){this._super(key,value);if(key==="disabled"){this.widget().toggleClass("ui-state-disabled",!!value);this.element.prop("disabled",!!value);if(value){if(this.type==="checkbox"||this.type==="radio"){this.buttonElement.removeClass("ui-state-focus");}else{this.buttonElement.removeClass("ui-state-focus ui-state-active");}}
    return;}
    this._resetButton();},refresh:function(){var isDisabled=this.element.is("input, button")?this.element.is(":disabled"):this.element.hasClass("ui-button-disabled");if(isDisabled!==this.options.disabled){this._setOption("disabled",isDisabled);}
    if(this.type==="radio"){radioGroup(this.element[0]).each(function(){if($(this).is(":checked")){$(this).button("widget").addClass("ui-state-active").attr("aria-pressed","true");}else{$(this).button("widget").removeClass("ui-state-active").attr("aria-pressed","false");}});}else if(this.type==="checkbox"){if(this.element.is(":checked")){this.buttonElement.addClass("ui-state-active").attr("aria-pressed","true");}else{this.buttonElement.removeClass("ui-state-active").attr("aria-pressed","false");}}},_resetButton:function(){if(this.type==="input"){if(this.options.label){this.element.val(this.options.label);}
    return;}
    var buttonElement=this.buttonElement.removeClass(typeClasses),buttonText=$("<span></span>",this.document[0]).addClass("ui-button-text").html(this.options.label).appendTo(buttonElement.empty()).text(),icons=this.options.icons,multipleIcons=icons.primary&&icons.secondary,buttonClasses=[];if(icons.primary||icons.secondary){if(this.options.text){buttonClasses.push("ui-button-text-icon"+(multipleIcons?"s":(icons.primary?"-primary":"-secondary")));}
    if(icons.primary){buttonElement.prepend("<span class='ui-button-icon-primary ui-icon "+icons.primary+"'></span>");}
    if(icons.secondary){buttonElement.append("<span class='ui-button-icon-secondary ui-icon "+icons.secondary+"'></span>");}
    if(!this.options.text){buttonClasses.push(multipleIcons?"ui-button-icons-only":"ui-button-icon-only");if(!this.hasTitle){buttonElement.attr("title",$.trim(buttonText));}}}else{buttonClasses.push("ui-button-text-only");}
    buttonElement.addClass(buttonClasses.join(" "));}});$.widget("ui.buttonset",{version:"1.11.4",options:{items:"button, input[type=button], input[type=submit], input[type=reset], input[type=checkbox], input[type=radio], a, :data(ui-button)"},_create:function(){this.element.addClass("ui-buttonset");},_init:function(){this.refresh();},_setOption:function(key,value){if(key==="disabled"){this.buttons.button("option",key,value);}
    this._super(key,value);},refresh:function(){var rtl=this.element.css("direction")==="rtl",allButtons=this.element.find(this.options.items),existingButtons=allButtons.filter(":ui-button");allButtons.not(":ui-button").button();existingButtons.button("refresh");this.buttons=allButtons.map(function(){return $(this).button("widget")[0];}).removeClass("ui-corner-all ui-corner-left ui-corner-right").filter(":first").addClass(rtl?"ui-corner-right":"ui-corner-left").end().filter(":last").addClass(rtl?"ui-corner-left":"ui-corner-right").end().end();},_destroy:function(){this.element.removeClass("ui-buttonset");this.buttons.map(function(){return $(this).button("widget")[0];}).removeClass("ui-corner-left ui-corner-right").end().button("destroy");}});var button=$.ui.button;var dialog=$.widget("ui.dialog",{version:"1.11.4",options:{appendTo:"body",autoOpen:true,buttons:[],closeOnEscape:true,closeText:"Close",dialogClass:"",draggable:true,hide:null,height:"auto",maxHeight:null,maxWidth:null,minHeight:150,minWidth:150,modal:false,position:{my:"center",at:"center",of:window,collision:"fit",using:function(pos){var topOffset=$(this).css(pos).offset().top;if(topOffset<0){$(this).css("top",pos.top-topOffset);}}},resizable:true,show:null,title:null,width:300,beforeClose:null,close:null,drag:null,dragStart:null,dragStop:null,focus:null,open:null,resize:null,resizeStart:null,resizeStop:null},sizeRelatedOptions:{buttons:true,height:true,maxHeight:true,maxWidth:true,minHeight:true,minWidth:true,width:true},resizableRelatedOptions:{maxHeight:true,maxWidth:true,minHeight:true,minWidth:true},_create:function(){this.originalCss={display:this.element[0].style.display,width:this.element[0].style.width,minHeight:this.element[0].style.minHeight,maxHeight:this.element[0].style.maxHeight,height:this.element[0].style.height};this.originalPosition={parent:this.element.parent(),index:this.element.parent().children().index(this.element)};this.originalTitle=this.element.attr("title");this.options.title=this.options.title||this.originalTitle;this._createWrapper();this.element.show().removeAttr("title").addClass("ui-dialog-content ui-widget-content").appendTo(this.uiDialog);this._createTitlebar();this._createButtonPane();if(this.options.draggable&&$.fn.draggable){this._makeDraggable();}
    if(this.options.resizable&&$.fn.resizable){this._makeResizable();}
    this._isOpen=false;this._trackFocus();},_init:function(){if(this.options.autoOpen){this.open();}},_appendTo:function(){var element=this.options.appendTo;if(element&&(element.jquery||element.nodeType)){return $(element);}
    return this.document.find(element||"body").eq(0);},_destroy:function(){var next,originalPosition=this.originalPosition;this._untrackInstance();this._destroyOverlay();this.element.removeUniqueId().removeClass("ui-dialog-content ui-widget-content").css(this.originalCss).detach();this.uiDialog.stop(true,true).remove();if(this.originalTitle){this.element.attr("title",this.originalTitle);}
    next=originalPosition.parent.children().eq(originalPosition.index);if(next.length&&next[0]!==this.element[0]){next.before(this.element);}else{originalPosition.parent.append(this.element);}},widget:function(){return this.uiDialog;},disable:$.noop,enable:$.noop,close:function(event){var activeElement,that=this;if(!this._isOpen||this._trigger("beforeClose",event)===false){return;}
    this._isOpen=false;this._focusedElement=null;this._destroyOverlay();this._untrackInstance();if(!this.opener.filter(":focusable").focus().length){try{activeElement=this.document[0].activeElement;if(activeElement&&activeElement.nodeName.toLowerCase()!=="body"){$(activeElement).blur();}}catch(error){}}
    this._hide(this.uiDialog,this.options.hide,function(){that._trigger("close",event);});},isOpen:function(){return this._isOpen;},moveToTop:function(){this._moveToTop();},_moveToTop:function(event,silent){var moved=false,zIndices=this.uiDialog.siblings(".ui-front:visible").map(function(){return+$(this).css("z-index");}).get(),zIndexMax=Math.max.apply(null,zIndices);if(zIndexMax>=+this.uiDialog.css("z-index")){this.uiDialog.css("z-index",zIndexMax+1);moved=true;}
    if(moved&&!silent){this._trigger("focus",event);}
    return moved;},open:function(){var that=this;if(this._isOpen){if(this._moveToTop()){this._focusTabbable();}
    return;}
    this._isOpen=true;this.opener=$(this.document[0].activeElement);this._size();this._position();this._createOverlay();this._moveToTop(null,true);if(this.overlay){this.overlay.css("z-index",this.uiDialog.css("z-index")-1);}
    this._show(this.uiDialog,this.options.show,function(){that._focusTabbable();that._trigger("focus");});this._makeFocusTarget();this._trigger("open");},_focusTabbable:function(){var hasFocus=this._focusedElement;if(!hasFocus){hasFocus=this.element.find("[autofocus]");}
    if(!hasFocus.length){hasFocus=this.element.find(":tabbable");}
    if(!hasFocus.length){hasFocus=this.uiDialogButtonPane.find(":tabbable");}
    if(!hasFocus.length){hasFocus=this.uiDialogTitlebarClose.filter(":tabbable");}
    if(!hasFocus.length){hasFocus=this.uiDialog;}
    hasFocus.eq(0).focus();},_keepFocus:function(event){function checkFocus(){var activeElement=this.document[0].activeElement,isActive=this.uiDialog[0]===activeElement||$.contains(this.uiDialog[0],activeElement);if(!isActive){this._focusTabbable();}}
    event.preventDefault();checkFocus.call(this);this._delay(checkFocus);},_createWrapper:function(){this.uiDialog=$("<div>").addClass("ui-dialog ui-widget ui-widget-content ui-corner-all ui-front "+
    this.options.dialogClass).hide().attr({tabIndex:-1,role:"dialog"}).appendTo(this._appendTo());this._on(this.uiDialog,{keydown:function(event){if(this.options.closeOnEscape&&!event.isDefaultPrevented()&&event.keyCode&&event.keyCode===$.ui.keyCode.ESCAPE){event.preventDefault();this.close(event);return;}
    if(event.keyCode!==$.ui.keyCode.TAB||event.isDefaultPrevented()){return;}
    var tabbables=this.uiDialog.find(":tabbable"),first=tabbables.filter(":first"),last=tabbables.filter(":last");if((event.target===last[0]||event.target===this.uiDialog[0])&&!event.shiftKey){this._delay(function(){first.focus();});event.preventDefault();}else if((event.target===first[0]||event.target===this.uiDialog[0])&&event.shiftKey){this._delay(function(){last.focus();});event.preventDefault();}},mousedown:function(event){if(this._moveToTop(event)){this._focusTabbable();}}});if(!this.element.find("[aria-describedby]").length){this.uiDialog.attr({"aria-describedby":this.element.uniqueId().attr("id")});}},_createTitlebar:function(){var uiDialogTitle;this.uiDialogTitlebar=$("<div>").addClass("ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix").prependTo(this.uiDialog);this._on(this.uiDialogTitlebar,{mousedown:function(event){if(!$(event.target).closest(".ui-dialog-titlebar-close")){this.uiDialog.focus();}}});this.uiDialogTitlebarClose=$("<button type='button'></button>").button({label:this.options.closeText,icons:{primary:"ui-icon-closethick"},text:false}).addClass("ui-dialog-titlebar-close").appendTo(this.uiDialogTitlebar);this._on(this.uiDialogTitlebarClose,{click:function(event){event.preventDefault();this.close(event);}});uiDialogTitle=$("<span>").uniqueId().addClass("ui-dialog-title").prependTo(this.uiDialogTitlebar);this._title(uiDialogTitle);this.uiDialog.attr({"aria-labelledby":uiDialogTitle.attr("id")});},_title:function(title){if(!this.options.title){title.html("&#160;");}
    title.text(this.options.title);},_createButtonPane:function(){this.uiDialogButtonPane=$("<div>").addClass("ui-dialog-buttonpane ui-widget-content ui-helper-clearfix");this.uiButtonSet=$("<div>").addClass("ui-dialog-buttonset").appendTo(this.uiDialogButtonPane);this._createButtons();},_createButtons:function(){var that=this,buttons=this.options.buttons;this.uiDialogButtonPane.remove();this.uiButtonSet.empty();if($.isEmptyObject(buttons)||($.isArray(buttons)&&!buttons.length)){this.uiDialog.removeClass("ui-dialog-buttons");return;}
    $.each(buttons,function(name,props){var click,buttonOptions;props=$.isFunction(props)?{click:props,text:name}:props;props=$.extend({type:"button"},props);click=props.click;props.click=function(){click.apply(that.element[0],arguments);};buttonOptions={icons:props.icons,text:props.showText};delete props.icons;delete props.showText;$("<button></button>",props).button(buttonOptions).appendTo(that.uiButtonSet);});this.uiDialog.addClass("ui-dialog-buttons");this.uiDialogButtonPane.appendTo(this.uiDialog);},_makeDraggable:function(){var that=this,options=this.options;function filteredUi(ui){return{position:ui.position,offset:ui.offset};}
    this.uiDialog.draggable({cancel:".ui-dialog-content, .ui-dialog-titlebar-close",handle:".ui-dialog-titlebar",containment:"document",start:function(event,ui){$(this).addClass("ui-dialog-dragging");that._blockFrames();that._trigger("dragStart",event,filteredUi(ui));},drag:function(event,ui){that._trigger("drag",event,filteredUi(ui));},stop:function(event,ui){var left=ui.offset.left-that.document.scrollLeft(),top=ui.offset.top-that.document.scrollTop();options.position={my:"left top",at:"left"+(left>=0?"+":"")+left+" "+"top"+(top>=0?"+":"")+top,of:that.window};$(this).removeClass("ui-dialog-dragging");that._unblockFrames();that._trigger("dragStop",event,filteredUi(ui));}});},_makeResizable:function(){var that=this,options=this.options,handles=options.resizable,position=this.uiDialog.css("position"),resizeHandles=typeof handles==="string"?handles:"n,e,s,w,se,sw,ne,nw";function filteredUi(ui){return{originalPosition:ui.originalPosition,originalSize:ui.originalSize,position:ui.position,size:ui.size};}
    this.uiDialog.resizable({cancel:".ui-dialog-content",containment:"document",alsoResize:this.element,maxWidth:options.maxWidth,maxHeight:options.maxHeight,minWidth:options.minWidth,minHeight:this._minHeight(),handles:resizeHandles,start:function(event,ui){$(this).addClass("ui-dialog-resizing");that._blockFrames();that._trigger("resizeStart",event,filteredUi(ui));},resize:function(event,ui){that._trigger("resize",event,filteredUi(ui));},stop:function(event,ui){var offset=that.uiDialog.offset(),left=offset.left-that.document.scrollLeft(),top=offset.top-that.document.scrollTop();options.height=that.uiDialog.height();options.width=that.uiDialog.width();options.position={my:"left top",at:"left"+(left>=0?"+":"")+left+" "+"top"+(top>=0?"+":"")+top,of:that.window};$(this).removeClass("ui-dialog-resizing");that._unblockFrames();that._trigger("resizeStop",event,filteredUi(ui));}}).css("position",position);},_trackFocus:function(){this._on(this.widget(),{focusin:function(event){this._makeFocusTarget();this._focusedElement=$(event.target);}});},_makeFocusTarget:function(){this._untrackInstance();this._trackingInstances().unshift(this);},_untrackInstance:function(){var instances=this._trackingInstances(),exists=$.inArray(this,instances);if(exists!==-1){instances.splice(exists,1);}},_trackingInstances:function(){var instances=this.document.data("ui-dialog-instances");if(!instances){instances=[];this.document.data("ui-dialog-instances",instances);}
    return instances;},_minHeight:function(){var options=this.options;return options.height==="auto"?options.minHeight:Math.min(options.minHeight,options.height);},_position:function(){var isVisible=this.uiDialog.is(":visible");if(!isVisible){this.uiDialog.show();}
    this.uiDialog.position(this.options.position);if(!isVisible){this.uiDialog.hide();}},_setOptions:function(options){var that=this,resize=false,resizableOptions={};$.each(options,function(key,value){that._setOption(key,value);if(key in that.sizeRelatedOptions){resize=true;}
    if(key in that.resizableRelatedOptions){resizableOptions[key]=value;}});if(resize){this._size();this._position();}
    if(this.uiDialog.is(":data(ui-resizable)")){this.uiDialog.resizable("option",resizableOptions);}},_setOption:function(key,value){var isDraggable,isResizable,uiDialog=this.uiDialog;if(key==="dialogClass"){uiDialog.removeClass(this.options.dialogClass).addClass(value);}
    if(key==="disabled"){return;}
    this._super(key,value);if(key==="appendTo"){this.uiDialog.appendTo(this._appendTo());}
    if(key==="buttons"){this._createButtons();}
    if(key==="closeText"){this.uiDialogTitlebarClose.button({label:""+value});}
    if(key==="draggable"){isDraggable=uiDialog.is(":data(ui-draggable)");if(isDraggable&&!value){uiDialog.draggable("destroy");}
    if(!isDraggable&&value){this._makeDraggable();}}
    if(key==="position"){this._position();}
    if(key==="resizable"){isResizable=uiDialog.is(":data(ui-resizable)");if(isResizable&&!value){uiDialog.resizable("destroy");}
    if(isResizable&&typeof value==="string"){uiDialog.resizable("option","handles",value);}
    if(!isResizable&&value!==false){this._makeResizable();}}
    if(key==="title"){this._title(this.uiDialogTitlebar.find(".ui-dialog-title"));}},_size:function(){var nonContentHeight,minContentHeight,maxContentHeight,options=this.options;this.element.show().css({width:"auto",minHeight:0,maxHeight:"none",height:0});if(options.minWidth>options.width){options.width=options.minWidth;}
    nonContentHeight=this.uiDialog.css({height:"auto",width:options.width}).outerHeight();minContentHeight=Math.max(0,options.minHeight-nonContentHeight);maxContentHeight=typeof options.maxHeight==="number"?Math.max(0,options.maxHeight-nonContentHeight):"none";if(options.height==="auto"){this.element.css({minHeight:minContentHeight,maxHeight:maxContentHeight,height:"auto"});}else{this.element.height(Math.max(0,options.height-nonContentHeight));}
    if(this.uiDialog.is(":data(ui-resizable)")){this.uiDialog.resizable("option","minHeight",this._minHeight());}},_blockFrames:function(){this.iframeBlocks=this.document.find("iframe").map(function(){var iframe=$(this);return $("<div>").css({position:"absolute",width:iframe.outerWidth(),height:iframe.outerHeight()}).appendTo(iframe.parent()).offset(iframe.offset())[0];});},_unblockFrames:function(){if(this.iframeBlocks){this.iframeBlocks.remove();delete this.iframeBlocks;}},_allowInteraction:function(event){if($(event.target).closest(".ui-dialog").length){return true;}
    return!!$(event.target).closest(".ui-datepicker").length;},_createOverlay:function(){if(!this.options.modal){return;}
    var isOpening=true;this._delay(function(){isOpening=false;});if(!this.document.data("ui-dialog-overlays")){this._on(this.document,{focusin:function(event){if(isOpening){return;}
    if(!this._allowInteraction(event)){event.preventDefault();this._trackingInstances()[0]._focusTabbable();}}});}
    this.overlay=$("<div>").addClass("ui-widget-overlay ui-front").appendTo(this._appendTo());this._on(this.overlay,{mousedown:"_keepFocus"});this.document.data("ui-dialog-overlays",(this.document.data("ui-dialog-overlays")||0)+1);},_destroyOverlay:function(){if(!this.options.modal){return;}
    if(this.overlay){var overlays=this.document.data("ui-dialog-overlays")-1;if(!overlays){this.document.unbind("focusin").removeData("ui-dialog-overlays");}else{this.document.data("ui-dialog-overlays",overlays);}
    this.overlay.remove();this.overlay=null;}}});var progressbar=$.widget("ui.progressbar",{version:"1.11.4",options:{max:100,value:0,change:null,complete:null},min:0,_create:function(){this.oldValue=this.options.value=this._constrainedValue();this.element.addClass("ui-progressbar ui-widget ui-widget-content ui-corner-all").attr({role:"progressbar","aria-valuemin":this.min});this.valueDiv=$("<div class='ui-progressbar-value ui-widget-header ui-corner-left'></div>").appendTo(this.element);this._refreshValue();},_destroy:function(){this.element.removeClass("ui-progressbar ui-widget ui-widget-content ui-corner-all").removeAttr("role").removeAttr("aria-valuemin").removeAttr("aria-valuemax").removeAttr("aria-valuenow");this.valueDiv.remove();},value:function(newValue){if(newValue===undefined){return this.options.value;}
    this.options.value=this._constrainedValue(newValue);this._refreshValue();},_constrainedValue:function(newValue){if(newValue===undefined){newValue=this.options.value;}
    this.indeterminate=newValue===false;if(typeof newValue!=="number"){newValue=0;}
    return this.indeterminate?false:Math.min(this.options.max,Math.max(this.min,newValue));},_setOptions:function(options){var value=options.value;delete options.value;this._super(options);this.options.value=this._constrainedValue(value);this._refreshValue();},_setOption:function(key,value){if(key==="max"){value=Math.max(this.min,value);}
    if(key==="disabled"){this.element.toggleClass("ui-state-disabled",!!value).attr("aria-disabled",value);}
    this._super(key,value);},_percentage:function(){return this.indeterminate?100:100*(this.options.value-this.min)/(this.options.max-this.min);},_refreshValue:function(){var value=this.options.value,percentage=this._percentage();this.valueDiv.toggle(this.indeterminate||value>this.min).toggleClass("ui-corner-right",value===this.options.max).width(percentage.toFixed(0)+"%");this.element.toggleClass("ui-progressbar-indeterminate",this.indeterminate);if(this.indeterminate){this.element.removeAttr("aria-valuenow");if(!this.overlayDiv){this.overlayDiv=$("<div class='ui-progressbar-overlay'></div>").appendTo(this.valueDiv);}}else{this.element.attr({"aria-valuemax":this.options.max,"aria-valuenow":value});if(this.overlayDiv){this.overlayDiv.remove();this.overlayDiv=null;}}
    if(this.oldValue!==value){this.oldValue=value;this._trigger("change");}
    if(value===this.options.max){this._trigger("complete");}}});var selectmenu=$.widget("ui.selectmenu",{version:"1.11.4",defaultElement:"<select>",options:{appendTo:null,disabled:null,icons:{button:"ui-icon-triangle-1-s"},position:{my:"left top",at:"left bottom",collision:"none"},width:null,change:null,close:null,focus:null,open:null,select:null},_create:function(){var selectmenuId=this.element.uniqueId().attr("id");this.ids={element:selectmenuId,button:selectmenuId+"-button",menu:selectmenuId+"-menu"};this._drawButton();this._drawMenu();if(this.options.disabled){this.disable();}},_drawButton:function(){var that=this;this.label=$("label[for='"+this.ids.element+"']").attr("for",this.ids.button);this._on(this.label,{click:function(event){this.button.focus();event.preventDefault();}});this.element.hide();this.button=$("<span>",{"class":"ui-selectmenu-button ui-widget ui-state-default ui-corner-all",tabindex:this.options.disabled?-1:0,id:this.ids.button,role:"combobox","aria-expanded":"false","aria-autocomplete":"list","aria-owns":this.ids.menu,"aria-haspopup":"true"}).insertAfter(this.element);$("<span>",{"class":"ui-icon "+this.options.icons.button}).prependTo(this.button);this.buttonText=$("<span>",{"class":"ui-selectmenu-text"}).appendTo(this.button);this._setText(this.buttonText,this.element.find("option:selected").text());this._resizeButton();this._on(this.button,this._buttonEvents);this.button.one("focusin",function(){if(!that.menuItems){that._refreshMenu();}});this._hoverable(this.button);this._focusable(this.button);},_drawMenu:function(){var that=this;this.menu=$("<ul>",{"aria-hidden":"true","aria-labelledby":this.ids.button,id:this.ids.menu});this.menuWrap=$("<div>",{"class":"ui-selectmenu-menu ui-front"}).append(this.menu).appendTo(this._appendTo());this.menuInstance=this.menu.menu({role:"listbox",select:function(event,ui){event.preventDefault();that._setSelection();that._select(ui.item.data("ui-selectmenu-item"),event);},focus:function(event,ui){var item=ui.item.data("ui-selectmenu-item");if(that.focusIndex!=null&&item.index!==that.focusIndex){that._trigger("focus",event,{item:item});if(!that.isOpen){that._select(item,event);}}
    that.focusIndex=item.index;that.button.attr("aria-activedescendant",that.menuItems.eq(item.index).attr("id"));}}).menu("instance");this.menu.addClass("ui-corner-bottom").removeClass("ui-corner-all");this.menuInstance._off(this.menu,"mouseleave");this.menuInstance._closeOnDocumentClick=function(){return false;};this.menuInstance._isDivider=function(){return false;};},refresh:function(){this._refreshMenu();this._setText(this.buttonText,this._getSelectedItem().text());if(!this.options.width){this._resizeButton();}},_refreshMenu:function(){this.menu.empty();var item,options=this.element.find("option");if(!options.length){return;}
    this._parseOptions(options);this._renderMenu(this.menu,this.items);this.menuInstance.refresh();this.menuItems=this.menu.find("li").not(".ui-selectmenu-optgroup");item=this._getSelectedItem();this.menuInstance.focus(null,item);this._setAria(item.data("ui-selectmenu-item"));this._setOption("disabled",this.element.prop("disabled"));},open:function(event){if(this.options.disabled){return;}
    if(!this.menuItems){this._refreshMenu();}else{this.menu.find(".ui-state-focus").removeClass("ui-state-focus");this.menuInstance.focus(null,this._getSelectedItem());}
    this.isOpen=true;this._toggleAttr();this._resizeMenu();this._position();this._on(this.document,this._documentClick);this._trigger("open",event);},_position:function(){this.menuWrap.position($.extend({of:this.button},this.options.position));},close:function(event){if(!this.isOpen){return;}
    this.isOpen=false;this._toggleAttr();this.range=null;this._off(this.document);this._trigger("close",event);},widget:function(){return this.button;},menuWidget:function(){return this.menu;},_renderMenu:function(ul,items){var that=this,currentOptgroup="";$.each(items,function(index,item){if(item.optgroup!==currentOptgroup){$("<li>",{"class":"ui-selectmenu-optgroup ui-menu-divider"+
    (item.element.parent("optgroup").prop("disabled")?" ui-state-disabled":""),text:item.optgroup}).appendTo(ul);currentOptgroup=item.optgroup;}
    that._renderItemData(ul,item);});},_renderItemData:function(ul,item){return this._renderItem(ul,item).data("ui-selectmenu-item",item);},_renderItem:function(ul,item){var li=$("<li>");if(item.disabled){li.addClass("ui-state-disabled");}
    this._setText(li,item.label);return li.appendTo(ul);},_setText:function(element,value){if(value){element.text(value);}else{element.html("&#160;");}},_move:function(direction,event){var item,next,filter=".ui-menu-item";if(this.isOpen){item=this.menuItems.eq(this.focusIndex);}else{item=this.menuItems.eq(this.element[0].selectedIndex);filter+=":not(.ui-state-disabled)";}
    if(direction==="first"||direction==="last"){next=item[direction==="first"?"prevAll":"nextAll"](filter).eq(-1);}else{next=item[direction+"All"](filter).eq(0);}
    if(next.length){this.menuInstance.focus(event,next);}},_getSelectedItem:function(){return this.menuItems.eq(this.element[0].selectedIndex);},_toggle:function(event){this[this.isOpen?"close":"open"](event);},_setSelection:function(){var selection;if(!this.range){return;}
    if(window.getSelection){selection=window.getSelection();selection.removeAllRanges();selection.addRange(this.range);}else{this.range.select();}
    this.button.focus();},_documentClick:{mousedown:function(event){if(!this.isOpen){return;}
    if(!$(event.target).closest(".ui-selectmenu-menu, #"+this.ids.button).length){this.close(event);}}},_buttonEvents:{mousedown:function(){var selection;if(window.getSelection){selection=window.getSelection();if(selection.rangeCount){this.range=selection.getRangeAt(0);}}else{this.range=document.selection.createRange();}},click:function(event){this._setSelection();this._toggle(event);},keydown:function(event){var preventDefault=true;switch(event.keyCode){case $.ui.keyCode.TAB:case $.ui.keyCode.ESCAPE:this.close(event);preventDefault=false;break;case $.ui.keyCode.ENTER:if(this.isOpen){this._selectFocusedItem(event);}
    break;case $.ui.keyCode.UP:if(event.altKey){this._toggle(event);}else{this._move("prev",event);}
    break;case $.ui.keyCode.DOWN:if(event.altKey){this._toggle(event);}else{this._move("next",event);}
    break;case $.ui.keyCode.SPACE:if(this.isOpen){this._selectFocusedItem(event);}else{this._toggle(event);}
    break;case $.ui.keyCode.LEFT:this._move("prev",event);break;case $.ui.keyCode.RIGHT:this._move("next",event);break;case $.ui.keyCode.HOME:case $.ui.keyCode.PAGE_UP:this._move("first",event);break;case $.ui.keyCode.END:case $.ui.keyCode.PAGE_DOWN:this._move("last",event);break;default:this.menu.trigger(event);preventDefault=false;}
    if(preventDefault){event.preventDefault();}}},_selectFocusedItem:function(event){var item=this.menuItems.eq(this.focusIndex);if(!item.hasClass("ui-state-disabled")){this._select(item.data("ui-selectmenu-item"),event);}},_select:function(item,event){var oldIndex=this.element[0].selectedIndex;this.element[0].selectedIndex=item.index;this._setText(this.buttonText,item.label);this._setAria(item);this._trigger("select",event,{item:item});if(item.index!==oldIndex){this._trigger("change",event,{item:item});}
    this.close(event);},_setAria:function(item){var id=this.menuItems.eq(item.index).attr("id");this.button.attr({"aria-labelledby":id,"aria-activedescendant":id});this.menu.attr("aria-activedescendant",id);},_setOption:function(key,value){if(key==="icons"){this.button.find("span.ui-icon").removeClass(this.options.icons.button).addClass(value.button);}
    this._super(key,value);if(key==="appendTo"){this.menuWrap.appendTo(this._appendTo());}
    if(key==="disabled"){this.menuInstance.option("disabled",value);this.button.toggleClass("ui-state-disabled",value).attr("aria-disabled",value);this.element.prop("disabled",value);if(value){this.button.attr("tabindex",-1);this.close();}else{this.button.attr("tabindex",0);}}
    if(key==="width"){this._resizeButton();}},_appendTo:function(){var element=this.options.appendTo;if(element){element=element.jquery||element.nodeType?$(element):this.document.find(element).eq(0);}
    if(!element||!element[0]){element=this.element.closest(".ui-front");}
    if(!element.length){element=this.document[0].body;}
    return element;},_toggleAttr:function(){this.button.toggleClass("ui-corner-top",this.isOpen).toggleClass("ui-corner-all",!this.isOpen).attr("aria-expanded",this.isOpen);this.menuWrap.toggleClass("ui-selectmenu-open",this.isOpen);this.menu.attr("aria-hidden",!this.isOpen);},_resizeButton:function(){var width=this.options.width;if(!width){width=this.element.show().outerWidth();this.element.hide();}
    this.button.outerWidth(width);},_resizeMenu:function(){this.menu.outerWidth(Math.max(this.button.outerWidth(),this.menu.width("").outerWidth()+1));},_getCreateOptions:function(){return{disabled:this.element.prop("disabled")};},_parseOptions:function(options){var data=[];options.each(function(index,item){var option=$(item),optgroup=option.parent("optgroup");data.push({element:option,index:index,value:option.val(),label:option.text(),optgroup:optgroup.attr("label")||"",disabled:optgroup.prop("disabled")||option.prop("disabled")});});this.items=data;},_destroy:function(){this.menuWrap.remove();this.button.remove();this.element.show();this.element.removeUniqueId();this.label.attr("for",this.ids.element);}});var slider=$.widget("ui.slider",$.ui.mouse,{version:"1.11.4",widgetEventPrefix:"slide",options:{animate:false,distance:0,max:100,min:0,orientation:"horizontal",range:false,step:1,value:0,values:null,change:null,slide:null,start:null,stop:null},numPages:5,_create:function(){this._keySliding=false;this._mouseSliding=false;this._animateOff=true;this._handleIndex=null;this._detectOrientation();this._mouseInit();this._calculateNewMax();this.element.addClass("ui-slider"+" ui-slider-"+this.orientation+" ui-widget"+" ui-widget-content"+" ui-corner-all");this._refresh();this._setOption("disabled",this.options.disabled);this._animateOff=false;},_refresh:function(){this._createRange();this._createHandles();this._setupEvents();this._refreshValue();},_createHandles:function(){var i,handleCount,options=this.options,existingHandles=this.element.find(".ui-slider-handle").addClass("ui-state-default ui-corner-all"),handle="<span class='ui-slider-handle ui-state-default ui-corner-all' tabindex='0'></span>",handles=[];handleCount=(options.values&&options.values.length)||1;if(existingHandles.length>handleCount){existingHandles.slice(handleCount).remove();existingHandles=existingHandles.slice(0,handleCount);}
    for(i=existingHandles.length;i<handleCount;i++){handles.push(handle);}
    this.handles=existingHandles.add($(handles.join("")).appendTo(this.element));this.handle=this.handles.eq(0);this.handles.each(function(i){$(this).data("ui-slider-handle-index",i);});},_createRange:function(){var options=this.options,classes="";if(options.range){if(options.range===true){if(!options.values){options.values=[this._valueMin(),this._valueMin()];}else if(options.values.length&&options.values.length!==2){options.values=[options.values[0],options.values[0]];}else if($.isArray(options.values)){options.values=options.values.slice(0);}}
    if(!this.range||!this.range.length){this.range=$("<div></div>").appendTo(this.element);classes="ui-slider-range"+" ui-widget-header ui-corner-all";}else{this.range.removeClass("ui-slider-range-min ui-slider-range-max").css({"left":"","bottom":""});}
    this.range.addClass(classes+
    ((options.range==="min"||options.range==="max")?" ui-slider-range-"+options.range:""));}else{if(this.range){this.range.remove();}
    this.range=null;}},_setupEvents:function(){this._off(this.handles);this._on(this.handles,this._handleEvents);this._hoverable(this.handles);this._focusable(this.handles);},_destroy:function(){this.handles.remove();if(this.range){this.range.remove();}
    this.element.removeClass("ui-slider"+" ui-slider-horizontal"+" ui-slider-vertical"+" ui-widget"+" ui-widget-content"+" ui-corner-all");this._mouseDestroy();},_mouseCapture:function(event){var position,normValue,distance,closestHandle,index,allowed,offset,mouseOverHandle,that=this,o=this.options;if(o.disabled){return false;}
    this.elementSize={width:this.element.outerWidth(),height:this.element.outerHeight()};this.elementOffset=this.element.offset();position={x:event.pageX,y:event.pageY};normValue=this._normValueFromMouse(position);distance=this._valueMax()-this._valueMin()+1;this.handles.each(function(i){var thisDistance=Math.abs(normValue-that.values(i));if((distance>thisDistance)||(distance===thisDistance&&(i===that._lastChangedValue||that.values(i)===o.min))){distance=thisDistance;closestHandle=$(this);index=i;}});allowed=this._start(event,index);if(allowed===false){return false;}
    this._mouseSliding=true;this._handleIndex=index;closestHandle.addClass("ui-state-active").focus();offset=closestHandle.offset();mouseOverHandle=!$(event.target).parents().addBack().is(".ui-slider-handle");this._clickOffset=mouseOverHandle?{left:0,top:0}:{left:event.pageX-offset.left-(closestHandle.width()/2),top:event.pageY-offset.top-
    (closestHandle.height()/2)-
    (parseInt(closestHandle.css("borderTopWidth"),10)||0)-
    (parseInt(closestHandle.css("borderBottomWidth"),10)||0)+
    (parseInt(closestHandle.css("marginTop"),10)||0)};if(!this.handles.hasClass("ui-state-hover")){this._slide(event,index,normValue);}
    this._animateOff=true;return true;},_mouseStart:function(){return true;},_mouseDrag:function(event){var position={x:event.pageX,y:event.pageY},normValue=this._normValueFromMouse(position);this._slide(event,this._handleIndex,normValue);return false;},_mouseStop:function(event){this.handles.removeClass("ui-state-active");this._mouseSliding=false;this._stop(event,this._handleIndex);this._change(event,this._handleIndex);this._handleIndex=null;this._clickOffset=null;this._animateOff=false;return false;},_detectOrientation:function(){this.orientation=(this.options.orientation==="vertical")?"vertical":"horizontal";},_normValueFromMouse:function(position){var pixelTotal,pixelMouse,percentMouse,valueTotal,valueMouse;if(this.orientation==="horizontal"){pixelTotal=this.elementSize.width;pixelMouse=position.x-this.elementOffset.left-(this._clickOffset?this._clickOffset.left:0);}else{pixelTotal=this.elementSize.height;pixelMouse=position.y-this.elementOffset.top-(this._clickOffset?this._clickOffset.top:0);}
    percentMouse=(pixelMouse/pixelTotal);if(percentMouse>1){percentMouse=1;}
    if(percentMouse<0){percentMouse=0;}
    if(this.orientation==="vertical"){percentMouse=1-percentMouse;}
    valueTotal=this._valueMax()-this._valueMin();valueMouse=this._valueMin()+percentMouse*valueTotal;return this._trimAlignValue(valueMouse);},_start:function(event,index){var uiHash={handle:this.handles[index],value:this.value()};if(this.options.values&&this.options.values.length){uiHash.value=this.values(index);uiHash.values=this.values();}
    return this._trigger("start",event,uiHash);},_slide:function(event,index,newVal){var otherVal,newValues,allowed;if(this.options.values&&this.options.values.length){otherVal=this.values(index?0:1);if((this.options.values.length===2&&this.options.range===true)&&((index===0&&newVal>otherVal)||(index===1&&newVal<otherVal))){newVal=otherVal;}
    if(newVal!==this.values(index)){newValues=this.values();newValues[index]=newVal;allowed=this._trigger("slide",event,{handle:this.handles[index],value:newVal,values:newValues});otherVal=this.values(index?0:1);if(allowed!==false){this.values(index,newVal);}}}else{if(newVal!==this.value()){allowed=this._trigger("slide",event,{handle:this.handles[index],value:newVal});if(allowed!==false){this.value(newVal);}}}},_stop:function(event,index){var uiHash={handle:this.handles[index],value:this.value()};if(this.options.values&&this.options.values.length){uiHash.value=this.values(index);uiHash.values=this.values();}
    this._trigger("stop",event,uiHash);},_change:function(event,index){if(!this._keySliding&&!this._mouseSliding){var uiHash={handle:this.handles[index],value:this.value()};if(this.options.values&&this.options.values.length){uiHash.value=this.values(index);uiHash.values=this.values();}
    this._lastChangedValue=index;this._trigger("change",event,uiHash);}},value:function(newValue){if(arguments.length){this.options.value=this._trimAlignValue(newValue);this._refreshValue();this._change(null,0);return;}
    return this._value();},values:function(index,newValue){var vals,newValues,i;if(arguments.length>1){this.options.values[index]=this._trimAlignValue(newValue);this._refreshValue();this._change(null,index);return;}
    if(arguments.length){if($.isArray(arguments[0])){vals=this.options.values;newValues=arguments[0];for(i=0;i<vals.length;i+=1){vals[i]=this._trimAlignValue(newValues[i]);this._change(null,i);}
    this._refreshValue();}else{if(this.options.values&&this.options.values.length){return this._values(index);}else{return this.value();}}}else{return this._values();}},_setOption:function(key,value){var i,valsLength=0;if(key==="range"&&this.options.range===true){if(value==="min"){this.options.value=this._values(0);this.options.values=null;}else if(value==="max"){this.options.value=this._values(this.options.values.length-1);this.options.values=null;}}
    if($.isArray(this.options.values)){valsLength=this.options.values.length;}
    if(key==="disabled"){this.element.toggleClass("ui-state-disabled",!!value);}
    this._super(key,value);switch(key){case"orientation":this._detectOrientation();this.element.removeClass("ui-slider-horizontal ui-slider-vertical").addClass("ui-slider-"+this.orientation);this._refreshValue();this.handles.css(value==="horizontal"?"bottom":"left","");break;case"value":this._animateOff=true;this._refreshValue();this._change(null,0);this._animateOff=false;break;case"values":this._animateOff=true;this._refreshValue();for(i=0;i<valsLength;i+=1){this._change(null,i);}
    this._animateOff=false;break;case"step":case"min":case"max":this._animateOff=true;this._calculateNewMax();this._refreshValue();this._animateOff=false;break;case"range":this._animateOff=true;this._refresh();this._animateOff=false;break;}},_value:function(){var val=this.options.value;val=this._trimAlignValue(val);return val;},_values:function(index){var val,vals,i;if(arguments.length){val=this.options.values[index];val=this._trimAlignValue(val);return val;}else if(this.options.values&&this.options.values.length){vals=this.options.values.slice();for(i=0;i<vals.length;i+=1){vals[i]=this._trimAlignValue(vals[i]);}
    return vals;}else{return[];}},_trimAlignValue:function(val){if(val<=this._valueMin()){return this._valueMin();}
    if(val>=this._valueMax()){return this._valueMax();}
    var step=(this.options.step>0)?this.options.step:1,valModStep=(val-this._valueMin())%step,alignValue=val-valModStep;if(Math.abs(valModStep)*2>=step){alignValue+=(valModStep>0)?step:(-step);}
    return parseFloat(alignValue.toFixed(5));},_calculateNewMax:function(){var max=this.options.max,min=this._valueMin(),step=this.options.step,aboveMin=Math.floor((+(max-min).toFixed(this._precision()))/step)*step;max=aboveMin+min;this.max=parseFloat(max.toFixed(this._precision()));},_precision:function(){var precision=this._precisionOf(this.options.step);if(this.options.min!==null){precision=Math.max(precision,this._precisionOf(this.options.min));}
    return precision;},_precisionOf:function(num){var str=num.toString(),decimal=str.indexOf(".");return decimal===-1?0:str.length-decimal-1;},_valueMin:function(){return this.options.min;},_valueMax:function(){return this.max;},_refreshValue:function(){var lastValPercent,valPercent,value,valueMin,valueMax,oRange=this.options.range,o=this.options,that=this,animate=(!this._animateOff)?o.animate:false,_set={};if(this.options.values&&this.options.values.length){this.handles.each(function(i){valPercent=(that.values(i)-that._valueMin())/(that._valueMax()-that._valueMin())*100;_set[that.orientation==="horizontal"?"left":"bottom"]=valPercent+"%";$(this).stop(1,1)[animate?"animate":"css"](_set,o.animate);if(that.options.range===true){if(that.orientation==="horizontal"){if(i===0){that.range.stop(1,1)[animate?"animate":"css"]({left:valPercent+"%"},o.animate);}
    if(i===1){that.range[animate?"animate":"css"]({width:(valPercent-lastValPercent)+"%"},{queue:false,duration:o.animate});}}else{if(i===0){that.range.stop(1,1)[animate?"animate":"css"]({bottom:(valPercent)+"%"},o.animate);}
    if(i===1){that.range[animate?"animate":"css"]({height:(valPercent-lastValPercent)+"%"},{queue:false,duration:o.animate});}}}
    lastValPercent=valPercent;});}else{value=this.value();valueMin=this._valueMin();valueMax=this._valueMax();valPercent=(valueMax!==valueMin)?(value-valueMin)/(valueMax-valueMin)*100:0;_set[this.orientation==="horizontal"?"left":"bottom"]=valPercent+"%";this.handle.stop(1,1)[animate?"animate":"css"](_set,o.animate);if(oRange==="min"&&this.orientation==="horizontal"){this.range.stop(1,1)[animate?"animate":"css"]({width:valPercent+"%"},o.animate);}
    if(oRange==="max"&&this.orientation==="horizontal"){this.range[animate?"animate":"css"]({width:(100-valPercent)+"%"},{queue:false,duration:o.animate});}
    if(oRange==="min"&&this.orientation==="vertical"){this.range.stop(1,1)[animate?"animate":"css"]({height:valPercent+"%"},o.animate);}
    if(oRange==="max"&&this.orientation==="vertical"){this.range[animate?"animate":"css"]({height:(100-valPercent)+"%"},{queue:false,duration:o.animate});}}},_handleEvents:{keydown:function(event){var allowed,curVal,newVal,step,index=$(event.target).data("ui-slider-handle-index");switch(event.keyCode){case $.ui.keyCode.HOME:case $.ui.keyCode.END:case $.ui.keyCode.PAGE_UP:case $.ui.keyCode.PAGE_DOWN:case $.ui.keyCode.UP:case $.ui.keyCode.RIGHT:case $.ui.keyCode.DOWN:case $.ui.keyCode.LEFT:event.preventDefault();if(!this._keySliding){this._keySliding=true;$(event.target).addClass("ui-state-active");allowed=this._start(event,index);if(allowed===false){return;}}
    break;}
    step=this.options.step;if(this.options.values&&this.options.values.length){curVal=newVal=this.values(index);}else{curVal=newVal=this.value();}
    switch(event.keyCode){case $.ui.keyCode.HOME:newVal=this._valueMin();break;case $.ui.keyCode.END:newVal=this._valueMax();break;case $.ui.keyCode.PAGE_UP:newVal=this._trimAlignValue(curVal+((this._valueMax()-this._valueMin())/this.numPages));break;case $.ui.keyCode.PAGE_DOWN:newVal=this._trimAlignValue(curVal-((this._valueMax()-this._valueMin())/this.numPages));break;case $.ui.keyCode.UP:case $.ui.keyCode.RIGHT:if(curVal===this._valueMax()){return;}
    newVal=this._trimAlignValue(curVal+step);break;case $.ui.keyCode.DOWN:case $.ui.keyCode.LEFT:if(curVal===this._valueMin()){return;}
    newVal=this._trimAlignValue(curVal-step);break;}
    this._slide(event,index,newVal);},keyup:function(event){var index=$(event.target).data("ui-slider-handle-index");if(this._keySliding){this._keySliding=false;this._stop(event,index);this._change(event,index);$(event.target).removeClass("ui-state-active");}}}});function spinner_modifier(fn){return function(){var previous=this.element.val();fn.apply(this,arguments);this._refresh();if(previous!==this.element.val()){this._trigger("change");}};}
    var spinner=$.widget("ui.spinner",{version:"1.11.4",defaultElement:"<input>",widgetEventPrefix:"spin",options:{culture:null,icons:{down:"ui-icon-triangle-1-s",up:"ui-icon-triangle-1-n"},incremental:true,max:null,min:null,numberFormat:null,page:10,step:1,change:null,spin:null,start:null,stop:null},_create:function(){this._setOption("max",this.options.max);this._setOption("min",this.options.min);this._setOption("step",this.options.step);if(this.value()!==""){this._value(this.element.val(),true);}
    this._draw();this._on(this._events);this._refresh();this._on(this.window,{beforeunload:function(){this.element.removeAttr("autocomplete");}});},_getCreateOptions:function(){var options={},element=this.element;$.each(["min","max","step"],function(i,option){var value=element.attr(option);if(value!==undefined&&value.length){options[option]=value;}});return options;},_events:{keydown:function(event){if(this._start(event)&&this._keydown(event)){event.preventDefault();}},keyup:"_stop",focus:function(){this.previous=this.element.val();},blur:function(event){if(this.cancelBlur){delete this.cancelBlur;return;}
    this._stop();this._refresh();if(this.previous!==this.element.val()){this._trigger("change",event);}},mousewheel:function(event,delta){if(!delta){return;}
    if(!this.spinning&&!this._start(event)){return false;}
    this._spin((delta>0?1:-1)*this.options.step,event);clearTimeout(this.mousewheelTimer);this.mousewheelTimer=this._delay(function(){if(this.spinning){this._stop(event);}},100);event.preventDefault();},"mousedown .ui-spinner-button":function(event){var previous;previous=this.element[0]===this.document[0].activeElement?this.previous:this.element.val();function checkFocus(){var isActive=this.element[0]===this.document[0].activeElement;if(!isActive){this.element.focus();this.previous=previous;this._delay(function(){this.previous=previous;});}}
    event.preventDefault();checkFocus.call(this);this.cancelBlur=true;this._delay(function(){delete this.cancelBlur;checkFocus.call(this);});if(this._start(event)===false){return;}
    this._repeat(null,$(event.currentTarget).hasClass("ui-spinner-up")?1:-1,event);},"mouseup .ui-spinner-button":"_stop","mouseenter .ui-spinner-button":function(event){if(!$(event.currentTarget).hasClass("ui-state-active")){return;}
    if(this._start(event)===false){return false;}
    this._repeat(null,$(event.currentTarget).hasClass("ui-spinner-up")?1:-1,event);},"mouseleave .ui-spinner-button":"_stop"},_draw:function(){var uiSpinner=this.uiSpinner=this.element.addClass("ui-spinner-input").attr("autocomplete","off").wrap(this._uiSpinnerHtml()).parent().append(this._buttonHtml());this.element.attr("role","spinbutton");this.buttons=uiSpinner.find(".ui-spinner-button").attr("tabIndex",-1).button().removeClass("ui-corner-all");if(this.buttons.height()>Math.ceil(uiSpinner.height()*0.5)&&uiSpinner.height()>0){uiSpinner.height(uiSpinner.height());}
    if(this.options.disabled){this.disable();}},_keydown:function(event){var options=this.options,keyCode=$.ui.keyCode;switch(event.keyCode){case keyCode.UP:this._repeat(null,1,event);return true;case keyCode.DOWN:this._repeat(null,-1,event);return true;case keyCode.PAGE_UP:this._repeat(null,options.page,event);return true;case keyCode.PAGE_DOWN:this._repeat(null,-options.page,event);return true;}
    return false;},_uiSpinnerHtml:function(){return"<span class='ui-spinner ui-widget ui-widget-content ui-corner-all'></span>";},_buttonHtml:function(){return""+"<a class='ui-spinner-button ui-spinner-up ui-corner-tr'>"+"<span class='ui-icon "+this.options.icons.up+"'>&#9650;</span>"+"</a>"+"<a class='ui-spinner-button ui-spinner-down ui-corner-br'>"+"<span class='ui-icon "+this.options.icons.down+"'>&#9660;</span>"+"</a>";},_start:function(event){if(!this.spinning&&this._trigger("start",event)===false){return false;}
    if(!this.counter){this.counter=1;}
    this.spinning=true;return true;},_repeat:function(i,steps,event){i=i||500;clearTimeout(this.timer);this.timer=this._delay(function(){this._repeat(40,steps,event);},i);this._spin(steps*this.options.step,event);},_spin:function(step,event){var value=this.value()||0;if(!this.counter){this.counter=1;}
    value=this._adjustValue(value+step*this._increment(this.counter));if(!this.spinning||this._trigger("spin",event,{value:value})!==false){this._value(value);this.counter++;}},_increment:function(i){var incremental=this.options.incremental;if(incremental){return $.isFunction(incremental)?incremental(i):Math.floor(i*i*i/50000-i*i/500+17*i/200+1);}
    return 1;},_precision:function(){var precision=this._precisionOf(this.options.step);if(this.options.min!==null){precision=Math.max(precision,this._precisionOf(this.options.min));}
    return precision;},_precisionOf:function(num){var str=num.toString(),decimal=str.indexOf(".");return decimal===-1?0:str.length-decimal-1;},_adjustValue:function(value){var base,aboveMin,options=this.options;base=options.min!==null?options.min:0;aboveMin=value-base;aboveMin=Math.round(aboveMin/options.step)*options.step;value=base+aboveMin;value=parseFloat(value.toFixed(this._precision()));if(options.max!==null&&value>options.max){return options.max;}
    if(options.min!==null&&value<options.min){return options.min;}
    return value;},_stop:function(event){if(!this.spinning){return;}
    clearTimeout(this.timer);clearTimeout(this.mousewheelTimer);this.counter=0;this.spinning=false;this._trigger("stop",event);},_setOption:function(key,value){if(key==="culture"||key==="numberFormat"){var prevValue=this._parse(this.element.val());this.options[key]=value;this.element.val(this._format(prevValue));return;}
    if(key==="max"||key==="min"||key==="step"){if(typeof value==="string"){value=this._parse(value);}}
    if(key==="icons"){this.buttons.first().find(".ui-icon").removeClass(this.options.icons.up).addClass(value.up);this.buttons.last().find(".ui-icon").removeClass(this.options.icons.down).addClass(value.down);}
    this._super(key,value);if(key==="disabled"){this.widget().toggleClass("ui-state-disabled",!!value);this.element.prop("disabled",!!value);this.buttons.button(value?"disable":"enable");}},_setOptions:spinner_modifier(function(options){this._super(options);}),_parse:function(val){if(typeof val==="string"&&val!==""){val=window.Globalize&&this.options.numberFormat?Globalize.parseFloat(val,10,this.options.culture):+val;}
    return val===""||isNaN(val)?null:val;},_format:function(value){if(value===""){return"";}
    return window.Globalize&&this.options.numberFormat?Globalize.format(value,this.options.numberFormat,this.options.culture):value;},_refresh:function(){this.element.attr({"aria-valuemin":this.options.min,"aria-valuemax":this.options.max,"aria-valuenow":this._parse(this.element.val())});},isValid:function(){var value=this.value();if(value===null){return false;}
    return value===this._adjustValue(value);},_value:function(value,allowAny){var parsed;if(value!==""){parsed=this._parse(value);if(parsed!==null){if(!allowAny){parsed=this._adjustValue(parsed);}
    value=this._format(parsed);}}
    this.element.val(value);this._refresh();},_destroy:function(){this.element.removeClass("ui-spinner-input").prop("disabled",false).removeAttr("autocomplete").removeAttr("role").removeAttr("aria-valuemin").removeAttr("aria-valuemax").removeAttr("aria-valuenow");this.uiSpinner.replaceWith(this.element);},stepUp:spinner_modifier(function(steps){this._stepUp(steps);}),_stepUp:function(steps){if(this._start()){this._spin((steps||1)*this.options.step);this._stop();}},stepDown:spinner_modifier(function(steps){this._stepDown(steps);}),_stepDown:function(steps){if(this._start()){this._spin((steps||1)*-this.options.step);this._stop();}},pageUp:spinner_modifier(function(pages){this._stepUp((pages||1)*this.options.page);}),pageDown:spinner_modifier(function(pages){this._stepDown((pages||1)*this.options.page);}),value:function(newVal){if(!arguments.length){return this._parse(this.element.val());}
    spinner_modifier(this._value).call(this,newVal);},widget:function(){return this.uiSpinner;}});var tabs=$.widget("ui.tabs",{version:"1.11.4",delay:300,options:{active:null,collapsible:false,event:"click",heightStyle:"content",hide:null,show:null,activate:null,beforeActivate:null,beforeLoad:null,load:null},_isLocal:(function(){var rhash=/#.*$/;return function(anchor){var anchorUrl,locationUrl;anchor=anchor.cloneNode(false);anchorUrl=anchor.href.replace(rhash,"");locationUrl=location.href.replace(rhash,"");try{anchorUrl=decodeURIComponent(anchorUrl);}catch(error){}
    try{locationUrl=decodeURIComponent(locationUrl);}catch(error){}
    return anchor.hash.length>1&&anchorUrl===locationUrl;};})(),_create:function(){var that=this,options=this.options;this.running=false;this.element.addClass("ui-tabs ui-widget ui-widget-content ui-corner-all").toggleClass("ui-tabs-collapsible",options.collapsible);this._processTabs();options.active=this._initialActive();if($.isArray(options.disabled)){options.disabled=$.unique(options.disabled.concat($.map(this.tabs.filter(".ui-state-disabled"),function(li){return that.tabs.index(li);}))).sort();}
    if(this.options.active!==false&&this.anchors.length){this.active=this._findActive(options.active);}else{this.active=$();}
    this._refresh();if(this.active.length){this.load(options.active);}},_initialActive:function(){var active=this.options.active,collapsible=this.options.collapsible,locationHash=location.hash.substring(1);if(active===null){if(locationHash){this.tabs.each(function(i,tab){if($(tab).attr("aria-controls")===locationHash){active=i;return false;}});}
    if(active===null){active=this.tabs.index(this.tabs.filter(".ui-tabs-active"));}
    if(active===null||active===-1){active=this.tabs.length?0:false;}}
    if(active!==false){active=this.tabs.index(this.tabs.eq(active));if(active===-1){active=collapsible?false:0;}}
    if(!collapsible&&active===false&&this.anchors.length){active=0;}
    return active;},_getCreateEventData:function(){return{tab:this.active,panel:!this.active.length?$():this._getPanelForTab(this.active)};},_tabKeydown:function(event){var focusedTab=$(this.document[0].activeElement).closest("li"),selectedIndex=this.tabs.index(focusedTab),goingForward=true;if(this._handlePageNav(event)){return;}
    switch(event.keyCode){case $.ui.keyCode.RIGHT:case $.ui.keyCode.DOWN:selectedIndex++;break;case $.ui.keyCode.UP:case $.ui.keyCode.LEFT:goingForward=false;selectedIndex--;break;case $.ui.keyCode.END:selectedIndex=this.anchors.length-1;break;case $.ui.keyCode.HOME:selectedIndex=0;break;case $.ui.keyCode.SPACE:event.preventDefault();clearTimeout(this.activating);this._activate(selectedIndex);return;case $.ui.keyCode.ENTER:event.preventDefault();clearTimeout(this.activating);this._activate(selectedIndex===this.options.active?false:selectedIndex);return;default:return;}
    event.preventDefault();clearTimeout(this.activating);selectedIndex=this._focusNextTab(selectedIndex,goingForward);if(!event.ctrlKey&&!event.metaKey){focusedTab.attr("aria-selected","false");this.tabs.eq(selectedIndex).attr("aria-selected","true");this.activating=this._delay(function(){this.option("active",selectedIndex);},this.delay);}},_panelKeydown:function(event){if(this._handlePageNav(event)){return;}
    if(event.ctrlKey&&event.keyCode===$.ui.keyCode.UP){event.preventDefault();this.active.focus();}},_handlePageNav:function(event){if(event.altKey&&event.keyCode===$.ui.keyCode.PAGE_UP){this._activate(this._focusNextTab(this.options.active-1,false));return true;}
    if(event.altKey&&event.keyCode===$.ui.keyCode.PAGE_DOWN){this._activate(this._focusNextTab(this.options.active+1,true));return true;}},_findNextTab:function(index,goingForward){var lastTabIndex=this.tabs.length-1;function constrain(){if(index>lastTabIndex){index=0;}
    if(index<0){index=lastTabIndex;}
    return index;}
    while($.inArray(constrain(),this.options.disabled)!==-1){index=goingForward?index+1:index-1;}
    return index;},_focusNextTab:function(index,goingForward){index=this._findNextTab(index,goingForward);this.tabs.eq(index).focus();return index;},_setOption:function(key,value){if(key==="active"){this._activate(value);return;}
    if(key==="disabled"){this._setupDisabled(value);return;}
    this._super(key,value);if(key==="collapsible"){this.element.toggleClass("ui-tabs-collapsible",value);if(!value&&this.options.active===false){this._activate(0);}}
    if(key==="event"){this._setupEvents(value);}
    if(key==="heightStyle"){this._setupHeightStyle(value);}},_sanitizeSelector:function(hash){return hash?hash.replace(/[!"$%&'()*+,.\/:;<=>?@\[\]\^`{|}~]/g,"\\$&"):"";},refresh:function(){var options=this.options,lis=this.tablist.children(":has(a[href])");options.disabled=$.map(lis.filter(".ui-state-disabled"),function(tab){return lis.index(tab);});this._processTabs();if(options.active===false||!this.anchors.length){options.active=false;this.active=$();}else if(this.active.length&&!$.contains(this.tablist[0],this.active[0])){if(this.tabs.length===options.disabled.length){options.active=false;this.active=$();}else{this._activate(this._findNextTab(Math.max(0,options.active-1),false));}}else{options.active=this.tabs.index(this.active);}
    this._refresh();},_refresh:function(){this._setupDisabled(this.options.disabled);this._setupEvents(this.options.event);this._setupHeightStyle(this.options.heightStyle);this.tabs.not(this.active).attr({"aria-selected":"false","aria-expanded":"false",tabIndex:-1});this.panels.not(this._getPanelForTab(this.active)).hide().attr({"aria-hidden":"true"});if(!this.active.length){this.tabs.eq(0).attr("tabIndex",0);}else{this.active.addClass("ui-tabs-active ui-state-active").attr({"aria-selected":"true","aria-expanded":"true",tabIndex:0});this._getPanelForTab(this.active).show().attr({"aria-hidden":"false"});}},_processTabs:function(){var that=this,prevTabs=this.tabs,prevAnchors=this.anchors,prevPanels=this.panels;this.tablist=this._getList().addClass("ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all").attr("role","tablist").delegate("> li","mousedown"+this.eventNamespace,function(event){if($(this).is(".ui-state-disabled")){event.preventDefault();}}).delegate(".ui-tabs-anchor","focus"+this.eventNamespace,function(){if($(this).closest("li").is(".ui-state-disabled")){this.blur();}});this.tabs=this.tablist.find("> li:has(a[href])").addClass("ui-state-default ui-corner-top").attr({role:"tab",tabIndex:-1});this.anchors=this.tabs.map(function(){return $("a",this)[0];}).addClass("ui-tabs-anchor").attr({role:"presentation",tabIndex:-1});this.panels=$();this.anchors.each(function(i,anchor){var selector,panel,panelId,anchorId=$(anchor).uniqueId().attr("id"),tab=$(anchor).closest("li"),originalAriaControls=tab.attr("aria-controls");if(that._isLocal(anchor)){selector=anchor.hash;panelId=selector.substring(1);panel=that.element.find(that._sanitizeSelector(selector));}else{panelId=tab.attr("aria-controls")||$({}).uniqueId()[0].id;selector="#"+panelId;panel=that.element.find(selector);if(!panel.length){panel=that._createPanel(panelId);panel.insertAfter(that.panels[i-1]||that.tablist);}
    panel.attr("aria-live","polite");}
    if(panel.length){that.panels=that.panels.add(panel);}
    if(originalAriaControls){tab.data("ui-tabs-aria-controls",originalAriaControls);}
    tab.attr({"aria-controls":panelId,"aria-labelledby":anchorId});panel.attr("aria-labelledby",anchorId);});this.panels.addClass("ui-tabs-panel ui-widget-content ui-corner-bottom").attr("role","tabpanel");if(prevTabs){this._off(prevTabs.not(this.tabs));this._off(prevAnchors.not(this.anchors));this._off(prevPanels.not(this.panels));}},_getList:function(){return this.tablist||this.element.find("ol,ul").eq(0);},_createPanel:function(id){return $("<div>").attr("id",id).addClass("ui-tabs-panel ui-widget-content ui-corner-bottom").data("ui-tabs-destroy",true);},_setupDisabled:function(disabled){if($.isArray(disabled)){if(!disabled.length){disabled=false;}else if(disabled.length===this.anchors.length){disabled=true;}}
    for(var i=0,li;(li=this.tabs[i]);i++){if(disabled===true||$.inArray(i,disabled)!==-1){$(li).addClass("ui-state-disabled").attr("aria-disabled","true");}else{$(li).removeClass("ui-state-disabled").removeAttr("aria-disabled");}}
    this.options.disabled=disabled;},_setupEvents:function(event){var events={};if(event){$.each(event.split(" "),function(index,eventName){events[eventName]="_eventHandler";});}
    this._off(this.anchors.add(this.tabs).add(this.panels));this._on(true,this.anchors,{click:function(event){event.preventDefault();}});this._on(this.anchors,events);this._on(this.tabs,{keydown:"_tabKeydown"});this._on(this.panels,{keydown:"_panelKeydown"});this._focusable(this.tabs);this._hoverable(this.tabs);},_setupHeightStyle:function(heightStyle){var maxHeight,parent=this.element.parent();if(heightStyle==="fill"){maxHeight=parent.height();maxHeight-=this.element.outerHeight()-this.element.height();this.element.siblings(":visible").each(function(){var elem=$(this),position=elem.css("position");if(position==="absolute"||position==="fixed"){return;}
    maxHeight-=elem.outerHeight(true);});this.element.children().not(this.panels).each(function(){maxHeight-=$(this).outerHeight(true);});this.panels.each(function(){$(this).height(Math.max(0,maxHeight-
    $(this).innerHeight()+$(this).height()));}).css("overflow","auto");}else if(heightStyle==="auto"){maxHeight=0;this.panels.each(function(){maxHeight=Math.max(maxHeight,$(this).height("").height());}).height(maxHeight);}},_eventHandler:function(event){var options=this.options,active=this.active,anchor=$(event.currentTarget),tab=anchor.closest("li"),clickedIsActive=tab[0]===active[0],collapsing=clickedIsActive&&options.collapsible,toShow=collapsing?$():this._getPanelForTab(tab),toHide=!active.length?$():this._getPanelForTab(active),eventData={oldTab:active,oldPanel:toHide,newTab:collapsing?$():tab,newPanel:toShow};event.preventDefault();if(tab.hasClass("ui-state-disabled")||tab.hasClass("ui-tabs-loading")||this.running||(clickedIsActive&&!options.collapsible)||(this._trigger("beforeActivate",event,eventData)===false)){return;}
    options.active=collapsing?false:this.tabs.index(tab);this.active=clickedIsActive?$():tab;if(this.xhr){this.xhr.abort();}
    if(!toHide.length&&!toShow.length){$.error("jQuery UI Tabs: Mismatching fragment identifier.");}
    if(toShow.length){this.load(this.tabs.index(tab),event);}
    this._toggle(event,eventData);},_toggle:function(event,eventData){var that=this,toShow=eventData.newPanel,toHide=eventData.oldPanel;this.running=true;function complete(){that.running=false;that._trigger("activate",event,eventData);}
    function show(){eventData.newTab.closest("li").addClass("ui-tabs-active ui-state-active");if(toShow.length&&that.options.show){that._show(toShow,that.options.show,complete);}else{toShow.show();complete();}}
    if(toHide.length&&this.options.hide){this._hide(toHide,this.options.hide,function(){eventData.oldTab.closest("li").removeClass("ui-tabs-active ui-state-active");show();});}else{eventData.oldTab.closest("li").removeClass("ui-tabs-active ui-state-active");toHide.hide();show();}
    toHide.attr("aria-hidden","true");eventData.oldTab.attr({"aria-selected":"false","aria-expanded":"false"});if(toShow.length&&toHide.length){eventData.oldTab.attr("tabIndex",-1);}else if(toShow.length){this.tabs.filter(function(){return $(this).attr("tabIndex")===0;}).attr("tabIndex",-1);}
    toShow.attr("aria-hidden","false");eventData.newTab.attr({"aria-selected":"true","aria-expanded":"true",tabIndex:0});},_activate:function(index){var anchor,active=this._findActive(index);if(active[0]===this.active[0]){return;}
    if(!active.length){active=this.active;}
    anchor=active.find(".ui-tabs-anchor")[0];this._eventHandler({target:anchor,currentTarget:anchor,preventDefault:$.noop});},_findActive:function(index){return index===false?$():this.tabs.eq(index);},_getIndex:function(index){if(typeof index==="string"){index=this.anchors.index(this.anchors.filter("[href$='"+index+"']"));}
    return index;},_destroy:function(){if(this.xhr){this.xhr.abort();}
    this.element.removeClass("ui-tabs ui-widget ui-widget-content ui-corner-all ui-tabs-collapsible");this.tablist.removeClass("ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all").removeAttr("role");this.anchors.removeClass("ui-tabs-anchor").removeAttr("role").removeAttr("tabIndex").removeUniqueId();this.tablist.unbind(this.eventNamespace);this.tabs.add(this.panels).each(function(){if($.data(this,"ui-tabs-destroy")){$(this).remove();}else{$(this).removeClass("ui-state-default ui-state-active ui-state-disabled "+"ui-corner-top ui-corner-bottom ui-widget-content ui-tabs-active ui-tabs-panel").removeAttr("tabIndex").removeAttr("aria-live").removeAttr("aria-busy").removeAttr("aria-selected").removeAttr("aria-labelledby").removeAttr("aria-hidden").removeAttr("aria-expanded").removeAttr("role");}});this.tabs.each(function(){var li=$(this),prev=li.data("ui-tabs-aria-controls");if(prev){li.attr("aria-controls",prev).removeData("ui-tabs-aria-controls");}else{li.removeAttr("aria-controls");}});this.panels.show();if(this.options.heightStyle!=="content"){this.panels.css("height","");}},enable:function(index){var disabled=this.options.disabled;if(disabled===false){return;}
    if(index===undefined){disabled=false;}else{index=this._getIndex(index);if($.isArray(disabled)){disabled=$.map(disabled,function(num){return num!==index?num:null;});}else{disabled=$.map(this.tabs,function(li,num){return num!==index?num:null;});}}
    this._setupDisabled(disabled);},disable:function(index){var disabled=this.options.disabled;if(disabled===true){return;}
    if(index===undefined){disabled=true;}else{index=this._getIndex(index);if($.inArray(index,disabled)!==-1){return;}
    if($.isArray(disabled)){disabled=$.merge([index],disabled).sort();}else{disabled=[index];}}
    this._setupDisabled(disabled);},load:function(index,event){index=this._getIndex(index);var that=this,tab=this.tabs.eq(index),anchor=tab.find(".ui-tabs-anchor"),panel=this._getPanelForTab(tab),eventData={tab:tab,panel:panel},complete=function(jqXHR,status){if(status==="abort"){that.panels.stop(false,true);}
    tab.removeClass("ui-tabs-loading");panel.removeAttr("aria-busy");if(jqXHR===that.xhr){delete that.xhr;}};if(this._isLocal(anchor[0])){return;}
    this.xhr=$.ajax(this._ajaxSettings(anchor,event,eventData));if(this.xhr&&this.xhr.statusText!=="canceled"){tab.addClass("ui-tabs-loading");panel.attr("aria-busy","true");this.xhr.done(function(response,status,jqXHR){setTimeout(function(){panel.html(response);that._trigger("load",event,eventData);complete(jqXHR,status);},1);}).fail(function(jqXHR,status){setTimeout(function(){complete(jqXHR,status);},1);});}},_ajaxSettings:function(anchor,event,eventData){var that=this;return{url:anchor.attr("href"),beforeSend:function(jqXHR,settings){return that._trigger("beforeLoad",event,$.extend({jqXHR:jqXHR,ajaxSettings:settings},eventData));}};},_getPanelForTab:function(tab){var id=$(tab).attr("aria-controls");return this.element.find(this._sanitizeSelector("#"+id));}});}));}
    
    // END GREASEMONKEY WORKAROUND ********************************************
    
    
    var WMEPHversion = GM_info.script.version.toString(); // pull version from header
    var WMEPHversionMeta = WMEPHversion.match(/(\d+\.\d+)/i)[1];  // get the X.X version
    var majorNewFeature = false;  // set to true to make an alert pop up after script update with new feature
    var scriptName = GM_info.script.name.toString();
    var isDevVersion = (scriptName.match(/Beta/i) !== null);  //  enables dev messages and unique DOM options if the script is called "... Beta"
    var USA_PNH_DATA, USA_PNH_NAMES = [], USA_CH_DATA, USA_STATE_DATA, USA_CH_NAMES = [];  // Storage for PNH and Category data
    var CAN_PNH_DATA, CAN_PNH_NAMES = [];  // var CAN_CH_DATA, CAN_CH_NAMES = [] not used for now
    var CAT_LOOKUP = {};
    var hospitalPartMatch, hospitalFullMatch, animalPartMatch, animalFullMatch, schoolPartMatch, schoolFullMatch;  // vars for cat-name checking
    var WMEPHdevList, WMEPHbetaList;  // Userlists
    var devVersStr='', devVersStrSpace='', devVersStrDash='';  // strings to differentiate DOM elements between regular and beta script
    var devVersStringMaster = "Beta";
    var dataReadyCounter = 0;
    var betaDataDelay = 10;
    if (isDevVersion) {
        devVersStr = devVersStringMaster; devVersStrSpace = " " + devVersStr; devVersStrDash = "-" + devVersStr;
        betaDataDelay = 20;
    }
    var WMEServicesArray = ["VALLET_SERVICE","DRIVETHROUGH","WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","OUTSIDE_SEATING","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","DELIVERIES","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
    var collegeAbbreviations = 'USF|USFSP|UF|UCF|UA|UGA|FSU|UM|SCP|FAU|FIU';
    var defaultKBShortcut,shortcutParse, modifKey = 'Alt+';
    var forumMsgInputs;
    var venueWhitelist, venueWhitelistStr, WLSToMerge, wlKeyName, wlButtText = 'WL';  // Whitelisting vars
    var WLlocalStoreName = 'WMEPH-venueWhitelistNew';
    var WLlocalStoreNameCompressed = 'WMEPH-venueWhitelistCompressed';
    var WMEPH_NameLayer, nameLayer, dupeIDList = [], dupeHNRangeList, dupeHNRangeIDList, dupeHNRangeDistList;
    // Web search Window forming:
    var searchResultsWindowSpecs = '"resizable=yes, top='+ Math.round(window.screen.height*0.1) +', left='+ Math.round(window.screen.width*0.3) +', width='+ Math.round(window.screen.width*0.7) +', height='+ Math.round(window.screen.height*0.8) +'"';
    var searchResultsWindowName = '"WMEPH Search Results"';
    var WMEPHmousePosition;
    var cloneMaster = null;
    var bannButt, bannButt2, bannServ, bannDupl, bannButtHL;  // Banner Buttons objects
    var RPPLockString = 'Lock?';
    var panelFields = {};  // the fields for the sidebar

    // Array prototype extensions (for Firefox fix)
    Array.prototype.toSet = function () {
        return this.reduce(function (e, t) {return e[t] = !0, e;}, {});
    };
    Array.prototype.first = function () {
        return this[0];
    };
    Array.prototype.isEmpty = function () {
        return 0 === this.length;
    };

    /* ****** Pull PNH and Userlist data ****** */
    setTimeout(function() {
        // Pull USA PNH Data
        setTimeout(function() {
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/o6q7kx/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    USA_PNH_DATA = [];
                    for (var i = 0; i < response.feed.entry.length; i++) {
                        USA_PNH_DATA.push(response.feed.entry[i].gsx$pnhdata.$t);
                    }
                }
            });
        }, 0);
        // Pull Category Data ( Includes CAN for now )
        setTimeout(function() {
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/ov3dubz/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    USA_CH_DATA = [];
                    for (var i = 0; i < response.feed.entry.length; i++) {
                        USA_CH_DATA.push(response.feed.entry[i].gsx$pcdata.$t);
                    }
                }
            });
        }, 20);
        // Pull State-based Data (includes CAN for now)
        setTimeout(function() {
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/os2g2ln/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    USA_STATE_DATA = [];
                    for (var i = 0; i < response.feed.entry.length; i++) {
                        USA_STATE_DATA.push(response.feed.entry[i].gsx$psdata.$t);
                    }
                }
            });
        }, 40);
        // Pull CAN PNH Data
        setTimeout(function() {
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1TIxQZVLUbAJ8iH6LPTkJsvqFb_DstrHpKsJbv1W1FZs/o4ghhas/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    CAN_PNH_DATA = [];
                    for (var i = 0; i < response.feed.entry.length; i++) {
                        CAN_PNH_DATA.push(response.feed.entry[i].gsx$pnhdata.$t);
                    }
                }
            });
        }, 60);
        // Pull name-category lists
        setTimeout(function() {
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1pDmenZA-3FOTvhlCq9yz1dnemTmS9l_njZQbu_jLVMI/op17piq/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    hospitalPartMatch = response.feed.entry[0].gsx$hmchp.$t;
                    hospitalFullMatch = response.feed.entry[0].gsx$hmchf.$t;
                    animalPartMatch = response.feed.entry[0].gsx$hmcap.$t;
                    animalFullMatch = response.feed.entry[0].gsx$hmcaf.$t;
                    schoolPartMatch = response.feed.entry[0].gsx$schp.$t;
                    schoolFullMatch = response.feed.entry[0].gsx$schf.$t;
                    hospitalPartMatch = hospitalPartMatch.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    hospitalFullMatch = hospitalFullMatch.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    animalPartMatch = animalPartMatch.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    animalFullMatch = animalFullMatch.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    schoolPartMatch = schoolPartMatch.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    schoolFullMatch = schoolFullMatch.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                }
            });
        }, 80);
        // Pull dev and beta UserList Data
        setTimeout(function() {
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1L82mM8Xg-MvKqK3WOfsMhFEGmVM46lA8BVcx8qwgmA8/ofblgob/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    var WMEPHuserList = response.feed.entry[0].gsx$phuserlist.$t;
                    WMEPHuserList = WMEPHuserList.split("|");
                    var betaix = WMEPHuserList.indexOf('BETAUSERS');
                    WMEPHdevList = [];
                    WMEPHbetaList = [];
                    for (var ulix=1; ulix<betaix; ulix++) {
                        WMEPHdevList.push(WMEPHuserList[ulix].toLowerCase());
                    }
                    for (ulix=betaix+1; ulix<WMEPHuserList.length; ulix++) {
                        WMEPHbetaList.push(WMEPHuserList[ulix].toLowerCase());
                    }
                }
            });
        }, 100);
    }, betaDataDelay);

    function placeHarmonizer_bootstrap() {
        if ( W && W.loginManager && W.loginManager.isLoggedIn() && W.map) {
            setTimeout(dataReady,200);  //  Run the code to check for data return from the Sheets
            // Create duplicatePlaceName layer
            var rlayers = W.map.getLayersBy("uniqueName","__DuplicatePlaceNames");
            if(rlayers.length === 0) {
                var lname = "WMEPH Duplicate Names";
                var style = new OpenLayers.Style({ label : "${labelText}", labelOutlineColor: '#333', labelOutlineWidth: 3, labelAlign: '${labelAlign}',
                                                  fontColor: "${fontColor}", fontOpacity: 1.0, fontSize: "20px", labelYOffset: -30, labelXOffset: 0, fontWeight: "bold",
                                                  fill: false, strokeColor: "${strokeColor}", strokeWidth: 10, pointRadius: "${pointRadius}" });
                nameLayer = new OpenLayers.Layer.Vector(lname, { displayInLayerSwitcher: false, uniqueName: "__DuplicatePlaceNames", styleMap: new OpenLayers.StyleMap(style) });
                nameLayer.setVisibility(false);
                W.map.addLayer(nameLayer);
                WMEPH_NameLayer = nameLayer;
            } else {
                WMEPH_NameLayer = rlayers[0];
            }
        } else {
            phlog("Waiting for WME map and login...");
            setTimeout(function () { placeHarmonizer_bootstrap(); }, 50);
        }
    }

    function dataReady() {
        // If the data has returned, then start the script, otherwise wait a bit longer
        if ("undefined" !== typeof CAN_PNH_DATA && "undefined" !== typeof USA_PNH_DATA && "undefined" !== typeof USA_CH_DATA &&
            "undefined" !== typeof WMEPHdevList && "undefined" !== typeof WMEPHbetaList && "undefined" !== typeof hospitalPartMatch ) {
            setTimeout(function(){ // Build the name search lists
                USA_PNH_NAMES = makeNameCheckList(USA_PNH_DATA);
                USA_CH_NAMES = makeCatCheckList(USA_CH_DATA);
                CAN_PNH_NAMES = makeNameCheckList(CAN_PNH_DATA);
                // CAN using USA_CH_NAMES at the moment
            }, 10);
            setTimeout(loginReady, 20);  //  start the main code
        } else {
            if (dataReadyCounter % 20 === 0) {
                var waitMessage = 'Waiting for ';
                if ("undefined" === typeof CAN_PNH_DATA) {
                    waitMessage = waitMessage + "CAN PNH Data; ";
                }
                if ("undefined" === typeof USA_PNH_DATA) {
                    waitMessage = waitMessage + "USA PNH Data; ";
                }
                if ("undefined" === typeof hospitalPartMatch) {
                    waitMessage = waitMessage + "Cat-Name Data; ";
                }
                if ("undefined" === typeof WMEPHdevList) {
                    waitMessage = waitMessage + "User List Data;";
                }
                phlog(waitMessage);
            }
            if (dataReadyCounter<200) {
                dataReadyCounter++;
                setTimeout(function () { dataReady(); }, 100);
            } else {
                phlog("Data load took too long, reload WME...");
            }
        }
    }

    function loginReady() {
        dataReadyCounter = 0;
        if ( W.loginManager.user !== null) {
            setTimeout(runPH, 10);  //  start the main code
        } else {
            if (dataReadyCounter<50) {
                dataReadyCounter++;
                phlog("Waiting for WME login...");
                setTimeout(function () { dataReady(); }, 200);
            } else {
                phlog("Login failed...?  Reload WME.");
            }
        }
    }

    function isPLA(venue) {
        return venue.attributes.categories && venue.attributes.categories[0] === 'PARKING_LOT';
    }

    function isEmergencyRoom(venue) {
        return /(?:emergency\s+(?:room|department|dept))|\b(?:er|ed)\b/i.test(venue.attributes.name);
    }

    function getPvaSeverity(pvaValue, venue) {
        var isER = pvaValue === 'hosp' && isEmergencyRoom(venue);
        return (pvaValue ==='' || pvaValue === '0' || (pvaValue === 'hosp' && !isER)) ? 3 : (pvaValue ==='2') ? 1 : (pvaValue ==='3') ? 2 : 0;
    }

    function runPH() {
        // Script update info
        var WMEPHWhatsNewList = [  // New in this version
            '1.2.36: NEW - Default to on for \'Disable check for "No external provider link(s)" on Parking Lot Areas\' setting.',
            '1.2.36: FIXED - Alert that place address could not be inferred appears for places that can be inferred.',
            '1.2.35: NEW - Removed street name entry box and replaced with Edit Address button until bug can be fixed.',
            '1.2.34: FIXED - WME language was occasionally causing script to fail.',
            '1.2.32: Version bump - no changes.',
            '1.2.31: Version bump. (no changes).',
            '1.2.30: NEW - Added Change to Doctor / Clinic button to places with Offices category.',
            '1.2.29: FIXED - index.html, index.htm, index.php should not be stripped from URL\'s.',
            '1.2.28: Moved jqueryui to Greasy fork and created new repository at greasy fork.',
            '1.2.27: FIXED - Accidentally commented @downloadURL line in last release.',
            '1.2.26: FIXED - Clicking option to fill PLAs calls a function that adds a new event listener (memory leak).',
            '1.2.25: FIXED - Creating a new PLA fails due to feature added in last release.',
            '1.2.24: NEW - Option to fill PLA\'s based on parking lot type.',
            '1.2.23: Fix t0s derp',
            '1.2.20: Fixed grammatical error "a area"',
            '1.2.18: FIXED - Some categories throw an error when being set from PNH.',
            '1.2.17: FIXED - Updated locale (user language).',
            '1.2.16: FIXED - Revised message that was added in last version.',
            '1.2.15: NEW - Added message for "Change to Doctor / Clinic" button on Personal Care places.',
            '1.2.14: FIXED - Hospitals not displaying the "Keywords suggest this may not be a hospital" warning.',
            '1.2.13: FIXED - PLAs incorrectly being marked as duplicates when option to exclude is turned on.',
            '1.2.12: FIXED - WME changed from en-US back to en.',
            '1.2.11: NEW - Change to Doctor / Clinic button displayed for places with Personal Care category.',
            '1.2.10: FIXED - Emergency room points being flagged as duplicates of hospital area.',
            '1.2.9: NEW - support for new WME medical categories.',
            '1.2.8: FIXED - Place Website button was not showing up in certain scenarios.',
            '1.2.7: FIXED - Place Website button was not showing up.',
            '1.2.6: Updated links from old wiki to Wazeopedia.',
            '1.2.5: Changed user language to us-EN.',
            '1.2.4: Moved "Place Website" button next to "Run WMEPH" button, so it is always accessible.',
            '1.2.4: Web Search and Place Locator buttons are now side-by-side.',
            '1.2.3: Fixed bug from last release.',
            '1.2.2: FIXED - Whitelisting missing HN doesn\'t allow auto-lock.',
            '1.2.1: Removed R2+ restriction for using this script.',
            '1.2.0: Production release.',
            '1.1.97: Added regex place name matching for increased flexibility.',
            '1.1.96: Changed "City Missing." to "No city" to be consistent with other flag messages.',
            '1.1.96: Hospital / gas station and PLA "special" highlights only display if no lock (L1).',
            '1.1.96: Add "Change to Offices" button under hospital/medical care note.',
            '1.1.96: Changed to "No external provider link(s)".',
            '1.1.95: Change "not a hospital" note.',
            '1.1.95: Fixed bug with area vs point warning not locking even after WL.',
            '1.1.95: Locking a place that has an area vs point warning will effectively WL it for everyone.',
            '1.1.94: Fixed bug that was preventing all categories from being checked for lock level, messages, etc.',
            '1.1.93: Fixed bug with area vs point warning.',
            '1.1.92: Minor styling tweaks.',
            '1.1.92: Fixed bug that would prevent "Edit address" button from working if General tab is not active.',
            '1.1.91: Fixed bug that triggered when all categories were removed.',
            '1.1.90: Fixed bug in data compression algorithm.',
            '1.1.89: Style tweaks.',
            '1.1.88: Uncheck "No City" when clicking "Edit address" button (wouldn\'t jump to the field.',
            '1.1.87: Removed "No HN" flag until street is set.',
            '1.1.87: Added an "Edit address" button to quickly jump to the city field in the address editor.',
            '1.1.87: Fixed bug that allowed empty URL\'s.',
            '1.1.86: Remove "No Street" flag when city doesn\'t exist.',
            '1.1.85: Remove bullets from banner to improve layout a bit until a new design is completed.',
            '1.1.84: Fix to ignore title casing inside parens at end of PLA names.',
            '1.1.83: Improved check for automated (bot) account edits.',
            '1.1.82: Added option to disable check for missing external provider on parking lots.',
            '1.1.81: Fix for incorrect capitalization when "mc" is in the middle of a word.',
            '1.1.80: Fix to allow entering phone #s longer than 10 digits, e.g. 800-THE-CRAVE',
            '1.1.79: Fixed area / point warning when multiple categories are present.',
            '1.1.78: Added yellow "caution" highlights.  Were previously red.',
            '1.1.77: Unlocked PLAs are highlighted with a bold red dotted outline',
            '1.1.75: Fix for Google hyperlinks not showing up after first click on place.',
            '1.1.74: Keep hours input visible at all times.',
            '1.1.73: Place Website button added when URL is added.',
            '1.1.72: Fixed lock issue with Missing External Provider flag.',
            '1.1.71: Added "avsus" to list of staff accounts.',
            '1.1.70: Fix for adding 24/7 service from PNH spreadsheet.',
            '1.1.69: Added input box to enter missing street.',
            '1.1.68: Added "Missing External Provider" and option to treat as non-critical.'
        ];
        var WMEPHWhatsNewMetaList = [  // New in this major version
            'WMEPH is now available for R1 editors to use!',
            'Yellow "caution" map highlights.',
            'Missing external provider (Google linked place) is flagged if R3+.',
            'Optional setting to treat missing external provider link as a blue flag instead of red.',
            'Improvements to hospital, gas station, and PLA highlighting.',
            'Layout and data entry improvements.',
            'A boatload of bug fixes.'
        ];
        var newSep = '\n - ', listSep = '<li>';  // joiners for script and html messages
        var WMEPHWhatsNew = WMEPHWhatsNewList.join(newSep);
        var WMEPHWhatsNewMeta = WMEPHWhatsNewMetaList.join(newSep);
        var WMEPHWhatsNewHList = WMEPHWhatsNewList.join(listSep);
        var WMEPHWhatsNewMetaHList = WMEPHWhatsNewMetaList.join(listSep);
        WMEPHWhatsNew = 'WMEPH v. ' + WMEPHversion + '\nUpdates:' + newSep + WMEPHWhatsNew;
        WMEPHWhatsNewMeta = 'WMEPH v. ' + WMEPHversionMeta + '\nMajor features:' + newSep + WMEPHWhatsNewMeta;
        if ( localStorage.getItem('WMEPH-featuresExamined'+devVersStr) === null ) {
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '0');  // Storage for whether the User has pressed the button to look at updates
        }
        var thisUser = W.loginManager.user;
        var UpdateObject = require("Waze/Action/UpdateObject");
        var _disableHighlightTest = false;  // Set to true to temporarily disable highlight checks immediately when venues change.

        modifyGoogleLinks();

        // Whitelist initialization
        if ( validateWLS( LZString.decompressFromUTF16(localStorage.getItem(WLlocalStoreNameCompressed)) ) === false ) {  // If no compressed WL string exists
            if ( validateWLS(localStorage.getItem(WLlocalStoreName)) === false ) {  // If no regular WL exists
                venueWhitelist = { '1.1.1': { Placeholder: {  } } }; // Populate with a dummy place
                saveWL_LS(false);
                saveWL_LS(true);
            } else {  // if regular WL string exists, then transfer to compressed version
                localStorage.setItem('WMEPH-OneTimeWLBU', localStorage.getItem(WLlocalStoreName));
                loadWL_LS(false);
                saveWL_LS(true);
                alert('Whitelists are being converted to a compressed format.  If you have trouble with your WL, please submit an error report.');
            }
        } else {
            loadWL_LS(true);
        }

        if (W.loginManager.user.userName === 'ggrane') {
            searchResultsWindowSpecs = '"resizable=yes, top='+ Math.round(window.screen.height*0.1) +', left='+ Math.round(window.screen.width*0.3) +', width='+ Math.round(window.screen.width*0.86) +', height='+ Math.round(window.screen.height*0.8) +'"';
        }

        // Initialize the WL Object
        var currentWL = {};

        // If the editor installs for the 1st time, alert with the new elements
        if ( localStorage.getItem('WMEPHversionMeta'+devVersStr) === null ) {
            alert(WMEPHWhatsNewMeta);
            localStorage.setItem('WMEPHversionMeta'+devVersStr, WMEPHversionMeta);
            localStorage.setItem('WMEPHversion'+devVersStr, WMEPHversion);
            localStorage.setItem(GLinkWarning, '0');  // Reset warnings
            localStorage.setItem(SFURLWarning, '0');
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');  // disable the button
        } else if (localStorage.getItem('WMEPHversionMeta'+devVersStr) !== WMEPHversionMeta) { // If the editor installs a newer MAJOR version, alert with the new elements
            alert(WMEPHWhatsNewMeta);
            localStorage.setItem('WMEPHversionMeta'+devVersStr, WMEPHversionMeta);
            localStorage.setItem('WMEPHversion'+devVersStr, WMEPHversion);
            localStorage.setItem(GLinkWarning, '0');  // Reset warnings
            localStorage.setItem(SFURLWarning, '0');
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');  // disable the button
        } else if (localStorage.getItem('WMEPHversion'+devVersStr) !== WMEPHversion) {  // If MINOR version....
            if (majorNewFeature) {  //  with major feature update, then alert
                alert(WMEPHWhatsNew);
                localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');  // disable the button
            } else {  //  if not major feature update, then keep the button
                localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '0');
            }
            localStorage.setItem('WMEPHversion'+devVersStr, WMEPHversion);  // store last installed version in localstorage
        }
        if (localStorage.getItem('WMEPH-plaNameWLWarning'+devVersStr) === null) {
            localStorage.setItem('WMEPH-plaNameWLWarning'+devVersStr, '1');
            alert('WME Place Harmonizer\n\nParking Lot Areas (PLA) now have the ability to be Whitelisted if they are unnamed. Please consult the wiki for when it is ok to have a PLA with no name.');
        }
        // Settings setup
        var GLinkWarning = 'GLinkWarning';  // Warning message for first time using Google search to not to use the Google info itself.
        if (!localStorage.getItem(GLinkWarning)) {  // store settings so the warning is only given once
            localStorage.setItem(GLinkWarning, '0');
        }
        var SFURLWarning = 'SFURLWarning';  // Warning message for first time using localized storefinder URL.
        if (!localStorage.getItem(SFURLWarning)) {  // store settings so the warning is only given once
            localStorage.setItem(SFURLWarning, '0');
        }

        setTimeout(add_PlaceHarmonizationSettingsTab, 50);  // initialize the settings tab

        // Event listeners
        W.selectionManager.events.registerPriority("selectionchanged", this, checkSelection);
        W.model.venues.on('objectschanged', deleteDupeLabel);
        W.accelerators.events.registerPriority('save', null, destroyDupeLabels);
        W.model.venues.on('objectssynced', syncWL);

        // Remove any temporary ID values (ID < 0) from the WL store at startup.
        var removedWLCount = 0;
        Object.keys(venueWhitelist).forEach(function(venueID) {
            if (venueID < 0) {
                delete venueWhitelist[venueID];
                removedWLCount += 1;
            }
        });
        if (removedWLCount > 0) {
            saveWL_LS(true);
            phlogdev('Removed ' + removedWLCount + ' venues with temporary ID\'s from WL store');
        }

        // This should be called after new venues are saved (using venues'objectssynced' event), so the new IDs can be retrieved and used
        // to replace the temporary IDs in the whitelist.  If WME errors during save, this function may not run.  At that point, the
        // temporary IDs can no longer be traced to the new IDs so the WL for those new venues will be orphaned, and the temporary IDs
        // will be removed from the WL store the next time the script starts.
        function syncWL(newVenues) {
            newVenues.forEach(function(newVenue) {
                var oldID = newVenue._prevID;
                var newID = newVenue.attributes.id;
                if (oldID && newID && venueWhitelist[oldID]) {
                    venueWhitelist[newID] = venueWhitelist[oldID];
                    delete venueWhitelist[oldID];
                }
            });
            saveWL_LS(true);
        }

        var WMEPHurl = 'https://www.waze.com/forum/posting.php?mode=reply&f=819&t=215657';  // WMEPH Forum thread URL
        var USAPNHMasURL = 'https://docs.google.com/spreadsheets/d/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/edit#gid=0';  // Master USA PNH link
        var placesWikiURL = 'https://wazeopedia.waze.com/wiki/USA/Places';  // WME Places wiki
        var restAreaWikiURL = 'https://wazeopedia.waze.com/wiki/USA/Rest_areas#Adding_a_Place';  // WME Places wiki
        var betaUser, devUser;
        if (WMEPHbetaList.length === 0 || "undefined" === typeof WMEPHbetaList) {
            if (isDevVersion) {
                alert('Beta user list access issue.  Please post in the GHO or PM/DM MapOMatic about this message.  Script should still work.');
            }
            betaUser = false;
            devUser = false;
        } else {
            devUser = (WMEPHdevList.indexOf(thisUser.userName.toLowerCase()) > -1);
            betaUser = (WMEPHbetaList.indexOf(thisUser.userName.toLowerCase()) > -1);
        }
        if (devUser) {
            betaUser = true; // dev users are beta users
        }
        var usrRank = thisUser.normalizedLevel;  // get editor's level (actual level)
        var userLanguage = I18n.locale;

        // lock levels are offset by one
        var lockLevel1 = 0, lockLevel2 = 1, lockLevel3 = 2, lockLevel4 = 3, lockLevel5 = 4;
        var defaultLockLevel = lockLevel2, PNHLockLevel;
        var PMUserList = { // user names and IDs for PM functions
            SER: {approvalActive: true, modID: '2647925', modName: 'MapOMatic'},
            WMEPH: {approvalActive: true, modID: '2647925', modName: 'MapOMatic'}
        };
        var severityButt=0;  // error tracking to determine banner color (action buttons)
        var duplicateName = '';
        var catTransWaze2Lang = I18n.translations[userLanguage].venues.categories;  // pulls the category translations
        var item, itemID, newName, optionalAlias, newURL, tempPNHURL = '', newPhone;
        var newAliases = [], newAliasesTemp = [], newCategories = [];
        var numAttempts = 0;

        // Split out state-based data (USA_STATE_DATA)
        var USA_STATE_HEADERS = USA_STATE_DATA[0].split("|");
        var ps_state_ix = USA_STATE_HEADERS.indexOf('ps_state');
        var ps_state2L_ix = USA_STATE_HEADERS.indexOf('ps_state2L');
        var ps_region_ix = USA_STATE_HEADERS.indexOf('ps_region');
        var ps_gFormState_ix = USA_STATE_HEADERS.indexOf('ps_gFormState');
        var ps_defaultLockLevel_ix = USA_STATE_HEADERS.indexOf('ps_defaultLockLevel');
        //var ps_requirePhone_ix = USA_STATE_HEADERS.indexOf('ps_requirePhone');
        //var ps_requireURL_ix = USA_STATE_HEADERS.indexOf('ps_requireURL');
        var ps_areacode_ix = USA_STATE_HEADERS.indexOf('ps_areacode');
        var stateDataTemp, areaCodeList = '800,822,833,844,855,866,877,888';  //  include toll free non-geographic area codes
        var ixBank, ixATM, ixOffices;

        // Set up Run WMEPH button once place is selected
        bootstrapRunButton();

        /**
         * Generates highlighting rules and applies them to the map.
         */
        var layer = W.map.landmarkLayer;
        function initializeHighlights() {
            var ruleGenerator = function(value, symbolizer) {
                return new W.Rule({
                    filter: new OL.Filter.Comparison({
                        type: '==',
                        value: value,
                        evaluate: function(venue) {
                            return venue && venue.model && venue.model.attributes.wmephSeverity === this.value;
                        }
                    }),
                    symbolizer: symbolizer
                });
            };

            var severity0 = ruleGenerator(0, {
                'pointRadius': '5',
                'strokeWidth': '4',
                'strokeColor': '#24ff14'
            });

            var severityLock = ruleGenerator('lock', {
                'pointRadius': '5',
                'strokeColor': '#24ff14',
                'strokeLinecap': '1',
                'strokeDashstyle': '7 2',
                'strokeWidth': '5'
            });

            var severity1 = ruleGenerator(1, {
                'strokeColor': '#0055ff',
                'strokeWidth': '4',
                'pointRadius': '7'
            });

            var severityLock1 = ruleGenerator('lock1', {
                'pointRadius': '5',
                'strokeColor': '#0055ff',
                'strokeLinecap': '1',
                'strokeDashstyle': '7 2',
                'strokeWidth': '5'
            });

            var severity2 = ruleGenerator(2, {
                'strokeColor': '#ff0',
                'strokeWidth': '6',
                'pointRadius': '8'
            });

            var severity3 = ruleGenerator(3, {
                'strokeColor': '#ff0000',
                'strokeWidth': '4',
                'pointRadius': '8'
            });

            var severity4 = ruleGenerator(4, {
                'fillColor': 'black',
                'fillOpacity': '0.35',
                'strokeColor': '#f42',
                'strokeLinecap': '1',
                'strokeWidth': '13',
                'strokeDashstyle': '4 2'
            });

            var severityHigh = ruleGenerator(5, {
                'pointRadius': '12',
                'fillColor': 'black',
                'fillOpacity': '0.4',
                'strokeColor': '#f4a',
                'strokeLinecap': '1',
                'strokeWidth': '10',
                'strokeDashstyle': '4 2'
            });

            var severityAdLock = ruleGenerator('adLock', {
                'pointRadius': '12',
                'fillColor': 'yellow',
                'fillOpacity': '0.4',
                'strokeColor': '#000',
                'strokeLinecap': '1',
                'strokeWidth': '10',
                'strokeDashstyle': '4 2'
            });

            function plaTypeRuleGenerator(value, symbolizer) {
                return new W.Rule({
                    filter: new OL.Filter.Comparison({
                        type: '==',
                        value: value,
                        evaluate: function(venue) {
                            if ($('#WMEPH-PLATypeFill' + devVersStr).is(':checked') && venue && venue.model && venue.model.attributes.categories &&
                                venue.model.attributes.categoryAttributes && venue.model.attributes.categoryAttributes.PARKING_LOT &&
                                venue.model.attributes.categories.indexOf('PARKING_LOT') > -1) {
                                var type = venue.model.attributes.categoryAttributes.PARKING_LOT.parkingType;
                                return (!type && this.value === 'public') || (type && (type.toLowerCase() === this.value));
                            }
                        }
                    }),
                    symbolizer: symbolizer
                });
            }

            var publicPLA = plaTypeRuleGenerator('public', {
                fillColor: '#00FF00',
                fillOpacity: '0.3'
            });
            var restrictedPLA = plaTypeRuleGenerator('restricted', {
                fillColor: '#FFFF00',
                fillOpacity: '0.3'
            });
            var privatePLA = plaTypeRuleGenerator('private', {
                fillColor: '#FF0000',
                fillOpacity: '0.3'
            });

            Array.prototype.push.apply(layer.styleMap.styles['default'].rules, [severity0, severityLock, severity1, severityLock1, severity2, severity3, severity4, severityHigh, severityAdLock,publicPLA, restrictedPLA, privatePLA]);
            // to make Google Script linter happy ^^^ Array.prototype.push.apply(layer.styleMap.styles.default.rules, [severity0, severityLock, severity1, severity2, severity3, severity4, severityHigh]);
            /* Can apply to normal view or selection/highlight views as well.
            _.each(layer.styleMap.styles, function(style) {
                style.rules = style.rules.concat([severity0, severityLock, severity1, severity2, severity3, severity4, severityHigh]);
            });
            */
        }

        /**
         * To highlight a place, set the wmephSeverity attribute to the desired highlight level.
         * @param venues {array of venues, or single venue} Venues to check for highlights.
         */
        function applyHighlightsTest(venues) {
            venues = venues ? _.isArray(venues) ? venues : [venues] : [];
            var storedBannButt = bannButt, storedBannServ = bannServ, storedBannButt2 = bannButt2;
            var t0 = performance.now();  // Speed check start

            _.each(venues, function (venue) {
                if (venue.CLASS_NAME === 'Waze.Feature.Vector.Landmark' &&
                    venue.attributes) {
                    // Highlighting logic would go here
                    // Severity can be: 0, 'lock', 1, 2, 3, 4, or 'high'. Set to
                    // anything else to use default WME style.
                    if ( $("#WMEPH-ColorHighlighting" + devVersStr).prop('checked') && !($("#WMEPH-DisableRankHL" + devVersStr).prop('checked') && venue.attributes.lockRank > (usrRank - 1))) {
                        try {
                            venue.attributes.wmephSeverity = harmonizePlaceGo(venue,'highlight');
                        } catch (err) {
                            phlogdev("highlight error: ",err);
                        }
                    } else {
                        venue.attributes.wmephSeverity = 'default';
                    }

                }
            });
            if (W.selectionManager.selectedItems.length === 1) {
                var venue = W.selectionManager.selectedItems[0].model;
                if (venue.type === "venue") {
                    venue.attributes.wmephSeverity = harmonizePlaceGo(venue,'highlight');
                    bannButt = storedBannButt;
                    bannServ = storedBannServ;
                    bannButt2 = storedBannButt2;
                }
            }
            layer.redraw();
            var t1 = performance.now();  // log search time
            phlogdev("Ran highlighter in " + (t1 - t0) + " milliseconds.");

        }

        // Setup highlight colors
        initializeHighlights();

        // Set up CH loop
        function bootstrapWMEPH_CH() {
            if ( $("#WMEPH-ColorHighlighting" + devVersStr).prop('checked') ) {
                // Turn off place highlighting in WMECH if it's on.
                if ( $("#_cbHighlightPlaces").prop('checked') ) {
                    $("#_cbHighlightPlaces").trigger('click');
                }
                // Add listeners
                W.model.venues.on('objectschanged', function (e) {
                    if (!_disableHighlightTest) {
                        applyHighlightsTest(e);
                    }
                });

                W.model.venues.on('objectsadded', function (e) {
                    applyHighlightsTest(e);
                });

                // Apply the colors
                applyHighlightsTest(W.model.venues.getObjectArray());

                //setTimeout(bootstrapWMEPH_CH,500);  // Refresh the Highlights periodically
            } else {
                // reset the colors to default
                applyHighlightsTest(W.model.venues.getObjectArray());
                //updateWMEPH_CH(false);
            }
        }

        // used for phone reformatting
        if (!String.plFormat) {
            String.plFormat = function(format) {
                var args = Array.prototype.slice.call(arguments, 1);
                return format.replace(/{(\d+)}/g, function(name, number) {
                    return typeof args[number] !== "undefined" ? args[number] : null;
                });
            };
        }

        // Change place.name to title case
        var ignoreWords = "an|and|as|at|by|for|from|hhgregg|in|into|of|on|or|the|to|with".split('|');
        var capWords = "3M|AAA|AMC|AOL|AT&T|ATM|BBC|BLT|BMV|BMW|BP|CBS|CCS|CGI|CISCO|CJ|CNN|CVS|DHL|DKNY|DMV|DSW|EMS|ER|ESPN|FCU|FCUK|FDNY|GNC|H&M|HP|HSBC|IBM|IHOP|IKEA|IRS|JBL|JCPenney|KFC|LLC|MBNA|MCA|MCI|NBC|NYPD|PDQ|PNC|TCBY|TNT|TV|UPS|USA|USPS|VW|XYZ|ZZZ".split('|');
        var specWords = "d'Bronx|iFix".split('|');

        function toTitleCase(str, ignoreParensAtEnd) {
            if (!str) {
                return str;
            }
            str = str.trim();
            var parensPart = '';
            if (ignoreParensAtEnd) {
                var m = str.match(/.*(\(.*\))$/);
                if (m) {
                    parensPart = m[1];
                    str = str.slice(0,str.length - parensPart.length);
                }
            }
            var allCaps = (str === str.toUpperCase());
            // Cap first letter of each word
            str = str.replace(/([A-Za-z\u00C0-\u017F][^\s-\/]*) */g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.substr(1);
            });
            // Cap O'Reilley's, L'Amour, D'Artagnan as long as 5+ letters
            str = str.replace(/\b[oOlLdD]'[A-Za-z']{3,}/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3);
            });
            // Cap McFarley's, as long as 5+ letters long
            str = str.replace(/\b[mM][cC][A-Za-z']{3,}/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase() + txt.charAt(2).toUpperCase() + txt.substr(3);
            });
            // anything with an "&" sign, cap the character after &
            str = str.replace(/&.+/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0) + txt.charAt(1).toUpperCase() + txt.substr(2);
            });
            // lowercase any from the ignoreWords list
            str = str.replace(/[^ ]+/g, function(txt) {
                var txtLC = txt.toLowerCase();
                return (ignoreWords.indexOf(txtLC) > -1) ? txtLC : txt;
            });
            // uppercase any from the capWords List
            str = str.replace(/[^ ]+/g, function(txt) {
                var txtUC = txt.toUpperCase();
                return (capWords.indexOf(txtUC) > -1) ? txtUC : txt;
            });
            // preserve any specific words
            str = str.replace(/[^ ]+/g, function(txt) {
                //var txtAC = txt.toUpperCase();
                for (var swix=0; swix<specWords.length; swix++) {
                    if ( txt.toUpperCase() === specWords[swix].toUpperCase() ) {
                        return specWords[swix];
                    }
                }
                return txt;
            });
            // Fix 1st, 2nd, 3rd, 4th, etc. to lowercase
            str = str.replace(/\b(\d*1)st\b/gi, '$1st');
            str = str.replace(/\b(\d*2)nd\b/gi, '$1nd');
            str = str.replace(/\b(\d*3)rd\b/gi, '$1rd');
            str = str.replace(/\b(\d+)th\b/gi, '$1th');
            // Cap first letter of entire name
            str = str.charAt(0).toUpperCase() + str.substr(1);
            return str + parensPart;
        }

        // Change place.name to title case
        function toTitleCaseStrong(str, ignoreParensAtEnd) {
            if (!str) {
                return str;
            }
            str = str.trim();
            var parensPart = '';
            if (ignoreParensAtEnd) {
                var m = str.match(/.*(\(.*\))$/);
                if (m) {
                    parensPart = m[1];
                    str = str.slice(0,str.length - parensPart.length);
                }
            }
            var allCaps = (str === str.toUpperCase());
            // Cap first letter of each word
            str = str.replace(/([A-Za-z\u00C0-\u017F][^\s-\/]*) */g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
            // Cap O'Reilley's, L'Amour, D'Artagnan as long as 5+ letters
            str = str.replace(/\b[oOlLdD]'[A-Za-z']{3,}/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase();
            });
            // Cap McFarley's, as long as 5+ letters long
            str = str.replace(/\b[mM][cC][A-Za-z']{3,}/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase() + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase();
            });
            // anything sith an "&" sign, cap the word after &
            str = str.replace(/&\w+/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0) + txt.charAt(1).toUpperCase() + txt.substr(2);
            });
            // lowercase any from the ignoreWords list
            str = str.replace(/[^ ]+/g, function(txt) {
                var txtLC = txt.toLowerCase();
                return (ignoreWords.indexOf(txtLC) > -1) ? txtLC : txt;
            });
            // uppercase any from the capWords List
            str = str.replace(/[^ ]+/g, function(txt) {
                var txtLC = txt.toUpperCase();
                return (capWords.indexOf(txtLC) > -1) ? txtLC : txt;
            });
            // Fix 1st, 2nd, 3rd, 4th, etc.
            str = str.replace(/\b(\d*1)st\b/gi, '$1st');
            str = str.replace(/\b(\d*2)nd\b/gi, '$1nd');
            str = str.replace(/\b(\d*3)rd\b/gi, '$1rd');
            str = str.replace(/\b(\d+)th\b/gi, '$1th');
            // Cap first letter of entire name
            str = str.charAt(0).toUpperCase() + str.substr(1);
            return str + parensPart;
        }

        // normalize phone
        function normalizePhone(s, outputFormat, returnType) {
            if ( !s && returnType === 'existing' ) {
                bannButt.phoneMissing.active = true;
                if (currentWL.phoneWL) {
                    bannButt.phoneMissing.WLactive = false;
                }
                return s;
            }
            s = s.replace(/(\d{3}.*)(?:extension|ext|xt|x).*/i, '$1');
            var s1 = s.replace(/\D/g, '');  // remove non-number characters
            var m = s1.match(/^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/);  // Ignore leading 1, and also don't allow area code or exchange to start with 0 or 1 (***USA/CAN specific)
            if (!m) {  // then try alphanumeric matching
                if (s) { s = s.toUpperCase(); }
                s1 = s.replace(/[^0-9A-Z]/g, '').replace(/^\D*(\d)/,'$1').replace(/^1?([2-9][0-9]{2}[0-9A-Z]{7,10})/g,'$1');
                s1 = replaceLetters(s1);
                m = s1.match(/^([2-9]\d{2})([2-9]\d{2})(\d{4})(?:.{0,3})$/);  // Ignore leading 1, and also don't allow area code or exchange to start with 0 or 1 (***USA/CAN specific)
                if (!m) {
                    if ( returnType === 'inputted' ) {
                        return 'badPhone';
                    } else {
                        bannButt.phoneInvalid.active = true;
                        return s;
                    }
                } else {
                    return String.plFormat(outputFormat, m[1], m[2], m[3]);
                }
            } else {
                return String.plFormat(outputFormat, m[1], m[2], m[3]);
            }
        }

        // Alphanumeric phone conversion
        function replaceLetters(number) {
            var conversionMap = _({
                2: /A|B|C/,
                3: /D|E|F/,
                4: /G|H|I/,
                5: /J|K|L/,
                6: /M|N|O/,
                7: /P|Q|R|S/,
                8: /T|U|V/,
                9: /W|X|Y|Z/
            });
            number = typeof number === 'string' ? number.toUpperCase() : '';
            return number.replace(/[A-Z]/g, function(match, offset, string) {
                return conversionMap.findKey(function(re) {
                    return re.test(match);
                });
            });
        }

        var MultiAction = require("Waze/Action/MultiAction");
        // Add array of actions to a MultiAction to be executed at once (counts as one edit for redo/undo purposes)
        function executeMultiAction(actions) {
            if(actions.length > 0) {
                var m_action = new MultiAction();
                m_action.setModel(W.model);
                actions.forEach(function(action) {
                    m_action.doSubAction(action);
                });
                W.model.actionManager.add(m_action);
            }
        }

        // Normalize url
        function normalizeURL(s, lc, skipBannerActivate) {
            if ((!s || s.trim().length === 0) && !skipBannerActivate) {  // Notify that url is missing and provide web search to find website and gather data (provided for all editors)
                bannButt.urlMissing.active = true;
                if (currentWL.urlWL) {
                    bannButt.urlMissing.WLactive = false;
                }
                bannButt.webSearch.active = true;  // Activate websearch button
                return s;
            }

            s = s.replace(/ \(.*/g, '');  // remove anything with parentheses after it
            s = s.replace(/ /g, '');  // remove any spaces
            var m = s.match(/^http:\/\/(.*)$/i);  // remove http://
            if (m) { s = m[1]; }
            if (lc) {  // lowercase the entire domain
                s = s.replace(/[^\/]+/i, function(txt) { // lowercase the domain
                    return (txt === txt.toLowerCase()) ? txt : txt.toLowerCase();
                });
            } else {  // lowercase only the www and com
                s = s.replace(/www\./i, 'www.');
                s = s.replace(/\.com/i, '.com');
            }
            m = s.match(/^(.*)\/pages\/welcome.aspx$/i);  // remove unneeded terms
            if (m) { s = m[1]; }
            m = s.match(/^(.*)\/pages\/default.aspx$/i);  // remove unneeded terms
            if (m) { s = m[1]; }
            // m = s.match(/^(.*)\/index.html$/i);  // remove unneeded terms
            // if (m) { s = m[1]; }
            // m = s.match(/^(.*)\/index.htm$/i);  // remove unneeded terms
            // if (m) { s = m[1]; }
            // m = s.match(/^(.*)\/index.php$/i);  // remove unneeded terms
            // if (m) { s = m[1]; }
            m = s.match(/^(.*)\/$/i);  // remove final slash
            if (m) { s = m[1]; }

            if (!s || s.trim().length === 0) s = 'badURL';
            return s;
        }  // END normalizeURL function

        // Only run the harmonization if a venue is selected
        function harmonizePlace() {
            // Beta version for approved users only
            if (isDevVersion && !betaUser) {
                alert("Please sign up to beta-test this script version.\nSend a PM or Slack-DM to MapOMatic or Tonestertm, or post in the WMEPH forum thread. Thanks.");
                return;
            }
            // Only run if a single place is selected
            if (W.selectionManager.selectedItems.length === 1) {
                var item = W.selectionManager.selectedItems[0].model;
                if (item.type === "venue") {
                    blurAll();  // focus away from current cursor position
                    _disableHighlightTest = true;
                    harmonizePlaceGo(item,'harmonize');
                    _disableHighlightTest = false;
                    applyHighlightsTest(item);
                } else {  // Remove duplicate labels
                    WMEPH_NameLayer.destroyFeatures();
                }
            } else {  // Remove duplicate labels
                WMEPH_NameLayer.destroyFeatures();
            }
        }

        // Main script
        function harmonizePlaceGo(item, useFlag, actions) {
            actions = actions || []; // Used for collecting all actions to be applied to the model.

            var hpMode = {
                harmFlag: false,
                hlFlag: false,
                scanFlag: false
            };

            if ( useFlag.indexOf('harmonize') > -1 ) {
                hpMode.harmFlag = true;
                phlog('Running script on selected place...');
            }
            if ( useFlag.indexOf('highlight') > -1 ) {
                hpMode.hlFlag = true;
            }
            if ( useFlag.indexOf('scan') > -1 ) {
                hpMode.scanFlag = true;
            }

            // If it's an unlocked parking lot, return with severity 4.
            if (hpMode.hlFlag && isPLA(item) && item.attributes.lockRank === 0) {
                return 4;
            }

            var placePL = getItemPL();  //  set up external post div and pull place PL
            // https://www.waze.com/editor/?env=usa&lon=-80.60757&lat=28.17850&layers=1957&zoom=4&segments=86124344&update_requestsFilter=false&problemsFilter=false&mapProblemFilter=0&mapUpdateRequestFilter=0&venueFilter=1
            placePL = placePL.replace(/\&layers=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&update_requestsFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&problemsFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&mapProblemFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&mapUpdateRequestFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&venueFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            var region, state2L, newPlaceURL, approveRegionURL, servID, useState = true;
            var gFormState = "";
            var PNHOrderNum = '', PNHNameTemp = '', PNHNameTempWeb = '';
            severityButt = 0;
            var customStoreFinder = false;  // switch indicating place-specific custom store finder url
            var customStoreFinderLocal = false;  // switch indicating place-specific custom store finder url with localization option (GPS/addr)
            var customStoreFinderURL = "";  // switch indicating place-specific custom store finder url
            var customStoreFinderLocalURL = "";  // switch indicating place-specific custom store finder url with localization option (GPS/addr)
            var fieldUpdateObject = {name: false, aliases: false, categories: false, brand: false, description: false, lockRank: false, address: false, url: false, phone: false, openingHours: false,
                                     services: { VALLET_SERVICE: false, DRIVETHROUGH: false, WI_FI: false, RESTROOMS: false, CREDIT_CARDS: false, RESERVATIONS: false,
                                                OUTSIDE_SEATING: false, AIR_CONDITIONING: false, PARKING_FOR_CUSTOMERS: false, DELIVERIES: false, TAKE_AWAY: false, WHEELCHAIR_ACCESSIBLE: false }
                                    };
            // Whitelist: reset flags
            currentWL = {
                dupeWL: [],
                restAreaName: false,
                restAreaSpec: false,
                unmappedRegion: false,
                gasMismatch: false,
                hotelMkPrim: false,
                changeToOffice: false,
                changeToDoctorClinic: false,
                changeHMC2PetVet: false,
                changeSchool2Offices: false,
                pointNotArea: false,
                areaNotPoint: false,
                HNWL: false,
                hnNonStandard: false,
                HNRange: false,
                parentCategory: false,
                suspectDesc: false,
                resiTypeName: false,
                longURL: false,
                gasNoBrand: false,
                subFuel: false,
                hotelLocWL: false,
                localizedName: false,
                urlWL: false,
                phoneWL: false,
                aCodeWL: false,
                noHours: false,
                nameMissing: false,
                plaNameMissing: false,
                extProviderMissing: false
            };

            // **** Set up banner action buttons.  Structure:
            // active: false until activated in the script
            // severity: determines the color of the banners and whether locking occurs
            // message: The text before the button option
            // value: button text
            // title: tooltip text
            // action: The action that happens if the button is pressed
            // WL terms are for whitelisting
            bannButt = {
                hnDashRemoved: {
                    active: false, severity: 0, message: "Dash removed from house number. Verify"
                },

                fullAddressInference: {  // no WL
                    active: false, severity: 3, message: 'Missing address was inferred from nearby segments. Verify the address and run script again.'
                },

                nameMissing: {  // no WL
                    active: false, severity: 3, message: 'Name is missing.'
                },

                plaNameMissing: {
                    active: false, severity: 1, message: 'Name is missing.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist missing name',
                    WLaction: function() {
                        wlKeyName = 'plaNameMissing';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                hoursOverlap: {  // no WL
                    active: false, severity: 3, message: 'Overlapping hours of operation. Place might not save.'
                },

                unmappedRegion: {
                    active: false, severity: 3, message: 'This category is usually not mapped in this region.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist unmapped category',
                    WLaction: function() {
                        wlKeyName = 'unmappedRegion';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                restAreaName: {
                    active: false, severity: 3, message: 'Rest area name is out of spec. Use the Rest Area wiki button below to view formats.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist rest area name',
                    WLaction: function() {
                        wlKeyName = 'restAreaName';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                restAreaGas: { // no WL
                    active: false, severity: 3, message: 'Gas stations at Rest Areas should be separate area places.'
                },

                restAreaSpec: {  // if it appears to be a rest area
                    active: false, severity: 3, message: "Is this a rest area?", value: "Yes", title: 'Update with proper categories and services.',
                    action: function() {
                        var actions = [];
                        // update categories according to spec
                        newCategories = insertAtIX(newCategories,"TRANSPORTATION",0);  // Insert/move TRANSPORTATION category in the first position
                        newCategories = insertAtIX(newCategories,"SCENIC_LOOKOUT_VIEWPOINT",1);  // Insert/move SCENIC_LOOKOUT_VIEWPOINT category in the 2nd position

                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        // make it 24/7
                        actions.push(new UpdateObject(item, { openingHours: [{days: [1,2,3,4,5,6,0], fromHour: "00:00", toHour: "00:00"}] }));
                        fieldUpdateObject.openingHours='#dfd';
                        //highlightChangedFields(fieldUpdateObject,hpMode);

                        bannServ.add247.checked = true;
                        bannServ.addParking.actionOn(actions);  // add parking service
                        bannServ.addWheelchair.actionOn(actions);  // add parking service
                        bannButt.restAreaSpec.active = false;  // reset the display flag

                        executeMultiAction(actions);

                        _disableHighlightTest = true;
                        harmonizePlaceGo(item,'harmonize');
                        _disableHighlightTest = false;
                        applyHighlightsTest(item);
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist place',
                    WLaction: function() {
                        wlKeyName = 'restAreaSpec';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                gasMismatch: {  // if the gas brand and name don't match
                    active: false, severity: 3, message: "Gas name and brand don't match.  Move brand to name?", value: "Yes", title: 'Change the primary name to the brand and make the current name the alt-name.',
                    action: function() {
                        newAliases = insertAtIX(newAliases, newName, 0);
                        for (var naix=0; naix<newAliases.length; naix++) {
                            newAliases[naix] = toTitleCase(newAliases[naix]);
                        }
                        newName = item.attributes.brand;
                        newAliases = removeSFAliases(newName, newAliases);
                        W.model.actionManager.add(new UpdateObject(item, { name: newName, aliases: newAliases }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.aliases='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.gasMismatch.active = false;  // reset the display flag
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist gas brand mismatch',
                    WLaction: function() {
                        wlKeyName = 'gasMismatch';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                gasUnbranded: {  // no WL
                    active: false, severity: 3, message: '"Unbranded" should not be used for the station brand. Change to correct brand or use the blank entry at the top of the brand list.'
                },

                gasMkPrim: {  // no WL
                    active: false, severity: 3,  message: "Gas Station is not the primary category", value: "Fix", title: 'Make the Gas Station category the primary category.',
                    action: function() {
                        newCategories = insertAtIX(newCategories,"GAS_STATION",0);  // Insert/move Gas category in the first position
                        var actions = [];
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        bannButt.gasMkPrim.active = false;  // reset the display flag
                        executeMultiAction(actions);
                        harmonizePlaceGo(item,'harmonize');
                    }
                },

                hotelMkPrim: {
                    active: false, severity: 3, message: "Hotel category is not first", value: "Fix", title: 'Make the Hotel category the primary category.',
                    action: function() {
                        newCategories = insertAtIX(newCategories,"HOTEL",0);  // Insert/move Hotel category in the first position
                        var actions = [];
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        bannButt.hotelMkPrim.active = false;  // reset the display flag
                        executeMultiAction(actions);
                        harmonizePlaceGo(item,'harmonize');
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist hotel as secondary category',
                    WLaction: function() {
                        wlKeyName = 'hotelMkPrim';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                changeToPetVet: {
                    active: false, severity: 3, message: "This looks like it should be a Pet/Veterinarian category. Change?", value: "Yes", title: 'Change to Pet/Veterinarian Category',
                    action: function() {
                        var idx = newCategories[newCategories.indexOf('HOSPITAL_MEDICAL_CARE')];
                        if (idx === -1) idx = newCategories[newCategories.indexOf('HOSPITAL_URGENT_CARE')];
                        if (idx > -1) {
                            newCategories[idx] = "PET_STORE_VETERINARIAN_SERVICES";
                            var actions = [];
                            actions.push(new UpdateObject(item, { categories: newCategories }));
                            fieldUpdateObject.categories='#dfd';
                            bannButt.changeToPetVet.active = false;  // reset the display flag
                            executeMultiAction(actions);
                        }
                        harmonizePlaceGo(item,'harmonize');  // Rerun the script to update fields and lock
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist PetVet category',
                    WLaction: function() {
                        wlKeyName = 'changeHMC2PetVet';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                changeSchool2Offices: {
                    active: false, severity: 3, message: "This doesn't look like it should be School category.", value: "Change to Office", title: 'Change to Offices Category',
                    action: function() {
                        newCategories[newCategories.indexOf('SCHOOL')] = "OFFICES";
                        var actions = [];
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        bannButt.changeSchool2Offices.active = false;  // reset the display flag
                        executeMultiAction(actions);
                        harmonizePlaceGo(item,'harmonize');  // Rerun the script to update fields and lock
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist School category',
                    WLaction: function() {
                        wlKeyName = 'changeSchool2Offices';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                pointNotArea: {  // Area 2 Point button
                    active: false, severity: 3, message: "This category should be a point place.", value: "Change to point", title: 'Change to point place',
                    action: function() {
                        // If a stop point is set, use it for the point, else use Centroid
                        var newGeometry;
                        if (item.attributes.entryExitPoints.length > 0) {
                            newGeometry = item.attributes.entryExitPoints[0].point;
                        } else {
                            newGeometry = item.geometry.getCentroid();
                        }
                        updateFeatureGeometry (item, newGeometry);
                        bannButt.pointNotArea.active = false;
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)',
                    WLaction: function() {
                        wlKeyName = 'pointNotArea';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                areaNotPoint: {  // Point 2 Area button
                    active: false, severity: 3, message: "This category should be an area place.", value: "Change to area", title: 'Change to Area',
                    action: function() {
                        // If a stop point is set, use it for the point, else use Centroid
                        updateFeatureGeometry (item, item.getPolygonGeometry());
                        bannButt.areaNotPoint.active = false;
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)',
                    WLaction: function() {
                        wlKeyName = 'areaNotPoint';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                hnMissing: {
                    active: false, severity: 3, message: 'No HN: <input type="text" id="WMEPH-HNAdd'+devVersStr+'" autocomplete="off" style="font-size:0.85em;width:100px;padding-left:3px;color:#000;background-color:#FDD">',
                    value: "Add", title: 'Add HN to place',
                    badInput: false,
                    action: function() {
                        var newHN = $('#WMEPH-HNAdd'+devVersStr).val();
                        newHN = newHN.replace(/ +/g, '');
                        phlogdev(newHN);
                        var hnTemp = newHN.replace(/[^\d]/g, '');
                        var hnTempDash = newHN.replace(/[^\d-]/g, '');
                        if (hnTemp > 0 && hnTemp < 1000000) {
                            W.model.actionManager.add(new UpdateObject(item, { houseNumber: hnTempDash }));
                            fieldUpdateObject.address='#dfd';
                            bannButt.hnMissing.active = false;
                            badInput = false;
                        } else {
                            badInput = true;
                        }

                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty HN',
                    WLaction: function() {
                        wlKeyName = 'HNWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                hnNonStandard: {
                    active: false, severity: 3, message: 'House number is non-standard.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist non-standard HN',
                    WLaction: function() {
                        wlKeyName = 'hnNonStandard';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                HNRange: {
                    active: false, severity: 2, message: 'House number seems out of range for the street name. Verify.', value: '',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist HN range',
                    WLaction: function() {
                        wlKeyName = 'HNRange';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                // streetMissing: {  // no WL
                //     active: false, severity: 3, message: 'No street: <div class="ui-widget" style="display:inline;"><input id="WMEPH_missingStreet" style="color:#000;background-color:#FDD;width:140px;margin-right:3px;"></div><input class="btn btn-default btn-xs wmeph-btn disabled" id="WMEPH_addStreetBtn" title="Add street to place" type="button" value="Add" disabled>'
                // },

                streetMissing: {  // no WL
                    active: false, severity: 3, message: 'No street:', value: 'Edit address', title: "Edit address to add street.",
                    action: function() {
                        $('.nav-tabs a[href="#landmark-edit-general"]').trigger('click');
                        $('.waze-icon-edit').trigger('click');
                        if ($('.empty-street').prop('checked')) {
                            $('.empty-street').trigger('click');
                        }
                        $('.street-name').focus();
                    }
                },

                cityMissing: {  // no WL
                    active: false, severity: 3, message: 'No city:', value: 'Edit address', title: "Edit address to add city.",
                    action: function() {
                        $('.nav-tabs a[href="#landmark-edit-general"]').trigger('click');
                        $('.waze-icon-edit').trigger('click');
                        if ($('.empty-city').prop('checked')) {
                            $('.empty-city').trigger('click');
                        }
                        $('.city-name').focus();
                    }
                },

                bankType1: {   // no WL
                    active: false, severity: 3, message: 'Clarify the type of bank: the name has ATM but the primary category is Offices'
                },

                bankBranch: {  // no WL
                    active: false, severity: 1, message: "Is this a bank branch office? ", value: "Yes", title: "Is this a bank branch?",
                    action: function() {
                        newCategories = ["BANK_FINANCIAL","ATM"];  // Change to bank and atm cats
                        newName = newName.replace(/[\- (]*ATM[\- )]*/g, ' ').replace(/^ /g,'').replace(/ $/g,'');     // strip ATM from name if present
                        W.model.actionManager.add(new UpdateObject(item, { name: newName, categories: newCategories }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
                        bannButt.bankBranch.active = false;   // reset the bank Branch display flag
                        bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
                        bannButt.bankType1.active = false;  // remove bank type warning
                    }
                },

                standaloneATM: { // no WL
                    active: false, severity: 2, message: "Or is this a standalone ATM? ", value: "Yes", title: "Is this a standalone ATM with no bank branch?",
                    action: function() {
                        if (newName.indexOf("ATM") === -1) {
                            newName = newName + ' ATM';
                        }
                        newCategories = ["ATM"];  // Change to ATM only
                        W.model.actionManager.add(new UpdateObject(item, { name: newName, categories: newCategories }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
                        bannButt.bankBranch.active = false;   // reset the bank Branch display flag
                        bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
                        bannButt.bankType1.active = false;  // remove bank type warning
                    }
                },

                bankCorporate: {  // no WL
                    active: false, severity: 1, message: "Or is this the bank's corporate offices?", value: "Yes", title: "Is this the bank's corporate offices?",
                    action: function() {
                        newCategories = ["OFFICES"];  // Change to offices category
                        newName = newName.replace(/[\- (]*atm[\- )]*/ig, ' ').replace(/^ /g,'').replace(/ $/g,'').replace(/ {2,}/g,' ');     // strip ATM from name if present
                        W.model.actionManager.add(new UpdateObject(item, { name: newName + ' - Corporate Offices', categories: newCategories }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
                        bannButt.bankBranch.active = false;   // reset the bank Branch display flag
                        bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
                        bannButt.bankType1.active = false;  // remove bank type warning
                    }
                },

                catPostOffice: {  // no WL
                    active: false, severity: 2, message: 'If this is not a USPS post office, change the category, as "Post Office" is only used for USPS locations.'
                },

                ignEdited: {  // no WL
                    active: false, severity: 2, message: 'Last edited by an IGN editor'
                },

                wazeBot: {  // no WL
                    active: false, severity: 2, message: 'Edited last by an automated process. Please verify information is correct.'
                },

                parentCategory: {
                    active: false, severity: 2, message: 'This parent category is usually not mapped in this region.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist parent Category',
                    WLaction: function() {
                        wlKeyName = 'parentCategory';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                checkDescription: {  // no WL
                    active: false, severity: 2, message: 'Description field already contained info; PNH description was added in front of existing. Check for inconsistency or duplicate info.'
                },

                overlapping: {  // no WL
                    active: false, severity: 2, message: 'Place points are stacked up.'
                },

                suspectDesc: {  // no WL
                    active: false, severity: 2, message: 'Description field might contain copyrighted info.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist description',
                    WLaction: function() {
                        wlKeyName = 'suspectDesc';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                resiTypeName: {
                    active: false, severity: 2, message: 'The place name suggests a residential place or personalized place of work.  Please verify.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist Residential-type name',
                    WLaction: function() {
                        wlKeyName = 'resiTypeName';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                mismatch247: {  // no WL
                    active: false, severity: 2, message: 'Hours of operation listed as open 24hrs but not for all 7 days.'
                },

                phoneInvalid: {  // no WL
                    active: false, severity: 2, message: 'Phone invalid.'
                },

                areaNotPointMid: {
                    active: false, severity: 2, message: 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)',
                    WLaction: function() {
                        wlKeyName = 'areaNotPoint';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                pointNotAreaMid: {
                    active: false, severity: 2, message: 'This category is usually a point place, but can be an area in some cases. Verify if area is appropriate.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)',
                    WLaction: function() {
                        wlKeyName = 'pointNotArea';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                longURL: {
                    active: false, severity: 1, message: 'Existing URL doesn\'t match the suggested PNH URL. Use the Place Website button below to verify. If existing URL is invalid:', value: "Use PNH URL", title: "Change URL to the PNH standard",
                    action: function() {
                        if (tempPNHURL !== '') {
                            W.model.actionManager.add(new UpdateObject(item, { url: tempPNHURL }));
                            fieldUpdateObject.url='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                            bannButt.longURL.active = false;
                            updateURL = true;
                        } else {
                            if (confirm('WMEPH: URL Matching Error!\nClick OK to report this error') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                                forumMsgInputs = {
                                    subject: 'WMEPH URL comparison Error report',
                                    message: 'Error report: URL comparison failed for "' + item.attributes.name + '"\nPermalink: ' + placePL
                                };
                                WMEPH_errorReport(forumMsgInputs);
                            }
                        }
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist existing URL',
                    WLaction: function() {
                        wlKeyName = 'longURL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                gasNoBrand: {
                    active: false, severity: 1, message: 'Verify that gas station has no brand.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist no gas brand',
                    WLaction: function() {
                        wlKeyName = 'gasNoBrand';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                subFuel: {
                    active: false, severity: 1, message: 'Make sure this place is for the gas station itself and not the main store building.  Otherwise undo and check the categories.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist no gas brand',
                    WLaction: function() {
                        wlKeyName = 'subFuel';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                areaNotPointLow: {
                    active: false, severity: 1, message: 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)',
                    WLaction: function() {
                        wlKeyName = 'areaNotPoint';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                pointNotAreaLow: {
                    active: false, severity: 1, message: 'This category is usually a point place, but can be an area in some cases. Verify if area is appropriate.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)',
                    WLaction: function() {
                        wlKeyName = 'pointNotArea';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                formatUSPS: {  // ### needs WL or not?
                    active: false, severity: 1, message: 'Localize the post office according to this region\'s standards for USPS locations (e.g., "USPS - Tampa")'
                },

                catHotel: {
                    active: false, severity: 1, message: 'Check hotel website for any name localization (e.g. Hilton - Tampa Airport)',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist hotel localization',
                    WLaction: function() {
                        wlKeyName = 'hotelLocWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                localizedName: {
                    active: false, severity: 1, message: 'Place needs localization information',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist localization',
                    WLaction: function() {
                        wlKeyName = 'localizedName';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                specCaseMessage: {  // no WL
                    active: false, severity: 1, message: 'WMEPH: placeholder (please report this error if you see this message)'
                },

                pnhCatMess: {  // no WL
                    active: false, severity: 0, message: 'WMEPH: placeholder (please report this error if you see this message)'
                },

                changeToHospitalUrgentCare: {
                    active: false, severity: 0, message: "", value: "Change to Hospital / Urgent Care", title: 'Change category to Hospital / Urgent Care',
                    action: function() {
                        var idx = newCategories.indexOf('HOSPITAL_MEDICAL_CARE');
                        if (idx === -1) idx = newCategories.indexOf('DOCTOR_CLINIC');
                        if (idx > -1) {
                            newCategories[idx] = "HOSPITAL_URGENT_CARE";
                            var actions = [];
                            actions.push(new UpdateObject(item, { categories: newCategories }));
                            fieldUpdateObject.categories='#dfd';
                            bannButt.changeToHospitalUrgentCare.active = false;  // reset the display flag
                            executeMultiAction(actions);
                        }
                        harmonizePlaceGo(item,'harmonize');  // Rerun the script to update fields and lock
                    },
                    WLactive: false, WLmessage: '', WLtitle: 'Whitelist category',
                    WLaction: function() {
                        wlKeyName = 'changetoHospitalUrgentCare';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                changeToDoctorClinic: {
                    active: false, severity: 0, message: "", value: "Change to Doctor / Clinic", title: 'Change category to Doctor / Clinic',
                    action: function() {
                        var actions = [];
                        ['HOSPITAL_MEDICAL_CARE', 'HOSPITAL_URGENT_CARE', 'OFFICES', 'PERSONAL_CARE'].forEach(function(cat) {
                            var idx = newCategories.indexOf(cat);
                            if (idx > -1) {
                                newCategories[idx] = "DOCTOR_CLINIC";
                                actions.push(new UpdateObject(item, { categories: newCategories }));
                            }
                        });
                        if (actions.length > 0) {
                            bannButt.changeToDoctorClinic.active = false;  // reset the display flag
                            fieldUpdateObject.categories='#dfd';
                            executeMultiAction(actions);
                        }
                        harmonizePlaceGo(item,'harmonize');  // Rerun the script to update fields and lock
                    },
                    WLactive: false, WLmessage: '', WLtitle: 'Whitelist category',
                    WLaction: function() {
                        wlKeyName = 'changeToDoctorClinic';
                        whitelistAction(itemID, wlKeyName);
                    }
                },
                specCaseMessageLow: {  // no WL
                    active: false, severity: 0, message: 'WMEPH: placeholder (please report this error if you see this message)'
                },

                extProviderMissing: {
                    active:false, severity:3, message:'No external provider link(s) ',
                    WLactive:true, WLmessage:'', WLtitle:'Whitelist missing external provider',
                    WLaction: function() {
                        wlKeyName = 'extProviderMissing';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                urlMissing: {
                    active: false, severity: 1, message: 'No URL: <input type="text" id="WMEPH-UrlAdd'+devVersStr+'" autocomplete="off" style="font-size:0.85em;width:100px;padding-left:3px;color:#000;background-color:#DDF">',
                    value: "Add", title: 'Add URL to place',
                    badInput: false,
                    action: function() {
                        var newUrlValue = $('#WMEPH-UrlAdd'+devVersStr).val();
                        var newUrl = normalizeURL(newUrlValue, true, false);
                        if ((!newUrl || newUrl.trim().length === 0) || newUrl === 'badURL') {
                            this.badInput = true;
                        } else {
                            phlogdev(newUrl);
                            W.model.actionManager.add(new UpdateObject(item, { url: newUrl }));
                            fieldUpdateObject.url='#dfd';
                            bannButt.urlMissing.active = false;
                            showOpenPlaceWebsiteButton();
                            this.badInput = false;
                        }
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty URL',
                    WLaction: function() {
                        wlKeyName = 'urlWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                phoneMissing: {
                    active: false, severity: 1, message: 'No ph#: <input type="text" id="WMEPH-PhoneAdd'+devVersStr+'" autocomplete="off" style="font-size:0.85em;width:100px;padding-left:3px;color:#000;background-color:#DDF">',
                    value: "Add", title: 'Add phone to place',
                    badInput: false,
                    action: function() {
                        var newPhoneVal = $('#WMEPH-PhoneAdd'+devVersStr).val();
                        var newPhone = normalizePhone(newPhoneVal, outputFormat, 'inputted');
                        if (newPhone === 'badPhone') {
                            this.badInput = true;
                        } else {
                            this.badInput = false;
                            phlogdev(newPhone);
                            if (countryCode === "USA" || countryCode === "CAN") {
                                if (newPhone !== null && newPhone.match(/[2-9]\d{2}/) !== null) {
                                    var areaCode = newPhone.match(/[2-9]\d{2}/)[0];
                                    if ( areaCodeList.indexOf(areaCode) === -1 ) {
                                        bannButt.badAreaCode.active = true;
                                        if (currentWL.aCodeWL) {
                                            bannButt.badAreaCode.WLactive = false;
                                        }
                                    }
                                }
                            }
                            W.model.actionManager.add(new UpdateObject(item, { phone: newPhone }));
                            fieldUpdateObject.phone='#dfd';
                            bannButt.phoneMissing.active = false;
                        }

                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty phone',
                    WLaction: function() {
                        wlKeyName = 'phoneWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                badAreaCode: {
                    active: false, severity: 1, message: "Area Code mismatch ",
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist the area code',
                    WLaction: function() {
                        wlKeyName = 'aCodeWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                noHours: {
                    active: false, severity: 1, message: 'No hours: <input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste'+devVersStr+'" autocomplete="off" style="font-size:0.85em;width:170px;padding-left:3px;color:#AAA">',
                    value: "Add hours", title: 'Add pasted hours to existing',
                    action: function() {
                        var pasteHours = $('#WMEPH-HoursPaste'+devVersStr).val();
                        phlogdev(pasteHours);
                        $('.nav-tabs a[href="#landmark-edit-more-info"]').tab('show');
                        pasteHours = pasteHours + ',' + getOpeningHours(item).join(',');
                        var hoursObjectArray = parseHours(pasteHours);
                        if (hoursObjectArray !== false) {
                            phlogdev(hoursObjectArray);
                            W.model.actionManager.add(new UpdateObject(item, { openingHours: hoursObjectArray }));
                            fieldUpdateObject.openingHours='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                            bannButt.noHours.value = 'Add hours';
                            bannButt.noHours.severity = 0;
                            bannButt.noHours.WLactive = false;
                            bannButt.noHours.message = 'Hours: <input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                        } else {
                            phlog('Can\'t parse those hours');
                            bannButt.noHours.severity = 1;
                            bannButt.noHours.WLactive = true;
                            bannButt.noHours.message = 'Hours: <input type="text" value="Can\'t parse, try again" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                        }
                    },
                    value2: "Replace all hours", title2: 'Replace existing hours with pasted hours',
                    action2: function() {
                        var pasteHours = $('#WMEPH-HoursPaste'+devVersStr).val();
                        phlogdev(pasteHours);
                        $('.nav-tabs a[href="#landmark-edit-more-info"]').tab('show');
                        var hoursObjectArray = parseHours(pasteHours);
                        if (hoursObjectArray !== false) {
                            phlogdev(hoursObjectArray);
                            item.attributes.openingHours.push.apply(item.attributes.openingHours, hoursObjectArray);
                            W.model.actionManager.add(new UpdateObject(item, { openingHours: hoursObjectArray }));
                            fieldUpdateObject.openingHours='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                            bannButt.noHours.value2 = 'Replace hours';
                            bannButt.noHours.severity = 0;
                            bannButt.noHours.WLactive = false;
                            bannButt.noHours.message = 'Hours: <input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                        } else {
                            phlog('Can\'t parse those hours');
                            bannButt.noHours.severity = 1;
                            bannButt.noHours.WLactive = true;
                            bannButt.noHours.message = 'Hours: <input type="text" value="Can\'t parse, try again" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                        }

                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist no Hours',
                    WLaction: function() {
                        wlKeyName = 'noHours';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                resiTypeNameSoft: {  // no WL
                    active: false, severity: 0, message: 'The place name suggests a residential place or personalized place of work.  Please verify.'
                },

                localURL: {  // no WL
                    active: false, severity: 0, message: 'Some locations for this business have localized URLs, while others use the primary corporate site. Check if a local URL applies to this location.'
                },

                babiesRUs: {  // no WL
                    active: false, severity: 0, message: 'If there is a Toys R Us at this location, make it the primary name and Babies R Us the alt name and rerun the script.'
                },

                lockRPP: {    // no WL
                    active: false, severity: 0, message: 'Lock this residential point?', value: "Lock", title: 'Lock the residential point',
                    action: function() {
                        var RPPlevelToLock = $("#RPPLockLevel :selected").val() || defaultLockLevel + 1;
                        phlogdev('RPPlevelToLock: '+ RPPlevelToLock);

                        RPPlevelToLock = RPPlevelToLock -1 ;
                        W.model.actionManager.add(new UpdateObject(item, { lockRank: RPPlevelToLock }));
                        // no field highlight here
                        bannButt.lockRPP.message = 'Current lock: '+ (parseInt(item.attributes.lockRank)+1) +'. '+RPPLockString+' ?';
                    }
                },

                addAlias: {    // no WL
                    active: false, severity: 0, message: "Is " + optionalAlias + " at this location?", value: "Yes", title: 'Add ' + optionalAlias,
                    action: function() {
                        newAliases = insertAtIX(newAliases,optionalAlias,0);
                        if (specCases.indexOf('altName2Desc') > -1 &&  item.attributes.description.toUpperCase().indexOf(optionalAlias.toUpperCase()) === -1 ) {
                            newDescripion = optionalAlias + '\n' + newDescripion;
                            W.model.actionManager.add(new UpdateObject(item, { description: newDescripion }));
                            fieldUpdateObject.description='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                        }
                        newAliases = removeSFAliases(newName, newAliases);
                        W.model.actionManager.add(new UpdateObject(item, { aliases: newAliases }));
                        fieldUpdateObject.aliases='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addAlias.active = false;  // reset the display flag
                    }
                },

                addCat2: {   // no WL
                    active: false, severity: 0, message: "Is there a " + newCategories[0] + " at this location?", value: "Yes", title: 'Add ' + newCategories[0],
                    action: function() {
                        newCategories.push.apply(newCategories,altCategories);
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addCat2.active = false;  // reset the display flag
                    }
                },

                addPharm: {   // no WL
                    active: false, severity: 0, message: "Is there a Pharmacy at this location?", value: "Yes", title: 'Add Pharmacy category',
                    action: function() {
                        newCategories = insertAtIX(newCategories, 'PHARMACY', 1);
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addPharm.active = false;  // reset the display flag
                    }
                },

                addSuper: {   // no WL
                    active: false, severity: 0, message: "Does this location have a supermarket?", value: "Yes", title: 'Add Supermarket category',
                    action: function() {
                        newCategories = insertAtIX(newCategories, 'SUPERMARKET_GROCERY', 1);
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addSuper.active = false;  // reset the display flag
                    }
                },

                appendAMPM: {   // no WL
                    active: false, severity: 0, message: "Is there an ampm at this location?", id: "appendAMPM", value: "Yes", title: 'Add ampm to the place',
                    action: function() {
                        newCategories = insertAtIX(newCategories, 'CONVENIENCE_STORE', 1);
                        newName = 'ARCO ampm';
                        newURL = 'ampm.com';
                        W.model.actionManager.add(new UpdateObject(item, { name: newName, url: newURL, categories: newCategories }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.url='#dfd';
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.appendAMPM.active = false;  // reset the display flag
                        bannButt.addConvStore.active = false;  // also reset the addConvStore display flag
                    }
                },

                addATM: {    // no WL
                    active: false, severity: 0, message: "ATM at location? ", value: "Yes", title: "Add the ATM category to this place",
                    action: function() {
                        newCategories = insertAtIX(newCategories,"ATM",1);  // Insert ATM category in the second position
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addATM.active = false;   // reset the display flag
                    }
                },

                addConvStore: {  // no WL
                    active: false, severity: 0, message: "Add convenience store category? ", value: "Yes", title: "Add the Convenience Store category to this place",
                    action: function() {
                        newCategories = insertAtIX(newCategories,"CONVENIENCE_STORE",1);  // Insert C.S. category in the second position
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addConvStore.active = false;   // reset the display flag
                    }
                },

                isitUSPS: {  // no WL
                    active: false, severity: 0, message: "Is this a USPS location? ", value: "Yes", title: "Is this a USPS location?",
                    action: function() {
                        bannServ.addAC.actionOn();
                        bannServ.addCreditCards.actionOn();
                        bannServ.addParking.actionOn();
                        bannServ.addDeliveries.actionOn();
                        bannServ.addWheelchair.actionOn();
                        W.model.actionManager.add(new UpdateObject(item, { url: "usps.com" }));
                        fieldUpdateObject.url='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        if (region === 'SER') {
                            W.model.actionManager.add(new UpdateObject(item, { aliases: ["United States Postal Service"] }));
                            fieldUpdateObject.aliases='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                        }
                        bannButt.isitUSPS.active = false;
                    }
                },

                STC: {    // no WL
                    active: false, severity: 0, message: "Force Title Case: ", value: "Yes", title: "Force Title Case to InterNal CaPs",
                    action: function() {
                        newName = toTitleCaseStrong(item.attributes.name, isPLA(item));  // Get the Strong Title Case name
                        if (newName !== item.attributes.name) {  // if they are not equal
                            W.model.actionManager.add(new UpdateObject(item, { name: newName }));
                            fieldUpdateObject.name='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                        }
                        bannButt.STC.active = false;  // reset the display flag
                    }
                },

                sfAliases: {    // no WL
                    active: false, severity: 0, message: 'Unnecessary aliases were removed.'
                },

                placeMatched: {    // no WL
                    active: false, severity: 0, message: 'Place matched from PNH data.'
                },

                placeLocked: {    // no WL
                    active: false, severity: 0, message: 'Place locked.'
                },

                webSearch: {  // no WL
                    active: false, severity: 0, message: "", value: "Web Search", title: "Search the web for this place.  Do not copy info from 3rd party sources!",
                    action: function() {
                        if (localStorage.getItem(GLinkWarning) !== '1') {
                            if (confirm('***Please DO NOT copy info from Google or third party sources.*** This link is to help you find the business webpage.\nClick OK to agree and continue.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                                localStorage.setItem(GLinkWarning, '1');
                            }
                        }
                        if (localStorage.getItem(GLinkWarning) === '1') {
                            if ( $("#WMEPH-WebSearchNewTab" + devVersStr).prop('checked') ) {
                                window.open(buildGLink(newName,addr,item.attributes.houseNumber));
                            } else {
                                window.open(buildGLink(newName,addr,item.attributes.houseNumber), searchResultsWindowName, searchResultsWindowSpecs);
                            }
                        }
                    }
                },

                // NOTE: This is now only used to display the store locator button.  It can be updated to remove/change anything that doesn't serve that purpose.
                PlaceWebsite: {    // no WL
                    active: false, severity: 0, message: "", value: "Place Website", title: "Direct link to place website",
                    action: function() {
                        var openPlaceWebsiteURL, linkProceed = true;
                        if (updateURL) {
                            // replace WME url with storefinder URLs if they are in the PNH data
                            if (customStoreFinder) {
                                openPlaceWebsiteURL = customStoreFinderURL;
                            } else if (customStoreFinderLocal) {
                                openPlaceWebsiteURL = customStoreFinderLocalURL;
                            }
                            // If the user has 'never' opened a localized store finder URL, then warn them (just once)
                            if (localStorage.getItem(SFURLWarning) === '0' && customStoreFinderLocal) {
                                linkProceed = false;
                                if (confirm('***Localized store finder sites often show multiple nearby results. Please make sure you pick the right location.\nClick OK to agree and continue.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                                    localStorage.setItem(SFURLWarning, '1');  // prevent future warnings
                                    linkProceed = true;
                                }
                            }
                        } else {
                            if (/^https?:\/\//.test(item.attributes.url)) {
                                openPlaceWebsiteURL = item.attributes.url;
                            } else {
                                openPlaceWebsiteURL = 'http://' + item.attributes.url;
                            }
                        }
                        // open the link depending on new window setting
                        if (linkProceed) {
                            if ( $("#WMEPH-WebSearchNewTab" + devVersStr).prop('checked') ) {
                                window.open(openPlaceWebsiteURL);
                            } else {
                                window.open(openPlaceWebsiteURL, searchResultsWindowName, searchResultsWindowSpecs);
                            }
                        }
                    }
                },

                NewPlaceSubmit: {    // no WL
                    active: false, severity: 0, message: "No PNH match. If it's a chain: ", value: "Submit new chain data", title: "Submit info for a new chain through the linked form",
                    action: function() {
                        window.open(newPlaceURL);
                    }
                },

                ApprovalSubmit: {  // no WL
                    active: false, severity: 0, message: "PNH data exists but is not approved for this region: ", value: "Request approval", title: "Request region/country approval of this place",
                    action: function() {
                        if ( PMUserList.hasOwnProperty(region) && PMUserList[region].approvalActive ) {
                            var forumPMInputs = {
                                subject: '' + PNHOrderNum + ' PNH approval for "' + PNHNameTemp + '"',
                                message: 'Please approve "' + PNHNameTemp + '" for the ' + region + ' region.  Thanks\n \nPNH order number: ' + PNHOrderNum + '\n \nPermalink: ' + placePL + '\n \nPNH Link: ' + USAPNHMasURL,
                                preview: 'Preview', attach_sig: 'on'
                            };
                            forumPMInputs['address_list[u]['+PMUserList[region].modID+']'] = 'to';  // Sends a PM to the regional mod instead of the submission form
                            WMEPH_newForumPost('https://www.waze.com/forum/ucp.php?i=pm&mode=compose', forumPMInputs);
                        } else {
                            window.open(approveRegionURL);
                        }
                    }
                }
            };  // END bannButt definitions

            bannButtHL = bannButt;

            bannButt2 = {
                placesWiki: {
                    active: true, severity: 0, message: "", value: "Places wiki", title: "Open the places wiki page",
                    action: function() {
                        window.open(placesWikiURL);
                    }
                },
                restAreaWiki: {
                    active: false, severity: 0, message: "", value: "Rest Area wiki", title: "Open the Rest Area wiki page",
                    action: function() {
                        window.open(restAreaWikiURL);
                    }
                },
                clearWL: {
                    active: false, severity: 0, message: "", value: "Clear Place whitelist", title: "Clear all Whitelisted fields for this place",
                    action: function() {
                        if (confirm('Are you sure you want to clear all whitelisted fields for this place?') ) {  // misclick check
                            delete venueWhitelist[itemID];
                            saveWL_LS(true);
                            harmonizePlaceGo(item,'harmonize');  // rerun the script to check all flags again
                        }
                    }
                },  // END placesWiki definition
                PlaceErrorForumPost: {
                    active: true, severity: 0, message: "", value: "Report script error", title: "Report a script error",
                    action: function() {
                        var forumMsgInputs = {
                            subject: 'WMEPH Bug report: Scrpt Error',
                            message: 'Script version: ' + WMEPHversion + devVersStr + '\nPermalink: ' + placePL + '\nPlace name: ' + item.attributes.name + '\nCountry: ' + addr.country.name + '\n--------\nDescribe the error:  \n '
                        };
                        WMEPH_errorReport(forumMsgInputs);
                    }
                },
                whatsNew: {
                    active: false, severity: 0, message: "", value: "*Recent script updates*", title: "Open a list of recent script updates",
                    action: function() {
                        alert(WMEPHWhatsNew);
                        localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');
                        bannButt2.whatsNew.active = false;
                    }
                }
            };  // END bannButt2 definitions

            function addUpdateAction(updateObj, actions) {
                var action = new UpdateObject(item, updateObj);
                if (actions) {
                    actions.push(action);
                } else {
                    W.model.actionManager.add(action);
                }
            }

            function setServiceChecked(servBtn, checked, actions) {
                var servID = WMEServicesArray[servBtn.servIDIndex];
                var checkboxChecked = $("#service-checkbox-"+servID).prop('checked');
                var toggle = typeof checked === 'undefined';
                var noAdd = false;
                checked = (toggle) ? !servBtn.checked : checked;
                if (checkboxChecked === servBtn.checked && checkboxChecked !== checked) {
                    servBtn.checked = checked;
                    var services;
                    if (actions) {
                        for (var i=0; i<actions.length; i++ ) {
                            var existingAction = actions[i];
                            if (existingAction.newAttributes && existingAction.newAttributes.services) {
                                services = existingAction.newAttributes.services;
                            }
                        }
                    }
                    if (!services) {
                        services = item.attributes.services.slice(0);
                    } else {
                        noAdd = services.indexOf(servID) > -1;
                    }
                    if (checked) {
                        services.push(servID);
                    } else {
                        var index = services.indexOf(servID);
                        if (index > -1) {
                            services.splice(index, 1);
                        }
                    }
                    if (!noAdd) {
                        addUpdateAction({services:services}, actions);
                        fieldUpdateObject.services[servID] = '#dfd';
                    }
                }
                updateServicesChecks(bannServ);
                if (!toggle) servBtn.active = checked;
            }

            // set up banner action buttons.  Structure:
            // active: false until activated in the script
            // checked: whether the service is already set on the place. Determines grey vs white icon color
            // icon: button icon name
            // value: button text  (Not used for Icons, keep as backup
            // title: tooltip text
            // action: The action that happens if the button is pressed
            bannServ = {
                addValet: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-valet", w2hratio: 50/50, value: "Valet", title: 'Valet', servIDIndex: 0,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addDriveThru: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-drivethru", w2hratio: 78/50, value: "DriveThru", title: 'Drive-Thru', servIDIndex: 1,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addWiFi: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-wifi", w2hratio: 67/50, value: "WiFi", title: 'WiFi', servIDIndex: 2,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addRestrooms: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-restrooms", w2hratio: 49/50, value: "Restroom", title: 'Restrooms', servIDIndex: 3,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addCreditCards: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-credit", w2hratio: 73/50, value: "CC", title: 'Credit Cards', servIDIndex: 4,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addReservations: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-reservations", w2hratio: 55/50, value: "Reserve", title: 'Reservations', servIDIndex: 5,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addOutside: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-outdoor", w2hratio: 73/50, value: "OusideSeat", title: 'Outside Seating', servIDIndex: 6,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addAC: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-ac", w2hratio: 50/50, value: "AC", title: 'AC', servIDIndex: 7,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addParking: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-parking", w2hratio: 46/50, value: "Parking", title: 'Parking', servIDIndex: 8,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addDeliveries: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-deliveries", w2hratio: 86/50, value: "Delivery", title: 'Deliveries', servIDIndex: 9,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addTakeAway: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-takeaway", w2hratio: 34/50, value: "TakeOut", title: 'Take Out', servIDIndex: 10,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addWheelchair: {  // add service
                    active: false, checked: false, icon: "serv-wheelchair", w2hratio: 50/50, value: "WhCh", title: 'Wheelchair Accessible', servIDIndex: 11,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                add247: {  // add 24/7 hours
                    active: false, checked: false, icon: "serv-247", w2hratio: 73/50, value: "247", title: 'Hours: Open 24\/7',
                    action: function(actions) {
                        if (!bannServ.add247.checked) {
                            addUpdateAction({ openingHours: [{days: [1,2,3,4,5,6,0], fromHour: "00:00", toHour: "00:00"}] }, actions);
                            fieldUpdateObject.openingHours='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                            bannServ.add247.checked = true;
                            bannButt.noHours.active = false;
                        }
                    },
                    actionOn: function(actions) {
                        this.action(actions);
                    }
                }
            };  // END bannServ definitions

            if (hpMode.harmFlag) {
                // Update icons to reflect current WME place services
                updateServicesChecks(bannServ);

                // Turn on New Features Button if not looked at yet
                if (localStorage.getItem('WMEPH-featuresExamined'+devVersStr) === '0') {
                    bannButt2.whatsNew.active = true;
                }
                //Setting switch for the Places Wiki button
                if ( $("#WMEPH-HidePlacesWiki" + devVersStr).prop('checked') ) {
                    bannButt2.placesWiki.active = false;
                }
                // provide Google search link to places
                if (devUser || betaUser || usrRank > 1) {  // enable the link for all places, for R2+ and betas
                    bannButt.webSearch.active = true;
                }
                // reset PNH lock level
                PNHLockLevel = -1;
            }


            // get GPS lat/long coords from place, call as itemGPS.lat, itemGPS.lon
            var itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(item.attributes.geometry.getCentroid().x,item.attributes.geometry.getCentroid().y);
            var lockOK = true;  // if nothing goes wrong, then place will be locked
            var categories = item.attributes.categories;
            newCategories = categories.slice(0);
            newName = item.attributes.name;
            newName = toTitleCase(newName, isPLA(item));
            // var nameShort = newName.replace(/[^A-Za-z]/g, '');  // strip non-letters for PNH name searching
            // var nameNumShort = newName.replace(/[^A-Za-z0-9]/g, ''); // strip non-letters/non-numbers for PNH name searching
            newAliases = item.attributes.aliases.slice(0);
            for (var naix=0; naix<newAliases.length; naix++) {
                newAliases[naix] = toTitleCase(newAliases[naix], isPLA(item));
            }
            var brand = item.attributes.brand;
            var newDescripion = item.attributes.description;
            newURL = item.attributes.url;
            var newURLSubmit = "";
            if (newURL !== null && newURL !== '') {
                newURLSubmit = newURL;
            }
            newPhone = item.attributes.phone;
            var addr = item.getAddress();
            if ( addr.hasOwnProperty('attributes') ) {
                addr = addr.attributes;
            }
            var PNHNameRegMatch;

            // Some user submitted places have no data in the country, state and address fields.
            if (!addr.state || !addr.country) {
                if (hpMode.harmFlag) {
                    if (W.map.getZoom() < 4 ) {
                        if ( $("#WMEPH-EnableIAZoom" + devVersStr).prop('checked') ) {
                            W.map.moveTo(W.selectionManager.selectedItems[0].model.geometry.getCentroid().toLonLat(), 5);
                            return;
                        } else {
                            alert("No address and the state cannot be determined. Please zoom in and rerun the script. You can enable autozoom for this type of case in the options.");
                            return;  //  don't run the rest of the script
                        }
                    } else {
                        var inferredAddress = WMEPH_inferAddress(7);  // Pull address info from nearby segments

                        if (inferredAddress && inferredAddress.state && inferredAddress.country ) {
                            addr = inferredAddress;
                            if ( $("#WMEPH-AddAddresses" + devVersStr).prop('checked') ) {  // update the item's address if option is enabled
                                updateAddress(item, addr, actions);
                                fieldUpdateObject.address='#dfd';
                                if (item.attributes.houseNumber && item.attributes.houseNumber.replace(/[^0-9A-Za-z]/g,'').length > 0 ) {
                                    bannButt.fullAddressInference.active = true;
                                    lockOK = false;
                                }
                            } else {
                                bannButt.cityMissing.active = true;
                                lockOK = false;
                            }
                        } else {  //  if the inference doesn't work...
                            alert("Place has no address data. Please set the address and rerun the script.");
                            return;  //  don't run the rest of the script
                        }
                    }
                } else if (hpMode.hlFlag) {
                    if ( item.attributes.adLocked ) {
                        return 'adLock';
                    } else if ( item.attributes.categories.indexOf("HOSPITAL_MEDICAL_CARE") > -1 || item.attributes.categories.indexOf("HOSPITAL_URGENT_CARE") > -1 || item.attributes.categories.indexOf("GAS_STATION") > -1 ) {
                        phlogdev('Unaddressed HMC/GS');
                        return 5;
                    } else {
                        return 3;
                    }
                }
            } else if (hpMode.harmFlag && $('.editing').length === 1 ) {
                $('.save-button').click();  // apply any address changes
            }


            if (item.attributes.categories.indexOf("HOSPITAL_MEDICAL_CARE") > -1) {
                if (hpMode.hlFlag) {
                    return 4;
                } else {
                    bannButt.changeToHospitalUrgentCare.message = 'There are more precise categories available for this place type.  Please update the category:';
                    bannButt.changeToHospitalUrgentCare.active = true;
                    bannButt.changeToHospitalUrgentCare.severity = 3;
                    delete bannButt.changeToHospitalUrgentCare.WLactive;
                    bannButt.changeToDoctorClinic.active = true;
                    bannButt.changeToDoctorClinic.severity = 3;
                    delete bannButt.changeToDoctorClinic.WLactive;
                    lockOK = false;
                }
            } else if (hpMode.harmFlag && item.attributes.categories.indexOf("DOCTOR_CLINIC") > -1) {
                bannButt.changeToHospitalUrgentCare.message = "If this place provides emergency medical care:";
                bannButt.changeToHospitalUrgentCare.active = true;
                bannButt.changeToHospitalUrgentCare.severity = 0;
            } else if (hpMode.harmFlag && item.attributes.categories.indexOf("HOSPITAL_URGENT_CARE") > -1) {
                //bannButt.changeToDoctorClinic.active = true;
                //bannButt.changeToDoctorClinic.severity = 0;
            }


            // Whitelist breakout if place exists on the Whitelist and the option is enabled
            itemID = item.attributes.id;
            var WLMatch = false;
            if ( venueWhitelist.hasOwnProperty(itemID) ) {
                if ( hpMode.harmFlag || ( hpMode.hlFlag && !$("#WMEPH-DisableWLHL" + devVersStr).prop('checked')  ) ) {
                    WLMatch = true;
                    // Enable the clear WL button if any property is true
                    for (var WLKey in venueWhitelist[itemID]) {  // loop thru the venue WL keys
                        if ( venueWhitelist[itemID].hasOwnProperty(WLKey) && (venueWhitelist[itemID][WLKey].active || false) ) {
                            bannButt2.clearWL.active = true;
                            currentWL[WLKey] = venueWhitelist[itemID][WLKey];  // update the currentWL settings
                        }
                    }
                    if (venueWhitelist[itemID].hasOwnProperty('dupeWL') && venueWhitelist[itemID].dupeWL.length > 0) {
                        bannButt2.clearWL.active = true;
                        currentWL.dupeWL = venueWhitelist[itemID].dupeWL;
                    }
                    // Update address and GPS info for the place
                    venueWhitelist[itemID].city = addr.city.attributes.name;  // Store city for the venue
                    venueWhitelist[itemID].state = addr.state.name;  // Store state for the venue
                    venueWhitelist[itemID].country = addr.country.name;  // Store country for the venue
                    venueWhitelist[itemID].gps = itemGPS;  // Store GPS coords for the venue
                }
            }

            // Country restrictions
            var countryCode;
            if (addr.country.name === "United States") {
                countryCode = "USA";
            } else if (addr.country.name === "Canada") {
                countryCode = "CAN";
            } else if (addr.country.name === "American Samoa") {
                countryCode = "USA";
                useState = false;
            } else if (addr.country.name === "Guam") {
                countryCode = "USA";
                useState = false;
            } else if (addr.country.name === "Northern Mariana Islands") {
                countryCode = "USA";
                useState = false;
            } else if (addr.country.name === "Puerto Rico") {
                countryCode = "USA";
                useState = false;
            } else if (addr.country.name === "Virgin Islands (U.S.)") {
                countryCode = "USA";
                useState = false;
            } else {
                if (hpMode.harmFlag) {
                    alert("At present this script is not supported in this country.");
                }
                return 3;
            }

            // Parse state-based data
            state2L = "Unknown"; region = "Unknown";
            for (var usdix=1; usdix<USA_STATE_DATA.length; usdix++) {
                stateDataTemp = USA_STATE_DATA[usdix].split("|");
                if (addr.state.name === stateDataTemp[ps_state_ix]) {
                    state2L = stateDataTemp[ps_state2L_ix];
                    region = stateDataTemp[ps_region_ix];
                    gFormState = stateDataTemp[ps_gFormState_ix];
                    if (stateDataTemp[ps_defaultLockLevel_ix].match(/[1-5]{1}/) !== null) {
                        defaultLockLevel = stateDataTemp[ps_defaultLockLevel_ix] - 1;  // normalize by -1
                    } else {
                        if (hpMode.harmFlag) {
                            alert('Lock level sheet data is not correct');
                        } else if (hpMode.hlFlag) {
                            return '3';
                        }
                    }
                    areaCodeList = areaCodeList+','+stateDataTemp[ps_areacode_ix];
                    break;
                }
                // If State is not found, then use the country
                if (addr.country.name === stateDataTemp[ps_state_ix]) {
                    state2L = stateDataTemp[ps_state2L_ix];
                    region = stateDataTemp[ps_region_ix];
                    gFormState = stateDataTemp[ps_gFormState_ix];
                    if (stateDataTemp[ps_defaultLockLevel_ix].match(/[1-5]{1}/) !== null) {
                        defaultLockLevel = stateDataTemp[ps_defaultLockLevel_ix] - 1;  // normalize by -1
                    } else {
                        if (hpMode.harmFlag) {
                            alert('Lock level sheet data is not correct');
                        } else if (hpMode.hlFlag) {
                            return '3';
                        }
                    }
                    areaCodeList = areaCodeList+','+stateDataTemp[ps_areacode_ix];
                    break;
                }

            }
            if (state2L === "Unknown" || region === "Unknown") {    // if nothing found:
                if (hpMode.harmFlag) {
                    if (confirm('WMEPH: Localization Error!\nClick OK to report this error') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                        forumMsgInputs = {
                            subject: 'WMEPH Localization Error report',
                            message: 'Error report: Localization match failed for "' + addr.state.name + '".'
                        };
                        WMEPH_errorReport(forumMsgInputs);
                    }
                }
                return 3;
            }

            // If no gas station name, replace with brand name
            if (hpMode.harmFlag && item.attributes.categories[0] === 'GAS_STATION' && (!newName || newName.trim().length === 0) && item.attributes.brand) {
                newName = item.attributes.brand;
                actions.push(new UpdateObject(item, {name: newName }));
                fieldUpdateObject.name = '#dfd';
            }

            // Clear attributes from residential places
            if (item.attributes.residential) {
                if (hpMode.harmFlag) {
                    if ( !$("#WMEPH-AutoLockRPPs" + devVersStr).prop('checked') ) {
                        lockOK = false;
                    }
                    if (item.attributes.name !== '') {  // Set the residential place name to the address (to clear any personal info)
                        phlogdev("Residential Name reset");
                        actions.push(new UpdateObject(item, {name: ''}));
                        // no field HL
                    }
                    newCategories = ["RESIDENCE_HOME"];
                    // newDescripion = null;
                    if (item.attributes.description !== null && item.attributes.description !== "") {  // remove any description
                        phlogdev("Residential description cleared");
                        actions.push(new UpdateObject(item, {description: null}));
                        // no field HL
                    }
                    // newPhone = null;
                    if (item.attributes.phone !== null && item.attributes.phone !== "") {  // remove any phone info
                        phlogdev("Residential Phone cleared");
                        actions.push(new UpdateObject(item, {phone: null}));
                        // no field HL
                    }
                    // newURL = null;
                    if (item.attributes.url !== null && item.attributes.url !== "") {  // remove any url
                        phlogdev("Residential URL cleared");
                        actions.push(new UpdateObject(item, {url: null}));
                        // no field HL
                    }
                    if (item.attributes.services.length > 0) {
                        phlogdev("Residential services cleared");
                        actions.push(new UpdateObject(item, {services: [] }));
                        // no field HL
                    }
                }
                if (item.is2D()) {
                    bannButt.pointNotArea.active = true;
                }
            } else if (isPLA(item) || (newName && newName.trim().length > 0)) {  // for non-residential places
                if (usrRank >= 3 && !(isPLA(item) && $('#WMEPH-DisablePLAExtProviderCheck' + devVersStr).prop('checked'))) {
                    var provIDs = item.attributes.externalProviderIDs;
                    if (!provIDs || provIDs.length === 0) {
                        if ($('#WMEPH-ExtProviderSeverity' + devVersStr).prop('checked')) {
                            bannButt.extProviderMissing.severity = 1;
                        }
                        bannButt.extProviderMissing.active = !currentWL.extProviderMissing;
                        bannButt.extProviderMissing.WLactive = !currentWL.extProviderMissing;
                    }
                }

                // Place Harmonization
                var PNHMatchData;
                if (hpMode.harmFlag) {
                    if (item.attributes.categories[0] === 'PARKING_LOT') {
                        PNHMatchData = ['NoMatch'];
                    } else {
                        PNHMatchData = harmoList(newName,state2L,region,countryCode,newCategories,item);  // check against the PNH list
                    }
                } else if (hpMode.hlFlag) {
                    PNHMatchData = ['Highlight'];
                }
                PNHNameRegMatch = false;
                if (PNHMatchData[0] !== "NoMatch" && PNHMatchData[0] !== "ApprovalNeeded" && PNHMatchData[0] !== "Highlight" ) { // *** Replace place data with PNH data
                    PNHNameRegMatch = true;
                    var showDispNote = true;
                    var updatePNHName = true;
                    // Break out the data headers
                    var PNH_DATA_headers;
                    if (countryCode === "USA") {
                        PNH_DATA_headers = USA_PNH_DATA[0].split("|");
                    } else if (countryCode === "CAN") {
                        PNH_DATA_headers = CAN_PNH_DATA[0].split("|");
                    }
                    var ph_name_ix = PNH_DATA_headers.indexOf("ph_name");
                    var ph_aliases_ix = PNH_DATA_headers.indexOf("ph_aliases");
                    var ph_category1_ix = PNH_DATA_headers.indexOf("ph_category1");
                    var ph_category2_ix = PNH_DATA_headers.indexOf("ph_category2");
                    var ph_description_ix = PNH_DATA_headers.indexOf("ph_description");
                    var ph_url_ix = PNH_DATA_headers.indexOf("ph_url");
                    var ph_order_ix = PNH_DATA_headers.indexOf("ph_order");
                    // var ph_notes_ix = PNH_DATA_headers.indexOf("ph_notes");
                    var ph_speccase_ix = PNH_DATA_headers.indexOf("ph_speccase");
                    var ph_sfurl_ix = PNH_DATA_headers.indexOf("ph_sfurl");
                    var ph_sfurllocal_ix = PNH_DATA_headers.indexOf("ph_sfurllocal");
                    // var ph_forcecat_ix = PNH_DATA_headers.indexOf("ph_forcecat");
                    var ph_displaynote_ix = PNH_DATA_headers.indexOf("ph_displaynote");

                    // Retrieve the data from the PNH line(s)
                    var nsMultiMatch = false, orderList = [];
                    //phlogdev('Number of PNH matches: ' + PNHMatchData.length);
                    if (PNHMatchData.length > 1) { // If multiple matches, then
                        var brandParent = -1, pmdTemp, pmdSpecCases, PNHMatchDataHold = PNHMatchData[0].split('|');
                        for (var pmdix=0; pmdix<PNHMatchData.length; pmdix++) {  // For each of the matches,
                            pmdTemp = PNHMatchData[pmdix].split('|');  // Split the PNH data line
                            orderList.push(pmdTemp[ph_order_ix]);  // Add Order number to a list
                            if (pmdTemp[ph_speccase_ix].match(/brandParent(\d{1})/) !== null) {  // If there is a brandParent flag, prioritize by highest match
                                pmdSpecCases = pmdTemp[ph_speccase_ix].match(/brandParent(\d{1})/)[1];
                                if (pmdSpecCases > brandParent) {  // if the match is more specific than the previous ones:
                                    brandParent = pmdSpecCases;  // Update the brandParent level
                                    PNHMatchDataHold = pmdTemp;  // Update the PNH data line
                                    //phlogdev('pmdSpecCases: ' + pmdSpecCases);
                                }
                            } else {  // if any item has no brandParent structure, use highest brandParent match but post an error
                                nsMultiMatch = true;
                            }
                        }
                        PNHMatchData = PNHMatchDataHold;
                    } else {
                        PNHMatchData = PNHMatchData[0].split('|');  // Single match just gets direct split
                    }



                    var priPNHPlaceCat = catTranslate(PNHMatchData[ph_category1_ix]);  // translate primary category to WME code

                    // if the location has multiple matches, then pop an alert that will make a forum post to the thread
                    if (nsMultiMatch) {
                        if (confirm('WMEPH: Multiple matches found!\nDouble check the script changes.\nClick OK to report this situation.') ) {
                            forumMsgInputs = {
                                subject: 'Order Nos. "' + orderList.join(', ') + '" WMEPH Multiple match report',
                                message: 'Error report: PNH Order Nos. "' + orderList.join(', ') + '" are ambiguous multiple matches.\n \nExample Permalink: ' + placePL + ''
                            };
                            WMEPH_errorReport(forumMsgInputs);
                        }
                    }

                    // Check special cases
                    var specCases, scFlag, localURLcheck = '';
                    if (ph_speccase_ix > -1) {  // If the special cases column exists
                        specCases = PNHMatchData[ph_speccase_ix];  // pulls the speccases field from the PNH line
                        if (specCases !== "0" && specCases !== "") {
                            specCases = specCases.replace(/, /g, ",").split(",");  // remove spaces after commas and split by comma
                        }
                        for (var scix = 0; scix < specCases.length; scix++) {
                            // find any button/message flags in the special case (format: buttOn_xyzXyz, etc.)
                            if ( specCases[scix].match(/^buttOn_/g) !== null ) {
                                scFlag = specCases[scix].match(/^buttOn_(.+)/i)[1];
                                bannButt[scFlag].active = true;
                            } else if ( specCases[scix].match(/^buttOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^buttOff_(.+)/i)[1];
                                bannButt[scFlag].active = false;
                            } else if ( specCases[scix].match(/^messOn_/g) !== null ) {
                                scFlag = specCases[scix].match(/^messOn_(.+)/i)[1];
                                bannButt[scFlag].active = true;
                            } else if ( specCases[scix].match(/^messOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^messOff_(.+)/i)[1];
                                bannButt[scFlag].active = false;
                            } else if ( specCases[scix].match(/^psOn_/g) !== null ) {
                                scFlag = specCases[scix].match(/^psOn_(.+)/i)[1];
                                bannServ[scFlag].actionOn(actions);
                                bannServ[scFlag].pnhOverride = true;
                            } else if ( specCases[scix].match(/^psOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^psOff_(.+)/i)[1];
                                bannServ[scFlag].actionOff(actions);
                                bannServ[scFlag].pnhOverride = true;
                            }
                            // parseout localURL data if exists (meaning place can have a URL distinct from the chain URL
                            if ( specCases[scix].match(/^localURL_/g) !== null ) {
                                localURLcheck = specCases[scix].match(/^localURL_(.+)/i)[1];
                            }
                            // parse out optional alt-name
                            if ( specCases[scix].match(/^optionAltName<>(.+)/g) !== null ) {
                                optionalAlias = specCases[scix].match(/^optionAltName<>(.+)/i)[1];
                                if (newAliases.indexOf(optionalAlias) === -1) {
                                    bannButt.addAlias.active = true;
                                }
                            }
                            // Gas Station forceBranding
                            if ( ["GAS_STATION"].indexOf(priPNHPlaceCat) > -1 && specCases[scix].match(/^forceBrand<>(.+)/i) !== null ) {
                                var forceBrand = specCases[scix].match(/^forceBrand<>(.+)/i)[1];
                                if (item.attributes.brand !== forceBrand) {
                                    actions.push(new UpdateObject(item, { brand: forceBrand }));
                                    fieldUpdateObject.brand='#dfd';
                                    phlogdev('Gas brand updated from PNH');
                                }
                            }
                            // Check Localization
                            if ( specCases[scix].match(/^checkLocalization<>(.+)/i) !== null ) {
                                updatePNHName = false;
                                var baseName = specCases[scix].match(/^checkLocalization<>(.+)/i)[1];
                                var baseNameRE = new RegExp(baseName, 'g');
                                if ( newName.match(baseNameRE) === null ) {
                                    bannButt.localizedName.active = true;
                                    if (currentWL.localizedName) {
                                        bannButt.localizedName.WLactive = false;
                                    }
                                    //bannButt.PlaceWebsite.value = 'Place Website';
                                    if (ph_displaynote_ix > -1 && PNHMatchData[ph_displaynote_ix] !== '0' && PNHMatchData[ph_displaynote_ix] !== '') {
                                        bannButt.localizedName.message = PNHMatchData[ph_displaynote_ix];
                                    }
                                }
                                showDispNote = false;
                            }

                            // Prevent name change
                            if ( specCases[scix].match(/keepName/g) !== null ) {
                                updatePNHName = false;
                            }
                        }
                    }

                    // If it's a place that also sells fuel, enable the button
                    if ( PNHMatchData[ph_speccase_ix] === 'subFuel' && newName.toUpperCase().indexOf('GAS') === -1 && newName.toUpperCase().indexOf('FUEL') === -1 ) {
                        bannButt.subFuel.active = true;
                        if (currentWL.subFuel) {
                            bannButt.subFuel.WLactive = false;
                        }
                    }

                    // Display any notes for the specific place
                    if (showDispNote && ph_displaynote_ix > -1 && PNHMatchData[ph_displaynote_ix] !== '0' && PNHMatchData[ph_displaynote_ix] !== '' ) {
                        if ( containsAny(specCases,['pharmhours']) ) {
                            if ( item.attributes.description.toUpperCase().indexOf('PHARMACY') === -1 || ( item.attributes.description.toUpperCase().indexOf('HOURS') === -1 && item.attributes.description.toUpperCase().indexOf('HRS') === -1 ) ) {
                                bannButt.specCaseMessage.active = true;
                                bannButt.specCaseMessage.message = PNHMatchData[ph_displaynote_ix];
                            }
                        } else if ( containsAny(specCases,['drivethruhours']) ) {
                            if ( item.attributes.description.toUpperCase().indexOf('DRIVE') === -1 || ( item.attributes.description.toUpperCase().indexOf('HOURS') === -1 && item.attributes.description.toUpperCase().indexOf('HRS') === -1 ) ) {
                                if ( $("#service-checkbox-"+'DRIVETHROUGH').prop('checked') ) {
                                    bannButt.specCaseMessage.active = true;
                                    bannButt.specCaseMessage.message = PNHMatchData[ph_displaynote_ix];
                                } else {
                                    bannButt.specCaseMessageLow.active = true;
                                    bannButt.specCaseMessageLow.message = PNHMatchData[ph_displaynote_ix];
                                }
                            }
                        } else {
                            bannButt.specCaseMessageLow.active = true;
                            bannButt.specCaseMessageLow.message = PNHMatchData[ph_displaynote_ix];
                        }
                    }

                    // Localized Storefinder code:
                    if (ph_sfurl_ix > -1) {  // if the sfurl column exists...
                        if ( ph_sfurllocal_ix > -1 && PNHMatchData[ph_sfurllocal_ix] !== "" && PNHMatchData[ph_sfurllocal_ix] !== "0" ) {
                            if ( !bannButt.localizedName.active ) {
                                bannButt.PlaceWebsite.value = "Store Locator (L)";
                                bannButt.PlaceWebsite.active = true;
                            }
                            var tempLocalURL = PNHMatchData[ph_sfurllocal_ix].replace(/ /g,'').split("<>");
                            var searchStreet = "", searchCity = "", searchState = "";
                            if ("string" === typeof addr.street.name) {
                                searchStreet = addr.street.name;
                            }
                            var searchStreetPlus = searchStreet.replace(/ /g, "+");
                            searchStreet = searchStreet.replace(/ /g, "%20");
                            if ("string" === typeof addr.city.attributes.name) {
                                searchCity = addr.city.attributes.name;
                            }
                            var searchCityPlus = searchCity.replace(/ /g, "+");
                            searchCity = searchCity.replace(/ /g, "%20");
                            if ("string" === typeof addr.state.name) {
                                searchState = addr.state.name;
                            }
                            var searchStatePlus = searchState.replace(/ /g, "+");
                            searchState = searchState.replace(/ /g, "%20");

                            for (var tlix = 1; tlix<tempLocalURL.length; tlix++) {
                                if (tempLocalURL[tlix] === 'ph_streetName') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchStreet;
                                } else if (tempLocalURL[tlix] === 'ph_streetNamePlus') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchStreetPlus;
                                } else if (tempLocalURL[tlix] === 'ph_cityName') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchCity;
                                } else if (tempLocalURL[tlix] === 'ph_cityNamePlus') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchCityPlus;
                                } else if (tempLocalURL[tlix] === 'ph_stateName') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchState;
                                } else if (tempLocalURL[tlix] === 'ph_stateNamePlus') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchStatePlus;
                                } else if (tempLocalURL[tlix] === 'ph_state2L') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + state2L;
                                } else if (tempLocalURL[tlix] === 'ph_latitudeEW') {
                                    //customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS[0];
                                } else if (tempLocalURL[tlix] === 'ph_longitudeNS') {
                                    //customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS[1];
                                } else if (tempLocalURL[tlix] === 'ph_latitudePM') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS.lat;
                                } else if (tempLocalURL[tlix] === 'ph_longitudePM') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS.lon;
                                } else if (tempLocalURL[tlix] === 'ph_latitudePMBuffMin') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + (itemGPS.lat-0.15).toString();
                                } else if (tempLocalURL[tlix] === 'ph_longitudePMBuffMin') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + (itemGPS.lon-0.15).toString();
                                } else if (tempLocalURL[tlix] === 'ph_latitudePMBuffMax') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + (itemGPS.lat+0.15).toString();
                                } else if (tempLocalURL[tlix] === 'ph_longitudePMBuffMax') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + (itemGPS.lon+0.15).toString();
                                } else if (tempLocalURL[tlix] === 'ph_houseNumber') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + item.attributes.houseNumber;
                                } else {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + tempLocalURL[tlix];
                                }
                            }
                            if ( customStoreFinderLocalURL.indexOf('http') !== 0 ) {
                                customStoreFinderLocalURL = 'http:\/\/' + customStoreFinderLocalURL;
                            }
                            customStoreFinderLocal = true;
                        } else if (PNHMatchData[ph_sfurl_ix] !== "" && PNHMatchData[ph_sfurl_ix] !== "0") {
                            if ( !bannButt.localizedName.active ) {
                                bannButt.PlaceWebsite.value = "Store Locator";
                                bannButt.PlaceWebsite.active = true;
                            }
                            customStoreFinderURL = PNHMatchData[ph_sfurl_ix];
                            if ( customStoreFinderURL.indexOf('http') !== 0 ) {
                                customStoreFinderURL = 'http:\/\/' + customStoreFinderURL;
                            }
                            customStoreFinder = true;
                        }
                    }

                    // Category translations
                    var altCategories = PNHMatchData[ph_category2_ix];
                    if (altCategories !== "0" && altCategories !== "") {  //  translate alt-cats to WME code
                        altCategories = altCategories.replace(/,[^A-Za-z0-9]*/g, ",").split(",");  // tighten and split by comma
                        for (var catix = 0; catix<altCategories.length; catix++) {
                            var newAltTemp = catTranslate(altCategories[catix]);  // translate altCats into WME cat codes
                            if (newAltTemp === "ERROR") {  // if no translation, quit the loop
                                phlog('Category ' + altCategories[catix] + 'cannot be translated.');
                                return;
                            } else {
                                altCategories[catix] = newAltTemp;  // replace with translated element
                            }
                        }
                    }

                    // name parsing with category exceptions
                    if (["HOTEL"].indexOf(priPNHPlaceCat) > -1) {
                        if (newName.toUpperCase() === PNHMatchData[ph_name_ix].toUpperCase()) {  // If no localization
                            bannButt.catHotel.message = 'Check hotel website for any name localization (e.g. '+ PNHMatchData[ph_name_ix] +' - Tampa Airport).';
                            bannButt.catHotel.active = true;
                            newName = PNHMatchData[ph_name_ix];
                        } else {
                            // Replace PNH part of name with PNH name
                            var splix = newName.toUpperCase().replace(/[-\/]/g,' ').indexOf(PNHMatchData[ph_name_ix].toUpperCase().replace(/[-\/]/g,' ') );
                            if (splix>-1) {
                                var frontText = newName.slice(0,splix);
                                var backText = newName.slice(splix+PNHMatchData[ph_name_ix].length);
                                newName = PNHMatchData[ph_name_ix];
                                if (frontText.length > 0) { newName = frontText + ' ' + newName; }
                                if (backText.length > 0) { newName = newName + ' ' + backText; }
                                newName = newName.replace(/ {2,}/g,' ');
                            } else {
                                newName = PNHMatchData[ph_name_ix];
                            }
                        }
                        if ( altCategories !== "0" && altCategories !== "" ) {  // if PNH alts exist
                            insertAtIX(newCategories, altCategories, 1);  //  then insert the alts into the existing category array after the GS category
                        }
                        if ( newCategories.indexOf('HOTEL') !== 0 ) {  // If no GS category in the primary, flag it
                            bannButt.hotelMkPrim.active = true;
                            if (currentWL.hotelMkPrim) {
                                bannButt.hotelMkPrim.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                        }
                    } else if ( ["BANK_FINANCIAL"].indexOf(priPNHPlaceCat) > -1 && PNHMatchData[ph_speccase_ix].indexOf('notABank') === -1 ) {
                        // PNH Bank treatment
                        ixBank = item.attributes.categories.indexOf("BANK_FINANCIAL");
                        ixATM = item.attributes.categories.indexOf("ATM");
                        ixOffices = item.attributes.categories.indexOf("OFFICES");
                        // if the name contains ATM in it
                        if ( newName.match(/\batm\b/ig) !== null ) {
                            if ( ixOffices === 0 ) {
                                bannButt.bankType1.active = true;
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                                bannButt.bankCorporate.active = true;
                            } else if ( ixBank === -1 && ixATM === -1 ) {
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                            } else if ( ixATM === 0 && ixBank > 0 ) {
                                bannButt.bankBranch.active = true;
                            } else if ( ixBank > -1 ) {
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                            }
                            newName = PNHMatchData[ph_name_ix] + ' ATM';
                            newCategories = insertAtIX(newCategories, 'ATM', 0);
                            // Net result: If the place has ATM cat only and ATM in the name, then it will be green and renamed Bank Name ATM
                        } else if (ixBank > -1  || ixATM > -1) {  // if no ATM in name but with a banking category:
                            if ( ixOffices === 0 ) {
                                bannButt.bankBranch.active = true;
                            } else if ( ixBank > -1  && ixATM === -1 ) {
                                bannButt.addATM.active = true;
                            } else if ( ixATM === 0 && ixBank === -1 ) {
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                            } else if ( ixBank > 0 && ixATM > 0 ) {
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                            }
                            newName = PNHMatchData[ph_name_ix];
                            // Net result: If the place has Bank category first, then it will be green with PNH name replaced
                        } else {  // for PNH match with neither bank type category, make it a bank
                            newCategories = insertAtIX(newCategories, 'BANK_FINANCIAL', 1);
                            bannButt.standaloneATM.active = true;
                            bannButt.bankCorporate.active = true;
                        }// END PNH bank treatment
                    } else if ( ["GAS_STATION"].indexOf(priPNHPlaceCat) > -1 ) {  // for PNH gas stations, don't replace existing sub-categories
                        if ( altCategories !== "0" && altCategories !== "" ) {  // if PNH alts exist
                            insertAtIX(newCategories, altCategories, 1);  //  then insert the alts into the existing category array after the GS category
                        }
                        if ( newCategories.indexOf('GAS_STATION') !== 0 ) {  // If no GS category in the primary, flag it
                            bannButt.gasMkPrim.active = true;
                            lockOK = false;
                        } else {
                            newName = PNHMatchData[ph_name_ix];
                        }
                    } else if (updatePNHName) {  // if not a special category then update the name
                        newName = PNHMatchData[ph_name_ix];
                        newCategories = insertAtIX(newCategories, priPNHPlaceCat,0);
                        if (altCategories !== "0" && altCategories !== "") {
                            newCategories = insertAtIX(newCategories,altCategories,1);
                        }
                    }

                    // *** need to add a section above to allow other permissible categories to remain? (optional)

                    // Parse URL data
                    var localURLcheckRE;
                    if ( localURLcheck !== '') {
                        if (newURL !== null || newURL !== '') {
                            localURLcheckRE = new RegExp(localURLcheck, "i");
                            if ( newURL.match(localURLcheckRE) !== null ) {
                                newURL = normalizeURL(newURL,false);
                            } else {
                                newURL = normalizeURL(PNHMatchData[ph_url_ix],false);
                                bannButt.localURL.active = true;
                            }
                        } else {
                            newURL = normalizeURL(PNHMatchData[ph_url_ix],false);
                            bannButt.localURL.active = true;
                        }
                    } else {
                        newURL = normalizeURL(PNHMatchData[ph_url_ix],false);
                    }
                    // Parse PNH Aliases
                    newAliasesTemp = PNHMatchData[ph_aliases_ix].match(/([^\(]*)/i)[0];
                    if (newAliasesTemp !== "0" && newAliasesTemp !== "") {  // make aliases array
                        newAliasesTemp = newAliasesTemp.replace(/,[^A-za-z0-9]*/g, ",");  // tighten up commas if more than one alias.
                        newAliasesTemp = newAliasesTemp.split(",");  // split by comma
                    }
                    if ( specCases.indexOf('noUpdateAlias') === -1 && (!containsAll(newAliases,newAliasesTemp) && newAliasesTemp !== "0" && newAliasesTemp !== "" && specCases.indexOf('optionName2') === -1 ))  {
                        newAliases = insertAtIX(newAliases,newAliasesTemp,0);
                    }
                    // Enable optional alt-name button
                    if (bannButt.addAlias.active) {
                        bannButt.addAlias.message = "Is there a " + optionalAlias + " at this location?";
                        bannButt.addAlias.title = 'Add ' + optionalAlias;
                    }
                    // update categories if different and no Cat2 option
                    if ( !matchSets( uniq(item.attributes.categories),uniq(newCategories) ) ) {
                        if ( specCases.indexOf('optionCat2') === -1 && specCases.indexOf('buttOn_addCat2') === -1 ) {
                            phlogdev("Categories updated" + " with " + newCategories);
                            actions.push(new UpdateObject(item, { categories: newCategories }));
                            //W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                            fieldUpdateObject.categories='#dfd';
                        } else {  // if second cat is optional
                            phlogdev("Primary category updated with " + priPNHPlaceCat);
                            newCategories = insertAtIX(newCategories, priPNHPlaceCat, 0);
                            actions.push(new UpdateObject(item, { categories: newCategories }));
                            fieldUpdateObject.categories='#dfd';
                        }
                        // Enable optional 2nd category button
                        if (specCases.indexOf('buttOn_addCat2') > -1 && newCategories.indexOf(catTransWaze2Lang[altCategories[0]]) === -1 ) {
                            bannButt.addCat2.message = "Is there a " + catTransWaze2Lang[altCategories[0]] + " at this location?";
                            bannButt.addCat2.title = 'Add ' + catTransWaze2Lang[altCategories[0]];
                        }
                    }

                    // Description update
                    newDescripion = PNHMatchData[ph_description_ix];
                    if (newDescripion !== null && newDescripion !== "0" && item.attributes.description.toUpperCase().indexOf(newDescripion.toUpperCase()) === -1 ) {
                        if ( item.attributes.description !== "" && item.attributes.description !== null && item.attributes.description !== ' ' ) {
                            bannButt.checkDescription.active = true;
                        }
                        phlogdev("Description updated");
                        newDescripion = newDescripion + '\n' + item.attributes.description;
                        actions.push(new UpdateObject(item, { description: newDescripion }));
                        fieldUpdateObject.description='#dfd';
                    }

                    // Special Lock by PNH
                    if (specCases.indexOf('lockAt5') > -1 ) {
                        PNHLockLevel = 4;
                    }

                } else {  // if no PNH match found
                    if (PNHMatchData[0] === "ApprovalNeeded") {
                        //PNHNameTemp = PNHMatchData[1].join(', ');
                        PNHNameTemp = PNHMatchData[1][0];  // Just do the first match
                        PNHNameTempWeb = PNHNameTemp.replace(/\&/g, "%26");
                        PNHNameTempWeb = PNHNameTemp.replace(/\#/g, "%23");
                        PNHNameTempWeb = PNHNameTempWeb.replace(/\//g, "%2F");
                        PNHOrderNum = PNHMatchData[2].join(',');
                    }

                    // Strong title case option for non-PNH places
                    if (newName !== toTitleCaseStrong(newName, isPLA(item))) {
                        bannButt.STC.active = true;
                    }

                    newURL = normalizeURL(newURL,true);  // Normalize url

                    // Generic Hotel Treatment
                    if ( newCategories.indexOf("HOTEL") > -1  && newName.indexOf(' - ') === -1 && newName.indexOf(': ') === -1) {
                        bannButt.catHotel.active = true;
                        if (currentWL.hotelLocWL) {
                            bannButt.catHotel.WLactive = false;
                        }
                    }

                    // Generic Bank treatment
                    ixBank = item.attributes.categories.indexOf("BANK_FINANCIAL");
                    ixATM = item.attributes.categories.indexOf("ATM");
                    ixOffices = item.attributes.categories.indexOf("OFFICES");
                    // if the name contains ATM in it
                    if ( newName.match(/\batm\b/ig) !== null ) {
                        if ( ixOffices === 0 ) {
                            bannButt.bankType1.active = true;
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                            bannButt.bankCorporate.active = true;
                        } else if ( ixBank === -1 && ixATM === -1 ) {
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                        } else if ( ixATM === 0 && ixBank > 0 ) {
                            bannButt.bankBranch.active = true;
                        } else if ( ixBank > -1 ) {
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                        }
                        // Net result: If the place has ATM cat only and ATM in the name, then it will be green
                    } else if (ixBank > -1  || ixATM > -1) {  // if no ATM in name:
                        if ( ixOffices === 0 ) {
                            bannButt.bankBranch.active = true;
                        } else if ( ixBank > -1  && ixATM === -1 ) {
                            bannButt.addATM.active = true;
                        } else if ( ixATM === 0 && ixBank === -1 ) {
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                        } else if ( ixBank > 0 && ixATM > 0 ) {
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                        }
                        // Net result: If the place has Bank category first, then it will be green
                    } // END generic bank treatment

                }  // END PNH match/no-match updates

                // Strip/add suffixes
                if ( hpMode.harmFlag && thisUser.userName === 'bmtg' )  {
                    var suffixStr = ' - ZQXWCEVRBT';
                    var suffixStrRE = new RegExp(suffixStr, 'i');
                    if ( newName.indexOf(suffixStr) > -1 ) {
                        //newName = newName.replace(suffixStrRE, '');
                    }
                    if ( newName.indexOf(suffixStr) === -1 ) {
                        //newName = newName + suffixStr;
                    }
                }

                // Update name:
                if (hpMode.harmFlag && newName !== item.attributes.name) {
                    phlogdev("Name updated");
                    actions.push(new UpdateObject(item, { name: newName }));
                    //actions.push(new UpdateObject(item, { name: newName }));
                    fieldUpdateObject.name='#dfd';
                }

                // Update aliases
                newAliases = removeSFAliases(newName, newAliases);
                for (naix=0; naix<newAliases.length; naix++) {
                    newAliases[naix] = toTitleCase(newAliases[naix], isPLA(item));
                }
                if (hpMode.harmFlag && newAliases !== item.attributes.aliases && newAliases.length !== item.attributes.aliases.length) {
                    phlogdev("Alt Names updated");
                    actions.push(new UpdateObject(item, { aliases: newAliases }));
                    fieldUpdateObject.aliases='#dfd';
                }

                // Gas station treatment (applies to all including PNH)
                if (newCategories[0] === 'GAS_STATION') {
                    // Brand checking
                    if ( !item.attributes.brand || item.attributes.brand === null || item.attributes.brand === "" ) {
                        bannButt.gasNoBrand.active = true;
                        if (currentWL.gasNoBrand) {
                            bannButt.gasNoBrand.WLactive = false;
                        }
                    } else if (item.attributes.brand === 'Unbranded' ) {  //  Unbranded is not used per wiki
                        bannButt.gasUnbranded.active = true;
                        lockOK = false;
                    } else {
                        var brandNameRegEx = new RegExp('\\b'+item.attributes.brand.toUpperCase().replace(/[ '-]/g,''), "i");
                        if ( newName.toUpperCase().replace(/[ '-]/g,'').match(brandNameRegEx) === null ) {
                            bannButt.gasMismatch.active = true;
                            if (currentWL.gasMismatch) {
                                bannButt.gasMismatch.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                        }
                    }
                    // Add convenience store category to station
                    if (newCategories.indexOf("CONVENIENCE_STORE") === -1 && !bannButt.subFuel.active) {
                        if ( hpMode.harmFlag && $("#WMEPH-ConvenienceStoreToGasStations" + devVersStr).prop('checked') ) {  // Automatic if user has the setting checked
                            newCategories = insertAtIX(newCategories, "CONVENIENCE_STORE", 1);  // insert the C.S. category
                            actions.push(new UpdateObject(item, { categories: newCategories }));
                            fieldUpdateObject.categories='#dfd';
                            phlogdev('Conv. store category added');
                        } else {  // If not checked, then it will be a banner button
                            bannButt.addConvStore.active = true;
                        }
                    }
                }  // END Gas Station Checks

                // Make PNH submission links
                var regionFormURL = '';
                var newPlaceAddon = '';
                var approvalAddon = '';
                var approvalMessage = 'Submitted via WMEPH. PNH order number ' + PNHOrderNum;
                var tempSubmitName = newName.replace(/\&/g,'%26').replace(/\//g, "%2F").replace(/\#/g, "%23");
                if (hpMode.harmFlag) {
                    switch (region) {
                        case "NWR": regionFormURL = 'https://docs.google.com/forms/d/1hv5hXBlGr1pTMmo4n3frUx1DovUODbZodfDBwwTc7HE/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "SWR": regionFormURL = 'https://docs.google.com/forms/d/1Qf2N4fSkNzhVuXJwPBJMQBmW0suNuy8W9itCo1qgJL4/viewform';
                            newPlaceAddon = '?entry.1497446659='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.1497446659='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "HI": regionFormURL = 'https://docs.google.com/forms/d/1K7Dohm8eamIKry3KwMTVnpMdJLaMIyDGMt7Bw6iqH_A/viewform';
                            newPlaceAddon = '?entry.1497446659='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.1497446659='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "PLN": regionFormURL = 'https://docs.google.com/forms/d/1ycXtAppoR5eEydFBwnghhu1hkHq26uabjUu8yAlIQuI/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "SCR": regionFormURL = 'https://docs.google.com/forms/d/1KZzLdlX0HLxED5Bv0wFB-rWccxUp2Mclih5QJIQFKSQ/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "TX": regionFormURL = 'https://docs.google.com/forms/d/1x7VM7ofPOKVnWOaX7d70OWXpnVKf6Mkadn4dgYxx4ic/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "GLR": regionFormURL = 'https://docs.google.com/forms/d/19btj-Qt2-_TCRlcS49fl6AeUT95Wnmu7Um53qzjj9BA/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "SAT": regionFormURL = 'https://docs.google.com/forms/d/1bxgK_20Jix2ahbmUvY1qcY0-RmzUBT6KbE5kjDEObF8/viewform';
                            newPlaceAddon = '?entry.2063110249='+tempSubmitName+'&entry.2018912633='+newURLSubmit+'&entry.1924826395='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.2063110249='+PNHNameTempWeb+'&entry.123778794='+approvalMessage+'&entry.1924826395='+thisUser.userName+gFormState;
                            break;
                        case "SER": regionFormURL = 'https://docs.google.com/forms/d/1jYBcxT3jycrkttK5BxhvPXR240KUHnoFMtkZAXzPg34/viewform';
                            newPlaceAddon = '?entry.822075961='+tempSubmitName+'&entry.1422079728='+newURLSubmit+'&entry.1891389966='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.822075961='+PNHNameTempWeb+'&entry.607048307='+approvalMessage+'&entry.1891389966='+thisUser.userName+gFormState;
                            break;
                        case "ATR": regionFormURL = 'https://docs.google.com/forms/d/1v7JhffTfr62aPSOp8qZHA_5ARkBPldWWJwDeDzEioR0/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "NER": regionFormURL = 'https://docs.google.com/forms/d/1UgFAMdSQuJAySHR0D86frvphp81l7qhEdJXZpyBZU6c/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "NOR": regionFormURL = 'https://docs.google.com/forms/d/1iYq2rd9HRd-RBsKqmbHDIEBGuyWBSyrIHC6QLESfm4c/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "MAR": regionFormURL = 'https://docs.google.com/forms/d/1PhL1iaugbRMc3W-yGdqESoooeOz-TJIbjdLBRScJYOk/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
                            break;
                        case "CA_EN": regionFormURL = 'https://docs.google.com/forms/d/13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws/viewform';
                            newPlaceAddon = '?entry_839085807='+tempSubmitName+'&entry_1067461077='+newURLSubmit;
                            approvalAddon = '?entry_839085807='+PNHNameTempWeb+'&entry_1125435193='+approvalMessage;
                            break;
                        case "QC": regionFormURL = 'https://docs.google.com/forms/d/13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws/viewform';
                            newPlaceAddon = '?entry_839085807='+tempSubmitName+'&entry_1067461077='+newURLSubmit;
                            approvalAddon = '?entry_839085807='+PNHNameTempWeb+'&entry_1125435193='+approvalMessage;
                            break;
                        default: regionFormURL = "";
                    }
                    newPlaceURL = regionFormURL + newPlaceAddon;
                    approveRegionURL = regionFormURL + approvalAddon;
                }

                // Category/Name-based Services, added to any existing services:
                var CH_DATA, CH_NAMES;
                if (countryCode === "USA") {
                    CH_DATA = USA_CH_DATA;
                    CH_NAMES = USA_CH_NAMES;
                } else if (countryCode === "CAN") {
                    CH_DATA = USA_CH_DATA;   // #### CAN shares the USA sheet, can eventually can be split to new sheet if needed
                    CH_NAMES = USA_CH_NAMES;
                }
                var CH_DATA_headers = CH_DATA[0].split("|");
                var CH_DATA_keys = CH_DATA[1].split("|");
                var CH_DATA_list = CH_DATA[2].split("|");

                var servHeaders = [], servKeys = [], servList = [], servHeaderCheck;
                for (var jjj=0; jjj<CH_DATA_headers.length; jjj++) {
                    servHeaderCheck = CH_DATA_headers[jjj].match(/^ps_/i);  // if it's a service header
                    if (servHeaderCheck) {
                        servHeaders.push(jjj);
                        servKeys.push(CH_DATA_keys[jjj]);
                        servList.push(CH_DATA_list[jjj]);
                    }
                }

                var CH_DATA_Temp;
                if (newCategories.length > 0) {
                    for (var iii=0; iii<CH_NAMES.length; iii++) {
                        if (newCategories.indexOf(CH_NAMES[iii]) > -1 ) {
                            CH_DATA_Temp = CH_DATA[iii].split("|");
                            for (var psix=0; psix<servHeaders.length; psix++) {
                                if ( !bannServ[servKeys[psix]].pnhOverride ) {
                                    if (CH_DATA_Temp[servHeaders[psix]] === '1') {  // These are automatically added to all countries/regions (if auto setting is on)
                                        bannServ[servKeys[psix]].active = true;
                                        if ( hpMode.harmFlag && $("#WMEPH-EnableServices" + devVersStr).prop('checked')  ) {
                                            // Automatically enable new services
                                            bannServ[servKeys[psix]].actionOn(actions);
                                        }
                                    } else if (CH_DATA_Temp[servHeaders[psix]] === '2') {  // these are never automatically added but shown
                                        bannServ[servKeys[psix]].active = true;
                                    } else if (CH_DATA_Temp[servHeaders[psix]] !== '') {  // check for state/region auto add
                                        bannServ[servKeys[psix]].active = true;
                                        if ( hpMode.harmFlag && $("#WMEPH-EnableServices" + devVersStr).prop('checked')) {
                                            var servAutoRegion = CH_DATA_Temp[servHeaders[psix]].replace(/,[^A-za-z0-9]*/g, ",").split(",");
                                            // if the sheet data matches the state, region, or username then auto add
                                            if ( servAutoRegion.indexOf(state2L) > -1 || servAutoRegion.indexOf(region) > -1 || servAutoRegion.indexOf(thisUser.userName) > -1 ) {
                                                bannServ[servKeys[psix]].actionOn(actions);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // PNH specific Services:


                // ### remove unnecessary parent categories (Restaurant doesn't need food and drink)
                if ( hpMode.harmFlag && newCategories.indexOf('FOOD_AND_DRINK') > -1 ) {
                    if (newCategories.indexOf('RESTAURANT') > -1 || newCategories.indexOf('FAST_FOOD') > -1 ) {
                        newCategories.splice(newCategories.indexOf('FOOD_AND_DRINK'),1);  // remove Food/Drink Cat
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                    }
                }

                var isPoint = item.isPoint();
                var isArea = item.is2D();
                var maxPointSeverity = 0;
                var maxAreaSeverity = 3;
                var highestCategoryLock = -1;

                for(var ixPlaceCat=0; ixPlaceCat<newCategories.length; ixPlaceCat++) {
                    var category = newCategories[ixPlaceCat];
                    var ixPNHCat = CH_NAMES.indexOf(category);
                    if (ixPNHCat>-1) {
                        CH_DATA_Temp = CH_DATA[ixPNHCat].split("|");
                        // CH_DATA_headers
                        //pc_point    pc_area    pc_regpoint    pc_regarea    pc_lock1    pc_lock2    pc_lock3    pc_lock4    pc_lock5    pc_rare    pc_parent    pc_message
                        var pvaPoint = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_point')];
                        var pvaArea = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_area')];
                        var regPoint = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_regpoint')].replace(/,[^A-za-z0-9]*/g, ",").split(",");
                        var regArea = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_regarea')].replace(/,[^A-za-z0-9]*/g, ",").split(",");
                        if (regPoint.indexOf(state2L) > -1 || regPoint.indexOf(region) > -1 || regPoint.indexOf(countryCode) > -1) {
                            pvaPoint = '1';
                            pvaArea = '';
                        } else if (regArea.indexOf(state2L) > -1 || regArea.indexOf(region) > -1 || regArea.indexOf(countryCode) > -1) {
                            pvaPoint = '';
                            pvaArea = '1';
                        }
                        var pointSeverity = getPvaSeverity(pvaPoint, item);
                        var areaSeverity = getPvaSeverity(pvaArea, item);

                        if (isPoint && pointSeverity > 0) {
                            maxPointSeverity = Math.max(pointSeverity, maxPointSeverity);
                        } else if (isArea) {
                            maxAreaSeverity = Math.min(areaSeverity, maxAreaSeverity);
                        }

                        // display any messaged regarding the category
                        if (newCategories.indexOf('HOSPITAL_MEDICAL_CARE') > -1) {
                            pc_message = '';
                        } else {
                            pc_message = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_message')];
                        }
                        if (pc_message && pc_message !== '0' && pc_message !== '') {
                            bannButt.pnhCatMess.active = true;
                            bannButt.pnhCatMess.message = pc_message;
                        }
                        // Unmapped categories
                        pc_rare = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_rare')].replace(/,[^A-Za-z0-9}]+/g, ",").split(',');
                        if (pc_rare.indexOf(state2L) > -1 || pc_rare.indexOf(region) > -1 || pc_rare.indexOf(countryCode) > -1) {
                            bannButt.unmappedRegion.active = true;
                            if (currentWL.unmappedRegion) {
                                bannButt.unmappedRegion.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                        }
                        // Parent Category
                        pc_parent = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_parent')].replace(/,[^A-Za-z0-9}]+/g, ",").split(',');
                        if (pc_parent.indexOf(state2L) > -1 || pc_parent.indexOf(region) > -1 || pc_parent.indexOf(countryCode) > -1) {
                            bannButt.parentCategory.active = true;
                            if (currentWL.parentCategory) {
                                bannButt.parentCategory.WLactive = false;
                            }
                        }
                        // Set lock level
                        for (var lockix=1; lockix<6; lockix++) {
                            pc_lockTemp = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_lock'+lockix)].replace(/,[^A-Za-z0-9}]+/g, ",").split(',');
                            if (lockix - 1 > highestCategoryLock && (pc_lockTemp.indexOf(state2L) > -1 || pc_lockTemp.indexOf(region) > -1 || pc_lockTemp.indexOf(countryCode) > -1)) {
                                highestCategoryLock = lockix - 1;  // Offset by 1 since lock ranks start at 0
                            }
                        }
                    }
                }

                if (highestCategoryLock > -1) {
                    defaultLockLevel = highestCategoryLock;
                }

                if (isPoint) {
                    if (maxPointSeverity === 3) {
                        bannButt.areaNotPoint.active = true;
                        if (currentWL.areaNotPoint || item.attributes.lockRank >= defaultLockLevel) {
                            bannButt.areaNotPoint.WLactive = false;
                            bannButt.areaNotPoint.severity = 0;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxPointSeverity === 2) {
                        bannButt.areaNotPointMid.active = true;
                        if (currentWL.areaNotPoint || item.attributes.lockRank >= defaultLockLevel) {
                            bannButt.areaNotPointMid.WLactive = false;
                            bannButt.areaNotPointMid.severity = 0;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxPointSeverity === 1) {
                        bannButt.areaNotPointLow.active = true;
                        if (currentWL.areaNotPoint || item.attributes.lockRank >= defaultLockLevel) {
                            bannButt.areaNotPointLow.WLactive = false;
                            bannButt.areaNotPointLow.severity = 0;
                        }
                    }
                } else {
                    if (maxAreaSeverity === 3) {
                        bannButt.pointNotArea.active = true;
                        if (currentWL.pointNotArea || item.attributes.lockRank >= defaultLockLevel) {
                            bannButt.pointNotArea.WLactive = false;
                            bannButt.pointNotArea.severity = 0;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxAreaSeverity === 2) {
                        bannButt.pointNotAreaMid.active = true;
                        if (currentWL.pointNotArea || item.attributes.lockRank >= defaultLockLevel) {
                            bannButt.pointNotAreaMid.WLactive = false;
                            bannButt.pointNotAreaMid.severity = 0;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxAreaSeverity === 1) {
                        bannButt.pointNotAreaLow.active = true;
                        if (currentWL.pointNotArea || item.attributes.lockRank >= defaultLockLevel) {
                            bannButt.pointNotAreaLow.WLactive = false;
                            bannButt.pointNotAreaLow.severity = 0;
                        }
                    }
                }

                var anpNone = collegeAbbreviations.split('|'), anpNoneRE;
                for (var cii=0; cii<anpNone.length; cii++) {
                    anpNoneRE = new RegExp('\\b'+anpNone[cii]+'\\b', 'g');
                    if ( newName.match( anpNoneRE) !== null ) {
                        bannButt.areaNotPointLow.severity = 0;
                        bannButt.areaNotPointLow.WLactive = false;
                    }
                }

                // Check for missing hours field
                if (item.attributes.openingHours.length === 0) {  // if no hours...
                    if (!containsAny(newCategories,["STADIUM_ARENA","CEMETERY","MILITARY","TRANSPORTATION","FERRY_PIER","SUBWAY_STATION",
                                                    "BRIDGE","TUNNEL","JUNCTION_INTERCHANGE","ISLAND","SEA_LAKE_POOL","RIVER_STREAM","FOREST_GROVE","CANAL","SWAMP_MARSH","DAM"]) ) {
                        bannButt.noHours.active = true;
                        if (currentWL.noHours) {
                            bannButt.noHours.WLactive = false;
                        }
                        if ( containsAny(newCategories,["SCHOOL","CONVENTIONS_EVENT_CENTER","CAMPING_TRAILER_PARK","COTTAGE_CABIN","COLLEGE_UNIVERSITY","GOLF_COURSE","SPORTS_COURT","MOVIE_THEATER","SHOPPING_CENTER","RELIGIOUS_CENTER","PARKING_LOT","PARK","PLAYGROUND","AIRPORT","FIRE_DEPARTMENT","POLICE_STATION","SEAPORT_MARINA_HARBOR","FARM"]) ) {
                            bannButt.noHours.severity = 0;
                            bannButt.noHours.WLactive = false;
                        }
                    }
                    if (hpMode.hlFlag && $("#WMEPH-DisableHoursHL" + devVersStr).prop('checked')) {
                        bannButt.noHours.severity = 0;
                    }
                } else {
                    if (item.attributes.openingHours.length === 1) {  // if one set of hours exist, check for partial 24hrs setting
                        if (item.attributes.openingHours[0].days.length < 7 && item.attributes.openingHours[0].fromHour==='00:00' &&
                            (item.attributes.openingHours[0].toHour==='00:00' || item.attributes.openingHours[0].toHour==='23:59' ) ) {
                            bannButt.mismatch247.active = true;
                        }
                    }
                    bannButt.noHours.active = true;
                    bannButt.noHours.value = 'Add hours';
                    bannButt.noHours.severity = 0;
                    bannButt.noHours.WLactive = false;
                    bannButt.noHours.message = 'Hours: <input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                }
                if ( !checkHours(item.attributes.openingHours) ) {
                    //phlogdev('Overlapping hours');
                    bannButt.hoursOverlap.active = true;
                    bannButt.noHours.active = true;
                } else {
                    var tempHours = item.attributes.openingHours.slice(0);
                    for ( var ohix=0; ohix<item.attributes.openingHours.length; ohix++ ) {
                        if ( tempHours[ohix].days.length === 2 && tempHours[ohix].days[0] === 1 && tempHours[ohix].days[1] === 0) {
                            // separate hours
                            phlogdev('Correcting M-S entry...');
                            tempHours.push({days: [0], fromHour: tempHours[ohix].fromHour, toHour: tempHours[ohix].toHour});
                            tempHours[ohix].days = [1];
                            actions.push(new UpdateObject(item, { openingHours: tempHours }));
                        }
                    }
                }

                // Highlight 24/7 button if hours are set that way, and add button for all places
                if ( item.attributes.openingHours.length === 1 && item.attributes.openingHours[0].days.length === 7 && item.attributes.openingHours[0].fromHour === '00:00' && item.attributes.openingHours[0].toHour ==='00:00' ) {
                    bannServ.add247.checked = true;
                }
                bannServ.add247.active = true;

                // URL updating
                var updateURL = true;
                if (newURL !== item.attributes.url && newURL !== "" && newURL !== "0") {
                    if ( PNHNameRegMatch && item.attributes.url !== null && item.attributes.url !== '' ) {  // for cases where there is an existing URL in the WME place, and there is a PNH url on queue:
                        var newURLTemp = normalizeURL(newURL,true);  // normalize
                        var itemURL = normalizeURL(item.attributes.url,true);
                        newURLTemp = newURLTemp.replace(/^www\.(.*)$/i,'$1');  // strip www
                        var itemURLTemp = itemURL.replace(/^www\.(.*)$/i,'$1');  // strip www
                        if ( newURLTemp !== itemURLTemp ) { // if formatted URLs don't match, then alert the editor to check the existing URL
                            bannButt.longURL.active = true;
                            if (currentWL.longURL) {
                                bannButt.longURL.WLactive = false;
                            }
                            //bannButt.PlaceWebsite.value = "Place Website";
                            if (hpMode.harmFlag && updateURL && itemURL !== item.attributes.url) {  // Update the URL
                                phlogdev("URL formatted");
                                actions.push(new UpdateObject(item, { url: itemURL }));
                                fieldUpdateObject.url='#dfd';
                            }
                            updateURL = false;
                            tempPNHURL = newURL;
                        }
                    }
                    if (hpMode.harmFlag && updateURL && newURL !== item.attributes.url) {  // Update the URL
                        phlogdev("URL updated");
                        actions.push(new UpdateObject(item, { url: newURL }));
                        fieldUpdateObject.url='#dfd';
                    }
                }

                // Phone formatting
                var outputFormat = "({0}) {1}-{2}";
                if ( containsAny(["CA","CO"],[region,state2L]) && (/^\d{3}-\d{3}-\d{4}$/.test(item.attributes.phone))) {
                    outputFormat = "{0}-{1}-{2}";
                } else if (region === "SER" && !(/^\(\d{3}\) \d{3}-\d{4}$/.test(item.attributes.phone))) {
                    outputFormat = "{0}-{1}-{2}";
                } else if (region === "GLR") {
                    outputFormat = "{0}-{1}-{2}";
                } else if (state2L === "NV") {
                    outputFormat = "{0}-{1}-{2}";
                } else if (countryCode === "CAN") {
                    outputFormat = "+1-{0}-{1}-{2}";
                }
                newPhone = normalizePhone(item.attributes.phone, outputFormat, 'existing');

                // Check if valid area code  #LOC# USA and CAN only
                if (countryCode === "USA" || countryCode === "CAN") {
                    if (newPhone !== null && newPhone.match(/[2-9]\d{2}/) !== null) {
                        var areaCode = newPhone.match(/[2-9]\d{2}/)[0];
                        if ( areaCodeList.indexOf(areaCode) === -1 ) {
                            bannButt.badAreaCode.active = true;
                            if (currentWL.aCodeWL) {
                                bannButt.badAreaCode.WLactive = false;
                            }
                        }
                    }
                }
                if (hpMode.harmFlag && newPhone !== item.attributes.phone) {
                    phlogdev("Phone updated");
                    actions.push(new UpdateObject(item, {phone: newPhone}));
                    fieldUpdateObject.phone='#dfd';
                }

                // Post Office cat check
                if (newCategories.indexOf("POST_OFFICE") > -1 && countryCode === "USA" ) {
                    var USPSStrings = ['USPS','POSTOFFICE','USPOSTALSERVICE','UNITEDSTATESPOSTALSERVICE','USPO','USPOSTOFFICE','UNITEDSTATESPOSTOFFICE','UNITEDSTATESPOSTALOFFICE'];
                    var USPSMatch = false;
                    for (var uspix=0; uspix<USPSStrings.length; uspix++) {
                        if ( newName.toUpperCase().replace(/[ \/\-\.]/g,'').indexOf(USPSStrings[uspix]) > -1 ) {  // If it already has a USPS type term in the name, don't add the option
                            USPSMatch = true;
                            customStoreFinderURL = "https://tools.usps.com/go/POLocatorAction.action";
                            customStoreFinder = true;
                            if (hpMode.harmFlag && region === 'SER' && item.attributes.aliases.indexOf("United States Postal Service") === -1) {
                                actions.push(new UpdateObject(item, { aliases: ["United States Postal Service"], url: 'www.usps.com' }));
                                fieldUpdateObject.aliases='#dfd';
                                fieldUpdateObject.url='#dfd';
                                phlogdev('USPS alt name added');
                            }
                            if ( newName.indexOf(' - ') === -1 && newName.indexOf(': ') === -1 ) {
                                bannButt.formatUSPS.active = true;
                            }
                            break;
                        }
                    }
                    if (!USPSMatch) {
                        lockOK = false;
                        bannButt.isitUSPS.active = true;
                        bannButt.catPostOffice.active = true;
                    }
                }  // END Post Office category check

            }  // END if (!residential && has name)

            // Name check
            if ( !item.attributes.residential && ( !newName || newName.replace(/[^A-Za-z0-9]/g,'').length === 0 )) {
                if (item.attributes.categories[0] === 'PARKING_LOT') {
                    if (currentWL.plaNameMissing) {
                        bannButt.plaNameMissing.active = false;
                    } else {
                        bannButt.plaNameMissing.active = true;
                    }
                }else if ( 'ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                    bannButt.nameMissing.active = true;
                    lockOK = false;
                }
            }

            // House number check
            if (item.attributes.streetID && (!item.attributes.houseNumber || item.attributes.houseNumber.replace(/\D/g,'').length === 0) ) {
                if ( 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                    if (state2L === 'PR') {
                        bannButt.hnMissing.active = true;
                        bannButt.hnMissing.severity = 0;
                    } else {
                        bannButt.hnMissing.active = true;
                        if (currentWL.HNWL) {
                            bannButt.hnMissing.severity = 0;
                            bannButt.hnMissing.WLactive = false;
                        } else {
                            lockOK = false;
                        }
                    }
                }
            } else if (item.attributes.houseNumber) {
                var hnOK = false, updateHNflag = false;
                var hnTemp = item.attributes.houseNumber.replace(/[^\d]/g, '');  // Digits only
                var hnTempDash = item.attributes.houseNumber.replace(/[^\d-]/g, '');  // Digits and dashes only
                if ( hnTemp < 1000000 && state2L === "NY" && addr.city.attributes.name === 'Queens' && hnTempDash.match(/^\d{1,4}-\d{1,4}$/g) !== null ) {
                    updateHNflag = true;
                    hnOK = true;
                }
                if (hnTemp === item.attributes.houseNumber && hnTemp < 1000000) {  //  general check that HN is 6 digits or less, & that it is only [0-9]
                    hnOK = true;
                }
                if (state2L === "HI" && hnTempDash.match(/^\d{1,2}-\d{1,4}$/g) !== null) {
                    if (hnTempDash === hnTempDash.match(/^\d{1,2}-\d{1,4}$/g)[0]) {
                        hnOK = true;
                    }
                }

                if (!hnOK) {
                    bannButt.hnNonStandard.active = true;
                    if (currentWL.hnNonStandard) {
                        bannButt.hnNonStandard.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                }
                if ( updateHNflag ) {
                    bannButt.hnDashRemoved.active = true;
                    if (hpMode.harmFlag) {
                        actions.push(new UpdateObject(item, { houseNumber: hnTemp }));
                        fieldUpdateObject.address='#dfd';
                    } else if (hpMode.hlFlag) {
                        if (item.attributes.residential) {
                            bannButt.hnDashRemoved.severity = 3;
                        } else {
                            bannButt.hnDashRemoved.severity = 1;
                        }
                    }
                }
            }

            if ((!addr.city || addr.city.attributes.isEmpty) && 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                bannButt.cityMissing.active = true;
                if (item.attributes.residential && hpMode.hlFlag) {
                    bannButt.cityMissing.severity = 1;
                }
                lockOK = false;
            }
            if (addr.city && (!addr.street || addr.street.isEmpty) && 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                bannButt.streetMissing.active = true;
                lockOK = false;
            }

            // CATEGORY vs. NAME checks
            var testName = newName.toLowerCase().replace(/[^a-z]/g,' ');
            var testNameWords = testName.split(' ');
            // Hopsital vs. Name filter
            if ((newCategories.indexOf('HOSPITAL_URGENT_CARE') > -1 || newCategories.indexOf("HOSPITAL_MEDICAL_CARE") > -1) && hospitalPartMatch.length > 0) {
                var hpmMatch = false;
                if (containsAny(testNameWords,animalFullMatch)) {
                    bannButt.changeToPetVet.active = true;
                    if (currentWL.changeToPetVet) {
                        bannButt.changeToPetVet.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                    bannButt.pnhCatMess.active = false;
                } else if (containsAny(testNameWords,hospitalFullMatch)) {
                    bannButt.changeToDoctorClinic.active = true;
                    bannButt.changeToDoctorClinic.message = "Keywords suggest this location may not be a hospital or urgent care location.";
                    if (currentWL.changeToDoctorClinic) {
                        bannButt.changeToDoctorClinic.WLactive = false;
                        bannButt.changeToDoctorClinic.severity = 0;
                    } else {
                        bannButt.changeToDoctorClinic.WLactive = true;
                        lockOK = false;
                        bannButt.changeToDoctorClinic.severity = 3;
                    }
                    bannButt.pnhCatMess.active = false;
                } else {
                    for (var apmix=0; apmix<animalPartMatch.length; apmix++) {
                        if (testName.indexOf(animalPartMatch[apmix]) > -1) {
                            bannButt.changeToPetVet.active = true;
                            if (currentWL.changeToPetVet) {
                                bannButt.changeToPetVet.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                            hpmMatch = true;  // don't run the human check if animal is found.
                            bannButt.pnhCatMess.active = false;
                            break;
                        }
                    }
                    if (!hpmMatch) {  // don't run the human check if animal is found.
                        for (var hpmix=0; hpmix<hospitalPartMatch.length; hpmix++) {
                            if (testName.indexOf(hospitalPartMatch[hpmix]) > -1) {
                                if (currentWL.changeToDoctorClinic) {
                                    bannButt.changeToDoctorClinic.WLactive = false;
                                } else {
                                    lockOK = false;
                                }
                                hpmMatch = true;
                                bannButt.pnhCatMess.active = false;
                                break;
                            }
                        }
                    }
                    if (!hpmMatch) {
                        bannButt.changeToDoctorClinic.active = true;
                    }
                }
            }  // END HOSPITAL/Name check

            // School vs. Name filter
            if (newCategories.indexOf("SCHOOL") > -1 && schoolPartMatch.length>0) {
                if (containsAny(testNameWords,schoolFullMatch)) {
                    bannButt.changeSchool2Offices.active = true;
                    if (currentWL.changeSchool2Offices) {
                        bannButt.changeSchool2Offices.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                    bannButt.pnhCatMess.active = false;
                } else {
                    for (var schix=0; schix<schoolPartMatch.length; schix++) {
                        if (testName.indexOf(schoolPartMatch[schix]) > -1) {
                            bannButt.changeSchool2Offices.active = true;
                            if (currentWL.changeSchool2Offices) {
                                bannButt.changeSchool2Offices.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                            bannButt.pnhCatMess.active = false;
                            break;
                        }
                    }
                }
            }  // END SCHOOL/Name check

            // Some cats don't need PNH messages and url/phone severities
            if ( 'BRIDGE|FOREST_GROVE|DAM|TUNNEL|CEMETERY'.split('|').indexOf(item.attributes.categories[0]) > -1 ) {
                bannButt.NewPlaceSubmit.active = false;
                bannButt.phoneMissing.severity = 0;
                bannButt.phoneMissing.WLactive = false;
                bannButt.urlMissing.severity = 0;
                bannButt.urlMissing.WLactive = false;
            }
            // Some cats don't need PNH messages and url/phone messages
            if ( 'ISLAND|SEA_LAKE_POOL|RIVER_STREAM|CANAL'.split('|').indexOf(item.attributes.categories[0]) > -1 ) {
                bannButt.NewPlaceSubmit.active = false;
                bannButt.phoneMissing.active = false;
                bannButt.urlMissing.active = false;
            }


            // Show the Change To Doctor / Clinic button for places with PERSONAL_CARE or OFFICES category
            if (hpMode.harmFlag && ((newCategories.indexOf('PERSONAL_CARE') > -1 && !PNHNameRegMatch) || newCategories.indexOf('OFFICES') > -1)) {
                bannButt.changeToDoctorClinic.message = 'If this place provides non-emergency medical care: ';
                bannButt.changeToDoctorClinic.active = true;
                bannButt.changeToDoctorClinic.severity = 0;
                bannButt.changeToDoctorClinic.WLactive = null;
            }

            // *** Rest Area parsing
            // check rest area name against standard formats or if has the right categories

            // ****************************************************************************************************
            // 1/2/2017 (mapomatic) Technically, TRANSPORTATION should be the 1st category according to the wiki,
            // but due to a bug in WME, we can't force that.  I've temporarily changed the check for TRANSPORTATION
            // and SCENIC_LOOKOUT_VIEWPOINT to be < 2 instead of === 0 and === 1, respectively.
            // ****************************************************************************************************
            var transCatIndex = categories.indexOf('TRANSPORTATION');
            var lookoutCatIndex = categories.indexOf('SCENIC_LOOKOUT_VIEWPOINT');
            if ( /rest area/i.test(newName) || /rest stop/i.test(newName) || /service plaza/i.test(newName) ||
                ( transCatIndex > -1 && lookoutCatIndex > -1 ) ) {
                if ( transCatIndex < 2 && transCatIndex > -1 && lookoutCatIndex < 2 && lookoutCatIndex > -1 ) {

                    if ( item.isPoint() ) {  // needs to be area
                        bannButt.areaNotPoint.active = true;
                    }
                    bannButt.pointNotArea.active = false;
                    bannButt.unmappedRegion.active = false;

                    if ( categories.indexOf('GAS_STATION') > -1 ) {
                        bannButt.restAreaGas.active = true;
                    }

                    if ( newName.match(/^Rest Area.* \- /) === null ) {
                        bannButt.restAreaName.active = true;
                        if (currentWL.restAreaName) {
                            bannButt.restAreaName.WLactive = false;
                        }
                    } else {
                        newName = newName.replace(/Mile/i, 'mile');
                        if (hpMode.harmFlag) {
                            if (newName !== item.attributes.name) {
                                actions.push(new UpdateObject(item, { name: newName }));
                                fieldUpdateObject.name='#dfd';
                                phlogdev('Lower case "mile"');
                            } else {
                                // The new name matches the original name, so the only change would have been to capitalize "Mile", which
                                // we don't want. So remove any previous name-change action.  Note: this feels like a hack and is probably
                                // a fragile workaround.  The name shouldn't be capitalized in the first place, unless necessary.
                                for (var i=0; i<actions.length; i++) {
                                    var action = actions[i];
                                    if (action.newAttributes.name) {
                                        actions.splice(i,1);
                                        fieldUpdateObject.name='';
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // switch to rest area wiki button
                    bannButt2.restAreaWiki.active = true;
                    bannButt2.placesWiki.active = false;

                    // missing address ok
                    bannButt.streetMissing.active = false;
                    bannButt.cityMissing.active = false;
                    bannButt.hnMissing.active = false;
                    bannButt.urlMissing.severity = 0;
                    bannButt.phoneMissing.severity = 0;
                    //assembleBanner();


                } else {
                    bannButt.restAreaSpec.active = true;
                    if (currentWL.restAreaName) {
                        bannButt.restAreaSpec.WLactive = false;
                    } else {
                        bannButt.pointNotArea.active = false;
                    }
                }
            }

            // update Severity for banner messages
            for (var bannKey in bannButt) {
                if (bannButt.hasOwnProperty(bannKey) && bannButt[bannKey].active) {
                    severityButt = Math.max(bannButt[bannKey].severity, severityButt);
                }
            }

            if (hpMode.harmFlag) {
                phlogdev('Severity: '+severityButt+'; lockOK: '+lockOK);
            }
            // Place locking
            // final formatting of desired lock levels
            var hlLockFlag = false, levelToLock;
            if (PNHLockLevel !== -1 && hpMode.harmFlag) {
                phlogdev('PNHLockLevel: '+PNHLockLevel);
                levelToLock = PNHLockLevel;
            } else {
                levelToLock = defaultLockLevel;
            }
            if (region === "SER") {
                if (newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && newCategories.indexOf("PARKING_LOT") > -1) {
                    levelToLock = lockLevel4;
                } else if ( item.isPoint() && newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && (newCategories.indexOf("HOSPITAL_MEDICAL_CARE") === -1 || newCategories.indexOf("HOSPITAL_URGENT_CARE") === -1) ) {
                    levelToLock = lockLevel4;
                }
            }

            if (levelToLock > (usrRank - 1)) {levelToLock = (usrRank - 1);}  // Only lock up to the user's level
            if ( lockOK && severityButt < 2) {
                // Campus project exceptions
                if ( item.attributes.lockRank < levelToLock) {
                    if (hpMode.harmFlag) {
                        phlogdev("Venue locked!");
                        actions.push(new UpdateObject(item, { lockRank: levelToLock }));
                        fieldUpdateObject.lockRank='#dfd';
                    } else if (hpMode.hlFlag) {
                        hlLockFlag = true;
                    }
                }
                bannButt.placeLocked.active = true;
            }

            //IGN check
            if (!item.attributes.residential && item.attributes.updatedBy && W.model.users.get(item.attributes.updatedBy) &&
                W.model.users.get(item.attributes.updatedBy).userName && W.model.users.get(item.attributes.updatedBy).userName.match(/^ign_/i) !== null) {
                bannButt.ignEdited.active = true;
            }

            //waze_maint_bot check
            var updatedById = item.attributes.updatedBy ? item.attributes.updatedBy : item.attributes.createdBy;
            var updatedBy = W.model.users.get(updatedById);
            var updatedByName = updatedBy ? updatedBy.userName : null;
            var botNamesAndIDs = [
                '^waze-maint', '^105774162$',
                '^waze3rdparty$', '^361008095$',
                '^WazeParking1$', '^338475699$',
                '^admin$', '^-1$',
                '^avsus$', '^107668852$'
            ];
            var re = new RegExp(botNamesAndIDs.join('|'),'i');

            if (!item.attributes.residential && updatedById && (re.test(updatedById.toString()) || (updatedByName && re.test(updatedByName))))  {
                bannButt.wazeBot.active = true;
            }

            // RPP Locking option for R3+
            if (item.attributes.residential) {
                if (devUser || betaUser || usrRank >= 3) {  // Allow residential point locking by R3+
                    RPPLockString = 'Lock at <select id="RPPLockLevel">';
                    var ddlSelected = false;
                    for (var llix=1; llix<6; llix++) {
                        if (llix < usrRank+1) {
                            if ( !ddlSelected && (defaultLockLevel === llix - 1 || llix === usrRank) ) {
                                RPPLockString += '<option value="'+llix+'" selected="selected">'+llix+'</option>';
                                ddlSelected = true;
                            } else {
                                RPPLockString += '<option value="'+llix+'">'+llix+'</option>';
                            }
                        }
                    }
                    RPPLockString += '</select>';
                    bannButt.lockRPP.message = 'Current lock: '+ (parseInt(item.attributes.lockRank)+1) +'. '+RPPLockString+' ?';
                    bannButt.lockRPP.active = true;
                }
            }

            // Turn off unnecessary buttons
            if (item.attributes.categories.indexOf('PHARMACY') > -1) {
                bannButt.addPharm.active = false;
            }
            if (item.attributes.categories.indexOf('SUPERMARKET_GROCERY') > -1) {
                bannButt.addSuper.active = false;
            }

            // Final alerts for non-severe locations
            if ( !item.attributes.residential && severityButt < 3) {
                var nameShortSpace = newName.toUpperCase().replace(/[^A-Z \']/g, '');
                if ( nameShortSpace.indexOf("'S HOUSE") > -1 || nameShortSpace.indexOf("'S HOME") > -1 || nameShortSpace.indexOf("'S WORK") > -1) {
                    if ( !containsAny(newCategories,['RESTAURANT','DESSERT','BAR']) && !PNHNameRegMatch ) {
                        bannButt.resiTypeNameSoft.active = true;
                    }
                }
                if ( ["HOME","MY HOME","HOUSE","MY HOUSE","PARENTS HOUSE","CASA","MI CASA","WORK","MY WORK","MY OFFICE","MOMS HOUSE","DADS HOUSE","MOM","DAD"].indexOf( nameShortSpace ) > -1 ) {
                    bannButt.resiTypeName.active = true;
                    if (currentWL.resiTypeName) {
                        bannButt.resiTypeName.WLactive = false;
                    }
                    bannButt.resiTypeNameSoft.active = false;
                }
                if ( item.attributes.description.toLowerCase().indexOf('google') > -1 || item.attributes.description.toLowerCase().indexOf('yelp') > -1 ) {
                    bannButt.suspectDesc.active = true;
                    if (currentWL.suspectDesc) {
                        bannButt.suspectDesc.WLactive = false;
                    }
                }

                // ### Review the ones below here
                /*
                if (newName === "UPS") {
                    sidebarMessageOld.push("If this is a 'UPS Store' location, please change the name to The UPS Store and run the script again.");
                    severity = Math.max(1, severity);
                }
                if (newName === "FedEx") {
                    sidebarMessageOld.push("If this is a FedEx Office location, please change the name to FedEx Office and run the script again.");
                    severity = Math.max(1, severity);
                }
                */

            }

            // Return severity for highlighter (no dupe run))
            if (hpMode.hlFlag) {
                // get severities from the banners
                severityButt = 0;
                for ( var tempKey in bannButt ) {
                    if ( bannButt.hasOwnProperty(tempKey) && bannButt[tempKey].hasOwnProperty('active') && bannButt[tempKey].active ) {  //  If the particular message is active
                        if ( bannButt[tempKey].hasOwnProperty('WLactive') ) {
                            if ( bannButt[tempKey].WLactive ) {  // If there's a WL option, enable it
                                severityButt = Math.max(bannButt[tempKey].severity, severityButt);
                                //                                if ( bannButt[tempKey].severity > 0) {
                                //                                    phlogdev('Issue with '+item.attributes.name+': '+tempKey);
                                //                                    phlogdev('Severity: '+bannButt[tempKey].severity);
                                //                                }
                            }
                        } else {
                            severityButt = Math.max(bannButt[tempKey].severity, severityButt);
                            //                            if ( bannButt[tempKey].severity > 0) {
                            //                                phlogdev('Issue with '+item.attributes.name+': '+tempKey);
                            //                                phlogdev('Severity: '+bannButt[tempKey].severity);
                            //                            }
                        }
                    }

                }
                //phlogdev('calculated in harmGo: ' +severityButt + '; ' + item.attributes.name);

                // Special case flags
                if (  item.attributes.lockRank === 0 && (item.attributes.categories.indexOf("HOSPITAL_MEDICAL_CARE") > -1 || item.attributes.categories.indexOf("HOSPITAL_URGENT_CARE") > -1 || item.attributes.categories.indexOf("GAS_STATION") > -1) ) {
                    severityButt = 5;
                }

                if ( severityButt === 0 && hlLockFlag ) {
                    severityButt = 'lock';
                }
                if ( severityButt === 1 && hlLockFlag ) {
                    severityButt = 'lock1';
                }
                if ( item.attributes.adLocked ) {
                    severityButt = 'adLock';
                }

                return severityButt;
            }

            // *** Below here is for harmonization only.  HL ends in previous step.

            // Run nearby duplicate place finder function

            var dupeBannMess = '', dupesFound = false;
            dupeHNRangeList = [];
            bannDupl = {};
            if (newName.replace(/[^A-Za-z0-9]/g,'').length > 0 && !item.attributes.residential && !isEmergencyRoom(item)) {
                if ( $("#WMEPH-DisableDFZoom" + devVersStr).prop('checked') ) {  // don't zoom and pan for results outside of FOV
                    duplicateName = findNearbyDuplicate(newName, newAliases, item, false);
                } else {
                    duplicateName = findNearbyDuplicate(newName, newAliases, item, true);
                }
                if (duplicateName[1]) {
                    bannButt.overlapping.active = true;
                }
                duplicateName = duplicateName[0];
                if (duplicateName.length > 0) {
                    if (duplicateName.length+1 !== dupeIDList.length && devUser) {  // If there's an issue with the data return, allow an error report
                        if (confirm('WMEPH: Dupefinder Error!\nClick OK to report this') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                            forumMsgInputs = {
                                subject: 'WMEPH Bug report DupeID',
                                message: 'Script version: ' + WMEPHversion + devVersStr + '\nPermalink: ' + placePL + '\nPlace name: ' + item.attributes.name + '\nCountry: ' + addr.country.name + '\n--------\nDescribe the error:\nDupeID mismatch with dupeName list'
                            };
                            WMEPH_errorReport(forumMsgInputs);
                        }
                    } else {
                        dupesFound = true;
                        dupeBannMess = 'Possible duplicate: ';
                        if (duplicateName.length > 1) {
                            dupeBannMess = 'Possible duplicates: ';
                        }
                        for (var ijx=1; ijx<duplicateName.length+1; ijx++) {
                            bannDupl[dupeIDList[ijx]] = {
                                active: true, severity: 2, message: "&nbsp-- " + duplicateName[ijx-1],
                                WLactive: false, WLvalue: wlButtText, WLtitle: 'Whitelist Duplicate',
                                WLaction: function(dID) {
                                    wlKeyName = 'dupeWL';
                                    if (!venueWhitelist.hasOwnProperty(itemID)) {  // If venue is NOT on WL, then add it.
                                        venueWhitelist[itemID] = { dupeWL: [] };
                                    }
                                    if (!venueWhitelist[itemID].hasOwnProperty(wlKeyName)) {  // If dupeWL key is not in venue WL, then initialize it.
                                        venueWhitelist[itemID][wlKeyName] = [];
                                    }
                                    venueWhitelist[itemID].dupeWL.push(dID);  // WL the id for the duplicate venue
                                    venueWhitelist[itemID].dupeWL = uniq(venueWhitelist[itemID].dupeWL);
                                    // Make an entry for the opposite item
                                    if (!venueWhitelist.hasOwnProperty(dID)) {  // If venue is NOT on WL, then add it.
                                        venueWhitelist[dID] = { dupeWL: [] };
                                    }
                                    if (!venueWhitelist[dID].hasOwnProperty(wlKeyName)) {  // If dupeWL key is not in venue WL, then initialize it.
                                        venueWhitelist[dID][wlKeyName] = [];
                                    }
                                    venueWhitelist[dID].dupeWL.push(itemID);  // WL the id for the duplicate venue
                                    venueWhitelist[dID].dupeWL = uniq(venueWhitelist[dID].dupeWL);
                                    saveWL_LS(true);  // Save the WL to local storage
                                    WMEPH_WLCounter();
                                    bannButt2.clearWL.active = true;
                                    bannDupl[dID].active = false;
                                    harmonizePlaceGo(item,'harmonize');
                                }
                            };
                            if ( venueWhitelist.hasOwnProperty(itemID) && venueWhitelist[itemID].hasOwnProperty('dupeWL') && venueWhitelist[itemID].dupeWL.indexOf(dupeIDList[ijx]) > -1 ) {  // if the dupe is on the whitelist then remove it from the banner
                                bannDupl[dupeIDList[ijx]].active = false;
                            } else {  // Otherwise, activate the WL button
                                bannDupl[dupeIDList[ijx]].WLactive = true;
                            }
                        }  // END loop for duplicate venues
                    }
                }
            }

            // Check HN range (this depends on the returned dupefinder data, so has to run after it)
            if (dupeHNRangeList.length > 3) {
                var dhnix, dupeHNRangeListSorted = [];
                sortWithIndex(dupeHNRangeDistList);
                for (dhnix = 0; dhnix < dupeHNRangeList.length; dhnix++) {
                    dupeHNRangeListSorted.push(dupeHNRangeList[ dupeHNRangeDistList.sortIndices[dhnix] ]);
                }
                // Calculate HN/distance ratio with other venues
                // var sumHNRatio = 0;
                var arrayHNRatio = [];
                for (dhnix = 0; dhnix < dupeHNRangeListSorted.length; dhnix++) {
                    arrayHNRatio.push(Math.abs( (parseInt(item.attributes.houseNumber) - dupeHNRangeListSorted[dhnix]) / dupeHNRangeDistList[dhnix] ));
                }
                sortWithIndex(arrayHNRatio);
                // Examine either the median or the 8th index if length is >16
                var arrayHNRatioCheckIX = Math.min(Math.round(arrayHNRatio.length/2), 8);
                if (arrayHNRatio[arrayHNRatioCheckIX] > 1.4) {
                    bannButt.HNRange.active = true;
                    if (currentWL.HNRange) {
                        bannButt.HNRange.WLactive = false;
                    }
                    if (arrayHNRatio[arrayHNRatioCheckIX] > 5) {
                        bannButt.HNRange.severity = 3;
                    }
                    // show stats if HN out of range
                    phlogdev('HNs: ' + dupeHNRangeListSorted);
                    phlogdev('Distances: ' + dupeHNRangeDistList);
                    phlogdev('arrayHNRatio: ' + arrayHNRatio);
                    phlogdev('HN Ratio Score: ' + arrayHNRatio[Math.round(arrayHNRatio.length/2)]);
                }
            }

            executeMultiAction(actions);

            if (hpMode.harmFlag) {
                // Update icons to reflect current WME place services
                updateServicesChecks(bannServ);
            }

            // Turn on website linking button if there is a url
            //if (newURL !== null && newURL !== "") {
            //bannButt.PlaceWebsite.active = true;
            //}

            // Highlight the changes made
            highlightChangedFields(fieldUpdateObject,hpMode);

            // Assemble the banners
            assembleBanner();  // Make Messaging banners

            showOpenPlaceWebsiteButton();
        }  // END harmonizePlaceGo function

        // **** vvv Function definitions vvv ****

        // highlight changed fields
        function highlightChangedFields(fieldUpdateObject,hpMode) {

            if (hpMode.harmFlag) {
                //var panelFields = {};
                getPanelFields();
                var tab1HL = false;
                var tab2HL = false;
                //phlogdev(fieldUpdateObject);
                if (fieldUpdateObject.name) {
                    $('.form-control')[panelFields.name].style="background-color:"+fieldUpdateObject.name;
                    tab1HL = true;
                }
                if (fieldUpdateObject.aliases) {
                    var field = $('.alias-name')[0];
                    if (field) field.style="background-color:"+fieldUpdateObject.aliases;
                    tab1HL = true;
                }
                if (fieldUpdateObject.categories) {
                    $('.select2-choices')[0].style="background-color:"+fieldUpdateObject.categories;
                    tab1HL = true;
                }
                if (fieldUpdateObject.brand) {
                    $('.form-control')[panelFields.brand].style="background-color:"+fieldUpdateObject.brand;
                    tab1HL = true;
                }
                if (fieldUpdateObject.description) {
                    $('.form-control')[panelFields.description].style="background-color:"+fieldUpdateObject.description;
                    tab1HL = true;
                }
                if (fieldUpdateObject.lockRank) {
                    $('.form-control')[panelFields.lockRank].style="background-color:"+fieldUpdateObject.lockRank;
                    tab1HL = true;
                }
                if (fieldUpdateObject.address) {
                    $('.address-edit')[0].style='background-color:'+fieldUpdateObject.address;
                    tab1HL = true;
                }

                if (fieldUpdateObject.url) {
                    $('.form-control')[panelFields.url].style="background-color:"+fieldUpdateObject.url;
                    tab2HL = true;
                }
                if (fieldUpdateObject.phone) {
                    $('.form-control')[panelFields.phone].style="background-color:"+fieldUpdateObject.phone;
                    tab2HL = true;
                }
                if (fieldUpdateObject.openingHours) {
                    $('.opening-hours')[0].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.VALLET_SERVICE) {
                    $('.service-checkbox')[0].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.DRIVETHROUGH) {
                    $('.service-checkbox')[1].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.WI_FI) {
                    $('.service-checkbox')[2].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.RESTROOMS) {
                    $('.service-checkbox')[3].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.CREDIT_CARDS) {
                    $('.service-checkbox')[4].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.RESERVATIONS) {
                    $('.service-checkbox')[5].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.OUTSIDE_SEATING) {
                    $('.service-checkbox')[6].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.AIR_CONDITIONING) {
                    $('.service-checkbox')[7].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.PARKING_FOR_CUSTOMERS) {
                    $('.service-checkbox')[8].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.DELIVERIES) {
                    $('.service-checkbox')[9].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.TAKE_AWAY) {
                    $('.service-checkbox')[10].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.WHEELCHAIR_ACCESSIBLE) {
                    $('.service-checkbox')[11].style="background-color:#dfd";
                    tab2HL = true;
                }

                var placeNavTabs = $('.nav');
                for (pfix=0; pfix<placeNavTabs.length; pfix++) {
                    pfa = placeNavTabs[pfix].innerHTML;
                    if (pfa.indexOf('landmark-edit') > -1) {
                        panelFieldsList = placeNavTabs[pfix].children;
                        panelFields.navTabsIX = pfix;
                        break;
                    }
                }
                for (pfix=0; pfix<panelFieldsList.length; pfix++) {
                    pfa = panelFieldsList[pfix].innerHTML;
                    if (pfa.indexOf('landmark-edit-general') > -1) {
                        panelFields.navTabGeneral = pfix;
                    }
                    if (pfa.indexOf('landmark-edit-more') > -1) {
                        panelFields.navTabMore = pfix;
                    }
                }

                if (tab1HL) {
                    $('.nav')[panelFields.navTabsIX].children[panelFields.navTabGeneral].children[0].style='background-color:#dfd';
                }
                if (tab2HL) {
                    $('.nav')[panelFields.navTabsIX].children[panelFields.navTabMore].children[0].style='background-color:#dfd';
                }
            }
        }


        // Set up banner messages
        function assembleBanner() {
            phlogdev('Building banners');
            // push together messages from active banner messages
            var sidebarMessage = [], sidebarTools = [];  // Initialize message array
            var tempKey, strButt1, dupesFound = false;
            severityButt = 0;

            // Setup duplicates banners
            strButt1 = 'Possible duplicates: ';
            for ( tempKey in bannDupl ) {
                if (bannDupl.hasOwnProperty(tempKey) && bannDupl[tempKey].hasOwnProperty('active') && bannDupl[tempKey].active) {
                    dupesFound = true;
                    strButt1 += '<br>' + bannDupl[tempKey].message;
                    if (bannDupl[tempKey].hasOwnProperty('action')) {
                        // Nothing happening here yet.
                    }
                    if (bannDupl[tempKey].hasOwnProperty('WLactive') && bannDupl[tempKey].WLactive && bannDupl[tempKey].hasOwnProperty('WLaction') ) {  // If there's a WL option, enable it
                        severityButt = Math.max(bannDupl[tempKey].severity, severityButt);
                        strButt1 += ' <input class="btn btn-success btn-xs wmephwl-btn" id="WMEPH_WL' + tempKey + '" title="' + bannDupl[tempKey].WLtitle + '" type="button" value="' + bannDupl[tempKey].WLvalue + '">';
                    }
                }
            }
            if (dupesFound) {  // if at least 1 dupe
                sidebarMessage.push(strButt1);
            }

            // Build banners above the Services
            var $webDiv;
            for ( tempKey in bannButt ) {
                if ( bannButt.hasOwnProperty(tempKey) && bannButt[tempKey].hasOwnProperty('active') && bannButt[tempKey].active ) {  //  If the particular message is active
                    strButt1 = bannButt[tempKey].message;
                    if (bannButt[tempKey].badInput) {
                        strButt1 = strButt1.replace(/#DDF/i,'pink');
                    }
                    if (bannButt[tempKey].hasOwnProperty('action')) {
                        strButt1 += ' <input class="btn btn-default btn-xs wmeph-btn" id="WMEPH_' + tempKey + '" title="' + bannButt[tempKey].title + '" type="button" value="' + bannButt[tempKey].value + '"></input>';
                        if (tempKey === 'noHours') {
                            strButt1 += ' <input class="btn btn-default btn-xs wmeph-btn" id="WMEPH_' + tempKey + 'A2" title="' + bannButt[tempKey].title2 + '" type="button" value="' + bannButt[tempKey].value2 + '"></input>';
                        }
                    }
                    if ( bannButt[tempKey].hasOwnProperty('WLactive') ) {
                        if ( bannButt[tempKey].WLactive && bannButt[tempKey].hasOwnProperty('WLaction') ) {  // If there's a WL option, enable it
                            severityButt = Math.max(bannButt[tempKey].severity, severityButt);
                            strButt1 += bannButt[tempKey].WLmessage + ' <input class="btn btn-success btn-xs wmephwl-btn" id="WMEPH_WL' + tempKey + '" title="' + bannButt[tempKey].WLtitle + '" type="button" value="WL">';
                            //strButt1 += bannButt[tempKey].WLmessage + ' <input class="fa fa-check-square" id="WMEPH_WL' + tempKey + '" title="' + bannButt[tempKey].WLtitle + '" type="button" style="color:green;" >';
                            //strButt1 += bannButt[tempKey].WLmessage + ' <button class="btn btn-default btn-xs wmephwl-btn" id="WMEPH_WL' + tempKey + '" title="' + bannButt[tempKey].WLtitle + '" type="button" ><i class="fa fa-check-square" style="color:green;></i></button>';
                        }
                    } else {
                        severityButt = Math.max(bannButt[tempKey].severity, severityButt);
                    }
                    if (tempKey.toUpperCase() === 'PLACEWEBSITE' || tempKey.toUpperCase() === 'WEBSEARCH') {
                        if (!$webDiv) {
                            $webDiv = $('<div>').attr({id:'wmeph-web-buttons'});
                        }
                        $webDiv.append(strButt1);
                    } else {
                        sidebarMessage.push(strButt1);
                    }
                }
            }
            if ($webDiv) {
                sidebarMessage.push($webDiv[0].outerHTML);
            }
            if ( $("#WMEPH-ColorHighlighting" + devVersStr).prop('checked') ) {
                item = W.selectionManager.selectedItems[0].model;
                item.attributes.wmephSeverity = severityButt;
            }

            // setup Add Service Buttons for suggested services
            var sidebarServButts = '', servButtHeight = '27', greyOption;
            for ( tempKey in bannServ ) {
                if ( bannServ.hasOwnProperty(tempKey) && bannServ[tempKey].hasOwnProperty('active') && bannServ[tempKey].active ) {  //  If the particular service is active
                    if ( bannServ[tempKey].checked ) {
                        greyOption = '';
                    } else {
                        greyOption = '-webkit-filter: opacity(.25);filter: opacity(.25);';
                        //greyOption = '-webkit-filter: brightness(3); filter: brightness(3);';
                    }
                    //strButt1 = '&nbsp<input class="servButton" id="WMEPH_' + tempKey + '" title="' + bannServ[tempKey].title + '" type="image" style="height:' + servButtHeight +
                    //    'px;background:none;border-color: none;border-style: none;" src="https://openmerchantaccount.com/img2/' + bannServ[tempKey].icon + greyOption + '.png">';
                    strButt1 = '&nbsp<input class="'+bannServ[tempKey].icon+'" id="WMEPH_' + tempKey + '" type="button" title="' + bannServ[tempKey].title +
                        '" style="border:0;background-size: contain; height:' + servButtHeight + 'px;width: '+Math.ceil(servButtHeight*bannServ[tempKey].w2hratio).toString()+'px;'+greyOption+'">';
                    sidebarServButts += strButt1;
                }
            }
            if (sidebarServButts.length>0) {
                sidebarTools.push('Add services:<br>' + sidebarServButts);
            }

            //  Build general banners (below the Services)
            for ( tempKey in bannButt2 ) {
                if ( bannButt2.hasOwnProperty(tempKey) && bannButt2[tempKey].hasOwnProperty('active') && bannButt2[tempKey].active ) {  //  If the particular message is active
                    strButt1 = bannButt2[tempKey].message;
                    if (bannButt2[tempKey].hasOwnProperty('action')) {
                        strButt1 += ' <input class="btn btn-info btn-xs wmeph-btn" id="WMEPH_' + tempKey + '" title="' + bannButt2[tempKey].title + '" style="" type="button" value="' + bannButt2[tempKey].value + '">';
                    }
                    sidebarTools.push(strButt1);
                    severityButt = Math.max(bannButt2[tempKey].severity, severityButt);
                }
            }

            // Add banner indicating that it's the beta version
            // if (isDevVersion) {
            //     sidebarTools.push('WMEPH Beta');
            // }

            // Post the banners to the sidebar
            displayTools( sidebarTools.join("</div><div>") );
            displayBanners(sidebarMessage.join("</div><div>"), severityButt );

            // Set up Duplicate onclicks
            if ( dupesFound ) {
                setupButtons(bannDupl);
            }
            // Setup bannButt onclicks
            setupButtons(bannButt);
            // Setup bannServ onclicks
            setupButtons(bannServ);
            // Setup bannButt2 onclicks
            setupButtons(bannButt2);

            if (bannButt.noHours.active) {
                var button = document.getElementById('WMEPH_noHoursA2');
                button.onclick = function() {
                    bannButt.noHours.action2();
                    assembleBanner();
                };
            }

            // Street entry textbox stuff
            var streetNames = [];
            var streetNamesCap = [];
            W.model.streets.getObjectArray().forEach(function(st) {
                if (!st.isEmpty) {
                    streetNames.push(st.name);
                    streetNamesCap.push(st.name.toUpperCase());
                }
            });
            streetNames.sort();
            streetNamesCap.sort();
            $('#WMEPH_missingStreet').autocomplete({
                source: streetNames,
                change: onStreetChanged,
                select: onStreetSelected,
                response: function(e, ui) {
                    var maxListLength = 10;
                    if(ui.content.length > maxListLength) {
                        ui.content.splice(maxListLength, ui.content.length - maxListLength);
                    }
                }
            });
            function onStreetSelected(e, ui) {
                if (ui.item) {
                    checkStreet(ui.item.value);
                }
            }
            function onStreetChanged(e, ui) {
                checkStreet(null);
            }
            $('#WMEPH_addStreetBtn').on('click', addStreetToVenue);
            function addStreetToVenue() {
                var stName = $('#WMEPH_missingStreet').val();
                var street = W.model.streets.getByAttributes({name:stName})[0];
                var addr = item.getAddress().attributes;
                var newAddr = {
                    country: addr.country,
                    state: addr.state,
                    city: addr.city,
                    street: street
                };
                updateAddress(item, newAddr);
                bannButt.streetMissing.active = false;
                assembleBanner();
            }
            function checkStreet(name) {
                name = (name || $("#WMEPH_missingStreet").val()).toUpperCase();
                var ix = streetNamesCap.indexOf(name);
                var enable = false;
                if (ix > -1) {
                    color = 'lightgreen';
                    $("#WMEPH_missingStreet").val(streetNames[ix]);
                    enable = true;
                    $('#WMEPH_addStreetBtn').prop("disabled", false).removeClass('disabled');
                } else {
                    $('#WMEPH_addStreetBtn').prop('disabled', true).addClass('disabled');
                }
                return enable;
            }
            // If pressing enter in the street entry box, add the street
            $("#WMEPH_missingStreet").keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH_missingStreet').val() !== '' ){
                    if(checkStreet(null)) {
                        addStreetToVenue();
                    }
                }
            });

            // If pressing enter in the HN entry box, add the HN
            $("#WMEPH-HNAdd"+devVersStr).keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-HNAdd'+devVersStr).val() !== '' ){
                    $("#WMEPH_hnMissing").click();
                }
            });

            // If pressing enter in the phone entry box, add the phone
            $("#WMEPH-PhoneAdd"+devVersStr).keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-PhoneAdd'+devVersStr).val() !== '' ){
                    $("#WMEPH_phoneMissing").click();
                }
            });

            // If pressing enter in the URL entry box, add the URL
            $("#WMEPH-UrlAdd"+devVersStr).keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-UrlAdd'+devVersStr).val() !== '' ){
                    $("#WMEPH_urlMissing").click();
                }
            });

            // If pressing enter in the hours entry box, parse the entry
            $("#WMEPH-HoursPaste"+devVersStr).keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-HoursPaste'+devVersStr).val() !== '' ){
                    $("#WMEPH_noHours").click();
                }
            });
            $("#WMEPH-HoursPaste"+devVersStr).click(function(){
                if (this.value === 'Paste Hours Here' || this.value === 'Can\'t parse, try again') {
                    this.value = '';
                }
                this.style.color = 'black';
            }).blur(function(){
                if ( this.value === '') {
                    this.value = 'Paste Hours Here';
                    this.style.color = '#999';
                }
            });
        }  // END assemble Banner function

        // Button onclick event handler
        function setupButtons(b) {
            for ( var tempKey in b ) {  // Loop through the banner possibilities
                if ( b.hasOwnProperty(tempKey) && b[tempKey].active ) {  //  If the particular message is active
                    if (b[tempKey].hasOwnProperty('action')) {  // If there is an action, set onclick
                        buttonAction(b, tempKey);
                    }
                    // If there's a WL option, set up onclick
                    if ( b[tempKey].hasOwnProperty('WLactive') && b[tempKey].WLactive && b[tempKey].hasOwnProperty('WLaction') ) {
                        buttonWhitelist(b, tempKey);
                    }
                }
            }
        }  // END setupButtons function

        function buttonAction(b,bKey) {
            var button = document.getElementById('WMEPH_'+bKey);
            button.onclick = function() {
                b[bKey].action();
                assembleBanner();
            };
            return button;
        }
        function buttonWhitelist(b,bKey) {
            var button = document.getElementById('WMEPH_WL'+bKey);
            button.onclick = function() {
                if ( bKey.match(/^\d{5,}/) !== null ) {
                    b[bKey].WLaction(bKey);
                } else {
                    b[bKey].WLaction();
                }
                b[bKey].WLactive = false;
                b[bKey].severity = 0;
                assembleBanner();
            };
            return button;
        }


        // Setup div for banner messages and color
        function displayBanners(sbm,sev) {
            if ($('#WMEPH_banner').length === 0 ) {
                $('<div id="WMEPH_banner">').css({"width": "100%", "background-color": "#fff", "color": "white", "font-size": "14px", "padding": "3px", "margin-left": "auto", "margin-right": "auto"}).prependTo(".contents");
            } else {
                $('#WMEPH_banner').empty();
            }
            var bgColor;
            switch (sev) {
                case 1:
                    bgColor = "rgb(50, 50, 230)";  // blue
                    break;
                case 2:
                    bgColor = "rgb(217, 173, 42)";  // yellow
                    break;
                case 3:
                    bgColor = "rgb(211, 48, 48)";  // red
                    break;
                default:
                    bgColor = "rgb(36, 172, 36)";  // green
            }
            $('#WMEPH_banner').css({"background-color": bgColor});
            sbm = '<div>' + sbm + '</div>';
            $("#WMEPH_banner").append(sbm);
            $('#select2-drop').css({display:'none'});
        }  // END displayBanners funtion

        // Setup div for banner messages and color
        function displayTools(sbm) {
            if ($('#WMEPH_tools').length === 0 ) {
                $('<div id="WMEPH_tools">').css({"width": "100%", "background-color": "#eee", "color": "black", "font-size": "15px", "font-weight": "bold", "padding": "3px", "margin-left": "auto", "margin-right": "auto"}).prependTo(".contents");
            } else {
                $('#WMEPH_tools').empty();
            }
            sbm = '<div><span style="position:relative;">' + sbm+ '</span></div>';
            $("#WMEPH_tools").append(sbm);
            $('#select2-drop').css({display:'none'});
        }  // END displayBanners funtion

        // CSS setups
        var cssCode = [
            ".btn.wmeph-btn {padding: 0px 3px}",
            ".btn.wmephwl-btn {padding: 0px 1px}"
        ];
        for (var cssix=0; cssix<cssCode.length; cssix++) {
            insertCss(cssCode[cssix]);
        }

        // Display run button on place sidebar
        function displayRunButton() {
            var betaDelay = 100;
            setTimeout(function() {
                if ($('#WMEPH_runButton').length === 0 ) {
                    $('<div id="WMEPH_runButton">').css({"padding-bottom": "6px", "padding-top": "3px", "width": "290", "background-color": "#FFF", "color": "black", "font-size": "15px", "font-weight": "bold", "margin-left": "auto", "margin-right": "auto"}).prependTo(".contents");
                }
                if ($('#runWMEPH'+devVersStr).length === 0 ) {
                    var strButt1 = '<input class="btn btn-primary" id="runWMEPH'+devVersStr+'" title="Run WMEPH'+devVersStrSpace+' on Place" type="button" value="Run WMEPH'+devVersStrSpace+'">';
                    $("#WMEPH_runButton").append(strButt1);
                }
                var btn = document.getElementById("runWMEPH"+devVersStr);
                if (btn !== null) {
                    btn.onclick = function() {
                        harmonizePlace();
                    };
                } else {
                    setTimeout(bootstrapRunButton,100);
                }
                if ( W.selectionManager.selectedItems.length === 1 ) {
                    item = W.selectionManager.selectedItems[0].model;
                    if ( item.attributes.categories.length === 1 && item.attributes.categories[0] === 'SHOPPING_AND_SERVICES' ) {
                        $('.suggested-categories').remove();
                    }
                }
                showOpenPlaceWebsiteButton();
            }, betaDelay);
        }  // END displayRunButton funtion

        // Displays the Open Place Website button.
        function showOpenPlaceWebsiteButton() {
            if (item) {
                var openPlaceWebsiteURL = item.attributes.url;
                if (openPlaceWebsiteURL && openPlaceWebsiteURL.replace(/[^A-Za-z0-9]/g,'').length > 2) {
                    if ($('#WMEPHurl').length === 0  ) {
                        strButt1 = '<input class="btn btn-success btn-xs" id="WMEPHurl" title="Open place URL" type="button" value="Open Website" style="margin-left:3px;">';
                        $("#runWMEPH" + devVersStr).after(strButt1);
                        btn = document.getElementById("WMEPHurl");
                        if (btn !== null) {
                            btn.onclick = function() {
                                var item = W.selectionManager.selectedItems[0];
                                if (item && item.model && item.model.attributes) {
                                    openPlaceWebsiteURL = item.model.attributes.url;
                                    if (openPlaceWebsiteURL.match(/^http/i) === null) {
                                        openPlaceWebsiteURL = 'http:\/\/'+openPlaceWebsiteURL;
                                    }
                                    if ( $("#WMEPH-WebSearchNewTab" + devVersStr).prop('checked') ) {
                                        window.open(openPlaceWebsiteURL);
                                    } else {
                                        window.open(openPlaceWebsiteURL, searchResultsWindowName, searchResultsWindowSpecs);
                                    }
                                }
                            };
                        } else {
                            setTimeout(bootstrapRunButton,100);
                        }
                    }
                } else {
                    if ($('#WMEPHurl').length > 0  ) {
                        $('#WMEPHurl').remove();
                    }
                }
            }
        }

        // WMEPH Clone Tool
        function displayCloneButton() {
            var betaDelay = 80;
            if (isDevVersion) { betaDelay = 300; }
            setTimeout(function() {
                if ($('#WMEPH_runButton').length === 0 ) {
                    $('<div id="WMEPH_runButton">').css({"padding-bottom": "6px", "padding-top": "3px", "width": "290", "background-color": "#FFF", "color": "black", "font-size": "15px", "font-weight": "bold", "margin-left": "auto;", "margin-right": "auto"}).prependTo(".contents");
                }
                var strButt1, btn;
                item = W.selectionManager.selectedItems[0].model;
                if (item) {
                    showOpenPlaceWebsiteButton();
                    if ($('#clonePlace').length === 0 ) {
                        strButt1 = '<div style="margin-bottom: 3px;"></div><input class="btn btn-warning btn-xs wmeph-btn" id="clonePlace" title="Copy place info" type="button" value="Copy">'+
                            ' <input class="btn btn-warning btn-xs wmeph-btn" id="pasteClone" title="Apply the Place info. (Ctrl-Alt-O)" type="button" value="Paste (for checked boxes):"><br>';
                        $("#WMEPH_runButton").append(strButt1);
                        createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPhn', 'HN');
                        createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPstr', 'Str');
                        createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPcity', 'City');
                        createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPurl', 'URL');
                        createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPph', 'Ph');
                        $("#WMEPH_runButton").append('<br>');
                        createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPdesc', 'Desc');
                        createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPserv', 'Serv');
                        createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPhrs', 'Hrs');
                        strButt1 = '<input class="btn btn-info btn-xs wmeph-btn" id="checkAllClone" title="Check all" type="button" value="All">'+
                            ' <input class="btn btn-info btn-xs wmeph-btn" id="checkAddrClone" title="Check Address" type="button" value="Addr">'+
                            ' <input class="btn btn-info btn-xs wmeph-btn" id="checkNoneClone" title="Check none" type="button" value="None"><br>';
                        $("#WMEPH_runButton").append(strButt1);
                    }
                    btn = document.getElementById("clonePlace");
                    if (btn !== null) {
                        btn.onclick = function() {
                            item = W.selectionManager.selectedItems[0].model;
                            cloneMaster = {};
                            cloneMaster.addr = item.getAddress();
                            if ( cloneMaster.addr.hasOwnProperty('attributes') ) {
                                cloneMaster.addr = cloneMaster.addr.attributes;
                            }
                            cloneMaster.houseNumber = item.attributes.houseNumber;
                            cloneMaster.url = item.attributes.url;
                            cloneMaster.phone = item.attributes.phone;
                            cloneMaster.description = item.attributes.description;
                            cloneMaster.services = item.attributes.services;
                            cloneMaster.openingHours = item.attributes.openingHours;
                            phlogdev('Place Cloned');
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                        return;
                    }
                    btn = document.getElementById("pasteClone");
                    if (btn !== null) {
                        btn.onclick = function() {
                            clonePlace();
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                    }
                    btn = document.getElementById("checkAllClone");
                    if (btn !== null) {
                        btn.onclick = function() {
                            if ( !$("#WMEPH_CPhn").prop('checked') ) { $("#WMEPH_CPhn").trigger('click'); }
                            if ( !$("#WMEPH_CPstr").prop('checked') ) { $("#WMEPH_CPstr").trigger('click'); }
                            if ( !$("#WMEPH_CPcity").prop('checked') ) { $("#WMEPH_CPcity").trigger('click'); }
                            if ( !$("#WMEPH_CPurl").prop('checked') ) { $("#WMEPH_CPurl").trigger('click'); }
                            if ( !$("#WMEPH_CPph").prop('checked') ) { $("#WMEPH_CPph").trigger('click'); }
                            if ( !$("#WMEPH_CPserv").prop('checked') ) { $("#WMEPH_CPserv").trigger('click'); }
                            if ( !$("#WMEPH_CPdesc").prop('checked') ) { $("#WMEPH_CPdesc").trigger('click'); }
                            if ( !$("#WMEPH_CPhrs").prop('checked') ) { $("#WMEPH_CPhrs").trigger('click'); }
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                    }
                    btn = document.getElementById("checkAddrClone");
                    if (btn !== null) {
                        btn.onclick = function() {
                            if ( !$("#WMEPH_CPhn").prop('checked') ) { $("#WMEPH_CPhn").trigger('click'); }
                            if ( !$("#WMEPH_CPstr").prop('checked') ) { $("#WMEPH_CPstr").trigger('click'); }
                            if ( !$("#WMEPH_CPcity").prop('checked') ) { $("#WMEPH_CPcity").trigger('click'); }
                            if ( $("#WMEPH_CPurl").prop('checked') ) { $("#WMEPH_CPurl").trigger('click'); }
                            if ( $("#WMEPH_CPph").prop('checked') ) { $("#WMEPH_CPph").trigger('click'); }
                            if ( $("#WMEPH_CPserv").prop('checked') ) { $("#WMEPH_CPserv").trigger('click'); }
                            if ( $("#WMEPH_CPdesc").prop('checked') ) { $("#WMEPH_CPdesc").trigger('click'); }
                            if ( $("#WMEPH_CPhrs").prop('checked') ) { $("#WMEPH_CPhrs").trigger('click'); }
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                    }
                    btn = document.getElementById("checkNoneClone");
                    if (btn !== null) {
                        btn.onclick = function() {
                            if ( $("#WMEPH_CPhn").prop('checked') ) { $("#WMEPH_CPhn").trigger('click'); }
                            if ( $("#WMEPH_CPstr").prop('checked') ) { $("#WMEPH_CPstr").trigger('click'); }
                            if ( $("#WMEPH_CPcity").prop('checked') ) { $("#WMEPH_CPcity").trigger('click'); }
                            if ( $("#WMEPH_CPurl").prop('checked') ) { $("#WMEPH_CPurl").trigger('click'); }
                            if ( $("#WMEPH_CPph").prop('checked') ) { $("#WMEPH_CPph").trigger('click'); }
                            if ( $("#WMEPH_CPserv").prop('checked') ) { $("#WMEPH_CPserv").trigger('click'); }
                            if ( $("#WMEPH_CPdesc").prop('checked') ) { $("#WMEPH_CPdesc").trigger('click'); }
                            if ( $("#WMEPH_CPhrs").prop('checked') ) { $("#WMEPH_CPhrs").trigger('click'); }
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                    }
                }
            }, betaDelay);
        }  // END displayCloneButton funtion



        // Catch PLs and reloads that have a place selected already and limit attempts to about 10 seconds
        function bootstrapRunButton() {
            if (numAttempts < 10) {
                numAttempts++;
                if (W.selectionManager.selectedItems.length === 1) {
                    if (W.selectionManager.selectedItems[0].model.type === "venue") {
                        displayRunButton();
                        showOpenPlaceWebsiteButton();
                        getPanelFields();
                        if (localStorage.getItem("WMEPH-EnableCloneMode" + devVersStr) === '1') {
                            displayCloneButton();
                        }
                    }
                } else {
                    setTimeout(bootstrapRunButton,1000);
                }
            }
        }

        // Find field divs
        function getPanelFields() {
            var panelFieldsList = $('.form-control'), pfa;
            for (var pfix=0; pfix<panelFieldsList.length; pfix++) {
                pfa = panelFieldsList[pfix].name;
                if (pfa === 'name') {
                    panelFields.name = pfix;
                }
                if (pfa === 'lockRank') {
                    panelFields.lockRank = pfix;
                }
                if (pfa === 'description') {
                    panelFields.description = pfix;
                }
                if (pfa === 'url') {
                    panelFields.url = pfix;
                }
                if (pfa === 'phone') {
                    panelFields.phone = pfix;
                }
                if (pfa === 'brand') {
                    panelFields.brand = pfix;
                }
            }
            var placeNavTabs = $('.nav');
            for (pfix=0; pfix<placeNavTabs.length; pfix++) {
                pfa = placeNavTabs[pfix].innerHTML;
                if (pfa.indexOf('landmark-edit') > -1) {
                    panelFieldsList = placeNavTabs[pfix].children;
                    panelFields.navTabsIX = pfix;
                    break;
                }
            }
            for (pfix=0; pfix<panelFieldsList.length; pfix++) {
                pfa = panelFieldsList[pfix].innerHTML;
                if (pfa.indexOf('landmark-edit-general') > -1) {
                    panelFields.navTabGeneral = pfix;
                }
                if (pfa.indexOf('landmark-edit-more') > -1) {
                    panelFields.navTabMore = pfix;
                }
            }


        }

        // Catch PLs and reloads that have a place selected already and limit attempts to about 10 seconds
        numAttempts = 0;
        function bootstrapInferAddress() {
            if (numAttempts < 20) {
                numAttempts++;
                var inferredAddress = WMEPH_inferAddress(7);
                if (!inferredAddress) {
                    setTimeout(bootstrapInferAddress,500);
                } else {
                    return inferredAddress;
                }
            }
        }

        // Function to clone info from a place
        function clonePlace() {
            phlog('Cloning info...');
            var UpdateObject = require("Waze/Action/UpdateObject");
            if (cloneMaster !== null && cloneMaster.hasOwnProperty('url')) {
                item = W.selectionManager.selectedItems[0].model;
                var cloneItems = {};
                var updateItem = false;
                if ( $("#WMEPH_CPhn").prop('checked') ) {
                    cloneItems.houseNumber = cloneMaster.houseNumber;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPurl").prop('checked') ) {
                    cloneItems.url = cloneMaster.url;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPph").prop('checked') ) {
                    cloneItems.phone = cloneMaster.phone;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPdesc").prop('checked') ) {
                    cloneItems.description = cloneMaster.description;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPserv").prop('checked') ) {
                    cloneItems.services = cloneMaster.services;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPhrs").prop('checked') ) {
                    cloneItems.openingHours = cloneMaster.openingHours;
                    updateItem = true;
                }
                if (updateItem) {
                    W.model.actionManager.add(new UpdateObject(item, cloneItems) );
                    phlogdev('Item details cloned');
                }

                var copyStreet = $("#WMEPH_CPstr").prop('checked');
                var copyCity = $("#WMEPH_CPcity").prop('checked');

                if (copyStreet || copyCity) {
                    var originalAddress = item.getAddress();
                    var itemRepl = {
                        street: copyStreet ? cloneMaster.addr.street : originalAddress.attributes.street,
                        city: copyCity ? cloneMaster.addr.city : originalAddress.attributes.city,
                        state: copyCity ? cloneMaster.addr.state : originalAddress.attributes.state,
                        country: copyCity ? cloneMaster.addr.country : originalAddress.attributes.country
                    };
                    updateAddress(item, itemRepl);
                    phlogdev('Item address cloned');
                }
            } else {
                phlog('Please copy a place');
            }
        }

        // Formats "hour object" into a string.
        function formatOpeningHour(hourEntry) {
            var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            var hours = hourEntry.attributes.fromHour + '-' + hourEntry.attributes.toHour;
            return hourEntry.attributes.days.map(function(day) {
                return dayNames[day] + ' ' + hours;
            }).join(', ');
        }
        // Pull natural text from opening hours
        function getOpeningHours(venue) {
            return venue && venue.getOpeningHours && venue.getOpeningHours().map(formatOpeningHour);
        }
        // Parse hours paste for hours object array
        function parseHours(inputHours) {
            var daysOfTheWeek = {
                SS: ['saturdays', 'saturday', 'satur', 'sat', 'sa'],
                UU: ['sundays', 'sunday', 'sun', 'su'],
                MM: ['mondays', 'monday', 'mondy', 'mon', 'mo'],
                TT: ['tuesdays', 'tuesday', 'tues', 'tue', 'tu'],
                WW: ['wednesdays', 'wednesday', 'weds', 'wed', 'we'],
                RR: ['thursdays', 'thursday', 'thurs', 'thur', 'thu', 'th'],
                FF: ['fridays', 'friday', 'fri', 'fr']
            };
            var monthsOfTheYear = {
                JAN: ['january', 'jan'],
                FEB: ['february', 'febr', 'feb'],
                MAR: ['march', 'mar'],
                APR: ['april', 'apr'],
                MAY: ['may', 'may'],
                JUN: ['june', 'jun'],
                JUL: ['july', 'jul'],
                AUG: ['august', 'aug'],
                SEP: ['september', 'sept', 'sep'],
                OCT: ['october', 'oct'],
                NOV: ['november', 'nov'],
                DEC: ['december', 'dec']
            };
            var dayCodeVec = ['MM','TT','WW','RR','FF','SS','UU','MM','TT','WW','RR','FF','SS','UU','MM','TT','WW','RR','FF'];
            var tfHourTemp, tfDaysTemp, newDayCodeVec = [];
            var tempRegex, twix, tsix;
            var inputHoursParse = inputHours.toLowerCase();
            inputHoursParse = inputHoursParse.replace(/paste hours here/i, "");  // make sure something is pasted
            phlogdev(inputHoursParse);
            inputHoursParse = inputHoursParse.replace(/can\'t parse\, try again/i, "");  // make sure something is pasted
            if (inputHoursParse === '' || inputHoursParse === ',') {
                phlogdev('No hours');
                return false;
            }
            inputHoursParse = inputHoursParse.replace(/\u2013|\u2014/g, "-");  // long dash replacing
            inputHoursParse = inputHoursParse.replace(/[^a-z0-9\:\-\. ~]/g, ' ');  // replace unnecessary characters with spaces
            inputHoursParse = inputHoursParse.replace(/\:{2,}/g, ':');  // remove extra colons
            inputHoursParse = inputHoursParse.replace(/closed/g, '99:99-99:99').replace(/not open/g, '99:99-99:99');  // parse 'closed'
            inputHoursParse = inputHoursParse.replace(/by appointment only/g, '99:99-99:99').replace(/by appointment/g, '99:99-99:99');  // parse 'appointment only'
            inputHoursParse = inputHoursParse.replace(/weekdays/g, 'mon-fri').replace(/weekends/g, 'sat-sun');  // convert weekdays and weekends to days
            inputHoursParse = inputHoursParse.replace(/12:00 noon/g, "12:00").replace(/12:00 midnight/g, "00:00");  // replace 'noon', 'midnight'
            inputHoursParse = inputHoursParse.replace(/12 noon/g, "12:00").replace(/12 midnight/g, "00:00");  // replace 'noon', 'midnight'
            inputHoursParse = inputHoursParse.replace(/noon/g, "12:00").replace(/midnight/g, "00:00");  // replace 'noon', 'midnight'
            inputHoursParse = inputHoursParse.replace(/every day/g, "mon-sun");  // replace 'seven days a week'
            inputHoursParse = inputHoursParse.replace(/seven days a week/g, "mon-sun");  // replace 'seven days a week'
            inputHoursParse = inputHoursParse.replace(/7 days a week/g, "mon-sun");  // replace 'seven days a week'
            inputHoursParse = inputHoursParse.replace(/daily/g, "mon-sun");  // replace 'open daily'
            inputHoursParse = inputHoursParse.replace(/open 24 ?ho?u?rs?/g, "00:00-00:00");  // replace 'open 24 hour or similar'
            inputHoursParse = inputHoursParse.replace(/open twenty\-? ?four ho?u?rs?/g, "00:00-00:00");  // replace 'open 24 hour or similar'
            inputHoursParse = inputHoursParse.replace(/24 ?ho?u?rs?/g, "00:00-00:00");  // replace 'open 24 hour or similar'
            inputHoursParse = inputHoursParse.replace(/twenty\-? ?four ho?u?rs?/g, "00:00-00:00");  // replace 'open 24 hour or similar'
            inputHoursParse = inputHoursParse.replace(/(\D:)([^ ])/g, "$1 $2");  // space after colons after words
            // replace thru type words with dashes
            var thruWords = 'through|thru|to|until|till|til|-|~'.split("|");
            for (twix=0; twix<thruWords.length; twix++) {
                tempRegex = new RegExp(thruWords[twix], "g");
                inputHoursParse = inputHoursParse.replace(tempRegex,'-');
            }
            inputHoursParse = inputHoursParse.replace(/\-{2,}/g, "-");  // replace any duplicate dashes
            phlogdev('Initial parse: ' + inputHoursParse);

            // kill extra words
            var killWords = 'paste|here|business|operation|times|time|walk-ins|walk ins|welcome|dinner|lunch|brunch|breakfast|regular|weekday|weekend|opening|open|now|from|hours|hour|our|are|EST|and|&'.split("|");
            for (twix=0; twix<killWords.length; twix++) {
                tempRegex = new RegExp('\\b'+killWords[twix]+'\\b', "g");
                inputHoursParse = inputHoursParse.replace(tempRegex,'');
            }
            phlogdev('After kill terms: ' + inputHoursParse);

            // replace day terms with double caps
            for (var dayKey in daysOfTheWeek) {
                if (daysOfTheWeek.hasOwnProperty(dayKey)) {
                    var tempDayList = daysOfTheWeek[dayKey];
                    for (var tdix=0; tdix<tempDayList.length; tdix++) {
                        tempRegex = new RegExp(tempDayList[tdix]+'(?!a-z)', "g");
                        inputHoursParse = inputHoursParse.replace(tempRegex,dayKey);
                    }
                }
            }
            phlogdev('Replace day terms: ' + inputHoursParse);

            // Replace dates
            for (var monthKey in monthsOfTheYear) {
                if (monthsOfTheYear.hasOwnProperty(monthKey)) {
                    var tempMonthList = monthsOfTheYear[monthKey];
                    for (var tmix=0; tmix<tempMonthList.length; tmix++) {
                        tempRegex = new RegExp(tempMonthList[tmix]+'\\.? ?\\d{1,2}\\,? ?201\\d{1}', "g");
                        inputHoursParse = inputHoursParse.replace(tempRegex,' ');
                        tempRegex = new RegExp(tempMonthList[tmix]+'\\.? ?\\d{1,2}', "g");
                        inputHoursParse = inputHoursParse.replace(tempRegex,' ');
                    }
                }
            }
            phlogdev('Replace month terms: ' + inputHoursParse);

            // replace any periods between hours with colons
            inputHoursParse = inputHoursParse.replace(/(\d{1,2})\.(\d{2})/g, '$1:$2');
            // remove remaining periods
            inputHoursParse = inputHoursParse.replace(/\./g, '');
            // remove any non-hour colons between letters and numbers and on string ends
            inputHoursParse = inputHoursParse.replace(/(\D+)\:(\D+)/g, '$1 $2').replace(/^ *\:/g, ' ').replace(/\: *$/g, ' ');
            // replace am/pm with AA/PP
            inputHoursParse = inputHoursParse.replace(/ *pm/g,'PP').replace(/ *am/g,'AA');
            inputHoursParse = inputHoursParse.replace(/ *p\.m\./g,'PP').replace(/ *a\.m\./g,'AA');
            inputHoursParse = inputHoursParse.replace(/ *p\.m/g,'PP').replace(/ *a\.m/g,'AA');
            inputHoursParse = inputHoursParse.replace(/ *p/g,'PP').replace(/ *a/g,'AA');
            // tighten up dashes
            inputHoursParse = inputHoursParse.replace(/\- {1,}/g,'-').replace(/ {1,}\-/g,'-');
            inputHoursParse = inputHoursParse.replace(/^(00:00-00:00)$/g,'MM-UU$1');
            phlogdev('AMPM parse: ' + inputHoursParse);

            //  Change all MTWRFSU to doubles, if any other letters return false
            if (inputHoursParse.match(/[bcdeghijklnoqvxyz]/g) !== null) {
                phlogdev('Extra words in the string');
                return false;
            } else {
                inputHoursParse = inputHoursParse.replace(/m/g,'MM').replace(/t/g,'TT').replace(/w/g,'WW').replace(/r/g,'RR');
                inputHoursParse = inputHoursParse.replace(/f/g,'FF').replace(/s/g,'SS').replace(/u/g,'UU');
            }
            phlogdev('MM/TT format: ' + inputHoursParse);

            // tighten up spaces
            inputHoursParse = inputHoursParse.replace(/ {2,}/g,' ');
            inputHoursParse = inputHoursParse.replace(/ {1,}AA/g,'AA');
            inputHoursParse = inputHoursParse.replace(/ {1,}PP/g,'PP');
            // Expand hours into XX:XX format
            for (var asdf=0; asdf<5; asdf++) {  // repeat a few times to catch any skipped regex matches
                inputHoursParse = inputHoursParse.replace(/([^0-9\:])(\d{1})([^0-9\:])/g, '$10$2:00$3');
                inputHoursParse = inputHoursParse.replace(/^(\d{1})([^0-9\:])/g, '0$1:00$2');
                inputHoursParse = inputHoursParse.replace(/([^0-9\:])(\d{1})$/g, '$10$2:00');

                inputHoursParse = inputHoursParse.replace(/([^0-9\:])(\d{2})([^0-9\:])/g, '$1$2:00$3');
                inputHoursParse = inputHoursParse.replace(/^(\d{2})([^0-9\:])/g, '$1:00$2');
                inputHoursParse = inputHoursParse.replace(/([^0-9\:])(\d{2})$/g, '$1$2:00');

                inputHoursParse = inputHoursParse.replace(/(\D)(\d{1})(\d{2}\D)/g, '$10$2:$3');
                inputHoursParse = inputHoursParse.replace(/^(\d{1})(\d{2}\D)/g, '0$1:$2');
                inputHoursParse = inputHoursParse.replace(/(\D)(\d{1})(\d{2})$/g, '$10$2:$3');

                inputHoursParse = inputHoursParse.replace(/(\D\d{2})(\d{2}\D)/g, '$1:$2');
                inputHoursParse = inputHoursParse.replace(/^(\d{2})(\d{2}\D)/g, '$1:$2');
                inputHoursParse = inputHoursParse.replace(/(\D\d{2})(\d{2})$/g, '$1:$2');

                inputHoursParse = inputHoursParse.replace(/(\D)(\d{1}\:)/g, '$10$2');
                inputHoursParse = inputHoursParse.replace(/^(\d{1}\:)/g, '0$1');
            }

            // replace 12AM range with 00
            inputHoursParse = inputHoursParse.replace( /12(\:\d{2}AA)/g, '00$1');
            // Change PM hours to 24hr time
            while (inputHoursParse.match(/\d{2}\:\d{2}PP/) !== null) {
                tfHourTemp = inputHoursParse.match(/(\d{2})\:\d{2}PP/)[1];
                tfHourTemp = parseInt(tfHourTemp) % 12 + 12;
                inputHoursParse = inputHoursParse.replace(/\d{2}(\:\d{2})PP/,tfHourTemp.toString()+'$1');
            }
            // kill the AA
            inputHoursParse = inputHoursParse.replace( /AA/g, '');
            phlogdev('XX:XX format: ' + inputHoursParse);

            // Side check for tabular input
            var inputHoursParseTab = inputHoursParse.replace( /[^A-Z0-9\:-]/g, ' ').replace( / {2,}/g, ' ');
            inputHoursParseTab = inputHoursParseTab.replace( /^ +/g, '').replace( / {1,}$/g, '');
            if (inputHoursParseTab.match(/[A-Z]{2}\:?\-? [A-Z]{2}\:?\-? [A-Z]{2}\:?\-? [A-Z]{2}\:?\-? [A-Z]{2}\:?\-?/g) !== null) {
                inputHoursParseTab = inputHoursParseTab.split(' ');
                var reorderThree = [0,7,14,1,8,15,2,9,16,3,10,17,4,11,18,5,12,19,6,13,20];
                var reorderTwo = [0,7,1,8,2,9,3,10,4,11,5,12,6,13];
                var inputHoursParseReorder = [], reix;
                if (inputHoursParseTab.length === 21) {
                    for (reix=0; reix<21; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderThree[reix]]);
                    }
                } else if (inputHoursParseTab.length === 18) {
                    for (reix=0; reix<18; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderThree[reix]]);
                    }
                } else if (inputHoursParseTab.length === 15) {
                    for (reix=0; reix<15; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderThree[reix]]);
                    }
                } else if (inputHoursParseTab.length === 14) {
                    for (reix=0; reix<14; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderTwo[reix]]);
                    }
                } else if (inputHoursParseTab.length === 12) {
                    for (reix=0; reix<12; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderTwo[reix]]);
                    }
                } else if (inputHoursParseTab.length === 10) {
                    for (reix=0; reix<10; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderTwo[reix]]);
                    }
                }
                //phlogdev('inputHoursParseTab: ' + inputHoursParseTab);
                phlogdev('inputHoursParseReorder: ' + inputHoursParseReorder);
                if (inputHoursParseReorder.length > 9) {
                    inputHoursParseReorder = inputHoursParseReorder.join(' ');
                    inputHoursParseReorder = inputHoursParseReorder.replace(/(\:\d{2}) (\d{2}\:)/g, '$1-$2');
                    inputHoursParse = inputHoursParseReorder;
                }

            }


            // remove colons after Days field
            inputHoursParse = inputHoursParse.replace(/(\D+)\:/g, '$1 ');

            // Find any double sets
            inputHoursParse = inputHoursParse.replace(/([A-Z \-]{2,}) *(\d{2}\:\d{2} *\-{1} *\d{2}\:\d{2}) *(\d{2}\:\d{2} *\-{1} *\d{2}\:\d{2})/g, '$1$2$1$3');
            inputHoursParse = inputHoursParse.replace(/(\d{2}\:\d{2}) *(\d{2}\:\d{2})/g, '$1-$2');
            phlogdev('Add dash: ' + inputHoursParse);

            // remove all spaces
            inputHoursParse = inputHoursParse.replace( / */g, '');

            // Remove any dashes acting as Day separators for 3+ days ("M-W-F")
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5$6$7');
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5$6');
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5');
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4');
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3');

            // parse any 'through' type terms on the day ranges (MM-RR --> MMTTWWRR)
            while (inputHoursParse.match(/[A-Z]{2}\-[A-Z]{2}/) !== null) {
                tfDaysTemp = inputHoursParse.match(/([A-Z]{2})\-([A-Z]{2})/);
                var startDayIX = dayCodeVec.indexOf(tfDaysTemp[1]);
                newDayCodeVec = [tfDaysTemp[1]];
                for (var dcvix=startDayIX+1; dcvix<startDayIX+7; dcvix++) {
                    newDayCodeVec.push(dayCodeVec[dcvix]);
                    if (tfDaysTemp[2] === dayCodeVec[dcvix]) {
                        break;
                    }
                }
                newDayCodeVec = newDayCodeVec.join('');
                inputHoursParse = inputHoursParse.replace(/[A-Z]{2}\-[A-Z]{2}/,newDayCodeVec);
            }

            // split the string between numerical and letter characters
            inputHoursParse = inputHoursParse.replace(/([A-Z])\-?\:?([0-9])/g,'$1|$2');
            inputHoursParse = inputHoursParse.replace(/([0-9])\-?\:?([A-Z])/g,'$1|$2');
            inputHoursParse = inputHoursParse.replace(/(\d{2}\:\d{2})\:00/g,'$1');  // remove seconds
            inputHoursParse = inputHoursParse.split("|");
            phlogdev('Split: ' + inputHoursParse);

            var daysVec = [], hoursVec = [];
            for (tsix=0; tsix<inputHoursParse.length; tsix++) {
                if (inputHoursParse[tsix][0].match(/[A-Z]/) !== null) {
                    daysVec.push(inputHoursParse[tsix]);
                } else if (inputHoursParse[tsix][0].match(/[0-9]/) !== null) {
                    hoursVec.push(inputHoursParse[tsix]);
                } else {
                    phlogdev('Filtering error');
                    return false;
                }
            }

            // check that the dayArray and hourArray lengths correspond
            if ( daysVec.length !== hoursVec.length ) {
                phlogdev('Hour and Day arrays are not matched');
                return false;
            }

            // Combine days with the same hours in the same vector
            var newDaysVec = [], newHoursVec = [], hrsIX;
            for (tsix=0; tsix<daysVec.length; tsix++) {
                if (hoursVec[tsix] !== '99:99-99:99') {  // Don't add the closed days
                    hrsIX = newHoursVec.indexOf(hoursVec[tsix]);
                    if (hrsIX > -1) {
                        newDaysVec[hrsIX] = newDaysVec[hrsIX] + daysVec[tsix];
                    } else {
                        newDaysVec.push(daysVec[tsix]);
                        newHoursVec.push(hoursVec[tsix]);
                    }
                }
            }

            var hoursObjectArray = [], hoursObjectArrayMinDay = [], hoursObjectArraySorted = [], hoursObjectAdd, daysObjArray, toFromSplit;
            for (tsix=0; tsix<newDaysVec.length; tsix++) {
                hoursObjectAdd = {};
                daysObjArray = [];
                toFromSplit = newHoursVec[tsix].match(/(\d{2}\:\d{2})\-(\d{2}\:\d{2})/);
                if (toFromSplit === null) {
                    phlogdev('Hours in wrong format');
                    return false;
                } else {  // Check for hours outside of 0-23 and 0-59
                    var hourCheck = toFromSplit[1].match(/(\d{2})\:/)[1];
                    if (hourCheck>23 || hourCheck < 0) {
                        phlogdev('Not a valid time');
                        return false;
                    }
                    hourCheck = toFromSplit[2].match(/(\d{2})\:/)[1];
                    if (hourCheck>23 || hourCheck < 0) {
                        phlogdev('Not a valid time');
                        return false;
                    }
                    hourCheck = toFromSplit[1].match(/\:(\d{2})/)[1];
                    if (hourCheck>59 || hourCheck < 0) {
                        phlogdev('Not a valid time');
                        return false;
                    }
                    hourCheck = toFromSplit[2].match(/\:(\d{2})/)[1];
                    if (hourCheck>59 || hourCheck < 0) {
                        phlogdev('Not a valid time');
                        return false;
                    }
                }
                // Make the days object
                if ( newDaysVec[tsix].indexOf('MM') > -1 ) {
                    daysObjArray.push(1);
                }
                if ( newDaysVec[tsix].indexOf('TT') > -1 ) {
                    daysObjArray.push(2);
                }
                if ( newDaysVec[tsix].indexOf('WW') > -1 ) {
                    daysObjArray.push(3);
                }
                if ( newDaysVec[tsix].indexOf('RR') > -1 ) {
                    daysObjArray.push(4);
                }
                if ( newDaysVec[tsix].indexOf('FF') > -1 ) {
                    daysObjArray.push(5);
                }
                if ( newDaysVec[tsix].indexOf('SS') > -1 ) {
                    daysObjArray.push(6);
                }
                if ( newDaysVec[tsix].indexOf('UU') > -1 ) {
                    daysObjArray.push(0);
                }
                // build the hours object
                hoursObjectAdd.fromHour = toFromSplit[1];
                hoursObjectAdd.toHour = toFromSplit[2];
                hoursObjectAdd.days = daysObjArray.sort();
                hoursObjectArray.push(hoursObjectAdd);
                // track the order
                if (hoursObjectAdd.days.length > 1 && hoursObjectAdd.days[0] === 0) {
                    hoursObjectArrayMinDay.push( hoursObjectAdd.days[1] * 100 + parseInt(toFromSplit[1][0])*10 + parseInt(toFromSplit[1][1]) );
                } else {
                    hoursObjectArrayMinDay.push( (((hoursObjectAdd.days[0]+6)%7)+1) * 100 + parseInt(toFromSplit[1][0])*10 + parseInt(toFromSplit[1][1]) );
                }
            }
            sortWithIndex(hoursObjectArrayMinDay);
            for (var hoaix=0; hoaix < hoursObjectArrayMinDay.length; hoaix++) {
                hoursObjectArraySorted.push(hoursObjectArray[hoursObjectArrayMinDay.sortIndices[hoaix]]);
            }
            if ( !checkHours(hoursObjectArraySorted) ) {
                phlogdev('Overlapping hours');
                return false;
            } else {
                for ( var ohix=0; ohix<hoursObjectArraySorted.length; ohix++ ) {
                    phlogdev(hoursObjectArraySorted[ohix]);
                    if ( hoursObjectArraySorted[ohix].days.length === 2 && hoursObjectArraySorted[ohix].days[0] === 0 && hoursObjectArraySorted[ohix].days[1] === 1) {
                        // separate hours
                        phlogdev('Splitting M-S entry...');
                        hoursObjectArraySorted.push({days: [0], fromHour: hoursObjectArraySorted[ohix].fromHour, toHour: hoursObjectArraySorted[ohix].toHour});
                        hoursObjectArraySorted[ohix].days = [1];
                    }
                }
            }
            return hoursObjectArraySorted;
        }

        // function to check overlapping hours
        function checkHours(hoursObj) {
            if (hoursObj.length === 1) {
                return true;
            }
            var daysObj, fromHourTemp, toHourTemp;
            for (var day2Ch=0; day2Ch<7; day2Ch++) {  // Go thru each day of the week
                daysObj = [];
                for ( var hourSet = 0; hourSet < hoursObj.length; hourSet++ ) {  // For each set of hours
                    if (hoursObj[hourSet].days.indexOf(day2Ch) > -1) {  // pull out hours that are for the current day, add 2400 if it goes past midnight, and store
                        fromHourTemp = hoursObj[hourSet].fromHour.replace(/\:/g,'');
                        toHourTemp = hoursObj[hourSet].toHour.replace(/\:/g,'');
                        if (toHourTemp < fromHourTemp) {
                            toHourTemp = parseInt(toHourTemp) + 2400;
                        }
                        daysObj.push([fromHourTemp, toHourTemp]);
                    }
                }
                if (daysObj.length > 1) {  // If there's multiple hours for the day, check them for overlap
                    for ( var hourSetCheck2 = 1; hourSetCheck2 < daysObj.length; hourSetCheck2++ ) {
                        for ( var hourSetCheck1 = 0; hourSetCheck1 < hourSetCheck2; hourSetCheck1++ ) {
                            if ( daysObj[hourSetCheck2][0] > daysObj[hourSetCheck1][0] && daysObj[hourSetCheck2][0] < daysObj[hourSetCheck1][1] ) {
                                return false;
                            }
                            if ( daysObj[hourSetCheck2][1] > daysObj[hourSetCheck1][0] && daysObj[hourSetCheck2][1] < daysObj[hourSetCheck1][1] ) {
                                return false;
                            }
                        }
                    }
                }
            }
            return true;
        }

        // Duplicate place finder  ###bmtg
        function findNearbyDuplicate(itemName, itemAliases, item, recenterOption) {
            dupeIDList = [item.attributes.id];
            dupeHNRangeList = [];
            dupeHNRangeIDList = [];
            dupeHNRangeDistList = [];
            var venueList = W.model.venues.objects, currNameList = [], testNameList = [], testVenueAtt, testName, testNameNoNum, itemNameRF, aliasNameRF, aliasNameNoNum;
            var t0, t1, wlDupeMatch = false, wlDupeList = [], nameMatch = false, altNameMatch = -1, aliix, cnlix, tnlix, randInt = 100;
            var outOfExtent = false, mapExtent = W.map.getExtent(), padFrac = 0.15;  // how much to pad the zoomed window
            // Initialize the cooridnate extents for duplicates
            var minLon = item.geometry.getCentroid().x, minLat = item.geometry.getCentroid().y;
            var maxLon = minLon, maxLat = minLat;
            // genericterms to skip if it's all that remains after stripping numbers
            var noNumSkip = 'BANK|ATM|HOTEL|MOTEL|STORE|MARKET|SUPERMARKET|GYM|GAS|GASOLINE|GASSTATION|CAFE|OFFICE|OFFICES|CARRENTAL|RENTALCAR|RENTAL|SALON|BAR|BUILDING|LOT';
            noNumSkip = noNumSkip + '|'+ collegeAbbreviations;
            noNumSkip = noNumSkip.split('|');
            // Make the padded extent
            mapExtent.left = mapExtent.left + padFrac * (mapExtent.right-mapExtent.left);
            mapExtent.right = mapExtent.right - padFrac * (mapExtent.right-mapExtent.left);
            mapExtent.bottom = mapExtent.bottom + padFrac * (mapExtent.top-mapExtent.bottom);
            mapExtent.top = mapExtent.top - padFrac * (mapExtent.top-mapExtent.bottom);

            var allowedTwoLetters = ['BP','DQ','BK','BW','LQ','QT','DB','PO'];

            var labelFeatures = [], dupeNames = [], labelText, labelTextReformat, pt, textFeature, labelColorIX = 0;
            var labelColorList = ['#3F3'];
            // Name formatting for the WME place name
            itemNameRF = itemName.toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');  // Format name
            if ( itemNameRF.length>2 || allowedTwoLetters.indexOf(itemNameRF) > -1 ) {
                currNameList.push(itemNameRF);
            } else {
                currNameList.push('PRIMNAMETOOSHORT_PJZWX');
            }
            var itemNameNoNum = itemNameRF.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )
            if ( ((itemNameNoNum.length>2 && noNumSkip.indexOf(itemNameNoNum) === -1) || allowedTwoLetters.indexOf(itemNameNoNum) > -1) && item.attributes.categories.indexOf('PARKING_LOT') === -1 ) {  //  only add de-numbered name if anything remains
                currNameList.push(itemNameNoNum);
            }
            if (itemAliases.length > 0) {
                for (aliix=0; aliix<itemAliases.length; aliix++) {
                    aliasNameRF = itemAliases[aliix].toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');  // Format name
                    if ( (aliasNameRF.length>2 && noNumSkip.indexOf(aliasNameRF) === -1) || allowedTwoLetters.indexOf(aliasNameRF) > -1 ) {  //  only add de-numbered name if anything remains
                        currNameList.push(aliasNameRF);
                    }
                    aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )
                    if ( ((aliasNameNoNum.length>2 && noNumSkip.indexOf(aliasNameNoNum) === -1) || allowedTwoLetters.indexOf(aliasNameNoNum) > -1) && item.attributes.categories.indexOf('PARKING_LOT') === -1 ) {  //  only add de-numbered name if anything remains
                        currNameList.push(aliasNameNoNum);
                    }
                }
            }
            currNameList = uniq(currNameList);  //  remove duplicates

            // Remove any previous search labels and move the layer above the places layer
            WMEPH_NameLayer.destroyFeatures();
            var vecLyrPlaces = W.map.getLayersBy("uniqueName","landmarks")[0];
            WMEPH_NameLayer.setZIndex(parseInt(vecLyrPlaces.getZIndex())+3);  // Move layer to just on top of Places layer

            if ( venueWhitelist.hasOwnProperty(item.attributes.id) ) {
                if ( venueWhitelist[item.attributes.id].hasOwnProperty('dupeWL') ) {
                    wlDupeList = venueWhitelist[item.attributes.id].dupeWL;
                }
            }

            if (devUser) {
                t0 = performance.now();  // Speed check start
            }
            var numVenues = 0, overlappingFlag = false;
            var addrItem = item.getAddress(), itemCompAddr = false;
            if ( addrItem.hasOwnProperty('attributes') ) {
                addrItem = addrItem.attributes;
            }
            if (addrItem.street !== null && addrItem.street.name !== null && item.attributes.houseNumber && item.attributes.houseNumber.match(/\d/g) !== null) {
                itemCompAddr = true;
            }

            for (var venix in venueList) {  // for each place on the map:
                if (venueList.hasOwnProperty(venix)) {  // hOP filter
                    numVenues++;
                    nameMatch = false;
                    altNameMatch = -1;
                    testVenueAtt = venueList[venix].attributes;
                    var excludePLADupes = $('#WMEPH-ExcludePLADupes' + devVersStr).prop('checked');
                    if ((!excludePLADupes || (excludePLADupes && !(isPLA(item) || isPLA(venueList[venix])))) && !isEmergencyRoom(venueList[venix])) {

                        var pt2ptDistance =  item.geometry.getCentroid().distanceTo(venueList[venix].geometry.getCentroid());
                        if ( item.isPoint() && venueList[venix].isPoint() && pt2ptDistance < 2 && item.attributes.id !== testVenueAtt.id ) {
                            overlappingFlag = true;
                        }
                        wlDupeMatch = false;
                        if (wlDupeList.length>0 && wlDupeList.indexOf(testVenueAtt.id) > -1) {
                            wlDupeMatch = true;
                        }

                        // get HNs for places on same street
                        var addrDupe = venueList[venix].getAddress();
                        if ( addrDupe.hasOwnProperty('attributes') ) {
                            addrDupe = addrDupe.attributes;
                        }
                        if (itemCompAddr && addrDupe.street !== null && addrDupe.street.name !== null && testVenueAtt.houseNumber && testVenueAtt.houseNumber !== '' &&
                            venix !== item.attributes.id && addrItem.street.name === addrDupe.street.name && testVenueAtt.houseNumber < 1000000) {
                            dupeHNRangeList.push(parseInt(testVenueAtt.houseNumber));
                            dupeHNRangeIDList.push(testVenueAtt.id);
                            dupeHNRangeDistList.push(pt2ptDistance);
                        }


                        // Check for duplicates
                        if ( !wlDupeMatch && dupeIDList.length<6 && pt2ptDistance < 800 && !testVenueAtt.residential && venix !== item.attributes.id && 'string' === typeof testVenueAtt.id && testVenueAtt.name !== null && testVenueAtt.name.length>1 ) {  // don't do res, the point itself, new points or no name
                            // If item has a complete address and test venue does, and they are different, then no dupe
                            var suppressMatch = false;
                            if ( itemCompAddr && addrDupe.street !== null && addrDupe.street.name !== null && testVenueAtt.houseNumber && testVenueAtt.houseNumber.match(/\d/g) !== null ) {
                                if ( item.attributes.lockRank > 0 && testVenueAtt.lockRank > 0 ) {
                                    if ( item.attributes.houseNumber !== testVenueAtt.houseNumber || addrItem.street.name !== addrDupe.street.name ) {
                                        suppressMatch = true;
                                    }
                                } else {
                                    if ( item.attributes.houseNumber !== testVenueAtt.houseNumber && addrItem.street.name !== addrDupe.street.name ) {
                                        suppressMatch = true;
                                    }
                                }
                            }


                            if ( !suppressMatch ) {
                                //Reformat the testPlace name
                                testName = testVenueAtt.name.toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');  // Format test name
                                if (  (testName.length>2 && noNumSkip.indexOf(testName) === -1) || allowedTwoLetters.indexOf(testName) > -1  ) {
                                    testNameList = [testName];
                                } else {
                                    testNameList = ['TESTNAMETOOSHORTQZJXS'+randInt];
                                    randInt++;
                                }

                                testNameNoNum = testName.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match
                                if ( ((testNameNoNum.length>2 && noNumSkip.indexOf(testNameNoNum) === -1) || allowedTwoLetters.indexOf(testNameNoNum) > -1) && testVenueAtt.categories.indexOf('PARKING_LOT') === -1 ) {  //  only add de-numbered name if at least 2 chars remain
                                    testNameList.push(testNameNoNum);
                                }
                                // primary name matching loop

                                for (tnlix=0; tnlix < testNameList.length; tnlix++) {
                                    for (cnlix=0; cnlix < currNameList.length; cnlix++) {
                                        if ( (testNameList[tnlix].indexOf(currNameList[cnlix]) > -1 || currNameList[cnlix].indexOf(testNameList[tnlix]) > -1) ) {
                                            nameMatch = true;
                                            break;
                                        }
                                    }
                                    if (nameMatch) {break;}  // break if a match found
                                }
                                if (!nameMatch && testVenueAtt.aliases.length > 0) {
                                    for (aliix=0; aliix<testVenueAtt.aliases.length; aliix++) {
                                        aliasNameRF = testVenueAtt.aliases[aliix].toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');  // Format name
                                        if ( (aliasNameRF.length>2 && noNumSkip.indexOf(aliasNameRF) === -1) || allowedTwoLetters.indexOf(aliasNameRF) > -1  ) {
                                            testNameList = [aliasNameRF];
                                        } else {
                                            testNameList = ['ALIASNAMETOOSHORTQOFUH'+randInt];
                                            randInt++;
                                        }
                                        aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )
                                        if (((aliasNameNoNum.length>2 && noNumSkip.indexOf(aliasNameNoNum) === -1) || allowedTwoLetters.indexOf(aliasNameNoNum) > -1) && testVenueAtt.categories.indexOf('PARKING_LOT') === -1) {  //  only add de-numbered name if at least 2 characters remain
                                            testNameList.push(aliasNameNoNum);
                                        } else {
                                            testNameList.push('111231643239'+randInt);  //  just to keep track of the alias in question, always add something.
                                            randInt++;
                                        }
                                    }
                                    for (tnlix=0; tnlix < testNameList.length; tnlix++) {
                                        for (cnlix=0; cnlix < currNameList.length; cnlix++) {
                                            if ( (testNameList[tnlix].indexOf(currNameList[cnlix]) > -1 || currNameList[cnlix].indexOf(testNameList[tnlix]) > -1) ) {
                                                // get index of that match (half of the array index with floor)
                                                altNameMatch = Math.floor(tnlix/2);
                                                break;
                                            }
                                        }
                                        if (altNameMatch > -1) {break;}  // break from the rest of the alts if a match found
                                    }
                                }
                                // If a match was found:
                                if ( nameMatch || altNameMatch > -1 ) {
                                    dupeIDList.push(testVenueAtt.id);  // Add the item to the list of matches
                                    WMEPH_NameLayer.setVisibility(true);  // If anything found, make visible the dupe layer
                                    if (nameMatch) {
                                        labelText = testVenueAtt.name;  // Pull duplicate name
                                    } else {
                                        labelText = testVenueAtt.aliases[altNameMatch] + ' (Alt)';  // Pull duplicate alt name
                                    }
                                    phlogdev('Possible duplicate found. WME place: ' + itemName + ' / Nearby place: ' + labelText);

                                    // Reformat the name into multiple lines based on length
                                    var startIX=0, endIX=0, labelTextBuild = [], maxLettersPerLine = Math.round(2*Math.sqrt(labelText.replace(/ /g,'').length/2));
                                    maxLettersPerLine = Math.max(maxLettersPerLine,4);
                                    while (endIX !== -1) {
                                        endIX = labelText.indexOf(' ', endIX+1);
                                        if (endIX - startIX > maxLettersPerLine) {
                                            labelTextBuild.push( labelText.substr(startIX,endIX-startIX) );
                                            startIX = endIX+1;
                                        }
                                    }
                                    labelTextBuild.push( labelText.substr(startIX) );  // Add last line
                                    labelTextReformat = labelTextBuild.join('\n');
                                    // Add photo icons
                                    if (testVenueAtt.images.length > 0 ) {
                                        labelTextReformat = labelTextReformat + ' ';
                                        for (var phix=0; phix<testVenueAtt.images.length; phix++) {
                                            if (phix===3) {
                                                labelTextReformat = labelTextReformat + '+';
                                                break;
                                            }
                                            //labelTextReformat = labelTextReformat + '\u25A3';  // add photo icons
                                            labelTextReformat = labelTextReformat + '\u25A3';  // add photo icons
                                        }
                                    }

                                    pt = venueList[venix].geometry.getCentroid();
                                    if ( !mapExtent.containsLonLat(pt.toLonLat()) ) {
                                        outOfExtent = true;
                                    }
                                    minLat = Math.min(minLat, pt.y); minLon = Math.min(minLon, pt.x);
                                    maxLat = Math.max(maxLat, pt.y); maxLon = Math.max(maxLon, pt.x);

                                    textFeature = new OpenLayers.Feature.Vector( pt, {labelText: labelTextReformat, fontColor: '#fff',
                                                                                      strokeColor: labelColorList[labelColorIX%labelColorList.length], labelAlign: 'cm', pointRadius: 25 , dupeID: testVenueAtt.id } );
                                    labelFeatures.push(textFeature);
                                    //WMEPH_NameLayer.addFeatures(labelFeatures);
                                    dupeNames.push(labelText);
                                }
                                labelColorIX++;
                            }
                        }
                    }
                }
            }
            // Add a marker for the working place point if any dupes were found
            //phlogdev('dupeIDList: ' + dupeIDList);
            if (dupeIDList.length>1) {
                pt = item.geometry.getCentroid();
                if ( !mapExtent.containsLonLat(pt.toLonLat()) ) {
                    outOfExtent = true;
                }
                minLat = Math.min(minLat, pt.y); minLon = Math.min(minLon, pt.x);
                maxLat = Math.max(maxLat, pt.y); maxLon = Math.max(maxLon, pt.x);
                // Add photo icons
                var currentLabel = 'Current';
                if (item.attributes.images.length > 0 ) {
                    for (var ciix=0; ciix<item.attributes.images.length; ciix++) {
                        currentLabel = currentLabel + ' ';
                        if (ciix===3) {
                            currentLabel = currentLabel + '+';
                            break;
                        }
                        currentLabel = currentLabel + '\u25A3';  // add photo icons
                    }
                }
                textFeature = new OpenLayers.Feature.Vector( pt, {labelText: currentLabel, fontColor: '#fff', strokeColor: '#fff', labelAlign: 'cm', pointRadius: 25 , dupeID: item.attributes.id} );
                labelFeatures.push(textFeature);
                WMEPH_NameLayer.addFeatures(labelFeatures);
            }
            if (devUser) {
                t1 = performance.now();  // log search time
                //phlogdev("Ran dupe search on " + numVenues + " nearby venues in " + (t1 - t0) + " milliseconds.");
            }
            if (recenterOption && dupeNames.length>0 && outOfExtent) {  // then rebuild the extent to include the duplicate
                var padMult = 1.0;
                mapExtent.left = minLon - (padFrac*padMult) * (maxLon-minLon);
                mapExtent.right = maxLon + (padFrac*padMult) * (maxLon-minLon);
                mapExtent.bottom = minLat - (padFrac*padMult) * (maxLat-minLat);
                mapExtent.top = maxLat + (padFrac*padMult) * (maxLat-minLat);
                W.map.zoomToExtent(mapExtent);
            }
            return [dupeNames, overlappingFlag];
        }  // END Dupefinder function

        // On selection of new item:
        function checkSelection() {
            if (W.selectionManager.selectedItems.length > 0) {
                var newItem = W.selectionManager.selectedItems[0].model;
                if (newItem.type === "venue") {
                    displayRunButton();
                    getPanelFields();
                    if ( $("#WMEPH-EnableCloneMode" + devVersStr).prop('checked') ) {
                        displayCloneButton();
                    }
                    if (localStorage.getItem("WMEPH-AutoRunOnSelect" + devVersStr) === '1') {
                        setTimeout(harmonizePlace,200);
                    }
                    for (var dvtix=0; dvtix<dupeIDList.length; dvtix++) {
                        if (newItem.attributes.id === dupeIDList[dvtix]) {  // If the user selects a place in the dupe list, don't clear the labels yet
                            return;
                        }
                    }
                }
                // If the selection is anything else, clear the labels
                WMEPH_NameLayer.destroyFeatures();
                WMEPH_NameLayer.setVisibility(false);
            }
        }  // END checkSelection function

        // Functions to infer address from nearby segments
        function WMEPH_inferAddress(MAX_RECURSION_DEPTH) {
            'use strict';
            var distanceToSegment,
                foundAddresses = [],
                i,
                // Ignore pedestrian boardwalk, stairways, runways, and railroads
                IGNORE_ROAD_TYPES = [10, 16, 18, 19],
                inferredAddress = {
                    country: null,
                    city: null,
                    state: null,
                    street: null
                },
                //MAX_RECURSION_DEPTH = 8,
                n,
                orderedSegments = [],
                segments = W.model.segments.getObjectArray(),
                selectedItem,
                stopPoint,
                wmeSelectedItems = W.selectionManager.selectedItems;

            var findClosestNode = function () {
                var closestSegment = orderedSegments[0].segment,
                    distanceA,
                    distanceB,
                    nodeA = W.model.nodes.get(closestSegment.attributes.fromNodeID),
                    nodeB = W.model.nodes.get(closestSegment.attributes.toNodeID);
                if (nodeA && nodeB) {
                    var pt = stopPoint.point ? stopPoint.point : stopPoint;
                    distanceA = pt.distanceTo(nodeA.attributes.geometry);
                    distanceB = pt.distanceTo(nodeB.attributes.geometry);
                    return distanceA < distanceB ?
                        nodeA.attributes.id : nodeB.attributes.id;
                }
            };

            var findConnections = function (startingNodeID, recursionDepth) {
                var connectedSegments,
                    k,
                    newNode;

                // Limit search depth to avoid problems.
                if (recursionDepth > MAX_RECURSION_DEPTH) {
                    //console.debug('Max recursion depth reached');
                    return;
                }

                // Populate variable with segments connected to starting node.
                connectedSegments = _.where(orderedSegments, {
                    fromNodeID: startingNodeID
                });
                connectedSegments = connectedSegments.concat(_.where(orderedSegments, {
                    toNodeID: startingNodeID
                }));

                //console.debug('Looking for connections at node ' + startingNodeID);

                // Check connected segments for address info.
                for (k in connectedSegments) {
                    if (connectedSegments.hasOwnProperty(k)) {
                        if (hasStreetName(connectedSegments[k].segment)) {
                            // Address found, push to array.
                            /*
                            console.debug('Address found on connnected segment ' +
                            connectedSegments[k].segment.attributes.id +
                            '. Recursion depth: ' + recursionDepth);
                            */
                            foundAddresses.push({
                                depth: recursionDepth,
                                distance: connectedSegments[k].distance,
                                segment: connectedSegments[k].segment
                            });
                            break;
                        } else {
                            // If not found, call function again starting from the other node on this segment.
                            //console.debug('Address not found on connected segment ' + connectedSegments[k].segment.attributes.id);
                            newNode = connectedSegments[k].segment.attributes.fromNodeID === startingNodeID ?
                                connectedSegments[k].segment.attributes.toNodeID :
                            connectedSegments[k].segment.attributes.fromNodeID;
                            findConnections(newNode, recursionDepth + 1);
                        }
                    }
                }
            };

            var getFCRank = function (FC) {
                var typeToFCRank = {
                    3: 0, // freeway
                    6: 1, // major
                    7: 2, // minor
                    2: 3, // primary
                    1: 4, // street
                    20: 5, // PLR
                    8: 6 // dirt
                };
                if (FC && !isNaN(FC)) {
                    return typeToFCRank[FC] || 100;
                }
            };

            var hasStreetName = function (segment) {
                return segment && segment.type === 'segment' && segment.getAddressDetails().streetName !== 'No street';
            };

            // phlogdev("No address data, gathering ", 2);

            // Make sure a place is selected and segments are loaded.
            if (wmeSelectedItems.length > 0 && segments.length > 0 &&
                wmeSelectedItems[0].model.type === 'venue') {
                selectedItem = W.selectionManager.selectedItems[0];
            } else {
                return;
            }

            if (selectedItem.model.isPoint()) {
                stopPoint = selectedItem.geometry;
            } else {
                var entryExitPoints = selectedItem.model.attributes.entryExitPoints;
                if (entryExitPoints.length > 0) {
                    stopPoint = entryExitPoints[0];
                } else {
                    stopPoint = selectedItem.geometry.getCentroid();
                }
            }

            // Go through segment array and calculate distances to segments.
            for (i = 0, n = segments.length; i < n; i++) {
                // Make sure the segment is not an ignored roadType.
                if (IGNORE_ROAD_TYPES.indexOf(segments[i].attributes.roadType) === -1) {
                    distanceToSegment = (stopPoint.point ? stopPoint.point : stopPoint).distanceTo(segments[i].geometry);
                    // Add segment object and its distanceTo to an array.
                    orderedSegments.push({
                        distance: distanceToSegment,
                        fromNodeID: segments[i].attributes.fromNodeID,
                        segment: segments[i],
                        toNodeID: segments[i].attributes.toNodeID
                    });
                }
            }

            // Sort the array with segments and distance.
            orderedSegments = _.sortBy(orderedSegments, 'distance');

            // Check closest segment for address first.
            if (hasStreetName(orderedSegments[0].segment)) {
                inferredAddress = orderedSegments[0].segment.getAddress();
            } else {
                // If address not found on closest segment, try to find address through branching method.
                findConnections(findClosestNode(), 1);
                if (foundAddresses.length > 0) {
                    // If more than one address found at same recursion depth, look at FC of segments.
                    if (foundAddresses.length > 1) {
                        _.each(foundAddresses, function (element) {
                            element.fcRank = getFCRank(
                                element.segment.attributes.roadType);
                        });
                        foundAddresses = _.sortBy(foundAddresses, 'fcRank');
                        foundAddresses = _.filter(foundAddresses, {
                            fcRank: foundAddresses[0].fcRank
                        });
                    }

                    // If multiple segments with same FC, Use address from segment with address that is closest by connectivity.
                    if (foundAddresses.length > 1) {
                        foundAddresses = _.sortBy(foundAddresses, 'depth');
                        foundAddresses = _.filter(foundAddresses, {
                            depth: foundAddresses[0].depth
                        });
                    }

                    // If more than one of the closest segments by connectivity has the same FC, look for
                    // closest segment geometrically.
                    if (foundAddresses.length > 1) {
                        foundAddresses = _.sortBy(foundAddresses, 'distance');
                    }
                    console.debug(foundAddresses[0].streetName, foundAddresses[0].depth);
                    inferredAddress = foundAddresses[0].segment.getAddress();
                } else {
                    // Default to closest if branching method fails.
                    // Go through sorted segment array until a country, state, and city have been found.
                    inferredAddress = _.find(orderedSegments, function (element) {
                        return hasStreetName(element.segment);
                    }).segment.getAddress() || inferredAddress;
                }
            }
            return inferredAddress;
        }  // END inferAddress function

        /**
         * Updates the address for a place.
         * @param feature {WME Venue Object} The place to update.
         * @param address {Object} An object containing the country, state, city, and street
         * @param actions {Array of actions} Optional. If performing multiple actions at once.
         * objects.
         */
        function updateAddress(feature, address, actions) {
            'use strict';
            var newAttributes,
                UpdateFeatureAddress = require('Waze/Action/UpdateFeatureAddress');
            feature = feature || item;
            if (feature && address) {
                newAttributes = {
                    countryID: address.country.id,
                    stateID: address.state.id,
                    cityName: address.city.attributes.name,
                    emptyCity: address.city.attributes.name ? null : true,
                    streetName: address.street.name,
                    emptyStreet: address.street.name ? null : true
                };
                var action = new UpdateFeatureAddress(feature, newAttributes);
                if(actions) {
                    actions.push(action);
                } else {
                    W.model.actionManager.add(action);
                }
                phlogdev('Address inferred and updated');
            }
        } // END updateAddress function

        // Build a Google search url based on place name and address
        function buildGLink(searchName,addr,HN) {
            var searchHN = "", searchStreet = "", searchCity = "";
            searchName = searchName.replace(/&/g, "%26");
            searchName = searchName.replace(/[ \/]/g, "%20");
            if ("string" === typeof addr.street.name && addr.street.name !== null && addr.street.name !== '') {
                searchStreet = addr.street.name + ",%20";
            }
            searchStreet = searchStreet.replace(/ /g, "%20");
            searchStreet = searchStreet.replace(/CR-/g, "County%20Rd%20");
            searchStreet = searchStreet.replace(/SR-/g, "State%20Hwy%20");
            searchStreet = searchStreet.replace(/US-/g, "US%20Hwy%20");
            searchStreet = searchStreet.replace(/ CR /g, "%20County%20Rd%20");
            searchStreet = searchStreet.replace(/ SR /g, "%20State%20Hwy%20");
            searchStreet = searchStreet.replace(/ US /g, "%20US%20Hwy%20");
            searchStreet = searchStreet.replace(/$CR /g, "County%20Rd%20");
            searchStreet = searchStreet.replace(/$SR /g, "State%20Hwy%20");
            searchStreet = searchStreet.replace(/$US /g, "US%20Hwy%20");
            if ("string" === typeof HN && searchStreet !== "") {
                searchHN = HN + "%20";
            }
            if ("string" === typeof addr.city.attributes.name && addr.city.attributes.name !== '') {
                searchCity = addr.city.attributes.name + ",%20";
            }
            searchCity = searchCity.replace(/ /g, "%20");

            return "http://www.google.com/search?q=" + searchName + ",%20" + searchHN + searchStreet + searchCity + addr.state.name;
        } // END buildGLink function

        // WME Category translation from Natural language to object language  (Bank / Financial --> BANK_FINANCIAL)
        function catTranslate(natCategories) {
            var catNameUpper = natCategories.trim().toUpperCase();
            if (CAT_LOOKUP.hasOwnProperty(catNameUpper)) {
                return CAT_LOOKUP[catNameUpper];
            }

            // var natCategoriesRepl = natCategories.toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "");
            // if (natCategoriesRepl.indexOf('PETSTORE') > -1) {
            //     return "PET_STORE_VETERINARIAN_SERVICES";
            // }
            // for(var keyCat in catTransWaze2Lang){
            //     var compare = catTransWaze2Lang[keyCat].toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "");
            //     if (compare === 'OFFICESINCLNONEMERGENCYMEDICAL') compare = 'OFFICES';
            //     if ( natCategoriesRepl ===  compare) {
            //         return keyCat;
            //     }
            // }

            // if the category doesn't translate, then pop an alert that will make a forum post to the thread
            // Generally this means the category used in the PNH sheet is not close enough to the natural language categories used inside the WME translations
            if (confirm('WMEPH: Category Error!\nClick OK to report this error') ) {
                forumMsgInputs = {
                    subject: 'WMEPH Bug report: no tns',
                    message: 'Error report: Category "' + natCategories + '" was not found in the PNH categories sheet.'
                };
                WMEPH_errorReport(forumMsgInputs);
            }
            return "ERROR";
        }  // END catTranslate function

        // compares two arrays to see if equal, regardless of order
        function matchSets(array1, array2) {
            if (array1.length !== array2.length) {return false;}  // compare lengths
            for (var i = 0; i < array1.length; i++) {
                if (array2.indexOf(array1[i]) === -1) {
                    return false;
                }
            }
            return true;
        }

        // function that checks if all elements of target are in array:source
        function containsAll(source,target) {
            if (typeof(target) === "string") { target = [target]; }  // if a single string, convert to an array
            for (var ixx = 0; ixx < target.length; ixx++) {
                if ( source.indexOf(target[ixx]) === -1 ) {
                    return false;
                }
            }
            return true;
        }

        // function that checks if any element of target are in source
        function containsAny(source,target) {
            if (typeof(source) === "string") { source = [source]; }  // if a single string, convert to an array
            if (typeof(target) === "string") { target = [target]; }  // if a single string, convert to an array
            var result = source.filter(function(tt){ return target.indexOf(tt) > -1; });
            return (result.length > 0);
        }

        // Function that inserts a string or a string array into another string array at index ix and removes any duplicates
        function insertAtIX(array1, array2, ix) {  // array1 is original string, array2 is the inserted string, at index ix
            var arrayNew = array1.slice(0);  // slice the input array so it doesn't change
            if (typeof(array2) === "string") { array2 = [array2]; }  // if a single string, convert to an array
            if (typeof(array2) === "object") {  // only apply to inserted arrays
                var arrayTemp = arrayNew.splice(ix);  // split and hold the first part
                arrayNew.push.apply(arrayNew, array2);  // add the insert
                arrayNew.push.apply(arrayNew, arrayTemp);  // add the tail end of original
            }
            return uniq(arrayNew);  // remove any duplicates (so the function can be used to move the position of a string)
        }

        // Function to remove unnecessary aliases
        function removeSFAliases(nName, nAliases) {
            var newAliasesUpdate = [];
            nName = nName.toUpperCase().replace(/'/g,'').replace(/-/g,' ').replace(/\/ /g,' ').replace(/ \//g,' ').replace(/ {2,}/g,' ');
            for (var naix=0; naix<nAliases.length; naix++) {
                if ( !nName.startsWith( nAliases[naix].toUpperCase().replace(/'/g,'').replace(/-/g,' ').replace(/\/ /g,' ').replace(/ \//g,' ').replace(/ {2,}/g,' ') ) ) {
                    newAliasesUpdate.push(nAliases[naix]);
                } else {
                    //phlogdev('Unnecessary alias removed: ' + nAliases[naix]);
                    bannButt.sfAliases.active = true;
                }
            }
            return newAliasesUpdate;
        }

        // settings tab
        function add_PlaceHarmonizationSettingsTab() {
            //Create Settings Tab
            var phTabHtml = '<li><a href="#sidepanel-ph' + devVersStr + '" data-toggle="tab" id="PlaceHarmonization' + devVersStr + '">WMEPH' + devVersStrSpace + '</a></li>';
            $("#user-tabs ul.nav-tabs:first").append(phTabHtml);

            //Create Settings Tab Content
            var phContentHtml = '<div class="tab-pane" id="sidepanel-ph' + devVersStr + '"><div id="PlaceHarmonizer' + devVersStr + '">WMEPH' +
                devVersStrSpace + ' v. ' + WMEPHversion + '</div></div>';
            $("#user-info div.tab-content:first").append(phContentHtml);

            var c = '<div id="wmephtab" class="active" style="padding-top: 5px;">' +
                '<ul class="nav nav-tabs"><li class="active"><a data-toggle="tab" href="#sidepanel-harmonizer' + devVersStr + '">Harmonize</a></li>' +
                '<li><a data-toggle="tab" href="#sidepanel-highlighter' + devVersStr + '">HL \/ Scan</a></li>' +
                '<li><a data-toggle="tab" href="#sidepanel-wltools' + devVersStr + '">WL Tools</a></li></ul>' +
                '<div class="tab-content"><div class="tab-pane active" id="sidepanel-harmonizer' + devVersStr + '"></div>' +
                '<div class="tab-pane" id="sidepanel-highlighter' + devVersStr + '"></div>' +
                '<div class="tab-pane" id="sidepanel-wltools' + devVersStr + '"></div></div></div>';

            //add the sub tabs to the scripts main tab
            $("#sidepanel-ph"+devVersStr).append(c);

            // Enable certain settings by default if not set by the user:
            if (localStorage.getItem('WMEPH-ColorHighlighting'+devVersStr) === null) {
                localStorage.setItem('WMEPH-ColorHighlighting'+devVersStr, '1');
            }

            //Create Settings Checkboxes and Load Data
            //example condition:  if ( $("#WMEPH-DisableDFZoom" + devVersStr).prop('checked') ) { }
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-WebSearchNewTab" + devVersStr,"Open URL & Search Results in new tab instead of new window");
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-DisableDFZoom" + devVersStr,"Disable zoom & center for duplicates");
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-EnableIAZoom" + devVersStr,"Enable zoom & center for places with no address");
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-HidePlacesWiki" + devVersStr,"Hide 'Places Wiki' button in results banner");
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-ExcludePLADupes" + devVersStr,"Exclude parking lots when searching for duplicate places.");
            if (devUser || betaUser || usrRank >= 2) {
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-DisablePLAExtProviderCheck" + devVersStr,'Disable check for "No external provider link(s)" on Parking Lot Areas');
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-ExtProviderSeverity" + devVersStr,'Treat "No external provider link(s)" as non-critical (blue)');
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-EnableServices" + devVersStr,"Enable automatic addition of common services");
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-ConvenienceStoreToGasStations" + devVersStr,'Automatically add "Convenience Store" category to gas stations');
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-AddAddresses" + devVersStr,"Add detected address fields to places with no address");
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-EnableCloneMode" + devVersStr,"Enable place cloning tools");
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-AutoLockRPPs" + devVersStr,"Lock residential place points to region default");
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-AutoRunOnSelect" + devVersStr,'Automatically run the script when selecting a place');
            }

            ["#WMEPH-ExtProviderSeverity" + devVersStr, "#WMEPH-DisablePLAExtProviderCheck" + devVersStr].map(function(id) {
                $(id).on('click', function() {
                    // Force highlight refresh on all venues.
                    applyHighlightsTest(W.model.venues.getObjectArray());
                });
            });

            // Turn this setting on one time.
            var runOnceDefaultIgnorePlaGoogleLinkChecks = localStorage.getItem('WMEPH-runOnce-defaultToOff-plaGoogleLinkChecks' + devVersStr);
            if (!runOnceDefaultIgnorePlaGoogleLinkChecks) {
                var $chk = $('#WMEPH-DisablePLAExtProviderCheck' + devVersStr);
                if (!$chk.is(':checked')) { $chk.trigger('click'); }
            }
            localStorage.setItem('WMEPH-runOnce-defaultToOff-plaGoogleLinkChecks' + devVersStr, true);

            // Highlighter settings
            var phDevContentHtml = '<p>Highlighter Settings:</p>';
            $("#sidepanel-highlighter" + devVersStr).append(phDevContentHtml);
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-ColorHighlighting" + devVersStr,"Enable color highlighting of map to indicate places needing work");
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-DisableHoursHL" + devVersStr,"Disable highlighting for missing hours");
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-DisableRankHL" + devVersStr,"Disable highlighting for places locked above your rank");
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-DisableWLHL" + devVersStr,"Disable Whitelist highlighting (shows all missing info regardless of WL)");
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-PLATypeFill" + devVersStr,"Fill parking lots based on type (public=green, restricted=yellow, private=red)");
            if (devUser || betaUser || usrRank >= 3) {
                //createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-UnlockedRPPs" + devVersStr,"Highlight unlocked residential place points");
            }
            var phHRContentHtml = '<hr align="center" width="90%">';
            $("#sidepanel-highlighter" + devVersStr).append(phHRContentHtml);
            phHRContentHtml = '<p>Scanner Settings (coming soon)</p>';
            $("#sidepanel-highlighter" + devVersStr).append(phHRContentHtml);

            // Scanner settings
            //createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-PlaceScanner" + devVersStr,"Placeholder, under development!");

            // Whitelist settings

            phHRContentHtml = '<hr align="center" width="90%">';
            $("#sidepanel-harmonizer" + devVersStr).append(phHRContentHtml);

            // User pref for KB Shortcut:
            // Set defaults
            if (isDevVersion) {
                defaultKBShortcut = 'S';
            } else {
                defaultKBShortcut = 'A';
            }
            // Set local storage to default if none
            if (localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr) === null) {
                localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, defaultKBShortcut);
            }

            // Add Letter input box
            var phKBContentHtml = $('<div id="PlaceHarmonizerKB' + devVersStr +
                                    '"><div id="PlaceHarmonizerKBWarn' + devVersStr + '"></div>Shortcut Letter (a-Z): <input type="text" maxlength="1" id="WMEPH-KeyboardShortcut'+devVersStr+
                                    '" style="width: 30px;padding-left:8px"><div id="PlaceHarmonizerKBCurrent' + devVersStr + '"></div></div>');
            $("#sidepanel-harmonizer" + devVersStr).append(phKBContentHtml);
            createSettingsCheckbox("PlaceHarmonizerKB" + devVersStr, "WMEPH-KBSModifierKey" + devVersStr, "Use Ctrl instead of Alt"); // Add Alt-->Ctrl checkbox
            if ( localStorage.getItem('WMEPH-KBSModifierKey'+devVersStr) === '1' ) {  // Change modifier key code if checked
                modifKey = 'Ctrl+';
            }
            $('#WMEPH-KeyboardShortcut'+devVersStr).val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));  // Load letter key value from local storage
            if ($('#WMEPH-KeyboardShortcut'+devVersStr).val().match(/^[a-z]{1}$/i) === null) {
                $('#WMEPH-KeyboardShortcut'+devVersStr).val(defaultKBShortcut);
                $(localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, $('#WMEPH-KeyboardShortcut'+devVersStr).val()));
            }
            shortcutParse = parseKBSShift($('#WMEPH-KeyboardShortcut'+devVersStr).val());
            // Check for KBS conflict on Beta script load
            if (isDevVersion) {
                if (checkWMEPH_KBSconflict(shortcutParse)) {
                    alert('You have the same shortcut for the Beta version and the Production version of the script. The Beta version is disabled until you change the Beta shortcut');
                } else {
                    shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                    phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                    $("#PlaceHarmonizerKBCurrent" + devVersStr).append(phKBContentHtml);
                }
            } else {  // Prod version always loads
                shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                $("#PlaceHarmonizerKBCurrent" + devVersStr).append(phKBContentHtml);
            }

            // Modifier on-click changes
            var modifKeyNew;
            $("#WMEPH-KBSModifierKey" + devVersStr).click(function() {
                $("#PlaceHarmonizerKBWarn" + devVersStr).empty();  // remove any warning
                if ($("#WMEPH-KBSModifierKey" + devVersStr).prop('checked')) {
                    modifKeyNew = 'Ctrl+';
                } else {
                    modifKeyNew = 'Alt+';
                }
                shortcutParse = parseKBSShift($('#WMEPH-KeyboardShortcut'+devVersStr).val());

                if (checkWMEPH_KBSconflict(shortcutParse)) {
                    $("#WMEPH-KBSModifierKey" + devVersStr).trigger('click');
                    phKBContentHtml = '<p style="color:red">Shortcut conflict with other WMEPH version<p>';
                    $("#PlaceHarmonizerKBWarn" + devVersStr).append(phKBContentHtml);
                } else {
                    shortcut.remove(modifKey + shortcutParse);
                    modifKey = modifKeyNew;
                    shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                }

                $("#PlaceHarmonizerKBCurrent" + devVersStr).empty();
                phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                $("#PlaceHarmonizerKBCurrent" + devVersStr).append(phKBContentHtml);
            });

            // Upon change of the KB letter:
            var shortcutParseNew;
            $("#WMEPH-KeyboardShortcut"+devVersStr).change(function() {
                if ($('#WMEPH-KeyboardShortcut'+devVersStr).val().match(/^[a-z]{1}$/i) !== null) {  // If a single letter...
                    $("#PlaceHarmonizerKBWarn" + devVersStr).empty();  // remove old warning
                    // remove previous
                    shortcutParse = parseKBSShift(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                    shortcutParseNew = parseKBSShift($('#WMEPH-KeyboardShortcut'+devVersStr).val());

                    if (checkWMEPH_KBSconflict(shortcutParseNew)) {
                        $('#WMEPH-KeyboardShortcut'+devVersStr).val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                        //$("#PlaceHarmonizerKBWarn" + devVersStr).empty();
                        phKBContentHtml = '<p style="color:red">Shortcut conflict with other WMEPH version<p>';
                        $("#PlaceHarmonizerKBWarn" + devVersStr).append(phKBContentHtml);
                    } else {
                        shortcut.remove(modifKey + shortcutParse);
                        shortcutParse = shortcutParseNew;
                        shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                        $(localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, $('#WMEPH-KeyboardShortcut'+devVersStr).val()) );
                    }
                    $("#PlaceHarmonizerKBCurrent" + devVersStr).empty();
                    phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                    $("#PlaceHarmonizerKBCurrent" + devVersStr).append(phKBContentHtml);
                } else {  // if not a letter then reset and flag
                    $('#WMEPH-KeyboardShortcut'+devVersStr).val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                    $("#PlaceHarmonizerKBWarn" + devVersStr).empty();
                    phKBContentHtml = '<p style="color:red">Only letters are allowed<p>';
                    $("#PlaceHarmonizerKBWarn" + devVersStr).append(phKBContentHtml);
                }
            });


            if (devUser) {  // Override script regionality (devs only)
                phDevContentHtml = '<hr align="center" width="90%"><p>Dev Only Settings:</p>';
                $("#sidepanel-harmonizer" + devVersStr).append(phDevContentHtml);
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-RegionOverride" + devVersStr,"Disable Region Specificity");

            }

            // *** Whitelisting section
            if (localStorage.getItem('WMEPH_WLAddCount') === null) {
                localStorage.setItem('WMEPH_WLAddCount', 2);  // Counter to remind of WL backups
            }
            var phWLContentHtml = $('<div id="PlaceHarmonizerWLTools' + devVersStr + '">Whitelist string: <input onClick="this.select();" type="text" id="WMEPH-WLInput'+devVersStr+
                                    '" style="width: 200px;padding-left:1px"><br>'+
                                    '<input class="btn btn-success btn-xs" id="WMEPH-WLMerge'+ devVersStr +'" title="Merge the string into your existing Whitelist" type="button" value="Merge">'+
                                    '<br><input class="btn btn-success btn-xs" id="WMEPH-WLPull'+ devVersStr +'" title="Pull your existing Whitelist for backup or sharing" type="button" value="Pull">'+
                                    '<br><input class="btn btn-success btn-xs" id="WMEPH-WLShare'+ devVersStr +'" title="Share your Whitelist to a public Google sheet" type="button" value="Share your WL">'+
                                    '<br><input class="btn btn-info btn-xs" id="WMEPH-WLStats'+ devVersStr +'" title="Display WL stats" type="button" value="Stats">'+
                                    '<br><input class="btn btn-danger btn-xs" id="WMEPH-WLStateFilter'+ devVersStr +'" title="Remove all WL items for a state" type="button" value="Remove data for 1 State">'+
                                    '</div><div id="PlaceHarmonizerWLToolsMsg' + devVersStr + '"></div>');
            $("#sidepanel-wltools" + devVersStr).append(phWLContentHtml);

            $("#WMEPH-WLMerge" + devVersStr).click(function() {
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).empty();
                if ($('#WMEPH-WLInput'+devVersStr).val() === 'resetWhitelist') {
                    if (confirm('***Do you want to reset all Whitelist data?\nClick OK to erase.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                        venueWhitelist = { '1.1.1': { Placeholder: {  } } }; // Populate with a dummy place
                        saveWL_LS(true);
                    }
                } else {  // try to merge uncompressed WL data
                    WLSToMerge = validateWLS($('#WMEPH-WLInput'+devVersStr).val());
                    if (WLSToMerge) {
                        phlog('Whitelists merged!');
                        venueWhitelist = mergeWL(venueWhitelist,WLSToMerge);
                        saveWL_LS(true);
                        phWLContentHtml = '<p style="color:green">Whitelist data merged<p>';
                        $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                        $('#WMEPH-WLInputBeta').val('');
                    } else {  // try compressed WL
                        WLSToMerge = validateWLS( LZString.decompressFromUTF16($('#WMEPH-WLInput'+devVersStr).val()) );
                        if (WLSToMerge) {
                            phlog('Whitelists merged!');
                            venueWhitelist = mergeWL(venueWhitelist,WLSToMerge);
                            saveWL_LS(true);
                            phWLContentHtml = '<p style="color:green">Whitelist data merged<p>';
                            $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                            $('#WMEPH-WLInputBeta').val('');
                        } else {
                            phWLContentHtml = '<p style="color:red">Invalid Whitelist data<p>';
                            $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                        }
                    }
                }
            });

            // Pull the data to the text field
            $("#WMEPH-WLPull" + devVersStr).click(function() {
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).empty();
                $('#WMEPH-WLInput'+devVersStr).val( LZString.decompressFromUTF16(localStorage.getItem(WLlocalStoreNameCompressed)) );
                phWLContentHtml = '<p style="color:green">To backup the data, copy & paste the text in the box to a safe location.<p>';
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                localStorage.setItem('WMEPH_WLAddCount', 1);
            });

            // WL Stats
            $("#WMEPH-WLStats" + devVersStr).click(function() {
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).empty();
                $('#WMEPH-WLInputBeta').val('');
                var currWLData;
                currWLData = JSON.parse( LZString.decompressFromUTF16( localStorage.getItem(WLlocalStoreNameCompressed) ) );
                var countryWL = {};
                var stateWL = {};
                var itemCount = 0;
                for (var venueKey in currWLData) {
                    if (currWLData.hasOwnProperty(venueKey)) {
                        if (venueKey !== '1.1.1') {  // Don't count the place holder
                            itemCount++;
                            if ( currWLData[venueKey].hasOwnProperty('country') ) {
                                if ( countryWL.hasOwnProperty(currWLData[venueKey].country) ) {
                                    countryWL[currWLData[venueKey].country]++;
                                } else {
                                    countryWL[currWLData[venueKey].country] = 1;
                                }
                            } else {
                                if ( countryWL.hasOwnProperty('None') ) {
                                    countryWL.None++;
                                } else {
                                    countryWL.None = 1;
                                }
                            }
                            if ( currWLData[venueKey].hasOwnProperty('state') ) {
                                if ( stateWL.hasOwnProperty(currWLData[venueKey].state) ) {
                                    stateWL[currWLData[venueKey].state]++;
                                } else {
                                    stateWL[currWLData[venueKey].state] = 1;
                                }
                            } else {
                                if ( stateWL.hasOwnProperty('None') ) {
                                    stateWL.None++;
                                } else {
                                    stateWL.None = 1;
                                }
                            }
                        }
                    }
                }

                var countryString = '';
                for (var countryKey in countryWL) {
                    countryString = countryString + '<br>' + countryKey + ': ' + countryWL[countryKey];
                }
                var stateString = '';
                for (var stateKey in stateWL) {
                    stateString = stateString + '<br>' + stateKey + ': ' + stateWL[stateKey];
                }

                phWLContentHtml = '<p style="color:black">Number of WL places: '+ itemCount +'</p><p>States:'+ stateString +'</p><p>Countries:'+ countryString + '<p>';
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                //localStorage.setItem('WMEPH_WLAddCount', 1);
            });

            // WL State Filter
            $("#WMEPH-WLStateFilter" + devVersStr).click(function() {
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).empty();
                stateToRemove = $('#WMEPH-WLInput'+devVersStr).val();
                if ( stateToRemove.length < 2 ) {
                    phWLContentHtml = '<p style="color:red">Invalid state<p>';
                    $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                } else {
                    var currWLData, venueToRemove = [];
                    currWLData = JSON.parse( LZString.decompressFromUTF16( localStorage.getItem(WLlocalStoreNameCompressed) ) );

                    //var WLSize = _.size(currWLData);

                    for (var venueKey in currWLData) {
                        if (currWLData.hasOwnProperty(venueKey)) {
                            if (venueKey !== '1.1.1') {  // Don't examine the place holder
                                if ( currWLData[venueKey].hasOwnProperty('state') ) {
                                    if ( currWLData[venueKey].state === stateToRemove ) {
                                        venueToRemove.push(venueKey);
                                    }
                                }
                            }
                        }
                    }
                    //phlogdev(venueToRemove.length);
                    if (venueToRemove.length > 0) {
                        if (localStorage.WMEPH_WLAddCount === '1') {
                            if (confirm('Are you sure you want to clear all whitelist data for '+stateToRemove+'? This CANNOT be undone. Press OK to delete, cancel to preserve the data.') ) {  // misclick check
                                backupWL_LS(true);
                                for (var ixwl=0; ixwl<venueToRemove.length; ixwl++) {
                                    delete venueWhitelist[venueToRemove[ixwl]];
                                    //phlogdev(venueWhitelist[venueToRemove[ixwl]]);
                                }
                                saveWL_LS(true);
                                phWLContentHtml = '<p style="color:green">'+venueToRemove.length+' items removed from WL<p>';
                                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                                $('#WMEPH-WLInputBeta').val('');
                            } else {
                                phWLContentHtml = '<p style="color:blue">No changes made<p>';
                                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                            }
                        } else {
                            phWLContentHtml = '<p style="color:red">Please backup your WL using the Pull button before removing state data<p>';
                            $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                            //phlogdev('Please backup your WL using the Pull button before removing state data');
                        }
                    } else {
                        phWLContentHtml = '<p style="color:red">No data for that state. Use the state name exactly as listed in the Stats<p>';
                        $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                        //phlogdev('No data for that state. Use the state name exactly as listed in the Stats');
                    }
                }
            });

            // Share the data to a Google Form post
            $("#WMEPH-WLShare" + devVersStr).click(function() {
                var submitWLURL = 'https://docs.google.com/forms/d/1k_5RyOq81Fv4IRHzltC34kW3IUbXnQqDVMogwJKFNbE/viewform?entry.1173700072='+thisUser.userName;
                window.open(submitWLURL);
            });

            var feedbackString = 'Submit script feedback & suggestions';
            var placesWikiStr = 'Open the WME Places Wiki page';
            var phContentHtml2 = '<hr align="center" width="95%"><p><a href="' +
                placesWikiURL + '" target="_blank" title="'+placesWikiStr+'">'+placesWikiStr+'</a><p><a href="' +
                WMEPHurl + '" target="_blank" title="'+feedbackString+'">'+feedbackString+'</a></p><hr align="center" width="95%">Major features for v. ' +
                WMEPHversionMeta+':<ul><li>'+WMEPHWhatsNewMetaHList+'</ul>Recent updates:<ul><li>'+WMEPHWhatsNewHList+'</ul>';
            $("#sidepanel-harmonizer" + devVersStr).append(phContentHtml2);

            W.map.events.register("mousemove", W.map, function (e) {
                WMEPHmousePosition = W.map.getLonLatFromPixel( W.map.events.getMousePosition(e) );
            });

            // Add zoom shortcut
            shortcut.add("Control+Alt+Z", function() {
                zoomPlace();
            });

            // Color highlighting
            $("#WMEPH-ColorHighlighting" + devVersStr).click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableHoursHL" + devVersStr).click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableRankHL" + devVersStr).click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableWLHL" + devVersStr).click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-PLATypeFill" + devVersStr).click( function() {
                applyHighlightsTest(W.model.venues.getObjectArray());
            });
            if ( $("#WMEPH-ColorHighlighting" + devVersStr).prop('checked') ) {
                phlog('Starting Highlighter');
                bootstrapWMEPH_CH();
            }


            // Add Color Highlighting shortcut
            shortcut.add("Control+Alt+h", function() {
                $("#WMEPH-ColorHighlighting" + devVersStr).trigger('click');
            });

            // Add Autorun shortcut
            if (thisUser.userName === 'bmtg') {
                shortcut.add("Control+Alt+u", function() {
                    $("#WMEPH-AutoRunOnSelect" + devVersStr).trigger('click');
                });
            }

            // $("#user-info div.tab-content:first").append(phContentHtml2);
            phlog('Ready...!');
        } // END Settings Tab

        // This routine will create a checkbox in the #PlaceHarmonizer tab and will load the setting
        //        settingID:  The #id of the checkbox being created.
        //  textDescription:  The description of the checkbox that will be use
        function createSettingsCheckbox(divID, settingID, textDescription) {
            //Create settings checkbox and append HTML to settings tab
            var phTempHTML = '<input type="checkbox" id="' + settingID + '">'+ textDescription +'</input><br>';
            $("#" + divID).append(phTempHTML);
            //Associate click event of new checkbox to call saveSettingToLocalStorage with proper ID
            $("#" + settingID).click(function() {saveSettingToLocalStorage(settingID);});
            //Load Setting for Local Storage, if it doesn't exist set it to NOT checked.
            //If previously set to 1, then trigger "click" event.
            if (!localStorage.getItem(settingID))
            {
                //phlogdev(settingID + ' not found.');
            } else if (localStorage.getItem(settingID) === "1") {
                $("#" + settingID).trigger('click');
            }
        }

        function createCloneCheckbox(divID, settingID, textDescription) {
            //Create settings checkbox and append HTML to settings tab
            var phTempHTML = '<input type="checkbox" id="' + settingID + '">'+ textDescription +'</input>&nbsp&nbsp';
            $("#" + divID).append(phTempHTML);
            //Associate click event of new checkbox to call saveSettingToLocalStorage with proper ID
            $("#" + settingID).click(function() {saveSettingToLocalStorage(settingID);});
            //Load Setting for Local Storage, if it doesn't exist set it to NOT checked.
            //If previously set to 1, then trigger "click" event.
            if (!localStorage.getItem(settingID))
            {
                //phlogdev(settingID + ' not found.');
            } else if (localStorage.getItem(settingID) === "1") {
                $("#" + settingID).trigger('click');
            }
        }

        //Function to add Shift+ to upper case KBS
        function parseKBSShift(kbs) {
            if (kbs.match(/^[A-Z]{1}$/g) !== null) { // If upper case, then add a Shift+
                kbs = 'Shift+' + kbs;
            }
            return kbs;
        }

        // Function to check shortcut conflict
        function checkWMEPH_KBSconflict(KBS) {
            var LSString = '';
            if (!isDevVersion) {
                LSString = devVersStringMaster;
            }
            if ( localStorage.getItem('WMEPH-KeyboardShortcut'+LSString) === null || localStorage.getItem('WMEPH-KBSModifierKey'+LSString) === null ) {
                return false;
            } else if ( parseKBSShift(localStorage.getItem('WMEPH-KeyboardShortcut'+LSString)) === KBS && localStorage.getItem('WMEPH-KBSModifierKey'+devVersStringMaster) === localStorage.getItem('WMEPH-KBSModifierKey') ) {
                return true;
            } else {
                return false;
            }
        }

        // Save settings prefs
        function saveSettingToLocalStorage(settingID) {
            if ($("#" + settingID).prop('checked')) {
                localStorage.setItem(settingID, '1');
            } else {
                localStorage.setItem(settingID, '0');
            }
        }

        // This function validates that the inputted text is a JSON
        function validateWLS(jsonString) {
            "use strict";
            try {
                var objTry = JSON.parse(jsonString);
                if (objTry && typeof objTry === "object" && objTry !== null) {
                    return objTry;
                }
            }
            catch (e) { }
            return false;
        }

        // This function merges and updates venues from object vWL_2 into vWL_1
        function mergeWL(vWL_1,vWL_2) {
            "use strict";
            var venueKey, WLKey, vWL_1_Venue, vWL_2_Venue;
            for (venueKey in vWL_2) {
                if (vWL_2.hasOwnProperty(venueKey)) {  // basic filter
                    if (vWL_1.hasOwnProperty(venueKey)) {  // if the vWL_2 venue is in vWL_1, then update any keys
                        vWL_1_Venue = vWL_1[venueKey];
                        vWL_2_Venue = vWL_2[venueKey];
                        for (WLKey in vWL_2_Venue) {  // loop thru the venue WL keys
                            if (vWL_2_Venue.hasOwnProperty(WLKey) && vWL_2_Venue[WLKey].active) {  // Only update if the vWL_2 key is active
                                if ( vWL_1_Venue.hasOwnProperty(WLKey) && vWL_1_Venue[WLKey].active ) {  // if the key is in the vWL_1 venue and it is active, then push any array data onto the key
                                    if (vWL_1_Venue[WLKey].hasOwnProperty('WLKeyArray')) {
                                        vWL_1[venueKey][WLKey].WLKeyArray = insertAtIX(vWL_1[venueKey][WLKey].WLKeyArray,vWL_2[venueKey][WLKey].WLKeyArray,100);
                                    }
                                } else {  // if the key isn't in the vWL_1 venue, or if it's inactive, then copy the vWL_2 key across
                                    vWL_1[venueKey][WLKey] = vWL_2[venueKey][WLKey];
                                }
                            }
                        } // END subLoop for venue keys
                    } else {  // if the venue doesn't exist in vWL_1, then add it
                        vWL_1[venueKey] = vWL_2[venueKey];
                    }
                }
            }
            return vWL_1;
        }

        // Get services checkbox status
        function getServicesChecks() {
            var servArrayCheck = [];
            for (var wsix=0; wsix<WMEServicesArray.length; wsix++) {
                if ($("#service-checkbox-" + WMEServicesArray[wsix]).prop('checked')) {
                    servArrayCheck[wsix] = true;
                } else {
                    servArrayCheck[wsix] = false;
                }
            }
            return servArrayCheck;
        }

        function updateServicesChecks(bannServ) {
            var servArrayCheck = getServicesChecks(), wsix=0;
            for (var keys in bannServ) {
                if (bannServ.hasOwnProperty(keys)) {
                    bannServ[keys].checked = servArrayCheck[wsix];  // reset all icons to match any checked changes
                    bannServ[keys].active = bannServ[keys].active || servArrayCheck[wsix];  // display any manually checked non-active icons
                    wsix++;
                }
            }
            // Highlight 24/7 button if hours are set that way, and add button for all places
            if ( item.attributes.openingHours.length === 1 && item.attributes.openingHours[0].days.length === 7 && item.attributes.openingHours[0].fromHour === '00:00' && item.attributes.openingHours[0].toHour ==='00:00' ) {
                bannServ.add247.checked = true;
            }
            bannServ.add247.active = true;
        }

        // Focus away from the current cursor focus, to set text box changes
        function blurAll() {
            var tmp = document.createElement("input");
            document.body.appendChild(tmp);
            tmp.focus();
            document.body.removeChild(tmp);
        }

        // Pulls the item PL
        function getItemPL() {
            // Append a form div if it doesn't exist yet:
            if ( $('#WMEPH_formDiv').length ===0 ) {
                var tempDiv = document.createElement('div');
                tempDiv.id = 'WMEPH_formDiv';
                tempDiv.style.display = 'inline';
                $(".WazeControlPermalink").append(tempDiv);
            }
            // Return the current PL
            if ($(".WazeControlPermalink").length === 0) {
                phlog("Waiting for PL div");
                setTimeout(getItemPL, 500);
                return;
            }
            if ( $(".WazeControlPermalink").children(".icon-link").length > 0 ) {
                return $(".WazeControlPermalink").children(".icon-link")[0].href;
            } else if ( $(".WazeControlPermalink").children(".fa-link").length > 0 ) {
                return $(".WazeControlPermalink").children(".fa-link")[0].href;
            }
            return  '';
        }

        // Sets up error reporting
        function WMEPH_errorReport(data) {
            data.preview = 'Preview';
            data.attach_sig = 'on';
            if (PMUserList.hasOwnProperty('WMEPH') && PMUserList.WMEPH.approvalActive) {
                data['address_list[u]['+PMUserList.WMEPH.modID+']'] = 'to';
                WMEPH_newForumPost('https://www.waze.com/forum/ucp.php?i=pm&mode=compose', data);
            } else {
                data.addbbcode20 = 'to';
                data.notify = 'on';
                WMEPH_newForumPost(WMEPHurl + '#preview', data);
            }
        }  // END WMEPH_errorReport function

        // Make a populated post on a forum thread
        function WMEPH_newForumPost(url, data) {
            var form = document.createElement('form');
            form.target = '_blank';
            form.action = url;
            form.method = 'post';
            form.style.display = 'none';
            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    var input;
                    if (k === 'message') {
                        input = document.createElement('textarea');
                    } else if (k === 'username') {
                        input = document.createElement('username_list');
                    } else {
                        input = document.createElement('input');
                    }
                    input.name = k;
                    input.value = data[k];
                    input.type = 'hidden';
                    form.appendChild(input);
                }
            }
            document.getElementById('WMEPH_formDiv').appendChild(form);
            form.submit();
            document.getElementById('WMEPH_formDiv').removeChild(form);
            return true;
        }  // END WMEPH_newForumPost function

        /**
         * Updates the geometry of a place.
         * @param place {Waze venue object} The place to update.
         * @param newGeometry {OL.Geometry} The new geometry for the place.
         */
        function updateFeatureGeometry(place, newGeometry) {
            var oldGeometry,
                model = W.model.venues,
                wmeUpdateFeatureGeometry = require('Waze/Action/UpdateFeatureGeometry');
            if (place && place.CLASS_NAME === 'Waze.Feature.Vector.Landmark' &&
                newGeometry && (newGeometry instanceof OL.Geometry.Point ||
                                newGeometry instanceof OL.Geometry.Polygon)) {
                oldGeometry = place.attributes.geometry;
                W.model.actionManager.add(
                    new wmeUpdateFeatureGeometry(place, model, oldGeometry, newGeometry));
            }
        }

        // Function that checks current place against the Harmonization Data.  Returns place data or "NoMatch"
        function harmoList(itemName,state2L,region3L,country,itemCats,item) {
            var PNH_DATA_headers;
            var ixendPNH_NAMES;
            if (country === 'USA') {
                PNH_DATA_headers = USA_PNH_DATA[0].split("|");  // pull the data header names
                ixendPNH_NAMES = USA_PNH_NAMES.length;
            } else if (country === 'CAN') {
                PNH_DATA_headers = CAN_PNH_DATA[0].split("|");  // pull the data header names
                ixendPNH_NAMES = CAN_PNH_NAMES.length;
            } else {
                alert("No PNH data exists for this country.");
                return ["NoMatch"];
            }
            var ph_name_ix = PNH_DATA_headers.indexOf("ph_name");
            var ph_category1_ix = PNH_DATA_headers.indexOf("ph_category1");
            var ph_forcecat_ix = PNH_DATA_headers.indexOf("ph_forcecat");  // Force the category match
            var ph_region_ix = PNH_DATA_headers.indexOf("ph_region");  // Find the index for regions
            var ph_order_ix = PNH_DATA_headers.indexOf("ph_order");
            var ph_speccase_ix = PNH_DATA_headers.indexOf("ph_speccase");
            var ph_searchnameword_ix = PNH_DATA_headers.indexOf("ph_searchnameword");
            var nameComps;  // filled with search names to compare against place name
            var PNHPriCat;  // Primary category of PNH data
            var PNHForceCat;  // Primary category of PNH data
            var approvedRegions;  // filled with the regions that are approved for the place, when match is found
            var matchPNHData = [];  // array of matched data
            var matchPNHRegionData = [];  // array of matched data with regional approval
            var currMatchData, PNHMatchData, specCases, nmix, allowMultiMatch = false;
            var currMatchNum = 0;  // index for multiple matches, currently returns on first match
            var PNHOrderNum = [];
            var PNHNameTemp = [];
            var PNHNameMatch = false;  // tracks match status
            var PNHStringMatch = false;  // compares name string match
            var PNHMatchProceed;  // tracks match status
            itemName = itemName.toUpperCase();  // UpperCase the current place name (The Holly And Ivy Pub #23 --> THE HOLLY AND IVY PUB #23 )
            itemName = itemName.replace(/ AND /g, ' ');  // Clear the word " AND " from the name (THE HOLLY AND IVY PUB #23 --> THE HOLLY IVY PUB #23 )
            itemName = itemName.replace(/^THE /g, '');  // Clear the word "THE " from the start of the name ( THE HOLLYIVY PUB #23 -- > HOLLY IVY PUB #23 )
            var itemNameSpace = itemName.replace(/[^A-Z0-9 ]/g, ' ');  // Clear all non-letter and non-number characters except spaces ( HOLLYIVY PUB #23 -- > HOLLY IVY PUB  23 )
            itemNameSpace = ' '+itemNameSpace.replace(/ {2,}/g, ' ')+' ';  // Make double spaces into singles ( HOLLY IVY PUB  23 -- > HOLLY IVY PUB 23 )
            itemName = itemName.replace(/[^A-Z0-9]/g, '');  // Clear all non-letter and non-number characters ( HOLLYIVY PUB #23 -- > HOLLYIVYPUB23 )
            var itemNameNoNum = itemName.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )

            // Search performance stats
            var t0; var t1;
            if (devUser) {
                t0 = performance.now();  // Speed check start
            }

            // for each place on the PNH list (skipping headers at index 0)
            // phlogdev(ixendPNH_NAMES);
            for (var phnum=1; phnum<ixendPNH_NAMES; phnum++) {
                PNHMatchProceed = false;
                PNHStringMatch = false;
                if (country === 'USA') {
                    nameComps = USA_PNH_NAMES[phnum].split("|");  // splits all possible search names for the current PNH entry
                    PNHMatchData = USA_PNH_DATA[phnum];
                } else if (country === 'CAN') {
                    nameComps = CAN_PNH_NAMES[phnum].split("|");  // splits all possible search names for the current PNH entry
                    PNHMatchData = CAN_PNH_DATA[phnum];
                }
                currMatchData = PNHMatchData.split("|");  // Split the PNH place data into string array

                // Name Matching
                specCases = currMatchData[ph_speccase_ix];
                if (specCases.indexOf('regexNameMatch') > -1) {
                    // Check for regex name matching instead of "standard" name matching.
                    var match = specCases.match(/regexNameMatch<>(.+?)<>/i);
                    if (match !== null) {
                        var re = new RegExp(match[1].replace(/\\/,'\\'),'i');
                        PNHStringMatch = re.test(item.attributes.name);
                    }
                } else if (specCases.indexOf('strMatchAny') > -1 || currMatchData[ph_category1_ix] === 'Hotel') {  // Match any part of WME name with either the PNH name or any spaced names
                    allowMultiMatch = true;
                    var spaceMatchList = [];
                    spaceMatchList.push( currMatchData[ph_name_ix].toUpperCase().replace(/ AND /g, ' ').replace(/^THE /g, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/ {2,}/g, ' ') );
                    if (currMatchData[ph_searchnameword_ix] !== '') {
                        spaceMatchList.push.apply( spaceMatchList,currMatchData[ph_searchnameword_ix].toUpperCase().replace(/, /g,',').split(',') );
                    }
                    for (nmix=0; nmix<spaceMatchList.length; nmix++) {
                        if ( itemNameSpace.includes(' '+spaceMatchList[nmix]+' ') ) {
                            PNHStringMatch = true;
                        }
                    }
                } else if (specCases.indexOf('strMatchStart') > -1) {  //  Match the beginning part of WME name with any search term
                    for (nmix=0; nmix<nameComps.length; nmix++) {
                        if ( itemName.startsWith(nameComps[nmix]) || itemNameNoNum.startsWith(nameComps[nmix]) ) {
                            PNHStringMatch = true;
                        }
                    }
                } else if (specCases.indexOf('strMatchEnd') > -1) {  //  Match the end part of WME name with any search term
                    for (nmix=0; nmix<nameComps.length; nmix++) {
                        if ( itemName.endsWith(nameComps[nmix]) || itemNameNoNum.endsWith(nameComps[nmix]) ) {
                            PNHStringMatch = true;
                        }
                    }
                } else {  // full match of any term only
                    if ( nameComps.indexOf(itemName) > -1 || nameComps.indexOf(itemNameNoNum) > -1 ) {
                        PNHStringMatch = true;
                    }
                }
                // if a match was found:
                if ( PNHStringMatch ) {  // Compare WME place name to PNH search name list
                    phlogdev('Matched PNH Order No.: '+currMatchData[ph_order_ix]);

                    PNHPriCat = catTranslate(currMatchData[ph_category1_ix]);
                    PNHForceCat = currMatchData[ph_forcecat_ix];
                    if (itemCats[0] === "GAS_STATION") {  // Gas stations only harmonized if the WME place category is already gas station (prevents Costco Gas becoming Costco Store)
                        PNHForceCat = "1";
                    }
                    if ( PNHForceCat === "1" && itemCats.indexOf(PNHPriCat) === 0 ) {  // Name and primary category match
                        PNHMatchProceed = true;
                    } else if ( PNHForceCat === "2" && itemCats.indexOf(PNHPriCat) > -1 ) {  // Name and any category match
                        PNHMatchProceed = true;
                    } else if ( PNHForceCat === "0" || PNHForceCat === "") {  // Name only match
                        PNHMatchProceed = true;
                    }

                    if (PNHMatchProceed) {
                        approvedRegions = currMatchData[ph_region_ix].replace(/ /g, '').toUpperCase().split(",");  // remove spaces, upper case the approved regions, and split by commas
                        if (approvedRegions.indexOf(state2L) > -1 || approvedRegions.indexOf(region3L) > -1 ||  // if the WME-selected item matches the state, region
                            approvedRegions.indexOf(country) > -1 ||  //  OR if the country code is in the data then it is approved for all regions therein
                            $("#WMEPH-RegionOverride" + devVersStr).prop('checked')) {  // OR if region override is selected (dev setting
                            if (devUser) {
                                t1 = performance.now();  // log search time
                                //phlogdev("Found place in " + (t1 - t0) + " milliseconds.");
                            }
                            matchPNHRegionData.push(PNHMatchData);
                            bannButt.placeMatched.active = true;
                            if (!allowMultiMatch) {
                                return matchPNHRegionData;  // Return the PNH data string array to the main script
                            }
                        } else {
                            PNHNameMatch = true;  // PNH match found (once true, stays true)
                            //matchPNHData.push(PNHMatchData);  // Pull the data line from the PNH data table.  (**Set in array for future multimatch features)
                            PNHNameTemp.push(currMatchData[ph_name_ix]);  // temp name for approval return
                            PNHOrderNum.push(currMatchData[ph_order_ix]);  // temp order number for approval return
                        }

                        currMatchNum++;  // *** Multiple matches for future work
                    }
                }
            }  // END loop through PNH places

            // If NO (name & region) match was found:
            if (bannButt.placeMatched.active) {
                return matchPNHRegionData;
            } else if (PNHNameMatch) {  // if a name match was found but not for region, prod the user to get it approved
                bannButt.ApprovalSubmit.active = true;
                //phlogdev("PNH data exists but not approved for this area.");
                if (devUser) {
                    t1 = performance.now();  // log search time
                    //phlogdev("Searched all PNH entries in " + (t1 - t0) + " milliseconds.");
                }
                return ["ApprovalNeeded", PNHNameTemp, PNHOrderNum];
            } else {  // if no match was found, suggest adding the place to the sheet if it's a chain
                bannButt.NewPlaceSubmit.active = true;
                //phlogdev("Place not found in the " + country + " PNH list.");
                if (devUser) {
                    t1 = performance.now();  // log search time
                    //phlogdev("Searched all PNH entries in " + (t1 - t0) + " milliseconds.");
                }
                return ["NoMatch"];
            }
        } // END harmoList function

        // KB Shortcut object
        var shortcut = {
            'all_shortcuts': {}, //All the shortcuts are stored in this array
            'add': function(shortcut_combination, callback, opt) {
                //Provide a set of default options
                var default_options = { 'type': 'keydown', 'propagate': false, 'disable_in_input': false, 'target': document, 'keycode': false };
                if (!opt) {opt = default_options;}
                else {
                    for (var dfo in default_options) {
                        if (typeof opt[dfo] === 'undefined') {opt[dfo] = default_options[dfo];}
                    }
                }
                var ele = opt.target;
                if (typeof opt.target === 'string') {ele = document.getElementById(opt.target);}
                // var ths = this;
                shortcut_combination = shortcut_combination.toLowerCase();
                //The function to be called at keypress
                var func = function(e) {
                    e = e || window.event;
                    if (opt.disable_in_input) { //Don't enable shortcut keys in Input, Textarea fields
                        var element;
                        if (e.target) {element = e.target;}
                        else if (e.srcElement) {element = e.srcElement;}
                        if (element.nodeType === 3) {element = element.parentNode;}
                        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {return;}
                    }
                    //Find Which key is pressed
                    var code;
                    if (e.keyCode) {code = e.keyCode;}
                    else if (e.which) {code = e.which;}
                    var character = String.fromCharCode(code).toLowerCase();
                    if (code === 188) {character = ",";} //If the user presses , when the type is onkeydown
                    if (code === 190) {character = ".";} //If the user presses , when the type is onkeydown
                    var keys = shortcut_combination.split("+");
                    //Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
                    var kp = 0;
                    //Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
                    var shift_nums = { "`": "~","1": "!","2": "@","3": "#","4": "$","5": "%","6": "^","7": "&",
                                      "8": "*","9": "(","0": ")","-": "_","=": "+",";": ":","'": "\"",",": "<",".": ">","/": "?","\\": "|" };
                    //Special Keys - and their codes
                    var special_keys = { 'esc': 27,'escape': 27,'tab': 9,'space': 32,'return': 13,'enter': 13,'backspace': 8,'scrolllock': 145,
                                        'scroll_lock': 145,'scroll': 145,'capslock': 20,'caps_lock': 20,'caps': 20,'numlock': 144,'num_lock': 144,'num': 144,
                                        'pause': 19,'break': 19,'insert': 45,'home': 36,'delete': 46,'end': 35,'pageup': 33,'page_up': 33,'pu': 33,'pagedown': 34,
                                        'page_down': 34,'pd': 34,'left': 37,'up': 38,'right': 39,'down': 40,'f1': 112,'f2': 113,'f3': 114,'f4': 115,'f5': 116,
                                        'f6': 117,'f7': 118,'f8': 119,'f9': 120,'f10': 121,'f11': 122,'f12': 123 };
                    var modifiers = {
                        shift: { wanted: false, pressed: false },
                        ctrl: { wanted: false, pressed: false },
                        alt: { wanted: false, pressed: false },
                        meta: { wanted: false, pressed: false } //Meta is Mac specific
                    };
                    if (e.ctrlKey) {modifiers.ctrl.pressed = true;}
                    if (e.shiftKey) {modifiers.shift.pressed = true;}
                    if (e.altKey) {modifiers.alt.pressed = true;}
                    if (e.metaKey) {modifiers.meta.pressed = true;}
                    for (var i = 0; i < keys.length; i++) {
                        var k = keys[i];
                        //Modifiers
                        if (k === 'ctrl' || k === 'control') {
                            kp++;
                            modifiers.ctrl.wanted = true;
                        } else if (k === 'shift') {
                            kp++;
                            modifiers.shift.wanted = true;
                        } else if (k === 'alt') {
                            kp++;
                            modifiers.alt.wanted = true;
                        } else if (k === 'meta') {
                            kp++;
                            modifiers.meta.wanted = true;
                        } else if (k.length > 1) { //If it is a special key
                            if (special_keys[k] === code) {kp++;}
                        } else if (opt.keycode) {
                            if (opt.keycode === code) {kp++;}
                        } else { //The special keys did not match
                            if (character === k) {kp++;}
                            else {
                                if (shift_nums[character] && e.shiftKey) { //Stupid Shift key bug created by using lowercase
                                    character = shift_nums[character];
                                    if (character === k) {kp++;}
                                }
                            }
                        }
                    }

                    if (kp === keys.length && modifiers.ctrl.pressed === modifiers.ctrl.wanted && modifiers.shift.pressed === modifiers.shift.wanted &&
                        modifiers.alt.pressed === modifiers.alt.wanted && modifiers.meta.pressed === modifiers.meta.wanted) {
                        callback(e);
                        if (!opt.propagate) { //Stop the event
                            //e.cancelBubble is supported by IE - this will kill the bubbling process.
                            e.cancelBubble = true;
                            e.returnValue = false;
                            //e.stopPropagation works in Firefox.
                            if (e.stopPropagation) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                            return false;
                        }
                    }
                };
                this.all_shortcuts[shortcut_combination] = { 'callback': func, 'target': ele, 'event': opt.type };
                //Attach the function with the event
                if (ele.addEventListener) {ele.addEventListener(opt.type, func, false);}
                else if (ele.attachEvent) {ele.attachEvent('on' + opt.type, func);}
                else {ele['on' + opt.type] = func;}
            },
            //Remove the shortcut - just specify the shortcut and I will remove the binding
            'remove': function(shortcut_combination) {
                shortcut_combination = shortcut_combination.toLowerCase();
                var binding = this.all_shortcuts[shortcut_combination];
                delete(this.all_shortcuts[shortcut_combination]);
                if (!binding) {return;}
                var type = binding.event;
                var ele = binding.target;
                var callback = binding.callback;
                if (ele.detachEvent) {ele.detachEvent('on' + type, callback);}
                else if (ele.removeEventListener) {ele.removeEventListener(type, callback, false);}
                else {ele['on' + type] = false;}
            }
        };  // END Shortcut function

        function phlogdev(msg, obj) {
            if (devUser) {
                console.log('WMEPH' + devVersStrDash + ': ' + msg, (obj ? obj : ''));
            }
        }
    } // END runPH Function


    // This function runs at script load, and splits the category dataset into the searchable categories.
    function makeCatCheckList(CH_DATA) {  // Builds the list of search names to match to the WME place name
        var CH_CATS = [];
        var CH_DATA_headers = CH_DATA[0].split("|");  // split the data headers out
        var pc_wmecat_ix = CH_DATA_headers.indexOf("pc_wmecat");  // find the indices needed for the function
        var pc_transcat_ix = CH_DATA_headers.indexOf("pc_transcat");
        var chEntryTemp;

        for (var chix=0; chix<CH_DATA.length; chix++) {  // loop through all PNH places
            chEntryTemp = CH_DATA[chix].split("|");  // split the current PNH data line
            var catID = chEntryTemp[pc_wmecat_ix];
            var catName = chEntryTemp[pc_transcat_ix];
            if (catID.trim().length > 0) {
                CAT_LOOKUP[catName.trim().toUpperCase()] = catID;
            }
            CH_CATS.push(chEntryTemp[pc_wmecat_ix]);
        }
        return CH_CATS;
    } // END makeCatCheckList function

    // This function runs at script load, and builds the search name dataset to compare the WME selected place name to.
    function makeNameCheckList(PNH_DATA) {  // Builds the list of search names to match to the WME place name
        var PNH_NAMES = [];
        var PNH_DATA_headers = PNH_DATA[0].split("|");  // split the data headers out
        var ph_name_ix = PNH_DATA_headers.indexOf("ph_name");  // find the indices needed for the function
        var ph_aliases_ix = PNH_DATA_headers.indexOf("ph_aliases");
        var ph_category1_ix = PNH_DATA_headers.indexOf("ph_category1");
        var ph_searchnamebase_ix = PNH_DATA_headers.indexOf("ph_searchnamebase");
        var ph_searchnamemid_ix = PNH_DATA_headers.indexOf("ph_searchnamemid");
        var ph_searchnameend_ix = PNH_DATA_headers.indexOf("ph_searchnameend");
        var ph_disable_ix = PNH_DATA_headers.indexOf("ph_disable");
        var ph_speccase_ix = PNH_DATA_headers.indexOf("ph_speccase");

        var t0 = performance.now(); // Speed check start
        var newNameListLength;  // static list length

        for (var pnhix=0; pnhix<PNH_DATA.length; pnhix++) {  // loop through all PNH places
            var pnhEntryTemp = PNH_DATA[pnhix].split("|");  // split the current PNH data line
            if (pnhEntryTemp[ph_disable_ix] !== "1" || pnhEntryTemp[ph_speccase_ix].indexOf('betaEnable') > -1 ) {
                var newNameList = pnhEntryTemp[ph_name_ix].toUpperCase();  // pull out the primary PNH name & upper case it
                newNameList = newNameList.replace(/ AND /g, '');  // Clear the word "AND" from the name
                newNameList = newNameList.replace(/^THE /g, '');  // Clear the word "THE" from the start of the name
                newNameList = [newNameList.replace(/[^A-Z0-9]/g, '')];  // Clear non-letter and non-number characters, store in array

                if (pnhEntryTemp[ph_disable_ix] !== "altName") {
                    // Add any aliases
                    var tempAliases = pnhEntryTemp[ph_aliases_ix].toUpperCase();
                    if ( tempAliases !== '' && tempAliases !== '0' && tempAliases !== '') {
                        tempAliases = tempAliases.replace(/,[^A-za-z0-9]*/g, ",").split(",");  // tighten and split aliases
                        for (var alix=0; alix<tempAliases.length; alix++) {
                            newNameList.push( tempAliases[alix].replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '') );
                        }
                    }
                }

                // The following code sets up alternate search names as outlined in the PNH dataset.
                // Formula, with P = PNH primary; A1, A2 = PNH aliases; B1, B2 = base terms; M1, M2 = mid terms; E1, E2 = end terms
                // Search list will build: P, A, B, PM, AM, BM, PE, AE, BE, PME, AME, BME.
                // Multiple M terms are applied singly and in pairs (B1M2M1E2).  Multiple B and E terms are applied singly (e.g B1B2M1 not used).
                // Any doubles like B1E2=P are purged at the end to eliminate redundancy.
                if (pnhEntryTemp[ph_searchnamebase_ix] !== "0" || pnhEntryTemp[ph_searchnamebase_ix] !== "") {   // If base terms exist, otherwise only the primary name is matched
                    var pnhSearchNameBase = pnhEntryTemp[ph_searchnamebase_ix].replace(/[^A-Za-z0-9,]/g, '');  // clear non-letter and non-number characters (keep commas)
                    pnhSearchNameBase = pnhSearchNameBase.toUpperCase().split(",");  // upper case and split the base-name  list
                    newNameList.push.apply(newNameList,pnhSearchNameBase);   // add them to the search base list

                    if (pnhEntryTemp[ph_searchnamemid_ix] !== "0" || pnhEntryTemp[ph_searchnamemid_ix] !== "") {  // if middle search term add-ons exist
                        var pnhSearchNameMid = pnhEntryTemp[ph_searchnamemid_ix].replace(/[^A-Za-z0-9,]/g, '');  // clear non-letter and non-number characters
                        pnhSearchNameMid = pnhSearchNameMid.toUpperCase().split(",");  // upper case and split
                        if (pnhSearchNameMid.length > 1) {  // if there are more than one mid terms, it adds a permutation of the first 2
                            pnhSearchNameMid.push.apply( pnhSearchNameMid,[ pnhSearchNameMid[0]+pnhSearchNameMid[1],pnhSearchNameMid[1]+pnhSearchNameMid[0] ] );
                        }
                        newNameListLength = newNameList.length;
                        for (var extix=1; extix<newNameListLength; extix++) {  // extend the list by adding Mid terms onto the SearchNameBase names
                            for (var altix=0; altix<pnhSearchNameMid.length; altix++) {
                                newNameList.push(newNameList[extix]+pnhSearchNameMid[altix] );
                            }
                        }
                    }

                    if (pnhEntryTemp[ph_searchnameend_ix] !== "0" || pnhEntryTemp[ph_searchnameend_ix] !== "") {  // if end search term add-ons exist
                        var pnhSearchNameEnd = pnhEntryTemp[ph_searchnameend_ix].replace(/[^A-Za-z0-9,]/g, '');  // clear non-letter and non-number characters
                        pnhSearchNameEnd = pnhSearchNameEnd.toUpperCase().split(",");  // upper case and split
                        newNameListLength = newNameList.length;
                        for (var exetix=1; exetix<newNameListLength; exetix++) {  // extend the list by adding End terms onto all the SearchNameBase & Base+Mid names
                            for (var aletix=0; aletix<pnhSearchNameEnd.length; aletix++) {
                                newNameList.push(newNameList[exetix]+pnhSearchNameEnd[aletix] );
                            }
                        }
                    }
                }
                // Clear out any empty entries
                var newNameListTemp = [];
                for ( catix=0; catix<newNameList.length; catix++) {  // extend the list by adding Hotel to all items
                    if (newNameList[catix].length > 1) {
                        newNameListTemp.push(newNameList[catix]);
                    }
                }
                newNameList = newNameListTemp;
                // Next, add extensions to the search names based on the WME place category
                newNameListLength = newNameList.length;
                var catix;
                if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "HOTEL") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Hotel to all items
                        newNameList.push(newNameList[catix]+"HOTEL");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "BANKFINANCIAL") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Bank and ATM to all items
                        newNameList.push(newNameList[catix]+"BANK");
                        newNameList.push(newNameList[catix]+"ATM");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "SUPERMARKETGROCERY") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Supermarket to all items
                        newNameList.push(newNameList[catix]+"SUPERMARKET");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "GYMFITNESS") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Gym to all items
                        newNameList.push(newNameList[catix]+"GYM");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "GASSTATION") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Gas terms to all items
                        newNameList.push(newNameList[catix]+"GAS");
                        newNameList.push(newNameList[catix]+"GASOLINE");
                        newNameList.push(newNameList[catix]+"FUEL");
                        newNameList.push(newNameList[catix]+"STATION");
                        newNameList.push(newNameList[catix]+"GASSTATION");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "CARRENTAL") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Car Rental terms to all items
                        newNameList.push(newNameList[catix]+"RENTAL");
                        newNameList.push(newNameList[catix]+"RENTACAR");
                        newNameList.push(newNameList[catix]+"CARRENTAL");
                        newNameList.push(newNameList[catix]+"RENTALCAR");
                    }
                }
                newNameList = uniq(newNameList);  // remove any duplicate search names
                newNameList = newNameList.join("|");  // join the list with |
                newNameList = newNameList.replace(/\|{2,}/g, '|');
                newNameList = newNameList.replace(/\|+$/g, '');
                PNH_NAMES.push(newNameList);  // push the list to the master search list
            } else { // END if valid line
                PNH_NAMES.push('00');
            }
        }
        var t1 = performance.now();  // log search time
        //phlog("Built search list of " + PNH_DATA.length + " PNH places in " + (t1 - t0) + " milliseconds.");
        return PNH_NAMES;
    }  // END makeNameCheckList

    // Whitelist stringifying and parsing
    function saveWL_LS(compress) {
        venueWhitelistStr = JSON.stringify(venueWhitelist);
        if (compress) {
            if (venueWhitelistStr.length < 4800000 ) {  // Also save to regular storage as a back up
                localStorage.setItem(WLlocalStoreName, venueWhitelistStr);
            }
            venueWhitelistStr = LZString.compressToUTF16(venueWhitelistStr);
            localStorage.setItem(WLlocalStoreNameCompressed, venueWhitelistStr);
        } else {
            localStorage.setItem(WLlocalStoreName, venueWhitelistStr);
        }
    }
    function loadWL_LS(decompress) {
        if (decompress) {
            venueWhitelistStr = localStorage.getItem(WLlocalStoreNameCompressed);
            venueWhitelistStr = LZString.decompressFromUTF16(venueWhitelistStr);
        } else {
            venueWhitelistStr = localStorage.getItem(WLlocalStoreName);
        }
        venueWhitelist = JSON.parse(venueWhitelistStr);
    }
    function backupWL_LS(compress) {
        venueWhitelistStr = JSON.stringify(venueWhitelist);
        if (compress) {
            venueWhitelistStr = LZString.compressToUTF16(venueWhitelistStr);
            localStorage.setItem(WLlocalStoreNameCompressed+Math.floor(Date.now() / 1000), venueWhitelistStr);
        } else {
            localStorage.setItem(WLlocalStoreName+Math.floor(Date.now() / 1000), venueWhitelistStr);
        }
    }

    // Removes duplicate strings from string array
    function uniq(a) {
        "use strict";
        var seen = {};
        return a.filter(function(item) {
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });
    }  // END uniq function

    function phlog(m) {
        if ('object' === typeof m) {
            //m = JSON.stringify(m);
        }
        console.log('WMEPH' + devVersStrDash + ': ' + m);
    }

    function zoomPlace() {
        if (W.selectionManager.selectedItems.length === 1 && W.selectionManager.selectedItems[0].model.type === "venue") {
            W.map.moveTo(W.selectionManager.selectedItems[0].model.geometry.getCentroid().toLonLat(), 7);
        } else {
            W.map.moveTo(WMEPHmousePosition, 5);
        }
    }

    function sortWithIndex(toSort) {
        for (var i = 0; i < toSort.length; i++) {
            toSort[i] = [toSort[i], i];
        }
        toSort.sort(function(left, right) {
            return left[0] < right[0] ? -1 : 1;
        });
        toSort.sortIndices = [];
        for (var j = 0; j < toSort.length; j++) {
            toSort.sortIndices.push(toSort[j][1]);
            toSort[j] = toSort[j][0];
        }
        return toSort;
    }

    function destroyDupeLabels(){
        WMEPH_NameLayer.destroyFeatures();
        WMEPH_NameLayer.setVisibility(false);
    }

    // When a dupe is deleted, delete the dupe label
    function deleteDupeLabel(){
        //phlog('Clearing dupe label...');
        setTimeout(function() {
            var actionsList = W.model.actionManager.actions;
            var lastAction = actionsList[actionsList.length-1];
            if ( 'undefined' !== typeof lastAction && lastAction.hasOwnProperty('object') && lastAction.object.hasOwnProperty('state') && lastAction.object.state === 'Delete' ) {
                if ( dupeIDList.indexOf(lastAction.object.attributes.id) > -1 ) {
                    if (dupeIDList.length === 2) {
                        WMEPH_NameLayer.destroyFeatures();
                        WMEPH_NameLayer.setVisibility(false);
                    } else {
                        var deletedDupe = WMEPH_NameLayer.getFeaturesByAttribute('dupeID', lastAction.object.attributes.id) ;
                        WMEPH_NameLayer.removeFeatures(deletedDupe);
                        dupeIDList.splice(dupeIDList.indexOf(lastAction.object.attributes.id),1);
                    }
                    phlog('Deleted a dupe');
                }
            }
            /*
            else if ('undefined' !== typeof lastAction && lastAction.hasOwnProperty('feature') && lastAction.feature.hasOwnProperty('state') && lastAction.object.state === 'Update' &&
            lastAction.hasOwnProperty('newGeometry') ) {
                // update position of marker
            }
            */
        },20);
    }

    //  Whitelist an item
    function whitelistAction(itemID, wlKeyName) {
        'use strict';
        var item = W.selectionManager.selectedItems[0].model;
        var addressTemp = item.getAddress();
        if ( addressTemp.hasOwnProperty('attributes') ) {
            addressTemp = addressTemp.attributes;
        }
        var itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(item.attributes.geometry.getCentroid().x,item.attributes.geometry.getCentroid().y);
        if (!venueWhitelist.hasOwnProperty(itemID)) {  // If venue is NOT on WL, then add it.
            venueWhitelist[itemID] = { };
        }
        venueWhitelist[itemID][wlKeyName] = {active: true};  // WL the flag for the venue
        venueWhitelist[itemID].city = addressTemp.city.attributes.name;  // Store city for the venue
        venueWhitelist[itemID].state = addressTemp.state.name;  // Store state for the venue
        venueWhitelist[itemID].country = addressTemp.country.name;  // Store country for the venue
        venueWhitelist[itemID].gps = itemGPS;  // Store GPS coords for the venue
        saveWL_LS(true);  // Save the WL to local storage
        WMEPH_WLCounter();
        bannButt2.clearWL.active = true;
    }

    // Keep track of how many whitelists have been added since the last pull, alert if over a threshold (100?)
    function WMEPH_WLCounter() {
        localStorage.WMEPH_WLAddCount = parseInt(localStorage.WMEPH_WLAddCount)+1;
        if (localStorage.WMEPH_WLAddCount > 50) {
            alert('Don\'t forget to periodically back up your Whitelist data using the Pull option in the WMEPH settings tab.');
            localStorage.WMEPH_WLAddCount = 2;
        }
    }

    var _googleLinkHash = {};
    function modifyGoogleLinks() {
        // MutationObserver will be notified when Google place ID divs are added, then update them to be hyperlinks.
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // Mutation is a NodeList and doesn't support forEach like an array
                for (var i = 0; i < mutation.addedNodes.length; i++) {
                    var addedNode = mutation.addedNodes[i];
                    // Only fire up if it's a node
                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        if(addedNode.querySelector('div .placeId')) {
                            var placeLinkDivs = $(addedNode).find('.placeId');
                            for(i=0; i<placeLinkDivs.length; i++) {
                                var placeLinkDiv = placeLinkDivs[i];
                                var placeLinkId = placeLinkDiv.innerHTML;
                                if (_googleLinkHash.hasOwnProperty(placeLinkId)) {
                                    placeLinkDiv.innerHTML = _googleLinkHash[placeLinkId];
                                }
                            }
                        }
                    }
                }
            });
        });
        observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
        $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
            try {
                if (originalOptions.type === "GET") {
                    if (originalOptions.url === "/maps/api/place/autocomplete/json" && !originalOptions.data.hasOwnProperty("location")) {
                        options.data = $.param($.extend(originalOptions.data, {
                            location: W.map.getCenter().transform(W.map.getProjection(), W.map.displayProjection).lat + "," + W.map.getCenter().transform(W.map.getProjection(), W.map.displayProjection).lon,
                            radius: 3200
                        }));
                    }
                }
            } catch(e) {}
        });
        $(document).ajaxSuccess(function(event, jqXHR, ajaxOptions, data) {
            try {
                var ix;
                if (ajaxOptions && ajaxOptions.hasOwnProperty("url")) {
                    if (ajaxOptions.url.startsWith("/maps/api/place/details/json")) {
                        if (data && data.hasOwnProperty("status") && data.status === "OK") {
                            if (data.hasOwnProperty("result") && data.result.hasOwnProperty("url") && data.result.hasOwnProperty("place_id")) {
                                var gpids = document.getElementsByClassName("placeId");
                                for (ix = 0; ix < gpids.length; ix++) {
                                    if (data.result.place_id === gpids[ix].innerHTML) {
                                        var html = "<a href='" + data.result.url + "' target='_wmegpid'>" + data.result.place_id + "</a>";
                                        _googleLinkHash[data.result.place_id] = html;
                                        gpids[ix].innerHTML = html;
                                    }
                                }
                            }
                        }
                    }
                    if (ajaxOptions.url.startsWith("/maps/api/place/autocomplete/json")) {
                        var uuids = document.getElementsByClassName("uuid");
                        for (ix = 0; ix < uuids.length; ix++) {
                            if (uuids[ix].className === "uuid") {
                                events = $._data(uuids[ix], "events");
                                if (events && events.hasOwnProperty("change") && events.change.length === 1) {
                                    $(uuids[ix]).change(function(event) {
                                        if (event && event.hasOwnProperty("val")) {
                                            $.get(W.Config.places_api.url.details, {placeid: event.val, key: W.Config.places_api.key});
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            } catch(e) {}
        });
    }

    // Run the script...
    placeHarmonizer_bootstrap();


    function insertCss( code ) {
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = code;
        document.head.appendChild( style );
    }  // END insertCss funtion

    var cssServButts =[
        '.serv-247 { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-ac { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-credit { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-deliveries { width: 86px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-drivethru { width: 78px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-outdoor { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-parking { width: 46px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-reservations { width: 55px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-restrooms { width: 49px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-takeaway { width: 34px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
        '.serv-valet { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAD8GlDQ1BJQ0MgUHJvZmlsZQAAOI2NVd1v21QUP4lvXKQWP6Cxjg4Vi69VU1u5GxqtxgZJk6XpQhq5zdgqpMl1bhpT1za2021Vn/YCbwz4A4CyBx6QeEIaDMT2su0BtElTQRXVJKQ9dNpAaJP2gqpwrq9Tu13GuJGvfznndz7v0TVAx1ea45hJGWDe8l01n5GPn5iWO1YhCc9BJ/RAp6Z7TrpcLgIuxoVH1sNfIcHeNwfa6/9zdVappwMknkJsVz19HvFpgJSpO64PIN5G+fAp30Hc8TziHS4miFhheJbjLMMzHB8POFPqKGKWi6TXtSriJcT9MzH5bAzzHIK1I08t6hq6zHpRdu2aYdJYuk9Q/881bzZa8Xrx6fLmJo/iu4/VXnfH1BB/rmu5ScQvI77m+BkmfxXxvcZcJY14L0DymZp7pML5yTcW61PvIN6JuGr4halQvmjNlCa4bXJ5zj6qhpxrujeKPYMXEd+q00KR5yNAlWZzrF+Ie+uNsdC/MO4tTOZafhbroyXuR3Df08bLiHsQf+ja6gTPWVimZl7l/oUrjl8OcxDWLbNU5D6JRL2gxkDu16fGuC054OMhclsyXTOOFEL+kmMGs4i5kfNuQ62EnBuam8tzP+Q+tSqhz9SuqpZlvR1EfBiOJTSgYMMM7jpYsAEyqJCHDL4dcFFTAwNMlFDUUpQYiadhDmXteeWAw3HEmA2s15k1RmnP4RHuhBybdBOF7MfnICmSQ2SYjIBM3iRvkcMki9IRcnDTthyLz2Ld2fTzPjTQK+Mdg8y5nkZfFO+se9LQr3/09xZr+5GcaSufeAfAww60mAPx+q8u/bAr8rFCLrx7s+vqEkw8qb+p26n11Aruq6m1iJH6PbWGv1VIY25mkNE8PkaQhxfLIF7DZXx80HD/A3l2jLclYs061xNpWCfoB6WHJTjbH0mV35Q/lRXlC+W8cndbl9t2SfhU+Fb4UfhO+F74GWThknBZ+Em4InwjXIyd1ePnY/Psg3pb1TJNu15TMKWMtFt6ScpKL0ivSMXIn9QtDUlj0h7U7N48t3i8eC0GnMC91dX2sTivgloDTgUVeEGHLTizbf5Da9JLhkhh29QOs1luMcScmBXTIIt7xRFxSBxnuJWfuAd1I7jntkyd/pgKaIwVr3MgmDo2q8x6IdB5QH162mcX7ajtnHGN2bov71OU1+U0fqqoXLD0wX5ZM005UHmySz3qLtDqILDvIL+iH6jB9y2x83ok898GOPQX3lk3Itl0A+BrD6D7tUjWh3fis58BXDigN9yF8M5PJH4B8Gr79/F/XRm8m241mw/wvur4BGDj42bzn+Vmc+NL9L8GcMn8F1kAcXgSteGGAAAACXBIWXMAABcSAAAXEgFnn9JSAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAAQr0lEQVRoBcWZB3RVRRqAXyoQ6b0rvQaQXkR6KIYamgklEAQERHbpCC4KoYlUpXnoCEKUaGgCSgtNighIT8zSQk2CASFA8t5+/3Dnenl5ScD17M45ydw795+/t5nnYXu54Qa4B38Ovc3hcLjfunUrX7ly5aoVKlSoRrVq1TzOnTt3R3//G2ahmdYwv3mmBeFi3d1YS5H53XffLXn9+vXOdevWbfbo0aO8LJWx2+3ZcuXK9S+ezwgMQwiZQquVl/snNO2ypXXr1kUPHjyYH/z2evXqXVu3bt1dlh0TJ050588u2s1wCPCePXsEoWPatGk5nj59OvrixYuf371718/b2zulYMGCPzPvfPDgwbK8efNGREVF3csQaQYAXbp08Th79qwSguf+0dHRX2XOnPmf7u7ufe7fv9+oadOm10+fPh0NX6Iod9M0aeEVhGFhYcoKnTt3bgiTM588eVLb09Nzdb58+Ra2atUqeuTIkbfT2v8X101LBAQEDERpC93c3E6XLVt2Q1JSUjPeG3t5eSVXqlSpy4YNG77NkIZYQgO1adMmuEqVKklsvuTv799Rr//dsyhO4+zWrVsv6NnLlCmzUWJR1qEdXrFiRUepUqXsNWrUiOnfv391De9ytgrRsmXLfiB01KlTZ+e4ceMKWTcEBwf7tmjRYrSvr++8ChUqLGjSpMmgxYsX+xgwGVrcistK86233uqEBZKqVq26TcOAez1JxUGMjGjevHlX6CWIgvX3tGalmZCQkLavv/56Su3atTft3r07qwZGE6VYm0eWiuX7vZo1a55o1KjRQYQaBZxOIi8jiGhcab1+/fpNYTK5YcOGZzdv3pxLaII7jDUHdEbJ+8CBA/NXrVI1BiX3kXeXo3HjxoqR999/vwAbL1SuXPnU2LFj82lgzNsGN4sBcRzmnYP2Wg4fPlwyl3X8JSHQdv0SJUrcfeONN87j/8XFpRo0aLBB3AkBh2sCWGdC+fLlk7GIv15znk0GQBAKgj/Y1EwDYdL2rD1AgLMgqaPX/4vZtMSbb75Zv2TJknHQjRIhBCeKDEeRDqwzTNPA6sG4mB1hN0+fPj2bXneelTUGDBhQBmZjcZ81GqB3795+CJFIrByeO3euIiTfgoKCKkJwHOaPJC3OJmCzGHuUq+j9LubnhCCo47BI1Jo1a4piCS9cdieWd4B3qN5LPXkXSzzFOntmzZpVJC06Yg1lEZBIAP/erl27FgJ87Ngxr1q1au0nJq6SbkvJGsHp2axZswlo7Caw8Xzbzt+Ivn37ai2lJ4gpBMLXJ7DjKK5aCPfq1avvEiHwgCFCC5zlSPURknRQWhgJRScdwWN6kcDasICXzASyD0gOwfgOnfYwewjWeIw7DRAYWccyswUxcOuFGQ3L5+cRy4bnhymEn5+fEgLLR61cubIIiSIzSjkkQqDEgXob7rZCMhZKm6fXmHVSeZYl9Ifjx4+rdiIxMbEaBec1qvUOCpFdkFOI+r7yyivHMPNagUegQVTyYVT1T48ePdpt165dBwXWwJVeW6KtZCdp1Lt27VoEbUd8nz59GmXJkiV+8ODB+8BTlzoRHBERsUjwBQYGNk9ISOhNZf/+119/1W4mSk826P0piJHD1Qc2NQQgU86cOU8L4IIFC2rSllTIkSPHrtGjR98Hca4bN24MRdAfGSMMZN5GMdOMGst/TlhMu64Sgi5hG8wlUYsa58mTJ37ChAn7PDw8fImBzuHh4StlZ48ePRrD/GrgfsMq/zSwPSeErJmmMQDUFB8fXwjGY1599dWTsnDp0qXSaOmhj4/PAXn/7bffAmgQC+PXI0+cOCFLnjD5FJg0LSGK4rvAplCx68LcJvAl4D7SdMaT3vdlz569MgXw7RUrVqi2g+TSAPwb2JeM2weg0HPsl/r2VBBZh0vtgdiGa/1B8N0X4Nu3b2dHIw+LFCkSa2yuDuMXCxQosN94d2QkBIIIqL179+51aPO3gi8RgRqgrFgyoAhRiVgzhejXr1/dX375ZSN7npB42nzxxRe/8Cz8avfl8c9hCmIQUl/Qtgddpo1OVrkasZGDRjEhJSVFnTOwlo8wQtP46E9ULp/EBB5aCNJ0LYSQlsPRoUOHllmzZk2cNGlSJHh8yUQ9lyxZoiwhQhCv66H3hOD2x0IihMbj0upW1zIBOCBFsHE/Af2Y2YYL7WE6AyHV5ebPn389wmWVLMa6DFda0tpTnXPPnj1rnjp1ajNKkvh4E4v7LFy48BSxUYAEEjBz5swtgmjQoEG1Dh06FP748WMbmay1FgIPsKdndeW0giCdITCmkOnAWT9pIWwwm3/v3r1NLly4MAcNe7Rv3166BE8y0o8w5ob7BixatGgXVvPmfNGEc8cqZH1C+m1PYfwZWI+MhBDCEjgvPEAotOWQlaZgkrn0gQgrBO/cuXNpbGzsQPbdxRKtcNk8W7Zs2QGz98hCAQi6jxoUTDzMlUzIOec+tanjl19++cJCiABW17IKpC1lMiwMwoy4kPx5kUVs9EV2KYhoU7mWwOhDGC1OnyNHjnxC4niCK67CfWZQd/JSk7ZjmRjqhD9ZKFqIgrc93xoULVo0jMAeT+txkWX3F7GE7H/hYdSH9ODFspk0AMHai77JgaD3qA0NZJ2C54+7PCauTpO5CmvYIUOGNKCtuYdiTp4/f163NqJgrUwNmu6cIbC09LiSyl6dOnUK5Jxelgy2n77nVyxx0xk77vTOmTNn5mOJTAw7KfsT5ku42zwCPAbL+H322WexHTt2bEXxa3j58uVewD4loXTbuHHjUfCJEJIgTG9wpuHqPV1BrELQa42n4k/CDcQV4qnqscnJyWeyZct2kxbjCGeTC7QbTfH1yaTn3Qi95OTJk70opu3xext14hSpNGDp0qVRZMP3r1y58hEC5KAtuYylAtauXXscBjU/LyWECKY3phLSWQiq/SSY3lK6dOn5aLck/lsfjRbHOhUJ4CTqigf9WCGE28be7vPnz0/cunVrPvx9DpkokLbj223btnWUhEEL/hNXSbWw1k8IMYBOVjoIiYl0C2sqJjNaECE0DM9j6EblnBxOK6/P4uqzNJPETw0Ye4vWYgwwHw8bNky3194CRIuREzdcKzj4G4wwr4HzHNZx0GO1MejI3ZRZnI01m7Gmle3m9O78XW97NluFIC2OEYKkyW+2b9/+igEpDJqCPr/bfJPcLwwouB9++CEPeL/FKnclqMl0j6gfc7GEOjYYDJqbXTxoYfQn53e9/my2CkFQjhUtcpwMj4mJyWxAKsLyLMSNbCbMyrpG7qxZlc3olSrAfBxdgwNBJgkOYzjD63UbFpdmVOGVWTyA2YTnObVCrUJgCTkdKnfimlIfW1NvMkmqBzdN1LKsiApxgn868eDABadavqcqyJoPOoBiuOxcUnMLgWd/E74tx02ryDvFtQhN5mJuUeTI8ew8Ipt1ikWI8VxKT6Oh28gdVhDIpDEUIcxDjGx0MZ4LVMNd7KI1GsRQEsQoksWXZLWJshcXEyuqPkze9YAPZYGbN2++SpEMJJGUk2/37t0rxZ8fa7nlnS4g98OHD9uREcvKu2hMWg7FJDcVExBiEgeqb6ZMmRLUtm3bh3x3JYR2I8HhciCIggGHH645Apxh+/fvDyZ1PxYh6G5TnSkMiyrhOMRVB9aTzBYtBEjVDrJkIqk+Sd7JlnLUeEDXoHgXQVR7QUx8SJ34GARfQTCQKyDZ4CyEEpx1YVKeMxSI2lIYBhKIi8UwJkRdCsG6jcQiVlL8oP3W7LvB1c8B+caoxbtP4cKFE+WlWLFi1Uj1eeH5hrwLMzZuKkZwePqIorWOdrovBJ+w7CyEMC1ErH9SuNISRuGmTb8mdYYKrq9uFKPs00MrxYOOQOjacOfOuFBzzilfDx06NBHXz8l7Q/AcJ9OdFRjqWiPeE/Ag9ROGIgZQM6qx5PnJRkxIirXGhBBT1ZbDkS/u4j9q1KiigpDhUhiIK3huWqTY/c54Q0ETF0b8GK9qvwinXIrWpTvWWIYrRoJjtgDR4vRgKsYZaK28U2Rzc16pTXexmbPLdVlTgiD5cloFO5cBAbLIEP9VmjaIOpYvX54Zd5tC0EZevXp1044dO76n1Qgw/DqVMDChNE+s3aBlP89f+c8//1zdHVsFkRQeEhJSmrN7JwrqSu4D1pEUThCv73GOT5g6dWquuLi4wXQOp7k62i7MHT58uC74isOztPoy3FT649Bzlv6/KuYK6dq1627a7yt8lG8OI4s4uCLqTyaZSh3Yh78v44xREc0FoZE9nPxEK6IUZQVmG/vkWeHAvUrw3BE32EXvdVWvM9to5yvS9a66c+fOEHw+KzG6gDQ9knP8v+U7NKYT6H7ExEjafjny2hA0lKkgx+Mp8HqXZw8hLucMKVIfyKHmwIEDH7EmIwVtiYtJCvXmV6IeZIjDNH0dOPJOQWOd0cojMlJNBf0sdpQVjXeZ1Du4jwoNcNQ3viXrrIaL3EGA5az3oGY0jIyM/JAT421oelBAp5OdhhYvXnwKt/Jfy17qi9xxdc6dO/fXdNHnZQ1cqkoqLcLceRidgPRNyGDvCACHJJnUILDcORDZOPwoeDJIDpa88V9lVQ1nnRFAuS5F6xiM3YApVROAUTiY3XDR21wNLcJlw1avXq3uBLhdqUVbtB1eRkFvzuTJk2cIXmmTSBoTqXG3yHDzZY0hlxJ2IWQ3Wg0BXIRpIzhzTO7Vq5cUGski3pLF0MBazFyXdj6cS7OJmHQD31KIr0hmGc+5luDUWYgfLtui+YrgiX0Gav6X06VnCDEiFZqYG4yl17BvK25eASH+gYLH4UJSz2zcuIRiPTlJjps9e3aUrKEg5yyo0q2NjrQ8PnqLS+QD1BN9YpNLukzk9A9Zv4wLxJHhDiGU7l4Fp+lWWjGyCHOBWMZO9vqRW8rissYQoZW16JZfo5/bROtynUL5O0xHIcx8LudKKUjjHzCqbaJUzNLrVjp6TSQTRhQzQpwjqYMs9Q3rPiYQDyNGjCgBgho6AxnfXArBD0DdBQ/XOgfkNsWAVQLwrPa89957+VBMEK4yEP/v+MEHHxQz4NREEsrFjf8i6dNQ5CqspTIfH9N0aQkaTUR+YBlA2+3A5OsRRne/zpsF3qUQ1Jq3sYQIERkaGqrPKM77zb1W5vUzNcWf/SflJzes9DF8eBnfTD41bKrZai5MPVCu8qkJX1vczJtTYiar0ILEuo8fY4JECLrTPTNmzChoEBEhnBk334XJ7777LhuXEb54QiCuu5q/P3DlaDre3gYOmaTjeLEB4yYwGhlg/Ah5QH7FsmAwtWsVQixhuFPkvHnz9O+Ogs9k2sCh3uW3R1wrlGK4lziIxBOuoMAk5lPMY3Bl7ZI2K18WPtJ/tG6iogahnTgJSOKnp2WnBz8KaXPrwHaQ/39YtmyZFsKVJQSFcg+uSIuRNNZjvUNofymK+5Si/I7Tz+D6mGsh/RKPVk1zzVMBYnsNv1/pHJTiTmI5stMuGjv9C29aQphc4FJuWC47P37qIDa/yQNW8RKY5xb/yosRCwqR+DCZYwrWScEdotFcB8FJQpBbEhHisCUmXLnTi7Ig9Mxj7otuyhDO0IgZN1inKVebZ7HOU6x0VGICIQ5ahMjQEhaiwrTAqz9R3N9iAQsBV49CTA0I5qeVCcWdTuLXYePHjy9hfHoZIYwt/4fJcDUzj/OeFQ3qd5mVG/6vWfsPmqiSFHBK/rQAAAAASUVORK5CYII=) top center no-repeat; }',
        '.serv-wheelchair { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAD8GlDQ1BJQ0MgUHJvZmlsZQAAOI2NVd1v21QUP4lvXKQWP6Cxjg4Vi69VU1u5GxqtxgZJk6XpQhq5zdgqpMl1bhpT1za2021Vn/YCbwz4A4CyBx6QeEIaDMT2su0BtElTQRXVJKQ9dNpAaJP2gqpwrq9Tu13GuJGvfznndz7v0TVAx1ea45hJGWDe8l01n5GPn5iWO1YhCc9BJ/RAp6Z7TrpcLgIuxoVH1sNfIcHeNwfa6/9zdVappwMknkJsVz19HvFpgJSpO64PIN5G+fAp30Hc8TziHS4miFhheJbjLMMzHB8POFPqKGKWi6TXtSriJcT9MzH5bAzzHIK1I08t6hq6zHpRdu2aYdJYuk9Q/881bzZa8Xrx6fLmJo/iu4/VXnfH1BB/rmu5ScQvI77m+BkmfxXxvcZcJY14L0DymZp7pML5yTcW61PvIN6JuGr4halQvmjNlCa4bXJ5zj6qhpxrujeKPYMXEd+q00KR5yNAlWZzrF+Ie+uNsdC/MO4tTOZafhbroyXuR3Df08bLiHsQf+ja6gTPWVimZl7l/oUrjl8OcxDWLbNU5D6JRL2gxkDu16fGuC054OMhclsyXTOOFEL+kmMGs4i5kfNuQ62EnBuam8tzP+Q+tSqhz9SuqpZlvR1EfBiOJTSgYMMM7jpYsAEyqJCHDL4dcFFTAwNMlFDUUpQYiadhDmXteeWAw3HEmA2s15k1RmnP4RHuhBybdBOF7MfnICmSQ2SYjIBM3iRvkcMki9IRcnDTthyLz2Ld2fTzPjTQK+Mdg8y5nkZfFO+se9LQr3/09xZr+5GcaSufeAfAww60mAPx+q8u/bAr8rFCLrx7s+vqEkw8qb+p26n11Aruq6m1iJH6PbWGv1VIY25mkNE8PkaQhxfLIF7DZXx80HD/A3l2jLclYs061xNpWCfoB6WHJTjbH0mV35Q/lRXlC+W8cndbl9t2SfhU+Fb4UfhO+F74GWThknBZ+Em4InwjXIyd1ePnY/Psg3pb1TJNu15TMKWMtFt6ScpKL0ivSMXIn9QtDUlj0h7U7N48t3i8eC0GnMC91dX2sTivgloDTgUVeEGHLTizbf5Da9JLhkhh29QOs1luMcScmBXTIIt7xRFxSBxnuJWfuAd1I7jntkyd/pgKaIwVr3MgmDo2q8x6IdB5QH162mcX7ajtnHGN2bov71OU1+U0fqqoXLD0wX5ZM005UHmySz3qLtDqILDvIL+iH6jB9y2x83ok898GOPQX3lk3Itl0A+BrD6D7tUjWh3fis58BXDigN9yF8M5PJH4B8Gr79/F/XRm8m241mw/wvur4BGDj42bzn+Vmc+NL9L8GcMn8F1kAcXgSteGGAAAACXBIWXMAABcSAAAXEgFnn9JSAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAAOV0lEQVRoBc2aCXBV1RnH35aFJBAIe0AkrGGTRZRdCUwRkM1d9hERFIoWcXfGUrWWlhY6pThAUVqQQWGUgoFQXFiKSpCdEkAEWSSyhpAESEjyXn//k3ufL8/3kiBxhjNzc+895zvfvp374nT8OJw8+h566KGES5cu1SksLHRrKSIiwsl1Zc2aNUctUANnPd80NzGl4eLy9uzZs8uJEyc+ys/Pr+VyuTxORnFxcRFr7ho1aiw4dOjQUwK+GUcpQRo1arSkoKBgVKtWrS7C+OmioiKtRx85cqTx2bNnHQkJCb2++eabLczJWsU3k0AeixkjUHR09Mlr1645sEqNzMzMGK/X68Io3itXrjiioqKyES7LgvfdTEKIF7mUhld/2rdv/1a1atVewa02EyM7cauvEObbq1evOpg/NXny5OOCY9x0gpSwVfLXdjPz5vP5TLDPmjUroUmTJt+1bNly19q1a6NYFJwsqfUbuYTDViSPlTvE5E+QN2/efCeCZFQuKT+2n9Dzr1zHQykrBO4jDbtXrFhRPGnSpHpYIh0XS2zatOkbuNtx4iWOWLrmdrs9pOZIrOdj3Us8+UgQhdxdrLl1x0ULNM9rJHuLATMwJI+smJiY3Yxj0JUwxr0Debie53CCaN7Xu3fvWgR+KsHeBUYcxI4Dng1+mAtJR+vBa3q355HF4EFA3S+QQAbs37//a5DdkDB21gpmSkiLKYxDJQQxsqZ+/fpzCHonGjWugGDFXFdlDBjycndyeXTBrCxg5vUs5MC4rHWn9oKn/969e1+AxgSWJUhozWhzBUY4QcxWakquHmCg6Pz589cQJFLahQkNFczYQBq8G6aBD8WUsbLgESSfmlTF4/EIl0kqIhOI63qfwwli/JWYSMUFPqEIDoW4LrlNHsT9dGzmrQlbAGTxseQUvOLHPw/z0Vgpgi7BERcXd+HWW29ddOzYMT++n/tgEwi13/is0u+cOXN2wEx1Kv5g2peDCnB5ijYFMGlw2PN6QXADYxVUJxb2JSYmRmVkZPyJYH+4bdu2/davX/+JQLl+sU7BL2RSUtIu0u9BMVcZo1OnToMaNGiQP3jw4CQLn4m7G8FdLgJcxI2W5YI+sktkIDHWXKNGjWp27733th04cGC7ESNGNAlct55dt99+ewTPLrKgcWUso9ZH7hfOtUOgKXuqIogMRdwpZsmSJYn33HOPh5Q8PC8vr8ctt9xSHyHbSiCRgblCNL2Lu9LqV1zvbd68+bsdO3aYoNq4caMd2IYr4u+GAjxQtLCCTJ8+3cmliC3CrfLOnTvXbtmyZbspePEw7qhSpUoGQuwmeLdzMV2klBrFVQUGO1y8eHEAme51hP2ibt26v9++fXsahAtFHFjDA4XV3H/JP4oPEyN33333gIYNG16rWbOmr3HjxnsJ+PG9evXqVB7x7t27d2jduvU4BDmNID4y4JauXbt20T5wDARnPtZtZuEp18XLoxfKIkJqXIGg/A2pdzbvxymK74wfP37GxIkTjVanTJkSRQpNzM3NbYkFumA5N1aSdfY3a9bshwULFuxm327gln755ZdTTp8+PZM0u7Vbt26PEyNNKITuyrSIPzNZEuvd+C2Mz7p8+fLUyMjIlR07dhy7evVqUxzvYGRlZY0nRkaSXlUUo1Rf5G5W+1HAs4+zzQqK3pyvGcI9bNiwxrt27ZqN0MPYI0XlgveO1NTUwzz7lSfYnzMCBfEL0aJFi7/k5OQ8W7t27bn79u37tRCjyWTiZBbVfQB8FnE+WY5GVyPoJSyRgyUc7Imnl4yl1gxC0LESjLXl9erVe3Hr1q3HhAd3mweeiSSPHM4/3dLS0jKIRRfXj1VWgDcwTEYhVT5NX+Vr167dIhsXc09RyHwwlAsjL+Pb9e21cHdSbcPbbrvtz8SCjxjJJj4G27DJycnvKm4oiK9ac6Fc3Aav+F0tu6AJ4jtJnz58/DO0bgIQxqdpjqK4dciQIXUDsMqC2ie4wEtzfksPHTq0NUliq5SDYM+zZgZzH2kuJSXFJAAmDT1r+Wfd/ETJMOkQyEGwBsKEDxtLoMGPSJ8qahrSXkWI2sI5li9f7kY5K2VVrDtMSBQzeie1f6H3yhjGGsTwE0KMS6mtduA+KbIEQf+FLYRdma+HqL1nw4YNHpSUjktdws0aCweKmiaa0O6v9zZt2qhzED/25Vey1ssd8+fPj+E4u5/PQd8SdNHaQFe6Bf/Oxjr19G4zpOfrHfZeeqtkrC7XXS4cvMdAJ4u5zWXgrLgwPXr0aCMCxMNzQti5c+eh0lSHDh1esAiEC0YRkQvpHvhsbSt1M+5IbZpF0vBhFVNUscbrZEfRekaWgfYQXWTJQSggzsJQrjAGOe1EH1oLBwQ+10bS6GBqw2Uq8L8sRKFSo5Cr5mhN98DnsIRJ139T3YHmZPao/vyHuuL4/vvv/3rmzJk0CueqU6dOraJ4fkzRvF8wjLD4SpZLfNFRtWrVmSD08iHgZYpgLLXj7wi2kYr8LoDy12BBjBDsca5bt24gB6S3aGEew2UKYML+2hJMXII6YTgbhSVD58Fp06bNJGZyjh49+ohoJCUlTaeIvh8bG3syOzv7Tu67EW6T9nFpf/gxZsyYBnIjAi1VUPhsitwM846xdplkEIDBzyCu+I5SKAwUsK9QeCimC0LBBuIiUz1IIsnv169fkubZs5JEsMPeN3fu3DjiMweeXrLmjOfY66HuLiqxPgo4aCnOWwD1Zfr4+PizoTYwZ5BSE4ajtXEQXMh5JIkak0jbvpDT4BPUowesvX6hrXejVTzgCu9RWCVZ81j/PDwkjxs3rone9+zZ42ZOn5sC65aWwg4PyHBR5zXaiS2CQoAGtN95IN5n7Qo2qXkHXu5wdtu2bRPYb+ZoEF9ZtWrV2AsXLoxm7UOu4L0GJe1/ruICGq2YSKON8dBIxhA3MQag5I+PuePWe7BCAsBKHo12ZRGGeaZn0qZogtLOGCWQQX/RWD7MxM6ePdukay2jlAhwOWG0IAi81CswkeyXJcxHcXlA4KCH0zmIZW924HxZzy4CCry+SAToKkC0eYqGzgOSFtbGkNoAfjEwsYsXL56n2sMVmZ6e/gfmPNWrV19U1l5pn/VC6O4UHA1mEcJfIfDz9M66TqWiG5K2YIKHhy62SBrhXGH8EU0codV2kAbD+acymJPMtpagnQnc8wsXLnwYV4sEjwt8f9yyZcs6i1CobOcAv76HFRNTORZcPPv3zJs375jeEUze4WJOrxUaLg5APxDonxKkzaWF++67bw/azuTMYXoisIT0c2HnYPUC2h+CGy7jO+57pOEhBw4csDNNKG0awUgww6HlpShmqg/jvTNKsH97cZDKJYE32OVEs8xBmpukvqpv3753CJB6sIB0eokToW0VEz8hkIRiNpxLGBx9+vRpqpTN0Xee8NFEdlGrz9nkRRs/2asqqfwsbdNj1lzpILIBA+4GOVrdhEs5+JWqn9bQyBo+EFQjIz1pwYYTRNYSkcBLc6GsaIQmBp8mHhzEwzvCzUGtjz5G4GZL9a6BR4heKCWZ9bB/MG8k0u+iaTwxderUKgKkdd+kokVj10jvduOn5+sd9l59+5I1wG2K74QJEyKgeQrrb7BwGoWRxqthkXMUyvGat85LtqWD7352jNloHO+Xe1HontEKVbe7KjUVN13dseZshvRc0YHrmHMMWS0GptVh5+PCJiPSKP4Wy6iN7yt8Nn65Frycp9ebZNEpyzqlvMUAwvQm/PUCAV9TCBBqrAihwQ22MEzbB6uykGu7CJiuWUJwrvlM1pDCtKiDFcx6icfP9c4QPsOUBKEfO0OnnIq3xJEY3DoTBV9mV8mfEl7soy7HzvayCm72qdxNMBy0nhADmH97//79G5fs8/+1Y0MM2M+6+4W86667klDObiugn9VOZSqUtr5OnTqFOkJojiEcZp9cC0G+Ey8o8X/w8xVuto37Nu7pXOYdRX9I5lN3UGqIAf2yO1WMA/S+vYp7jBAjWMdL7Zjx6KOPJtpr4e7qvYB9XczgTpchONKGhZFlclvOHMOtOUObZyMIiq3NvuM6p8C8DxdTM2ouveuZrOdDET7gDgMf79ecjYS7AH9HQ/gagMvRzih9lCPoex4+fPgN2pDeZLir1J7ttBIf0HYfhWAkn4AKOT84qT8tKK4DKWY9cQnAov8Nvpdo9w/hYp6lS5e+z3nngVq1as3io/g06MkSduE0z7h2HY4QB+g6ErDceTqNI+DzKNtxL9Yd3BEnT57syKclfapqGigI+IxGTOqUMBB8DWSfYZ1HVq5ceUEAuMIAUmh/GB9GhW4kpCpcIFbvpO+6XvZkQnw1An7AR+zN2kdMNOUD3T8ofikI8QadwWuaZ4iHwHRt3tH8m1T4V1UWhNsAWs+a00Ampe35Bw8efDJYEK37NURWeY4fZGYyp6/rb/IdeOHbb79t+qFFixZFz5gxoy1WSKKiV6O6e3g+hQUOjh49OhPtq1V3jBw5strOnTsfgynhieCsMxFt22cWPy3BWsMvGPHRjY6jKYIUgv8SiqrKpZ//9ME8AoUdppPYqn2hBAmc13en9pzgZqPpFDR/Gqb/ScFM5TmdnwlKPqtbHATcXJi7K4I9jlUHoLn6uOHHsjK/UOkAZdMNtETAdvPoFyh4Iejd4LIRBq35EUljpnPj6/qDWOc5XKqLBZxJf5VBFc7joHQOrRWjvRp0rgnEUWtgGsglEGAdjeRb/IL7X2ufcEqAsoSwQB1uEo2L31f8sNQas0YcOq3fXQx/ZQliNig1848DCkb48rn5V6hmuEkKTA+C4V8xb84WmNtHvOgQUYzV1mH2NARdhxsdMYhwWXA59U8I1nul3soVJICaUmQpJlS4EK46/ZIBQ/NOTnlZMGviyNorGn7LWnOVfvs/TAuB+i4VlQIAAAAASUVORK5CYII=) top center no-repeat; }',
        '.serv-wifi { width: 67px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }'
    ];


    for (var cssix=0; cssix<cssServButts.length; cssix++) {
        insertCss(cssServButts[cssix]);
    }

    // LZ Compressor
    // Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
    // This work is free. You can redistribute it and/or modify it
    // under the terms of the WTFPL, Version 2
    // LZ-based compression algorithm, version 1.4.4
    var LZString = (function() {
        // private property
        var f = String.fromCharCode;
        var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
        var baseReverseDic = {};

        function getBaseValue(alphabet, character) {
            if (!baseReverseDic[alphabet]) {
                baseReverseDic[alphabet] = {};
                for (var i = 0; i < alphabet.length; i++) {
                    baseReverseDic[alphabet][alphabet.charAt(i)] = i;
                }
            }
            return baseReverseDic[alphabet][character];
        }
        var LZString = {
            compressToBase64: function(input) {
                if (input === null) return "";
                var res = LZString._compress(input, 6, function(a) {
                    return keyStrBase64.charAt(a);
                });
                switch (res.length % 4) { // To produce valid Base64
                    default: // When could this happen ?
                    case 0:
                        return res;
                    case 1:
                        return res + "===";
                    case 2:
                        return res + "==";
                    case 3:
                        return res + "=";
                }
            },
            decompressFromBase64: function(input) {
                if (input === null) return "";
                if (input === "") return null;
                return LZString._decompress(input.length, 32, function(index) {
                    return getBaseValue(keyStrBase64, input.charAt(index));
                });
            },
            compressToUTF16: function(input) {
                if (input === null) return "";
                return LZString._compress(input, 15, function(a) {
                    return f(a + 32);
                }) + " ";
            },
            decompressFromUTF16: function(compressed) {
                if (compressed === null) return "";
                if (compressed === "") return null;
                return LZString._decompress(compressed.length, 16384, function(index) {
                    return compressed.charCodeAt(index) - 32;
                });
            },

            compress: function(uncompressed) {
                return LZString._compress(uncompressed, 16, function(a) {
                    return f(a);
                });
            },
            _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
                if (uncompressed === null) return "";
                var i, value,
                    context_dictionary = {},
                    context_dictionaryToCreate = {},
                    context_c = "",
                    context_wc = "",
                    context_w = "",
                    context_enlargeIn = 2, // Compensate for the first entry which should not count
                    context_dictSize = 3,
                    context_numBits = 2,
                    context_data = [],
                    context_data_val = 0,
                    context_data_position = 0,
                    ii;
                for (ii = 0; ii < uncompressed.length; ii += 1) {
                    context_c = uncompressed.charAt(ii);
                    if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                        context_dictionary[context_c] = context_dictSize++;
                        context_dictionaryToCreate[context_c] = true;
                    }
                    context_wc = context_w + context_c;
                    if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                        context_w = context_wc;
                    } else {
                        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                            if (context_w.charCodeAt(0) < 256) {
                                for (i = 0; i < context_numBits; i++) {
                                    context_data_val = (context_data_val << 1);
                                    if (context_data_position === bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                }
                                value = context_w.charCodeAt(0);
                                for (i = 0; i < 8; i++) {
                                    context_data_val = (context_data_val << 1) | (value & 1);
                                    if (context_data_position === bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = value >> 1;
                                }
                            } else {
                                value = 1;
                                for (i = 0; i < context_numBits; i++) {
                                    context_data_val = (context_data_val << 1) | value;
                                    if (context_data_position === bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = 0;
                                }
                                value = context_w.charCodeAt(0);
                                for (i = 0; i < 16; i++) {
                                    context_data_val = (context_data_val << 1) | (value & 1);
                                    if (context_data_position === bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = value >> 1;
                                }
                            }
                            context_enlargeIn--;
                            if (context_enlargeIn === 0) {
                                context_enlargeIn = Math.pow(2, context_numBits);
                                context_numBits++;
                            }
                            delete context_dictionaryToCreate[context_w];
                        } else {
                            value = context_dictionary[context_w];
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn === 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        // Add wc to the dictionary.
                        context_dictionary[context_wc] = context_dictSize++;
                        context_w = String(context_c);
                    }
                }
                // Output the code for w.
                if (context_w !== "") {
                    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                        if (context_w.charCodeAt(0) < 256) {
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1);
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 8; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        } else {
                            value = 1;
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1) | value;
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = 0;
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 16; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn === 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        delete context_dictionaryToCreate[context_w];
                    } else {
                        value = context_dictionary[context_w];
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position === bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn === 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                }
                // Mark the end of the stream
                value = 2;
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
                // Flush the last char
                while (true) {
                    context_data_val = (context_data_val << 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data.push(getCharFromInt(context_data_val));
                        break;
                    } else context_data_position++;
                }
                return context_data.join('');
            },
            decompress: function(compressed) {
                if (compressed === null) return "";
                if (compressed === "") return null;
                return LZString._decompress(compressed.length, 32768, function(index) {
                    return compressed.charCodeAt(index);
                });
            },
            _decompress: function(length, resetValue, getNextValue) {
                var dictionary = [],
                    next,
                    enlargeIn = 4,
                    dictSize = 4,
                    numBits = 3,
                    entry = "",
                    result = [],
                    i,
                    w,
                    bits, resb, maxpower, power,
                    c,
                    data = {
                        val: getNextValue(0),
                        position: resetValue,
                        index: 1
                    };
                for (i = 0; i < 3; i += 1) {
                    dictionary[i] = i;
                }
                bits = 0;
                maxpower = Math.pow(2, 2);
                power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                switch (next = bits) {
                    case 0:
                        bits = 0;
                        maxpower = Math.pow(2, 8);
                        power = 1;
                        while (power !== maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position === 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        c = f(bits);
                        break;
                    case 1:
                        bits = 0;
                        maxpower = Math.pow(2, 16);
                        power = 1;
                        while (power !== maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position === 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        c = f(bits);
                        break;
                    case 2:
                        return "";
                }
                dictionary[3] = c;
                w = c;
                result.push(c);
                while (true) {
                    if (data.index > length) {
                        return "";
                    }
                    bits = 0;
                    maxpower = Math.pow(2, numBits);
                    power = 1;
                    while (power !== maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position === 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    switch (c = bits) {
                        case 0:
                            bits = 0;
                            maxpower = Math.pow(2, 8);
                            power = 1;
                            while (power !== maxpower) {
                                resb = data.val & data.position;
                                data.position >>= 1;
                                if (data.position === 0) {
                                    data.position = resetValue;
                                    data.val = getNextValue(data.index++);
                                }
                                bits |= (resb > 0 ? 1 : 0) * power;
                                power <<= 1;
                            }
                            dictionary[dictSize++] = f(bits);
                            c = dictSize - 1;
                            enlargeIn--;
                            break;
                        case 1:
                            bits = 0;
                            maxpower = Math.pow(2, 16);
                            power = 1;
                            while (power !== maxpower) {
                                resb = data.val & data.position;
                                data.position >>= 1;
                                if (data.position === 0) {
                                    data.position = resetValue;
                                    data.val = getNextValue(data.index++);
                                }
                                bits |= (resb > 0 ? 1 : 0) * power;
                                power <<= 1;
                            }
                            dictionary[dictSize++] = f(bits);
                            c = dictSize - 1;
                            enlargeIn--;
                            break;
                        case 2:
                            return result.join('');
                    }
                    if (enlargeIn === 0) {
                        enlargeIn = Math.pow(2, numBits);
                        numBits++;
                    }
                    if (dictionary[c]) {
                        entry = dictionary[c];
                    } else {
                        if (c === dictSize) {
                            entry = w + w.charAt(0);
                        } else {
                            return null;
                        }
                    }
                    result.push(entry);
                    // Add w+entry[0] to the dictionary.
                    dictionary[dictSize++] = w + entry.charAt(0);
                    enlargeIn--;
                    w = entry;
                    if (enlargeIn === 0) {
                        enlargeIn = Math.pow(2, numBits);
                        numBits++;
                    }
                }
            }
        };
        return LZString;
    })();
    if (typeof define === 'function' && define.amd) {
        define(function() {
            return LZString;
        });
    } else if (typeof module !== 'undefined' && module !== null) {
        module.exports = LZString;
    }

})();
