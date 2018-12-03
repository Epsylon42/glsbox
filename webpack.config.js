const path = require('path');
const VuePlugin = require('vue-loader/lib/plugin');

module.exports = {
    mode: 'production',
    entry: {
        view: './frontend/view.ts',
        auth: './frontend/auth.ts',
        user: './frontend/user.ts',
        browse: './frontend/browse.ts',
    },
    output: {
        filename: '[name].js',
        library: '[name]',
        path: path.resolve(__dirname, 'frontend-dist/static/scripts'),
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                    appendTsSuffixTo: [/\.vue$/],
                }
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader',
            },
            {
                test: /\.css$/,
                loader: ['vue-style-loader', 'css-loader', 'sass-loader']
            }
        ]
    },
    plugins: [
        new VuePlugin(),
    ]
};
