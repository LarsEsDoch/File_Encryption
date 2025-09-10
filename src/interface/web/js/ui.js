import * as main from "./main.js";
import * as ui from "./ui.js";
import * as state from "./state.js";
import * as fileHandler from "./fileHandler.js";

const encryptTab = document.getElementById('encrypt-tab');
const decryptTab = document.getElementById('decrypt-tab');
const actionButton = document.getElementById('action-button');
const secretKeyInput = document.getElementById('password');
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
    if (type === 'success') {
        title = 'Success';
    } else if (type === 'error') {
        title = 'Error';
    } else if (type === 'warning') {
        title = 'Warning';
    }

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

    const remove = () => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove(), { once: true });
    };

    const timer = setTimeout(remove, 5000);

    notification.querySelector('.close-notification-btn').addEventListener('click', () => {
        clearTimeout(timer);
        remove();
    });
}

export async function updateFileList(files) {
    const list = document.getElementById("files-list");
    list.innerHTML = "";

    if (!files || files.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-500 italic py-6">Nothing here</p>`;
        return;
    }

    files.forEach(file => {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between py-2";
        li.innerHTML = `
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 16v-8a2 2 0 012-2h4l2-2h6a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
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
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="file-name">${file.name}</span>
                <button class="remove-button" data-filename="${file.name}" data-filepath="${file.webkitRelativePath}">x</button>`;
            fileList.appendChild(fileItem);
        });
    } else {
        Array.from(state.folderNames).forEach(folderName => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center space-x-2 text-sm text-gray-300 py-1';
            fileItem.innerHTML = `
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
    secretKeyInput.value = '';
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