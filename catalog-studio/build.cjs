(function BuildStandalone(){
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const read=function(name){return fs.readFileSync(path.join(__dirname,name),'utf8');};
const scriptSafe=function(source){return source.replace(/<\/script/gi,'<\\/script');};
const dataSafe=JSON.stringify(read('fixtures/demo-products.csv')).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const core=read('core.cjs'),css=read('ui/style.css'),body=read('ui/shell.html'),app=read('studio.js');
const runCore=require('./tests.cjs');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'"><meta name="referrer" content="no-referrer"><title>Fieldnote — Catalog production studio</title><meta name="description" content="Local catalog production workbench for a managed distributor catalog service."><style>'+css+'</style></head><body>'+body+'<script>'+scriptSafe(core)+'</script><script>window.FIELDNOTE_DEMO_CSV='+dataSafe+';window.CatalogTestSuite='+scriptSafe(runCore.toString())+';</script><script>'+scriptSafe(app)+'</script></body></html>';
fs.writeFileSync(path.join(__dirname,'index.html'),html);
})();
