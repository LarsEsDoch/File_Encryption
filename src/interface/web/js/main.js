import * as ui from './ui.js';
import * as events from './events.js';
import * as websocket from './websocket.js'

function init() {
    events.registerEventListeners();
    ui.updateMainUI();
    ui.updateUploadUI();
}


init();