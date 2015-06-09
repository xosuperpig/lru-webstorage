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
    var STORAGE = {
        local: window.localStorage,
        session: window.sessionStorage
    };

    if (window.define && define.cmd) {
        define(function (r, e, module) {
            module.exports = LruStorageFactory(
                STORAGE,
                CacheItemFactory(STORAGE),
                LRUArrayFactory()
            );
        });
    } else {
        window.LruWebStorage = LruStorageFactory(
            STORAGE,
            CacheItemFactory(STORAGE),
            LRUArrayFactory()
        );

        //for test
        window.LruWebStorage.CacheItem = CacheItemFactory(STORAGE);
        window.LruWebStorage.LRUArray = LRUArrayFactory();
    }
})(function (STORAGE, CacheItem, LRUArray) {

    function LruStorage(prefix, options) {

        this.prefix = prefix;

        LruStorage.ATTRIBUTES.forEach(function(key) {
            this[key] = options[key];
        }, this);

        //keys
        this.lruarray = LRUArray('storageKey');

        //reset all level after sort
        this.lruarray.onSort(function () {
            for (var i = 0; i < this.lruarray.length; i++) {
                if (this.lruarray.get(i).isStale()) {
                    this.lruarray.remove(i);
                    i--;

                } else if (i < this.limit) {
                    this.lruarray.get(i).level = 'local';

                } else if (this.useSession) {
                    this.lruarray.get(i).level = 'session';

                } else {
                    this.lruarray.remove(i);
                    i--;
                }
            }
        }, this);

        if (options._items) {
            options._items.forEach(function(v) {
                var ci = new CacheItem(v);
                if (ci.isValid()) {
                    this.lruarray.unshift(ci);
                }
            }, this);
        }
    }
    LruStorage.ATTRIBUTES = ['maxAge', 'limit', 'useSession'];
    LruStorage.prototype.set = function set(key, val) {
        var item;
        if (!this.get(key)) {
            item = new CacheItem({storageKey: this.prefix + '-' + key, maxAge: Date.now() + this.maxAge, level: 'local'});
            // console.log('unshift');
            this.lruarray.unshift(item);
        } else {
            item = this.lruarray.find(key);
        }
        //save value
        item.val = val;
        this.saveConfig();
        return this;
    };

    LruStorage.prototype.get = function get(key) {
        var item, index;
        key = this.prefix + '-' + key;
        //check if there is a cacheItem storaged yet
        if ((index = this.lruarray.indexOf(key)) == -1) return ({}).undefined;
        item = this.lruarray.get(index);
        if (item.isStale()) {this.lruarray.remove(index); return null;}

        return item.val;
    };
    LruStorage.prototype.saveConfig = function saveConfig() {
        var json = {_items: []};
        //stringify all items
        this.lruarray.forEach(function(v) {
            json._items.push(v.toJSON());
        }, this);

        //stringify config
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
}, function (STORAGE) {

    function CacheItem(obj) {
        Object.keys(CacheItem.DESCRIPTORS).forEach(function (key) {
            Object.defineProperty(this, key, CacheItem.DESCRIPTORS[key](obj));
        }, this);
        Object.defineProperty(this, 'val', {
            //save value to the webstorage
            set: function (val) {
                this.lastuse = Date.now();
                // console.log(val);
                STORAGE[this.level].setItem(this.storageKey, JSON.stringify(val));
            },

            //load value from the webstorage
            get: function () {
                this.lastuse = Date.now();
                return JSON.parse(STORAGE[this.level].getItem(this.storageKey));
            }
        });
    }
    CacheItem.DESCRIPTORS = {

        storageKey: function(obj) {
            if (!obj.storageKey && !obj.key) throw 'CacheItem must has a storageKey';
            return {
                value: obj.storageKey || obj.key
            };
        },

        maxAge: function(obj) {
            return {
                value: obj.maxAge || Infinity
            };
        },

        //every time the level is changed, storage will be updated
        level: function(obj) {
            var level = obj.level != 'session' && obj.level != 'local' ? 'session' : obj.level;
            return {
                set: function(lvl) {
                    if (level && (lvl == 'local' || lvl == 'session') && level != lvl) {
                        var temp = this.destroy();
                        level = lvl;
                        this.val = temp;
                    }
                },
                get: function() {
                    return level;
                }
            };
        },

        lastuse: function(obj) {
            var lastuse = obj.lastuse || Date.now();
            return {
                set: function(v) {
                    lastuse = v;
                },
                get: function() {
                    return lastuse;
                }
            };
        }
    };

    //create by a json string
    // CacheItem.fromJSON = function parse(str) {
    //     try {
    //         str = JSON.parse(str);
    //     } catch(e) {
    //         console.error('CacheItem.fromJSON: ', e);
    //     }
    //     return new CacheItem(str);
    // };

    // export a json string
    CacheItem.prototype.toJSON = function toJSON() {
        var obj = {};
        Object.keys(CacheItem.DESCRIPTORS).forEach(function (key) {
            obj[key] = this[key];
        }, this);

        return JSON.stringify(obj);
    };

    //check if out of date
    CacheItem.prototype.isStale = function isStale() {
        // console.log(this.val, this.maxAge, Date.now() > this.maxAge);
        return Date.now() > this.maxAge;
    };

    CacheItem.prototype.isValid = function isValid() {
        return !!this.val;
    };

    CacheItem.prototype.destroy = function destroy() {
        var val = this.val;
        STORAGE[this.level].removeItem(this.storageKey, val);
        return val;
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

        this.sortTimer = null;
    }
    ['forEach', 'every'].forEach(function(key) {
        LRUArray.prototype[key] = function() {
            return this.arr[key].apply(this.arr, arguments);
        };
    });
    ['push', 'shift', 'unshift', 'pop', 'concat'].forEach(function(key) {
        LRUArray.prototype[key] = function() {
            this.resort();
            return this.arr[key].apply(this.arr, arguments);
        };
    });
    // LRUArray.prototype.update = function (id) {
    //     var index = this.indexOf(id);
    //     if (index === -1) return;
    //     this.updateByIndex(index);
    // };
    // LRUArray.prototype.updateByIndex = function (index) {
    //     if (this.arr.length <= index || index == -1) return;
    //     var item = this.arr[index];
    //     this.arr.splice(index, 1);
    //     this.arr.unshift(item);
    // };
    LRUArray.prototype.remove = function (index) {
        this.arr.splice(index, 1);
    };
    LRUArray.prototype.get = function (index) {
        return this.arr[index];
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
        this.resort();
        return ret;
    };
    LRUArray.prototype.find = function(key) {
        var index = this.indexOf(key);
        var item = this.arr[index];
        return item;
    };
    LRUArray.prototype.resort = function () {
        var self = this;
        if (!this.sortTimer) {
            this.sortTimer = setTimeout(function () {
                self.arr.sort(function (a, b) {
                    return b.lastuse - a.lastuse;
                });
                self._onSort && self._onSort();
                self.sortTimer = null;
            }, 0);
        }
    };
    LRUArray.prototype.onSort = function (fn, context) {
        if(typeof fn == 'function') {
            this._onSort = function () {
                fn.apply(context, arguments);
            };
        }
    };

    return function (key) {
        return new LRUArray(key);
    };
});
