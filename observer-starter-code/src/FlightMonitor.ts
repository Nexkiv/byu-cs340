import { FlightFeed } from "./FlightFeed";
import { StatusFlightObserver, DeltaFlightObserver } from "./FLightObserver";

main();

function main() {
  let feed = new FlightFeed();
  feed.start();
  feed.attach(new StatusFlightObserver());
  feed.attach(new DeltaFlightObserver())
}
