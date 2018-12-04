import Express from 'express';
import Passport from 'passport';
import Sequelize from 'sequelize';

import { db, Users, Shaders, ShaderTextures, Likes, ShaderTexturesInstance, Comments, CommentsInstance, Utils, UsersInstance } from './db';
import { Transaction as FileTransaction } from './file-storage';
import { TextureKind } from '../common/texture-kind';
import { UserRole } from '../common/user-role';
import { Notify } from './bot';

async function editingAllowed(thisUser: number | UsersInstance, owner: number | UsersInstance): Promise<boolean> {
    const thisId = typeof thisUser === "number" ? thisUser : thisUser.id;
    const ownerId = typeof owner === "number" ? owner : owner.id

    if (thisId === ownerId) {
        return true;
    }

    const [t, o] = await Promise.all([
        typeof thisUser === "number" ? Users.findByPrimary(thisUser) : thisUser,
        typeof owner === "number" ? Users.findByPrimary(owner) : owner
    ]);

    return (t && o && t.role < o.role) || false;
}

function userToResponse(user: UsersInstance, thisUser?: UsersInstance): object {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        publicEmail: user.publicEmail,
        publicTelegram: user.publicTelegram,
        email: user.publicEmail || (thisUser && thisUser.id === user.id) ? user.email : null,
        telegram: user.publicTelegram || (thisUser && thisUser.id === user.id) ? user.telegram : null,
        registrationDate: user.registrationDate.toISOString(),
    };
}

const priv = Express.Router();

function authMiddleware(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
    if (req.user) {
        return next();
    } else {
        Passport.authenticate('basic', { session: false }, (err, user) => {
            if (err) {
                res.status(err.status != null ? err.status : 500).json({ error: true, message: err.message });
            } else if (user) {
                req.login(user, err => {
                    if (err) {
                        res.status(err.status != null ? err.status : 500).json({ error: true, message: err.message });
                    } else {
                        next();
                    }
                });
            } else {
                res.status(401).json({ error: true, message: "Not logged in" });
                return;
            }
        })(req, res, next);
    }
}

priv.use(authMiddleware);

/*
  req.body: {
      name,
      description,
      code,
      textureOptions?: {
          name,
          kind,
          file,
      }
  }

  req.files: {
      preview?,
      textures?...
  }
 */
priv.post("/shaders", (req, res) => {
    if (!req.body.name) {
        res.status(400).json({ error: true, message: "Shader must have a name" });
        return;
    }

    let textureOptions: {
        name: string,
        file: number,
        kind: TextureKind,
    }[] | null = null;
    if (req.body.textureOptions) {
        try {
            textureOptions = JSON.parse(req.body.textureOptions);
        } catch (e) {
            res.status(400).json({ error: true, message: "textureOptions must be valid json" });
            return;
        }
    }

    const files = (req as any).files;

    db.transaction(async transaction => {
        const ftrans = new FileTransaction();

        try {
            const shader = await Shaders.create({
                owner: req.user.id,
                name: req.body.name,
                description: req.body.description || "",
                code: req.body.code || "",
            }, { transaction });

            await Likes.create({ user: req.user.id, shader: shader.id });

            if (files.preview) {
                const fdata = await ftrans.writeFile(files.preview[0].data, "glsbox-previews");

                await shader.update({
                    previewUrl: fdata.url,
                    previewKey: fdata.id,
                }, { transaction });
            }

            let textures: ShaderTexturesInstance[] = [];
            if (files.textures && textureOptions) {
                textures = await Promise.all(
                    textureOptions.map(async opt => {
                        const file = files.textures[opt.file];

                        const fdata = await ftrans.writeFile(file.data, "glsbox-textures");

                        //TODO verify data
                        return ShaderTextures.create({
                            shaderId: shader.id,
                            name: opt.name,
                            textureKind: opt.kind,
                            url: fdata.url,
                            key: fdata.id,
                        }, { transaction });
                    })
                );
            }

            await ftrans.commit();

            res.json({
                ...(shader as any).dataValues,
                liked: true,
                textures,
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: true, message: "Internal server error" });
            await ftrans.rollback();
            throw e;
        }
    });
});

