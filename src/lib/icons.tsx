import {
  BriefcaseBusiness,
  ChartColumnBig,
  Globe,
  Layers3,
  Mail,
  MapPin,
  Network,
  Phone,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { ContactLink } from '../types/resume';

const highlightIconMap: Record<string, LucideIcon> = {
  workflow: Workflow,
  chart: ChartColumnBig,
  network: Network,
  layers: Layers3,
};

export function getHighlightIcon(icon?: string) {
  return (icon && highlightIconMap[icon]) || BriefcaseBusiness;
}

const contactIconMap: Record<NonNullable<ContactLink['type']>, LucideIcon> = {
  email: Mail,
  phone: Phone,
  url: Globe,
  text: MapPin,
};

export function getContactIcon(type: ContactLink['type'] = 'text') {
  return contactIconMap[type];
}
