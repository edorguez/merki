import ExpoModulesCore
import UIKit
import UnityAds

/// Thin container for the placement banner owned by `BannerCache`. The cache
/// keeps one banner alive per placement and reparents it here while the screen
/// is attached, so navigation reuses the already-loaded creative instead of
/// destroying it and waiting for Unity's refresh window.
public class UnityBannerView: ExpoView {
  private static let bannerSize = BannerCache.bannerSize

  /// Emitted once the banner is loaded and safe to show. JS keeps the ad card
  /// collapsed until this fires so free users never see an empty white card.
  let onAdLoaded = EventDispatcher()

  /// Emitted when the banner failed after all fast retries.
  let onAdError = EventDispatcher()

  var placementId: String? {
    didSet {
      guard placementId != oldValue else { return }

      if let previous = oldValue, !previous.isEmpty {
        BannerCache.shared.destroyPlacement(placementId: previous, holder: self)
      }
      if let current = placementId, !current.isEmpty, window != nil {
        BannerCache.shared.acquire(placementId: current, holder: self)
      }
    }
  }

  private let container = UIView()

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

  public override func didMoveToWindow() {
    super.didMoveToWindow()

    guard let placementId, !placementId.isEmpty else { return }

    if window != nil {
      print("[UnityAds] banner: attached placement=\(placementId)")
      BannerCache.shared.acquire(placementId: placementId, holder: self)
    } else {
      print("[UnityAds] banner: detached placement=\(placementId)")
      BannerCache.shared.release(placementId: placementId, holder: self)
    }
  }

  func attachBannerView(_ banner: UADSBannerView) {
    if banner.superview === container {
      return
    }

    banner.removeFromSuperview()
    container.addSubview(banner)

    NSLayoutConstraint.activate([
      banner.centerXAnchor.constraint(equalTo: container.centerXAnchor),
      banner.topAnchor.constraint(equalTo: container.topAnchor),
      banner.widthAnchor.constraint(equalToConstant: Self.bannerSize.width),
      banner.heightAnchor.constraint(equalToConstant: Self.bannerSize.height),
    ])
  }

  func detachBannerView() {
    container.subviews.forEach { $0.removeFromSuperview() }
  }

  func emitAdLoaded() {
    onAdLoaded([:])
  }

  func emitAdError() {
    onAdError([:])
  }
}
