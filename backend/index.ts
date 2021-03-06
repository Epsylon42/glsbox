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

import { db, Users, Shaders, ShaderTextures, ShaderTexturesInstance, Comments, Utils, UsersInstance } from './db';

import ApiRouter from './api';

function authFunc(username: string, password: string, done: any) {
    Users.find({ where: { username } })
        .then(user => {
            if (!user) {
                const e: any = new Error("No such user");
                e.status = 404;
                return done(e, false);
            }
            return Utils.checkUserPassword(user.id, password)
                .then(check => {
                    if (check) {
                        return done(null, user);
                    } else {
                        const e: any = new Error("Invalid password");
                        e.status = 400;
                        return done(e, false);
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

app.use((req, res, next) => {
    res.setHeader("X-Clacks-Overhead", "GNU Terry Pratchett");
    next();
});


app.get("*", (req, res) => {
    res.render("index");
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

app.post("/login", (req, res, next) => {
    Passport.authenticate('local', (err, user) => {
        if (err) {
            res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
        } else if (user) {
            req.login(user, err => {
                if (err) {
                    res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
                } else {
                    res.redirect("/");
                }
            });
        } else {
            res.redirect(`/login?error=${encodeURIComponent("Unknown error")}`);
        }
    })(req, res, next);
})

app.post('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});


app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.status != null ? err.status : 500);
    res.json({ error: true, message: err.message });
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

