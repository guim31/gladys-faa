// -----------------------------------------------------------------------------
// A scenario staging every event of the trigger on the real feeds: JFK, EWR,
// LGA are followed on the quiet Saturday morning (LGA closed for the night),
// the first read is silent; then the July thunderstorms arrive (LGA reopens,
// ground stops and delay programs everywhere), then everything is lifted (the
// delays at the second read without any), and LGA closes again.
// -----------------------------------------------------------------------------

import { FEEDS, feed, follow } from './world.js';

/** Resolves with the devices and the scene events fired after the first read. */
export async function stageEverything(world) {
  world.clock.time = FEEDS.quiet.at;
  world.network.feed = feed('quiet');
  const devices = await follow(world, 'JFK', 'EWR', 'LGA');
  const before = world.fake.sceneEvents.length;
  // The storms read at their own time (their programs are in force then).
  world.clock.time = FEEDS.storms.at;
  world.network.feed = feed('storms');
  await world.service.refresh();
  world.network.feed = [];
  world.clock.advance(300000);
  await world.service.refresh();
  // Back to the October morning: LGA closed; the delays end at this second
  // read without any.
  world.clock.time = FEEDS.quiet.at + 900000;
  world.network.feed = feed('quiet');
  await world.service.refresh();
  return { devices, events: world.fake.sceneEvents.slice(before) };
}
