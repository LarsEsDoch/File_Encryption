import * as api from "./api.js";
import * as state from "./state.js";
import * as ui from "./ui.js";
import {getUniqueFileName, normalizeNewFiles} from "./utils.js";

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

    await updateAndLoadFiles();

    const filesToAdd =
        mode === 'add'
            ? normalizeNewFiles(files, state.selectedFiles)
            : files;

    state.setSelectedFiles(
        mode === 'add'
            ? [...state.selectedFiles, ...filesToAdd]
            : filesToAdd
    );

    if (!state.isFileMode) {
        const folder = files[0].webkitRelativePath.split('/')[0];

        if (state.folderNames.includes(folder)) {
            ui.showNotification(`There is already a folder named ${folder} uploaded. Therefore they will be combined!`);
        } else {
            if (state.folderNames) {
                state.setFolderNames([...state.folderNames, folder]);
            } else {
                state.setFolderNames([folder]);
            }
        }
    }

    ui.displaySelectedFiles(state.selectedFiles);

    state.setOperating("uploading");
    try {
        const uploadFormData = new FormData();
        const usedNames = new Set();

        Array.from(state.selectedFiles).forEach(file => {
            const originalPath = file.webkitRelativePath || file.name;

            const parts = originalPath.split("/");
            const fileName = parts.pop();
            const folderPath = parts.length ? parts.join("/") + "/" : "";

            const uniqueName = getUniqueFileName(fileName, usedNames);
            const finalPath = folderPath + uniqueName;
            console.log(file, finalPath);
            uploadFormData.append('files', file, finalPath);
        });

        const progressBar = document.getElementById("progress-bar");
        const progressInfo = document.getElementById("progress-info");

        ui.showProgressContainer()
        progressBar.style.width = "0%";
        progressInfo.textContent = "Starting upload...";

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
        const data = await api.loadFiles();
        await ui.updateFileList(data.files);
    } catch (error) {
        ui.showNotification(`Error loading file list: ${error.message}`, 'error');
    }
}

export async function resetFileInput() {
    await api.removeSession();

    state.setSelectedFiles(null);
    state.setFolderNames([])
    fileInput.value = '';

    addFilesBtn.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
    fileDisplay.classList.add('hidden');
    fileDisplay.classList.remove('flex');
    await updateAndLoadFiles();
}