import { MapPin } from 'lucide-react';

export default function HomeHeading() {
  return <div className="page-heading home-heading">
    <div><h1>İstanbul’u ne kadar tanıyorsun?</h1></div>
    <span className="location-label"><MapPin size={15} /> İstanbul, Türkiye</span>
  </div>;
}
