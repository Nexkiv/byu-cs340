// 1. What is the biggest design principle violation in the code below.
// Code Duplication: The error checking is several if statements, it also reuses variable names
// 2. Refactor the code to improve its design.

type Dictionary = {
  [index: string]: string;
};

type Times = {
  interval: number;
  duration: number;
  departure: number;
};

function getTimes(props: Dictionary): Times {
  const interval = getPropertyFromTimeDictionary("interval", props);
  const duration = getPropertyFromTimeDictionary("duration", props);
  const departure = getPropertyFromTimeDictionary("departure", props);

  if (duration % interval != 0) {
    throw new Error("duration % interval != 0");
  }
  if (departure % interval != 0) {
    throw new Error("departure % interval != 0");
  }

  return { interval, duration, departure };
}

function getPropertyFromTimeDictionary(
  propertyName: string,
  props: Dictionary
): number {
  const valueString = props[propertyName];
  if (!valueString) {
    throw new Error(`missing ${propertyName}`);
  }

  const value = parseInt(valueString);
  if (value <= 0) {
    throw new Error(`${propertyName} must be > 0`);
  }

  return value;
}
