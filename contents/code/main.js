var MASTER_COUNT = readConfig('initialMasterCount', 1);
var SPLIT_RATIO  = readConfig('initialSplitRatio', 0.5);

var LAYOUTS = {
    horizontal: function(wins, area) {
        if (wins.length === 1)
            return [area];
        var mc = Math.max(Math.min(MASTER_COUNT, wins.length - 1), 1);
        return wins.slice(0, mc).map(function(_, i, part) {
            return {
                x:      area.x,
                y:      area.y + (i * area.height / part.length),
                width:  area.width * SPLIT_RATIO,
                height: area.height / part.length,
            };
        }).concat(wins.slice(mc).map(function(_, i, part) {
            return {
                x:      area.x + area.width * SPLIT_RATIO,
                y:      area.y + (i * area.height / part.length),
                width:  area.width * (1 - SPLIT_RATIO),
                height: area.height / part.length,
            };
        }));
    },
    vertical: function(wins, area) {
        if (wins.length === 1)
            return [area];
        var mc = Math.max(Math.min(MASTER_COUNT, wins.length - 1), 1);
        return wins.slice(0, mc).map(function(_, i, part) {
            return {
                x:      area.x + (i * area.width / part.length),
                y:      area.y,
                width:  area.width / part.length,
                height: area.height * SPLIT_RATIO
            };
        }).concat(wins.slice(mc).map(function(_, i, part) {
            return {
                x:      area.x + (i * area.width / part.length),
                y:      area.y + area.width * SPLIT_RATIO,
                width:  area.width / part.length,
                height: area.height * (1 - SPLIT_RATIO)
            };
        }));
    },
};

var AVAILABLE_LAYOUTS = eval(readConfig('availableLayouts', "['horizontal','vertical']").toString());
var TILE_TYPES        = eval(readConfig('tileTypes', "['normalWindow']").toString());
var MARGINS           = eval(readConfig('margins', '[8,8,8,8]').toString());
var MINIMUM_GAPS      = eval(readConfig('minimumGaps', '[8,8,8,8]').toString());
var MAXIMUM_GAPS      = eval(readConfig('maximumGaps', '[8,8,8,8]').toString());

var CURRENT_TILES = {};
var CURRENT_LAYOUT = 0;

function getTiles(screen, desktop) {
    return workspace.clientList().filter(function(w) {
        return CURRENT_TILES[w.windowId]
            && w.screen === screen && w.desktop === desktop;
    }).sort(function(w1, w2) {
        return CURRENT_TILES[w1.windowId].idx > CURRENT_TILES[w2.windowId].idx ? 1
            : CURRENT_TILES[w1.windowId].idx < CURRENT_TILES[w2.windowId].idx ? -1
            : 0;
    });
}

function addGaps(area, x, y, width, height) {
    return {
        x:      area.x + x,
        y:      area.y + y,
        width:  area.width - x - width,
        height: area.height - y - height,
    };
}

function refreshTile(w, idx, rect) {
    if (CURRENT_TILES[w.windowId].idx !== idx)
        CURRENT_TILES[w.windowId] = {
            idx: idx,
            gap: MINIMUM_GAPS.map(function(g, i) {
                return g + Math.random() * (MAXIMUM_GAPS[i] - g);
            }),
        };
    w.geometry = addGaps.apply(this, [rect].concat(CURRENT_TILES[w.windowId].gap));
}

function refresh() {
    var layout = LAYOUTS[AVAILABLE_LAYOUTS[CURRENT_LAYOUT]];
    for (var s = 0; s < workspace.numScreens; s++) {
        for (var d = 1; d <= workspace.desktops; d++) {
            var area = workspace.clientArea(KWin.PlacementArea, s, d);
            var wins = getTiles(s, d);
            var geos = layout(wins, addGaps.apply(this, [area].concat(MARGINS)));
            wins.forEach(function(w, i) { refreshTile(w, i, geos[i]); });
        }
    }
}

function isMaximized(w) {
    var area = workspace.clientArea(KWin.MaximizeArea, w.screen, w.desktop);
    return Object.keys(area).every(function(k) { return area[k] === w.geometry[k]; });
}

