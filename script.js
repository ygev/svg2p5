var cvd = function () {
    var output = '';  
    var that={};
    var oldFuncs;;
    
    var caller = function (prop) {
        return function () {
            var args = '',
                str = '';
            for (var i = 0; i < arguments.length; i++) {
                args += arguments[i];
                if (i !== arguments.length - 1) { args += ','; }
            }           
            str = 'ctx.' + prop + '(' + args + ');';
            output += str + '\n';           
        };
    };
    
    that.overrideFuncs = function () {
        oldFuncs = {};
        for (var prop in CanvasRenderingContext2D.prototype) {         
            if (CanvasRenderingContext2D.prototype.hasOwnProperty(prop)) {
                try {                   
                    var oldFunc = CanvasRenderingContext2D.prototype[prop];
                     if ((typeof oldFunc == 'function') &&  (prop !== 'createLinearGradient') &&  (prop !== 'createRadialGradient')) {                    
                        oldFuncs[prop] = oldFunc;
                        CanvasRenderingContext2D.prototype[prop] = caller(prop);
                    }
                }
                catch (e) {}
            }
        }
    }    
    
    that.restoreFuncs = function() {
        for (var key in oldFuncs) {
            if(oldFuncs.hasOwnProperty(key) ){
                CanvasRenderingContext2D.prototype[key] = oldFuncs[key];
            }
        }
    }
    
    that.logCommand = function(command) {
        output += command  + ';\n';  
    }
    that.getOutput = function() {return output;}
    
    that.clearOutput = function() { output = '';};
    return that;
}();      

// Jquery disgusting starts here


$(document).ready(function(){

    var canvas = $('#temp')[0],
              ctx = canvas.getContext('2d'),  
              canvas2 = $('#temp2')[0],
              ctx2 = canvas2.getContext('2d');  
               
          $('#clear-button').bind('click',function() {   
                  cvd.clearOutput();
                  $('#svg-input').val('');
                  $('#js-output').val('');
                  ctx2.clearRect(0,0,canvas2.width,canvas2.height); 
          });
          
          $('#convert-button').bind('click',function() {                 
                  var	str = $.trim( $('#svg-input').val())
                  if(!str.length) return;
                  $('#js-output').val('');
                  cvd.overrideFuncs();
                  cvd.clearOutput();
                  var	str = $.trim( $('#svg-input').val());
                  canvg('temp',  str);
           
        console.log(cvd.getOutput())
                  $('#js-output').val( 'var draw = function(ctx) {\n' + cvd.getOutput() + '};' );
                  cvd.restoreFuncs();
                  canvas2.width = canvas.width;
                   canvas2.height = canvas.height;
                  var fn = new Function('ctx',cvd.getOutput());
                  fn(ctx2);                                  
          });			 
});