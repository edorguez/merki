package expo.modules.unityads

import android.content.Context
import android.util.Log
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import com.unity3d.services.banners.BannerView
import com.unity3d.services.banners.UnityBannerSize
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * Thin container for the placement banner owned by [BannerCache]. The cache
 * keeps one banner alive per placement and reparents it here while the screen
 * is attached, so navigation reuses the already-loaded creative instead of
 * destroying it and waiting for Unity's refresh window.
 */
class UnityBannerView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private companion object {
    const val TAG = "UnityAds"
  }

  /**
   * Emitted once the banner is loaded and safe to show. JS keeps the ad card
   * collapsed until this fires so free users never see an empty white card.
   */
  val onAdLoaded by EventDispatcher<Unit>()

  /** Emitted when the banner failed after all fast retries. */
  val onAdError by EventDispatcher<Unit>()

  var placementId: String? = null
    set(value) {
      if (field == value) return
      val previous = field
      field = value

      if (!previous.isNullOrEmpty()) {
        BannerCache.destroyPlacement(previous, this)
      }
      if (!value.isNullOrEmpty() && isAttachedToWindow) {
        BannerCache.acquire(value, this)
      }
    }

  private val container = FrameLayout(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
  }

  init {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(container)
  }

  internal fun attachBannerView(banner: BannerView) {
    val size = UnityBannerSize.standard
    val density = resources.displayMetrics.density
    val params = FrameLayout.LayoutParams(
      Math.round(size.width * density),
      Math.round(size.height * density),
      Gravity.CENTER
    )

    if (banner.parent === container) {
      banner.layoutParams = params
      return
    }

    (banner.parent as? ViewGroup)?.removeView(banner)
    container.addView(banner, params)
  }

  internal fun detachBannerView() {
    container.removeAllViews()
  }

  internal fun emitAdLoaded() = onAdLoaded(Unit)

  internal fun emitAdError() = onAdError(Unit)

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    placementId?.takeIf { it.isNotEmpty() }?.let {
      Log.d(TAG, "banner: attached placement=$it")
      BannerCache.acquire(it, this)
    }
  }

  override fun onDetachedFromWindow() {
    placementId?.takeIf { it.isNotEmpty() }?.let {
      Log.d(TAG, "banner: detached placement=$it")
      BannerCache.release(it, this)
    }
    super.onDetachedFromWindow()
  }
}
