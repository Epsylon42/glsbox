import Sequelize from 'sequelize';
import fs from 'fs';
import crypto from 'crypto';

export const userRole = {
    admin: 0,
    moderator: 1,
    user: 2,
};

export const textureKind = {
    normal: 0,
    normalVFlip: 1,
    cubemap: 2,
};

export const db = new Sequelize("postgres://tempuser:temppass@localhost:5432/glsbox", {
    define: {
        timestamps: false,
    }
});

export const Users = db.define("users", {
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
        defaultValue: userRole.user,
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

export const Shaders = db.define("shaders", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
    }
});

export const ShaderTextures = db.define("shader_textures", {
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
    textureKind: {
        type: Sequelize.SMALLINT,
        allowNull: false,
    }
});

export module Utils {
    export async function checkUserPassword(id: number, password: string) {
        try {
            const user = await Users.findByPrimary(
                id,
                { attributes: ["passwordHash", "passwordSalt"] }
            ) as {
                passwordHash: string,
                passwordSalt: string,
            };

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
            ) as any;

            if (shader.dataValues.published) {
                throw new Error("shader is already published");
            }

            shader.dataValues.published = true;
            shader.dataValues.publishedDate = new Date();

            return (shader.update() as Promise<any>).then(() => undefined)
        } catch (e) {
            throw e;
        }
    }
}
