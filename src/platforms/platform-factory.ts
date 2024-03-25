import { Platform } from "./platform.js";
import { StrykerJs } from "./strykerjs.js";

export class PlatformFactory {

    public static getPlatform(): Platform {
        // Here we can add more Stryker flavours in the future, depending on the opened workspace
        return new StrykerJs();
    }

}