var AtlasEditor = (function () {

    var DEFAULT_TOP_MARGIN = 20;
    var GRID_COLOR_1 = new paper.Color(204/255, 204/255, 204/255, 1);
    var GRID_COLOR_2 = new paper.Color(135/255, 135/255, 135/255, 1);
    var ATLAS_BOUND_COLOR = new paper.Color(0, 0, 1, 0.37);
    var BORDER_COLOR = new paper.Color(0.08, 0.08, 0.08, 1);
    var BORDER_COLOR_HIGHLIGHT = 'blue';
    
    function AtlasEditor(canvas) {
        this.atlas = new FIRE.Atlas();
        this._selection = [];
        this._atlasDragged = false;
        this._gridSize = 32;
        this._border = null;
        this._autoCentered = false;  // 打开网页后，自动居中一次，然后才显示出来

        // init paper
        var size = [canvas.width, canvas.height];
        paper.setup(canvas);
        paper.view.viewSize = size; // to prevent canvas resizing during paper.setup
        this._paperProject = paper.project;
        _initLayers(this);
        //

        _bindEvents(this);
        _drawBackground(this);
        _centerViewport(this);
        paper.view.update();
    }

    var _initLayers = function (self) {
        var initLayer = function (existedLayer) {
            existedLayer = existedLayer || new paper.Layer();
            existedLayer.remove();
            existedLayer.applyMatrix = false;
            existedLayer.position = [0, 0];   // in paper, position should be settled before pivot
            existedLayer.pivot = [0, 0];
            return existedLayer;
        };

        self._globalTransformLayer = initLayer(self._paperProject.activeLayer);   // to support viewport movement
        self._bgLayer = initLayer();           // to draw checkerboard, border, shadow etc.
        //self._atlasBgLayer = initLayer();      // to draw atlas rect
        self._atlasLayer = initLayer();        // to draw atlas texture
        self._atlasHandlerLayer = initLayer(); // to draw outline of selected atlas

        self._paperProject.layers.push(self._globalTransformLayer);
        self._globalTransformLayer.addChildren([
            // BOTTOM (sorted by create order) -----------
            self._bgLayer,
            //self._atlasBgLayer,
            self._atlasLayer,
            self._atlasHandlerLayer,
            // TOP ---------------------------------------
        ]);
    };

    var _centerViewport = function (self) {
        var size = self._paperProject.view.viewSize;
        var x = Math.round((size.width - 512) * 0.5);
        self._globalTransformLayer.position = [x, DEFAULT_TOP_MARGIN];
    };

    // private
    var _acceptedTypes = {
        'image/png': true,
        'image/jpeg': true,
        'image/gif': true
    };
    var _processing = 0;

    var _bindEvents = function (self) {
        var tool = new paper.Tool();
        tool.onMouseDown = function (event) {
            if ((!event.item || event.item.layer !== self.atlasLayer) && !(event.modifiers.control || event.modifiers.command)) {
                _clearSelection(self);
            }
        };
        tool.onMouseDrag = function (event) {
            for (var i = 0; i < self.selection.length; i++) {
                var atlas = self.selection[i];
                var bounds = atlas.data.bounds;
                var outline = atlas.data.outline;
                var tex = atlas.data.texture;
                // update canvas
                atlas.position = atlas.position.add(event.delta);
                if (bounds) {
                    bounds.position = bounds.position.add(event.delta);
                }
                if (outline) {
                    outline.position = outline.position.add(event.delta);
                }
                // update atlas
                tex.x = atlas.position.x;
                tex.y = atlas.position.y;
            }
            self.mouseDragged = true;
        };
        tool.onMouseUp = function (event) {
            self.mouseDragged = false;
        };
    };

    var _onload = function (e) {    // TODO split atlasEditor into two class, loader & editor
        console.log( e.target.filename );

        var img = new Image();
        img.classList.add('atlas-item');

        var self = this;
        img.onload = function () {
            var texture = new FIRE.SpriteTexture(img);
            texture.name = e.target.filename;

            if (self.atlas.trim) {
                var trimRect = FIRE.getTrimRect(img, self.atlas.trimThreshold);
                texture.trimX = trimRect.x;
                texture.trimY = trimRect.y;
                texture.width = trimRect.width;
                texture.height = trimRect.height;
            }

            self.atlas.add(texture);
            _processing -= 1;
        };

        img.src = e.target.result;
    };

    //
    AtlasEditor.prototype.import = function ( files ) {
        for (var i = 0; i < files.length; ++i) {
            file = files[i];
            if ( _acceptedTypes[file.type] === true ) {
                _processing += 1;
                var reader = new FileReader();
                reader.filename = file.name;
                reader.atlas = this.atlas;
                reader.onload = _onload; 
                reader.readAsDataURL(file);
            }
        }

        //
        var editor = this;
        var checkIfFinished = function () {
            if ( _processing === 0 ) {
                editor.atlas.sort();
                editor.atlas.layout();
                editor.repaint();
                return;
            }
            setTimeout( checkIfFinished, 500 );
        };
        checkIfFinished();
    };

    var _getAtalsRaster = function (tex) {
        var tmpRawRaster = new paper.Raster(tex.image);
        var trimRect = new paper.Rectangle(tex.trimX, tex.trimY, tex.width, tex.height);
        var raster = tmpRawRaster.getSubRaster(trimRect);
        tmpRawRaster.remove();  // can only be removed after getSubRaster
        raster.pivot = [-tex.width * 0.5, -tex.height * 0.5];
        if (tex.rotated) {
            raster.pivot = [raster.pivot.x, -raster.pivot.y];
            raster.rotation = 90;
        }
        return raster;
    };

    var _clearSelection = function (self) {
        for (var selected in self._selection) {
            if (selected.outline) {
                selected.outline = null;
            }
        }
        self._selection.length = 0;
        self._atlasHandlerLayer.removeChildren();
    };

    var _selectAtlas = function (self, atlasRaster, event) {
        self._selection.push(atlasRaster);
        atlasRaster.data.bounds.bringToFront();
        atlasRaster.bringToFront();

        self._paperProject.activate();
        self._atlasHandlerLayer.activate();
        var strokeWidth = 2;
        var bounds = atlasRaster.bounds.expand(strokeWidth);
        var outline = new paper.Shape.Rectangle(bounds);
        outline.style = {
            strokeColor: 'white',
            strokeWidth: strokeWidth,
        };
        atlasRaster.data.outline = outline;
    };

    // need its paper project activated
    var _drawBackground = function (self) {
        self._bgLayer.activate();
        self._bgLayer.removeChildren();
        var borderWidth = 2;
        // draw rect
        var borderRect = new paper.Rectangle(0, 0, 512, 512);
        borderRect = borderRect.expand(borderWidth);
        self._border = new paper.Shape.Rectangle(borderRect);
        self._border.fillColor = GRID_COLOR_1;
        self._border.style = {
            strokeWidth: borderWidth,
            shadowColor: [0, 0, 0, 0.7],
            shadowBlur: 8,
            shadowOffset: new paper.Point(2, 2),   // unused
        };
        self.droppingFile(false);
        // draw checkerboard
        var rectTemplate1 = new paper.Shape.Rectangle(0, 0, self._gridSize, self._gridSize);
        rectTemplate1.remove();
        rectTemplate1.fillColor = GRID_COLOR_2;
        var pivotOffset = -Math.round(self._gridSize/2);
        rectTemplate1.pivot = [pivotOffset, pivotOffset];
        var symbol1 = new paper.Symbol(rectTemplate1);
        for (var x = 0; x < 512; x += self._gridSize) {
            for (var y = 0; y < 512; y += self._gridSize) {
                if (x % (self._gridSize * 2) !== y % (self._gridSize * 2)) {
                    symbol1.place([x, y]);
                }
            }
        }
    };

    // need its paper project activated
    var _drawAtlas = function ( self, forExport ) {
        var onDown, onUp;
        if (!forExport) {
            onDown = function (event) {
                if (!(event.modifiers.control || event.modifiers.command)) {
                    var index = self._selection.indexOf(this);
                    if (index == -1) {
                        _clearSelection(self);
                        _selectAtlas(self, this, event);
                    }
                }
            };
            onUp = function (event) {
                if (self.mouseDragged) {
                    return;
                }
                if ((event.modifiers.control || event.modifiers.command)) {
                    var index = self._selection.indexOf(this);
                    if (index != -1) {
                        self._selection.splice(index, 1);
                        this.data.outline.remove();
                        this.data.outline = null;
                        this.bringToFront();
                        return;
                    }
                    _selectAtlas(self, this, event);
                }
                else {
                    _clearSelection(self);
                    _selectAtlas(self, this, event);
                }
            };

            //self._atlasBgLayer.removeChildren();
            self._atlasLayer.removeChildren();
            self._atlasHandlerLayer.removeChildren();

            self._atlasLayer.activate();
        }
        
        for (var i = 0; i < self.atlas.textures.length; ++i) {
            var tex = self.atlas.textures[i];
            var atlasRaster = _getAtalsRaster(tex); 
            atlasRaster.position = [tex.x, tex.y];
            
            if (!forExport) {
                atlasRaster.data.texture = tex;
                // draw rectangle

                //self._atlasBgLayer.activate();

                var rect = new paper.Shape.Rectangle(tex.x, tex.y, tex.rotatedWidth(), tex.rotatedHeight());
                rect.fillColor = ATLAS_BOUND_COLOR;
                atlasRaster.data.bounds = rect;
                atlasRaster.bringToFront();

                //self._atlasLayer.activate();

                // bind events
                atlasRaster.onMouseDown = onDown;
                atlasRaster.onMouseUp = onUp;
            }
        }
        paper.view.draw();
    };

    // repaint all canvas
    AtlasEditor.prototype.repaint = function () {
        this._selection.length = 0;
        this._paperProject.activate();
        _drawBackground(this);
        _drawAtlas( this, false );
    };

    //
    AtlasEditor.prototype.paintNewCanvas = function () {
        var canvas = document.createElement("canvas");
        paper.setup(canvas);
        paper.view.viewSize = [512, 512];
        _drawAtlas( this, true );
        return canvas;
    };

    //
    AtlasEditor.prototype.updateWindowSize = function () {
        // resize
        var view = this._paperProject.view;
        view.viewSize = [view.element.width, view.element.height];

        if (this._autoCentered === false) {
            _centerViewport(this);
            this._autoCentered = true;
        }
        // repaint
        this.repaint();
    };

    //
    AtlasEditor.prototype.droppingFile = function (dropping) {
        this._border.strokeColor = dropping ? BORDER_COLOR_HIGHLIGHT : BORDER_COLOR;
        this._paperProject.view.update();
    };

    return AtlasEditor;
})();
