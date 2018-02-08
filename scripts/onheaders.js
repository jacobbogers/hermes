var http = require('http')
var onHeaders = require('on-headers')


let responseObj;

http
    .createServer(onRequest)
    .listen(3000)

let cnt = 0;

function addPoweredBy() {
    console.log('addPoweredBy');
    console.log(`"this" the same as response object:${this===responseObj}`)
        //
        // set if not set by end of request 
        //

    if (!this.getHeader('X-Powered-By')) {
        this.setHeader('X-Powered-By', `Node.js cnt:${cnt++}`);
    }
}


function onRequest(req, res) {
    console.log('onRequest');
    responseObj = res;
    console.log('onHeaders register "addPoweredBy" listener');

    onHeaders(res, addPoweredBy);

    console.log('res.setHeader, content-type: text/plain');
    res.setHeader('Content-Type', 'text/plain');
    console.log('res.writeHead');
    res.writeHead(200, 'CUSTOM?', { a: 'b', 'c': 'd' }); //actually works
    //will throw error if called second time
    //res.writeHead(200, 'CUSTOM?', { d: 'e', 'f': 'g' }); //will throw error,mokey
    // setTimeout to check pre-flush of headers over network
    setTimeout(() => {
        console.log('res.end');
        res.end('hello!');
    }, 2000);
    console.log('* end of onRequest');
}