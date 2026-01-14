# Place Harmonizer

## Overview
Place Harmonizer cleans and standardizes a single selected place in WME. It harmonizes chain data, fixes common formatting issues, highlights problems, and locks places when they meet regional standards.

## Quick Links
- Production install: https://greasyfork.org/en/scripts/28690-wme-place-harmonizer
- Beta install (beta list access required): https://greasyfork.org/en/scripts/28689-wme-place-harmonizer-beta
- Bugs and issues: https://github.com/WazeDev/WME-Place-Harmonizer/issues
- Contact: MapOMatic

## Installation
1. Install Tampermonkey or Greasemonkey for your browser.
2. Open the production or beta install link above and confirm the userscript install.

## Usage
1. Select a place in WME.
2. Run the script via the "RUN WMEPH" button or shortcut `Shift-Alt-A`.
3. Review the suggested changes, adjust if needed, and save.

## Examples
- McDonald's autocorrection:
  - http://img.prntscr.com/img?url=http://i.imgur.com/YazP0ci.png
- 7-Eleven autocorrection:
  - http://img.prntscr.com/img?url=http://i.imgur.com/fi5hBPe.png
- Standalone restaurant with no harmonization data:
  - http://img.prntscr.com/img?url=http://i.imgur.com/1MLCQZB.png

## Feature Set
- Localization
  - Regional detection with USA region support and region-specific locking, formatting, and phone rules.
  - Country support for USA and Canada, expandable later.
- Chain harmonization
  - Live integration with Place Name Harmonization data for names, alt-names, categories, and URLs.
- Services
  - Common services auto-added per category; existing checked services are preserved.
- Gas stations
  - Rename to brand when primary name mismatches brand; preserve existing brand field and move prior name to alt-name.
  - Add Convenience Store category; keep ATM and Car Wash if present; drop other categories.
  - Set services to Restrooms, Credit Cards, Air Conditioning, Parking, Wheelchair Accessible.
  - Special handling for Costco, BJ's, and Sam's Club stations: append "Gasoline" to name, add "Members only" description, restrict services to Credit Cards, Parking, Wheelchair Accessible.
- Title casing rules
  - Capitalize leading letters; handle Mc/O' prefixes and ampersands; preserve mixed-case words and known acronyms; optionally enforce strict title case when all-caps or mixed casing is detected.
- Phone correction
  - Reformat 10-digit numbers to xxx-xxx-xxxx, removing a leading 1 if present.
- URL correction
  - Strip http/https prefixes from website fields.
- Basic validation before locking
  - Check area vs. point per wiki guidance (with SE post office deviation); alert when mismatched.
  - Require name and address (HN and street); flag odd HNs for manual review (e.g., 8133455678, 123A, 31-2).
- Map highlights
  - Red: major missing items (name, address). Blue: minor gaps (URL, phone, hours). Green: name, address, phone, URL, and hours present. Red/black border for severe issues. Options allow relaxing checks.
- Locking
  - Apply SE locking guidelines when validation passes; never down-lock; cap at editor rank when lower than required.
- Alerts and reminders
  - Warnings for questionable categories (e.g., USPS-only Post Office) with autofill for USPS data and services.
  - Reminders for Stadium and Hospital category rules.
  - Alerts for similar bank/business names to confirm correct harmonization.
- Duplicate detection
  - Search radius for duplicate names with per-place whitelisting applied to both locations.
- Whitelisting
  - Per-place exceptions for missing phone, address, URL, or hours to allow a place to be treated as complete.

## Development Team

- @bmtg
- @vtpearce
- @cardyin
- @fjsawicki
- @jtsmith2
- @joyriding
- @MapOMatic
- @RavenDT
- @73VW

## Copyright Notice

This project is based on the awesome work of Francesco Bedini, who created a template to develop WME userscripts in TypeScript. You can find the original project [here](https://github.com/bedo2991/wme-typescript).

His code is licensed under the MIT License, available [here](./LICENSE.original) as of the time this fork was created.

All code related to the Docker devcontainer, VS Code settings, use of locales, and package bundling ("Tools") is also licensed under the MIT License.

All code in `/src/` (and any file with a copyright mentioning WazeDev or Maël Pedretti) is licensed under the [GNU Affero General Public License v3.0 or later (AGPL)](./LICENSE).

Hours parsing in [src/core/hoursParser.ts](src/core/hoursParser.ts) is derived from [HoursParser.js](https://update.greasyfork.org/scripts/37486/1395212/WME%20Utils%20-%20HoursParser.js) (GPL-3.0) by MapOMatic (originally by bmtg); attribution retained in this port.

**Summary:**

- Use of the original Francesco Bedini template and tools remains under the MIT License.
- Hours parser derivation is GPL-3.0-licensed; see [source](https://github.com/WazeDev/WME-Scripts/blob/master/HoursParser.js).
- Use of all other new code and `/src/` is restricted under AGPL as described in `LICENSE`.

This project is thus **dual-licensed**: portions under MIT (original template and tools), portions under AGPL (all other `/src/` code and new work), with GPL-3.0 hours parser derivation noted.

## Changelog
### Unreleased
#### Added
- Introduced TypeScript SDK bootstrap, i18n wiring, and build tooling scaffolding for the migration.
- Sidebar tab, overlay layer checkbox, selection tracking, and `Shift+Alt+A` shortcut stub wired.
- Harmonization engine with title-case, phone/URL formatting, completeness assessment; UI renderer with change suggestions and apply button; venue updater service via SDK.
- Compressed storage via `lz-string` for whitelist and user settings; legacy whitelist auto-migrated on first access.
- Harmonizer now respects whitelist: skips phone/URL/address/hours issues when whitelisted.
#### Changed
- Rewrote the README for clarity, structure, and current links.
- Documented licensing and GPL attribution for the hours parser.
- Updated package.json metadata (name, description, author, license, repository) and aligned versions across package.json, header.js, and src/core/config.ts to 2025.12.22.000.
#### Fixed
- Build scripts now use forward slashes for cross-platform compatibility (Linux/macOS/Windows).
