# simple usage:
```js
lru = LruWebStorage('test'); //data will be storaged as 'test-xxx' in webStorage
lru.set('foo', 1);
lru.get('foo');//1
lru.get('bar');//undefined
```

## maxAge:
```js
lru = LruWebStorage('testStale', {maxAge: -1 * 6000});
lru.set('a', 1);
lru.get('a');//null
```

## lru:
```js
lru = LruWebStorage('testLimit', {limit: 2, useSession: false});
lru.set('a', 1);
lru.set('b', 2);
lru.get('a');
lru.set('c', 3);

lru.get('c');//3
lru.get('b');//undefined
lru.get('a');//1
```
 
