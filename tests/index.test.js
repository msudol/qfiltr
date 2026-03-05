const test = require('node:test');
const assert = require('node:assert/strict');
const QFiltr = require('../index');

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('limit respects explicit zero values', () => {
    const q = new QFiltr();
    let failed = false;

    q.limit('limit-zero', { limitCount: 0, limitTime: 1000 }, function() {}, function() {
        failed = true;
    });

    assert.equal(failed, true);
});

test('queue respects queueMax = 0 and does not enqueue items', () => {
    const q = new QFiltr();
    let ran = 0;
    let maxed = 0;

    const accepted = q.queue('queue-max-zero', { queueMax: 0 }, function() {
        ran++;
    }, function() {}, function() {
        maxed++;
    });

    assert.equal(accepted, false);
    assert.equal(ran, 0);
    assert.equal(maxed, 1);
    assert.equal((q.dataStore['queue-max-zero'] || []).length, 0);
});

test('queue is safe with missing callbacks', async () => {
    const q = new QFiltr();

    const accepted = q.queue('queue-callbacks', { queueTimer: 1 }, undefined, undefined);

    assert.equal(accepted, true);
    await delay(10);
    assert.equal(q.qRunning['queue-callbacks'], false);
});

test('qlimit is safe with missing callbacks on queued path', async () => {
    const q = new QFiltr();

    q.qlimit('qlimit-callbacks', { limitCount: -1, queueTimer: 1 }, undefined, undefined, undefined);

    await delay(10);
    assert.equal(q.qRunning['qlimit-callbacks'], false);
});

test('filter supports regex string matching (case-insensitive by default)', () => {
    const q = new QFiltr();
    let allowed = false;

    q.filter('filter-regex', { message: 'Hello World', regex: 'hello' }, function() {
        allowed = true;
    }, function() {
        allowed = false;
    });

    assert.equal(allowed, true);
});

test('filter supports match arrays', () => {
    const q = new QFiltr();

    const result = q.filter('filter-match', { message: 'chat message', match: ['admin', 'chat'] }, function() {
        return true;
    }, function() {
        return false;
    });

    assert.equal(result, true);
});

test('filter supports predicate test function', () => {
    const q = new QFiltr();

    const result = q.filter('filter-test', {
        message: 'payload-123',
        test: function(message) {
            return message.indexOf('123') > -1;
        }
    }, function() {
        return 'ok';
    }, function() {
        return 'nope';
    });

    assert.equal(result, 'ok');
});

test('filter throws when matcher is missing', () => {
    const q = new QFiltr();

    assert.throws(function() {
        q.filter('filter-error', { message: 'no matcher' }, function() {}, function() {});
    });
});
