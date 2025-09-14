import * as main from "./main.js";
import * as ui from "./ui.js";
import * as state from "./state.js";
import * as fileHandler from "./fileHandler.js";

const encryptTab = document.getElementById('encrypt-tab');
const decryptTab = document.getElementById('decrypt-tab');
const actionButton = document.getElementById('action-button');
const passwordInput = document.getElementById('password');
const fileInput = document.getElementById('file-input');
const fileInputAdd = document.getElementById('file-input-add');
const dropPromptText = document.getElementById('drop-prompt-text');
const textChoose = document.getElementById('text-choose');
const fileModeBtn = document.getElementById('file-mode-btn');
const folderModeBtn = document.getElementById('folder-mode-btn');

export function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = 'notification';

    let title = 'Info';
    if (type === 'success') title = 'Success';
    else if (type === 'error') title = 'Error';
    else if (type === 'warning') title = 'Warning';

    notification.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="pr-2">
                <p class="font-bold ${type === 'error' ? 'text-red-500' : type === 'warning' ? 'text-orange-500' : type === 'success' ? 'text-green-500' : 'text-white'}">${title}</p>
                <p class="text-sm ${type === 'error' ? 'text-red-400' : type === 'warning' ? 'text-orange-400' : type === 'success' ? 'text-green-400' : 'text-white'}">${message}</p>
            </div>
            <button class="close-notification-btn text-gray-400 hover:text-white flex-shrink-0 -mt-1 -mr-1 p-1">&times;</button>
        </div>
        <div class="notification-progress ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'}"></div>
    `;

    container.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    const progressBar = notification.querySelector('.notification-progress');

    const remove = () => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove(), { once: true });
    };

    let totalDuration = 5000;
    let remainingWidth = "100%";
    const computed = getComputedStyle(progressBar);
    const startWidth = computed.width;
    let remaining = totalDuration;
    let timer = null;
    let startTime = Date.now();

    const startProgress = (time) => {
        progressBar.style.transition = `width ${time}ms linear`;
        progressBar.style.width = '0%';
    };

    const resetProgress = () => {
        progressBar.style.transition = 'none';
        progressBar.style.width = remainingWidth;
        void progressBar.offsetWidth;
    };

    const startTimer = (time) => {
        startTime = Date.now();
        timer = setTimeout(remove, time);
        resetProgress();
        startProgress(time);
    };

    startTimer(remaining);

    notification.querySelector('.close-notification-btn').addEventListener('click', () => {
        clearTimeout(timer);
        remove();
    });

    notification.addEventListener('mouseenter', () => {
        clearTimeout(timer);
        const elapsed = Date.now() - startTime;
        remaining = Math.max(0, remaining - elapsed);

        const computed = getComputedStyle(progressBar);
        const currentWidth = computed.width;
        progressBar.style.transition = 'none';
        progressBar.style.width = currentWidth;
        remainingWidth = `${startWidth/currentWidth}%`
    });

    notification.addEventListener('mouseleave', () => {
        if (remaining > 0) {
            startTimer(remaining);
        }
    });
}

export async function updateFileList(files) {
    const list = document.getElementById("files-list");
    list.innerHTML = "";

    if (!files || files.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-500 italic py-6">Nothing here</p>`;
        return;
    }

    if(!state.isFileMode) {
        Array.from(state.folderNames).forEach(folderName => {
            const li = document.createElement("li");
            li.className = "flex items-center justify-between py-2";
            li.innerHTML = `
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <span>${folderName}</span>
            </div>
            <button class="download-button" data-foldername="${folderName}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"/>
                </svg> 
            </button>
        `;
            list.appendChild(li);
        });
    }

    files.forEach(file => {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between py-2";
        li.innerHTML = `
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9V17.8C19 18.9201 19 19.4802 18.782 19.908C18.5903 20.2843 18.2843 20.5903 17.908 20.782C17.4802 21 16.9201 21 15.8 21H8.2C7.07989 21 6.51984 21 6.09202 20.782C5.71569 20.5903 5.40973 20.2843 5.21799 19.908C5 19.4802 5 18.9201 5 17.8V6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.5199 3 7.0799 3 8.2 3H13M19 9L13 3M19 9H14C13.4477 9 13 8.55228 13 8V3"/>
                </svg>
                <span>${file}</span>
            </div>
            <button class="download-button" data-filepath="${file}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"/>
                </svg> 
            </button>
        `;
        list.appendChild(li);
    });
}

