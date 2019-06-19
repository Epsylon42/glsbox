import Vue from 'vue';
import VueRouter from 'vue-router';

const FrontPage = () => import('./front-page.vue');
const Browse = () => import('./browse/browse.vue');
const ShaderView = () => import('./shader-view/shader-view.vue');
const Login = () => import('./auth/login.vue');
const Register = () => import('./auth/register.vue');

const User = () => import('./user/user.vue');
const UserProfile = () => import('./user/profile.vue');
const UserShaders = () => import('./user/shaders.vue');
const UserComments = () => import('./user/comments.vue');

Vue.use(VueRouter);

const routes = [
    {
        path: "/",
        component: FrontPage,
    },
    {
        path: "/browse",
        component: Browse,
    },
    {
        path: "/create",
        component: ShaderView,
    },
    {
        path: "/view/:shaderId",
        component: ShaderView,
    },
    {
        path: "/login",
        component: Login,
    },
    {
        path: "/register",
        component: Register,
    },
    {
        path: "/users/:userId",
        component: User,
        children: [
            {
                path: "",
                name: "user-profile",
                component: UserProfile,
            },
            {
                path: "profile",
                name: "user-profile",
                component: UserProfile,
            },
            {
                path: "shaders",
                name: "user-shaders",
                component: UserShaders,
            },
            {
                path: "comments",
                name: "user-comments",
                component: UserComments,
            }
        ]
    }
]

export const Router = new VueRouter({
    routes,
    mode: "history",
});
