angular.module('atlasEditor')
.controller( "workSpaceCtrl", ["$scope", "$element", "$atlas", "$editor", function ($scope, $element, $atlas, $editor) {
    //
    function createCheckerboard ( width, height ) {
        var tmpLayer = PaperUtils.createLayer();
        tmpLayer.activate();

        var gridColor2 = new paper.Color(135/255, 135/255, 135/255, 1);
        var gridSize = 32;
        var posFilter = Math.round;
        var sizeFilter = Math.floor;
        var zoomedGridSize = sizeFilter(gridSize * $scope.zoom);
        var template = new paper.Shape.Rectangle(0, 0, zoomedGridSize, zoomedGridSize);
        template.remove();
        template.fillColor = gridColor2;
        template.pivot = [-zoomedGridSize/2, -zoomedGridSize/2];
        var symbol = new paper.Symbol(template);
        for (var x = 0; x < width; x += gridSize) {
            for (var y = 0; y < height; y += gridSize) {
                if (x % (gridSize * 2) !== y % (gridSize * 2)) {
                    symbol.place([posFilter(x * $scope.zoom), posFilter(y * $scope.zoom)]);
                }
            }
        }

        var raster = tmpLayer.rasterize();
        tmpLayer.remove();

        raster.pivot = [-raster.width*0.5,-raster.height*0.5];
        raster.position = [0,0];

        return raster;
    }

    $scope.atlas = $atlas.data;
    $scope.editor = $editor;
    $scope.zoom = 1.0;

    $scope.$watchGroup ( [
        'atlas.width', 
        'atlas.height', 
    ], function ( val, old ) {
        $scope.atlas.layout();
        $scope.zoom = 1;

        if ( $scope.checkerboard !== undefined ) {
            $scope.checkerboard.remove();
        }
        $scope.checkerboard = createCheckerboard( $scope.atlas.width, $scope.atlas.height );
        $scope.atlasBGLayer.addChild($scope.checkerboard);

        $scope.$broadcast( 'centerViewport', $scope.atlas.width, $scope.atlas.height);
        $scope.$broadcast( 'repaint', true );
    }); 

    $scope.$watchGroup ( [
        'atlas.customPadding',
        'atlas.algorithm',
        'atlas.sortBy',
        'atlas.sortOrder',
        'atlas.allowRotate',
    ], function ( val, old ) {
        $scope.atlas.sort();
        $scope.atlas.layout();
        $scope.updateAtlas();
        $scope.project.view.update();
    }); 

    $scope.$watchGroup ( [
        'editor.elementBgColor.r',
        'editor.elementBgColor.g',
        'editor.elementBgColor.b',
        'editor.elementBgColor.a',
        'editor.elementSelectColor.r',
        'editor.elementSelectColor.g',
        'editor.elementSelectColor.b',
        'editor.elementSelectColor.a',
    ], function ( val, old ) {
        $scope.updateAtlas();
        $scope.project.view.update();
    }); 

    $scope.$watch ( 'zoom', function ( val, old ) {
        $scope.$broadcast( 'repaint', true );
    });

    $scope.$on( 'initPaper', function ( event, project, rootLayer ) { 
        $scope.project = project;
        $scope.rootLayer = rootLayer;

        $scope.atlasBGLayer = PaperUtils.createLayer();
        $scope.atlasLayer = PaperUtils.createLayer(); // to draw atlas bounds & texture
        $scope.atlasHandlerLayer = PaperUtils.createLayer(); // to draw outline of selected atlas

        rootLayer.addChildren ([
            $scope.atlasBGLayer,
            $scope.atlasLayer,
            $scope.atlasHandlerLayer,
        ]);
        $scope.$broadcast( 'centerViewport', $scope.atlas.width, $scope.atlas.height);
    });

    $scope.$on( 'paint', function ( event ) { 
        $scope.atlasBGLayer.activate();
        var borderWidth = 2;

        // draw rect
        var borderRect = new paper.Rectangle(0, 0, $scope.atlas.width * $scope.zoom, $scope.atlas.height * $scope.zoom);
        borderRect = borderRect.expand(borderWidth);
        if ( $scope.border === undefined ) {
            $scope.border = new paper.Shape.Rectangle(borderRect);
            $scope.border.style = {
                fillColor: new paper.Color(204/255, 204/255, 204/255, 1),
                strokeWidth: borderWidth,
                strokeColor: new paper.Color(0.08, 0.08, 0.08, 1),
                shadowColor: [0, 0, 0, 0.5],
                shadowBlur: 7,
                shadowOffset: new paper.Point(2, 2),
            };
        }
        $scope.border.size = borderRect.size;
        $scope.border.position = [($scope.border.size.width-borderWidth) * 0.5, ($scope.border.size.height-borderWidth) * 0.5];

        // draw checkerboard
        if ( $scope.checkerboard === undefined ) {
            $scope.checkerboard = createCheckerboard( $scope.atlas.width, $scope.atlas.height );
            $scope.atlasBGLayer.addChild($scope.checkerboard);
        }
        $scope.checkerboard.scaling = [$scope.zoom, $scope.zoom ];

        //
        $scope.updateAtlas();
    } );

    $scope.$on( 'dragenter', function () { 
        $scope.border.strokeColor = 'blue';
        $scope.project.view.update();
    } );

    $scope.$on( 'dragover', function () { 
        event.dataTransfer.dropEffect = 'copy';
        $scope.border.strokeColor = 'blue';
        $scope.project.view.update();
    } );

    $scope.$on( 'dragleave', function () { 
        $scope.border.strokeColor = new paper.Color(0.08, 0.08, 0.08, 1);
        $scope.project.view.update();
    } );

    $scope.$on( 'drop', function () { 
        $scope.border.strokeColor = new paper.Color(0.08, 0.08, 0.08, 1);
        $scope.project.view.update();

        var files = event.dataTransfer.files;
        $scope.import(files);
    } );

    //
    $scope.import = function ( files ) {
        var acceptedTypes = {
            'image/png': true,
            'image/jpeg': true,
            'image/gif': true
        };
        var processing = 0;
        var onload = function (event) {
            console.log( event.target.filename );

            var img = new Image();
            img.classList.add('atlas-item');

            img.onload = function () {
                var texture = new FIRE.SpriteTexture(img);
                texture.name = event.target.filename;

                if ($scope.atlas.trim) {
                    var trimRect = FIRE.getTrimRect(img, $scope.atlas.trimThreshold);
                    texture.trimX = trimRect.x;
                    texture.trimY = trimRect.y;
                    texture.width = trimRect.width;
                    texture.height = trimRect.height;
                }

                $scope.atlas.add(texture);
                processing -= 1;
            };

            img.src = event.target.result;
        };

        for (var i = 0; i < files.length; ++i) {
            file = files[i];
            if ( acceptedTypes[file.type] === true ) {
                processing += 1;
                var reader = new FileReader();
                reader.filename = file.name;
                reader.atlas = $scope.atlas;
                reader.onload = onload; 
                reader.readAsDataURL(file);
            }
        }

        //
        var checkIfFinished = function () {
            if ( processing === 0 ) {
                $scope.atlas.sort();
                $scope.atlas.layout();
                $scope.rebuildAtlas(false);
                return;
            }
            setTimeout( checkIfFinished, 500 );
        };
        checkIfFinished();
    };

    //
    $scope.rebuildAtlas = function (forExport) {
        var onMouseDown, onMouseUp;
        if (!forExport) {
            onMouseDown = function (event) {
                // if (event.event.which === 1 && !(event.modifiers.control || event.modifiers.command)) {
                //     var index = $scope._selection.indexOf(this);
                //     if (index == -1) {
                //         _clearSelection($scope);
                //         _selectAtlas($scope, this, event);
                //     }
                // }
            };
            onMouseUp = function (event) {
                // if (event.event.which !== 1 || $scope._atlasDragged) {
                //     return;
                // }
                // if ((event.modifiers.control || event.modifiers.command)) {
                //     var index = $scope._selection.indexOf(this);
                //     if (index != -1) {
                //         $scope._selection.splice(index, 1);
                //         this.data.outline.remove();
                //         this.data.outline = null;
                //         this.bringToFront();
                //         return;
                //     }
                //     _selectAtlas($scope, this, event);
                // }
                // else {
                //     _clearSelection($scope);
                //     _selectAtlas($scope, this, event);
                // }
            };

            $scope.atlasLayer.removeChildren();
            $scope.atlasHandlerLayer.removeChildren();
            // $scope.selection.length = 0;

            $scope.atlasLayer.activate();
        }

        console.time('create raster');
        for (var i = 0; i < $scope.atlas.textures.length; ++i) {
            var tex = $scope.atlas.textures[i];
            var raster = PaperUtils.createSpriteRaster(tex);
            raster.data.texture = tex;
            if ( !forExport ) {
                raster.data.boundsItem = new paper.Shape.Rectangle(paper.Item.NO_INSERT);
                raster.data.boundsItem.insertBelow(raster);
                // bind events
                raster.onMouseDown = onMouseDown;
                raster.onMouseUp = onMouseUp;
            }
            else {
                raster.position = [tex.x, tex.y];
            }
        }
        console.timeEnd('create raster');

        if (!forExport) {
            $scope.updateAtlas();
        }
        $scope.project.view.update();
    };

    //
    $scope.updateAtlas = function () {
        var posFilter = Math.round;
        var children = $scope.atlasLayer.children;
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            var isRaster = child.data && child.data.texture;
            if (!isRaster) {
                continue;
            }

            // update atlas
            var tex = child.data.texture;
            if (tex.rotated) {
                child.pivot = [-tex.width * 0.5, tex.height * 0.5];
                child.rotation = 90;
            }
            else {
                child.pivot = [-tex.width * 0.5, -tex.height * 0.5];
                child.rotation = 0;
            }
            child.position = [posFilter(tex.x * $scope.zoom), posFilter(tex.y * $scope.zoom)];
            child.scaling = [$scope.zoom, $scope.zoom];

            // update rectangle
            var left = posFilter(tex.x * $scope.zoom);
            var top = posFilter(tex.y * $scope.zoom);
            var w = posFilter(tex.rotatedWidth * $scope.zoom);
            var h = posFilter(tex.rotatedHeight * $scope.zoom);
            var bounds = child.data.boundsItem;
            bounds.size = [w, h];
            bounds.position = new paper.Rectangle(left, top, w, h).center;
            bounds.fillColor = PaperUtils.color( $scope.editor.elementBgColor );

            // update outline
            var outline = child.data.outline;
            if (outline) {
                outline.position = bounds.position;
                outline.size = bounds.size;
            }
        }
    };
}])
;
