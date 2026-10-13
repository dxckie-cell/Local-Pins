# Local Pins

A [Revenge](https://github.com/revenge-mod) plugin for Discord mobile that lets you **pin messages just for yourself**. Nothing is sent to the server: no one else sees your pins, and you don't need the Manage Messages permission or a pin slot, so it works in any channel, server or DM.

Handy for keeping a few messages you want to find again (an address, a guide, a funny quote) without cluttering the channel's real pins.

## Features

- **Pin / unpin:** long-press any message and tap **Pin Message Locally** (or **Unpin Message Locally**).
- **Channel Pins tab:** open a channel's info screen → **Pins**. A **Server pins / Local pins (N)** switch at the top lets you flip between the channel's real pins and your own, with a smooth transition.
- **All your pins in one place:** Plugins → Local Pins → settings → **View local pins** lists pins from every channel.
- **Jump to the message:** tap a pin to open it right inside Discord, or long-press it to unpin.
- **Settings:** see how much data your pins use and clear them all.

Pins are stored on your device only. Messages are loaded from Discord when you open the list, so a pin to a message that was deleted, or in a channel you've since lost access to, is skipped.

## Install

GitHub builds and hosts the plugin automatically on every push to `main`.

1. One-time: repo **Settings → Pages → Source: GitHub Actions**.
2. Wait for the **Build & publish** run in the Actions tab to finish.
3. In Revenge: Plugins → Install → `https://dxckie-cell.github.io/Local-Pins/`

Tested on Discord 343 with Revenge.

## Build locally

`npm install && npm run build` writes `dist/index.js` and `dist/manifest.json` (`npm run dev` for an unminified build, `npm run check` to type-check).

## Credits

Based on [Local Pins by nexpid](https://github.com/nexpid/RevengePlugins/tree/dev/src/plugins/local-pins), licensed [CC BY 4.0](LICENSE). This version is reworked to work on Discord 343 and to add the Pins tab switch.
