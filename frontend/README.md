# Son Durak · İETT Quiz

React + Vite ön yüzü. SQLite ile iki servisli yerel çalışma ve isteğe bağlı Supabase kurulumu için [ana README](../README.md). Aşağıdaki bilgiler, API adresi tanımlanmadan kullanılan yerel oyun modunu anlatır.

Gerçek İETT verisinden tarayıcıda soru üreten, Türkçe ve mobil uyumlu yerel oyun. React + TypeScript + Vite, Leaflet, standart Python veri hazırlama betiği. Hesap, sunucu anahtarı veya bulut servisi gerektirmez.

## Yerelde çalıştır

Node.js 20+ (öneri: 22 LTS), npm ve veri güncellemek için Python 3.10+ gerekir.

```bash
npm ci
npm run dev
```

Adres: **http://127.0.0.1:5173/**. Sunucu yalnızca yerel arayüzü dinler. Bu projeyle birlikte hazırlanmış gerçek veri kopyası geldiği için ilk çalıştırmada veri indirmek gerekmez. API ile birlikte çalıştırmak için proje kökünde `./start.sh` kullan; başlatıcı iki servisi birlikte yönetir ve eksik bağımlılıkları/soru havuzunu hazırlar.

Üst çubuktaki güneş/ay düğmesiyle açık ve koyu tema arasında geçiş yapılır. İlk açılışta cihazın tercihi kullanılır; elle seçilen tema bu tarayıcıda saklanır ve sayfa yüklenirken uygulanır. Haritalar ve oyun ekranları da seçilen temaya uyum sağlar.

## Arayüz

Apple tasarım ilkelerine göre hazırlanan arayüz, platformun sistem fontunu, açık/koyu renk belirteçlerini ve yarı saydam gezinme alanlarını kullanır. Mobilde alt menü, masaüstünde kenar çubuğu görünür. Zorluk ve yaka seçiminin yay animasyonu seçim değiştiğinde mevcut konum ve hızdan devam eder. Hareketi, saydamlığı azaltma ve yüksek kontrast tercihleri desteklenir.

Ortak renkler `src/theme.css`, uygulama bileşenleri `src/styles.css`, ana sayfa `src/home.css` içinde tanımlanır. `HomeModes`, `HomeHeading` ve `SegmentedControl` yerel ve sunucu modlarında ortaktır. `tests/e2e/design.spec.ts` hareket tercihini, hızlı seçim değişikliklerini, mobil yerleşimi, hat seçimini ve tema kalıcılığını doğrular.

## Oyunlar

- **Hızlı Tur:** 10 soru, toplam 5 dakika. Açıklamalar ve ara verme süreyi durdurmaz. Yenilemeden sonra gerçek son süre korunur. Yanıtlanmayan sorular puan getirmez.
- **Günlük Rota:** İstanbul takvim gününe göre 5 soru. Aynı veri/oyun sürümünde herkes aynı soruları alır. Günlük tur sürdürülür ve yalnızca bir kez XP kazandırır.
- **Son Yolcu:** 3 can, en fazla 50 soru; üçüncü yanlışta biter.
- **Hat Uzmanı:** Seçilen hat hakkında 10 soru.
- **Mahalleni Tanı:** Seçilen ilçedeki duraklara dayalı 10 soru.
- **Arkadaş Düellosu:** Tohum, zorluk, veri ve oyun sürümü URL'de taşınır. Sonuç bağlantısı beyan edilen puanı içerir. Canlı bağlantı veya sunucu doğrulaması yoktur. Her cihazda aynı proje/veri sürümü gerekir; localhost başka bilgisayara yönlendirmez.

Dokuz soru türü: hat üzerindeki olmayan durak, duraktan geçmeyen hat, ana güzergâhın uçları, doğrudan rota, iki hatlı aktarma (zor), ortak durak, haritada durak dizisi, durak sıralaması ve duraktan geçen hat üçlüsü. Sıralama, çoktan seçmeli doğru dizi üzerinden oynanır. Harita durakları birleştirir; yol geometrisi değildir.

Doğru cevap kolayda 100, zorda 150 puan; 20/30 XP kazandırır. En az bir soruyu yanıtlayarak tur bitirmek 30 XP kazandırır. Seviyeler: Yaya (0), Yolcu (500), Kaptan (2000), Hat Müdürü (5000). Beş rozet, günlük seri ve son 100 turdan oluşan cihaz içi skor tablosu bulunur. İlerleme `localStorage` ile saklanır; hesaplar arasında eşitlenmez.

Hat gezgininde hat kodu, hat adı, ara durak ve ilçe aranabilir. Her yön/varyantın haritası ve sıralı durak listesi bulunur.

## İpuçları

Her soru cevaplanmadan önce bir kez **İpucu al** düğmesiyle yardım açılabilir. Açılan ipucu aynı turda sayfa yenilenince korunur; her seferinde başka ipucu verilmez. Puan/XP düşmez, süreli turda sayaç durmaz. İpucu sayısı sonuçta, yerel skor tablosunda ve paylaşım metninde görünür.

