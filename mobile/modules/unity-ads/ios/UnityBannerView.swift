import ExpoModulesCore
import UIKit
import UnityAds

public class UnityBannerView: ExpoView {
  private static let bannerSize = CGSize(width: 320, height: 50)
  private static let initRetryInterval: TimeInterval = 1.0
  private static let maxInitRetries = 10
  private static let loadRetryInterval: TimeInterval = 8.0
  private static let maxLoadRetries = 2

  /// Emitted once the banner is loaded and safe to show. JS keeps the ad card
  /// collapsed until this fires so free users never see an empty white card.
  let onAdLoaded = EventDispatcher()

  /// Emitted when the banner definitively failed after all retries.
  let onAdError = EventDispatcher()

  var placementId: String? {
    didSet {
      if placementId != oldValue { reload() }
    }
  }

  private let container = UIView()

  private var bannerView: UADSBannerView?
  private var initAttempts = 0
  private var loadAttempts = 0

  /// Invalidates callbacks scheduled by a previous reload.
  private var generation = 0

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    container.translatesAutoresizingMaskIntoConstraints = false
    addSubview(container)

    NSLayoutConstraint.activate([
      container.leadingAnchor.constraint(equalTo: leadingAnchor),
      container.trailingAnchor.constraint(equalTo: trailingAnchor),
      container.topAnchor.constraint(equalTo: topAnchor),
      container.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  private func reload() {
    generation += 1
    let current = generation

    // Props arrive one by one, so coalesce reloads onto the next run loop
    // iteration instead of loading a banner once per prop.
    DispatchQueue.main.async { [weak self] in
      guard let self, self.generation == current else { return }
      self.removeBanner()
      self.initAttempts = 0
      self.loadAttempts = 0
      self.loadBanner(generation: current)
    }
  }

  private func loadBanner(generation: Int) {
    guard generation == self.generation else { return }
    guard let placementId, !placementId.isEmpty else { return }

    // A banner requested before the SDK finished initializing fails silently.
    guard UnityAds.isInitialized() else {
      guard initAttempts < Self.maxInitRetries else {
        print("[UnityAds] banner: SDK never initialized, giving up after \(initAttempts) attempts")
        onAdError([:])
        return
      }
      initAttempts += 1
      print("[UnityAds] banner: SDK not initialized yet (attempt \(initAttempts)/\(Self.maxInitRetries))")
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.initRetryInterval) { [weak self] in
        self?.loadBanner(generation: generation)
      }
      return
    }

    let size = Self.bannerSize
    print("[UnityAds] banner: load placement=\(placementId) size=\(Int(size.width))x\(Int(size.height))")

    let banner = UADSBannerView(placementId: placementId, size: size)
    banner.delegate = self
    banner.translatesAutoresizingMaskIntoConstraints = false

    container.addSubview(banner)
    NSLayoutConstraint.activate([
      banner.centerXAnchor.constraint(equalTo: container.centerXAnchor),
      banner.topAnchor.constraint(equalTo: container.topAnchor),
      banner.widthAnchor.constraint(equalToConstant: size.width),
      banner.heightAnchor.constraint(equalToConstant: size.height),
    ])

    bannerView = banner
    banner.load()
  }

  private func removeBanner() {
    bannerView?.delegate = nil
    bannerView?.removeFromSuperview()
    bannerView = nil
  }
}

extension UnityBannerView: UADSBannerViewDelegate {
  public func bannerViewDidLoad(_ bannerView: UADSBannerView) {
    print("[UnityAds] banner: loaded placement=\(placementId ?? "-")")
    onAdLoaded([:])
  }

  public func bannerViewDidShow(_ bannerView: UADSBannerView) {
    print("[UnityAds] banner: shown placement=\(placementId ?? "-")")
  }

  public func bannerViewDidClick(_ bannerView: UADSBannerView) {
    print("[UnityAds] banner: click placement=\(placementId ?? "-")")
  }

  public func bannerViewDidLeaveApplication(_ bannerView: UADSBannerView) {
    print("[UnityAds] banner: left application")
  }

  public func bannerViewDidError(_ bannerView: UADSBannerView, error: UADSBannerError) {
    // UADSBannerError subclasses NSError, so `code` is an Int here.
    print("[UnityAds] banner: error code=\(error.code) message=\(error.localizedDescription)")

    guard loadAttempts < Self.maxLoadRetries else {
      print("[UnityAds] banner: giving up after \(loadAttempts) retries")
      onAdError([:])
      return
    }

    loadAttempts += 1
    let current = generation
    print("[UnityAds] banner: retry \(loadAttempts)/\(Self.maxLoadRetries) in \(Self.loadRetryInterval)s")

    DispatchQueue.main.asyncAfter(deadline: .now() + Self.loadRetryInterval) { [weak self] in
      guard let self, self.generation == current else { return }
      self.removeBanner()
      self.loadBanner(generation: current)
    }
  }
}
