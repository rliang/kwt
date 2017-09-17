# KWT
A hackable KWin tiling window manager.

## Installation

```sh
git clone https://github.com/rliang/kwt ~/.local/share/kwin/scripts/KWT
mkdir -p ~/.local/share/kservices5
ln -s ~/.local/share/{kwin/scripts/KWT/metadata,kservices5/kwin-script-KWT}.dekstop
qdbus org.kde.KWin /KWin reconfigure
```
