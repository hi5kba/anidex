# Anidex Torrent Uploader

Upload torrent to multiply anime trackers.

## Legal Warning

This application is not endorsed by or affiliated with *Anidex*, *NyaaV2*, *TokyoTosho* or *NyaaPantsu*. For private use only, all rights reserved. You take full responsibility for the torrents you upload.

## Prerequisites

* NodeJS >= 7.8.0 (https://nodejs.org/)
* NPM >= 4.0.0 (https://www.npmjs.org/)

### Node Modules

After installing NodeJS with NPM goto `scripts` directory and type: `npm i`

## Supported trackers

* Anidex (https://anidex.info/)
* NyaaV2 (https://nyaa.si/)
* TokyoTosho (https://www.tokyotosho.info/)
* NyaaPantsu (https://nyaa.pantsu.cat/)

## Switches

* `-f` path to torrent file
* `--cfg` override program options with configuration file from `config` folder, filename should contain only a-z characters
* `--atkey` api key for Anidex tracker, you can get it from settings page
* `--ntkey` comma-separated login and password for NyaaV2
* `--ttkey` api key for TokyoTosho tracker, you can get it from settings page
* `--ptkey` comma-separated username and api key for NyaaPantsu, you can get api key from settings page
* `--cat` see [categories.txt](categories.txt)
* `--lang` see [categories.txt](categories.txt)
* `--group` group id for Anidex tracker, individual by default
* `--batch` mark torrent as batch/complete
* `--hentai` mark torrent as for adults
* `--reenc` reencode/remake release
* `--hidden` mark torrent as private, upload to TokyoTosho tracker will be skipped
* `-d` comment for your submission, bbcode supported partially, if specified in configuration file then this text will be appended
* `--web` link to your website
* `--debug` debug mode, only for Anidex, for testing purpose only
* `--skip-at` skip uploading to Anidex tracker
* `--skip-nt` skip uploading to NyaaV2 and TokyoTosho trackers
* `--skip-tt` skip uploading to TokyoTosho tracker
* `--skip-pt` skip uploading to NyaaPantsu tracker
* `-h`, `--help` show help