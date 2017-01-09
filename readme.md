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
EasyController.config(app);
```
url
```js
    localhost/controller/action?p1=1&p2=2
