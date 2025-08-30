const encryptTab = document.getElementById('encrypt-tab');
const decryptTab = document.getElementById('decrypt-tab');
const actionButton = document.getElementById('action-button');
const secretKeyInput = document.getElementById('password');
const outputText = document.getElementById('output-text');
const toggleVisibilityButton = document.getElementById('toggle-key-visibility');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');
const downloadAllButton = document.getElementById('download-all-btn');
const copyFeedback = document.getElementById('copy-feedback');

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

async function encryption() {
    let formData = new FormData();
    formData.append('password', secretKeyInput.value);

    try {
        const response = await fetch('/encrypt-files', {
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

async function decryption() {
    let formData = new FormData();
    formData.append('password', secretKeyInput.value);

    try {
        const response = await fetch('/decrypt-files', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        alert(result.message); //TODO later html alert
        await loadFiles()
        return result;
    } catch (error) {
        alert(`Error: ${error.message}`);
        throw error;
    }
}

async function uploadFiles(files) {
    const formData = new FormData();

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
    const response = await fetch("/files");
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
            <a href="/files/${file}" class="text-gray-400 hover:text-blue-400 transition" title="Download">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                          d="M3 14a1 1 0 011-1h3v-4h4v4h3a1 1 0 011 1v2a1
                             1 0 01-1 1H4a1 1 0 01-1-1v-2zM7 10l3 3 3-3H11V4H9v6H7z"
                          clip-rule="evenodd"/>
                </svg>
            </a>
        `;
        list.appendChild(li);
    });
}

async function removeFileFromBackend(filePath, fileName) {
    const formData = new FormData();
    formData.append("filePath", filePath || ".");
    formData.append("fileName", fileName);

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

downloadAllButton.addEventListener('click', () => {
    //download all files
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

function updateUploadUI() {
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

function resetFileInput() {
    selectedFiles = null;
    fileInput.value = '';
    uploadPrompt.classList.remove('hidden');
    fileDisplay.classList.add('hidden');
    fileDisplay.classList.remove('flex');
}

function showCopyFeedback() {
    copyFeedback.classList.remove('opacity-0');
    setTimeout(() => copyFeedback.classList.add('opacity-0'), 2000);
}

actionButton.addEventListener('click', () => {
    const key = secretKeyInput.value;
    if (!selectedFiles) {
        outputText.value = "Please select a file or folder first.";
        return;
    }
    if (!key) {
        outputText.value = "Please provide a secret key.";
        return;
    }

    const operation = isEncryptMode ? "Encryption" : "Decryption";
    const target = selectedFiles.length > 1 || (selectedFiles[0] && selectedFiles[0].webkitRelativePath)
        ? `${selectedFiles.length} files/folder`
        : `"${selectedFiles[0].name}"`;
    outputText.value = `${operation} process started for ${target}... (This is a placeholder)`;

    if (isEncryptMode) {
        encryption();
    } else {
        decryption();
    }
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
});

updateMainUI();

fileModeBtn.classList.add('mode-btn-active');
folderModeBtn.classList.add('mode-btn-inactive');

updateUploadUI();