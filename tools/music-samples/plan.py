import re,json,urllib.parse
def parse(fn):
    t=open(fn,errors='ignore').read()
    dp=re.search(r'default_path=(.*)',t); dp=dp.group(1).strip() if dp else ''
    regs=[]
    for blk in re.split(r'<region>',t)[1:]:
        d={}
        for line in blk.splitlines():
            line=line.split('//')[0].strip()
            m=re.match(r'(\w+)=(.*)',line)
            if m: d[m.group(1)]=m.group(2).strip()
        if 'sample' in d: regs.append(d)
    return dp,regs
V='https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/'
F='https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/'
NN=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
def fl(inst,m): return F+inst+'-mp3/'+NN[m%12]+str(m//12-1)+'.mp3'
plan=[]  # (inst, midi, url, tag)
def vs(inst,sfz,kcs,vel,tag=''):
    dp,regs=parse('sfz/'+sfz+'.sfz')
    for kc in kcs:
        c=[r for r in regs if int(r.get('pitch_keycenter',-1))==kc and int(r.get('lovel',0))<=vel<=int(r.get('hivel',127))]
        if not c: print('MISSING',sfz,kc); continue
        r=c[0]; p=(dp+r['sample']).replace('\\','/')
        plan.append(dict(inst=inst,midi=kc,url=V+urllib.parse.quote(p),tag=tag,vol=float(r.get('volume',0))))
vs('harp','Harp',[31,38,45,52,59,65,72,79,86,93],64)
vs('strings','CelloEnsSusVib',[36,40,43,47,50,53],50)
vs('strings','ViolaEnsSusVib',[55,59,62,65],50)
vs('strings','ViolinEnsSusVib',[69,72,76,79,83,86],50)
vs('spic','CelloEnsSpic',[36,43,50,57],100)
vs('spic','ViolaEnsSpic',[62,69],100)
vs('spic','ViolinEnsSpic',[76,83],100)
vs('pizz','CelloEnsPizz',[36,43,50,57],100)
vs('pizz','ViolinEnsPizz',[62,69,76,83],100)
vs('trem','CelloEnsTrem',[36,43,50],50)
vs('trem','ViolaEnsTrem',[55,62],50)
vs('trem','ViolinEnsTrem',[69,76],50)
vs('flute','FluteSusVib',[60,64,69,72,76,81,84,88],50)
vs('oboe','OboeSusVib',[58,62,65,70,74,77,82],50)
vs('clarinet','ClarinetSus',[50,53,58,62,65,70,74,77],60)
vs('bassoon','BassoonSus',[34,41,48,55,60,63],50)
vs('trumpet','TrumpetSus',[57,63,70,77],50)
vs('trombone','TromboneSus',[34,41,46,53,60],50)
vs('timp','Timpani',[42,49,54],70,'mf')
vs('timp','Timpani',[42,49,54],120,'ff')
vs('bell','TubularBells',[60,67,72,77],64)
vs('glock','Glockenspiel',[67,72,79,84,91],64)
vs('organ','OrganQuiet',[36,45,54,63,72,81],64)
for m in range(40,77,3): plan.append(dict(inst='lute',midi=m,url=fl('acoustic_guitar_nylon',m),tag='',vol=0))
for m in range(48,80,4): plan.append(dict(inst='choir',midi=m,url=fl('choir_aahs',m),tag='',vol=0))
for m in range(60,90,4): plan.append(dict(inst='recorder',midi=m,url=fl('recorder',m),tag='',vol=0))
for m in range(36,70,4): plan.append(dict(inst='cello',midi=m,url=fl('cello',m),tag='',vol=0))
for m in range(55,92,4): plan.append(dict(inst='violin',midi=m,url=fl('violin',m),tag='',vol=0))
for m in range(36,66,4): plan.append(dict(inst='horn',midi=m,url=fl('french_horn',m),tag='',vol=0))
for m in range(28,50,5): plan.append(dict(inst='bass',midi=m,url=fl('contrabass',m),tag='',vol=0))
for m in [36,43,50]: plan.append(dict(inst='taiko',midi=m,url=fl('taiko_drum',m),tag='',vol=0))
for m in [45,52,60]: plan.append(dict(inst='tom',midi=m,url=fl('melodic_tom',m),tag='',vol=0))
for m in [60,72]: plan.append(dict(inst='wood',midi=m,url=fl('woodblock',m),tag='',vol=0))
for m in [50,57,64,71,78]: plan.append(dict(inst='dulcimer',midi=m,url=fl('dulcimer',m),tag='',vol=0))
for i,p in enumerate(plan):
    ext='.wav' if p['url'].endswith('.wav') else '.mp3'
    p['raw']='raw/%s_%d%s%s'%(p['inst'],p['midi'],('_'+p['tag']) if p['tag'] else '',ext)
json.dump(plan,open('plan.json','w'),indent=0)
open('urls.txt','w').write(''.join('%s\t%s\n'%(p['raw'],p['url']) for p in plan))
print(len(plan))
