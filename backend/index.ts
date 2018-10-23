import Express from 'express';
import Mustache from 'mustache-express';
import BodyParser from 'busboy-body-parser';
import path from 'path';
import Sequelize from 'sequelize';

import { db, Shaders, ShaderTextures, Utils, FileStorage } from './db';
import { TextureKind } from '../common/texture-kind';

const app = Express();

app.use(Express.static(path.join("frontend-dist", "static")));
app.use(BodyParser({ limit: "10mb", multi: true }))

app.engine("mst", Mustache(path.join("frontend-dist", "views", "partial")));
app.set("views", path.join("frontend-dist", "views"));
app.set("view engine", "mst");

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/create", (req, res) => {
    res.render("index", {
        scripts: [
            {
                src: "view.js"
            },
            {
                src: "profile.js"
            }
        ],
        mountPoints: [
            {
                lib: "view",
                mount: "#content-app",
            },
            {
                lib: "profile",
                mount: "#profile-app",
            }
        ]
    });
});

app.get("/edit/:id", (req, res) => {
    res.render("index", {
        scripts: [
            {
                src: "view.js"
            },
            {
                src: "profile.js"
            }
        ],
        mountPoints: [
            {
                lib: "view",
                mount: "#content-app",
                args: {
                    arg: req.params.id,
                }
            },
            {
                lib: "profile",
                mount: "#profile-app",
            }
        ]
    });
})

app.get("/login", (req, res) => {
    res.render("index", {
        scripts: [
            "login.js",
            "profile.js",
        ],
        mountPoints: [
            {
                lib: "login",
                mount: "#content-app",
            },
            {
                lib: "profile",
                mount: "#profile-app",
            }
        ]
    });
});

app.post("/api/shaders", (req, res) => {
    db.transaction(async transaction => {
        try {
            const files = (req as any).files;

            if (!(req.body.code && req.body.textureOptions && files)) {
                res.status(400).send("Invalid request");
                return;
            }

            let textureOptions: { file?: number, id?: number, name: string, kind: TextureKind }[];
            try {
                textureOptions = JSON.parse(req.body.textureOptions);
            } catch (e) {
                res.status(400).send("Could not parse textureOptions");
                return;
            }

            const shader = req.body.id != undefined ?
                await Shaders.findByPrimary(req.body.id, { transaction }) :
                await Shaders.create({
                    owner: 0,
                    code: req.body.code,
                }, { transaction });

            if (!shader) {
                res.status(404).send("No shader with such id");
                return;
                // this should not happen if the shader was just created
                // so it's safe to return without rolling transaction back
            }

            if (req.body.id != undefined) {
                await shader.update({ code: req.body.code }, { transaction });
            }

            const textureIds = textureOptions.filter(tex => tex.id != undefined).map(tex => tex.id);
            if (textureIds.length !== 0) {
                await ShaderTextures
                    .destroy({
                        where: {
                            shaderId: shader.id,
                            id: {
                                [Sequelize.Op.notIn]: textureIds
                            }
                        },
                        transaction
                    });
            }

            await Promise.all(
                textureOptions
                    .map(async (tex) => {
                        try {
                            if (tex.id != undefined) {
                                const texEntry = await ShaderTextures.findByPrimary(tex.id, { transaction });
                                if (texEntry) {
                                    await texEntry.update({
                                        name: tex.name,
                                        textureKind: tex.kind,
                                    }, { transaction });
                                }
                            } else if (tex.file != undefined) {
                                const texEntry = await ShaderTextures.create({
                                    shaderId: shader.id,
                                    name: tex.name,
                                    textureKind: tex.kind,
                                }, { transaction });
                                const file = files.textures[tex.file as number];

                                await FileStorage.writeTexture(
                                    texEntry.id,
                                    file.name,
                                    file.data
                                );
                            }
                        } catch (e) {
                            throw e;
                        }
                    })
            );

            res.send(shader.id.toString());
        } catch (e) {
            res.status(500).send(e.message);
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
        res.status(500).send(e.message);
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
        res.status(500).send(e.message);
    }
})

db.sync({ force: false }).then(() => {
    console.log("Database initialized");
    app.listen(3000, () => {
        console.log("ready");
    });
}).catch(err => {
    console.log("failed to initialize database");
    console.log(err);
});

