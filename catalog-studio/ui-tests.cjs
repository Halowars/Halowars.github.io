'use strict';
module.exports = function StudioStateTests(C,appSource,demoCSV){
'use strict';
const tests=[];
function ok(v,msg){if(!v)throw Error(msg||'Assertion failed');}
function eq(a,b){if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Expected '+JSON.stringify(b)+', got '+JSON.stringify(a));}
async function test(name,fn){try{await fn();tests.push({name:name,passed:true});}catch(e){tests.push({name:name,passed:false,error:e.message});}}
function harness(){
const elements=new Map(),saved=[],blobs=new Map(),events={};
class Element{
constructor(id){this.id=id;this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.listeners={};this.dataset={};this.attributes={};this.files=[];this.textContent='';this._html='';this.selects=[];}
addEventListener(type,fn){(this.listeners[type]||(this.listeners[type]=[])).push(fn);}
setAttribute(k,v){this.attributes[k]=v;}
set innerHTML(value){this._html=value;if(this.id==='mappings'){this.selects=Array.from(value.matchAll(/<select data-field="([^"]+)">([\s\S]*?)<\/select>/g)).map(function(m){const e=new Element('mapping-'+m[1]);e.dataset.field=m[1];const selected=m[2].match(/<option value="([^"]*)" selected>/);e.value=selected?selected[1]:'';return e;});}}
get innerHTML(){return this._html;}
querySelectorAll(selector){return selector==='select'?this.selects:[];}
async emit(type,event){for(const fn of this.listeners[type]||[])await fn.call(this,event||{preventDefault:function(){}});}
click(){if(this.download)saved.push({name:this.download,content:blobs.get(this.href).parts.join('')});}
remove(){}
}
function get(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);}
const views=['workbench','delivery','selling'].map(function(name){const e=new Element('view-'+name);e.dataset.view=name;return e;});
const panels=['workbench','delivery','selling'].map(function(name){const e=new Element('panel-'+name);e.dataset.panel=name;return e;});
const validIds=['draft-catalog','draft-prices','clean-csv'],auditIds=['review-json','exceptions-csv'];
const document={getElementById:get,querySelectorAll:function(selector){if(selector==='[data-view]')return views;if(selector==='[data-panel]')return panels;if(selector==='[data-requires-valid]')return validIds.map(get);if(selector==='[data-requires-audit]')return auditIds.map(get);return [];},createElement:function(){return new Element('created');},body:{appendChild:function(){}}};
const window={CatalogCore:C,FIELDNOTE_DEMO_CSV:demoCSV,addEventListener:function(name,fn){events[name]=fn;}};
let onImageRead=null;
class Reader{readAsDataURL(){const self=this;onImageRead=function(){self.result='data:image/png;base64,iVBORw0KGgo=';self.onload();};}}
class Picture{constructor(){this.naturalWidth=1;this.naturalHeight=1;}set src(_){this.onload();}}
const U={createObjectURL:function(blob){const key='blob:'+blobs.size;blobs.set(key,blob);return key;},revokeObjectURL:function(){}};
class B{constructor(parts){this.parts=parts;}}
new Function('window','document','Blob','URL','setTimeout','FileReader','Image',appSource)(window,document,B,U,function(){},Reader,Picture);
return {get:get,saved:saved,views:views,panels:panels,events:events,completeImage:function(){if(!onImageRead)throw Error('No pending image read');onImageRead();},tick:async function(){for(let i=0;i<6;i++)await Promise.resolve();}};
}
return (async function(){
await test('Studio: fictional fixture initializes with 12 products',async function(){const h=harness();eq(h.get('count-products').textContent,12);eq(h.get('count-errors').textContent,0);ok(!h.get('demo-badge').hidden);});
await test('Studio: final exports disabled until approval',async function(){const h=harness();ok(h.get('final-catalog').disabled);ok(h.get('final-prices').disabled);});
await test('Studio: approving enables both final exports',async function(){const h=harness();h.get('approved').checked=true;await h.get('approved').emit('change');ok(!h.get('final-catalog').disabled);ok(!h.get('final-prices').disabled);});
await test('Studio: source editing immediately invalidates audit and approval',async function(){const h=harness();h.get('approved').checked=true;await h.get('approved').emit('change');h.get('csv-text').value='bad';await h.get('csv-text').emit('input');ok(h.get('draft-catalog').disabled);ok(h.get('final-catalog').disabled);ok(h.get('final-prices').disabled);ok(!h.get('approved').checked);});
await test('Studio: malformed import cannot export stale dataset',async function(){const h=harness();h.get('csv-text').value='sku,name\nA,"bad';await h.get('validate').emit('click');ok(h.get('draft-catalog').disabled);eq(h.get('count-products').textContent,'—');await h.get('draft-catalog').emit('click');eq(h.saved.length,0);});
await test('Studio: edits to fictional fixture retain its watermark',async function(){const h=harness();await h.get('validate').emit('click');await h.get('draft-catalog').emit('click');ok(h.saved[0].content.includes('FICTIONAL DEMO'));});
await test('Studio: brand changes revoke both final exports',async function(){const h=harness();h.get('approved').checked=true;await h.get('approved').emit('change');await h.get('brand-form').emit('input');ok(!h.get('approved').checked);ok(h.get('final-prices').disabled);ok(h.get('final-catalog').disabled);});
await test('Studio: ambiguous mapping blocks and clears approval',async function(){const h=harness();h.get('approved').checked=true;await h.get('approved').emit('change');const m=h.get('mappings').selects.find(function(e){return e.dataset.field==='pack';});m.value='sku';await m.emit('change');ok(h.get('draft-catalog').disabled);ok(!h.get('approved').checked);});
await test('Studio: catalog download contains fixture SKUs and safe filename',async function(){const h=harness();await h.get('draft-catalog').emit('click');eq(h.saved.length,1);ok(h.saved[0].content.includes('000101'));ok(h.saved[0].name.endsWith('-fictional-demo.html'));});
await test('Studio: final download cannot bypass approval handler',async function(){const h=harness();await h.get('final-catalog').emit('click');eq(h.saved.length,0);ok(h.get('status').textContent.includes('acknowledge'));});
await test('Studio: cleaned CSV and audit record use current data',async function(){const h=harness();await h.get('clean-csv').emit('click');await h.get('review-json').emit('click');ok(h.saved[0].content.includes('"000101"'));const j=JSON.parse(h.saved[1].content);eq(j.approved,false);eq(j.products.length,12);});
await test('Studio: file import handles recognized aliases',async function(){const h=harness();h.get('csv-file').files=[{name:'stock.csv',size:100,text:async function(){return 'Part Number,Product Name,Category,Selling Unit,Price\n0009,Tray,Storage,each,5';}}];await h.get('csv-file').emit('change');eq(h.get('count-products').textContent,1);eq(h.get('count-errors').textContent,0);ok(h.get('demo-badge').hidden);});
await test('Studio: superseded async file read cannot replace newer data',async function(){const h=harness();let finish;h.get('csv-file').files=[{name:'old.csv',size:100,text:function(){return new Promise(function(resolve){finish=resolve;});}}];const pending=h.get('csv-file').emit('change');await h.get('load-demo').emit('click');finish('sku,name,category,pack\nold,Old,Old,each');await pending;eq(h.get('count-products').textContent,12);ok(!h.get('demo-badge').hidden);});
await test('Studio: clearing session removes dataset and blocks all exports',async function(){const h=harness();await h.get('reset').emit('click');eq(h.get('csv-text').value,'');eq(h.get('count-products').textContent,'—');ok(h.get('draft-catalog').disabled);ok(h.get('review-json').disabled);});
await test('Studio: navigation selects intended panel',async function(){const h=harness();await h.views[2].emit('click');ok(h.panels[0].hidden);ok(!h.panels[2].hidden);eq(h.get('main-heading').textContent,'Sell a finished result.');});
await test('Studio: image import blocks exports while pending and revokes approval on completion',async function(){
const h=harness();h.get('approved').checked=true;await h.get('approved').emit('change');
h.get('image-files').files=[{name:'clip.png',size:100,type:'image/png',slice:function(){return {arrayBuffer:async function(){return new Uint8Array([137,80,78,71,0,0,0,0,0,0,0,0]).buffer;}};}}];
const pending=h.get('image-files').emit('change');await h.tick();ok(h.get('approved').disabled);ok(h.get('final-catalog').disabled);ok(h.get('final-prices').disabled);h.completeImage();await pending;ok(!h.get('approved').checked);ok(h.get('final-prices').disabled);ok(h.get('asset-count').textContent.includes('1 product'));
});
await test('Studio: unsupported image type does not retain busy state',async function(){const h=harness();h.get('image-files').files=[{name:'bad.svg',size:50,type:'image/svg+xml'}];await h.get('image-files').emit('change');ok(!h.get('draft-catalog').disabled);ok(h.get('status').textContent.includes('not accepted'));});
await test('Studio: load/reset protect against pending image work',async function(){
const h=harness();h.get('image-files').files=[{name:'clip.png',size:100,type:'image/png',slice:function(){return {arrayBuffer:async function(){return new Uint8Array([137,80,78,71,0,0,0,0,0,0,0,0]).buffer;}};}}];
const pending=h.get('image-files').emit('change');await h.tick();await h.get('reset').emit('click');h.completeImage();await pending;eq(h.get('asset-count').textContent,'0 product image(s) loaded');eq(h.get('count-products').textContent,'—');
});
return {kind:'simulated DOM state tests; not real browser QA',total:tests.length,passed:tests.filter(function(t){return t.passed;}).length,failed:tests.filter(function(t){return !t.passed;}),tests:tests};
})();
};
