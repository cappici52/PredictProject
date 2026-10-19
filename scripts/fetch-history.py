"""Build a real, attributed archive. GLO takes precedence over supplemental CSV."""
import concurrent.futures
import csv
import datetime
import io
import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
GLO = 'https://www.glo.or.th/api/lottery/getLotteryResultByPage'
SUPPLEMENT = 'https://raw.githubusercontent.com/zugetor/Machine-Learning-for-thai-Lottery/master/thLotto_38-59.csv'

def page(number):
    for attempt in range(3):
        try:
            request = urllib.request.Request(GLO, data=json.dumps({'page': number}).encode(), headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=25) as response:
                payload = json.load(response)
            if not payload.get('status'):
                raise ValueError('GLO returned unsuccessful status')
            return payload['response']
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)

def main():
    first = page(1)
    pages = (first['total'] + 11) // 12
    draws = {}
    with urllib.request.urlopen(SUPPLEMENT, timeout=25) as response:
        text = response.read().decode('utf-8-sig')
    for row in csv.DictReader(io.StringIO(text)):
        date = datetime.date(int(row['year']) - 543, int(row['month']), int(row['day'])).isoformat()
        if date >= '2006-01-01':
            draws[date] = {'date': date, 'first': row['first'].zfill(6), 'last2': row['last_2digit_down'].zfill(2), 'source': 'supplement', 'sourceUrl': 'https://github.com/zugetor/Machine-Learning-for-thai-Lottery'}
    batches = [first]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for i, result in enumerate(pool.map(page, range(2, pages + 1)), 2):
            batches.append(result)
            print(f'GLO page {i}/{pages}', flush=True)
    for batch in batches:
        for row in batch['lottery']:
            first_number = row['data'].get('first', [])
            last_number = row['data'].get('last2', [])
            if len(first_number) == 1 and len(last_number) == 1:
                draws[row['date']] = {'date': row['date'], 'first': first_number[0], 'last2': last_number[0], 'source': 'glo', 'sourceUrl': 'https://www.glo.or.th'}
    records = sorted(draws.values(), key=lambda x: x['date'])
    for record in records:
        if not (len(record['first']) == 6 and record['first'].isdigit() and len(record['last2']) == 2 and record['last2'].isdigit()):
            raise ValueError(f'Invalid draw {record["date"]}')
    destination = ROOT / 'data' / 'history.json'
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps({'draws': records, 'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'gloTotal': first['total']}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Saved {len(records)} real draws: {records[0]["date"]} through {records[-1]["date"]}')

if __name__ == '__main__':
    main()
