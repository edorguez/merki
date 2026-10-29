import ExpoModulesCore
import UnityAds

public class UnityAdsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UnityAds")

    AsyncFunction("initialize") { (gameId: String, testMode: Bool) in
      if UnityAds.isInitialized() {
        return
      }
      UnityAds.initialize(gameId, testMode: testMode)
    }

    AsyncFunction("isInitialized") { () -> Bool in
      UnityAds.isInitialized()
    }

    AsyncFunction("loadInterstitial") { (placementId: String, promise: Promise) in
      UnityAds.load(placementId, loadDelegate: InterstitialLoadDelegate(promise: promise))
    }

    AsyncFunction("showInterstitial") { (placementId: String, promise: Promise) in
      guard let viewController = appContext?.utilities?.currentViewController() else {
        promise.resolve(false)
        return
      }
      UnityAds.show(
        viewController,
        placementId: placementId,
        showDelegate: InterstitialShowDelegate(promise: promise)
      )
    }

    View(UnityBannerView.self) {
      Prop("placementId") { (view: UnityBannerView, placementId: String?) in
        view.placementId = placementId
      }
      Prop("adSize") { (view: UnityBannerView, adSize: String?) in
        view.adSize = adSize
      }
    }
  }
}

final class InterstitialLoadDelegate: NSObject, UnityAdsLoadDelegate {
  private let promise: Promise

  init(promise: Promise) {
    self.promise = promise
  }

  func unityAdsAdLoaded(_ placementId: String) {
    promise.resolve(true)
  }

  func unityAdsAdFailed(
    toLoad placementId: String,
    withError error: UnityAdsLoadError,
    withMessage message: String
  ) {
    promise.resolve(false)
  }
}

final class InterstitialShowDelegate: NSObject, UnityAdsShowDelegate {
  private let promise: Promise

  init(promise: Promise) {
    self.promise = promise
  }

  func unityAdsShowComplete(
    _ placementId: String,
    withFinish state: UnityAdsShowCompletionState
  ) {
    promise.resolve(true)
  }

  func unityAdsShowFailed(
    _ placementId: String,
    withError error: UnityAdsShowError,
    withMessage message: String
  ) {
    promise.resolve(false)
  }

  func unityAdsShowStart(_ placementId: String) {}

  func unityAdsShowClick(_ placementId: String) {}
}
