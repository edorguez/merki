package expo.modules.unityads

import android.os.Handler
import android.os.Looper
import com.unity3d.ads.IUnityAdsInitializationListener
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UnityAdsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UnityAds")

    AsyncFunction("initialize") { gameId: String, testMode: Boolean ->
      if (UnityAds.isInitialized) {
        return@AsyncFunction true
      }

      val context = appContext.reactContext ?: return@AsyncFunction false
      onMain {
        UnityAds.initialize(context, gameId, testMode, object : IUnityAdsInitializationListener {
          override fun onInitializationComplete() {}
          override fun onInitializationFailed(error: UnityAds.UnityAdsInitializationError, message: String) {}
        })
      }
      true
    }

    AsyncFunction("isInitialized") {
      UnityAds.isInitialized
    }

    AsyncFunction("loadInterstitial") { placementId: String, promise: Promise ->
      onMain {
        if (!UnityAds.isInitialized) {
          promise.resolve(false)
          return@onMain
        }
        UnityAds.load(placementId, object : IUnityAdsLoadListener {
          override fun onUnityAdsAdLoaded(placementId: String) {
            promise.resolve(true)
          }

          override fun onUnityAdsFailedToLoad(
            placementId: String,
            error: UnityAds.UnityAdsLoadError,
            message: String
          ) {
            promise.resolve(false)
          }
        })
      }
    }

    AsyncFunction("showInterstitial") { placementId: String, promise: Promise ->
      onMain {
        val activity = appContext.currentActivity
        if (!UnityAds.isInitialized || activity == null) {
          promise.resolve(false)
          return@onMain
        }
        UnityAds.show(activity, placementId, object : IUnityAdsShowListener {
          override fun onUnityAdsShowFailure(
            placementId: String,
            error: UnityAds.UnityAdsShowError,
            message: String
          ) {
            promise.resolve(false)
          }

          override fun onUnityAdsShowStart(placementId: String) {}

          override fun onUnityAdsShowClick(placementId: String) {}

          override fun onUnityAdsShowComplete(
            placementId: String,
            state: UnityAds.UnityAdsShowCompletionState
          ) {
            promise.resolve(true)
          }
        })
      }
    }

    View(UnityBannerView::class) {
      Prop("placementId") { view: UnityBannerView, placementId: String? ->
        view.placementId = placementId
      }
      Prop("adSize") { view: UnityBannerView, adSize: String? ->
        view.adSize = adSize
      }
    }
  }

  private fun onMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
    } else {
      Handler(Looper.getMainLooper()).post(block)
    }
  }
}
