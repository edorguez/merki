import { sectionEyebrows, stats } from '../../constants/home/content'
import { Counter } from './Counter'
import styles from './SocialProofSection.module.scss'

export function SocialProofSection() {
  return (
    <section id="numeros" className={styles.section}>
      <p className="eyebrow">{sectionEyebrows.stats}</p>
      <h2 className={styles.title}>
        <span className={`${styles.titleInner} mask-line`}>Merki en números</span>
      </h2>

      <div className={`${styles.stats} gsap-reveal`}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.stat}>
            <span className={`${styles.statValue} ${i === 0 ? styles.statPrimary : styles.statSecondary}`}>
              <Counter target={stat.value} suffix={stat.suffix} isFloat={stat.isFloat} />
            </span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
