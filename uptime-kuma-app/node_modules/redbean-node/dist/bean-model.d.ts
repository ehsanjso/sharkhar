import { Bean } from "./bean";
export declare abstract class BeanModel extends Bean {
    onOpen(): void;
    onDispense(): void;
    onUpdate(): void;
    onAfterUpdate(): void;
    onDelete(): void;
    onAfterDelete(): void;
}
