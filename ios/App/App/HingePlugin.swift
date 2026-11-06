import Capacitor
import UIKit

// Tells the web layer whether the iPhone Duo is folded. JS calls: Hinge.getState()
// and listens for "change" — both carry {state: "none" | "unknown" | "closed" |
// "partial" | "open"}. Ported from sibling Buffy, where it was measured on the
// iOS 27.2 Duo simulator.
//
// The WebView cannot work this out for itself. Unfolded, the Duo hands it a
// 951×669pt landscape viewport with the hinge down the middle — a width that on its
// own looks exactly like an iPad or a desktop window, where every page deliberately
// centres a 672px column. And the iOS 27.2 WebKit exposes neither the CSS
// viewport-segments media features nor navigator.devicePosture, so
// UIHingeInteraction is the only source. No hinge (every other device, and any iOS
// before 27.1) reports "none", and the web layer keeps its width-only behaviour.
@objc(HingePlugin)
public class HingePlugin: CAPPlugin, CAPBridgedPlugin {
	public let identifier = "HingePlugin"
	public let jsName = "Hinge"
	public let pluginMethods: [CAPPluginMethod] = [
		CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
	]

	// Only touched on the main thread: UIHingeInteraction calls back there, and
	// getState hops there before reading it.
	private var state = "none"
	private var interaction: UIInteraction?

	override public func load() {
		guard #available(iOS 27.1, *) else { return }
		DispatchQueue.main.async { [weak self] in
			guard let self, self.interaction == nil, let view = self.bridge?.viewController?.view else { return }
			// The handler fires with the initial state, on every hinge change, and
			// whenever the view moves between hierarchies (nil hinge = none).
			let interaction = UIHingeInteraction { [weak self] _, update in
				self?.publish(HingePlugin.name(for: update.hinge))
			}
			view.addInteraction(interaction)
			self.interaction = interaction
		}
	}

	@available(iOS 27.1, *)
	private static func name(for hinge: UIHinge?) -> String {
		guard let hinge else { return "none" }
		switch hinge.status {
		case .closed: return "closed"
		case .partiallyOpen: return "partial"
		case .fullyOpen: return "open"
		default: return "unknown"
		}
	}

	private func publish(_ next: String) {
		guard next != state else { return }
		state = next
		// Retained so a change that lands before the web layer has subscribed (the
		// first update arrives while the page is still loading) is not lost. An event
		// that ever slips past a concurrent addListener is covered by watchHinge's
		// follow-up getState, and the web layer's flag is sticky. Keep the strings in
		// step with src/lib/hinge.ts.
		notifyListeners("change", data: ["state": next], retainUntilConsumed: true)
	}

	@objc func getState(_ call: CAPPluginCall) {
		DispatchQueue.main.async { [weak self] in
			call.resolve(["state": self?.state ?? "none"])
		}
	}
}
