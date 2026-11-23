# SPDX-License-Identifier: GPL-3.0-or-later
"""Convert a DOS4GW LE executable into an ELF32 i386 file (fixups applied) with Watcom debug symbols,
so Ghidra can load it natively."""
import struct, sys
src, dst = sys.argv[1], sys.argv[2]
d = open(src,'rb').read()
le = struct.unpack_from('<I', d, 0x3c)[0]
g = lambda o, fmt='<I': struct.unpack_from(fmt, d, le+o)[0]
pagesize = g(0x28); lastpage = g(0x2c); npages = g(0x14)
objtbl = le+g(0x40); nobj = g(0x44); pagemap = le+g(0x48)
fixpage = le+g(0x68); fixrec = le+g(0x6c); datapages = g(0x80)
objs = []
for i in range(nobj):
    vsize, base, flags, pidx, pcnt, _ = struct.unpack_from('<6I', d, objtbl+i*24)
    objs.append(dict(vsize=vsize, base=base, flags=flags, pidx=pidx, pcnt=pcnt))
# page data
def page_data(p):  # p is 1-based
    off = datapages + (p-1)*pagesize
    size = lastpage if p == npages else pagesize
    return d[off:off+size]
for o in objs:
    img = bytearray(max(o['vsize'], o['pcnt']*pagesize))
    for k in range(o['pcnt']):
        pd = page_data(o['pidx']+k)
        img[k*pagesize:k*pagesize+len(pd)] = pd
    o['img'] = img
# fixups
fpt = [struct.unpack_from('<I', d, fixpage+4*i)[0] for i in range(npages+1)]
nfix = 0
for o in objs:
    for k in range(o['pcnt']):
        p = o['pidx']+k  # 1-based
        start, end = fixrec+fpt[p-1], fixrec+fpt[p]
        pos = start
        while pos < end:
            src_t = d[pos]; flg = d[pos+1]; pos += 2
            if src_t & 0x20:
                cnt = d[pos]; pos += 1
                offs = None
            else:
                offs = [struct.unpack_from('<h', d, pos)[0]]; pos += 2
            if flg & 3 != 0: raise Exception('non-internal fixup %x' % flg)
            if flg & 0x40: tobj = struct.unpack_from('<H', d, pos)[0]; pos += 2
            else: tobj = d[pos]; pos += 1
            stype = src_t & 0xf
            toff = 0
            if stype != 2:
                if flg & 0x10: toff = struct.unpack_from('<I', d, pos)[0]; pos += 4
                else: toff = struct.unpack_from('<H', d, pos)[0]; pos += 2
            if offs is None:
                offs = [struct.unpack_from('<h', d, pos+2*i)[0] for i in range(cnt)]; pos += 2*cnt
            target = objs[tobj-1]['base'] + toff
            for so in offs:
                a = k*pagesize + so
                if a < 0 or a >= len(o['img']): continue
                img = o['img']
                if stype == 7:  # 32-bit offset
                    if a+4 <= len(img): img[a:a+4] = struct.pack('<I', target)
                elif stype == 8:  # 32-bit self-relative
                    if a+4 <= len(img): img[a:a+4] = struct.pack('<i', target - (o['base']+a+4))
                elif stype == 5:  # 16-bit offset
                    img[a:a+2] = struct.pack('<H', target & 0xffff)
                elif stype == 2:  # selector
                    img[a:a+2] = struct.pack('<H', tobj)
                elif stype == 6:  # 16:32 pointer
                    img[a:a+6] = struct.pack('<IH', target, tobj)
                else:
                    pass
                nfix += 1
print('fixups applied', nfix, file=sys.stderr)
# Watcom debug info
syms = []
if d[-14:-12] == b'\x86\x83':
    sig, emaj, emin, omaj, omin, lang_size, seg_size, dbg_size = struct.unpack('<HBBBBHHI', d[-14:])
    base = len(d) - dbg_size
    sec = base + lang_size + seg_size
    while sec < len(d) - 14:
        mod_off, gbl_off, addr_off, sec_size, sec_id = struct.unpack_from('<IIIIH', d, sec)
        p, e = sec + gbl_off, sec + addr_off
        while p < e:
            off, seg, mod, kind, nl = struct.unpack_from('<IHHBB', d, p)
            name = d[p+10:p+10+nl].decode('latin1'); p += 10 + nl
            if 1 <= seg <= nobj:
                syms.append((name, objs[seg-1]['base'] + off, seg, kind))
        sec += sec_size
print('symbols', len(syms), file=sys.stderr)
# write ELF
shstr = b'\0.text\0.data\0.symtab\0.strtab\0.shstrtab\0'
strtab = bytearray(b'\0'); symtab = bytearray(b'\0'*16)
for name, addr, seg, kind in syms:
    no = len(strtab); strtab += name.encode('latin1') + b'\0'
    is_code = objs[seg-1]['flags'] & 4
    info = (1 << 4) | (2 if is_code else 1)  # GLOBAL, FUNC/OBJECT
    symtab += struct.pack('<IIIBBH', no, addr, 0, info, 0, seg)
eh = 52; ph = 32*nobj
data_off = eh + ph
blobs = []; off = data_off
for o in objs:
    off = (off + 0xfff) & ~0xfff
    blobs.append((off, o)); off += len(o['img'])
sym_off = off; off += len(symtab)
str_off = off; off += len(strtab)
shs_off = off; off += len(shstr)
sh_off = (off + 3) & ~3
nsh = 1 + nobj + 3
out = bytearray(sh_off + 40*nsh)
entry = objs[g(0x18)-1]['base'] + g(0x1c)
out[0:eh] = b'\x7fELF\x01\x01\x01' + b'\0'*9 + struct.pack('<HHIIIIIHHHHHH', 2, 3, 1, entry, eh, sh_off, 0, eh, 32, nobj, 40, nsh, nsh-1)
for i, (fo, o) in enumerate(blobs):
    fl = (1 if o['flags'] & 4 else 0) | (2 if o['flags'] & 2 else 0) | 4
    struct.pack_into('<8I', out, eh+32*i, 1, fo, o['base'], o['base'], len(o['img']), len(o['img']), fl, 0x1000)
    out[fo:fo+len(o['img'])] = o['img']
out[sym_off:sym_off+len(symtab)] = symtab
out[str_off:str_off+len(strtab)] = strtab
out[shs_off:shs_off+len(shstr)] = shstr
sh = sh_off + 40
names = [1, 7]
for i, (fo, o) in enumerate(blobs):
    code = o['flags'] & 4
    struct.pack_into('<10I', out, sh, 1 if code else 7, 1, 6 if code else 3, o['base'], fo, len(o['img']), 0, 0, 16, 0); sh += 40
struct.pack_into('<10I', out, sh, 13, 2, 0, 0, sym_off, len(symtab), nobj+2, 1, 4, 16); sh += 40
struct.pack_into('<10I', out, sh, 21, 3, 0, 0, str_off, len(strtab), 0, 0, 1, 0); sh += 40
struct.pack_into('<10I', out, sh, 29, 3, 0, 0, shs_off, len(shstr), 0, 0, 1, 0)
open(dst, 'wb').write(out)
with open(dst + '.syms.txt', 'w') as f:
    for name, addr, seg, kind in sorted(syms, key=lambda s: s[1]):
        f.write('%08x %d %s\n' % (addr, seg, name))
