import Sequelize from 'sequelize';
import fs from 'fs-extra';
import path from 'path';

import crypto from 'crypto';
import { TextureKind } from '../common/texture-kind';
import { UserRole } from '../common/user-role';

export const db = new Sequelize(process.env.DATABASE_URL || "postgres://tempuser:temppass@localhost:5432/glsbox", {
    define: {
        timestamps: false,
    },
    operatorsAliases: false,
});


export interface UsersAttributes {
    id?: number,
    username: string,
    role?: UserRole,
    registrationDate?: Date,
    passwordHash?: string,
    passwordSalt?: string,
    password?: string,

    email?: string,
    publicEmail?: boolean,
    telegram?: string,
    publicTelegram?: boolean,
}

export interface UsersInstance extends Sequelize.Instance<UsersAttributes>, UsersAttributes {
    id: number,
    role: UserRole,
    registrationDate: Date,
    passwordHash: string,
    passwordSalt: string,

    publicEmail: boolean,
    publicTelegram: boolean,
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
        defaultValue: UserRole.User,
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
    publicEmail: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    telegram: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
    publicTelegram: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },

    password: {
        type: Sequelize.VIRTUAL,
        set: function(val: string) {
            const salt = crypto.randomBytes(16).toString("base64");
            const hash = crypto.createHash("sha256").update(val + salt).digest("base64");

            (this as any).setDataValue("passwordHash", hash);
            (this as any).setDataValue("passwordSalt", salt);
        }
    },
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
    previewKey?: string,
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
        defaultValue: 1,
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
    previewKey: {
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
    key: string,
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
    key: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
});


export interface CommentsAttributes {
    id?: number,
    author: number,
    text: string,
    parentShader: number,
    parentComment?: number,
    posted?: Date,
    lastEdited?: Date,
}

export interface CommentsInstance extends Sequelize.Instance<CommentsAttributes>, CommentsAttributes {
    id: number,
    posted: Date,
}

export interface CommentExt {
    author: { id: number, username: string };
    children: CommentExt[];
}

export type CommentTree = { root: true, children: (CommentExt & CommentsInstance)[] } | (CommentExt & CommentsInstance);

export const Comments = db.define<CommentsInstance, CommentsAttributes>("comments", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    author: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    text: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    parentShader: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    parentComment: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
    posted: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
    },
    lastEdited: {
        type: Sequelize.DATE,
        allowNull: true,
    },
});


export interface BotUsersAttributes {
    telegramUserId: number,
    telegramUsername: string,
    chat: number,
};

export interface BotUsersInstance extends Sequelize.Instance<BotUsersAttributes>, BotUsersAttributes {}

export const BotUsers = db.define<BotUsersInstance, BotUsersAttributes>("bot_users", {
    telegramUserId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    telegramUsername: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    chat: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
});


export interface LikesAttributes {
    user: number,
    shader: number,
}

export interface LikesInstance extends LikesAttributes, Sequelize.Instance<LikesAttributes> {}

export const Likes = db.define<LikesInstance, LikesAttributes>("likes", {
    user: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    shader: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
    }
});

export module Utils {
    async function getComments(shader: number, parent?: number, depth: number = 10): Promise<(CommentExt & CommentsInstance)[]> {
        if (depth === 0) {
            return Promise.resolve([]);
        }

        const comments =
            parent != null ?
            await Comments.findAll({ where: { parentShader: shader, parentComment: parent } }) :
            await Comments.findAll({ where: { parentShader: shader, parentComment: null } });

        return Promise.all(comments.map(async comment => {
            const [children, author] = await Promise.all([
                getComments(shader, comment.id, depth - 1),
                Users.findByPrimary(comment.author)
            ]);

            return {
                ...(comment as any).dataValues,
                children,
                author: author && {
                    id: author.id,
                    username: author.username,
                },
            };
        }));
    }

    export async function getComment(shader: number, commentId?: number, depth: number = 10): Promise<CommentTree> {
        if (commentId == null) {
            return {
                root: true,
                children: await getComments(shader, commentId, depth),
            };
        } else {
            const comment = await Comments.findByPrimary(commentId);
            if (!comment) {
                throw new Error("Comment not found");
            }

            const author = await Users.findByPrimary(comment.author);

            return {
                ...(comment as any).dataValues,
                children: await getComments(shader, commentId, depth-1),
                author: author && {
                    id: author.id,
                    username: author.username,
                }
            };
        }
    }

    export async function checkUserPassword(id: number, password: string) {
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
    }

    export async function publishShader(id: number): Promise<void> {
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
    }
}
