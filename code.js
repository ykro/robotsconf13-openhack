var webSocket = require('ws');
var five = require("johnny-five");
var Twit = require('twit')

var T = new Twit({
    consumer_key:         '**YOUR KEY**'
  , consumer_secret:      '**YOUR SECRET**'
  , access_token:         '**YOUR TOKEN**'
  , access_token_secret:  '**YOUR TOKEN SECRET**'
});

ws = new webSocket('ws://127.0.0.1:6437'), board = new five.Board();

board.on("ready", function() {	

  var servoLeft = new five.Servo({
    pin: 10, 
    type: "continuous"
  });

  var servoRight = new five.Servo({
    pin: 11, 
    type: "continuous"
  }); 

  var button = new five.Button(5);

  var strobeLeft = 0, strobeRight = 0;
  var ledRight = new five.Led(3);
  var ledLeft = new five.Led(4);
  var temperature = new five.Sensor("A0");
  var photoresistor = new five.Sensor("A1");

  var currentTemp = "", nearestObject = "", currentIlumination = "";
  
  var direction = "stop";
  var pos = -1;
  var tweeting = 0;

  stop();

  photoresistor.on("data", function() {
  	if (this.value < 60) {
  		currentIlumination = "I can't see :(";
  	} else if (this.value < 120) {
  		currentIlumination = "Its a little dark in here"
  	} else if (this.value < 180) {
  		currentIlumination = "just how I like it"
  	} else {
  		currentIlumination = "OMG too much light";
  	}
  	
  });

  button.on("down", function(value) {
	tweetStatus();
  });

  temperature.on("data", function() {
    var voltage = this.value * 0.004882814;
    var celsius = (voltage - 0.5) * 100;
    currentTemp = celsius.toFixed(1) + "°C";
  });

    ws.on('message', function(data, flags) {
        var frame = JSON.parse(data);
        var gesture = frame.gestures[0];

        if (frame.hands && frame.hands.length >= 1) {
        	var hand = frame.hands[0];        	
        	var angle = 90 * hand.palmNormal[0];
        	if (pos == -1) {
        		pos = hand.palmPosition[2];
        	}

        	if (frame.pointables.length == 0) {
        		direction = "stop";
        		stop();
        		pos = -1;
        	} else {
	        	if (angle > 30 && angle < 90) {
	        		direction = "left";
	        		moveLeft();
	        		if (!strobeLeft) {
	        			ledLeft.strobe();
	        			strobeLeft = !strobeLeft;	        			
						board.wait(1000, function() {
							ledLeft.off();
							strobeLeft = !strobeLeft;
						});	        			
	        		}
	        		
	        	} else if (angle > -90 && angle < -30) {
	        		direction = "right";
	        		moveRight();
	        		if (!strobeRight) {
	        			ledRight.strobe();
	        			strobeRight = !strobeRight;	        			
						board.wait(1000, function() {
							ledRight.off();
							strobeRight = !strobeRight;
						});	        			
	        		}        	
	        	}

	        	else if (hand.palmPosition[2] >= (pos+17)) {
					direction = "back";
					moveBack();
	        	} else if (hand.palmPosition[2] < pos) {
	        		direction = "forward";
	        		moveForward();
	        	}
	        }

	        if (gesture && gesture.type == "circle") {
	        	tweetStatus();
	        }

        }
        console.log(direction);
    });

  var ping = new five.Ping(2);
  ping.on("change", function( err, value ) {
  	nearestObject = this.cm.toFixed(1) + " cm";
    
    if (this.cm > 0.0 && this.cm < 4.0) {
      
	  setTimeout(function() {
	    moveRight();	    
	  }.bind(this), 1);    	
	  moveForward();

    }
    
    
  });  


	function stop(){
	  servoRight.stop();
	  servoLeft.stop();
	}

	function moveForward() {
	  servoRight.ccw(0.75);
	  servoLeft.cw(0.75);
	}

	function moveBack(){
	  servoRight.cw(0.75);
	  servoLeft.ccw(0.75);
	}

	function moveRight(){
	  servoLeft.cw(0.75);
	  servoRight.stop();
	}

	function moveLeft(){
	  servoRight.ccw(0.75);
	  servoLeft.stop();
	}  

	function tweetStatus(){
		if (!tweeting) {
			tweeting = 1;	
		  	var txtStatus = "Current temperature " + currentTemp + "\n" + 
		  	                "Nearest object at " + nearestObject + "\n" +
		  	                "I'm moving " + direction + "\n" +
		  	                "Current ilumination " + currentIlumination;
			T.post('statuses/update', { status: txtStatus }, function(err, reply) {
			  if (reply) {
			  	console.log("Tweet posted " + reply.id_str);
			  	tweeting = 0;
			  }
			});		
		}
	}

});

