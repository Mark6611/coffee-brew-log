import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    // Scene lifecycle (Capacitor 8.5+). An app built with the iOS 27 SDK MUST adopt
    // it: UIKit traps about six seconds after launch otherwise (EXC_BREAKPOINT in
    // UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption). It is a
    // linked-on-SDK gate — the same binary runs fine on iOS 26, and SDK-26 builds
    // run fine on iOS 27 — so it only appears once the app is built with Xcode 27.
    // The window and root view controller live in SceneDelegate (built by UIKit
    // from Main.storyboard). The old application(_:open:options:) and
    // continue-userActivity handlers are gone on purpose: once a scene manifest
    // exists iOS never calls them, and a handler that looks live but is not is a
    // trap for the next reader.
    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }
}
