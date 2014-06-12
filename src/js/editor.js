var AtlasEditor = (function () {
    function AtlasEditor(ctx) {
        this.atlas = new FIRE.Atlas();
        this.ctx = ctx;
        this.elementBgColor = new FIRE.Color(1,1,1,0);
        this.elementSelectColor = new FIRE.Color(0,0,0,1);
    }

    // private
    var _acceptedTypes = {
        'image/png': true,
        'image/jpeg': true,
        'image/gif': true
    };
    var _processing = 0;

    var _onload = function (e) {
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

    //
    var _paint = function ( ctx, atlas, forExport ) {
        for (var i = 0; i < atlas.textures.length; ++i) {
            var tex = atlas.textures[i];
            var x = 0;
            var y = 0;
            if (tex.rotated) {
                ctx.save();
                ctx.translate(tex.x, tex.y + tex.width);
                ctx.rotate(-Math.PI * 0.5);
                x = 0;
                y = 0;
            }
            else {
                x = tex.x;
                y = tex.y;
            }

            if (!forExport) {
                ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
                ctx.fillRect( x, y, tex.width, tex.height );
            }
            ctx.drawImage( tex.image, 
                           tex.trimX, tex.trimY, tex.width, tex.height, 
                           x, y, tex.width, tex.height );  

            if (tex.rotated) {
                ctx.restore();
            }
        }
    };

    //
    AtlasEditor.prototype.repaint = function () {
        this.ctx.clearRect( 0, 0, this.atlas.width, this.atlas.height );
        _paint( this.ctx, this.atlas, false );
    };

    //
    AtlasEditor.prototype.paintNewCanvas = function () {
        var canvas = document.createElement("canvas");
        canvas.width = this.ctx.canvas.width;
        canvas.height = this.ctx.canvas.height;
        var ctx = canvas.getContext("2d");
        _paint( ctx, this.atlas, true );
        return canvas;
    };

    return AtlasEditor;
})();
