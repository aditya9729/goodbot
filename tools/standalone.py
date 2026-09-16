"""Build a no-network, keyboard/touch preview. Camera and API controls disabled.
The actual deployable game remains public/, with external ES modules and its CSP.
"""
from pathlib import Path
import base64,json,re
ROOT=Path(__file__).resolve().parents[1];PUB=ROOT/'public'
ORDER=['math.js','identities.js','scene.js','navigation.js','director.js','game.js','geometry.js','hotel3d.js','raster-data.js','render-flat.js','gpu.js','render.js','zip.js','recording.js','tactile.js','data-ui.js','camera.js','hands.js','audio.js','lessons.js','apprentice.js','apprentice-session.js','apprentice-ui.js','app.js']
html=(PUB/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' \'wasm-unsafe-eval\' blob:; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'; worker-src \'none\'; object-src \'none\'">',html)
html=re.sub(r'<link[^>]*>','',html)
html=html.replace('./icon.svg','data:image/svg+xml;base64,'+base64.b64encode((PUB/'icon.svg').read_bytes()).decode())
html=html.replace('</head>','<style>'+(PUB/'style.css').read_text()+(PUB/'realism.css').read_text()+(PUB/'studio.css').read_text()+(PUB/'apprentice.css').read_text()+'</style></head>')
data=json.dumps([{'name':n,'code':(PUB/'src'/n).read_text()} for n in ORDER]).replace('<','\\u003c')
script=r'''<script>
(async()=>{
 const urls={}; const sources=SOURCE_DATA;
 for(const{name,code}of sources){const text=code.replace(/from\s+['"]\.\/([^'"]+)['"]/g,(_,file)=>`from '${urls[file]}'`);urls[name]=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));}
 await import(urls['app.js']);
 const hands=document.getElementById('hands-btn');hands.disabled=true;hands.textContent='✋ Camera in source build';
 document.getElementById('ai-open-btn').disabled=true;
 document.querySelector('#welcome .small').textContent='Offline preview · mouse, touch or keyboard. Full source includes optional webcam and server-side AI integration.';
 document.getElementById('status').textContent='Offline preview. Full source includes camera and AI controls; neither runs in this file.';
})().catch(error=>{document.body.textContent='Preview failed to initialize: '+error.message;});
</script>'''.replace('SOURCE_DATA',data)
html=re.sub(r'<script type="module"[\s\S]*?</script>',lambda _:script,html)
(ROOT/'GOODBOT-Real-Look.html').write_text(html)
print('Created GOODBOT-Real-Look.html — offline preview, camera/API disabled.')
