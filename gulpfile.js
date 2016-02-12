'use strict';

var browserSync  = require('browser-sync');
var browserify   = require('browserify');
var del          = require('del');
var gulp         = require('gulp');
var cache        = require('gulp-cache');
var eslint       = require('gulp-eslint');
var gulpIf       = require('gulp-if');
var imagemin     = require('gulp-imagemin');
var minifyCss    = require('gulp-minify-css');
var minifyHtml   = require('gulp-minify-html');
var sass         = require('gulp-sass');
var sourcemaps   = require('gulp-sourcemaps');
var uglify       = require('gulp-uglify');
var path         = require('path');
var runSequence  = require('run-sequence');
var watchify     = require('watchify');
var buffer       = require('vinyl-buffer');
var source       = require('vinyl-source-stream');

var reload    = browserSync.reload;
var bootstrap = path.join(__dirname, '/node_modules/bootstrap-sass/');
var isWatch   = false;
var isRelease = false;

gulp.task('watchify', function() {
  isWatch = true;
});
gulp.task('release', function(cb) {
  isRelease = true;
  cb();
});

gulp.task('copy', function() {
  return gulp.src([
    'app/*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('copy:nm', function() {
  return gulp.src([
    bootstrap + 'assets/fonts/**/*'
  ], {
    base: 'node_modules',
    dot: true
  })
  .pipe(gulp.dest('.tmp/modules'))
  .pipe(gulp.dest('dist/modules'));
});

gulp.task('clean', function(cb) {
  del(['.tmp', 'dist/*', '!dist/.git'], {dot: true});
  cb();
});

gulp.task('styles', function() {
  return gulp.src(['app/styles/main.scss'])
  .pipe(gulpIf(!isRelease, sourcemaps.init()))
  .pipe(sass({
    precision: 10,
    includePaths: [
      path.join(bootstrap, 'assets/stylesheets')
    ]
  }).on('error', sass.logError))
  .pipe(gulpIf(isRelease, minifyCss()))
  .pipe(gulpIf(!isRelease, sourcemaps.write()))
  .pipe(gulpIf(isRelease, gulp.dest('dist/styles'), gulp.dest('.tmp/styles')))
  .pipe(gulpIf(browserSync.active, reload({stream: true})));
});

gulp.task('lint', function() {
  return gulp.src(['app/scripts/**/*.js', 'gulpfile.js'])
  .pipe(eslint({
    extends: 'google',
    env: {browser: true, node: true, jquery: true},
    // globals: {$: true, document: true, window: true},
    rules: {
      'no-multi-spaces': [2, {exceptions: {
        VariableDeclarator: true,
        ImportDeclaration: true
      }}]
    }
  }))
  .pipe(eslint.format())
  .pipe(gulpIf(!browserSync.active, eslint.failOnError()));
});

gulp.task('images', function() {
  return gulp.src('app/images/**/*')
  .pipe(cache(imagemin({
    progressive: true,
    interlaced: true
  })))
  .pipe(gulp.dest('dist/images'));
});

gulp.task('scripts', function() {
  var browserifyOpts = {
    entries: './app/scripts/main.js'
    // basedir: './',
  };

  var bundler = browserify(browserifyOpts);
  console.log('isWatch:', isWatch);
  if (isWatch) {
    browserifyOpts.cache = {};
    browserifyOpts.packageCache = {};
    browserifyOpts.debug = true;
    bundler = watchify(browserify(browserifyOpts));
  }

  var execBundle = function() {
    var time = process.hrtime();
    return bundler
    .bundle()
    .pipe(source('main.js'))
    .pipe(buffer())
    .pipe(gulpIf(!isRelease, sourcemaps.init({loadMaps: true})))
    .pipe(gulpIf(!isRelease, sourcemaps.write()))
    .pipe(gulpIf(isRelease, uglify({preserveComments: 'some'})))
    .on('error', function(err) {
      console.log('Bundle error:', err);
    })
    .pipe(gulpIf(!isRelease, sourcemaps.write()))
    .pipe(gulpIf(
      isRelease,
      gulp.dest('dist/scripts'),
      gulp.dest('.tmp/scripts')
    ))
    .on('end', function() {
      console.log('Bundled[ s, ns ]:', process.hrtime(time));
    })
    .pipe(gulpIf(browserSync.active, browserSync.stream({once: true})));
  };
  bundler.on('update', execBundle);
  return execBundle();
});

gulp.task('scripts:watch', function(cb) {
  runSequence('watchify', 'scripts', cb);
});

gulp.task('html', function() {
  return gulp.src('app/**/*.html')
  .pipe(minifyHtml())
  .pipe(gulp.dest('dist'));
});

gulp.task('serve', ['copy:nm', 'scripts:watch', 'styles'], function() {
  browserSync({
    notify: false,
    // scrollElementMapping: ['main', '.mdl-layout'],
    // https: true,
    server: ['.tmp', 'app'],
    port: 3000
  });

  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['app/styles/**/*.{scss,css}'], ['styles']);
  gulp.watch(['app/scripts/**/*.js', 'gulpfile.js'], ['lint']);
  gulp.watch(['app/images/**/*'], reload);
});

gulp.task('serve:dist', ['default'], function() {
  browserSync({
    notify: false,
    // scrollElementMapping: ['main', '.mdl-layout'],
    // https: true,
    server: 'dist',
    port: 3001
  });
});

gulp.task('default', ['clean', 'release'], function(cb) {
  runSequence(
    'styles',
    ['lint', 'html', 'scripts', 'images', 'copy', 'copy:nm'],
    cb
  );
});
