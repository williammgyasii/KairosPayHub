import { normalizeCountryCode } from '@/lib/church-country'

export type ChurchRegionOption = {
  code: string
  label: string
}

const US: ChurchRegionOption[] = [
  { code: 'AL', label: 'Alabama' },
  { code: 'AK', label: 'Alaska' },
  { code: 'AZ', label: 'Arizona' },
  { code: 'AR', label: 'Arkansas' },
  { code: 'CA', label: 'California' },
  { code: 'CO', label: 'Colorado' },
  { code: 'CT', label: 'Connecticut' },
  { code: 'DE', label: 'Delaware' },
  { code: 'DC', label: 'District of Columbia' },
  { code: 'FL', label: 'Florida' },
  { code: 'GA', label: 'Georgia' },
  { code: 'HI', label: 'Hawaii' },
  { code: 'ID', label: 'Idaho' },
  { code: 'IL', label: 'Illinois' },
  { code: 'IN', label: 'Indiana' },
  { code: 'IA', label: 'Iowa' },
  { code: 'KS', label: 'Kansas' },
  { code: 'KY', label: 'Kentucky' },
  { code: 'LA', label: 'Louisiana' },
  { code: 'ME', label: 'Maine' },
  { code: 'MD', label: 'Maryland' },
  { code: 'MA', label: 'Massachusetts' },
  { code: 'MI', label: 'Michigan' },
  { code: 'MN', label: 'Minnesota' },
  { code: 'MS', label: 'Mississippi' },
  { code: 'MO', label: 'Missouri' },
  { code: 'MT', label: 'Montana' },
  { code: 'NE', label: 'Nebraska' },
  { code: 'NV', label: 'Nevada' },
  { code: 'NH', label: 'New Hampshire' },
  { code: 'NJ', label: 'New Jersey' },
  { code: 'NM', label: 'New Mexico' },
  { code: 'NY', label: 'New York' },
  { code: 'NC', label: 'North Carolina' },
  { code: 'ND', label: 'North Dakota' },
  { code: 'OH', label: 'Ohio' },
  { code: 'OK', label: 'Oklahoma' },
  { code: 'OR', label: 'Oregon' },
  { code: 'PA', label: 'Pennsylvania' },
  { code: 'RI', label: 'Rhode Island' },
  { code: 'SC', label: 'South Carolina' },
  { code: 'SD', label: 'South Dakota' },
  { code: 'TN', label: 'Tennessee' },
  { code: 'TX', label: 'Texas' },
  { code: 'UT', label: 'Utah' },
  { code: 'VT', label: 'Vermont' },
  { code: 'VA', label: 'Virginia' },
  { code: 'WA', label: 'Washington' },
  { code: 'WV', label: 'West Virginia' },
  { code: 'WI', label: 'Wisconsin' },
  { code: 'WY', label: 'Wyoming' },
]

const CA: ChurchRegionOption[] = [
  { code: 'AB', label: 'Alberta' },
  { code: 'BC', label: 'British Columbia' },
  { code: 'MB', label: 'Manitoba' },
  { code: 'NB', label: 'New Brunswick' },
  { code: 'NL', label: 'Newfoundland and Labrador' },
  { code: 'NS', label: 'Nova Scotia' },
  { code: 'NT', label: 'Northwest Territories' },
  { code: 'NU', label: 'Nunavut' },
  { code: 'ON', label: 'Ontario' },
  { code: 'PE', label: 'Prince Edward Island' },
  { code: 'QC', label: 'Quebec' },
  { code: 'SK', label: 'Saskatchewan' },
  { code: 'YT', label: 'Yukon' },
]

const GH: ChurchRegionOption[] = [
  { code: 'AHA', label: 'Ahafo' },
  { code: 'ASH', label: 'Ashanti' },
  { code: 'BAE', label: 'Bono East' },
  { code: 'BON', label: 'Bono' },
  { code: 'CEN', label: 'Central' },
  { code: 'EAS', label: 'Eastern' },
  { code: 'GAR', label: 'Greater Accra' },
  { code: 'NEA', label: 'North East' },
  { code: 'NOR', label: 'Northern' },
  { code: 'OTI', label: 'Oti' },
  { code: 'SAV', label: 'Savannah' },
  { code: 'UEA', label: 'Upper East' },
  { code: 'UWE', label: 'Upper West' },
  { code: 'VOL', label: 'Volta' },
  { code: 'WES', label: 'Western' },
  { code: 'WNO', label: 'Western North' },
]

