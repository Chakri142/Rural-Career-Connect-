"""One-time local configuration only. The web application backend is Java."""
from secrets import token_urlsafe
from pathlib import Path
from os import open as os_open, O_WRONLY, O_EXCL, O_CREAT, fdopen
path = Path(__file__).resolve().parents[1] / '.env'
values = {k: token_urlsafe(24) for k in ['MYSQL_ROOT_PASSWORD', 'DB_PASSWORD', 'RCC_ADMIN_PASSWORD', 'RCC_EMPLOYER_PASSWORD', 'RCC_SEEKER_PASSWORD']}
values.update(RCC_SEED='true', RCC_ADMIN_EMAIL='admin@example.test', COOKIE_SECURE='false', COOKIE_SAMESITE='lax')
try:
    with fdopen(os_open(path, O_WRONLY | O_EXCL | O_CREAT, 0o600), 'w') as out:
        out.write(''.join(f'{k}={v}\n' for k, v in values.items()))
except FileExistsError:
    raise SystemExit('Refusing to overwrite an existing .env file.')
print('Private passwords created in .env. Keep this file out of version control.')
