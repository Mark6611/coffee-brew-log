<script lang="ts">
	let { code, country }: { code: string; country: string } = $props();

	function toEmoji(c: string): string {
		const A = 0x1f1e6 - 'A'.charCodeAt(0);
		return String.fromCodePoint(c.charCodeAt(0) + A, c.charCodeAt(1) + A);
	}
</script>

<span
	class="origin-flag"
	role="img"
	aria-hidden="true"
	data-flag-code={code}
	data-flag-country={country}>{toEmoji(code)}</span
>

<style>
	.origin-flag {
		font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui;
		font-size: 0.95em;
		margin-right: 0.32em;
		vertical-align: -0.05em;
		line-height: 1;
		filter: saturate(0.85);
	}
</style>
