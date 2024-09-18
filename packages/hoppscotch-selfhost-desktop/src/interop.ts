import { invoke } from "@tauri-apps/api/tauri";
import { onMounted } from "vue";
import { HoppModule } from "@hoppscotch/common/modules"

/**
 * Initializes the interop startup process.
 *
 * This function invokes a Tauri command to perform necessary startup operations.
 * It's a bridge, specifically calling `interop_startup_init` function defined in
 * `src-tauri/src/interop/startup/init.rs`.
 *
 * @returns A promise that resolves when the startup initialization is complete.
 * @throws Will throw an error if the Tauri command fails for any reason.
 */
async function interopStartupInit(): Promise<void> {
    return invoke<void>("interop_startup_init");
}

/**
 * HoppModule for handling interop operations and
 * is responsible for initializing interop-startup related functionality.
 */
export const interopModule: HoppModule = {
    /**
     * Executes when the root component is set up.
     *
     * This function is called during the application's initialization process,
     * and it also uses Vue's `onMounted` hook so the interop-startup occurs
     * **after** the component has been mounted in the DOM.
     */
    onRootSetup: () => {
        onMounted(async () => {
            try {
                await interopStartupInit();
                console.log("Interop startup initialization completed successfully");
            } catch (error) {
                console.error("Failed to initialize interop startup:", error);
            }
        });
    },
};
