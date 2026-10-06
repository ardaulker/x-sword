def edit(p, pairs, add_import=True):
    t=open(p,encoding='utf-8',newline='').read()
    crlf='\r\n' in t; t=t.replace('\r\n','\n')
    for a,b in pairs:
        if a not in t:
            print('MISSING',p,repr(a[:90])); continue
        t=t.replace(a,b,1)
    if add_import and 'tr(' in t and "from '../i18n'" not in t and "from './i18n'" not in t and "from '../../i18n'" not in t:
        depth=p.count('/')-1  # relative to src
        rel='./i18n' if depth==0 else '../i18n'
        # insert after last top-level import line
        lines=t.split('\n'); idx=0
        for i,l in enumerate(lines):
            if l.startswith('import ') or l.startswith("} from"): idx=i
        lines.insert(idx+1,f"import {{ tr }} from '{rel}';")
        t='\n'.join(lines)
    if crlf: t=t.replace('\n','\r\n')
    open(p,'w',encoding='utf-8',newline='').write(t)
