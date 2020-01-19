var http = require('http').createServer(handler); //require http server, and create server with function handler()
var fs = require('fs'); //require filesystem module
var io = require('socket.io')(http); //require socket.io module and pass the http object (server)
var Gpio = require('pigpio').Gpio; //include pigpio to interact with the GPIO
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/weatherdb";
var express = require('express');
var app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/data', function(req, res){
  res.send(readSensor()); 
});


app.get('/history', function(req, res){
 fs.readFile(__dirname + '/public/history.dat', function(err, data) { //read file rgb.html in public folder
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'}); //display 404 on error
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'application/json'}); 
    res.write(data
); //write JSON data from history.dat
    return res.end();
  });

  console.log("History returned");


  return; //till fixed
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("theweather");

//    dbo.collection("history").insertOne(myobj, function(err, res) {
//      if (err) throw err;
//      console.log("1 document inserted");
//    db.close();
//  });
//    dbo.createCollection("history", function(err, res) {
//    if (err) throw err;
//    console.log("Collection created!");
//    db.close();
//  });


    db.close();
  }); 
});


//Don't use GPIO 27 for reading temp, has a special meaning. 
//Beware, Raspeerry Pi model B and zero, model 1, etc have different pin assignments. Run pinout on your pi to see yours.

var rpiDhtSensor = require('rpi-dht-sensor');
 
var dht = new rpiDhtSensor.DHT11(01);
 
function readSensor() {
  var readout = dht.read();

    console.log(new Date().toLocaleString()+' Temperature: ' + readout.temperature.toFixed(2) + 'C, ' +
        'humidity: ' + readout.humidity.toFixed(2) + '%');

  return readout;
}

function saveHistory (fileName, data) {
  var history = { readouts : [], hightemp : null, lowtemp : null };

  fs.readFile(__dirname + fileName, function(err, contents) { 
    if (!err)
    {
      try {
        history = JSON.parse(contents);
      }
      catch (error) {
        console.log(error.message);
        console.log(__dirname + fileName);
        console.log(contents);
      }
    }

    if (!history) {
      history = { readouts : [], hightemp : null, lowtemp : null };
    }

    if (!history.readouts){
      history.readouts = [];
    }

    history.readouts.push(data);

    if (data.errors == 0){
       if (!(history.hightemp) || (history.hightemp.temperature <= data.temperature)){
         history.hightemp = data;
       }
    }

    if (!(history.lowtemp) || (history.lowtemp.temperature >= data.temperature)){
      history.lowtemp = data;
    }


    if (history.readouts.length > 5000){
      history.readouts.shift();
    }

    fs.writeFile(__dirname + fileName, JSON.stringify(history), function(err, history){});

  }); //NB. all code must be in the success callback, this is an aync function
}

function readSensorAndSave() {
  var d = new Date();
  var data = { readout : {temperature: 0, humidity: 0} };

  data.readout = readSensor();
  data.readout.datetime = d.toISOString();

  saveHistory('/public/history.dat', data.readout); //last 5000 temps, and all-time high/low
  saveHistory('/public/'+d.toISOString().slice(0,10)+'.dat', data.readout); //today's temps, and also today's high/low


  return; //till we get DB working
  if ((data.readout.temperature != 0.0) || (data.readout.humidity != 0.0)) {
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;

      console.log('Connected');
    
      var dbo = db.db("theweather");

      dbo.collection("history").insertOne(data, function(err, res) {
        if (err) throw err;
        console.log("Data saved");
        db.close();
      });
    });
  }


//  if (timeout) {
//    setTimeout(readSensorAndSave(timeout), timeout);
//  };
}

//readSensorAndSave(15*1000*60); //every 15 mins. pass in null to just run once off.
//setInterval(readSensorAndSave, (15*1000)); //debug - every 15 seconds
setInterval(readSensorAndSave, (60*1000)); //debug - every minute

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

app.listen(3000);
http.listen(8080); //listen on port 8080

function handler (req, res) { //what to do on requests to port 8080
  console.log(req);
  
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