/*
  req.body: {
      name?,
      description?,
      code?,
      textureOptions?: {
          id?,
          file?
          name?,
          kind?,
          delete?
          !id => name, kind, file
      },
      deletePreview?,
  }

  req.files: {
      preview?,
      textures?...
  }
 */
priv.patch("/shaders/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        res.status(400).json({ error: true, message: "Invalid id" });
        return;
    }

    let textureOptions: {
        id?: number,
        file?: number,
        name?: string,
        kind?: TextureKind,
        delete: any,
    }[] | null = null;
    if (req.body.textureOptions) {
        try {
            textureOptions = JSON.parse(req.body.textureOptions);
        } catch (e) {
            res.status(400).json({ error: true, message: "textureOptions must be valid json" });
            return;
        }
    }

    const files = (req as any).files;

    db.transaction(async transaction => {
        const ftrans = new FileTransaction();

        try {
            const shader = await Shaders.findByPrimary(id, { transaction });
            if (!shader) {
                res.status(404).json({ error: true, message: "Shader not found" });
                return;
            }
            if (!await editingAllowed(req.user.id, shader.owner)) {
                res.status(403).json({ error: true, message: "You cannot edit this item" });
                return;
            }

            let update: {
                name?: string,
                description?: string,
                code?: string,
                previewUrl?: string | null,
                previewKey?: string | null,
            } = {};

            if (req.body.name) {
                update.name = req.body.name;
            }
            if (req.body.description) {
                update.description = req.body.description;
            }
            if (req.body.code) {
                update.code = req.body.code;
            }
            if ((req.body.deletePreview || files.preview) && shader.previewKey) {
                await ftrans.removeFile(shader.previewKey);
                update.previewUrl = null;
                update.previewKey = null;
            }
            if (files.preview) {
                const fdata = await ftrans.writeFile(files.preview[0].data, "glsbox-previews");
                update.previewUrl = fdata.url;
                update.previewKey = fdata.id;
            }
            await shader.update(update, { transaction });

            if (textureOptions) {
                await Promise.all(
                    textureOptions.map(async opt => {
                        if (opt.id != null) {
                            const tex = await ShaderTextures.findByPrimary(opt.id, { transaction });
                            if (!tex) {
                                return;
                                //TODO: report errors or something
                            }

                            if (opt.delete) {
                                await Promise.all([
                                    ftrans.removeFile(tex.key),
                                    tex.destroy({ transaction })
                                ]);
                            } else {
                                const update: {
                                    name?: string,
                                    kind?: TextureKind,
                                    url?: string,
                                    key?: string,
                                } = {
                                    name: opt.name,
                                    kind: opt.kind,
                                };

                                if (opt.file && files.textures && files.textures[opt.file]) {
                                    //TODO: report errors if there's no files
                                    await ftrans.removeFile(tex.key);
                                    const fdata = await ftrans.writeFile(files.textures[opt.file], "glsbox-textures");
                                    update.url = fdata.url;
                                    update.key = fdata.id;
                                }

                                await tex.update(update, { transaction });
                            }
                        } else if (opt.file != null && opt.name && opt.kind != null) {
                            const file = files.textures[opt.file];

                            const fdata = await ftrans.writeFile(file.data, "glsbox-textures");

                            const tex = await ShaderTextures.create({
                                shaderId: shader.id,
                                name: opt.name,
                                textureKind: opt.kind,
                                url: fdata.url,
                                key: fdata.id,
                            }, { transaction });
                        }
                    })
                );
            }

            await ftrans.commit();

            res.json({
                ...(shader as any).dataValues,
                liked: (await Likes.findOne({ where: { user: req.user.id, shader: shader.id } })) != null,
                textures: await ShaderTextures.findAll({ where: { shaderId: shader.id }, transaction }),
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: true, message: "Internal server error" });
            await ftrans.rollback();
            throw e;
        }
    });
});

