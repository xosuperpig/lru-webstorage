var gulp = require('gulp');
var uglify = require('gulp-uglify');

gulp.task('default', function () {
    gulp.src('lib/lruWebStorage.js')
        .pipe(uglify())
        .pipe(gulp.dest('min/'));
});