function isTileable(w) {
    return !isMaximized(w) && !w.fullScreen && w.managed && !w.deleted
        && !w.skipSwitcher && !w.skipPager && !w.skipTaskbar
        && TILE_TYPES.some(function(t) { return w[t]; });
}

workspace.clientList().forEach(function(w) {
    if (isTileable(w))
        CURRENT_TILES[w.windowId] = {idx: Infinity};
});
refresh();

workspace.clientAdded.connect(function(w) {
    if (isTileable(w))
        CURRENT_TILES[w.windowId] = {idx: Infinity};
    refresh();
});
workspace.clientRemoved.connect(function(w) {
    delete CURRENT_TILES[w.windowId];
    refresh();
});
workspace.clientActivated.connect(refresh);
workspace.desktopPresenceChanged.connect(refresh);

function getNeighbor(n) {
    var wins = getTiles(workspace.activeScreen, workspace.currentDesktop);
    var k = n + wins.map(function(w) { return w.windowId; })
        .indexOf(workspace.activeClient.windowId);
    return k < 0 ? wins[wins.length - 1] : k >= wins.length ? wins[0] : wins[k];
}

function swapTiles(w1, w2) {
    if (w1 && w2 && CURRENT_TILES[w1.windowId] && CURRENT_TILES[w2.windowId]) {
        var idx = CURRENT_TILES[w1.windowId].idx;
        CURRENT_TILES[w1.windowId].idx = CURRENT_TILES[w2.windowId].idx;
        CURRENT_TILES[w2.windowId].idx = idx;
    }
}

registerShortcut('KWTToggleTile', 'KWT: Toggle Tile',
    'Meta+X',
    function() {
        if (CURRENT_TILES[workspace.activeClient.windowId])
            delete CURRENT_TILES[workspace.activeClient.windowId];
        else
            CURRENT_TILES[workspace.activeClient.windowId] = {idx: Infinity};
        refresh();
    });
registerShortcut('KWTCycleNext', 'KWT: Cycle Next',
    'Meta+J',
    function() {
        workspace.activeClient = getNeighbor(1);
    });
registerShortcut('KWTCyclePrevious', 'KWT: Cycle Previous',
    'Meta+K',
    function() {
        workspace.activeClient = getNeighbor(-1);
    });
registerShortcut('KWTSwapNext', 'KWT: Swap Next',
    'Meta+Shift+J',
    function() {
        swapTiles(workspace.activeClient, getNeighbor(1));
        refresh();
    });
registerShortcut('KWTSwapPrevious', 'KWT: Swap Previous',
    'Meta+Shift+K',
    function() {
        swapTiles(workspace.activeClient, getNeighbor(-1));
        refresh();
    });
registerShortcut('KWTIncreaseSplit', 'KWT: Increase Split',
    'Meta+L',
    function() {
        if ((SPLIT_RATIO += readConfig('splitRatioStep', 0.05)) >= 0.9)
            SPLIT_RATIO = 0.9;
        refresh();
    });
registerShortcut('KWTDecreaseSplit', 'KWT: Decrease Split',
    'Meta+H',
    function() {
        if ((SPLIT_RATIO -= readConfig('splitRatioStep', 0.05)) < 0.1)
            SPLIT_RATIO = 0.1;
        refresh();
    });
registerShortcut('KWTIncreaseMasterCount', 'KWT: Increase Master Count',
    'Meta+Shift+H',
    function() {
        MASTER_COUNT += 1;
        refresh();
    });
registerShortcut('KWTDecreaseMasterCount', 'KWT: Decrease Master Count',
    'Meta+Shift+L',
    function() {
        MASTER_COUNT -= 1;
        refresh();
    });
registerShortcut('KWTLayoutNext', 'KWT: Layout Next',
    'Meta+Z',
    function() {
        if ((CURRENT_LAYOUT += 1) >= AVAILABLE_LAYOUTS.length)
            CURRENT_LAYOUT = 0;
        refresh();
    });
registerShortcut('KWTLayoutPrevious', 'KWT: Layout Previous',
    'Meta+Shift+Z',
    function() {
        if ((CURRENT_LAYOUT -= 1) < 0)
            CURRENT_LAYOUT = AVAILABLE_LAYOUTS.length - 1;
        refresh();
    });
