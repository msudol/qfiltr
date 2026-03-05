/**
 * QFiltr - A simple, yet powerful filter, limit, and queue system in javascript
 * @license Apache-2.0
 *
 *  https://github.com/msudol/qfiltr 
 */

// create constructor
var qfiltr = function() {
    this.version = "0.1.0";
    this.config = {
        limitCount: 3,
        limitTime: 1000, 
        queueTimer: 1000,
        queueMax: -1
    };
    this.dataStore = {};
    this.lastQueue = {};
    this.qRunning = {}; 
};

qfiltr.prototype.hasOpt = function(opts, key) {
    return Object.prototype.hasOwnProperty.call(opts, key);
};

// simple function to add an item to a dataStore object where id = obj.key and opts = json options
qfiltr.prototype.addStore = function(id, opts) {
    (this.dataStore[id] = this.dataStore[id] || []).push(opts); 
};

// filter function for message matching and moderation flows
qfiltr.prototype.filter = function(id, opts, success, fail) {
    opts = opts || {};

    var onSuccess = typeof success === 'function' ? success : function() {};
    var onFail = typeof fail === 'function' ? fail : function() {};
    var message = opts.message;
    var caseSensitive = this.hasOpt(opts, 'caseSensitive') ? !!opts.caseSensitive : false;
    var matched = false;

    if (message === undefined || message === null) {
        message = '';
    }
    if (typeof message !== 'string') {
        message = String(message);
    }

    if (typeof opts.test === 'function') {
        matched = !!opts.test(message, id, opts);
    }
    else if (this.hasOpt(opts, 'regex')) {
        var regex;

        if (opts.regex instanceof RegExp) {
            regex = opts.regex;
        }
        else if (typeof opts.regex === 'string') {
            regex = new RegExp(opts.regex, caseSensitive ? '' : 'i');
        }
        else {
            throw new TypeError('qfiltr.filter: opts.regex must be a RegExp or string');
        }

        if (regex.global || regex.sticky) {
            regex.lastIndex = 0;
        }
        matched = regex.test(message);
    }
    else if (this.hasOpt(opts, 'match')) {
        var source = caseSensitive ? message : message.toLowerCase();

        if (typeof opts.match === 'string') {
            var token = caseSensitive ? opts.match : opts.match.toLowerCase();
            matched = source.indexOf(token) > -1;
        }
        else if (Array.isArray(opts.match)) {
            matched = opts.match.some(function(item) {
                var next = String(item);
                next = caseSensitive ? next : next.toLowerCase();
                return source.indexOf(next) > -1;
            });
        }
        else {
            throw new TypeError('qfiltr.filter: opts.match must be a string or array');
        }
    }
    else {
        throw new Error('qfiltr.filter requires one matcher: opts.test, opts.regex, or opts.match');
    }

    if (matched) {
        return onSuccess(message, id, opts);
    }
    return onFail(message, id, opts);
};

/** @function
 * @name limit
 * @description A basic limit function, takes an id, opts, and callbacks for success and fail
 * @param {string} id - Unique ID for this function thread.
 * @param {Object} opts - Configure options other than default.
 * @param {integer} [opts.limitCount=3] - Max count of calls within the limitTime (default: 3).
 * @param {integer} [opts.limitTime=1000] - Time in ms (default: 1000).
 * @param {Function} success - Callback function for success.
 * @param {Function} fail - Callback function for when the limit is reached.
*/ 
qfiltr.prototype.limit = function(id, opts, success, fail) {
    
    opts = opts || {};
    opts.limitCount = this.hasOpt(opts, 'limitCount') ? opts.limitCount : this.config.limitCount;
    opts.limitTime = this.hasOpt(opts, 'limitTime') ? opts.limitTime : this.config.limitTime;

    var onSuccess = typeof success === 'function' ? success : function() {};
    var onFail = typeof fail === 'function' ? fail : function() {};
    
    var now = Date.now();

    // add to the datastore
    this.addStore(id, {ts:now});
    
    // loop through datastore items and compare stored time vs. now
    for (var i = this.dataStore[id].length - 1; i >=0; i--) {
        if ((this.dataStore[id][i].ts + opts.limitTime) < now) {
            this.dataStore[id].splice(i, 1);
        }
    }
    
    // if there are too many items in the datastore - start fail function
    if (this.dataStore[id].length > opts.limitCount) {
        return onFail();
    }
    else {
        return onSuccess();
    }
            
};

/** @function
 * @name queue 
 * @description A basic queue function that takes: id, opts, function callback and queue ended callback
 * @param {string} id - Unique ID for this function thread.
 * @param {Object} opts - Configure options other than default.
 * @param {integer} [opts.queueTimer=1000] - Time in ms (default: 1000).
 * @param {integer} [opts.queueMax=-1] - Max items allowed in queue (default: -1).
 * @param {Function} success - Callback function for success.
 * @param {Function} end - Callback function for when the queue ends.
 * @param {Function} maxed - Callback function for if/when the queue gets maxed.
*/
qfiltr.prototype.queue = function(id, opts, success, end, maxed) {

    this.qRunning[id] = this.qRunning[id] || false;

    opts = opts || {};
    opts.queueTimer = this.hasOpt(opts, 'queueTimer') ? opts.queueTimer : this.config.queueTimer;
    opts.queueMax  = this.hasOpt(opts, 'queueMax') ? opts.queueMax : this.config.queueMax;

    var onSuccess = typeof success === 'function' ? success : function() {};
    var onEnd = typeof end === 'function' ? end : function() {};
    
    var now = Date.now();
    
    // is the store for this ID at max? 
    var queueLength = this.dataStore[id] ? this.dataStore[id].length : 0;
    if ((opts.queueMax > -1) && (queueLength >= opts.queueMax)) {
        // if a queueMax was reached run callback if it is defined
        typeof maxed === 'function' && maxed();
        return false;
    }    
    else {
        // add message to the queue
        this.addStore(id, {ts:now, opts:opts, action:onSuccess, stop:onEnd});
    }
    
    // check the queue now to see if we need to kick start it
    if (!(this.qRunning[id])) {
        this.runQueue(id, true);
    }

    return true;

};


