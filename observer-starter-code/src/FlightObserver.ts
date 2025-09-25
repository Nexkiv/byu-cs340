import { Observer } from "./Observer";
import { Flight } from "./entity/Flight";

class DeltaFlightObserver implements Observer {
    previousFlight : Flight = new Flight();

    public update(value: Flight): void {
        console.log("Δ longitude: " + (value.longitude - this.previousFlight.longitude));
        console.log("Δ latitude: " + (value.latitude - this.previousFlight.latitude));
        console.log("Δ velocity: " + (value.velocity - this.previousFlight.velocity));
        console.log("Δ altitude: " + (value.geo_altitude - this.previousFlight.geo_altitude));
        console.log("------------------------------------------------\n");

        this.previousFlight = value;
    }
}

class StatusFlightObserver implements Observer {
    public update(value : Flight): void {
        console.log(value.toString());
    }
}

export {DeltaFlightObserver, StatusFlightObserver}