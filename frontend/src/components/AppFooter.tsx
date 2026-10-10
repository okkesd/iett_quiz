type Props = { dataDate: string; onData: () => void; onAbout: () => void };

export default function AppFooter({dataDate,onData,onAbout}:Props) {
 return <footer className="app-footer">
  <div className="app-footer-top">
   <div className="app-footer-intro"><h2>İstanbul’u durak durak keşfet.</h2><p>Gerçek hat ve durak verileriyle hazırlanmış bağımsız bir İstanbul bilgi oyunu.</p></div>
   <nav aria-label="Site bilgileri"><button onClick={onAbout}>Hakkımızda</button><a href="/nasil-oynanir/">Nasıl oynanır?</a><button onClick={onData}>Veri ve kaynaklar</button></nav>
  </div>
  <div className="app-footer-bottom"><p>İETT veya İBB’nin resmî uygulaması değildir.</p><button onClick={onData}>Veri tarihi: {dataDate}</button></div>
 </footer>;
}
