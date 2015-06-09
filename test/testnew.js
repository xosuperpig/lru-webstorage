var delay = function (ms) {
    return (function (def) {
        setTimeout(function () {
            def.resolve();
        }, ms || 1);
        return def.promise;
    })(Promise.defer());
};



describe('storage', function () {
    beforeEach(function() {
        sessionStorage.clear();
        localStorage.clear();
    });

    describe('just sessionStorage# ', function () {
        var lru;
        beforeEach(function() {
            lru = LruWebStorage('test');
        });

        it('simple set', function () {
            lru.set('a', 1);
            expect(lru.get('a')).to.eql(1);
        });

        it('set object', function () {
            lru.set('obj', {
                name: 'zombie',
                items: ['head', 'brain'],
                attribute: {
                    intelligence: 40,
                    athletic: 10
                }
            });

            var obj = lru.get('obj');
            expect(obj.name).to.eql('zombie');
            expect(obj.items.length).to.eql(2);
            expect(obj.attribute.intelligence).to.eql(40);
            expect(obj.attribute.athletic).to.eql(10);
        });

        it('get undefined', function() {
            expect(lru.get('b')).to.be(undefined);
        });

        it('check localStorage config', function() {
            lru.set('a', 1);
            lru.set('obj', {
                name: 'zombie',
                items: ['head', 'brain'],
                attribute: {
                    intelligence: 40,
                    athletic: 10
                }
            });

            var config = JSON.parse(localStorage.getItem('test-lruconfig'));
            expect(config._items.length).to.be(2);
            expect('maxAge' in config).to.be(true);
            expect('limit' in config).to.be(true);
            expect('useSession' in config).to.be(true);
        });
    });

    describe('stale# ', function () {
        var lru;

        it('simple stale', function () {
            lru = LruWebStorage('testStale', {
                maxAge: -1 * 6000,
                onStale: function (item) {
                    expect(item).to.be(1);
                }
            });
            lru.set('a', 1);
            expect(lru.get('a')).to.be(null);
        });
    });

    describe('moveToSession', function () {
        var lru;
        beforeEach(function() {
            lru = LruWebStorage('testMove', {limit: 2});
        });

        it('length', function () {
            lru.set('msa', 1);
            lru.set('msb', 2);
            lru.set('msc', 3);
            return delay(10)
                    .then(function () {
                        expect(Object.keys(localStorage).filter(function(v) {return v.indexOf('testMove') != -1;}).length).to.be(3);//2 + 1, one is the config
                        expect(Object.keys(sessionStorage).filter(function(v) {return v.indexOf('testMove') != -1;}).length).to.be(1);
                    });
        });
    });

    describe('outOfLimit# ', function () {
        var lru;
        beforeEach(function () {
            lru = LruWebStorage('testLimit', {limit: 2, useSession: false});
        });

        it('simple limit', function (done) {
            lru.set('limita', 1);
            lru.set('limitb', 2);
            lru.set('limitc', 3);
            setTimeout(function () {
                expect(lru.get('limitc')).to.be(3);
                expect(lru.get('limitb')).to.be(2);
                expect(lru.get('limita')).to.be(undefined);
                done();
            }, 10);
        });

        it('lru limit', function () {
            lru.set('a', 1);
            return delay()
                .then(function () {
                    lru.set('b', 2);
                    return delay();
                })
                .then(function () {
                    lru.get('a');
                    lru.set('c', 3);
                    return delay(10);
                })
                .then(function () {
                    expect(lru.get('c')).to.be(3);
                    expect(lru.get('a')).to.be(1);
                    expect(lru.get('b')).to.be(undefined);
                });
        });
    });
});



describe('CacheItem - ', function () {
    beforeEach(function () {
        sessionStorage.clear();
        localStorage.clear();
    });

    describe('simple operation - ', function () {
        beforeEach(function () {
            cacheItem = new LruWebStorage.CacheItem({key: 'hehe'});
        });

        it('create', function () {
            expect(cacheItem.storageKey).to.be('hehe');
            expect(cacheItem.level).to.be('session');
        });

        it('simple get set', function () {
            cacheItem.val = 3;
            expect(cacheItem.val).to.be(3);
            expect(sessionStorage.getItem('hehe')).to.be('3');
        });
    });

    describe('object operation - ', function () {
        var cacheItem;
        beforeEach(function () {
            cacheItem = new LruWebStorage.CacheItem({key: 'haha', level: 'local'});
        });

        it('object get set from localStorage', function () {
            expect(cacheItem.level).to.be('local');

            var sample = {name: 'zombie'};
            cacheItem.val = sample;
            expect(cacheItem.val.name).to.be('zombie');
            expect(localStorage.getItem('haha')).to.be(JSON.stringify(sample));
        });
    });

    describe('timing - ', function () {
        var cacheItem;
        before(function () {
            cacheItem = new LruWebStorage.CacheItem({key: 'hehe', maxAge: -1});
        });

        it('stale', function () {
            expect(cacheItem.isStale()).to.be(true);
        });

        it('lastuse', function (done) {
            setTimeout(function () {
                var time = Date.now();
                cacheItem.val = 3;
                expect(cacheItem.lastuse).to.be(time);
                done();
            }, 300);
        });
    });

    describe('valid - ', function () {
        var cacheItem;
        before(function () {
            cacheItem = new LruWebStorage.CacheItem({key: 'xixi'});
        });

        it('valid', function () {
            expect(cacheItem.isValid()).to.be(false);
            cacheItem.val = 4;
            expect(cacheItem.isValid()).to.be(true);
        });
    });
    //TODO test fromJson, toJSON
});

describe('lruArray', function () {
    describe('simple operation', function() {
        var arr, item1, item2;
        beforeEach(function () {
            arr = new LruWebStorage.LRUArray('storageKey');
            item1 = new LruWebStorage.CacheItem({key: 'hehe', lastuse: Date.now() - 1000});
            item2 = new LruWebStorage.CacheItem({key: 'haha', lastuse: Date.now() - 2000});
            arr.push(item2);
            arr.push(item1);
        });

        it('', function (done) {
            expect(arr.length).to.be(2);
            done();
        });

        it('sort', function (done) {
            expect(arr.indexOf(item2.storageKey)).to.be(0);
            done();
        });

        it('sortAgain', function (done) {
            arr.find(item1.storageKey).val = 3;
            setTimeout(function () {
                expect(arr.indexOf(item1.storageKey)).to.be(0);
                done();
            }, 1);

        });
    });
});
