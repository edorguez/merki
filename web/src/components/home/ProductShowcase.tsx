import { sectionEyebrows, showcaseContent, showcaseTitle } from '../../constants/home/content'
import styles from './ProductShowcase.module.scss'

export function ProductShowcase() {
  return (
    <section id="la-app" className={styles.section}>
      <div className={styles.stagePanel}>
        <header className={styles.header}>
          <p className="eyebrow">{sectionEyebrows.showcase}</p>
          <h2 className={styles.heading}>
            <span className={`${styles.headingInner} mask-line`}>{showcaseTitle}</span>
          </h2>
        </header>

        <div className={styles.stage}>
          <div className={`${styles.phoneParallax} gsap-parallax`}>
            <div className={`${styles.phoneWrap} gsap-showcase-enter`}>
              <div className={`${styles.phone} gsap-showcase-phone`}>
                <div className={styles.screen}>
                  <img
                    src={showcaseContent.screenshot}
                    alt="Pantalla de inicio de la app Merki con la lista de compras, el presupuesto y la tasa BCV"
                    width="600"
                    height="1304"
                    loading="lazy"
                    decoding="async"
                    className={styles.screenImg}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.bubble} gsap-showcase-bubble`}>
            <img
              src={showcaseContent.mascot}
              alt=""
              width="160"
              height="160"
              loading="lazy"
              decoding="async"
              className={styles.bubbleMascot}
            />
            <p className={styles.bubbleText}>{showcaseContent.bubbleText}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
