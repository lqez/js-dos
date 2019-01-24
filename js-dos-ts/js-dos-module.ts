// # DosModule
// DosModule is [emscripten module object](https://kripken.github.io/emscripten-site/docs/api_reference/module.html),
// with additional functionality
import { DosRuntime } from "./js-dos";
import { DosCommandInterface } from "./js-dos-ci";
import { DosFS } from "./js-dos-fs";
import { DosOptions } from "./js-dos-options";
import { DosUi } from "./js-dos-ui";

export class DosModule extends DosOptions {
    public isValid: boolean = false;
    public canvas: HTMLCanvasElement = null;
    private ci: Promise<DosCommandInterface> = null;
    private instance: any;
    private fs: DosFS = null;
    private ui: DosUi = null;
    private onready: (runtime: DosRuntime) => void;

    constructor(canvas: HTMLCanvasElement, onready: (runtime: DosRuntime) => void) {
        super();
        this.canvas = canvas;
        this.onready = onready;
    }

    // ### logging
    // DosModule implements simply logging features:
    // `debug`, `info`, `warn`, `error` methods
    public debug(message: string) {
        this.log("[DEBUG] " + message);
    }

    public info(message: string) {
        this.log("[INFO] " + message);
    }

    public warn(message: string) {
        this.log("[WARN] " + message);
    }

    public error(message: string) {
        this.log("[ERROR] " + message);
    }

    // ### ondosbox
    public ondosbox(dosbox: any, instantiateWasm: any) {
        this.info("DosBox resolved");
        (this as any).instantiateWasm = instantiateWasm;
        this.instance = new dosbox(this);
    }
    // Method `ondosbox` is called when
    // [Host](https://js-dos.com/6.22/docs/api/generate.html?page=js-dos-host) is resolved.
    // This method instaniate wasm dosbox module with `this` as emscripten
    // module object. It means that emscripten will call
    // `this.onRuntimeInitialized` when runtime will be ready

    public resolve() {
        if (!this.wdosboxUrl) {
            this.wdosboxUrl = "wdosbox.js";
        }

        if (!this.log) {
            /* tslint:disable:no-console */
            this.log = (message: string) => console.log(message);
        }

        if (!this.canvas) {
            this.onerror("canvas field is required, but not set!");
            return;
        }

        if (!this.onprogress) {
            this.ui = new DosUi(this);
            this.onprogress = (stage, total, loaded) => this.ui.onprogress(stage, total, loaded);
        }

        // ### sdl defaults
        // DosModule overrides defaults for emscripten SDL wrapper
        // for maximum performance
        (this as any).SDL = {
            defaults: {
                widht: 320,
                height: 200,
                copyOnLock: false,
                discardOnLock: true,
                opaqueFrontBuffer: false,
            },
        };

        this.isValid = true;
    }

    // ### onRuntimeInitialized
    public onRuntimeInitialized() {
        const mainFn = (args: string[]) => {
            // When emscripten runtime is initialized and main
            // function is called:
            //
            // * DosModule detach [auto ui](https://js-dos.com/6.22/docs/api/generate.html?page=js-dos-ui)
            if (this.ui !== null) {
                this.ui.detach();
                this.ui = null;
            }
            // * Mount emscripten FS as drive c:
            args.unshift("-c", "mount c .", "-c", "c:");
            // * Run dosbox with passed arguments and resolve 
            // [DosCommandInterface](https://js-dos.com/6.22/docs/api/generate.html?page=js-dos-ci)
            (this as any).callMain(args);
            return new Promise<DosCommandInterface>((resolve) => {
                new DosCommandInterface(this, (ci: DosCommandInterface) => {
                    resolve(ci);
                });
            });
        };
        this.fs = new DosFS(this);
        this.onready({
            fs: this.fs,
            main: mainFn,
        });
    }

}
