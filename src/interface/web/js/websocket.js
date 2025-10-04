export function socket_io() {
    const socket = io({transports: ['websocket']});

    const progressContainer = document.getElementById("progress-container");
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
        console.log('operation started', d);
        progressContainer.classList.remove("hidden");
        progressInfo.classList.remove("hidden");
        progressInfoFiles.classList.remove("hidden");
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

    socket.on('operation_finished', (d) => {
        console.log('operation finished', d);
        progressBar.style.width = "100%";
        progressInfoFiles.textContent = "Finished!";
        progressInfo.textContent = `100% ${d.processed}/${d.total}`
        setTimeout(() => {
            progressContainer.classList.add("hidden");
            progressInfo.classList.add("hidden");
            progressInfoFiles.classList.add("hidden");
            progressBar.style.width = "0%";
        }, 2000);
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