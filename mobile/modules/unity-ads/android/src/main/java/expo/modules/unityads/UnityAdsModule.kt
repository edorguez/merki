package expo.modules.unityads

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.unity3d.ads.IUnityAdsInitializationListener
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UnityAdsModule : Module() {
  private companion object {
    const val TAG = "UnityAds"
  }

  override fun definition() = ModuleDefinition {
    Name("UnityAds")

    // Resolves true only once the SDK actually finished initializing, so JS can
    // wait for readiness before mounting banners or loading interstitials.
    AsyncFunction("initialize") { gameId: String, testMode: Boolean, promise: Promise ->
      if (UnityAds.isInitialized) {
        promise.resolve(true)
        return@AsyncFunction
      }

      val context = appContext.reactContext
      if (context == null) {
        Log.w(TAG, "initialize: no react context")
        promise.resolve(false)
        return@AsyncFunction
      }

      Log.d(TAG, "initialize: gameId=$gameId testMode=$testMode")
      onMain {
        UnityAds.initialize(context, gameId, testMode, object : IUnityAdsInitializationListener {
          override fun onInitializationComplete() {
            Log.d(TAG, "initialize: complete")
            promise.resolve(true)
          }

          override fun onInitializationFailed(
            error: UnityAds.UnityAdsInitializationError,
            message: String
          ) {
            Log.e(TAG, "initialize: failed code=$error message=$message")
            promise.resolve(false)
          }
        })
      }
    }

    AsyncFunction("isInitialized") {
      UnityAds.isInitialized
    }

    AsyncFunction("loadInterstitial") { placementId: String, promise: Promise ->
      onMain {
        if (!UnityAds.isInitialized) {
          Log.w(TAG, "loadInterstitial: SDK not initialized")
          promise.resolve(false)
          return@onMain
        }
        Log.d(TAG, "loadInterstitial: $placementId")
        UnityAds.load(placementId, object : IUnityAdsLoadListener {
          override fun onUnityAdsAdLoaded(placementId: String) {
            Log.d(TAG, "loadInterstitial: loaded $placementId")
            promise.resolve(true)
          }

          override fun onUnityAdsFailedToLoad(
            placementId: String,
            error: UnityAds.UnityAdsLoadError,
            message: String
          ) {
            Log.w(TAG, "loadInterstitial: failed $placementId code=$error message=$message")
            promise.resolve(false)
          }
        })
      }
    }

    AsyncFunction("showInterstitial") { placementId: String, promise: Promise ->
      onMain {
        val activity = appContext.currentActivity
        if (!UnityAds.isInitialized || activity == null) {
          Log.w(TAG, "showInterstitial: not ready (initialized=${UnityAds.isInitialized})")
          promise.resolve(false)
          return@onMain
        }
        Log.d(TAG, "showInterstitial: $placementId")
        UnityAds.show(activity, placementId, object : IUnityAdsShowListener {
          override fun onUnityAdsShowFailure(
            placementId: String,
            error: UnityAds.UnityAdsShowError,
            message: String
          ) {
            Log.w(TAG, "showInterstitial: failed $placementId code=$error message=$message")
            promise.resolve(false)
          }

          override fun onUnityAdsShowStart(placementId: String) {
            Log.d(TAG, "showInterstitial: started $placementId")
          }

          override fun onUnityAdsShowClick(placementId: String) {
            Log.d(TAG, "showInterstitial: click $placementId")
          }

          override fun onUnityAdsShowComplete(
            placementId: String,
            state: UnityAds.UnityAdsShowCompletionState
          ) {
            Log.d(TAG, "showInterstitial: complete $placementId state=$state")
            promise.resolve(true)
          }
        })
      }
    }

    View(UnityBannerView::class) {
      Events("onAdLoaded", "onAdError")
      Prop("placementId") { view: UnityBannerView, placementId: String? ->
        view.placementId = placementId
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
