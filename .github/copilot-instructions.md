# GitHub Copilot Instructions

## Project-Specific Rules

### WME SDK Conformance

- Use `wme-sdk-typings` for all WME API interactions
- Consult SDK code in `node_modules` ([`wme-sdk-typings`](../node_modules/wme-sdk-typings/index.d.ts)) and documentation at https://www.waze.com/editor/sdk/index.html before implementing WME features
- If information is missing from the SDK typings or documentation, inform the user immediately—do not guess or invent APIs
- Never implement functionality that exists in established npm packages
- The migration guide’s “Pre-SDK usage” section documents deprecated globals; do not call any of those legacy methods because they are unavailable in the current SDK

### Code Philosophy: Write for Human Brains

Code is processed by human brains with ~4 chunks of working memory. Optimize for cognitive load, not machine performance.

#### Readable Conditionals

Extract complex expressions into intermediate variables with descriptive names:

```typescript
// Bad - cognitive overload
if (
  val > someConstant &&
  (condition2 || condition3) &&
  condition4 &&
  !condition5
) {
  // reader is mentally exhausted
}

// Good - clean working memory
const isValid = val > someConstant;
const isAllowed = condition2 || condition3;
const isSecure = condition4 && !condition5;

if (isValid && isAllowed && isSecure) {
  // reader focuses only on intent
}
```

#### Early Returns Over Nested Ifs

Free working memory by handling edge cases first, leaving only the happy path:

```typescript
// Bad
function process(data) {
  if (data) {
    if (data.isValid) {
      if (data.hasPermission) {
        // deeply nested logic
      }
    }
  }
}

// Good
function process(data) {
  if (!data) return;
  if (!data.isValid) return;
  if (!data.hasPermission) return;

  // happy path logic at top level
}
```

#### Comments: Why, Not What

- **No "what" comments** that duplicate code
- **Write "why" comments** explaining motivation, tricky logic, or non-obvious decisions
- "What" comments only allowed for high-level overviews

#### Prefer Deep Over Shallow

- **Shallow modules** have complex interfaces but trivial implementations (e.g., `MetricsProviderFactoryFactory`)—mentally taxing
- **Deep modules** have simple interfaces but complex implementations—easier to reason about
- Don't create unnecessary layers of abstraction

#### Composition Over Inheritance

Don't force readers to chase behavior across multiple classes.

#### Minimal Language Features

Stick to the minimal subset of TypeScript/JavaScript. Readers shouldn't need expert-level language knowledge.

#### Self-Descriptive Values

Avoid custom mappings that require memorization. Use explicit, readable constants.

#### Don't Abuse DRY

A little duplication is better than unnecessary coupling. Avoid premature abstraction.

#### Avoid Excessive Layers

Jumping between many small methods/classes/modules is mentally exhausting. Linear thinking is more natural.

## Communication Style

### Absolute Mode

- **Eliminate**: emojis, filler, hype, soft language, conversational transitions, call-to-action statements
- **Prioritize**: blunt, directive phrasing
- **Never**: mirror user's tone, mood, or diction
- **No**: questions, offers, suggestions, motivational content
- **Terminate**: immediately after delivering information—no closures or summaries
- **Goal**: restore independent, high-fidelity thinking; make the model obsolete via user self-sufficiency

Assume the user retains high perception despite blunt tone. Speak to the underlying cognitive tier.

## Project Setup & Workflow

### Development Environment

- Workspace runs in a devcontainer (Debian GNU/Linux 12 bookworm) with pre-installed Node.js, npm, TypeScript, and Git
- All tools are available on PATH: `node`, `npm`, `tsc`, `git`, `eslint`, etc.

### Build & Package Management

- **Package manager**: npm
- **Build system**: `npm run build` compiles TypeScript and generates minified release files
- **Linting**: `npm run lint` checks code style and correctness
- **Build output**: Generated in `releases/` directory after successful build
- **Dependencies**: All WME SDK types are from `wme-sdk-typings` package

### Project Structure

- **Source**: TypeScript in `src/` (e.g., `src/publicTransportStopsLayer.ts`)
- **Localization**: Multi-language JSON in `locales/` (de, en, fr, it) managed via i18next
- **Build config**: `rollup.config.mjs` for bundling, `tsconfig.json` for TypeScript
- **Entry point**: `main.user.ts` is the compiled userscript entry point

### Common Tasks

- Modify source → `npm run build` → test in WME
- Add/update translations → edit `locales/*/common.json`, rebuild
- Check errors before committing → `npm run lint`
- Code must compile without TypeScript errors before considering it complete

### Product Context

- Primary audience: Swiss Waze Map Editor volunteers, many non-technical, editing via Tampermonkey.
- Core value: surfaces official Swiss datasets (municipal/cantonal boundaries, swissNAMES3D labels, national raster colors, high-res aerial imagery) inside WME with toggleable checkboxes.
- Data provenance must remain swisstopo; cite the source when extending layers or attribution text.

### Roadmap & Issues

- Use GitHub Issues for roadmap; read open items before starting new work to avoid duplicating efforts.
- Feature requests are typically new overlays or UX polish around layer controls; confirm if an issue already covers your idea.
- For bug reports about data mismatches, gather reproduction steps and WME screenshots before coding to preserve evidence.

### Architecture Snapshot

- Userscript integrates with WME only via `wme-sdk-typings`; no direct DOM hacks that bypass SDK events.
- Bundle flow: TypeScript in `src/` → Rollup builds to `.out/main.user.js` → concatenated with `header.js` into `releases/*.user.js`.
- Localization lives in `locales/<lang>/common.json` and is wired through i18next; new strings must be added for every supported language.

### Testing & Release Expectations

- Minimum pre-PR checks: `npm run lint`, `npm run build`, plus manual smoke test in WME (load script, toggle each layer, verify tiles draw).
- Capture manual test notes in PRs when no automated coverage exists; add unit tests for complex logic before merging.
- Releases bump `package.json` version, then `npm run release` runs header replacement, rebuilds, and outputs `releases/release-<version>.user.js`; never skip the replace-in-files step.

### Changelog Maintenance

- All project changes must be documented in the Changelog section of README file.
- Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format with semantic versioning.
- Use categories: Added, Changed, Deprecated, Removed, Fixed, Security.
- Never create a separate CHANGELOG.md file; the changelog lives exclusively in README files.
