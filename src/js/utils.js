var Utils;
(function (Utils) {
    
    // ------------------------------------------------------------------ 
    /// prevents edge artifacts due to bilinear filtering
    /// Note: Some image editors like Photoshop tend to fill purely transparent pixel with
    /// white color (R=1, G=1, B=1, A=0). This is generally OK, because these white pixels
    /// are impossible to see in normal circumstances.  However, when such textures are
    /// used in 3D with bilinear filtering, the shader will sometimes sample beyond visible
    /// edges into purely transparent pixels and the white color stored there will bleed
    /// into the visible edge.  This method scans the texture to find all purely transparent
    /// pixels that have a visible neighbor pixel, and copy the color data from that neighbor
    /// into the transparent pixel, while preserving its 0 alpha value.  In order to
    /// optimize the algorithm for speed of execution, a compromise is made to use any
    /// arbitrary neighboring pixel, as this should generally lead to correct results.
    /// It also limits itself to the immediate neighbors around the edge, resulting in a
    /// a bleed of a single pixel border around the edges, which should be fine, as bilinear
    /// filtering should generally not sample beyond that one pixel range.
    // ------------------------------------------------------------------ 

    // X and Y offsets used in contour bleed for sampling all around each purely transparent pixel

    var applyContourBleed = function (resultBuffer, srcBuffer, width, rect, sampleXOffsets, sampleYOffsets, bufIdxOffsets) {
        if ( rect.width === 0 || rect.height === 0 ) {
            return;
        }

        var start_x = rect.x;
        var end_x = rect.xMax;
        var start_y = rect.y;
        var end_y = rect.yMax;

        var pixelBytes = 4;
        var ditch = width * pixelBytes;
        var offsetIndex = 0, offsetCount = sampleXOffsets.length;

        var sampleX = 0, sampleY = 0, sampleBufIdx = 0;
        var bufIdx = 0;
        var bufRowStart = start_y * ditch + start_x * pixelBytes;
        for ( var y = start_y, x = 0; y < end_y; ++y, bufRowStart += ditch ) {
            bufIdx = bufRowStart;
            for ( x = start_x; x < end_x; ++x, bufIdx += pixelBytes ) {
                // only needs to bleed into purely transparent pixels
                if ( srcBuffer[bufIdx + 3] === 0 ) {
                    // sample all around to find any non-purely transparent pixels
                    for ( offsetIndex = 0; offsetIndex < offsetCount; offsetIndex++ ) {
                        sampleX = x + sampleXOffsets[offsetIndex];
                        sampleY = y + sampleYOffsets[offsetIndex];
                        // check to stay within texture bounds
                        if (sampleX >= start_x && sampleX < end_x && sampleY >= start_y && sampleY < end_y) {
                            sampleBufIdx = bufIdx + bufIdxOffsets[offsetIndex];
                            if (srcBuffer[sampleBufIdx + 3] > 0) {
                                // Copy RGB color channels to purely transparent pixel, but preserving its 0 alpha
                                resultBuffer[bufIdx] = srcBuffer[sampleBufIdx];
                                resultBuffer[bufIdx + 1] = srcBuffer[sampleBufIdx + 1];
                                resultBuffer[bufIdx + 2] = srcBuffer[sampleBufIdx + 2];
                                break;
                            }
                        }
                    }
                }
            }
        }
    };
    
    Utils.applyBleed = function (atlas, srcBuffer) {
        var resultBuffer = new Uint8ClampedArray(srcBuffer);
        if (atlas.useContourBleed) {
            console.time("apply contour bleed");
            // init offsets
            var pixelBytes = 4;
            var ditch = atlas.width * pixelBytes;
            var sampleXOffsets = [-1,  0,  1, -1,  1, -1,  0,  1];
            var sampleYOffsets = [-1, -1, -1,  0,  0,  1,  1,  1];
            var bufIdxOffsets = [];
            for (var j = 0; j < sampleXOffsets.length; j++) {
                bufIdxOffsets[j] = sampleXOffsets[j] * pixelBytes + sampleYOffsets[j] * ditch;
            }
            // bleed elements
            for (var i = 0, tex = null; i < atlas.textures.length; i++) {
                tex = atlas.textures[i];
                applyContourBleed(resultBuffer, srcBuffer, atlas.width, new FIRE.Rect(tex.x, tex.y, tex.rotatedWidth, tex.rotatedHeight), 
                                  sampleXOffsets, sampleYOffsets, bufIdxOffsets);
            }
            console.timeEnd("apply contour bleed");
        }
        if (atlas.usePaddingBleed) {
            console.time("apply padding bleed");
            console.timeEnd("apply padding bleed");
        }
        return resultBuffer;
    };

})(Utils || (Utils = {}));