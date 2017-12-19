//basecontroller

var fs = require('fs')
    ,path=require('path')
    ,u=require('url')
    ,basec=require('./basecontroller')
    ,domain=require('domain')
    ,_controls={}
    ,co=require('co');

var EasyNote=require('easy-note');
var EasyCheck=require('easy-check');

function *executeFunc(m,c,q){
    if(c[m].constructor.name=='GeneratorFunction'){
        return yield c[m](q);
    }
    else{
        c[m](q);
        return Promise.reject(-1);
    }
}


/* 读取方法 */
function route_action(dir,file,callback){
    file = file.replace('.js', '').toLowerCase();
    var d='./../../'+dir.replace(/\\/g,'/')+'/'+file;

    var controller;
    try{
        controller=require(d);
    }
    catch(err){
        return callback(err);
    }; 
    if(typeof controller!="function")
        return callback("no controller");
    controller._amap={};
    //映射 action
    var _c=new controller();
    for(var a in _c){
        if(typeof  _c[a]=="function")
            controller._amap[a.toLowerCase()]=a;//easyController.debug(a);
    }

    basec.call(controller.prototype);
    for(var a in basec.prototype){
        controller.prototype[a]=controller.prototype[a]||basec.prototype[a];
    }
    // _controls[file]=controller;
    callback(null,file,controller);

    //读取注释
    controller._checks=[];

    fs.readFile(path.join(dir,file+'.js'),'utf8',function(err,con){
        //字段的自动验证
        var note=EasyNote(con);
        //controller._checkMap
        var reg=/@@\{.*?\}/;
        for(var a in note){
            var rules=[];
            if(a!="__title"){
                for(var f in note[a]){
                    var ruleDesc=note[a][f]&&reg.exec(note[a][f]);

                    ruleDesc=ruleDesc?ruleDesc[0]:null;
                    if(!ruleDesc)
                        continue;
                    try{
                        let _desc=/\{.*?:.*?\}/.exec(ruleDesc)[0].replace(/,/g,'","').replace(/\{/,'{\"').replace(/\}/,'\"}').replace(/:/g,'":"').replace('"[','["').replace(']"','"]');

                        ruleDesc=JSON.parse(_desc);
                        ruleDesc.key=ruleDesc.key||f;
                        rules.push(ruleDesc);
                    }
                    catch (e){
                        easyController.error(e);
                    }
                }
                controller._checks[a]=rules;
            }
        }
    })
}


/* 读取controller */
function route_controller(dir,callback){
    fs.readdir(dir, function (err, names) {
        if (err) return callback(err);

    
        for (var a in names) {
            var c = names[a], s = '';
            if (c.substr(-3,3)=='.js')
                callback(null,dir,c);
            else {
                if (c.indexOf('.') <0) {
                    c = path.join(dir, c);
                    route_controller(c,callback);
                }
            }
        }
    })
}

//先  actionbefore 在 use
var easyController={
    controls:_controls,
    rules:{},
    debug:function(info){
        console.log(info);
    },
    error:function(info){
        console.error(info);
    },
    _middles:[],
    use/*加入中间件*/:function(middleFunction){
        this._middles.push(middleFunction);
    },
    _handleMiddle:function *(q,c){

        if(!this._middles.length)
            return Promise.resolve();

        var n,v,me=this;
        for(var a=0;a<me._middles.length;a++) {
            yield me._middles[a](c,q);
        }

        return Promise.resolve();
        
    },
    actionBefore:function *(q,c){
        this.debug(c.controllerName+'.'+c.currentionAction);
        return Promise.resolve();
    },
    actionEnd:function *(rs){
        return Promise.resolve(rs);
    },
    action:function(){

    },
    controls:{},
    controlsApis:[],
    getController:function(controlPath){
        var me=this;
        return new Promise((succ,fail)=>{
            var s=0,f=0,ts=0;
            route_controller(controlPath||'./controller',function(err,dir,c){
                if(err)
                    return  me.error(err);
                s++;
                route_action(dir,c,function(err,file,controller){
                    if(err)
                        return me.error(err),s--;
                    f++;
                    me.controls[file]=controller;
                    for(var api in controller._amap){
                        me.controlsApis[file+"/"+api]={
                            c:controller,
                            a:controller._amap[api]
                        };
                    }

                    ts&&clearTimeout(ts);
                    ts=setTimeout(function(){
                        if(s==f){
                            succ();
                        }
                    },100)
                });
            });
        })

    },
    config: function (app,opts) {
        var me=this;
        opts=opts||{};
        for(var a in opts){
            basec.prototype[a]=opts[a];
        }
        this.getController(opts.controlPath||'./controller');


        if(!opts.routeRules){
            opts.routeRules=['/','/:controller','/:controller/:action','/:controller/:action/:id'];
        }
        for(var a in opts.routeRules){
            app.all(opts.routeRules[a],function(req,res,next){
                me.route(req,res,next);
            })
        }

        return this;
    },
    route:function(req,res,next){/*分拆url*/
        var me=this;
        me.debug("req-url-------->"+req.url);
        var aim=u.parse(req.url), c,q=aim.query;
        if(q){
            var qs= q.split('&'), k, v,n;
            q={};
            for(var a  in qs){
                n=qs[a].indexOf('=');
                k=qs[a].substr(0,n);
                v=qs[a].substr(n+1);
                q[k]=decodeURIComponent(v);
            }
        }
        q=q||{};
        for(var p in req.body){
            q[p]=req.body[p];
        }
        for(var a in req.params){
            if(a!="controller"&&a!="action"){
                q[a]=req.params[a];
            }
        }

        var cn=req.params.controller||'home',a=(req.params.action||'index').toLowerCase();
        me.debug("query:"+JSON.stringify(q));
        if(cn&&me.controls[cn]) {
            c=me.controls[cn];
            a=c._amap[a];
            var _control = new c();
            if(_control[a]){
                var d=domain.create();
                d.add(_control);
                d.add(req);
                d.add(res);
                d.on('error',function(error){
                    // me.error(error);
                    if(!_control.res.headersSent)
                        return _control.baseErr(error);
                    me.error(error,res);
                });
                return d.run(function(){
                    process.nextTick(function(){
                        //middle
                        co(function *(){
                            _control._init(req,res,cn, a);
                            yield me._handleMiddle(q,_control);
                            yield me.actionBefore(q,_control);

                            if (_control["actionBefore"])
                                yield _control['actionBefore'](q);
                                try{
                                    var rs=yield executeFunc(a,_control,q);
                                    me.actionEnd(null,rs,q,_control);
                                }
                                catch(e){
                                    me.actionEnd(e,null,q,_control);
                                }
                           
                        }).catch(err=>{
                            me.actionEnd(err,null,q,_control);
                        })
                    });
                });
            }
        }
        me.debug("req unfind");
        return next();
    }
};


module.exports =function(){
    var obj={};

    for(var a in easyController){
        var t=typeof easyController[a];
        if(t=="function")
            obj[a]=easyController[a];
        if(t=="object"){
            if(easyController[a] instanceof Array){
                obj[a]=[];
            }
            else{
                obj[a]={};
            }
        }
    }

    obj.use(function(c,q){
        var cfun=obj.controls[c.controllerName],
            action=c.currentionAction;

        var rules=cfun._checks[action];
        EasyCheck.checkFields(q||{},rules)
    });

    return obj;
}