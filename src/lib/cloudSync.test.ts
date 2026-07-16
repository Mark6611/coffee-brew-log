import { describe, it, expect } from 'vitest';
import { mergeRecords } from './cloudSync';
import type { CloudRecord } from './native';

// The LWW merge is the whole correctness story of iCloud sync — the Swift side
// just moves blobs. These tests mirror sibling Buffy's proven behavior.

type Row = { id: string; updatedAt?: string; name?: string; deletedAt?: string };

const rec = (id: string, updatedAt: string, body: Partial<Row> = {}): CloudRecord => ({
	id,
	updatedAt,
	json: JSON.stringify({ id, updatedAt, ...body })
});

describe('mergeRecords (last-write-wins)', () => {
	it('remote newer → written locally', () => {
		const local: Row[] = [{ id: 'a', updatedAt: '2026-07-01T00:00:00.000Z', name: 'old' }];
		const remote = [rec('a', '2026-07-02T00:00:00.000Z', { name: 'new' })];
		const plan = mergeRecords(local, remote);
		expect(plan.toWriteLocally).toHaveLength(1);
		expect((plan.toWriteLocally[0] as Row).name).toBe('new');
		expect(plan.toPushRemotely).toHaveLength(0);
	});

	it('local newer → pushed up', () => {
		const local: Row[] = [{ id: 'a', updatedAt: '2026-07-03T00:00:00.000Z', name: 'newer' }];
		const remote = [rec('a', '2026-07-02T00:00:00.000Z', { name: 'older' })];
		const plan = mergeRecords(local, remote);
		expect(plan.toWriteLocally).toHaveLength(0);
		expect(plan.toPushRemotely).toHaveLength(1);
		expect(JSON.parse(plan.toPushRemotely[0].json).name).toBe('newer');
	});

	it('equal timestamps → already in sync, nothing moves', () => {
		const t = '2026-07-02T00:00:00.000Z';
		const plan = mergeRecords([{ id: 'a', updatedAt: t }], [rec('a', t)]);
		expect(plan.toWriteLocally).toHaveLength(0);
		expect(plan.toPushRemotely).toHaveLength(0);
	});

	it('remote-only → written locally; local-only → pushed up', () => {
		const local: Row[] = [{ id: 'localOnly', updatedAt: '2026-07-01T00:00:00.000Z' }];
		const remote = [rec('remoteOnly', '2026-07-01T00:00:00.000Z')];
		const plan = mergeRecords(local, remote);
		expect(plan.toWriteLocally.map((r) => r.id)).toEqual(['remoteOnly']);
		expect(plan.toPushRemotely.map((r) => r.id)).toEqual(['localOnly']);
	});

	it('local rows predating the updatedAt stamp get stamped inside the json too', () => {
		const local: Row[] = [{ id: 'legacy', name: 'pre-stamp row' }]; // no updatedAt
		const plan = mergeRecords(local, []);
		expect(plan.toPushRemotely).toHaveLength(1);
		const pushed = plan.toPushRemotely[0];
		expect(pushed.updatedAt).toBeTruthy();
		expect(JSON.parse(pushed.json).updatedAt).toBe(pushed.updatedAt);
	});

	it('a local row with NO updatedAt loses to any remote copy', () => {
		const local: Row[] = [{ id: 'a', name: 'unstamped' }];
		const remote = [rec('a', '2020-01-01T00:00:00.000Z', { name: 'ancient but stamped' })];
		const plan = mergeRecords(local, remote);
		expect(plan.toWriteLocally).toHaveLength(1);
		expect((plan.toWriteLocally[0] as Row).name).toBe('ancient but stamped');
	});

	it('tombstones win/lose by the same clock (newer delete beats older edit)', () => {
		const local: Row[] = [{ id: 'a', updatedAt: '2026-07-01T00:00:00.000Z', name: 'alive' }];
		const remote = [
			rec('a', '2026-07-05T00:00:00.000Z', { deletedAt: '2026-07-05T00:00:00.000Z' })
		];
		const plan = mergeRecords(local, remote);
		expect((plan.toWriteLocally[0] as Row).deletedAt).toBeTruthy();
	});

	it('corrupt remote json is skipped without poisoning the pass or pushing over it', () => {
		const local: Row[] = [{ id: 'ok', updatedAt: '2026-07-01T00:00:00.000Z' }];
		const remote: CloudRecord[] = [
			{ id: 'bad', updatedAt: '2026-07-09T00:00:00.000Z', json: '{not json' },
			rec('ok', '2026-07-02T00:00:00.000Z')
		];
		const plan = mergeRecords(local, remote);
		expect(plan.toWriteLocally.map((r) => r.id)).toEqual(['ok']); // bad skipped
		expect(plan.toPushRemotely).toHaveLength(0); // and never blind-pushed over
	});

	it('unparseable remote updatedAt is treated as oldest, not NaN chaos', () => {
		const local: Row[] = [{ id: 'a', updatedAt: '2026-07-01T00:00:00.000Z', name: 'mine' }];
		const remote = [rec('a', 'not-a-date', { name: 'theirs' })];
		const plan = mergeRecords(local, remote);
		expect(plan.toWriteLocally).toHaveLength(0);
		expect(plan.toPushRemotely).toHaveLength(1); // local wins, pushes over it
	});
});
