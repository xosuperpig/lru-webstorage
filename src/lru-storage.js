/**
 * exports: function(key, options)
 * @param prefix       define a prefix of the keys in localStorage
 * @param options
 *      maxAge
 *      limit           item limited in localStorage, defaults to 10,
 *      limitSession    item limited in sessionStoage, defaults to Infinity
 *      -
 */

(function (LruStorageFactory, CacheItemFactory, LRUArrayFactory) {
    if (window.define && define.cmd) {
        define(function (r, e, module) {
            module.exports = LruStorageFactory(CacheItemFactory(), LRUArrayFactory());
        });
    } else {
        window.LruWebStorage = LruStorageFactory(CacheItemFactory(), LRUArrayFactory());
    }
})(function (CacheItem, LRUArray) {
    var STORAGE = {
        local: window.localStorage,
        session: window.sessionStorage
    };

    function LruStorage(prefix, options) {
        this.prefix = prefix;
        LruStorage.ATTRIBUTES.forEach(function(key) {
            this[key] = options[key];
        }, this);

        //keys
        this.items = LRUArray('storageKey');
        if (options._items) {
            options._items.forEach(function(v) {
                this.items.unshift(new CacheItem(v));
            }, this);
        }
    }
    LruStorage.ATTRIBUTES = ['maxAge', 'limit', 'limitSession'];

    LruStorage.prototype.set = function set(key, val, opt) {
        var item;
        //if there is no cacheItem storaged, create one
        if (!(item = this.items.find(key))) {
            item = new CacheItem({key: key, maxAge: Date.now() + this.maxAge});
            this.add(item, this.items, this.limit);
        }

        //save value
        STORAGE[item.level].setItem(this.prefix + '-' + item.storageKey, JSON.stringify(val));
        this.saveConfig();
        return this;
    };

    LruStorage.prototype.get = function get(key, opt) {
        var item;
        //check if there is a cacheItem storaged yet
        if (!(item = this.items.find(key))) return ({}).undefined;
        if (item.isStale()) {this.remove(this.items.indexOf(key)); return null;}

        return JSON.parse(STORAGE[item.level].getItem(this.prefix + '-' + item.storageKey));
    };

    LruStorage.prototype.remove = function(index) {
        var item = this.items.arr[index];
        STORAGE[item.level].removeItem(this.prefix + '-' + item.storageKey);
        if (index == this.items.length - 1) {
            this.items.pop();
        } else {
            this.items.splice(index, 1);
        }
        return this;
    };

    LruStorage.prototype.add = function(item) {
        //remove the last one when items out of limit
        while (this.items.length >= this.limit)  {
            this.remove(this.items.length - 1);
        }
        this.items.unshift(item);
        return this;
    };

    LruStorage.prototype.saveConfig = function saveConfig() {
        var jsonItems = [];
        this.items.forEach(function(v) {
            var citem = {};
            CacheItem.ATTRIBUTES.forEach(function(key) {
                citem[key] = v[key];
            });
            jsonItems.push(citem);
        });
        STORAGE.local.setItem(this.prefix + '-lruconfig', JSON.stringify({
            _items: jsonItems,
            maxAge: this.maxAge,
            limit: this.limit,
            limitSession: this.limitSession
        }));
    };

    return function(prefix, options) {
        var oldConfig = STORAGE.local.getItem(prefix + '-lruconfig') ? JSON.parse(STORAGE.local.getItem(prefix + '-lruconfig')) : {};
        options = options || {};

        oldConfig.maxAge = options.maxAge || oldConfig.maxAge || Infinity;
        oldConfig.limit = options.limit || oldConfig.limit || Infinity;
        oldConfig.limitSession = options.limitSession || oldConfig.limitSession || Infinity;

        return new LruStorage(prefix, oldConfig);
    };


}, function () {

    function CacheItem(obj) {
        this.storageKey = obj.storageKey || obj.key || '';
        this.maxAge = obj.maxAge || 0;
        this.level = obj.level || 'session';

        if (this.level != 'session' && this.level != 'local') {
            throw 'there is no webstorage interface named ' + this.level + 'Storage';
        }
    }
    CacheItem.ATTRIBUTES = ['storageKey', 'maxAge', 'level'];
    //create by a json string
    CacheItem.fromJSON = function parse(str) {
        var ret = {};
        try {
            str = JSON.parse(str);

            CacheItem.ATTRIBUTES.forEach(function (v) {
                this[v] = str[v];
            }, ret);
        } catch(e) {}
        return ret;
    };
    //check if out of date
    CacheItem.prototype.isStale = function isStale() {
        return Date.now() > this.maxAge;
    };

    return CacheItem;

}, function () {
    function LRUArray(idkey) {
        this.arr = [];
        this.idkey = typeof idkey == 'function' ? idkey : function(item) {return item[idkey];};

        var self = this;
        Object.defineProperty(this, 'length', {
            get: function() {
                return self.arr.length;
            },
            set: function() {

            }
        });
    }
    ['forEach', 'push', 'shift', 'unshift', 'pop', 'every', 'concat', 'splice'].forEach(function(key) {
        LRUArray.prototype[key] = function() {
            return this.arr[key].apply(this.arr, arguments);
        };
    });
    LRUArray.prototype.update = function (id) {
        var index = this.indexOf(id);
        if (index === -1) return;
        this.updateByIndex(index);
    };
    LRUArray.prototype.updateByIndex = function (index) {
        if (this.arr.length <= index || index == -1) return;
        var item = this.arr[index];
        this.arr.splice(index, 1);
        this.arr.unshift(item);
    };
    LRUArray.prototype.indexOf = function (id) {
        var ret = -1;
        //TODO improve the finding algorithm?
        this.every(function(item, index) {
            if (this.idkey(item) == id) {
                ret = index;
                return false;
            }
            return true;
        }, this);
        return ret;
    };
    LRUArray.prototype.find = function(key, silent) {
        var index = this.indexOf(key);
        var item = this.arr[index];
        if (!silent) {this.updateByIndex(index);}
        return item;
    };

    return function (key) {
        return new LRUArray(key);
    };
});
