# Son Durak — iettquiz.duckdns.org yayını

Bu kurulum **hesapsız oyun** içindir. İlerleme ziyaretçinin tarayıcısında saklanır. GitHub Actions yalnızca `son-durak-web` image’ını üretir; Supabase, veritabanı veya API secretı gerekmez. Rust API yerel geliştirme için korunur; canlı workflow onu başlatmaz.

## Mevcut sunucuyla nasıl birlikte çalışır?

İncelenen dosyalar:

- `../api_club_events/docker-compose.yml`: `nginx` container’ı host `80/443` portlarını yayımlıyor. `frontend:3000` ve `backend:4444` yalnızca Docker ağında.
- İki Club Events workflow’u sunucuda `~/docker-app` dizinini kullanıyor.
- `../club_events/.github/workflows/deploy-frontend.yml`: her yayında `nginx/nginx.conf` dosyasını yeniden kopyalıyor ve nginx’i yeniden oluşturuyor.
- Backend workflow’u `~/docker-app/docker-compose.yml` dosyasını yeniden kopyalıyor.

Bu nedenle quiz bloğunu mevcut `nginx.conf` içine eklemiyoruz. Ayrı `docker-compose.override.yml` iki ek bind mount ekliyor; nginx bunlardan quiz yapılandırmasını okuyor. Bu dosyalar Club Events’in mevcut workflow’larında üzerine yazılan dosyaların dışında kalıyor. Diğer projelerin kaynak dosyaları değiştirilmedi.

```text
https://evenements.com.tr      → mevcut nginx:443 → frontend:3000
https://iettquiz.duckdns.org   → aynı nginx:443   → son-durak-web:80
```

