"""Assemble the auto-updater manifest (latest.json) from the GitHub release's signed
artifacts, point each platform at its PUBLIC R2 URL (the private repo's release URLs
aren't reachable by end users), and upload it to R2 at mise/latest.json with no-cache
so the updater always sees the newest version (dodges the Cloudflare download cache)."""
import boto3, os, json, subprocess, datetime

TAG = os.environ['TAG']
REPO = 'warnerlowe-cwl/mise'
BASE = f"https://downloads.crownwelllabs.com/mise/{TAG}/"

def r2_for(base):
    if base.endswith('.AppImage'):   return ('linux-x86_64', 'Mise-linux-x86_64.AppImage')
    if base.endswith('.app.tar.gz'): return ('darwin',       'Mise-macOS.app.tar.gz')
    if base.endswith('.exe'):        return ('windows-x86_64','Mise-Setup-Windows.exe')
    return (None, None)

names = subprocess.check_output(
    ['gh', 'release', 'view', TAG, '--repo', REPO, '--json', 'assets', '-q', '.assets[].name']
).decode().split()

os.makedirs('/tmp/sigs', exist_ok=True)
platforms = {}
for n in names:
    if not n.endswith('.sig'):
        continue
    key, fname = r2_for(n[:-4])
    if not key:
        continue
    subprocess.run(['gh', 'release', 'download', TAG, '--repo', REPO,
                    '--pattern', n, '--dir', '/tmp/sigs', '--clobber'], check=True)
    sig = open('/tmp/sigs/' + n).read().strip()
    url = BASE + fname
    if key == 'darwin':
        platforms['darwin-aarch64'] = {"signature": sig, "url": url}
        platforms['darwin-x86_64']  = {"signature": sig, "url": url}
    else:
        platforms[key] = {"signature": sig, "url": url}

manifest = {
    "version": TAG.lstrip('v'),
    "notes": "A new version of Mise is available.",
    "pub_date": datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    "platforms": platforms,
}
data = json.dumps(manifest, indent=2)
print(data)

s3 = boto3.client(
    's3',
    endpoint_url='https://' + os.environ['R2_ACCOUNT_ID'] + '.r2.cloudflarestorage.com',
    aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
    region_name='auto',
)
bucket = os.environ['R2_BUCKET']
s3.put_object(Bucket=bucket, Key='mise/' + TAG + '/latest.json',
              Body=data.encode(), ContentType='application/json')
s3.put_object(Bucket=bucket, Key='mise/latest.json', Body=data.encode(),
              ContentType='application/json',
              CacheControl='no-cache, no-store, max-age=0')
print('Uploaded mise/latest.json (no-cache) covering:', list(platforms.keys()))
