var http = require('http').createServer(handler); //require http server, and create server with function handler()
var fs = require('fs'); //require filesystem module
var io = require('socket.io')(http); //require socket.io module and pass the http object (server)
var Gpio = require('pigpio').Gpio; //include pigpio to interact with the GPIO

var rpiDhtSensor = require('rpi-dht-sensor');
 
var dht = new rpiDhtSensor.DHT11(27);
 
function read () {
  var readout = dht.read();
 
    console.log('Temperature: ' + readout.temperature.toFixed(2) + 'C, ' +
        'humidity: ' + readout.humidity.toFixed(2) + '%');
//    setTimeout(read, 5000);
}
read();

//var sensor = require('node-dht-sensor');

//sensor.read(11, 27, function(err, temperature, humidity) {
//    if (!err) {
//        console.log('temp: ' + temperature.toFixed(1) + '°C, ' +
//            'humidity: ' + humidity.toFixed(1) + '%'
//        )
//    }
//    else
//    {
//      console.log(err);
//     }
//});


//var dht = require('dht-sensor');
//var current = dht.read(11, 27); //DHT11 thermosensor GPIO27
//console.log(current.humidity);
//console.log(current.temperature);

var ledRed = new Gpio(4, {mode: Gpio.OUTPUT}), //use GPIO pin 4 as output for RED
ledGreen = new Gpio(17, {mode: Gpio.OUTPUT}), //use GPIO pin 17 as output for GREEN
ledBlue = new Gpio(22, {mode: Gpio.OUTPUT}), //use GPIO pin 27 as output for BLUE
redRGB = 255, //set starting value of RED variable to off (255 for common anode)
greenRGB = 255, //set starting value of GREEN variable to off (255 for common anode)
blueRGB = 255; //set starting value of BLUE variable to off (255 for common anode)



//RESET RGB LED
ledRed.digitalWrite(1); // Turn RED LED off
ledGreen.digitalWrite(1); // Turn GREEN LED off
ledBlue.digitalWrite(1); // Turn BLUE LED off

http.listen(8080); //listen to port 8080

function handler (req, res) { //what to do on requests to port 8080
  fs.readFile(__dirname + '/public/index.html', function(err, data) { //read file rgb.html in public folder
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'}); //display 404 on error
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'text/html'}); //write HTML
    res.write(data); //write data from rgb.html
    return res.end();
  });
}

io.sockets.on('connection', function (socket) {// Web Socket Connection
  socket.on('rgbLed', function(data) { //get light switch status from client
    console.log(data); //output data from WebSocket connection to console

    //for common anode RGB LED  255 is fully off, and 0 is fully on, so we have to change the value from the client
    redRGB=255-parseInt(data.red); 
    greenRGB=255-parseInt(data.green);
    blueRGB=255-parseInt(data.blue);

    console.log("rbg: " + redRGB + ", " + greenRGB + ", " + blueRGB); //output converted to console

    ledRed.pwmWrite(redRGB); //set RED LED to specified value
    ledGreen.pwmWrite(greenRGB); //set GREEN LED to specified value
    ledBlue.pwmWrite(blueRGB); //set BLUE LED to specified value
  });
});

process.on('SIGINT', function () { //on ctrl+c
  ledRed.digitalWrite(1); // Turn RED LED off
  ledGreen.digitalWrite(1); // Turn GREEN LED off
  ledBlue.digitalWrite(1); // Turn BLUE LED off
  process.exit(); //exit completely
});
