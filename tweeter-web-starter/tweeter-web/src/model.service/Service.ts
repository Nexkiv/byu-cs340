import { ServerFacade } from "../net/ServerFacade";

export abstract class Service {
  protected readonly facade = new ServerFacade();
}
