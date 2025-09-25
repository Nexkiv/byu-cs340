import { Observer } from "./Observer";

class Subject {
    private observers: Observer[] = [];

    public attach(observer: Observer): void {
        this.observers.push(observer);
    }

    public detach(observer: Observer): void {

    }

    public notify(info: any) {
        this.observers.forEach(observer => observer.update(info));
    }
}

export {Subject};