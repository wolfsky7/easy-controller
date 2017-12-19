#读取注释
简单读取文件注释
##install

```sh
npm install easy-note
```

##examples
test.js
```js
/**测试配置
 * @autohr wolfs
 * @create 2016/8/30.
 */
 function test(){

    /**测试test1
     * @p1 p1是一个参数
     * @p2 p2是一个string
     *     补充描述
     */
    this.test1=function(o){

    }
 }

/**测试test2
 * @p3 p3是参数
 * @p4 @@{max:100,min:10,required:1} 这是测试
 */
 test.prototype.test2=function(){

 }

 module.exports=test;
 ```
 then
 ```js
 var parse=require('easy-note');
 var fs=require('fs');

        var file="./test.js";
        fs.readFile(file,'utf8',function(err,rs){
            if(err)
                return console.error(err);
            var rs=parse(rs);
            console.log(rs);
        })
 ```
 output
 ```js
{ __title: { __title: '测试配置', autohr: 'wolfs', create: '2016/8/30.' },
  test1: { __title: '测试test1', p1: 'p1是一个参数', p2: 'p2是一个string\n补充描述' },
  test2:
   { __title: '测试test2',
     p3: 'p3是参数',
     p4: '@@{max:100,min:10,required:1} 这是测试' } }
 ```

