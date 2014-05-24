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
    atlasCanvasEL.width = atlasCanvasEL.parentNode.clientWidth;
    atlasCanvasEL.height = atlasCanvasEL.parentNode.clientHeight;
    //
    var atlasEditor = new AtlasEditor(atlasCanvasEL);
    window.addEventListener('resize', function() {
        atlasCanvasEL.width = atlasCanvasEL.parentNode.clientWidth;
        atlasCanvasEL.height = atlasCanvasEL.parentNode.clientHeight;
        atlasEditor.updateWindowSize();
    }, false);

    atlasCanvasEL.ondragenter = function(e) {
        atlasEditor.droppingFile(true);
    };
    atlasCanvasEL.ondragover = function(e) {
        e.dataTransfer.dropEffect = 'copy';
    };
    atlasCanvasEL.ondragleave = function(e) {
        atlasEditor.droppingFile(false);
    };
    atlasCanvasEL.ondrop = function(e) {
        atlasEditor.droppingFile(false);

        var files = e.dataTransfer.files;
        atlasEditor.import(files);
    };

    //
    app.atlasEditor = atlasEditor;

    //
    angular.bootstrap(document, ['app-atlas-editor']);
});
