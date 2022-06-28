'use strict';

const autoprefixer = require('autoprefixer');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const eslintFormatter = require('react-dev-utils/eslintFormatter');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin')
const paths = require('./paths');
const getClientEnvironment = require('./env');
const cdnPath = require('./cdnPath');
const ThemeVariables = require('./generateTheme');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// const HappyPack = require('happypack'),
//     os = require('os');
// const happyThreadPool = HappyPack.ThreadPool({ size: os.cpus().length });
const threadLoader = require('thread-loader');
const publicPath = cdnPath();
const shouldUseSourceMap = false;
const publicUrl = publicPath.slice(0, -1);
const env = getClientEnvironment(publicUrl);
const TerserPlugin = require('terser-webpack-plugin');
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const smp = new SpeedMeasurePlugin();
let threadLoaderOptions = {
    workerParallelJobs: 50,
    workerNodeArgs: ['--max-old-space-size=1024'],
    // 允许重新生成一个僵死的 work 池
    // 这个过程会降低整体编译速度
    // 并且开发环境应该设置为 false
    poolRespawn: false,
    // 闲置时定时删除 worker 进程
    // 默认为 500（ms）
    // 可以设置为无穷大，这样在监视模式(--watch)下可以保持 worker 持续存在
    poolTimeout: 2000,
    // 池分配给 worker 的工作数量
    // 默认为 200
    // 降低这个数值会降低总体的效率，但是会提升工作分布更均一
    poolParallelJobs: 50,
    // 池的名称
    // 可以修改名称来创建其余选项都一样的池
    name: "my-pool"
}
threadLoader.warmup(
    [
        // 加载模块
        // 可以是任意模块，例如
        'babel-loader',
        'babel-preset-es2015',
        'sass-loader',
        'less-loader'
    ]
);
// Note: defined here because it will be used more than once.
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = smp.wrap({
    // Don't attempt to continue if there are any errors.
    mode: 'production',
    bail: true,
    // We generate sourcemaps in production. This is slow but gives good results.
    // You can exclude the *.map files from the build during deployment.
    devtool: shouldUseSourceMap ? 'source-map' : false,
    // In production, we only want to load the polyfills and the app code.
    entry: {
        index: [require.resolve('./polyfills'), paths.appIndexJs],
        vendor: ['lodash', 'react-jsx-parser', 'react-router', "react-router-dom", 'less', 'node-sass'],
    },
    output: {
        // The build folder.
        path: paths.appBuild,
        filename: 'static/js/[name].[chunkhash:8].js',
        chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
        publicPath: publicPath,
        devtoolModuleFilenameTemplate: info =>
            path
                .relative(paths.appSrc, info.absoluteResourcePath)
                .replace(/\\/g, '/'),
    },
    externals: {
        'axios': 'axios',
        'react': 'React',
        'react-dom': 'ReactDOM',
        "antd": "antd",
        'moment': 'moment',
        "moment-duration-format": "moment-duration-format",
        "ant-design-icons": "ant-design-icons",
        "redux": 'Redux',
        "react-redux": 'ReactRedux',
        "bizcharts": "BizCharts",
        "html2canvas": "html2canvas",
        "jquery": "jQuery"
    },
    optimization: {

        splitChunks: {
            chunks: "all"
        },
        minimize: true,
        minimizer: [
            // This is only used in production mode
            new TerserPlugin({
                terserOptions: {
                    parse: {
                        // We want terser to parse ecma 8 code. However, we don't want it
                        // to apply any minification steps that turns valid ecma 5 code
                        // into invalid ecma 5 code. This is why the 'compress' and 'output'
                        // sections only apply transformations that are ecma 5 safe
                        // https://github.com/facebook/create-react-app/pull/4234
                        ecma: 8,
                    },
                    compress: {
                        ecma: 5,
                        warnings: false,
                        // Disabled because of an issue with Uglify breaking seemingly valid code:
                        // https://github.com/facebook/create-react-app/issues/2376
                        // Pending further investigation:
                        // https://github.com/mishoo/UglifyJS2/issues/2011
                        comparisons: false,
                        // Disabled because of an issue with Terser breaking valid code:
                        // https://github.com/facebook/create-react-app/issues/5250
                        // Pending further investigation:
                        // https://github.com/terser-js/terser/issues/120
                        inline: 2,
                    },
                    mangle: {
                        safari10: true,
                    },
                    // Added for profiling in devtools
                    keep_classnames: true,
                    keep_fnames: true,
                    output: {
                        ecma: 5,
                        comments: false,
                        ascii_only: true,
                    },
                    parallel: true,
                    terserOptions: {
                        compress: {
                            drop_console: true
                        }
                    }
                },
            }),
            new OptimizeCssAssetsPlugin({
                assetNameRegExp: /\.optimize\.css$/g,
                cssProcessor: require('cssnano'),
                cssProcessorOptions: { safe: true, discardComments: { removeAll: true } },
                canPrint: true
            }),
        ],

    },
    resolve: {
        modules: ['node_modules', paths.appNodeModules].concat(
            process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
        ),
        extensions: ['.web.js', '.js', '.json', '.web.jsx', '.jsx', '.mjs'],
        alias: paths.namespace,
        plugins: [
            new ModuleScopePlugin(paths.appSrc, [paths.appPackageJson])
        ],
    },
    resolveLoader: {
        alias: {
            'copy': 'file-loader?name=[path][name].[ext]&context=./src'
        }
    },
    module: {
        strictExportPresence: true,
        rules: [
            {
                test: /\.(js|jsx|mjs)$/,
                enforce: 'pre',
                use: [
                    {
                        options: {
                            formatter: eslintFormatter,
                            eslintPath: require.resolve('eslint'),

                        },
                        loader: require.resolve('eslint-loader'),
                    },
                ],
                include: paths.appSrc,
            },
            {
                oneOf: [
                    // "url" loader works just like "file" loader but it also embeds
                    // assets smaller than specified size as data URLs to avoid requests.
                    {
                        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/i, /\.svg$/],
                        loader: require.resolve('url-loader'),
                        options: {
                            limit: 10 * 1024,
                            name: 'static/media/[name].[hash:8].[ext]',
                        },
                    },
                    {
                        test: /\.(js|jsx|mjs)$/,
                        include: paths.appSrc,
                        use: [
                            {
                                loader: require.resolve('thread-loader'),
                                options: {
                                    workers: 2,
                                    ...threadLoaderOptions
                                }
                            },
                            {
                                // loader: require.resolve('babel-loader'),
                                loader: 'babel-loader',
                                options: {
                                    plugins: [
                                        // ["transform-runtime"],
                                        ['import', [{ libraryName: 'antd', style: 'css' }]],  // import less
                                    ],
                                    compact: true,
                                    cacheDirectory: true
                                },
                            }
                        ],
                    },
                    {
                        test: /\.(css|less)$/,
                        use: [
                            //{ loader: "style-loader" },
                            MiniCssExtractPlugin.loader, // 此处使用把css分离出去了，不过不使用此插件，可以用style-loader
                            {
                                loader: 'thread-loader',
                                options: {
                                    workers: 2,
                                    ...threadLoaderOptions
                                }
                            },
                            {
                                loader: require.resolve('css-loader'),
                            },
                            {
                                loader: require.resolve('less-loader'), // compiles Less to CSS
                                options: {
                                    modifyVars: require('./generateTheme'),
                                    javascriptEnabled: true
                                }
                            },
                        ],
                    },
                    {
                        test: /\.(css|scss)$/,
                        use: [
                            MiniCssExtractPlugin.loader,
                            {
                                loader: 'thread-loader',
                                options: {
                                    workers: 2,
                                    ...threadLoaderOptions
                                }
                            },
                            {
                                loader: require.resolve('css-loader'),
                            },
                            {
                                loader: require.resolve('sass-loader') // compiles Less to CSS
                            },
                        ],
                    },
                    {
                        loader: require.resolve('file-loader'),
                        exclude: [/\.js$/, /\.html$/, /\.json$/, /\.mjs$/],
                        options: {
                            name: 'static/media/[name].[hash:8].[ext]',
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({ filename: 'static/css/[name].[hash:8].css', chunkFilename: 'static/css/[name].[hash:8].css' }),
        new SimpleProgressWebpackPlugin(),
        new HtmlWebpackPlugin({
            inject: true,
            template: paths.appHtml,
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true,
            }
        }),
        new InterpolateHtmlPlugin(HtmlWebpackPlugin, env.raw),
        // Generates an `index.html` file with the <script> injected.
        new CopyWebpackPlugin([{
            from: paths.appSrc + '/publicMedia',
            to: paths.appBuild + '/static/publicMedia'
        }
        ]),
        new webpack.DefinePlugin(env.stringified),
        new ManifestPlugin({
            fileName: 'asset-manifest.json',
        }),
        new SWPrecacheWebpackPlugin({
            dontCacheBustUrlsMatching: /\.\w{8}\./,
            filename: 'service-worker.js',
            logger(message) {
                if (message.indexOf('Total precache size is') === 0) {
                    // This message occurs for every build and is a bit too noisy.
                    return;
                }
                if (message.indexOf('Skipping static resource') === 0) {
                    // This message obscures real errors so we ignore it.
                    // https://github.com/facebookincubator/create-react-app/issues/2612
                    return;
                }
                console.log(message);
            },
            minify: true,
            // For unknown URLs, fallback to the index page
            navigateFallback: publicUrl + '/index.html',
            // Ignores URLs starting from /__ (useful for Firebase):
            // https://github.com/facebookincubator/create-react-app/issues/2237#issuecomment-302693219
            navigateFallbackWhitelist: [/^(?!\/__).*/],
            // Don't precache sourcemaps (they're large) and build asset manifest:
            staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/],
        }),
        new BundleAnalyzerPlugin(),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new webpack.DefinePlugin({
            THEMES: JSON.stringify(ThemeVariables)
        })
    ],
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
        dgram: 'empty',
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
        child_process: 'empty',
        __dirname: true
    },
});
