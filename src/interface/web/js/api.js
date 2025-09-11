export async function uploadFiles(formData) {
    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    });
    return await response.json();
}

export async function loadFiles(formData) {
    const response = await fetch('/files', {
        method: 'POST',
        body: formData
    });
    return await response.json();
}

export async function removeFolder(formData) {
    const response = await fetch('/remove-folder', {
        method: 'POST',
        body: formData
    });
    return await response.json();
}

export async function removeFile(formData) {
    const response = await fetch('/remove-file', {
        method: 'POST',
        body: formData
    });
    return await response.json();
}

export async function downloadFile(formData) {
    return await fetch('/download-file', {
        method: 'POST',
        body: formData
    });
}

export async function downloadFolder(formData) {
    return await fetch('/download-folder', {
        method: 'POST',
        body: formData
    });
}

export async function downloadAll(formData) {
    return await fetch('/download-all', {
        method: 'POST',
        body: formData
    });
}

export async function performCryptoOperation(endpoint, formData) {
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
    });
    return await response.json();
}

export async function removeSession(formData) {
    return await fetch('/remove-session', {
        method: 'POST',
        body: formData,
        keepalive: true
    });
}