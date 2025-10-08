import Dresser from "./dresser";

type Socks = { style: string; color: string };
type Shirt = { style: string; size: string };
type Pants = { waist: number; length: number };

describe("Drawer", () => {
  test("isEmpty returns true for new drawer", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();
    expect(dresser.top.isEmpty()).toBe(true);
  });

  test("isEmpty returns false after adding item", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();
    const sock: Socks = { style: "crew", color: "black" };
    dresser.top.addItem(sock);
    expect(dresser.top.isEmpty()).toBe(false);
  });

  test("addItem adds item to drawer", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();
    const sock: Socks = { style: "ankle", color: "white" };
    dresser.top.addItem(sock);
    const removed = dresser.top.removeItem();
    expect(removed).toEqual(sock);
  });

  test("removeItem returns undefined on empty drawer", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();
    expect(dresser.top.removeItem()).toBeUndefined();
  });

  test("removeItem returns last added item (LIFO)", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();
    const sock1: Socks = { style: "crew", color: "black" };
    const sock2: Socks = { style: "ankle", color: "white" };

    dresser.top.addItem(sock1);
    dresser.top.addItem(sock2);

    expect(dresser.top.removeItem()).toEqual(sock2);
    expect(dresser.top.removeItem()).toEqual(sock1);
  });

  test("removeAll empties drawer and returns all items", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();
    const sock1: Socks = { style: "crew", color: "black" };
    const sock2: Socks = { style: "ankle", color: "white" };
    const sock3: Socks = { style: "no-show", color: "gray" };

    dresser.top.addItem(sock1);
    dresser.top.addItem(sock2);
    dresser.top.addItem(sock3);

    const removed = dresser.top.removeAll();

    expect(removed.length).toBe(3);
    expect(dresser.top.isEmpty()).toBe(true);
  });

  test("removeAll returns empty array for empty drawer", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();
    const removed = dresser.top.removeAll();
    expect(removed).toEqual([]);
  });
});

describe("Dresser", () => {
  test("dresser has three drawers initialized", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();
    expect(dresser.top).toBeDefined();
    expect(dresser.middle).toBeDefined();
    expect(dresser.bottom).toBeDefined();
  });

  test("each drawer can hold different types", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();

    const sock: Socks = { style: "crew", color: "blue" };
    const shirt: Shirt = { style: "polo", size: "M" };
    const pants: Pants = { waist: 32, length: 30 };

    dresser.top.addItem(sock);
    dresser.middle.addItem(shirt);
    dresser.bottom.addItem(pants);

    expect(dresser.top.removeItem()).toEqual(sock);
    expect(dresser.middle.removeItem()).toEqual(shirt);
    expect(dresser.bottom.removeItem()).toEqual(pants);
  });

  test("drawers are independent", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();

    const sock: Socks = { style: "athletic", color: "red" };
    dresser.top.addItem(sock);

    expect(dresser.top.isEmpty()).toBe(false);
    expect(dresser.middle.isEmpty()).toBe(true);
    expect(dresser.bottom.isEmpty()).toBe(true);
  });

  test("multiple items in middle drawer", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();

    const shirt1: Shirt = { style: "t-shirt", size: "S" };
    const shirt2: Shirt = { style: "button-up", size: "L" };
    const shirt3: Shirt = { style: "henley", size: "M" };

    dresser.middle.addItem(shirt1);
    dresser.middle.addItem(shirt2);
    dresser.middle.addItem(shirt3);

    expect(dresser.middle.removeItem()).toEqual(shirt3);
    expect(dresser.middle.removeItem()).toEqual(shirt2);
    expect(dresser.middle.removeItem()).toEqual(shirt1);
    expect(dresser.middle.isEmpty()).toBe(true);
  });

  test("bottom drawer with pants", () => {
    const dresser = new Dresser<Socks, Shirt, Pants>();

    const pants1: Pants = { waist: 30, length: 32 };
    const pants2: Pants = { waist: 34, length: 34 };

    dresser.bottom.addItem(pants1);
    dresser.bottom.addItem(pants2);

    const allPants = dresser.bottom.removeAll();
    expect(allPants.length).toBe(2);
    expect(dresser.bottom.isEmpty()).toBe(true);
  });
});
