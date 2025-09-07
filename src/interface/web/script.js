const encryptTab = document.getElementById('encrypt-tab');
const decryptTab = document.getElementById('decrypt-tab');
const actionButton = document.getElementById('action-button');
const secretKeyInput = document.getElementById('password');
const outputText = document.getElementById('output-text');
const toggleVisibilityButton = document.getElementById('toggle-key-visibility');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');
const downloadAllButton = document.getElementById('download-all-btn');

const fileDropZone = document.getElementById('file-drop-zone');
const fileInput = document.getElementById('file-input');
const uploadPrompt = document.getElementById('upload-prompt');
const dropPromptText = document.getElementById('drop-prompt-text');
const textChoose = document.getElementById('text-choose');
const fileDisplay = document.getElementById('file-display');
const fileNameDisplay = document.getElementById('file-name');
const fileIcon = document.getElementById('file-icon');
const folderIcon = document.getElementById('folder-icon');
const fileModeBtn = document.getElementById('file-mode-btn');
const folderModeBtn = document.getElementById('folder-mode-btn');

const sessionID = crypto.randomUUID();

let isEncryptMode = true;
let selectedFiles = null;
let isFileMode = true;
let folderName = "";
let isOperating = false;

encryptTab.addEventListener('click', () => {
    if (isOperating) {
        showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
        return;
    }
    if (!isEncryptMode) { isEncryptMode = true; updateMainUI(); }
});

decryptTab.addEventListener('click', () => {
    if (isOperating) {
        showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
        return;
    }
    if (isEncryptMode) { isEncryptMode = false; updateMainUI(); }
});

fileModeBtn.addEventListener('click', () => {
    if (isOperating) {
        showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
        return;
    }
    isFileMode = true;
    updateUploadUI().catch(() => {
        showNotification('Error starting UI', 'error');
    });
});

folderModeBtn.addEventListener('click', () => {
    if (isOperating) {
        showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
        return;
    }
    isFileMode = false;
    updateUploadUI().catch(() => {
        showNotification('Error starting UI', 'error');
    });
});

fileDropZone.addEventListener('click', (e) => {
    if (isOperating) {
        showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
        return;
    }
    if (e.target.classList.contains('remove-button')) {
        return;
    }
    fileInput.click();
});

fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
});

fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('dragover'));

fileDropZone.addEventListener('drop', async (e) => {
    if (isOperating) {
        showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
        return;
    }
    e.preventDefault();
    fileDropZone.classList.remove('dragover');

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
        const item = items[0].webkitGetAsEntry();

        if (item) {
            if (item.isFile) {
                isFileMode = true;
                updateUploadUI().catch(() => {
                    showNotification('Error starting UI', 'error');
                });
                await handleFiles(e.dataTransfer.files);
            } else if (item.isDirectory) {
                isFileMode = false;
                updateUploadUI().catch(() => {
                    showNotification('Error starting UI', 'error');
                });

                try {
                    const files = await readFolderContents(item);

                    const dataTransfer = new DataTransfer();
                    files.forEach(file => dataTransfer.items.add(file));

                    await handleFiles(dataTransfer.files);
                } catch (error) {
                    showNotification(`Error reading folder: ${error.message}`, 'error');
                }
            }
        }
    } else {
        await handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', (e) => {
    if (isOperating) {
        showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
        return;
    }
    handleFiles(e.target.files).catch(() => {
        showNotification('Error handling files', 'error');
    });
});

eyeOffIcon.classList.add('hidden');

toggleVisibilityButton.addEventListener('click', () => {
    const isPassword = secretKeyInput.type === 'password';
    secretKeyInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', isPassword);
    eyeOffIcon.classList.toggle('hidden', !isPassword);
});

