// Create server.js file with this content:
var connect = require('connect');
connect.createServer(
    connect.static(__dirname)
).listen(8080);

console.log('Server established! localhost:8080');
