import * as ui from './ui.js';
import * as events from './events.js';


export const sessionID = crypto.randomUUID();


function init() {
    events.registerEventListeners();
    ui.updateMainUI();
    ui.updateUploadUI();
}


init();