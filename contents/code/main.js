var TILES = {}
var RATIO = 0.5
var RSTEP = 0.05
var DGAPS = 8
var WGAPS = 8

function tiled(w) {
    return !w.fullScreen && !w.transient && w.moveable && w.resizeable && w.closeable
}

function windows(screen, desktop) {
    return workspace.clientList().filter(function(w) {
        return w.managed && !w.deleted &&
            !w.specialWindow && !w.skipSwitcher && !w.skipTaskbar && !w.skipPager &&
            w.screen === screen && w.desktop === desktop
    }).sort(function(w1, w2) {
        return !tiled(w1) ? -1 : !tiled(w2) ? +1 :
            TILES[w1.windowId] > TILES[w2.windowId] ? +1 :
            TILES[w1.windowId] < TILES[w2.windowId] ? -1 :
            0
    }).map(function(w, i) {
        if (tiled(w))
            TILES[w.windowId] = i
        return w
    })
}

function neighbor(w, n, wins) {
    var i = wins.map(function(w) { return w.windowId }).indexOf(w.windowId) + n
    if (i < 0)
        return wins[wins.length - 1]
    if (i >= wins.length)
        return wins[0]
    return wins[i]
}

function swap(w1, w2) {
    if (w1 && w2) {
        var temp = TILES[w1.windowId]
        TILES[w1.windowId] = TILES[w2.windowId]
        TILES[w2.windowId] = temp
    }
}

function trim(area, rect) {
    return {
        x: area.x + (rect.x || 0),
        y: area.y + (rect.y || 0),
        width: area.width - (rect.x || 0) - (rect.width || 0),
        height: area.height - (rect.y || 0) - (rect.height || 0),
    }
}

function gap(area, n) {
    return trim(area, {x: n, y: n, width: n, height: n})
}

function layout(wins, area, part) {
    if (!wins.length)
        return
    var w = wins.shift()
    if (!area)
        area = gap(workspace.clientArea(KWin.PlacementArea, w.screen, w.desktop), DGAPS)
    if (!part)
        part = area.width > area.height ? 'left' : 'up'
    var geom
    if (!wins.length) {
        geom = area
    } else if (part == 'left') {
        geom = trim(area, {width: area.width * (1 - RATIO)})
        area = trim(area, {x: area.width * RATIO})
        part = 'up'
    } else if (part == 'up') {
        geom = trim(area, {height: area.height * (1 - RATIO)})
        area = trim(area, {y: area.height * RATIO})
        part = 'down'
    } else if (part == 'right') {
        geom = trim(area, {x: area.width * RATIO})
        area = trim(area, {width: area.width * (1 - RATIO)})
        part = 'left'
    } else if (part == 'down') {
        geom = trim(area, {y: area.height * RATIO})
        area = trim(area, {height: area.height * (1 - RATIO)})
        part = 'up'
    }
    w.geometry = gap(geom, WGAPS)
    layout(wins, area, part)
}

function refresh() {
    for (var s = 0; s < workspace.numScreens; s++)
        for (var d = 1; d <= workspace.desktops; d++)
            layout(windows(s, d).filter(tiled))
}

refresh()

workspace.clientAdded.connect(refresh)
workspace.clientRemoved.connect(refresh)
workspace.clientActivated.connect(refresh)
workspace.desktopPresenceChanged.connect(refresh)

registerShortcut('TilingCycleNext', 'Tiling: Cycle Next', 'Meta+J', function() {
    workspace.activeClient = neighbor(workspace.activeClient, +1,
        windows(workspace.activeScreen, workspace.currentDesktop))
})
registerShortcut('TilingCyclePrevious', 'Tiling: Cycle Previous', 'Meta+K', function() {
    workspace.activeClient = neighbor(workspace.activeClient, -1,
        windows(workspace.activeScreen, workspace.currentDesktop))
})
registerShortcut('TilingSwapNext', 'Tiling: Swap Next', 'Meta+Shift+J', function() {
    swap(workspace.activeClient, neighbor(workspace.activeClient, +1,
        windows(workspace.activeScreen, workspace.currentDesktop).filter(tiled)))
    refresh()
})
registerShortcut('TilingSwapPrevious', 'Tiling: Swap Previous', 'Meta+Shift+K', function() {
    swap(workspace.activeClient, neighbor(workspace.activeClient, -1,
        windows(workspace.activeScreen, workspace.currentDesktop).filter(tiled)))
    refresh()
})
registerShortcut('TilingIncreaseSplit', 'Tiling: Increase Split', 'Meta+L', function() {
    RATIO += RSTEP
    refresh()
})
registerShortcut('TilingDecreaseSplit', 'Tiling: Decrease Split', 'Meta+H', function() {
    RATIO -= RSTEP
    refresh()
})
