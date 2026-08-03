import type { ComponentType } from 'react';
import {
  AlertTriangle,
  Bitcoin,
  Briefcase,
  DollarSign,
  Flame,
  Gem,
  Globe,
  Info,
  Layers,
  LineChart,
  Scale,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

export type PrivacyIcon = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

export type BenefitItem = {
  title: string;
  description: string;
  icon: PrivacyIcon;
};

export type PolicyItem = {
  title: string;
  content: string;
  icon: PrivacyIcon;
};

export const benefits: BenefitItem[] = [
  {
    title: 'Fixed Leverage',
    description:
      'Enjoy the flexibility of trading with fixed leverage for better control over your positions.',
    icon: Scale,
  },
  {
    title: 'High Leverage',
    description:
      'Access higher leverage to maximize trading potential and opportunity across markets.',
    icon: TrendingUp,
  },
  {
    title: 'Competitive Spreads',
    description:
      'Trade with tight spreads designed to help keep execution costs efficient.',
    icon: LineChart,
  },
  {
    title: 'Multiple Scripts',
    description:
      'Expand your portfolio with access to multiple trading instruments in one place.',
    icon: Layers,
  },
  {
    title: 'Indices',
    description:
      'Trade leading indices from around the world and diversify your exposure.',
    icon: Globe,
  },
  {
    title: 'Cryptos',
    description:
      'Explore cryptocurrency trading with a wide range of digital assets available.',
    icon: Bitcoin,
  },
  {
    title: 'Metals',
    description:
      'Invest in precious metals like gold and silver for long-term value retention.',
    icon: Gem,
  },
  {
    title: 'Currencies',
    description:
      'Trade currency pairs with low spreads and deep liquidity.',
    icon: DollarSign,
  },
  {
    title: 'Energies',
    description:
      'Get access to global energy markets including oil and natural gas.',
    icon: Flame,
  },
  {
    title: 'Trade All Assets',
    description:
      'A unified platform to trade indices, cryptos, metals, currencies, and more seamlessly.',
    icon: Briefcase,
  },
];

export const policies: PolicyItem[] = [
  {
    icon: Info,
    title: 'Introduction',
    content:
      'Welcome to vtindex. By accessing or using our services, you agree to comply with and be bound by the following terms and conditions. Our mission is to provide a transparent and secure environment for all participants in the global financial markets.',
  },
  {
    icon: UserCheck,
    title: 'User Responsibilities',
    content:
      'Ensure the accuracy of your personal information. Use our services ethically and responsibly. Abide by local, national, and international financial laws.',
  },
  {
    icon: ShieldCheck,
    title: 'AML Policy',
    content:
      'vtindex follows strict Anti-Money Laundering regulations. All customers must verify their identity and comply with legal requirements to help prevent financial crime. We maintain a zero-tolerance policy toward illicit activities.',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Warning',
    content:
      'Trading leveraged products, including Forex and CFDs, carries a significant level of risk to your capital and may not be appropriate for all investors. You should only trade with money you can afford to lose.',
  },
];
