angular.module('atlasEditor')
.directive( 'freeMovePaper', ['$interval',  function ( $interval ) {
    function link ( scope, element, attrs ) {
        // initialize
        var canvasEL = element[0];
        canvasEL.width = canvasEL.parentNode.clientWidth;
        canvasEL.height = canvasEL.parentNode.clientHeight;

        // windows event
        var resizeEventID = window.addEventListener('resize', function() {
            scope.resize( canvasEL.parentNode.clientWidth, canvasEL.parentNode.clientHeight );
        }, false);

        // canvas event
        canvasEL.oncontextmenu = function() { return false; };

        canvasEL.ondragenter = function() {
            scope.$emit('dragenter');
        };

        canvasEL.ondragover = function() {
            scope.$emit('dragover');
        };

        canvasEL.ondragleave = function() {
            scope.$emit('dragleave');
        };

        canvasEL.ondrop = function() {
            scope.$emit('drop');
        };

        // zoom in / out
        // https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel
        canvasEL.onwheel = function () {
            var zoom = scope.zoom;
            if( event.deltaY < 0 ) {
                zoom += 0.1;
                zoom = Math.min(zoom, 8);
            }
            else {
                zoom -= 0.1;
                zoom = Math.max(zoom, 0.1);
            }
            scope.setZoom(zoom);
        };

        // init scope 
        scope.resize = function ( width, height ) {
            canvasEL.width = width;
            canvasEL.height = height;

            // resize
            var view = scope.project.view;
            view.viewSize = [view.element.width, view.element.height];

            scope.repaint();
        };

        scope.repaint = function () {
            scope.project.activate();
            scope.$emit('paint');
            scope.project.view.update();
        };

        var promise = null;
        scope.setZoom = function (zoom) {
            // TODO: smooth zoom
            // var src = scope.zoom;
            // var dest = zoom;
            // var totalSeconds = 0.0;
            // if ( promise !== null ) {
            //     $interval.cancel(promise);
            //     promise = null;
            // }
            // promise = $interval( function () {
            //     totalSeconds += 0.01;
            //     var ratio = totalSeconds/0.2;
            //     var curZoom = src + (dest - src) * ratio;

            //     var center = scope.project.view.center;
            //     var offset = scope.rootLayer.position.subtract(center);
            //     var newOffset = offset.divide(scope.zoom).multiply(curZoom);
            //     scope.rootLayer.position = center.add(newOffset).round();
            //     scope.zoom = curZoom;

            //     if ( totalSeconds > 0.2 ) {
            //         $interval.cancel(promise);
            //     }
            // }, 10 );

            var center = scope.project.view.center;
            var offset = scope.rootLayer.position.subtract(center);
            var newOffset = offset.divide(scope.zoom).multiply(zoom);
            scope.rootLayer.position = center.add(newOffset).round();
            scope.zoom = zoom;
            scope.$apply();
        };

        scope.$on( 'centerViewport', function ( event, width, height ) {
            var size = scope.project.view.viewSize;
            var x = Math.round((size.width - width) * 0.5);
            var y = Math.round((size.height - height) * 0.5);
            scope.rootLayer.position = [x,y];
        });

        scope.$on ( 'repaint', function ( event, repaintAll ) {
            if ( repaintAll ) {
                scope.repaint();
            }
            else {
                // repaint only parent
                scope.project.activate();
                scope.$emit('paint');
                scope.project.view.update();
            }
        });

        scope.$on('$destroy', function () {
            window.removeEventListener(resizeEventID);
        });

        // init 
        paper.setup(canvasEL);
        scope.project = paper.project;
        scope.project.view.viewSize = [canvasEL.width, canvasEL.height]; // to prevent canvas resizing during paper.setup

        scope.project.activate();
        if ( scope.project.activeLayer !== null ) {
            scope.project.activeLayer.remove();
        }
        scope.rootLayer = PaperUtils.createLayer();
        scope.project.layers.push(scope.rootLayer);
        scope.$emit( 'initPaper', scope.project, scope.rootLayer );
        scope.repaint();


        //
        var tool = new paper.Tool();
        tool.onMouseDrag = function (event) {
            var rightButtonDown = event.event.which === 3;
            rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
            if (rightButtonDown) {
                // drag viewport
                scope.rootLayer.position = scope.rootLayer.position.add(event.delta);
                return false;
            }
        };
        // tool.onMouseDown = function (event) {
        //     // if (event.event.which === 1) {
        //     //     if ((!event.item || event.item.layer !== this._atlasLayer) && !(event.modifiers.control || event.modifiers.command)) {
        //     //         _clearSelection(this);
        //     //         return false;
        //     //     }
        //     // }
        // };
        // tool.onMouseUp = function (event) {
        //     // if (event.event.which === 1) {
        //     //     this._atlasDragged = false;
        //     //     return false;
        //     // }
        // };
    }

    return {
        restrict: 'E',
        replace: true,
        scope: {
            zoom: '=',
        },
        template: '<canvas></canvas>',
        link: link,
    };
}]);
