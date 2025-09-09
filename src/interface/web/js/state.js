export let isEncryptMode = true;
export let isOperating = false;
export let isFileMode = true;
export let selectedFiles = null;
export let folderName = "";

export function setEncryptMode(value) {
    isEncryptMode = value;
}
export function setOperating(value) {
    isOperating = value;
}
export function setFileMode(value) {
    isFileMode = value;
}
export function setSelectedFiles(files) {
    selectedFiles = files;
}
export function setFolderName(name) {
    folderName = name;
}
