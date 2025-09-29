// Non-trivial default code per language (roughly "half screen" worth).
// Consistent 4-space indentation. Keep samples practical so the diff has signal.
export const DEFAULT_SNIPPETS: Record<string, string> = {
    javascript: `// Quick LRU cache with stats
class LRU {
    constructor(limit = 5) {
        this.limit = limit;
        this.map = new Map();
        this.hits = 0; this.misses = 0;
    }
    get(k) {
        if (!this.map.has(k)) { this.misses++; return undefined; }
        const v = this.map.get(k);
        this.map.delete(k);
        this.map.set(k, v);
        this.hits++;
        return v;
    }
    set(k, v) {
        if (this.map.has(k)) this.map.delete(k);
        this.map.set(k, v);
        if (this.map.size > this.limit) this.map.delete(this.map.keys().next().value);
    }
}
export function demo() {
    const lru = new LRU(3);
    'abcde'.split('').forEach((c, i) => lru.set(c, i));
    lru.get('c'); lru.get('x'); // hit, miss
    return { size: lru.map.size, hits: lru.hits, misses: lru.misses };
}`,

    python: `# Simple event bus with wildcard topics
from collections import defaultdict

class Bus:
    def __init__(self):
        self._subs = defaultdict(list)

    def on(self, topic, fn):
        self._subs[topic].append(fn)

    def emit(self, topic, payload):
        for t, fns in self._subs.items():
            if t == topic or (t.endswith('.*') and topic.startswith(t[:-2])):
                for fn in fns:
                    fn(payload)

if __name__ == '__main__':
    bus = Bus()
    bus.on('user.*', lambda p: print('wildcard', p))
    bus.on('user.login', lambda p: print('login', p))
    bus.emit('user.login', {'id': 42})`,

    java: `// Tiny matrix ops
public final class Mat {
    private final double[][] a;

    public Mat(double[][] a) {
        this.a = a;
    }

    public Mat dot(Mat b) {
        int n = a.length, m = b.a[0].length, k = b.a.length;
        double[][] r = new double[n][m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                for (int t = 0; t < k; t++) {
                    r[i][j] += a[i][t] * b.a[t][j];
                }
            }
        }
        return new Mat(r);
    }

    public static void main(String[] args) {
        Mat x = new Mat(new double[][] { { 1, 2 }, { 3, 4 } });
        Mat y = new Mat(new double[][] { { 2, 0 }, { 1, 2 } });
        System.out.println(java.util.Arrays.deepToString(x.dot(y).a));
    }
}`,

    csharp: `using System;

class RangeSum {
    public static int[] Prefix(int[] a) {
        var p = new int[a.Length + 1];
        for (int i = 0; i < a.Length; i++) p[i + 1] = p[i] + a[i];
        return p;
    }

    public static int Query(int[] p, int l, int r) => p[r] - p[l];

    static void Main() {
        var p = Prefix(new[] { 1, 4, 2, 3, 5 });
        Console.WriteLine(Query(p, 1, 4));
    }
}`,

    cpp: `#include <bits/stdc++.h>
using namespace std;

struct DSU {
    vector<int> p, r;
    DSU(int n) : p(n), r(n, 0) {
        iota(p.begin(), p.end(), 0);
    }
    int f(int x) {
        return p[x] == x ? x : p[x] = f(p[x]);
    }
    bool unite(int a, int b) {
        a = f(a); b = f(b);
        if (a == b) return false;
        if (r[a] < r[b]) swap(a, b);
        p[b] = a;
        if (r[a] == r[b]) r[a]++;
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    DSU d(5);
    d.unite(0, 1);
    d.unite(3, 4);
    cout << (d.f(1) == d.f(0));
    return 0;
}`,

    kotlin: `// Simple DSL-ish builder
class Query {
    private val filters = mutableListOf<String>()
    fun where(k: String, op: String, v: Any) = apply {
        filters += "$k $op $v"
    }
    override fun toString() = "SELECT * FROM T WHERE " + filters.joinToString(" AND ")
}

fun main() {
    val q = Query()
        .where("age", ">", 20)
        .where("name", "LIKE", "'A%'")
    println(q)
}`,

    html: `<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>Demo</title>
        <style>
            body { font-family: system-ui, sans-serif; margin: 16px; }
            #btn { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f1f5f9; }
            pre { background: #0f172a; color: #e2e8f0; padding: 8px; border-radius: 8px; }
        </style>
    </head>
    <body>
        <button id="btn">Click</button>
        <pre id="out"></pre>
        <script>
            document.getElementById('btn').onclick = () => {
                const t = new Date().toISOString();
                document.getElementById('out').textContent += 'Clicked at ' + t + '\\n';
            };
        </script>
    </body>
</html>`,

    css: `:root {
    --gap: 12px;
    --radius: 10px;
    --primary: #111827;
    --surface: #ffffff;
    --muted: #6b7280;
}

/* Layout */
.container {
    max-width: 960px;
    margin: 0 auto;
    padding: 16px;
}

.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--gap);
}

.card {
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: var(--radius);
    background: var(--surface);
}

/* Buttons */
.button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--radius);
    border: 1px solid #e5e7eb;
    background: var(--primary);
    color: #ffffff;
}
.button:disabled { opacity: .6; }

/* Responsive tweaks */
@media (max-width: 720px) {
    .grid { grid-template-columns: 1fr; }
}` // end css
};
