import Capacitor

/// The web view's controller. It registers our own plugin, which lives in the app target instead of an npm package.
class XSwordViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(XSwordGamesPlugin())
    }
}
