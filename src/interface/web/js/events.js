import * as ui from "./ui.js";
import * as state from "./state.js";
import * as fileHandler from "./fileHandler.js";
import * as api from "./api.js";
import * as main from "./main.js";
import {sessionID} from "./main.js";
import * as utils from "./utils.js";


export function registerEventListeners() {
    const encryptTab = document.getElementById('encrypt-tab');
    const decryptTab = document.getElementById('decrypt-tab');
    const actionButton = document.getElementById('action-button');
    const passwordInput = document.getElementById('password');
    const toggleVisibilityButton = document.getElementById('toggle-key-visibility');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');
    const downloadAllButton = document.getElementById('download-all-btn');
    const fileDropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInputAdd = document.getElementById('file-input-add');
    const addFilesBtn = document.getElementById('add-files-btn');
    const fileNameDisplay = document.getElementById('file-name');
    const fileModeBtn = document.getElementById('file-mode-btn');
    const folderModeBtn = document.getElementById('folder-mode-btn');


    encryptTab.addEventListener('click', () => {
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
        if (!state.isEncryptMode) { state.setEncryptMode(true); ui.updateMainUI(); }
    });

    decryptTab.addEventListener('click', () => {
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
        if (state.isEncryptMode) { state.setEncryptMode(false); ui.updateMainUI(); }
    });

    fileModeBtn.addEventListener('click', () => {
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
        state.setFileMode(true);
        ui.updateUploadUI();
    });

    folderModeBtn.addEventListener('click', () => {
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
        state.setFileMode(false);
        ui.updateUploadUI();
    });

    fileDropZone.addEventListener('click', (e) => {
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
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
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
        fileDropZone.classList.remove('dragover');

        const items = e.dataTransfer.items;
        if (items && items.length > 0 && items[0].webkitGetAsEntry) {
            const entry = items[0].webkitGetAsEntry();
            if (entry) {
                try {
                    if (entry.isFile) {
                        state.setFileMode(true);
                        ui.updateUploadUI();
                        await fileHandler.handleFiles(e.dataTransfer.files, 'new');
                    } else if (entry.isDirectory) {
                        state.setFileMode(false);
                        ui.updateUploadUI();
                        let files = await fileHandler.readFolderContents(entry);
                        if (!state.isEncryptMode) {
                            const validFiles = files.filter(file => file.name.toLowerCase().endsWith('.dat'));
                            if (validFiles.length === 0) ui.showNotification('Please select only .dat files in decrypt mode!', 'warning');
                            if (files.length - validFiles.length >= 1) ui.showNotification(`${files.length - validFiles.length} files are not encrypted!`, 'warning');
                            files = validFiles;
                        }
                        const dataTransfer = new DataTransfer();
                        files.forEach(file => dataTransfer.items.add(file));
                        await fileHandler.handleFiles(dataTransfer.files, 'new');
                    }
                } catch (error) {
                    ui.showNotification(`Error reading folder: ${error.message}`, 'error');
                }
                return;
            }
        }


        let files = e.dataTransfer.files;
        if (!state.isEncryptMode) {
            const validFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.dat'));
            if (validFiles.length === 0) ui.showNotification('Please select only .dat files in decrypt mode!', 'warning');
            if (files.length - validFiles.length >= 1) ui.showNotification(`${files.length - validFiles.length} files are not encrypted!`, 'warning');
            files = validFiles;
        }
        await fileHandler.handleFiles(files, 'new');
    });


    fileInput.addEventListener('change', (e) => {
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
        fileHandler.handleFiles(e.target.files, 'new').catch(error => ui.showNotification(`Error handling files: ${error.message}`, 'error'));
    });

    fileInputAdd.addEventListener('change', (e) => {
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
        fileHandler.handleFiles(e.target.files, 'add').catch(error => ui.showNotification(`Error handling files: ${error.message}`, 'error'));
    });

    addFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInputAdd.click();
    });

    toggleVisibilityButton.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        eyeIcon.classList.toggle('hidden', isPassword);
        eyeOffIcon.classList.toggle('hidden', !isPassword);
    });

    downloadAllButton.addEventListener('click', async () => {
        const list = document.getElementById("files-list");
        if (list.innerHTML.trim().includes("Nothing here")) {
            return ui.showNotification('No files to download!', 'info');
        }

        const formData = new FormData();
        formData.append("sessionID", main.sessionID);

        try {
            const response = await api.downloadAll(formData);
            if (!response.ok) {
                const result = await response.json();
                if(result.error) {
                    ui.showNotification(result.error, 'error');
                    await fileHandler.updateAndLoadFiles();
                    return;
                }
            }
            const downloadFilename = `${utils.getFormattedTimestamp()}.zip`;
            await fileHandler.startDownload(response, downloadFilename);
        } catch (error) {
            ui.showNotification(`Error downloading folder: ${error.message}`, 'error');
        }
    });

    actionButton.addEventListener('click', async () => {
        if (state.isOperating) return ui.showNotification(`An ${state.isOperating} operation is in progress. Please wait!`, 'warning');
        if (!state.selectedFiles) return ui.showNotification('No files selected!', 'info');
        if (!passwordInput.value) return ui.showNotification('Please enter a password first!', 'info');
        if (utils.checkPasswordStrength(passwordInput.value).status === 400) ui.showNotification(utils.checkPasswordStrength(passwordInput.value).feedback, 'warning')

        state.setOperating(state.isEncryptMode ? 'encrypting' : 'decrypting');
        actionButton.disabled = true;
        actionButton.classList.add('cursor-not-allowed', 'opacity-50');

        const endpoint = state.isEncryptMode ? '/encrypt-files' : '/decrypt-files';
        const formData = new FormData();
        formData.append('password', passwordInput.value);
        formData.append("sessionID", main.sessionID);

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
            await fileHandler.updateAndLoadFiles();
            setTimeout(() => {
                state.setOperating(false);
                actionButton.disabled = false;
                actionButton.classList.remove('cursor-not-allowed', 'opacity-50');
            }, 1000);
        }
    });

    document.addEventListener('click', async function(e) {
        if (e.target && e.target.classList.contains('remove-button')) {
            e.stopPropagation();
            if (state.isOperating) return ui.showNotification('An operation is in progress. Please wait!', 'warning');

            const formData = new FormData();
            formData.append("sessionID", main.sessionID);

            if (!state.isFileMode) {
                const folderName = e.target.getAttribute('data-foldername');
                formData.append("folderName", folderName);

                try {
                    const result = await api.removeFolder(formData);
                    if (result.error) {
                        ui.showNotification(`Error removing folder: ${folderName}!`, 'error');
                    } else {
                        ui.showNotification(`Folder ${folderName} removed successfully.`, 'info');
                        e.target.closest('div').remove();

                        if(state.selectedFiles) {
                            const remainingFolders = Array.from(state.folderNames).filter(name => name !== folderName);
                            const remainingFiles = Array.from(state.selectedFiles).filter(file => {
                                const topLevelFolder = file.webkitRelativePath.split('/')[0];
                                return topLevelFolder !== folderName;
                            });
                            if (remainingFolders.length > 0) {
                                const dt = new DataTransfer();
                                remainingFiles.forEach(file => dt.items.add(file));

                                state.setFolderNames(remainingFolders);
                                state.setSelectedFiles(dt.files);
                                fileNameDisplay.textContent = `${remainingFiles.length} file${remainingFiles.length > 1 ? 's' : ''} selected`;
                            } else {
                                await fileHandler.resetFileInput();
                            }
                        }
                    }
                } catch (error) {
                    ui.showNotification(`Error removing folder: ${error.message}`, 'error');
                }
                return;
            }

            const fileName = e.target.getAttribute('data-filename');
            const filePath = e.target.getAttribute('data-filepath');


            formData.append("filePath", filePath || ".");
            formData.append("fileName", fileName);


            try {
                const result = await api.removeFile(formData);
                if (result.error) {
                    ui.showNotification(`Error removing file: ${fileName}!`, 'error');
                } else {
                    ui.showNotification(`File ${fileName} removed successfully.`, 'info');
                    e.target.closest('div').remove();

                    if(state.selectedFiles) {
                        const remainingFiles = Array.from(state.selectedFiles).filter(file => file.name !== fileName && (file.webkitRelativePath || file.name) !== filePath);
                        if (remainingFiles.length > 0) {
                            const dt = new DataTransfer();
                            remainingFiles.forEach(file => dt.items.add(file));
                            state.setSelectedFiles(dt.files);
                            fileNameDisplay.textContent = `${remainingFiles.length} file${remainingFiles.length > 1 ? 's' : ''} selected`;
                        } else {
                            await fileHandler.resetFileInput();
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
            if (downloadButton.hasAttribute('data-filepath')) {
                const filePath = downloadButton.getAttribute('data-filepath');
                const formData = new FormData();
                formData.append("filePath", filePath);
                formData.append("sessionID", main.sessionID);

                try {
                    const response = await api.downloadFile(formData);
                    const downloadFilename = filePath.split('/').pop();
                    await fileHandler.startDownload(response, downloadFilename);
                } catch (error) {
                    ui.showNotification(`Error downloading file: ${error.message}`, 'error');
                }
            } else {
                const folderName = downloadButton.getAttribute('data-foldername');
                const formData = new FormData();
                formData.append("folderName", folderName);
                formData.append("sessionID", main.sessionID);

                try {
                    const response = await api.downloadFolder(formData);
                    await fileHandler.startDownload(response, folderName);
                } catch (error) {
                    ui.showNotification(`Error downloading folder: ${error.message}`, 'error');
                }
            }

        }
    });

    window.addEventListener('beforeunload', async function () {
        const formData = new FormData();
        formData.append("sessionID", main.sessionID);
        await api.removeSession(formData);
    });
}

