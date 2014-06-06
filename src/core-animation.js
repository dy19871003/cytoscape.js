;(function($$, window){ 'use strict';
  
  $$.fn.core({
    
    addToAnimationPool: function( eles ){
      var cy = this;

      if( !cy.styleEnabled() ){ return; } // save cycles when no style used
      
      cy._private.aniEles.merge( eles );
    },

    startAnimationLoop: function(){
      var cy = this;

      if( !cy.styleEnabled() ){ return; } // save cycles when no style used

      var stepDelay = 1000/60;
      var useTimeout = false;
      var useRequestAnimationFrame = true;

      // don't execute the animation loop in headless environments
      if( !window ){
        return;
      }
      
      var requestAnimationFrame = $$.util.requestAnimationFrame;
      
      if( requestAnimationFrame == null || !useRequestAnimationFrame ){
        requestAnimationFrame = function(fn){
          window.setTimeout(function(){
            fn(+new Date());
          }, stepDelay);
        };
      }
      
      var containerDom = cy.container();
      
      function globalAnimationStep(){
        function exec(){
          requestAnimationFrame(function(now){
            handleElements(now);
            globalAnimationStep();
          }, containerDom);
        }
        
        if( useTimeout ){
          setTimeout(function(){
            exec();
          }, stepDelay);
        } else {
          exec();
        }
      }
      
      globalAnimationStep(); // first call
      
      function handleElements(now){
        now = +new Date();

        var eles = cy._private.aniEles;
        for( var e = 0; e < eles.length; e++ ){
          var ele = eles[e];
          
          // we might have errors if we edit animation.queue and animation.current
          // for ele (i.e. by stopping)
          // try{

            var current = ele._private.animation.current;
            var queue = ele._private.animation.queue;
            
            // if nothing currently animating, get something from the queue
            if( current.length === 0 ){
              var q = queue;
              var next = q.length > 0 ? q.shift() : null;
              
              if( next != null ){
                next.callTime = +new Date(); // was queued, so update call time
                current.push( next );
              }
            }
            
            // step and remove if done
            var completes = [];
            for(var i = 0; i < current.length; i++){
              var ani = current[i];
              step( ele, ani, now );

              if( current[i].done ){
                completes.push( ani );
                
                // remove current[i]
                current.splice(i, 1);
                i--;
              }
            }
            
            // call complete callbacks
            for( var i = 0; i < completes.length; i++ ){
              var ani = completes[i];
              var complete = ani.params.complete;

              if( $$.is.fn(complete) ){
                complete.apply( ele, [ now ] );
              }
            }
            
          // } catch(e){
          //   // do nothing
          // }
          
        } // each element
        
        
        // notify renderer
        if( eles.length > 0 ){
          cy.notify({
            type: 'draw',
            collection: eles
          });
        }
        
        // remove elements from list of currently animating if its queues are empty
        var elesToRemove = [];
        for( var i = 0; i < eles.length; i++ ){
          var ele = eles[i];
          var queue = ele._private.animation.queue;
          var current = ele._private.animation.current;
          var keepEle = current.length > 0 || queue.length > 0;
          
          if( !keepEle ){ // then remove from the array
            elesToRemove.push( ele );
          }
        }

        cy._private.aniEles.unmerge( elesToRemove );

      } // handleElements
        
      function step( self, animation, now ){
        var style = cy._private.style;
        var properties = animation.properties;
        var params = animation.params;
        var startTime = animation.callTime;
        var percent;
        
        if( animation.duration === 0 ){
          percent = 1;
        } else {
          percent = Math.min(1, (now - startTime)/animation.duration);
        }

        if( percent < 0 ){
          percent = 0;
        } else if( percent > 1 ){
          percent = 1;
        }
        
        if( properties.delay == null ){ // then update the position
          var startPos = animation.startPosition;
          var endPos = properties.position;
          var pos = self._private.position;
          if( endPos ){
            if( valid( startPos.x, endPos.x ) ){
              pos.x = ease( startPos.x, endPos.x, percent );
            }

            if( valid( startPos.y, endPos.y ) ){
              pos.y = ease( startPos.y, endPos.y, percent );
            }
          }

          if( properties.css ){
            var props = properties.css;
            for( var i = 0; i < props.length; i++ ){
              var name = props[i].name;
              var prop = props[i];
              var end = prop;

              var start = animation.startStyle[ name ];
              var easedVal = ease( start, end, percent );
              
              style.overrideBypass( self, name, easedVal );
            } // for props
          } // if 
        }
        
        if( $$.is.fn(params.step) ){
          params.step.apply( self, [ now ] );
        }
        
        if( percent >= 1 ){
          animation.done = true;
        }
        
        return percent;
      }
      
      function valid(start, end){
        if( start == null || end == null ){
          return false;
        }
        
        if( $$.is.number(start) && $$.is.number(end) ){
          return true;
        } else if( (start) && (end) ){
          return true;
        }
        
        return false;
      }
      
      function ease(startProp, endProp, percent){
        if( percent < 0 ){
          percent = 0;
        } else if( percent > 1 ){
          percent = 1;
        }

        var start = startProp.pxValue != null ? startProp.pxValue : startProp.value;
        var end = endProp.pxValue != null ? endProp.pxValue : endProp.value;

        if( $$.is.number(start) && $$.is.number(end) ){
          return start + (end - start) * percent;

        } else if( $$.is.number(start[0]) && $$.is.number(end[0]) ){ // then assume a colour
          var c1 = start;
          var c2 = end;

          var ch = function(ch1, ch2){
            var diff = ch2 - ch1;
            var min = ch1;
            return Math.round( percent * diff + min );
          };
          
          var r = ch( c1[0], c2[0] );
          var g = ch( c1[1], c2[1] );
          var b = ch( c1[2], c2[2] );
          
          return [r, g, b];
        }
        
        return undefined;
      }
      
    }
    
  });
  
})( cytoscape, typeof window === 'undefined' ? null : window );


  
    