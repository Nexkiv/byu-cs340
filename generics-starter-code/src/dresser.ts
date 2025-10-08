type Socks = { style: string; color: string };
type Shirt = { style: string; size: string };
type Pants = { waist: number; length: number };

type Clothing = Socks | Shirt | Pants;

class Drawer<T extends Clothing> {
  private contents: T[] = [];

  public isEmpty(): boolean {
    return this.contents.length == 0;
  }

  public addItem(newItem: T): void {
    this.contents.push(newItem);
  }

  public removeItem(): undefined | T {
    return this.contents.pop();
  }

  public removeAll(): T[] {
    let contents: T[] = [];

    let item: T | undefined = this.contents.pop();

    while (item !== undefined) {
      contents.push(item!);
      item = this.contents.pop();
    }

    return contents;
  }
}

class Dresser<T extends Clothing, U extends Clothing, V extends Clothing> {
  public top: Drawer<T>;
  public middle: Drawer<U>;
  public bottom: Drawer<V>;

  constructor() {
    this.top = new Drawer<T>();
    this.middle = new Drawer<U>();
    this.bottom = new Drawer<V>();
  }
}

let testDresser = new Dresser<Socks, Shirt, Pants>();

const sock: Socks = { style: "crew", color: "blue" };
const shirt: Shirt = { style: "polo", size: "M" };
const pants: Pants = { waist: 32, length: 30 };

testDresser.top.addItem(sock);
testDresser.middle.addItem(shirt);
testDresser.bottom.addItem(pants);

console.log(
  `Adding and removing a pair of socks from the top drawer was successful ${
    testDresser.top.removeItem() == sock
  }`
);
console.log(
  `Adding and removing a shirt from the top drawer was successful ${
    testDresser.middle.removeItem() == shirt
  }`
);
console.log(
  `Adding and removing a pair of pants from the top drawer was successful ${
    testDresser.bottom.removeItem() == pants
  }`
);

testDresser.top.addItem(sock);
testDresser.top.addItem(sock);
testDresser.top.addItem(sock);
testDresser.top.addItem(sock);

console.log(
  `Adding and removing a all the pairs pair of socks from the top drawer was successful ${
    testDresser.top.removeAll().length == 4
  }`
);

console.log(
  `Adding and removing a all the pairs pair of socks from the top drawer was successful ${testDresser.top.isEmpty()}`
);

export default Dresser;
