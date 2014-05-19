// (function () {
//     // document.onreadystatechange = function () {
//     window.onload = function () {
//         if (document.readyState == 'complete') {
//             initApplication();
//         }
//     };
//     function initApplication () {
//     } 
// })();

var app = angular.module('app-atlas-editor', []);

angular.element(document).ready(function() {

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
    app.atlasEditor = atlasEditor;

    //
    angular.bootstrap(document, ['app-atlas-editor']);
});
