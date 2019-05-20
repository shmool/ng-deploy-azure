import { getLocation } from '../locations';

describe('location', () => {
  test('should return undefined when locationName is undefined', () => {
    const actual = getLocation(undefined);
    expect(actual).toBeUndefined();
  });
})