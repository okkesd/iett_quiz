import { MapPin } from 'lucide-react';

export default function HomeHeading() {
  return <div className="page-heading home-heading">
    <div><div className="eyebrow"><span /> ŞEHRİNLE YENİDEN TANIŞ</div><h1>Bir şehir. Binlerce keşif.</h1><p>İstanbul’u ne kadar tanıyorsun? Bir tur oyna, yeni bir durak keşfet.</p></div>
    <span className="location-label"><MapPin size={15} /> İstanbul, Türkiye</span>
  </div>;
}
