# kwt

A hackable KWin tiling window manager.

## Installation

```sh
git clone https://github.com/rliang/kwt ~/.local/share/kwin/scripts/kwt
plasmapkg -t kwinscript -i ~/.local/share/kwin/scripts/kwt
qdbus org.kde.KWin /Scripting loadScript ~/.local/share/kwin/scripts/kwt kwt
```

## Default Shortcuts

* `Meta+M`: Toggle Tiling
* `Meta+J`: Activate Next Tile
* `Meta+K`: Activate Previous Tile
* `Meta+Shift+J`: Swap Next Tile
* `Meta+Shift+K`: Swap Previous Tile
* `Meta+L`: Increase Tiling Split Ratio
* `Meta+H`: Decrease Tiling Split Ratio

## Default Options

* `auto-tile: true`: Whether to tile windows at creation or wait for user input.
* `append-tiles: true`: Whether to append new tiles to the end of the list or insert at the beginning.
* `maximize-single: true`: Whether to maximize a tile if it is the only one.
* `screen-margin-top: 6`: Top margin around the screen's usable space.
* `screen-margin-bottom: 6`: Bottom margin around the screen's usable space.
* `screen-margin-left: 6`: Left margin around the screen's usable space.
* `screen-margin-right: 6`: Right margin around the screen's usable space.
* `tile-margin: 6`: Margin around each side of each tiled window.
* `split-ratio: 0.5`: Screen area split ratio between tiled windows.
* `split-ratio-step: 0.05`: Split ratio step increment.
