import * as api from './api.js';
import * as ui from './ui.js';
import * as fileHandler from './file-handler.js';


const encryptTab = document.getElementById('encrypt-tab');
const decryptTab = document.getElementById('decrypt-tab');
const actionButton = document.getElementById('action-button');
const secretKeyInput = document.getElementById('password');
const toggleVisibilityButton = document.getElementById('toggle-key-visibility');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');
const downloadAllButton = document.getElementById('download-all-btn');

const fileDropZone = document.getElementById('file-drop-zone');
const fileInput = document.getElementById('file-input');
const uploadPrompt = document.getElementById('upload-prompt');
const fileInputAdd = document.getElementById('file-input-add');
const dropPromptText = document.getElementById('drop-prompt-text');
const addFilesBtn = document.getElementById('add-files-btn');
const textChoose = document.getElementById('text-choose');
const fileDisplay = document.getElementById('file-display');
const fileNameDisplay = document.getElementById('file-name');
const fileModeBtn = document.getElementById('file-mode-btn');
const folderModeBtn = document.getElementById('folder-mode-btn');


const sessionID = crypto.randomUUID();
let isEncryptMode = true;
let selectedFiles = null;
let isFileMode = true;
let folderName = "";
let isOperating = false;


function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}


async function updateAndLoadFiles() {
    try {
        const formData = new FormData();
        formData.append("sessionID", sessionID);
        const data = await api.loadFiles(formData);
        await ui.updateFileList(data.files);
    } catch (error) {
        ui.showNotification(`Error loading file list: ${error.message}`, 'error');
    }
}

async function resetFileInput() {
    const formData = new FormData();
    formData.append("sessionID", sessionID);
    await api.removeSession(formData);

    selectedFiles = null;
    fileInput.value = '';
    uploadPrompt.classList.remove('hidden');
    fileDisplay.classList.add('hidden');
    fileDisplay.classList.remove('flex');
    await updateAndLoadFiles();
}

function updateMainUI() {
    if (isEncryptMode) {
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
    if (selectedFiles) {
        resetFileInput().catch(error => ui.showNotification(`Error resetting file input: ${error.message}`, 'error'));
    }
    secretKeyInput.value = '';
}

function updateUploadUI() {
    if (isFileMode) {
        fileModeBtn.classList.replace('mode-btn-inactive', 'mode-btn-active');
        folderModeBtn.classList.replace('mode-btn-active', 'mode-btn-inactive');
        fileInput.removeAttribute('webkitdirectory');
        fileInput.removeAttribute('directory');
        dropPromptText.textContent = 'Drag & drop a file here';
        textChoose.textContent = 'Choose File';
    } else {
        folderModeBtn.classList.replace('mode-btn-inactive', 'mode-btn-active');
        fileModeBtn.classList.replace('mode-btn-active', 'mode-btn-inactive');
        fileInput.setAttribute('webkitdirectory', '');
        fileInput.setAttribute('directory', '');
        fileInput.setAttribute('multiple', '');
        dropPromptText.textContent = 'Drag & drop a folder here';
        textChoose.textContent = 'Choose Folder';
    }
    if (selectedFiles) {
        resetFileInput().catch(error => ui.showNotification(`Error resetting file input: ${error.message}`, 'error'));
    }
}


async function handleFiles(files, mode) {
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append("sessionID", sessionID);

    if (mode !== 'add') {
        await api.removeSession(formData);
    }

    await updateAndLoadFiles();

    selectedFiles = (mode === 'add') ? fileHandler.mergeFileLists(selectedFiles, files) : files;

    if (!isFileMode) {
        folderName = selectedFiles[0].webkitRelativePath.split('/')[0];
    }

    ui.displaySelectedFiles(selectedFiles, isFileMode, folderName);

    isOperating = "uploading";
    try {
        const uploadFormData = new FormData();
        uploadFormData.append("sessionID", sessionID);
        Array.from(selectedFiles).forEach(file => {
            const filePath = file.webkitRelativePath || file.name;
            uploadFormData.append('files', file, filePath);
        });

        const result = await api.uploadFiles(uploadFormData);
        if (result.error) {
            ui.showNotification(result.error, 'error');
        } else {
            ui.showNotification(result.message, 'success');
        }
    } catch (error) {
        ui.showNotification(`Error uploading files: ${error.message}`, 'error');
    } finally {
        isOperating = false;
    }
}


encryptTab.addEventListener('click', () => {
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    if (!isEncryptMode) { isEncryptMode = true; updateMainUI(); }
});

decryptTab.addEventListener('click', () => {
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    if (isEncryptMode) { isEncryptMode = false; updateMainUI(); }
});

fileModeBtn.addEventListener('click', () => {
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    isFileMode = true;
    updateUploadUI();
});

folderModeBtn.addEventListener('click', () => {
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    isFileMode = false;
    updateUploadUI();
});

fileDropZone.addEventListener('click', (e) => {
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    if (e.target.classList.contains('remove-button') || e.target.closest('#file-input-add')) return;
    fileInput.click();
});

fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
});

fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('dragover'));

fileDropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    fileDropZone.classList.remove('dragover');

    const items = e.dataTransfer.items;
    if (items && items.length > 0 && items[0].webkitGetAsEntry) {
        const entry = items[0].webkitGetAsEntry();
        if (entry) {
            try {
                if (entry.isFile) {
                    isFileMode = true;
                    updateUploadUI();
                    await handleFiles(e.dataTransfer.files, 'new');
                } else if (entry.isDirectory) {
                    isFileMode = false;
                    updateUploadUI();
                    let files = await fileHandler.readFolderContents(entry);
                    if (!isEncryptMode) {
                        const validFiles = files.filter(file => file.name.toLowerCase().endsWith('.dat'));
                        if (validFiles.length === 0) ui.showNotification('Please select only .dat files in decrypt mode!', 'warning');
                        if (files.length - validFiles.length >= 1) ui.showNotification(`${files.length - validFiles.length} files are not encrypted!`, 'warning');
                        files = validFiles;
                    }
                    const dataTransfer = new DataTransfer();
                    files.forEach(file => dataTransfer.items.add(file));
                    await handleFiles(dataTransfer.files, 'new');
                }
            } catch (error) {
                ui.showNotification(`Error reading folder: ${error.message}`, 'error');
            }
            return;
        }
    }


    let files = e.dataTransfer.files;
    if (!isEncryptMode) {
        const validFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.dat'));
        if (validFiles.length === 0) ui.showNotification('Please select only .dat files in decrypt mode!', 'warning');
        if (files.length - validFiles.length >= 1) ui.showNotification(`${files.length - validFiles.length} files are not encrypted!`, 'warning');
        files = validFiles;
    }
    await handleFiles(files, 'new');
});


fileInput.addEventListener('change', (e) => {
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    handleFiles(e.target.files, 'new').catch(error => ui.showNotification(`Error handling files: ${error.message}`, 'error'));
});

fileInputAdd.addEventListener('change', (e) => {
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    handleFiles(e.target.files, 'add').catch(error => ui.showNotification(`Error handling files: ${error.message}`, 'error'));
});

addFilesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInputAdd.click();
});

toggleVisibilityButton.addEventListener('click', () => {
    const isPassword = secretKeyInput.type === 'password';
    secretKeyInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', isPassword);
    eyeOffIcon.classList.toggle('hidden', !isPassword);
});

downloadAllButton.addEventListener('click', async () => {
    const list = document.getElementById("files-list");
    if (list.innerHTML.trim().includes("Nothing here")) {
        return ui.showNotification('No files to download!', 'info');
    }

    const formData = new FormData();
    formData.append("sessionID", sessionID);

    try {
        const response = await api.downloadFolder(formData);
        if (!response.ok) {
            const result = await response.json();
            if(result.error) {
                ui.showNotification(result.error, 'error');
                await updateAndLoadFiles();
                return;
            }
        }
        const downloadFilename = (!isFileMode && folderName) ? `${folderName}.zip` : `${getFormattedTimestamp()}.zip`;
        await ui.startDownload(response, downloadFilename);
    } catch (error) {
        ui.showNotification(`Error downloading folder: ${error.message}`, 'error');
    }
});

