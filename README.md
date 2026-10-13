# Local Pins

Revenge plugin to pin messages locally (only you see them).

- **Pin / unpin:** long-press a message → **Pin Message Locally**.
- **Channel Pins tab:** a **Server pins / Local pins** switch at the top of a channel's Pins tab.
- **All local pins:** Plugins → Local Pins → settings → **View local pins**. Tap a pin to jump to it, long-press to unpin.

Based on [Local Pins by nexpid](https://github.com/nexpid/RevengePlugins/tree/dev/src/plugins/local-pins) (CC BY 4.0, see `LICENSE`), reworked for Discord 343.

## Install

GitHub builds and hosts it on every push to `main`.

1. One-time: repo **Settings → Pages → Source: GitHub Actions**.
2. Wait for the **Build & publish** run in the Actions tab.
3. In Revenge: Plugins → Install → `https://dxckie-cell.github.io/Local-Pins/`

## Build locally

`npm install && npm run build` writes `dist/index.js` and `dist/manifest.json` (`npm run dev` for an unminified build, `npm run check` to type-check).
