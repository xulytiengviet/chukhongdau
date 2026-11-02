"""Convert the pinned Underthesea model; never execute pickle globals.
Usage: python scripts/convert-underthesea-model.py /path/to/rd-model.bin
"""
import gzip, hashlib, io, json, pathlib, pickle, sys
EXPECTED = '2ca76de256c0efbbd460dfb0e541acb7a95feecb0342f75392620d6931b0579d'
class DataOnlyUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        raise ValueError('Pickle globals are prohibited')
b = pathlib.Path(sys.argv[1]).read_bytes()
if hashlib.sha256(b).hexdigest() != EXPECTED:
    raise ValueError('Unexpected upstream model checksum')
m = DataOnlyUnpickler(io.BytesIO(gzip.decompress(b))).load()
words = sorted(m['unigrams']); ids = {w:i for i,w in enumerate(words)}
model = {'format':1, 'source':'undertheseanlp/underthesea',
         'revision':'0d3cf4dfd6f8ac6df3fda74332187d7c49d8bdde',
         'upstream_sha256':EXPECTED, 'words':words,
         'counts':[m['unigrams'][w] for w in words],
         'bigrams':[[ids[a],ids[b],n] for (a,b),n in sorted(m['bigrams'].items())]}
data=json.dumps(model,ensure_ascii=False,separators=(',',':')).encode()
p=pathlib.Path(__file__).resolve().parents[1]/'site/models/underthesea-bigram-v1.json.gz'
p.write_bytes(gzip.compress(data,compresslevel=9,mtime=0))
print(json.dumps({'unigrams':len(words),'bigrams':len(model['bigrams']),'json_bytes':len(data),'gzip_bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))
