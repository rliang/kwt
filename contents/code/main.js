var tiling = true;
var append_new = true;
var margins = {top: 5, bottom: 10, left: 10, right: 10};
var gap = 10;
var master_count = 1;
var master_ratio = 0.5;
var master_step = 0.05;

function initClient(c) {
  if (c.floating === undefined && c.transient || c.minimized || c.fullScreen ||
      c.shade || c.specialWindow)
    c.floating = true;
  if (c.order === undefined)
    c.order = append_new ? Infinity : -1;
}

function filterClients() {
  return workspace.clientList().filter(function(c) {
    initClient(c);
    if (c.screen !== workspace.activeScreen) return false;
    if (c.desktop !== workspace.currentDesktop) return false;
    if (!c.isCurrentTab) return false;
    if (c.floating) return false;
    return true;
  });
}

function orderClients() {
  return filterClients().sort(function(a, b) {
    if (a.order > b.order) return 1;
    if (a.order < b.order) return -1;
    return 0;
  }).map(function(c, i) {
    c.order = i;
    return c;
  });
}

function applyMargin(g, top, bottom, left, right) {
  g.y += top;
  g.height -= top + bottom;
  g.x += left;
  g.width -= left + right;
}

function layoutClient(c, i, g, clients) {
  if (i < master_count) {
    if (master_count < clients.length) {
      g.width *= master_ratio;
      g.height /= master_count;
    } else {
      g.height /= clients.length;
    }
  } else {
    i -= master_count;
    if (master_count > 0) {
      g.x += g.width * master_ratio;
      g.width *= 1 - master_ratio;
    }
    g.height /= clients.length - master_count;
  }
  g.y += i * g.height;
}

function refresh() {
  if (!tiling) return;
  orderClients().reduce(function(_, c, i, clients) {
    var g = workspace.clientArea(KWin.PlacementArea, workspace.activeScreen,
                                    workspace.currentDesktop);
    applyMargin(g, margins.top, margins.bottom, margins.left, margins.right);
    layoutClient(c, i, g, clients);
    applyMargin(g, gap, gap, gap, gap);
    c.geometry = g;
  }, null);
}

function nextClient(n) {
  var all = orderClients();
  if (!workspace.activeClient) return all[0];
  var k = workspace.activeClient.order;
  if (k === undefined) k = 0;
  k += n;
  if (k >= all.length) return all[0];
  if (k < 0) return all[all.length - 1];
  return all[k];
}

function activateNext(n) {
  workspace.activeClient = nextClient(n);
}

function activateOther(c) {
  orderClients().some(function(d) {
    if (d != c) {
      workspace.activeClient = d;
      return true;
    }
  });
}

function swapNext(n) {
  var c = nextClient(n);
  if (!c) return;
  var o = workspace.activeClient.order;
  workspace.activeClient.order = c.order;
  c.order = o;
  refresh();
}

function increase(n) {
  master_ratio += master_step * n;
  if (master_ratio < 0) master_ratio = 0;
  if (master_ratio > 1) master_ratio = 1;
  refresh();
}

function add(n) {
  master_count += n;
  if (master_count < 0) master_count = 0;
  refresh();
}

function toggle() {
  var c = workspace.activeClient;
  if (!c) return;
  c.floating = !c.floating;
  refresh();
}

registerShortcut('Activate Next Tile', 'Activate Next Tile', 'Meta+J',
                 function() { activateNext(1); });
registerShortcut('Activate Previous Tile', 'Activate Previous Tile', 'Meta+K',
                 function() { activateNext(-1); });
registerShortcut('Swap Next Tile', 'Swap Next Tile', 'Meta+Shift+J',
                 function() { swapNext(1); });
registerShortcut('Swap Previous Tile', 'Swap Previous Tile', 'Meta+Shift+K',
                 function() { swapNext(-1); });
registerShortcut('Toggle Tiling Tile', 'Toggle Tiling Tile', 'Meta+T',
                 function() { toggle(); });
registerShortcut('Toggle Tiling All Tiles', 'Toggle Tiling All Tiles', 'Meta+Shift+T',
                 function() { tiling = !tiling; refresh(); });
registerShortcut('Increase Master Tile', 'Increase Master Tile', 'Meta+L',
                 function() { increase(1); });
registerShortcut('Decrease Master Tile', 'Decrease Master Tile', 'Meta+H',
                 function() { increase(-1); });
registerShortcut('Add Master Tile', 'Add Master Tile', 'Meta+Shift+H',
                 function() { add(1); });
registerShortcut('Remove Master Tile', 'Remove Master Tile', 'Meta+Shift+L',
                 function() { add(-1); });

workspace.clientActivated.connect(refresh);
workspace.currentDesktopChanged.connect(refresh);
workspace.clientRemoved.connect(activateOther);

refresh();
