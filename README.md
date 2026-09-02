# AnimeWorld Auto Next

Brave (and Chrome) extension that automatically plays the next AnimeWorld
episode when the current one ends.

## How it works

- Detects when the video ends (`ended` event, with a fallback for the final
  ~0.6 seconds, useful with HLS players), including in **fullscreen**.
- Opens the next link in `.episodes a`, or clicks the site's **Next** button.
- Automatically starts playback on the new episode.
- Adds a **⛶** button that makes the stable `#player` container fullscreen, so
  fullscreen survives iframe replacement.
- Shows a notice and stops when there is no next episode.

## Episode switching

AnimeWorld switches episodes **without reloading the page** (AJAX) and loads the
player inside an `<iframe>`. The extension therefore:

- runs inside the player iframe to detect the end and start the next video;
- activates the site's next-episode link in place;
- asks the new iframe to start playback;
- keeps `#player` fullscreen without repeated browser-blocked requests.

## Autoplay and fullscreen limitations

Browsers, including Brave and Chrome, **block autoplay and fullscreen** without
a user gesture. Reaching the end of a video does not count as one. Therefore:

- **Playback:** usually starts automatically. If blocked, click anywhere on the
  page once.
- **Fullscreen:** use the **⛶** button in the player's lower-right corner. It
  makes `#player`, rather than the replaceable iframe, fullscreen.
- **Cross-origin players:** browsers cannot transfer a gesture from the inner
  player to the main document, so the **⛶** overlay is the reliable option.

If fullscreen was started through a cross-origin player's native control,
replacing its iframe closes it. Press **⛶** once to restore it.

## If the next video does not start

The player iframe may use a domain not included in the extension. Right-click
the player, open its frame or frame source, note the domain, add it to `matches`
in `manifest.json` (for example, `"*://*.DOMAIN/*"`), then reload the extension.

## Install on Brave

1. Open `brave://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder containing `manifest.json`.
5. Open an AnimeWorld episode page.

Use the toolbar icon to enable or disable the extension. If AnimeWorld changes
to a completely different name, open it and select **Add this domain**. Domains
matching `animeworld.NEW_TLD`, such as `.com` or `.it`, are detected
automatically.

Brave reports that the extension can read visited pages because detecting
unknown TLDs requires broad matching. The script exits immediately on hosts
that are neither AnimeWorld nor manually added.

## Supported domains

Common AnimeWorld domains (`.ac`, `.cc`, `.tv`, `.so`, `.biz`, `.io`, `.me`)
are supported. Domains added from the popup are stored locally and require no
changes to `manifest.json`.

## Notes

- No custom icon is included; Brave uses a generic one.
- The extension collects and sends no data. Only the enabled/disabled state is
  stored locally.
