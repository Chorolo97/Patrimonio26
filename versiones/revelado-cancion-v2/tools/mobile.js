/* Crea la copia de teléfono y verifica duración, streams y límite de 30 MB. */
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'out/revelado-cancion-v2');
const ff=process.env.FFMPEG||'ffmpeg';
const fp=process.env.FFPROBE||(path.isAbsolute(ff)?path.join(path.dirname(ff),process.platform==='win32'?'ffprobe.exe':'ffprobe'):'ffprobe');
const src=path.join(out,'reel_con_audio.mp4'),dst=path.join(out,'Punta_Ballena_v2_celular_720p.mp4');
if(!fs.existsSync(src))throw new Error('Falta la exportación completa con audio.');
const run=(bin,args)=>{const r=spawnSync(bin,args,{encoding:'utf8',maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw(r.error||new Error(r.stderr));return r.stdout;};
run(ff,['-y','-loglevel','error','-i',src,'-vf','scale=720:1280:flags=lanczos','-c:v','libx264','-preset','slow','-crf','25','-maxrate','1050k','-bufsize','2100k','-pix_fmt','yuv420p','-c:a','aac','-b:a','112k','-ar','48000','-movflags','+faststart',dst]);
const report={};
for(const [name,file]of [['master',src],['mobile',dst]]) {
 const d=JSON.parse(run(fp,['-v','error','-show_streams','-show_format','-of','json',file]));
 const v=d.streams.find(s=>s.codec_type==='video'),a=d.streams.find(s=>s.codec_type==='audio');
 const bytes=fs.statSync(file).size;
 report[name]={file:path.basename(file),bytes,width:v.width,height:v.height,fps:v.avg_frame_rate,frames:Number(v.nb_frames),duration:Number(d.format.duration),videoCodec:v.codec_name,audioCodec:a?.codec_name,audioChannels:a?.channels};
 if(!a||v.nb_frames!=='4884'||Math.abs(Number(d.format.duration)-162.8)>.06||v.avg_frame_rate!=='30/1')throw new Error('Validación falló '+name);
 if(name==='mobile'&&(bytes>=30_000_000||v.width!==720||v.height!==1280))throw new Error('La copia celular excede el formato o tamaño.');
 if(name==='master'&&(v.width!==1080||v.height!==1920))throw new Error('Formato master incorrecto.');
 // Recorrer ambos streams completos detecta errores que el encabezado no revela.
 run(ff,['-v','error','-i',file,'-map','0:v:0','-map','0:a:0','-f','null','-']);
 report[name].fullDecode='passed';
}
fs.writeFileSync(path.join(out,'export-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
