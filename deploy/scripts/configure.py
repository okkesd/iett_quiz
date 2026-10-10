#!/usr/bin/env python3
"""Validate deployment values; write a shell/Compose-compatible CI .env."""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import shlex
from urllib.parse import urlparse

DEFAULTS = {'QUIZ_DOMAIN': 'iettquiz.duckdns.org', 'DEPLOY_MODE': 'offline',
            'EDGE_NETWORK': 'auto', 'EDGE_CONTAINER': 'nginx', 'EDGE_STACK_DIR': '',
            'SUPABASE_URL': '', 'SUPABASE_PUBLISHABLE_KEY': ''}
KEYS = ['QUIZ_DOMAIN', 'IMAGE_PREFIX', 'RELEASE_TAG', 'DEPLOY_MODE', 'EDGE_NETWORK',
        'EDGE_CONTAINER', 'EDGE_STACK_DIR', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']

def validate(values):
    domain = values.get('QUIZ_DOMAIN', '')
    if len(domain) > 253 or '.' not in domain or not all(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in domain.split('.')):
        raise ValueError('QUIZ_DOMAIN yalnızca geçerli hostname olmalı; https:// veya yol içermemeli.')
    for key, pattern in [('IMAGE_PREFIX', r'[a-z0-9][a-z0-9_-]{1,38}'),
                         ('RELEASE_TAG', r'[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}'),
                         ('EDGE_CONTAINER', r'[A-Za-z0-9][A-Za-z0-9_.-]*'),
                         ('EDGE_NETWORK', r'[A-Za-z0-9][A-Za-z0-9_.-]*')]:
        if not re.fullmatch(pattern, values.get(key, '')):
            raise ValueError(f'{key} eksik veya geçersiz.')
    for value in values.values():
        if any(c in value for c in '\n\r\0$`\'"'):
            raise ValueError('Ayarlar satır sonu, tırnak veya shell genişletmesi içeremez.')
    stack = values.get('EDGE_STACK_DIR', '')
    if stack and not stack.startswith('/'):
        raise ValueError('EDGE_STACK_DIR boş veya mutlak sunucu yolu olmalı.')
    mode = values.get('DEPLOY_MODE')
    if mode not in ('offline', 'server'):
        raise ValueError('DEPLOY_MODE=offline veya server olmalı.')
    if mode == 'server':
        url = urlparse(values.get('SUPABASE_URL', ''))
        if url.scheme != 'https' or not url.hostname or url.path not in ('', '/') or url.query or url.fragment or url.username:
            raise ValueError('Server modunda geçerli HTTPS SUPABASE_URL gerekli.')
        key = values.get('SUPABASE_PUBLISHABLE_KEY', '')
        if key.startswith('sb_publishable_') and len(key) > 20:
            return
        try:
            payload = key.split('.')[1]
            role = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4))).get('role')
        except (ValueError, IndexError, UnicodeError):
            role = None
        if role != 'anon':
            raise ValueError('Supabase publishable veya legacy anon key gerekli; service_role/secret key kullanmayın.')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / '.env')
    args = parser.parse_args()
    values = {key: os.environ.get(key) or DEFAULTS.get(key, '') for key in KEYS}
    try:
        validate(values)
    except ValueError as error:
        parser.error(str(error))
    if not args.check:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(''.join(f'{key}={shlex.quote(values[key])}\n' for key in KEYS))
        args.output.chmod(0o600)

if __name__ == '__main__':
    main()
