import UIKit
import FirebaseCore
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "valletMobileApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

@objcMembers
final class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    let settings = RCTBundleURLProvider.sharedSettings()
    if let url = settings.jsBundleURL(forBundleRoot: "index", fallbackExtension: nil) {
      return url
    }
    let hostPort = Self.debugMetroHostPort()
    return RCTBundleURLProvider.jsBundleURL(
      forBundleRoot: "index",
      packagerHost: hostPort,
      packagerScheme: settings.packagerScheme,
      enableDev: settings.enableDev,
      enableMinification: settings.enableMinification,
      inlineSourceMap: settings.inlineSourceMap,
      modulesOnly: false,
      runModule: true,
      additionalOptions: nil
    )
    #else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }

  /// When `jsBundleURL` returns nil (e.g. Metro `/status` probe failed), still build a dev URL.
  /// Simulator: loopback to the Mac. Device: prefer `ip.txt` from the Xcode “Bundle React Native code” phase (Mac LAN IP).
  private static func debugMetroHostPort() -> String {
    let port = kRCTBundleURLProviderDefaultPort
    if let path = Bundle.main.path(forResource: "ip", ofType: "txt"),
       let raw = try? String(contentsOfFile: path, encoding: .utf8) {
      let host = raw.trimmingCharacters(in: .whitespacesAndNewlines.union(.newlines))
      if !host.isEmpty {
        return host.contains(":") ? host : "\(host):\(port)"
      }
    }
    #if targetEnvironment(simulator)
    return "127.0.0.1:\(port)"
    #else
    return "localhost:\(port)"
    #endif
  }
}
