// 1. What design principle(s) does this code violate?
/*
 *  SRP: accesses a database and is an independent class
 *  Error Checking: There isn't error checking to make sure that the
 *  names of courses are unique.
 *  Principle of Least Astonishment: The update function updates the course
 *  in the database and not just the object.
 */
// 2. Explain how you would refactor this code to improve its design.
/*
 *  the update function most likely should take in parameters
 *  I would seperate out the database accessing functionality from the class.
 */

export class Course {
  name: string;
  credits: number;

  constructor(name: string, credits: number) {
    this.name = name;
    this.credits = credits;
  }

  static async create(name: string, credits: number): Promise<Course> {
    // ... Code to insert a new Course object into the database ...
  }

  static async find(name: string): Promise<Course | undefined> {
    // ... Code to find a Course object in the database ...
  }

  async update(): Promise<void> {
    // ... Code to update a Course object in the database ...
  }
}