| Soru tipi | İpucu |
| --- | --- |
| Ortak durak | Doğru durağın isimsiz harita işareti; açılır durak adı yok. |
| Durak değil | Dört seçeneğin durak konumlarını A/B/C/D işaretleriyle haritada gösterir. |
| Hat geçmez | Sorulan durağın konumunu haritada gösterir. |
| Hattın uç durağı | Son durağın ilçesi ve uygun olduğunda hemen önceki durak. |
| Doğrudan rota | A/B konumları ve yol üzerindeki bir ara durak. |
| Harita tanıma | Güzergâhın başlangıç ve bitiş durakları. |
| Durak sıralama | İki durağın birbirine göre önce/sonra ilişkisi. |
| Duraktan geçen üç hat | Sorulan durağın konumunu haritada gösterir. |
| Aktarma | İlk hattı söyler; ikinci hattı bulmak oyuncuya kalır. |

İpuçları hiçbir seçeneği elemez veya devre dışı bırakmaz. Konumu bilinmeyen duraklar haritada gösterilmez; eksik konum bilgisi açıklanır. Harita tabanı için internet gerekir. İpucu üretimi soru üretiminin rastgele sayı akışından ayrıdır; ipucu kullanmak günlük/düello sorularını değiştirmez.

## Veri kaynağı ve doğruluk

