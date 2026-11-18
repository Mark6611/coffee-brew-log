import Capacitor
import UIKit

// Makes everything UIKit draws follow the IN-APP theme. JS calls:
// Appearance.setStyle({style: "light" | "dark" | "system"}).
//
// The app has its own Light / Dark / System setting (Settings → Appearance), and
// the web layer paints itself accordingly. But the keyboard, the date and time
// pickers, the share sheet and the file picker are drawn by UIKit, which only
// knows the DEVICE setting — so Dark in the app on a Light phone put a white
// keyboard and white pickers over a dark screen. Overriding the window's
// interface style fixes all of them at once; "system" clears the override and
// the app goes back to following the device live.
//
// The override is not persisted: the web layer re-sends the preference on every
// launch (theme.init), before any keyboard or picker can be on screen.
@objc(AppearancePlugin)
public class AppearancePlugin: CAPPlugin, CAPBridgedPlugin {
	public let identifier = "AppearancePlugin"
	public let jsName = "Appearance"
	public let pluginMethods: [CAPPluginMethod] = [
		CAPPluginMethod(name: "setStyle", returnType: CAPPluginReturnPromise)
	]

	@objc func setStyle(_ call: CAPPluginCall) {
		let style: UIUserInterfaceStyle
		switch call.getString("style") {
		case "light": style = .light
		case "dark": style = .dark
		default: style = .unspecified  // "system": follow the device
		}
		DispatchQueue.main.async { [weak self] in
			guard let controller = self?.bridge?.viewController else {
				call.reject("No view controller")
				return
			}
			// The WINDOW, not the view controller: presented controllers (share
			// sheet, file picker, picker popovers) take their traits from it.
			if let window = controller.view.window {
				window.overrideUserInterfaceStyle = style
			} else {
				// Not in a window yet — cover the web view itself; a later call
				// (every theme change re-sends) reaches the window.
				controller.overrideUserInterfaceStyle = style
			}
			call.resolve()
		}
	}
}
