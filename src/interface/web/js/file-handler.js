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