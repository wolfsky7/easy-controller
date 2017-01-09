//basecontroller

var fs = require('fs')
    ,path=require('path')
    ,u=require('url')
    ,basec=require('./basecontroller')
    ,domain=require('domain')
    ,_controls={};

var EasyNote=require('../easy-note');
var EasyCheck=require('../easy-check');

function route_action(dir,file){
    file = file.replace('.js', '').toLowerCase();
    var d='./../../'+dir.replace(/\\/g,'/')+'/'+file;

    var controller = require(d);
    if(typeof controller!="function")
        return;
    controller._amap={};
    //映射 action
    var _c=new controller();
    for(var a in _c){
        if(typeof  _c[a]=="function")
            controller._amap[a.toLowerCase()]=a;
    }

    basec.call(controller.prototype);
    for(var a in basec.prototype){
        controller.prototype[a]=controller.prototype[a]||basec.prototype[a];
    }
    _controls[file]=controller;

    //读取注释
    controller._checks=[];

    fs.readFile(path.join(dir,file+'.js'),'utf8',function(err,con){
        var note=EasyNote(con);
        //controller._checkMap
        if(file=="order_admin"){
            console.log(file);
        }
        console.log("-->"+file+"\n"+JSON.stringify(note));
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
                        ruleDesc=JSON.parse(/\{.*?:.*?\}/.exec(ruleDesc)[0].replace(/,/g,'","').replace(/\{/,'{\"').replace(/\}/,'\"}').replace(/:/g,'":"'));
                        ruleDesc.key=ruleDesc.key||f;
                        rules.push(ruleDesc);
                    }
                    catch (e){
                        console.error(e);
                    }
                }
                controller._checks[a]=rules;
            }
        }
    })
}

function route_controller(dir){
    // console.log('controller:'+dir)
    fs.readdir(dir, function (err, names) {
        if (err) return console.error(err);

        for (var a in names) {
            var c = names[a], s = '';
            if (c.lastIndexOf('.js') > -1)
                route_action(dir,c);
            else {
                if (c.indexOf('.') <0) {
                    c = path.join(dir, c);
                    route_controller(c);
                }
            }
        }
    })
}

//先  actionbefore 在 use
module.exports =easyController={
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
    _handleMiddle:function(c,q,cb){
        if(!this._middles.length)
            return cb();

        var n,v,me=this;
        function one() {
            v = n.next();
            if (!v.done) {
                v.value(c,q,function (err) {
                    if(err)
                        return cb(err),n=null;
                    one()
                });
            }
            else{
                cb();
            }
        }


        function *any(){
            for(var a=0;a<me._middles.length;a++) {
                yield me._middles[a];
            }
        };

        n=any();
        one();
    },
    actionBefore:function(q,c,next){
        this.debug(c.controllerName+'.'+c.currentionAction);
        next();
    },
    actionEnd:function(){

    },
    action:function(){

    },
    config: function (app,opts) {
        var me=this;
        opts=opts||{};
        for(var a in opts){
            basec.prototype[a]=opts[a];
        }
        route_controller(opts.controlPath||'./controller');


        if(!opts.routeRules){
            opts.routeRules=['/','/:controller','/:controller/:action'];
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

        var cn=req.params.controller||'home',a=(req.params.action||'index').toLowerCase();
        me.debug("req-"+cn+"...a:"+a);
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
                    //if(!_control.res.headersSent)
                    me.error(error,res);
                });
                return d.run(function(){
                    process.nextTick(function(){
                        _control._init(req,res,cn, a);
                        //middle
                        me.actionBefore(q,_control,function(){
                            if (_control["actionBefore"]) {
                                return _control["actionBefore"](q, function() {
                                    me._handleMiddle(_control,q,function(err){
                                        if(err){
                                            return _control.baseErr(err);
                                        }
                                        return _control[a](q);
                                    })
                                })
                            } else {
                                me._handleMiddle(_control,q,function(err){
                                    if(err){
                                        return _control.baseErr(err);
                                    }
                                    return _control[a](q);
                                })
                            }
                        });

                    });
                });
            }
        }
        me.debug("req unfind");
        return next();
    }
};

easyController.use(function(c,q,cb){
    var cfun=_controls[c.controllerName],
        action=c.currentionAction;

    var rules=cfun._checks[action];
    EasyCheck.checkFields(q||{},rules,function(err){
        cb(err);
    })
});