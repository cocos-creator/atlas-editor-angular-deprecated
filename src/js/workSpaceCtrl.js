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
        var zoomedGridSize = sizeFilter(gridSize);
        var template = new paper.Shape.Rectangle(0, 0, zoomedGridSize, zoomedGridSize);
        template.remove();
        template.fillColor = gridColor2;
        template.pivot = [-zoomedGridSize/2, -zoomedGridSize/2];
        var symbol = new paper.Symbol(template);
        for (var x = 0; x < width; x += gridSize) {
            for (var y = 0; y < height; y += gridSize) {
                if (x % (gridSize * 2) !== y % (gridSize * 2)) {
                    symbol.place([posFilter(x), posFilter(y)]);
                }
            }
        }

        var raster = tmpLayer.rasterize();
        tmpLayer.remove();

        return raster;
    }

    $scope.atlas = $atlas.data;
    $scope.editor = $editor;

    $scope.$watchGroup ( [
        'atlas.width', 
        'atlas.height', 
    ], function ( val, old ) {
        $scope.atlas.layout();

        //
        $scope.atlasBGLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];
        $scope.atlasLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];

        //
        if ( $scope.checkerboard !== undefined ) {
            $scope.checkerboard.remove();
        }
        $scope.checkerboard = createCheckerboard( $scope.atlas.width, $scope.atlas.height );
        $scope.atlasBGLayer.addChild($scope.checkerboard);

        //
        var borderWidth = 2;
        var borderRect = new paper.Rectangle(0, 0, $scope.atlas.width, $scope.atlas.height);
        borderRect = borderRect.expand(borderWidth);
        $scope.border.size = borderRect.size;
        $scope.border.position = [(borderRect.size.width-borderWidth)*0.5,(borderRect.size.height-borderWidth)*0.5];

        $scope.$broadcast( 'zoom', 1.0);
        $scope.$broadcast( 'moveTo', 0, 0 );
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
        $scope.paintAtlas();
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
        $scope.paintAtlas();
        $scope.project.view.update();
    }); 

    $scope.$on( 'initScene', function ( event, project, sceneLayer, fgLayer, bgLayer ) { 
        $scope.project = project;
        $scope.sceneLayer = sceneLayer;
        $scope.fgLayer = fgLayer;
        $scope.bgLayer = bgLayer;

        $scope.atlasBGLayer = PaperUtils.createLayer();
        $scope.atlasBGLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];
        $scope.atlasLayer = PaperUtils.createLayer(); // to draw atlas bounds & texture
        $scope.atlasLayer.position = [-$scope.atlas.width*0.5, -$scope.atlas.height*0.5];

        sceneLayer.addChildren ([
            $scope.atlasBGLayer,
            $scope.atlasLayer,
        ]);

        // init atlas-bg-layer
        $scope.atlasBGLayer.activate();

        // create border rect
        if ( $scope.border === undefined ) {
            var borderWidth = 2;
            var borderRect = new paper.Rectangle(0, 0, $scope.atlas.width, $scope.atlas.height);
            borderRect = borderRect.expand(borderWidth);
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

        // create checkerboard
        if ( $scope.checkerboard === undefined ) {
            $scope.checkerboard = createCheckerboard( $scope.atlas.width, $scope.atlas.height );
            $scope.atlasBGLayer.addChild($scope.checkerboard);
        }
    });

    $scope.$on( 'paint', function ( event ) { 
        $scope.paintAtlas();
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

    $scope.$on( 'zoomChanged', function () { 
        // $scope.atlasLayer.scale( 1.0/$scope.atlasLayer.globalMatrix.scaling.x,
        //                          1.0/$scope.atlasLayer.globalMatrix.scaling.y );
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
            // $scope.selection.length = 0;

            $scope.atlasLayer.activate();
        }

        var i = 0;
        for (i = 0; i < $scope.atlas.textures.length; ++i) {
            var tex = $scope.atlas.textures[i];
            var raster = PaperUtils.createSpriteRaster(tex);
            raster.data.texture = tex;
            raster.position = [tex.x, tex.y];

            if ( !forExport ) {
                raster.data.bgItem = new paper.Shape.Rectangle(paper.Item.NO_INSERT);
                $scope.bgLayer.addChild(raster.data.bgItem);

                // raster.data.bgItem.insertBelow(raster);
                // // bind events
                // raster.onMouseDown = onMouseDown;
                // raster.onMouseUp = onMouseUp;
            }
        }

        if (!forExport) {
            $scope.paintAtlas();
        }
        $scope.project.view.update();
    };

    //
    $scope.paintAtlas = function () {
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
            child.position = [posFilter(tex.x), posFilter(tex.y)];

            // update rectangle
            var left = posFilter(tex.x);
            var top = posFilter(tex.y);
            var w = posFilter(tex.rotatedWidth);
            var h = posFilter(tex.rotatedHeight);
            var bgItem = child.data.bgItem;
            bgItem.size = [w, h];
            bgItem.position = new paper.Rectangle(left, top, w, h).center;
            bgItem.fillColor = PaperUtils.color( $scope.editor.elementBgColor );

            // update outline
            var outline = child.data.outline;
            if (outline) {
                outline.position = bgItem.position;
                outline.size = bgItem.size;
            }
        }
    };
}])
;
