#简单的mvc controller
##install

```sh
npm install easy-controller
```

##examples
```js
var express = require('express');
var app = express();
var EasyController=require('easy-controller');
EasyController.config(app,{
    controlPath: './controller',//controller 的路径
    routeRules: ['/', '/:controller', '/:controller/:action'],//route 规则
});
```
test.js
```js
    function test(){};
    
    /* 
    @keyword @@{required:1}
    */
    test.proptotype.index=function *(o){
        return Pormise.resolve('hello world'+o.keyword)
    }

    module.exports=test;
```
url
```js
    localhost/controller/action?p1=1&p2=2
