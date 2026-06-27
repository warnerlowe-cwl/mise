import boto3, os

s3 = boto3.client(
    's3',
    endpoint_url='https://' + os.environ['R2_ACCOUNT_ID'] + '.r2.cloudflarestorage.com',
    aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
    region_name='auto',
)

platform = os.environ['PLATFORM']
tag = os.environ['TAG']
bucket = os.environ['R2_BUCKET']

if platform == 'macos':
    src = os.environ['FILE']
    uploads = [
        (src, 'mise/' + tag + '/Mise-macOS.dmg'),
        (src, 'mise/latest/Mise-macOS.dmg'),
    ]
    # the auto-updater bundle (.app.tar.gz) — separate from the .dmg installer
    apptar = os.environ.get('APPTARGZ')
    if apptar:
        uploads += [
            (apptar, 'mise/' + tag + '/Mise-macOS.app.tar.gz'),
            (apptar, 'mise/latest/Mise-macOS.app.tar.gz'),
        ]
elif platform == 'windows':
    src = os.environ['FILE']
    uploads = [
        (src, 'mise/' + tag + '/Mise-Setup-Windows.exe'),
        (src, 'mise/latest/Mise-Setup-Windows.exe'),
    ]
elif platform == 'linux':
    appimage = os.environ['APPIMAGE']
    deb = os.environ['DEB']
    uploads = [
        (appimage, 'mise/' + tag + '/Mise-linux-x86_64.AppImage'),
        (appimage, 'mise/latest/Mise-linux-x86_64.AppImage'),
        (deb,      'mise/' + tag + '/Mise-linux-amd64.deb'),
        (deb,      'mise/latest/Mise-linux-amd64.deb'),
    ]
else:
    raise ValueError('Unknown PLATFORM: ' + platform)

for src, key in uploads:
    print('Uploading', key)
    s3.upload_file(src, bucket, key, ExtraArgs={'ContentType': 'application/octet-stream'})

print('Done')
