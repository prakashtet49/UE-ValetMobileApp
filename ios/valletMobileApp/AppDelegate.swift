import UIKit

#if canImport(FirebaseCore)
import FirebaseCore
#endif

#if canImport(React)
import React
#endif

#if canImport(React_RCTAppDelegate)
import React_RCTAppDelegate
#endif

#if canImport(ReactAppDependencyProvider)
import ReactAppDependencyProvider
#endif

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  #if canImport(React) && canImport(React_RCTAppDelegate)
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  #endif

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
#if canImport(FirebaseCore)
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }
#endif

#if canImport(React) && canImport(React_RCTAppDelegate)
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    #if canImport(ReactAppDependencyProvider)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    #endif

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "valletMobileApp",
      in: window,
      launchOptions: launchOptions
    )
#else
    // Fallback UI when React Native is not available to avoid build-time errors.
    window = UIWindow(frame: UIScreen.main.bounds)
    let vc = UIViewController()
    vc.view.backgroundColor = .systemBackground
    let label = UILabel()
    label.text = "React Native not available"
    label.textColor = .label
    label.textAlignment = .center
    label.numberOfLines = 0
    label.translatesAutoresizingMaskIntoConstraints = false
    vc.view.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: vc.view.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: vc.view.centerYAnchor),
      label.leadingAnchor.constraint(greaterThanOrEqualTo: vc.view.leadingAnchor, constant: 20),
      label.trailingAnchor.constraint(lessThanOrEqualTo: vc.view.trailingAnchor, constant: -20)
    ])
    window?.rootViewController = vc
    window?.makeKeyAndVisible()
#endif

    return true
  }
}

#if canImport(React) && canImport(React_RCTAppDelegate)
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index", fallbackExtension: nil)
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
#endif

