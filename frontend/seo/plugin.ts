import type { Plugin } from 'vite';

const home = {
 title: 'Son Durak · İETT Quiz | İstanbul Otobüs ve Durak Bilgi Oyunu',
 description: 'İstanbul’u ne kadar tanıyorsun? İETT hatları ve duraklarıyla bilgi yarışması oyna. Günlük sorular, 10 soruluk hızlı tur, haritalı ipuçları ve hat uzmanı modu.',
 body: `<h2>İstanbul’u durak durak keşfet</h2><p>Son Durak, gerçek hat ve durak kayıtlarından sorular üreten bağımsız bir İstanbul bilgi oyunudur. Otobüs hatlarını, ortak durakları ve güzergâhları haritalı ipuçlarıyla öğren.</p><p>Hızlı Tur’da 10 soruyu 5 dakikada yanıtla; Günlük Rota’da 5 soruyla bilgini tazele. Hat Uzmanı’nda bildiğin bir hattı seç veya Avrupa ve Anadolu yakasındaki bölgeleri keşfet.</p>`,
};
const pages = [
 { path: '/hakkimizda/', title: 'Hakkımızda | Son Durak İETT Quiz', description: 'Son Durak, İstanbul’un otobüs ağını oynayarak keşfetmek için hazırlanmış bağımsız bir bilgi oyunudur.', body: `<h1>İstanbul’u durak durak keşfet.</h1><p>Son Durak, İstanbul’un otobüs ağını oynayarak tanımak için hazırlanmış bağımsız bir bilgi oyunu. Her gün gördüğümüz hat numaralarının arkasındaki semtleri, sokakları ve durakları merak uyandıran sorularla keşfetmeni amaçlıyor.</p><h2>Bildiklerinle başla, yeni güzergâhlar öğren</h2><p>Bir hattın uzmanı olabilir, yaşadığın bölgedeki durakları tanıyabilir veya şehrin hiç gitmediğin bir köşesini keşfedebilirsin. Cevap açıklamaları ve haritalar, her turu küçük bir İstanbul dersine dönüştürür.</p><h2>Bağımsız bir proje</h2><p>Son Durak, İETT veya İBB’nin resmî uygulaması değildir ve bu kurumlara bağlı değildir. Canlı sefer bilgisi veya yolculuk planlama hizmeti sunmaz.</p>` },
 { path: '/nasil-oynanir/', title: 'Nasıl Oynanır? Oyun Modları | Son Durak', description: 'İETT Quiz oyun kurallarını öğren: 10 soru 5 dakika, günlük rota, üç canla hayatta kalma, hat uzmanı ve haritalı ipuçları.', body: `<h1>Son Durak nasıl oynanır?</h1><p>Oyun alanından bir mod ve zorluk seç. Soruyu oku, seçeneklerden cevabını seç ve ardından açıklamayı incele. İpucu düğmesi, soru türüne göre harita veya güzergâh bilgisi gösterir; seçenekleri elemez.</p><h2>Oyun modları</h2><ul><li><strong>Hızlı Tur:</strong> 10 soru, 5 dakika. Yaka ve bölge seçerek soruları daraltabilirsin.</li><li><strong>Günlük Rota:</strong> Her gün 5 soru.</li><li><strong>Son Yolcu:</strong> 3 canla başla; yanlış cevapta bir can kaybedersin.</li><li><strong>Hat Uzmanı:</strong> Arama yaparak bir hat seç, o hattın duraklarını tanı.</li><li><strong>Mahalleni Tanı:</strong> Bir ilçedeki hat ve duraklara odaklan.</li><li><strong>Arkadaş Düellosu:</strong> Aynı soruları bağlantıyla paylaş ve sonuçları karşılaştır.</li></ul><h2>Haritayla öğren</h2><p>Ortak durak ve duraktan geçmeyen hat sorularında durağın konumunu ipucu olarak görebilirsin. Durak değil sorularında seçeneklerin konumları gösterilir. Cevaptan sonra açıklama ve uygun sorularda rota haritası açılır.</p><h2>Kendi hızında oyna</h2><p>Sonraki soruya otomatik geçişi 5 veya 10 saniye olarak ayarlayabilir ya da durdurabilirsin. Süreli turlarda açıklamayı okurken de tur süresi işlemeye devam eder.</p>` },
 { path: '/veri-kaynaklari/', title: 'Veri Kaynakları ve Haritalar | Son Durak', description: 'İETT Quiz sorularının veri kaynakları, güncellik sınırları ve haritaların nasıl gösterildiği hakkında bilgi edin.', body: `<h1>Veri ve kaynaklar</h1><p>Sorular, İBB açık verisinden alınan İETT hat, durak ve güzergâh kayıtlarının kaydedilmiş bir kopyası üzerinden üretilir. Kullanılan verinin tarihi oyun alanında gösterilir.</p><h2>Kaynaklar ve lisans</h2><p>Hat, durak ve güzergâh kayıtları <a href="https://data.ibb.gov.tr/dataset/iett-gtfs-verisi">İBB Açık Veri Portalı’ndaki İETT GTFS veri setinden</a>; ek ilçe ve konum bilgileri <a href="https://data.ibb.gov.tr/dataset/iett-hat-durak-guzergah-web-servisi">İETT Hat-Durak-Güzergâh Web Servisi’nden (GetDurak_json)</a> alınır. Kaynaklar <a href="https://data.ibb.gov.tr/license">İBB Açık Veri Lisansı</a> kapsamında yayımlanır.</p><p>Atıf 4.0 Uluslararası (CC BY 4.0) kapsamında lisanslanan kamu sektörü bilgilerini içerir.</p><p>Veriler oyun için işlenmiş, duraklar gruplanmış ve kayıtlardan sorular üretilmiştir. Son Durak bu kurumlara bağlı değildir ve kurumların onayını temsil etmez.</p><h2>Veri nasıl kullanılıyor?</h2><p>Hatların durak sıraları ve durakların bağlı olduğu hatlar karşılaştırılarak sorular oluşturulur. Şıklar ve doğru cevaplar kayıtlı veriye göre kontrol edilir. Hatların yönleri ve güzergâh varyantları dikkate alınır.</p><h2>Güncellik ve haritalar</h2><p>Güzergâhlar değişebilir; oyun canlı İETT servisine bağlı değildir. Haritalardaki çizgiler durakları birleştiren şematik gösterimlerdir, aracın izlediği yolları birebir temsil etmez. Harita altlığı OpenStreetMap katkıcıları tarafından sağlanır.</p><p>Güncel sefer ve güzergâh bilgileri için <a href="https://iett.istanbul/">İETT’nin resmî sitesini</a>, veri kaynakları için <a href="https://data.ibb.gov.tr/">İBB Açık Veri Portalı’nı</a> ziyaret et. <a href="https://www.openstreetmap.org/copyright">OpenStreetMap katkı ve lisans bilgileri</a>.</p>` },
];
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const nav = '<nav aria-label="Site bilgileri"><a href="/">Oyun alanı</a><a href="/hakkimizda/">Hakkımızda</a><a href="/nasil-oynanir/">Nasıl oynanır?</a><a href="/veri-kaynaklari/">Veri kaynakları</a></nav>';
export function seoPlugin(siteUrl: string | undefined): Plugin {
 let origin = '';
 if (siteUrl) {
  const parsed = new URL(siteUrl);
  if (parsed.protocol !== 'https:' || parsed.origin !== siteUrl.replace(/\/$/, '')) throw new Error('VITE_SITE_URL, yol içermeyen bir HTTPS site adresi olmalı.');
  origin = parsed.origin;
 }
 const head = (page: typeof home, path: string) => {
  const url = origin + path;
  const structured = path === '/' ? {'@context':'https://schema.org','@type':'WebSite',name:'Son Durak',url,description:page.description,inLanguage:'tr-TR'} : {'@context':'https://schema.org','@type':'WebPage',name:page.title,url,description:page.description,inLanguage:'tr-TR',isPartOf:{'@type':'WebSite',name:'Son Durak',url:origin+'/'}};
  return `<title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="${origin ? 'index,follow' : 'noindex,nofollow'}"><meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="Son Durak"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(page.title)}"><meta name="twitter:description" content="${escape(page.description)}">${origin ? `<link rel="canonical" href="${escape(url)}"><meta property="og:url" content="${escape(url)}"><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script>` : ''}<link rel="stylesheet" href="/site-info.css">`;
 };
 const document = (page: typeof home, path: string) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f5f6f8"><link rel="icon" href="/favicon.svg">${head(page,path)}<script src="/theme.js"></script></head><body class="info-page"><header class="site-info">${nav}</header><main class="site-info">${page.body}<p><a class="play-link" href="/">Oyuna başla →</a></p></main><footer class="site-info"><p>Son Durak, İETT veya İBB’nin resmî uygulaması değildir.</p>${nav}</footer></body></html>`;
 const files = () => {
  const entries: Record<string,string> = Object.fromEntries(pages.map(p => [p.path.slice(1)+'index.html', document(p,p.path)]));
  entries['404.html'] = document({title:'Sayfa bulunamadı | Son Durak',description:'Aradığın sayfa bulunamadı.',body:'<h1>Bu durak bulunamadı.</h1><p>Oyun alanına dönerek devam edebilirsin.</p>'},'/404.html').replace('index,follow','noindex,follow');
  entries['robots.txt'] = origin ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /*?*challenge=\nDisallow: /*?*duel=\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
  entries['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${origin ? ['/',...pages.map(p=>p.path)].map(path=>`<url><loc>${escape(origin+path)}</loc></url>`).join('') : ''}</urlset>`;
  return entries;
 };
 return {
  name:'son-durak-seo',
  transformIndexHtml(html) { return html.replace('<!-- SEO_HEAD -->',head(home,'/')).replace('<!-- SITE_INFO -->',`<section class="site-info site-info-fallback" aria-label="Son Durak hakkında">${home.body}${nav}<p>İETT veya İBB’nin resmî uygulaması değildir.</p></section>`); },
  generateBundle(_options, bundle) {
   // Lazy game screens may load before the service worker controls the page.
   // Include every emitted script/style so the first offline reload can open them.
   const assets = Object.keys(bundle).filter(name => /\.(?:js|css)$/.test(name)).map(name => `/${name}`);
   this.emitFile({type:'asset',fileName:'precache-assets.json',source:JSON.stringify(assets)});
   for (const [fileName,source] of Object.entries(files())) this.emitFile({type:'asset',fileName,source});
  },
  configureServer(server) { server.middlewares.use((req,res,next)=>{
   const path = (req.url??'/').split('?')[0];
   const page = pages.find(p=>p.path===path+'/');
   if(page){res.writeHead(301,{Location:page.path});res.end();return;}
   const key = path.slice(1)+(path.endsWith('/')?'index.html':'');
   const body = files()[key];
   if(body===undefined){next();return;}
   res.setHeader('Content-Type',key.endsWith('.xml')?'application/xml; charset=utf-8':key.endsWith('.txt')?'text/plain; charset=utf-8':'text/html; charset=utf-8');res.end(body);
  }); },
 };
}
