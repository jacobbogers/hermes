import * as fs from 'fs';

export function loadFiles<T>(files: T): Promise<T> {
    const fileNameAliases = Object.keys(files) as (keyof T)[];
    let toDo = fileNameAliases.length;
    let errCount = 0;

    if (toDo === 0) {
        return Promise.resolve({} as T);
    }

    const results: T = {} as T;

    return new Promise<T>((resolve) => {
        fileNameAliases.forEach((fileNameAlias: keyof T) => {
            const fileName = files[fileNameAlias];
            fs.readFile(
                String(fileName),
                { flag: 'r', encoding: 'utf8' },
                (err: NodeJS.ErrnoException, data) => {
                    toDo--;
                    if (err) {
                        results[fileNameAlias] = err as any;
                        errCount++;
                    } else {
                        results[fileNameAlias] = data as any;
                    }
                    if (toDo === 0) {
                        return resolve(results);
                    }
                }
            );
        });
    });
}
