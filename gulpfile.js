var gulp = require('gulp');
var concat = require('gulp-concat');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gulpDebug = require('gulp-debug');
var mainNpmFiles = require('npmfiles');
var del = require('del');
var path = require('path');
var cached = require('gulp-cached');
var remember = require('gulp-remember');
var inject = require('gulp-inject');
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var zip = require('gulp-zip');
var bump = require('gulp-bump');
var semver = require('semver');
var git = require('gulp-git');
var replace = require('gulp-replace');
var release = require('gulp-github-release');
var cleanCSS = require('gulp-clean-css');
var modifyCssUrls = require('gulp-modify-css-urls');
var sort = require('gulp-sort');
var scanner = require('i18next-scanner');
var jsonConcat = require('gulp-json-concat');
var rename = require('gulp-rename');
var browserSync = require('browser-sync');
var merge = require('merge-stream');
var babel = require('gulp-babel');
var { marked } = require('marked');
var fs = require('fs');

const server = browserSync.create();

var debug = false;

var paths = {
    scriptsConfig: [
        'node_modules/core-js-bundle/minified.js',
        'node_modules/regenerator-runtime/runtime.js',
        'node_modules/@turf/turf/turf.min.js',
    ],
    scripts: [
        'node_modules/jquery/dist/jquery.js',
        'node_modules/async/dist/async.js',
        'node_modules/maplibre-gl/dist/maplibre-gl.js',
        'js/Browser.js',
        'js/WhatsNew.js',
        'js/Util.js',
        'js/Map.js',
        'js/LayersConfig.js',
        'js/router/BRouter.js',
        'js/util/*.js',
        'js/format/*.js',
        'js/plugin/*.js',
        'js/control/*.js',
        'js/index.js',
    ],
    styles: [
        'node_modules/maplibre-gl/dist/maplibre-gl.css',
        'css/style.css',
        'css/modern.css',
    ],
    images: ['resources/images/*.+(png|gif|svg)'],
    fonts: ['resources/fonts/*'],
    changelog: 'CHANGELOG.md',
    locales: 'locales/*.json',
    layers: ['layers/**/*.geojson', 'layers/**/*.json'],
    layersDestName: 'layers.js',
    layersConfig: [
        'layers/config/config.js',
        'layers/config/tree.js',
        'layers/config/overrides.js',
        'layers/config/geometry.js',
    ],
    layersConfigDestName: 'layersConf.js',
    boundaries: ['resources/boundaries/*.geojson', 'resources/boundaries/*.topo.json'],
    zip: ['dist/**', 'index.html', 'config.template.js', 'keys.template.js'],
    dest: 'dist',
    destName: 'brouter-web',
};

gulp.task('clean', function () {
    return del(paths.dest + '/**/*');
});

gulp.task('scripts_config', function () {
    return gulp
        .src(paths.scriptsConfig)
        .pipe(
            rename(function (path) {
                if (path.basename === 'minified') {
                    path.basename = 'core-js-bundle.min';
                } else if (path.basename === 'runtime') {
                    path.basename = 'regenerator-runtime';
                }
            })
        )
        .pipe(replace('//# sourceMappingURL=minified.js.map', ''))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('scripts', function () {
    return gulp
        .src(paths.scripts, { base: '.' })
        .pipe(sourcemaps.init())
        .pipe(cached('scripts'))
        .pipe(gulpif(!debug, babel({ caller: { supportsDynamicImport: true } })))
        .pipe(gulpif(!debug, uglify()))
        .pipe(remember('scripts'))
        .pipe(concat(paths.destName + '.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('styles', function () {
    return gulp
        .src(paths.styles)
        .pipe(
            modifyCssUrls({
                modify(url, filePath) {
                    var distUrl = url;
                    var imageExt = ['.png', '.gif', '.svg'];

                    if (imageExt.indexOf(path.extname(url)) !== -1) {
                        distUrl = 'images/' + path.basename(url);
                    } else if (url.indexOf('font') !== -1) {
                        distUrl = 'fonts/' + path.basename(url);
                    }

                    return distUrl;
                },
            })
        )
        .pipe(concat(paths.destName + '.css'))
        .pipe(
            cleanCSS({
                rebase: false,
            })
        )
        .pipe(postcss([autoprefixer({ remove: false })]))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('images', function () {
    return gulp.src(paths.images, { allowEmpty: true }).pipe(gulp.dest(paths.dest + '/images'));
});

gulp.task('fonts', function () {
    return gulp.src(paths.fonts, { allowEmpty: true }).pipe(gulp.dest(paths.dest + '/fonts'));
});

gulp.task('locales', function () {
    return gulp.src(paths.locales).pipe(gulp.dest(paths.dest + '/locales'));
});

gulp.task('boundaries', function () {
    return gulp.src(paths.boundaries).pipe(gulp.dest(paths.dest + '/boundaries'));
});

gulp.task('changelog', function (cb) {
    var content = 'BR.changelog = `' + marked(fs.readFileSync(paths.changelog, 'utf-8')) + '`';
    content = content.replace(/<h1.*<\/h1>/i, '');
    fs.writeFile(paths.dest + '/changelog.js', content, cb);
});

gulp.task('reload', function (done) {
    server.reload();
    done();
});

gulp.task('watch', function () {
    debug = true;
    gulp.watch(paths.scripts, gulp.series('scripts', 'reload'));
    gulp.watch(paths.changelog, gulp.series('changelog', 'reload'));
    gulp.watch(paths.locales, gulp.series('locales', 'reload'));
    gulp.watch(paths.styles, gulp.series('styles', 'reload'));
    gulp.watch(paths.layers, gulp.series('layers', 'reload'));
    gulp.watch(paths.layersConfig, gulp.series('layers_config', 'reload'));
    gulp.watch(['./index.html'].concat(paths.images).concat(paths.fonts).concat(paths.locales), gulp.series('reload'));
});

gulp.task('layers_config', function () {
    return gulp.src(paths.layersConfig).pipe(concat(paths.layersConfigDestName)).pipe(gulp.dest(paths.dest));
});

gulp.task('layers', function () {
    return (
        gulp
            .src(paths.layers)
            .pipe(rename({ extname: '.json' }))
            .pipe(
                jsonConcat(paths.layersDestName, function (data) {
                    var header =
                        '// Licensed under the MIT License (https://github.com/nrenner/brouter-web#license + Credits and Licenses)\n';
                    return Buffer.from(header + 'BR.layerIndex = ' + JSON.stringify(data, null, 2) + ';');
                })
            )
            .pipe(gulp.dest(paths.dest))
    );
});

gulp.task('bump:html', function () {
    return gulp.src('./index.html').pipe(gulp.dest('.'));
});

gulp.task(
    'default',
    gulp.series(
        'clean',
        'scripts_config',
        'layers_config',
        'layers',
        'bump:html',
        'scripts',
        'styles',
        'images',
        'fonts',
        'locales',
        'boundaries',
        'changelog'
    )
);

gulp.task(
    'debug',
    gulp.series(function (cb) {
        debug = true;
        cb();
    }, 'default')
);

gulp.task(
    'serve',
    gulp.series('debug', function (cb) {
        server.init({
            server: {
                baseDir: './',
            },
            open: false,
        });
        cb();
    })
);
