// modules
const fs = require('fs');
const yargs = require('yargs');
const request = require('request');
const bb2md = require('bbcode-to-markdown');

// request
function doReq(type,options){
	options.timeout = 1000*60*1;
	return new Promise((resolve, reject) => {
		request[type](options,function(err, res){
			if(err) resolve({err});
			resolve({res});
		});
	});
}

// cats and langs
const appCats = ['1_1','1_2','1_3','1_4','2_1','2_2','3_1','3_2','3_3','3_4','4_1','4_2','5_1','5_2','6_1','6_2','7_1','7_2','8_1'];
const appLang = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];

// arguments
let argv = yargs
	.wrap(Math.min(100))
	.usage('Usage: anidex [options]')
	
	.describe('f','Torrent file')
	
	.describe('cfg','Override default config/program options')
	
	.describe('atkey','Api key for Anidex')
	.default('atkey','')
	.describe('ntkey','Comma-separated login and password for NyaaV2')
	.default('ntkey','')
	.describe('ttkey','Api key for TokyoTosho')
	.default('ttkey','')
	.describe('ptkey','Api key for NyaaPantsu')
	.default('ptkey','')
	
	.describe('cat','Category id')
	.choices('cat', appCats)
	
	.describe('lang','Language id')
	.choices('lang', appLang)
	.default('lang',1)
	
	.describe('group','Group id')
	.default('group',0)
	
	.describe('batch','Batch boolean')
	.boolean('batch')
	
	.describe('hentai','Hentai boolean')
	.boolean('hentai')
	
	.describe('reenc','Reencode boolean')
	.boolean('reenc')
	
	.describe('hidden','Hidden boolean (TT will be skipped)')
	.boolean('hidden')
	
	.describe('d','Comment for your submission (bbcode partially)')
	.default('d','')
	
	.describe('web','Website')
	.default('web','')
	
	.describe('debug','Debug mode (only for Anidex)')
	.boolean('debug')
	
	.describe('h','Show help')
	.alias('h','help')
	.boolean('h')
	
	.argv;

// domains
const atUrl = 'https://anidex.info/api/';
const nnUrl = 'https://nyaa.si/api/v2/upload';
const nsUrl = 'https://sukebei.nyaa.si/api/v2/upload';
const ttUrl = 'https://www.tokyotosho.info/new.php';
const pnUrl = 'https://nyaa.pantsu.cat/api/upload';
const psUrl = 'https://sukebei.pantsu.cat/api/upload';

// cat 8_1 always H
if(argv.cat=='8_1'){
	argv.hentai = true;
}

// config
const cfgFilePath = __dirname+'/../config/'+argv.cfg+'.json';
const useCfg = argv.cfg && argv.cfg.match(/^[a-z]+$/) && fs.existsSync(cfgFilePath) ? true : false;
const cfgOpt = useCfg ? require(cfgFilePath) : {};

if(useCfg){
	console.log('[INFO] Using selected config...\n');
}

// check params
argv.cat    = useCfg && cfgOpt.cat   && appCats.indexOf(cfgOpt.cat)  > -1 ? cfgOpt.cat  : argv.cat;
argv.lang   = useCfg && cfgOpt.lang  && appLang.indexOf(cfgOpt.lang) > -1 ? cfgOpt.lang : argv.lang;
argv.group  = useCfg && cfgOpt.group && typeof cfgOpt.group === "number" && /^[0-9]+$/.test(cfgOpt.group) ? parseInt(cfgOpt.group): argv.group;

argv.batch  = useCfg && cfgOpt.batch  && cfgOpt.batch  == true ? true : argv.batch;
argv.hentai = useCfg && cfgOpt.hentai && cfgOpt.hentai == true ? true : argv.hentai;
argv.reenc  = useCfg && cfgOpt.reenc  && cfgOpt.reenc  == true ? true : argv.reenc;
argv.hidden = useCfg && cfgOpt.hidden && cfgOpt.hidden == true ? true : argv.hidden;

