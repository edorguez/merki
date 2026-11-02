import ExpoModulesCore
import UnityAds

public class UnityAdsModule: Module {
  /// Unity Ads only retains its delegates weakly for the duration of a request in
  /// some paths; keep them alive until they resolve the JS promise.
  private var retainedDelegates: [AnyObject] = []

  public func definition() -> ModuleDefinition {
    Name("UnityAds")

    // Resolves true only once the SDK actually finished initializing, so JS can
    // wait for readiness before mounting banners or loading interstitials.
    AsyncFunction("initialize") { (gameId: String, testMode: Bool, promise: Promise) in
      runOnMain {
        if UnityAds.isInitialized() {
          promise.resolve(true)
          return
        }
        print("[UnityAds] initialize: gameId=\(gameId) testMode=\(testMode)")
        UnityAds.initialize(
          gameId,
          testMode: testMode,
          initializationDelegate: InitializationDelegate(promise: promise)
        )
      }
    }

    AsyncFunction("isInitialized") { () -> Bool in
      UnityAds.isInitialized()
    }

    AsyncFunction("loadInterstitial") { (placementId: String, promise: Promise) in
      runOnMain { [weak self] in
        guard UnityAds.isInitialized() else {
          print("[UnityAds] loadInterstitial: SDK not initialized")
          promise.resolve(false)
          return
        }
        print("[UnityAds] loadInterstitial: \(placementId)")
        let delegate = InterstitialLoadDelegate(promise: promise) { [weak self] delegate in
          self?.releaseDelegate(delegate)
        }
        self?.retainDelegate(delegate)
        UnityAds.load(placementId, loadDelegate: delegate)
      }
    }

    AsyncFunction("showInterstitial") { (placementId: String, promise: Promise) in
      runOnMain { [weak self] in
        guard UnityAds.isInitialized() else {
          print("[UnityAds] showInterstitial: SDK not initialized")
          promise.resolve(false)
          return
        }
        guard let viewController = self?.appContext?.utilities?.currentViewController() else {
          print("[UnityAds] showInterstitial: no view controller")
          promise.resolve(false)
          return
        }
        print("[UnityAds] showInterstitial: \(placementId)")
        let delegate = InterstitialShowDelegate(promise: promise) { [weak self] delegate in
          self?.releaseDelegate(delegate)
        }
        self?.retainDelegate(delegate)
        UnityAds.show(
          viewController,
          placementId: placementId,
          showDelegate: delegate
        )
      }
    }

    View(UnityBannerView.self) {
      Events("onAdLoaded", "onAdError")
      Prop("placementId") { (view: UnityBannerView, placementId: String?) in
        view.placementId = placementId
      }
    }
  }

  // MARK: - Helpers

  /// Unity Ads must be driven from the main thread on iOS.
  private func runOnMain(_ block: @escaping () -> Void) {
    if Thread.isMainThread {
      block()
    } else {
      DispatchQueue.main.async(execute: block)
    }
  }

  private func retainDelegate(_ delegate: AnyObject) {
    retainedDelegates.append(delegate)
  }

  private func releaseDelegate(_ delegate: AnyObject) {
    retainedDelegates.removeAll { $0 === delegate }
  }
}

final class InitializationDelegate: NSObject, UnityAdsInitializationDelegate {
  private let promise: Promise
  private var finished = false

  init(promise: Promise) {
    self.promise = promise
  }

  func initializationComplete() {
    guard !finished else { return }
    finished = true
    print("[UnityAds] initialize: complete")
    promise.resolve(true)
  }

  func initializationFailed(
    _ error: UnityAdsInitializationError,
    withMessage message: String
  ) {
    guard !finished else { return }
    finished = true
    print("[UnityAds] initialize: failed code=\(error) message=\(message)")
    promise.resolve(false)
  }
}

final class InterstitialLoadDelegate: NSObject, UnityAdsLoadDelegate {
  private let promise: Promise
  private var finished = false
  private let onFinish: (InterstitialLoadDelegate) -> Void

  init(promise: Promise, onFinish: @escaping (InterstitialLoadDelegate) -> Void) {
    self.promise = promise
    self.onFinish = onFinish
  }

  func unityAdsAdLoaded(_ placementId: String) {
    guard !finished else { return }
    finished = true
    print("[UnityAds] loadInterstitial: loaded \(placementId)")
    promise.resolve(true)
    onFinish(self)
  }

  func unityAdsAdFailed(
    toLoad placementId: String,
    withError error: UnityAdsLoadError,
    withMessage message: String
  ) {
    guard !finished else { return }
    finished = true
    print("[UnityAds] loadInterstitial: failed \(placementId) code=\(error) message=\(message)")
    promise.resolve(false)
    onFinish(self)
  }
}

final class InterstitialShowDelegate: NSObject, UnityAdsShowDelegate {
  private let promise: Promise
  private var finished = false
  private let onFinish: (InterstitialShowDelegate) -> Void

  init(promise: Promise, onFinish: @escaping (InterstitialShowDelegate) -> Void) {
    self.promise = promise
    self.onFinish = onFinish
  }

  func unityAdsShowComplete(
    _ placementId: String,
    withFinish state: UnityAdsShowCompletionState
  ) {
    guard !finished else { return }
    finished = true
    print("[UnityAds] showInterstitial: complete \(placementId) state=\(state.rawValue)")
    promise.resolve(true)
    onFinish(self)
  }

  func unityAdsShowFailed(
    _ placementId: String,
    withError error: UnityAdsShowError,
    withMessage message: String
  ) {
    guard !finished else { return }
    finished = true
    print("[UnityAds] showInterstitial: failed \(placementId) code=\(error) message=\(message)")
    promise.resolve(false)
    onFinish(self)
  }

  func unityAdsShowStart(_ placementId: String) {
    print("[UnityAds] showInterstitial: started \(placementId)")
  }

  func unityAdsShowClick(_ placementId: String) {
    print("[UnityAds] showInterstitial: click \(placementId)")
  }
}
