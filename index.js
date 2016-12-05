// create constructor
var filtr = function() {
    this.config = {
        limitCount: 3,
        limitTime: 1000, 
        queueTimer: 1000
    };
    this.dataStore = {};
    this.lastQueue = {};
    this.qRunning = {}; 
};

// simple function to add an item to a dataStore object where id = obj.key and opts = json options
filtr.prototype.addStore = function(id, opts) {
    (this.dataStore[id] = this.dataStore[id] || []).push(opts); 
};

// basic filter function, takes an id, opts, and callbacks for success and fail
filtr.prototype.limit = function(id, opts, success, fail) {
    
    opts = opts || {};
    opts.limitCount = opts.limitCount || this.config.limitCount;
    opts.limitTime = opts.limitTime || this.config.limitTime;
    
    var now = Date.now();

    this.addStore(id, {ts:now});
    
    for (var i = this.dataStore[id].length - 1; i >=0; i--) {
        if ((this.dataStore[id][i].ts + opts.limitTime) < now) {
            this.dataStore[id].splice(i, 1);
        }
    }
    
    if (this.dataStore[id].length > opts.limitCount) {
        return fail();
    }
    else {
        return success();
    }
            
};

// basic queue function, takes id, opts, function callback and queue ended callback
filtr.prototype.queue = function(id, opts, callback, end) {

    this.qRunning[id] = this.qRunning[id] || false;

    opts = opts || {};
    opts.queueTimer = opts.queueTimer || this.config.queueTimer;
    
    var now = Date.now();
    
    // just add to the array 
    this.addStore(id, {ts:now, action:callback, stop:end});

    // check the queue now to see if we need to kick start it
    if (!(this.qRunning[id])) {
        this.runQueue(id);
    }

};

// function run by queue to actually execute the queue
filtr.prototype.runQueue = function(id) {

    var self = this;
    // if anything is in dataStore, run the queue
    if (this.dataStore[id].length > 0) {
        this.qRunning[id] = true;
        setTimeout(function() { 
            // run the first item in the array
            self.dataStore[id][0].action();
            self.lastQueue[id] = self.dataStore[id][0];
            // shift it out
            self.dataStore[id].shift();
            // run this function again 
            self.runQueue(id);
        }, self.config.queueTimer);
    }
    else {
        this.qRunning[id] = false; 
        this.lastQueue[id].stop();
    }
 
};

module.exports = filtr;