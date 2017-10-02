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
	
	.describe('hidden','Hidden boolean (TokyoTosho will be skipped)')
	.boolean('hidden')
	
	.describe('d','Comment for your submission (bbcode supported partially)')
	.default('d','')
	
	.describe('web','Website')
	.default('web','')
	
	.describe('debug','Debug mode (only for Anidex)')
	.boolean('debug')
	
	.describe('skip-at','Skip uploading to Anidex')
	.boolean('skip-at')
	
	.describe('skip-nt','Skip uploading to NyaaV2 and TokyoTosho')
	.boolean('skip-nt')
	
	.describe('skip-tt','Skip uploading to TokyoTosho')
	.boolean('skip-tt')
	
	.describe('skip-pt','Skip uploading to NyaaPantsu')
	.boolean('skip-pt')
	
	.describe('h','Show help')
	.alias('h','help')
	.boolean('h')
	
	.argv;

// domains
const atUrl = 'https://anidex.info/api/';
const nnUrl = 'https://nyaa.si/api/v2/upload';
const nsUrl = 'https://sukebei.nyaa.si/api/v2/upload';
const ndUrl = '/download/{ID}.torrent';
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

// cat anidex
const cat2anidex = {
	'1_1':  2, '1_2': 1,  '1_3': 3, '1_4': 11,
	'2_1':  8, '2_2': 7,
	'3_1':  5, '3_2': 4,  '3_3': 5, '3_4': 16,
	'4_1':  6, '4_2': 6,
	'5_1': 10, '5_2': 9,
	'6_1': 13, '6_2': 12,
	'7_1': 14, '7_2': 14,
	'8_1': 15,
};
function convertCatToAnidex(){
	if (cat2anidex[argv.cat] === undefined) {
		errCat('AniDex');
		return false;
	}
	return cat2anidex[argv.cat];
}
// cat nyaa
const cat2nyaa = {
	nn: {
		default: {
			'1_1': '1_4', '1_2': '1_3', '1_3': '1_3', '1_4': '1_1',
			'2_1': '3_3', '2_2': '3_2',
			'3_1': '4_4', '3_2': '4_3', '3_3': '4_3', '3_4': '4_2',
			'4_1': '3_3', '4_2': '3_2',
			'5_1': '2_1', '5_2': '2_2',
			'6_1': '6_1', '6_2': '6_2',
			'7_1': '5_1', '7_2': '5_2'
		},
		1: {
			'1_2': '1_2', '1_3': '1_2',
			'2_2': '3_1',
			'3_2': '4_1', '3_3': '4_1',
			'4_2': '3_1'
		}
	},
	ns: {
		default: {
			'1_1': '1_1', '1_2': '1_1', '1_3': '1_1', '1_4': '1_1',
			'2_1': '1_4', '2_2': '1_4',
			'3_1': '2_2', '3_2': '2_2', '3_3': '2_2', '3_4': '2_2',
			'4_1': '1_2', '4_2': '1_2',
			'6_1': '1_3', '6_2': '1_3',
			'7_1': '1_5',
			'7_2': '2_1',
			'8_1': '2_2'
		}
	}
};
function convertCatToNyaa(){
	let c2n = cat2nyaa[argv.hentai ? 'ns' : 'nn'];
	let c = c2n[argv.lang] && c2n[argv.lang][argv.cat] ? c2n[argv.lang][argv.cat] : c2n['default'][argv.cat];
	if (c === undefined) {
		errCat('NyaaV2');
		return false;
	}
	return c;
}
// cat tokyotosho
const cat2tt = {
	tn: {
		default: {
			'1_1': 7, '1_2': 10, '1_3': 10, '1_4': 9,
			'2_1': 3, '2_2': 3,
			'3_1': 5, '3_2': 5,  '3_3': 5,  '3_4': 5,
			'4_1': 5, '4_2': 5,
			'5_1': 2, '5_2': 2,
			'6_1': 5, '6_2': 5,
			'7_1': 5, '7_2': 5
		},
		1: {
			'1_2': 1, '1_3': 1
		}
	},
	th: {
		default: {
			'1_1': 12, '1_2': 12, '1_3': 12, '1_4': 12,
			'2_1': 13, '2_2': 13,
			'3_1': 4,  '3_2': 4,  '3_3': 4,  '3_4': 4,
			'4_1': 4,  '4_2': 4,
			'6_1': 14, '6_2': 14,
			'7_1': 4,  '7_2': 4,
			'8_1': 15
		}
	}
}
function convertCatToTT(){
	if(argv.batch){
		return 11;
	}
	let c2t = cat2tt[argv.hentai ? 'th' : 'tn'];
	let c = c2t[argv.lang] && c2t[argv.lang][argv.cat] ? c2t[argv.lang][argv.cat] : c2t['default'][argv.cat];
	if (c === undefined) {
		errCat('TokyoTosho');
		return false;
	}
	return c;
}
// cat nyaapantsu
const cat2pantsu = {
	pn: {
		default: {
			'1_1': '3_6',  '1_2': '3_13', '1_3': '3_13', '1_4': '3_12',
			'2_1': '4_8',  '2_2': '4_14',
			'3_1': '5_11', '3_2': '5_18', '3_3': '5_18', '3_4': '5_10',
			'4_1': '4_8',  '4_2': '4_14',
			'5_1': '2_3',  '5_2': '2_4',
			'6_1': '1_1',  '6_2': '1_2',
			'7_1': '6_15', '7_2': '6_16'
		},
		1: {
			'1_2': '3_5', '1_3': '3_5',
			'2_2': '4_7',
			'3_2': '5_9', '3_3': '5_9',
			'4_2': '4_7'
		}
	},
	ps: {
		default: {
			'1_1': '1_1', '1_2': '1_1', '1_3': '1_1', '1_4': '1_1',
			'2_1': '1_4', '2_2': '1_4',
			'3_1': '2_2', '3_2': '2_2', '3_3': '2_2', '3_4': '2_2',
			'4_1': '1_2', '4_2': '1_2',
			'6_1': '1_3', '6_2': '1_3',
			'7_1': '1_5',
			'7_2': '2_1',
			'8_1': '2_2'
		}
	}
};
function convertCatToPantsu(){
	let c2p = cat2pantsu[argv.hentai ? 'ps' : 'pn'];
	let c = c2p[argv.lang] && c2p[argv.lang][argv.cat] ? c2p[argv.lang][argv.cat] : c2p['default'][argv.cat];
	if (c === undefined) {
		errCat('NyaaPantsu');
		return false;
	}
	return c;
}
// error cat 
function errCat(service){
	console.log('['+service+'] Error: unknown category!');
}

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
	if(!convertCatToAnidex() || argv['skip-at']){
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
	else if(postDx.res && postDx.res.body && postDx.res.body.match(/<title>(.*)<\/title>/)){
		let err = postDx.res.body.match(/<title>(.*)<\/title>/)[1];
		console.log('[AniDex]','Error '+postDx.res.statusCode+': '+err);
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

// NyaaV2 upload
// https://github.com/nyaadevs/nyaa/blob/master/utils/api_uploader_v2.py
async function postToNyaa(){
	if(!convertCatToNyaa() || argv['skip-nt']){
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
		if(res.id){
			console.log('[NyaaV2] Torrent successfully uploaded!');
			console.log('[NyaaV2]',res.url);
			await postToTT(res.id);
		}
		else if(res.errors && res.errors.torrent && res.errors.torrent.join(' / ').match(/That torrent already exists/)){
			let errStr = res.errors.torrent.join('\r\n[NyaaV2] ');
			let nyaa_tid = errStr.match(/ \(#(\d+)\)$/)[1];
			console.log('[NyaaV2]',errStr);
			await postToTT(nyaa_tid);
		}
		else if(res.errors && res.errors.torrent){
			console.log('[NyaaV2]',res.errors.torrent.join('\r\n[NyaaV2] '));
		}
		else{
			console.log('[NyaaV2] Unknown error');
		}
	}
	else if(postNt.res && postNt.res.body && postNt.res.body.match(/<title>(.*)<\/title>/)){
		let err = postNt.res.body.match(/<title>(.*)<\/title>/)[1];
		console.log('[NyaaV2]','Error '+postNt.res.statusCode+': '+err);
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


async function postToTT(nyaa_tid){
	if(!convertCatToTT() || argv.hidden || argv['skip-tt']){
		return;
	}
	// nyaa_id to url
	let nyaa_url = (argv.hentai?nsUrl:nnUrl).split('/')[2]+ndUrl.replace('{ID}',nyaa_tid);
	// fix comment
	let TTcom = argv.d.replace(/\n$/,'').trim();
	do {
		TTcom = TTcom.replace(/\n\n/g,'\n');
	} while (TTcom.match(/\n\n/));
	TTcom = TTcom.replace(/\n/g,' / ').replace(/\[(\w+)[^w]*?](.*?)\[\/\1]/g,'$2');
	// req options
	let options = {
		url: ttUrl,
		form: {
			type: convertCatToTT(),
			url: nyaa_url,
			comment: TTcom,
			website: argv.web,
			apikey: argv.ttkey,
			send: 'true'
		}
	}
	let postTT = await doReq('post',options);
	// answer
	let ttBase = 'https://'+ttUrl.split('/')[2];
	if( statCodeCheck(postTT.res,200) && postTT.res.body.match(/^OK,(\d+)$/)){
		console.log('[TokyoTosho]',ttBase+'/details.php?id='+postTT.res.body.split(',')[1]);
	}
	else if(statCodeCheck(postTT.res,200) && postTT.res.body.match(/It already exists in the database/)){
		console.log('[TokyoTosho]','Error: Torrent already exists:',ttBase+'/details.php?id='+postTT.res.body.match(/Entry (\d+)/)[1]);
	}
	else if(statCodeCheck(postTT.res,200) && postTT.res.body.match(/Could not download torrent/)){
		console.log('[TokyoTosho]','Error:  Could not download torrent. Check the ID for typos and verify the NyaaV2 site is online.');
	}
	else if(postTT.res && postTT.res.body && postTT.res.body.match(/<title>(.*)<\/title>/)){
		let err = postTT.res.body.match(/<title>(.*)<\/title>/)[1];
		console.log('[TokyoTosho]','Error '+postTT.res.statusCode+': '+err);
	}
	else if(postNt.res){
		console.log('[TokyoTosho]','Error '+postNt.res.statusCode);
	}
	else if(postNt.err){
		console.log('[TokyoTosho] Error code: ',postNt.err.code);
	}
	else{
		console.log('[TokyoTosho] Unknown error');
	}
}

// pantsu upload
// https://nyaa.pantsu.cat/apidoc/#api-Torrents-UpdateTorrent
async function postToPantsu(){
	if(!convertCatToPantsu() || argv['skip-pt']){
		return;
	}
	let uploadOptions = {
		url: (argv.hentai?psUrl:pnUrl),
		headers: {
			Authorization: argv.ptkey
		},
		formData: {
			torrent: fs.createReadStream(argv.f),
			// username: argv.ptkey,
			// name: 'name',
			category: convertCatToPantsu(),
			website_link: argv.web,
			description: bb2md(argv.d),
			hidden:  argv.hidden.toString(),
			remake: argv.reenc.toString()
		}
	}
	let postPt = await doReq('post',uploadOptions);
	if(statCodeCheck(postPt.res,200) || statCodeCheck(postPt.res,400)){
		let res = JSON.parse(postPt.res.body);
		if(res.id){
			console.log('[NyaaPantsu] Torrent successfully uploaded!');
			console.log('[NyaaPantsu]',res.url);
		}
		else if(res.errors && res.errors.join(' / ').match(/That torrent already exists/)){
			let errStr = res.errors.torrent.join('\r\n[NyaaPantsu] ');
			console.log('[NyaaPantsu]',errStr);
		}
		else if(res.errors){
			console.log('[NyaaPantsu]',res.errors.join('\r\n[NyaaPantsu] '));
		}
		else{
			console.log('[NyaaPantsu] Unknown error');
		}
	}
	else if(postPt.res && postPt.res.body && postPt.res.body.match(/<title>(.*)<\/title>/)){
		let err = postPt.res.body.match(/<title>(.*)<\/title>/)[1];
		console.log('[NyaaPantsu]','Error '+postPt.res.statusCode+': '+err);
	}
	else if(postPt.res){
		console.log('[NyaaPantsu]',postPt.res.statusCode);
	}
	else if(postPt.err){
		console.log('[NyaaPantsu] Error code: ',postPt.err.code);
	}
	else{
		console.log('[NyaaPantsu] Unknown error');
	}
}

// check status code
function statCodeCheck(res,code){
	return res && res.statusCode == code ? true : false;
}
