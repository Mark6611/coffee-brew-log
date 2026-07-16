import Capacitor
import UIKit

// Capacitor doesn't auto-discover app-local plugins in the SPM setup, so we
// register our custom plugins explicitly here. The storyboard's root view
// controller points at this class instead of CAPBridgeViewController.
class ViewController: CAPBridgeViewController {
	override func capacitorDidLoad() {
		bridge?.registerPluginInstance(CloudSyncPlugin())
	}
}
