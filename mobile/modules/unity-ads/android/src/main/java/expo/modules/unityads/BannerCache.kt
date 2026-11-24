package expo.modules.unityads

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import com.unity3d.ads.UnityAds
import com.unity3d.services.banners.BannerErrorInfo
import com.unity3d.services.banners.BannerView
import com.unity3d.services.banners.UnityBannerSize
import java.lang.ref.WeakReference

/**
 * Schedules and owns the banner requests for each placement.
 *
 * Unity Ads 4.21 exposes only `load()` and `destroy()` for a banner — no
 * show/resume — and the SDK ends the impression as soon as the view leaves the
 * window. A banner therefore cannot be reused across screens: it is destroyed
 * on release and a fresh one is loaded on acquire. This cache keeps a single
 * request pipeline per placement (no duplicate instances, load retries survive
 * transitions, events route to whichever screen currently holds the banner) and
 * debounces requests so rapid navigation cannot spam the SDK.
 *
 * All state is only touched from the main thread.
 */
internal object BannerCache {
  private const val TAG = "UnityAds"
  private const val INIT_RETRY_MS = 1_000L
  private const val MAX_INIT_RETRIES = 10
  private const val LOAD_RETRY_MS = 8_000L
  private const val MAX_LOAD_RETRIES = 2
  private const val IDLE_RETRY_MS = 60_000L

  /**
   * Debounce for load requests per placement. Only guards against pathological
   * navigation loops; it is deliberately far below Unity's ~30s banner refresh
   * interval, which applies to auto-refresh, not to explicit loads of a fresh
   * BannerView (confirmed by test-mode logs serving loads every few seconds).
   */
  private const val MIN_LOAD_INTERVAL_MS = 5_000L

  private class Entry(val placementId: String) : BannerView.IListener {
    var banner: BannerView? = null
    var holder: UnityBannerView? = null
    var contextRef: WeakReference<Context>? = null
    var loadAttempts = 0
    var initAttempts = 0
    var pendingLoad: Runnable? = null

    override fun onBannerLoaded(banner: BannerView) {
      Log.d(TAG, "banner: loaded placement=$placementId")
      loadAttempts = 0
      holder?.emitAdLoaded()
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

      discardBanner(this)

      if (loadAttempts >= MAX_LOAD_RETRIES) {
        // Tell JS the slot is empty, but keep trying: a banner without fill now
        // may receive one later in the same session.
        loadAttempts = 0
        holder?.emitAdError()
        Log.d(TAG, "banner: no fill, idle retry in ${IDLE_RETRY_MS}ms")
        schedule(this, IDLE_RETRY_MS)
        return
      }

      loadAttempts += 1
      Log.d(TAG, "banner: retry $loadAttempts/$MAX_LOAD_RETRIES in ${LOAD_RETRY_MS}ms")
      schedule(this, LOAD_RETRY_MS)
    }

    override fun onBannerLeftApplication(banner: BannerView) {
      Log.d(TAG, "banner: left application")
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private val entries = mutableMapOf<String, Entry>()
  private val lastLoadAtByPlacement = mutableMapOf<String, Long>()

  /** Registers [holder] for [placementId] and makes sure a fresh banner is loading. */
  fun acquire(placementId: String, holder: UnityBannerView) {
    val entry = entries.getOrPut(placementId) { Entry(placementId) }

    if (entry.holder !== holder) {
      if (entry.holder != null) {
        // The previous screen owned a banner that cannot survive the handoff
        // (no show/resume in this SDK), so drop it and start clean.
        cancel(entry)
        discardBanner(entry)
      }
      entry.holder = holder
      entry.contextRef = WeakReference(holder.context)
    }

    entry.banner?.let {
      // A request for this holder is already in flight (repeated acquire).
      holder.attachBannerView(it)
      return
    }

    schedule(entry, 0)
  }

  /** Detaches and destroys the banner; the next acquire loads a new one. */
  fun release(placementId: String, holder: UnityBannerView) {
    val entry = entries[placementId] ?: return
    if (entry.holder !== holder) return

    entry.holder = null
    holder.detachBannerView()
    cancel(entry)
    discardBanner(entry)
  }

  /** Full teardown, used when a holder switches to a different placement. */
  fun destroyPlacement(placementId: String, holder: UnityBannerView) {
    val entry = entries[placementId] ?: return
    if (entry.holder !== holder) return

    entries.remove(placementId)
    cancel(entry)
    holder.detachBannerView()
    discardBanner(entry)
    entry.holder = null
  }

  private fun schedule(entry: Entry, delayMs: Long) {
    cancel(entry)
    val runnable = Runnable {
      entry.pendingLoad = null
      load(entry)
    }
    entry.pendingLoad = runnable
    handler.postDelayed(runnable, delayMs)
  }

  private fun cancel(entry: Entry) {
    entry.pendingLoad?.let(handler::removeCallbacks)
    entry.pendingLoad = null
  }

  private fun load(entry: Entry) {
    val id = entry.placementId

    if (!UnityAds.isInitialized) {
      if (entry.initAttempts >= MAX_INIT_RETRIES) {
        Log.w(TAG, "banner: SDK never initialized, giving up after ${entry.initAttempts} attempts")
        entry.holder?.emitAdError()
        return
      }
      entry.initAttempts += 1
      Log.d(TAG, "banner: SDK not initialized yet (attempt ${entry.initAttempts}/$MAX_INIT_RETRIES)")
      schedule(entry, INIT_RETRY_MS)
      return
    }
    entry.initAttempts = 0

    if (entry.banner != null) return

    // No holder means nothing visible to fill; the next acquire schedules again.
    val holder = entry.holder ?: return
    val context = entry.contextRef?.get() ?: return

    val now = SystemClock.elapsedRealtime()
    val wait = MIN_LOAD_INTERVAL_MS - (now - (lastLoadAtByPlacement[id] ?: 0L))
    if (wait > 0) {
      Log.d(TAG, "banner: debounced, next load for $id in ${wait}ms")
      schedule(entry, wait)
      return
    }
    lastLoadAtByPlacement[id] = now

    val size = UnityBannerSize.standard

    // UnityBannerSize is expressed in dp, but layout params expect pixels.
    // Passing dp straight through renders the ad at 1/density of its intended
    // size, which looks like an empty white box inside the RN container.
    val density = context.resources.displayMetrics.density
    Log.d(
      TAG,
      "banner: load placement=$id size=${size.width}x${size.height}dp " +
        "-> ${Math.round(size.width * density)}x${Math.round(size.height * density)}px " +
        "(density=$density)"
    )

    val banner = BannerView(context, id, size).apply { setListener(entry) }
    entry.banner = banner
    holder.attachBannerView(banner)
    banner.load()
  }

  private fun discardBanner(entry: Entry) {
    val banner = entry.banner ?: return
    entry.banner = null
    banner.setListener(null)
    (banner.parent as? ViewGroup)?.removeView(banner)
    banner.destroy()
  }
}
