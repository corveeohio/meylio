import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashToAngle } from '../proximityRadarMath';

describe('hashToAngle', () => {
  it('always returns a value between 0 and 359', () => {
    const ids = ['abc', 'user-1234', '', 'z', 'a-very-long-uuid-like-string-1234567890'];
    for (const id of ids) {
      const angle = hashToAngle(id);
      assert.ok(angle >= 0 && angle < 360, `angle ${angle} out of range for id ${id}`);
    }
  });

  it('is deterministic for the same id', () => {
    assert.equal(hashToAngle('user-42'), hashToAngle('user-42'));
  });

  it('spreads different ids across different angles', () => {
    const angles = new Set(['a', 'b', 'c', 'd', 'e'].map(hashToAngle));
    assert.ok(angles.size > 1);
  });
});
