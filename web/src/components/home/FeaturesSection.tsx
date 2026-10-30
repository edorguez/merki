import { features, sectionEyebrows } from '../../constants/home/content'
import { MaterialIcon } from '../shared/MaterialIcon'
import styles from './FeaturesSection.module.scss'

export function FeaturesSection() {
  return (
    <section id="caracteristicas" className={styles.section}>
      <div className={styles.container}>
        <p className="eyebrow">{sectionEyebrows.features}</p>
        <h2 className={styles.heading}>
          <span className={`${styles.headingInner} mask-line`}>Diseñado para tu día a día</span>
        </h2>
        <div className={styles.grid}>
          {features.map((f, i) => (
            <article key={i} className={`${styles.card} gsap-reveal`}>
              <div className={styles.panel}>
                <img src={f.image} alt="" className={styles.panelImage} loading="lazy" />
              </div>
              <div className={styles.body}>
                <div className={styles.titleRow}>
                  <MaterialIcon name={f.icon} className={styles.icon} />
                  <h3 className={styles.cardTitle}>{f.title}</h3>
                </div>
                <p className={styles.cardDesc}>{f.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
