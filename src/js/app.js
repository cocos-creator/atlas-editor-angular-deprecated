angular.module('atlasEditor', ['fireUI'])
.factory ( '$atlas', ['$rootScope', function ($rootScope) {
    var atlas = {};
    atlas.data = new FIRE.Atlas();
    atlas.layout = function () {
        this.data.sort();
        this.data.layout();
        $rootScope.$broadcast( 'repaint', true );
    };

    return atlas;
}])
.factory ( '$editor', function () {
    var editor = {};
    editor.elementBgColor = new FIRE.Color( 0, 0.28, 1, 0.5 );
    editor.elementSelectColor = new FIRE.Color(1,1,0,1);
    editor.backgroundColor = new FIRE.Color(0,0,0,0);
    editor.showCheckerboard = true;
    editor.smoothCanvas = true;

    return editor;
})
.run( ['$atlas', function($atlas) {
    console.log('starting atlas-editor');

    // document events
    document.ondrop = function(e) { e.preventDefault(); };
    document.ondragover = function(e) { e.preventDefault(); };
}])
;
