import sqlite3
import os

for db_path in ["msme360.db", "backend/msme360.db"]:
    if not os.path.exists(db_path):
        continue
    print(f"\nConnecting to: {db_path} (size: {os.path.getsize(db_path)} bytes)")
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
    print(f"Found {len(tables)} tables")
    for t in sorted(tables):
        count = cur.execute(f"SELECT COUNT(*) FROM \"{t}\"").fetchone()[0]
        if count > 0:
            print(f"  {t}: {count} rows")
    con.close()
exit(0)
cur = con.cursor()
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
print(f"Found {len(tables)} tables: {tables}")
for t in sorted(tables):
    count = cur.execute(f"SELECT COUNT(*) FROM \"{t}\"").fetchone()[0]
    print(f"  {t}: {count} rows")
con.close()
