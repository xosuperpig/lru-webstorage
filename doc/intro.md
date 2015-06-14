# 一个环保的webStorage使用方案: lru-webstorage

随着HTML5标准在各大浏览器的实现，localStorage的使用场景已经越来越多。然而直接使用原始的localStorage接口会有几个问题：
- 各浏览器下容量基本限制在 10M 以下。尽管已经很大了，但是当超出存储容量时，js会抛出DOM exception，可能导致程序错误。
- 相比cookie, 没有数据过期时间的概念, 容易形成"脏数据"一直存在用户的机器上，更容易导致问题1的出现。
- localStorage是以域名为单元进行存储，那么在一个域名下，就会有存储key重复的风险，可能导致页面出错。

lru-webstorage就是一个为了规避滥用localStorage可能带来的风险而编写的库，具有以下功能：
- 通过前缀管理storage
    - 在一个页面中使用类似lruStorage({prefix:'foo'})的方式建立属于这个页面的存储，减少冲突风险
    - 可以为一个前缀组指定上限，如lruStorage({prefix: 'foo', limit: 10})，让foo前缀的存储项限制在10条，多余的会被抛弃。

- sessionStorage与localStorage的升降级机制
    - 可以通过lruStorage({prefix:'foo', useSession:true})的方式用sessionStorage为localStorage提供缓冲区。
    - 在某个前缀组超过限制上限时，存储会被移动到sessionStorage，在当前会话中保持有效，尽管设置上限仍保证一定命中率。
    - 将limit设置为0即可纯粹使用sessionStorage

- 基于lru的淘汰机制
    - 库如其名, 通过lru(最后使用淘汰)决定存储项的淘汰, 保证最常使用的存储项的命中率

- 过期时间
    - 通过类似lruStorage({maxAge: 1000 * 3600})的方式为存储项添加过期时间，一旦超过时间，这个存储项将被抛弃。

- 复杂数据自动json化
    - 这个比较浅显，不多赘述

希望能通过这个库很好地维护localStorage资源，在经济发展的同时能够边污染边治理，人类只有一个地球，我们必须环保地生活......