argv.d      = useCfg && cfgOpt.comment ? cfgOpt.comment.toString()+argv.d : argv.d;
argv.d      = argv.d.replace(/\\n/g,'\n');

argv.atkey  = useCfg && cfgOpt.atkey  ?  cfgOpt.atkey.toString() : argv.atkey;
argv.ntkey  = useCfg && cfgOpt.ntkey  && cfgOpt.ntkey.indexOf(',') > -1 ? cfgOpt.ntkey.toString().split(',') : argv.ntkey;
argv.ttkey  = useCfg && cfgOpt.ttkey  ?  cfgOpt.ttkey.toString() : argv.ttkey;
argv.ptkey  = useCfg && cfgOpt.ptkey  ?  cfgOpt.ptkey.toString() : argv.ptkey;
argv.web    = useCfg && cfgOpt.web    ?  cfgOpt.web.toString()   : argv.web;

// help
if(argv.h){
	console.log(yargs.showHelp());
}

// upload, nyaa with repost to TT
async function doUpload(){
	await postToAnidex();
	if(!argv.debug){
		await postToNyaa();
		await postToPantsu();
	}
	console.log();
}

// start
doUpload();

// anidex
// https://anidex.info/settings#upload_api
async function postToAnidex(){
	if(!convertCatToAnidex()){
		return;
	}
	let uploadOptions = {
		url: atUrl,
		formData: {
			api_key: argv.atkey,
			file: fs.createReadStream(argv.f),
			description: argv.d,
			subcat_id: convertCatToAnidex(),
			lang_id: argv.lang,
			group_id: argv.group,
			batch: (argv.batch?1:0),
			hentai: (argv.hentai?1:0),
			reencode: (argv.reenc?1:0),
			private: (argv.hidden?1:0),
			debug: (argv.debug?1:0)
		}
	}
	let postDx = await doReq('post',uploadOptions);
	if(postDx.res && statCodeCheck(postDx.res,200)){
		if(argv.debug){
			console.log('[AniDex]',postDx.res.body.replace(/\r\n\t$/,'').replace(/\t/g,'[AniDex] '));
		}
		else if(postDx.res.body.match(/Error/)){
			console.log('[AniDex]',postDx.res.body);
		}
		else{
			console.log('[AniDex] Torrent successfully uploaded!');
			console.log('[AniDex]',postDx.res.body);
		}
	}
	else if(postDx.res){
		console.log('[AniDex]',postDx.res.statusCode);
		return;
	}
	else if(postDx.err){
		console.log('[AniDex] Error code: ',postDx.err.code);
		return;
	}
	else{
		console.log('[AniDex] Unknown error');
	}
}

// nyaaV2 upload
// https://github.com/nyaadevs/nyaa/blob/master/utils/api_uploader_v2.py
async function postToNyaa(){
	if(!convertCatToNyaa()){
		return;
	}
	let uploadOptions = {
		url: (argv.hentai ? nsUrl : nnUrl),
		auth: {
			user: argv.ntkey[0],
			pass: argv.ntkey[1]
		},
		formData: {
			torrent_data: JSON.stringify({
				category: convertCatToNyaa(),
				information: argv.web,
				description: bb2md(argv.d),
				anonymous: false,
				hidden: argv.hidden,
				complete: argv.batch,
				remake: argv.reenc,
				trusted: true
			}),
			torrent: fs.createReadStream(argv.f)
		}
	};
	let postNt = await doReq('post',uploadOptions);
	if(statCodeCheck(postNt.res,200) || statCodeCheck(postNt.res,400)){
		let res = JSON.parse(postNt.res.body);
		if(res.url){
			console.log('[NyaaV2] Torrent successfully uploaded!');
			console.log('[NyaaV2]',res.url);
			if(!argv.hidden){
				await postToTT(res.url);
			}
		}
		else if(res.errors && res.errors.torrent && res.errors.torrent.join(' / ').match(/That torrent already exists/)){
			console.log('[NyaaV2]',res.errors.torrent.join('\r\n[NyaaV2] '));
		}
		else if(res.errors && res.errors.torrent){
			console.log('[NyaaV2]',res.errors.torrent.join('\r\n[NyaaV2] '));
		}
		else{
			console.log('[NyaaV2] Unknown error.');
		}
	}
	else if(postNt.res){
		console.log('[NyaaV2]',postNt.res.statusCode);
	}
	else if(postNt.err){
		console.log('[NyaaV2] Error code: ',postNt.err.code);
	}
	else{
		console.log('[NyaaV2] Unknown error');
	}
}


