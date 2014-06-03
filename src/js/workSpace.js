var WorkSpace = (function () {

    var DEFAULT_TOP_MARGIN = 20;

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
    var _class = WorkSpace;

    _class.BORDER_COLOR = new paper.Color(0.08, 0.08, 0.08, 1);
    
    _class.initLayer = function (existedLayer) {
        existedLayer = existedLayer || new paper.Layer();
        existedLayer.remove();
        existedLayer.applyMatrix = false;
        existedLayer.position = [0, 0];   // in paper, position should be settled before pivot
        existedLayer.pivot = [0, 0];
        return existedLayer;
    };
    
    _class.prototype.setZoom = function (zoom) {
        this._zoom = zoom;

        var center = this._border.bounds.center;    // current center
        var offset = 512 * this._zoom / 2;
        this._globalTransformLayer.position = this._globalTransformLayer.position.add(center).subtract([offset, offset]).round();

        this._recreateBackground();
        this._updateCanvas();
    };
    
    _class.prototype.updateWindowSize = function () {
        // resize
        var view = this._paperProject.view;
        view.viewSize = [view.element.width, view.element.height];

        if (this._autoCentered === false) {
            _centerViewport(this);
            this._autoCentered = true;
        }
        // repaint
        this._paperProject.activate();
        this.repaint();
    };

    _class.prototype.repaint = function () {
        this._recreateBackground();
    };

    _class.prototype._updateCanvas = function () {
        this._paperProject.view.update();
    };
    
    // need its paper project activated
    _class.prototype._recreateBackground = function () {
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
            strokeColor: WorkSpace.BORDER_COLOR,
            shadowColor: [0, 0, 0, 0.7],
            shadowBlur: 8,
            shadowOffset: new paper.Point(2, 2),
        };
    };

    _class.prototype._onMouseDrag = function (target, event) {
        var rightButtonDown = event.event.which === 3;
        rightButtonDown = rightButtonDown || (event.event.buttons !== 'undefined' && (event.event.buttons & 2) > 0); // tweak for firefox and IE
        if (rightButtonDown) {
            // drag viewport
            this._globalTransformLayer.position = this._globalTransformLayer.position.add(event.delta);
            return false;
        }
    };

    _class.prototype._onMouseDown = function (target, event) {};

    _class.prototype._onMouseUp = function (target, event) {};

    var _initLayers = function (self) {
        self._globalTransformLayer = WorkSpace.initLayer(self._paperProject.activeLayer);   // to support viewport movement
        self._bgLayer = WorkSpace.initLayer();           // to draw checkerboard, border, shadow etc.

        self._paperProject.layers.push(self._globalTransformLayer);
        self._globalTransformLayer.addChildren([
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
        //        self._globalTransformLayer.position = self._globalTransformLayer.position.add(delta);
        //    }
        //});
        
        // zoom in / out
        canvas.bind('mousewheel DOMMouseScroll', function(e) {
            if(e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
                self._zoom += 0.1;
                self._zoom = Math.min(self._zoom, 8);
            }
            else {
                self._zoom -= 0.1;
                self._zoom = Math.max(self._zoom, 0.1);
            }
            self.setZoom(self._zoom);
        });

        // prevent default menu
        canvasEL.oncontextmenu = function() { return false; };
    };

    var _centerViewport = function (self) {
        var size = self._paperProject.view.viewSize;
        var x = Math.round((size.width - 512) * 0.5);
        self._globalTransformLayer.position = [x, DEFAULT_TOP_MARGIN];
    };

    return _class;
})();