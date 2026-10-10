#!/usr/bin/env python3
"""Substitute only QUIZ_DOMAIN, preserving nginx's $host/$request_uri variables."""
import argparse
from pathlib import Path
import re

parser = argparse.ArgumentParser()
parser.add_argument('phase', choices=['bootstrap', 'https'])
parser.add_argument('domain')
args = parser.parse_args()
if len(args.domain) > 253 or '.' not in args.domain or not all(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in args.domain.split('.')):
    parser.error('Geçersiz alan adı.')
name = 'bootstrap.conf.template' if args.phase == 'bootstrap' else 'site.conf.template'
print((Path(__file__).resolve().parents[1] / 'nginx' / name).read_text().replace('QUIZ_DOMAIN', args.domain), end='')
