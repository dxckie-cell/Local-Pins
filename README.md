# Local Pins

Revenge plugin that adds a button to locally pin a message, with a Local Pinned list and merged view in the channel Pins screen.

Based on [Local Pins by nexpid](https://github.com/nexpid/RevengePlugins/tree/dev/src/plugins/local-pins) (CC BY 4.0, see `LICENSE`).

## Changes from upstream
- `getPins` / `hasPin` no longer throw for channels with no local pins (this left the pins loader stuck and broke the pin button).
- Pins screen search filter replaced: the old `\B…\B` regex dropped local pins; now a case-insensitive substring match.
- One unfetchable message no longer blanks the whole local pins list.
- Missing Discord internals (`useOnPressSearchItem`, `FlashList`, screens module) skip that patch instead of crashing on load.
- Pins patch no longer throws when no override is registered for a channel.

`local-pins-fix.patch` is the diff against upstream. The `src/` layout mirrors the nexpid/RevengePlugins monorepo (`$/*` resolves to `src/stuff/*`) so it builds there.

## Install (no PC needed)

GitHub builds and hosts the plugin automatically on every push to `main`.

1. One-time: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Wait for the **Build & publish** run in the Actions tab to finish (re-run it with "Run workflow" if needed).
3. In Revenge: Plugins → Install, and paste `https://dxckie-cell.github.io/Local-Pins/`

## Build locally (optional)

Requires Node 20+.

```sh
npm install
npm run build      # -> dist/index.js + dist/manifest.json  (`npm run dev` for unminified)
npm run check      # type-check
npm run serve      # serves dist/ at http://localhost:4040/
```

`scripts/build.mjs` is a trimmed-down copy of the nexpid/RevengePlugins build pipeline (esbuild + swc, `@vendetta/*` mapped to globals).
