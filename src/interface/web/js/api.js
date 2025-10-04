const DEFAULT_FETCH_OPTIONS = {
    method: 'POST',
    credentials: 'same-origin',
};

export async function uploadFiles(formData) {
    const response = await fetch('/upload', {
        ...DEFAULT_FETCH_OPTIONS,
        body: formData
    });
    return await response.json();
}

export async function loadFiles() {
    const response = await fetch('/files', {
        ...DEFAULT_FETCH_OPTIONS
    });
    return await response.json();
}

export async function removeFolder(formData) {
    const response = await fetch('/remove-folder', {
        ...DEFAULT_FETCH_OPTIONS,
        body: formData
    });
    return await response.json();
}

export async function removeFile(formData) {
    const response = await fetch('/remove-file', {
        ...DEFAULT_FETCH_OPTIONS,
        body: formData
    });
    return await response.json();
}

export async function downloadFile(formData) {
    return await fetch('/download-file', {
        ...DEFAULT_FETCH_OPTIONS,
        body: formData
    });
}

export async function downloadFolder(formData) {
    return await fetch('/download-folder', {
        ...DEFAULT_FETCH_OPTIONS,
        body: formData
    });
}

export async function downloadAll() {
    return await fetch('/download-all', {
        ...DEFAULT_FETCH_OPTIONS
    });
}

export async function performCryptoOperation(endpoint, formData) {
    const response = await fetch(endpoint, {
        ...DEFAULT_FETCH_OPTIONS,
        body: formData
    });
    return await response.json();
}

export async function removeSession() {
    return await fetch('/remove-session', {
        ...DEFAULT_FETCH_OPTIONS,
        keepalive: true
    });
}