actionButton.addEventListener('click', async () => {
    if (isOperating) return ui.showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
    if (!selectedFiles) return ui.showNotification('No files selected!', 'info');
    if (!secretKeyInput.value) return ui.showNotification('Please enter a password first!', 'info');

    isOperating = isEncryptMode ? 'encrypting' : 'decrypting';
    actionButton.disabled = true;
    actionButton.classList.add('cursor-not-allowed', 'opacity-50');

    const endpoint = isEncryptMode ? '/encrypt-files' : '/decrypt-files';
    const formData = new FormData();
    formData.append('password', secretKeyInput.value);
    formData.append("sessionID", sessionID);

    try {
        const result = await api.performCryptoOperation(endpoint, formData);
        if (result.error) {
            ui.showNotification(result.error, 'error');
        } else {
            ui.showNotification(result.message, 'success');
            if (result.status === 'warning') {
                if (result.warning_password) ui.showNotification(result.warning_password, 'warning');
                if (result.warning_mismatch) ui.showNotification(result.warning_mismatch, 'warning');
            }
        }
    } catch (error) {
        ui.showNotification(`Crypto operation failed: ${error.message}`, 'error');
    } finally {
        await updateAndLoadFiles();
        setTimeout(() => {
            isOperating = false;
            actionButton.disabled = false;
            actionButton.classList.remove('cursor-not-allowed', 'opacity-50');
        }, 1000);
    }
});

document.addEventListener('click', async function(e) {
    if (e.target && e.target.classList.contains('remove-button')) {
        e.stopPropagation();
        if (isOperating) return ui.showNotification('An operation is in progress. Please wait!', 'warning');

        if (!isFileMode) {
            resetFileInput().catch(error => ui.showNotification(`Error resetting file input: ${error.message}`, 'error'));
            ui.showNotification(`Folder ${folderName} removed successfully.`, 'info');
            return;
        }

        const fileName = e.target.getAttribute('data-filename');
        const filePath = e.target.getAttribute('data-filepath');

        const formData = new FormData();
        formData.append("filePath", filePath || ".");
        formData.append("fileName", fileName);
        formData.append("sessionID", sessionID);

        try {
            const result = await api.removeFile(formData);
            if (result.error) {
                ui.showNotification(`Error removing file: ${fileName}!`, 'error');
            } else {
                ui.showNotification(`File ${fileName} removed successfully.`, 'info');
                e.target.closest('div').remove();

                if(selectedFiles) {
                    const remainingFiles = Array.from(selectedFiles).filter(file => file.name !== fileName && (file.webkitRelativePath || file.name) !== filePath);
                    if (remainingFiles.length > 0) {
                        const dt = new DataTransfer();
                        remainingFiles.forEach(file => dt.items.add(file));
                        selectedFiles = dt.files;
                        fileNameDisplay.textContent = `${remainingFiles.length} file${remainingFiles.length > 1 ? 's' : ''} selected`;
                    } else {
                        await resetFileInput();
                    }
                }
            }
        } catch (error) {
            ui.showNotification(`Error removing file: ${error.message}`, 'error');
        }
    }


    const downloadButton = e.target.closest('.download-button');
    if (downloadButton) {
        e.stopPropagation();
        const filePath = downloadButton.getAttribute('data-filepath');
        const formData = new FormData();
        formData.append("filePath", filePath);
        formData.append("sessionID", sessionID);

        try {
            const response = await api.downloadFile(formData);
            const downloadFilename = filePath.split('/').pop();
            await ui.startDownload(response, downloadFilename);
        } catch (error) {
            ui.showNotification(`Error downloading file: ${error.message}`, 'error');
        }
    }
});

window.addEventListener('beforeunload', async function () {
    const formData = new FormData();
    formData.append("sessionID", sessionID);
    await api.removeSession(formData);
});



eyeOffIcon.classList.add('hidden');
fileModeBtn.classList.add('mode-btn-active');
folderModeBtn.classList.add('mode-btn-inactive');
updateMainUI();
updateUploadUI();