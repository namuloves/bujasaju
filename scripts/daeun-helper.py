import math, json, glob, re
from datetime import datetime, timedelta, timezone
KST=timezone(timedelta(hours=9))
def jd(dt):
    dt=dt.astimezone(timezone.utc); y,m=dt.year,dt.month
    d=dt.day+(dt.hour+dt.minute/60+dt.second/3600)/24
    if m<=2: y-=1; m+=12
    a=y//100; b=2-a+a//4
    return math.floor(365.25*(y+4716))+math.floor(30.6001*(m+1))+d+b-1524.5
def sunlong(dt):
    n=jd(dt)-2451545.0
    L=(280.460+0.9856474*n)%360; g=math.radians((357.528+0.9856003*n)%360)
    return (L+1.915*math.sin(g)+0.020*math.sin(2*g))%360
def cross(target, lo, hi):
    def f(dt):
        d=(sunlong(dt)-target)%360
        return d-360 if d>180 else d
    for _ in range(60):
        mid=lo+(hi-lo)/2
        if f(lo)*f(mid)<=0: hi=mid
        else: lo=mid
    return lo+(hi-lo)/2
TERMS=[(315,'입춘'),(345,'경칩'),(15,'청명'),(45,'입하'),(75,'망종'),(105,'소서'),
       (135,'입추'),(165,'백로'),(195,'한로'),(225,'입동'),(255,'대설'),(285,'소한')]
def terms_around(dt):
    out=[]
    for yr in (dt.year-1, dt.year, dt.year+1):
        for deg,nm in TERMS:
            base=datetime(yr,1,1,tzinfo=KST)
            for mo in range(1,13):
                lo=datetime(yr,mo,1,tzinfo=KST)
                hi=(lo+timedelta(days=32)).replace(day=1)
                a,b=sunlong(lo),sunlong(hi-timedelta(seconds=1))
                d1=(a-deg)%360; d1=d1-360 if d1>180 else d1
                d2=(b-deg)%360; d2=d2-360 if d2>180 else d2
                if d1<=0<=d2 or (d1<0 and d2>0):
                    out.append((cross(deg,lo,hi),nm)); break
    out.sort(key=lambda x:x[0]); return out
STEMS='갑을병정무기경신임계'; BRANCHES='자축인묘진사오미신유술해'
YANG_STEM=set('갑병무경임')
BR_POL={'자':'음','축':'음','인':'양','묘':'음','진':'양','사':'양','오':'음','미':'음','신':'양','유':'음','술':'양','해':'양'}
EL_S={'갑':'목','을':'목','병':'화','정':'화','무':'토','기':'토','경':'금','신':'금','임':'수','계':'수'}
EL_B={'자':'수','축':'토','인':'목','묘':'목','진':'토','사':'화','오':'화','미':'토','신':'금','유':'금','술':'토','해':'수'}
GEN={'목':'화','화':'토','토':'금','금':'수','수':'목'}; CTRL={'목':'토','토':'수','수':'화','화':'금','금':'목'}
def sipsin(day_stem, el, pol):
    de=EL_S[day_stem]; dp='양' if day_stem in YANG_STEM else '음'; same=(dp==pol)
    if el==de: return '비견' if same else '겁재'
    if GEN[de]==el: return '식신' if same else '상관'
    if CTRL[de]==el: return '편재' if same else '정재'
    if CTRL[el]==de: return '편관' if same else '정관'
    if GEN[el]==de: return '편인' if same else '정인'
    return '?'
def daeun(birth, gender, month_pillar, year_stem):
    fwd = (year_stem in YANG_STEM) == (gender=='M')
    ts=terms_around(birth)
    nxt=[t for t,_ in ts if t>birth][0]; prv=[t for t,_ in ts if t<=birth][-1]
    days=(nxt-birth).total_seconds()/86400 if fwd else (birth-prv).total_seconds()/86400
    start=max(1,round(days/3))
    i=STEMS.index(month_pillar[0]); j=BRANCHES.index(month_pillar[1]); out=[]
    for k in range(1,9):
        s=(i+k)%10 if fwd else (i-k)%10; b=(j+k)%12 if fwd else (j-k)%12
        a0=start+(k-1)*10
        out.append((f"{a0}~{a0+9}", STEMS[s]+BRANCHES[b], f"{birth.year+a0}~{birth.year+a0+9}"))
    return ('순행' if fwd else '역행'), start, out