/** @function
 * @name qlimit
 * @description A combination limit and queue function, takes an id, opts, and callbacks for success, fail, end and maxed
 * @param {string} id - Unique ID for this function thread.
 * @param {Object} opts - Configure options other than default.
 * @param {integer} [opts.limitCount=3] - Max count of calls within the limitTime (default: 3).
 * @param {integer} [opts.limitTime=1000] - Time in ms (default: 1000).
 * @param {integer} [opts.queueTimer=1000] - Time in ms (default: 1000).
 * @param {integer} [opts.queueMax=-1] - Max items allowed in queue (default: -1). 
 * @param {Function} success - Callback function for success.
 * @param {Function} fail - Callback function for when the limit is reached.
 * @param {Function} end - Callback function for when the queue ends.
 * @param {Function} maxed - Callback function for if/when the queue gets maxed. 
*/ 
qfiltr.prototype.qlimit = function(id, opts, success, fail, end, maxed) {
       
    this.qRunning[id] = this.qRunning[id] || false;

    var onSuccess = typeof success === 'function' ? success : function() {};
    var onFail = typeof fail === 'function' ? fail : function() {};
    var onEnd = typeof end === 'function' ? end : function() {};
       
    opts = opts || {};
    opts.limitCount = this.hasOpt(opts, 'limitCount') ? opts.limitCount : this.config.limitCount;
    opts.limitTime = this.hasOpt(opts, 'limitTime') ? opts.limitTime : this.config.limitTime;
    opts.queueTimer = this.hasOpt(opts, 'queueTimer') ? opts.queueTimer : this.config.queueTimer;
    opts.queueMax  = this.hasOpt(opts, 'queueMax') ? opts.queueMax : this.config.queueMax;    
    
    var now = Date.now();

    // is the store for this ID at max? 
    var queueLength = this.dataStore[id] ? this.dataStore[id].length : 0;
    if ((opts.queueMax > -1) && (queueLength >= opts.queueMax)) {
        // if a queueMax was reached run callback if it is defined
        typeof maxed === 'function' && maxed();
        return false;
    }    
    else {
        this.addStore(id, {ts:now, opts:opts, action:onSuccess, stop:onEnd});
    }
    
    // need to check if this function has gone into queue mode or not here
    if (!(this.qRunning[id])) {
    
        // loop through datastore items and compare stored time vs. now
        for (var i = this.dataStore[id].length - 1; i >=0; i--) {
            if ((this.dataStore[id][i].ts + opts.limitTime) < now) {
                this.dataStore[id].splice(i, 1);
            }
        }
        
        // Limit fail - time to start queueing
        if (this.dataStore[id].length > opts.limitCount) {
           
            onFail();

            // need to clear the queue for the X messages leading up to the Q 
            this.dataStore[id].splice(0, this.dataStore[id].length - 1);
            this.lastQueue[id] = this.dataStore[id][0];
            this.runQueue(id, true); 
            return false;
            
        }
        // Within limits and the queue is not running.. yay!
        else {
            return onSuccess();
        }  
    }

    return true;
            
};


// function run by queue to actually execute the queue
qfiltr.prototype.runQueue = function(id, init) {

    var self = this;
    var queueStore = this.dataStore[id] || [];
    
    // if anything is in dataStore, run the queue
    if (queueStore.length > 0) {
        
        this.qRunning[id] = true;
        var timer = self.hasOpt(queueStore[0].opts || {}, 'queueTimer') ? queueStore[0].opts.queueTimer : self.config.queueTimer;
        // no need to wait for the queueTimer if the queue is initializing
        if (init) {
            // run the first item in the array
            queueStore = self.dataStore[id] || [];
            if (queueStore[0]) {
                queueStore[0].action();
                self.lastQueue[id] = queueStore[0] || self.lastQueue[id];
            }
            // shift it out
            if (self.dataStore[id] && self.dataStore[id].length > 0) {
                self.dataStore[id].shift();
            }
            setTimeout(function() { 
                // run this function again 
                self.runQueue(id, false);
            }, timer);                       
        }        
        else {
            setTimeout(function() { 
                // run the first item in the array
                var nextItem = (self.dataStore[id] || [])[0];
                if (nextItem) {
                    nextItem.action();
                    self.lastQueue[id] = nextItem || self.lastQueue[id];
                }
                // shift it out
                if (self.dataStore[id] && self.dataStore[id].length > 0) {
                    self.dataStore[id].shift();
                }
                // run this function again 
                self.runQueue(id, false);
            }, timer);
        }
    }
    else {
        this.qRunning[id] = false; 
        if (this.lastQueue[id] && typeof this.lastQueue[id].stop === 'function') {
            this.lastQueue[id].stop();
        }
    }
    
};



// Browser global export for standalone usage
if (typeof window !== "undefined") {
    window.qfiltr = qfiltr;
}
else if (typeof self !== "undefined") {
    self.qfiltr = qfiltr;
}
