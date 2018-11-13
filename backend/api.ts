import Express from 'express';
import Passport from 'passport';

import { db, Users, Shaders, ShaderTextures, ShaderTexturesInstance, Comments, Utils, UsersInstance } from './db';
import { Transaction as FileTransaction } from './file-storage';
import { TextureKind } from '../common/texture-kind';

async function editingAllowed(thisUser: number, owner: number): Promise<boolean> {
    if (thisUser === owner) {
        return true;
    }
    const [t, o] = await Promise.all([
        Users.findByPrimary(thisUser),
        Users.findByPrimary(owner)
    ]);

    return (t && o && t.role < o.role) || false;
}

const priv = Express.Router();
priv.use((req, res, next) => {
    if (req.user) {
        return next();
    } else {
        Passport.authenticate('basic', { session: false }, (err, user) => {
            if (err) {
                return next(err);
            } else if (user) {
                req.login(user, err => {
                    if (err) {
                        return next(err);
                    } else {
                        return next();
                    }
                });
            } else {
                return next("Not logged in");
            }
        })(req, res, next);
    }
});

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

        let parentComment: number | undefined;
        if (req.body.parentComment != null) {
            parentComment = req.body.parentComment;
            if (!await Comments.findByPrimary(req.body.parentComment)) {
                res.status(404).json({ error: true, message: "Parent comment not found" });
                return;
            }
        }

        const comment = await Comments.create({
            author: req.user.id,
            text: req.body.text,
            parentShader: req.body.parentShader,
            parentComment,
        });

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

priv.get("/users/me", (req, res) => {
    res.redirect(`/api/v1/users/${req.user.id}`);
});


const pub = Express.Router();

pub.get("/shaders/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).json({ error: true, message: "Invalid id" });
            return;
        }

        const shader: any = await Shaders.findByPrimary(id);
        if (!shader) {
            res.status(404).json({ error: true, message: "Shader not found" });
            return;
        }

        const textures = await ShaderTextures.findAll({ where: { shaderId: id } });

        res.json({
            ...shader.dataValues,
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
        if (!Number.isFinite(id)) {
            res.status(400).json({ error: true, message: "Invalid id" });
            return;
        }

        const user = await Users.findByPrimary(id);
        if (!user) {
            res.status(404).json({ error: true, message: "User not found" });
            return;
        }

        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email || null,
        });
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

pub.get("/users/:id/comments", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).json({ error: true, message: "Invalid id" });
        }

        const comments = await Comments.findAll({ where: { author: id }, group: "parentShader" });

        console.log(comments);
        throw new Error("a");

        res.json(comments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

const router = Express.Router();
router.use([ priv, pub ]);

export default router;
