(function StudioApp(){
'use strict';
const C=window.CatalogCore;
const $=function(id){return document.getElementById(id);};
const state={table:null,mapping:{},result:null,assets:Object.create(null),logo:'',sourceName:'',demo:false,sourceRevision:0,assetRevision:0,pendingAssets:false,editing:false};
const defaultBrand={company:'Northline Supply',title:'Workshop essentials.',edition:'October 2026 • Sample edition',contact:'Fictional demonstration business • No orders accepted',terms:'Fictional sample products and prices. Not for ordering, engineering selection, or safety decisions.',color:'#ba4c2f'};
function say(message,isError){$('status').textContent=message;$('status').className=isError?'status error':'status';}
function clearApproval(){$('approved').checked=false;}
function invalidate(message){clearApproval();state.result=null;state.table=null;render();if(message)say(message);}
function brand(){const b={};['company','title','edition','contact','terms','color'].forEach(function(k){b[k]=$('brand-'+k).value;});return C.normalizeBrand(b);}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type:type||'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);}
function mapInputs(){
$('mappings').innerHTML=C.FIELDS.map(function(field){
return '<label class="mapping"><span>'+C.escaped(field)+(C.REQUIRED.includes(field)?' <b aria-label="required">*</b>':'')+'</span><select data-field="'+field+'"><option value="">Not supplied</option>'+state.table.headers.map(function(h){return '<option value="'+C.escaped(h)+'"'+(state.mapping[field]===h?' selected':'')+'>'+C.escaped(h)+'</option>';}).join('')+'</select></label>';
}).join('');
$('mappings').querySelectorAll('select').forEach(function(select){select.addEventListener('change',function(){state.mapping[select.dataset.field]=select.value;clearApproval();runAudit();});});
}
function importText(text,name,demo){
state.sourceName=name;state.demo=demo;state.assets=Object.create(null);state.logo='';state.assetRevision++;state.pendingAssets=false;clearApproval();
$('logo-file').value='';$('image-files').value='';
try{
const table=C.parseCSV(text,$('delimiter').value||undefined);
state.table=table;state.mapping=C.autoMap(table.headers);
mapInputs();runAudit();
}catch(e){state.table=null;state.result=null;$('mappings').textContent='Import a valid CSV to map columns.';render();say(e.message,true);}
}
function runAudit(){try{state.result=C.audit(state.table,state.mapping,state.assets);render();say(state.result.errors?state.result.errors+' blocking issue(s). Correct the source and validate again.':state.result.warnings?'Ready for draft export. Review '+state.result.warnings+' warning(s) before delivery.':'Data checks passed. Review a draft before final export.',state.result.errors>0);}catch(e){state.result=null;render();say(e.message,true);}}
function render(){
const a=state.result;
$('count-products').textContent=a?a.products.length:'—';
$('count-errors').textContent=a?a.errors:'—';
$('count-warnings').textContent=a?a.warnings:'—';
$('count-categories').textContent=a?new Set(a.products.map(function(p){return p.category;})).size:'—';
$('source-label').textContent=state.sourceName||'No file loaded';
$('demo-badge').hidden=!state.demo;
$('draft-badge').textContent=state.pendingAssets?'Checking images':a&&a.ready?'Ready for review':'Needs source review';
$('asset-count').textContent=Object.keys(state.assets).length+' product image(s) loaded'+(state.logo?' · Logo loaded':'');
const valid=Boolean(a&&a.ready&&!state.pendingAssets);
document.querySelectorAll('[data-requires-valid]').forEach(function(el){el.disabled=!valid;});
document.querySelectorAll('[data-requires-audit]').forEach(function(el){el.disabled=!a;});
$('approved').disabled=!valid;
$('final-catalog').disabled=!(valid&&C.releaseReady(a,$('approved').checked));
$('final-prices').disabled=!(valid&&C.releaseReady(a,$('approved').checked));
$('issue-body').innerHTML=a?(a.issues.length?a.issues.map(function(x){return '<tr><td><span class="severity '+x.level+'">'+x.level+'</span></td><td>'+C.escaped(x.row||'Mapping')+'</td><td class="mono">'+C.escaped(x.sku||'—')+'</td><td>'+C.escaped(x.field)+'</td><td>'+C.escaped(x.message)+'</td></tr>';}).join(''):'<tr><td colspan="5">No exceptions found. Customer review is still required.</td></tr>'):'<tr><td colspan="5">Validate the current source to see its exceptions.</td></tr>';
$('product-body').innerHTML=a?a.products.slice(0,60).map(function(p){return '<tr><td class="mono">'+C.escaped(p.sku)+'</td><td>'+C.escaped(p.name)+'</td><td>'+C.escaped(p.category)+'</td><td>'+C.escaped(p.pack)+'</td><td>'+C.escaped(C.formatPrice(p.cents))+'</td></tr>';}).join(''):'<tr><td colspan="5">No current validated products.</td></tr>';
$('preview-note').textContent=a&&a.products.length>60?'Showing the first 60 products. Exports include all '+a.products.length+'.':'Values come from the source. No product copy, ratings, or prices are invented.';
}
function exportDocument(mode,final){
try{
if(!state.result||!state.result.ready)throw Error('Resolve blocking source issues first.');
if(state.pendingAssets)throw Error('Wait for image import to finish before exporting.');
if(final&&!C.releaseReady(state.result,$('approved').checked))throw Error('Review and acknowledge all data and warnings before final export.');
const b=brand(),name=C.slug(b.company)+'-'+mode+(state.demo?'-fictional-demo':final?'-final':'-draft')+'.html';
const html=C.buildCatalog(state.result.products,b,state.assets,{mode:mode,draft:!final,demo:state.demo,logo:state.logo});
if(html.length>55000000)throw Error('Output is too large. Resize photos and import smaller versions.');
download(name,html,'text/html;charset=utf-8');say('Downloaded '+name+'. Open it in a browser to inspect, search, and save as PDF.');
}catch(e){say(e.message,true);}
}
async function readRaster(file){
if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Use PNG, JPEG, or WebP images. SVG and other formats are not accepted.');
if(file.size>10000000)throw Error('Image exceeds 10 MB. Resize it before importing.');
if(!C.safeImageName(file.name))throw Error('Rename the image to a plain local filename.');
const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
const webp=String.fromCharCode.apply(null,bytes.slice(0,4))==='RIFF'&&String.fromCharCode.apply(null,bytes.slice(8,12))==='WEBP';
if(!(file.type==='image/png'&&png||file.type==='image/jpeg'&&jpeg||file.type==='image/webp'&&webp))throw Error('Image bytes do not match its file type.');
const data=await new Promise(function(resolve,reject){const reader=new FileReader();reader.onerror=function(){reject(Error('Could not read image.'));};reader.onload=function(){resolve(reader.result);};reader.readAsDataURL(file);});
if(!C.isRasterDataURL(data))throw Error('Image data is invalid or too large.');
await new Promise(function(resolve,reject){const img=new Image();img.onerror=function(){reject(Error('Image could not be decoded.'));};img.onload=function(){if(img.naturalWidth>6000||img.naturalHeight>6000||img.naturalWidth*img.naturalHeight>20000000)reject(Error('Image dimensions are too large. Resize below 6000 px and 20 megapixels.'));else resolve();};img.src=data;});
return data;
}
function loadDemo(){
state.sourceRevision++;
$('csv-file').value='';
['company','title','edition','contact','terms','color'].forEach(function(k){$('brand-'+k).value=defaultBrand[k];});
$('csv-text').value=window.FIELDNOTE_DEMO_CSV;
importText(window.FIELDNOTE_DEMO_CSV,'Fictional sample · 12 products',true);
}
document.querySelectorAll('[data-view]').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('[data-panel]').forEach(function(p){p.hidden=p.dataset.panel!==button.dataset.view;});document.querySelectorAll('[data-view]').forEach(function(b){b.setAttribute('aria-current',b===button?'page':'false');});$('main-heading').textContent=button.dataset.view==='workbench'?'Catalog production.':button.dataset.view==='delivery'?'Release with evidence.':'Sell a finished result.';});});
$('load-demo').addEventListener('click',loadDemo);
$('validate').addEventListener('click',function(){state.sourceRevision++;importText($('csv-text').value,'Pasted / edited CSV',state.demo);});
$('csv-text').addEventListener('input',function(){state.sourceRevision++;invalidate('Source changed. Validate again before exporting.');});
$('delimiter').addEventListener('change',function(){state.sourceRevision++;invalidate('Delimiter changed. Validate the source again.');});
$('csv-file').addEventListener('change',async function(){
const file=this.files[0];if(!file)return;
const revision=++state.sourceRevision;invalidate('Reading CSV…');state.demo=false;state.sourceName=file.name;
try{
if(file.size>10000000)throw Error('CSV file exceeds 10 MB.');
const text=await file.text();if(revision!==state.sourceRevision)return;
$('csv-text').value=text;importText(text,file.name,false);
}catch(e){if(revision===state.sourceRevision)say(e.message,true);}
});
$('image-files').addEventListener('change',async function(){
if(!state.table){say('Import valid product data before matching photos.',true);return;}
state.pendingAssets=true;clearApproval();render();say('Checking image files…');
const revision=++state.assetRevision,sourceRevision=state.sourceRevision;const files=Array.from(this.files);
try{
const batch=Object.create(null);let total=Object.values(state.assets).reduce(function(sum,x){return sum+x.length;},0)+(state.logo?state.logo.length:0);
for(const file of files){
if(Object.prototype.hasOwnProperty.call(batch,file.name))throw Error('Two selected images share the filename '+file.name+'. Rename them.');
batch[file.name]=await readRaster(file);
total+=batch[file.name].length-(Object.prototype.hasOwnProperty.call(state.assets,file.name)?state.assets[file.name].length:0);
if(total>C.LIMITS.totalAssetCharacters)throw Error('Images exceed the 45 million character budget. Resize them first.');
}
if(revision!==state.assetRevision||sourceRevision!==state.sourceRevision)return;
state.pendingAssets=false;clearApproval();Object.keys(batch).forEach(function(k){state.assets[k]=batch[k];});runAudit();
}catch(e){if(revision===state.assetRevision&&sourceRevision===state.sourceRevision){state.pendingAssets=false;clearApproval();render();say(e.message,true);}}
});
$('logo-file').addEventListener('change',async function(){
const file=this.files[0];if(!file)return;
state.pendingAssets=true;clearApproval();render();say('Checking image files…');const revision=++state.assetRevision,sourceRevision=state.sourceRevision;
try{
const data=await readRaster(file);
if(revision!==state.assetRevision||sourceRevision!==state.sourceRevision)return;
const total=Object.values(state.assets).reduce(function(sum,x){return sum+x.length;},0)+data.length;
if(total>C.LIMITS.totalAssetCharacters)throw Error('Combined image budget exceeded. Resize images first.');
state.pendingAssets=false;clearApproval();state.logo=data;render();say('Logo loaded. Review the exported draft before release.');
}catch(e){if(revision===state.assetRevision&&sourceRevision===state.sourceRevision){state.pendingAssets=false;clearApproval();render();say(e.message,true);}}
});
$('clear-images').addEventListener('click',function(){state.assetRevision++;state.pendingAssets=false;state.assets=Object.create(null);state.logo='';$('image-files').value='';$('logo-file').value='';clearApproval();if(state.table)runAudit();else render();});
$('brand-form').addEventListener('input',function(){clearApproval();render();});
$('approved').addEventListener('change',render);
$('draft-catalog').addEventListener('click',function(){exportDocument('catalog',false);});
$('draft-prices').addEventListener('click',function(){exportDocument('prices',false);});
$('final-catalog').addEventListener('click',function(){exportDocument('catalog',true);});
$('final-prices').addEventListener('click',function(){exportDocument('prices',true);});
$('clean-csv').addEventListener('click',function(){if(state.result&&state.result.ready)download('products-cleaned.csv',C.normalizedCSV(state.result.products),'text/csv;charset=utf-8');});
$('exceptions-csv').addEventListener('click',function(){if(state.result)download('exceptions.csv',C.issuesCSV(state.result.issues),'text/csv;charset=utf-8');});
$('review-json').addEventListener('click',function(){try{if(state.result)download('review-record.json',JSON.stringify(C.manifest(state.table,state.mapping,state.result,brand(),$('approved').checked,{demo:state.demo}),null,2),'application/json');}catch(e){say(e.message,true);}});
$('template-csv').addEventListener('click',function(){download('product-intake-template.csv',C.toCSV([C.FIELDS,['YOUR-SKU','Product name','Category','Client-approved description','12.50','box of 10','photo.jpg','Manufacturer','USD']]),'text/csv;charset=utf-8');});
$('engine-tests').addEventListener('click',function(){
try{const report=window.CatalogTestSuite(C);$('test-result').textContent=report.passed+' / '+report.total+' engine checks passed. '+(report.failed.length?JSON.stringify(report.failed):'Browser layout, downloads, and PDF appearance still require manual checks.');}catch(e){$('test-result').textContent=e.message;}
});
$('reset').addEventListener('click',function(){
state.sourceRevision++;state.assetRevision++;state.pendingAssets=false;state.table=null;state.mapping={};state.result=null;state.assets=Object.create(null);state.logo='';state.sourceName='';state.demo=false;
$('csv-text').value='';$('csv-file').value='';$('image-files').value='';$('logo-file').value='';$('mappings').textContent='Import a valid CSV to map columns.';clearApproval();render();say('Session cleared. Downloaded files are still on your device.');
});
window.addEventListener('beforeunload',function(e){if(state.table&&!state.demo){e.preventDefault();e.returnValue='';}});
loadDemo();
})();
