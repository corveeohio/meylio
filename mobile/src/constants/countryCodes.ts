export type Country = {
  iso: string;
  name: string;
  flag: string;
  dial: string;
};

export const COUNTRIES: Country[] = [
  { iso: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  { iso: 'BE', name: 'Belgique', flag: '🇧🇪', dial: '+32' },
  { iso: 'CH', name: 'Suisse', flag: '🇨🇭', dial: '+41' },
  { iso: 'LU', name: 'Luxembourg', flag: '🇱🇺', dial: '+352' },
  { iso: 'MC', name: 'Monaco', flag: '🇲🇨', dial: '+377' },
  { iso: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
  { iso: 'US', name: 'États-Unis', flag: '🇺🇸', dial: '+1' },
  { iso: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dial: '+44' },
  { iso: 'IE', name: 'Irlande', flag: '🇮🇪', dial: '+353' },
  { iso: 'DE', name: 'Allemagne', flag: '🇩🇪', dial: '+49' },
  { iso: 'ES', name: 'Espagne', flag: '🇪🇸', dial: '+34' },
  { iso: 'IT', name: 'Italie', flag: '🇮🇹', dial: '+39' },
  { iso: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351' },
  { iso: 'NL', name: 'Pays-Bas', flag: '🇳🇱', dial: '+31' },
  { iso: 'AT', name: 'Autriche', flag: '🇦🇹', dial: '+43' },
  { iso: 'SE', name: 'Suède', flag: '🇸🇪', dial: '+46' },
  { iso: 'NO', name: 'Norvège', flag: '🇳🇴', dial: '+47' },
  { iso: 'DK', name: 'Danemark', flag: '🇩🇰', dial: '+45' },
  { iso: 'FI', name: 'Finlande', flag: '🇫🇮', dial: '+358' },
  { iso: 'PL', name: 'Pologne', flag: '🇵🇱', dial: '+48' },
  { iso: 'GR', name: 'Grèce', flag: '🇬🇷', dial: '+30' },
  { iso: 'RO', name: 'Roumanie', flag: '🇷🇴', dial: '+40' },
  { iso: 'TR', name: 'Turquie', flag: '🇹🇷', dial: '+90' },
  { iso: 'MA', name: 'Maroc', flag: '🇲🇦', dial: '+212' },
  { iso: 'DZ', name: 'Algérie', flag: '🇩🇿', dial: '+213' },
  { iso: 'TN', name: 'Tunisie', flag: '🇹🇳', dial: '+216' },
  { iso: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221' },
  { iso: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dial: '+225' },
  { iso: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237' },
  { iso: 'CD', name: 'RD Congo', flag: '🇨🇩', dial: '+243' },
  { iso: 'CG', name: 'Congo', flag: '🇨🇬', dial: '+242' },
  { iso: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223' },
  { iso: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226' },
  { iso: 'BJ', name: 'Bénin', flag: '🇧🇯', dial: '+229' },
  { iso: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228' },
  { iso: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241' },
  { iso: 'MG', name: 'Madagascar', flag: '🇲🇬', dial: '+261' },
  { iso: 'RE', name: 'La Réunion', flag: '🇷🇪', dial: '+262' },
  { iso: 'GP', name: 'Guadeloupe', flag: '🇬🇵', dial: '+590' },
  { iso: 'MQ', name: 'Martinique', flag: '🇲🇶', dial: '+596' },
  { iso: 'GF', name: 'Guyane', flag: '🇬🇫', dial: '+594' },
  { iso: 'LB', name: 'Liban', flag: '🇱🇧', dial: '+961' },
  { iso: 'EG', name: 'Égypte', flag: '🇪🇬', dial: '+20' },
  { iso: 'IL', name: 'Israël', flag: '🇮🇱', dial: '+972' },
  { iso: 'AE', name: 'Émirats arabes unis', flag: '🇦🇪', dial: '+971' },
  { iso: 'SA', name: 'Arabie Saoudite', flag: '🇸🇦', dial: '+966' },
  { iso: 'IN', name: 'Inde', flag: '🇮🇳', dial: '+91' },
  { iso: 'CN', name: 'Chine', flag: '🇨🇳', dial: '+86' },
  { iso: 'JP', name: 'Japon', flag: '🇯🇵', dial: '+81' },
  { iso: 'KR', name: 'Corée du Sud', flag: '🇰🇷', dial: '+82' },
  { iso: 'AU', name: 'Australie', flag: '🇦🇺', dial: '+61' },
  { iso: 'NZ', name: 'Nouvelle-Zélande', flag: '🇳🇿', dial: '+64' },
  { iso: 'BR', name: 'Brésil', flag: '🇧🇷', dial: '+55' },
  { iso: 'MX', name: 'Mexique', flag: '🇲🇽', dial: '+52' },
  { iso: 'AR', name: 'Argentine', flag: '🇦🇷', dial: '+54' },
  { iso: 'CL', name: 'Chili', flag: '🇨🇱', dial: '+56' },
  { iso: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', dial: '+27' },
  { iso: 'RU', name: 'Russie', flag: '🇷🇺', dial: '+7' },
  { iso: 'UA', name: 'Ukraine', flag: '🇺🇦', dial: '+380' },
  { iso: 'CZ', name: 'République tchèque', flag: '🇨🇿', dial: '+420' },
  { iso: 'HU', name: 'Hongrie', flag: '🇭🇺', dial: '+36' },
  { iso: 'HR', name: 'Croatie', flag: '🇭🇷', dial: '+385' },
  { iso: 'RS', name: 'Serbie', flag: '🇷🇸', dial: '+381' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function buildPhoneNumber(dial: string, localNumber: string): string {
  const digitsOnly = localNumber.trim().replace(/[^\d]/g, '');
  const withoutLeadingZero = digitsOnly.replace(/^0+/, '');
  return `${dial}${withoutLeadingZero}`;
}
