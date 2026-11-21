import json,subprocess,numpy as np,os,sys
SR=44100
plan=json.load(open('plan.json'))
CFG={ # maxlen, kbps, sustained?
 'harp':(5.0,56,0),'strings':(6.0,48,1),'trem':(6.0,48,1),'spic':(1.3,48,0),'pizz':(1.6,48,0),
 'flute':(7.0,56,1),'oboe':(7.0,48,1),'clarinet':(7.0,48,1),'bassoon':(7.0,48,1),'trumpet':(7.0,48,1),'trombone':(7.0,48,1),
 'timp':(3.5,48,0),'bell':(6.0,56,0),'glock':(2.5,56,0),'organ':(6.0,48,1),
 'lute':(3.1,56,0),'choir':(6.0,48,1),'recorder':(6.0,48,1),'cello':(7.0,48,1),'violin':(3.1,48,1),'horn':(7.0,48,1),'bass':(6.0,48,1),
 'taiko':(2.0,48,0),'tom':(1.5,48,0),'wood':(0.6,48,0),'dulcimer':(3.1,56,0)}
def extend(x,target,name):
    # 짧은 유지음을 길게 잇는다: 끝 가까이의 한 토막과 가장 닮은 앞쪽 자리를 찾아(교차상관) 그리로 되돌아가며 겹쳐 붙인다
    n=len(x); T=int(target*SR)
    if n>=T: return x[:T]
    best=None
    for wsec in (0.2,0.12,0.06,0.03):
        W=int(wsec*SR); e=n-int(0.15*SR)-W; lo=int(0.3*SR); hi=e-int(0.8*SR)
        if hi<=lo+100: continue
        tpl=x[e:e+W]; seg=x[lo:hi+W]; N=1<<int(np.ceil(np.log2(len(seg)+W)))
        c=np.fft.irfft(np.fft.rfft(seg,N)*np.conj(np.fft.rfft(tpl,N)),N)[:hi-lo]
        cs=np.concatenate([[0],np.cumsum(seg**2)]); en=cs[W:W+hi-lo]-cs[:hi-lo]
        ncc=c/np.sqrt(np.maximum(en*np.sum(tpl**2),1e-12)); k=int(np.argmax(ncc)); rho=float(ncc[k])
        if best is None or rho>best[0]+0.03: best=(rho,W,e,lo+k)
        if rho>0.95: break
    if best is None: print('  cannot extend',name); return x
    rho,W,e,s0=best
    t=np.linspace(0,1,W); a=1-t; b=t; norm=np.sqrt(np.maximum(a*a+b*b+2*a*b*max(0,rho),1e-6))
    xf=(x[e:e+W]*a+x[s0:s0+W]*b)/norm
    out=[x[:e]]; total=e
    while total<T+SR: out+=[xf,x[s0+W:e]]; total+=W+(e-s0-W)
    print('  extend %s loop %.2fs corr %.2f xf %.2f'%(name,(e-s0)/SR,rho,W/SR))
    return np.concatenate(out)[:T]
SKIP={'violin','dulcimer'}
def load(f):
    raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
    return np.frombuffer(raw,dtype=np.float32).astype(np.float64)
def pitch(x,midi):
    # 기대 음높이 근처에서 자기상관 꼭짓점을 찾아 센트 차이를 잰다
    f0=440*2**((midi-69)/12); n=min(len(x),int(SR*1.2)); s=int(SR*0.25)
    if len(x)<s+4096: s=0
    seg=x[s:s+max(8192,n-s)]; seg=seg-seg.mean()
    if len(seg)<4096: return 0.0
    N=1<<int(np.ceil(np.log2(len(seg)*2))); F=np.fft.rfft(seg*np.hanning(len(seg)),N); ac=np.fft.irfft(np.abs(F)**2)
    lo=int(SR/(f0*1.09)); hi=int(SR/(f0/1.09))+1
    if hi>=len(ac)//2 or lo<2: return 0.0
    k=lo+int(np.argmax(ac[lo:hi+1]))
    if k<=lo or k>=hi: return 0.0
    a,b,c=ac[k-1],ac[k],ac[k+1]; d=0.5*(a-c)/(a-2*b+c) if (a-2*b+c)!=0 else 0
    f=SR/(k+d); return float(1200*np.log2(f/f0))
