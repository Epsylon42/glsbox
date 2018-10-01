import Express from 'express';
import Swig from 'swig';

const app = Express();

app.use(Express.static("frontend-dist/static"));

app.engine("html", Swig.renderFile);
app.set("view engine", "html");
app.set("views", "frontend-dist/views");

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/create", (req, res) => {
    res.render("index", {
        scripts: [
            "view.js",
            "profile.js"
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

app.listen(3000, () => {
    console.log("ready");
});
