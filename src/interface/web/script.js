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