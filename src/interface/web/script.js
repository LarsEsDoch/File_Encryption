const encryptTab = document.getElementById('encrypt-tab');
const decryptTab = document.getElementById('decrypt-tab');
const actionButton = document.getElementById('action-button');
const secretKeyInput = document.getElementById('password');
const outputText = document.getElementById('output-text');
const toggleVisibilityButton = document.getElementById('toggle-key-visibility');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');
const copyButton = document.getElementById('copy-button');
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
        console.error('Upload error:', error);
        alert(`Error: ${error.message}`);
        throw error;
    }
}

fileDropZone.addEventListener('drop', (e) => {
    
    const items = e.dataTransfer.items;
    if (items) {
        const item = items[0].webkitGetAsEntry();

        if (item) {
            if (item.isFile) {
                uploadMode = 'file';
            } else if (item.isDirectory) {
                uploadMode = 'folder';
            }
            updateUploadUI();
        }
    }
    e.preventDefault();
    fileDropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('remove-button')) {
        const fileName = e.target.getAttribute('data-filename');
        const fileItem = e.target.closest('div');

        e.stopPropagation();
        fileItem.remove();

        if (selectedFiles) {
            const remainingFiles = Array.from(selectedFiles).filter(file => file.name !== fileName);
            selectedFiles = remainingFiles.length > 0 ?
                new DataTransfer().files : null;

            if (selectedFiles) {
                remainingFiles.forEach(file => {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    selectedFiles = dt.files;
                });
            }

            if (!selectedFiles) {
                resetFileInput();
            } else {
                fileNameDisplay.textContent = `${remainingFiles.length} file${remainingFiles.length > 1 ? 's' : ''} selected`;
            }
        }
    }
});
eyeOffIcon.classList.add('hidden');
toggleVisibilityButton.addEventListener('click', () => {
    const isPassword = secretKeyInput.type === 'password';
    secretKeyInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', isPassword);
    eyeOffIcon.classList.toggle('hidden', !isPassword);
});

copyButton.addEventListener('click', () => {
    if (outputText.value) {
        navigator.clipboard.writeText(outputText.value).then(showCopyFeedback);
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

    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center space-x-2 text-sm text-gray-300 py-1';
        fileItem.innerHTML = `
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="file-name">${file.name}</span>
                <button class="remove-button" data-filename="${file.name}">x</button>`;
        fileList.appendChild(fileItem);
    });

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
    //enrcyption/decryption start
});

updateMainUI();

fileModeBtn.classList.add('mode-btn-active');
folderModeBtn.classList.add('mode-btn-inactive');
updateUploadUI();