var PaperUtils = {};

PaperUtils.createSpriteRaster = function (tex) {
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

PaperUtils.createLayer = function () {
    var newLayer = new paper.Layer(paper.Item.NO_INSERT);
    newLayer.applyMatrix = false;
    newLayer.position = [0, 0];   // in paper, position should be settled before pivot
    newLayer.pivot = [0, 0];
    return newLayer;
};