out='out'; os.makedirs(out,exist_ok=True); man={}
for p in plan:
    inst=p['inst']
    if inst in SKIP: continue
    mx,kb,sus=CFG[inst]; x=load(p['raw'])
    if len(x)<1000: print('EMPTY',p['raw']); continue
    pk=np.abs(x).max(); 
    # 시작점: 꼭대기의 -42dB를 처음 넘는 곳에서 4ms 앞
    thr=pk*10**(-42/20); i0=int(np.argmax(np.abs(x)>thr)); i0=max(0,i0-int(SR*0.004)); x=x[i0:]
    # 끝의 긴 침묵 자르기
    env=np.abs(x); last=len(x)-int(np.argmax(env[::-1]>pk*10**(-55/20))); x=x[:min(len(x),last+int(SR*0.05))]
    if sus:
        # 유지되는 구간만 남긴다: 크기가 유지 구간 가운데값보다 6dB 넘게 꺼지기 시작하는 곳(놓는 소리)에서 자른다
        w=int(SR*0.12); e=np.sqrt(np.convolve(x**2,np.ones(w)/w,mode='same')); w2=int(SR*0.25); e=np.convolve(e,np.ones(w2)/w2,mode='same')
        a0=int(SR*0.3); ref=np.median(e[a0:max(a0+1,int(len(x)*0.7))])
        up=np.where(e[a0:]>=ref*0.8)[0]; a1=a0+(int(up[0]) if len(up) else 0)  # 천천히 차오르는 악기는 다 차오른 뒤부터 본다
        bad=np.where(e[a1:]<ref*(0.2 if inst=='trem' else 0.5))[0]; se=a1+int(bad[0]) if len(bad) else len(x)
        se=max(se-int(SR*0.1),int(SR*1.0)) if len(bad) else se; x=x[:se].copy(); e=e[:se]
        # 크기를 고르게 편다 (셈여림은 연주할 때 입힌다)
        a=int(SR*0.25); b=len(x)-int(SR*0.15)
        if b>a+int(SR*0.5):
            ref=np.median(e[a:b]); gg=np.clip(ref/np.maximum(e,1e-6),0.4,3.0); gg[:a]=gg[a]; gg[b:]=gg[b]; x=x*gg
        x=extend(x,mx,'%s_%d'%(inst,p['midi'])).copy()
        fo=int(SR*0.25); x[-fo:]*=np.linspace(1,0,fo)**2
    else:
        cut=len(x)>int(mx*SR)
        if cut: x=x[:int(mx*SR)].copy()
        else: x=x.copy()
        fo=int(SR*(0.25 if cut else 0.03)); x[-fo:]*=np.linspace(1,0,fo)**2
    fi=int(SR*0.002); x[:fi]*=np.linspace(0,1,fi)
    cents=pitch(x,p['midi']) if inst not in ('timp','taiko','tom','wood','bell','glock') else 0.0
    # 크기: 유지음은 앞 1.5초 RMS, 뜯는 소리는 꼭대기 기준
    if sus: r=np.sqrt(np.mean(x[int(SR*0.15):int(SR*1.5)]**2)); g=0.16/max(r,1e-6)
    else: g=0.8/np.abs(x).max()
    if p['tag']=='mf': g*=0.55
    x=x*g; pk2=np.abs(x).max()
    if pk2>0.95: x*=0.95/pk2
    name='%s_%d%s'%(inst,p['midi'],('_'+p['tag']) if p['tag'] else '')
    raw=(x.astype(np.float32)).tobytes()
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-c:a','libmp3lame','-b:a','%dk'%kb,'-ar',str(SR),out+'/'+name+'.mp3'],input=raw,check=True)
    man.setdefault(inst,[]).append(dict(m=p['midi'],f=name+'.mp3',c=round(cents,1),d=round(len(x)/SR,2),t=p['tag'],rms=round(float(np.sqrt(np.mean(x**2))),3),pk=round(float(np.abs(x).max()),2)))
json.dump(man,open('manifest_raw.json','w'),indent=1)
tot=sum(os.path.getsize(out+'/'+f) for f in os.listdir(out))
print('files',len(os.listdir(out)),'bytes',tot)
for k,v in man.items(): print(k,len(v),sum(os.path.getsize(out+'/'+z['f']) for z in v)//1024,'KB','cents',[z['c'] for z in v],'dur',[z['d'] for z in v])
