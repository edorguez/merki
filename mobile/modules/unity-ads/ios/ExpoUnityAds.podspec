Pod::Spec.new do |s|
  s.name           = 'ExpoUnityAds'
  s.version        = '0.1.0'
  s.summary        = 'Unity Ads bridge for Merki'
  s.description    = 'Local Expo module that wraps the Unity Ads iOS SDK.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'UnityAds', '~> 4.21.0'

  s.source_files = '**/*.{h,m,mm,swift}'
end
