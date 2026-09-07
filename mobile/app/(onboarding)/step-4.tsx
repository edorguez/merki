import { useFloat } from '../../hooks/animations';
import { OnboardingStep } from '../../components/onboarding/OnboardingStep';
import IMAGE from '../../assets/onboarding/merki_checkout.png';

export default function OnboardingStep4() {
  const float = useFloat({ distance: 10, duration: 3200 });

  return (
    <OnboardingStep
      image={IMAGE}
      title="Cuentas claras y adiós "
      titleAccent="pena"
      subtitle="Llega a la caja sabiendo exactamente cuánto vas a pagar. Sin sorpresas, con cuentas claras."
      imageAnimatedStyle={float}
    />
  );
}
