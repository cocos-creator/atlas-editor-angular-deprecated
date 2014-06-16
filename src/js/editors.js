var WorkSpace = (function () {
    
    // ================================================================================
    /// constructor
    // ================================================================================

    function WorkSpace (canvas) {
        this._zoom = 1;
        this._border = null;
        this._autoCentered = false;  // 打开网页后，自动居中一次，然后才显示出来

        // init paper
        var size = [canvas.width, canvas.height];
        paper.setup(canvas);
        paper.view.viewSize = size; // to prevent canvas resizing during paper.setup
        this._paperProject = paper.project;

        _initLayers(this);
        this._recreateBackground();
        _centerViewport(this);
        paper.view.update();

        _bindEvents(this);
    }

    // ================================================================================
    /// static
    // ================================================================================

    WorkSpace.borderColor = new paper.Color(0.08, 0.08, 0.08, 1);

    WorkSpace.createLayer = function (existedLayer) {
        existedLayer = existedLayer || new paper.Layer(paper.Item.NO_INSERT);
        existedLayer.applyMatrix = false;
        existedLayer.position = [0, 0];   // in paper, position should be settled before pivot
        existedLayer.pivot = [0, 0];
        return existedLayer;
    };

    WorkSpace.createSpriteRaster = function (tex) {
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

    WorkSpace.createAtlasRasters = function (atlas, addBounds, onMouseDown, onMouseUp) {
        console.time('create raster');
        for (var i = 0; i < atlas.textures.length; ++i) {
            var tex = atlas.textures[i];
            var raster = WorkSpace.createSpriteRaster(tex);
            raster.data.texture = tex;
            if (addBounds) {
                raster.data.boundsItem = new paper.Shape.Rectangle(paper.Item.NO_INSERT);
                raster.data.boundsItem.insertBelow(raster);
                // bind events
                if (onMouseDown) {
                    raster.onMouseDown = onMouseDown;
                }
                if (onMouseUp) {
                    raster.onMouseUp = onMouseUp;
                }
            }
            else {
                raster.position = [tex.x, tex.y];
            }
        }
        console.timeEnd('create raster');
    };

    // ================================================================================
    /// public
    // ================================================================================

    WorkSpace.prototype.setZoom = function (zoom) {
        var center = this._paperProject.view.center;
        var offset = this._cameraLayer.position.subtract(center);
        var newOffset = offset.divide(this._zoom).multiply(zoom);
        this._cameraLayer.position = center.add(newOffset).round();

        this._zoom = zoom;

        this._paperProject.activate();
        this._recreateBackground();
        _updateCanvas(this);
    };

    WorkSpace.prototype.updateWindowSize = function () {
        // resize
        var view = this._paperProject.view;
        view.viewSize = [view.element.width, view.element.height];

        //console.log(init + ' ' + view.viewSize);
        //this._paperProject.activate();
        if (this._autoCentered === false) {
            _centerViewport(this);
            this._autoCentered = true;

            //this.repaint();
        }
        //else {
        //    this._updateCanvas();
        //}

        // 按理说只要第一次repaint，之后_updateCanvas就行，但这样会导致打开网页时常常看不到东西，不知道为什么
        this._paperProject.activate();
        this.repaint();
    };

    WorkSpace.prototype.paintNewCanvas = function () {
        var canvas = document.createElement("canvas");
        paper.setup(canvas);
        paper.view.viewSize = [512, 512];
        this._recreateAtlas(true);
        return canvas;
    };

    // ================================================================================
    /// overridable
    // ================================================================================

    // recreate all item
    WorkSpace.prototype.repaint = function () {
        this._paperProject.activate();
        this._recreateBackground();
    };

    // need its paper project activated
    WorkSpace.prototype._recreateAtlas = function () {};

    WorkSpace.prototype._doUpdateCanvas = function () {};
    
    // need its paper project activated
    WorkSpace.prototype._recreateBackground = function () {
        this._bgLayer.activate();
        this._bgLayer.removeChildren();
        var borderWidth = 2;
        // draw rect
        var size = Math.floor(512 * this._zoom);
        var borderRect = new paper.Rectangle(0, 0, size, size);
        borderRect = borderRect.expand(borderWidth);
        this._border = new paper.Shape.Rectangle(borderRect);
        //this._border.fillColor = new paper.Color(204/255, 204/255, 204/255, 1);
        this._border.style = {
            strokeWidth: borderWidth,
            strokeColor: WorkSpace.borderColor,
            shadowColor: [0, 0, 0, 0.5],
            shadowBlur: 7,
            shadowOffset: new paper.Point(2, 2),
        };
    };

    WorkSpace.prototype._onMouseDrag = function (target, event) {
        var rightButtonDown = event.event.which === 3;
        rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
        if (rightButtonDown) {
            // drag viewport
            this._cameraLayer.position = this._cameraLayer.position.add(event.delta);
            return false;
        }
    };

    WorkSpace.prototype._onMouseDown = function (target, event) {};

    WorkSpace.prototype._onMouseUp = function (target, event) {};

    // ================================================================================
    /// private
    // ================================================================================

    var _initLayers = function (self) {
        self._cameraLayer = WorkSpace.createLayer(self._paperProject.activeLayer);   // to support viewport movement
        self._bgLayer = WorkSpace.createLayer();           // to draw checkerboard, border, shadow etc.

        self._paperProject.layers.push(self._cameraLayer);
        self._cameraLayer.addChildren([
            // BOTTOM (sorted by create order) -----------
            self._bgLayer,
            // TOP ---------------------------------------
        ]);
    };

    var _bindEvents = function (self) {
        var tool = new paper.Tool();
        tool.onMouseDrag = function (event) {
            return self._onMouseDrag(this, event);
        };
        tool.onMouseDown = function (event) {
            return self._onMouseDown(this, event);
        };
        tool.onMouseUp = function (event) {
            return self._onMouseUp(this, event);
        };

        var canvasEL = self._paperProject.view.element;
        var canvas = $(canvasEL);

        //var lastPoint;
        //canvas.mousemove(function (event) {
        //    //console.log(event);
        //    var delta;
        //    if (typeof(lastPoint) !== 'undefined') {
        //        delta = [event.screenX - lastPoint.x, event.screenY - lastPoint.y];
        //        lastPoint = new paper.Point(event.screenX, event.screenY);
        //    }
        //    else {
        //        lastPoint = new paper.Point(event.screenX, event.screenY);
        //        return;
        //    }
        //    var rightButtonDown = event.which === 3;
        //    rightButtonDown = rightButtonDown || (typeof(event.buttons) !== 'undefined' && (event.buttons & 2) > 0); // tweak for firefox and IE
        //    if (rightButtonDown) {
        //        // drag viewport
        //        self._cameraLayer.position = self._cameraLayer.position.add(delta);
        //    }
        //});
        
        // zoom in / out
        canvas.bind('mousewheel DOMMouseScroll', function(e) {
            var zoom = self._zoom;
            if(e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
                zoom += 0.1;
                zoom = Math.min(zoom, 8);
            }
            else {
                zoom -= 0.1;
                zoom = Math.max(zoom, 0.1);
            }
            self.setZoom(zoom);
        });

        // prevent default menu
        canvasEL.oncontextmenu = function() { return false; };
    };

    var _centerViewport = function (self) {
        var size = self._paperProject.view.viewSize;
        var x = Math.round((size.width - 512) * 0.5);
        var y = Math.round((size.height - 512) * 0.5);
        self._cameraLayer.position = [x, y];
    };

    var _updateCanvas = function (self) {
        self._doUpdateCanvas();
        self._paperProject.view.update();
    };

    return WorkSpace;
})();


var AtlasEditor = (function () {
    var _super = WorkSpace;

    var _gridColor1 = new paper.Color(204/255, 204/255, 204/255, 1);
    var _gridColor2 = new paper.Color(135/255, 135/255, 135/255, 1);
    var _atlasBoundColor = new paper.Color(0, 0, 1, 0.37);
    var _borderColorHighlight = 'blue';
    
    function AtlasEditor(canvas) {
        this._selection = [];
        this._atlasDragged = false;
        this._gridSize = 32;

        this.atlas = new FIRE.Atlas();
        this.elementBgColor = new FIRE.Color(1,1,1,0);
        this.elementSelectColor = new FIRE.Color(0,0,0,1);

        _super.call(this, canvas);
        
        _initLayers(this);
    }
    FIRE.extend(AtlasEditor, _super);

    var _initLayers = function (self) {
        //self._atlasBgLayer = WorkSpace.createLayer();
        self._atlasLayer = WorkSpace.createLayer();        // to draw atlas bounds & texture
        self._atlasHandlerLayer = WorkSpace.createLayer(); // to draw outline of selected atlas

        self._cameraLayer.addChildren([
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

    AtlasEditor.prototype._onMouseDown = function (target, event) {
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

    AtlasEditor.prototype._onMouseUp = function (target, event) {
        if (_super.prototype._onMouseUp.call(this, target, event) === false) {
            return false;
        }
        if (event.event.which === 1) {
            this._atlasDragged = false;
            return false;
        }
    };

    AtlasEditor.prototype._onMouseDrag = function (target, event) {
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
                editor._recreateAtlas(false);
                return;
            }
            setTimeout( checkIfFinished, 500 );
        };
        checkIfFinished();
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
    AtlasEditor.prototype._recreateBackground = function () {
        _super.prototype._recreateBackground.call(this);
        
        // draw rect
        this._border.fillColor = _gridColor1;
        this.droppingFile(false);
        // draw checkerboard
        var posFilter = Math.round;
        var sizeFilter = Math.floor;
        var zoomedGridSize = sizeFilter(this._gridSize * this._zoom);
        var template = new paper.Shape.Rectangle(0, 0, zoomedGridSize, zoomedGridSize);
        template.remove();
        template.fillColor = _gridColor2;
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

    AtlasEditor.prototype._recreateAtlas = function (forExport) {
        var self = this;
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
        WorkSpace.createAtlasRasters(self.atlas, !forExport, onDown, onUp);

        if (!forExport) {
            _updateAtlas (self, forExport);
        }
        paper.view.update();
    };

    AtlasEditor.prototype._doUpdateCanvas = function () {
        _super.prototype._doUpdateCanvas.call(this);
        _updateAtlas(this, false);
    };

    var _updateAtlas = function ( self ) {
        var posFilter = Math.round;
        //var sizeFilter = Math.round;
        var children = self._atlasLayer.children;
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            var isRaster = child.data && child.data.texture;
            if (!isRaster) {
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
            bounds.fillColor = _atlasBoundColor;
            // update outline
            var outline = child.data.outline;
            if (outline) {
                outline.position = bounds.position;
                outline.size = bounds.size;
            }
        }
        //paper.view.draw();
    };

    AtlasEditor.prototype.repaint = function () {
        _super.prototype.repaint.call(this);
        this._recreateAtlas(false);
    };

    //
    AtlasEditor.prototype.droppingFile = function (dropping) {
        this._border.strokeColor = dropping ? _borderColorHighlight : WorkSpace.borderColor;
        this._paperProject.view.update();
    };

    return AtlasEditor;
})();
