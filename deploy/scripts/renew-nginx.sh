#!/bin/sh
# Install as /etc/letsencrypt/renewal-hooks/deploy/son-durak-nginx.
# Runs only after Certbot successfully renews a certificate.
set -eu
docker exec nginx nginx -t
docker exec nginx nginx -s reload
