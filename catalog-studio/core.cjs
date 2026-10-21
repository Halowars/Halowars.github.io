/* Fieldnote Catalog Studio: dependency-free browser/CommonJS core. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CatalogCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function CatalogFactory(){
'use strict';
const VERSION='0.1.0';
const LIMITS=Object.freeze({characters:5000000,rows:1000,columns:80,field:12000,assetCharacters:14000000,totalAssetCharacters:45000000});
const FIELDS=Object.freeze(['sku','name','category','description','price','pack','image','brand','currency']);
const REQUIRED=Object.freeze(['sku','name','category','pack']);
const ALIASES={
sku:['sku','item number','item no','item code','product code','part number','part no'],
name:['name','product name','product','title','item name'],
category:['category','product category','department','group'],
description:['description','product description','details'],
price:['price','unit price','list price','selling price','price usd'],
pack:['pack','pack size','unit','uom','selling unit','unit of measure'],
image:['image','image filename','image file','photo','photo filename'],
brand:['brand','manufacturer','make'],
currency:['currency','currency code']
};
function fail(message){throw new Error(message);}
function str(value){return value==null?'':String(value);}
function headerKey(value){return str(value).normalize('NFKC').toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();}
function textValue(value){return str(value).normalize('NFC').trim();}
function escaped(value){return str(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function meaningful(value){return !/^(?:|n\/a|na|null|undefined|tbd|unknown|-)$/i.test(textValue(value));}
function detectDelimiter(input){
const counts={',':0,';':0,'\t':0};let quoted=false;
for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"')i++;else quoted=!quoted;}else if(!quoted){if(c==='\n'||c==='\r')break;if(c in counts)counts[c]++;}}
return Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0];
}
function parseCSV(input,delimiter){
if(typeof input!=='string')fail('CSV input must be text.');
if(input.length>LIMITS.characters)fail('CSV exceeds the 5 million character limit.');
let source=input.replace(/^\uFEFF/,'');
if(!source.trim())fail('The CSV is empty.');
if(source.indexOf('\0')!==-1)fail('CSV contains a null character.');
delimiter=delimiter||detectDelimiter(source);
if([',',';','\t'].indexOf(delimiter)===-1)fail('Delimiter must be comma, semicolon, or tab.');
let records=[],lines=[],row=[],field='',inQuotes=false,closed=false,line=1,rowStart=1;
function pushField(){if(field.length>LIMITS.field)fail('A field exceeds 12,000 characters near line '+rowStart+'.');row.push(field);if(row.length>LIMITS.columns)fail('CSV exceeds 80 columns.');field='';closed=false;}
function pushRow(){pushField();if(row.some(function(x){return x.trim()!=='';})){records.push(row);lines.push(rowStart);if(records.length>LIMITS.rows+1)fail('CSV exceeds the 1,000 product limit.');}row=[];}
for(let i=0;i<source.length;i++){
const c=source[i];
if(inQuotes){
if(c==='"'){if(source[i+1]==='"'){field+='"';i++;}else{inQuotes=false;closed=true;}}
else if(c==='\r'){if(source[i+1]==='\n')i++;field+='\n';line++;}
else{field+=c;if(c==='\n')line++;}
}else if(c===delimiter){pushField();}
else if(c==='\n'||c==='\r'){pushRow();if(c==='\r'&&source[i+1]==='\n')i++;line++;rowStart=line;}
else if(c==='"'){if(field||closed)fail('Unexpected quote on line '+line+'.');inQuotes=true;}
else{if(closed)fail('Unexpected text after a closing quote on line '+line+'.');field+=c;}
if(field.length>LIMITS.field)fail('A field exceeds 12,000 characters near line '+rowStart+'.');
}
if(inQuotes)fail('Unclosed quoted field near line '+rowStart+'.');
if(field||row.length||closed)pushRow();
if(records.length<2)fail('Add a header and at least one product row.');
const headers=records[0].map(function(x){return textValue(x);});
if(headers.some(function(x){return !x;}))fail('Every column needs a header.');
const keys=headers.map(headerKey);
if(new Set(keys).size!==keys.length)fail('Duplicate column headers. Rename them before importing.');
records.slice(1).forEach(function(r,i){if(r.length!==headers.length)fail('Line '+lines[i+1]+' has '+r.length+' fields; expected '+headers.length+'.');});
return {headers:headers,rows:records.slice(1),lines:lines.slice(1),delimiter:delimiter};
}
function autoMap(headers){
const mapping={};
FIELDS.forEach(function(field){const matches=headers.filter(function(h){return ALIASES[field].indexOf(headerKey(h))!==-1;});mapping[field]=matches.length===1?matches[0]:'';});
return mapping;
}
function parsePrice(value){
let s=textValue(value);
if(!s)return null;
if(s[0]==='$')s=s.slice(1);
if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s))fail('Use a nonnegative USD amount, for example 12.50 or 1,234.50.');
s=s.replace(/,/g,'');const parts=s.split('.');
const cents=Number(parts[0])*100+Number(((parts[1]||'')+'00').slice(0,2));
if(!Number.isSafeInteger(cents)||cents>999999999)fail('Price exceeds $9,999,999.99.');
return cents;
}
function formatPrice(cents){return cents===null?'Price on request':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);}
function safeImageName(value){const s=textValue(value);return !s||(/^[^\\/:*?"<>|\u0000-\u001f]{1,160}$/.test(s)&&s!=='.'&&s!=='..'&&!s.startsWith('.'));}
function isRasterDataURL(value){return typeof value==='string'&&value.length<=LIMITS.assetCharacters&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);}
function own(object,key){return Object.prototype.hasOwnProperty.call(object||{},key);}
function audit(table,mapping,assets){
if(!table||!Array.isArray(table.headers)||!Array.isArray(table.rows))fail('Import a CSV first.');
if(table.rows.length>LIMITS.rows)fail('Too many products.');
const issues=[],products=[];
function issue(level,code,row,sku,field,message){issues.push({level:level,code:code,row:row,sku:sku,field:field,message:message});}
const active=Object.values(mapping||{}).filter(Boolean);
REQUIRED.forEach(function(field){if(!mapping||!mapping[field]||table.headers.indexOf(mapping[field])<0)issue('error','mapping',0,'',field,'Map the '+field+' column.');});
if(new Set(active).size!==active.length)issue('error','mapping',0,'','','Each source column can map to only one field.');
FIELDS.forEach(function(field){if(mapping&&mapping[field]&&table.headers.indexOf(mapping[field])<0)issue('error','mapping',0,'',field,'Mapped column does not exist.');});
if(issues.length)return {products:[],issues:issues,errors:issues.length,warnings:0,ready:false};
const indexes={};FIELDS.forEach(function(f){indexes[f]=table.headers.indexOf(mapping[f]);});
table.rows.forEach(function(row,i){
const p={sourceLine:table.lines[i],sourceIndex:i,cents:null};
FIELDS.forEach(function(f){p[f]=indexes[f]<0?'':textValue(row[indexes[f]]);});
REQUIRED.forEach(function(f){if(!meaningful(p[f]))issue('error','required',p.sourceLine,p.sku,f,'Missing '+f+'. Supply it from the client; do not guess.');});
FIELDS.forEach(function(f){if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(p[f]))issue('error','control',p.sourceLine,p.sku,f,'Remove unsupported control characters.');});
[['sku',80],['name',110],['category',70],['pack',65],['brand',80],['description',800]].forEach(function(spec){if(p[spec[0]].length>spec[1])issue('error','length',p.sourceLine,p.sku,spec[0],'Maximum '+spec[1]+' characters for '+spec[0]+'.');});
if(p.description.split('\n').length>10)issue('error','length',p.sourceLine,p.sku,'description','Description supports at most 10 lines; shorten the approved source without inventing facts.');
if(p.currency&&p.currency.toUpperCase()!=='USD')issue('error','currency',p.sourceLine,p.sku,'currency','Version 1 supports USD only; do not convert automatically.');
try{p.cents=parsePrice(p.price);}catch(e){issue('error','price',p.sourceLine,p.sku,'price',e.message);}
if(p.cents===null)issue('warning','no_price',p.sourceLine,p.sku,'price','No price supplied. Output will say "Price on request".');
if(!p.description)issue('warning','no_description',p.sourceLine,p.sku,'description','No description supplied. No description will be invented.');
if(!safeImageName(p.image))issue('error','image_path',p.sourceLine,p.sku,'image','Use a local image filename, not a URL or directory path.');
else if(p.image&&(!own(assets,p.image)||!isRasterDataURL(assets[p.image])))issue('warning','no_image',p.sourceLine,p.sku,'image','Image file not loaded. Output will show "Image not supplied".');
else if(!p.image)issue('warning','no_image',p.sourceLine,p.sku,'image','No approved image supplied. Output will show "Image not supplied".');
products.push(p);
});
const groups=new Map();
products.forEach(function(p){const key=p.sku.normalize('NFKC').toLowerCase();if(key){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}});
groups.forEach(function(group){if(group.length>1)group.forEach(function(p){issue('error','duplicate_sku',p.sourceLine,p.sku,'sku','Duplicate SKU, including case and compatibility variants.');});});
const errors=issues.filter(function(x){return x.level==='error';}).length;
return {products:products,issues:issues,errors:errors,warnings:issues.length-errors,ready:errors===0&&products.length>0};
}
function csvCell(value){let s=str(value);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function toCSV(rows){return rows.map(function(row){return row.map(csvCell).join(',');}).join('\r\n')+'\r\n';}
function normalizedCSV(products){return toCSV([FIELDS].concat(products.map(function(p){return FIELDS.map(function(f){return f==='price'?(p.cents===null?'':(p.cents/100).toFixed(2)):f==='currency'?'USD':p[f];});})));}
function issuesCSV(issues){const cols=['level','code','row','sku','field','message'];return toCSV([cols].concat(issues.map(function(x){return cols.map(function(k){return x[k];});})));}
function slug(value){return str(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'catalog';}
function normalizeBrand(input){
input=input||{};
const b={};
[['company','Your company',90],['title','Product collection',100],['edition','Current edition',60],['contact','',140],['terms','Prices in USD per stated selling unit. Confirm availability and current terms before ordering.',400]].forEach(function(spec){b[spec[0]]=textValue(input[spec[0]])||spec[1];if(b[spec[0]].length>spec[2])fail(spec[0]+' is too long.');});
b.color=/^#[0-9a-fA-F]{6}$/.test(input.color||'')?input.color:'#ba4c2f';
return b;
}
const printStyle=String.raw`*{box-sizing:border-box}body{margin:0;color:#202520;background:#edece7;font-family:Arial,Helvetica,sans-serif;line-height:1.5}button,input{font:inherit}.toolbar{position:sticky;top:0;z-index:9;display:flex;gap:12px;justify-content:center;padding:14px;background:#202520;color:white}.toolbar input{width:min(50vw,380px);padding:8px;border:0;border-radius:3px}.toolbar button{padding:8px 14px;border:1px solid #aaa;background:white;color:#202520;border-radius:3px;cursor:pointer}.page{background:#fff;width:210mm;min-height:277mm;margin:22px auto;padding:16mm;position:relative;page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}.cover{display:flex;min-height:277mm;flex-direction:column;justify-content:space-between;background:var(--accent);color:white}.kicker{text-transform:uppercase;letter-spacing:.16em;font-size:11px}.cover h1{font-size:55px;line-height:1.04;letter-spacing:-.035em;overflow-wrap:anywhere;margin:24px 0}.cover .company{font-size:21px}.cover .bottom{border-top:1px solid #ffffff70;padding-top:20px}.cover .count{font-size:75px;font-weight:700;letter-spacing:-.05em}.logo{max-width:190px;max-height:70px;object-fit:contain;align-self:flex-start}.note{font-size:12px;opacity:.85;max-width:40em}.sheethead{border-top:5px solid var(--accent);padding-top:13px;display:flex;gap:15px;justify-content:space-between;align-items:flex-start;margin-bottom:24px;overflow-wrap:anywhere}.sheethead h2{margin:0;font-size:27px;line-height:1.15}.sheethead small{max-width:45%;text-align:right;color:#666}.grid{display:grid;grid-template-columns:1fr 1fr;gap:25px 24px}.product{min-width:0;border-bottom:1px solid #d8dbd5;padding-bottom:18px;break-inside:avoid}.image{height:115px;background:#f3f4ef;display:flex;align-items:center;justify-content:center;color:#757a70;font-size:11px}.image img{display:block;max-width:100%;height:100%;object-fit:contain}.sku{font:11px monospace;color:#686d64;margin:13px 0 4px;overflow-wrap:anywhere}.product h3{margin:0;font-size:17px;line-height:1.22;overflow-wrap:anywhere}.description{font-size:11px;color:#60675f;white-space:pre-line;overflow-wrap:anywhere;margin:8px 0}.selling{margin-top:12px;font-size:11px;overflow-wrap:anywhere}.selling strong{font-size:19px;display:block}.manufacturer{font-size:10px;color:#60675f}.pagefoot{margin-top:25px;padding-top:13px;border-top:1px solid #d8dbd5;display:flex;justify-content:space-between;gap:16px;color:#686d64;font-size:9px;overflow-wrap:anywhere}.pagefoot span:first-child{max-width:85%}.watermark{padding:7px;background:#fff0c5;color:#5b4200;font-size:10px;letter-spacing:.08em;text-align:center;margin-bottom:14px}.cover .watermark{background:#0003;color:white}.price-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}.price-table th{padding:9px 6px;text-align:left;background:#f0f1eb;color:#4c5549}.price-table td{padding:11px 6px;border-bottom:1px solid #e4e6e0;overflow-wrap:anywhere;vertical-align:top}.price-table th:first-child{width:20%}.price-table th:nth-child(2){width:40%}.price-table th:nth-child(3){width:20%}.price-table th:last-child{width:20%;text-align:right}.price-table td:last-child{text-align:right;font-variant-numeric:tabular-nums}.muted{font-size:10px;color:#697064}.page [hidden]{display:none!important}@media(max-width:850px){.page{width:100%;min-height:0;margin:0 0 16px;padding:24px}.cover{min-height:75vh}.cover h1{font-size:clamp(36px,9vw,55px)}.grid{gap:20px 16px}}@media(max-width:450px){.grid{grid-template-columns:1fr}.toolbar{flex-wrap:wrap}.toolbar input{width:100%}}@page{size:A4;margin:10mm 0}@media print{body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.page{width:210mm;min-height:277mm;margin:0;padding:12mm 16mm;box-shadow:none}.cover{height:277mm}.grid{grid-template-columns:1fr 1fr}.product{break-inside:avoid}.page[hidden],.product[hidden],tr[hidden]{display:revert!important}}`;
function buildCatalog(products,branding,assets,settings){
settings=settings||{};assets=assets||{};
const brand=normalizeBrand(branding);
if(!Array.isArray(products)||!products.length)fail('No products to export.');
const seen=new Set();
products.forEach(function(p){if(!p||!REQUIRED.every(function(f){return meaningful(p[f]);})||p.cents!==null&&(!Number.isSafeInteger(p.cents)||p.cents<0||p.cents>999999999))fail('Invalid product; run validation before export.');const key=textValue(p.sku).normalize('NFKC').toLowerCase();if(seen.has(key))fail('Duplicate SKU in export.');seen.add(key);});
const mode=settings.mode==='prices'?'prices':'catalog';
const densityStyle=mode==='prices'&&settings.compactPrices===true?'.price-table{font-size:10.5px;line-height:1.4}.price-table td{padding:7px 6px}.price-table th{padding:8px 6px}.sheethead h2{font-size:22px}.sheethead{margin-bottom:18px}':'';
const draft=settings.draft!==false,demo=settings.demo===true;
const state=demo?'FICTIONAL DEMO • NOT FOR PRODUCT SELECTION OR ORDERS':draft?'DRAFT • FOR CUSTOMER REVIEW':'';
const stamp=state?'<div class="watermark">'+escaped(state)+'</div>':'';
const pageFooter=function(page){return '<footer class="pagefoot"><span>'+escaped(brand.terms)+'<br>'+escaped(brand.contact)+'</span><span>'+page+'</span></footer>';};
const logo=isRasterDataURL(settings.logo)?'<img class="logo" src="'+settings.logo+'" alt="'+escaped(brand.company)+' logo">':'';
let content='';
if(mode==='catalog')content='<section class="page cover">'+stamp+'<div>'+logo+'<div class="kicker">'+escaped(brand.edition)+'</div><div class="company">'+escaped(brand.company)+'</div><h1>'+escaped(brand.title)+'</h1></div><div class="bottom"><div class="count">'+products.length+'</div><div class="kicker">Products in this edition</div><p class="note">'+escaped(brand.contact)+'</p></div></section>';
const groups=new Map();products.forEach(function(p){if(!groups.has(p.category))groups.set(p.category,[]);groups.get(p.category).push(p);});
let page=mode==='catalog'?2:1;
groups.forEach(function(items,category){
const count=mode==='prices'?8:2;
for(let i=0;i<items.length;i+=count){
const chunk=items.slice(i,i+count);
let body='';
if(mode==='prices'){
body='<table class="price-table"><thead><tr><th scope="col">SKU</th><th scope="col">Product</th><th scope="col">Selling unit</th><th scope="col">USD / unit</th></tr></thead><tbody>'+chunk.map(function(p){return '<tr data-entry data-search="'+escaped([p.sku,p.name,p.category,p.description,p.brand].join(' ').toLowerCase())+'"><td>'+escaped(p.sku)+'</td><td>'+escaped(p.name)+'</td><td>'+escaped(p.pack)+'</td><td>'+(p.cents===null?'On request':escaped(formatPrice(p.cents)))+'</td></tr>';}).join('')+'</tbody></table>';
}else{
body='<div class="grid">'+chunk.map(function(p){const image=own(assets,p.image)&&isRasterDataURL(assets[p.image])?'<img src="'+assets[p.image]+'" alt="'+escaped(p.name)+'">':'<span>Image not supplied</span>';return '<article class="product" data-entry data-search="'+escaped([p.sku,p.name,p.category,p.description,p.brand].join(' ').toLowerCase())+'"><div class="image">'+image+'</div><div class="sku">'+escaped(p.sku)+'</div><h3>'+escaped(p.name)+'</h3>'+(p.brand?'<div class="manufacturer">'+escaped(p.brand)+'</div>':'')+(p.description?'<p class="description">'+escaped(p.description)+'</p>':'')+'<div class="selling"><strong>'+escaped(formatPrice(p.cents))+'</strong>Per '+escaped(p.pack)+'</div></article>';}).join('')+'</div>';
}
content+='<section class="page collection">'+stamp+'<header class="sheethead"><h2>'+escaped(category)+'</h2><small>'+escaped(brand.company)+'<br>'+escaped(brand.edition)+'</small></header>'+body+pageFooter(page++)+'</section>';
}});
const client=String.raw`(function(){'use strict';var input=document.getElementById('find'),previous='';function filter(q){q=q.toLowerCase();document.querySelectorAll('[data-entry]').forEach(function(el){el.hidden=el.dataset.search.indexOf(q)===-1;});document.querySelectorAll('.collection').forEach(function(el){el.hidden=!Array.from(el.querySelectorAll('[data-entry]')).some(function(x){return !x.hidden;});});document.getElementById('results').textContent=q?Array.from(document.querySelectorAll('[data-entry]')).filter(function(x){return !x.hidden;}).length+' matches':'';}input.addEventListener('input',function(){filter(input.value);});document.getElementById('print').addEventListener('click',function(){window.print();});window.addEventListener('beforeprint',function(){previous=input.value;filter('');});window.addEventListener('afterprint',function(){filter(previous);});})();`;
return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'"><meta name="referrer" content="no-referrer"><title>'+escaped(brand.company)+' — '+(mode==='prices'?'Price sheet':escaped(brand.title))+'</title><style>:root{--accent:'+brand.color+'}'+printStyle+densityStyle+'</style></head><body><div class="toolbar"><label for="find">Find a product</label><input id="find" type="search" placeholder="SKU, name, or category"><button id="print" type="button">Print / Save PDF</button><span id="results" aria-live="polite"></span></div>'+content+'<script>'+client+'</script></body></html>';
}
function releaseReady(result,approved){return Boolean(result&&result.ready&&approved===true);}
function manifest(table,mapping,result,branding,approved,settings){
const brand=normalizeBrand(branding);return {schemaVersion:1,engineVersion:VERSION,approved:releaseReady(result,approved),demo:Boolean(settings&&settings.demo),source:{headers:table.headers,rows:table.rows,physicalLines:table.lines,delimiter:table.delimiter},mapping:mapping,brand:brand,products:result.products,issues:result.issues,note:'Review record, not proof of customer approval. Formula-safe CSV can prefix an apostrophe; JSON retains source text. Image bytes are not included.'};
}
return Object.freeze({VERSION:VERSION,LIMITS:LIMITS,FIELDS:FIELDS,REQUIRED:REQUIRED,escaped:escaped,parseCSV:parseCSV,autoMap:autoMap,parsePrice:parsePrice,formatPrice:formatPrice,safeImageName:safeImageName,isRasterDataURL:isRasterDataURL,audit:audit,toCSV:toCSV,normalizedCSV:normalizedCSV,issuesCSV:issuesCSV,slug:slug,normalizeBrand:normalizeBrand,buildCatalog:buildCatalog,releaseReady:releaseReady,manifest:manifest});
});

