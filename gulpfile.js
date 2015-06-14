var gulp = require('gulp');
var uglify = require('gulp-uglify');
var markdown = require('gulp-markdown');

gulp.task('default', function () {
    gulp.src('lib/lruWebStorage.js')
        .pipe(uglify())
        .pipe(gulp.dest('min/'));
});

gulp.task('intro', function () {
    gulp.src('doc/intro.md')
        .pipe(markdown())
        .pipe(gulp.dest('doc/'));
});
