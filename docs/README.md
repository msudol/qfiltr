# QFiltr

QFiltr is a powerful but simple filter, limiter & queueing system that can be used to moderate or maintain a data stream. It was developed as part of a M2M/IoT cloud project in order to prevent devices from reporting data at too high rate, but has since been adapted as a standalone module for many possible uses.

Some use cases:
- Use within an API in order to rate limit incoming requests.
- Use with UI interactions, like a button that can be rapidly pressed, to run a function via queue or rate limit.
- Use on a chat server, to detect and block spam.
- Use with M2M/IoT Cloud Data to limit or queue devices that report too rapidly.


## Installation

QFiltr can be installed for use in a Node.js application via NPM, or for use in a basic javascript application or website by getting the standalone qfiltr.js from the GitHub Repository. 


### NPM

```bash
npm install qfiltr
```


### Javascript

Get the standalone version from https://github.com/msudol/qfiltr

- Build standalone with `npm run build:standalone`
- Standalone version is in /dist/qfiltr.js
- See how to embed in javascript in /tests/basic-test.html


## Basic Usage

Require the qfiltr module and create a new instance of qfiltr.  

```js
var qfiltr = require("qfiltr");
var qFiltr = new qfiltr();  

qFiltr.COMMAND("id", {options}, callback(s))
```


### Functions

#### qfiltr.limit("id", {limitCount:3, limitTime:1000}, success, fail)

Limit is a basic hard limit, where anything over X messages in Y seconds returns the fail callback, while anything that is under the limit returns the success callback.

- Options Object:
  - limitCount:3
  - limitTime:1000
- Callbacks:
  - Allow (Success)
  - Block (Fail)
  
Example: No more than 5 messages or commands in 500ms.

```js
qFiltr.limit("limitExample", {limitCount:5, limitTime:500}, function() {
    console.log("Allowed message");
}, function() { 
    console.log("Blocked message");
});
```


#### qfiltr.queue: 

Queue is basic queueing function, feed messages in at any rate, and they are processed at the queue settings rate until the queue runs out.

- Options Object:
  - queueTimer:1000
  - queueMax:-1 (no limit) 
- Callbacks:
  - OnQueue (Success)
  - Queue Ended
  - Maxed (Queue is full)

Example: Queue incoming messages or commands to be run every 2000ms until they are all run

```js
var qfiltr = require("qfiltr");
qFiltr = new qfiltr();

// call a bunch of messages really fast
for (var i = 0; i < 10; i++) {
    sendMessage("This is message " + i);
}

function sendMessage(message) {
    // add message to qFiltr.queue with callback functions
    qFiltr.queue("msgQ", {queueTimer:2000}, function() {
        console.log(message);
    }, function() {
        console.log("Queue complete");
    });  
}
```


#### qfiltr.qlimit: 

QLimit is combo function combining rate limiting and queueing function, feed messages in at any rate until they exceed the rate limit, and then they are processed at the queue settings rate until the queue runs out.

- Options Object:
  - limitCount:3
  - limitTime:1000
  - queueTimer:1000
  - queueMax:-1 (no limit) 
- Callbacks:
  - Allow (Success)
  - LimitReached (Queue Starting)
  - Queue Ended
  - Maxed (Queue is full)

Example: Send 100 messages at random intervals, rate limit if it goes too fast and put into queue mode

```js
var qfiltr = require("qfiltr")
qFiltr = new qfiltr();

var sendStop = 0
var overRate = false;
var testAdjuster = 0;
 
// send messages at random intervals
function sender(t) { 
    if (sendStop > 100) return;
    sendStop++;
    
    if (overRate) { testAdjuster = 20 }
    else { testAdjuster = 0}
    
    setTimeout(function() {
        // generate new t
        var i = Math.floor(Math.exp(Math.random()*Math.log(51 + testAdjuster)));
        sendMessage("Message #" + sendStop + " sent at " + i*10 + "ms");
        // run again
        sender(i*10);
    }, t);
}
 
function sendMessage(message) {
    // add message to qFiltr.queue with callback functions 
    qFiltr.qlimit("msgQ", {limitCount:10, limitTime:1000, queueTimer:100}, function() {
        console.log(message);
    }, function() {
        overRate = true;
        console.log("Rate limit exceeded, queuing data");
    }, function() {
        overRate = false;
        console.log("Queue cleared resuming normal operation");        
    });  
}

sender(1000);
```

#### qfiltr.filter:

Filter allows or blocks a message based on one configured matcher.

- Matchers (pick one):
  - `test(message, id, opts)` - custom predicate function
  - `regex` - `RegExp` or regex string
  - `match` - string or array of strings for contains checks
- Options:
  - `message` - message/value to evaluate (non-strings are converted to strings)
  - `caseSensitive:false` - used for string/regex-string matching
- Callbacks:
  - Allow (Success)
  - Block (Fail)

Example:

```js
qFiltr.filter("chatFilter", {message: "hello world", regex: "hello"}, function() {
    console.log("Allowed");
}, function() {
    console.log("Blocked");
});
```


### Objects

The ID that you set in a filter function writes an entry into a "datastore", so that you can have multiple filters running with different settings.

This ID will also allow you to check if the current ID's queue is running or not.


#### Accessing the datastore

```js
var idStore = qFiltr.dataStore[ID];
console.log("Items current in queue:" + idStore.length);
```


#### Get Queue State
```js
var isQRunning = qFiltr.qRunning[ID];
```


### Testing

```bash
npm test
```
