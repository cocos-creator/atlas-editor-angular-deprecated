angular.module('atlasEditor')
.controller( "workSpaceCtrl", ["$scope", "$element", "$atlas", function ($scope, $element, $atlas) {
    var atlas = $atlas.data;

    $scope.$on( 'initlayer', function ( event, rootLayer ) { 
        $scope.bgLayer = PaperUtils.createLayer();
        $scope.atlasLayer = PaperUtils.createLayer(); // to draw atlas bounds & texture
        $scope.atlasHandlerLayer = PaperUtils.createLayer(); // to draw outline of selected atlas
        rootLayer.addChildren ([
            $scope.bgLayer,
            $scope.atlasLayer,
            $scope.atlasHandlerLayer,
        ]);
        $scope.$broadcast( 'centerViewport', atlas.width, atlas.height);
    } );

    $scope.$on( 'repaint', function ( event, zoom ) { 
        $scope.$broadcast( 'centerViewport', atlas.width, atlas.height);

        $scope.bgLayer.activate();
        $scope.bgLayer.removeChildren();
        var borderWidth = 2;
        // draw rect
        var borderRect = new paper.Rectangle(0, 0, atlas.width * zoom, atlas.height * zoom);
        borderRect = borderRect.expand(borderWidth);
        var border = new paper.Shape.Rectangle(borderRect);
        border.style = {
            fillColor: new paper.Color(1,1,1,1),
            strokeWidth: borderWidth,
            strokeColor: new paper.Color(0.08, 0.08, 0.08, 1),
            shadowColor: [0, 0, 0, 0.5],
            shadowBlur: 7,
            shadowOffset: new paper.Point(2, 2),
        };

        // // draw rect
        // this._border.fillColor = _gridColor1;
        // this.droppingFile(false);
        // // draw checkerboard
        // var posFilter = Math.round;
        // var sizeFilter = Math.floor;
        // var zoomedGridSize = sizeFilter(this._gridSize * this._zoom);
        // var template = new paper.Shape.Rectangle(0, 0, zoomedGridSize, zoomedGridSize);
        // template.remove();
        // template.fillColor = _gridColor2;
        // template.pivot = [-zoomedGridSize/2, -zoomedGridSize/2];
        // var symbol = new paper.Symbol(template);
        // for (var x = 0; x < 512; x += this._gridSize) {
        //     for (var y = 0; y < 512; y += this._gridSize) {
        //         if (x % (this._gridSize * 2) !== y % (this._gridSize * 2)) {
        //             symbol.place([posFilter(x * this._zoom), posFilter(y * this._zoom)]);
        //         }
        //     }
        // }

    } );

    $scope.$on( 'dragenter', function () { 
        // atlasEditor.droppingFile(true);
    } );

    $scope.$on( 'dragover', function () { 
        event.dataTransfer.dropEffect = 'copy';
    } );

    $scope.$on( 'dragleave', function () { 
        // atlasEditor.droppingFile(false);
    } );

    $scope.$on( 'drop', function () { 
        // atlasEditor.droppingFile(false);

        // var files = e.dataTransfer.files;
        // atlasEditor.import(files);
    } );

    // TODO

    // // need its paper project activated
    // scope.recreateBackground = function () {
    //     this._bgLayer.activate();
    //     this._bgLayer.removeChildren();
    //     var borderWidth = 2;
    //     // draw rect
    //     var size = Math.floor(512 * this._zoom);
    //     var borderRect = new paper.Rectangle(0, 0, size, size);
    //     borderRect = borderRect.expand(borderWidth);
    //     this._border = new paper.Shape.Rectangle(borderRect);
    //     //this._border.fillColor = new paper.Color(204/255, 204/255, 204/255, 1);
    //     this._border.style = {
    //         strokeWidth: borderWidth,
    //         strokeColor: WorkSpace.borderColor,
    //         shadowColor: [0, 0, 0, 0.5],
    //         shadowBlur: 7,
    //         shadowOffset: new paper.Point(2, 2),
    //     };
    // };
}])
;
