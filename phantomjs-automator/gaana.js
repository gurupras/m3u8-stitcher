var webpage = require('webpage');
var page = webpage.create();
var system = require('system');
var fs = require('fs');
var m3u8 = require('./m3u');

var process = require('child_process');
var spawn = process.spawn;
var execFile = process.execFile;


page.viewportSize = {
	width: 1920,
	height: 1080,
};

var args = system.args;

if(args.length !== 2) {
	console.log('Usage: <script> URL');
	phantom.exit(-1);
}

page.onConsoleMessage = function(msg) {
	try {
		msg = JSON.parse(msg);
		if(msg.action === 'download' && msg.streamPath) {
			download(msg);
		} else {
			console.log(msg);
		}
	} catch(e) {
		console.log(msg);
	}
};

page.onResourceReceived = function(response) {
	if(response.url.indexOf('m3u8') !== -1) {
		//console.log(response.url);
	}
	//console.log(response.url);
};

function download(data) {
	if(!fs.exists(data.albumtitle)) {
		fs.makeTree(data.albumtitle);
	}
	console.log('Downloading ...');
	var args = ['-v', '1', '-i', data.streamPath, '-c', 'copy', '-bsf:a', 'aac_adtstoaac', data.albumtitle + '/' + data.title + '.aac'];
	console.log('ffmpeg ' + args.join(' '));
	execFile('ffmpeg', args, null, function(err, stdout, stderr) {
		console.log(stdout);
		console.log(stderr);
	});
}

page.open(args[1], function(status) {
	if(status !== 'success') {
		console.log('Failed to open page: ' + args[1]);
		phantom.exit(-1);
	}
	page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js', function() {
		page.evaluate(function() {
			setTimeout(function() {
				$('ul.s_l.artworkload').each(function(idx, el) {
					var data = JSON.parse($(el).find('span').text());
					//console.log(JSON.stringify(data, null, '  '));
					var key = CryptoJS.enc.Base64.parse('Z0AxbiEoZjEjci4wJCkmJQ==');
					var iv = CryptoJS.enc.Base64.parse('YXNkIUAjIUAjQCExMjMxMg==');
					var message = data.path.medium[0].message;
					//console.log('key: ' + key);
					//console.log('iv:  ' + iv);
					//console.log('message: ' + message);
					var decrypted = CryptoJS.AES.decrypt(message, key, {mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7, iv: iv});
					var streamPath = decrypted.toString(CryptoJS.enc.Utf8);
					// Special console log to trigger download
					console.log(streamPath);
					data.action = 'download';
					data.streamPath = streamPath;
					data.idx = idx;
					console.log(JSON.stringify(data));
				});
			}, 500);
		});
	});
});
