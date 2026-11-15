import sys,os,re,zlib,struct,base64,urllib.parse,glob
import xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf8')
def chunks(path):
    d=open(path,'rb').read(); i=8
    while i<len(d):
        n=struct.unpack('>I',d[i:i+4])[0]; t=d[i+4:i+8]; body=d[i+8:i+8+n]; i+=12+n
        yield t,body
def mx(path):
    for t,b in chunks(path):
        if t==b'tEXt' and b.startswith(b'mxfile\x00'):
            return urllib.parse.unquote(b.split(b'\x00',1)[1].decode('latin1').encode('latin1').decode('utf8',errors='replace')) if False else urllib.parse.unquote(b.split(b'\x00',1)[1].decode('utf8',errors='replace'))
        if t==b'zTXt' and b.startswith(b'mxfile\x00'):
            return urllib.parse.unquote(zlib.decompress(b[8:]).decode('utf8'))
        if t==b'iTXt' and b.startswith(b'mxfile\x00'):
            rest=b[7:]; # flags
            comp=b[7]; rest=b[9:]; parts=rest.split(b'\x00',2); data=parts[2]
            if comp: data=zlib.decompress(data)
            return urllib.parse.unquote(data.decode('utf8'))
    return None
def models(xml):
    root=ET.fromstring(xml); out={}
    for dg in root.iter('diagram'):
        gm=dg.find('mxGraphModel')
        if gm is not None: out[dg.get('id')]=(dg.get('name'),ET.tostring(gm,encoding='unicode'))
        else:
            t=(dg.text or '').strip()
            raw=zlib.decompress(base64.b64decode(t),-15).decode('utf8')
            out[dg.get('id')]=(dg.get('name'),urllib.parse.unquote(raw))
    return out
if __name__=='__main__':
    for p in sys.argv[1:]:
        x=mx(p)
        print(os.path.basename(p), 'mxfile' if x else 'KHÔNG có', (list(models(x).keys()) if x else ''))
