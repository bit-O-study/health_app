import json, urllib.request, os, re, sys

OURS = "ab-rollout arnold-press assisted-pull-up barbell-row belt-squat bench-dip bench-press biceps-curl bicycle-crunch box-squat bulgarian-split-squat cable-crossover cable-crunch cable-kickback cable-lateral-raise cable-pull-through cable-rope-hammer-curl chest-fly chest-supported-row chin-up close-grip-bench-press concentration-curl cossack-squat crunch curtsy-lunge deadlift decline-press diamond-pushup dips donkey-calf-raise drag-curl dumbbell-pullover ez-bar-curl face-pull front-raise front-squat glute-bridge goblet-squat good-morning hack-squat hammer-curl hanging-leg-raise hip-abduction hip-adduction hip-thrust hollow-hold hyperextension incline-cable-fly incline-curl incline-press inverted-row lat-pulldown lateral-raise leg-curl leg-extension leg-press low-row-machine lunge machine-chest-press machine-rear-delt-fly machine-shoulder-press meadows-row mountain-climber ohp one-arm-dumbbell-row overhead-triceps-extension pallof-press pec-deck pendlay-row pistol-squat plank preacher-curl pull-up push-up rdl rear-delt-fly reverse-crunch reverse-curl reverse-pec-deck russian-twist seated-cable-row seated-calf-raise seated-leg-curl shrug side-plank single-leg-leg-press sissy-squat sit-up skull-crusher smith-bench-press smith-squat squat standing-cable-curl standing-calf-raise step-up stiff-leg-deadlift straight-arm-pulldown sumo-deadlift sumo-squat t-bar-row toes-to-bar triceps-kickback triceps-pushdown upright-row v-up walking-lunge wide-grip-pull-up wood-chopper wrist-curl zottman-curl".split()

SYN = {"ohp":"overhead barbell shoulder press","rdl":"romanian deadlift","dips":"dips triceps",
 "push-up":"pushups","pull-up":"pullups","chin-up":"chin up","crunch":"crunches",
 "lat-pulldown":"wide grip lat pulldown","leg-curl":"lying leg curls","leg-extension":"leg extensions",
 "biceps-curl":"barbell curl","triceps-pushdown":"triceps pushdown rope","skull-crusher":"lying triceps press",
 "barbell-row":"bent over barbell row","seated-cable-row":"seated cable rows","leg-press":"leg press",
 "lateral-raise":"side lateral raise","front-raise":"front dumbbell raise","shrug":"barbell shrug",
 "bench-press":"barbell bench press medium grip","incline-press":"barbell incline bench press medium grip",
 "hammer-curl":"hammer curls","preacher-curl":"preacher curl","hip-thrust":"barbell hip thrust",
 "glute-bridge":"butt lift bridge","good-morning":"good morning","sumo-deadlift":"sumo deadlift",
 "calf-raise":"standing calf raises","seated-calf-raise":"seated calf raise","walking-lunge":"dumbbell lunges",
 "lunge":"dumbbell lunges","goblet-squat":"goblet squat","front-squat":"front barbell squat"}

def toks(s): return set(t for t in re.split(r'[^a-z]+', s.lower()) if len(t)>1 and t not in ("the","a","with","to","of","and","for"))

req=urllib.request.Request("https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json", headers={"User-Agent":"curl"})
db=json.load(urllib.request.urlopen(req, timeout=30))
db=[e for e in db if e.get("images")]
dbtok=[(e, toks(e["name"])) for e in db]

mapping={}
for oid in OURS:
    q = toks(SYN.get(oid, oid.replace("-"," ")))
    best=None;bs=-1
    for e,dt in dbtok:
        cov=len(q & dt)/len(q) if q else 0
        # 우리 토큰이 db에 다 들어가면 우대, 추가토큰 적을수록 우대
        score=cov*2 - 0.04*len(dt - q)
        if score>bs: bs=score;best=(e,cov)
    if best and best[1]>=0.66:
        mapping[oid]=best[0]["id"]
        print(f"{oid:28s} -> {best[0]['id']:42s} ({best[0]['name']})")
    else:
        print(f"{oid:28s} -> (no match)")
print("\nMATCHED", len(mapping), "/", len(OURS))
json.dump(mapping, open("scripts/img-map.json","w"), indent=0)
