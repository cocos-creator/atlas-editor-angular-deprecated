angular.module('atlasEditor')
.controller( "rightPanelCtrl", ["$scope", "$atlas", "$editor", function ($scope, $atlas, $editor) {
    $scope.sizeList = [ 
        { name: '128', value: 128 },
        { name: '256', value: 256 },
        { name: '512', value: 512 },
        { name: '1024', value: 1024 },
        { name: '2048', value: 2048 },
        { name: '4096', value: 4096 },
    ];
    $scope.atlas = $atlas.data;
    $scope.editor = $editor;

    $scope.layout = function () {
        $atlas.layout();
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
        // 测试代码，需要整理
        var editor = angular.element($("#workspace")).scope();
        window.navigator.saveBlob = window.navigator.saveBlob || window.navigator.msSaveBlob;
        // export json
        var json = FIRE.serialize($scope.atlas);
        var blob = new Blob([json], { type: "text/plain;charset=utf-8" });    // not support 'application/json'
        var name = 'atlas';
        if (window.navigator.saveBlob) {
            window.navigator.saveBlob(blob, name + ".json");
        }
        else {
            var jsonDataURL = (window.URL || window.webkitURL).createObjectURL(blob);
            download(jsonDataURL, name + ".json");
        }
        // export png
        var canvas = editor.paintNewCanvas();
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
}])
;
