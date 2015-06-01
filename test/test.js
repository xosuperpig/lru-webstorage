describe('test test', function () {
    describe('simple operations', function () {
        beforeEach(function() {
            lru = LruWebStorage('test');
        });

        it('simple set', function () {
            lru.set('a', 1);
            expect(lru.get('a')).to.eql(1);
        });

        it('get null', function() {
            // expect(lru.get('b')).to.be(null);
        });
    });
});