downloadAllButton.addEventListener('click', async () => {
    const list = document.getElementById("files-list");
    if (list.innerHTML.trim() === `<p class="text-center text-gray-500 italic py-6">Nothing here</p>`) {
        showNotification('No files to download!', 'info');
        return;
    }
    const formData = new FormData();
    formData.append("sessionID", sessionID);

    try {
        const response = await fetch('/download-folder', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const result = await response.json();

            if (result.error) {
                showNotification(result.error, 'error');
                await loadFiles();
                return;
            }
        }

        let downloadFilename;
        if (isFileMode === false && folderName) {
            downloadFilename = `${folderName}.zip`;
        } else {
            downloadFilename = `${getFormattedTimestamp()}.zip`;
        }
        await startDownload(response, downloadFilename);
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
});

actionButton.addEventListener('click', () => {
    if (isOperating) {
        showNotification(`An ${isOperating} operation is in progress. Please wait!`, 'warning');
        return;
    }

    const key = secretKeyInput.value;
    if (!selectedFiles) {
        showNotification('No files selected', 'info');
        return;
    }
    if (!key) {
        showNotification('Please enter a password first', 'info');
        return;
    }

    isOperating = isEncryptMode ? 'encrypting' : 'decrypting';
    actionButton.disabled = true;
    actionButton.classList.add('cursor-not-allowed', 'opacity-50');

    performCryptoOperation(isEncryptMode).catch(() => {
        showNotification('Error performing crypto operation', 'error');
    }).finally(() => {
        setTimeout(() => {
            isOperating = false;
            actionButton.disabled = false;
            actionButton.classList.remove('cursor-not-allowed', 'opacity-50');
        }, 1000);
    });
});

document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('remove-button')) {
        e.stopPropagation();
        if (isOperating) {
            showNotification('An operation is in progress. Please wait!', 'warning');
            return;
        }
        const fileName = e.target.getAttribute('data-filename');
        const filePath = e.target.getAttribute('data-filepath');
        const fileItem = e.target.closest('div');

        if (isFileMode === false) {
            resetFileInput().catch(() => {
                showNotification('Error resetting file input', 'error');
            });
            showNotification(`Folder ${folderName} removed successful`, 'info');
            return;
        }

        removeFileFromBackend(filePath, fileName).then(() => {
            fileItem.remove();

            if (selectedFiles) {
                const remainingFiles = Array.from(selectedFiles).filter(file => {
                    return file.name !== fileName && (file.webkitRelativePath || file.name) !== filePath;
                });

                if (remainingFiles.length > 0) {
                    const dt = new DataTransfer();
                    remainingFiles.forEach(file => dt.items.add(file));
                    selectedFiles = dt.files;

                    fileNameDisplay.textContent = `${remainingFiles.length} file${remainingFiles.length > 1 ? 's' : ''} selected`;
                } else {
                    selectedFiles = null;
                    resetFileInput().catch(() => {
                        showNotification('Error resetting file input', 'error');
                    });
                }
            }
        });
    }

    const downloadButton = e.target.closest('.download-button');
    if (downloadButton) {
        const filePath = downloadButton.getAttribute('data-filepath');

        e.stopPropagation();

        downloadFileFromBackend(filePath).catch((error) => {
            showNotification(`Error downloading file: ${error.message}`, 'error');
        });
    }
});

window.addEventListener('beforeunload', async function (e) {
    const formData = new FormData();
    formData.append("sessionID", sessionID);

    await fetch('/remove-session', {
        method: 'POST',
        body: formData
    });

    e.preventDefault();
});

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


async function startDownload(response, downloadFilename) {
    if (!response.ok) {
        showNotification(response.statusText, 'error');
        return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = downloadFilename;

    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}


function showNotification(message, type = 'info') {
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


async function performCryptoOperation(isEncrypt) {
    const endpoint = isEncrypt ? '/encrypt-files' : '/decrypt-files';
    const formData = new FormData();
    formData.append('password', secretKeyInput.value);
    formData.append("sessionID", sessionID);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.error) {
            showNotification(result.error, 'error');
            await loadFiles();
            return;
        }

        showNotification(result.message, 'success');

        if (result.status === 'warning') {
            if (result.warning_password) {
                showNotification(result.warning_password, 'warning');
            }
            if (result.warning_mismatch) {
                showNotification(result.warning_mismatch, 'warning');
            }
        }
    } catch (error) {
        showNotification(error.message, 'error');

        throw error;
    }
    await loadFiles();
}


async function uploadFiles(files) {
    const formData = new FormData();
    formData.append("sessionID", sessionID);

    Array.from(files).forEach(file => {
        const filePath = file.webkitRelativePath || file.name;
        formData.append('files', file, filePath);
    });
    isOperating = "uploading";

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.error) {
            showNotification(result.error, 'error');
            return;
        }
        showNotification(result.message, 'success');
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    } finally {
        isOperating = false;
    }
}


