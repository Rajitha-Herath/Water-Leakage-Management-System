import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, nextOfficerStatuses } from '../src/constants/status.js';

test('complaint follows the required lifecycle', () => {
  assert.equal(canTransition('New', 'Assigned'), true);
  assert.equal(canTransition('Assigned', 'Reached'), true);
  assert.equal(canTransition('Reached', 'In_Progress'), true);
  assert.equal(canTransition('In_Progress', 'Resolved'), true);
});

test('invalid jumps and backwards changes are rejected', () => {
  assert.equal(canTransition('New', 'Resolved'), false);
  assert.equal(canTransition('Assigned', 'In_Progress'), false);
  assert.equal(canTransition('Resolved', 'In_Progress'), false);
});

test('field officer receives only operational next statuses', () => {
  assert.deepEqual(nextOfficerStatuses('Assigned'), ['Reached']);
  assert.deepEqual(nextOfficerStatuses('Reached'), ['In_Progress']);
  assert.deepEqual(nextOfficerStatuses('In_Progress'), ['Resolved']);
  assert.deepEqual(nextOfficerStatuses('Resolved'), []);
  assert.deepEqual(nextOfficerStatuses('New'), []);
});

