var AtlasEditor = (function () {
    var _super = WorkSpace;

    var GRID_COLOR_1 = new paper.Color(204/255, 204/255, 204/255, 1);
    var GRID_COLOR_2 = new paper.Color(135/255, 135/255, 135/255, 1);
    var ATLAS_BOUND_COLOR = new paper.Color(0, 0, 1, 0.37);
    var BORDER_COLOR_HIGHLIGHT = 'blue';
    
    function AtlasEditor(canvas) {
        this.atlas = new FIRE.Atlas();
        this._selection = [];
        this._atlasDragged = false;
        this._gridSize = 32;

        _super.call(this, canvas);
        
        _initLayers(this);
    }
    var _class = AtlasEditor;
    FIRE.extend(_class, _super);

    var _initLayers = function (self) {
        //self._atlasBgLayer = _super.initLayer();
        self._atlasLayer = _super.initLayer();        // to draw atlas bounds & texture
        self._atlasHandlerLayer = _super.initLayer(); // to draw outline of selected atlas

        self._globalTransformLayer.addChildren([
            // BOTTOM (sorted by create order) -----------
            //self._atlasBgLayer,
            self._atlasLayer,
            self._atlasHandlerLayer,
            // TOP ---------------------------------------
        ]);
    };

    // private
    var _acceptedTypes = {
        'image/png': true,
        'image/jpeg': true,
        'image/gif': true
    };
    var _processing = 0;

    _class.prototype._onMouseDown = function (target, event) {
        if (_super.prototype._onMouseDown.call(this, target, event) === false) {
            return false;
        }
        if (event.event.which === 1) {
            if ((!event.item || event.item.layer !== this._atlasLayer) && !(event.modifiers.control || event.modifiers.command)) {
                _clearSelection(this);
                return false;
            }
        }
    };

    _class.prototype._onMouseUp = function (target, event) {
        if (_super.prototype._onMouseUp.call(this, target, event) === false) {
            return false;
        }
        if (event.event.which === 1) {
            this._atlasDragged = false;
            return false;
        }
    };

    _class.prototype._onMouseDrag = function (target, event) {
        if (_super.prototype._onMouseDrag.call(this, target, event) === false) {
            return false;
        }
        var rightButtonDown = event.event.which === 3;
        rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
        if (rightButtonDown === false) {
            // drag atlas
            for (var i = 0; i < this._selection.length; i++) {
                var atlas = this._selection[i];
                var bounds = atlas.data.boundsItem;
                var outline = atlas.data.outline;
                var tex = atlas.data.texture;
                // update canvas
                atlas.position = atlas.position.add(event.delta);   // TODO align to pixel if zoom in
                if (bounds) {
                    bounds.position = bounds.position.add(event.delta);
                }
                if (outline) {
                    outline.position = outline.position.add(event.delta);
                }
                // update atlas
                tex.x = Math.round(atlas.position.x / this._zoom);
                tex.y = Math.round(atlas.position.y / this._zoom);
            }
            this._atlasDragged = true;
            return false;
        }
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
    _class.prototype.import = function ( files ) {
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
        var boundsItem = atlasRaster.data.boundsItem;
        boundsItem.bringToFront();
        atlasRaster.bringToFront();

        self._paperProject.activate();
        self._atlasHandlerLayer.activate();
        var strokeWidth = 2;
        var outlineBounds = boundsItem.bounds.expand(strokeWidth);
        var outline = new paper.Shape.Rectangle(outlineBounds);
        outline.style = {
            strokeColor: 'white',
            strokeWidth: strokeWidth,
        };
        atlasRaster.data.outline = outline;
    };

    // need its paper project activated
    _class.prototype._recreateBackground = function () {
        _super.prototype._recreateBackground.call(this);
        
        // draw rect
        this._border.fillColor = GRID_COLOR_1;
        this.droppingFile(false);
        // draw checkerboard
        var posFilter = Math.round;
        var sizeFilter = Math.floor;
        var zoomedGridSize = sizeFilter(this._gridSize * this._zoom);
        var template = new paper.Shape.Rectangle(0, 0, zoomedGridSize, zoomedGridSize);
        template.remove();
        template.fillColor = GRID_COLOR_2;
        template.pivot = [-zoomedGridSize/2, -zoomedGridSize/2];
        var symbol = new paper.Symbol(template);
        for (var x = 0; x < 512; x += this._gridSize) {
            for (var y = 0; y < 512; y += this._gridSize) {
                if (x % (this._gridSize * 2) !== y % (this._gridSize * 2)) {
                    symbol.place([posFilter(x * this._zoom), posFilter(y * this._zoom)]);
                }
            }
        }
    };

    // need its paper project activated
    var _recreateAtlas = function ( self, forExport ) {
        var onDown, onUp;
        if (!forExport) {
            onDown = function (event) {
                if (event.event.which === 1 && !(event.modifiers.control || event.modifiers.command)) {
                    var index = self._selection.indexOf(this);
                    if (index == -1) {
                        _clearSelection(self);
                        _selectAtlas(self, this, event);
                    }
                }
            };
            onUp = function (event) {
                if (event.event.which !== 1 || self._atlasDragged) {
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
            self._selection.length = 0;

            self._atlasLayer.activate();
        }
        for (var i = 0; i < self.atlas.textures.length; ++i) {
            var tex = self.atlas.textures[i];
            var atlasRaster = _getAtalsRaster(tex); 
            atlasRaster.data.texture = tex;

            if (!forExport) {
                atlasRaster.data.boundsItem = new paper.Shape.Rectangle();
                atlasRaster.bringToFront();

                // bind events
                atlasRaster.onMouseDown = onDown;
                atlasRaster.onMouseUp = onUp;
            }
            else {
                atlasRaster.position = [tex.x, tex.y];
            }
        }
        if (!forExport) {
            _updateAtlas (self, forExport);
        }
        paper.view.draw();
    };

    _class.prototype._updateCanvas = function () {
        _updateAtlas(this, false);
        paper.view.draw();
    };

    var _updateAtlas = function ( self ) {
        var posFilter = Math.round;
        var sizeFilter = Math.round;
        var children = self._atlasLayer.children;
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            if (!child.data || !child.data.texture) {
                continue;
            }
            // update atlas
            var tex = child.data.texture;
            child.position = [posFilter(tex.x * self._zoom), posFilter(tex.y * self._zoom)];
            child.scaling = [self._zoom, self._zoom];
            // update rectangle
            var left = posFilter(tex.x * self._zoom);
            var top = posFilter(tex.y * self._zoom);
            var w = posFilter(tex.rotatedWidth * self._zoom);
            var h = posFilter(tex.rotatedHeight * self._zoom);
            var bounds = child.data.boundsItem;
            bounds.size = [w, h];
            bounds.position = new paper.Rectangle(left, top, w, h).center;
            bounds.fillColor = ATLAS_BOUND_COLOR;
            // update outline
            var outline = child.data.outline;
            if (outline) {
                outline.position = bounds.position;
                outline.size = bounds.size;
            }
        }
        paper.view.draw();
    };

    _class.prototype.repaint = function () {
        _super.prototype.repaint.call(this);
        _recreateAtlas( this, false );
    };

    //
    _class.prototype.paintNewCanvas = function () {
        var canvas = document.createElement("canvas");
        paper.setup(canvas);
        paper.view.viewSize = [512, 512];
        _recreateAtlas( this, true );
        return canvas;
    };

    //
    _class.prototype.droppingFile = function (dropping) {
        this._border.strokeColor = dropping ? BORDER_COLOR_HIGHLIGHT : WorkSpace.BORDER_COLOR;
        this._paperProject.view.update();
    };

    return _class;
})();
