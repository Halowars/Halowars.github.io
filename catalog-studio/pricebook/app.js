(function PricebookApp(){
'use strict';
const C=window.CatalogCore,P=window.PricebookCore,$=id=>document.getElementById(id),esc=C.escaped;
const state={mapping:null,report:null,assets:Object.create(null),logo:'',baseline:'',baselineName:'',baselineError:false,sourceName:'',demo:false,epoch:0,assetEpoch:0,busy:false,dirty:false};
const brandFields=['company','title','edition','contact','terms','color'];
const sampleBrand={company:'Northline Supply',title:'Workshop essentials.',edition:'October 2026 · Sample',contact:'Fictional demonstration business · No orders accepted',terms:'Fictional products and prices. Not for orders, product selection or engineering decisions.',color:'#245847'};
function say(text,error){$('status').textContent=text;$('status').className=error?'error':'';}
function resetReview(){ $('reviewed').checked=false;$('changes-reviewed').checked=false; }
function touch(){state.dirty=true;resetReview();}
function invalidate(message){touch();state.report=null;render();if(message)say(message);}
function cancelReads(){state.epoch++;state.assetEpoch++;state.busy=false;}
function rawBrand(){const b={};brandFields.forEach(k=>{b[k]=$('brand-'+k).value;});return b;}
function inputRules(){
 const tiers=$('tiers').value.trim().split('\n').filter(s=>s.trim()).map(line=>{const i=line.lastIndexOf('|');if(i<0)throw Error('Each dealer tier needs a name | discount, for example Trade | 10.00.');return {name:line.slice(0,i).trim(),discount:line.slice(i+1).trim()};});
 return {margin:$('margin').value,change:$('change').value,tiers};
}
function tierIndex(){return Number($('selected-tier').value);}
function finalReady(){return Boolean(state.report&&state.report.result.ready&&!state.busy&&$('reviewed').checked&&(!state.report.changes.length||$('changes-reviewed').checked));}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type:type||'text/plain;charset=utf-8'}));const a=document.createElement('a');a.download=name;a.href=url;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function readUTF8(file){const bytes=await file.arrayBuffer();try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('File must be valid UTF-8. Export a CSV UTF-8 copy and try again.');}}
function guarded(fn){return async function(){try{await fn.call(this);}catch(e){say(e.message,true);}};}
function maps(){
 const table=C.parseCSV($('source-text').value,$('delimiter').value||undefined);state.mapping=state.mapping||P.autoMap(table.headers);
 $('mappings').innerHTML=P.FIELDS.map(f=>'<label>'+esc(f)+(C.REQUIRED.includes(f)||['price','cost'].includes(f)?' <b>*</b>':'')+'<select data-field="'+f+'"><option value="">Not supplied</option>'+table.headers.map(h=>'<option value="'+esc(h)+'"'+(state.mapping[f]===h?' selected':'')+'>'+esc(h)+'</option>').join('')+'</select></label>').join('');
 $('mappings').querySelectorAll('select').forEach(el=>el.addEventListener('change',()=>{state.mapping[el.dataset.field]=el.value;touch();run();}));
}
function run(){
 resetReview();
 try{if(state.baselineError)throw Error('Previous edition failed to load. Import a valid file or explicitly remove the comparison.');state.report=P.audit($('source-text').value,state.mapping,state.assets,inputRules(),state.baseline,$('delimiter').value);render();say(state.report.result.errors?state.report.result.errors+' blocking issue(s). Correct the source or rules before creating customer files.':'Checks complete. Review warnings and inspect a proof for every price tier.',state.report.result.errors>0);}
 catch(e){state.report=null;render();say(e.message,true);}
}
function validate(){touch();try{maps();run();}catch(e){state.report=null;render();say(e.message,true);}}
function render(){
 const r=state.report,a=r&&r.result,valid=Boolean(a&&a.ready&&!state.busy);
 $('n-products').textContent=a?a.products.length:'—';$('n-tiers').textContent=r?r.tiers.length:'—';$('n-errors').textContent=a?a.errors:'—';$('n-warnings').textContent=a?a.warnings:'—';
 $('source-name').textContent=state.sourceName||'No source imported';$('demo').hidden=!state.demo;$('baseline-name').textContent=state.baselineName||'No previous edition loaded.';
 $('review-state').textContent=state.busy?'Reading files…':finalReady()?'Reviewed for release':'Review required';
 $('photo-count').textContent=Object.keys(state.assets).length+' product photo(s)'+(state.logo?' · Logo loaded':'');
 for(const id of ['draft-catalog','draft-prices','public-csv'])$(id).disabled=!valid;
 for(const id of ['final-catalog','final-prices'])$(id).disabled=!finalReady();
 $('reviewed').disabled=!valid;$('changes-reviewed').disabled=!(valid&&r.changes.length);
 for(const id of ['issues-csv','changes-csv','review-record','internal-master'])$(id).disabled=!r||state.busy;
 $('save-project').disabled=state.busy||!$('source-text').value.trim();
 for(const id of ['photos','logo'])$(id).disabled=state.busy||!a;
 const oldTier=$('selected-tier').value;
 $('selected-tier').innerHTML=r?r.tiers.map((t,i)=>'<option value="'+i+'">'+esc(t.name)+' · '+(t.discountBps/100).toFixed(2)+'% discount</option>').join(''):'<option value="0">Validate data first</option>';
 if(r&&r.tiers[Number(oldTier)])$('selected-tier').value=oldTier;
 $('issues').innerHTML=a?(a.issues.length?a.issues.slice(0,500).map(i=>'<tr><td><span class="level '+i.level+'">'+i.level+'</span></td><td>'+esc(i.row||'Mapping')+'</td><td class="mono">'+esc(i.sku||'—')+'</td><td>'+esc(i.field)+'</td><td>'+esc(i.message)+'</td></tr>').join(''):'<tr><td colspan="5">No issues found. Source and output review is still required.</td></tr>'):'<tr><td colspan="5">Validate the current source to see its checks.</td></tr>';
 $('audit-summary').textContent=a?(a.issues.length>500?'Showing the first 500 issues. The internal CSV includes all '+a.issues.length+'.':a.errors+' blocking issues · '+a.warnings+' warnings. All '+a.products.length+' products and '+r.tiers.length+' tiers checked.'):'Validate data to see the current checks.';
 $('changes-summary').textContent=r&&r.hasBaseline?'Edition comparison · '+r.changes.length+' changed, added or removed SKU(s)':'Edition comparison · No previous edition';
 $('changes').innerHTML=r&&r.hasBaseline?(r.changes.length?r.changes.slice(0,500).map(d=>'<tr><td>'+d.kind+'</td><td>'+esc(d.sku)+'</td><td>'+esc(d.fields.join(', '))+'</td><td>'+esc(d.oldCents===null?'—':C.formatPrice(d.oldCents))+'</td><td>'+esc(d.newCents===null?'—':C.formatPrice(d.newCents))+'</td></tr>').join(''):'<tr><td colspan="5">No source values changed. Pricing rules are reviewed separately.</td></tr>'):'<tr><td colspan="5">Import a previous full CSV or project to compare.</td></tr>';
 $('price-head').innerHTML=r?'<tr><th>SKU</th><th>Selling unit</th><th>Internal cost</th>'+r.tiers.map(t=>'<th>'+esc(t.name)+'</th>').join('')+'</tr>':'';
 $('price-rows').innerHTML=r?r.result.products.slice(0,40).map((p,i)=>'<tr><td>'+esc(p.sku)+'</td><td>'+esc(p.pack)+'</td><td>'+esc(C.formatPrice(p.costCents))+'</td>'+r.tiers.map(t=>'<td>'+esc(C.formatPrice(t.rows[i].cents))+'</td>').join('')+'</tr>').join(''):'';
}
function exportBook(mode,final){
 if(state.busy)throw Error('Wait for file validation to finish.');
 if(final&&!finalReady())throw Error('Complete the current release review first.');
 if(!state.report||!state.report.result.ready)throw Error('Resolve blocking issues before exporting.');
 const i=tierIndex(),tier=state.report.tiers[i],brand=rawBrand();
 const out=P.customerHTML(state.report,i,brand,state.assets,{mode,draft:!final,demo:state.demo,logo:state.logo});
 if(out.length>55000000)throw Error('Customer file is too large. Resize photos before exporting.');
 const name=C.slug(brand.company)+'-'+(i+1)+'-'+C.slug(tier.name)+'-'+mode+(state.demo?'-fictional-demo':final?'-final':'-draft')+'.html';
 download(name,out,'text/html;charset=utf-8');say('Downloaded '+name+'. Open and inspect the HTML, then print to PDF.');
}
async function decodeRaster(data){
 if(!C.isRasterDataURL(data))throw Error('Invalid photo data.');
 const type=data.slice(5,data.indexOf(';')),raw=atob(data.slice(data.indexOf(',')+1)),b=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(b.length>10000000)throw Error('Image exceeds 10 MB.');
 const png=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;
 const jpeg=b[0]===255&&b[1]===216&&b[2]===255;
 const webp=String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
 if(!(type==='image/png'&&png||type==='image/jpeg'&&jpeg||type==='image/webp'&&webp))throw Error('Image bytes do not match its file type.');
 await new Promise((resolve,reject)=>{const img=new Image();img.onerror=()=>reject(Error('Image could not be decoded.'));img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth>6000||img.naturalHeight>6000||img.naturalWidth*img.naturalHeight>20000000)reject(Error('Image dimensions exceed 6,000 px or 20 megapixels.'));else resolve();};img.src=data;});
 return data;
}
async function readPhoto(f){
 if(!['image/png','image/jpeg','image/webp'].includes(f.type)||!C.safeImageName(f.name))throw Error('Use named local PNG, JPEG or WebP images.');
 if(f.size>10000000)throw Error('Image exceeds 10 MB.');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Could not read image.'));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(f);});
 return decodeRaster(data);
}
async function photos(isLogo,files){
 if(state.busy)throw Error('Wait for the current file operation to finish.');
 if(!state.report)throw Error('Validate product data before importing photos.');
 const epoch=state.epoch,token=++state.assetEpoch;state.busy=true;touch();render();say('Checking photos…');
 try{
  const next=Object.assign(Object.create(null),state.assets);let logo=state.logo;const names=new Set();
  for(const f of files){if(names.has(f.name))throw Error('Two photos share a filename. Rename them.');names.add(f.name);const d=await readPhoto(f);if(isLogo)logo=d;else next[f.name]=d;}
  const total=Object.values(next).reduce((n,d)=>n+d.length,0)+logo.length;
  if(total>C.LIMITS.totalAssetCharacters)throw Error('Photo budget exceeded. Resize photos first.');
  if(epoch!==state.epoch||token!==state.assetEpoch)return;
  state.assets=next;state.logo=logo;state.busy=false;run();
 }catch(e){if(epoch===state.epoch&&token===state.assetEpoch){state.busy=false;render();say(e.message,true);}}
}
function loadSample(){
 cancelReads();state.assets=Object.create(null);state.logo='';state.baseline='';state.baselineName='';state.baselineError=false;state.sourceName='Fictional sample · 12 products';state.demo=true;state.mapping=null;
 $('source-text').value=window.PRICEBOOK_DEMO;$('delimiter').value='';$('margin').value='20.00';$('change').value='20.00';$('tiers').value='Trade | 10.00\nPartner | 15.00';
 brandFields.forEach(k=>$('brand-'+k).value=sampleBrand[k]);for(const id of ['source-file','baseline-file','photos','logo','restore-project'])$(id).value='';
 validate();state.dirty=false;
}
$('brand-form').addEventListener('submit',e=>e.preventDefault());
$('source-text').addEventListener('input',()=>{cancelReads();state.mapping=null;invalidate('Source changed. Validate current data before exporting.');});
$('delimiter').addEventListener('change',()=>{cancelReads();state.mapping=null;invalidate('Separator changed. Validate current data again.');});
for(const id of ['margin','change','tiers'])$(id).addEventListener('input',()=>invalidate('Pricing rules changed. Check these rules before exporting.'));
$('brand-form').addEventListener('input',()=>{touch();render();});
$('validate').addEventListener('click',validate);$('apply-rules').addEventListener('click',validate);
for(const id of ['reviewed','changes-reviewed'])$(id).addEventListener('change',render);
$('source-file').addEventListener('change',guarded(async function(){
 const f=this.files[0];if(!f)return;cancelReads();const epoch=state.epoch;state.sourceName=f.name;state.demo=false;state.mapping=null;state.busy=true;$('source-text').value='';invalidate('Reading product CSV…');
 try{if(f.size>10000000)throw Error('CSV exceeds 10 MB.');
 const text=await readUTF8(f);if(epoch!==state.epoch)return;
 state.assets=Object.create(null);state.logo='';$('photos').value='';$('logo').value='';$('source-text').value=text;state.busy=false;validate();}
 catch(e){if(epoch===state.epoch){state.busy=false;state.report=null;render();say(e.message,true);}}
}));
$('baseline-file').addEventListener('change',guarded(async function(){
 const f=this.files[0];if(!f)return;cancelReads();const epoch=state.epoch;state.baseline='';state.baselineName=f.name;state.baselineError=true;state.busy=true;invalidate('Reading previous edition…');
 try{if(f.size>P.MAX_PROJECT)throw Error('Previous edition file exceeds the size limit.');const text=await readUTF8(f);if(epoch!==state.epoch)return;state.baseline=f.name.toLowerCase().endsWith('.json')?P.makeBaseline(text):text;state.baselineError=false;state.busy=false;validate();}
 catch(e){if(epoch===state.epoch){state.busy=false;state.baseline='';state.baselineName='Previous edition failed to load. Choose it again.';state.report=null;render();say(e.message,true);}}
}));
$('clear-baseline').addEventListener('click',()=>{cancelReads();state.baseline='';state.baselineName='';state.baselineError=false;$('baseline-file').value='';validate();});
$('photos').addEventListener('change',guarded(async function(){if(this.files.length)await photos(false,Array.from(this.files));this.value='';}));
$('logo').addEventListener('change',guarded(async function(){if(this.files.length)await photos(true,[this.files[0]]);this.value='';}));
$('clear-photos').addEventListener('click',()=>{state.assetEpoch++;state.busy=false;state.assets=Object.create(null);state.logo='';$('photos').value='';$('logo').value='';touch();run();});
for(const mode of ['catalog','prices']){ $('draft-'+mode).addEventListener('click',guarded(()=>exportBook(mode,false)));$('final-'+mode).addEventListener('click',guarded(()=>exportBook(mode,true))); }
$('public-csv').addEventListener('click',guarded(()=>{if(state.busy)throw Error('Wait for file validation.');const i=tierIndex(),products=P.publicProducts(state.report,i);download('customer-'+(i+1)+'-'+C.slug(state.report.tiers[i].name)+(state.demo?'-fictional-demo':finalReady()?'-reviewed':'-draft')+'.csv',C.normalizedCSV(products),'text/csv;charset=utf-8');}));
$('issues-csv').addEventListener('click',guarded(()=>{if(state.report)download('INTERNAL-issues.csv',C.issuesCSV(state.report.result.issues),'text/csv;charset=utf-8');}));
$('changes-csv').addEventListener('click',guarded(()=>{if(state.report)download('INTERNAL-edition-changes.csv',P.changesCSV(state.report),'text/csv;charset=utf-8');}));
$('internal-master').addEventListener('click',guarded(()=>download('INTERNAL-master-with-costs.csv',P.masterCSV(state.report),'text/csv;charset=utf-8')));
$('review-record').addEventListener('click',guarded(()=>{if(!state.report)return;download('INTERNAL-review-record.json',JSON.stringify({format:'fieldnote-review',version:2,engine:P.VERSION,demo:state.demo,reviewed:finalReady(),rules:state.report.rules,brand:C.normalizeBrand(rawBrand()),products:state.report.result.products,issues:state.report.result.issues,changes:state.report.changes,note:'Local operator review; not a signature, customer consent, tamper-evident record or independent verification of supplied data.'},null,2),'application/json');}));
$('save-project').addEventListener('click',guarded(()=>{
 if(state.busy)throw Error('Wait for file validation before saving.');
 if(state.baselineError)throw Error('Resolve the failed previous-edition import before saving this project.');const source=$('source-text').value,mapping=state.mapping||P.autoMap(C.parseCSV(source,$('delimiter').value||undefined).headers);
 const text=P.project({source,mapping,delimiter:$('delimiter').value,baseline:state.baseline,rules:inputRules(),brand:rawBrand(),assets:state.assets,logo:state.logo,demo:state.demo});
 download('INTERNAL-'+C.slug(rawBrand().company)+'.pricebook.json',text,'application/json');state.dirty=false;say('Project backup downloaded. It contains internal costs and photos. Keep it private.');
}));
$('restore-project').addEventListener('change',guarded(async function(){
 const f=this.files[0];if(!f)return;cancelReads();const epoch=state.epoch;state.busy=true;invalidate('Checking saved project and photos…');
 try{
  if(f.size>P.MAX_PROJECT)throw Error('Project file exceeds the size limit.');const text=await readUTF8(f);const o=P.restore(text);
  for(const data of Object.values(o.assets))await decodeRaster(data);if(o.logo)await decodeRaster(o.logo);
  if(epoch!==state.epoch)return;
  $('source-text').value=o.source;$('delimiter').value=o.delimiter;state.mapping=o.mapping;state.baseline=o.baseline;state.baselineName=o.baseline?'Previous edition restored from project':'';state.baselineError=false;
  state.assets=Object.assign(Object.create(null),o.assets);state.logo=o.logo;state.demo=o.demo;state.sourceName=f.name;
  $('margin').value=o.rules.margin;$('change').value=o.rules.change;$('tiers').value=o.rules.tiers.map(t=>t.name+' | '+t.discount).join('\n');brandFields.forEach(k=>$('brand-'+k).value=o.brand[k]);
  for(const id of ['source-file','baseline-file','photos','logo'])$(id).value='';state.busy=false;validate();state.dirty=false;say('Project restored and rechecked. Release review has been cleared. Inspect each tier before publishing.');
 }catch(e){if(epoch===state.epoch){state.busy=false;state.report=null;render();say('Project was not restored: '+e.message,true);}}
 this.value='';
}));
$('template').addEventListener('click',()=>download('product-pricebook-template.csv',C.toCSV([P.FIELDS,['YOUR-SKU','Approved product name','Category','Approved product description','100.00','box of 10','approved-photo.jpg','Manufacturer','USD','50.00']]),'text/csv;charset=utf-8'));
$('sample').addEventListener('click',()=>{if(state.dirty&&!window.confirm('Replace this workspace with the fictional sample? Save a project backup first to keep your work.'))return;loadSample();});
$('clear').addEventListener('click',()=>{
 if(state.dirty&&!window.confirm('Clear this workspace? Unsaved changes will be lost.'))return;
 cancelReads();state.mapping=null;state.report=null;state.assets=Object.create(null);state.logo='';state.baseline='';state.baselineName='';state.baselineError=false;state.sourceName='';state.demo=false;state.dirty=false;resetReview();
 for(const id of ['source-text','source-file','baseline-file','photos','logo','restore-project'])$(id).value='';$('mappings').textContent='Import data to select columns.';render();say('Workspace cleared. Downloaded files remain on your device.');
});
window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
loadSample();
})();
