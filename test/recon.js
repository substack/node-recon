var recon = require('recon');
var net = require('net');

exports.buffered_write = function (assert) {
    var port = Math.floor(10000 + Math.random() * (Math.pow(2,16) - 10000));
    
    var cb_count = 0;
    var conn = recon(port, function (c) {
        assert.ok(c instanceof net.Stream);
        cb_count ++;
    });
    var bufs = [];
    
    conn.on('data', function (buf) {
        bufs.push(buf.toString());
        setTimeout(function () {
            conn.write(buf);
            if (buf.toString() == 'end') {
                conn.end();
                assert.eql(bufs, [ 'pow!', 'end' ]);
            }
        }, 25);
    });
    
    var events = [];
    
    var cto = setTimeout(function () {
        assert.fail('never connected');
    }, 5000);
    conn.on('connect', function () {
        clearTimeout(cto);
        events.push('connect');
    });
    
    var dto = setTimeout(function () {
        assert.fail('never dropped');
    }, 5000);
    conn.on('drop', function () {
        clearTimeout(dto);
        events.push('drop');
    });
    
    var rcto = setTimeout(function () {
        assert.fail('never reconnected');
    }, 5000);
    conn.on('reconnect', function () {
        clearTimeout(rcto);
        events.push('reconnect');
        
        assert.eql(events, [ 'connect', 'drop', 'reconnect' ]);
    });
    
    setTimeout(function () {
        var server1 = net.createServer(function (stream) {
            stream.write('pow!');
            stream.destroy();
            server1.close();
            
            stream.on('data', function () {
                assert.fail('wrote before it was supposed to');
            });
        });
        server1.listen(port);
        
        server1.on('close', function () {
            setTimeout(function () {
                var server2 = net.createServer(function (stream) {
                    stream.write('end');
                    var recv = [];
                    stream.on('data', function (buf) {
                        recv.push(buf.toString());
                    });
                    
                    setTimeout(function () {
                        conn.destroy();
                        stream.destroy();
                        server2.close();
                        assert.eql(recv, [ 'pow!', 'end' ]);
                        assert.eql(cb_count, 3);
                    }, 50);
                });
                server2.listen(port);
            }, 100);
        });
    }, 100);
};
