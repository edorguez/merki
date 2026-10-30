import merkiLogo from '../../assets/merki-logo.webp'
import merkiIllustration from '../../assets/merki-illustration.webp'
import merkiScan from '../../assets/merki-scan.webp'
import merkiCalculator from '../../assets/merki-calculator.webp'
import merkiCheckout from '../../assets/merki-checkout.webp'
import merkiHomeScreen from '../../assets/merki-home-screen.webp'
import merkiMascot from '../../assets/merki-mascot.webp'

export interface Stat {
  label: string
  value: number
  suffix: string
  isFloat?: boolean
}

export interface Feature {
  icon: string
  title: string
  description: string
  image: string
  chips?: { label: string; variant: 'primary' | 'neutral' }[]
}

export interface NavLink {
  label: string
  href: string
}

export const brandAssets = {
  logo: merkiLogo,
}

export const heroContent = {
  badgeIcon: 'bolt',
  title: 'Tus compras, bajo control.',
  titleAccent: 'En cualquier moneda.',
  description:
    'Gestiona los carritos del supermercado, presupuestos y gastos diarios. Todo sincronizado en Bolívares y USD al instante. Totalmente gratis, sin hojas de cálculo aburridas, solo claridad.',
  illustration: merkiIllustration,
}

export const navLinks: NavLink[] = [
  { label: 'Características', href: '#caracteristicas' },
  { label: 'La App', href: '#la-app' },
]

export const sectionEyebrows = {
  features: 'Características',
  showcase: 'La App',
  stats: 'Hechos, no promesas',
}

export const showcaseTitle = 'Tu mercado en una pantalla'

export const features: Feature[] = [
  {
    icon: 'document_scanner',
    title: 'Escaneo de Producto',
    description:
      'Toma una foto del precio con el nombre del productio y Merki extraerá automáticamente el precio y producto. Magia pura.',
    image: merkiScan,
  },
  {
    icon: 'currency_exchange',
    title: 'Conversión Automática',
    description:
      'Merki calcula el cambio al instante entre USD y Bolívares usando la tasa actual BCV.',
    image: merkiCalculator,
  },
  {
    icon: 'wifi_off',
    title: 'Modo Offline',
    description:
      '¿Sin señal en el pasillo 4? No hay problema. Registra tus gastos y Merki sincronizará todo cuando recuperes la conexión.',
    image: merkiCheckout,
  },
]

export const stats: Stat[] = [
  { label: 'Monedas al instante (Bs y USD)', value: 2, suffix: '' },
  { label: 'Funcional sin señal', value: 100, suffix: '%' },
  { label: 'Hojas de cálculo', value: 0, suffix: '' },
]

export const showcaseContent = {
  screenshot: merkiHomeScreen,
  mascot: merkiMascot,
  bubbleText: '¡Hola! Soy Merki. Crea tu carrito y yo llevo las cuentas en Bs y USD.',
}

export const ctaContent = {
  title: 'Empieza a controlar tus gastos hoy mismo',
  description:
    'Crea tu primera lista en menos de un minuto y controla tus gastos en Bs y USD, sin hojas de cálculo.',
  iosLabel: 'App Store',
  androidLabel: 'Google Play',
}

export const footerContent = {
  brand: 'Merki',
  tagline: 'Tus compras, bajo control.',
  year: new Date().getFullYear(),
  links: [
    { label: 'Política de Privacidad', href: '/privacy' },
    { label: 'Términos de Servicio', href: '/terms' },
    { label: 'Contáctanos', href: '/contact' },
  ],
}

export const appStoreUrls = {
  ios: 'https://apps.apple.com/us/app/merki/id6812844038',
  android: 'https://play.google.com/store/apps/details?id=com.merki.app',
}

// Deep links used on the matching mobile platform so the native store app opens
// directly. Android includes an automatic fallback to the web URL.
export const appStoreDeepLinks = {
  ios: 'itms-apps://apps.apple.com/us/app/id6812844038',
  android:
    'intent://details?id=com.merki.app#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.merki.app;end',
}
