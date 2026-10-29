import ExpoModulesCore
import UnityAds

public class UnityBannerView: ExpoView {
  var placementId: String? {
    didSet { reload() }
  }

  var adSize: String? {
    didSet { reload() }
  }

  private let container = UIView()

  private var bannerView: UADSBannerView?

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
    guard let placementId, !placementId.isEmpty else {
      return
    }

    bannerView?.removeFromSuperview()

    let size = adSize == "mrec"
      ? CGSize(width: 300, height: 250)
      : CGSize(width: 320, height: 50)

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
}

extension UnityBannerView: UADSBannerViewDelegate {
  public func bannerViewDidLoad(_ bannerView: UADSBannerView) {}

  public func bannerViewDidShow(_ bannerView: UADSBannerView) {}

  public func bannerViewDidClick(_ bannerView: UADSBannerView) {}

  public func bannerViewDidLeaveApplication(_ bannerView: UADSBannerView) {}

  public func bannerViewDidError(_ bannerView: UADSBannerView, error: UADSBannerError) {}
}
