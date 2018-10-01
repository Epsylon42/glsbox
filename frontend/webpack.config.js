const path = require('path');
const VuePlugin = require('vue-loader/lib/plugin');

module.exports = {
    mode: 'development',
    entry: {
        view: './src/view.ts',
        profile: './src/profile.ts',
    },
    output: {
        filename: '[name].js',
        library: '[name]',
        path: path.resolve(__dirname, 'dist'),
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
                loader: ['vue-style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new VuePlugin()
    ]
};
