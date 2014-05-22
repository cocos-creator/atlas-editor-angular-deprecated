var AtlasEditor = (function () {
    function AtlasEditor(paperProject) {
        this.atlas = new FIRE.Atlas();

        this.paperProject = paperProject;
        this.selection = [];
        this.mouseDragged = false;

        // init layers, sorted by create order
        paperProject.activate();
        this.bottomLayer = paperProject.activeLayer || new paper.Layer();
        this.atlasLayer = new paper.Layer();
        this.handlerLayer = new paper.Layer();
        //

        this._bindEvents();
    }

    // private
    var _acceptedTypes = {
        'image/png': true,
        'image/jpeg': true,
        'image/gif': true
    };
    var _processing = 0;

    AtlasEditor.prototype._bindEvents = function () {
        var tool = new paper.Tool();
        var self = this;
        tool.onMouseDown = function (event) {
            if (!event.item && !(event.modifiers.control || event.modifiers.command)) {
                self._clearSelection();
            }
        };
        tool.onMouseDrag = function (event) {
            for (var i = 0; i < self.selection.length; i++) {
                var atlas = self.selection[i];
                var bg = atlas.data.bg;
                var outline = atlas.data.outline;
                var tex = atlas.data.texture;
                // update canvas
                atlas.position = atlas.position.add(event.delta);
                if (bg) {
                    bg.position = bg.position.add(event.delta);
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
        var unTrimmedRaster = new paper.Raster(tex.image);
        var trimRect = new paper.Rectangle(tex.trimX, tex.trimY, tex.width, tex.height);
        var raster = unTrimmedRaster.getSubRaster(trimRect);
        unTrimmedRaster.remove();
        if (tex.rotated) {
            raster.pivot = new paper.Point(-tex.width * 0.5, tex.height * 0.5);
            raster.rotation = 90;
        }
        else {
            raster.pivot = new paper.Point(-tex.width * 0.5, -tex.height * 0.5);
        }
        return raster;
    };

    AtlasEditor.prototype._clearSelection = function () {
        for (var selected in this.selection) {
            if (selected.outline) {
                selected.outline = null;
            }
        }
        this.selection.length = 0;
        this.handlerLayer.removeChildren();
    };

    AtlasEditor.prototype._selectAtlas = function (atlasRaster, event) {
        this.selection.push(atlasRaster);
        atlasRaster.bringToFront();

        this.paperProject.activate();
        this.handlerLayer.activate();
        var outline = new paper.Shape.Rectangle(atlasRaster.bounds);
        outline.style = {
            strokeColor: 'white',
            strokeWidth: 2
        };
        atlasRaster.data.outline = outline;
    };

    //
    AtlasEditor.prototype._paint = function ( paperProject, forExport ) {
        paperProject.activate();

        var onDown, onUp;
        if (!forExport) {
            var self = this;
            onDown = function (event) {
                if (!(event.modifiers.control || event.modifiers.command)) {
                    var index = self.selection.indexOf(this);
                    if (index == -1) {
                        self._clearSelection();
                        self._selectAtlas(this, event);
                    }
                }
            };
            onUp = function (event) {
                if (self.mouseDragged) {
                    return;
                }
                if ((event.modifiers.control || event.modifiers.command)) {
                    var index = self.selection.indexOf(this);
                    if (index != -1) {
                        self.selection.splice(index, 1);
                        this.data.outline.remove();
                        this.data.outline = null;
                        this.bringToFront();
                        return;
                    }
                    self._selectAtlas(this, event);
                }
                else {
                    self._clearSelection();
                    self._selectAtlas(this, event);   
                }
            };
            this.atlasLayer.activate();
        }
        
        for (var i = 0; i < this.atlas.textures.length; ++i) {
            var tex = this.atlas.textures[i];
            var atlasRaster = _getAtalsRaster(tex); 
            atlasRaster.position = [tex.x, tex.y];
            
            if (!forExport) {
                atlasRaster.data.texture = tex;
                // draw rectangle

                this.bottomLayer.activate();

                var rect = new paper.Shape.Rectangle(tex.x, tex.y, tex.rotatedWidth(), tex.rotatedHeight());
                rect.fillColor = new paper.Color(0, 0, 200 / 255, 0.5);
                atlasRaster.data.bg = rect;

                this.atlasLayer.activate();

                // bind events
                atlasRaster.onMouseDown = onDown;
                atlasRaster.onMouseUp = onUp;
            }
        }
        paper.view.draw();
    };

    //
    AtlasEditor.prototype.repaint = function () {
        this.bottomLayer.removeChildren();
        this.atlasLayer.removeChildren();
        this.handlerLayer.removeChildren();
        this.selection.length = 0;
        this._paint( this.paperProject, false );
    };

    //
    AtlasEditor.prototype.paintNewCanvas = function () {
        var canvas = document.createElement("canvas");
        var size = this.paperProject.view.size;
        paper.setup(canvas);
        paper.view.viewSize = [512, 512];
        this._paint( paper.project, true );
        return canvas;
    };

    return AtlasEditor;
})();
