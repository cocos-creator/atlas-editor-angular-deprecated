function AtlasCtrl($scope) {
    var i = 0;

    $scope.atlas = app.atlasEditor.atlas;
    $scope.sizes = [ 128, 256, 512, 1024, 2048, 4096 ];

    $scope.algorithmList = [];
    for (i=0;;++i) {
        if ( FIRE.Atlas.Algorithm[i] === undefined ) 
            break;
        $scope.algorithmList.push( { name: FIRE.Atlas.Algorithm[i], value: i }  );
    }

    $scope.sortByList = [];
    for (i=0;;++i) {
        if ( FIRE.Atlas.SortBy[i] === undefined ) 
            break;
        $scope.sortByList.push( { name: FIRE.Atlas.SortBy[i], value: i }  );
    }

    $scope.sortOrderList = [];
    for (i=0;;++i) {
        if ( FIRE.Atlas.SortOrder[i] === undefined ) 
            break;
        $scope.sortOrderList.push( { name: FIRE.Atlas.SortOrder[i], value: i }  );
    }

    $scope.layout = function () {
        $scope.atlas.sort();
        $scope.atlas.layout();
        app.atlasEditor.repaint();
    };

    var download = function (url, filename) {
        var a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
        a.href = url;
        a.download = filename;
        var event = document.createEvent("MouseEvents");
        event.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(event);
    };

    $scope.export = function () {
        window.navigator.saveBlob = window.navigator.saveBlob || window.navigator.msSaveBlob;
        // export json
        var json = FIRE.serialize(app.atlasEditor.atlas);
        var blob = new Blob([json], {type: "text/plain;charset=utf-8"});    // not support 'application/json'
        var name = 'atlas';
        if (window.navigator.saveBlob) {
            window.navigator.saveBlob(blob, name + ".json");
        }
        else {
            var jsonDataURL = (window.URL || window.webkitURL).createObjectURL(blob);
            download(jsonDataURL, name + ".json");
        }
        // export png
        var canvas = app.atlasEditor.paintNewCanvas();
        canvas.toBlob = canvas.toBlob || canvas.msToBlob;
        window.BlobBuilder = window.BlobBuilder || window.MSBlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
        if (window.BlobBuilder && canvas.toBlob && window.navigator.saveBlob) {
            var blobBuilderObject = new BlobBuilder(); // Create a blob builder object so that we can append content to it.
            blobBuilderObject.append(canvas.toBlob()); // Append the user's drawing in PNG format to the builder object.
            window.navigator.saveBlob(blobBuilderObject.getBlob(), name + ".png"); // Move the builder object content to a blob and save it to a file.
        }
        else {
            var pngDataURL = canvas.toDataURL("image/png");
            download(pngDataURL, name + ".png");
        }
    };
}