async function loadFiles() {
    const formData = new FormData();
    formData.append("sessionID", sessionID);

    try {
        const response = await fetch('/files', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        const list = document.getElementById("files-list");

        list.innerHTML = "";

        if (data.files.length === 0) {
            list.innerHTML = `<p class="text-center text-gray-500 italic py-6">Nothing here</p>`;
            return;
        }

        data.files.forEach(file => {
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
    } catch (error) {
        showNotification(`Error loading file list`, 'error');
        throw error;
    }
}


async function removeFileFromBackend(filePath, fileName) {
    const formData = new FormData();
    formData.append("filePath", filePath || ".");
    formData.append("fileName", fileName);
    formData.append("sessionID", sessionID);

    try {
        const response = await fetch('/remove-file', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.error) {
            showNotification(`Error removing file: ${fileName}`, 'error');
            return;
        }
        showNotification(`File ${fileName} removed successful`, 'info');
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}


async function downloadFileFromBackend(filePath) {
    const formData = new FormData();
    formData.append("filePath", filePath);
    formData.append("sessionID", sessionID);

    try {
        const response = await fetch('/download-file', {
            method: 'POST',
            body: formData
        });

        let downloadFilename = filePath.split('/').pop();

        await startDownload(response, downloadFilename);
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}


async function readFolderContents(entry, basePath = '') {
    if (entry.isFile) {
        return new Promise((resolve) => {
            entry.file(file => {
                const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

                Object.defineProperty(file, 'webkitRelativePath', {
                    value: relativePath,
                    writable: false,
                    configurable: true
                });

                resolve([file]);
            });
        });
    } else if (entry.isDirectory) {
        const reader = entry.createReader();
        folderName = basePath;

        return new Promise((resolve) => {
            reader.readEntries(async (entries) => {
                const allFiles = [];
                const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

                for (const childEntry of entries) {
                    const childFiles = await readFolderContents(childEntry, currentPath);
                    allFiles.push(...childFiles);
                }
                resolve(allFiles);
            });
        });
    }
    return [];
}


async function handleFiles(files) {
    const formData = new FormData();
    formData.append("sessionID", sessionID);

    await fetch('/remove-session', {
        method: 'POST',
        body: formData
    });

    await loadFiles();

    if (files.length === 0) return;
    selectedFiles = files;

    uploadPrompt.classList.add('hidden');
    fileDisplay.classList.remove('hidden');
    fileDisplay.classList.add('flex');

    while (fileList.firstChild) {
        fileList.removeChild(fileList.firstChild);
    }

    if (isFileMode === true) {
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
        folderName = files[0].webkitRelativePath.split('/')[0];
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center space-x-2 text-sm text-gray-300 py-1';
        fileItem.innerHTML = `
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="file-name">${folderName}</span>
                <button class="remove-button" data-filename="${folderName}" data-filepath="${folderName}">x</button>`;
        fileList.appendChild(fileItem);
    }


    fileIcon.classList.remove('hidden');
    folderIcon.classList.add('hidden');
    fileNameDisplay.textContent = `${files.length} file${files.length > 1 ? 's' : ''} selected`;
    uploadFiles(files).catch(() => {
        showNotification('Error uploading files', 'error');
    });
}


async function updateUploadUI() {
    if (isFileMode === true) {

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
        resetFileInput().catch(() => {
            showNotification('Error resetting file input', 'error');
        });
    }
}


function updateMainUI() {
    if (isEncryptMode) {
        encryptTab.classList.replace('tab-inactive', 'tab-active');
        decryptTab.classList.replace('tab-active', 'tab-inactive');
        actionButton.textContent = 'Encrypt';
    } else {
        decryptTab.classList.replace('tab-inactive', 'tab-active');
        encryptTab.classList.replace('tab-active', 'tab-inactive');
        actionButton.textContent = 'Decrypt';
    }

    if (selectedFiles) {
        resetFileInput().catch(() => {
            showNotification('Error resetting file input', 'error');
        });
    }
    secretKeyInput.value = '';
    outputText.value = '';
}


async function resetFileInput() {
    const formData = new FormData();
    formData.append("sessionID", sessionID);

    await fetch('/remove-session', {
        method: 'POST',
        body: formData
    });

    selectedFiles = null;
    fileInput.value = '';
    uploadPrompt.classList.remove('hidden');
    fileDisplay.classList.add('hidden');
    fileDisplay.classList.remove('flex');
    await loadFiles();
}

fileModeBtn.classList.add('mode-btn-active');
folderModeBtn.classList.add('mode-btn-inactive');

updateMainUI();
updateUploadUI().catch(() => {
    showNotification('Error starting UI', 'error');
});