import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as crypto from 'crypto';

export const userRole = {
    admin: 0,
    moderator: 1,
    normal: 2,
};

export const textureKind = {
    normal: 0,
    normalVflip: 1,
    cubemap: 2,
};

const dataPath = __dirname;

export interface GLSDatabase {
    addUser: (name: string, role: number, password: string) => Promise<number>;
    updateUserPassword: (id: number, password: string) => Promise<void>;
    checkUserPassword: (id: number, password: string) => Promise<boolean>;

    addShader: (owner: number, code: string) => Promise<number>;
    getShaderCode: (id: number, code: string) => Promise<string>;
    updateShaderCode: (id: number, code: string) => Promise<void>;
    getShaderTextureFiles: (id: number) => Promise<[string, number][]>;

    close: () => void;
}

export function openDB(): GLSDatabase {
    let db = new Database("data.db") as Database & GLSDatabase;

    db.addUser = function (name: string, role: number, password: string) {
        const salt = crypto.randomBytes(64).toString("base64");
        const hash = crypto.createHash("sha256").update(password + salt).digest("base64");

        const date = new Date().toISOString();

        try {
            const last = this.prepare(`
INSERT INTO users (username, role, registrationDate, passwordHash, passwordSalt)
VALUES (?, ?, ?, ?, ?)
`).run(name, role, date, hash, salt).lastInsertROWID;

            return Promise.resolve(Number(last));
        } catch (e) {
            return Promise.reject(e);
        }
    };

    db.updateUserPassword = function (id: number, password: string) {
        const salt = crypto.randomBytes(64).toString("base64");
        const hash = crypto.createHash("sha256").update(password + salt).digest("base64");

        try {
            this.prepare(`
UPDATE users
SET passwordHash = ?, passwordSalt = ?
WHERE id = ?
`).run(hash, salt, id);
        } catch (e) {
            return Promise.reject(e);
        }

        return Promise.resolve(undefined);
    };

    db.checkUserPassword = function (id: number, password: string) {
        try {
            const { passwordSalt, passwordHash } = this.prepare(`
SELECT passwordSalt, passwordHash
FROM users
WHERE id = ?
`).get(id);

            return Promise.resolve(passwordHash === crypto.createHash("sha256").update(password + passwordSalt).digest("base64"));
        } catch (e) {
            return Promise.reject(e);
        }
    };

    db.addShader = function (owner: number, code: string) {
        try {
            const date = new Date().toISOString();

            const id = this.prepare(`
INSERT INTO shaders (owner, creationDate)
VALUES (?, ?)
`).run(owner, date).lastInsertROWID;

            return new Promise((resolve, reject) => {
                fs.writeFile(dataPath + `/shaders/${id}.glsl`, code, e => {
                    if (e) {
                        reject(e);
                    } else {
                        resolve(Number(id));
                    }
                })
            });
        } catch (e) {
            return Promise.reject(e);
        }
    };

    db.getShaderCode = function (id: number) {
        return new Promise((resolve, reject) => {
            fs.readFile(dataPath + `/shaders/${id}.glsl`, (e, data) => {
                if (e) {
                    reject(e);
                } else {
                    resolve(data.toString());
                }
            })
        });
    };

    db.updateShaderCode = function (id: number, code: string) {
        return new Promise((resolve, reject) => {
            fs.writeFile(dataPath + `/shaders/${id}.glsl`, code, e => {
                if (e) {
                    reject(e);
                } else {
                    resolve(undefined);
                }
            })
        });
    };

    db.getShaderTextureFiles = function (id: number) {
        try {
            const data = this.prepare(`
SELECT id, textureKind
FROM shader_textures
WHERE shaderId = ?
`).all(id) as { id: number, textureKind: number }[];

            return Promise.resolve(data.map(row => [dataPath + `/shaders/${row.id}.glsl`, row.textureKind] as [string, number]));
        } catch (e) {
            return Promise.reject(e);
        }
    };

    return db;
}
