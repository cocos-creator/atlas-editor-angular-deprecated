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
        var dataURL;
        // export json
        var json = FIRE.serialize(app.atlasEditor.atlas);
        var blob = new Blob([json], {type: "text/plain;charset=utf-8"});    // not support 'application/json'
        dataURL = (window.URL || window.webkitURL).createObjectURL(blob);
        download(dataURL, name + ".json");
        // export png
        var canvas = app.atlasEditor.paintNewCanvas();
        dataURL = canvas.toDataURL("image/png");
        download(dataURL, name + ".png");
    };
}
