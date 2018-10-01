import Express from 'express';

const app = Express();
app.use(Express.static("frontend-dist/static"));
app.listen(3000, () => {
    console.log("ready");
});
