# kwt

A hackable KWin tiling window manager.

## Installation

```sh
git clone https://github.com/rliang/kwt ~/.local/share/kwin/scripts/kwt
plasmapkg -t kwinscript -i ~/.local/share/kwin/scripts/kwt
qdbus org.kde.KWin /KWin reconfigure
```

## Default Shortcuts `~/.config/kglobalshortcutsrc`

* `Alt+C` Close Window
* `Alt+D` Next Desktop
* `Alt+U` Previous Desktop
* `Alt+Shift+D` Window To Next Desktop
* `Alt+Shift+U` Window To Previous Desktop
* `Alt+S` Next Screen
* `Alt+Shift+S` Window To Next Screen
* `Alt+M` Toggle Tiling
* `Alt+J` Cycle Next Window
* `Alt+K` Cycle Previous Window
* `Alt+Shift+J` Swap Next Tile
* `Alt+Shift+K` Swap Previous Tile
* `Alt+L` Increase Split
* `Alt+H` Decrease Split

## Default Options `~/.config/kwinrc`

`[Script-kwt]`
* `auto-tile=true` Whether to tile windows at creation or wait for user input.
* `append-tiles=true` Whether to append new tiles to the end of the list or insert at the beginning.
* `maximize-single=true` Whether to maximize a tile if it is the only one.
* `maximize-noborder=true` Whether to remove borders from maximized tiled windows.
* `tiles-noborder=false` Whether to remove borders from tiled windows.
* `gaps=6` Gaps around the screen space and between tiles.
* `split-ratio=0.5` Screen area split ratio between tiled windows.
* `split-ratio-step=0.05` Split ratio step increment.
