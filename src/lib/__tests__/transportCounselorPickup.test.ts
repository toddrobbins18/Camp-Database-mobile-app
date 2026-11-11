import { CAMP_LOCATION, buildAMStops } from '../transportBoardUtils';
import {
  isCounselorPickupStop,
  routeStopsForTiming,
  withCounselorPickupStops,
  withUntimedCounselorDisplay,
} from '../transportCounselorPickup';

const counselor = {
  name: 'Alex Rivera',
  address: '12 Counselor Ln, Glen Cove, NY',
  lat: 40.86,
  lng: -73.63,
};

const kid = {
  name: 'Kid One',
  address: '1 Main St',
  lat: 40.87,
  lng: -73.64,
  pickupTime: '',
  passengers: 1,
  camperNames: ['Kid One'],
};

describe('transportCounselorPickup timing', () => {
  it('keeps counselor on the list without putting them on the clock when toggled off', () => {
    const routed = withCounselorPickupStops([kid], counselor, 'am');
    const forTiming = routeStopsForTiming(routed, false);
    const timed = buildAMStops(forTiming, '7:00 AM', { dwellMinutesPerStop: 2 });
    const display = withUntimedCounselorDisplay(timed, counselor, 'am', false);

    expect(isCounselorPickupStop(display[0])).toBe(true);
    expect(display[0]?.pickupTime).toBe('—');
    expect(display[1]?.camperNames).toEqual(['Kid One']);
    expect(display[1]?.pickupTime).toBe('7:00 AM');
  });
});
