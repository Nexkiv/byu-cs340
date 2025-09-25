export class Flight {
  icao24: string = "";
  callsign: string = "";
  origin_country: string = "";
  time_position = 0;
  last_contact = 0;
  longitude = 0.0;
  latitude = 0.0;
  baro_altitude = 0.0;
  on_ground = false;
  velocity = 0.0;
  true_track = 0.0;
  vertical_rate = 0.0;
  sensors: number[] = [];
  geo_altitude = 0.0;
  squawk: string | null = null;
  spi = false;
  position_source = 0;

  toString(): string {
    let output: string = "";
    output = output + `id: ${this.icao24}\n`;
    output = output + `callsign: ${this.callsign}\n`;
    output = output + `country of origin: ${this.origin_country}\n`;
    output = output + `longitude: ${this.longitude}\n`;
    output = output + `latitude: ${this.latitude}\n`;
    output = output + `velocity: ${this.velocity}\n`
    output = output + `altitude: ${this.geo_altitude}\n`;
    return output;
  }
}
