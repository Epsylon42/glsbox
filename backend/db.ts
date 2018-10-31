import Sequelize from 'sequelize';
import fs from 'fs-extra';
import path from 'path';

import crypto from 'crypto';
import { TextureKind } from '../common/texture-kind';

export enum UserRole {
    admin = 0,
    moderator,
    user,
}

export const db = new Sequelize("postgres://tempuser:temppass@localhost:5432/glsbox", {
    define: {
        timestamps: false,
    },
    operatorsAliases: false,
});


export interface UsersAttributes {
    id?: number,
    username: string,
    role: UserRole,
    registrationDate?: Date,
    passwordHash?: string,
    passwordSalt?: string,
    password?: string,
    email?: string,
}

export interface UsersInstance extends Sequelize.Instance<UsersAttributes>, UsersAttributes {
    id: number,
    registrationDate: Date,
    passwordHash: string,
    passwordSalt: string,
}

export const Users = db.define<UsersInstance, UsersAttributes>("users", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        allowNull: false,
    },
    username: {
        type: Sequelize.TEXT,
        unique: true,
        allowNull: false,
    },
    role: {
        type: Sequelize.SMALLINT,
        defaultValue: UserRole.user,
        allowNull: false,
    },
    registrationDate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
    },
    passwordHash: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    passwordSalt: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    email: {
        type: Sequelize.TEXT,
        allowNull: true,
        validate: {
            isEmail: true,
        }
    },

    password: {
        type: Sequelize.VIRTUAL,
        set: function(val: string) {
            const salt = crypto.randomBytes(16).toString("base64");
            const hash = crypto.createHash("sha256").update(val + salt).digest("base64");

            (this as any).setDataValue("passwordHash", hash);
            (this as any).setDataValue("passwordSalt", salt);
        }
    }
});


export interface ShadersAttributes {
    id?: number,
    name: string,
    description?: string,
    owner: number,
    published?: boolean,
    creationDate?: Date,
    publishingDate?: Date,
    likeCount?: number,
    code: string,
    previewUrl?: string,
}

export interface ShadersInstance extends Sequelize.Instance<ShadersAttributes>, ShadersAttributes {
    id: number,
    description: string,
    published: boolean,
    creationDate: Date,
    likeCount: number,
}

export const Shaders = db.define<ShadersInstance, ShadersAttributes>("shaders", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    description: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    owner: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    published: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    creationDate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
    },
    publishingDate: {
        type: Sequelize.DATE,
        allowNull: true,
    },
    likeCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    code: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    previewUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
});


export interface ShaderTexturesAttributes {
    id?: number,
    shaderId: number,
    name: string,
    textureKind: TextureKind,
    url: string,
}

export interface ShaderTexturesInstance extends Sequelize.Instance<ShaderTexturesAttributes>, ShaderTexturesAttributes {
    id: number,
}

export const ShaderTextures = db.define<ShaderTexturesInstance, ShaderTexturesAttributes>("shader_textures", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    shaderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    name: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    textureKind: {
        type: Sequelize.SMALLINT,
        allowNull: false,
    },
    url: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
});

export module Utils {
    export async function checkUserPassword(id: number, password: string) {
        try {
            const user = await Users.findByPrimary(
                id,
                { attributes: ["passwordHash", "passwordSalt"] }
            );

            if (!user) {
                throw new Error(`User ${id} does not exist`);
            }

            const salt = user.passwordSalt;
            const hash = crypto.createHash("sha256").update(password + salt).digest("base64");

            return user.passwordHash === hash;
        } catch (e) {
            throw e;
        }
    }

    export async function publishShader(id: number): Promise<void> {
        try {
            const shader = await Shaders.findByPrimary(
                id,
                { attributes: ["published", "publishedDate"] }
            );

            if (!shader) {
                throw new Error(`Shader ${id} does not exist`);
            }

            if (shader.published) {
                throw new Error("shader is already published");
            }

            await shader.update({
                published: true,
                publishingDate: new Date(),
            });
        } catch (e) {
            throw e;
        }
    }
}

export module FileStorage {
    const storagePath = path.join(path.dirname(path.dirname(__dirname)), "data");

    export async function writeTexture(id: number, filename: string, texture: Buffer): Promise<string> {
        try {
            const texDir = path.join(storagePath, "textures", id.toString());
            await fs.mkdir(texDir);
            await fs.writeFile(path.join(texDir, filename), texture);
            return `/api/textures/${id}`;
        } catch (e) {
            throw e;
        }
    }

    export async function removeTexture(id: number) {
        try {
            const texDir = path.join(storagePath, "textures", id.toString());
            if (await fs.pathExists(texDir)) {
                await fs.remove(texDir);
            }
        } catch (e) {
            throw e;
        }
    }

    export async function getTexturePath(id: number): Promise<string> {
        try {
            const texDir = path.join(storagePath, "textures", id.toString());
            if (!await fs.pathExists(texDir)) {
                throw new Error("Texture does not exist")
            }

            const files = await fs.readdir(texDir);
            if (files.length === 0) {
                throw new Error("Texture does not exist");
            }

            return path.join(texDir, files[0]);
        } catch (e) {
            throw e;
        }
    }

    export function writePreview(id: number, preview: Buffer): Promise<string> {
        const previewDir = path.join(storagePath, "previews");
        return fs
            .writeFile(path.join(previewDir, `${id}.png`), preview)
            .then(() => `/api/preview/${id}`);
    }

    export async function removePreview(id: number) {
        try {
            const preview = path.join(storagePath, "previews", `${id}.png`);
            if (await fs.pathExists(preview)) {
                await fs.remove(preview);
            }
        } catch (e) {
            throw e;
        }
    }

    export async function getPreviewPath(id: number): Promise<string> {
        try {
            const preview = path.join(storagePath, "previews", `${id}.png`);
            if (!await fs.pathExists(preview)) {
                throw new Error("Preview does not exist");
            }

            return preview;
        } catch (e) {
            throw e;
        }
    }
}
