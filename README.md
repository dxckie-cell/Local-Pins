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

## Build & install

Requires Node 20+.

```sh
npm install
npm run build      # -> dist/index.js + dist/manifest.json  (use `npm run dev` for an unminified build)
npm run check      # type-check
npm run serve      # serves dist/ at http://localhost:4040/
```

Then in Revenge, go to Plugins → Install and paste `http://<your-pc-ip>:4040/` (phone and PC on the same network). Alternatively host `dist/` anywhere static, e.g. GitHub Pages.

`scripts/build.mjs` is a trimmed-down copy of the nexpid/RevengePlugins build pipeline (esbuild + swc, `@vendetta/*` mapped to globals). Not yet verified end-to-end.