Quiz Compose’unda **hiç `ports:` kaydı yok**: 80, 443, 3000, 4444 veya 8088’i host üzerinde almıyor. `EDGE_NETWORK=auto`, çalışan `nginx` container’ındaki Compose etiketi `app-network` olan ağı bulur. Gerçek ad muhtemelen `docker-app_app-network`; betik buna güvenerek tahmin yapmaz. Birden fazla olası ağ varsa durur ve açık `EDGE_NETWORK` ister. Ağ, mevcut stack’e aittir; quiz tarafından oluşturulmaz veya silinmez. [Docker dış ağlar](https://docs.docker.com/reference/compose-file/networks/).

Nginx, `son-durak-web` adresini çalışma sırasında Docker DNS ile çözer. Web container’ı yenilendiğinde değişen IP için ortak nginx’i yeniden başlatmak gerekmez. [Nginx resolver/proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

## GitHub ayarları

Repository → **Settings → Environments → New environment → `production`**. Aşağıdakileri bu environment’a ekle. Repository seviyesindeki Actions secrets/variables da kullanılabilir.

### Secrets — gerekli altı değer

| Secret | Değer |
| --- | --- |
| `DOCKER_USERNAME` | Docker Hub kullanıcı adın; mevcut projelerdeki değer kullanılabilir. |
| `DOCKER_PASSWORD` | Docker Hub access token; image push/pull yetkisi olmalı. |
| `SSH_HOST` | Sunucunun genel IPv4 adresi veya SSH hostname’i. |
| `SSH_USER` | Sunucuda Docker çalıştırabilen kullanıcı; Club Events ile aynı kullanıcı olabilir. |
| `SSH_KEY` | Bu kullanıcı için SSH private key’in tamamı; `BEGIN`/`END` satırları dahil. |
| `SSH_KNOWN_HOSTS` | Sunucunun doğrulanmış SSH host key satırı/satırları. |

`SSH_KNOWN_HOSTS` için kendi makinenizde:

```bash
ssh-keyscan -p 22 SUNUCU_IP > /tmp/son-durak-known-hosts
ssh-keygen -lf /tmp/son-durak-known-hosts
```

Sunucu konsolunda `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` ile görülen fingerprint’i karşılaştır; doğruladığın ilgili satırı secret olarak ekle. `ssh-keyscan` çıktısı tek başına kimlik doğrulaması değildir. Özel portta satır `[SUNUCU_IP]:PORT ...` biçimindedir. Workflow host doğrulamasını kapatmaz.

Docker Hub’da `KULLANICI/son-durak-web` repository’sini oluştur. Private da olabilir: workflow sunucuda Docker login’i tokenı SSH stdin üzerinden geçirerek yapar; ayrıca bir pull secretı gerekmez. Token release arşivine veya komut argümanına yazılmaz.

### Variables — hepsi varsayılanlı

| Variable | Varsayılan | Ne zaman değişir? |
| --- | --- | --- |
| `QUIZ_DOMAIN` | `iettquiz.duckdns.org` | Alan adı değişirse; `https://` veya son `/` yazma. |
| `SSH_PORT` | `22` | SSH özel portta çalışıyorsa. |
| `EDGE_CONTAINER` | `nginx` | Mevcut edge container’ının adı farklıysa. |
| `EDGE_STACK_DIR` | SSH kullanıcısının `$HOME/docker-app` dizini | Mevcut Compose başka dizindeyse mutlak yol yaz. |
| `EDGE_NETWORK` | `auto` | Otomatik seçim belirsizse gerçek Docker ağ adı. |
| `DOCKER_PLATFORM` | `linux/amd64` | Sunucu `uname -m` çıktısı `aarch64` ise `linux/arm64`. |

Sunucuda Docker Engine, Compose v2 (`up --wait` desteği), Python 3, Bash, curl, `flock` ve Certbot bulunmalı. SSH kullanıcısı `docker` çalıştırabilmeli, `~/docker-app/nginx` dizinine yazabilmeli. SSH’ye GitHub runner’ından erişim açık olmalı. SSL kurulumu için operatörün `sudo certbot` yetkisi gerekir; workflow sudo parolası istemez.

## İlk kurulum — bir kez

### 1. DNS

DuckDNS panelinde **iettquiz** kaydını aynı sunucunun genel IP’sine yönlendir. Varsa AAAA kaydı da gerçekten çalışan IPv6 adresine gitmeli; yanlış IPv6 kaydı sertifika doğrulamasını bozabilir. 80/443 zaten mevcut nginx’e ulaşmalı. Bu workflow DNS güncellemediği için **DuckDNS tokenı gerekmez**. Değişken sunucu IP’si varsa ayrıca DuckDNS güncellemesini ayarla.

Alan adı farklı olacaksa önce `QUIZ_DOMAIN` variable’ını değiştir; aşağıdaki sertifika komutunda da aynı alan adını kullan.

### 2. Dosyaları Actions ile sunucuya gönder

Bu repository’yi GitHub’a push et. **Actions → Deploy Son Durak → Run workflow → operation: `prepare`**.

Bu işlem yapılandırmayı doğrular ve dosyaları `~/son-durak/deploy` dizinine kopyalar. Image üretmez, mevcut siteyi değiştirmez, uygulamayı başlatmaz.

### 3. Ortak nginx’e kalıcı ek mount’ları kur

Sunucuya SSH ile bağlan:

```bash
cd ~/son-durak
bash deploy/scripts/install-edge.sh bootstrap
```

Betik:

1. Çalışan `nginx` container’ının ağını ve Compose dizinini kontrol eder.
2. `~/docker-app/docker-compose.override.yml` dosyasını oluşturur.
3. `~/docker-app/nginx/son-durak-loader.conf` ve `~/docker-app/nginx/son-durak/site.conf` dosyalarını oluşturur.
4. Yeni yapılandırmayı port açmayan geçici bir nginx container’ında `nginx -t` ile doğrular.
5. Ek mount’ların alınması için **yalnızca ilk kurulumda ortak nginx’i yeniden oluşturur**. Bu sırada mevcut sitede birkaç saniyelik kesinti olabilir. Frontend ve backend container’larını yeniden başlatmaz.

Mevcut bir override dosyası varsa ve ek mount’lar bulunmuyorsa betik dosyayı ezmeden durur. `deploy/nginx/edge.compose.override.yml` içindeki iki `volumes` satırını mevcut override’ın `nginx` servisine birleştirip komutu tekrar çalıştır. Betik etkili Compose yapılandırmasında gerçek mount yollarını da kontrol eder. [Compose override birleştirme](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/).

İleride Club Events workflow’larında `docker compose` komutlarına açık `-f` parametreleri eklenirse override’ı da dahil etmelisin. Mevcut workflow’lar düz `docker compose` kullandığı için otomatik yüklenir; `docker compose down` tüm ortak edge’i durduracağından iki siteyi de keser.

### 4. Sertifikayı oluştur ve HTTPS’i etkinleştir

```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  --cert-name iettquiz.duckdns.org -d iettquiz.duckdns.org

cd ~/son-durak
bash deploy/scripts/install-edge.sh https
```

Certbot ilk kullanımda e-posta/şartlar sorabilir. Mevcut nginx’in `/etc/letsencrypt` ve `/var/www/certbot` mount’ları kullanılır. `--standalone` kullanma; 80 portunu zaten nginx tutuyor. HTTPS betiği sertifika dosyalarını ve nginx yapılandırmasını doğrular, ardından sadece reload yapar. Hatalı yapılandırmada önceki quiz dosyası geri yüklenir. Bootstrap sonrasında oyun URL’si HTTPS hazırlanırken 503, henüz web container’ı yokken HTTPS üzerinde 502 verebilir; ACME doğrulama yolu açıktır.

Yenilemeden sonra nginx’in yeni sertifikayı alması için:

```bash
sudo install -m 755 deploy/scripts/renew-nginx.sh \
  /etc/letsencrypt/renewal-hooks/deploy/son-durak-nginx
sudo certbot renew --dry-run
systemctl list-timers --all | grep certbot
```

Edge container adını değiştirdiysen hook’taki `nginx` değerini de değiştir. Sistemin mevcut Certbot timer/cron kurulumunu kullan; yenileme zamanlayıcısı yoksa bir tane etkinleştir. Var olan renewal hook’larını silme. [Certbot webroot ve yenileme hook’ları](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates).

### 5. Yayınla

**Actions → Deploy Son Durak → Run workflow → operation: `deploy`**.

Workflow testleri çalıştırır; `frontend/Dockerfile` ile image üretir ve Docker Hub’a benzersiz commit/run etiketiyle gönderir. Ardından image’ı izole bir nginx arkasında test eder, sunucuya aktaracağı yapılandırmayı kopyalar, registry oturumu açar ve sadece Son Durak Compose’unu günceller. Son kontrolde ortak nginx üzerinden gerçek hostname/SNI ve sertifikayla `/healthz` çağrılır. Sonuç Actions özetinde görünür.

**Adres: https://iettquiz.duckdns.org**

## Sonraki yayınlar ve geri dönüş

Her güncellemede `operation: deploy` yeterli. Push otomatik yayın başlatmaz. Ortak nginx’in restart/reload edilmesi gerekmez; Club Events dosyalarının üzerine yazılmaz. Aynı repository’de deploy’lar sırayla çalışır; sunucudaki `flock` manuel eşzamanlı deploy’u engeller. Kullanıcıların mevcut service worker güncellemesini alması için açık sekmeleri kapatıp tekrar açmaları gerekebilir.

Domain değişikliği önce yeni DNS/sertifika ve `install-edge.sh` işlemlerini, sonra yeni frontend build’ini gerektirir. Canonical URL, sitemap ve HTTPS yönlendirmesi aynı `QUIZ_DOMAIN` değerini kullanır.

Son **başarılı** yayın ayarları `.env.last-successful`, yeni yayından önceki başarılı ayarlar `.env.previous` olarak tutulur. Geri dönüş:

```bash
cd ~/son-durak
cp deploy/.env.previous deploy/.env
bash deploy/scripts/deploy.sh
```

İlk başarılı yayın öncesinde rollback sürümü bulunmaz. Eski image etiketlerini Docker Hub’dan silme. Elle belirli sürüme dönmek için `.env` içindeki `RELEASE_TAG` değerini değiştir. `prepare` veya yeni `deploy`, GitHub variables’tan `.env` dosyasını yeniden üretir; kalıcı ayar değişikliklerini GitHub’a da işle.

Hesapsız modda sunucuda kullanıcı veritabanı yoktur; tarayıcı verisini temizlemek oyuncunun ilerlemesini siler. Oyun verisi/formatı değişirse kayıt uyumluluğu ayrıca değerlendirilmelidir. Eski `server` profilinin betikleri ve API Dockerfile’ı isteğe bağlı manuel kullanım için korunmuştur; GitHub workflow’unda kapalıdır. Böyle bir kurulumdan geçişte mevcut SQLite volume silinmez ve çalışan API varsa yayın öncesi yedek alınır.

## Depolamayı sonra değiştirmek

Şimdilik karar verilene kadar tarayıcı kaydı kullanılır. İleride mevcut Club Events Supabase projesinin uygunluğu ayrıca incelenebilir; bu çalışma o projede tablo, kullanıcı veya ayar değiştirmez. Rust API’nin SQLite desteği ve isteğe bağlı PostgreSQL özelliği korunur. Sunucuda çok kullanıcılı kayıt için oyuncu kimliği/giriş modeli de birlikte seçilmelidir; `AUTH_MODE=local` tek ortak geliştirme profilidir ve internete açılmaz.

Tarayıcı kayıtlarının yeni sunucu veritabanına otomatik taşınması şu an yoktur; böyle bir geçişte ayrı içe aktarma ve hesap eşleştirme kararı gerekir.

## Tanılama

```bash
cd ~/son-durak
# Ortamı yükle, gerçek ağı çöz ve Son Durak servislerini göster:
source deploy/scripts/common.sh
resolve_edge
compose ps
compose logs --tail=100 web
# Paylaşılan edge:
docker exec nginx nginx -t
docker logs --tail=100 nginx
curl -I https://iettquiz.duckdns.org/
curl https://iettquiz.duckdns.org/healthz
```

`502`: `son-durak-web` ve nginx aynı ağda mı, web healthcheck başarılı mı kontrol et. Docker DNS yenilemesi birkaç saniye alabilir. `evenements.com.tr` yönlendirmesi geliyorsa quiz server bloğu yüklü değildir veya DNS başka sunucuya gidiyordur. `certificate not found`: Certbot adımı ve alan adı eşleşmesini kontrol et.

## Yerel doğrulama

```bash
python3 -m unittest discover -s tests -p 'test_deploy.py'
for file in deploy/scripts/*.sh; do bash -n "$file"; done
docker build -f frontend/Dockerfile -t son-durak-web:deploy-test .
bash deploy/scripts/smoke-test.sh son-durak-web:deploy-test
```

Smoke testi geçici Docker ağı/container’ları ve rastgele loopback portları kullanır; sonunda yalnızca kendi kaynaklarını siler. Mevcut sitenin çalışması, ACME yolu, HTTPS, ana sayfa/SEO, statik sayfalar, 404, çevrimdışı asset manifesti, API yol/query aktarımı ve `X-Forwarded-Proto` kontrol edilir. Bu test gerçek sunucuya bağlanmaz veya DNS/sertifika yayınlamaz.
