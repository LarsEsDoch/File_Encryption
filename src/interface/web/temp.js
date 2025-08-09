async function uploadFiles(files, password, isEncrypt) {
    const formData = new FormData();

    // Add each file to the FormData
    Array.from(files).forEach(file => {
        // Preserve folder structure for directory uploads
        const filePath = file.webkitRelativePath || file.name;
        formData.append('files', file, filePath);
    });

    // Add other required data
    formData.append('password', password);
    formData.append('operation', isEncrypt ? 'encrypt' : 'decrypt');

    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// Modify your action button click handler
actionButton.addEventListener('click', async () => {
    const key = secretKeyInput.value;

    if (!selectedFiles) {
        outputText.value = "Please select a file or folder first.";
        return;
    }
    if (!key) {
        outputText.value = "Please provide a secret key.";
        return;
    }

    try {
        actionButton.disabled = true;
        actionButton.textContent = 'Processing...';

        const result = await uploadFiles(selectedFiles, key, isEncryptMode);
        outputText.value = result.message || 'Files processed successfully';
    } catch (error) {
        outputText.value = `Error: ${error.message}`;
    } finally {
        actionButton.disabled = false;
        actionButton.textContent = isEncryptMode ? 'Encrypt' : 'Decrypt';
    }
});


const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create unique directory for each upload
        const uploadDir = path.join('uploads', Date.now().toString());
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Preserve original file path for folders
        const relativePath = file.originalname;
        const dir = path.dirname(relativePath);

        if (dir !== '.') {
            fs.mkdirSync(path.join(req.uploadDir, dir), { recursive: true });
        }

        cb(null, relativePath);
    }
});

const upload = multer({ storage: storage });

// Handle file upload
app.post('/api/process', upload.array('files'), async (req, res) => {
    try {
        const { password, operation } = req.body;
        const files = req.files;

        // Here you would process the files based on the operation
        // (encrypt/decrypt) and password

        res.json({
            success: true,
            message: `Successfully processed ${files.length} files`,
            // Add any additional response data
        });
    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing files'
        });
    }
});


//2
const dropArea = document.getElementById('drop-area-encryption');
dropArea.addEventListener('dragover', (e) => e.preventDefault());
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    uploadFiles(files);
});

async function uploadFiles(files) {
    for (let file of files) {
        const formData = new FormData();
        formData.append('file', file);

        await fetch('/upload', {
            method: 'POST',
            body: formData
        }).then(response => response.json())
            .then(data => alert(data.message));
    }
}