priv.patch("/shaders/:id/publish", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        res.status(400).json({ error: true, message: "Invalid id" });
        return;
    }

    if (req.body.published == null || (typeof req.body.published) !== "boolean") {
        res.status(400).json({ error: true, message: "Published state missing or is not boolean" });
        return;
    }

    try {
        const shader = await Shaders.findByPrimary(id);
        if (!shader) {
            res.status(404).json({ error: true, message: "Shader not found" });
            return;
        }

        if (req.user.id !== shader.owner) {
            res.status(403).json({ error: true, message: "You are not the owner of this shader" });
            return;
        }

        const update: any = {};
        update.published = req.body.published;
        if (update.published && !shader.published) {
            update.publishingDate = new Date();
        }

        await shader.update(update);

        res.json({});
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

priv.patch("/shaders/:id/like", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        res.status(400).json({ error: true, message: "Invalid id" });
        return;
    }

    if (req.body.liked == null || (typeof req.body.liked) !== "boolean") {
        res.status(400).json({ error: true, message: "Liked state missing or is not boolean" });
        return;
    }

    try {
        const shader = await Shaders.findByPrimary(id);
        if (!shader) {
            res.status(404).json({ error: true, message: "Shader not found" });
            return;
        }

        const like = await Likes.findOne({ where: { user: req.user.id, shader: shader.id } });
        if (req.body.liked) {
            if (like) {
                res.json({ liked: true, likeCount: shader.likeCount });
            } else {
                let [, { likeCount }] = await Promise.all([
                    Likes.create({ user: req.user.id, shader: shader.id }),
                    shader.increment("likeCount")
                ]);

                res.json({ liked: true, likeCount });
            }
        } else {
            if (!like) {
                res.json({ liked: false, likeCount: shader.likeCount });
            } else {
                let [, { likeCount }] = await Promise.all([
                    like.destroy(),
                    shader.decrement("likeCount")
                ]);

                res.json({ liked: false, likeCount });
            }
        }
    } catch (e) {
        console.error(e);
        res.json({ error: true, message: "Internal server error" });
    }
});


