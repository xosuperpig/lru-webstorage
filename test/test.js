describe('..', function () {
    before(function() {
        window.sessionStorage.clear();
        window.localStorage.clear();
    });

    describe('simple operations# ', function () {
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
    });

    describe('stale# ', function () {
        beforeEach(function() {
            lru = LruWebStorage('testStale', {maxAge: -1 * 6000});
        });

        it('simple stale', function () {
            lru.set('a', 1);
            expect(lru.get('a')).to.be(null);
        });
    });

    describe('moveToSession', function () {
        beforeEach(function() {
            lru = LruWebStorage('testMove', {limit: 2});
        });

        it('length', function () {
            lru.set('msa', 1);
            lru.set('msb', 2);
            lru.set('msc', 3);
            expect(Object.keys(localStorage).filter(function(v) {return v.indexOf('testMove') != -1;}).length).to.be(3);//2 + 1, one is the config
            expect(Object.keys(sessionStorage).filter(function(v) {return v.indexOf('testMove') != -1;}).length).to.be(1);
        });
    });

    describe('outOfLimit# ', function () {
        beforeEach(function () {
            lru = LruWebStorage('testLimit', {limit: 2, useSession: false});
        });

        it('simple limit', function () {
            lru.set('limita', 1);
            lru.set('limitb', 2);
            lru.set('limitc', 3);
            expect(lru.get('limitc')).to.be(3);
            expect(lru.get('limitb')).to.be(2);
            expect(lru.get('limita')).to.be(undefined);
        });

        it('lru limit', function () {
            lru.set('a', 1);
            lru.set('b', 2);
            lru.get('a');
            lru.set('c', 3);
            expect(lru.get('c')).to.be(3);
            expect(lru.get('b')).to.be(undefined);
            expect(lru.get('a')).to.be(1);
        });
    });
});
