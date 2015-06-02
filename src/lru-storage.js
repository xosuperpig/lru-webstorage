/**
 * exports: function(key, options)
 * @param prefix       define a prefix of the keys in localStorage
 * @param options
 *      maxAge
 *      limit           item limited in localStorage, defaults to 0(so all item will be saved in sessionStorage)
 *      useSession      when an item is staled, detemine whether drop it or move it to sessionStorage, defaults to true
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
        this.onStale = options.onStale;

        //keys
        this.items = LRUArray('storageKey');
        if (options._items) {
            options._items.forEach(function(v) {
                this.items.unshift(new CacheItem(v));
            }, this);
        }
    }
    LruStorage.ATTRIBUTES = ['maxAge', 'limit', 'useSession'];

    LruStorage.prototype.set = function set(key, val, opt) {
        var item;
        //if there is no cacheItem storaged, create one
        if (!(item = this.items.find(key))) {
            item = new CacheItem({key: key, maxAge: Date.now() + this.maxAge});
            this.add(item);
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

        if (typeof this.onStale == 'function') {
            if (this.onStale(JSON.parse(STORAGE[item.level].getItem(this.prefix + '-' + item.storageKey)), this.useSession)) return;
        }
        // console.log(this.useSession, index);
        if (this.useSession) {
            if (item.level == 'local') {
                item.level = 'session';
                STORAGE.local.removeItem(this.prefix + '-' + item.storageKey);
                STORAGE.session.setItem(this.prefix + '-' + item.storageKey, STORAGE.local.getItem(this.prefix + '-' + item.storageKey));
            }

        } else {
            STORAGE[item.level].removeItem(this.prefix + '-' + item.storageKey);
            if (index == this.items.length - 1) {
                this.items.pop();
            } else {
                this.items.splice(index, 1);
            }
        }
        return this;
    };

    LruStorage.prototype.add = function(item) {
        //remove the last one when items out of limit
        if (this.items.length >= this.limit && this.items.length > 0)  {
            // console.log(this.items.length, this.limit);
            for(var i = Math.max(0, this.limit - 1); i < this.items.length; i++) {
                this.remove(i);
            }
        }
        this.items.unshift(item);
        return this;
    };

    LruStorage.prototype.saveConfig = function saveConfig() {
        var json = {_items: []};
        //stringify all items and config
        this.items.forEach(function(v) {
            var citem = {};
            CacheItem.ATTRIBUTES.forEach(function(key) {
                citem[key] = v[key];
            });
            json._items.push(citem);
        }, this);
        LruStorage.ATTRIBUTES.forEach(function(attr) {
            json[attr] = this[attr];
        }, this);
        STORAGE.local.setItem(this.prefix + '-lruconfig', JSON.stringify(json));
    };

    return function(prefix, options) {
        var oldConfig = STORAGE.local.getItem(prefix + '-lruconfig') ? JSON.parse(STORAGE.local.getItem(prefix + '-lruconfig')) : {};
        options = options || {};

        oldConfig.maxAge = options.maxAge || oldConfig.maxAge || Infinity;
        oldConfig.limit = options.limit || oldConfig.limit || 0;
        oldConfig.useSession = ('useSession' in options) ? options.useSession : (('useSession' in oldConfig) ? oldConfig.useSession : true);
        oldConfig.onStale = options.onStale || null;

        return new LruStorage(prefix, oldConfig);
    };


}, function () {

    function CacheItem(obj) {
        this.storageKey = obj.storageKey || obj.key || '';
        this.maxAge = obj.maxAge || 0;
        this.level = obj.level || 'local';

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
