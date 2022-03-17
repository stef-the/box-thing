const production = !process.env.ROLLUP_WATCH;
module.exports = {
	future: {
		purgeLayersByDefault: true,
		removeDeprecatedGapUtilities: true,
	},
	plugins: [],
	purge: {
		content: ["./src/App.svelte"],
		enabled: production, // disable purge in dev
	},
	variants: ["responsive", "group-hover", "hover", "focus", "active"],
	theme: {
		extend: {
			padding: {
				"1p": "1%",
				"2/3p": "0.666%",
				"4/3p": "1.333%"
			},
			margin: {
				"1p": "1%",
				"2/3p": "0.666%",
				"1/3p": "0.333%"
			}
		}
	}
};
