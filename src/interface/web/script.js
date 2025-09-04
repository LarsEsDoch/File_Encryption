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

const sessionID = Date.now().toString();

let isEncryptMode = true;
let selectedFiles = null;
let uploadMode = 'file';
let folderName = "";

encryptTab.addEventListener('click', () => {
    if (!isEncryptMode) { isEncryptMode = true; updateMainUI(); }
});

decryptTab.addEventListener('click', () => {
    if (isEncryptMode) { isEncryptMode = false; updateMainUI(); }
});

fileModeBtn.addEventListener('click', () => {
    uploadMode = 'file';
    updateUploadUI();
});

folderModeBtn.addEventListener('click', () => {
    uploadMode = 'folder';
    updateUploadUI();
});

fileDropZone.addEventListener('click', (e) => {

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
        alert(result.message); //TODO later html alert
        await loadFiles();
        return result;
    } catch (error) {
        alert(`Error: ${error.message}`);
        throw error;
    }
}


async function uploadFiles(files) {
    const formData = new FormData();
    formData.append("sessionID", sessionID);

    Array.from(files).forEach(file => {
        const filePath = file.webkitRelativePath || file.name;
        formData.append('files', file, filePath);
    });

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        alert(result.message); //TODO later html alert
        return result;
    } catch (error) {
        alert(`Error: ${error.message}`);
        throw error;
    }
}

async function loadFiles() {
    const formData = new FormData();
    formData.append("sessionID", sessionID);

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
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                          d="M3 14a1 1 0 011-1h3v-4h4v4h3a1 1 0 011 1v2a1
                             1 0 01-1 1H4a1 1 0 01-1-1v-2zM7 10l3 3 3-3H11V4H9v6H7z"
                          clip-rule="evenodd"/>
                </svg>
            </button>
        `;
        list.appendChild(li);
    });
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

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Server returned non-JSON response:', text);
            throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to remove file from backend');
        }
        return result;
    } catch (error) {
        console.error('Full error details:', error);
        alert(`Error removing file: ${error.message}`);
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

        if (!response.ok) {
            let errorMsg = `Download failed with status: ${response.status}`;
            try {
                const err = await response.json();
                errorMsg = err.message || errorMsg;
            } catch (e) {
            }
            throw new Error(errorMsg);
        }

        const disposition = response.headers.get('content-disposition');

        let downloadFilename = filePath.split('/').pop();

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
    } catch (error) {
        console.error('Full error details:', error);
        alert(`Error downloading file: ${error.message}`);
        throw error;
    }
}


async function readFolderContents(entry, basePath = '') {
    const files = [];

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

fileDropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('dragover');

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
        const item = items[0].webkitGetAsEntry();

        if (item) {
            if (item.isFile) {
                uploadMode = 'file';
                updateUploadUI();
                handleFiles(e.dataTransfer.files);
            } else if (item.isDirectory) {
                uploadMode = 'folder';
                updateUploadUI();

                try {
                    const files = await readFolderContents(item);

                    const dataTransfer = new DataTransfer();
                    files.forEach(file => dataTransfer.items.add(file));

                    handleFiles(dataTransfer.files);
                } catch (error) {
                    console.error('Error reading folder contents:', error);
                    alert('Error reading folder contents');
                }
            }
        }
    } else {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

eyeOffIcon.classList.add('hidden');

toggleVisibilityButton.addEventListener('click', () => {
    const isPassword = secretKeyInput.type === 'password';
    secretKeyInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', isPassword);
    eyeOffIcon.classList.toggle('hidden', !isPassword);
});

downloadAllButton.addEventListener('click', async () => {
    const formData = new FormData();
    formData.append("sessionID", sessionID);
    formData.append("mode", uploadMode);

    try {
        const response = await fetch('/download-folder', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMsg = `Download failed with status: ${response.status}`;
            try {
                const err = await response.json();
                errorMsg = err.message || errorMsg;
            } catch (e) {
            }
            throw new Error(errorMsg);
        }

        const disposition = response.headers.get('content-disposition');
        let downloadFilename;
        if (uploadMode === 'folder' && folderName) {
            downloadFilename = `${folderName}.zip`;
        } else {
            downloadFilename = `${sessionID}.zip`;
        }

        if (disposition && disposition.includes('attachment')) {
            const filenameMatch = disposition.match(/filename="(.+?)"/);
            if (filenameMatch && filenameMatch.length > 1) {
                filename = filenameMatch[1];
            }
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

    } catch (error) {
        console.error('Full error details:', error);
        alert(`Error downloading folder: ${error.message}`);
    }

});

function handleFiles(files) {
    if (files.length === 0) return;
    selectedFiles = files;

    uploadPrompt.classList.add('hidden');
    fileDisplay.classList.remove('hidden');
    fileDisplay.classList.add('flex');

    while (fileList.firstChild) {
        fileList.removeChild(fileList.firstChild);
    }

    if (uploadMode === 'file') {
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
    uploadFiles(files);
}

async function updateUploadUI() {
    if (uploadMode === 'file') {

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
    resetFileInput();
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

    resetFileInput();
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
}

actionButton.addEventListener('click', () => {
    const key = secretKeyInput.value;
    if (!selectedFiles) {
        console.error("No files selected");
        return;
    }
    if (!key) {
        console.error("Secret key is empty");
        return;
    }

    performCryptoOperation(isEncryptMode)
});

document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('remove-button')) {
        const fileName = e.target.getAttribute('data-filename');
        const filePath = e.target.getAttribute('data-filepath');
        const fileItem = e.target.closest('div');

        e.stopPropagation();

        if (uploadMode === 'folder') {
            resetFileInput();
            return;
        }

        removeFileFromBackend(filePath, fileName).then(() => {
            fileItem.remove();

            if (selectedFiles) {
                const remainingFiles = Array.from(selectedFiles).filter(file => {
                    if (uploadMode === 'folder') {
                        return folderName !== fileName;
                    } else {
                        return file.name !== fileName && (file.webkitRelativePath || file.name) !== filePath;
                    }
                });

                if (remainingFiles.length > 0) {
                    const dt = new DataTransfer();
                    remainingFiles.forEach(file => dt.items.add(file));
                    selectedFiles = dt.files;

                    fileNameDisplay.textContent = `${remainingFiles.length} file${remainingFiles.length > 1 ? 's' : ''} selected`;
                } else {
                    selectedFiles = null;
                    resetFileInput();
                }
            }
        }).catch(() => {
            alert('File removal from backend failed, keeping in UI');
        });
    }

    const downloadButton = e.target.closest('.download-button');
    if (downloadButton) {
        const filePath = downloadButton.getAttribute('data-filepath');

        e.stopPropagation();

        downloadFileFromBackend(filePath).catch(() => {
            alert('File could not be downloaded, please try again');
        });
    }

});

updateMainUI();

fileModeBtn.classList.add('mode-btn-active');
folderModeBtn.classList.add('mode-btn-inactive');

updateUploadUI();

window.addEventListener('beforeunload', async function (e) {
    const formData = new FormData();
    formData.append("sessionID", sessionID);

    await fetch('/remove-session', {
        method: 'POST',
        body: formData
    });

    e.preventDefault();
});