priv.delete("/shaders/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        res.status(400).json({ error: true, message: "Invalid id" });
        return;
    }

    try {
        const shader = await Shaders.findByPrimary(id);
        if (!shader) {
            res.status(404).json({ error: true, message: "Shader not found" });
            return;
        }

        const owner = await Users.findByPrimary(shader.owner);

        if (!(req.user.id === shader.owner || (owner && req.user.role < owner.role))) {
            res.status(403).json({ error: true, message: "You are not allowed to delete this shader" });
            return;
        }

        const ftrans = new FileTransaction();
        await db.transaction(async transaction => {
            try {
                await Likes.destroy({ where: { shader: shader.id }, transaction });

                const textures = await ShaderTextures.findAll({ where: { shaderId: shader.id } });
                const destroyPromises = textures.map(tex => ftrans.removeFile(tex.key));
                if (shader.previewKey) {
                    destroyPromises.push(ftrans.removeFile(shader.previewKey));
                }

                destroyPromises.push(...textures.map(async tex => tex.destroy({ transaction })));
                await Promise.all(destroyPromises);

                await shader.destroy({ transaction });
            } catch (e) {
                await ftrans.rollback();
                throw e;
            }
        });

        await ftrans.commit();

        res.json({});
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

priv.post("/comments", async (req, res) => {
    try {
        if (!req.body) {
            res.status(400).json({ error: true, message: "No request body" });
            return;
        }

        if (!(req.body.parentShader != null && req.body.text)) {
            res.status(400).json({ error: true, message: "Invalid request" });
            return;
        }

        const id = req.body.parentShader;

        if (!await Shaders.findByPrimary(id)) {
            res.status(404).json({ error: true, message: "Parent shader not found" });
            return;
        }

        let parentComment: CommentsInstance | null = null;
        if (req.body.parentComment != null) {
            parentComment = await Comments.findByPrimary(req.body.parentComment);
            if (!parentComment) {
                res.status(404).json({ error: true, message: "Parent comment not found" });
                return;
            }
        }

        const comment = await Comments.create({
            author: req.user.id,
            text: req.body.text,
            parentShader: req.body.parentShader,
            parentComment: parentComment ? parentComment.id : undefined,
        });

        if (parentComment) {
            Users
                .findByPrimary(parentComment.author)
                .then(parentAuthor => {
                    if (parentAuthor) {
                        Notify.comment(
                            parentAuthor,
                            req.user,
                            comment,
                        );
                    }
                })
                .catch(e => console.error(e));
        }

        const author = await Users.findByPrimary(comment.author);
        if (author) {
            res.json({
                ...(comment as any).dataValues,
                author: {
                    id: author.id,
                    username: author.username,
                },
            })
        } else {
            res.json(comment);
        }

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

priv.patch("/comments", async (req, res) => {
    try {
        if (!req.body) {
            res.status(400).json({ error: true, message: "No request body" });
            return;
        }

        if (!(req.body.id != null && req.body.text)) {
            res.status(400).json({ error: true, message: "Invalid request" });
            return;
        }

        const comment = await Comments.findByPrimary(req.body.id);
        if (!comment) {
            res.status(404).json({ error: true, message: "Comment not found" });
            return;
        }

        if (comment.author !== req.user.id) {
            res.status(403).json({ error: true, message:  "You are not allowed to edit this comment" });
            return;
        }

        res.json(await comment.update({
            text: req.body.text,
            lastEdited: new Date(),
        }));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

priv.patch("/users/:id", async (req, res) => {
    try {
        const user = await Users.findByPrimary(req.params.id);
        if (!user) {
            res.status(404).json({ error: true, message: "User not found" });
            return;
        }

        if (!await editingAllowed(req.user, user)) {
            res.status(403).json({ error: true, message: "You cannot edit this user" });
            return;
        }

        const update: any = {};
        if (req.body.password) {
            update.password = req.body.password;
        }
        if (req.body.email !== undefined) {
            update.email = req.body.email;
        }
        if (req.body.telegram !== undefined) {
            update.telegram = req.body.telegram;
        }

        if (req.body.publicEmail != null || req.body.publicTelegram != null) {
            if (req.user.id !== user.id) {
                res.status(403).json({ error: true, message: "You cannot edit field visibility for this user" });
                return;
            }

            if (req.body.publicEmail != null) {
                update.publicEmail = req.body.publicEmail;
            }
            if (req.body.publicTelegram != null) {
                update.publicTelegram = req.body.publicTelegram;
            }
        }

        if (typeof req.body.role === "number" && req.body.role > 0 && req.body.role <= 2) {
            if (req.user.role === UserRole.Admin && user.role !== UserRole.Admin) {
                update.role = req.body.role;
            } else {
                res.status(403).json({ error: true, message: "You cannot set this role for this user" });
                return;
            }
        } else if (req.body.role) {
            res.status(400).json({ error: true, message: "Role must be a number either 1 or 2" });
            return;
        }

    await user.update(update);

        res.json(userToResponse(user, req.user));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});


const pub = Express.Router();

pub.get("/shaders", async (req, res) => {
    try {
        const limit = req.query.limit || 20;
        const page = req.query.page || 1;

        const where: any = { [Sequelize.Op.and]: [] };
        const order: [string, string][] = [];
        if (req.query.owner != null) {
            where.owner = req.query.owner;
        }
        if (req.query.search) {
            let regexp: RegExp;
            try {
                regexp = new RegExp(req.query.search);
            } catch (e) {
                res.status(400).json({ error: true, message: e.message });
                return;
            }

            where[Sequelize.Op.and as any].push({
                [Sequelize.Op.or]: [
                    { name: { [Sequelize.Op.iRegexp]: req.query.search } },
                    { description: { [Sequelize.Op.iRegexp]: req.query.search } }
                ]
            });
        }
        if (req.query.time) {
            let lowerRange: Date | null = null;
            switch (req.query.time) {
            case "day":
                lowerRange = new Date();
                lowerRange.setDate(lowerRange.getDate() - 1);
                break;

            case "week":
                lowerRange = new Date();
                lowerRange.setDate(lowerRange.getDate() - 7);
                break;

            case "month":
                lowerRange = new Date();
                lowerRange.setDate(lowerRange.getDate() - 30);
                break;

            case "year":
                lowerRange = new Date();
                lowerRange.setDate(lowerRange.getDate() - 365);
                break;
            }

            if (lowerRange) {
                where[Sequelize.Op.and as any].push({
                    [Sequelize.Op.or]: [
                        { publishingDate: null },
                        {
                            publishingDate: {
                                [Sequelize.Op.gte]: lowerRange
                            }
                        },
                    ]
                });
            }
        }
        if (req.query.sort) {
            switch (req.query.sort) {
            case "new":
                order.push(["publishingDate", "DESC"]);
                break;

            case "old":
                order.push(["publishingDate", "ASC"]);
                break;

            case "liked":
                order.push(["likeCount", "DESC"]);
                break;
            }
        }
        if (req.user) {
            where[Sequelize.Op.and as any].push({
                [Sequelize.Op.or]: [
                    { published: true },
                    { owner: req.user.id }
                ]
            });
        } else {
            where.published = true;
        }

        const shaders = await Shaders.findAll({ where, order, limit, offset: (page-1) * limit });

        const responseShaders = await Promise.all(shaders.map(async shader => {
            const textures = await ShaderTextures.findAll({ where: { shaderId: shader.id } });

            return {
                ...(shader as any).dataValues,
                textures
            };
        }));

        res.json(responseShaders);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

pub.get("/shaders/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).json({ error: true, message: "Invalid id" });
            return;
        }

        const shader = await Shaders.findByPrimary(id);
        if (!shader) {
            res.status(404).json({ error: true, message: "Shader not found" });
            return;
        }

        const textures = await ShaderTextures.findAll({ where: { shaderId: id } });

        res.json({
            ...(shader as any).dataValues,
            liked: req.user ?
                (await Likes.findOne({ where: { user: req.user.id, shader: shader.id } })) != null :
                false,

            textures: textures,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

pub.get("/comments/:shaderId", async (req, res) => {
    const depth = req.query.depth;
    const comment = req.query.comment;

    try {
        res.json(await Utils.getComment(req.params.shaderId, comment, depth));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

pub.get("/users/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const user = Number.isFinite(id) ?
            await Users.findByPrimary(id) :
            await Users.findOne({ where: { username: req.params.id } });

        if (!user) {
            res.status(404).json({ error: true, message: "User not found" });
            return;
        }

        res.json(userToResponse(user, req.user));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

pub.get("/users/:id/shaders", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).json({ error: true, message: "Invalid id" });
        }

        const shaders = await Shaders.findAll({ where: { owner: id } });

        res.json(shaders);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

pub.get("/users/:id/commented-shaders", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).json({ error: true, message: "Invalid id" });
        }

        const limit = req.query.limit || 20;
        const page = req.query.page || 1;

        const shaderIds: Set<number> = new Set();

        for (const comment of await Comments.findAll({ where: { author: id } })) {
            shaderIds.add(comment.parentShader);
        }
        const parentShaders = await Shaders.findAll({ where: {
            id: {
                [Sequelize.Op.in]: Array.from(shaderIds)
            },
            [Sequelize.Op.or]: [
                { published: true },
                req.user && { owner: req.user.id }
            ]
        } });

        res.json(parentShaders.slice((page-1) * limit, page * limit).map(shader => shader.id));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" })
    }
});

pub.get("/users/:id/comments", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).json({ error: true, message: "Invalid id" });
        }

        const limit = req.query.limit || 20;
        const page = req.query.page || 1;

        const pagination = {
            limit,
            offset: (page-1) * limit
        };

        //TODO: catch pagination errors
        const comments =
            req.query.shader != null ?
            await Comments.findAll({ where: { author: id, parentShader: req.query.shader }, ...pagination }) :
            await Comments.findAll({ where: { author: id }, ...pagination });

        res.json(comments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

const router = Express.Router();

router.get("/users/me", authMiddleware, (req, res) => {
    res.redirect(`/api/v1/users/${req.user.id}`);
});
router.use([ pub, priv ]);

export default router;
