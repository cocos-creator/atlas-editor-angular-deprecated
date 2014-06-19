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
            scope.project.view.viewSize = [width, height];
            scope.rootLayer.position = [width * 0.5, height * 0.5];
            scope.bgLayer.position = [width * 0.5, height * 0.5];

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
                scope.$emit('zoomChanged', zoom);
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
        scope.fgLayer.position = [0,0];
        scope.fgLayer.pivot = [0,0];
        scope.project.layers.push(scope.fgLayer);

        scope.sceneLayer = PaperUtils.createLayer();
        scope.rootLayer.addChildren ([
            scope.sceneLayer,
        ]);

        // create select rect
        scope.fgLayer.activate();
        scope.selectRect = new paper.Shape.Rectangle(0,0,0,0);
        scope.selectRect.style = {
            fillColor: new paper.Color(0, 0.5, 1.0, 0.5),
            strokeColor: new paper.Color(0, 0.7, 1.0, 1.0),
            strokeWidth: 1,
        };

        scope.$emit( 'initScene', scope.project, scope.sceneLayer, scope.fgLayer, scope.bgLayer );
        scope.repaint();

        scope.draggingItems = false;
        scope.rectSelecting = false;
        scope.rectSelectStartAt = [0,0];
        scope.selection = [];

        function toggleSelect ( item ) {
            if ( !item )
                return;

            var idx = scope.selection.indexOf(item); 
            if ( idx === -1 ) {
                scope.$emit( 'select', [item] );
                scope.selection.push(item);
            }
            else {
                scope.$emit( 'unselect', [item] );
                scope.selection.splice(idx,1);
            }
        }
        function clearSelect () {
            scope.$emit( 'unselect', scope.selection );
            scope.selection = [];
        }
        function addSelect ( item ) {
            // var idx = scope.selection.indexOf(item); 
            // if ( idx === -1 ) {
                scope.$emit( 'select', [item] );
                scope.selection.push(item);
            // }
        }
        function removeSelect ( item ) {
            // var idx = scope.selection.indexOf(item); 
            // if ( idx !== -1 ) {
                scope.$emit( 'unselect', [item] );
                scope.selection.splice(idx,1);
            // }
        }
        function isSelected ( item ) {
            return scope.selection.indexOf(item) !== -1; 
        }

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

        // tool.onMouseMove = function (event) {
        //     scope.project.view.update();
        // };

        tool.onMouseDrag = function (event) {
            // process camera move
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
                return;
            }

            // process rect select
            if ( event.event.which === 1 ) {
                if ( scope.rectSelecting ) {
                    var cursorPos = event.point.add(-0.5,-0.5);
                    var rect = new paper.Rectangle(scope.rectSelectStartAt, cursorPos);
                    scope.selectRect.position = rect.center;
                    scope.selectRect.size = rect.size;

                    return;
                }

                if ( scope.draggingItems ) {
                    scope.$emit('moveSelected', scope.selection, event.delta );
                    return;
                }
            }
        };

        tool.onMouseDown = function (event) {
            canvasEL.focus();

            // process camera move
            var rightButtonDown = event.event.which === 3;
            rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
            if (rightButtonDown) {
                canvasEL.style.cursor = 'move';
                FIRE.addDragGhost("move");
                return;
            }

            // process rect select 
            if ( event.event.which === 1 ) {
                // process single item
                if ( event.item && event.item.selectable ) {
                    if ( event.modifiers.control || event.modifiers.command ) {
                        toggleSelect(event.item);
                        return;
                    }

                    if ( isSelected(event.item) ) {
                        scope.draggingItems = true;
                        canvasEL.style.cursor = 'crosshair';
                        FIRE.addDragGhost("crosshair");
                    }
                    else {
                        clearSelect();
                        addSelect(event.item);
                    }

                    return;
                }

                // start rect select
                if ( !(event.modifiers.control || event.modifiers.command) ) {
                    clearSelect();
                }
                scope.rectSelecting = true;
                scope.rectSelectStartAt = event.point.add(-0.5,-0.5);
            }
        };

        tool.onMouseUp = function (event) {
            // process camera move
            var rightButtonDown = event.event.which === 3;
            rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
            if (rightButtonDown) {
                canvasEL.style.cursor = 'auto';
                FIRE.removeDragGhost();
                return;
            }

            // process rect select 
            if ( event.event.which === 1 ) {
                if ( scope.rectSelecting ) {
                    scope.rectSelecting = false;
                    scope.selectRect.position = [0,0]; 
                    scope.selectRect.size = [0,0]; 

                    // TODO: rectHitTest
                    return;
                }

                if ( scope.draggingItems ) {
                    scope.draggingItems = false;
                    canvasEL.style.cursor = 'auto';
                    FIRE.removeDragGhost();
                    return;
                }
            }
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
