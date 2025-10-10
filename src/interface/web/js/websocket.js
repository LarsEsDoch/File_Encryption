import * as ui from "./ui.js";

export function socket_io() {
    const socket = io({transports: ['websocket']});

    const progressBar = document.getElementById("progress-bar");
    const progressInfo = document.getElementById("progress-info");
    const progressInfoFiles = document.getElementById("progress-info-files");

    socket.on('connect', () => {

        function readCookie(name) {
            const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
            return v ? v.pop() : '';
        }

        const sessionID = readCookie('sessionID');
        socket.emit('join', {sessionID});
    });

    socket.on('operation_started', (d) => {
        ui.showProgressContainer()
        progressBar.style.width = "0%";
        progressInfo.textContent = "Starting...";
    });

    socket.on('encrypt_progress', (p) => {
        progressBar.style.width = `${p.percent}%`;
        progressInfo.textContent = `${p.percent}% ${p.current}/${p.total}`;
        progressInfoFiles.textContent = `${p.info}`
    });

    socket.on('decrypt_progress', (p) => {
        progressBar.style.width = `${p.percent}%`;
        progressInfo.textContent = `${p.percent}% ${p.current}/${p.total}`;
        progressInfoFiles.textContent = `${p.info}`
    });

    socket.on('upload_progress', (p) => {
        progressBar.style.width = `${p.percent}%`;
        progressInfo.textContent = `${p.percent}% ${p.current}/${p.total}`;
        progressInfoFiles.textContent = `${p.info}`
    });

    socket.on('download_progress', (p) => {
        progressBar.style.width = `${p.percent}%`;
        progressInfo.textContent = `${p.percent}% ${p.current}/${p.total}`;
        progressInfoFiles.textContent = `${p.info}`
    });

    socket.on('operation_finished', (d) => {
        if (d.operation === "download") {
            ui.showNotification("Download starting soon!", "info")
        }
        progressBar.classList.add('blink-green');
        progressBar.style.width = "100%";
        progressInfoFiles.textContent = "Finished!";
        progressInfo.textContent = `100% ${d.processed}/${d.total}`

        setTimeout(() => {
            ui.hideProgressContainer()
            progressInfo.textContent = ""
            progressInfoFiles.textContent = ""
            progressBar.style.width = "0%";
        }, 4000);
        setTimeout(() => {
            progressBar.classList.remove('blink-green');
        }, 5000)
    });

    socket.on('operation_error', (d) => {
        console.error('operation error', d);
        progressInfo.textContent = "Error: " + d.error;
        progressBar.style.width = "0%";
    });

    socket.on('disconnect', () => {
        console.log('socket disconnected');
    });
}