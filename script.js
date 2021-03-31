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

// Canvas to P5
function canvasToP5(cvd){
    let p5cvd = cvd.getOutput()
        .replaceAll('ctx.','')
        .replaceAll('beginPath()','beginShape()')
        .replaceAll('closePath()','endShape()')
        .replaceAll('moveTo(','vertex(')
        .replaceAll('lineTo(','vertex(')
        .replaceAll('bezierCurveTo(','bezierVertex(')
        .replaceAll('lineCap','strokeCap()')
        .replaceAll('lineJoin','strokeJoin()')
        .replaceAll('clip()','drawingContext.clip()')
        .replaceAll('fillStyle','fill()')
        .replaceAll('save()','drawingContext.save()')
        .replaceAll('restore()','drawingContext.restore()')
        .replaceAll('lineWidth','strokeWeight()')
        .replaceAll('strokeStyle','stroke()')

    // split this into an array of strings, one per line
    var p5cvdArr = p5cvd.split('\n')

    for (let i = 0; i < p5cvdArr.length; i++){
        if (p5cvdArr[i].startsWith("miterLimit") || p5cvdArr[i].startsWith("fill();") || p5cvdArr[i].startsWith("stroke();") ){
            p5cvdArr.splice(i, 1);
            i--;
            continue; // we just erased the current element; go to next element now
        }

        if(p5cvdArr[i].startsWith("fill") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 1, p5cvdArr[i].indexOf(";"))
            p5cvdArr[i] = "fill(" + content.trim() + ")"
            // console.log(p5cvdArr[i]);
        }
        else if (p5cvdArr[i].startsWith("stroke(") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 1, p5cvdArr[i].indexOf(";"))
            p5cvdArr[i] = "stroke(" + content.trim() + ")"
            // console.log(p5cvdArr[i]);
        }
        else if (p5cvdArr[i].startsWith("strokeWeight") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 1, p5cvdArr[i].indexOf(";"))
            p5cvdArr[i] = "strokeWeight(" + content.trim() + ")"
            // console.log(p5cvdArr[i]);
        }
        else if (p5cvdArr[i].startsWith("strokeCap") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 3, p5cvdArr[i].indexOf(";") - 1)
            p5cvdArr[i] = "strokeCap(" + content.trim().toUpperCase() + ");"
            // console.log(p5cvdArr[i]);
        }
        else if (p5cvdArr[i].startsWith("strokeJoin") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 3, p5cvdArr[i].indexOf(";") - 1)
            p5cvdArr[i] = "strokeJoin(" + content.trim().toUpperCase() + ");"
            // console.log(p5cvdArr[i]);
        }

        if (p5cvdArr[i].startsWith("strokeCap(BUTT)")){
            p5cvdArr[i] = "strokeCap(PROJECT);"
        }
    }

    p5cvd = p5cvdArr.join('\n')

    return p5cvd;
}

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
           
                  cvd.restoreFuncs();
                  let p5cvd = canvasToP5(cvd)
                  $('#js-output').val(  p5cvd );  
                 
                  console.log(canvasToP5(cvd))                     
          });
});