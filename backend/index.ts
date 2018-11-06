import Express from 'express';
import Mustache from 'mustache-express';
import BodyParser from 'busboy-body-parser';
import path from 'path';
import Sequelize from 'sequelize';
import Passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import Session from 'express-session';

import { Converter as MDConverter } from 'showdown';

import { db, Users, Shaders, ShaderTextures, Comments, Utils, UserRole, UsersInstance } from './db';
import { Transaction as FileTransaction } from './file-storage';
import { TextureKind } from '../common/texture-kind';

Passport.use(new LocalStrategy((username, password, done) => {
    Users.find({ where: { username } })
        .then(user => {
            if (!user) {
                return done(null, false);
            }
            return Utils.checkUserPassword(user.id, password)
                .then(check => {
                    if (check) {
                        return done(null, user);
                    } else {
                        return done(null, false);
                    }
                });
        })
        .catch(err => done(err));
}));

Passport.serializeUser((user: UsersInstance, done) => {
    done(null, user.id);
});

Passport.deserializeUser((id: number, done) => {
    Users.findByPrimary(id)
        .then(user => done(null, user as any))
        .catch(err => done(err));
});


const app = Express();

app.use(Express.static(path.join("frontend-dist", "static")));
app.use(BodyParser({ limit: "10mb", multi: true }))
app.use(Session({ secret: process.env.SESSION_SECRET || "default_secret" }));
app.use(Passport.initialize());
app.use(Passport.session());

app.engine("mst", Mustache(path.join("frontend-dist", "views", "partial")));
app.set("views", path.join("frontend-dist", "views"));
app.set("view engine", "mst");

app.get("/", (req, res) => {
    res.render("index", { user: req.user });
});

app.get("/create", (req, res) => {
    res.render("index", {
        user: req.user,
        scripts: "view.js",
        mountPoints: {
            lib: "view",
            mount: "#content-app",
            args: ["null", req.user && req.user.id || "null"],
        }
    });
});

app.get("/view/:id", (req, res) => {
    res.render("index", {
        user: req.user,
        scripts: "view.js",
        mountPoints: {
            lib: "view",
            mount: "#content-app",
            args: [req.params.id, req.user && req.user.id || "null"],
        },
    });
});

app.get("/browse", async (req, res) => {
    const conv = new MDConverter();

    try {
        const shaders = await Shaders.findAll();

        res.render("browse", {
            user: req.user,
            styles: "browse.css",
            shaders: shaders.map(shader => {
                (shader as any).descriptionHTML = conv.makeHtml(shader.description);
                return shader;
            }),
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error");
    }
});

app.get("/login", (req, res) => {
    res.render("auth", {
        user: req.user,
        scripts: "auth.js",
        mountPoints: {
            lib: "auth",
            mount: "#auth-app",
            args: "\"login\"",
        }
    });
});

app.post("/login", Passport.authenticate('local', { failureRedirect: '/login', successRedirect: '/' }));

app.get("/register", (req, res) => {
    res.render("auth", {
        user: req.user,
        scripts: "auth.js",
        mountPoints: {
            lib: "auth",
            mount: "#auth-app",
            args: "\"register\"",
        }
    });
});

app.post("/register", async (req, res) => {
    try {
        if (!(req.body.username && req.body.password)) {
            res.status(400).send("Invalid request");
            return;
        }

        if (await Users.findOne({ where: { username: req.body.username } })) {
            res.status(400).send("This username is already taken");
            return;
        }

        const user = await Users.create({
            username: req.body.username,
            password: req.body.password,
            role: UserRole.user,
        });

        req.login(user, err => {
            if (err) {
                console.error(err);
                res.status(500).send("Internal server error");
            } else {
                res.redirect("/");
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error");
    }
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
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
app.post("/shaders", (req, res) => {
    if (!req.user) {
        res.status(401).send("Unauthorized");
        return;
    }

    if (!req.body.name) {
        res.status(400).send("Shader must have a name");
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
            res.status(400).send("textureOptions must be valid json");
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

            if (files.textures && textureOptions) {
                await Promise.all(
                    textureOptions.map(async opt => {
                        const file = files.textures[opt.file];

                        const fdata = await ftrans.writeFile(file.data, "glsbox-textures");

                        //TODO verify data
                        const tex = await ShaderTextures.create({
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
                textures: await ShaderTextures.findAll({ where: { shaderId: shader.id } }),
            });
        } catch (e) {
            console.error(e);
            res.status(500).send("Internal server error");
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
app.patch("/shaders/:id", (req, res) => {
    if (!req.user) {
        res.status(401).send("Unauthorized");
        return;
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        res.status(400).send("Invalid id");
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
            res.status(400).send("textureOptions must be valid json");
            return;
        }
    }

    const files = (req as any).files;

    db.transaction(async transaction => {
        const ftrans = new FileTransaction();

        try {
            const shader = await Shaders.findByPrimary(id, { transaction });
            if (!shader) {
                res.status(404).send("No shader with such id");
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
            res.status(500).send("Internal server error");
            await ftrans.rollback();
            throw e;
        }
    });
});

app.get("/api/shaders/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).send("Invalid id");
            return;
        }

        const shader: any = await Shaders.findByPrimary(id);
        if (!shader) {
            res.status(404).send(`Shader ${req.params.id} not found`);
            return;
        }

        const textures = await ShaderTextures.findAll({ where: { shaderId: id } });

        res.json({
            ...shader.dataValues,
            textures: textures,
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error");
    }
});

app.get("/api/comments/:shaderId", async (req, res) => {
    const depth = req.query.depth;
    const parent = req.query.parent;

    try {
        res.json(await Utils.getComments(req.params.shaderId, parent, depth));
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error");
    }
});

app.post("/comments/:shaderId", async (req, res) => {
    try {

        const id = Number(req.params.shaderId);
        if (!Number.isFinite(id)) {
            res.status(400).send("Invalid shader id");
            return;
        }
        const author = Number(req.body.author);
        if (!Number.isFinite(author)) {
            res.status(400).send("Invalid author id");
            return;
        }

        if (!await Shaders.findByPrimary(id)) {
            res.status(404).send("Parent shader not found");
        }


        let parentComment: number | undefined;
        if (req.body.parentComment != null) {
            parentComment = Number(req.body.parentComment);
            if (!Number.isFinite(parentComment)) {
                res.status(400).send("Invalid parent comment id");
                return;
            }

            if (!await Comments.findByPrimary(req.body.parentComment)) {
                res.status(404).send("Parent comment not found");
            }
        }

        const comment = await Comments.create({
            author: author,
            text: req.body.text || "",
            parentShader: id,
            parentComment,
        });

        res.json(comment);
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error");
    }
});

db.sync({ force: false }).then(() => {
    console.log("Database initialized");
    app.listen(3000, () => {
        console.log("ready");
    });
}).catch(err => {
    console.log("failed to initialize database");
    console.log(err);
});

