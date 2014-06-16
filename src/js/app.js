angular.module('atlasEditor', ['fireUI'])
.factory ( '$atlas', function () {
    var atlas = {};
    atlas.data = new FIRE.Atlas();
    atlas.layout = function () {
        this.data.sort();
        this.data.layout();
        // TODO: atlasEditor.repaint();
    };

    return atlas;
})
.run( [ '$atlas', function($atlas) {
    console.log('starting atlas-editor');

    // document events
    document.ondrop = function(e) { e.preventDefault(); };
    document.ondragover = function(e) { e.preventDefault(); };
}])
;
