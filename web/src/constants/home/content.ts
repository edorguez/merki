import merkiLogo from '../../assets/merki-logo.webp'
import merkiIllustration from '../../assets/merki-illustration.webp'
import merkiScan from '../../assets/merki-scan.webp'
import merkiCalculator from '../../assets/merki-calculator.webp'
import merkiCheckout from '../../assets/merki-checkout.webp'
import avatarSofia from '../../assets/avatar-sofia.webp'
import avatarCarlos from '../../assets/avatar-carlos.webp'
import avatarElena from '../../assets/avatar-elena.webp'
import characterAvatar from '../../assets/character.webp'

export interface Testimonial {
  name: string
  role: string
  text: string
  avatar: string
}

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
  { label: 'Testimonios', href: '#testimonios' },
]

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
  { label: 'Descargas', value: 50, suffix: 'k+' },
  { label: 'App Store', value: 4.8, suffix: '/5', isFloat: true },
]

export const showcaseContent = {
  title: 'Mi Billetera',
  balanceLabel: 'Balance Total',
  balanceValue: '$450.25',
  transactionsLabel: 'Transacciones Recientes',
  character: {
    src: characterAvatar
  },
  bubbleText: '¡Llevas un 80% de tu presupuesto este mes!',
}


export const testimonials: Testimonial[] = [
  {
    name: 'Sofía R.',
    role: 'Madre de familia',
    text: 'Escanear las facturas del automercado me ha salvado horas. Y ver los precios en ambas monedas al instante es invaluable.',
    avatar: avatarSofia,
  },
  {
    name: 'Carlos M.',
    role: 'Estudiante',
    text: 'La interfaz es súper limpia. Nada de menús complicados, solo abro la app y anoto mis gastos diarios.',
    avatar: avatarCarlos,
  },
  {
    name: 'Elena P.',
    role: 'Emprendedora',
    text: 'Uso Merki para los gastos de mi pequeño negocio. El modo offline me salva cuando estoy en el mercado mayorista.',
    avatar: avatarElena,
  },
  {
    name: 'Diego G.',
    role: 'Ingeniero y papá',
    text: 'Comparo precios entre mercados y Merki me dice al instante cuánto gastaré en dólares. Mi esposa y yo llevamos el presupuesto familiar sin pelear.',
    avatar: avatarElena,
  },
  {
    name: 'Valentina L.',
    role: 'Diseñadora freelance',
    text: 'Escaneo mis compras del mes y al llegar a casa todo está ordenado por categorías. Ver el gasto en Bs y USD a la vez me cambió la vida.',
    avatar: avatarSofia,
  },
]

export const ctaContent = {
  title: 'Empieza a controlar tus gastos hoy mismo',
  description:
    'Únete a miles de usuarios que ya gestionan su dinero de forma inteligente y sin estrés.',
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
