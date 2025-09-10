import * as api from "./api.js";
import * as state from "./state.js";
import * as ui from "./ui.js";
import * as main from "./main.js";
import * as fileHandler from "./fileHandler.js";
import {selectedFiles} from "./state.js";

const fileInput = document.getElementById('file-input');
const uploadPrompt = document.getElementById('upload-prompt');
const fileDisplay = document.getElementById('file-display');
const addFilesBtn = document.getElementById('add-files-btn');

export function mergeFileLists(listA, listB) {
    const dt = new DataTransfer();
    if (listA) {
        Array.from(listA).forEach(file => dt.items.add(file));
    }
    if (listB) {
        Array.from(listB).forEach(file => dt.items.add(file));
    }
    return dt.files;
}

export async function readFolderContents(entry, basePath = '') {
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
        return new Promise((resolve, reject) => {
            reader.readEntries(async (entries) => {
                try {
                    const allFiles = [];
                    const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

                    for (const childEntry of entries) {
                        const childFiles = await readFolderContents(childEntry, currentPath);
                        allFiles.push(...childFiles);
                    }
                    resolve(allFiles);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
    return [];
}

export async function startDownload(response, downloadFilename) {
    if (!response.ok) {
        throw new Error(response.statusText);
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

export async function handleFiles(files, mode) {
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append("sessionID", main.sessionID);

    if (mode !== 'add') {
        await api.removeSession(formData);
    }

    await updateAndLoadFiles();
    state.setSelectedFiles((mode === 'add') ? fileHandler.mergeFileLists(state.selectedFiles, files) : files);

    if (!state.isFileMode) {
        const folder = files[0].webkitRelativePath.split('/')[0];

        if (state.folderNames) {
            state.setFolderNames([...state.folderNames, folder]);
        } else {
            state.setFolderNames([folder]);
        }
    }

    ui.displaySelectedFiles(state.selectedFiles);

    state.setOperating("uploading");
    try {
        const uploadFormData = new FormData();
        uploadFormData.append("sessionID", main.sessionID);
        Array.from(state.selectedFiles).forEach(file => {
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
        state.setOperating(false);
    }
}

export async function updateAndLoadFiles() {
    try {
        const formData = new FormData();
        formData.append("sessionID", main.sessionID);
        const data = await api.loadFiles(formData);
        await ui.updateFileList(data.files);
    } catch (error) {
        ui.showNotification(`Error loading file list: ${error.message}`, 'error');
    }
}

export async function resetFileInput() {
    const formData = new FormData();
    formData.append("sessionID", main.sessionID);
    await api.removeSession(formData);

    state.setSelectedFiles(null);
    fileInput.value = '';

    addFilesBtn.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
    fileDisplay.classList.add('hidden');
    fileDisplay.classList.remove('flex');
    await updateAndLoadFiles();
}