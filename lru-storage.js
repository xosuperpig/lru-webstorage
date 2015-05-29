/**
 * exports: function(key, options)
 * @param prefix       define a prefix of the keys in localStorage
 * @param options
 *      maxAge
 *      limit           item limited in localStorage, defaults to 10,
 *      limitSession    item limited in sessionStoage, defaults to Infinity
 *      -
 */

(function (LruStorage, CacheItem) {
    if (window.define && define.cmd) {
        define(function (r, e, module) {
            module.exports = LruStorage(CacheItem());
        });
    }
})(function (CacheItem) {
    var STORAGE = {
        local: window.localStorage,
        session: window.sessionStorage
    };

    function LruStorage(prefix, options) {
        this.prefix = prefix;
        Object.keys(options).forEach(function(key) {
            this[key] = options[key];
        }, this);

        //keys
        this.items = {};
        options._items.forEach(function(v) {
            this.items[v.key] = new CacheItem(v);
        }, this);
    }
    LruStorage.prototype.set = function set(key, val, opt) {
        var item;
        if ((item = this.items[key])) {
            STORAGE[this.items[key].level].setItem(item.storageKey, val);
        } else {
            this.items[key] = new CacheItem({key: key, maxAge: Date.now() + this.maxAge});
            this.set.apply(this, arguments);
        }
        return this;
    };
    LruStorage.prototype.get = function get(key, opt) {
        var item;
        if ((item = this.items[key])) {
            return STORAGE[this.items[key].level].getItem(item.storageKey);
        } else {
            return null;
        }
    };

    //外部接口函数。
    return function(prefix, options) {
        var oldConfig = JSON.parse(localStorage.getItem(prefix + '-lruconfig')) || {};
        oldConfig.maxAge = options.maxAge || oldConfig.maxAge;
        oldConfig.limit = options.limit || oldConfig.limit;
        oldConfig.limitSession = options.limitSession || oldConfig.limitSession;

        return new LruStorage(prefix, oldConfig);
    };


}, function () {

    function CacheItem(obj) {
        this.storageKey = obj.storageKey || '';
        this.maxAge = obj.maxAge || 0;
        this.level = obj.level || 'session';
    }
    CacheItem.fromJSON = function parse(str) {
        var ret = {};
        try {
            str = JSON.parse(str);

            ['storageKey', 'maxAge', 'level'].forEach(function (v) {
                this[v] = str[v];
            }, ret);
        } catch(e) {}
        return ret;
    };

    return CacheItem;
});
