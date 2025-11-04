import LazyArray2D from "./LazyArray2D";
import UsableArray2D from "./UsableArray2D";

const FILE_NAME = "arrayTest.txt";

// I am using this function to determine the size of the Array2D object
function deepSize(obj: any): number {
  if (obj === null || obj === undefined) {
    return 0; // base case, null
  }

  if (typeof obj !== "object") {
    return 1; // alt base case, object contains a value
  }

  let size = 0;

  if (Array.isArray(obj)) {
    // For arrays, sum deepSize of each element
    for (const item of obj) {
      size += deepSize(item);
    }
  } else {
    // For objects, count own keys plus nested keys recursively
    for (const key of Object.keys(obj)) {
      size += 1; // count this key
      size += deepSize(obj[key]); // count nested keys if any
    }
  }

  return size;
}

const array = new UsableArray2D(undefined, 10, 10);

for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    array.set(i, j, i + j);
  }
}

array.save(FILE_NAME);

const lazyArray = new LazyArray2D(FILE_NAME);

console.log("Initial size of Proxy lazyArray: " + deepSize(lazyArray));

lazyArray.save(FILE_NAME);

console.log(
  "Size of Proxy lazyArray after calling save(): " + deepSize(lazyArray)
);
