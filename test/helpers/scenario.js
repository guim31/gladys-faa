// -----------------------------------------------------------------------------
// A scenario staging every event of the trigger on the real feeds: JFK, EWR,
// LGA are followed on the quiet Saturday morning (LGA closed for the night),
// the first read is silent; then the July thunderstorms arrive (LGA reopens,
// ground stops and delay programs everywhere), then everything is lifted, and
// LGA closes again.
// -----------------------------------------------------------------------------

import { FEEDS, feed, follow } from './world.js';

/** Resolves with the devices and the scene events fired after the first read. */
export async function stageEverything(world) {
  world.clock.time = FEEDS.quiet.at;
  world.network.feed = feed('quiet');
  const devices = await follow(world, 'JFK', 'EWR', 'LGA');
  const before = world.fake.sceneEvents.length;
  world.network.feed = feed('storms');
  world.clock.advance(300000);
  await world.service.refresh();
  world.network.feed = [];
  world.clock.advance(300000);
  await world.service.refresh();
  world.network.feed = feed('quiet');
  world.clock.advance(300000);
  await world.service.refresh();
  return { devices, events: world.fake.sceneEvents.slice(before) };
}
