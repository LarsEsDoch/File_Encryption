import * as ui from './ui.js';
import * as events from './events.js';


export const sessionID = crypto.randomUUID();
const eyeOffIcon = document.getElementById('eye-off-icon');
const fileModeBtn = document.getElementById('file-mode-btn');
const folderModeBtn = document.getElementById('folder-mode-btn');


function init() {
    eyeOffIcon.classList.add('hidden');
    fileModeBtn.classList.add('mode-btn-active');
    folderModeBtn.classList.add('mode-btn-inactive');
    events.registerEventListeners();
}


init();
ui.updateMainUI();
ui.updateUploadUI();