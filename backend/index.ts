import Express from 'express';
import Mustache from 'mustache-express';
import BodyParser from 'busboy-body-parser';
import path from 'path';
import Sequelize from 'sequelize';
import Passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import Session from 'express-session';

import { db, Users, Shaders, ShaderTextures, Utils, FileStorage, UserRole, UsersInstance } from './db';
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
    try {
        const shaders = await Shaders.findAll();

        res.render("browse", {
            user: req.user,
            styles: "browse.css",
            shaders,
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
        try {
            const shader = await Shaders.create({
                owner: req.user.id,
                name: req.body.name,
                description: req.body.description || "",
                code: req.body.code || "",
            }, { transaction });

            if (files.preview) {
                await shader.update({
                    previewUrl: await FileStorage.writePreview(shader.id, files.preview[0].data),
                }, { transaction });
            }

            if (files.textures && textureOptions) {
                await Promise.all(
                    textureOptions.map(async opt => {
                        const file = files.textures[opt.file];

                        //TODO verify data
                        const tex = await ShaderTextures.create({
                            shaderId: shader.id,
                            name: opt.name,
                            textureKind: opt.kind,
                            url: "",
                        }, { transaction });

                        const url = await FileStorage.writeTexture(
                            tex.id,
                            file.name,
                            file.data
                        );

                        await tex.update({ url }, { transaction });
                    })
                );
            }

            res.json({
                ...(shader as any).dataValues,
                textures: await ShaderTextures.findAll({ where: { shaderId: shader.id } }),
            });
        } catch (e) {
            console.error(e);
            res.status(500).send("Internal server error");
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
            if (req.body.deletePreview || files.preview) {
                await FileStorage.removePreview(shader.id);
                update.previewUrl = null;
            }
            if (files.preview) {
                update.previewUrl = await FileStorage.writePreview(shader.id, files.preview[0].data);
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
                                    FileStorage.removeTexture(tex.id),
                                    tex.destroy()
                                ]);
                            } else {
                                const update: {
                                    name?: string,
                                    kind?: TextureKind,
                                    url?: string,
                                } = {
                                    name: opt.name,
                                    kind: opt.kind,
                                };

                                if (opt.file && files.textures && files.textures[opt.file]) {
                                    //TODO: report errors if there's no files
                                    await FileStorage.removeTexture(tex.id);
                                    update.url = await FileStorage.writeTexture(opt.id, opt.name || tex.name, files.textures[opt.file]);
                                }

                                await tex.update(update, { transaction });
                            }
                        } else if (opt.file != null && opt.name && opt.kind != null) {
                            const file = files.textures[opt.file];

                            const tex = await ShaderTextures.create({
                                shaderId: shader.id,
                                name: opt.name,
                                textureKind: opt.kind,
                                url: ""
                            }, { transaction });

                            const url = await FileStorage.writeTexture(
                                tex.id,
                                file.name,
                                file.data,
                            );

                            await tex.update({ url }, { transaction });
                        }
                    })
                );
            }

            res.json({
                ...(shader as any).dataValues,
                textures: await ShaderTextures.findAll({ where: { shaderId: shader.id }, transaction }),
            });
        } catch (e) {
            console.error(e);
            res.status(500).send("Internal server error");
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

app.get("/api/textures/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).send("Invalid id");
            return;
        }

        try {
            res.sendFile(await FileStorage.getTexturePath(id));
        } catch (e) {
            if (e.message === "Texture does not exist") {
                res.status(404).send(e.message);
            } else {
                throw e;
            }
        }
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error");
    }
});

app.get("/api/preview/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            res.status(400).send("Invalid id");
            return;
        }

        try {
            res.sendFile(await FileStorage.getPreviewPath(id));
        } catch (e) {
            if (e.message === "Preview does not exist") {
                res.status(404).send(e.message);
            } else {
                throw e;
            }
        }
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

