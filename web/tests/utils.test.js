import test from 'node:test';
import assert from 'node:assert/strict';
import { coordinatesOf, googleMapsUrl } from '../src/utils.js';

test('GeoJSON coordinates are converted to latitude and longitude', () => {
  assert.deepEqual(coordinatesOf({ location: { coordinates: [80.6, 7.2] } }), { longitude: 80.6, latitude: 7.2 });
});

test('Google navigation link includes the location', () => {
  assert.match(googleMapsUrl({ location: { coordinates: [80.6, 7.2] } }), /7\.2,80\.6/);
});

