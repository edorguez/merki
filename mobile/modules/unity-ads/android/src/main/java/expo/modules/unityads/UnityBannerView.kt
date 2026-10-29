package expo.modules.unityads

import android.content.Context
import android.view.Gravity
import android.widget.FrameLayout
import com.unity3d.services.banners.BannerErrorInfo
import com.unity3d.services.banners.BannerView
import com.unity3d.services.banners.UnityBannerSize
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class UnityBannerView(context: Context, appContext: AppContext) : ExpoView(context, appContext),
  BannerView.IListener {

  var placementId: String? = null
    set(value) {
      field = value
      reload()
    }

  var adSize: String? = null
    set(value) {
      field = value
      reload()
    }

  private val container = FrameLayout(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
  }

  private var bannerView: BannerView? = null

  init {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
    addView(container)
  }

  private fun reload() {
    val id = placementId
    if (id.isNullOrEmpty()) {
      return
    }

    bannerView?.destroy()
    container.removeAllViews()

    val size = if (adSize == "mrec") UnityBannerSize.iabStandard else UnityBannerSize.standard
    val banner = BannerView(context, id, size).apply {
      setListener(this@UnityBannerView)
    }
    container.addView(
      banner,
      FrameLayout.LayoutParams(size.width, size.height, Gravity.CENTER_HORIZONTAL)
    )
    bannerView = banner
    banner.load()
  }

  override fun onBannerLoaded(banner: BannerView) {}

  override fun onBannerShown(banner: BannerView) {}

  override fun onBannerClick(banner: BannerView) {}

  override fun onBannerFailedToLoad(banner: BannerView, errorInfo: BannerErrorInfo) {}

  override fun onBannerLeftApplication(banner: BannerView) {}

  override fun onDetachedFromWindow() {
    bannerView?.destroy()
    bannerView = null
    container.removeAllViews()
    super.onDetachedFromWindow()
  }
}
