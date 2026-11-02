package expo.modules.unityads

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.widget.FrameLayout
import com.unity3d.ads.UnityAds
import com.unity3d.services.banners.BannerErrorInfo
import com.unity3d.services.banners.BannerView
import com.unity3d.services.banners.UnityBannerSize
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher

class UnityBannerView(context: Context, appContext: AppContext) : ExpoView(context, appContext),
  BannerView.IListener {

  private companion object {
    const val TAG = "UnityAds"
    const val INIT_RETRY_MS = 1_000L
    const val MAX_INIT_RETRIES = 10
    const val LOAD_RETRY_MS = 8_000L
    const val MAX_LOAD_RETRIES = 2
  }

  /**
   * Emitted once the banner is loaded and safe to show. JS keeps the ad card
   * collapsed until this fires so free users never see an empty white card.
   */
  val onAdLoaded by EventDispatcher<Unit>()

  /** Emitted when the banner definitively failed after all retries. */
  val onAdError by EventDispatcher<Unit>()

  var placementId: String? = null
    set(value) {
      if (field == value) return
      field = value
      reload()
    }

  private val handler = Handler(Looper.getMainLooper())

  private val container = FrameLayout(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
  }

  private var bannerView: BannerView? = null
  private var initAttempts = 0
  private var loadAttempts = 0

  // Props arrive one by one, so coalesce reloads onto the next loop iteration
  // instead of destroying/loading a banner once per prop.
  private val loadRunnable = Runnable { attachAndLoad() }

  init {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(container)
  }

  private fun reload() {
    handler.removeCallbacks(loadRunnable)
    destroyBanner()
    initAttempts = 0
    loadAttempts = 0
    handler.post(loadRunnable)
  }

  private fun attachAndLoad() {
    val id = placementId
    if (id.isNullOrEmpty()) {
      return
    }

    if (!UnityAds.isInitialized) {
      if (initAttempts >= MAX_INIT_RETRIES) {
        Log.w(TAG, "banner: SDK never initialized, giving up after $initAttempts attempts")
        onAdError(Unit)
        return
      }
      initAttempts += 1
      Log.d(TAG, "banner: SDK not initialized yet (attempt $initAttempts/$MAX_INIT_RETRIES)")
      handler.postDelayed(loadRunnable, INIT_RETRY_MS)
      return
    }

    createAndLoad(id)
  }

  private fun createAndLoad(id: String) {
    val size = UnityBannerSize.standard

    // UnityBannerSize is expressed in dp, but layout params expect pixels.
    // Passing dp straight through renders the ad at 1/density of its intended
    // size, which looks like an empty white box inside the RN container.
    val density = resources.displayMetrics.density
    val widthPx = Math.round(size.width * density)
    val heightPx = Math.round(size.height * density)

    Log.d(
      TAG,
      "banner: load placement=$id size=${size.width}x${size.height}dp " +
        "-> ${widthPx}x${heightPx}px (density=$density)"
    )

    val banner = BannerView(context, id, size).apply {
      setListener(this@UnityBannerView)
    }

    container.addView(
      banner,
      FrameLayout.LayoutParams(widthPx, heightPx, Gravity.CENTER)
    )

    bannerView = banner
    banner.load()
  }

  private fun destroyBanner() {
    bannerView?.let {
      it.setListener(null)
      it.destroy()
    }
    bannerView = null
    container.removeAllViews()
  }

  override fun onBannerLoaded(banner: BannerView) {
    Log.d(TAG, "banner: loaded placement=$placementId")
    onAdLoaded(Unit)
  }

  override fun onBannerShown(banner: BannerView) {
    Log.d(TAG, "banner: shown placement=$placementId")
  }

  override fun onBannerClick(banner: BannerView) {
    Log.d(TAG, "banner: click placement=$placementId")
  }

  override fun onBannerFailedToLoad(banner: BannerView, errorInfo: BannerErrorInfo) {
    Log.w(
      TAG,
      "banner: failed placement=$placementId code=${errorInfo.errorCode} " +
        "message=${errorInfo.errorMessage}"
    )

    destroyBanner()

    if (loadAttempts >= MAX_LOAD_RETRIES) {
      Log.w(TAG, "banner: giving up after $loadAttempts retries")
      onAdError(Unit)
      return
    }

    loadAttempts += 1
    Log.d(TAG, "banner: retry $loadAttempts/$MAX_LOAD_RETRIES in ${LOAD_RETRY_MS}ms")
    handler.postDelayed(loadRunnable, LOAD_RETRY_MS)
  }

  override fun onBannerLeftApplication(banner: BannerView) {
    Log.d(TAG, "banner: left application")
  }

  override fun onDetachedFromWindow() {
    handler.removeCallbacksAndMessages(null)
    destroyBanner()
    super.onDetachedFromWindow()
  }
}
