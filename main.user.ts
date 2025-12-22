import { WmeSDK } from "wme-sdk-typings";


// the sdk initScript function will be called after the SDK is initialized
window.SDK_INITIALIZED.then(initScript);

function initScript() {
    // initialize the sdk, these should remain here at the top of the script
    if (!window.getWmeSdk) {
        // This block is required for type checking, but it is guaranteed that the function exists.
        throw new Error("SDK not available");
    }
    const wmeSDK: WmeSDK = window.getWmeSdk(
        {
            scriptId: "example-ts-id", // TODO: replace with your script id and script name
            scriptName: "Typescript example" // TODO
        }
    )

    console.debug(`SDK v. ${wmeSDK.getSDKVersion()} on ${wmeSDK.getWMEVersion()} initialized`)

    /* Example functions, define your functions in this section */
    function setKeyboardShortcuts() {
        wmeSDK.Shortcuts.createShortcut({
            callback: () => {
                alert("Shortcut is working!");
            },
            description: "typescript shortcut",
            shortcutId: "test-shortcut-id",
            shortcutKeys: "A+s",
        });
    }

    function addLayer() {
        const layer = wmeSDK.Map.addLayer({
            layerName: "TS Layer"
        });

        wmeSDK.LayerSwitcher.addLayerCheckbox({
            name: "TS Layer",
        })

        // Draw a feature
        wmeSDK.Map.addFeatureToLayer(
            {
                layerName: "TS Layer",
                feature: {
                    id: "test-feature",
                    geometry: {
                        coordinates: [wmeSDK.Map.getMapCenter().lon, wmeSDK.Map.getMapCenter().lat],
                        type: "Point"
                    },
                    type: "Feature",
                }
            }
        )
    }

    function addEventListeners() {
        // ...
    }

    async function addScriptTab() {
        const { tabLabel, tabPane } = await wmeSDK.Sidebar.registerScriptTab()
        tabLabel.innerText = "Typescript Tab" // TODO
        tabPane.innerHTML = "<h1>Typescript Tab</h1>" // TODO
    }

    function init(): void {
        // Call the functions you need to run initialize / run your script here
        addScriptTab()
        setKeyboardShortcuts()
        addLayer()
        addEventListeners()
        alert("Your script is running! - TODO remove this line :)")
    }

    init()
}
