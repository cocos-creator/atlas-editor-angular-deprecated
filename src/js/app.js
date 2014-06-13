angular.module('atlasEditor', ['fireUI'])
.run( [ '$rootScope', function($rootScope) {
    console.log('starting atlas-editor');

    // document events
    document.ondrop = function(e) { e.preventDefault(); };
    document.ondragover = function(e) { e.preventDefault(); };

    // atlasCanvasEL events
    var atlasCanvasEL = document.getElementById('atlas-canvas');
    atlasCanvasEL.width = 512;
    atlasCanvasEL.height = 512;
    var ctx = atlasCanvasEL.getContext("2d");

    //
    var atlasEditor = new AtlasEditor(ctx);
    atlasCanvasEL.ondragenter = function(e) {
        this.style.borderColor = 'blue';
    };
    atlasCanvasEL.ondragover = function(e) {
        e.dataTransfer.dropEffect = 'copy';
    };
    atlasCanvasEL.ondragleave = function(e) {
        this.style.borderColor = 'black';
    };
    atlasCanvasEL.ondrop = function(e) {
        this.style.borderColor = 'black';

        var files = e.dataTransfer.files;
        atlasEditor.import(files);
    };

    //
    $rootScope.atlasEditor = atlasEditor;
}])
.controller( "atlasCtrl", ["$scope", "$rootScope", function ($scope, $rootScope) {
    $scope.atlas = $rootScope.atlasEditor.atlas;
    $scope.sizeList = [ 
        { name: '128', value: 128 },
        { name: '256', value: 256 },
        { name: '512', value: 512 },
        { name: '1024', value: 1024 },
        { name: '2048', value: 2048 },
        { name: '4096', value: 4096 },
    ];
    $scope.atlasEditor = $rootScope.atlasEditor;

    $scope.layout = function () {
        $scope.atlas.sort();
        $scope.atlas.layout();
        $scope.atlasEditor.repaint();
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
        var json = FIRE.serialize($scope.atlasEditor.atlas);
        var blob = new Blob([json], {type: "text/plain;charset=utf-8"});    // not support 'application/json'
        dataURL = (window.URL || window.webkitURL).createObjectURL(blob);
        download(dataURL, name + ".json");
        // export png
        var canvas = $scope.atlasEditor.paintNewCanvas();
        dataURL = canvas.toDataURL("image/png");
        download(dataURL, name + ".png");
    };
}])
;
