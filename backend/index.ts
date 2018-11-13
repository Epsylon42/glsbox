import Express from 'express';
import Mustache from 'mustache-express';
import BusboyBodyParser from 'busboy-body-parser';
import BodyParser from 'body-parser';
import path from 'path';
import Sequelize from 'sequelize';
import Passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { BasicStrategy } from 'passport-http';
import Session from 'express-session';

import { Converter as MDConverter } from 'showdown';

import { db, Users, Shaders, ShaderTextures, ShaderTexturesInstance, Comments, Utils, UsersInstance } from './db';

import ApiRouter from './api';

function authFunc(username: string, password: string, done: any) {
    Users.find({ where: { username } })
        .then(user => {
            if (!user) {
                return done("No such user", false);
            }
            return Utils.checkUserPassword(user.id, password)
                .then(check => {
                    if (check) {
                        return done(null, user);
                    } else {
                        return done("Invalid password", false);
                    }
                });
        })
        .catch(err => done(err));
}

Passport.use(new LocalStrategy(authFunc));
Passport.use(new BasicStrategy(authFunc));

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
app.use(BusboyBodyParser({ limit: "10mb", multi: true }))
app.use(BodyParser.json());
app.use(Session({ secret: process.env.SESSION_SECRET || "default_secret" }));
app.use(Passport.initialize());
app.use(Passport.session());

app.engine("mst", Mustache(path.join("frontend-dist", "views", "partial")));
app.set("views", path.join("frontend-dist", "views"));
app.set("view engine", "mst");

app.use("/api/v1", ApiRouter);

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
            args: [req.params.id, req.user && req.user.id || "null", req.query.comment || "null"],
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

app.get("/users/:id", async (req, res) => {
    res.render("index", {
        user: req.user,
        scripts: "user.js",
        mountPoints: {
            lib: "user",
            mount: "#content-app",
            args: req.params.id,
        }
    });
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

db.sync({ force: false }).then(() => {
    console.log("Database initialized");
    app.listen(process.env.PORT || 3000, () => {
        console.log("ready");
    });
}).catch(err => {
    console.log("failed to initialize database");
    console.log(err);
});

