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
        scope.zoom = 1.0;
        scope.resize = function ( width, height ) {
            canvasEL.width = width;
            canvasEL.height = height;

            // resize
            var view = scope.project.view;
            var oldSize = view.viewSize;

            view.viewSize = [width, height];
            scope.sceneLayer.position = [ 
                scope.sceneLayer.position.x * (width/oldSize.width), 
                scope.sceneLayer.position.y * (height/oldSize.height)
            ];

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
            //     var offset = scope.sceneLayer.position.subtract(center);
            //     var newOffset = offset.divide(scope.zoom).multiply(curZoom);
            //     scope.sceneLayer.position = center.add(newOffset).round();
            //     scope.zoom = curZoom;

            //     if ( totalSeconds > 0.2 ) {
            //         $interval.cancel(promise);
            //     }
            // }, 10 );

            if ( scope.zoom != zoom ) {
                scope.zoom = zoom;
                scope.rootLayer.scaling = [zoom, zoom];
                scope.project.view.update();
                scope.$emit('zoomChanged');
            }
        };

        scope.setPos = function ( x, y ) {
            scope.sceneLayer.position = [x, y];
        };

        scope.$on( 'moveTo', function ( event, x, y ) {
            scope.setPos(x,y);
        });

        scope.$on( 'zoom', function ( event, zoom ) {
            scope.setZoom(zoom);
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

        var viewSize = new paper.Size(canvasEL.width, canvasEL.height);

        // init 
        paper.setup(canvasEL);
        scope.project = paper.project;
        scope.project.view.viewSize = viewSize; // to prevent canvas resizing during paper.setup

        scope.project.activate();

        // rootLayer
        scope.rootLayer = scope.project.activeLayer;
        scope.rootLayer.applyMatrix = false;
        scope.rootLayer.position = [viewSize.width * 0.5, viewSize.height * 0.5];
        scope.rootLayer.pivot = [0,0];

        // bglayer
        scope.bgLayer = PaperUtils.createLayer();
        scope.bgLayer.position = [viewSize.width * 0.5, viewSize.height * 0.5];
        scope.bgLayer.pivot = [0,0];
        scope.project.layers.unshift(scope.bgLayer);

        // fgLayer
        scope.fgLayer = PaperUtils.createLayer();
        scope.fgLayer.position = [viewSize.width * 0.5, viewSize.height * 0.5];
        scope.fgLayer.pivot = [0,0];
        scope.project.layers.push(scope.fgLayer);

        scope.sceneLayer = PaperUtils.createLayer();
        scope.rootLayer.addChildren ([
            scope.sceneLayer,
        ]);

        scope.$emit( 'initScene', scope.project, scope.sceneLayer, scope.fgLayer, scope.bgLayer );
        scope.repaint();

        // Debug:
        // scope.rootLayer.activate();
        // var path = new paper.Path.Line([0,0], [999,0]);
        // path.strokeColor = 'red';
        // path = new paper.Path.Line([0,0], [0,999]);
        // path.strokeColor = 'green';

        // scope.sceneLayer.activate();
        // path = new paper.Path.Line([0,0], [999,0]);
        // path.strokeColor = 'black';
        // path = new paper.Path.Line([0,0], [0,999]);
        // path.strokeColor = 'black';

        //
        var tool = new paper.Tool();
        tool.onMouseDrag = function (event) {
            // process drag
            var rightButtonDown = event.event.which === 3;
            rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
            if (rightButtonDown) {
                // drag viewport
                scope.sceneLayer.position = [
                    scope.sceneLayer.position.x + event.delta.x / scope.zoom,
                    scope.sceneLayer.position.y + event.delta.y / scope.zoom,
                ];
                scope.bgLayer.position = [ 
                    scope.bgLayer.position.x + event.delta.x,
                    scope.bgLayer.position.y + event.delta.y,
                ];
                scope.fgLayer.position = [ 
                    scope.fgLayer.position.x + event.delta.x,
                    scope.fgLayer.position.y + event.delta.y,
                ];
                return;
            }
        };
        tool.onMouseDown = function (event) {
            canvasEL.focus();

            // process drag
            var rightButtonDown = event.event.which === 3;
            rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
            if (rightButtonDown) {
                canvasEL.style.cursor = 'move';
                FIRE.addDragGhost("move");
                return;
            }

            // if (event.event.which === 1) {
            //     if ((!event.item || event.item.layer !== this._atlasLayer) && !(event.modifiers.control || event.modifiers.command)) {
            //         _clearSelection(this);
            //         return false;
            //     }
            // }
        };
        tool.onMouseUp = function (event) {
            // process drag release
            var rightButtonDown = event.event.which === 3;
            rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
            if (rightButtonDown) {
                canvasEL.style.cursor = 'auto';
                FIRE.removeDragGhost();
                return;
            }

            // if (event.event.which === 1) {
            //     this._atlasDragged = false;
            //     return false;
            // }
        };
    }

    return {
        restrict: 'E',
        replace: true,
        scope: {
        },
        template: '<canvas tabindex="1"></canvas>',
        link: link,
    };
}]);
