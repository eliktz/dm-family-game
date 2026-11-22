import { webkit } from 'playwright';
const b = await webkit.launch(); const p = await b.newPage();
await p.setContent('<canvas id=c></canvas><script>const g=document.getElementById("c").getContext("webgl2");document.title=g?("ok "+g.getParameter(g.RENDERER)):"nogl"</script>');
console.log(await p.title()); await b.close();