const AU: ChurchRegionOption[] = [
  { code: 'ACT', label: 'Australian Capital Territory' },
  { code: 'NSW', label: 'New South Wales' },
  { code: 'NT', label: 'Northern Territory' },
  { code: 'QLD', label: 'Queensland' },
  { code: 'SA', label: 'South Australia' },
  { code: 'TAS', label: 'Tasmania' },
  { code: 'VIC', label: 'Victoria' },
  { code: 'WA', label: 'Western Australia' },
]

const GB: ChurchRegionOption[] = [
  { code: 'ENG', label: 'England' },
  { code: 'NIR', label: 'Northern Ireland' },
  { code: 'SCT', label: 'Scotland' },
  { code: 'WLS', label: 'Wales' },
]

const ZA: ChurchRegionOption[] = [
  { code: 'EC', label: 'Eastern Cape' },
  { code: 'FS', label: 'Free State' },
  { code: 'GP', label: 'Gauteng' },
  { code: 'KZN', label: 'KwaZulu-Natal' },
  { code: 'LP', label: 'Limpopo' },
  { code: 'MP', label: 'Mpumalanga' },
  { code: 'NC', label: 'Northern Cape' },
  { code: 'NW', label: 'North West' },
  { code: 'WC', label: 'Western Cape' },
]

const NG: ChurchRegionOption[] = [
  { code: 'AB', label: 'Abia' },
  { code: 'AD', label: 'Adamawa' },
  { code: 'AK', label: 'Akwa Ibom' },
  { code: 'AN', label: 'Anambra' },
  { code: 'BA', label: 'Bauchi' },
  { code: 'BY', label: 'Bayelsa' },
  { code: 'BE', label: 'Benue' },
  { code: 'BO', label: 'Borno' },
  { code: 'CR', label: 'Cross River' },
  { code: 'DE', label: 'Delta' },
  { code: 'EB', label: 'Ebonyi' },
  { code: 'ED', label: 'Edo' },
  { code: 'EK', label: 'Ekiti' },
  { code: 'EN', label: 'Enugu' },
  { code: 'FC', label: 'Federal Capital Territory' },
  { code: 'GO', label: 'Gombe' },
  { code: 'IM', label: 'Imo' },
  { code: 'JI', label: 'Jigawa' },
  { code: 'KD', label: 'Kaduna' },
  { code: 'KN', label: 'Kano' },
  { code: 'KT', label: 'Katsina' },
  { code: 'KE', label: 'Kebbi' },
  { code: 'KO', label: 'Kogi' },
  { code: 'KW', label: 'Kwara' },
  { code: 'LA', label: 'Lagos' },
  { code: 'NA', label: 'Nasarawa' },
  { code: 'NI', label: 'Niger' },
  { code: 'OG', label: 'Ogun' },
  { code: 'ON', label: 'Ondo' },
  { code: 'OS', label: 'Osun' },
  { code: 'OY', label: 'Oyo' },
  { code: 'PL', label: 'Plateau' },
  { code: 'RI', label: 'Rivers' },
  { code: 'SO', label: 'Sokoto' },
  { code: 'TA', label: 'Taraba' },
  { code: 'YO', label: 'Yobe' },
  { code: 'ZA', label: 'Zamfara' },
]

const BY_COUNTRY: Record<string, ChurchRegionOption[]> = {
  US,
  CA,
  GH,
  AU,
  GB,
  ZA,
  NG,
}

const REGION_LABEL: Record<string, string> = {
  US: 'State',
  CA: 'Province',
  GH: 'Region',
  AU: 'State / territory',
  GB: 'Nation',
  ZA: 'Province',
  NG: 'State',
}

export function churchRegionOptions(countryCode?: string | null): ChurchRegionOption[] {
  const code = normalizeCountryCode(countryCode)
  return BY_COUNTRY[code] ?? []
}

export function churchRegionLabel(countryCode?: string | null): string {
  const code = normalizeCountryCode(countryCode)
  return REGION_LABEL[code] ?? 'State / region'
}
