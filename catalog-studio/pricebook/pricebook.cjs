/* Local, deterministic pricebook calculations. No network or runtime dependencies. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../core.cjs'));else root.PricebookCore=factory(root.CatalogCore);})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const VERSION='0.2.0';
const MAX_PROJECT=65000000;
const FIELDS=Object.freeze(C.FIELDS.concat(['cost']));
const key=x=>String(x||'').normalize('NFKC').toLowerCase().trim();
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
function fail(s){throw Error(s);}
function plain(o){return o!==null&&typeof o==='object'&&!Array.isArray(o);}
function percent(value,max){
 const s=String(value).trim();
 if(!/^\d{1,3}(?:\.\d{1,2})?$/.test(s))fail('Use a percentage with at most two decimal places.');
 const bps=C.parsePrice(s);
 if(bps>max)fail('Percentage is outside its permitted range.');
 return bps;
}
function rules(input){
 input=input||{};
 const floorBps=percent(input.margin===undefined?'20':input.margin,9900);
 const changeBps=percent(input.change===undefined?'20':input.change,10000);
 const extra=input.tiers===undefined?[]:input.tiers;
 if(!Array.isArray(extra)||extra.length>4)fail('Use at most four dealer tiers in addition to List.');
 const tiers=[{name:'List',discountBps:0}];const names=new Set(['list']);
 extra.forEach(t=>{
  if(!plain(t)||typeof t.name!=='string')fail('Each tier needs a name and discount.');
  const name=t.name.normalize('NFC').trim();
  if(!name||name.length>40||/[\u0000-\u001f\u007f]/.test(name))fail('Tier names must contain 1–40 ordinary characters.');
  if(names.has(key(name)))fail('Tier names must be unique, including List.');
  names.add(key(name));tiers.push({name,discountBps:percent(t.discount,10000)});
 });
 return {floorBps,changeBps,tiers};
}
function discount(cents,bps){
 if(!Number.isSafeInteger(cents)||cents<0||cents>999999999||!Number.isInteger(bps)||bps<0||bps>10000)fail('Invalid price or discount.');
 return Number((BigInt(cents)*BigInt(10000-bps)+5000n)/10000n);
}
function floorPrice(cost,bps){return Number((BigInt(cost)*10000n+BigInt(10000-bps)-1n)/BigInt(10000-bps));}
function marginText(sell,cost){return sell===0?'Undefined (zero price)':((sell-cost)*100/sell).toFixed(2)+'%';}
function autoMap(headers){
 const m=C.autoMap(headers);
 const matches=headers.filter(h=>['cost','unit cost','landed cost','cost usd'].includes(key(h).replace(/[_-]+/g,' ').replace(/\s+/g,' ')));
 m.cost=matches.length===1?matches[0]:'';return m;
}
function dataset(source,mapping,assets,delimiter){
 const table=C.parseCSV(source,delimiter||undefined);mapping=mapping||autoMap(table.headers);
 const baseMap={};C.FIELDS.forEach(f=>{baseMap[f]=mapping[f]||'';});
 const a=C.audit(table,baseMap,assets||{});
 function issue(level,code,p,field,message){a.issues.push({level,code,row:p?p.sourceLine:0,sku:p?p.sku:'',field,message});}
 const index=table.headers.indexOf(mapping.cost);
 if(index<0)issue('error','cost_mapping',null,'cost','Map the internal cost column. Costs are required for margin checks.');
 else if(Object.values(baseMap).includes(mapping.cost))issue('error','cost_mapping',null,'cost','Cost must use its own source column.');
 a.products.forEach(p=>{
  p.costCents=null;
  if(index>=0){try{p.costCents=C.parsePrice(table.rows[p.sourceIndex][index]);if(p.costCents===null)issue('error','missing_cost',p,'cost','Supply a cost per the same selling unit as the list price.');else if(p.costCents===0)issue('warning','zero_cost',p,'cost','Zero cost supplied. Verify this is intentional.');}catch(e){issue('error','invalid_cost',p,'cost',e.message);}}
  if(p.cents===null)issue('error','missing_price',p,'price','Supply a numeric list price. This pricebook requires priced products.');
 });
 a.errors=a.issues.filter(i=>i.level==='error').length;a.warnings=a.issues.length-a.errors;a.ready=a.errors===0&&a.products.length>0;
 return {table,mapping,result:a};
}
function compare(before,after,threshold){
 const old=new Map(before.map(p=>[key(p.sku),p]));const current=new Set();const changes=[];
 after.forEach(p=>{
  const k=key(p.sku),prev=old.get(k);current.add(k);
  if(!prev){changes.push({kind:'added',sku:p.sku,line:p.sourceLine,fields:['new SKU'],oldCents:null,newCents:p.cents,large:false});return;}
  const fields=C.FIELDS.filter(f=>f==='price'?prev.cents!==p.cents:prev[f]!==p[f]);
  if(prev.costCents!==p.costCents)fields.push('cost');
  if(fields.length){const large=prev.cents===0?p.cents!==0:Math.abs(p.cents-prev.cents)*10000>prev.cents*threshold;
   changes.push({kind:'changed',sku:p.sku,line:p.sourceLine,fields,oldCents:prev.cents,newCents:p.cents,oldCost:prev.costCents,newCost:p.costCents,large});}
 });
 before.forEach(p=>{if(!current.has(key(p.sku)))changes.push({kind:'removed',sku:p.sku,line:0,fields:['removed SKU'],oldCents:p.cents,newCents:null,large:false});});
 return changes;
}
function parseBaseline(text){
 if(text.trim().startsWith('{')){let b;try{b=JSON.parse(text);}catch{fail('Invalid previous-edition data.');}
  if(!plain(b)||b.format!=='fieldnote-baseline'||typeof b.source!=='string'||!plain(b.mapping)||typeof b.delimiter!=='string')fail('Invalid previous-edition data.');
  C.parseCSV(b.source,b.delimiter||undefined);return b;
 }
 return {source:text,mapping:null,delimiter:''};
}
function makeBaseline(projectText){const o=restore(projectText);return JSON.stringify({format:'fieldnote-baseline',source:o.source,mapping:o.mapping,delimiter:o.delimiter});}
function audit(source,mapping,assets,inputRules,baseline,delimiter){
 const parsed=dataset(source,mapping,assets,delimiter),r=rules(inputRules),a=parsed.result;
 let changes=[],previous=null;
 if(baseline){
  const b=parseBaseline(baseline);previous=dataset(b.source,b.mapping,{},b.delimiter);
  // Baseline photos are irrelevant. Structural and monetary errors still block comparison.
  if(previous.result.errors)previous.result.issues.filter(i=>i.level==='error').forEach(i=>a.issues.push({...i,code:'baseline_'+i.code,message:'Previous edition: '+i.message}));
  else changes=compare(previous.result.products,a.products,r.changeBps);
 }
 const tiers=r.tiers.map(t=>({...t,rows:a.products.map(p=>({sku:p.sku,cents:p.cents===null?null:discount(p.cents,t.discountBps),cost:p.costCents}))}));
 tiers.forEach(t=>t.rows.forEach((v,index)=>{
  if(v.cents===null||v.cost===null)return;
  const p=a.products[index];
  if(v.cents===0||BigInt(v.cents)*BigInt(10000-r.floorBps)<BigInt(v.cost)*10000n){
   a.issues.push({level:'error',code:'margin_floor',row:p.sourceLine,sku:p.sku,field:t.name,message:t.name+': '+C.formatPrice(v.cents)+' gives '+marginText(v.cents,v.cost)+' gross margin; minimum '+(r.floorBps/100).toFixed(2)+'%. Required selling price: '+C.formatPrice(floorPrice(v.cost,r.floorBps))+'. Change the source price or discount after review.'});
  }
 }));
 changes.forEach(d=>{
  let message='';
  if(d.kind==='removed')message='SKU is absent from this full snapshot and will not appear in the new books. Verify removal.';
  else if(d.fields.includes('pack'))message='Selling unit changed. Reconcile price and cost to the new unit; no conversion is inferred.';
  else if(d.large)message='List price changed more than '+(r.changeBps/100).toFixed(2)+'%. Verify against the approved supplier data.';
  if(message)a.issues.push({level:'warning',code:'edition_change',row:d.line,sku:d.sku,field:'comparison',message});
 });
 a.errors=a.issues.filter(i=>i.level==='error').length;a.warnings=a.issues.length-a.errors;a.ready=a.errors===0&&a.products.length>0;
 return {...parsed,result:a,rules:r,tiers,changes,hasBaseline:Boolean(baseline)};
}
function publicProducts(report,tierIndex){
 if(!report||!report.result.ready)fail('Resolve blocking issues before creating customer files.');
 const tier=report.tiers[tierIndex];if(!tier)fail('Choose a valid price tier.');
 // Whitelist fields. Cost, source rows, other tiers and internal audit data never reach customer documents.
 return report.result.products.map((p,i)=>{const o={};C.FIELDS.forEach(f=>{o[f]=f==='currency'?'USD':f==='price'?(tier.rows[i].cents/100).toFixed(2):p[f];});o.cents=tier.rows[i].cents;return o;});
}
function customerHTML(report,tierIndex,brand,assets,settings){
 const tier=report.tiers[tierIndex];if(!tier)fail('Choose a valid price tier.');
 const b=C.normalizeBrand(brand);b.edition=b.edition.slice(0,60-tier.name.length-3)+' / '+tier.name;
 return C.buildCatalog(publicProducts(report,tierIndex),b,assets,{...settings,compactPrices:true});
}
function masterCSV(report){
 if(!report)fail('Validate product data first.');
 if(report.result.products.some(p=>p.costCents===null||p.cents===null)||report.result.issues.some(i=>i.level==='error'&&i.code!=='margin_floor'&&!i.code.startsWith('baseline_')))fail('Correct structural and monetary errors before saving an internal master.');
 return C.toCSV([FIELDS,...report.result.products.map(p=>FIELDS.map(f=>f==='cost'?(p.costCents/100).toFixed(2):f==='price'?(p.cents/100).toFixed(2):f==='currency'?'USD':p[f]))]);
}
function changesCSV(report){
 return C.toCSV([['change','sku','changed_fields','old_list_usd','new_list_usd','old_cost_usd','new_cost_usd','large_price_change'],...report.changes.map(d=>[d.kind,d.sku,d.fields.join('; '),d.oldCents===null?'':(d.oldCents/100).toFixed(2),d.newCents===null?'':(d.newCents/100).toFixed(2),d.oldCost===undefined?'':(d.oldCost/100).toFixed(2),d.newCost===undefined?'':(d.newCost/100).toFixed(2),d.large?'yes':'no'])]);
}
function project(input){
 const obj={format:'fieldnote-pricebook',version:2,source:input.source,mapping:input.mapping,delimiter:input.delimiter||'',baseline:input.baseline||'',rules:input.rules,brand:C.normalizeBrand(input.brand),assets:input.assets||{},logo:input.logo||'',demo:input.demo===true};
 validateProject(obj);
 const out=JSON.stringify(obj,null,2);if(new TextEncoder().encode(out).length>MAX_PROJECT)fail('Project is too large. Reduce photo sizes.');return out;
}
function validateProject(o){
 if(!plain(o)||o.format!=='fieldnote-pricebook'||o.version!==2)fail('Unsupported project format or version.');
 if(typeof o.source!=='string'||typeof o.delimiter!=='string'||typeof o.baseline!=='string'||!plain(o.mapping)||!plain(o.rules)||!plain(o.brand)||!plain(o.assets)||typeof o.logo!=='string'||typeof o.demo!=='boolean')fail('Project has invalid fields.');
 for(const f of Object.keys(o.mapping))if(!FIELDS.includes(f)||typeof o.mapping[f]!=='string')fail('Invalid project column mapping.');
 C.parseCSV(o.source,o.delimiter||undefined);if(o.baseline)parseBaseline(o.baseline);rules(o.rules);C.normalizeBrand(o.brand);
 let budget=o.logo.length;
 if(o.logo&&!C.isRasterDataURL(o.logo))fail('Invalid project logo.');
 if(Object.keys(o.assets).length>1000)fail('Too many project photos.');
 for(const [name,data]of Object.entries(o.assets)){if(!C.safeImageName(name)||!C.isRasterDataURL(data))fail('Invalid project photo.');budget+=data.length;}
 if(budget>C.LIMITS.totalAssetCharacters)fail('Project image budget exceeded.');
 return o;
}
function restore(text){
 if(typeof text!=='string'||text.length>MAX_PROJECT)fail('Project exceeds the size limit.');
 let o;try{o=JSON.parse(text);}catch{fail('Project is not valid JSON.');}
 validateProject(o);
 // Drop unknown properties, including any claimed approval. A restore always requires fresh review.
 const r=rules(o.rules),canonicalRules={margin:(r.floorBps/100).toFixed(2),change:(r.changeBps/100).toFixed(2),tiers:r.tiers.slice(1).map(t=>({name:t.name,discount:(t.discountBps/100).toFixed(2)}))};
 return {source:o.source,mapping:o.mapping,delimiter:o.delimiter,baseline:o.baseline,rules:canonicalRules,brand:C.normalizeBrand(o.brand),assets:o.assets,logo:o.logo,demo:o.demo};
}
return Object.freeze({VERSION,FIELDS,MAX_PROJECT,percent,rules,discount,floorPrice,marginText,autoMap,dataset,compare,audit,publicProducts,customerHTML,masterCSV,changesCSV,project,restore,makeBaseline});
});
