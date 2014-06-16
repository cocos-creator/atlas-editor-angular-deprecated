angular.module('atlasEditor')
.directive( 'freeMovePaper', function () {
    return {
        restrict: 'E',
        replace: true,
        scope: {
        },
        template: '<canvas></canvas>',
        link: function ( scope, element, attrs ) {
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
                var view = scope.paperProject.view;
                view.viewSize = [view.element.width, view.element.height];

                scope.repaint();
            };

            scope.repaint = function () {
                scope.paperProject.activate();
                scope.$emit('repaint', scope.zoom);
                paper.view.update();
            };

            scope.setZoom = function (zoom) {
                var center = scope.paperProject.view.center;
                var offset = scope.rootLayer.position.subtract(center);
                var newOffset = offset.divide(scope.zoom).multiply(zoom);
                scope.rootLayer.position = center.add(newOffset).round();

                scope.zoom = zoom;
                scope.repaint();
            };

            scope.$on( 'centerViewport', function ( width, height ) {
                var size = scope.paperProject.view.viewSize;
                var x = Math.round((size.width - width) * 0.5);
                var y = Math.round((size.height - height) * 0.5);
                scope.rootLayer.position = [x,y];
            });

            scope.$on('$destroy', function () {
                window.removeEventListener(resizeEventID);
            });

            // init 
            scope.zoom = 1.0;
            paper.setup(canvasEL);
            paper.view.viewSize = [canvasEL.width, canvasEL.height]; // to prevent canvas resizing during paper.setup
            scope.paperProject = paper.project;

            scope.paperProject.activate();
            if ( scope.paperProject.activeLayer !== null ) {
                scope.paperProject.activeLayer.remove();
            }
            scope.rootLayer = PaperUtils.createLayer();
            scope.paperProject.layers.push(scope.rootLayer);
            scope.$emit( 'initlayer', scope.rootLayer );
            scope.repaint();
        },
    };
});