- [İBB İETT GTFS veri seti](https://data.ibb.gov.tr/dataset/iett-gtfs-verisi)
- [CKAN kaynak kataloğu](https://data.ibb.gov.tr/api/3/action/package_show?id=iett-gtfs-verisi)
- [İETT durak SOAP servisi](https://api.ibb.gov.tr/iett/UlasimAnaVeri/HatDurakGuzergah.asmx?wsdl)
- [İBB Açık Veri Lisansı](https://data.ibb.gov.tr/license)

İlk kopya 3 Ekim 2026'da hazırlandı. Resmî GTFS kaynak dosyalarının tarihi **17 Mart 2026**. İndirme tarihi, kaynak tarihi, SHA-256 içerik sürümü ve veri kalite notları JSON ve uygulamada ayrı ayrı gösterilir. Gerçek sayılar `public/data/network.json` içindeki `meta.counts` alanındadır.

Portal tek GTFS ZIP yerine noktalı virgülle ayrılmış `routes.csv`, `trips.csv`, `stops.csv`, `calendar.csv` ve `stop_times.zip` sunuyor. Betik hem bu biçimi hem de standart virgülle ayrılmış yerel GTFS ZIP/klasörünü işler. İlçe ve güvenilir koordinat alanları, durak koduyla resmî SOAP verisine bağlanır. Türkçe karakter bozulmaları düzeltilir; nokta ayracıyla bozulmuş koordinatlar sınırlı kuralla toparlanır. Ayrıştırılamayan koordinatlar tahmin edilmez.

**Kurallar:**

- 77, 77A, 77B ayrı hatlardır. Bütün seferler işlenir, durak dizileri tekilleştirilir; tek temsilî sefer bütün hattın yerine geçirilmez.
- Durak grubu normalize ad + ilçedir. İlçesi bilinemeyen duraklar ilçe sorularının dayanağı olmaz. Aynı adlı peronlar gruplanabilir.
- “Ana güzergâh”, kaynakta en fazla seferi bulunan durak dizisidir. Uç ve sıra soruları bunu açıkça belirtir.
- Rota soruları, aynı seferde doğru durak sırasını kontrol eder. Aktarma soruları her iki bacağı ayrı doğrular; zaman uyumu ve peronlar arası yürüme mesafesi hesaplanmaz.
- Eksik veya geçersiz sıralı seferler rota sorularına katılmaz. Bu seferlerdeki bilinen duraklar hat üyeliği ve ters indekste korunur; yanlış “geçmez” cevabına dönüşmez.
- Her soru 4 farklı seçenek ve tek doğru cevap bakımından doğrulanır. Bütün seçenekler geçerli değilse soru reddedilir ve yeniden üretilir.
- “Hangi üç hat bu duraktan geçer?” sorularında her şık bağımsız bir hat üçlüsüdür; herhangi iki şık en fazla bir hattı paylaşır. Çeldiriciler gerçek durak konumlarıyla aynı yakadan seçilir: önce 3 km, yeterli çeşit yoksa 6 km, en fazla 10 km çevre taranır. Yakın havuz yetersizse uzak hatlarla doldurmak yerine başka soru üretilir. Yanlış şıklarda birden fazla geçmeyen hat bulunabilir; yalnızca bir üçlünün tamamı duraktan geçer.
- Zor seviyede durak çeldiricileri mümkün olduğunda aynı ilçelerden seçilir. Harita, hat kodu ve bazı soru tiplerinde her çeldirici için yakınlık garantisi verilmez.

Veri, kaynakta yer alan güzergâhların bir anlık kopyasıdır; güncel seyahat veya tarife hizmeti değildir. GTFS sefer takvimi gerçek zamanlı olarak işletilmez. Tarayıcı İETT API'sini çağırmaz. OpenStreetMap alt haritası internet gerektirir ve döşemeleri topluca önbelleğe alınmaz.

## Veriyi yenile

```bash
npm run data:update
npm run data:validate
```

Python üçüncü taraf paket kullanmaz. Dosyalar `data/raw/` altında önbelleklenir (Git dışında). Büyük `stop_times` SQLite geçici dosyasıyla sıralanır; belleğe bütün sefer satırları yüklenmez. JSON ancak doğrulama geçince atomik olarak değiştirilir. İndirme/işleme başarısızsa önceki çalışan JSON korunur; hata başarı diye raporlanmaz.

```bash
# İndirilen dosyaları tekrar işle
python3 ../scripts/import_data.py --source cache
# Standart GTFS dosyasını içe aktar
python3 ../scripts/import_data.py --gtfs /tam/yol/gtfs.zip
# Veya klasör
python3 ../scripts/import_data.py --gtfs /tam/yol/gtfs-klasoru
```

SOAP yalnızca ilçe/konum zenginleştirmesi sağlar. İncelenen SOAP uç noktası sıralı hat duraklarını içermediği için tam GTFS yerine geçirilmez. SOAP alınamazsa eski SOAP kopyası yeni GTFS ile sessizce karıştırılmaz. Güncelleme sonrası tarayıcıyı yenile. Değişen veri sürümündeki yarım tur geçersiz sayılır; tamamlanmış günlük turun puanı tekrar verilmez.

Haftalık iş için `.github/workflows/data-refresh.yml` hazırdır; bu yerel aşamada GitHub'da çalıştırılmadı. Haftalık veya elle tetiklenen çalışma yeni veriyi test eder ve indirilebilir artifact üretir; dağıtım ve otomatik commit yapmaz. Yerel dosyayı güncellemek için yukarıdaki komut kullanılır.

## Doğrulama ve üretim önizlemesi

```bash
npm test
python3 -m unittest discover -s ../tests -p 'test_*.py'
npm run build
# Ayrı terminalde npm run dev çalışırken:
npm run test:e2e
# Dağıtım yapmadan üretim sürümünü yerelde aç:
npm run preview -- --port 4173
```

Playwright sistem Chromium'unu `/usr/bin/chromium` üzerinden kullanır. Başka sistemde `PLAYWRIGHT_CHROMIUM_PATH` ile tarayıcı yolunu ver veya `npx playwright install chromium` çalıştırıp bu ortam değişkenini `bundled` yap. Testler gerçek JSON üzerinden tek cevap, tüm varyant üyelikleri, yön, tohum determinismi, ilçe/hat filtresi, XP tekilleştirme, günlük seri ve uçtan uca oyun davranışlarını kontrol eder.

PWA manifesti ve service worker **üretim buildinde** etkinleşir. `npm run preview` ile bir kez çevrim içi yükledikten sonra oyun ve veri çevrim dışı kullanılabilir; yazı tipi cihazdan alınır. Geliştirmede service worker kaydedilmez. OpenStreetMap alt haritası çevrim dışı kullanılamaz; durak çizgileri/işaretleri görünmeye devam eder. Yeni sürüm yüklemesi açıksa sekmeleri kapatıp açarak güncelleme uygulanır.

Tarayıcı `document.modelContext` desteği sunarsa yalnızca görünen oyun durumunu okuyan `get_quiz_state` WebMCP aracı kaydolur. Destek yoksa normal oyun etkilenmez.

## Proje düzeni

```text
src/App.tsx                  Ortam değişkenine göre yerel/sunucu modu
src/LocalApp.tsx             Yerel oyun, gezgin, kaynaklar
src/remote/                  Supabase giriş ve Rust API entegrasyonu
src/lib/quiz.ts              Deterministik soru üretimi ve doğrulama
src/lib/storage.ts           Tur kaydı, XP, rozet, günlük seri
src/components/RouteMap.tsx  Leaflet durak haritası
../scripts/import_data.py   Resmî/verilen GTFS → doğrulanmış JSON
public/data/network.json    Çalışan uygulamayla gelen veri kopyası
public/sw.js                Üretim sürümü çevrim dışı desteği
public/fonts/               Yerel fontlar ve OFL lisansları
tests/                      Soru motoru, veri aktarımı, tarayıcı testleri
```

Deploy yapılmadı. Sonraki aşamada `dist/` statik olarak Vercel/Cloudflare Pages gibi bir barındırıcıya verilebilir. Hesaplı oyun ve sunucuda doğrulanan skorlar için `../backend` servisi ve frontend ortam değişkenleri kullanılabilir. Canlı düello eklenmedi.
