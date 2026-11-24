import Foundation
import UIKit
import UnityAds

/// Schedules and owns the banner requests for each placement.
///
/// Unity Ads 4.21 exposes only `load`/`loadWithOptions` for `UADSBannerView` —
/// no show/resume — and the SDK ends the impression as soon as the view leaves
/// the window. A banner therefore cannot be reused across screens: it is
/// destroyed on release and a fresh one is loaded on acquire. This cache keeps
/// a single request pipeline per placement (no duplicate instances, retries
/// survive transitions, events route to whichever screen currently holds the
/// banner) and debounces requests so rapid navigation cannot spam the SDK.
///
/// All state is only touched from the main thread.
final class BannerCache {
  static let shared = BannerCache()
  static let bannerSize = CGSize(width: 320, height: 50)

  private static let initRetryInterval: TimeInterval = 1.0
  private static let maxInitRetries = 10
  private static let loadRetryInterval: TimeInterval = 8.0
  private static let maxLoadRetries = 2
  private static let idleRetryInterval: TimeInterval = 60

  /// Debounce for load requests per placement. Only guards against pathological
  /// navigation loops; it is deliberately far below Unity's ~30s banner refresh
  /// interval, which applies to auto-refresh, not to explicit loads of a fresh
  /// banner view.
  private static let minLoadInterval: TimeInterval = 5

  private final class Entry: NSObject, UADSBannerViewDelegate {
    let placementId: String
    var banner: UADSBannerView?
    weak var holder: UnityBannerView?
    var loadAttempts = 0
    var initAttempts = 0
    var pendingLoad: DispatchWorkItem?

    init(placementId: String) {
      self.placementId = placementId
    }

    func bannerViewDidLoad(_ bannerView: UADSBannerView) {
      BannerCache.shared.handleLoaded(entry: self)
    }

    func bannerViewDidShow(_ bannerView: UADSBannerView) {
      print("[UnityAds] banner: shown placement=\(placementId)")
    }

    func bannerViewDidClick(_ bannerView: UADSBannerView) {
      print("[UnityAds] banner: click placement=\(placementId)")
    }

    func bannerViewDidLeaveApplication(_ bannerView: UADSBannerView) {
      print("[UnityAds] banner: left application")
    }

    func bannerViewDidError(_ bannerView: UADSBannerView, error: UADSBannerError) {
      BannerCache.shared.handleFailure(entry: self, error: error)
    }
  }

  private var entries: [String: Entry] = [:]
  private var lastLoadByPlacement: [String: Date] = [:]

  // MARK: - Lifecycle

  /// Registers `holder` for `placementId` and makes sure a fresh banner is loading.
  func acquire(placementId: String, holder: UnityBannerView) {
    let entry: Entry
    if let existing = entries[placementId] {
      entry = existing
    } else {
      entry = Entry(placementId: placementId)
      entries[placementId] = entry
    }

    if entry.holder !== holder {
      if entry.holder != nil {
        // The previous screen owned a banner that cannot survive the handoff
        // (no show/resume in this SDK), so drop it and start clean.
        cancel(entry)
        discardBanner(entry)
      }
      entry.holder = holder
    }

    if entry.banner != nil {
      // A request for this holder is already in flight (repeated acquire).
      if let banner = entry.banner {
        holder.attachBannerView(banner)
      }
      return
    }

    scheduleLoad(entry: entry, after: 0)
  }

  /// Detaches and destroys the banner; the next acquire loads a new one.
  func release(placementId: String, holder: UnityBannerView) {
    guard let entry = entries[placementId], entry.holder === holder else { return }

    entry.holder = nil
    holder.detachBannerView()
    cancel(entry)
    discardBanner(entry)
  }

  /// Full teardown, used when a holder switches to a different placement.
  func destroyPlacement(placementId: String, holder: UnityBannerView) {
    guard let entry = entries[placementId], entry.holder === holder else { return }

    entries.removeValue(forKey: placementId)
    cancel(entry)
    holder.detachBannerView()
    discardBanner(entry)
    entry.holder = nil
  }

  // MARK: - Load pipeline

  private func handleLoaded(entry: Entry) {
    print("[UnityAds] banner: loaded placement=\(entry.placementId)")
    entry.loadAttempts = 0
    entry.holder?.emitAdLoaded()
  }

  private func handleFailure(entry: Entry, error: UADSBannerError) {
    print("[UnityAds] banner: error code=\(error.code) message=\(error.localizedDescription)")
    discardBanner(entry)

    if entry.loadAttempts < Self.maxLoadRetries {
      entry.loadAttempts += 1
      print("[UnityAds] banner: retry \(entry.loadAttempts)/\(Self.maxLoadRetries) in \(Self.loadRetryInterval)s")
      scheduleLoad(entry: entry, after: Self.loadRetryInterval)
      return
    }

    // Tell JS the slot is empty, but keep trying: a banner without fill now may
    // receive one later in the same session.
    entry.loadAttempts = 0
    entry.holder?.emitAdError()
    print("[UnityAds] banner: no fill, idle retry in \(Self.idleRetryInterval)s")
    scheduleLoad(entry: entry, after: Self.idleRetryInterval)
  }

  private func scheduleLoad(entry: Entry, after delay: TimeInterval) {
    cancel(entry)
    let work = DispatchWorkItem { [weak self, weak entry] in
      guard let self, let entry else { return }
      entry.pendingLoad = nil
      self.load(entry)
    }
    entry.pendingLoad = work
    DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
  }

  private func cancel(_ entry: Entry) {
    entry.pendingLoad?.cancel()
    entry.pendingLoad = nil
  }

  private func load(_ entry: Entry) {
    guard UnityAds.isInitialized() else {
      if entry.initAttempts >= Self.maxInitRetries {
        print("[UnityAds] banner: SDK never initialized, giving up after \(entry.initAttempts) attempts")
        entry.holder?.emitAdError()
        return
      }
      entry.initAttempts += 1
      print("[UnityAds] banner: SDK not initialized yet (attempt \(entry.initAttempts)/\(Self.maxInitRetries))")
      scheduleLoad(entry: entry, after: Self.initRetryInterval)
      return
    }
    entry.initAttempts = 0

    if entry.banner != nil { return }

    // No holder means nothing visible to fill; the next acquire schedules again.
    guard let holder = entry.holder else { return }

    let now = Date()
    if let lastLoad = lastLoadByPlacement[entry.placementId] {
      let elapsed = now.timeIntervalSince(lastLoad)
      if elapsed < Self.minLoadInterval {
        let wait = Self.minLoadInterval - elapsed
        print("[UnityAds] banner: debounced, next load for \(entry.placementId) in \(wait)s")
        scheduleLoad(entry: entry, after: wait)
        return
      }
    }
    lastLoadByPlacement[entry.placementId] = now

    let size = Self.bannerSize
    print("[UnityAds] banner: load placement=\(entry.placementId) size=\(Int(size.width))x\(Int(size.height))")

    let banner = UADSBannerView(placementId: entry.placementId, size: size)
    banner.delegate = entry
    banner.translatesAutoresizingMaskIntoConstraints = false
    entry.banner = banner
    holder.attachBannerView(banner)
    banner.load()
  }

  private func discardBanner(_ entry: Entry) {
    guard let banner = entry.banner else { return }
    entry.banner = nil
    banner.delegate = nil
    banner.removeFromSuperview()
  }
}
