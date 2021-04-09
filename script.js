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
                catch (e) {console.warn(e)}
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
function canvasToP5(cvd, rawSvg) {
    console.debug("p5cvd raw: " + JSON.stringify(cvd.getOutput()))
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
        .replaceAll('transform(','translate(')
        .replaceAll('quadraticCurveTo(','quadraticVertex(')

    let viewport = false;
    if (rawSvg.includes("svg width=")
        || rawSvg.includes("svg height=")
        || rawSvg.includes("svg width =")
        || rawSvg.includes("svg height =")
        || rawSvg.includes("svg viewbox=")
        || rawSvg.includes("svg viewbox =")
        ) {
        viewport = true;
    }

    let cleaned = cleanP5(p5cvd, viewport);
    return cleaned;

}

function cleanP5(p5cvd, viewport) {
    // split this into an array of strings, one per line
    var p5cvdArr = p5cvd.split('\n')

    let mostRecentVertex = 0;
    let beginShapeFound = false;

    console.debug("p5cvdArr")
    console.debug(p5cvdArr)
    for (let i = 0; i < p5cvdArr.length; i++){
        // console.debug("p5cvdArr: " + p5cvdArr[i]);
        if (p5cvdArr[i].startsWith("miterLimit") || p5cvdArr[i].startsWith("fill();") || p5cvdArr[i].startsWith("stroke();") || p5cvdArr[i].startsWith("drawingContext") || p5cvdArr[i].startsWith("translate(0,0)") || p5cvdArr[i].startsWith("scale(1,1)") ){
            p5cvdArr.splice(i, 1);
            i--;
            continue; // we just erased the current element; go to next element now
        }
        // Move whatever is () = inside the parentheses.
        if(p5cvdArr[i].startsWith("fill") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 1, p5cvdArr[i].indexOf(";"))
            p5cvdArr[i] = "fill(" + content.trim() + ")"
        }
        else if (p5cvdArr[i].startsWith("stroke(") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 1, p5cvdArr[i].indexOf(";"))
            p5cvdArr[i] = "stroke(" + content.trim() + ")"
        }
        else if (p5cvdArr[i].startsWith("strokeWeight") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 1, p5cvdArr[i].indexOf(";"))
            p5cvdArr[i] = "strokeWeight(" + content.trim() + ")"
        }
        else if (p5cvdArr[i].startsWith("strokeCap") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 3, p5cvdArr[i].indexOf(";") - 1)
            p5cvdArr[i] = "strokeCap(" + content.trim().toUpperCase() + ");"
        }
        else if (p5cvdArr[i].startsWith("strokeJoin") && p5cvdArr[i].includes("=")){
            let content = p5cvdArr[i].substring(p5cvdArr[i].indexOf("=") + 3, p5cvdArr[i].indexOf(";") - 1)
            p5cvdArr[i] = "strokeJoin(" + content.trim().toUpperCase() + ");"
        }
        if (p5cvdArr[i].startsWith("strokeCap(BUTT)")){
            p5cvdArr[i] = "strokeCap(PROJECT);"
        }
        // Remove adjacent duplicates 
        const remAdjDups = ([x, y, ...rest], out = []) =>
        {
            if (!rest.length)
                return (x === y) ? [...out, x] : [...out, x, y];
            else if (x === y)
                return remAdjDups([x, ...rest], out);
            else
                return remAdjDups([y, ...rest], [...out, x]);
        }
        p5cvdArr = remAdjDups(p5cvdArr.slice());

        // Ensure that lonely beginShape()s have an endShape() friend
        console.debug("examining element " + i + ": " + p5cvdArr[i]);
        if (!beginShapeFound  && p5cvdArr[i].startsWith("beginShape()")) {
            beginShapeFound = true;
            console.debug("found beginShape!")
        } else if (beginShapeFound) {
            if (p5cvdArr[i].startsWith("endShape()")) {
                console.debug("found endShape!")
                // nothing to do for this beginShape. reset state
                mostRecentVertex = 0;
                beginShapeFound = false;
            } else if (p5cvdArr[i].startsWith("vertex(")) {
                console.debug(`startsWith vertex`)
                mostRecentVertex = i;
            } else if (p5cvdArr[i].startsWith("bezierVertex(")) {
                console.debug(`startsWith bezierVertex`)
                mostRecentVertex = i;
            } else if (p5cvdArr[i].startsWith("quadraticVertex(")) {
                console.debug(`startsWith quadraticVertex`)
                mostRecentVertex = i;
            } else if (p5cvdArr[i].startsWith("beginShape()")) {
                console.debug("beginShape missing endShape()")
                // beginShape missing endShape()
                if (mostRecentVertex != 0) {
                    // if we had found vertex() or bezierVertex or quadraticVertex, append it to the most recent one
                    p5cvdArr.splice(mostRecentVertex + 1, 0, "endShape()");
                } else {
                    // else, just insert here
                    p5cvdArr.splice(i + 1, 0, "endShape()");
                }

                // move past current element (we added to the array, so update the pointer)
                i++;
                // finally, reset state
                mostRecentVertex = 0;
            }
        }

    } // end for loop

    // We traversed the whole array and there's still a lonely beginShape. Put an endShape at the end.
    if (beginShapeFound) {
        // beginShape missing endShape()
        if (mostRecentVertex != 0) {
            // if we had found vertex() or bezierVertex, append it to the most recent one
            p5cvdArr.splice(mostRecentVertex + 1, 0, "endShape()");
        } else {
            // else, just put on the end
            p5cvdArr.push("endShape()");
        }
    }

    // If the svg viewport was defined, canvg will create an extra box around the object... get rid of it:
    if (viewport) {
        let start = -1, end = -1;
        start = p5cvdArr.indexOf("beginShape();");
        end = p5cvdArr.indexOf("endShape();");
        if (start != -1 && end != -1) {
            p5cvdArr.splice(start, end - start + 1);
        }
    }

    let cleanedP5 = p5cvdArr.join('\n')
    return cleanedP5;
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
                  let p5cvd = canvasToP5(cvd, str)
                  $('#js-output').val(  p5cvd );  
                 
          });
          
          $("#copy-button").click(function(){
            $("#js-output").select();
            document.execCommand('copy');
            document.getElementById("copy-button").innerHTML = "Copied!";
            document.getElementById("copy-button").style.color = "var(--white)";
            document.getElementById("copy-button").style.background = "var(--black)";
            setInterval(function() {
                document.getElementById("copy-button").innerHTML = "Copy";
                document.getElementById("copy-button").style.color = "var(--black)";
                document.getElementById("copy-button").style.background = "var(--white)";
              }, 3000);
        });
});


// TODO
// Kill Clear button, it's unnecessary.
// SVG Button disabled by default, P5 Button disabled by default
// If no text inside SVG Textarea, keep buttons disabled.
// If text inside SVG, but invalid, display error message and keep buttons disabled.
// If text inside SVG and valid, make buttons enabled.
// Upon clicking convert, if there is no text inside p5 textarea, display error