export function displaySelectedFiles(files) {
    const uploadPrompt = document.getElementById('upload-prompt');
    const fileDisplay = document.getElementById('file-display');
    const fileList = document.getElementById('fileList');
    const fileIcon = document.getElementById('file-icon');
    const folderIcon = document.getElementById('folder-icon');
    const fileNameDisplay = document.getElementById('file-name');
    const addFilesBtn = document.getElementById('add-files-btn');

    addFilesBtn.classList.remove('hidden');
    uploadPrompt.classList.add('hidden');
    fileDisplay.classList.remove('hidden');
    fileDisplay.classList.add('flex');

    while (fileList.firstChild) {
        fileList.removeChild(fileList.firstChild);
    }

    if (state.isFileMode) {
        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center space-x-2 text-sm text-gray-300 py-1';
            fileItem.innerHTML = `
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                                  d="M19 9V17.8C19 18.9201 19 19.4802 18.782 19.908C18.5903 20.2843 18.2843 20.5903 17.908 20.782C17.4802 21 16.9201 21 15.8 21H8.2C7.07989 21 6.51984 21 6.09202 20.782C5.71569 20.5903 5.40973 20.2843 5.21799 19.908C5 19.4802 5 18.9201 5 17.8V6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.5199 3 7.0799 3 8.2 3H13M19 9L13 3M19 9H14C13.4477 9 13 8.55228 13 8V3"/>                </svg>
                <span class="file-name">${file.name}</span>
                <button class="remove-button" data-filename="${file.name}" data-filepath="${file.webkitRelativePath}">x</button>`;
            fileList.appendChild(fileItem);
        });
    } else {
        Array.from(state.folderNames).forEach(folderName => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center space-x-2 text-sm text-gray-300 py-1';
            fileItem.innerHTML = `
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <span class="file-name">${folderName}</span>
                <button class="remove-button" data-foldername="${folderName}"">x</button>`;
            fileList.appendChild(fileItem);
        });
    }

    if (state.isFileMode) {
        fileIcon.classList.remove('hidden');
        folderIcon.classList.add('hidden');
    } else {
        fileIcon.classList.add('hidden');
        folderIcon.classList.remove('hidden');
    }

    fileNameDisplay.textContent = `${files.length} file${files.length > 1 ? 's' : ''} selected`;
}

export function updateMainUI() {
    if (state.isEncryptMode) {
        encryptTab.classList.replace('tab-inactive', 'tab-active');
        decryptTab.classList.replace('tab-active', 'tab-inactive');
        actionButton.textContent = 'Encrypt';
        fileInput.removeAttribute('accept');
        fileInputAdd.removeAttribute('accept');
    } else {
        decryptTab.classList.replace('tab-inactive', 'tab-active');
        encryptTab.classList.replace('tab-active', 'tab-inactive');
        actionButton.textContent = 'Decrypt';
        fileInput.setAttribute('accept', '.dat');
        fileInputAdd.setAttribute('accept', '.dat');
    }
    if (state.selectedFiles) {
        fileHandler.resetFileInput().catch(error => ui.showNotification(`Error resetting file input: ${error.message}`, 'error'));
    }
    passwordInput.value = '';
}

export function updateUploadUI() {
    if (state.isFileMode) {
        fileModeBtn.classList.replace('mode-btn-inactive', 'mode-btn-active');
        folderModeBtn.classList.replace('mode-btn-active', 'mode-btn-inactive');
        fileInput.removeAttribute('webkitdirectory');
        fileInput.removeAttribute('directory');
        fileInputAdd.removeAttribute('webkitdirectory');
        fileInputAdd.removeAttribute('directory');
        dropPromptText.textContent = 'Drag & drop a file here';
        textChoose.textContent = 'Choose File';
    } else {
        folderModeBtn.classList.replace('mode-btn-inactive', 'mode-btn-active');
        fileModeBtn.classList.replace('mode-btn-active', 'mode-btn-inactive');
        fileInput.setAttribute('webkitdirectory', '');
        fileInput.setAttribute('directory', '');
        fileInput.setAttribute('multiple', '');
        fileInputAdd.setAttribute('webkitdirectory', '');
        fileInputAdd.setAttribute('directory', '');
        fileInputAdd.setAttribute('multiple', '');
        dropPromptText.textContent = 'Drag & drop a folder here';
        textChoose.textContent = 'Choose Folder';
    }
    if (state.selectedFiles) {
        fileHandler.resetFileInput().catch(error => ui.showNotification(`Error resetting file input: ${error.message}`, 'error'));
    }
}