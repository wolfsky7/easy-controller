/**
 * Created by wolfs on 2015/12/1.
 */

function BaseController(){
    this.currentionAction='';

    this._init=function(req,res,controller,action){
        this.req=req;
        this.res=res;
        this.currentionAction=action;
        this.controllerName=controller;
        // console.log("ca init ");
    }
    this.baseRender=function(){
        this.currentState='end';
        var r=arguments[0],o=arguments[1];

        o=(typeof r=="string")?o:r;
        r=(typeof r=="string")?r:this.controllerName+"/"+this.currentionAction;

        this.res.render(r,o);
    }



    this.actionEnd=function(){

    }

    var _currentState='';
    Object.defineProperty(this,'currentState',{
        get:function(){
            return _currentState;
        },
        set:function(v){
            if(v!=_currentState){
                _currentState=v;
                v=="end"&&this.actionEnd();
            }
        }
    })
    return this;
}

BaseController.prototype.baseSucc=function(opts){
    this.currentState='end';
    if(typeof opts=="object"){
        opts.state=0;
    }
    else{
        opts={state:0,data:opts};
    }
    return this.res.json(opts);
}

BaseController.prototype.baseErr=function(msg,code){
    this.currentState='end';
    var opts={state:code||1,msg:typeof msg=="object"?msg.message:msg};
    return  this.res.json(opts);
}

module.exports=BaseController;