async function postToTT(t_url){
	// fix comment
	let TTcom = argv.d.replace(/\n$/,'').trim();
	do {
		TTcom = TTcom.replace(/\n\n/g,'\n');
	} while (TTcom.match(/\n\n/));
	TTcom = TTcom.replace(/\n/g,' / ').replace(/\[(\w+)[^w]*?](.*?)\[\/\1]/g,'$2');
	console.log('[TokyoTosho] In development!');
}

// pantsu upload
// https://nyaa.pantsu.cat/apidoc/#api-Torrents-UpdateTorrent
async function postToPantsu(){
	
}

// check status code
function statCodeCheck(res,code){
	return res && res.statusCode == code ? true : false;
}

// cat selector
function convertCatToAnidex(){
	switch (argv.cat){
		case '1_1':
			return 2;
			break;
		case '1_2':
			return 1;
			break;
		case '1_3':
			return 3;
			break;
		case '1_4':
			return 11;
			break;
		case '2_1':
			return 8;
			break;
		case '2_2':
			return 7;
			break;
		case '3_1':
		case '3_3':
			return 5;
			break;
		case '3_4':
			return 16;
			break;
		case '4_1':
		case '4_2':
			return 6;
			break;
		case '5_1':
			return 10;
			break;
		case '5_2':
			return 9;
			break;
		case '6_1':
			return 13;
			break;
		case '6_2':
			return 12;
			break;
		case '7_1':
		case '7_2':
			return 14;
			break;
		case '8_1':
			return 15;
			break;
		default:
			errCat('AniDex');
			return false;
	}
}
function convertCatToNyaa(){
	if(!argv.hentai){
		switch (argv.cat){
			case '1_1':
				return '1_4';
				break;
			case '1_2':
			case '1_3':
				return argv.lang == 1 ? '1_2' : '1_3';
				break;
			case '2_1':
				return '3_3';
				break;
			case '2_2':
				return argv.lang == 1 ? '3_1' : '3_2';
				break;
			case '3_1':
				return '4_4';
				break;
			case '3_2':
				return argv.lang == 1 ? '4_1' : '4_3';
				break;
			case '3_3':
				return argv.lang == 1 ? '4_1' : '4_3';
				break;
			case '3_4':
				return '4_2';
				break;
			case '4_1':
				return '3_3';
				break;
			case '4_2':
				return argv.lang == 1 ? '3_1' : '3_2';
				break;
			case '5_1':
				return '2_1';
				break;
			case '5_2':
				return '2_2';
				break;
			case '6_1':
				return '6_1';
				break;
			case '6_2':
				return '6_2';
				break;
			case '7_1':
				return '5_1';
				break;
			case '7_2':
				return '5_2';
				break;
			default:
				errCat('NyaaV2');
				return false;
		}
	}
	else{
		switch (argv.cat){
			case '1_1':
			case '1_2':
			case '1_3':
			case '1_4':
				return '1_1';
				break;
			case '2_1':
			case '2_2':
				return '1_4';
				break;
			case '3_1':
			case '3_2':
			case '3_3':
			case '3_4':
			case '8_1':
				return '2_2';
				break;
			case '4_1':
			case '4_2':
				return '1_2';
				break;
			case '6_1':
			case '6_2':
				return '1_3';
				break;
			case '7_1':
				return '1_5';
				break;
			case '7_2':
				return '2_1';
				break;
			case '5_1':
			case '5_2':
			default:
				errCat('NyaaV2');
				return false;
		}
	}
}
// error cat 
function errCat(service){
	console.log('['+service+'] Error: unknown category!');
}